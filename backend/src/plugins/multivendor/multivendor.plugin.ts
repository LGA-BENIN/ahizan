import { PluginCommonModule, VendurePlugin, PermissionDefinition, SearchService, RequestContext, TransactionalConnection } from '@vendure/core';
import { OnApplicationBootstrap } from '@nestjs/common';
import { Vendor } from './entities/vendor.entity';
import { PlatformSettings } from './entities/platform-settings.entity';
import { OrderStatus } from './entities/order-status.entity';
import { VendorLike } from './entities/vendor-like.entity';
import { ProductLike } from './entities/product-like.entity';
import { ChatMessage } from './entities/chat-message.entity';
import { WithdrawalRequest } from './entities/withdrawal-request.entity';
import { VendorService } from './service/vendor.service';
import { VendorOrderSubscriber, RolePermissionsSubscriber } from './service/vendor-event.subscriber';
import { PlatformSettingsService } from './service/platform-settings.service';
import { OrderStatusService } from './service/order-status.service';
import { LikeService } from './service/like.service';
import { ChatService } from './service/chat.service';
import { SellerOfferService } from './service/seller-offer.service';
import { ReplacementEngineService } from './service/replacement-engine.service';
import { AiNormalizerService } from './service/ai-normalizer.service';
import { adminApiExtensions, shopApiExtensions, commonApiExtensions } from './api/api-extensions';
import { VendorResolver, VendorAdminResolver, WithdrawalRequestEntityResolver } from './api/vendor.resolver';
import { VendorShopResolver, ProductVariantShopResolver, SellerOfferEntityResolver, ProductShopResolver } from './api/vendor-shop.resolver';
import { VendorShopApiResolver } from './api/vendor-shop-api.resolver';
import { PlatformSettingsAdminResolver, PlatformSettingsShopResolver } from './api/platform-settings.resolver';
import { OrderStatusAdminResolver, OrderStatusShopResolver } from './api/order-status.resolver';
import { LikeShopResolver, LikeAdminResolver } from './api/like.resolver';
import { ChatResolver } from './api/chat.resolver';
import { ChatAdminResolver } from './api/chat-admin.resolver';
import { gql } from 'graphql-tag';
import { GeoEnginePlugin } from '../geo-engine/geo-engine.plugin';
import { AhizanNotificationsPlugin } from '../notifications/ahizan-notifications.plugin';
import { SellerOffer } from './entities/seller-offer.entity';
import { Settlement } from './entities/settlement.entity';
import { Payout } from './entities/payout.entity';
import { DeliveryMission } from './entities/delivery-mission.entity';
import { Dispute } from './entities/dispute.entity';
import { LogisticsHubService } from './service/logistics-hub.service';
import { SettlementService } from './service/settlement.service';
import { LogisticsHubAdminResolver } from './api/logistics-hub.resolver';
import { SettlementAdminResolver } from './api/settlement.resolver';

