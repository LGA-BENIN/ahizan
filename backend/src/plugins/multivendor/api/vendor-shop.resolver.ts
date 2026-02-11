import { Allow, Ctx, RequestContext, ProductService, Product, PaginatedList, OrderService, Order, Permission, OrderStateTransitionError } from '@vendure/core';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { VendorService } from '../service/vendor.service';
import { Vendor } from '../entities/vendor.entity';


/**
 * Vendor-specific resolver for authenticated vendors to manage their products and orders
 */
@Resolver()
export class VendorShopResolver {
    constructor(
        private vendorService: VendorService,
        private productService: ProductService,
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
     * Get all products belonging to the authenticated vendor
     */
    @Query()
    @Allow(Permission.Authenticated)
    async myVendorProducts(
        @Ctx() ctx: RequestContext,
        @Args('options') options: any
    ): Promise<PaginatedList<Product>> {
        const vendor = await this.myVendorProfile(ctx);
        if (!vendor) {
            throw new Error('No vendor profile found for this user');
        }

        const products = await this.vendorService.findAllProductsForVendor(ctx, vendor.id.toString());

        // Simple pagination (can be enhanced)
        const skip = options?.skip || 0;
        const take = options?.take || 10;
        const paginatedProducts = products.slice(skip, skip + take);

        return {
            items: paginatedProducts,
            totalItems: products.length
        };
    }

    /**
     * Get all orders for the authenticated vendor
     */
    @Query()
    @Allow(Permission.Authenticated)
    async myVendorOrders(
        @Ctx() ctx: RequestContext,
        @Args('options') options: any
    ): Promise<PaginatedList<Order>> {
        const vendor = await this.myVendorProfile(ctx);
        if (!vendor) {
            throw new Error('No vendor profile found for this user');
        }

        return this.vendorService.findOrdersForVendor(ctx, vendor.id.toString(), options);
    }

    /**
     * Create a new product for the authenticated vendor
     */
    @Mutation()
    @Allow(Permission.Authenticated)
    async createMyProduct(
        @Ctx() ctx: RequestContext,
        @Args('input') input: any
    ): Promise<Product> {
        const vendor = await this.myVendorProfile(ctx);
        if (!vendor) {
            throw new Error('No vendor profile found for this user');
        }

        // Create product with vendor link
        const product = await this.productService.create(ctx, {
            ...input,
            customFields: {
                vendor: { id: vendor.id }
            }
        });

        return product;
    }

    /**
     * Update a product owned by the authenticated vendor
     */
    @Mutation()
    @Allow(Permission.Authenticated)
    async updateMyProduct(
        @Ctx() ctx: RequestContext,
        @Args('id') id: string,
        @Args('input') input: any
    ): Promise<Product> {
        const vendor = await this.myVendorProfile(ctx);
        if (!vendor) {
            throw new Error('No vendor profile found for this user');
        }

        // Verify ownership
        const productVendor = await this.vendorService.getVendorByProductId(ctx, id);
        if (!productVendor || productVendor.id !== vendor.id) {
            throw new Error('You do not have permission to update this product');
        }

        return this.productService.update(ctx, { id, ...input });
    }

    /**
     * Delete a product owned by the authenticated vendor
     */
    @Mutation()
    @Allow(Permission.Authenticated)
    async deleteMyProduct(
        @Ctx() ctx: RequestContext,
        @Args('id') id: string
    ): Promise<{ result: string; message: string }> {
        const vendor = await this.myVendorProfile(ctx);
        if (!vendor) {
            throw new Error('No vendor profile found for this user');
        }

        // Verify ownership
        const productVendor = await this.vendorService.getVendorByProductId(ctx, id);
        if (!productVendor || productVendor.id !== vendor.id) {
            throw new Error('You do not have permission to delete this product');
        }

        await this.productService.softDelete(ctx, id);
        return { result: 'DELETED', message: 'Product deleted successfully' };
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
}
