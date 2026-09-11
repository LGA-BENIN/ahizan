import { Injectable } from '@nestjs/common';
import {
    TransactionalConnection,
    RequestContext,
    Order,
    User,
} from '@vendure/core';
import { Settlement, SettlementStatus } from '../entities/settlement.entity';
import { Payout, PayoutStatus } from '../entities/payout.entity';
import { Vendor } from '../entities/vendor.entity';

@Injectable()
export class SettlementService {
    constructor(private connection: TransactionalConnection) {}

    /**
     * 1. Creates settlements automatically when an order is delivered with OTP
     */
    async createSettlementsForDeliveredOrder(ctx: RequestContext, order: Order): Promise<Settlement[]> {
        const fullOrder = await this.connection.getEntityOrThrow(ctx, Order, order.id, {
            relations: [
                'lines',
                'lines.productVariant',
                'lines.productVariant.product',
                'sellerOrders',
            ]
        });

        const settlementRepo = this.connection.getRepository(ctx, Settlement);
        const createdSettlements: Settlement[] = [];

        // 48h retention delay for claims/disputes
        const releaseDate = new Date();
        releaseDate.setHours(releaseDate.getHours() + 48);

        // Group lines by vendor
        const linesByVendor = new Map<string, typeof fullOrder.lines>();

        for (const line of fullOrder.lines) {
            const vendorId = (line.customFields as any)?.assignedVendor?.id ||
                             (line.productVariant?.product?.customFields as any)?.vendor?.id ||
                             (line as any).customFieldsAssignedvendorid;

            if (vendorId) {
                const list = linesByVendor.get(String(vendorId)) || [];
                list.push(line);
                linesByVendor.set(String(vendorId), list);
            }
        }

        for (const [vendorIdStr, lines] of linesByVendor.entries()) {
            const vendor = await this.connection.getRepository(ctx, Vendor).findOne({
                where: { id: vendorIdStr }
            });

            if (!vendor) continue;

            // Check if seller sub-order for this vendor exists and was validated/accepted
            const sellerSubOrder = (fullOrder.sellerOrders || []).find((so: any) => {
                const soChannelId = so.channels?.[0]?.id || so.channelId;
                return String(soChannelId) === String(vendor.channelId) || String((so.customFields as any)?.vendor?.id) === String(vendor.id);
            });

            // If a suborder exists and is cancelled or draft, skip settlement
            if (sellerSubOrder && (sellerSubOrder.state === 'Cancelled' || sellerSubOrder.state === 'Draft')) {
                console.log(`[SettlementService] Skipping Settlement for Vendor ${vendor.name}: Suborder state is ${sellerSubOrder.state}`);
                continue;
            }

            // Filter out cancelled or zero-quantity lines
            const activeLines = lines.filter((l: any) => (l.quantity > 0) && (l as any).cancelled !== true);
            if (activeLines.length === 0) continue;

            const grossAmount = activeLines.reduce((sum, l) => sum + (l.linePriceWithTax || l.unitPriceWithTax * l.quantity), 0);
            const commissionRate = vendor.commissionRate > 0 ? (vendor.commissionRate / 100) : 0.10;
            const commissionAmount = Math.round(grossAmount * commissionRate);
            const netAmount = grossAmount - commissionAmount;

            let settlement = await settlementRepo.findOne({
                where: {
                    order: { id: fullOrder.id },
                    vendor: { id: vendor.id }
                }
            });

            if (!settlement) {
                settlement = settlementRepo.create({
                    order: fullOrder,
                    vendor,
                    grossAmount,
                    commissionAmount,
                    commissionRate,
                    shippingFeeShare: 0,
                    penaltyAmount: 0,
                    netAmount,
                    status: SettlementStatus.HELD,
                    releaseDate
                });
            } else {
                settlement.grossAmount = grossAmount;
                settlement.commissionAmount = commissionAmount;
                settlement.netAmount = netAmount;
                settlement.status = SettlementStatus.HELD;
                settlement.releaseDate = releaseDate;
            }

            const saved = await settlementRepo.save(settlement);
            createdSettlements.push(saved);
            console.log(`[SettlementService] Created Settlement #${saved.id} for Vendor ${vendor.name}: Gross=${grossAmount} FCFA, Commission=${commissionAmount} FCFA, Net=${netAmount} FCFA.`);
        }

        return createdSettlements;
    }

    /**
     * 2. Get settlements for a specific vendor
     */
    async getVendorSettlements(ctx: RequestContext, vendorId: string): Promise<Settlement[]> {
        return this.connection.getRepository(ctx, Settlement).find({
            where: { vendor: { id: vendorId } },
            relations: ['order', 'payout'],
            order: { createdAt: 'DESC' }
        });
    }

