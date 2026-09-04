import { rawQuery } from './raw-api';

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
                logo {
                    preview
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
                product {
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
 * Expands a list of SearchResult/Product items into individual Seller Offer cards.
 * If a variant has multiple approved seller offers (e.g. Seller A @ 1000 and Seller B @ 9889),
 * each seller's offer is presented as a distinct card with their price, image, and vendor badge.
 */
export async function expandProductsWithSellerOffers(items: any[]): Promise<any[]> {
    if (!items || items.length === 0) return [];

    const variantIds = Array.from(
        new Set(items.map(i => i.productVariantId || i.id).filter(Boolean))
    );

    if (variantIds.length === 0) return items;

    try {
        const res = await rawQuery(GET_SELLER_OFFERS_FOR_VARIANTS, {
            variables: { variantIds },
        });

        const offers: any[] = res?.sellerOffersForVariants || [];
        if (offers.length === 0) return items;

        const expanded: any[] = [];

        for (const item of items) {
            const vId = String(item.productVariantId || item.id);
            const matchingOffers = offers.filter(
                o => String(o.productVariant?.id) === vId
            );

            if (matchingOffers.length > 0) {
                for (const offer of matchingOffers) {
                    const offerAsset = offer.productVariant?.featuredAsset
                        || offer.productVariant?.product?.featuredAsset
                        || item.productVariantAsset
                        || item.productAsset;
                    const effectivePrice = offer.onPromotion && offer.promotionalPrice ? offer.promotionalPrice : offer.price;

                    expanded.push({
                        ...item,
                        id: `${item.id || item.productId}-offer-${offer.id}`,
                        productVariantId: vId,
                        vendorId: offer.vendor?.id,
                        vendorName: offer.vendor?.name,
                        marketName: offer.vendor?.physicalMarket?.name,
                        locationName: offer.vendor?.location?.name,
                        priceWithTax: {
                            __typename: 'SinglePrice',
                            value: effectivePrice,
                        },
                        price: effectivePrice,
                        productVariantAsset: offerAsset,
                        productAsset: item.productAsset || offerAsset,
                        inStock: offer.stock > 0,
                    });
                }
            } else {
                expanded.push(item);
            }
        }

        return expanded;
    } catch (e) {
        console.warn('[expandProductsWithSellerOffers] Fallback to original items:', e);
        return items;
    }
}
