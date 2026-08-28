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

    init(injector: Injector) {
        this.entityHydrator = injector.get(EntityHydrator);
        this.channelService = injector.get(ChannelService);
        this.connection = injector.get(TransactionalConnection);
        this.vendorService = injector.get(VendorService);
        this.eventBus = injector.get(EventBus);
    }

    /**
     * Called whenever an item is added to an active order.
     * Determines which vendor channel owns this order line.
     */
    async setOrderLineSellerChannel(ctx: RequestContext, orderLine: OrderLine): Promise<Channel | undefined> {
        await this.entityHydrator.hydrate(ctx, orderLine.productVariant, {
            relations: [
                'channels',
                'product',
                'product.customFields.vendor',
                'product.customFields.vendor.channel'
            ]
        });

        const defaultChannel = await this.channelService.getDefaultChannel(ctx);

        // 1. Check if the variant has a non-default channel assigned
        const nonDefaultChannel = orderLine.productVariant.channels?.find(
            c => !idsAreEqual(c.id, defaultChannel.id)
        );
        if (nonDefaultChannel) {
            return nonDefaultChannel;
        }

        // 2. Check via product customFields.vendor relation
        const vendor = (orderLine.productVariant.product?.customFields as any)?.vendor;
        if (vendor) {
            const vendorEntity = await this.connection.getRepository(ctx, Vendor).findOne({
                where: { id: vendor.id },
                relations: ['channel'],
            });
            if (vendorEntity?.channel) {
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