@VendurePlugin({
    imports: [PluginCommonModule, GeoEnginePlugin, AhizanNotificationsPlugin],

    entities: [
        Vendor, 
        PlatformSettings, 
        OrderStatus, 
        VendorLike, 
        ProductLike, 
        ChatMessage, 
        WithdrawalRequest, 
        SellerOffer,
        Settlement,
        Payout,
        DeliveryMission,
        Dispute
    ],

    providers: [
        VendorService,
        VendorOrderSubscriber,
        RolePermissionsSubscriber,
        PlatformSettingsService,
        OrderStatusService,
        LikeService,
        ChatService,
        SellerOfferService,
        ReplacementEngineService,
        AiNormalizerService,
        LogisticsHubService,
        SettlementService,
    ],

    dashboard: './dashboard',

    compatibility: '^3.0.0',

    adminApiExtensions: {
        schema: gql`
${commonApiExtensions}

${adminApiExtensions}
        `,
        resolvers: [VendorAdminResolver, VendorShopResolver, ProductShopResolver, ProductVariantShopResolver, SellerOfferEntityResolver, PlatformSettingsAdminResolver, OrderStatusAdminResolver, LikeAdminResolver, ChatAdminResolver, WithdrawalRequestEntityResolver, LogisticsHubAdminResolver, SettlementAdminResolver],
    },

    shopApiExtensions: {
        schema: gql`
${commonApiExtensions}

${shopApiExtensions}
        `,
        resolvers: [VendorResolver, VendorShopResolver, VendorShopApiResolver, ProductShopResolver, ProductVariantShopResolver, SellerOfferEntityResolver, PlatformSettingsShopResolver, OrderStatusShopResolver, LikeShopResolver, ChatResolver, WithdrawalRequestEntityResolver, LogisticsHubAdminResolver, SettlementAdminResolver],
    },

    configuration: (config: any) => {

        // ---------------------------
        // SAFE INIT GLOBAL OBJECTS
        // ---------------------------

        if (!config.customFields) {
            config.customFields = {};
            // FIX: évite crash si customFields n'existe pas encore
        }

        if (!config.customFields.Product) {
            config.customFields.Product = [];
            // FIX: évite push sur undefined
        }

        if (!config.customFields.Order) {
            config.customFields.Order = [];
            // FIX: évite push sur undefined
        }

        if (!config.customFields.GlobalSettings) {
            config.customFields.GlobalSettings = [];
        }

        // Helper to push only if not already present by name
        const pushUnique = (array: any[], field: any) => {
            if (!array.some((f: any) => f.name === field.name)) {
                array.push(field);
            }
        };

        // ---------------------------
        // GLOBAL SETTINGS CUSTOM FIELDS
        // ---------------------------
        pushUnique(config.customFields.GlobalSettings, {
            name: 'minimumMarketplacePrice',
            type: 'int',
            public: true,
            nullable: true,
            defaultValue: 0,
            label: [{ languageCode: 'fr' as any, value: 'Prix minimal sur la marketplace' }],
        });

        pushUnique(config.customFields.GlobalSettings, {
            name: 'whatsappNumber',
            type: 'string',
            public: true,
            nullable: true,
            defaultValue: '',
            label: [{ languageCode: 'fr' as any, value: 'Numéro WhatsApp de contact' }],
        });


        // ---------------------------
        // PRODUCT CUSTOM FIELDS
        // ---------------------------

        pushUnique(config.customFields.Product, {
            name: 'vendor',
            type: 'relation',
            entity: Vendor,
            public: true,
            nullable: true,
            label: [{ languageCode: 'fr' as any, value: 'Vendeur' }],
            ui: { component: 'vendor-selector' },
        });

        pushUnique(config.customFields.Product, {
            name: 'approvalStatus',
            type: 'string',
            public: true,
            nullable: true,
            defaultValue: 'pending',
            options: [
                { value: 'pending' },
                { value: 'approved' },
                { value: 'rejected' },
            ],
            label: [{ languageCode: 'fr' as any, value: 'Statut de validation' }],
        });

        pushUnique(config.customFields.Product, {
            name: 'rejectionReason',
            type: 'string',
            public: true,
            nullable: true,
            label: [{ languageCode: 'fr' as any, value: 'Motif de rejet' }],
        });

        pushUnique(config.customFields.Product, {
            name: 'fqsScore',
            type: 'int',
            public: true,
            nullable: true,
            defaultValue: 0,
            label: [{ languageCode: 'fr' as any, value: 'Score de Qualité Fiche (FQS)' }],
        });

        pushUnique(config.customFields.Product, {
            name: 'aiNormalized',
            type: 'boolean',
            public: true,
            nullable: true,
            defaultValue: false,
            label: [{ languageCode: 'fr' as any, value: 'Normalisé par IA' }],
        });

        // ---------------------------
        // ORDER LINE CUSTOM FIELDS
        // ---------------------------

        if (!config.customFields.OrderLine) {
            config.customFields.OrderLine = [];
        }

        pushUnique(config.customFields.OrderLine, {
            name: 'sellerStatus',
            type: 'string',
            public: true,
            nullable: true,
            defaultValue: 'pending',
            options: [
                { value: 'pending' },
                { value: 'confirmed' },
                { value: 'refused' },
                { value: 'reassigning' },
                { value: 'reassigned_to_other' }
            ],
            label: [{ languageCode: 'fr' as any, value: 'Statut du produit' }]
        });

        pushUnique(config.customFields.OrderLine, {
            name: 'assignedVendor',
            type: 'relation',
            entity: Vendor,
            public: true,
            nullable: true,
        });

        // ---------------------------
        // ORDER CUSTOM FIELDS
        // ---------------------------

        pushUnique(config.customFields.Order, {
            name: 'vendor',
            type: 'relation',
            entity: Vendor,
            public: true,
            nullable: true,
        });

        pushUnique(config.customFields.Order, {
            name: 'commissionAmount',
            type: 'int',
            public: true,
            nullable: true,
        });

        pushUnique(config.customFields.Order, {
            name: 'commissionRate',
            type: 'float',
            public: true,
            nullable: true,
        });

        pushUnique(config.customFields.Order, {
            name: 'paymentStatus',
            type: 'string',
            public: true,
            nullable: true,
            defaultValue: 'PENDING',
            options: [
                { value: 'PENDING' },
                { value: 'RETIRABLE' },
                { value: 'PAID' },
            ],
        });

        pushUnique(config.customFields.Order, {
            name: 'sellerStatus',
            type: 'string',
            public: true,
            nullable: true,
            defaultValue: 'pending',
            options: [
                { value: 'pending' },
                { value: 'confirmed' },
                { value: 'refused' },
                { value: 'reassigning' },
                { value: 'reassigned_to_other' }
            ],
            readonly: true,
        });

        pushUnique(config.customFields.Order, {
            name: 'adminStatus',
            type: 'string',
            public: true,
            nullable: true,
            defaultValue: 'pending',
            options: [
                { value: 'pending' },
                { value: 'shipped' },
                { value: 'in_transit' },
                { value: 'delivered' },
                { value: 'cancelled' },
            ],
            ui: {
                component: 'select-form-input',
            },
        });

        pushUnique(config.customFields.Order, {
            name: 'vendorStatuses',
            type: 'text',
            public: true,
            nullable: true,
        });

        pushUnique(config.customFields.Order, {
            name: 'isVendorPaid',
            type: 'boolean',
            public: true,
            nullable: true,
            defaultValue: false,
        });

        pushUnique(config.customFields.Order, {
            name: 'deliveryOtp',
            type: 'string',
            public: true,
            nullable: true,
        });

        pushUnique(config.customFields.Order, {
            name: 'isConsolidated',
            type: 'boolean',
            public: true,
            nullable: true,
            defaultValue: false,
        });

        pushUnique(config.customFields.Order, {
            name: 'hubArrivalDate',
            type: 'datetime',
            public: true,
            nullable: true,
        });

        pushUnique(config.customFields.Order, {
            name: 'deliveryMissionStatus',
            type: 'string',
            public: true,
            nullable: true,
        });

        // ---------------------------
        // PERMISSIONS SAFE INIT
        // ---------------------------

        if (!config.authOptions) {
            config.authOptions = {};
            // FIX: protection si authOptions absent (rare mais safe)
        }

        if (!config.authOptions.customPermissions) {
            config.authOptions.customPermissions = [];
            // FIX: ULTRA IMPORTANT
            // Empêche crash silencieux si customPermissions non initialisé
        }

        if (!config.authOptions.customPermissions.some((p: any) => p.name === 'Vendor')) {
            config.authOptions.customPermissions.push(
                new PermissionDefinition({
                    name: 'Vendor',
                    description: 'manage vendors',
                })
            );
        }

        return config;
    },
})
export class MultivendorPlugin implements OnApplicationBootstrap {
    constructor(
        private searchService: SearchService,
        private connection: TransactionalConnection,
    ) {}

