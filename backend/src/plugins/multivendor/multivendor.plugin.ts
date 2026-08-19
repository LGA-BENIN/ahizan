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
import { VendorOrderSubscriber } from './service/vendor-event.subscriber';
import { PlatformSettingsService } from './service/platform-settings.service';
import { OrderStatusService } from './service/order-status.service';
import { LikeService } from './service/like.service';
import { ChatService } from './service/chat.service';
import { adminApiExtensions, shopApiExtensions, commonApiExtensions } from './api/api-extensions';
import { VendorResolver, VendorAdminResolver } from './api/vendor.resolver';
import { VendorShopResolver, ProductVariantShopResolver } from './api/vendor-shop.resolver';
import { VendorShopApiResolver } from './api/vendor-shop-api.resolver';
import { PlatformSettingsAdminResolver, PlatformSettingsShopResolver } from './api/platform-settings.resolver';
import { OrderStatusAdminResolver, OrderStatusShopResolver } from './api/order-status.resolver';
import { LikeShopResolver, LikeAdminResolver } from './api/like.resolver';
import { ChatResolver } from './api/chat.resolver';
import { ChatAdminResolver } from './api/chat-admin.resolver';
import { gql } from 'graphql-tag';
import { GeoEnginePlugin } from '../geo-engine/geo-engine.plugin';
import { AhizanNotificationsPlugin } from '../notifications/ahizan-notifications.plugin';

@VendurePlugin({
    imports: [PluginCommonModule, GeoEnginePlugin, AhizanNotificationsPlugin],

    entities: [Vendor, PlatformSettings, OrderStatus, VendorLike, ProductLike, ChatMessage, WithdrawalRequest],

    providers: [
        VendorService,
        VendorOrderSubscriber,
        PlatformSettingsService,
        OrderStatusService,
        LikeService,
        ChatService,
    ],

    dashboard: './dashboard',

    compatibility: '^3.0.0',

    adminApiExtensions: {
        schema: gql`
${commonApiExtensions}

${adminApiExtensions}
        `,
        resolvers: [VendorAdminResolver, VendorShopResolver, ProductVariantShopResolver, PlatformSettingsAdminResolver, OrderStatusAdminResolver, LikeAdminResolver, ChatAdminResolver],
    },

    shopApiExtensions: {
        schema: gql`
${commonApiExtensions}

${shopApiExtensions}
        `,
        resolvers: [VendorResolver, VendorShopResolver, VendorShopApiResolver, ProductVariantShopResolver, PlatformSettingsShopResolver, OrderStatusShopResolver, LikeShopResolver, ChatResolver],
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
