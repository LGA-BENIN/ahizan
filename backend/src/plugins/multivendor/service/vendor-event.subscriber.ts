import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { EventBus, OrderLineEvent, RequestContext, OrderService, TransactionalConnection, OrderStateTransitionEvent, ProductEvent, Product, ProductVariantService } from '@vendure/core';
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
        private productVariantService: ProductVariantService,
    ) { }

    onApplicationBootstrap() {
        // Calculate & record Commission amount on PaymentSettled
        this.eventBus
            .ofType(OrderStateTransitionEvent)
            .pipe(filter((event: any) => event.toState === 'PaymentSettled'))
            .subscribe(async (event: any) => {
                await this.vendorService.calculateAndSaveOrderCommission(event.ctx, event.order.id.toString());
            });

        // Refund commission if order is Cancelled
        this.eventBus
            .ofType(OrderStateTransitionEvent)
            .pipe(filter((event: any) => event.toState === 'Cancelled'))
            .subscribe(async (event: any) => {
                await this.refundCommissionToWallet(event.ctx, event.order.id.toString());
            });

        // Synchronize product variants enablement with parent product status
        this.eventBus
            .ofType(ProductEvent)
            .subscribe(async (event: any) => {
                if (event.type === 'created' || event.type === 'updated') {
                    await this.syncProductVariantsEnablement(event.ctx, event.product);
                }
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

        await this.vendorService.creditWallet(ctx, (vendorEntity as any).id.toString(), commission);
        console.log(`[Wallet] Refunded ${commission} to vendor ${vendorEntity.name} for cancelled order ${orderId}`);
    }

    /**
     * Synchronizes product variants enabled status with the product enabled status
     */
    private async syncProductVariantsEnablement(ctx: RequestContext, product: Product) {
        let variants = product.variants;
        if (!variants) {
            const productWithVariants = await this.connection.getRepository(ctx, Product).findOne({
                where: { id: product.id },
                relations: ['variants']
            });
            variants = productWithVariants?.variants || [];
        }

        const variantsToUpdate = variants.filter((v: any) => v.enabled !== product.enabled);
        if (variantsToUpdate.length > 0) {
            console.log(`[ProductSync] Synchronizing enabled status (${product.enabled}) on ${variantsToUpdate.length} variants for product ${product.id}`);
            const adminCtx = await this.vendorService.getSuperAdminContext(ctx);
            await this.productVariantService.update(adminCtx, variantsToUpdate.map((v: any) => ({
                id: v.id,
                enabled: product.enabled
            })));
        }
    }
}
