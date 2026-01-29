import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { EventBus, OrderLineEvent, RequestContext, OrderService, TransactionalConnection, OrderStateTransitionEvent } from '@vendure/core';
import { filter } from 'rxjs/operators';
import { VendorService } from './vendor.service';

@Injectable()
export class VendorOrderSubscriber implements OnApplicationBootstrap {
    constructor(
        private eventBus: EventBus,
        private vendorService: VendorService,
        private orderService: OrderService,
        private connection: TransactionalConnection,
    ) { }

    onApplicationBootstrap() {
        // Rule: Single Vendor per Order
        this.eventBus
            .ofType(OrderLineEvent)
            .pipe(filter(event => event.type === 'created'))
            .subscribe(async event => {
                await this.checkOrderVendor(event.ctx, event.order.id.toString(), event.orderLine.productVariant.productId.toString());
            });

        // Rule: Calculate Commission on Payment
        this.eventBus
            .ofType(OrderStateTransitionEvent)
            .pipe(filter(event => event.toState === 'PaymentSettled'))
            .subscribe(async event => {
                await this.calculateCommission(event.ctx, event.order.id.toString());
            });
    }

    private async calculateCommission(ctx: RequestContext, orderId: string) {
        const order = await this.orderService.findOne(ctx, orderId, ['lines', 'lines.productVariant', 'lines.productVariant.product', 'lines.productVariant.product.customFields.vendor']);
        if (!order) return;

        // Find vendor from items (should be single vendor due to rule above)
        // We pick the first line that has a vendor
        let vendor = null;
        for (const line of order.lines) {
            const v = (line.productVariant.product.customFields as any).vendor;
            if (v) {
                vendor = v;
                break;
            }
        }

        if (vendor) {
            // Re-fetch vendor to get latest commission rate
            const vendorEntity = await this.vendorService.findOne(ctx, vendor.id);
            if (vendorEntity && vendorEntity.commissionRate > 0) {
                const total = order.totalWithTax; // or total (without tax)? usually commission is on total sales.
                const commission = Math.round((total * vendorEntity.commissionRate) / 100);
                await this.vendorService.setOrderCommission(ctx, orderId, commission);
            }
        }
    }

    private async checkOrderVendor(ctx: RequestContext, orderId: string, productId: string | number) {
        // Resolve vendor for the added product
        const productVendor = await this.vendorService.getVendorByProductId(ctx, productId.toString());

        if (!productVendor) {
            // Product has no vendor. In V1, we might allow this (or assume Admin is the vendor?)
            // For now, allow.
            return;
        }

        // Validate
        const isValid = await this.vendorService.validateOrderForVendor(ctx, orderId, productVendor.id.toString());

        if (!isValid) {
            // How to block? 
            // Since this is a subscriber, we can't easily block the original request if it's already committed.
            // But 'OrderLineEvent' type 'created' means it happened.
            // If we throw here, it might be unhandled promise rejection if not awaited by event bus?
            // Actually, Vendure EventBus is usually fire-and-forget unless we use synchronous subscribers.
            // So we must remove the item to enforce the rule!

            // Remove the order line we just added
            // We need to match the line. 
            // Ideally we would throw BEFORE adding.
            // But since we are here, we must undo.

            // Re-fetch order to find the latest line
            const order = await this.orderService.findOne(ctx, orderId, ['lines', 'lines.productVariant']);
            if (order) {
                const lineToRemove = order.lines.find(l => l.productVariant.productId === productId);
                if (lineToRemove) {
                    await this.orderService.removeItemFromOrder(ctx, orderId, lineToRemove.id);
                    // TODO: Notify user? Implementation detail: The user will just see item dissapear or not appear.
                    // This is not ideal UX but robust for backend.
                    // Ideally, we'd use a Custom Strategy.
                }
            }
        } else {
            // If valid, ensure Order has the vendor set
            await this.vendorService.setOrderVendor(ctx, orderId, productVendor.id.toString());
        }
    }
}
