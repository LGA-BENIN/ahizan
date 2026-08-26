import {
    defaultCollectionFilters,
    defaultShippingCalculator,
    DefaultSearchPlugin,
    DefaultSchedulerPlugin,
    DefaultJobQueuePlugin,
    LanguageCode,
    defaultOrderProcess,
} from '@vendure/core';
import { AssetServerPlugin } from '@vendure/asset-server-plugin';
import { EmailPlugin, FileBasedTemplateLoader } from '@vendure/email-plugin';
import { DashboardPlugin } from '@vendure/dashboard/plugin';
import { GraphiqlPlugin } from '@vendure/graphiql-plugin';
import 'dotenv/config';
import path from 'path';
import dns from 'dns';
import { MultivendorPlugin } from './plugins/multivendor/multivendor.plugin';
import { globalFixedShippingCalculator } from './plugins/multivendor/shipping/fixed-global-shipping.calculator';
import { json } from 'body-parser';
import { zoneBasedShippingCalculator } from './plugins/multivendor/shipping/zone-based-shipping.calculator';
import { variantIdCollectionFilter } from './plugins/multivendor/collection-filters';
import { cashOnDeliveryHandler } from './plugins/multivendor/payment/cash-on-delivery.handler';
import { TaxEnforcementPlugin } from './plugins/tax-enforcement.plugin';
import { PageInscriptionPlugin } from './plugins/page-inscription/page-inscription.plugin';
import { AhizanNotificationsPlugin } from './plugins/notifications/ahizan-notifications.plugin';
import { DynamicEmailSender } from './plugins/notifications/dynamic-email-sender';
import { ShortCodeVerificationTokenStrategy } from './plugins/notifications/short-code-strategy';
import { PromotionalOrderItemPriceCalculationStrategy, AhizanProductVariantPriceCalculationStrategy } from './plugins/multivendor/service/promotional-price.strategy';
import { AhizanOrderSellerStrategy } from './plugins/multivendor/service/ahizan-order-seller.strategy';
import { multivendorOrderProcess } from './plugins/multivendor/service/multivendor-order.process';
import { CMSPlugin } from './plugins/cms/cms.plugin';
import { BannerManagerPlugin } from './plugins/banner-manager/banner-manager.plugin';
import { CollectionFacetMapPlugin } from './plugins/collection-facet-map/collection-facet-map.plugin';
import { BulkCollectionImportPlugin } from './plugins/bulk-collection-import/bulk-collection-import.plugin';
import { WatermarkedLocalAssetStorageStrategy } from './watermarked-storage.strategy';
import { GeoEnginePlugin } from './plugins/geo-engine/geo-engine.plugin';
import { geoEngineShippingCalculator } from './plugins/geo-engine/shipping/geo-engine-shipping.calculator';
import { geoEngineShippingEligibilityChecker } from './plugins/geo-engine/shipping/geo-engine-shipping.eligibility-checker';

dns.setDefaultResultOrder('ipv4first');

// Shared DynamicEmailSender instance – index.ts and index-worker.ts call .setDataSource() on it
export const emailSenderNode = new DynamicEmailSender();

