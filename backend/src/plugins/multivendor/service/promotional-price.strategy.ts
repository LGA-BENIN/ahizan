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
        // Find assigned vendor from custom fields (can be relation object or ID)
        const assignedVendor = orderLineCustomFields?.assignedVendor || orderLineCustomFields?.assignedVendorId;
        
        let price = productVariant.price;

        if (assignedVendor) {
            const vendorId = typeof assignedVendor === 'object' ? assignedVendor.id : assignedVendor;
            const offer = await this.connection.getRepository(ctx, SellerOffer).findOne({
                where: {
                    vendor: { id: vendorId },
                    productVariant: { id: productVariant.id }
                }
            });
            if (offer) {
                price = offer.price;
            }
        }

        return {
            price,
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
