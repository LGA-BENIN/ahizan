import {
    OrderProcess,
    OrderState,
    OrderTransitionData,
    Injector,
    OrderService,
    EntityHydrator,
    TransactionalConnection,
    Order,
} from '@vendure/core';

/**
 * Custom OrderProcess for Vendure v3 Multi-Vendor Marketplace.
 * Synchronizes the state of the parent Aggregate Order when child Seller Orders transition
 * between states (Shipped, Delivered, Cancelled).
 */
export class MultivendorOrderProcess implements OrderProcess<OrderState> {
    private orderService: OrderService;
    private entityHydrator: EntityHydrator;
    private connection: TransactionalConnection;

    init(injector: Injector) {
        this.orderService = injector.get(OrderService);
        this.entityHydrator = injector.get(EntityHydrator);
        this.connection = injector.get(TransactionalConnection);
    }

    async onTransitionEnd(
        fromState: OrderState,
        toState: OrderState,
        data: OrderTransitionData
    ) {
        const { ctx, order } = data;

        // If this order is a Seller Order (has aggregateOrderId), check if sibling sub-orders
        // allow transitioning the Aggregate Order (Parent Order)
        if (order.aggregateOrderId) {
            const aggregateOrder = await this.connection.getRepository(ctx, Order).findOne({
                where: { id: order.aggregateOrderId },
                relations: ['sellerOrders'],
            });

            if (!aggregateOrder || !aggregateOrder.sellerOrders || aggregateOrder.sellerOrders.length === 0) {
                return;
            }

            const allSellerOrders = aggregateOrder.sellerOrders;

            // 1. Shipped / PartiallyShipped synchronization:
            if (toState === 'Shipped') {
                const allShippedOrDelivered = allSellerOrders.every(
                    so => so.id === order.id || so.state === 'Shipped' || so.state === 'Delivered'
                );
                if (allShippedOrDelivered && aggregateOrder.state !== 'Shipped' && aggregateOrder.state !== 'Delivered') {
                    await this.orderService.transitionToState(ctx, aggregateOrder.id, 'Shipped').catch(err => {
                        console.log(`[MultivendorOrderProcess] Aggregate order transition to Shipped:`, err?.message || err);
                    });
                } else if (!allShippedOrDelivered && aggregateOrder.state !== 'PartiallyShipped' && aggregateOrder.state !== 'Shipped' && aggregateOrder.state !== 'Delivered') {
                    await this.orderService.transitionToState(ctx, aggregateOrder.id, 'PartiallyShipped').catch(err => {
                        console.log(`[MultivendorOrderProcess] Aggregate order transition to PartiallyShipped:`, err?.message || err);
                    });
                }
            }

            // 2. Delivered / PartiallyDelivered synchronization:
            if (toState === 'Delivered') {
                const allDelivered = allSellerOrders.every(
                    so => so.id === order.id || so.state === 'Delivered'
                );
                if (allDelivered && aggregateOrder.state !== 'Delivered') {
                    await this.orderService.transitionToState(ctx, aggregateOrder.id, 'Delivered').catch(err => {
                        console.log(`[MultivendorOrderProcess] Aggregate order transition to Delivered:`, err?.message || err);
                    });
                } else if (!allDelivered && aggregateOrder.state !== 'PartiallyDelivered' && aggregateOrder.state !== 'Delivered') {
                    await this.orderService.transitionToState(ctx, aggregateOrder.id, 'PartiallyDelivered').catch(err => {
                        console.log(`[MultivendorOrderProcess] Aggregate order transition to PartiallyDelivered:`, err?.message || err);
                    });
                }
            }

            // 3. Cancelled synchronization: if all seller orders are Cancelled,
            // transition aggregate order to Cancelled
            if (toState === 'Cancelled') {
                const allCancelled = allSellerOrders.every(
                    so => so.id === order.id || so.state === 'Cancelled'
                );
                if (allCancelled && aggregateOrder.state !== 'Cancelled') {
                    await this.orderService.transitionToState(ctx, aggregateOrder.id, 'Cancelled').catch(err => {
                        console.log(`[MultivendorOrderProcess] Aggregate order transition to Cancelled:`, err?.message || err);
                    });
                }
            }
        }
    }
}

export const multivendorOrderProcess = new MultivendorOrderProcess();
