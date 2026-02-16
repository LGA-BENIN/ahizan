import { Args, Query, Resolver } from '@nestjs/graphql';
import { Ctx, RequestContext } from '@vendure/core';
import { CmsService } from '../service/cms.service';
import { Page } from '../entities/page.entity';

@Resolver()
export class CmsShopResolver {
    constructor(private cmsService: CmsService) { }

    @Query()
    async page(@Ctx() ctx: RequestContext, @Args('slug') slug: string): Promise<Page | null> {
        return this.cmsService.findPageBySlug(ctx, slug);
    }
}
