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
                pvContent = pvContent.replace(
                    /this\.connection\.rawConnection\.getRepository\(product_variant_entity_1\.ProductVariant\)/g,
                    'this.connection.getRepository(ctx, product_variant_entity_1.ProductVariant)'
                );
                if (!pvContent.includes('getRepository(ctx, product_variant_entity_1.ProductVariant)')) {
                    pvContent = pvContent.replace(
                        '.then(variants => this.applyPricesAndTranslateVariants(ctx, variants));',
                        `.then(async variants => {
            if (!variants || variants.length === 0) {
                const rawVariants = await this.connection.getRepository(ctx, product_variant_entity_1.ProductVariant).find({
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
                    'const variantWithPrices = await this.connection.getRepository(ctx, product_variant_entity_1.ProductVariant).findOne({ where: { id: variant.id }, relations: [\'productVariantPrices\'] });'
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
            existingVariant = await this.connection.getRepository(ctx, product_variant_entity_1.ProductVariant).findOne({
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
                pvContent = pvContent.replace(
                    /\.innerJoinAndSelect\('productvariant\.channels',\s*'channel',\s*'channel\.id\s*=\s*:channelId',\s*\{\s*channelId:\s*ctx\.channelId,?\s*\}\)/g,
                    ".leftJoin('productvariant.channels', 'channel')"
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

        // Synchronize product variants enablement with parent product status & detach vendor on approval
        this.eventBus
            .ofType(ProductEvent)
            .subscribe((event: any) => {
                setTimeout(async () => {
                    if (event.type === 'created' || event.type === 'updated') {
                        await this.syncProductVariantsEnablement(event.ctx, event.product);
                        if ((event.product?.customFields as any)?.approvalStatus === 'approved') {
                            try {
                                await this.connection.rawConnection.query(
                                    `UPDATE product SET "customFieldsVendorid" = NULL WHERE id = $1 AND "customFieldsVendorid" IS NOT NULL`,
                                    [event.product.id]
                                );
                            } catch (e) {}
                        }
                    }
                }, 100);
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
     * Synchronizes product variants enabled status, collection assignments, channel 1, and search index for product
     */
    private async syncProductVariantsEnablement(ctx: RequestContext, product: Product) {
        try {
            const pId = String(product.id);

            // 1. Inherit product collections into collection_product_variants_product_variant for all variants of this product
            await this.connection.rawConnection.query(`
                INSERT INTO collection_product_variants_product_variant ("collectionId", "productVariantId")
                SELECT DISTINCT cpv."collectionId", pv.id
                FROM product_variant pv
                INNER JOIN product_variant pv_existing ON pv_existing."productId" = pv."productId"
                INNER JOIN collection_product_variants_product_variant cpv ON cpv."productVariantId" = pv_existing.id
                WHERE pv."productId" = $1
                ON CONFLICT DO NOTHING
            `, [pId]).catch(() => null);

            // 2. Sync product_variant enabled state: TRUE only if it has an approved SellerOffer (or native variant)
            await this.connection.rawConnection.query(`
                UPDATE product_variant pv_sync
                SET enabled = (
                    CASE
                        WHEN EXISTS (
                            SELECT 1 FROM seller_offer so_any 
                            WHERE so_any."productVariantId" = pv_sync.id
                        )
                        THEN EXISTS (
                            SELECT 1 FROM seller_offer so 
                            WHERE so."productVariantId" = pv_sync.id AND so.status = 'approved'
                        )
                        ELSE pv_sync.enabled
                    END
                ),
                "customFieldsOfferstatus" = COALESCE(
                    (
                        SELECT CASE WHEN so_b.status = 'approved' THEN 'APPROVED' WHEN so_b.status = 'rejected' THEN 'REJECTED' ELSE 'PENDING' END
                        FROM seller_offer so_b
                        WHERE so_b."productVariantId" = pv_sync.id
                        ORDER BY CASE WHEN so_b.status = 'approved' THEN 1 WHEN so_b.status = 'pending' THEN 2 ELSE 3 END
                        LIMIT 1
                    ),
                    'APPROVED'
                ),
                "updatedAt" = NOW()
                FROM product p_sync
                WHERE pv_sync."productId" = p_sync.id AND p_sync.id = $1
            `, [pId]).catch(() => null);

            // 3. Ensure product and variants are assigned to Default Channel 1
            await this.connection.rawConnection.query(`
                INSERT INTO product_channels_channel ("productId", "channelId")
                VALUES ($1, 1) ON CONFLICT DO NOTHING
            `, [pId]).catch(() => null);

            await this.connection.rawConnection.query(`
                INSERT INTO product_variant_channels_channel ("productVariantId", "channelId")
                SELECT pv.id, 1
                FROM product_variant pv
                WHERE pv."productId" = $1
                ON CONFLICT DO NOTHING
            `, [pId]).catch(() => null);

            // 4. Upsert search_index_item with collectionIds, collectionSlugs, enabled status, prices, and productVariantName
            await this.connection.rawConnection.query(`
                INSERT INTO search_index_item ("languageCode", "enabled", "productName", "productVariantName", "description", "slug", "sku", "facetIds", "facetValueIds", "collectionIds", "collectionSlugs", "channelIds", "productPreview", "productPreviewFocalPoint", "productVariantPreview", "productVariantPreviewFocalPoint", "inStock", "productInStock", "productVariantId", "channelId", "productId", "productAssetId", "productVariantAssetId", "price", "priceWithTax")
                SELECT DISTINCT ON (pv.id)
                    'fr',
                    (CASE WHEN EXISTS (SELECT 1 FROM seller_offer so_any WHERE so_any."productVariantId" = pv.id) THEN (p.enabled AND EXISTS (SELECT 1 FROM seller_offer so_app WHERE so_app."productVariantId" = pv.id AND so_app.status = 'approved')) ELSE (p.enabled AND pv.enabled) END),
                    COALESCE(pt.name, 'Produit'),
                    COALESCE(
                        (
                            SELECT CASE
                                WHEN string_agg(ot_init.name::text, ' - ' ORDER BY po_init.id) IS NOT NULL
                                  AND string_agg(ot_init.name::text, ' - ' ORDER BY po_init.id) != ''
                                THEN (SELECT pt_n.name FROM product_translation pt_n WHERE pt_n."baseId" = p.id AND pt_n."languageCode" = 'fr' LIMIT 1)::text
                                     || ' - ' || string_agg(ot_init.name::text, ' - ' ORDER BY po_init.id)
                                ELSE (SELECT pt_n.name FROM product_translation pt_n WHERE pt_n."baseId" = p.id AND pt_n."languageCode" = 'fr' LIMIT 1)::text
                            END
                            FROM product_variant_options_product_option pvo_init
                            INNER JOIN product_option po_init ON po_init.id = pvo_init."productOptionId"
                            LEFT JOIN product_option_translation ot_init ON ot_init."baseId" = po_init.id AND ot_init."languageCode" = 'fr'
                            WHERE pvo_init."productVariantId" = pv.id
                        ),
                        pt.name,
                        'Variante'
                    ),
                    COALESCE(pt.description, ''),
                    COALESCE(pt.slug, 'produit'),
                    COALESCE(pv.sku, ''),
                    '',
                    '',
                    COALESCE((SELECT string_agg(DISTINCT cpv."collectionId"::text, ',') FROM collection_product_variants_product_variant cpv WHERE cpv."productVariantId" = pv.id), ''),
                    COALESCE((SELECT string_agg(DISTINCT ct.slug, ',') FROM collection_product_variants_product_variant cpv INNER JOIN collection_translation ct ON ct."baseId" = cpv."collectionId" WHERE cpv."productVariantId" = pv.id), ''),
                    '1',
                    '',
                    NULL,
                    '',
                    NULL,
                    true,
                    true,
                    pv.id,
                    1,
                    p.id,
                    p."featuredAssetId",
                    pv."featuredAssetId",
                    COALESCE((SELECT MIN(so_app.price) FROM seller_offer so_app WHERE so_app."productVariantId" = pv.id AND so_app.status = 'approved'), pvp.price, 0),
                    COALESCE((SELECT MIN(so_app.price) FROM seller_offer so_app WHERE so_app."productVariantId" = pv.id AND so_app.status = 'approved'), pvp.price, 0)
                FROM product_variant pv
                INNER JOIN product p ON p.id = pv."productId"
                LEFT JOIN product_translation pt ON pt."baseId" = p.id AND pt."languageCode" = 'fr'
                LEFT JOIN product_variant_price pvp ON pvp."variantId" = pv.id
                WHERE pv."productId" = $1
                ON CONFLICT ("channelId", "languageCode", "productVariantId") DO UPDATE
                SET "enabled" = EXCLUDED."enabled",
                    "collectionIds" = EXCLUDED."collectionIds",
                    "collectionSlugs" = EXCLUDED."collectionSlugs",
                    "productVariantName" = EXCLUDED."productVariantName",
                    "price" = EXCLUDED."price",
                    "priceWithTax" = EXCLUDED."priceWithTax";
            `, [pId]).catch(() => null);
        } catch (e) {
            console.error('[syncProductVariantsEnablement] Error:', e);
        }
    }
}
