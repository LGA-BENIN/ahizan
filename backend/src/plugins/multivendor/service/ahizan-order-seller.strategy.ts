import {
    OrderSellerStrategy,
    SplitOrderContents,
    RequestContext,
    Order,
    OrderLine,
    Channel,
    EntityHydrator,
    ChannelService,
    TransactionalConnection,
    Injector,
    idsAreEqual,
    EventBus,
} from '@vendure/core';
import { Vendor } from '../entities/vendor.entity';
import { VendorService } from './vendor.service';
import { SellerOfferService } from './seller-offer.service';

/**
 * Native Vendure v3 OrderSellerStrategy for AHIZAN Multi-Vendor Marketplace.
 * 
 * 1. setOrderLineSellerChannel: Resolves and assigns each added item in the cart
 *    to the corresponding vendor's dedicated Channel.
 * 2. splitOrder: Upon checkout payment, splits the aggregate order into separate
 *    sub-orders for each seller's Channel.
 * 3. afterSellerOrdersCreated: Calculates commissions and manages vendor notifications.
 */
export class AhizanOrderSellerStrategy implements OrderSellerStrategy {
    private entityHydrator: EntityHydrator;
    private channelService: ChannelService;
    private connection: TransactionalConnection;
    private vendorService: VendorService;
    private eventBus: EventBus;
    private sellerOfferService: SellerOfferService;

    init(injector: Injector) {
        this.entityHydrator = injector.get(EntityHydrator);
        this.channelService = injector.get(ChannelService);
        this.connection = injector.get(TransactionalConnection);
        this.vendorService = injector.get(VendorService);
        this.eventBus = injector.get(EventBus);
        this.sellerOfferService = injector.get(SellerOfferService);
    }

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
     * Called whenever an item is added to an active order.
     * Determines which vendor channel owns this order line.
     */
    async setOrderLineSellerChannel(ctx: RequestContext, orderLine: OrderLine): Promise<Channel | undefined> {
        // Ensure assignedVendor and order relations are hydrated
        await this.entityHydrator.hydrate(ctx, orderLine, {
            relations: ['order', 'customFields.assignedVendor', 'customFields.assignedVendor.channel']
        });

        let vendor = (orderLine.customFields as any)?.assignedVendor;

        if (vendor) {
            if (vendor.channel) {
                return vendor.channel;
            }
            // Fetch channel if not hydrated
            const vendorEntity = await this.connection.getRepository(ctx, Vendor).findOne({
                where: { id: vendor.id },
                relations: ['channel'],
            });
            if (vendorEntity?.channel) {
                return vendorEntity.channel;
            }
        }

        const orderId = orderLine.order?.id;

        // If no assignedVendor is set, find the best offer using selection engine
        const offers = await this.sellerOfferService.getOffersForVariant(ctx, orderLine.productVariant.id.toString());
        if (offers.length > 0) {
            // Apply Logistics Selection Algorithm (Section 5.3):
            // 1. Grouping: Prefer vendor who already has items in this same order/cart
            const existingVendorIds = new Set<string>();
            try {
                if (orderId) {
                    const order = await this.connection.getRepository(ctx, Order).findOne({
                        where: { id: orderId },
                        relations: ['lines', 'lines.customFields.assignedVendor']
                    });
                    if (order?.lines) {
                        for (const line of order.lines) {
                            const v = (line.customFields as any)?.assignedVendor;
                            if (v && !idsAreEqual(line.id, orderLine.id)) {
                                existingVendorIds.add(v.id.toString());
                            }
                        }
                    }
                }
            } catch (err) {
                console.error('[AhizanOrderSellerStrategy] Error loading order lines for grouping check:', err);
            }

            // Resolve customer coordinates for proximity check
            let lat: number | null = null;
            let lng: number | null = null;
            try {
                if (orderId) {
                    const order = await this.connection.getRepository(ctx, Order).findOne({
                        where: { id: orderId }
                    });
                    if (order?.shippingAddress) {
                        lat = order.shippingAddress.customFields?.latitude;
                        lng = order.shippingAddress.customFields?.longitude;
                        if (lat == null || lng == null) {
                            const city = (order.shippingAddress.city || '').toLowerCase();
                            if (city.includes('cotonou')) { lat = 6.3654; lng = 2.4183; }
                            else if (city.includes('porto') || city.includes('novo')) { lat = 6.4969; lng = 2.6289; }
                            else if (city.includes('parakou')) { lat = 9.3371; lng = 2.6303; }
                            else if (city.includes('calavi') || city.includes('abomey')) { lat = 6.4485; lng = 2.3556; }
                            else if (city.includes('ouidah')) { lat = 6.3631; lng = 2.0851; }
                            else if (city.includes('bohicon')) { lat = 7.1783; lng = 2.0667; }
                        }
                    }
                }
            } catch (err) {}

            const sortedOffers = offers.sort((a, b) => {
                // Priority 1: Check if vendor already has another item in cart
                const aInCart = existingVendorIds.has((a.vendor as any).id.toString()) ? 1 : 0;
                const bInCart = existingVendorIds.has((b.vendor as any).id.toString()) ? 1 : 0;
                if (aInCart !== bInCart) {
                    return bInCart - aInCart; // vendor in cart first
                }

                // Priority 2: Proximity if coordinates are available
                if (lat != null && lng != null) {
                    const distA = a.vendor.latitude != null && a.vendor.longitude != null 
                        ? this.getDistanceKm(lat, lng, a.vendor.latitude, a.vendor.longitude)
                        : 9999;
                    const distB = b.vendor.latitude != null && b.vendor.longitude != null 
                        ? this.getDistanceKm(lat, lng, b.vendor.latitude, b.vendor.longitude)
                        : 9999;
                    if (Math.abs(distA - distB) > 1) { // diff > 1km
                        return distA - distB; // closer vendor first
                    }
                }

                // Priority 3: Price
                if (a.price !== b.price) {
                    return a.price - b.price; // lowest price first
                }

                // Priority 4: Rating
                const ratingA = a.vendor?.rating || 0;
                const ratingB = b.vendor?.rating || 0;
                return ratingB - ratingA; // highest rating first
            });

            const bestOffer = sortedOffers[0];
            
            // Assign this vendor to the order line custom fields
            (orderLine.customFields as any).assignedVendor = bestOffer.vendor;
            await this.connection.getRepository(ctx, OrderLine).save(orderLine);

            if (bestOffer.vendor?.channel) {
                return bestOffer.vendor.channel;
            }
            // Hydrate channel if missing
            const vendorEntity = await this.connection.getRepository(ctx, Vendor).findOne({
                where: { id: bestOffer.vendor.id },
                relations: ['channel'],
            });
            if (vendorEntity?.channel) {
                return vendorEntity.channel;
            }
        }

        // Fallback to legacy Product.customFields.vendor for safety
        await this.entityHydrator.hydrate(ctx, orderLine.productVariant, {
            relations: ['product', 'product.customFields.vendor', 'product.customFields.vendor.channel']
        });
        const legacyVendor = (orderLine.productVariant.product?.customFields as any)?.vendor;
        if (legacyVendor) {
            const vendorEntity = await this.connection.getRepository(ctx, Vendor).findOne({
                where: { id: legacyVendor.id },
                relations: ['channel'],
            });
            if (vendorEntity?.channel) {
                // Also set it on orderLine for consistency
                (orderLine.customFields as any).assignedVendor = legacyVendor;
                await this.connection.getRepository(ctx, OrderLine).save(orderLine);
                return vendorEntity.channel;
            }
        }

        return undefined;
    }

