import { PluginCommonModule, VendurePlugin, RequestContext, ChannelService } from '@vendure/core';
import { OnApplicationBootstrap, NestModule, MiddlewareConsumer } from '@nestjs/common';
import * as path from 'path';
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
import { WatermarkService } from './service/watermark.service';
import { AssetDownloadController } from './api/asset-download.controller';

@VendurePlugin({
    imports: [PluginCommonModule],
    entities: [Page, PageSection, PagePreset, SiteSeason, SeasonSchedule, UserProfile, CMSEventLog],
    controllers: [EventCollectorController, AssetDownloadController],
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
        WatermarkService,
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
export class CMSPlugin implements OnApplicationBootstrap, NestModule {
    static cmsServiceInstance: CMSService;
    static watermarkServiceInstance: WatermarkService;

    constructor(
        private cmsService: CMSService,
        private channelService: ChannelService,
        private watermarkService: WatermarkService,
    ) { 
        CMSPlugin.cmsServiceInstance = cmsService;
        CMSPlugin.watermarkServiceInstance = watermarkService;
    }

    static async assetWatermarkHandler(req: any, res: any, next: any) {
        try {
            const fullUrl = (req.originalUrl || req.url || req.path || '').split('?')[0];
            if (!fullUrl.includes('/assets/')) {
                return next();
            }

            const rawPath = fullUrl.substring(fullUrl.indexOf('/assets/') + 8);
            const ext = path.extname(rawPath).toLowerCase();
            const supportedImageExts = ['.jpg', '.jpeg', '.png', '.webp'];

            if (!supportedImageExts.includes(ext)) {
                return next();
            }

            const baseName = path.basename(rawPath).toLowerCase();
            // Exclude system logos, brand banners, favicons, avatars, and watermark source itself
            if (
                baseName.includes('logo') ||
                baseName.includes('favicon') ||
                baseName.includes('watermark') ||
                baseName.includes('apple-touch') ||
                baseName.includes('icon-') ||
                rawPath.includes('logo-temp-01')
            ) {
                return next();
            }

            const ua = String(req.headers['user-agent'] || '').toLowerCase();
            const referer = String(req.headers['referer'] || req.headers['referrer'] || '').toLowerCase();
            const secFetchSite = String(req.headers['sec-fetch-site'] || '').toLowerCase();
            const isExplicitDownload = req.query && (req.query.download === '1' || req.query.download === 'true');

            // Search engine / shopping / social crawlers and scrapers (Googlebot, Googlebot-Image,
            // Storebot-Google, GoogleOther, Bingbot, Pinterest, curl, python...). They index the images
            // we serve, so they must receive the watermarked version.
            const isSearchBot = /googlebot|google-inspectiontool|storebot|googleother|google-extended|adsbot|mediapartners|apis-google|feedfetcher|google-read-aloud|bingbot|bingpreview|msnbot|slurp|duckduckbot|baiduspider|yandex|sogou|petalbot|applebot|facebot|facebookexternalhit|pinterest|twitterbot|linkedinbot|whatsapp|telegrambot|ia_archiver|semrush|ahrefs|mj12bot|dotbot|crawler|spider|\bbot\b|bot\/|curl\/|wget|python-requests|python-urllib|scrapy|aiohttp|go-http-client|okhttp|libwww|java\/|httpclient|headlesschrome/i.test(ua);

            // Referer from Google Images, Google search, Bing, etc.
            const isSearchReferer = /google\.[a-z]{2,}|images\.google|bing\.com|yahoo\.com|yandex\.|duckduckgo\.com|pinterest\.com|android-app:\/\/com\.google/i.test(referer);

            // Origin is Ahizan platform (Storefront, Admin, Seller, dev localhost)
            const isPlatformReferer = /ahizan\.com|localhost|127\.0\.0\.1|0\.0\.0\.0/i.test(referer);
            const isPlatformSameSite = (secFetchSite === 'same-origin' || secFetchSite === 'same-site') && !isSearchReferer;

            const shouldWatermark = 
                isExplicitDownload || 
                isSearchBot || 
                isSearchReferer || 
                (!isPlatformReferer && !isPlatformSameSite && (referer.startsWith('http') || req.headers['sec-fetch-dest'] === 'document'));

            if (shouldWatermark && CMSPlugin.watermarkServiceInstance) {
                const result = await CMSPlugin.watermarkServiceInstance.getWatermarkedImage(decodeURIComponent(rawPath));
                if (result && result.buffer) {
                    res.setHeader('Content-Type', result.mimeType);
                    if (isExplicitDownload) {
                        res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
                    } else {
                        res.setHeader('Content-Disposition', `inline; filename="${result.filename}"`);
                    }
                    res.setHeader('Cache-Control', 'public, max-age=86400');
                    res.setHeader('Vary', 'User-Agent, Referer, Sec-Fetch-Site');
                    return res.send(result.buffer);
                }
            }
        } catch (err: any) {
            // In case of any error, gracefully proceed to original asset
        }

        res.setHeader('Vary', 'User-Agent, Referer, Sec-Fetch-Site');
        next();
    }

    configure(consumer: MiddlewareConsumer) {
        consumer.apply(CMSPlugin.assetWatermarkHandler).forRoutes('assets', 'assets/*');
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
