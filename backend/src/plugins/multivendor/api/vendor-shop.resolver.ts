import { Allow, Ctx, RequestContext, ProductService, Product, PaginatedList, OrderService, Order, Permission, OrderStateTransitionError, ProductVariantService, LanguageCode, AssetService, Asset, EventBus, ProductEvent, TransactionalConnection, Collection, CollectionService, SearchService, ProductVariant, User, GlobalSettingsService, ChannelService } from '@vendure/core';
import { In } from 'typeorm';
import { Args, Mutation, Query, Resolver, ResolveField, Parent } from '@nestjs/graphql';
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
        private globalSettingsService: GlobalSettingsService,
        private channelService: ChannelService,
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

    @Query()
    @Allow(Permission.Authenticated)
    async myVendorOrder(
        @Ctx() ctx: RequestContext,
        @Args('id') id: string
    ): Promise<any> {
        const vendor = await this.myVendorProfile(ctx);
        if (!vendor) {
            throw new Error('No vendor profile found for this user');
        }

        return this.vendorService.findOrderForVendor(ctx, vendor.id.toString(), id);
    }

    @Query()
    @Allow(Permission.Authenticated)
    async myVendorWalletStats(
        @Ctx() ctx: RequestContext
    ): Promise<any> {
        const vendor = await this.myVendorProfile(ctx);
        if (!vendor) {
            throw new Error('No vendor profile found for this user');
        }

        return this.vendorService.getVendorWalletStats(ctx, vendor.id.toString());
    }

    @Query()
    @Allow(Permission.Authenticated)
    async myVendorDashboardStats(
        @Ctx() ctx: RequestContext
    ): Promise<any> {
        const vendor = await this.myVendorProfile(ctx);
        if (!vendor) {
            throw new Error('No vendor profile found for this user');
        }

        return this.vendorService.getMyVendorDashboardStats(ctx, vendor.id.toString());
    }

    @Mutation()
    @Allow(Permission.Authenticated)
    async fulfillMyVendorOrder(
        @Ctx() ctx: RequestContext,
        @Args('orderId') orderId: string,
        @Args('trackingCode') trackingCode?: string,
        @Args('carrier') carrier?: string
    ): Promise<any> {
        const vendor = await this.myVendorProfile(ctx);
        if (!vendor) {
            throw new Error('No vendor profile found for this user');
        }

        return this.vendorService.fulfillOrderForVendor(ctx, vendor.id.toString(), orderId, trackingCode, carrier);
    }



    /**
     * Create a new product for the authenticated vendor
     */
    @Mutation()
    @Allow(Permission.Authenticated)
    async createMyProduct(
        @Ctx() ctx: RequestContext,
        @Args('input') input: { name: string, description: string, shortDescription?: string, price: number, stock: number, collectionIds?: string[], facetValueIds?: string[], assetIds?: string[], featuredAssetId?: string, onPromotion?: boolean, promotionalPrice?: number }
    ): Promise<Product> {
        let vendor = await this.myVendorProfile(ctx);
        if (!vendor) {
            throw new Error('No vendor profile found for this user');
        }

        // Ensure native Seller & Channel exist for this vendor
        if (!vendor.channelId || !vendor.sellerId) {
            vendor = await this.vendorService.ensureNativeSellerAndChannel(ctx, vendor);
        }

        console.log(`createMyProduct: Input collectionIds:`, input.collectionIds);
        const extractedFacetIds = await this.extractFacetValuesFromCollections(ctx, input.collectionIds || []);
        console.log(`createMyProduct: Extracted facetIds:`, extractedFacetIds);
        const finalFacetValueIds = Array.from(new Set([...(input.facetValueIds || []), ...extractedFacetIds]));
        console.log(`createMyProduct: Final facetValueIds to be saved:`, finalFacetValueIds);
        
        const globalSettings = await this.globalSettingsService.getSettings(ctx);
        const minPrice = (globalSettings.customFields as any)?.minimumMarketplacePrice || 0;
        if (input.price < minPrice) {
            throw new Error(`Le prix du produit doit être au minimum de ${minPrice}`);
        }

        // Get superadmin elevated context to execute core Vendure product creation
        const adminCtx = await this.vendorService.getSuperAdminContext(ctx);

        // 1. Create Product with Translations, Assets, and Vendor customField
        const product = await this.productService.create(adminCtx, {
            translations: [{
                languageCode: ctx.languageCode,
                name: input.name,
                slug: input.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
                description: input.description,
                customFields: {
                    shortDescription: input.shortDescription || '',
                },
            }],
            enabled: (input as any).enabled ?? false,
            assetIds: input.assetIds,
            facetValueIds: finalFacetValueIds,
            featuredAssetId: input.featuredAssetId,
            customFields: {
                vendor: { id: vendor.id },
                shortDescription: input.shortDescription || '',
                approvalStatus: 'pending',
                weight: (input as any).weight,
                width: (input as any).width,
                height: (input as any).height,
            }
        });

        // 2. Create Variants (Multiple or Single)
        const vendorPrefix = (vendor.name || 'VND').substring(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, 'V');
        const variantInputs: any[] = [];

        if ((input as any).variants && (input as any).variants.length > 0) {
            for (let i = 0; i < (input as any).variants.length; i++) {
                const v = (input as any).variants[i];
                const vName = v.name || `${input.name} - Option ${i + 1}`;
                const vSku = v.sku || `${vendorPrefix}-${Date.now()}-${i + 1}`;
                const vInput: any = {
                    productId: product.id,
                    sku: vSku,
                    price: v.price,
                    stockOnHand: v.stock,
                    featuredAssetId: v.featuredAssetId || input.featuredAssetId,
                    translations: [{
                        languageCode: ctx.languageCode,
                        name: vName,
                    }],
                    customFields: {}
                };
                if (v.onPromotion !== undefined) {
                    vInput.customFields.onPromotion = v.onPromotion;
                }
                if (v.promotionalPrice !== undefined) {
                    vInput.customFields.promotionalPrice = v.promotionalPrice;
                }
                variantInputs.push(vInput);
            }
        } else {
            const singleSku = (input as any).sku || `${vendorPrefix}-${Date.now()}`;
            const singleInput: any = {
                productId: product.id,
                sku: singleSku,
                price: input.price,
                stockOnHand: input.stock,
                featuredAssetId: input.featuredAssetId,
                translations: [{
                    languageCode: ctx.languageCode,
                    name: input.name,
                }],
                customFields: {}
            };
            if (input.onPromotion !== undefined) {
                singleInput.customFields.onPromotion = input.onPromotion;
            }
            if (input.promotionalPrice !== undefined) {
                singleInput.customFields.promotionalPrice = input.promotionalPrice;
            }
            variantInputs.push(singleInput);
        }

        const variants = await this.productVariantService.create(adminCtx, variantInputs);

        // 3. Assign Product, Variants and Assets to Vendor's native Channel and default channel
        if (vendor.channelId) {
            try {
                await this.channelService.assignToChannels(adminCtx, Product, product.id, [vendor.channelId]);
                for (const variant of variants) {
                    await this.channelService.assignToChannels(adminCtx, ProductVariant, variant.id, [vendor.channelId]);
                }
                if (input.assetIds && input.assetIds.length > 0) {
                    for (const assetId of input.assetIds) {
                        await this.channelService.assignToChannels(adminCtx, Asset, assetId, [vendor.channelId]).catch(() => null);
                    }
                }
            } catch (chanErr) {
                console.error(`createMyProduct: Channel assignment error:`, chanErr);
            }
        }

        // 4. Update facet values & custom fields
        await this.productService.update(adminCtx, {
            id: product.id,
            facetValueIds: finalFacetValueIds,
            customFields: {
                shortDescription: input.shortDescription || '',
                approvalStatus: 'pending',
                weight: (input as any).weight,
                width: (input as any).width,
                height: (input as any).height,
            }
        });

        // 5. Assign to collections if provided
        if (input.collectionIds && input.collectionIds.length > 0) {
            const variantIds = variants.map(v => String(v.id));
            console.log(`createMyProduct: Assigning variants ${variantIds.join(', ')} to collections:`, input.collectionIds);
            await this.addVariantsToCollections(adminCtx, variantIds, input.collectionIds);
        }

        // 6. Publish ProductEvent for automatic search indexing and cache invalidation
        const finalProduct = await this.productService.findOne(adminCtx, product.id) as Product;
        this.eventBus.publish(new ProductEvent(adminCtx, finalProduct, 'created', { id: product.id }));
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
        let vendor = await this.myVendorProfile(ctx);
        if (!vendor) {
            throw new Error('No vendor profile found for this user');
        }

        // Verify ownership
        const productVendor = await this.vendorService.getVendorByProductId(ctx, id);
        if (!productVendor || productVendor.id.toString() !== vendor.id.toString()) {
            throw new Error('You do not have permission to update this product');
        }

        if (!vendor.channelId || !vendor.sellerId) {
            vendor = await this.vendorService.ensureNativeSellerAndChannel(ctx, vendor);
        }

        // Handle collectionIds, facetValueIds, variants separately
        const { collectionIds, facetValueIds, name, description, shortDescription, variants, ...productInput } = input;

        const extractedFacetIds = await this.extractFacetValuesFromCollections(ctx, collectionIds || []);
        const finalFacetValueIds = Array.from(new Set([...(facetValueIds || []), ...extractedFacetIds]));

        const updateData: any = {
            id,
            ...productInput,
            facetValueIds: finalFacetValueIds,
            enabled: false,
            customFields: {
                approvalStatus: 'pending',
                rejectionReason: '',
                ...(shortDescription !== undefined ? { shortDescription } : {}),
                ...(input.weight !== undefined ? { weight: input.weight } : {}),
                ...(input.width !== undefined ? { width: input.width } : {}),
                ...(input.height !== undefined ? { height: input.height } : {}),
            }
        };

        const adminCtx = await this.vendorService.getSuperAdminContext(ctx);

        if (name !== undefined || description !== undefined || shortDescription !== undefined) {
            const existingProduct = await this.productService.findOne(adminCtx, id, ['translations']);
            const existingTranslation = existingProduct?.translations.find(t => t.languageCode === ctx.languageCode);
            
            updateData.translations = [{
                languageCode: ctx.languageCode,
                ...(existingTranslation ? { id: existingTranslation.id as string } : {}),
                ...(name !== undefined ? { name } : {}),
                ...(name !== undefined ? { slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') } : {}),
                ...(description !== undefined ? { description } : {}),
                customFields: {
                    ...(existingTranslation?.customFields || {}),
                    ...(shortDescription !== undefined ? { shortDescription } : {}),
                }
            }];
        }

        // 1. Update the product (facets, name, description, assets, logistics)
        const updated = await this.productService.update(adminCtx, updateData);

        // 2. Ensure product is assigned to vendor channel
        if (vendor.channelId) {
            await this.channelService.assignToChannels(adminCtx, Product, id, [vendor.channelId]).catch(() => null);
        }

        // 3. Handle Variants (Native Vendure ProductVariantService create/update/delete)
        if (variants && Array.isArray(variants) && variants.length > 0) {
            const currentProduct = await this.productService.findOne(adminCtx, id, ['variants']);
            const existingVariants = currentProduct?.variants || [];
            const existingMap = new Map(existingVariants.map(v => [String(v.id), v]));
            const incomingIds = new Set(variants.filter((v: any) => v.id && !String(v.id).startsWith('new_')).map((v: any) => String(v.id)));

            // 3a. Update existing variants
            const toUpdate: any[] = [];
            for (const v of variants) {
                if (v.id && existingMap.has(String(v.id))) {
                    const updateItem: any = {
                        id: v.id,
                        ...(v.sku !== undefined ? { sku: v.sku } : {}),
                        ...(v.price !== undefined ? { price: v.price } : {}),
                        ...(v.stock !== undefined ? { stockOnHand: v.stock } : {}),
                        translations: [{
                            languageCode: ctx.languageCode,
                            name: v.name || input.name || updated.name,
                        }],
                        customFields: {}
                    };
                    if (v.onPromotion !== undefined) updateItem.customFields.onPromotion = v.onPromotion;
                    if (v.promotionalPrice !== undefined) updateItem.customFields.promotionalPrice = v.promotionalPrice;
                    toUpdate.push(updateItem);
                }
            }
            if (toUpdate.length > 0) {
                await this.productVariantService.update(adminCtx, toUpdate);
            }

            // 3b. Create new variants
            const toCreate: any[] = [];
            const vendorPrefix = (vendor.name || 'VND').substring(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, 'V');
            for (let i = 0; i < variants.length; i++) {
                const v = variants[i];
                if (!v.id || String(v.id).startsWith('new_') || !existingMap.has(String(v.id))) {
                    const vSku = v.sku || `${vendorPrefix}-${Date.now()}-${i + 1}`;
                    const createItem: any = {
                        productId: id,
                        sku: vSku,
                        price: v.price,
                        stockOnHand: v.stock ?? 0,
                        featuredAssetId: v.featuredAssetId || input.featuredAssetId,
                        translations: [{
                            languageCode: ctx.languageCode,
                            name: v.name || `${input.name || updated.name} - Option ${i + 1}`,
                        }],
                        customFields: {}
                    };
                    if (v.onPromotion !== undefined) createItem.customFields.onPromotion = v.onPromotion;
                    if (v.promotionalPrice !== undefined) createItem.customFields.promotionalPrice = v.promotionalPrice;
                    toCreate.push(createItem);
                }
            }
            if (toCreate.length > 0) {
                const newCreatedVariants = await this.productVariantService.create(adminCtx, toCreate);
                if (vendor.channelId) {
                    for (const nv of newCreatedVariants) {
                        await this.channelService.assignToChannels(adminCtx, ProductVariant, nv.id, [vendor.channelId]).catch(() => null);
                    }
                }
            }

            // 3c. Delete variants removed by the vendor (only if at least 1 remains)
            if (incomingIds.size > 0) {
                for (const ev of existingVariants) {
                    if (!incomingIds.has(String(ev.id))) {
                        await this.productVariantService.softDelete(adminCtx, ev.id).catch(() => null);
                    }
                }
            }
        }

        // 4. Handle collection updates
        console.log(`updateMyProduct: collectionIds = ${JSON.stringify(collectionIds)}`);
        if (collectionIds !== undefined) {
            const product = await this.productService.findOne(adminCtx, id, ['variants']);
            if (!product || !product.variants) {
                throw new Error('Product or variants not found');
            }

            const variantIds = product.variants.map(v => String(v.id));
            console.log(`updateMyProduct: Found ${variantIds.length} variants for product ${id}`);

            // Ensure variants are assigned to vendor channel
            if (vendor.channelId) {
                for (const variantId of variantIds) {
                    await this.channelService.assignToChannels(adminCtx, ProductVariant, variantId, [vendor.channelId]).catch(() => null);
                }
            }

            // Remove variant IDs from all collections, then re-add
            await this.removeVariantsFromAllCollections(adminCtx, variantIds);

            if (collectionIds.length > 0) {
                await this.addVariantsToCollections(adminCtx, variantIds, collectionIds);
            }
        }

        // 5. Re-fetch and emit event so the search index is updated via Job Queue
        const finalProduct = await this.productService.findOne(adminCtx, id) as Product;
        this.eventBus.publish(new ProductEvent(adminCtx, finalProduct, 'updated', { id }));
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
        
        if (input.price !== undefined) {
            // Enforce Minimum Marketplace Price
            const globalSettings = await this.globalSettingsService.getSettings(ctx);
            const minPrice = (globalSettings.customFields as any)?.minimumMarketplacePrice || 0;
            if (input.price < minPrice) {
                throw new Error(`Le prix du produit doit être au minimum de ${minPrice}`);
            }
            updateInput.price = input.price;
        }
        
        if (input.stock !== undefined) updateInput.stockOnHand = input.stock;
        if ((input as any).sku !== undefined) updateInput.sku = (input as any).sku;

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

        const adminCtx = await this.vendorService.getSuperAdminContext(ctx);
        return this.productVariantService.update(adminCtx, [updateInput]).then(result => result[0]);
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

        const adminCtx = await this.vendorService.getSuperAdminContext(ctx);
        await this.productService.softDelete(adminCtx, id);
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

        const adminCtx = await this.vendorService.getSuperAdminContext(ctx);
        return this.assetService.create(adminCtx, {
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

        // Verify order belongs to vendor either via channel or customFields
        const order = await this.orderService.findOne(ctx, orderId, ['channels', 'customFields.vendor']);
        if (!order) {
            throw new Error('Order not found');
        }

        const isChannelMatch = vendor.channelId && order.channels?.some(c => c.id === vendor.channelId);
        const isCustomFieldMatch = (order.customFields as any)?.vendor?.id === vendor.id;

        if (!isChannelMatch && !isCustomFieldMatch) {
            throw new Error('You do not have permission to update this order');
        }

        // Transition order state
        return this.orderService.transitionToState(ctx, orderId, status as any);
    }

    /**
     * Client drops reassigning items and continues with the rest
     */
    @Mutation()
    @Allow(Permission.Owner, Permission.Public)
    async continueOrderWithoutReassigning(
        @Ctx() ctx: RequestContext,
        @Args('orderId') orderId: string,
        @Args('lineId') lineId?: string
    ): Promise<boolean> {
        return this.vendorService.continueOrderWithoutReassignedItems(ctx, orderId, lineId);
    }

    /**
     * Client accepts order without items from a specific cancelled vendor
     */
    @Mutation()
    @Allow(Permission.Owner, Permission.Public)
    async acceptOrderWithoutCancelledVendor(
        @Ctx() ctx: RequestContext,
        @Args('orderId') orderId: string,
        @Args('vendorId') vendorId: string
    ): Promise<boolean> {
        return this.vendorService.acceptOrderWithoutCancelledVendor(ctx, orderId, vendorId);
    }

    /**
     * Customer cancels their entire order
     */
    @Mutation()
    @Allow(Permission.Owner, Permission.Public)
    async cancelCustomerOrder(
        @Ctx() ctx: RequestContext,
        @Args('orderId') orderId: string
    ): Promise<boolean> {
        try {
            // Trigger native Vendure order cancellation state machine
            await this.orderService.transitionToState(ctx, orderId, 'Cancelled').catch(err => {
                console.warn('[cancelCustomerOrder] Transition warning:', err?.message || err);
            });
            // Update custom status fields for marketplace consistency
            await this.connection.rawConnection.query(
                `UPDATE "order" SET "customFieldsSellerstatus" = 'refused', "customFieldsAdminstatus" = 'cancelled' WHERE id = $1`,
                [orderId]
            );
            return true;
        } catch (e) {
            console.error('[cancelCustomerOrder] Error cancelling order:', e);
            return false;
        }
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

    // ──────────────────────────────────────────────────────────
    // UNIFIED ACCOUNT SYSTEM
    // ──────────────────────────────────────────────────────────

    /**
     * Public query — checks if an email is already registered and which roles it has.
     * Used BEFORE registration to determine the correct flow (4 cases).
     */
    @Query()
    async checkEmailRoles(
        @Ctx() ctx: RequestContext,
        @Args('email') email: string,
    ): Promise<{ exists: boolean; hasClientRole: boolean; hasVendorRole: boolean; isVerified: boolean }> {
        const normalizedEmail = email.toLowerCase().trim();

        const user = await this.connection.getRepository(ctx, User).findOne({
            where: { identifier: normalizedEmail },
            relations: ['roles'],
        });

        if (!user) {
            return { exists: false, hasClientRole: false, hasVendorRole: false, isVerified: false };
        }

        // Check if user has a Customer profile (= has client role)
        const customer = await this.connection.rawConnection
            .getRepository('customer')
            .findOne({ where: { emailAddress: normalizedEmail } })
            .catch(() => null);

        const hasClientRole = !!customer;

        // Check if user has a Vendor profile
        const vendor = await this.vendorService.findByUserId(ctx, user.id.toString());
        const hasVendorRole = !!vendor;

        return { exists: true, hasClientRole, hasVendorRole, isVerified: user.verified };
    }

    /**
     * Authenticated mutation — adds the Vendor role to an existing Client account.
     * Called when a client logs in and wants to become a vendor.
     * Returns the newly created Vendor profile (pointing to the same user).
     */
    @Mutation()
    @Allow(Permission.Authenticated)
    async addVendorRoleToExistingClient(@Ctx() ctx: RequestContext): Promise<Vendor> {
        if (!ctx.activeUserId) {
            throw new Error('Not authenticated');
        }

        // Check if vendor profile already exists for this user
        const existingVendor = await this.vendorService.findByUserId(ctx, ctx.activeUserId.toString());
        if (existingVendor) {
            // Already a vendor — just return the existing profile
            return existingVendor;
        }

        // Create an empty vendor shell linked to the existing user
        const vendor = await this.vendorService.createVendorShellForExistingUser(ctx, ctx.activeUserId.toString());
        return vendor;
    }

    /**
     * Authenticated mutation — adds the Client role to an existing Vendor account.
     * Creates a Customer entity linked to the same user.
     */
    @Mutation()
    @Allow(Permission.Authenticated)
    async addClientRoleToExistingVendor(@Ctx() ctx: RequestContext): Promise<boolean> {
        if (!ctx.activeUserId) {
            throw new Error('Not authenticated');
        }

        const user = await this.connection.getRepository(ctx, User).findOne({
            where: { id: ctx.activeUserId },
        });

        if (!user) throw new Error('User not found');

        // Check if customer already exists
        const existingCustomer = await this.connection.rawConnection
            .getRepository('customer')
            .findOne({ where: { emailAddress: user.identifier } })
            .catch(() => null);

        if (existingCustomer) {
            // Already a client
            return true;
        }

        // Create a customer linked to the existing user
        await this.connection.rawConnection
            .getRepository('customer')
            .save({
                emailAddress: user.identifier,
                firstName: '',
                lastName: '',
                user: { id: user.id },
            });

        return true;
    }
}

@Resolver('ProductVariant')
export class ProductVariantShopResolver {
    constructor(private connection: TransactionalConnection) {}

    @ResolveField('stockOnHand')
    async stockOnHand(@Ctx() ctx: RequestContext, @Parent() variant: ProductVariant): Promise<number> {
        const variantWithStock = await this.connection.getRepository(ctx, ProductVariant).findOne({
            where: { id: variant.id },
            relations: ['stockLevels'],
        });
        const stockLevels = variantWithStock?.stockLevels || [];
        return stockLevels.reduce((sum, sl) => sum + (sl.stockOnHand || 0), 0);
    }
}