    /**
     * Splits the order into multiple sub-orders, one per seller channel.
     */
    async splitOrder(ctx: RequestContext, order: Order): Promise<SplitOrderContents[]> {
        await this.entityHydrator.hydrate(ctx, order, {
            relations: [
                'lines',
                'lines.sellerChannel',
                'shippingLines',
                'shippingLines.shippingMethod',
                'shippingLines.shippingMethod.channels',
            ],
        });

        const splitContents = new Map<string, SplitOrderContents>();

        for (const line of order.lines) {
            if (!line.sellerChannelId) {
                continue;
            }
            const channelId = line.sellerChannelId.toString();
            let contents = splitContents.get(channelId);
            if (!contents) {
                contents = {
                    channelId: line.sellerChannelId,
                    state: 'ArrangingPayment',
                    lines: [],
                    shippingLines: [],
                };
                splitContents.set(channelId, contents);
            }
            contents.lines.push(line);
        }

        // Assign shipping lines to seller channels
        for (const shippingLine of order.shippingLines) {
            const methodChannels = (shippingLine.shippingMethod as any)?.channels || [];
            for (const [channelId, contents] of splitContents.entries()) {
                const isForChannel = methodChannels.some((c: any) => idsAreEqual(c.id, channelId));
                if (isForChannel || splitContents.size === 1) {
                    contents.shippingLines.push(shippingLine);
                }
            }
        }

        return Array.from(splitContents.values());
    }

    /**
     * Hook called after seller sub-orders have been created.
     * Computes commissions for each seller order.
     */
    async afterSellerOrdersCreated(ctx: RequestContext, aggregateOrder: Order, sellerOrders: Order[]): Promise<void> {
        for (const sellerOrder of sellerOrders) {
            try {
                await this.vendorService.calculateAndSaveOrderCommission(ctx, sellerOrder.id.toString());
            } catch (err) {
                console.error(`[AhizanOrderSellerStrategy] Error calculating commission for seller order ${sellerOrder.id}:`, err);
            }
        }
    }
}
