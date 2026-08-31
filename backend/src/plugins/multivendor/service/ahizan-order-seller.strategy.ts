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
     * Assigns the best seller to orderLine.customFields.assignedVendor while keeping
     * the line visible in the customer's cart in the default channel.
     */
    async setOrderLineSellerChannel(ctx: RequestContext, orderLine: OrderLine): Promise<Channel | undefined> {
        let vendor = (orderLine.customFields as any)?.assignedVendor;
        if (vendor) {
            return undefined;
        }

        const variantId = orderLine.productVariant?.id?.toString();
        if (!variantId) {
            return undefined;
        }

        try {
            // Find best offer using sellerOfferService
            const offers = await this.sellerOfferService.getOffersForVariant(ctx, variantId);
            if (offers && offers.length > 0) {
                // Apply selection algorithm: Lowest price first, then highest rating
                const sortedOffers = offers.sort((a, b) => {
                    if (a.price !== b.price) {
                        return a.price - b.price;
                    }
                    const ratingA = a.vendor?.rating || 0;
                    const ratingB = b.vendor?.rating || 0;
                    return ratingB - ratingA;
                });
                const bestOffer = sortedOffers[0];

                if (!orderLine.customFields) {
                    (orderLine as any).customFields = {};
                }
                (orderLine.customFields as any).assignedVendor = bestOffer.vendor;
            }
        } catch (err) {
            console.error('[AhizanOrderSellerStrategy] Error assigning vendor to order line:', err);
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
                'lines.customFields.assignedVendor',
                'lines.customFields.assignedVendor.channel',
                'shippingLines',
                'shippingLines.shippingMethod',
                'shippingLines.shippingMethod.channels',
            ],
        });

        const defaultChannel = await this.channelService.getDefaultChannel(ctx);
        const splitContents = new Map<string, SplitOrderContents>();

        for (const line of order.lines) {
            let channelId = line.sellerChannelId?.toString();
            
            if (!channelId) {
                const assignedVendor = (line.customFields as any)?.assignedVendor;
                if (assignedVendor && (assignedVendor as any).channel?.id) {
                    channelId = (assignedVendor as any).channel.id.toString();
                } else if (assignedVendor && (assignedVendor as any).id) {
                    const vendorEntity = await this.connection.getRepository(ctx, Vendor).findOne({
                        where: { id: (assignedVendor as any).id },
                        relations: ['channel'],
                    });
                    if (vendorEntity?.channel?.id) {
                        channelId = vendorEntity.channel.id.toString();
                    }
                }
            }

            if (!channelId) {
                // Fallback: find best offer vendor's channel
                const offers = await this.sellerOfferService.getOffersForVariant(ctx, line.productVariant.id.toString());
                if (offers.length > 0) {
                    const bestVendor = offers[0].vendor;
                    const vendorEntity = await this.connection.getRepository(ctx, Vendor).findOne({
                        where: { id: (bestVendor as any).id },
                        relations: ['channel'],
                    });
                    if (vendorEntity?.channel?.id) {
                        channelId = vendorEntity.channel.id.toString();
                    }
                }
            }

            // If no seller channel is found, or if the channel is the default channel:
            // Skip creating a separate SellerOrder. In Vendure multivendor architecture,
            // default channel lines remain on the aggregate order.
            if (!channelId || idsAreEqual(channelId, defaultChannel.id)) {
                continue;
            }

            let contents = splitContents.get(channelId);
            if (!contents) {
                contents = {
                    channelId: channelId as any,
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
