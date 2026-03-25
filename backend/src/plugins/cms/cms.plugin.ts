import { PluginCommonModule, VendurePlugin, OnApplicationBootstrap, RequestContext, ChannelService } from '@vendure/core';
import { Page } from './entities/page.entity';
import { PageSection } from './entities/section.entity';
import { PagePreset } from './entities/page-preset.entity';
import { CMSService } from './service/cms.service';
import { adminApiExtensions, shopApiExtensions } from './api/api-extensions';
import { CMSAdminResolver, CMSShopResolver } from './api/cms.resolver';

@VendurePlugin({
    imports: [PluginCommonModule],
    entities: [Page, PageSection, PagePreset],
    providers: [CMSService],
    adminApiExtensions: {
        schema: adminApiExtensions,
        resolvers: [CMSAdminResolver],
    },
    shopApiExtensions: {
        schema: shopApiExtensions,
        resolvers: [CMSShopResolver],
    },
    dashboard: './dashboard',
    compatibility: '^3.0.0',
})
export class CMSPlugin implements OnApplicationBootstrap {
    constructor(
        private cmsService: CMSService,
        private channelService: ChannelService,
    ) { }

    async onApplicationBootstrap() {
        console.log('[CMSPlugin] Server starting... Checking facets for diagnostic...');
        try {
            const channel = await this.channelService.getDefaultChannel();
            const ctx = new RequestContext({
                apiType: 'admin',
                isAuthorized: true,
                authorizedAsOwnerOnly: false,
                channel,
            });
            await this.cmsService.ensureHomePage(ctx);
            
            // DIAGNOSTIC LOGGING
            const { TransactionalConnection } = await import('@vendure/core');
            const { FacetValue } = await import('@vendure/core');
            const connection = (this.cmsService as any).connection;
            const facets = await connection.getRepository(ctx, FacetValue).find({
                relations: ['facet']
            });
            console.log(`[CMSPlugin] DIAGNOSTIC: Found ${facets.length} facet values in database:`);
            facets.forEach((f: any) => {
                console.log(` - [${f.id}] ${f.name} (Code: ${f.code}) | Parent Facet: ${f.facet?.name} (${f.facet?.code})`);
            });
            if (facets.length === 0) {
                console.warn('[CMSPlugin] DIAGNOSTIC WARNING: No facet values found in database via direct repository access!');
            }
        } catch (err: any) {
            console.error('[CMSPlugin] Bootstrap error:', err.message);
        }
    }
}