    /**
     * Full sync of search_index_item for Default Channel 1.
     * Can be called from resolvers after product/offer review to keep index consistent.
     */
    static async runFullSearchSync(connection: TransactionalConnection) {
        await connection.rawConnection.query(`
            -- 1. Ensure all products and variants are assigned to Default Channel 1
            INSERT INTO product_channels_channel ("productId", "channelId")
            SELECT p.id, 1 FROM product p WHERE p."deletedAt" IS NULL
            ON CONFLICT DO NOTHING;

            INSERT INTO product_variant_channels_channel ("productVariantId", "channelId")
            SELECT pv.id, 1 FROM product_variant pv WHERE pv."deletedAt" IS NULL
            ON CONFLICT DO NOTHING;

            -- 2. Inherit collections from sibling variants
            INSERT INTO collection_product_variants_product_variant ("collectionId", "productVariantId")
            SELECT DISTINCT cpv_src."collectionId", pv_tgt.id
            FROM product_variant pv_tgt
            INNER JOIN product_variant pv_src ON pv_src."productId" = pv_tgt."productId" AND pv_src.id != pv_tgt.id
            INNER JOIN collection_product_variants_product_variant cpv_src ON cpv_src."productVariantId" = pv_src.id
            ON CONFLICT DO NOTHING;

            -- 3. Sync product_variant enabled state
            UPDATE product_variant pv_sync
            SET enabled = (
                CASE
                    WHEN EXISTS (SELECT 1 FROM seller_offer so_any WHERE so_any."productVariantId" = pv_sync.id)
                    THEN (p_sync.enabled AND EXISTS (SELECT 1 FROM seller_offer so WHERE so."productVariantId" = pv_sync.id AND so.status = 'approved'))
                    ELSE (p_sync.enabled AND pv_sync.enabled)
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
            WHERE pv_sync."productId" = p_sync.id;

            -- 4. Full UPSERT of search_index_item for Default Channel 1
            INSERT INTO search_index_item ("languageCode", "enabled", "productName", "productVariantName", "description", "slug", "sku", "facetIds", "facetValueIds", "collectionIds", "collectionSlugs", "channelIds", "productPreview", "productPreviewFocalPoint", "productVariantPreview", "productVariantPreviewFocalPoint", "inStock", "productInStock", "productVariantId", "channelId", "productId", "productAssetId", "productVariantAssetId", "price", "priceWithTax")
            SELECT DISTINCT ON (pv.id)
                'fr',
                (CASE WHEN EXISTS (SELECT 1 FROM seller_offer so_any WHERE so_any."productVariantId" = pv.id) THEN (p.enabled AND EXISTS (SELECT 1 FROM seller_offer so_app WHERE so_app."productVariantId" = pv.id AND so_app.status = 'approved')) ELSE (p.enabled AND pv.enabled) END),
                COALESCE(pt.name, 'Produit'),
                COALESCE(
                    pvt.name,
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
                COALESCE(pa.preview, ''),
                NULL,
                COALESCE(pva.preview, pa.preview, ''),
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
            LEFT JOIN product_variant_translation pvt ON pvt."baseId" = pv.id AND pvt."languageCode" = 'fr'
            LEFT JOIN product_variant_price pvp ON pvp."variantId" = pv.id
            LEFT JOIN asset pa ON pa.id = p."featuredAssetId"
            LEFT JOIN asset pva ON pva.id = pv."featuredAssetId"
            WHERE pv."deletedAt" IS NULL AND p."deletedAt" IS NULL
            ORDER BY pv.id
            ON CONFLICT ("channelId", "languageCode", "productVariantId") DO UPDATE
            SET "enabled" = EXCLUDED."enabled",
                "collectionIds" = EXCLUDED."collectionIds",
                "collectionSlugs" = EXCLUDED."collectionSlugs",
                "productName" = EXCLUDED."productName",
                "productVariantName" = EXCLUDED."productVariantName",
                "slug" = EXCLUDED."slug",
                "productPreview" = EXCLUDED."productPreview",
                "productVariantPreview" = EXCLUDED."productVariantPreview",
                "price" = EXCLUDED."price",
                "priceWithTax" = EXCLUDED."priceWithTax";
        `);
    }

