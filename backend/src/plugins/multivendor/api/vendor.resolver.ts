import { Allow, Ctx, Permission, RequestContext, PaginatedList, Product, ProductService, OrderService, Order, OrderStateTransitionError, AssetService, Asset } from '@vendure/core';
import { Args, Mutation, Query, Resolver, ResolveField, Parent } from '@nestjs/graphql';
import { VendorService } from '../service/vendor.service';
import { Vendor, VendorStatus } from '../entities/vendor.entity';

@Resolver()
export class VendorResolver {
    constructor(
        private vendorService: VendorService,
        private orderService: OrderService,
        private assetService: AssetService
    ) { }

    @Mutation()
    @Allow(Permission.Public)
    async applyToBecomeVendor(
        @Ctx() ctx: RequestContext,
        @Args('input') input: any
    ): Promise<Vendor> {
        console.log('VendorResolver.applyToBecomeVendor called!');

        try {
            // If user is authenticated, link vendor to their account
            const userId = ctx.activeUserId;

            if (userId) {
                return await this.vendorService.create(ctx, { ...input, userId: userId.toString() });
            } else if (input.password) {
                // Create new user account with vendor application
                return await this.vendorService.create(ctx, input);
            } else {
                throw new Error('Either authenticate or provide a password to create vendor account');
            }
        } catch (error: any) {
            console.error('Error in VendorResolver.applyToBecomeVendor:', error);
            throw error; // Re-throw to GraphQL
        }
    }

    @Query()
    @Allow(Permission.Public)
    async vendor(@Ctx() ctx: RequestContext, @Args('id') id: string): Promise<Vendor | null> {
        return this.vendorService.findOne(ctx, id);
    }

    @Query()
    @Allow(Permission.Public)
    async vendors(@Ctx() ctx: RequestContext, @Args('options') options: any): Promise<PaginatedList<Vendor>> {
        return this.vendorService.findAll(ctx, options);
    }

    @Query()
    @Allow(Permission.Authenticated)
    async myVendorProfile(@Ctx() ctx: RequestContext): Promise<Vendor | null> {
        if (!ctx.activeUserId) {
            throw new Error('Not authenticated');
        }
        return this.vendorService.findByUserId(ctx, ctx.activeUserId.toString());
    }

    @Query()
    @Allow(Permission.Authenticated)
    async myVendorOrders(@Ctx() ctx: RequestContext, @Args('options') options: any): Promise<any> {
        const vendor = await this.myVendorProfile(ctx);
        if (!vendor) {
            throw new Error('No vendor profile found for this user');
        }
        return this.vendorService.findOrdersForVendor(ctx, vendor.id.toString(), options);
    }

    @Mutation()
    @Allow(Permission.Authenticated)
    async updateMyVendorProfile(@Ctx() ctx: RequestContext, @Args('input') input: any): Promise<Vendor> {
        const vendor = await this.myVendorProfile(ctx);
        if (!vendor) {
            throw new Error('No vendor profile found for this user');
        }
        return this.vendorService.update(ctx, vendor.id.toString(), input);
    }

    @Mutation()
    @Allow(Permission.Authenticated)
    async updateMyOrderStatus(
        @Ctx() ctx: RequestContext,
        @Args('orderId') orderId: string,
        @Args('status') status: string
    ): Promise<Order | OrderStateTransitionError> {
        const vendor = await this.myVendorProfile(ctx);
        if (!vendor) {
            throw new Error('No vendor profile found for this user');
        }

        const order = await this.orderService.findOne(ctx, orderId, ['customFields.vendor']);
        if (!order) {
            throw new Error('Order not found');
        }

        const orderVendor = (order.customFields as any).vendor;
        if (!orderVendor || orderVendor.id !== vendor.id) {
            throw new Error('You do not have permission to update this order');
        }

        return this.orderService.transitionToState(ctx, orderId, status as any);
    }

    @ResolveField()
    async products(@Parent() vendor: Vendor, @Ctx() ctx: RequestContext): Promise<Product[]> {
        const products = await this.vendorService.findAllProductsForVendor(ctx, vendor.id.toString());
        return products || [];
    }

    @Mutation()
    @Allow(Permission.Authenticated)
    async uploadVendorFile(
        @Ctx() ctx: RequestContext,
        @Args('file') file: any
    ): Promise<Asset | undefined> {
        const asset = await this.assetService.create(ctx, {
            file,
            tags: ['vendor-docs'],
        });
        if (isErrorResult(asset)) {
            throw new Error(asset.message);
        }
        return asset as any;
    }
}

function isErrorResult(result: any): result is { message: string; errorCode: string } {
    return !!result.errorCode;
}

@Resolver('Vendor')
export class VendorAdminResolver {
    constructor(
        private vendorService: VendorService,
        private productService: ProductService
    ) {
        console.log('VendorAdminResolver initialized with ProductService');
    }

    @Query()
    @Allow(Permission.Public)
    async publicProducts(@Ctx() ctx: RequestContext, @Args('options') options: any): Promise<PaginatedList<Product>> {
        return this.productService.findAll(ctx, options);
    }

    @Query()
    @Allow(Permission.Public)
    async vendors(@Ctx() ctx: RequestContext, @Args('options') options: any): Promise<PaginatedList<Vendor>> {
        return this.vendorService.findAll(ctx, options);
    }

    @Query()
    @Allow(Permission.Public)
    async vendor(@Ctx() ctx: RequestContext, @Args('id') id: string): Promise<Vendor | null> {
        return this.vendorService.findOne(ctx, id);
    }

    @Mutation()
    @Allow(Permission.Public)
    async createVendor(
        @Ctx() ctx: RequestContext,
        @Args('input') input: any
    ): Promise<Vendor> {
        return this.vendorService.create(ctx, input);
    }

    @Mutation()
    @Allow(Permission.Public)
    async updateVendorStatus(
        @Ctx() ctx: RequestContext,
        @Args('id') id: string,
        @Args('status') status: VendorStatus,
        @Args('reason') reason?: string
    ): Promise<Vendor> {
        return this.vendorService.update(ctx, id, { status, rejectionReason: reason });
    }

    @Mutation()
    @Allow(Permission.Public)
    async updateVendor(
        @Ctx() ctx: RequestContext,
        @Args('id') id: string,
        @Args('input') input: any
    ): Promise<Vendor> {
        return this.vendorService.update(ctx, id, input);
    }
}
