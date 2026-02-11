import { Allow, Ctx, RequestContext, Permission, OrderService, Order, OrderStateTransitionError } from '@vendure/core';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { VendorService } from '../service/vendor.service';
import { Vendor } from '../entities/vendor.entity';

/**
 * Shop API resolver for vendor-specific operations
 * Handles vendor profile management and order status updates for authenticated vendors
 */
@Resolver()
export class VendorShopApiResolver {
    constructor(
        private vendorService: VendorService,
        private orderService: OrderService
    ) { }

    /**
     * Get the vendor profile for the authenticated user
     */
    @Query()
    @Allow(Permission.Authenticated)
    async myVendorProfile(@Ctx() ctx: RequestContext): Promise<Vendor | null> {
        if (!ctx.activeUserId) {
            throw new Error('Not authenticated');
        }

        const vendor = await this.vendorService.findByUserId(ctx, ctx.activeUserId.toString());
        return vendor;
    }

    /**
     * Get all orders for the authenticated vendor
     */
    @Query()
    @Allow(Permission.Authenticated)
    async myVendorOrders(
        @Ctx() ctx: RequestContext,
        @Args('options') options: any
    ): Promise<any> {
        const vendor = await this.myVendorProfile(ctx);
        if (!vendor) {
            throw new Error('No vendor profile found for this user');
        }

        return this.vendorService.findOrdersForVendor(ctx, vendor.id.toString(), options);
    }

    /**
     * Update the authenticated vendor's profile (Re-submission or simple update)
     */
    @Mutation()
    @Allow(Permission.Authenticated)
    async updateMyVendorProfile(
        @Ctx() ctx: RequestContext,
        @Args('input') input: any
    ): Promise<Vendor> {
        const vendor = await this.myVendorProfile(ctx);
        if (!vendor) {
            throw new Error('No vendor profile found for this user');
        }

        return this.vendorService.update(ctx, vendor.id.toString(), input);
    }

    /**
     * Update order status for vendor's orders
     */
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

        // Verify order belongs to vendor
        const order = await this.orderService.findOne(ctx, orderId, ['customFields.vendor']);
        if (!order) {
            throw new Error('Order not found');
        }

        const orderVendor = (order.customFields as any).vendor;
        if (!orderVendor || orderVendor.id !== vendor.id) {
            throw new Error('You do not have permission to update this order');
        }

        // Transition order state
        return this.orderService.transitionToState(ctx, orderId, status as any);
    }
}
