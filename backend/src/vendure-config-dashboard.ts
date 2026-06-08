 import { VendureConfig, LanguageCode } from '@vendure/core';
import { AssetServerPlugin } from '@vendure/asset-server-plugin';
import { DashboardPlugin } from '@vendure/dashboard/plugin';
import { GraphiqlPlugin } from '@vendure/graphiql-plugin';
import path from 'path';

// Import plugins directly
import { MultivendorPlugin } from './plugins/multivendor/multivendor.plugin';
import { TaxEnforcementPlugin } from './plugins/tax-enforcement.plugin';
import { PageInscriptionPlugin } from './plugins/page-inscription/page-inscription.plugin';
import { AhizanNotificationsPlugin } from './plugins/notifications/ahizan-notifications.plugin';
import { CMSPlugin } from './plugins/cms/cms.plugin';
import { BannerManagerPlugin } from './plugins/banner-manager/banner-manager.plugin';
import { CollectionFacetMapPlugin } from './plugins/collection-facet-map/collection-facet-map.plugin';
import { BulkCollectionImportPlugin } from './plugins/bulk-collection-import/bulk-collection-import.plugin';

// This is a LITE configuration used specifically for the Vite Dashboard build.
// It skips the database connection and heavy background processes to reduce
// startup time from 16 minutes to just seconds.

export const config: VendureConfig = {
    apiOptions: {
        hostname: '127.0.0.1',
        port: 3000,
        adminApiPath: 'admin-api',
        shopApiPath: 'shop-api',
    },
    authOptions: {
        tokenMethod: ['bearer', 'cookie'],
        cookieOptions: { secret: 'dev-secret' },
    },
    // We provide a dummy DB config because Vite only needs the schema metadata,
    // not an active connection to the database.
    paymentOptions: {
        paymentMethodHandlers: [],
    },
    customFields: {
        Collection: [
            { name: 'allowedFacetIds', type: 'string', list: true, nullable: true, public: true },
        ],
    },
    dbConnectionOptions: {
        type: 'sqlite',
        database: ':memory:',
        synchronize: false,
    },
    plugins: [
        GraphiqlPlugin.init(),
        AssetServerPlugin.init({
            route: 'assets',
            assetUploadDir: path.join(__dirname, '../static/assets'),
        }),
        DashboardPlugin.init({
            route: 'admin',
            appDir: path.join(__dirname, '../dist/dashboard'),
        }),
        // We import the plugins to get their custom fields and API extensions
        // but since we are in "headless" mode, their logic won't run.
        MultivendorPlugin,
        TaxEnforcementPlugin,
        PageInscriptionPlugin,
        AhizanNotificationsPlugin,
        CMSPlugin,
        BannerManagerPlugin,
        CollectionFacetMapPlugin,
        BulkCollectionImportPlugin,
    ],
};