    async onApplicationBootstrap() {
        try {
            await this.connection.rawConnection.query(`
                CREATE OR REPLACE FUNCTION ignore_duplicate_order_channels()
                RETURNS TRIGGER AS $$
                BEGIN
                    IF EXISTS (
                        SELECT 1 FROM order_channels_channel 
                        WHERE "orderId" = NEW."orderId" AND "channelId" = NEW."channelId"
                    ) THEN
                        RETURN NULL;
                    END IF;
                    RETURN NEW;
                END;
                $$ LANGUAGE plpgsql;

                DROP TRIGGER IF EXISTS trg_ignore_duplicate_order_channels ON order_channels_channel;
                CREATE TRIGGER trg_ignore_duplicate_order_channels
                BEFORE INSERT ON order_channels_channel
                FOR EACH ROW
                EXECUTE FUNCTION ignore_duplicate_order_channels();
            `);
        } catch (e) {
            console.error('[MultivendorPlugin] Failed to ensure ignore_duplicate_order_channels trigger:', e);
        }

        // Patch Vendure's native indexer.controller.js to prevent it from deleting
        // our custom Channel 1 search_index_item rows during reindex operations.
        // The native reindex does: DELETE { channelId } which wipes our data.
        // We convert it to a safe UPSERT-only mode.
        try {
            const fs = require('fs');
            const path = require('path');
            const indexerPath = path.join(process.cwd(), 'node_modules/@vendure/core/dist/plugin/default-search-plugin/indexer/indexer.controller.js');
            if (fs.existsSync(indexerPath)) {
                let content = fs.readFileSync(indexerPath, 'utf8');
                // The line that wipes all Channel 1 entries: await this.connection.getRepository(ctx, search_index_item_entity_1.SearchIndexItem).delete({ channelId: ctx.channelId });
                if (!content.includes('AHIZAN_PATCHED_SKIP_DELETE')) {
                    content = content.replace(
                        `await this.connection.getRepository(ctx, search_index_item_entity_1.SearchIndexItem).delete({ channelId: ctx.channelId });`,
                        `// AHIZAN_PATCHED_SKIP_DELETE: Skip mass-delete so our custom Channel 1 multivendor index is preserved.
                        // await this.connection.getRepository(ctx, search_index_item_entity_1.SearchIndexItem).delete({ channelId: ctx.channelId });`
                    );
                }
                if (!content.includes('AHIZAN_PATCHED_SKIP_MISSING_PROD')) {
                    content = content.replace(
                        `if (!product) {`,
                        `// AHIZAN_PATCHED_SKIP_MISSING_PROD
                        if (!product) { continue; }
                        if (false && !product) {`
                    );
                }
                fs.writeFileSync(indexerPath, content);
                console.log('[MultivendorPlugin] Successfully patched indexer.controller.js!');
            }
        } catch (e: any) {
            console.error('[MultivendorPlugin] Failed to patch indexer.controller.js:', e?.message);
        }

        // Auto-assign all approved products, variants, and assets to Default Channel (Channel 1)
        try {
            await this.connection.rawConnection.query(`
                -- 0. Clear customFieldsVendorid on all approved products so they belong to Ahizan platform catalog
                UPDATE product
                SET "customFieldsVendorid" = NULL
                WHERE "customFieldsApprovalstatus" = 'approved' OR "customFieldsApprovalstatus" IS NULL;

                -- 1. Sync product_variant enabled state with seller_offer status
                UPDATE product_variant pv
                SET enabled = (
                    CASE 
                        WHEN EXISTS (SELECT 1 FROM seller_offer so_any WHERE so_any."productVariantId" = pv.id)
                        THEN EXISTS (SELECT 1 FROM seller_offer so_app WHERE so_app."productVariantId" = pv.id AND so_app.status = 'approved')
                        ELSE pv.enabled
                    END
                ),
                "customFieldsOfferstatus" = COALESCE(
                    (
                        SELECT CASE WHEN so_b.status = 'approved' THEN 'APPROVED' WHEN so_b.status = 'rejected' THEN 'REJECTED' ELSE 'PENDING' END
                        FROM seller_offer so_b
                        WHERE so_b."productVariantId" = pv.id
                        ORDER BY CASE WHEN so_b.status = 'approved' THEN 1 WHEN so_b.status = 'pending' THEN 2 ELSE 3 END
                        LIMIT 1
                    ),
                    'APPROVED'
                ),
                "updatedAt" = NOW()
                WHERE EXISTS (SELECT 1 FROM seller_offer so_check WHERE so_check."productVariantId" = pv.id);

                -- 2. Inherit collection associations for all grafted variants of the same product
                INSERT INTO collection_product_variants_product_variant ("collectionId", "productVariantId")
                SELECT DISTINCT cpv."collectionId", pv.id
                FROM product_variant pv
                INNER JOIN product_variant pv_master ON pv_master."productId" = pv."productId"
                INNER JOIN collection_product_variants_product_variant cpv ON cpv."productVariantId" = pv_master.id
                ON CONFLICT DO NOTHING;

                -- 3. Ensure all approved products, variants, and assets are assigned to Default Channel 1
                INSERT INTO product_channels_channel ("productId", "channelId")
                SELECT p.id, 1
                FROM product p
                WHERE p."deletedAt" IS NULL 
                  AND (p."customFieldsApprovalstatus" = 'approved' OR p."customFieldsVendorid" IS NULL)
                ON CONFLICT DO NOTHING;

                INSERT INTO product_variant_channels_channel ("productVariantId", "channelId")
                SELECT pv.id, 1
                FROM product_variant pv
                INNER JOIN product p ON pv."productId" = p.id
                WHERE p."deletedAt" IS NULL 
                  AND (p."customFieldsApprovalstatus" = 'approved' OR p."customFieldsVendorid" IS NULL)
                ON CONFLICT DO NOTHING;

                INSERT INTO asset_channels_channel ("assetId", "channelId")
                SELECT p."featuredAssetId", 1
                FROM product p
                WHERE p."deletedAt" IS NULL 
                  AND p."featuredAssetId" IS NOT NULL
                  AND (p."customFieldsApprovalstatus" = 'approved' OR p."customFieldsVendorid" IS NULL)
                ON CONFLICT DO NOTHING;
            `);
            console.log('[MultivendorPlugin] Default channel 1 auto-assignment and collection sync completed.');
        } catch (e) {
            console.error('[MultivendorPlugin] Failed to auto-assign default channel 1:', e);
        }

        // Delay sync slightly to let the app fully initialize
        setTimeout(async () => {
            try {
                console.log('[MultivendorPlugin] Synchronizing search_index_item and collections on startup...');

                // Ensure search index items have updated collectionIds, collectionSlugs, and enabled status
                await this.connection.rawConnection.query(`
                    -- 1. Ensure all products and variants are assigned to Default Channel 1
                    INSERT INTO product_channels_channel ("productId", "channelId")
                    SELECT p.id, 1 FROM product p WHERE p."deletedAt" IS NULL
                    ON CONFLICT DO NOTHING;

                    INSERT INTO product_variant_channels_channel ("productVariantId", "channelId")
                    SELECT pv.id, 1 FROM product_variant pv WHERE pv."deletedAt" IS NULL
                    ON CONFLICT DO NOTHING;

                    -- 2. Inherit collections from sibling variants (all variants of a product share the product's collections)
                    INSERT INTO collection_product_variants_product_variant ("collectionId", "productVariantId")
                    SELECT DISTINCT cpv_src."collectionId", pv_tgt.id
                    FROM product_variant pv_tgt
                    INNER JOIN product_variant pv_src ON pv_src."productId" = pv_tgt."productId" AND pv_src.id != pv_tgt.id
                    INNER JOIN collection_product_variants_product_variant cpv_src ON cpv_src."productVariantId" = pv_src.id
                    ON CONFLICT DO NOTHING;

                    -- 2b. Auto-populate missing/empty names in product_variant_translation
                    UPDATE product_variant_translation pvt
                    SET name = COALESCE(
                        (
                            SELECT CASE
                                WHEN string_agg(ot.name::text, ' - ' ORDER BY po.id) IS NOT NULL AND string_agg(ot.name::text, ' - ' ORDER BY po.id) != ''
                                THEN pt.name || ' - ' || string_agg(ot.name::text, ' - ' ORDER BY po.id)
                                ELSE pt.name
                            END
                            FROM product_variant_options_product_option pvo
                            INNER JOIN product_option po ON po.id = pvo."productOptionId"
                            LEFT JOIN product_option_translation ot ON ot."baseId" = po.id AND ot."languageCode" = 'fr'
                            WHERE pvo."productVariantId" = pv.id
                        ),
                        pt.name,
                        'Variante'
                    ),
                    "updatedAt" = NOW()
                    FROM product_variant pv
                    INNER JOIN product p ON p.id = pv."productId"
                    LEFT JOIN product_translation pt ON pt."baseId" = p.id AND pt."languageCode" = 'fr'
                    WHERE pvt."baseId" = pv.id AND (pvt.name IS NULL OR pvt.name = '' OR pvt.name = 'Variante');

                    -- 2c. Insert missing translations for variants without translation record
                    INSERT INTO product_variant_translation ("baseId", "languageCode", "name", "createdAt", "updatedAt")
                    SELECT 
                        pv.id,
                        'fr',
                        COALESCE(
                            (
                                SELECT CASE
                                    WHEN string_agg(ot.name::text, ' - ' ORDER BY po.id) IS NOT NULL AND string_agg(ot.name::text, ' - ' ORDER BY po.id) != ''
                                    THEN pt.name || ' - ' || string_agg(ot.name::text, ' - ' ORDER BY po.id)
                                    ELSE pt.name
                                END
                                FROM product_variant_options_product_option pvo
                                INNER JOIN product_option po ON po.id = pvo."productOptionId"
                                LEFT JOIN product_option_translation ot ON ot."baseId" = po.id AND ot."languageCode" = 'fr'
                                WHERE pvo."productVariantId" = pv.id
                            ),
                            pt.name,
                            'Variante'
                        ),
                        NOW(),
                        NOW()
                    FROM product_variant pv
                    INNER JOIN product p ON p.id = pv."productId"
                    LEFT JOIN product_translation pt ON pt."baseId" = p.id AND pt."languageCode" = 'fr'
                    WHERE pv."deletedAt" IS NULL 
                      AND NOT EXISTS (SELECT 1 FROM product_variant_translation pvt WHERE pvt."baseId" = pv.id AND pvt."languageCode" = 'fr');

                    -- 3. Sync product_variant enabled state
                    UPDATE product_variant pv_sync
                    SET enabled = (
                        CASE
                            WHEN EXISTS (
                                SELECT 1 FROM seller_offer so_any 
                                WHERE so_any."productVariantId" = pv_sync.id
                            )
                            THEN (p_sync.enabled AND EXISTS (
                                SELECT 1 FROM seller_offer so 
                                WHERE so."productVariantId" = pv_sync.id AND so.status = 'approved'
                            ))
                            ELSE (p_sync.enabled AND pv_sync.enabled)
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
                    WHERE pv_sync."productId" = p_sync.id;

                    -- 4. Full UPSERT of search_index_item for Default Channel 1
                    INSERT INTO search_index_item ("languageCode", "enabled", "productName", "productVariantName", "description", "slug", "sku", "facetIds", "facetValueIds", "collectionIds", "collectionSlugs", "channelIds", "productPreview", "productPreviewFocalPoint", "productVariantPreview", "productVariantPreviewFocalPoint", "inStock", "productInStock", "productVariantId", "channelId", "productId", "productAssetId", "productVariantAssetId", "price", "priceWithTax")
                    SELECT DISTINCT ON (pv.id)
                        'fr',
                        (CASE WHEN EXISTS (SELECT 1 FROM seller_offer so_any WHERE so_any."productVariantId" = pv.id) THEN (p.enabled AND EXISTS (SELECT 1 FROM seller_offer so_app WHERE so_app."productVariantId" = pv.id AND so_app.status = 'approved')) ELSE (p.enabled AND pv.enabled) END),
                        COALESCE(pt.name, 'Produit'),
                        COALESCE(
                            pvt.name,
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
                        COALESCE(pa.preview, ''),
                        NULL,
                        COALESCE(pva.preview, pa.preview, ''),
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
                    LEFT JOIN product_variant_translation pvt ON pvt."baseId" = pv.id AND pvt."languageCode" = 'fr'
                    LEFT JOIN product_variant_price pvp ON pvp."variantId" = pv.id
                    LEFT JOIN asset pa ON pa.id = p."featuredAssetId"
                    LEFT JOIN asset pva ON pva.id = pv."featuredAssetId"
                    WHERE pv."deletedAt" IS NULL AND p."deletedAt" IS NULL
                    ORDER BY pv.id
                    ON CONFLICT ("channelId", "languageCode", "productVariantId") DO UPDATE
                    SET "enabled" = EXCLUDED."enabled",
                        "collectionIds" = EXCLUDED."collectionIds",
                        "collectionSlugs" = EXCLUDED."collectionSlugs",
                        "productName" = EXCLUDED."productName",
                        "productVariantName" = EXCLUDED."productVariantName",
                        "slug" = EXCLUDED."slug",
                        "productPreview" = EXCLUDED."productPreview",
                        "productVariantPreview" = EXCLUDED."productVariantPreview",
                        "price" = EXCLUDED."price",
                        "priceWithTax" = EXCLUDED."priceWithTax";
                `);

                console.log('[MultivendorPlugin] Search reindex & collection sync completed.');

                // Start a periodic sync every 60 seconds to keep Channel 1 consistent
                // This heals any damage from Vendure's native indexer running after product events
                setInterval(async () => {
                    try {
                        await MultivendorPlugin.runFullSearchSync(this.connection);
                    } catch (e) {
                        // Silent — periodic sync errors should not crash the app
                    }
                }, 60_000);

            } catch (err) {
                console.error('[MultivendorPlugin] Reindex failed:', err);
            }
        }, 5000);
    }
}
