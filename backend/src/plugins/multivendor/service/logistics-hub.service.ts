import { Injectable } from '@nestjs/common';
import {
    TransactionalConnection,
    RequestContext,
    Order,
    OrderService,
    EntityHydrator,
    EventBus,
} from '@vendure/core';
import { DeliveryMission, MissionType, MissionStatus } from '../entities/delivery-mission.entity';
import { Vendor } from '../entities/vendor.entity';
import { SettlementService } from './settlement.service';

@Injectable()
export class LogisticsHubService {
    constructor(
        private connection: TransactionalConnection,
        private orderService: OrderService,
        private entityHydrator: EntityHydrator,
        private eventBus: EventBus,
        private settlementService: SettlementService,
    ) {}

    /**
     * Helper to generate a secure 6-digit numeric OTP code
     */
    private generateOtp(): string {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    /**
     * 1. Vendor confirms readiness for pickup
     */
    async markReadyForPickup(
        ctx: RequestContext,
        orderId: string,
        vendorId: string
    ): Promise<DeliveryMission> {
        const order = await this.connection.getEntityOrThrow(ctx, Order, orderId, {
            relations: ['lines', 'shippingAddress']
        });
        const vendor = await this.connection.getEntityOrThrow(ctx, Vendor, vendorId);

        const missionRepo = this.connection.getRepository(ctx, DeliveryMission);

        // Check if an existing pickup mission already exists
        let mission = await missionRepo.findOne({
            where: {
                order: { id: order.id },
                vendor: { id: vendor.id },
                type: MissionType.PICKUP
            }
        });

        if (!mission) {
            mission = missionRepo.create({
                order,
                vendor,
                type: MissionType.PICKUP,
                status: MissionStatus.PENDING,
                pickupAddress: vendor.address || 'Boutique Vendeur',
                pickupLatitude: vendor.latitude || undefined,
                pickupLongitude: vendor.longitude || undefined,
                deliveryAddress: 'Hub Logistique Central Ahizan, Cotonou',
                notes: `Collecte commande #${order.code} auprès de ${vendor.name}`
            });
        } else {
            mission.status = MissionStatus.PENDING;
        }

        const savedMission = await missionRepo.save(mission);
        console.log(`[LogisticsHub] Pickup mission created/updated (#${savedMission.id}) for vendor ${vendor.name} on order ${order.code}`);
        return savedMission;
    }

    /**
     * 2. Hub operator scans package arrival at central Hub
     */
    async recordHubArrival(
        ctx: RequestContext,
        orderId: string,
        vendorId?: string
    ): Promise<{ isFullyConsolidated: boolean; order: Order }> {
        const orderRepo = this.connection.getRepository(ctx, Order);
        const order = await orderRepo.findOne({
            where: { id: orderId },
            relations: ['sellerOrders', 'lines']
        });

        if (!order) {
            throw new Error(`Order #${orderId} not found`);
        }

        // If vendor specified, complete the pickup mission
        if (vendorId) {
            const missionRepo = this.connection.getRepository(ctx, DeliveryMission);
            const mission = await missionRepo.findOne({
                where: {
                    order: { id: order.id },
                    vendor: { id: vendorId },
                    type: MissionType.PICKUP
                }
            });
            if (mission) {
                mission.status = MissionStatus.COMPLETED;
                await missionRepo.save(mission);
            }
        }

        // Update custom fields on parent Order
        if (!order.customFields) {
            (order as any).customFields = {};
        }
        (order.customFields as any).hubArrivalDate = new Date();
        (order.customFields as any).isConsolidated = true;
        (order.customFields as any).deliveryMissionStatus = 'CONSOLIDATED_AT_HUB';

        const updatedOrder = await orderRepo.save(order);
        console.log(`[LogisticsHub] Order #${order.code} registered at central Hub. Consolidated = true.`);

        return {
            isFullyConsolidated: true,
            order: updatedOrder
        };
    }

    /**
     * 3. Hub manager assigns final delivery to courier and generates 6-digit OTP
     */
    async dispatchForFinalDelivery(
        ctx: RequestContext,
        orderId: string,
        driverInfo: { name: string; phone: string }
    ): Promise<{ mission: DeliveryMission; otpCode: string }> {
        const orderRepo = this.connection.getRepository(ctx, Order);
        const order = await orderRepo.findOne({
            where: { id: orderId },
            relations: ['shippingAddress']
        });

        if (!order) {
            throw new Error(`Order #${orderId} not found`);
        }

        const otpCode = this.generateOtp();
        if (!order.customFields) {
            (order as any).customFields = {};
        }
        (order.customFields as any).deliveryOtp = otpCode;
        (order.customFields as any).deliveryMissionStatus = 'OUT_FOR_DELIVERY';
        await orderRepo.save(order);

        const missionRepo = this.connection.getRepository(ctx, DeliveryMission);
        let mission = await missionRepo.findOne({
            where: {
                order: { id: order.id },
                type: MissionType.FINAL_DELIVERY
            }
        });

        const address = order.shippingAddress;
        const formattedDeliveryAddress = `${address?.streetLine1 || ''}, ${address?.city || ''}`;
        const lat = address?.customFields?.latitude || undefined;
        const lng = address?.customFields?.longitude || undefined;

        if (!mission) {
            mission = missionRepo.create({
                order,
                type: MissionType.FINAL_DELIVERY,
                status: MissionStatus.EN_ROUTE,
                driverName: driverInfo.name,
                driverPhone: driverInfo.phone,
                pickupAddress: 'Hub Logistique Central Ahizan, Cotonou',
                deliveryAddress: formattedDeliveryAddress,
                deliveryLatitude: lat,
                deliveryLongitude: lng,
                otpCode,
                notes: `Livraison finale client #${order.code}`
            });
        } else {
            mission.status = MissionStatus.EN_ROUTE;
            mission.driverName = driverInfo.name;
            mission.driverPhone = driverInfo.phone;
            mission.otpCode = otpCode;
        }

        const savedMission = await missionRepo.save(mission);
        console.log(`[LogisticsHub] Dispatched final delivery for order #${order.code}. Driver: ${driverInfo.name} (${driverInfo.phone}). OTP generated.`);

        return {
            mission: savedMission,
            otpCode
        };
    }

    /**
     * 4. Driver enters OTP provided by customer to validate physical delivery
     */
    async verifyDeliveryOtp(
        ctx: RequestContext,
        orderCode: string,
        otpInput: string
    ): Promise<{ success: boolean; message: string; order?: Order }> {
        const orderRepo = this.connection.getRepository(ctx, Order);
        const order = await orderRepo.findOne({
            where: { code: orderCode },
            relations: ['lines', 'lines.productVariant', 'sellerOrders']
        });

        if (!order) {
            return { success: false, message: `Commande #${orderCode} introuvable.` };
        }

        const expectedOtp = (order.customFields as any)?.deliveryOtp;
        if (!expectedOtp || expectedOtp.trim() !== otpInput.trim()) {
            return {
                success: false,
                message: 'Code OTP invalide. Veuillez vérifier le code à 6 chiffres reçu par SMS par le client.'
            };
        }

        // OTP is valid!
        const missionRepo = this.connection.getRepository(ctx, DeliveryMission);
        const finalMission = await missionRepo.findOne({
            where: {
                order: { id: order.id },
                type: MissionType.FINAL_DELIVERY
            }
        });

        if (finalMission) {
            finalMission.status = MissionStatus.COMPLETED;
            finalMission.otpVerifiedAt = new Date();
            await missionRepo.save(finalMission);
        }

        // Transition Order state to Delivered
        (order.customFields as any).deliveryMissionStatus = 'DELIVERED';
        await orderRepo.save(order);

        try {
            await this.orderService.transitionToState(ctx, order.id, 'Delivered');
        } catch (err: any) {
            console.log(`[LogisticsHub] Transition to Delivered: ${err?.message || err}`);
        }

        // Generate financial settlements for vendors
        try {
            await this.settlementService.createSettlementsForDeliveredOrder(ctx, order);
        } catch (err: any) {
            console.error(`[LogisticsHub] Error creating settlements for delivered order #${order.code}:`, err);
        }

        console.log(`[LogisticsHub] ✅ Delivery verified with OTP for order #${order.code}. Status -> Delivered.`);

        return {
            success: true,
            message: 'Livraison confirmée avec succès ! Les règlements vendeurs ont été générés.',
            order
        };
    }
}
