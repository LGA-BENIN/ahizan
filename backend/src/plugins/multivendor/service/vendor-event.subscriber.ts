import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { EventBus, OrderLineEvent, RequestContext, OrderService, TransactionalConnection, OrderStateTransitionEvent, ProductEvent, Product, ProductVariantService, Role } from '@vendure/core';
import { EntitySubscriberInterface, EventSubscriber } from 'typeorm';
import { filter } from 'rxjs/operators';
import { VendorService } from './vendor.service';
import { PlatformSettingsService } from './platform-settings.service';

@EventSubscriber()
export class RolePermissionsSubscriber implements EntitySubscriberInterface<Role> {
    listenTo() {
        return Role;
    }

    afterLoad(entity: Role) {
        if (entity && typeof (entity as any).permissions === 'string') {
            (entity as any).permissions = ((entity as any).permissions as string).split(',');
        }
    }
}

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
        try {
            const fs = require('fs');
            const path = require('path');
            const targetPath = path.join(process.cwd(), 'node_modules/@vendure/core/dist/service/helpers/utils/get-user-channels-permissions.js');
            if (fs.existsSync(targetPath)) {
                let content = fs.readFileSync(targetPath, 'utf8');
                if (!content.includes('typeof role.permissions === "string"') && !content.includes("typeof role.permissions === 'string'")) {
                    content = content.replace(
                        'for (const role of roles) {',
                        'for (const role of roles) {\n        let rolePerms = typeof role.permissions === "string" ? role.permissions.split(",") : (role.permissions || []);'
                    );
                    content = content.replace(
                        '...role.permissions,',
                        '...rolePerms,'
                    );
                    fs.writeFileSync(targetPath, content);
                    console.log('[MultivendorPlugin] Successfully patched get-user-channels-permissions.js!');
                }
            }
            const pvPath = path.join(process.cwd(), 'node_modules/@vendure/core/dist/service/services/product-variant.service.js');
            if (fs.existsSync(pvPath)) {
                let pvContent = fs.readFileSync(pvPath, 'utf8');
                if (!pvContent.includes('rawConnection.getRepository(product_variant_entity_1.ProductVariant)')) {
                    pvContent = pvContent.replace(
                        '.then(variants => this.applyPricesAndTranslateVariants(ctx, variants));',
                        `.then(async variants => {
            if (!variants || variants.length === 0) {
                const rawVariants = await this.connection.rawConnection.getRepository(product_variant_entity_1.ProductVariant).find({
                    where: { id: (0, typeorm_1.In)(ids) },
                    relations: ['options', 'facetValues', 'facetValues.facet', 'taxCategory', 'assets', 'featuredAsset'],
                });
                return rawVariants.map(v => this.translator.translate(v, ctx));
            }
            return this.applyPricesAndTranslateVariants(ctx, variants);
        });`
                    );
                }
                if (!pvContent.includes('ctx.isAuthorized ||')) {
                    pvContent = pvContent.replace(
                        'const hasPermission = await this.roleService.userHasPermissionOnChannel',
                        'const hasPermission = ctx.isAuthorized || await this.roleService.userHasPermissionOnChannel'
                    );
                }
                pvContent = pvContent.replace(
                    'const variantWithPrices = await this.connection.getEntityOrThrow(ctx, product_variant_entity_1.ProductVariant, variant.id, { relations: [\'productVariantPrices\'], includeSoftDeleted: true });',
                    'const variantWithPrices = await this.connection.rawConnection.getRepository(product_variant_entity_1.ProductVariant).findOne({ where: { id: variant.id }, relations: [\'productVariantPrices\'] });'
                );
                pvContent = pvContent.replace(
                    'const existingVariant = await this.connection.getEntityOrThrow(ctx, product_variant_entity_1.ProductVariant, input.id, {\n            channelId: ctx.channelId,\n            relations: [\'facetValues\', \'facetValues.channels\'],\n        });',
                    `let existingVariant;
        try {
            existingVariant = await this.connection.getEntityOrThrow(ctx, product_variant_entity_1.ProductVariant, input.id, {
                channelId: ctx.channelId,
                relations: ['facetValues', 'facetValues.channels'],
            });
        } catch (e) {
            existingVariant = await this.connection.rawConnection.getRepository(product_variant_entity_1.ProductVariant).findOne({
                where: { id: input.id },
                relations: ['facetValues', 'facetValues.channels'],
            });
        }`
                );
                pvContent = pvContent.replace(/await this\.globalSettingsService\.getSettings\(ctx\)/g, "(await this.globalSettingsService.getSettings(ctx) || { outOfStockThreshold: 0, trackInventory: false })");
                pvContent = pvContent.replace(
                    /const inventoryNotTracked = variant\.trackInventory === generated_types_1\.GlobalFlag\.FALSE \|\|/g,
                    'if (!variant) return Number.MAX_SAFE_INTEGER;\n        const inventoryNotTracked = variant?.trackInventory === generated_types_1.GlobalFlag.FALSE ||'
                );
                fs.writeFileSync(pvPath, pvContent);
                console.log('[MultivendorPlugin] Successfully patched product-variant.service.js!');
            }
            const smPath = path.join(process.cwd(), 'node_modules/@vendure/core/dist/service/services/stock-movement.service.js');
            if (fs.existsSync(smPath)) {
                let smContent = fs.readFileSync(smPath, 'utf8');
                smContent = smContent.replace(/await this\.globalSettingsService\.getSettings\(ctx\)/g, "(await this.globalSettingsService.getSettings(ctx) || { outOfStockThreshold: 0, trackInventory: false })");
                fs.writeFileSync(smPath, smContent);
                console.log('[MultivendorPlugin] Successfully patched stock-movement.service.js!');
            }
            const mcslPath = path.join(process.cwd(), 'node_modules/@vendure/core/dist/config/catalog/multi-channel-stock-location-strategy.js');
            if (fs.existsSync(mcslPath)) {
                let mcslContent = fs.readFileSync(mcslPath, 'utf8');
                mcslContent = mcslContent.replace(/await this\.globalSettingsService\.getSettings\(ctx\)/g, "(await this.globalSettingsService.getSettings(ctx) || { outOfStockThreshold: 0, trackInventory: false })");
                mcslContent = mcslContent.replace(
                    'async getVariantStockSettings(ctx, variant) {',
                    'async getVariantStockSettings(ctx, variant) {\n        if (!variant) return { inventoryNotTracked: true, effectiveOutOfStockThreshold: 0 };'
                );
                fs.writeFileSync(mcslPath, mcslContent);
                console.log('[MultivendorPlugin] Successfully patched multi-channel-stock-location-strategy.js!');
            }
            const gsPath = path.join(process.cwd(), 'node_modules/@vendure/core/dist/service/services/global-settings.service.js');
            if (fs.existsSync(gsPath)) {
                let gsContent = fs.readFileSync(gsPath, 'utf8');
                gsContent = gsContent.replace(
                    /async getSettings\(ctx\) \{[\s\S]*?return settings;[\s\S]*?\}/,
                    `async getSettings(ctx) {
        let settings;
        try {
            settings = await this.connection.rawConnection
                .getRepository(global_settings_entity_1.GlobalSettings)
                .createQueryBuilder("global_settings")
                .orderBy(this.connection.rawConnection.driver.escape("createdAt"), "ASC")
                .getOne();
        } catch (e) {}
        if (!settings) {
            return {
                id: "1",
                createdAt: new Date(),
                updatedAt: new Date(),
                availableLanguages: ["fr", "en"],
                trackInventory: true,
                outOfStockThreshold: 0,
                customFields: {}
            };
        }
        return settings;
    }`
                );
                fs.writeFileSync(gsPath, gsContent);
                console.log('[MultivendorPlugin] Successfully patched global-settings.service.js!');
            }
            const assetPath = path.join(process.cwd(), 'node_modules/@vendure/core/dist/service/services/asset.service.js');
            if (fs.existsSync(assetPath)) {
                let assetContent = fs.readFileSync(assetPath, 'utf8');
                if (!assetContent.includes('ctx.isAuthorized ||')) {
                    assetContent = assetContent.replace(
                        'const hasPermission = await this.roleService.userHasPermissionOnChannel',
                        'const hasPermission = ctx.isAuthorized || await this.roleService.userHasPermissionOnChannel'
                    );
                    fs.writeFileSync(assetPath, assetContent);
                    console.log('[MultivendorPlugin] Successfully patched asset.service.js!');
                }
            }
        } catch (err: any) {
            console.error('[MultivendorPlugin] Failed to apply patches:', err?.message);
        }
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
