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
        // Rule: Single Vendor per Order + Wallet Eligibility Check
        this.eventBus
            .ofType(OrderLineEvent)
            .pipe(filter(event => event.type === 'created'))
            .subscribe(async event => {
                await this.checkOrderVendor(event.ctx, event.order.id.toString(), event.orderLine.productVariant.productId.toString());
            });

        // Rule: Deduct Commission from Wallet when payment is arranged
        this.eventBus
            .ofType(OrderStateTransitionEvent)
            .pipe(filter(event => event.toState === 'ArrangingPayment'))
            .subscribe(async event => {
                await this.deductCommissionFromWallet(event.ctx, event.order.id.toString());
            });

        // Rule: Calculate & record Commission amount on PaymentSettled
        this.eventBus
            .ofType(OrderStateTransitionEvent)
            .pipe(filter(event => event.toState === 'PaymentSettled'))
            .subscribe(async event => {
                await this.calculateCommission(event.ctx, event.order.id.toString());
            });

        // Rule: Refund commission if order is Cancelled
        this.eventBus
            .ofType(OrderStateTransitionEvent)
            .pipe(filter(event => event.toState === 'Cancelled'))
            .subscribe(async event => {
                await this.refundCommissionToWallet(event.ctx, event.order.id.toString());
            });
    }

    private async calculateCommission(ctx: RequestContext, orderId: string) {
        const order = await this.orderService.findOne(ctx, orderId, ['lines', 'lines.productVariant', 'lines.productVariant.product', 'lines.productVariant.product.customFields.vendor']);
        if (!order) return;

        let vendor = null;
        for (const line of order.lines) {
            const v = (line.productVariant.product.customFields as any).vendor;
            if (v) { vendor = v; break; }
        }

        if (vendor) {
            const vendorEntity = await this.vendorService.findOne(ctx, vendor.id);
            if (vendorEntity && vendorEntity.commissionRate > 0) {
                const total = order.totalWithTax;
                const commission = Math.round((total * vendorEntity.commissionRate) / 100);
                await this.vendorService.setOrderCommission(ctx, orderId, commission);
            }
        }
    }

    /**
     * Deducts the estimated commission from the vendor wallet when the order enters ArrangingPayment.
     * This "reserves" the commission so the vendor cannot spend the balance during fulfillment.
     */
    private async deductCommissionFromWallet(ctx: RequestContext, orderId: string) {
        const order = await this.orderService.findOne(ctx, orderId, ['lines', 'lines.productVariant', 'lines.productVariant.product', 'lines.productVariant.product.customFields.vendor']);
        if (!order) return;

        let vendor = null;
        for (const line of order.lines) {
            const v = (line.productVariant.product.customFields as any).vendor;
            if (v) { vendor = v; break; }
        }
        if (!vendor) return;

        const vendorEntity = await this.vendorService.findOne(ctx, vendor.id);
        if (!vendorEntity || vendorEntity.commissionRate <= 0) return;

        const commission = Math.round((order.totalWithTax * vendorEntity.commissionRate) / 100);
        if (commission <= 0) return;

        await this.vendorService.debitWallet(ctx, vendorEntity.id.toString(), commission);
        console.log(`[Wallet] Debited ${commission} from vendor ${vendorEntity.name} for order ${orderId}`);
    }

    /**
     * Refunds the commission back to the vendor's wallet if the order is cancelled.
     */
    private async refundCommissionToWallet(ctx: RequestContext, orderId: string) {
        const order = await this.orderService.findOne(ctx, orderId, ['lines', 'lines.productVariant', 'lines.productVariant.product', 'lines.productVariant.product.customFields.vendor', 'customFields.vendor']);
        if (!order) return;

        // Only refund if we previously deducted (order must have been in ArrangingPayment or beyond)
        const orderVendor = (order.customFields as any).vendor;
        if (!orderVendor) return;

        const vendorEntity = await this.vendorService.findOne(ctx, orderVendor.id);
        if (!vendorEntity || vendorEntity.commissionRate <= 0) return;

        const commission = Math.round((order.totalWithTax * vendorEntity.commissionRate) / 100);
        if (commission <= 0) return;

        await this.vendorService.creditWallet(ctx, vendorEntity.id.toString(), commission);
        console.log(`[Wallet] Refunded ${commission} to vendor ${vendorEntity.name} for cancelled order ${orderId}`);
    }

    private async checkOrderVendor(ctx: RequestContext, orderId: string, productId: string | number) {
        const productVendor = await this.vendorService.getVendorByProductId(ctx, productId.toString());

        if (!productVendor) {
            // Product has no vendor — allow (SuperAdmin product)
            return;
        }

        const isValid = await this.vendorService.validateOrderForVendor(ctx, orderId, productVendor.id.toString());

        if (!isValid) {
            const order = await this.orderService.findOne(ctx, orderId, ['lines', 'lines.productVariant']);
            if (order) {
                const lineToRemove = order.lines.find(l => l.productVariant.productId === productId);
                if (lineToRemove) {
                    await this.orderService.removeItemFromOrder(ctx, orderId, lineToRemove.id);
                }
            }
        } else {
            await this.vendorService.setOrderVendor(ctx, orderId, productVendor.id.toString());
        }
    }
}
