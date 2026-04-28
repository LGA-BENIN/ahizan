import { PluginCommonModule, VendurePlugin, PermissionDefinition } from '@vendure/core';
import { Vendor } from './entities/vendor.entity';
import { PlatformSettings } from './entities/platform-settings.entity';
import { OrderStatus } from './entities/order-status.entity';
import { DeliveryZone } from './entities/delivery-zone.entity';
import { VendorService } from './service/vendor.service';
import { VendorOrderSubscriber } from './service/vendor-event.subscriber';
import { PlatformSettingsService } from './service/platform-settings.service';
import { OrderStatusService } from './service/order-status.service';
import { DeliveryZoneService } from './service/delivery-zone.service';
import { adminApiExtensions, shopApiExtensions, commonApiExtensions } from './api/api-extensions';
import { VendorResolver, VendorAdminResolver } from './api/vendor.resolver';
import { VendorShopResolver } from './api/vendor-shop.resolver';
import { PlatformSettingsAdminResolver, PlatformSettingsShopResolver } from './api/platform-settings.resolver';
import { OrderStatusAdminResolver, OrderStatusShopResolver } from './api/order-status.resolver';
import { DeliveryZoneAdminResolver, DeliveryZoneShopResolver } from './api/delivery-zone.resolver';
import { gql } from 'graphql-tag';
import path from 'path';

@VendurePlugin({
    imports: [PluginCommonModule],

    entities: [Vendor, PlatformSettings, OrderStatus, DeliveryZone],

    providers: [
        VendorService,
        VendorOrderSubscriber,
        PlatformSettingsService,
        OrderStatusService,
        DeliveryZoneService,
    ],

    dashboard: './dashboard',

    compatibility: '^3.0.0',

    adminApiExtensions: {
        schema: gql`
${commonApiExtensions}

${adminApiExtensions}
        `,
        resolvers: [VendorAdminResolver, VendorShopResolver, PlatformSettingsAdminResolver, OrderStatusAdminResolver, DeliveryZoneAdminResolver],
    },

    shopApiExtensions: {
        schema: gql`
${commonApiExtensions}

${shopApiExtensions}
        `,
        resolvers: [VendorResolver, VendorShopResolver, PlatformSettingsShopResolver, OrderStatusShopResolver, DeliveryZoneShopResolver],
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

        // ---------------------------
        // PRODUCT CUSTOM FIELD
        // ---------------------------

        config.customFields.Product.push({
            name: 'vendor',
            type: 'relation',
            entity: Vendor,
            public: true,
            nullable: true,
            ui: { component: 'item-search-input' },
        });

        // ---------------------------
        // ORDER CUSTOM FIELDS
        // ---------------------------

        config.customFields.Order.push({
            name: 'vendor',
            type: 'relation',
            entity: Vendor,
            public: true,
            nullable: true,
        });

        config.customFields.Order.push({
            name: 'commissionAmount',
            type: 'int',
            public: false,
            nullable: true,
        });

        config.customFields.Order.push({
            name: 'sellerStatus',
            type: 'string',
            public: true,
            nullable: true,
            defaultValue: 'pending',
            options: [
                { value: 'pending' },
                { value: 'confirmed' },
                { value: 'refused' },
            ],
            readonly: true,
        });

        config.customFields.Order.push({
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

        config.authOptions.customPermissions.push(
            new PermissionDefinition({
                name: 'Vendor',
                description: 'manage vendors',
            })
        );

        return config;
    },
})
export class MultivendorPlugin { }
