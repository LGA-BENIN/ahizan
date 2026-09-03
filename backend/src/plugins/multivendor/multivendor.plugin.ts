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

        // Auto-assign all approved products, variants, and assets to Default Channel (Channel 1)
        try {
            await this.connection.rawConnection.query(`
                -- 0. Clear customFieldsVendorid on all approved products so they belong to Ahizan platform catalog
                UPDATE product
                SET "customFieldsVendorid" = NULL
                WHERE "customFieldsApprovalstatus" = 'approved' OR "customFieldsApprovalstatus" IS NULL;

                -- 1. Sync product_variant enabled state with seller_offer status
                UPDATE product_variant pv
                SET enabled = (so.status = 'approved'),
                    "customFieldsOfferstatus" = CASE WHEN so.status = 'approved' THEN 'APPROVED' WHEN so.status = 'rejected' THEN 'REJECTED' ELSE 'PENDING' END,
                    "updatedAt" = NOW()
                FROM seller_offer so
                WHERE so."productVariantId" = pv.id;

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

        // Delay reindex slightly to let the app fully initialize
        setTimeout(async () => {
            try {
                const ctx = RequestContext.empty();
                console.log('[MultivendorPlugin] Triggering search reindex on startup...');
                await this.searchService.reindex(ctx);

                // Ensure search index items have updated collectionIds, collectionSlugs, and enabled status
                await this.connection.rawConnection.query(`
                    -- 0. Garantir la présence et synchronisation de search_index_item pour le Default Channel 1
                    INSERT INTO search_index_item ("languageCode", "enabled", "productName", "productVariantName", "description", "slug", "sku", "facetIds", "facetValueIds", "collectionIds", "collectionSlugs", "channelIds", "productPreview", "productPreviewFocalPoint", "productVariantPreview", "productVariantPreviewFocalPoint", "inStock", "productInStock", "productVariantId", "channelId", "productId", "productAssetId", "productVariantAssetId", "price", "priceWithTax")
                    SELECT DISTINCT ON (pv.id)
                        'fr',
                        (CASE WHEN EXISTS (SELECT 1 FROM seller_offer so_any WHERE so_any."productVariantId" = pv.id) THEN EXISTS (SELECT 1 FROM seller_offer so_app WHERE so_app."productVariantId" = pv.id AND so_app.status = 'approved') ELSE (p.enabled AND pv.enabled) END),
                        COALESCE(pt.name, 'Produit'),
                        COALESCE(pt.name || ' (' || pv.sku || ')', pt.name, 'Variante'),
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
                    WHERE pv."deletedAt" IS NULL AND p."deletedAt" IS NULL
                    ORDER BY pv.id
                    ON CONFLICT ("channelId", "languageCode", "productVariantId") DO UPDATE
                    SET "enabled" = EXCLUDED."enabled",
                        "collectionIds" = EXCLUDED."collectionIds",
                        "collectionSlugs" = EXCLUDED."collectionSlugs",
                        "price" = EXCLUDED."price",
                        "priceWithTax" = EXCLUDED."priceWithTax";

                    -- 1. Hériter les collections des variants frères (sibling variants du même produit)
                    --    La table product_collections_collection n'existe pas dans Vendure.
                    --    Toutes les collections sont par variant dans collection_product_variants_product_variant.
                    INSERT INTO collection_product_variants_product_variant ("collectionId", "productVariantId")
                    SELECT DISTINCT cpv_src."collectionId", pv_tgt.id
                    FROM product_variant pv_tgt
                    INNER JOIN product_variant pv_src ON pv_src."productId" = pv_tgt."productId" AND pv_src.id != pv_tgt.id
                    INNER JOIN collection_product_variants_product_variant cpv_src ON cpv_src."productVariantId" = pv_src.id
                    ON CONFLICT DO NOTHING;

                    -- 2. Sync product_variant enabled state
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
                    WHERE pv_sync."productId" = p_sync.id;

                    -- 3. Update search_index_item
                    UPDATE search_index_item sii
                    SET "collectionIds" = COALESCE((
                        SELECT string_agg(DISTINCT cpv."collectionId"::text, ',')
                        FROM collection_product_variants_product_variant cpv
                        WHERE cpv."productVariantId" = sii."productVariantId"
                    ), ''),
                    "collectionSlugs" = COALESCE((
                        SELECT string_agg(DISTINCT ct.slug, ',')
                        FROM collection_product_variants_product_variant cpv
                        INNER JOIN collection_translation ct ON ct."baseId" = cpv."collectionId"
                        WHERE cpv."productVariantId" = sii."productVariantId"
                    ), ''),
                    -- RÈGLE UNIQUE DE VISIBILITÉ :
                    -- Une variante marketplace est visible si et seulement si elle a au moins une offre approuvée.
                    -- Pour les variantes sans offres (produits natifs), conserver l'état natif.
                    "enabled" = (
                        CASE
                            WHEN EXISTS (
                                SELECT 1 FROM seller_offer so_any
                                WHERE so_any."productVariantId" = pv.id
                            )
                            THEN EXISTS (
                                SELECT 1 FROM seller_offer so_app
                                WHERE so_app."productVariantId" = pv.id
                                  AND so_app.status = 'approved'
                            )
                            ELSE (p.enabled AND pv.enabled)
                        END
                    ),
                    "price" = COALESCE(
                        (
                            SELECT MIN(so_app.price) 
                            FROM seller_offer so_app 
                            WHERE so_app."productVariantId" = pv.id AND so_app.status = 'approved'
                        ),
                        pvp.price,
                        0
                    ),
                    "priceWithTax" = COALESCE(
                        (
                            SELECT MIN(so_app.price) 
                            FROM seller_offer so_app 
                            WHERE so_app."productVariantId" = pv.id AND so_app.status = 'approved'
                        ),
                        pvp.price,
                        0
                    ),
                    "productVariantName" = COALESCE((
                        SELECT CASE 
                            WHEN string_agg(ot.name::text, ' / ') IS NOT NULL AND string_agg(ot.name::text, ' / ') != ''
                            THEN pt.name::text || ' (' || string_agg(ot.name::text, ' / ') || ')'
                            ELSE pt.name::text
                        END
                        FROM product_variant pv_inner
                        INNER JOIN product p_inner ON p_inner.id = pv_inner."productId"
                        LEFT JOIN product_translation pt ON pt."baseId" = p_inner.id AND pt."languageCode" = sii."languageCode"
                        LEFT JOIN product_variant_options_product_option pvo ON pvo."productVariantId" = pv_inner.id
                        LEFT JOIN product_option po ON po.id = pvo."productOptionId"
                        LEFT JOIN product_option_translation ot ON ot."baseId" = po.id AND ot."languageCode" = sii."languageCode"
                        WHERE pv_inner.id = sii."productVariantId"
                        GROUP BY pt.name
                    ), sii."productName"::text),
                    "productAssetId" = COALESCE(
                        (
                            SELECT CASE WHEN so_app."featuredAssetId" ~ '^[0-9]+$' THEN so_app."featuredAssetId"::integer ELSE NULL END
                            FROM seller_offer so_app 
                            WHERE so_app."productVariantId" = pv.id 
                              AND so_app.status = 'approved' 
                              AND so_app."featuredAssetId" IS NOT NULL 
                              AND so_app."featuredAssetId" != '' 
                            ORDER BY so_app.price ASC 
                            LIMIT 1
                        ),
                        pv."featuredAssetId",
                        p."featuredAssetId"
                    )
                    FROM product_variant pv
                    INNER JOIN product p ON pv."productId" = p.id
                    LEFT JOIN product_variant_price pvp ON pvp."variantId" = pv.id
                    WHERE sii."productVariantId" = pv.id;
                `);

                console.log('[MultivendorPlugin] Search reindex & collection sync completed.');
            } catch (err) {
                console.error('[MultivendorPlugin] Reindex failed:', err);
            }
        }, 5000);
    }
}
