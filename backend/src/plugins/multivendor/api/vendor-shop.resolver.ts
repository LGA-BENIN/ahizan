import { Allow, Ctx, RequestContext, ProductService, Product, PaginatedList, OrderService, Order, Permission, OrderStateTransitionError, ProductVariantService, LanguageCode, AssetService, Asset, EventBus, ProductEvent } from '@vendure/core';
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
        private productVariantService: ProductVariantService,
        private orderService: OrderService,
        private assetService: AssetService,
        private eventBus: EventBus,
    ) { }

    /**
     * Get the vendor profile for the authenticated user
     */
    @Query()
    @Allow(Permission.Authenticated)
    async myVendorProfile(@Ctx() ctx: RequestContext): Promise<Vendor | null> {
        if (!ctx.activeUserId) {
            console.warn('VendorShopResolver.myVendorProfile: No active user ID in context');
            throw new Error('Not authenticated');
        }

        console.log(`VendorShopResolver.myVendorProfile: Fetching profile for user ${ctx.activeUserId}`);
        const vendor = await this.vendorService.findByUserId(ctx, ctx.activeUserId.toString());

        if (!vendor) {
            console.warn(`VendorShopResolver.myVendorProfile: Vendor profile NOT FOUND for user ${ctx.activeUserId}`);
        } else {
            console.log(`VendorShopResolver.myVendorProfile: Found vendor ${vendor.id} (${vendor.name})`);
        }

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

    @Query()
    @Allow(Permission.Authenticated)
    async myVendorProduct(
        @Ctx() ctx: RequestContext,
        @Args('id') id: string
    ): Promise<Product | null> {
        const vendor = await this.myVendorProfile(ctx);
        if (!vendor) {
            throw new Error('No vendor profile found for this user');
        }

        const product = await this.productService.findOne(ctx, id);
        if (!product) {
            return null;
        }

        // Verify ownership
        const productVendor = await this.vendorService.getVendorByProductId(ctx, id);
        if (!productVendor || productVendor.id !== vendor.id) {
            throw new Error('You do not have permission to view this product');
        }

        return product;
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
        @Args('input') input: { name: string, description: string, price: number, stock: number, collectionIds?: string[], facetValueIds?: string[], assetIds?: string[], featuredAssetId?: string }
    ): Promise<Product> {
        const vendor = await this.myVendorProfile(ctx);
        if (!vendor) {
            throw new Error('No vendor profile found for this user');
        }

        // 1. Create Product with Collections and Assets
        const product = await this.productService.create(ctx, {
            translations: [{
                languageCode: ctx.languageCode,
                name: input.name,
                slug: input.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
                description: input.description,
            }],
            enabled: true,
            assetIds: input.assetIds,
            featuredAssetId: input.featuredAssetId,
            customFields: {
                vendor: { id: vendor.id }
            }
        });

        // 1b. Add product to collections if provided
        if (input.collectionIds && input.collectionIds.length > 0) {
            try {
                const connection = (this.productService as any).connection || (this.vendorService as any).connection;
                const queryRunner = connection.createQueryRunner();
                await queryRunner.connect();
                for (const collId of input.collectionIds) {
                    await queryRunner.query(
                        `INSERT INTO product_collections (product_id, collection_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
                        [product.id, collId]
                    );
                }
                await queryRunner.release();
            } catch (err) {
                console.error('[createMyProduct] Failed to add product to collections:', err);
            }
        }

        // 1c. Add facet values if provided
        if (input.facetValueIds && input.facetValueIds.length > 0) {
            try {
                const connection = (this.productService as any).connection || (this.vendorService as any).connection;
                const queryRunner = connection.createQueryRunner();
                await queryRunner.connect();
                for (const fvId of input.facetValueIds) {
                    await queryRunner.query(
                        `INSERT INTO product_facet_values (product_id, facet_value_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
                        [product.id, fvId]
                    );
                }
                await queryRunner.release();
            } catch (err) {
                console.error('[createMyProduct] Failed to add facet values:', err);
            }
        }

        // 2. Create Default Variant with Price & Stock
        await this.productVariantService.create(ctx, [{
            productId: product.id,
            sku: `${vendor.name.substring(0, 3).toUpperCase()}-${Date.now()}`,
            price: input.price,
            stockOnHand: input.stock,
            translations: [{
                languageCode: ctx.languageCode,
                name: input.name,
            }]
        }]);

        // 3. Re-fetch and emit event so the search index is updated
        const finalProduct = await this.productService.findOne(ctx, product.id) as Product;
        this.eventBus.publish(new ProductEvent(ctx, finalProduct, 'updated', { id: product.id }));
        return finalProduct;
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

        // Handle collectionIds and facetValueIds separately (not native ProductService fields)
        const { collectionIds, facetValueIds, ...productInput } = input;

        const updated = await this.productService.update(ctx, { id, ...productInput });

        // Update collections if provided
        if (collectionIds && Array.isArray(collectionIds)) {
            try {
                const connection = (this.productService as any).connection || (this.vendorService as any).connection;
                const queryRunner = connection.createQueryRunner();
                await queryRunner.connect();
                // Remove existing collection associations
                await queryRunner.query(
                    `DELETE FROM product_collections WHERE product_id = $1`,
                    [id]
                );
                // Add new collection associations
                for (const collId of collectionIds) {
                    await queryRunner.query(
                        `INSERT INTO product_collections (product_id, collection_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
                        [id, collId]
                    );
                }
                await queryRunner.release();
            } catch (err) {
                console.error('[updateMyProduct] Failed to update product collections:', err);
            }
        }

        // Update facet values if provided
        if (facetValueIds && Array.isArray(facetValueIds)) {
            try {
                const connection = (this.productService as any).connection || (this.vendorService as any).connection;
                const queryRunner = connection.createQueryRunner();
                await queryRunner.connect();
                // Remove existing facet value associations
                await queryRunner.query(
                    `DELETE FROM product_facet_values WHERE product_id = $1`,
                    [id]
                );
                // Add new facet value associations
                for (const fvId of facetValueIds) {
                    await queryRunner.query(
                        `INSERT INTO product_facet_values (product_id, facet_value_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
                        [id, fvId]
                    );
                }
                await queryRunner.release();
            } catch (err) {
                console.error('[updateMyProduct] Failed to update product facet values:', err);
            }
        }

        // Re-fetch and emit event so the search index is updated
        const finalProduct = await this.productService.findOne(ctx, id) as Product;
        this.eventBus.publish(new ProductEvent(ctx, finalProduct, 'updated', { id }));
        return finalProduct;
    }

    /**
     * Update a product variant (Price & Stock) owned by the authenticated vendor
     */
    @Mutation()
    @Allow(Permission.Authenticated)
    async updateMyProductVariant(
        @Ctx() ctx: RequestContext,
        @Args('input') input: { id: string, price?: number, stock?: number }
    ): Promise<any> {
        const vendor = await this.myVendorProfile(ctx);
        if (!vendor) {
            throw new Error('No vendor profile found for this user');
        }

        // Verify ownership via Product
        // We need to find the product associated with this variant
        const variant = await this.productVariantService.findOne(ctx, input.id);
        if (!variant) {
            throw new Error('Product variant not found');
        }

        const productVendor = await this.vendorService.getVendorByProductId(ctx, variant.productId.toString());
        if (!productVendor || productVendor.id !== vendor.id) {
            throw new Error('You do not have permission to update this product variant');
        }

        // Construct update input
        const updateInput: any = {
            id: input.id,
        };
        if (input.price !== undefined) updateInput.price = input.price;
        if (input.stock !== undefined) updateInput.stockOnHand = input.stock;

        return this.productVariantService.update(ctx, [updateInput]).then(result => result[0]);
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
     * Upload a file for the vendor
     */
    @Mutation()
    @Allow(Permission.Authenticated)
    async uploadVendorFile(
        @Ctx() ctx: RequestContext,
        @Args() args: { file: any }
    ): Promise<Asset> {
        const vendor = await this.myVendorProfile(ctx);
        if (!vendor) {
            throw new Error('No vendor profile found for this user');
        }
        return this.assetService.create(ctx, {
            file: args.file,
            tags: ['vendor', `vendorId:${vendor.id}`]
        }) as Promise<Asset>;
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

