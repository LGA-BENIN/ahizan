import {
    defaultShippingCalculator,
    defaultCollectionFilters, 
    DefaultJobQueuePlugin,
    DefaultSchedulerPlugin,
    DefaultSearchPlugin,
    VendureConfig,
    LanguageCode,
} from '@vendure/core';
import { defaultEmailHandlers, EmailPlugin, FileBasedTemplateLoader } from '@vendure/email-plugin';
import { AssetServerPlugin } from '@vendure/asset-server-plugin';
import { DashboardPlugin } from '@vendure/dashboard/plugin';
import { GraphiqlPlugin } from '@vendure/graphiql-plugin';
import 'dotenv/config';
import path from 'path';
import dns from 'dns';
import { MultivendorPlugin } from './plugins/multivendor/multivendor.plugin';
import { globalFixedShippingCalculator } from './plugins/multivendor/shipping/fixed-global-shipping.calculator';
import { zoneBasedShippingCalculator } from './plugins/multivendor/shipping/zone-based-shipping.calculator';
import { variantIdCollectionFilter } from './plugins/multivendor/collection-filters';
import { cashOnDeliveryHandler } from './plugins/multivendor/payment/cash-on-delivery.handler';
import { TaxEnforcementPlugin } from './plugins/tax-enforcement.plugin';
import { PageInscriptionPlugin } from './plugins/page-inscription/page-inscription.plugin';
import { AhizanNotificationsPlugin } from './plugins/notifications/ahizan-notifications.plugin';
import { DynamicEmailSender } from './plugins/notifications/dynamic-email-sender';
import { ShortCodeVerificationTokenStrategy } from './plugins/notifications/short-code-strategy';
import { CMSPlugin } from './plugins/cms/cms.plugin';
import { BannerManagerPlugin } from './plugins/banner-manager/banner-manager.plugin';
import { CollectionFacetMapPlugin } from './plugins/collection-facet-map/collection-facet-map.plugin';
import { BulkCollectionImportPlugin } from './plugins/bulk-collection-import/bulk-collection-import.plugin';

dns.setDefaultResultOrder('ipv4first');

const IS_DEV = process.env.APP_ENV === 'dev';
const serverPort = +process.env.PORT || 3000;

export const emailSenderNode = new DynamicEmailSender();

export const config: VendureConfig = {
    apiOptions: {
        hostname: '0.0.0.0',
        port: serverPort,
        adminApiPath: 'admin-api',
        shopApiPath: 'shop-api',
        trustProxy: IS_DEV ? false : 1,
        ...(IS_DEV ? {
            adminApiDebug: true,
            shopApiDebug: true,
        } : {}),
        cors: {
            origin: process.env.CORS_ORIGINS
                ? process.env.CORS_ORIGINS.split(',').map(s => s.trim())
                : [
                    'http://localhost:5173', 'http://localhost:4200', 'http://localhost:3000', 'http://localhost:5174', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:5176',
                    'http://127.0.0.1:5173', 'http://127.0.0.1:4200', 'http://127.0.0.1:3000', 'http://127.0.0.1:5174', 'http://127.0.0.1:3001', 'http://127.0.0.1:3002', 'http://127.0.0.1:5176'
                ],
            credentials: true,
        },
    },
    authOptions: {
        tokenMethod: ['bearer', 'cookie'],
        requireVerification: false, 
        verificationTokenStrategy: new ShortCodeVerificationTokenStrategy(),
        verificationTokenDuration: '15m', 
        superadminCredentials: {
            identifier: process.env.SUPERADMIN_USERNAME,
            password: process.env.SUPERADMIN_PASSWORD,
        },
        cookieOptions: {
            secret: process.env.COOKIE_SECRET,
        },
    },
    dbConnectionOptions: {
        type: 'postgres',
        host: process.env.DB_HOST || '127.0.0.1',
        port: +(process.env.DB_PORT || 5432),
        username: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'vendure',
        schema: process.env.DB_SCHEMA || 'public',
        synchronize: true, 
        logging: false,
        migrations: [path.join(__dirname, './migrations/*.+(js|ts)')],
    },
    shippingOptions: {
        shippingCalculators: [defaultShippingCalculator, globalFixedShippingCalculator, zoneBasedShippingCalculator],
    },
    catalogOptions: {
        // Using only defaults first to ensure the server starts safely
        collectionFilters: [...defaultCollectionFilters, variantIdCollectionFilter],
    },
    paymentOptions: {
        paymentMethodHandlers: [cashOnDeliveryHandler],
    },
    customFields: {
        User: [
            { name: 'passwordResetCodeExpiresAt', type: 'datetime', public: false, label: [{ languageCode: LanguageCode.fr, value: 'Expiration du code de réinitialisation' }] },
        ],
        ProductVariant: [
            { name: 'compareAtPrice', type: 'int', nullable: true, public: true, description: [{ languageCode: LanguageCode.fr, value: 'Prix de comparaison (prix barré) en centimes' }] },
            { name: 'onPromotion', type: 'boolean', nullable: true, public: true, defaultValue: false, description: [{ languageCode: LanguageCode.fr, value: 'Indique si le produit est en promotion' }] },
            { name: 'promotionalPrice', type: 'int', nullable: true, public: true, description: [{ languageCode: LanguageCode.fr, value: 'Prix promotionnel en centimes' }] },
        ],
        Collection: [
            { name: 'allowedFacetIds', type: 'string', list: true, nullable: true, public: true, description: [{ languageCode: LanguageCode.fr, value: 'IDs des facettes autorisées pour cette collection' }] },
        ],
    },
    plugins: [
        GraphiqlPlugin.init(),
        AssetServerPlugin.init({
            route: 'assets',
            assetUploadDir: path.join(__dirname, '../static/assets'),
            assetUrlPrefix: IS_DEV ? undefined : (process.env.ASSET_URL_PREFIX || undefined),
        }),
        DefaultSchedulerPlugin.init(),
        DefaultJobQueuePlugin.init({ useDatabaseForBuffer: true }),
        DefaultSearchPlugin.init({
            bufferUpdates: false,
            indexStockStatus: true,
        }),
        EmailPlugin.init({
            transport: { type: 'none' }, 
            emailSender: emailSenderNode,
            route: 'mailbox',
            handlers: defaultEmailHandlers.filter(h => h.type !== 'password-reset'),
            templateLoader: new FileBasedTemplateLoader(path.join(__dirname, '../static/email/templates')),
            globalTemplateVars: {
                fromAddress: process.env.BREVO_FROM_EMAIL || '"Ahizan" <noreply@ahizan.com>',
                verifyEmailAddressUrl: `${process.env.STOREFRONT_URL || 'http://localhost:3001'}/verify`,
                passwordResetUrl: `${process.env.STOREFRONT_URL || 'http://localhost:3001'}/password-reset`,
                changeEmailAddressUrl: `${process.env.STOREFRONT_URL || 'http://localhost:3001'}/verify-email-address-change`,
            },
        } as any),
        DashboardPlugin.init({
            route: 'admin',
            appDir: path.join(__dirname, '../dist/dashboard'),
        }),
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