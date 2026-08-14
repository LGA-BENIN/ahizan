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

import { UserProfile } from './entities/user-profile.entity';
import { CMSEventLog } from './entities/event-log.entity';
import { FeatureFlagService } from './service/feature-flag.service';
import { ExperienceEngineService } from './service/experience-engine.service';
import { ContentResolverService } from './service/content-resolver.service';
import { FeedAssemblyEngineService } from './service/feed-assembly-engine.service';
import { UserProfileEngineService } from './service/user-profile-engine.service';
import { DiscoveryEngineService } from './service/discovery-engine.service';
import { SearchEngineService } from './service/search-engine.service';
import { RankingEngineService } from './service/ranking-engine.service';
import { MerchandisingEngineService } from './service/merchandising-engine.service';
import { EventTrackerService } from './service/event-tracker.service';
import { EventCollectorController } from './api/event-collector.controller';

@VendurePlugin({
    imports: [PluginCommonModule],
    entities: [Page, PageSection, PagePreset, SiteSeason, SeasonSchedule, UserProfile, CMSEventLog],
    controllers: [EventCollectorController],
    providers: [
        CMSService,
        FeatureFlagService,
        ExperienceEngineService,
        ContentResolverService,
        FeedAssemblyEngineService,
        UserProfileEngineService,
        DiscoveryEngineService,
        SearchEngineService,
        RankingEngineService,
        MerchandisingEngineService,
        EventTrackerService,
    ],
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
