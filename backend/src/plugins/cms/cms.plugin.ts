import { PluginCommonModule, VendurePlugin } from '@vendure/core';
import { Page } from './entities/page.entity';
import { PageSection } from './entities/section.entity';
import { CmsService } from './service/cms.service';
import { CmsAdminResolver } from './api/cms-admin.resolver';
import { CmsShopResolver } from './api/cms-shop.resolver';
import { adminApiExtensions, shopApiExtensions } from './api/api-extensions';

@VendurePlugin({
    imports: [PluginCommonModule],
    entities: [Page, PageSection],
    providers: [CmsService],
    adminApiExtensions: {
        schema: adminApiExtensions,
        resolvers: [CmsAdminResolver],
    },
    shopApiExtensions: {
        schema: shopApiExtensions,
        resolvers: [CmsShopResolver],
    },
})
export class CmsPlugin { }
