import { rawQuery } from './raw-api';
import { processAndResolveDisplayItems, DisplayEngineContext } from './display-engine';

const GET_SELLER_OFFERS_FOR_VARIANTS = `
    query GetSellerOffersForVariants($variantIds: [ID!]!) {
        sellerOffersForVariants(variantIds: $variantIds) {
            id
            price
            stock
            onPromotion
            promotionalPrice
            condition
            deliveryTimeValue
            deliveryTimeUnit
            vendor {
                id
                name
                latitude
                longitude
                verificationStatus
                rating
                ratingCount
                logo {
                    preview
                }
                location {
                    id
                    name
                }
                physicalMarket {
                    id
                    name
                }
            }
            productVariant {
                id
                name
                sku
                featuredAsset {
                    id
                    preview
                }
                options {
                    id
                    name
                    code
                    group {
                        id
                        name
                    }
                }
                product {
                    id
                    name
                    slug
                    featuredAsset {
                        id
                        preview
                    }
                }
            }
        }
    }
`;

/**
 * Resolves a list of SearchResult/Product items with their real-time Seller Offers and Buy Box scoring.
 * Prevents variant flooding and duplicate cards by consolidating offers onto the Master Product.
 */
export async function expandProductsWithSellerOffers(
    items: any[], 
    context: DisplayEngineContext = {}
): Promise<any[]> {
    if (!items || items.length === 0) return [];

    // If items are already resolved as master items, re-score them with current context
    if (items.some(i => i.isMasterResolved)) {
        return processAndResolveDisplayItems(items, context).map(r => ({
            ...r,
            isMasterResolved: true,
        }));
    }

    const variantIds = Array.from(
        new Set(items.map(i => i.productVariantId || i.id).filter(Boolean))
    );

    if (variantIds.length === 0) return items;

    try {
        const res = await rawQuery(GET_SELLER_OFFERS_FOR_VARIANTS, {
            variables: { variantIds },
        });

        const offers: any[] = res?.sellerOffersForVariants || [];
        
        // Prepare items with attached offers
        const rawItemsWithOffers: any[] = [];
        for (const item of items) {
            const vId = String(item.productVariantId || item.id);
            const matchingOffers = offers.filter(
                o => String(o.productVariant?.id) === vId
            );

            if (matchingOffers.length > 0) {
                for (const offer of matchingOffers) {
                    rawItemsWithOffers.push({
                        ...item,
                        productId: item.productId || item.product?.id || item.id,
                        productName: item.productName || item.name,
                        productVariantId: vId,
                        productVariantName: offer.productVariant?.name || item.productVariantName,
                        productVariant: offer.productVariant || item.productVariant,
                        sku: offer.productVariant?.sku || item.sku,
                        vendorId: offer.vendor?.id,
                        vendorName: offer.vendor?.name,
                        marketName: offer.vendor?.physicalMarket?.name,
                        marketId: offer.vendor?.physicalMarket?.id,
                        locationName: offer.vendor?.location?.name,
                        locationId: offer.vendor?.location?.id,
                        latitude: offer.vendor?.latitude,
                        longitude: offer.vendor?.longitude,
                        price: offer.price,
                        promotionalPrice: offer.promotionalPrice,
                        onPromotion: offer.onPromotion,
                        stock: offer.stock,
                        condition: offer.condition,
                        deliveryTimeValue: offer.deliveryTimeValue,
                        deliveryTimeUnit: offer.deliveryTimeUnit,
                        vendor: offer.vendor,
                        options: offer.productVariant?.options || item.options,
                        customFields: {
                            ...(item.customFields || {}),
                            vendor: offer.vendor,
                            onPromotion: offer.onPromotion,
                            promotionalPrice: offer.promotionalPrice,
                        }
                    });
                }
            } else {
                rawItemsWithOffers.push(item);
            }
        }

        const resolved = processAndResolveDisplayItems(rawItemsWithOffers, context);
        return resolved.map(r => ({
            ...r,
            isMasterResolved: true,
        }));
    } catch (e) {
        console.warn('[expandProductsWithSellerOffers] Fallback to original items:', e);
        return processAndResolveDisplayItems(items, context).map(r => ({ ...r, isMasterResolved: true }));
    }
}
