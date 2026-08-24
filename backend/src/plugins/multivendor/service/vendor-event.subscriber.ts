import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { EventBus, OrderLineEvent, RequestContext, OrderService, TransactionalConnection, OrderStateTransitionEvent } from '@vendure/core';
import { filter } from 'rxjs/operators';
import { VendorService } from './vendor.service';
import { PlatformSettingsService } from './platform-settings.service';

@Injectable()
export class VendorOrderSubscriber implements OnApplicationBootstrap {
    constructor(
        private eventBus: EventBus,
        private vendorService: VendorService,
        private orderService: OrderService,
        private connection: TransactionalConnection,
        private platformSettingsService: PlatformSettingsService,
    ) { }

    onApplicationBootstrap() {
        // Calculate & record Commission amount on PaymentSettled
        this.eventBus
            .ofType(OrderStateTransitionEvent)
            .pipe(filter(event => event.toState === 'PaymentSettled'))
            .subscribe(async event => {
                await this.vendorService.calculateAndSaveOrderCommission(event.ctx, event.order.id.toString());
            });

        // Refund commission if order is Cancelled
        this.eventBus
            .ofType(OrderStateTransitionEvent)
            .pipe(filter(event => event.toState === 'Cancelled'))
            .subscribe(async event => {
                await this.refundCommissionToWallet(event.ctx, event.order.id.toString());
            });
    }

    /**
     * Refunds the commission back to the vendor's wallet if the order is cancelled.
     */
    private async refundCommissionToWallet(ctx: RequestContext, orderId: string) {
        const order = await this.orderService.findOne(ctx, orderId, ['lines', 'lines.productVariant', 'lines.productVariant.product', 'lines.productVariant.product.customFields.vendor', 'customFields.vendor']);
        if (!order) return;

        const orderVendor = (order.customFields as any).vendor;
        if (!orderVendor) return;

        const vendorEntity = await this.vendorService.findOne(ctx, orderVendor.id);
        if (!vendorEntity) return;

        const commission = (order.customFields as any)?.commissionAmount || 0;
        if (commission <= 0) return;

        await this.vendorService.creditWallet(ctx, vendorEntity.id.toString(), commission);
        console.log(`[Wallet] Refunded ${commission} to vendor ${vendorEntity.name} for cancelled order ${orderId}`);
    }
}
