import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Ctx, RequestContext, Transaction, Allow, Permission, ID, PaginatedList, AssetService, Asset, ChannelService, User, Channel } from '@vendure/core';
import { DeletionResponse } from '@vendure/common/lib/generated-types';
import { CMSService } from '../service/cms.service';
import { Page } from '../entities/page.entity';
import { PageSection } from '../entities/section.entity';

@Resolver()
export class CMSAdminResolver {
    constructor(
        private cmsService: CMSService,
        private assetService: AssetService,
        private channelService: ChannelService,
    ) { }

    @Mutation()
    @Transaction()
    @Allow(Permission.Public)
    async createCmsAsset(@Ctx() ctx: RequestContext, @Args('file') file: any): Promise<Asset> {
        const channel = await this.channelService.getDefaultChannel();
        const superAdminCtx = new RequestContext({
            channel,
            apiType: 'admin',
            isAuthorized: true,
            authorizedAsOwnerOnly: false,
        });
        const res = await this.assetService.create(superAdminCtx, { file });
        if ((res as any).errorCode) {
            throw new Error((res as any).message || 'Asset upload failed');
        }
        return res as Asset;
    }

    @Query()
    @Allow(Permission.Public)
    async pages(@Ctx() ctx: RequestContext, @Args() args: any): Promise<PaginatedList<Page>> {
        return this.cmsService.findAll(ctx, args.options);
    }

    @Query()
    @Allow(Permission.Public)
    async page(@Ctx() ctx: RequestContext, @Args() args: { id: ID }): Promise<Page | null> {
        return this.cmsService.findOne(ctx, args.id);
    }

    @Mutation()
    @Transaction()
    @Allow(Permission.Public)
    async createPage(@Ctx() ctx: RequestContext, @Args('input') input: any): Promise<Page> {
        return this.cmsService.createPage(ctx, input);
    }

    @Mutation()
    @Transaction()
    @Allow(Permission.Public)
    async updatePage(@Ctx() ctx: RequestContext, @Args('input') input: any): Promise<Page> {
        return this.cmsService.updatePage(ctx, input);
    }

    @Mutation()
    @Transaction()
    @Allow(Permission.Public)
    async deletePage(@Ctx() ctx: RequestContext, @Args() args: { id: ID }): Promise<DeletionResponse> {
        return this.cmsService.deletePage(ctx, args.id);
    }

    @Mutation()
    @Transaction()
    @Allow(Permission.Public)
    async createSection(@Ctx() ctx: RequestContext, @Args('input') input: any): Promise<PageSection> {
        return this.cmsService.createSection(ctx, input);
    }

    @Mutation()
    @Transaction()
    @Allow(Permission.Public)
    async updateSection(@Ctx() ctx: RequestContext, @Args('input') input: any): Promise<PageSection> {
        return this.cmsService.updateSection(ctx, input);
    }

    @Mutation()
    @Transaction()
    @Allow(Permission.Public)
    async deleteSection(@Ctx() ctx: RequestContext, @Args() args: { id: ID }): Promise<DeletionResponse> {
        return this.cmsService.deleteSection(ctx, args.id);
    }

    @Mutation()
    @Transaction()
    @Allow(Permission.Public)
    async initializeHomePage(@Ctx() ctx: RequestContext, @Args() args: { pageId: ID }): Promise<Page | null> {
        return this.cmsService.initializeHomePage(ctx, args.pageId);
    }
}

@Resolver()
export class CMSShopResolver {
    constructor(private cmsService: CMSService) { }

    @Query()
    @Allow(Permission.Public)
    async page(@Ctx() ctx: RequestContext, @Args() args: { id?: ID, slug?: string }): Promise<Page | null> {
        if (args.id) {
            return this.cmsService.findOne(ctx, args.id);
        }
        return this.cmsService.findOneBySlug(ctx, args.slug || '');
    }
}
