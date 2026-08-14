import { OrderItemPriceCalculationStrategy, PriceCalculationResult, RequestContext, ProductVariant } from '@vendure/core';

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
