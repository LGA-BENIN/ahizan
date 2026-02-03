import { PluginCommonModule, VendurePlugin, PermissionDefinition } from '@vendure/core';
import { Vendor } from './entities/vendor.entity';
import { VendorService } from './service/vendor.service';
import { VendorOrderSubscriber } from './service/vendor-event.subscriber';
import { adminApiExtensions, shopApiExtensions, commonApiExtensions } from './api/api-extensions';
import { VendorResolver, VendorAdminResolver } from './api/vendor.resolver';
import { gql } from 'graphql-tag';
import path from 'path';

@VendurePlugin({
    imports: [PluginCommonModule],

    entities: [Vendor],

    providers: [VendorService, VendorOrderSubscriber],

    dashboard: './dashboard',

    compatibility: '^3.0.0',

    adminApiExtensions: {
        schema: gql`${commonApiExtensions}\n${adminApiExtensions}`,
        resolvers: [VendorAdminResolver],
    },

    shopApiExtensions: {
        schema: gql`${commonApiExtensions}\n${shopApiExtensions}`,
        resolvers: [VendorResolver],
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
