import { Injectable } from '@nestjs/common';
import { 
    TransactionalConnection, 
    RequestContext, 
    ProductVariant, 
    ProductVariantService,
    StockLocationService
} from '@vendure/core';
import { SellerOffer, DeliveryTimeUnit, ProductCondition } from '../entities/seller-offer.entity';
import { Vendor } from '../entities/vendor.entity';

@Injectable()
export class SellerOfferService {
    constructor(
        private connection: TransactionalConnection,
        private productVariantService: ProductVariantService,
        private stockLocationService: StockLocationService,
    ) {}

    async getOffersForVariant(ctx: RequestContext, variantId: string): Promise<SellerOffer[]> {
        return this.connection.getRepository(ctx, SellerOffer).find({
            where: { productVariant: { id: variantId } },
            relations: ['vendor', 'vendor.logo', 'productVariant'],
        });
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

        const variant = await this.connection.getEntityOrThrow(ctx, ProductVariant, variantId);

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
                status: input.status ?? 'approved',
                rejectionReason: input.rejectionReason ?? null,
            });
        } else {
            offer.price = input.price;
            offer.stock = input.stock;
            if (input.sku !== undefined) offer.sku = input.sku;
            if (input.deliveryTimeValue !== undefined) offer.deliveryTimeValue = input.deliveryTimeValue;
            if (input.deliveryTimeUnit !== undefined) offer.deliveryTimeUnit = input.deliveryTimeUnit;
            if (input.condition !== undefined) offer.condition = input.condition;
            if (input.onPromotion !== undefined) offer.onPromotion = input.onPromotion;
            if (input.promotionalPrice !== undefined) offer.promotionalPrice = input.promotionalPrice;
            if (input.featuredAssetId !== undefined) offer.featuredAssetId = input.featuredAssetId;
            if (input.status !== undefined) offer.status = input.status;
            if (input.rejectionReason !== undefined) offer.rejectionReason = input.rejectionReason;
        }

        const savedOffer = await repo.save(offer);

        // Synchronize stock level with Vendure's native StockLocation for this Vendor
        try {
            const adminCtx = RequestContext.empty(); // use admin context to query system-wide stock locations
            const stockLocations = await this.stockLocationService.findAll(adminCtx);
            const vendorStockLocation = stockLocations.items.find((sl: any) => sl.name === `${vendor.name} Stock`);
            
            if (vendorStockLocation) {
                await this.productVariantService.update(ctx, [
                    {
                        id: variantId,
                        sku: input.sku || variant.sku || '',
                        stockLevels: [
                            {
                                stockLocationId: vendorStockLocation.id,
                                stockOnHand: input.stock,
                            }
                        ]
                    }
                ]);
                console.log(`[SellerOfferService] Synced stock of ${input.stock} for variant ${variantId} in location ${vendorStockLocation.name}`);
            } else {
                console.warn(`[SellerOfferService] No stock location found named "${vendor.name} Stock" to sync.`);
            }
        } catch (stockErr: any) {
            console.error('[SellerOfferService] Failed to sync stock level with Vendure StockLocation:', stockErr.message);
        }

        const finalOffer = await repo.findOne({
            where: { id: savedOffer.id },
            relations: ['productVariant', 'vendor']
        });
        return finalOffer || savedOffer;
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
            const adminCtx = RequestContext.empty();
            const stockLocations = await this.stockLocationService.findAll(adminCtx);
            const vendorStockLocation = stockLocations.items.find((sl: any) => sl.name === `${vendor.name} Stock`);
            
            if (vendorStockLocation) {
                await this.productVariantService.update(ctx, [
                    {
                        id: variantId,
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
