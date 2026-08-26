import { OrderItemPriceCalculationStrategy, PriceCalculationResult, RequestContext, ProductVariant, ProductVariantPriceCalculationStrategy, ProductVariantPriceCalculationArgs } from '@vendure/core';

export class PromotionalOrderItemPriceCalculationStrategy implements OrderItemPriceCalculationStrategy {
    calculateUnitPrice(
        ctx: RequestContext,
        productVariant: ProductVariant,
        orderLineCustomFields: any,
    ): PriceCalculationResult | Promise<PriceCalculationResult> {
        const customFields = (productVariant.customFields as any) || {};
        const onPromotion = customFields.onPromotion === true;
        const promotionalPrice = customFields.promotionalPrice;

        // If variant has active promotion and valid promotional price, use it as effective unit price
        if (onPromotion && typeof promotionalPrice === 'number' && promotionalPrice > 0) {
            return {
                price: promotionalPrice,
                priceIncludesTax: false,
            };
        }

        return {
            price: productVariant.price,
            priceIncludesTax: false,
        };
    }
}

export class AhizanProductVariantPriceCalculationStrategy implements ProductVariantPriceCalculationStrategy {
    async calculate(args: ProductVariantPriceCalculationArgs): Promise<PriceCalculationResult> {
        let price = args.inputPrice;

        // If inputPrice is 0 (e.g. unapproved product / channel context mismatch), fallback to positive variant price
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