const IS_DEV = process.env.APP_ENV === 'dev';
const serverPort = +process.env.PORT || 3000;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const config: any = {
    apiOptions: {
        port: serverPort,
        adminApiPath: 'admin-api',
        shopApiPath: 'shop-api',
        middleware: [
            {
                handler: json({ limit: '50mb' }),
                route: '/',
                beforeListen: true,
            }
        ],
    },
    authOptions: {
        tokenMethod: ['bearer', 'cookie'] as const,
        requireVerification: true, 
        verificationTokenStrategy: new ShortCodeVerificationTokenStrategy(),
        verificationTokenDuration: '100y', 
        superadminCredentials: {
            identifier: process.env.SUPERADMIN_USERNAME,
            password: process.env.SUPERADMIN_PASSWORD,
        },
        cookieOptions: {
            secret: process.env.COOKIE_SECRET,
        },
    },
    orderOptions: {
        orderItemPriceCalculationStrategy: new PromotionalOrderItemPriceCalculationStrategy(),
        orderSellerStrategy: new AhizanOrderSellerStrategy(),
        process: [defaultOrderProcess, multivendorOrderProcess],
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
        shippingCalculators: [
            defaultShippingCalculator, 
            globalFixedShippingCalculator, 
            zoneBasedShippingCalculator,
            geoEngineShippingCalculator
        ],
        shippingEligibilityCheckers: [
            geoEngineShippingEligibilityChecker,
        ],
    },
    catalogOptions: {
        productVariantPriceCalculationStrategy: new AhizanProductVariantPriceCalculationStrategy(),
        collectionFilters: [...defaultCollectionFilters, variantIdCollectionFilter],
    },
    paymentOptions: {
        paymentMethodHandlers: [cashOnDeliveryHandler],
    },
    customFields: {
        Address: [
            { name: 'latitude', type: 'float', nullable: true, public: true, label: [{ languageCode: LanguageCode.fr, value: 'Latitude' }] },
            { name: 'longitude', type: 'float', nullable: true, public: true, label: [{ languageCode: LanguageCode.fr, value: 'Longitude' }] },
        ],
        User: [
            { name: 'passwordResetCodeExpiresAt', type: 'datetime', public: false, label: [{ languageCode: LanguageCode.fr, value: 'Expiration du code de réinitialisation' }] },
        ],
        ProductVariant: [
            { name: 'compareAtPrice', type: 'int', nullable: true, public: true, description: [{ languageCode: LanguageCode.fr, value: 'Prix de comparaison (prix barré) en centimes' }] },
            { name: 'onPromotion', type: 'boolean', nullable: true, public: true, defaultValue: false, description: [{ languageCode: LanguageCode.fr, value: 'Indique si le produit est en promotion' }] },
            { name: 'promotionalPrice', type: 'int', nullable: true, public: true, description: [{ languageCode: LanguageCode.fr, value: 'Prix promotionnel en centimes' }] },
        ],
        Product: [
            { name: 'shortDescription', type: 'text', nullable: true, public: true, label: [{ languageCode: LanguageCode.fr, value: 'Petite description' }] },
            { name: 'weight', type: 'float', nullable: true, public: true, label: [{ languageCode: LanguageCode.fr, value: 'Poids (kg)' }] },
            { name: 'width', type: 'float', nullable: true, public: true, label: [{ languageCode: LanguageCode.fr, value: 'Largeur (cm)' }] },
            { name: 'height', type: 'float', nullable: true, public: true, label: [{ languageCode: LanguageCode.fr, value: 'Hauteur (cm)' }] },
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
            storageStrategyFactory: (options) => new WatermarkedLocalAssetStorageStrategy(
                options.assetUploadDir,
                IS_DEV ? undefined : (req: any, id: string) => {
                    const prefix = process.env.ASSET_URL_PREFIX || '';
                    return prefix.endsWith('/') ? `${prefix}${id}` : `${prefix}/${id}`;
                }
            )
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
            handlers: [],
            templateLoader: new FileBasedTemplateLoader(path.join(__dirname, '../static/email/templates')),
            globalTemplateVars: async (ctx: any) => {
                const req = ctx?.req;
                const refererOrOrigin = req?.headers?.origin || req?.headers?.referer || '';
                const isSeller = typeof refererOrOrigin === 'string' && refererOrOrigin.includes('seller');
                const baseUrl = isSeller
                    ? (process.env.SELLER_URL || 'http://localhost:3002')
                    : (process.env.STOREFRONT_URL || 'http://localhost:3001');

                return {
                    fromAddress: process.env.BREVO_FROM_EMAIL || '"Ahizan" <noreply@ahizan.com>',
                    verifyEmailAddressUrl: `${baseUrl}/verify`,
                    passwordResetUrl: `${baseUrl}/reset-password`,
                    changeEmailAddressUrl: `${baseUrl}/verify-email-address-change`,
                };
            },
        } as any),
        DashboardPlugin.init({
            route: 'admin',
            appDir: path.join(__dirname, '../dist/dashboard'),
        }),
        GeoEnginePlugin,
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