    /**
     * 3. Calculates the available balance for withdrawal (RELEASED status)
     */
    async getVendorAvailableBalance(ctx: RequestContext, vendorId: string): Promise<{ availableBalance: number; heldBalance: number }> {
        const settlements = await this.connection.getRepository(ctx, Settlement).find({
            where: { vendor: { id: vendorId } }
        });

        const now = new Date();
        let availableBalance = 0;
        let heldBalance = 0;

        for (const s of settlements) {
            if (s.status === SettlementStatus.PAID || s.status === SettlementStatus.CANCELLED) {
                continue;
            }
            if (s.status === SettlementStatus.RELEASED || (s.status === SettlementStatus.HELD && s.releaseDate && s.releaseDate <= now)) {
                availableBalance += s.netAmount;
            } else {
                heldBalance += s.netAmount;
            }
        }

        return { availableBalance, heldBalance };
    }

    /**
     * 4. Request Payout with 4-Eyes Principle (Tome 10)
     * If amount > 25 000 FCFA (2 500 000 cents), requires Manager approval (PENDING_APPROVAL)
     */
    async requestPayout(
        ctx: RequestContext,
        vendorId: string,
        amount: number,
        details: { paymentMethod?: 'MOBILE_MONEY' | 'BANK_TRANSFER'; provider?: string; accountNumber?: string }
    ): Promise<Payout> {
        const vendor = await this.connection.getEntityOrThrow(ctx, Vendor, vendorId, {
            relations: ['user']
        });

        const { availableBalance } = await this.getVendorAvailableBalance(ctx, vendorId);
        if (amount > availableBalance) {
            throw new Error(`Solde insuffisant. Montant demandé: ${amount}, Solde disponible: ${availableBalance}`);
        }

        const payoutRepo = this.connection.getRepository(ctx, Payout);

        // Seuil de double validation : 25 000 FCFA (soit 25 000 en base ou 2 500 000 centimes selon convention)
        const DOUBLE_VALIDATION_THRESHOLD = 2500000;
        const requiresApproval = amount >= DOUBLE_VALIDATION_THRESHOLD;

        const initiatorUser = ctx.activeUserId ? await this.connection.getRepository(ctx, User).findOne({ where: { id: ctx.activeUserId } }) : null;

        const payout = payoutRepo.create({
            vendor,
            amount,
            currencyCode: 'XOF',
            paymentMethod: details.paymentMethod || vendor.paymentMethod || 'MOBILE_MONEY',
            destinationProvider: details.provider || vendor.mobileMoneyProvider || null,
            destinationAccount: details.accountNumber || vendor.mobileMoneyNumber || vendor.bankAccountNumber || null,
            status: requiresApproval ? PayoutStatus.PENDING_APPROVAL : PayoutStatus.APPROVED,
            initiatedBy: initiatorUser || null,
            approvedBy: requiresApproval ? null : (initiatorUser || null),
            approvedAt: requiresApproval ? null : new Date(),
        });

        const savedPayout = await payoutRepo.save(payout);
        console.log(`[SettlementService] Payout request #${savedPayout.id} created for ${vendor.name} (${amount} XOF). Status: ${savedPayout.status} (Requires approval: ${requiresApproval})`);

        return savedPayout;
    }

    /**
     * 5. Approve Payout (Finance Manager only)
     */
    async approvePayout(ctx: RequestContext, payoutId: string): Promise<Payout> {
        const payoutRepo = this.connection.getRepository(ctx, Payout);
        const payout = await payoutRepo.findOne({
            where: { id: payoutId },
            relations: ['vendor', 'initiatedBy']
        });

        if (!payout) {
            throw new Error(`Payout #${payoutId} not found`);
        }

        if (payout.status !== PayoutStatus.PENDING_APPROVAL && payout.status !== PayoutStatus.DRAFT) {
            throw new Error(`Payout #${payoutId} cannot be approved in status ${payout.status}`);
        }

        const managerUser = ctx.activeUserId ? await this.connection.getRepository(ctx, User).findOne({ where: { id: ctx.activeUserId } }) : null;

        payout.status = PayoutStatus.APPROVED;
        payout.approvedBy = managerUser || null;
        payout.approvedAt = new Date();

        const updated = await payoutRepo.save(payout);
        console.log(`[SettlementService] ✅ Payout #${updated.id} approved by Manager. Ready for Mobile Money / Bank execution.`);

        return updated;
    }
}
