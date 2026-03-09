import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Allow, Ctx, RequestContext, Permission, PaginatedList } from '@vendure/core';
import { CmsService } from '../service/cms.service';
import { Page } from '../entities/page.entity';
import { PageSection } from '../entities/section.entity';

@Resolver()
export class CmsAdminResolver {
    constructor(private cmsService: CmsService) { }

    @Query()
    @Allow(Permission.Public)
    async pages(@Ctx() ctx: RequestContext, @Args() args: any): Promise<PaginatedList<Page>> {
        return this.cmsService.findAllPages(ctx, args.options);
    }

    @Query()
    @Allow(Permission.Public)
    async page(@Ctx() ctx: RequestContext, @Args('id') id: string): Promise<Page | null> {
        return this.cmsService.findOnePage(ctx, id);
    }

    @Mutation()
    @Allow(Permission.Public)
    async createPage(@Ctx() ctx: RequestContext, @Args('input') input: any): Promise<Page> {
        return this.cmsService.createPage(ctx, input);
    }

    @Mutation()
    @Allow(Permission.Public)
    async updatePage(@Ctx() ctx: RequestContext, @Args('input') input: any): Promise<Page> {
        return this.cmsService.updatePage(ctx, input);
    }

    @Mutation()
    @Allow(Permission.Public)
    async deletePage(@Ctx() ctx: RequestContext, @Args('id') id: string): Promise<any> {
        return this.cmsService.deletePage(ctx, id);
    }

    @Mutation()
    @Allow(Permission.Public)
    async createSection(@Ctx() ctx: RequestContext, @Args('input') input: any): Promise<PageSection> {
        return this.cmsService.createSection(ctx, input);
    }

    @Mutation()
    @Allow(Permission.Public)
    async updateSection(@Ctx() ctx: RequestContext, @Args('input') input: any): Promise<PageSection> {
        return this.cmsService.updateSection(ctx, input);
    }

    @Mutation()
    @Allow(Permission.Public)
    async deleteSection(@Ctx() ctx: RequestContext, @Args('id') id: string): Promise<any> {
        return this.cmsService.deleteSection(ctx, id);
    }
}
