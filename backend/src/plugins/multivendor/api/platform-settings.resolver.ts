import { Allow, Ctx, Permission, RequestContext } from '@vendure/core';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { PlatformSettingsService } from '../service/platform-settings.service';
import { PlatformSettings } from '../entities/platform-settings.entity';

@Resolver()
export class PlatformSettingsAdminResolver {
    constructor(private platformSettingsService: PlatformSettingsService) { }

    @Query()
    @Allow(Permission.Authenticated)
    async platformSettings(@Ctx() ctx: RequestContext): Promise<PlatformSettings | null> {
        return this.platformSettingsService.getOrCreateSettings(ctx);
    }

    @Mutation()
    @Allow(Permission.Authenticated)
    async updatePlatformSettings(
        @Ctx() ctx: RequestContext,
        @Args('input') input: any,
    ): Promise<PlatformSettings> {
        return this.platformSettingsService.updateSettings(ctx, input);
    }
}

@Resolver()
export class PlatformSettingsShopResolver {
    constructor(private platformSettingsService: PlatformSettingsService) { }

    @Query()
    @Allow(Permission.Public)
    async platformSettings(@Ctx() ctx: RequestContext): Promise<PlatformSettings | null> {
        return this.platformSettingsService.getOrCreateSettings(ctx);
    }
}
