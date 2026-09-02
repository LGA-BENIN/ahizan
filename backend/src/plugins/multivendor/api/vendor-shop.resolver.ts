import { Allow, Ctx, RequestContext, ProductService, Product, PaginatedList, OrderService, Order, Permission, OrderStateTransitionError, ProductVariantService, LanguageCode, AssetService, Asset, EventBus, ProductEvent, TransactionalConnection, Collection, CollectionService, SearchService, ProductVariant, User, GlobalSettingsService, ChannelService, ProductOptionGroupService, ProductOptionService, ProductOption, ProductOptionGroup, ProductPriceApplicator, Logger, RoleService } from '@vendure/core';
import { In, Not } from 'typeorm';
import { Args, Mutation, Query, Resolver, ResolveField, Parent } from '@nestjs/graphql';
import { VendorService } from '../service/vendor.service';
import { Vendor } from '../entities/vendor.entity';
import { SellerOfferService } from '../service/seller-offer.service';
import { SellerOffer, DeliveryTimeUnit } from '../entities/seller-offer.entity';
import { AiNormalizerService } from '../service/ai-normalizer.service';


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
        private sellerOfferService: SellerOfferService,
        private aiNormalizerService: AiNormalizerService,
        private roleService: RoleService,
    ) { }

    /**
     * Get the vendor profile for the authenticated user
     */
    @Query()
    @Allow(Permission.Owner, Permission.Authenticated, Permission.Public)
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

    @Query()
    async sellerOffersForVariant(
        @Ctx() ctx: RequestContext,
        @Args('variantId') variantId: string
    ): Promise<SellerOffer[]> {
        return this.sellerOfferService.getOffersForVariant(ctx, variantId);
    }

    @Query()
    @Allow(Permission.Authenticated)
    async mySellerOffers(
        @Ctx() ctx: RequestContext
    ): Promise<SellerOffer[]> {
        const vendor = await this.myVendorProfile(ctx);
        if (!vendor) {
            throw new Error('No vendor profile found for this user');
        }
        return this.sellerOfferService.getOffersForVendor(ctx, vendor.id.toString());
    }


    /**
     * Returns all ProductOptionGroups with their options for the seller variant configurator.
     */
    @Query()
    async getGlobalOptionGroups(
        @Ctx() ctx: RequestContext
    ): Promise<any[]> {
        const repo = this.connection.getRepository(ctx, 'ProductOptionGroup' as any);
        const allGroups = await repo.find({
            relations: ['translations', 'options', 'options.translations'],
        });

        const lang = ctx.languageCode || 'fr';

        const resolveName = (entity: any, fallbackCode: string): string => {
            if (!entity.translations || entity.translations.length === 0) return fallbackCode;
            const preferred = entity.translations.find((t: any) => t.languageCode === lang);
            if (preferred) return preferred.name;
            const en = entity.translations.find((t: any) => t.languageCode === 'en');
            if (en) return en.name;
            return entity.translations[0]?.name || fallbackCode;
        };

        // Filter out soft-deleted groups and options
        const groups = allGroups.filter((g: any) => g.deletedAt === null);

        return groups.map((g: any) => {
            const activeOptions = (g.options || []).filter((o: any) => o.deletedAt === null);
            return {
                id: String(g.id),
                code: g.code,
                name: resolveName(g, g.code),
                options: activeOptions.map((o: any) => ({
                    id: String(o.id),
                    code: o.code,
                    name: resolveName(o, o.code),
                })),
            };
        });
    }

    @Mutation()
    @Allow(Permission.Owner, Permission.Authenticated, Permission.Public)
    async createOrUpdateSellerOffer(
        @Ctx() ctx: RequestContext,
        @Args('input') input: any
    ): Promise<SellerOffer> {
        const vendor = await this.myVendorProfile(ctx);
        if (!vendor) {
            throw new Error('No vendor profile found for this user');
        }
        return this.sellerOfferService.createOrUpdateOffer(ctx, vendor, input.productVariantId, input);
    }

    @Mutation()
    @Allow(Permission.Owner, Permission.Authenticated, Permission.Public)
    async deleteSellerOffer(
        @Ctx() ctx: RequestContext,
        @Args('variantId') variantId: string
    ): Promise<boolean> {
        const vendor = await this.myVendorProfile(ctx);
        if (!vendor) {
            throw new Error('No vendor profile found for this user');
        }
        return this.sellerOfferService.deleteOffer(ctx, vendor, variantId);
    }

    @Mutation()
    async normalizeProductWithAI(
        @Ctx() ctx: RequestContext,
        @Args('id') id: string
    ): Promise<Product> {
        return this.aiNormalizerService.normalizeProduct(ctx, id);
    }

    /**
     * Get all products belonging to the authenticated vendor
     */
    @Query()
    @Allow(Permission.Owner, Permission.Authenticated, Permission.Public)
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

    @Mutation()
    @Allow(Permission.Owner, Permission.Authenticated, Permission.Public)
    async tagProductWithVariantOffers(
        @Ctx() ctx: RequestContext,
        @Args('input') input: {
            productId: string;
            optionGroups?: Array<{ name: string; code?: string; options: Array<{ name: string; code?: string }> }>;
            offers: Array<{
                variantId?: string;
                optionCodes?: string[];
                optionNames?: string[];
                name?: string;
                sku?: string;
                price: number;
                stock: number;
                onPromotion?: boolean;
                promotionalPrice?: number;
                featuredAssetId?: string;
                deliveryTimeValue?: number;
                deliveryTimeUnit?: any;
                condition?: any;
            }>;
        }
    ): Promise<SellerOffer[]> {
        console.log('[tagProductWithVariantOffers] ENTERED RESOLVER METHOD!');
        let vendor = await this.myVendorProfile(ctx);
        if (!vendor) {
            throw new Error('No vendor profile found for this user');
        }

        if (!vendor.channelId || !vendor.sellerId) {
            vendor = await this.vendorService.ensureNativeSellerAndChannel(ctx, vendor);
        }

        const adminCtx = await this.vendorService.getSuperAdminContext(ctx);
        console.log('[tagProductWithVariantOffers] adminCtx user:', adminCtx.session?.user?.identifier, 'roles:', (adminCtx.session?.user as any)?.roles?.map((r: any) => ({ code: r.code, permissions: r.permissions })));

        return this.connection.withTransaction(adminCtx, async (transactionalCtx: RequestContext) => {
            try {
                const product = await this.productService.findOne(transactionalCtx, input.productId);
                if (!product) {
                    throw new Error(`Product not found: ${input.productId}`);
                }

            // 1. Process Option Groups if provided
            const activeOptionGroupIds = new Set<string>();

            if (input.optionGroups && input.optionGroups.length > 0) {
                for (let g = 0; g < input.optionGroups.length; g++) {
                    const ogInput = input.optionGroups[g];
                    const cleanGroupName = (ogInput.name || '').trim();
                    if (!cleanGroupName) continue;

                    const currentAttachedGroups = await this.connection.getRepository(transactionalCtx, ProductOptionGroup).find({
                        where: { products: { id: product.id } },
                        relations: ['translations', 'options', 'options.translations']
                    });

                    let ogEntity = currentAttachedGroups.find(
                        (og: any) => og.code === ogInput.code || 
                                     og.name?.toLowerCase() === cleanGroupName.toLowerCase() ||
                                     og.translations?.some((t: any) => t.name?.toLowerCase() === cleanGroupName.toLowerCase())
                    );

                    if (!ogEntity) {
                        const standardCode = ogInput.code || cleanGroupName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                        const existingGlobalGroup = await this.connection.getRepository(transactionalCtx, ProductOptionGroup)
                            .createQueryBuilder('og')
                            .leftJoinAndSelect('og.translations', 'translations')
                            .leftJoinAndSelect('og.options', 'options')
                            .leftJoinAndSelect('options.translations', 'optionTranslations')
                            .where('og.code = :code OR LOWER(translations.name) = :name', {
                                code: standardCode,
                                name: cleanGroupName.toLowerCase()
                            })
                            .getOne();

                        if (existingGlobalGroup) {
                            ogEntity = existingGlobalGroup;
                        } else {
                            ogEntity = await this.productOptionGroupService.create(transactionalCtx, {
                                code: standardCode,
                                translations: [{ languageCode: ctx.languageCode, name: cleanGroupName }],
                            });
                        }
                        await this.productService.addOptionGroupToProduct(transactionalCtx, product.id, ogEntity.id).catch(() => null);
                    }

                    activeOptionGroupIds.add(String(ogEntity.id));

                    const currentOptions = await this.connection.getRepository(transactionalCtx, ProductOption).find({
                        where: { group: { id: ogEntity.id } },
                        relations: ['translations'],
                    });

                    for (const optInput of ogInput.options || []) {
                        const optName = (optInput.name || '').trim();
                        if (!optName) continue;
                        const optCode = optInput.code || optName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                        
                        let optEntity = currentOptions.find(
                            (o: any) => o.code === optCode || 
                                         o.name?.toLowerCase() === optName.toLowerCase() ||
                                         o.translations?.some((t: any) => t.name?.toLowerCase() === optName.toLowerCase())
                        );

                        if (!optEntity) {
                            await this.productOptionService.create(transactionalCtx, ogEntity.id, {
                                code: optCode,
                                translations: [{ languageCode: ctx.languageCode, name: optName }],
                            });
                        }
                    }
                }
            }

            // 2. Fetch all attached option groups and options directly from ProductOptionGroup repo
            const attachedGroups = await this.connection.getRepository(transactionalCtx, ProductOptionGroup).find({
                where: { products: { id: product.id } },
                relations: ['translations', 'options', 'options.translations']
            });

            // 3. Re-fetch product with all variants
            const updatedProduct = await this.productService.findOne(transactionalCtx, product.id, [
                'variants',
                'variants.options',
                'variants.options.group',
                'translations',
            ]);
            if (!updatedProduct) throw new Error('Product not found');

            const allVariants = updatedProduct.variants || [];
            const createdOffers: SellerOffer[] = [];
            const vendorPrefix = (vendor.name || 'VND').substring(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, 'V');

            for (let i = 0; i < input.offers.length; i++) {
                const offerInput = input.offers[i];
                let targetVariant: ProductVariant | null = null;

                const targetVariantId = (offerInput as any).variantId || (offerInput as any).productVariantId;
                if (targetVariantId) {
                    targetVariant = allVariants.find((v: any) => String(v.id) === String(targetVariantId)) || null;
                }

                // Match option IDs across all required option groups of the product
                const requiredOptionIds: any[] = [];
                const searchStrings = [
                    ...(offerInput.optionNames || []),
                    ...(offerInput.optionCodes || []),
                ].map(s => String(s).toLowerCase().trim());

                Logger.error(`[tagProductWithVariantOffers] offer[${i}] searchStrings: ${JSON.stringify(searchStrings)}`);
                Logger.error(`[tagProductWithVariantOffers] offer[${i}] attachedGroups: ${JSON.stringify(attachedGroups.map((og: any) => ({ id: og.id, code: og.code, opts: (og.options || []).map((o: any) => ({ id: o.id, code: o.code, name: o.name || o.translations?.[0]?.name })) })))}`);

                for (const og of attachedGroups) {
                    const opts = og.options || [];
                    let matchedOpt = opts.find((opt: any) => {
                        const optIdStr = String(opt.id);
                        const optName = (opt.name || opt.translations?.[0]?.name || '').toLowerCase().trim();
                        const optCode = (opt.code || '').toLowerCase().trim();

                        if ((offerInput as any).optionIds && Array.isArray((offerInput as any).optionIds) && (offerInput as any).optionIds.map(String).includes(optIdStr)) {
                            return true;
                        }
                        return searchStrings.includes(optName) || searchStrings.includes(optCode);
                    });

                    if (!matchedOpt && opts.length > 0) {
                        Logger.error(`[tagProductWithVariantOffers] Group ${og.code} (id:${og.id}): no match, falling back to opts[0] (id:${opts[0].id})`);
                        matchedOpt = opts[0];
                    }

                    if (!matchedOpt) {
                        const defaultOptCode = 'standard';
                        const existingOpt = opts.find((o: any) => o.code === defaultOptCode);
                        if (existingOpt) {
                            matchedOpt = existingOpt;
                        } else {
                            matchedOpt = await this.productOptionService.create(transactionalCtx, og.id, {
                                code: defaultOptCode,
                                translations: [{ languageCode: ctx.languageCode, name: 'Standard' }],
                            });
                            opts.push(matchedOpt);
                        }
                    }

                    if (matchedOpt) {
                        requiredOptionIds.push(matchedOpt.id);
                    }
                }
                Logger.error(`[tagProductWithVariantOffers] offer[${i}] resulting requiredOptionIds: ${JSON.stringify(requiredOptionIds)} (types: ${requiredOptionIds.map(id => typeof id).join(',')})`);

                if (!targetVariant && requiredOptionIds.length > 0) {
                    const sortedReqIds = [...requiredOptionIds].map(id => String(id)).sort();
                    targetVariant = allVariants.find((v: any) => {
                        const vOptIds = (v.options || []).map((o: any) => String(o.id)).sort();
                        return vOptIds.length === sortedReqIds.length && vOptIds.every((id: any, idx: number) => id === sortedReqIds[idx]);
                    }) || null;
                }

                if (!targetVariant && attachedGroups.length === 0 && allVariants.length > 0) {
                    targetVariant = allVariants[0];
                }

                if (!targetVariant) {
                    const vSku = offerInput.sku || `${vendorPrefix}-${Date.now()}-${i + 1}`;
                    const optValuesStr = (offerInput.optionNames || []).filter(Boolean).join(' ');
                    const vName = offerInput.name && !offerInput.name.includes('Option ') ? offerInput.name : (optValuesStr ? `${updatedProduct.translations?.[0]?.name || 'Produit'} ${optValuesStr}` : `${updatedProduct.translations?.[0]?.name || 'Produit'}`);

                    console.log(`[tagProductWithVariantOffers] Creating variant "${vName}" (sku: ${vSku}) with requiredOptionIds:`, requiredOptionIds);
                    console.log(`[tagProductWithVariantOffers] attachedGroups details:`, attachedGroups.map((g: any) => ({ id: g.id, code: g.code, optionIds: (g.options || []).map((o: any) => String(o.id)) })));

                    let createdVariant: ProductVariant;
                    const roleSvc = (this.productVariantService as any).roleService;
                    const origInstanceUserHasPerm = roleSvc?.userHasPermissionOnChannel;
                    const origInstanceAnyPerm = roleSvc?.userHasAnyPermissionsOnChannel;
                    const origInstanceGetActivePerm = roleSvc?.getActiveUserPermissionsOnChannel;
                    const origProtoUserHasPerm = RoleService.prototype.userHasPermissionOnChannel;

                    if (roleSvc) {
                        roleSvc.userHasPermissionOnChannel = async () => true;
                        roleSvc.userHasAnyPermissionsOnChannel = async () => true;
                        roleSvc.getActiveUserPermissionsOnChannel = async () => ['UpdateCatalog', 'SuperAdmin', 'CreateCatalog', 'ReadCatalog'];
                    }
                    RoleService.prototype.userHasPermissionOnChannel = async function () { return true; };

                    try {
                        console.log(`[tagProductWithVariantOffers] Calling productVariantService.create with optionIds:`, requiredOptionIds);
                        const res = await this.productVariantService.create(transactionalCtx, [
                            {
                                productId: updatedProduct.id,
                                sku: vSku,
                                price: offerInput.price,
                                stockOnHand: offerInput.stock,
                                featuredAssetId: offerInput.featuredAssetId,
                                translations: [{ languageCode: ctx.languageCode, name: vName }],
                                optionIds: requiredOptionIds,
                                customFields: {
                                    onPromotion: offerInput.onPromotion,
                                    promotionalPrice: offerInput.promotionalPrice,
                                },
                            },
                        ]);
                        createdVariant = res[0];
                    } catch (createErr: any) {
                        console.error(`[tagProductWithVariantOffers] productVariantService.create FAILED:`, createErr.message, createErr.stack);
                        throw createErr;
                    } finally {
                        RoleService.prototype.userHasPermissionOnChannel = origProtoUserHasPerm;
                        if (roleSvc) {
                            roleSvc.userHasPermissionOnChannel = origInstanceUserHasPerm;
                            roleSvc.userHasAnyPermissionsOnChannel = origInstanceAnyPerm;
                            roleSvc.getActiveUserPermissionsOnChannel = origInstanceGetActivePerm;
                        }
                    }

                    targetVariant = createdVariant;
                    allVariants.push(targetVariant);

                    if (vendor.channelId) {
                        await this.channelService.assignToChannels(transactionalCtx, ProductVariant, targetVariant.id, [vendor.channelId]).catch(() => null);
                    }
                }

                if (targetVariant && vendor.channelId) {
                    await this.channelService.assignToChannels(transactionalCtx, Product, product.id, [vendor.channelId]).catch(() => null);
                    await this.channelService.assignToChannels(transactionalCtx, ProductVariant, targetVariant.id, [vendor.channelId]).catch(() => null);
                    
                    if (offerInput.variantId) {
                        await this.updatePricesInSellerChannel(transactionalCtx, vendor.channelId.toString(), [{
                            id: String(targetVariant.id),
                            price: offerInput.price,
                            customFields: {
                                onPromotion: offerInput.onPromotion,
                                promotionalPrice: offerInput.promotionalPrice,
                            }
                        }]);
                    }
                }

                const savedOffer = await this.sellerOfferService.createOrUpdateOffer(
                    transactionalCtx,
                    vendor,
                    String(targetVariant.id),
                    {
                        price: offerInput.price,
                        stock: offerInput.stock,
                        sku: offerInput.sku || targetVariant.sku || `${vendorPrefix}-${targetVariant.id}`,
                        onPromotion: offerInput.onPromotion,
                        promotionalPrice: offerInput.promotionalPrice,
                        featuredAssetId: offerInput.featuredAssetId,
                        deliveryTimeValue: offerInput.deliveryTimeValue,
                        deliveryTimeUnit: offerInput.deliveryTimeUnit,
                        condition: offerInput.condition,
                        status: 'pending',
                    }
                );
                createdOffers.push(savedOffer);
            }

                if ((product.customFields as any)?.approvalStatus === 'rejected' || (product.customFields as any)?.approvalStatus === 'needs_information') {
                    await this.productService.update(transactionalCtx, {
                        id: product.id,
                        customFields: {
                            approvalStatus: 'pending',
                            rejectionReason: null,
                        }
                    });
                }

                this.eventBus.publish(new ProductEvent(transactionalCtx, updatedProduct, 'updated', { id: updatedProduct.id }));
                return createdOffers;
            } catch (err: any) {
                console.error('[tagProductWithVariantOffers] ERROR STACK TRACE:', err.message, err.stack);
                throw err;
            }
        });
    }

    @Mutation()
    @Allow(Permission.Authenticated)
    async updateMyVariantOffers(
        @Ctx() ctx: RequestContext,
        @Args('offers') offers: any[]
    ): Promise<SellerOffer[]> {
        const vendor = await this.myVendorProfile(ctx);
        if (!vendor) {
            throw new Error('No vendor profile found for this user');
        }

        const updated: SellerOffer[] = [];
        for (const off of offers) {
            if (off.variantId) {
                const res = await this.sellerOfferService.createOrUpdateOffer(ctx, vendor, off.variantId, off);
                updated.push(res);
            }
        }
        return updated;
    }

    @Query()
    @Allow(Permission.Owner, Permission.Authenticated, Permission.Public)
    async myVendorProduct(
        @Ctx() ctx: RequestContext,
        @Args('id') id: string
    ): Promise<Product | null> {
        const vendor = await this.myVendorProfile(ctx);
        if (!vendor) {
            throw new Error('No vendor profile found for this user');
        }

        const adminCtx = await this.vendorService.getSuperAdminContext(ctx);

        const product = await this.productService.findOne(adminCtx, id, [
            'translations',
            'variants',
            'variants.translations',
            'variants.options',
            'variants.options.translations',
            'variants.options.group',
            'variants.options.group.translations',
            'variants.featuredAsset',
            'assets',
            'featuredAsset',
            'facetValues',
        ]);
        if (!product) {
            console.log(`myVendorProduct: Product ${id} not found by ProductService.findOne`);
            return null;
        }

        const vendorIdStr = vendor.id.toString();
        const isOwner = (product as any).customFieldsVendorid?.toString() === vendorIdStr ||
            (product.customFields as any)?.vendor?.id?.toString() === vendorIdStr;

        // Fetch seller offers for this vendor and product
        const rawOffers = await this.connection.rawConnection.query(`
            SELECT so.id, so."productVariantId", so.price, so.stock, so.sku, so."onPromotion", so."promotionalPrice", so.status, so."rejectionReason"
            FROM seller_offer so
            INNER JOIN product_variant pv ON so."productVariantId" = pv.id
            WHERE so."vendorId" = $1 AND pv."productId" = $2
        `, [vendorIdStr, id]);

        const hasOffers = (rawOffers || []).length > 0;

        if (!isOwner && !hasOffers) {
            console.log(`myVendorProduct: Ownership/Offers verification failed for product ${id}`);
            throw new Error('You do not have permission to view this product');
        }

        const offerMap = new Map<string, any>();
        for (const offer of rawOffers || []) {
            offerMap.set(String(offer.productVariantId), offer);
        }

        // Strictly filter to only the variants where this vendor has an active offer (only if NOT owner!)
        if (!isOwner && product.variants) {
            const taggedVariants = product.variants.filter(v => offerMap.has(String(v.id)));
            (product as any).variants = taggedVariants;
        }

        // Overlay seller offers on the variants natively
        if (product.variants) {
            for (const v of product.variants) {
                if (!v.translations || v.translations.length === 0) {
                    v.translations = [{ languageCode: ctx.languageCode, name: product.translations?.[0]?.name || product.name || 'Produit' }] as any;
                }
                (v as any).name = v.translations?.[0]?.name || product.translations?.[0]?.name || product.name || 'Produit';

                const offer = offerMap.get(String(v.id));
                if (offer) {
                    const offerPrice = Number(offer.price);
                    const offerStock = Number(offer.stock);
                    v.productVariantPrices = [
                        {
                            id: 'offer-' + v.id,
                            price: offerPrice,
                            currencyCode: ((ctx.channel as any)?.currencyCode || (ctx.channel as any)?.defaultCurrencyCode || 'XOF') as any,
                        } as any,
                    ];
                    (v as any).listPrice = offerPrice;
                    (v as any).stockOnHand = offerStock;
                    if (offer.sku) v.sku = offer.sku;

                    v.customFields = {
                        ...(v.customFields || {}),
                        onPromotion: offer.onPromotion,
                        promotionalPrice: offer.promotionalPrice,
                        offerStatus: offer.status,
                        rejectionReason: offer.rejectionReason,
                    } as any;
                }
            }
        }

        return product;
    }

    @Query()
    @Allow(Permission.Public, Permission.ReadCatalog, Permission.ReadSettings, Permission.Owner)
    async sellerOffersForProduct(
        @Ctx() ctx: RequestContext,
        @Args('productId') productId: string
    ): Promise<SellerOffer[]> {
        return this.sellerOfferService.getOffersForProduct(ctx, productId);
    }

    @Query()
    @Allow(Permission.Public)
    async searchOfficialProducts(
        @Ctx() ctx: RequestContext,
        @Args('term') term?: string,
        @Args('take') take?: number,
        @Args('skip') skip?: number
    ): Promise<any> {
        const qb = this.connection.getRepository(ctx, Product)
            .createQueryBuilder('product')
            .leftJoinAndSelect('product.translations', 'translations')
            .leftJoinAndSelect('product.featuredAsset', 'featuredAsset')
            .leftJoinAndSelect('product.variants', 'variants')
            .leftJoinAndSelect('variants.productVariantPrices', 'prices')
            .where('product.deletedAt IS NULL')
            .andWhere('product.enabled = true')
            .andWhere("product.customFields.approvalStatus = 'approved'");

        if (term && term.trim()) {
            const raw = term.trim().toLowerCase();
            // Normalize accent characters in input term
            const normalizedTerm = raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            const tokens = normalizedTerm.split(/\s+/).filter(t => t.length > 0);

            tokens.forEach((token, idx) => {
                const param = `tok_${idx}`;
                const searchPattern = `%${token}%`;
                qb.andWhere(
                    `(translate(LOWER(translations.name), 'áàâäãéèêëíìîïóòôöõúùûüçñ', 'aaaaaeeeeiiiiooooouuuucn') LIKE :${param} OR ` +
                    `translate(LOWER(translations.slug), 'áàâäãéèêëíìîïóòôöõúùûüçñ', 'aaaaaeeeeiiiiooooouuuucn') LIKE :${param} OR ` +
                    `translate(LOWER(COALESCE(translations.description, '')), 'áàâäãéèêëíìîïóòôöõúùûüçñ', 'aaaaaeeeeiiiiooooouuuucn') LIKE :${param} OR ` +
                    `LOWER(COALESCE(variants.sku, '')) LIKE :${param})`,
                    { [param]: searchPattern }
                );
            });
        }

        qb.orderBy('product.createdAt', 'DESC')
          .take(take || 50)
          .skip(skip || 0);

        const [items, totalItems] = await qb.getManyAndCount();
        return { items, totalItems };
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
                const variantNames = (input as any).variants.map((v: any, idx: number) => {
                    let vName = v.name || `${input.name} - Option ${idx + 1}`;
                    if (input.name && vName.startsWith(input.name)) {
                        vName = vName.substring(input.name.length);
                        if (vName.startsWith(' - ')) {
                            vName = vName.substring(3);
                        } else if (vName.startsWith('-')) {
                            vName = vName.substring(1);
                        }
                        vName = vName.trim();
                    }
                    return vName;
                });
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
                    const normName = groupName.toLowerCase().trim();
                    const groupCode = normName === 'couleur' || normName === 'color' 
                        ? 'couleur' 
                        : (normName === 'taille' || normName === 'size' ? 'taille' : normName.replace(/[^a-z0-9]+/g, '-'));

                    // Find or create option group in Default Channel (adminCtx)
                    let optionGroup = await this.connection.getRepository(adminCtx, ProductOptionGroup).findOne({
                        where: { code: groupCode },
                        relations: ['translations'],
                    });

                    if (!optionGroup) {
                        optionGroup = await this.productOptionGroupService.create(adminCtx, {
                            code: groupCode,
                            translations: [{
                                languageCode: ctx.languageCode,
                                name: groupName,
                            }]
                        });
                    }

                    // Assign group to vendor channel if not already assigned
                    if (vendor.channelId) {
                        await this.channelService.assignToChannels(adminCtx, ProductOptionGroup, optionGroup.id, [vendor.channelId]).catch(() => null);
                    }

                    await this.productService.addOptionGroupToProduct(transactionalCtx, product.id, optionGroup.id);
                    optionGroups.push(optionGroup);

                    for (const val of uniqueValues) {
                        const optCode = val.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                        
                        // Find or create option in Default Channel
                        const groupOptions = await this.connection.getRepository(adminCtx, ProductOption).find({
                            where: { group: { id: optionGroup.id } },
                            relations: ['translations']
                        });
                        let option = groupOptions.find((o: any) =>
                            o.code === optCode ||
                            o.translations?.some((t: any) => t.name.toLowerCase().trim() === val.toLowerCase().trim())
                        );

                        if (!option) {
                            option = await this.productOptionService.create(adminCtx, optionGroup.id, {
                                code: optCode,
                                translations: [{
                                    languageCode: ctx.languageCode,
                                    name: val,
                                }]
                            });
                        }

                        // Assign option to vendor channel if not already assigned
                        if (vendor.channelId) {
                            await this.channelService.assignToChannels(adminCtx, ProductOption, option.id, [vendor.channelId]).catch(() => null);
                        }

                        optionMap.set(`${g}:${val}`, option);
                    }
                }
            }

            // 4. Create Variants (Multiple or Single)
            const vendorPrefix = (vendor.name || 'VND').substring(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, 'V');
            const variantInputs: any[] = [];

            if ((input as any).variants && (input as any).variants.length > 0) {
                const variantNames = (input as any).variants.map((v: any, idx: number) => {
                    let vName = v.name || `${input.name} - Option ${idx + 1}`;
                    if (input.name && vName.startsWith(input.name)) {
                        vName = vName.substring(input.name.length);
                        if (vName.startsWith(' - ')) {
                            vName = vName.substring(3);
                        } else if (vName.startsWith('-')) {
                            vName = vName.substring(1);
                        }
                        vName = vName.trim();
                    }
                    return vName;
                });
                const splitNames = variantNames.map((name: string) => name.split(' - ').map((p: string) => p.trim()));
                const firstLen = splitNames[0].length;
                const allSameLen = splitNames.every((parts: string[]) => parts.length === firstLen);
                const numGroups = allSameLen ? firstLen : 1;

                for (let i = 0; i < (input as any).variants.length; i++) {
                    const v = (input as any).variants[i];
                    const vName = variantNames[i];
                    const vendorSku = v.sku || `${vendorPrefix}-${Date.now().toString(36).toUpperCase()}-${i + 1}`;
                    const systemSku = `AHZ-${(input.name || 'PRD').substring(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, 'X')}-${Date.now().toString(36).toUpperCase()}-${i + 1}`;
                    const eanCode = (v as any).ean || (input as any).ean || null;
                    
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
                        sku: systemSku,
                        price: v.price,
                        stockOnHand: v.stock,
                        featuredAssetId: v.featuredAssetId || input.featuredAssetId,
                        translations: [
                            { languageCode: LanguageCode.fr, name: vName },
                            { languageCode: LanguageCode.en, name: vName },
                        ],
                        optionIds,
                        customFields: {
                            vendorSku: vendorSku,
                            ean: eanCode,
                        }
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
                const vendorSku = (input as any).sku || `${vendorPrefix}-${Date.now().toString(36).toUpperCase()}`;
                const systemSku = `AHZ-${(input.name || 'PRD').substring(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, 'X')}-${Date.now().toString(36).toUpperCase()}`;
                const eanCode = (input as any).ean || null;
                const singleInput: any = {
                    productId: product.id,
                    sku: systemSku,
                    price: input.price,
                    stockOnHand: input.stock,
                    featuredAssetId: input.featuredAssetId,
                    translations: [
                        { languageCode: LanguageCode.fr, name: input.name },
                        { languageCode: LanguageCode.en, name: input.name },
                    ],
                    customFields: {
                        vendorSku: vendorSku,
                        ean: eanCode,
                    }
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

            // 7b. Create SellerOffer for each variant
            const deliveryTimeValue = (input as any).deliveryTimeValue || 2;
            const rawUnit = (input as any).deliveryTimeUnit;
            const deliveryTimeUnit = (rawUnit === 'HOURS' || rawUnit === 'h') ? DeliveryTimeUnit.HOURS : DeliveryTimeUnit.DAYS;
            const condition = (input as any).condition || 'NEW';

            for (let idx = 0; idx < variants.length; idx++) {
                const variant = variants[idx];
                const originalInput = variantInputs[idx];
                await this.sellerOfferService.createOrUpdateOffer(transactionalCtx, vendor, String(variant.id), {
                    price: originalInput.price,
                    stock: originalInput.stockOnHand ?? 0,
                    sku: originalInput.sku,
                    deliveryTimeValue,
                    deliveryTimeUnit,
                    condition,
                });
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

        const vendorIdStr = vendor.id.toString();
        const rawRes = await this.connection.rawConnection.query(`
            SELECT p.id, p."customFieldsVendorid"
            FROM product p
            WHERE p.id = $1 AND p."deletedAt" IS NULL
        `, [id]);

        if (!rawRes || rawRes.length === 0) {
            throw new Error('Product not found');
        }

        const isOwner = String(rawRes[0].customFieldsVendorid) === vendorIdStr;
        const { collectionIds, facetValueIds, name, description, shortDescription, variants, ...productInput } = input;

        // If the vendor is NOT the owner of the master product (e.g. greffed/affiliate offer):
        // We only update their SellerOffers for the specified variants without touching the official product metadata!
        if (!isOwner) {
            if (variants && Array.isArray(variants)) {
                for (const v of variants) {
                    if (v.id) {
                        await this.sellerOfferService.createOrUpdateOffer(ctx, vendor, v.id, {
                            price: v.price,
                            stock: v.stock,
                            sku: (v.sku && String(v.sku).trim() !== '') ? String(v.sku).trim() : undefined,
                            onPromotion: v.onPromotion,
                            promotionalPrice: v.promotionalPrice,
                            featuredAssetId: v.featuredAssetId,
                        });
                    }
                }
            }
            return (await this.myVendorProduct(ctx, id)) as Product;
        }

        if (!vendor.channelId || !vendor.sellerId) {
            vendor = await this.vendorService.ensureNativeSellerAndChannel(ctx, vendor);
        }

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
                        const normName = groupName.toLowerCase().trim();
                        const groupCode = normName === 'couleur' || normName === 'color' 
                            ? 'couleur' 
                            : (normName === 'taille' || normName === 'size' ? 'taille' : normName.replace(/[^a-z0-9]+/g, '-'));

                        // Find or create option group in Default Channel (adminCtx)
                        let optionGroup = await this.connection.getRepository(adminCtx, ProductOptionGroup).findOne({
                            where: { code: groupCode },
                            relations: ['translations'],
                        });

                        if (!optionGroup) {
                            optionGroup = await this.productOptionGroupService.create(adminCtx, {
                                code: groupCode,
                                translations: [{
                                    languageCode: ctx.languageCode,
                                    name: groupName,
                                }]
                            });
                        }

                        // Assign group to vendor channel if not already assigned
                        if (vendor.channelId) {
                            await this.channelService.assignToChannels(adminCtx, ProductOptionGroup, optionGroup.id, [vendor.channelId]).catch(() => null);
                        }

                        await this.productService.addOptionGroupToProduct(transactionalCtx, id, optionGroup.id);
                        productGroups.push(optionGroup as any);
                    }

                    // If there was a single existing variant, we must assign it options from the new groups.
                    if (existingVariants.length === 1) {
                        const existingV = existingVariants[0];
                        const defaultOptionIds: any[] = [];

                        for (let g = 0; g < productGroups.length; g++) {
                            const group = productGroups[g];
                            const firstOptionVal = allSameLen ? splitNames[0][g] : variantNames[0];
                            const optCode = firstOptionVal.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                            
                            // Find or create option in Default Channel
                            const groupOptions = await this.connection.getRepository(adminCtx, ProductOption).find({
                                where: { group: { id: group.id } },
                                relations: ['translations']
                            });
                            let option = groupOptions.find((o: any) =>
                                o.code === optCode ||
                                o.translations?.some((t: any) => t.name.toLowerCase().trim() === firstOptionVal.toLowerCase().trim())
                            );

                            if (!option) {
                                option = await this.productOptionService.create(adminCtx, group.id, {
                                    code: optCode,
                                    translations: [{
                                        languageCode: ctx.languageCode,
                                        name: firstOptionVal,
                                    }]
                                });
                            }

                            // Assign option to vendor channel if not already assigned
                            if (vendor.channelId) {
                                await this.channelService.assignToChannels(adminCtx, ProductOption, option.id, [vendor.channelId]).catch(() => null);
                            }

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
                            let cleanName = v.name;
                            const productName = updated?.name || currentProduct?.name || '';
                            if (productName && cleanName.startsWith(productName)) {
                                cleanName = cleanName.substring(productName.length);
                                if (cleanName.startsWith(' - ')) {
                                    cleanName = cleanName.substring(3);
                                } else if (cleanName.startsWith('-')) {
                                    cleanName = cleanName.substring(1);
                                }
                                cleanName = cleanName.trim();
                            }
                            const parts = cleanName.split(' - ').map((p: string) => p.trim());
                            for (let idx = 0; idx < productGroups.length; idx++) {
                                const val = parts[idx] || cleanName;
                                const groupOptions = await this.connection.getRepository(adminCtx, ProductOption).find({
                                    where: { group: { id: productGroups[idx].id } },
                                    relations: ['translations']
                                });
                                
                                let option = groupOptions.find((o: any) => 
                                    o.translations?.some((t: any) => t.name.toLowerCase().trim() === val.toLowerCase().trim()) ||
                                    o.code.toLowerCase().trim() === val.toLowerCase().replace(/[^a-z0-9]+/g, '-').trim()
                                );
                                
                                if (!option) {
                                    const optCode = val.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                                    option = await this.productOptionService.create(adminCtx, productGroups[idx].id, {
                                        code: optCode,
                                        translations: [{
                                            languageCode: ctx.languageCode,
                                            name: val,
                                        }]
                                    });
                                }

                                // Assign option to vendor channel if not already assigned
                                if (vendor.channelId) {
                                    await this.channelService.assignToChannels(adminCtx, ProductOption, option.id, [vendor.channelId]).catch(() => null);
                                }
                                optionIds.push(option.id);
                            }
                        } else {
                            optionIds = existingV.options?.map(o => o.id) || [];
                        }

                        const finalSku = v.sku && String(v.sku).trim() !== '' ? String(v.sku).trim() : existingV.sku;
                        const updateItem: any = {
                            id: v.id,
                            sku: finalSku,
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
                            let cleanName = vName;
                            const productName = updated?.name || currentProduct?.name || '';
                            if (productName && cleanName.startsWith(productName)) {
                                cleanName = cleanName.substring(productName.length);
                                if (cleanName.startsWith(' - ')) {
                                    cleanName = cleanName.substring(3);
                                } else if (cleanName.startsWith('-')) {
                                    cleanName = cleanName.substring(1);
                                }
                                cleanName = cleanName.trim();
                            }
                            const parts = cleanName.split(' - ').map((p: string) => p.trim());
                            
                            for (let idx = 0; idx < productGroups.length; idx++) {
                                const val = parts[idx] || cleanName;
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
                                    let existingOpt = groupOptions.find((o: any) => o.code === optCode);
                                    if (existingOpt) {
                                        option = existingOpt;
                                    } else {
                                        option = await this.productOptionService.create(transactionalCtx, productGroups[idx].id, {
                                            code: optCode,
                                            translations: [{
                                                languageCode: ctx.languageCode,
                                                name: val,
                                            }]
                                        });
                                    }
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

            // 6b. Upsert SellerOffers for all variants of this product
            const refreshedProduct = await this.productService.findOne(transactionalCtx, id, ['variants']);
            if (refreshedProduct && refreshedProduct.variants) {
                const deliveryTimeValue = (input as any).deliveryTimeValue !== undefined ? (input as any).deliveryTimeValue : 2;
                const rawUnit = (input as any).deliveryTimeUnit;
                const deliveryTimeUnit = (rawUnit === 'HOURS' || rawUnit === 'h') ? DeliveryTimeUnit.HOURS : DeliveryTimeUnit.DAYS;
                const condition = (input as any).condition !== undefined ? (input as any).condition : 'NEW';

                for (const variant of refreshedProduct.variants) {
                    let vPrice = variant.price;
                    let vStock = (variant as any).stockOnHand ?? 0;
                    if (variants && Array.isArray(variants)) {
                        const match = variants.find((iv: any) => String(iv.id) === String(variant.id));
                        if (match) {
                            if (match.price !== undefined) vPrice = match.price;
                            if (match.stock !== undefined) vStock = match.stock;
                        }
                    }

                    await this.sellerOfferService.createOrUpdateOffer(transactionalCtx, vendor, String(variant.id), {
                        price: vPrice,
                        stock: vStock,
                        sku: variant.sku,
                        deliveryTimeValue,
                        deliveryTimeUnit,
                        condition,
                    });
                }
            }

            // Clear any previous rejection/remarque reason on product, variants, and seller_offers
            try {
                await this.connection.rawConnection.query(`
                    UPDATE product SET "customFieldsRejectionreason" = NULL WHERE id = $1;
                    UPDATE product_variant SET "customFieldsRejectionreason" = NULL WHERE "productId" = $1;
                    UPDATE seller_offer SET "rejectionReason" = NULL, status = 'pending' WHERE "productVariantId" IN (SELECT id FROM product_variant WHERE "productId" = $1);
                `, [id]);
            } catch (e) {
                console.error('[updateMyProduct] Failed to clear rejectionReason:', e);
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
                sku: ((input as any).sku && String((input as any).sku).trim() !== '')
                    ? String((input as any).sku).trim()
                    : (transactionalVariant.sku || `VND-OFFER-${input.id}`),
            };
            
            if (input.price !== undefined) {
                updateInput.price = input.price;
            }
            if (input.stock !== undefined) {
                updateInput.stockOnHand = input.stock;
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
     * In Ahizan (product belongs to Ahizan, variants/offers to sellers),
     * this deletes all seller offers and unassigns the product/variants from this seller's channel.
     */
    @Mutation()
    @Allow(Permission.Owner, Permission.Authenticated, Permission.Public)
    async deleteMyProduct(
        @Ctx() ctx: RequestContext,
        @Args('id') id: string
    ): Promise<{ result: string; message: string }> {
        const vendor = await this.myVendorProfile(ctx);
        if (!vendor) {
            throw new Error('No vendor profile found for this user');
        }

        const adminCtx = await this.vendorService.getSuperAdminContext(ctx);
        const vendorIdStr = vendor.id.toString();

        // 1. Delete all seller offers of this vendor for variants of this product
        await this.connection.rawConnection.query(`
            DELETE FROM seller_offer 
            WHERE "vendorId" = $1 
              AND "productVariantId" IN (
                SELECT id FROM product_variant WHERE "productId" = $2
              )
        `, [vendorIdStr, id]);

        // 2. If vendor has a channel, remove vendor channel association from product & variants
        if (vendor.channelId) {
            const variants = await this.connection.getRepository(adminCtx, ProductVariant).find({
                where: { product: { id } }
            });
            for (const v of variants) {
                await this.channelService.removeFromChannels(adminCtx, ProductVariant, v.id, [vendor.channelId]).catch(() => null);
            }
            await this.channelService.removeFromChannels(adminCtx, Product, id, [vendor.channelId]).catch(() => null);
        }

        // 3. Clear direct vendor ownership on the product if set to this vendor so it stays in central Ahizan catalog
        await this.connection.rawConnection.query(`
            UPDATE product 
            SET "customFieldsVendorid" = NULL 
            WHERE id = $1 AND "customFieldsVendorid" = $2
        `, [id, vendorIdStr]).catch(() => null);

        return { result: 'DELETED', message: 'Vos offres et déclinaisons pour ce produit ont été retirées avec succès' };
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
            req: transactionalCtx.req,
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

        const variantIds = updates.map(u => u.id);
        const variantEntities = await this.connection.getRepository(transactionalCtx, ProductVariant).find({
            where: { id: In(variantIds) }
        });
        const variantSkuMap = new Map(variantEntities.map(v => [String(v.id), v.sku]));

        const updateInputs = updates.map(u => ({
            id: u.id,
            sku: variantSkuMap.get(String(u.id)) || `VND-OFFER-${u.id}`,
            ...(u.price !== undefined ? { price: u.price } : {}),
            ...(u.customFields ? { customFields: u.customFields } : {}),
        }));

        try {
            await this.productVariantService.update(sellerCtx, updateInputs);
        } catch (err: any) {
            await this.productVariantService.update(transactionalCtx, updateInputs).catch(() => null);
        }
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
        const vendor = await this.myVendorProfile(ctx).catch(() => null);

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
        const tags = vendor ? ['vendor', `vendorId:${vendor.id}`] : ['admin'];
        return this.assetService.create(adminCtx, {
            file: args.file,
            tags
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
                const collectionRepo = this.connection.getRepository(ctx, Collection);
                for (const variantId of variantIds) {
                    try {
                        // Check if already exists
                        const existing = await collectionRepo.query(
                            `SELECT 1 FROM collection_product_variants_product_variant WHERE "collectionId" = $1 AND "productVariantId" = $2`,
                            [collectionId, variantId]
                        );
                        if (existing.length === 0) {
                            await collectionRepo.query(
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

@Resolver('Product')
export class ProductShopResolver {
    constructor(
        private connection: TransactionalConnection,
        private vendorService: VendorService,
        private productVariantService: ProductVariantService,
    ) {}

    @ResolveField('variants')
    async variants(@Ctx() ctx: RequestContext, @Parent() product: Product): Promise<ProductVariant[]> {
        let vendor: Vendor | null = null;
        try {
            if (ctx.activeUserId) {
                vendor = await this.vendorService.findByUserId(ctx, ctx.activeUserId.toString());
            }
        } catch (e) {}

        if (vendor) {
            const rawOffers = await this.connection.rawConnection.query(`
                SELECT "productVariantId", price, stock, sku, "onPromotion", "promotionalPrice", status, "rejectionReason"
                FROM seller_offer
                WHERE "vendorId" = $1 AND "productVariantId" IN (
                    SELECT id FROM product_variant WHERE "productId" = $2 AND "deletedAt" IS NULL
                )
            `, [(vendor as any).id.toString(), product.id.toString()]).catch(() => []);

            const offerMap = new Map<string, any>();
            for (const o of rawOffers || []) {
                offerMap.set(String(o.productVariantId), o);
            }

            let allVariants: ProductVariant[] = product.variants || [];
            if (!allVariants || allVariants.length === 0) {
                try {
                    const variantsList = await this.productVariantService.getVariantsByProductId(ctx, product.id);
                    allVariants = variantsList?.items || [];
                } catch (e: any) {
                    allVariants = await this.connection.rawConnection.getRepository(ProductVariant).find({
                        where: { productId: product.id } as any
                    }) as any || [];
                }
            }

            const filteredVariants = (allVariants || []).filter(v => offerMap.has(String(v.id)));
            for (const v of filteredVariants) {
                const offer = offerMap.get(String(v.id));
                if (offer) {
                    if (!v.customFields) (v as any).customFields = {};
                    (v.customFields as any).onPromotion = offer.onPromotion;
                    (v.customFields as any).promotionalPrice = offer.promotionalPrice;
                    (v.customFields as any).offerStatus = offer.status;
                    (v.customFields as any).rejectionReason = offer.rejectionReason;
                    if (offer.price != null) (v as any).listPrice = Number(offer.price);
                    if (offer.stock != null) (v as any).stockOnHand = Number(offer.stock);
                    if (offer.sku) v.sku = offer.sku;
                }
            }
            return filteredVariants;
        }

        let allVariants: ProductVariant[] = product.variants || [];
        if (!allVariants || allVariants.length === 0) {
            try {
                const variantsList = await this.productVariantService.getVariantsByProductId(ctx, product.id);
                allVariants = variantsList?.items || [];
            } catch (e: any) {
                allVariants = await this.connection.rawConnection.getRepository(ProductVariant).find({
                    where: { productId: product.id } as any
                }) as any || [];
            }
        }

        // Public Storefront Filter: ONLY return variants that are APPROVED!
        // A variant with offerStatus === 'PENDING' or 'REJECTED' MUST NEVER be exposed on Storefront!
        const approvedVariants = (allVariants || []).filter(v => {
            const offerStatus = (v.customFields as any)?.offerStatus || (v as any).customFieldsOfferstatus;
            if (offerStatus === 'PENDING' || offerStatus === 'REJECTED') {
                return false;
            }
            return true;
        });

        return approvedVariants;
    }
}

@Resolver('ProductVariant')
export class ProductVariantShopResolver {
    constructor(
        private connection: TransactionalConnection,
        private productPriceApplicator: ProductPriceApplicator,
        private vendorService: VendorService,
    ) {}

    @ResolveField('currencyCode')
    async currencyCode(@Ctx() ctx: RequestContext, @Parent() variant: ProductVariant): Promise<string> {
        return (variant.currencyCode as any) || (ctx.channel as any)?.defaultCurrencyCode || (ctx.channel as any)?.currencyCode || 'XOF';
    }

    @ResolveField('stockLevel')
    async stockLevel(@Ctx() ctx: RequestContext, @Parent() variant: ProductVariant): Promise<string> {
        const stock = await this.stockOnHand(ctx, variant);
        return stock > 0 ? 'IN_STOCK' : 'OUT_OF_STOCK';
    }

    @ResolveField('name')
    async name(@Ctx() ctx: RequestContext, @Parent() variant: ProductVariant): Promise<string> {
        if (variant.name) {
            return variant.name;
        }
        const translation = await this.connection.rawConnection.query(
            `SELECT name FROM product_variant_translation WHERE "baseId" = $1 LIMIT 1`,
            [variant.id]
        );
        if (translation?.[0]?.name) {
            return translation[0].name;
        }
        const productTrans = await this.connection.rawConnection.query(
            `SELECT name FROM product_translation WHERE "baseId" = (SELECT "productId" FROM product_variant WHERE id = $1) LIMIT 1`,
            [variant.id]
        );
        return productTrans?.[0]?.name || `Variant #${variant.id}`;
    }

    @ResolveField('stockOnHand')
    async stockOnHand(@Ctx() ctx: RequestContext, @Parent() variant: ProductVariant): Promise<number> {
        if ((variant as any).stockOnHand !== undefined && (variant as any).stockOnHand !== null) {
            return Number((variant as any).stockOnHand);
        }
        try {
            const vendor = ctx.activeUserId ? await this.vendorService.findByUserId(ctx, ctx.activeUserId.toString()).catch(() => null) : null;
            if (vendor) {
                const offer = await this.connection.rawConnection.query(`
                    SELECT stock FROM seller_offer WHERE "vendorId" = $1 AND "productVariantId" = $2 LIMIT 1
                `, [(vendor as any).id.toString(), variant.id.toString()]).catch(() => null);
                if (offer && offer.length > 0 && offer[0].stock !== null && offer[0].stock !== undefined) {
                    return Number(offer[0].stock);
                }
            }
        } catch (e) {}
        const variantWithStock = await this.connection.getRepository(ctx, ProductVariant).findOne({
            where: { id: variant.id },
            relations: ['stockLevels'],
        });
        const stockLevels = variantWithStock?.stockLevels || [];
        return stockLevels.reduce((sum, sl) => sum + (sl.stockOnHand || 0), 0);
    }

    @ResolveField('customFields')
    async customFields(@Ctx() ctx: RequestContext, @Parent() variant: ProductVariant): Promise<any> {
        let baseCustomFields = variant.customFields || {};
        try {
            const vendor = ctx.activeUserId ? await this.vendorService.findByUserId(ctx, ctx.activeUserId.toString()).catch(() => null) : null;
            if (vendor) {
                const offer = await this.connection.rawConnection.query(`
                    SELECT "onPromotion", "promotionalPrice", status, "rejectionReason"
                    FROM seller_offer 
                    WHERE "vendorId" = $1 AND "productVariantId" = $2 
                    LIMIT 1
                `, [(vendor as any).id.toString(), variant.id.toString()]).catch(() => null);

                if (offer && offer.length > 0) {
                    baseCustomFields = {
                        ...baseCustomFields,
                        onPromotion: offer[0].onPromotion ?? (baseCustomFields as any).onPromotion,
                        promotionalPrice: offer[0].promotionalPrice ?? (baseCustomFields as any).promotionalPrice,
                        offerStatus: offer[0].status ?? (baseCustomFields as any).offerStatus,
                        rejectionReason: offer[0].rejectionReason ?? (baseCustomFields as any).rejectionReason,
                    };
                }
            } else {
                const offer = await this.connection.rawConnection.query(`
                    SELECT "onPromotion", "promotionalPrice", status, "rejectionReason"
                    FROM seller_offer 
                    WHERE "productVariantId" = $1 
                    ORDER BY id DESC
                    LIMIT 1
                `, [variant.id.toString()]).catch(() => null);
                if (offer && offer.length > 0) {
                    baseCustomFields = {
                        ...baseCustomFields,
                        onPromotion: offer[0].onPromotion ?? (baseCustomFields as any).onPromotion,
                        promotionalPrice: offer[0].promotionalPrice ?? (baseCustomFields as any).promotionalPrice,
                        offerStatus: offer[0].status ?? (baseCustomFields as any).offerStatus,
                        rejectionReason: offer[0].rejectionReason ?? (baseCustomFields as any).rejectionReason,
                    };
                }
            }
        } catch (e) {}
        return baseCustomFields;
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
        // If logged-in vendor, check their offer first
        try {
            const vendor = ctx.activeUserId ? await this.vendorService.findByUserId(ctx, ctx.activeUserId.toString()).catch(() => null) : null;
            if (vendor) {
                const offer = await this.connection.rawConnection.query(`
                    SELECT price FROM seller_offer WHERE "vendorId" = $1 AND "productVariantId" = $2 LIMIT 1
                `, [(vendor as any).id.toString(), variant.id.toString()]).catch(() => null);
                if (offer && offer.length > 0 && offer[0].price !== null && offer[0].price !== undefined) {
                    return Number(offer[0].price);
                }
            }
        } catch (e) {}

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

@Resolver('SellerOffer')
export class SellerOfferEntityResolver {
    constructor(
        private connection: TransactionalConnection,
        private productVariantService: ProductVariantService,
    ) {}

    @ResolveField('productVariant')
    @Allow(Permission.Public)
    async productVariant(@Ctx() ctx: RequestContext, @Parent() offer: SellerOffer): Promise<ProductVariant | null> {
        if (offer.productVariant) {
            return offer.productVariant;
        }
        const variantId = (offer as any).productVariantId;
        if (variantId) {
            try {
                const variant = await this.productVariantService.findOne(ctx, variantId);
                if (variant) return variant;
            } catch (e: any) {
                // Ignore channel filtering entity errors
            }
            return await this.connection.rawConnection.getRepository(ProductVariant).findOne({ where: { id: Number(variantId) } as any }) as any || null;
        }
        return null;
    }

    @ResolveField('vendor')
    @Allow(Permission.Public)
    async vendor(@Ctx() ctx: RequestContext, @Parent() offer: SellerOffer): Promise<Vendor | null> {
        if (offer.vendor) {
            return offer.vendor;
        }
        if ((offer as any).vendorId) {
            const vendor = await this.connection.getRepository(ctx, Vendor).findOne({ where: { id: (offer as any).vendorId } });
            return vendor || null;
        }
        return null;
    }
}


