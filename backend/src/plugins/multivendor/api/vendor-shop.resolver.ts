import { Allow, Ctx, RequestContext, ProductService, Product, PaginatedList, OrderService, Order, Permission, OrderStateTransitionError, ProductVariantService, LanguageCode, AssetService, Asset, EventBus, ProductEvent, TransactionalConnection, Collection, CollectionService, SearchService, ProductVariant, User, GlobalSettingsService, ChannelService, ProductOptionGroupService, ProductOptionService, ProductOption, ProductPriceApplicator } from '@vendure/core';
import { In, Not } from 'typeorm';
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
        private productOptionGroupService: ProductOptionGroupService,
        private productOptionService: ProductOptionService,
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
        
        // 1. Pre-validation checks (Price and SKU uniqueness)
        if ((input as any).variants && (input as any).variants.length > 0) {
            for (const v of (input as any).variants) {
                await this.validateMinimumPrice(ctx, v.price);
                await this.validateSkuUniqueness(ctx, v.sku);
            }
        } else {
            await this.validateMinimumPrice(ctx, input.price);
            await this.validateSkuUniqueness(ctx, (input as any).sku);
        }

        // Get superadmin elevated context to execute core Vendure product creation
        const adminCtx = await this.vendorService.getSuperAdminContext(ctx);

        return this.connection.withTransaction(adminCtx, async (transactionalCtx: RequestContext) => {
            // 2. Create Product with Translations, Assets, and Vendor customField
            const product = await this.productService.create(transactionalCtx, {
                translations: [{
                    languageCode: ctx.languageCode,
                    name: input.name,
                    slug: input.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
                    description: input.description,
                    customFields: {
                        shortDescription: input.shortDescription || '',
                    },
                }],
                enabled: false,
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

            // 3. Create Option Groups and Options if multiple variants
            const optionGroups: any[] = [];
            const optionMap = new Map<string, any>(); // key: "groupIndex:optionName", value: optionEntity

            if ((input as any).variants && (input as any).variants.length > 1) {
                const variantNames = (input as any).variants.map((v: any, idx: number) => v.name || `${input.name} - Option ${idx + 1}`);
                const splitNames = variantNames.map((name: string) => name.split(' - ').map((p: string) => p.trim()));
                
                const firstLen = splitNames[0].length;
                const allSameLen = splitNames.every((parts: string[]) => parts.length === firstLen);
                const numGroups = allSameLen ? firstLen : 1;

                for (let g = 0; g < numGroups; g++) {
                    const uniqueValues = Array.from(new Set(
                        allSameLen 
                            ? splitNames.map((parts: string[]) => parts[g])
                            : variantNames
                    )) as string[];

                    const groupName = this.getOptionGroupName(uniqueValues, g);
                    const groupCode = `${groupName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}-${g}`;

                    const optionGroup = await this.productOptionGroupService.create(transactionalCtx, {
                        code: groupCode,
                        translations: [{
                            languageCode: ctx.languageCode,
                            name: groupName,
                        }]
                    });

                    await this.productService.addOptionGroupToProduct(transactionalCtx, product.id, optionGroup.id);
                    optionGroups.push(optionGroup);

                    for (const val of uniqueValues) {
                        const optCode = val.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                        const option = await this.productOptionService.create(transactionalCtx, optionGroup.id, {
                            code: `${optCode}-${Date.now()}`,
                            translations: [{
                                languageCode: ctx.languageCode,
                                name: val,
                            }]
                        });
                        optionMap.set(`${g}:${val}`, option);
                    }
                }
            }

            // 4. Create Variants (Multiple or Single)
            const vendorPrefix = (vendor.name || 'VND').substring(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, 'V');
            const variantInputs: any[] = [];

            if ((input as any).variants && (input as any).variants.length > 0) {
                const variantNames = (input as any).variants.map((v: any, idx: number) => v.name || `${input.name} - Option ${idx + 1}`);
                const splitNames = variantNames.map((name: string) => name.split(' - ').map((p: string) => p.trim()));
                const firstLen = splitNames[0].length;
                const allSameLen = splitNames.every((parts: string[]) => parts.length === firstLen);
                const numGroups = allSameLen ? firstLen : 1;

                for (let i = 0; i < (input as any).variants.length; i++) {
                    const v = (input as any).variants[i];
                    const vName = variantNames[i];
                    const vSku = v.sku || `${vendorPrefix}-${Date.now()}-${i + 1}`;
                    
                    const optionIds: any[] = [];
                    if (optionGroups.length > 0) {
                        const parts = allSameLen ? splitNames[i] : [vName];
                        for (let g = 0; g < numGroups; g++) {
                            const val = parts[g];
                            const option = optionMap.get(`${g}:${val}`);
                            if (option) {
                                optionIds.push(option.id);
                            }
                        }
                    }

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
                        optionIds,
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

            const variants = await this.productVariantService.create(transactionalCtx, variantInputs);

            // 5. Assign Product, Variants and Assets to Vendor's native Channel and default channel
            if (vendor.channelId) {
                try {
                    await this.channelService.assignToChannels(transactionalCtx, Product, product.id, [vendor.channelId]);
                    for (const variant of variants) {
                        await this.channelService.assignToChannels(transactionalCtx, ProductVariant, variant.id, [vendor.channelId]);
                    }

                    const sellerUpdates = variants.map((v, idx) => {
                        const originalInput = variantInputs[idx];
                        return {
                            id: String(v.id),
                            price: originalInput.price,
                            customFields: {
                                onPromotion: originalInput.customFields?.onPromotion,
                                promotionalPrice: originalInput.customFields?.promotionalPrice,
                            }
                        };
                    });
                    await this.updatePricesInSellerChannel(transactionalCtx, vendor.channelId.toString(), sellerUpdates);

                    if (input.assetIds && input.assetIds.length > 0) {
                        for (const assetId of input.assetIds) {
                            await this.channelService.assignToChannels(transactionalCtx, Asset, assetId, [vendor.channelId]).catch(() => null);
                        }
                    }
                } catch (chanErr) {
                    console.error(`createMyProduct: Channel assignment error:`, chanErr);
                }
            }

            // 6. Update facet values & custom fields
            await this.productService.update(transactionalCtx, {
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

            // 7. Assign to collections if provided
            if (input.collectionIds && input.collectionIds.length > 0) {
                const variantIds = variants.map(v => String(v.id));
                console.log(`createMyProduct: Assigning variants ${variantIds.join(', ')} to collections:`, input.collectionIds);
                await this.addVariantsToCollections(transactionalCtx, variantIds, input.collectionIds);
            }

            // 8. Publish ProductEvent for automatic search indexing and cache invalidation
            const finalProduct = await this.productService.findOne(transactionalCtx, product.id) as Product;
            this.eventBus.publish(new ProductEvent(transactionalCtx, finalProduct, 'created', { id: product.id }));
            return finalProduct;
        });
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

        // 1. Pre-validation checks (Price and SKU uniqueness)
        if (variants && Array.isArray(variants)) {
            for (const v of variants) {
                if (v.price !== undefined) {
                    await this.validateMinimumPrice(ctx, v.price);
                }
                if (v.sku !== undefined) {
                    await this.validateSkuUniqueness(ctx, v.sku, v.id && !String(v.id).startsWith('new_') ? v.id : undefined);
                }
            }
        }

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

        return this.connection.withTransaction(adminCtx, async (transactionalCtx: RequestContext) => {
            // 2. Fetch current product and existing variants/optionGroups
            const currentProduct = await this.productService.findOne(transactionalCtx, id, ['variants', 'optionGroups']);
            if (!currentProduct) {
                throw new Error('Product not found');
            }
            const existingVariants = currentProduct.variants || [];
            const existingMap = new Map(existingVariants.map(v => [String(v.id), v]));

            // 3. Update the product core properties
            const updated = await this.productService.update(transactionalCtx, updateData);

            // Ensure product is assigned to vendor channel
            if (vendor.channelId) {
                await this.channelService.assignToChannels(transactionalCtx, Product, id, [vendor.channelId]).catch(() => null);
            }

            // 4. Handle Option Groups and Options if needed
            const incomingVariantsCount = variants ? variants.length : 0;
            const productGroups = [...(currentProduct.optionGroups || [])];

            if (variants && Array.isArray(variants) && variants.length > 0) {
                if (incomingVariantsCount > 1 && productGroups.length === 0) {
                    // Create Option Groups based on incoming variants names
                    const variantNames = variants.map((v: any, idx: number) => v.name || `${input.name || updated.name} - Option ${idx + 1}`);
                    const splitNames = variantNames.map((name: string) => name.split(' - ').map((p: string) => p.trim()));
                    
                    const firstLen = splitNames[0].length;
                    const allSameLen = splitNames.every((parts: string[]) => parts.length === firstLen);
                    const numGroups = allSameLen ? firstLen : 1;

                    for (let g = 0; g < numGroups; g++) {
                        const uniqueValues = Array.from(new Set(
                            allSameLen 
                                ? splitNames.map((parts: string[]) => parts[g])
                                : variantNames
                        )) as string[];

                        const groupName = this.getOptionGroupName(uniqueValues, g);
                        const groupCode = `${groupName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}-${g}`;

                        const newGroup = await this.productOptionGroupService.create(transactionalCtx, {
                            code: groupCode,
                            translations: [{
                                languageCode: ctx.languageCode,
                                name: groupName,
                            }]
                        });

                        await this.productService.addOptionGroupToProduct(transactionalCtx, id, newGroup.id);
                        productGroups.push(newGroup);
                    }

                    // If there was a single existing variant, we must assign it options from the new groups.
                    if (existingVariants.length === 1) {
                        const existingV = existingVariants[0];
                        const defaultOptionIds: any[] = [];

                        for (let g = 0; g < productGroups.length; g++) {
                            const group = productGroups[g];
                            const firstOptionVal = allSameLen ? splitNames[0][g] : variantNames[0];
                            const optCode = firstOptionVal.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                            
                            const option = await this.productOptionService.create(transactionalCtx, group.id, {
                                code: `${optCode}-${Date.now()}`,
                                translations: [{
                                    languageCode: ctx.languageCode,
                                    name: firstOptionVal,
                                }]
                            });
                            defaultOptionIds.push(option.id);
                        }

                        await this.productVariantService.update(transactionalCtx, [{
                            id: existingV.id,
                            optionIds: defaultOptionIds
                        }]);
                        
                        const updatedExistingV = await this.connection.getRepository(transactionalCtx, ProductVariant).findOne({
                            where: { id: existingV.id },
                            relations: ['options']
                        });
                        if (updatedExistingV) {
                            existingMap.set(String(existingV.id), updatedExistingV);
                        }
                    }
                }

                // 5. Create / Update / Delete Variants
                const incomingIds = new Set(variants.filter((v: any) => v.id && !String(v.id).startsWith('new_')).map((v: any) => String(v.id)));

                // 5a. Update existing variants
                const toUpdate: any[] = [];
                for (const v of variants) {
                    if (v.id && existingMap.has(String(v.id))) {
                        const existingV = existingMap.get(String(v.id)) as ProductVariant;
                        
                        let optionIds: any[] = [];
                        if (v.name && productGroups.length > 0) {
                            const parts = v.name.split(' - ').map((p: string) => p.trim());
                            for (let idx = 0; idx < productGroups.length; idx++) {
                                const val = parts[idx] || v.name;
                                const groupOptions = await this.connection.getRepository(transactionalCtx, ProductOption).find({
                                    where: { group: { id: productGroups[idx].id } },
                                    relations: ['translations']
                                });
                                
                                let option = groupOptions.find((o: any) => 
                                    o.translations?.some((t: any) => t.name.toLowerCase().trim() === val.toLowerCase().trim()) ||
                                    o.code.toLowerCase().trim() === val.toLowerCase().replace(/[^a-z0-9]+/g, '-').trim()
                                );
                                
                                if (!option) {
                                    const optCode = val.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                                    option = await this.productOptionService.create(transactionalCtx, productGroups[idx].id, {
                                        code: `${optCode}-${Date.now()}`,
                                        translations: [{
                                            languageCode: ctx.languageCode,
                                            name: val,
                                        }]
                                    });
                                }
                                optionIds.push(option.id);
                            }
                        } else {
                            optionIds = existingV.options?.map(o => o.id) || [];
                        }

                        const updateItem: any = {
                            id: v.id,
                            ...(v.sku !== undefined ? { sku: v.sku } : {}),
                            ...(v.price !== undefined ? { price: v.price } : {}),
                            ...(v.stock !== undefined ? { stockOnHand: v.stock } : {}),
                            translations: [{
                                languageCode: ctx.languageCode,
                                name: v.name || input.name || updated.name,
                            }],
                            optionIds,
                            customFields: {}
                        };
                        if (v.onPromotion !== undefined) updateItem.customFields.onPromotion = v.onPromotion;
                        if (v.promotionalPrice !== undefined) updateItem.customFields.promotionalPrice = v.promotionalPrice;
                        toUpdate.push(updateItem);
                    }
                }
                const sellerUpdates: Array<{ id: string; price?: number; customFields?: { onPromotion?: boolean; promotionalPrice?: number } }> = [];

                if (toUpdate.length > 0) {
                    await this.productVariantService.update(transactionalCtx, toUpdate);
                    for (const u of toUpdate) {
                        if (u.price !== undefined) {
                            sellerUpdates.push({
                                id: u.id,
                                price: u.price,
                                customFields: {
                                    onPromotion: u.customFields?.onPromotion,
                                    promotionalPrice: u.customFields?.promotionalPrice,
                                }
                            });
                        }
                    }
                }

                // 5b. Create new variants
                const toCreate: any[] = [];
                const vendorPrefix = (vendor.name || 'VND').substring(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, 'V');
                for (let i = 0; i < variants.length; i++) {
                    const v = variants[i];
                    if (!v.id || String(v.id).startsWith('new_') || !existingMap.has(String(v.id))) {
                        const vSku = v.sku || `${vendorPrefix}-${Date.now()}-${i + 1}`;
                        const optionIds: any[] = [];
                        
                        if (productGroups.length > 0) {
                            const vName = v.name || `${input.name || updated.name} - Option ${i + 1}`;
                            const parts = vName.split(' - ').map((p: string) => p.trim());
                            
                            for (let idx = 0; idx < productGroups.length; idx++) {
                                const val = parts[idx] || vName;
                                const groupOptions = await this.connection.getRepository(transactionalCtx, ProductOption).find({
                                    where: { group: { id: productGroups[idx].id } },
                                    relations: ['translations']
                                });
                                
                                let option = groupOptions.find((o: any) => 
                                    o.translations?.some((t: any) => t.name.toLowerCase().trim() === val.toLowerCase().trim()) ||
                                    o.code.toLowerCase().trim() === val.toLowerCase().replace(/[^a-z0-9]+/g, '-').trim()
                                );
                                
                                if (!option) {
                                    const optCode = val.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                                    option = await this.productOptionService.create(transactionalCtx, productGroups[idx].id, {
                                        code: `${optCode}-${Date.now()}`,
                                        translations: [{
                                            languageCode: ctx.languageCode,
                                            name: val,
                                        }]
                                    });
                                }
                                optionIds.push(option.id);
                            }
                        }

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
                            optionIds,
                            customFields: {}
                        };
                        if (v.onPromotion !== undefined) createItem.customFields.onPromotion = v.onPromotion;
                        if (v.promotionalPrice !== undefined) createItem.customFields.promotionalPrice = v.promotionalPrice;
                        toCreate.push(createItem);
                    }
                }
                if (toCreate.length > 0) {
                    const newCreatedVariants = await this.productVariantService.create(transactionalCtx, toCreate);
                    if (vendor.channelId) {
                        for (const nv of newCreatedVariants) {
                            await this.channelService.assignToChannels(transactionalCtx, ProductVariant, nv.id, [vendor.channelId]).catch(() => null);
                        }
                    }

                    for (let idx = 0; idx < newCreatedVariants.length; idx++) {
                        const nv = newCreatedVariants[idx];
                        const origInput = toCreate[idx];
                        sellerUpdates.push({
                            id: String(nv.id),
                            price: origInput.price,
                            customFields: {
                                onPromotion: origInput.customFields?.onPromotion,
                                promotionalPrice: origInput.customFields?.promotionalPrice,
                            }
                        });
                    }
                }

                if (vendor.channelId && sellerUpdates.length > 0) {
                    await this.updatePricesInSellerChannel(transactionalCtx, vendor.channelId.toString(), sellerUpdates);
                }

                // 5c. Delete variants removed by the vendor (only if at least 1 remains)
                if (incomingIds.size > 0) {
                    for (const ev of existingVariants) {
                        if (!incomingIds.has(String(ev.id))) {
                            await this.productVariantService.softDelete(transactionalCtx, ev.id).catch(() => null);
                        }
                    }
                }
            }

            // 6. Handle collection updates
            if (collectionIds !== undefined) {
                const refreshedProduct = await this.productService.findOne(transactionalCtx, id, ['variants']);
                if (refreshedProduct && refreshedProduct.variants) {
                    const variantIds = refreshedProduct.variants.map(v => String(v.id));
                    
                    if (vendor.channelId) {
                        for (const variantId of variantIds) {
                            await this.channelService.assignToChannels(transactionalCtx, ProductVariant, variantId, [vendor.channelId]).catch(() => null);
                        }
                    }

                    await this.removeVariantsFromAllCollections(transactionalCtx, variantIds);
                    if (collectionIds.length > 0) {
                        await this.addVariantsToCollections(transactionalCtx, variantIds, collectionIds);
                    }
                }
            }

            // 7. Re-fetch and emit event so the search index is updated via Job Queue
            const finalProduct = await this.productService.findOne(transactionalCtx, id) as Product;
            this.eventBus.publish(new ProductEvent(transactionalCtx, finalProduct, 'updated', { id }));
            return finalProduct;
        });
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
        if (!productVendor || productVendor.id.toString() !== vendor.id.toString()) {
            throw new Error('You do not have permission to update this product variant');
        }

        // 1. Pre-validation checks (Price and SKU uniqueness)
        if (input.price !== undefined) {
            await this.validateMinimumPrice(ctx, input.price);
        }
        if ((input as any).sku !== undefined) {
            await this.validateSkuUniqueness(ctx, (input as any).sku, input.id);
        }

        const adminCtx = await this.vendorService.getSuperAdminContext(ctx);

        return this.connection.withTransaction(adminCtx, async (transactionalCtx: RequestContext) => {
            const transactionalVariant = await this.productVariantService.findOne(transactionalCtx, input.id);
            if (!transactionalVariant) {
                throw new Error('Product variant not found');
            }

            // Construct update input
            const updateInput: any = {
                id: input.id,
            };
            
            if (input.price !== undefined) {
                updateInput.price = input.price;
            }
            if (input.stock !== undefined) {
                updateInput.stockOnHand = input.stock;
            }
            if ((input as any).sku !== undefined) {
                updateInput.sku = (input as any).sku;
            }

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

            const result = await this.productVariantService.update(transactionalCtx, [updateInput]).then(res => res[0]);
            if (vendor.channelId) {
                await this.updatePricesInSellerChannel(transactionalCtx, vendor.channelId.toString(), [{
                    id: input.id,
                    price: input.price,
                    customFields: {
                        onPromotion: input.onPromotion,
                        promotionalPrice: input.promotionalPrice,
                    }
                }]);
            }
            return result;
        });
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
     * Enforce SKU uniqueness before database write
     */
    private async validateSkuUniqueness(ctx: RequestContext, sku?: string, excludeVariantId?: any): Promise<void> {
        if (!sku) return;
        const qb = this.connection.getRepository(ctx, ProductVariant)
            .createQueryBuilder('pv')
            .where('pv.sku = :sku', { sku });
        if (excludeVariantId) {
            qb.andWhere('pv.id != :id', { id: excludeVariantId });
        }
        const existing = await qb.getOne();
        if (existing) {
            throw new Error(`Le SKU "${sku}" est déjà utilisé par un autre produit.`);
        }
    }

    /**
     * Enforce minimum marketplace price on a price value
     */
    private async validateMinimumPrice(ctx: RequestContext, price?: number): Promise<void> {
        const globalSettings = await this.globalSettingsService.getSettings(ctx);
        const minPrice = (globalSettings.customFields as any)?.minimumMarketplacePrice || 0;
        if (price !== undefined && price !== null && price < minPrice) {
            throw new Error(`Le prix du produit doit être au minimum de ${minPrice}`);
        }
    }

    private async updatePricesInSellerChannel(
        transactionalCtx: RequestContext,
        channelId: string,
        updates: Array<{ id: string; price?: number; customFields?: { onPromotion?: boolean; promotionalPrice?: number } }>
    ) {
        if (!channelId || updates.length === 0) return;
        const sellerChannel = await this.channelService.findOne(transactionalCtx, channelId);
        if (!sellerChannel) return;

        const sellerCtx = new RequestContext({
            apiType: transactionalCtx.apiType,
            isAuthorized: transactionalCtx.isAuthorized,
            authorizedAsOwnerOnly: transactionalCtx.authorizedAsOwnerOnly,
            channel: sellerChannel,
            languageCode: transactionalCtx.languageCode,
            session: transactionalCtx.session ? {
                ...transactionalCtx.session,
                activeChannelId: sellerChannel.id,
            } as any : undefined,
        });

        const updateInputs = updates.map(u => ({
            id: u.id,
            ...(u.price !== undefined ? { price: u.price } : {}),
            ...(u.customFields ? { customFields: u.customFields } : {}),
        }));

        await this.productVariantService.update(sellerCtx, updateInputs);
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

    private getOptionGroupName(partValues: string[], index: number): string {
        const sizeKeywords = ['S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'XS', 'Taille', 'Size', 'S/M', 'L/XL'];
        const isSize = partValues.some(val => {
            const upper = val.toUpperCase().trim();
            return sizeKeywords.includes(upper) || /^\d+(\s*(cm|m|kg|g|l|ml))?$/i.test(upper);
        });
        if (isSize) {
            return 'Taille';
        }
        const colorKeywords = ['rouge', 'bleu', 'vert', 'jaune', 'noir', 'blanc', 'rose', 'orange', 'violet', 'gris', 'marron', 'color', 'couleur', 'red', 'blue', 'green', 'black', 'white', 'yellow', 'pink'];
        const isColor = partValues.some(val => {
            const lower = val.toLowerCase().trim();
            return colorKeywords.some(kw => lower.includes(kw));
        });
        if (isColor) {
            return 'Couleur';
        }
        return index === 0 ? 'Couleur' : 'Taille';
    }
}

@Resolver('ProductVariant')
export class ProductVariantShopResolver {
    constructor(
        private connection: TransactionalConnection,
        private productPriceApplicator: ProductPriceApplicator,
    ) {}

    @ResolveField('stockOnHand')
    async stockOnHand(@Ctx() ctx: RequestContext, @Parent() variant: ProductVariant): Promise<number> {
        const variantWithStock = await this.connection.getRepository(ctx, ProductVariant).findOne({
            where: { id: variant.id },
            relations: ['stockLevels'],
        });
        const stockLevels = variantWithStock?.stockLevels || [];
        return stockLevels.reduce((sum, sl) => sum + (sl.stockOnHand || 0), 0);
    }

    @ResolveField('price')
    async price(@Ctx() ctx: RequestContext, @Parent() variant: ProductVariant): Promise<number> {
        return this.getCustomVariantPrice(ctx, variant, false);
    }

    @ResolveField('priceWithTax')
    async priceWithTax(@Ctx() ctx: RequestContext, @Parent() variant: ProductVariant): Promise<number> {
        return this.getCustomVariantPrice(ctx, variant, true);
    }

    private async getCustomVariantPrice(ctx: RequestContext, variant: ProductVariant, withTax: boolean): Promise<number> {
        // 1. Try to get price from product_variant_price for ctx.channelId
        let priceRecord = await this.connection.rawConnection.query(
            `SELECT price FROM product_variant_price WHERE "variantId" = $1 AND "channelId" = $2 LIMIT 1`,
            [variant.id, ctx.channelId]
        );
        let price = priceRecord?.[0]?.price;

        // 2. If not found or 0, fallback to ANY positive price record for this variant
        if (price === undefined || price === null || Number(price) === 0) {
            priceRecord = await this.connection.rawConnection.query(
                `SELECT price FROM product_variant_price WHERE "variantId" = $1 AND price > 0 ORDER BY id DESC LIMIT 1`,
                [variant.id]
            );
            price = priceRecord?.[0]?.price;
        }

        return Number(price || 0);
    }
}

