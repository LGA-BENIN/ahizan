import { Injectable } from '@nestjs/common';
import { 
    TransactionalConnection, 
    RequestContext, 
    ProductVariant, 
    ProductVariantService,
    StockLocationService,
    ChannelService
} from '@vendure/core';
import { SellerOffer, DeliveryTimeUnit, ProductCondition } from '../entities/seller-offer.entity';
import { Vendor } from '../entities/vendor.entity';

@Injectable()
export class SellerOfferService {
    constructor(
        private connection: TransactionalConnection,
        private productVariantService: ProductVariantService,
        private stockLocationService: StockLocationService,
        private channelService: ChannelService,
    ) {}

    async getOffersForVariant(ctx: RequestContext, variantId: string): Promise<SellerOffer[]> {
        const where: any = { productVariant: { id: variantId } };
        if (ctx.apiType === 'shop') {
            where.status = 'approved';
        }
        return this.connection.getRepository(ctx, SellerOffer).find({
            where,
            relations: ['vendor', 'vendor.logo', 'productVariant', 'productVariant.translations', 'productVariant.featuredAsset'],
        });
    }

    async getOffersForVariants(ctx: RequestContext, variantIds: string[]): Promise<SellerOffer[]> {
        if (!variantIds || variantIds.length === 0) return [];
        const qb = this.connection.getRepository(ctx, SellerOffer)
            .createQueryBuilder('offer')
            .leftJoinAndSelect('offer.vendor', 'vendor')
            .leftJoinAndSelect('vendor.logo', 'logo')
            .leftJoinAndSelect('offer.productVariant', 'variant')
            .leftJoinAndSelect('variant.translations', 'translations')
            .leftJoinAndSelect('variant.featuredAsset', 'variantAsset')
            .leftJoinAndSelect('variant.product', 'product')
            .leftJoinAndSelect('product.featuredAsset', 'productAsset')
            .where('offer.productVariantId IN (:...variantIds)', { variantIds });

        if (ctx.apiType === 'shop') {
            qb.andWhere('offer.status = :status', { status: 'approved' });
        }
        return qb.getMany();
    }

    async getOffersForProduct(ctx: RequestContext, productId: string): Promise<SellerOffer[]> {
        return this.connection.getRepository(ctx, SellerOffer)
            .createQueryBuilder('offer')
            .leftJoinAndSelect('offer.vendor', 'vendor')
            .leftJoinAndSelect('vendor.logo', 'logo')
            .leftJoinAndSelect('offer.productVariant', 'variant')
            .leftJoinAndSelect('variant.translations', 'translations')
            .leftJoinAndSelect('variant.options', 'options')
            .leftJoinAndSelect('options.translations', 'optionTranslations')
            .leftJoinAndSelect('variant.product', 'product')
            .where('variant.productId = :productId OR product.id = :productId', { productId: String(productId) })
            .getMany();
    }

    async getOffersForVendor(ctx: RequestContext, vendorId: string): Promise<SellerOffer[]> {
        return this.connection.getRepository(ctx, SellerOffer).find({
            where: { vendor: { id: vendorId } },
            relations: ['productVariant', 'productVariant.product'],
        });
    }

    async getOfferByVendorAndVariant(ctx: RequestContext, vendorId: string, variantId: string): Promise<SellerOffer | null> {
        return this.connection.getRepository(ctx, SellerOffer).findOne({
            where: { 
                vendor: { id: vendorId },
                productVariant: { id: variantId }
            },
            relations: ['vendor', 'productVariant']
        });
    }

