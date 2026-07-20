import { OnApplicationBootstrap } from '@nestjs/common';
import { PluginCommonModule, VendurePlugin, ShippingMethodService, ChannelService, LanguageCode, RequestContext, Permission, Logger } from '@vendure/core';
import { GeoZone } from './entities/geo-zone.entity';
import { Market } from './entities/market.entity';
import { DeliveryZone } from './entities/delivery-zone.entity';
import { GeoService } from './service/geo.service';
import { adminApiExtensions, shopApiExtensions, commonApiExtensions } from './api/api-extensions';
import { GeoResolver, GeoAdminResolver, MarketResolver, DeliveryZoneResolver } from './api/geo.resolver';
import { gql } from 'graphql-tag';
import { geoEngineShippingCalculator } from './shipping/geo-engine-shipping.calculator';
import { geoEngineShippingEligibilityChecker } from './shipping/geo-engine-shipping.eligibility-checker';

@VendurePlugin({
    imports: [PluginCommonModule],
    entities: [GeoZone, Market, DeliveryZone],
    providers: [GeoService],
    exports: [GeoService],
    compatibility: '^3.0.0',
    dashboard: './dashboard',
    adminApiExtensions: {
        schema: gql`
            ${commonApiExtensions}
            ${adminApiExtensions}
        `,
        resolvers: [GeoAdminResolver, GeoResolver, MarketResolver, DeliveryZoneResolver],
    },
    shopApiExtensions: {
        schema: gql`
            ${commonApiExtensions}
            ${shopApiExtensions}
        `,
        resolvers: [GeoResolver, MarketResolver, DeliveryZoneResolver],
    },
})
export class GeoEnginePlugin implements OnApplicationBootstrap {
    constructor(
        private shippingMethodService: ShippingMethodService,
        private channelService: ChannelService,
    ) {
        Logger.info('GeoEnginePlugin constructed!', 'GeoEnginePlugin');
    }

    async onApplicationBootstrap() {
        Logger.info('Initializing GeoEnginePlugin default shipping method check...', 'GeoEnginePlugin');
        const defaultChannel = await this.channelService.getDefaultChannel();
        const ctx = new RequestContext({
            apiType: 'admin',
            isAuthorized: true,
            authorizedAsOwnerOnly: false,
            channel: defaultChannel,
        });

        const existingMethods = await this.shippingMethodService.findAll(ctx);
        Logger.info(`Found ${existingMethods.items.length} existing shipping methods.`, 'GeoEnginePlugin');
        if (existingMethods.items.length === 0) {
            try {
                await this.shippingMethodService.create(ctx, {
                    code: 'geo-engine-delivery',
                    fulfillmentHandler: 'manual-fulfillment',
                    checker: {
                        code: 'geo-engine-shipping-eligibility-checker',
                        arguments: [],
                    },
                    calculator: {
                        code: 'geo-engine-shipping-calculator',
                        arguments: [],
                    },
                    translations: [
                        {
                            languageCode: LanguageCode.fr,
                            name: 'Livraison standard',
                            description: 'Livraison calculée selon votre zone ou distance réelle',
                        },
                        {
                            languageCode: LanguageCode.en,
                            name: 'Standard Delivery',
                            description: 'Delivery calculated based on your zone or real distance',
                        },
                    ],
                });
                Logger.info('Created default GeoEngine shipping method successfully.', 'GeoEnginePlugin');
            } catch (e) {
                Logger.error('Failed to create default shipping method on bootstrap:', 'GeoEnginePlugin', e as any);
            }
        }
    }
}
