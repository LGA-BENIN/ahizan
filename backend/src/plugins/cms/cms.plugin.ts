import { PluginCommonModule, VendurePlugin, RequestContext, ChannelService } from '@vendure/core';
import { OnApplicationBootstrap } from '@nestjs/common';
import { Page } from './entities/page.entity';
import { PageSection } from './entities/section.entity';
import { CMSService } from './service/cms.service';
import { adminApiExtensions, shopApiExtensions } from './api/api-extensions';
import { CMSAdminResolver, CMSShopResolver } from './api/cms.resolver';

@VendurePlugin({
    imports: [PluginCommonModule],
    entities: [Page, PageSection],
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
        const channel = await this.channelService.getDefaultChannel();
        const ctx = new RequestContext({
            channel,
            apiType: 'admin',
            isAuthorized: true,
            authorizedAsOwnerOnly: false,
        });
        await this.cmsService.ensureHomePage(ctx);
    }
}
