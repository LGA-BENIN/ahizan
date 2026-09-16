import { 
    OrderItemPriceCalculationStrategy, 
    PriceCalculationResult, 
    RequestContext, 
    ProductVariant, 
    ProductVariantPriceCalculationStrategy, 
    ProductVariantPriceCalculationArgs,
    TransactionalConnection,
    Injector
} from '@vendure/core';
import { SellerOffer } from '../entities/seller-offer.entity';

export class PromotionalOrderItemPriceCalculationStrategy implements OrderItemPriceCalculationStrategy {
    private connection: TransactionalConnection;

    init(injector: Injector) {
        this.connection = injector.get(TransactionalConnection);
    }

    async calculateUnitPrice(
        ctx: RequestContext,
        productVariant: ProductVariant,
        orderLineCustomFields: any,
    ): Promise<PriceCalculationResult> {
        let vendorId: any = undefined;

        if (orderLineCustomFields) {
            const rawVendor = orderLineCustomFields.assignedVendor;
            if (rawVendor) {
                vendorId = typeof rawVendor === 'object' ? rawVendor.id : rawVendor;
            }
            if (!vendorId && orderLineCustomFields.assignedVendorId) {
                vendorId = orderLineCustomFields.assignedVendorId;
            }
            if (!vendorId && (orderLineCustomFields as any).customFieldsAssignedvendorid) {
                vendorId = (orderLineCustomFields as any).customFieldsAssignedvendorid;
            }
        }

        const sellerOfferId = orderLineCustomFields?.sellerOfferId;
        let price = productVariant.price;

        // 1. If a specific SellerOffer ID is assigned to the line
        if (sellerOfferId) {
            const offer = await this.connection.getRepository(ctx, SellerOffer).findOne({
                where: { id: sellerOfferId }
            });
            if (offer) {
                price = offer.onPromotion && offer.promotionalPrice ? Number(offer.promotionalPrice) : Number(offer.price);
                return {
                    price: Number(price),
                    priceIncludesTax: false,
                };
            }
        }

        // 2. If an assigned Vendor ID is specified on the line
        if (vendorId) {
            const offer = await this.connection.getRepository(ctx, SellerOffer).findOne({
                where: {
                    vendor: { id: vendorId },
                    productVariant: { id: productVariant.id }
                }
            });
            if (offer) {
                price = offer.onPromotion && offer.promotionalPrice ? Number(offer.promotionalPrice) : Number(offer.price);
                return {
                    price: Number(price),
                    priceIncludesTax: false,
                };
            }
        }

        // 3. Fallback: Find lowest seller offer for this variant if no seller was explicitly chosen
        const offer = await this.connection.getRepository(ctx, SellerOffer).findOne({
            where: {
                productVariant: { id: productVariant.id }
            },
            order: { price: 'ASC' }
        });
        if (offer) {
            price = offer.onPromotion && offer.promotionalPrice ? Number(offer.promotionalPrice) : Number(offer.price);
        }

        return {
            price: Number(price),
            priceIncludesTax: false,
        };
    }
}

export class AhizanProductVariantPriceCalculationStrategy implements ProductVariantPriceCalculationStrategy {
    private connection: TransactionalConnection;

    init(injector: Injector) {
        this.connection = injector.get(TransactionalConnection);
    }

    async calculate(args: ProductVariantPriceCalculationArgs): Promise<PriceCalculationResult> {
        let price = args.inputPrice;
        const ctx = args.ctx;
        const variantId = args.productVariant.id;

        // Display the lowest seller offer price on the product catalog listing
        try {
            const offers = await this.connection.getRepository(ctx, SellerOffer).find({
                where: { productVariant: { id: variantId } }
            });

            if (offers.length > 0) {
                const minPrice = Math.min(...offers.map(o => o.price));
                if (minPrice > 0) {
                    price = minPrice;
                }
            }
        } catch (err) {
            console.error('[AhizanProductVariantPriceCalculationStrategy] Error fetching seller offers:', err);
        }

        // Fallback to default variant price if no seller offers exist
        if (!price || price === 0) {
            const variantPrices = args.productVariant.productVariantPrices;
            if (variantPrices && variantPrices.length > 0) {
                const found = variantPrices.find(p => p.price > 0);
                if (found) {
                    price = found.price;
                }
            }
        }

        return {
            price: Number(price || 0),
            priceIncludesTax: false,
        };
    }
}
