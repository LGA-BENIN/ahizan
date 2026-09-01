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
            console.log('[MultivendorPlugin] Default channel 1 auto-assignment completed.');
        } catch (e) {
            console.error('[MultivendorPlugin] Failed to auto-assign default channel 1:', e);
        }

        // Delay reindex slightly to let the app fully initialize
        setTimeout(async () => {
            try {
                const ctx = RequestContext.empty();
                console.log('[MultivendorPlugin] Triggering search reindex on startup...');
                await this.searchService.reindex(ctx);
                console.log('[MultivendorPlugin] Search reindex completed.');
            } catch (err) {
                console.error('[MultivendorPlugin] Reindex failed:', err);
            }
        }, 5000);
    }
}
