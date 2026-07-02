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
    static cmsServiceInstance: CMSService;

    constructor(
        private cmsService: CMSService,
        private channelService: ChannelService,
    ) { 
        CMSPlugin.cmsServiceInstance = cmsService;
    }

    async onApplicationBootstrap() {
        try {
            const channel = await this.channelService.getDefaultChannel();
            const ctx = new RequestContext({
                apiType: 'admin',
                isAuthorized: true,
                authorizedAsOwnerOnly: false,
                channel,
            });
            await this.cmsService.ensureHomePage(ctx);

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
