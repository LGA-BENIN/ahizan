import { Resolver, Query, Mutation, Args, Parent } from '@nestjs/graphql';
import { Ctx, RequestContext, Allow, Permission, ID, PaginatedList, Customer, TransactionalConnection } from '@vendure/core';
import { LikeService } from '../service/like.service';
import { VendorService } from '../service/vendor.service';
import { Vendor } from '../entities/vendor.entity';

@Resolver()
export class LikeShopResolver {
    constructor(
        private likeService: LikeService,
        private vendorService: VendorService,
        private connection: TransactionalConnection
    ) {}

    @Query()
    async isVendorLiked(
        @Ctx() ctx: RequestContext,
        @Args('id') id: ID
    ): Promise<boolean> {
        if (!ctx.activeUserId) {
            return false;
        }
        const customer = await this.connection.getRepository(ctx, Customer).findOne({
            where: { user: { id: Number(ctx.activeUserId) } }
        });
        if (!customer) {
            return false;
        }
        return this.likeService.isVendorLikedByUser(ctx, customer.id, id);
    }

    @Query()
    async isProductLiked(
        @Ctx() ctx: RequestContext,
        @Args('id') id: ID
    ): Promise<boolean> {
        if (!ctx.activeUserId) {
            return false;
        }
        const customer = await this.connection.getRepository(ctx, Customer).findOne({
            where: { user: { id: Number(ctx.activeUserId) } }
        });
        if (!customer) {
            return false;
        }
        return this.likeService.isProductLikedByUser(ctx, customer.id, id);
    }

    @Query()
    @Allow(Permission.Authenticated)
    async myLikedVendors(
        @Ctx() ctx: RequestContext,
        @Args('options') options: any
    ): Promise<any> {
        const customer = await this.connection.getRepository(ctx, Customer).findOne({
            where: { user: { id: Number(ctx.activeUserId) } }
        });
        if (!customer) {
            return { items: [], totalItems: 0 };
        }
        return this.likeService.getLikedVendorsForCustomer(ctx, customer.id, options);
    }

    @Query()
    @Allow(Permission.Authenticated)
    async myLikedProducts(
        @Ctx() ctx: RequestContext,
        @Args('options') options: any
    ): Promise<any> {
        const customer = await this.connection.getRepository(ctx, Customer).findOne({
            where: { user: { id: Number(ctx.activeUserId) } }
        });
        if (!customer) {
            return { items: [], totalItems: 0 };
        }
        return this.likeService.getLikedProductsForCustomer(ctx, customer.id, options);
    }

    @Mutation()
    @Allow(Permission.Authenticated)
    async toggleLikeVendor(
        @Ctx() ctx: RequestContext,
        @Args('id') id: ID
    ): Promise<boolean> {
        const customer = await this.connection.getRepository(ctx, Customer).findOne({
            where: { user: { id: Number(ctx.activeUserId) } }
        });
        if (!customer) {
            throw new Error('Customer profile not found for authenticated user');
        }
        return this.likeService.toggleVendorLike(ctx, customer.id, id);
    }

    @Mutation()
    @Allow(Permission.Authenticated)
    async toggleLikeProduct(
        @Ctx() ctx: RequestContext,
        @Args('id') id: ID
    ): Promise<boolean> {
        const customer = await this.connection.getRepository(ctx, Customer).findOne({
            where: { user: { id: Number(ctx.activeUserId) } }
        });
        if (!customer) {
            throw new Error('Customer profile not found for authenticated user');
        }
        return this.likeService.toggleProductLike(ctx, customer.id, id);
    }

    /* VENDOR DASHBOARD LIKES QUERIES */

    @Query()
    @Allow(Permission.Authenticated)
    async myVendorLikesCount(
        @Ctx() ctx: RequestContext
    ): Promise<number> {
        const vendor = await this.vendorService.findByUserId(ctx, ctx.activeUserId!.toString());
        if (!vendor) {
            return 0;
        }
        return this.likeService.getVendorLikesCount(ctx, vendor.id);
    }

    @Query()
    @Allow(Permission.Authenticated)
    async myVendorLikers(
        @Ctx() ctx: RequestContext,
        @Args('options') options: any
    ): Promise<any> {
        const vendor = await this.vendorService.findByUserId(ctx, ctx.activeUserId!.toString());
        if (!vendor) {
            return { items: [], totalItems: 0 };
        }
        return this.likeService.getVendorLikers(ctx, vendor.id, options);
    }

    @Query()
    @Allow(Permission.Authenticated)
    async myVendorProductsLikes(
        @Ctx() ctx: RequestContext
    ): Promise<any[]> {
        const vendor = await this.vendorService.findByUserId(ctx, ctx.activeUserId!.toString());
        if (!vendor) {
            return [];
        }
        return this.likeService.getVendorProductsLikes(ctx, vendor.id);
    }
}

@Resolver()
export class LikeAdminResolver {
    constructor(private likeService: LikeService) {}

    // Admin-specific resolvers if needed in the future
}