    async createOrUpdateOffer(
        ctx: RequestContext,
        vendor: Vendor,
        variantId: string,
        input: { 
            price: number; 
            stock: number; 
            sku?: string; 
            deliveryTimeValue?: number; 
            deliveryTimeUnit?: DeliveryTimeUnit; 
            condition?: ProductCondition;
            onPromotion?: boolean;
            promotionalPrice?: number;
            featuredAssetId?: string;
            status?: string;
            rejectionReason?: string;
        }
    ): Promise<SellerOffer> {
        const repo = this.connection.getRepository(ctx, SellerOffer);
        let offer = await repo.findOne({
            where: {
                vendor: { id: vendor.id },
                productVariant: { id: variantId }
            }
        });

        let variant = await this.connection.getRepository(ctx, ProductVariant).findOne({
            where: { id: variantId }
        });
        if (!variant) {
            variant = await this.connection.rawConnection.getRepository(ProductVariant).findOne({
                where: { id: Number(variantId) } as any
            }) as any;
        }
        if (!variant) {
            throw new Error(`ProductVariant with ID ${variantId} not found`);
        }

        if (!offer) {
            offer = repo.create({
                vendor,
                productVariant: variant,
                price: input.price,
                stock: input.stock,
                sku: input.sku || variant.sku,
                deliveryTimeValue: input.deliveryTimeValue ?? 2,
                deliveryTimeUnit: input.deliveryTimeUnit ?? DeliveryTimeUnit.DAYS,
                condition: input.condition ?? ProductCondition.NEW,
                onPromotion: input.onPromotion ?? false,
                promotionalPrice: input.promotionalPrice ?? null,
                featuredAssetId: input.featuredAssetId ?? null,
                status: input.status ?? 'pending',
                rejectionReason: input.rejectionReason ?? null,
            });
        } else {
            const isAlreadyApproved = offer.status === 'approved';
            const hasNewAsset = input.featuredAssetId !== undefined && input.featuredAssetId !== offer.featuredAssetId && input.featuredAssetId !== null;

            offer.price = input.price;
            offer.stock = input.stock;
            if (input.sku !== undefined) offer.sku = input.sku;
            if (input.deliveryTimeValue !== undefined) offer.deliveryTimeValue = input.deliveryTimeValue;
            if (input.deliveryTimeUnit !== undefined) offer.deliveryTimeUnit = input.deliveryTimeUnit;
            if (input.condition !== undefined) offer.condition = input.condition;
            if (input.onPromotion !== undefined) offer.onPromotion = input.onPromotion;
            if (input.promotionalPrice !== undefined) offer.promotionalPrice = input.promotionalPrice;
            if (input.featuredAssetId !== undefined) offer.featuredAssetId = input.featuredAssetId;
            
            // If the offer was already approved, and only commercial/pricing/stock conditions were changed (no new image), maintain approved status!
            if (input.status) {
                offer.status = input.status;
            } else if (isAlreadyApproved && !hasNewAsset) {
                offer.status = 'approved';
            } else {
                offer.status = 'pending';
            }

            if (input.rejectionReason !== undefined) {
                offer.rejectionReason = input.rejectionReason;
            } else if (offer.status !== 'rejected') {
                offer.rejectionReason = null; // Clear previous rejection reason upon resubmission
            }
        }

        const savedOffer = await repo.save(offer);

        // Update underlying ProductVariant offerStatus and rejection reason
        if (variantId) {
            const numVariantId = Number(variantId);
            const pvRepo = this.connection.getRepository(ctx, ProductVariant);
            const approvedOffersCount = await pvRepo.query(
                `SELECT COUNT(*) as count FROM seller_offer WHERE "productVariantId" = $1 AND status = 'approved'`,
                [numVariantId]
            );
            const hasApprovedOffers = parseInt(approvedOffersCount[0]?.count || '0', 10) > 0;
            const offerStatus = hasApprovedOffers ? 'APPROVED' : (savedOffer.status === 'rejected' ? 'REJECTED' : 'PENDING');

            await pvRepo.query(
                `UPDATE product_variant SET 
                    enabled = $1, 
                    "customFieldsOfferstatus" = $2, 
                    "customFieldsRejectionreason" = CASE WHEN $1 = true THEN NULL ELSE $3 END, 
                    "updatedAt" = NOW() 
                 WHERE id = $4`,
                [hasApprovedOffers, offerStatus, savedOffer.rejectionReason, numVariantId]
            );
            try {
                await pvRepo.query(
                    `UPDATE product_variant_price SET "price" = COALESCE(
                        (SELECT MIN(price) FROM seller_offer WHERE "productVariantId" = $1 AND status = 'approved'),
                        (SELECT MIN(price) FROM seller_offer WHERE "productVariantId" = $1),
                        $2
                    ) WHERE "variantId" = $1`,
                    [numVariantId, savedOffer.price]
                );
            } catch (pErr) {}

            if (savedOffer.featuredAssetId) {
                try {
                    const numAssetId = Number(savedOffer.featuredAssetId);
                    if (!isNaN(numAssetId)) {
                        await pvRepo.query(
                            `UPDATE product_variant SET "featuredAssetId" = $1 WHERE id = $2`,
                            [numAssetId, numVariantId]
                        );
                    }
                } catch (e) {}
            }

            // Sync search_index_item real-time for this variant
            try {
                // 0. Ensure variant is assigned to Default Channel 1
                await pvRepo.query(`
                    INSERT INTO product_variant_channels_channel ("productVariantId", "channelId")
                    VALUES ($1::integer, 1) ON CONFLICT DO NOTHING
                `, [numVariantId]).catch(() => null);

                // 1. Inherit collections from sibling variants
                await pvRepo.query(`
                    INSERT INTO collection_product_variants_product_variant ("collectionId", "productVariantId")
                    SELECT DISTINCT cpv."collectionId", $1::integer
                    FROM collection_product_variants_product_variant cpv
                    INNER JOIN product_variant pv_sibling ON pv_sibling.id = cpv."productVariantId"
                    WHERE pv_sibling."productId" = (
                        SELECT pv2."productId" FROM product_variant pv2 WHERE pv2.id = $1::integer
                    )
                    AND cpv."productVariantId" != $1::integer
                    ON CONFLICT DO NOTHING
                `, [numVariantId]).catch((err: any) => console.error('[SellerOfferService] step 1 error:', err));

                // 2. Full UPSERT into search_index_item for Default Channel 1
                await pvRepo.query(`
                    INSERT INTO search_index_item ("languageCode", "enabled", "productName", "productVariantName", "description", "slug", "sku", "facetIds", "facetValueIds", "collectionIds", "collectionSlugs", "channelIds", "productPreview", "productPreviewFocalPoint", "productVariantPreview", "productVariantPreviewFocalPoint", "inStock", "productInStock", "productVariantId", "channelId", "productId", "productAssetId", "productVariantAssetId", "price", "priceWithTax")
                    SELECT DISTINCT ON (pv.id)
                        'fr',
                        (CASE WHEN EXISTS (SELECT 1 FROM seller_offer so_any WHERE so_any."productVariantId" = pv.id) THEN (p.enabled AND EXISTS (SELECT 1 FROM seller_offer so_app WHERE so_app."productVariantId" = pv.id AND so_app.status = 'approved')) ELSE (p.enabled AND pv.enabled) END),
                        COALESCE(pt.name, 'Produit'),
                        COALESCE(
                            (
                                SELECT CASE
                                    WHEN string_agg(ot_init.name::text, ' - ' ORDER BY po_init.id) IS NOT NULL
                                      AND string_agg(ot_init.name::text, ' - ' ORDER BY po_init.id) != ''
                                    THEN (SELECT pt_n.name FROM product_translation pt_n WHERE pt_n."baseId" = p.id AND pt_n."languageCode" = 'fr' LIMIT 1)::text
                                         || ' - ' || string_agg(ot_init.name::text, ' - ' ORDER BY po_init.id)
                                    ELSE (SELECT pt_n.name FROM product_translation pt_n WHERE pt_n."baseId" = p.id AND pt_n."languageCode" = 'fr' LIMIT 1)::text
                                END
                                FROM product_variant_options_product_option pvo_init
                                INNER JOIN product_option po_init ON po_init.id = pvo_init."productOptionId"
                                LEFT JOIN product_option_translation ot_init ON ot_init."baseId" = po_init.id AND ot_init."languageCode" = 'fr'
                                WHERE pvo_init."productVariantId" = pv.id
                            ),
                            pt.name,
                            'Variante'
                        ),
                        COALESCE(pt.description, ''),
                        COALESCE(pt.slug, 'produit'),
                        COALESCE(pv.sku, ''),
                        '',
                        '',
                        COALESCE((SELECT string_agg(DISTINCT cpv."collectionId"::text, ',') FROM collection_product_variants_product_variant cpv WHERE cpv."productVariantId" = pv.id), ''),
                        COALESCE((SELECT string_agg(DISTINCT ct.slug, ',') FROM collection_product_variants_product_variant cpv INNER JOIN collection_translation ct ON ct."baseId" = cpv."collectionId" WHERE cpv."productVariantId" = pv.id), ''),
                        '1',
                        COALESCE(pa.preview, ''),
                        NULL,
                        COALESCE(pva.preview, pa.preview, ''),
                        NULL,
                        true,
                        true,
                        pv.id,
                        1,
                        p.id,
                        p."featuredAssetId",
                        pv."featuredAssetId",
                        COALESCE((SELECT MIN(so_app.price) FROM seller_offer so_app WHERE so_app."productVariantId" = pv.id AND so_app.status = 'approved'), pvp.price, 0),
                        COALESCE((SELECT MIN(so_app.price) FROM seller_offer so_app WHERE so_app."productVariantId" = pv.id AND so_app.status = 'approved'), pvp.price, 0)
                    FROM product_variant pv
                    INNER JOIN product p ON p.id = pv."productId"
                    LEFT JOIN product_translation pt ON pt."baseId" = p.id AND pt."languageCode" = 'fr'
                    LEFT JOIN product_variant_price pvp ON pvp."variantId" = pv.id
                    LEFT JOIN asset pa ON pa.id = p."featuredAssetId"
                    LEFT JOIN asset pva ON pva.id = pv."featuredAssetId"
                    WHERE pv.id = $1::integer
                    ON CONFLICT ("channelId", "languageCode", "productVariantId") DO UPDATE
                    SET "enabled" = EXCLUDED."enabled",
                        "collectionIds" = EXCLUDED."collectionIds",
                        "collectionSlugs" = EXCLUDED."collectionSlugs",
                        "productName" = EXCLUDED."productName",
                        "productVariantName" = EXCLUDED."productVariantName",
                        "slug" = EXCLUDED."slug",
                        "productPreview" = EXCLUDED."productPreview",
                        "productVariantPreview" = EXCLUDED."productVariantPreview",
                        "price" = EXCLUDED."price",
                        "priceWithTax" = EXCLUDED."priceWithTax";
                `, [numVariantId]).catch((err: any) => console.error('[SellerOfferService] step 2 error:', err));
            } catch (err) {
                console.error('[SellerOfferService] step 1-2 block error:', err);
            }

            // If offer is pending, touch product updatedAt and reset approval status
            if (savedOffer.status === 'pending') {
                try {
                    await pvRepo.query(
                        `UPDATE product SET "updatedAt" = NOW() WHERE id = (SELECT "productId" FROM product_variant WHERE id = $1::integer)`,
                        [numVariantId]
                    ).catch((err: any) => console.error('[SellerOfferService] touch updatedAt error:', err));
                    await pvRepo.query(
                        `UPDATE product SET "customFieldsRejectionreason" = NULL, "customFieldsApprovalstatus" = 'pending' 
                         WHERE id = (SELECT "productId" FROM product_variant WHERE id = $1::integer)
                         AND ("customFieldsApprovalstatus" = 'rejected' OR "customFieldsApprovalstatus" = 'correction_requested' OR "customFieldsApprovalstatus" = 'needs_information')`,
                        [numVariantId]
                    ).catch((err: any) => console.error('[SellerOfferService] reset approvalstatus error:', err));
                } catch (e: any) {
                    console.error('[SellerOfferService] touch product error:', e);
                }
            }
        }

        // Synchronize stock level with Vendure's native StockLocation for this Vendor
        try {
            const defaultChannel = await this.channelService.getDefaultChannel();
            const adminCtx = new RequestContext({
                apiType: 'admin',
                isAuthorized: true,
                authorizedAsOwnerOnly: false,
                channel: defaultChannel,
                languageCode: ctx.languageCode || 'fr',
            });
            const stockLocations = await this.stockLocationService.findAll(adminCtx);
            const vendorStockLocation = stockLocations.items.find((sl: any) => sl.name === `${vendor.name} Stock`);
            
            if (vendorStockLocation && variantId) {
                const numVariantId = Number(variantId);
                const pvRepo = this.connection.getRepository(ctx, ProductVariant);
                await pvRepo.query(`
                    INSERT INTO stock_level ("productVariantId", "stockLocationId", "stockOnHand", "stockAllocated")
                    VALUES ($1::integer, $2::integer, $3, 0)
                    ON CONFLICT ("productVariantId", "stockLocationId")
                    DO UPDATE SET "stockOnHand" = EXCLUDED."stockOnHand"
                `, [numVariantId, Number(vendorStockLocation.id), input.stock || 0]).catch((err: any) => console.error('[SellerOfferService] stock insert error:', err));
                console.log(`[SellerOfferService] Synced stock of ${input.stock} for variant ${variantId} in location ${vendorStockLocation.name}`);
            }
        } catch (stockErr: any) {
            console.error('[SellerOfferService] Failed to sync stock level with Vendure StockLocation:', stockErr.message);
        }

        return savedOffer;
    }

