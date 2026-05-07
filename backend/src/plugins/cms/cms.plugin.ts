import { PluginCommonModule, VendurePlugin, RequestContext, ChannelService } from '@vendure/core';
import { OnApplicationBootstrap } from '@nestjs/common';
import { Page } from './entities/page.entity';
import { PageSection } from './entities/section.entity';
import { PagePreset } from './entities/page-preset.entity';
import { SiteSeason } from './entities/site-season.entity';
import { SeasonSchedule } from './entities/season-schedule.entity';
import { CMSService } from './service/cms.service';
import { adminApiExtensions, shopApiExtensions } from './api/api-extensions';
import { CMSAdminResolver, CMSShopResolver } from './api/cms.resolver';

@VendurePlugin({
    imports: [PluginCommonModule],
    entities: [Page, PageSection, PagePreset, SiteSeason, SeasonSchedule],
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

            // COLLECTION DIAGNOSTIC
            const { Collection: CollectionEntity } = await import('@vendure/core');
            const collections = await connection.getRepository(ctx, CollectionEntity).find({
                relations: ['featuredAsset', 'parent', 'translations']
            });
            console.log(`[CMSPlugin] DIAGNOSTIC: Found ${collections.length} collections in database:`);
            collections.forEach((c: any) => {
                const trans = c.translations || [];
                const frTrans = trans.find((t: any) => t.languageCode === 'fr') || trans[0];
                const name = frTrans?.name || c.name || 'UNNAMED';
                const slug = frTrans?.slug || c.slug || 'NO-SLUG';
                console.log(` - [${c.id}] name=${name} slug=${slug} parentId=${c.parentId}`);
            });
            if (collections.length === 0) {
                console.warn('[CMSPlugin] DIAGNOSTIC WARNING: No collections found in database! You need to create collections in the Vendure admin dashboard.');
            }

            // Start season auto-activation cron (every 5 minutes)
            setInterval(async () => {
                try {
                    await this.cmsService.checkSeasonState(ctx);
                } catch (err: any) {
                    console.error('[CMSPlugin] Season check error:', err.message);
                }
            }, 5 * 60 * 1000);
        } catch (err: any) {
            console.error('[CMSPlugin] Bootstrap error:', err.message);
        }
    }
}
