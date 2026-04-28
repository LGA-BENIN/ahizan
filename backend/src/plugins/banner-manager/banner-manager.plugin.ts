import { PluginCommonModule, VendurePlugin } from '@vendure/core';
import { BannerService } from './banner.service';
import { BannerAdminController } from './banner.controller';

@VendurePlugin({
    imports: [PluginCommonModule],
    providers: [BannerService],
    controllers: [BannerAdminController],
    compatibility: '^3.0.0',
})
export class BannerManagerPlugin {}