    async deleteOffer(ctx: RequestContext, vendor: Vendor, variantId: string): Promise<boolean> {
        const repo = this.connection.getRepository(ctx, SellerOffer);
        const offer = await repo.findOne({
            where: {
                vendor: { id: vendor.id },
                productVariant: { id: variantId }
            }
        });

        if (!offer) return false;

        await repo.remove(offer);

        // Reset stock level to 0 in vendor's stock location
        try {
            const defaultChannel = await this.channelService.getDefaultChannel();
            const adminCtx = new RequestContext({
                apiType: 'admin',
                isAuthorized: true,
                authorizedAsOwnerOnly: false,
                channel: defaultChannel,
                languageCode: ctx.languageCode || 'fr',
            });
            const stockLocations = await this.stockLocationService.findAll(adminCtx);
            const vendorStockLocation = stockLocations.items.find((sl: any) => sl.name === `${vendor.name} Stock`);
            
            if (vendorStockLocation) {
                const variant = await this.connection.getRepository(adminCtx, ProductVariant).findOne({ where: { id: variantId } });
                const validSku = variant?.sku && String(variant.sku).trim() !== '' ? String(variant.sku).trim() : `VND-OFFER-${variantId}`;
                await this.productVariantService.update(adminCtx, [
                    {
                        id: variantId,
                        sku: validSku,
                        stockLevels: [
                            {
                                stockLocationId: vendorStockLocation.id,
                                stockOnHand: 0,
                            }
                        ]
                    }
                ]);
            }
        } catch (err: any) {
            console.error('[SellerOfferService] Failed to clear stock level on delete:', err.message);
        }

        return true;
    }
}
