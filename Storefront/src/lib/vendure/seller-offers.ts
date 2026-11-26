import { getShopApiUrl } from './api-utils';
import { fetchWithClientCache } from './client-cache';
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
            featuredAsset {
                id
                preview
            }
            vendor {
                id
                name
                phoneNumber
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

    // Expand variant lookup up to 150 candidates (supporting rich catalog with real seller offers)
    const variantIds = Array.from(
        new Set(
            items.flatMap(i => {
                if (i.productVariantId) return [String(i.productVariantId)];
                if (Array.isArray(i.variants) && i.variants.length > 0) {
                    return i.variants.map((v: any) => String(v.id)).filter(Boolean);
                }
                if (i.productVariant?.id) return [String(i.productVariant.id)];
                if (i.id) return [String(i.id)];
                return [];
            }).filter(Boolean)
        )
    ).slice(0, 150);

    if (variantIds.length === 0) return items;

    try {
        const res = await fetchWithClientCache(getShopApiUrl(), GET_SELLER_OFFERS_FOR_VARIANTS, {
            variantIds,
        });

        const offers: any[] = res?.sellerOffersForVariants || [];
        
        // Prepare items with attached offers (ONLY variants with active seller offers)
        const rawItemsWithOffers: any[] = [];
        for (const item of items) {
            const itemVariantIds = new Set<string>();
            if (item.productVariantId) itemVariantIds.add(String(item.productVariantId));
            if (item.productVariant?.id) itemVariantIds.add(String(item.productVariant.id));
            if (Array.isArray(item.variants)) {
                for (const v of item.variants) {
                    if (v?.id) itemVariantIds.add(String(v.id));
                }
            }
            if (item.id) itemVariantIds.add(String(item.id));

            const matchingOffers = offers.filter(
                o => itemVariantIds.has(String(o.productVariant?.id)) && o.vendor?.id
            );

            if (matchingOffers.length > 0) {
                for (const offer of matchingOffers) {
                    const vId = String(offer.productVariant?.id);
                    const rawAssetObj = offer.featuredAsset 
                        || offer.productVariant?.featuredAsset 
                        || offer.productVariant?.product?.featuredAsset 
                        || item.featuredAsset 
                        || item.productVariantAsset 
                        || item.productAsset 
                        || (typeof item.productPreview === 'string' ? { preview: item.productPreview } : item.productPreview);

                    rawItemsWithOffers.push({
                        ...item,
                        productId: item.productId || item.product?.id || offer.productVariant?.product?.id || item.id,
                        productName: item.productName || item.name || offer.productVariant?.product?.name,
                        productAsset: rawAssetObj,
                        productPreview: rawAssetObj?.preview || item.productPreview,
                        featuredAsset: rawAssetObj,
                        productVariantAsset: offer.productVariant?.featuredAsset || rawAssetObj,
                        productVariantId: vId,
                        productVariantName: offer.productVariant?.name || item.productVariantName,
                        productVariant: {
                            ...(offer.productVariant || item.productVariant),
                            featuredAsset: offer.productVariant?.featuredAsset || rawAssetObj,
                        },
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
            }
            // IMPORTANT: If matchingOffers.length === 0, the declination has no seller offer
            // and must NOT be added to the storefront catalogue.
        }

        const resolved = processAndResolveDisplayItems(rawItemsWithOffers, context);
        return resolved.map(r => ({
            ...r,
            isMasterResolved: true,
        }));
    } catch (e) {
        console.warn('[expandProductsWithSellerOffers] Failed to fetch seller offers:', e);
        return [];
    }
}
