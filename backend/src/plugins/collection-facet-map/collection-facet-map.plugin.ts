import { PluginCommonModule, VendurePlugin, RequestContext, TransactionalConnection, Collection, FacetValue, Facet, ChannelService, Permission } from '@vendure/core';
import { OnApplicationBootstrap } from '@nestjs/common';
import { CollectionFacetMapResolver } from './api/collection-facet-map.resolver';
import { adminApiExtensions, shopApiExtensions } from './api/api-extensions';

@VendurePlugin({
    imports: [PluginCommonModule],
    providers: [],
    adminApiExtensions: {
        schema: adminApiExtensions,
        resolvers: [CollectionFacetMapResolver],
    },
    shopApiExtensions: {
        schema: shopApiExtensions,
        resolvers: [CollectionFacetMapResolver],
    },
    dashboard: './dashboard',
    compatibility: '^3.0.0',
    configuration: (config: any) => {
        if (!config.customFields) {
            config.customFields = {};
        }
        if (!config.customFields.Collection) {
            config.customFields.Collection = [];
        }

        config.customFields.Collection.push({
            name: 'allowedFacetIds',
            type: 'string',
            list: true,
            public: true,
            nullable: true,
            defaultValue: [],
        });

        return config;
    },
})
export class CollectionFacetMapPlugin implements OnApplicationBootstrap {
    constructor(
        private connection: TransactionalConnection,
        private channelService: ChannelService,
    ) {}

    async onApplicationBootstrap() {
        console.log('[CollectionFacetMapPlugin] Initialized — managing allowed facets per collection');
    }
}
