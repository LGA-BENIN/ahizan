import { Allow, Ctx, RequestContext, ProductService, Product, PaginatedList, OrderService, Order, Permission, OrderStateTransitionError, ProductVariantService, LanguageCode, AssetService, Asset, EventBus, ProductEvent, TransactionalConnection, Collection, CollectionService, SearchService } from '@vendure/core';
import { In } from 'typeorm';
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
        private connection: TransactionalConnection,
        private collectionService: CollectionService,
        private searchService: SearchService,
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
            console.log(`myVendorProduct: Product ${id} not found by ProductService.findOne`);
            return null;
        }

        // Verify ownership
        const productVendor = await this.vendorService.getVendorByProductId(ctx, id);
        console.log(`myVendorProduct: Checking ownership for product ${id}. Vendor from product:`, productVendor?.id, `Type:`, typeof productVendor?.id, `Authenticated vendor:`, vendor.id, `Type:`, typeof vendor.id);
        if (!productVendor || productVendor.id.toString() !== vendor.id.toString()) {
            console.log(`myVendorProduct: Ownership verification failed for product ${id}`);
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
        @Args('input') input: { name: string, description: string, price: number, stock: number, collectionIds?: string[], facetValueIds?: string[], assetIds?: string[], featuredAssetId?: string, onPromotion?: boolean, promotionalPrice?: number }
    ): Promise<Product> {
        const vendor = await this.myVendorProfile(ctx);
        if (!vendor) {
            throw new Error('No vendor profile found for this user');
        }

        console.log(`createMyProduct: Input collectionIds:`, input.collectionIds);
        const extractedFacetIds = await this.extractFacetValuesFromCollections(ctx, input.collectionIds || []);
        console.log(`createMyProduct: Extracted facetIds:`, extractedFacetIds);
        const finalFacetValueIds = Array.from(new Set([...(input.facetValueIds || []), ...extractedFacetIds]));
        console.log(`createMyProduct: Final facetValueIds to be saved:`, finalFacetValueIds);

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
            facetValueIds: finalFacetValueIds,
            featuredAssetId: input.featuredAssetId,
            customFields: {
                vendor: { id: vendor.id }
            }
        });

        // Collections will be assigned after the variant is created.

        // 2. Create Default Variant with Price & Stock
        const variantInput: any = {
            productId: product.id,
            sku: `${vendor.name.substring(0, 3).toUpperCase()}-${Date.now()}`,
            price: input.price,
            stockOnHand: input.stock,
            translations: [{
                languageCode: ctx.languageCode,
                name: input.name,
            }]
        };

        // Add promotional price fields if provided
        if (input.onPromotion !== undefined) {
            variantInput.customFields = { onPromotion: input.onPromotion };
        }
        if (input.promotionalPrice !== undefined) {
            variantInput.customFields = { ...variantInput.customFields, promotionalPrice: input.promotionalPrice };
        }

        const variants = await this.productVariantService.create(ctx, [variantInput]);
        const variant = variants[0];

        // 3. Trigger product update FIRST to force Vendure's internal collection re-evaluation
        await this.productService.update(ctx, {
            id: product.id,
            facetValueIds: finalFacetValueIds,
        });

        // 4. Assign product to collections AFTER update so INSERTs aren't overwritten
        console.log(`createMyProduct: Assigning variant ${variant.id} to collections:`, input.collectionIds);
        if (input.collectionIds && input.collectionIds.length > 0) {
            await this.addVariantsToCollections(ctx, [String(variant.id)], input.collectionIds);

            // Verify the join table state for debugging
            try {
                const rows = await this.connection.rawConnection.query(
                    `SELECT "collectionId", "productVariantId" FROM collection_product_variants_product_variant WHERE "productVariantId" = $1`,
                    [String(variant.id)]
                );
                console.log(`createMyProduct: Join table final state for variant ${variant.id}:`, JSON.stringify(rows));
            } catch (e) {
                console.error('createMyProduct: Failed to verify join table:', e);
            }
        }

        // 5. Re-fetch and emit event so the search index is updated via Job Queue
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

        // Handle collectionIds and facetValueIds separately
        const { collectionIds, facetValueIds, ...productInput } = input;

        const extractedFacetIds = await this.extractFacetValuesFromCollections(ctx, collectionIds || []);
        const finalFacetValueIds = Array.from(new Set([...(facetValueIds || []), ...extractedFacetIds]));

        // 1. Update the product FIRST (facets, name, description, assets)
        // This triggers Vendure's internal collection re-evaluation
        const updated = await this.productService.update(ctx, { 
            id, 
            ...productInput,
            facetValueIds: finalFacetValueIds
        });

        // 2. Get variants AFTER update (Vendure may have re-evaluated collections here)
        console.log(`updateMyProduct: collectionIds = ${JSON.stringify(collectionIds)}`);
        if (collectionIds !== undefined) {
            const product = await this.productService.findOne(ctx, id, ['variants']);
            if (!product || !product.variants) {
                throw new Error('Product or variants not found');
            }

            const variantIds = product.variants.map(v => String(v.id));
            console.log(`updateMyProduct: Found ${variantIds.length} variants for product ${id}`);

            // 3. Remove variant IDs from ALL collection join tables
            await this.removeVariantsFromAllCollections(ctx, variantIds);

            // 4. Add variant IDs to the NEW collection join tables (LAST step, can't be overwritten)
            if (collectionIds.length > 0) {
                await this.addVariantsToCollections(ctx, variantIds, collectionIds);
            }

            // 5. Verify the join table state for debugging
            try {
                const rows = await this.connection.rawConnection.query(
                    `SELECT "collectionId", "productVariantId" FROM collection_product_variants_product_variant WHERE "productVariantId" = ANY($1)`,
                    [variantIds]
                );
                console.log(`updateMyProduct: Join table final state for variants ${JSON.stringify(variantIds)}:`, JSON.stringify(rows));
            } catch (e) {
                console.error('updateMyProduct: Failed to verify join table:', e);
            }
        }

        // 6. Re-fetch and emit event so the search index is updated via Job Queue
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
        @Args('input') input: { id: string, price?: number, stock?: number, onPromotion?: boolean, promotionalPrice?: number }
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

        // Add promotional price custom fields
        if (input.onPromotion !== undefined || input.promotionalPrice !== undefined) {
            updateInput.customFields = {};
            if (input.onPromotion !== undefined) {
                updateInput.customFields.onPromotion = input.onPromotion;
            }
            if (input.promotionalPrice !== undefined) {
                updateInput.customFields.promotionalPrice = input.promotionalPrice;
            }
        }

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

        // Check if file is a GIF - if so, skip Sharp processing to preserve animation
        const isGif = args.file.mimetype === 'image/gif' || args.file.filename?.toLowerCase().endsWith('.gif');

        if (isGif) {
            // For GIFs, we need to save the file directly without processing
            const fs = require('fs');
            const path = require('path');
            const assetsDir = path.join(__dirname, '../../../../static/assets');
            const uniqueName = `${Date.now()}-${args.file.filename}`;
            const filePath = path.join(assetsDir, uniqueName);

            // Ensure directory exists
            if (!fs.existsSync(assetsDir)) {
                fs.mkdirSync(assetsDir, { recursive: true });
            }

            // Write file directly
            const buffer = await args.file.buffer;
            fs.writeFileSync(filePath, buffer);

            // Create asset record manually
            const asset = new Asset();
            asset.name = args.file.filename;
            asset.type = 'IMAGE' as any;
            asset.mimeType = 'image/gif';
            asset.source = `/assets/${uniqueName}`;
            asset.preview = `/assets/${uniqueName}`;
            asset.fileSize = buffer.length;
            asset.width = 0;
            asset.height = 0;
            asset.focalPoint = { x: 0.5, y: 0.5 };

            const savedAsset = await this.connection.getRepository(ctx, Asset).save(asset);
            return savedAsset;
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

    /**
     * Add variant IDs to collection filters + join table so products appear in collections.
     * Uses direct DB updates because collectionService.update() fails with ConfigArgService.
     */
    private async addVariantsToCollections(ctx: RequestContext, variantIds: string[], collectionIds: string[]): Promise<void> {
        if (!collectionIds || collectionIds.length === 0 || !variantIds || variantIds.length === 0) return;

        for (const collectionId of collectionIds) {
            try {
                // 1. Update the filters JSONB column
                const collection = await this.connection.getRepository(ctx, Collection).findOne({
                    where: { id: collectionId as any },
                });
                if (!collection) {
                    console.warn(`addVariantsToCollections: Collection ${collectionId} not found`);
                    continue;
                }

                const existingFilters = (collection as any).filters || [];
                let variantFilter = existingFilters.find((f: any) => f.code === 'variant-id-filter');

                let currentVariantIds: string[] = [];
                if (variantFilter) {
                    const arg = variantFilter.args.find((a: any) => a.name === 'variantIds');
                    if (arg && arg.value) {
                        try { currentVariantIds = JSON.parse(arg.value); } catch { currentVariantIds = []; }
                    }
                }

                const mergedIds = Array.from(new Set([...currentVariantIds, ...variantIds.map(String)]));

                const updatedFilters = existingFilters.filter((f: any) => f.code !== 'variant-id-filter');
                updatedFilters.push({
                    code: 'variant-id-filter',
                    args: [{ name: 'variantIds', value: JSON.stringify(mergedIds) }],
                });

                await this.connection.getRepository(ctx, Collection).update(
                    { id: collectionId as any },
                    { filters: updatedFilters }
                );

                // 2. Update the join table so Vendure queries find the products
                // Table: collection_product_variants_product_variant
                // Columns: collectionId, productVariantId
                for (const variantId of variantIds) {
                    try {
                        // Check if already exists
                        const existing = await this.connection.rawConnection.query(
                            `SELECT 1 FROM collection_product_variants_product_variant WHERE "collectionId" = $1 AND "productVariantId" = $2`,
                            [collectionId, variantId]
                        );
                        if (existing.length === 0) {
                            await this.connection.rawConnection.query(
                                `INSERT INTO collection_product_variants_product_variant ("collectionId", "productVariantId") VALUES ($1, $2)`,
                                [collectionId, variantId]
                            );
                            console.log(`addVariantsToCollections: Inserted join table row collection=${collectionId} variant=${variantId}`);
                        }
                    } catch (joinErr) {
                        console.error(`addVariantsToCollections: Join table error for collection=${collectionId} variant=${variantId}:`, joinErr);
                    }
                }

                console.log(`addVariantsToCollections: Updated collection ${collectionId} with ${mergedIds.length} variant IDs`);
            } catch (err) {
                console.error(`addVariantsToCollections: Error for collection ${collectionId}:`, err);
            }
        }

        // Trigger search reindex so the storefront sees updated collection memberships
        try {
            await this.searchService.reindex(ctx);
            console.log(`addVariantsToCollections: Search reindex triggered`);
        } catch (reindexErr) {
            console.error(`addVariantsToCollections: Search reindex failed:`, reindexErr);
        }
    }

    /**
     * Remove variant IDs from collection filters + join table when reassigning collections.
     */
    private async removeVariantsFromAllCollections(ctx: RequestContext, variantIds: string[]): Promise<void> {
        if (!variantIds || variantIds.length === 0) return;

        // 1. Remove from join table
        for (const variantId of variantIds) {
            try {
                await this.connection.rawConnection.query(
                    `DELETE FROM collection_product_variants_product_variant WHERE "productVariantId" = $1`,
                    [variantId]
                );
            } catch (joinErr) {
                console.error(`removeVariantsFromAllCollections: Join table delete error for variant=${variantId}:`, joinErr);
            }
        }

        // 2. Update filters JSONB column
        const collections = await this.connection.getRepository(ctx, Collection).find();

        for (const coll of collections) {
            const filters = (coll as any).filters || [];
            const variantFilter = filters.find((f: any) => f.code === 'variant-id-filter');
            if (!variantFilter) continue;

            const arg = variantFilter.args.find((a: any) => a.name === 'variantIds');
            if (!arg || !arg.value) continue;

            let currentIds: string[];
            try { currentIds = JSON.parse(arg.value); } catch { continue; }

            const strVariantIds = variantIds.map(String);
            const filteredIds = currentIds.filter((id: string) => !strVariantIds.includes(id));

            if (filteredIds.length === currentIds.length) continue; // Nothing removed

            const updatedFilters = filters.filter((f: any) => f.code !== 'variant-id-filter');
            if (filteredIds.length > 0) {
                updatedFilters.push({
                    code: 'variant-id-filter',
                    args: [{ name: 'variantIds', value: JSON.stringify(filteredIds) }],
                });
            }

            try {
                await this.connection.getRepository(ctx, Collection).update(
                    { id: coll.id as any },
                    { filters: updatedFilters }
                );
                console.log(`removeVariantsFromAllCollections: Updated collection ${coll.id}`);
            } catch (err) {
                console.error(`removeVariantsFromAllCollections: Error for collection ${coll.id}:`, err);
            }
        }
    }

    /**
     * Extracts required facet value IDs from standard collection filters.
     * This prevents breaking admin-defined collections with explicit variant IDs.
     */
    private async extractFacetValuesFromCollections(ctx: RequestContext, collectionIds: string[]): Promise<string[]> {
        if (!collectionIds || collectionIds.length === 0) return [];
        
        const facetValueIds = new Set<string>();
        const processedCollectionIds = new Set<string>();
        let currentIds = [...collectionIds];

        // Walk up the collection tree to collect all facets from parents
        while (currentIds.length > 0) {
            console.log(`extractFacetValues: Processing IDs:`, currentIds);
            const collections = await this.connection.getRepository(ctx, Collection).find({
                where: { id: In(currentIds) },
                relations: ['parent']
            });
            console.log(`extractFacetValues: Found ${collections.length} collections`);

            currentIds = [];
            for (const coll of collections) {
                if (processedCollectionIds.has(coll.id.toString())) continue;
                processedCollectionIds.add(coll.id.toString());
                
                // Extract facet-value-filter arguments
                const filters = coll.filters || [];
                console.log(`extractFacetValues: Collection ${coll.id} has ${filters.length} filters`);
                for (const filter of filters) {
                    if (filter.code === 'facet-value-filter') {
                        const arg = filter.args.find(a => a.name === 'facetValueIds');
                        if (arg && arg.value) {
                            try {
                                const ids = JSON.parse(arg.value);
                                console.log(`extractFacetValues: Extracted IDs from filter:`, ids);
                                if (Array.isArray(ids)) {
                                    ids.forEach(id => facetValueIds.add(id));
                                }
                            } catch (e) { 
                                console.error(`extractFacetValues: Error parsing facetValueIds for collection ${coll.id}`, e);
                            }
                        }
                    }
                }

                // Add parent to next iteration if it's not the root
                if (coll.parent && coll.parent.id && coll.parent.name !== '__root_collection__') {
                    const parentId = coll.parent.id.toString();
                    if (!processedCollectionIds.has(parentId)) {
                        currentIds.push(parentId);
                    }
                }
            }
        }
        
        return Array.from(facetValueIds);
    }
}

