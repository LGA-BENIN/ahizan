import { Injectable } from '@nestjs/common';
import { 
    TransactionalConnection, 
    RequestContext, 
    OrderLine, 
    Order, 
    ProductVariant 
} from '@vendure/core';
import { SellerOffer } from '../entities/seller-offer.entity';
import { Vendor, VendorStatus } from '../entities/vendor.entity';

@Injectable()
export class ReplacementEngineService {
    constructor(private connection: TransactionalConnection) {}

    /**
     * Calculates the distance in kilometers using the Haversine formula
     */
    private getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
        const R = 6371; // Earth radius in km
        const phi1 = (lat1 * Math.PI) / 180;
        const phi2 = (lat2 * Math.PI) / 180;
        const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
        const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

        const a =
            Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
            Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c;
    }

    /**
     * Attempts to find a replacement seller for a cancelled order line
     */
    async findAndApplyReplacement(
        ctx: RequestContext,
        orderLineId: string,
        originalVendorId: string
    ): Promise<{ success: boolean; status: 'reassigned' | 'manual_required' | 'no_offers'; newVendorId?: string }> {
        const repo = this.connection.getRepository(ctx, OrderLine);
        
        // 1. Fetch order line with related variant and order details
        const line = await repo.findOne({
            where: { id: orderLineId },
            relations: ['order', 'productVariant']
        });

        if (!line) {
            console.error(`[ReplacementEngine] OrderLine ${orderLineId} not found`);
            return { success: false, status: 'no_offers' };
        }

        const order = line.order;
        const variant = line.productVariant;
        const originalPrice = line.unitPrice; // original price charged to client
        const quantity = line.quantity;

        // Resolve customer coordinates
        let lat = order.shippingAddress?.customFields?.latitude;
        let lng = order.shippingAddress?.customFields?.longitude;

        if (lat == null || lng == null) {
            // Geocode fallback based on city
            const city = (order.shippingAddress?.city || '').toLowerCase();
            if (city.includes('cotonou')) { lat = 6.3654; lng = 2.4183; }
            else if (city.includes('porto') || city.includes('novo')) { lat = 6.4969; lng = 2.6289; }
            else if (city.includes('parakou')) { lat = 9.3371; lng = 2.6303; }
            else if (city.includes('calavi') || city.includes('abomey')) { lat = 6.4485; lng = 2.3556; }
            else if (city.includes('ouidah')) { lat = 6.3631; lng = 2.0851; }
            else if (city.includes('bohicon')) { lat = 7.1783; lng = 2.0667; }
            else { lat = 6.3654; lng = 2.4183; }
        }

        // 2. Fetch all alternative SellerOffers with stock >= quantity
        const offers = await this.connection.getRepository(ctx, SellerOffer).find({
            where: { productVariant: { id: variant.id } },
            relations: ['vendor', 'vendor.channel']
        });

        const alternatives = offers.filter(o => 
            String(o.vendor.id) !== String(originalVendorId) && 
            o.stock >= quantity &&
            o.vendor.status === VendorStatus.APPROVED
        );

        if (alternatives.length === 0) {
            // No alternatives in stock
            await this.connection.rawConnection.query(
                `UPDATE order_line SET "customFieldsSellerstatus" = 'reassigning' WHERE id = $1`,
                [orderLineId]
            );
            return { success: false, status: 'no_offers' };
        }

        // 3. Score each alternative offer
        const scoredOffers = alternatives.map(offer => {
            const rating = offer.vendor.rating || 0;
            const priceDiffPercent = ((offer.price - originalPrice) / originalPrice) * 100;
            
            // Calculate logistic distance between alternative seller and client
            let distanceKm = 5; // fallback
            if (offer.vendor.latitude != null && offer.vendor.longitude != null) {
                distanceKm = this.getDistanceKm(lat!, lng!, offer.vendor.latitude, offer.vendor.longitude);
            }

            const score = (rating * 20) - (priceDiffPercent * 10) - (distanceKm * 2);

            return { offer, score, priceDiffPercent, priceDiffAbs: offer.price - originalPrice };
        });

        // Sort by score descending (highest score is best)
        scoredOffers.sort((a, b) => b.score - a.score);
        const best = scoredOffers[0];

        // 4. Validate against automatic thresholds
        // Rules: 
        // - If price is lower or equal, reassign automatically.
        // - If price is higher but: diff <= 5% OR diff <= 2000 FCFA (200 000 cents), reassign automatically.
        const isLowerOrEqual = best.priceDiffAbs <= 0;
        const isWithinPercentThreshold = best.priceDiffPercent <= 5;
        const isWithinAbsoluteThreshold = best.priceDiffAbs <= 200000; // 2 000 FCFA in cents

        if (isLowerOrEqual || isWithinPercentThreshold || isWithinAbsoluteThreshold) {
            // Reassign automatically!
            const newVendor = best.offer.vendor;
            const newChannelId = newVendor.channelId;

            line.sellerChannelId = newChannelId ? (newChannelId.toString() as any) : line.sellerChannelId;
            if (!line.customFields) {
                (line as any).customFields = {};
            }
            (line.customFields as any).assignedVendor = newVendor;
            (line.customFields as any).sellerStatus = 'pending';
            (line.customFields as any).sellerOfferId = best.offer.id.toString();

            await repo.save(line);

            // Update parent order status
            if (order) {
                const orderRepo = this.connection.getRepository(ctx, Order);
                if (!order.customFields) {
                    (order as any).customFields = {};
                }
                (order.customFields as any).replacementHoldStatus = 'REASSIGNED_AUTOMATIC';
                await orderRepo.save(order);
            }

            console.log(`[ReplacementEngine] ✅ Automatically reassigned OrderLine ${orderLineId} to Vendor ${newVendor.name} (${newVendor.id}). Price diff was ${best.priceDiffAbs} cents.`);
            
            return { success: true, status: 'reassigned', newVendorId: newVendor.id.toString() };
        } else {
            // Price is too high, block delivery and alert marketplace manager for manual resolution
            if (!line.customFields) {
                (line as any).customFields = {};
            }
            (line.customFields as any).sellerStatus = 'reassigning';
            await repo.save(line);

            if (order) {
                const orderRepo = this.connection.getRepository(ctx, Order);
                if (!order.customFields) {
                    (order as any).customFields = {};
                }
                (order.customFields as any).replacementHoldStatus = 'MANUAL_HOLD_REQUIRED';
                await orderRepo.save(order);
            }

            console.warn(`[ReplacementEngine] ⚠️ Automatic replacement on hold for OrderLine ${orderLineId}. Best alternative was too expensive (+${best.priceDiffAbs} cents).`);
            
            return { success: false, status: 'manual_required' };
        }
    }
}
