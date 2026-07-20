import { PluginCommonModule, VendurePlugin, RequestContext, TransactionalConnection, Collection, FacetValue, Facet, ChannelService, Permission } from '@vendure/core';
import { OnApplicationBootstrap } from '@nestjs/common';
import { CollectionFacetMapAdminResolver } from './api/collection-facet-map.resolver';
import { CollectionFacetMapShopResolver } from './api/collection-facet-map-shop.resolver';
import { adminApiExtensions, shopApiExtensions } from './api/api-extensions';

@VendurePlugin({
    imports: [PluginCommonModule],
    providers: [],
    adminApiExtensions: {
        schema: adminApiExtensions,
        resolvers: [CollectionFacetMapAdminResolver],
    },
    shopApiExtensions: {
        schema: shopApiExtensions,
        resolvers: [CollectionFacetMapShopResolver],
    },
    dashboard: './dashboard',
    compatibility: '^3.0.0',
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
