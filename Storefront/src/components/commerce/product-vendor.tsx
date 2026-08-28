import { rawQuery } from '@/lib/vendure/raw-api';
import { VendorBadge } from './vendor-badge';
import { SellerOffersPanel } from './seller-offers-panel';

const GET_PRODUCT_VENDOR_AND_OFFERS = `
    query GetProductVendorAndOffers($slug: String!) {
        product(slug: $slug) {
            id
            customFields {
                vendor {
                    id
                    name
                    zone
                    rating
                    ratingCount
                    logo {
                        preview
                    }
                }
            }
            variants {
                id
            }
        }
    }
`;

const GET_SELLER_OFFERS = `
    query GetSellerOffersForVariant($variantId: ID!) {
        sellerOffersForVariant(variantId: $variantId) {
            id
            price
            stock
            deliveryTimeValue
            deliveryTimeUnit
            condition
            vendor {
                id
                name
                rating
                ratingCount
                logo {
                    preview
                }
            }
            productVariant {
                id
            }
        }
    }
`;

interface ProductVendorProps {
    productSlug: string;
}

export async function ProductVendor({ productSlug }: ProductVendorProps) {
    try {
        const data = await rawQuery(GET_PRODUCT_VENDOR_AND_OFFERS, {
            variables: { slug: productSlug },
        });
        const product = data?.product;
        const vendor = product?.customFields?.vendor;
        const firstVariantId = product?.variants?.[0]?.id;

        // Fetch seller offers for the first variant
        let offers: any[] = [];
        if (firstVariantId) {
            try {
                const offersData = await rawQuery(GET_SELLER_OFFERS, {
                    variables: { variantId: firstVariantId },
                });
                offers = offersData?.sellerOffersForVariant || [];
            } catch (e) {
                // silently fail if offers not available
                console.warn('[ProductVendor] Could not fetch seller offers:', e);
            }
        }

        // If there are multiple seller offers, show the multi-vendor panel
        if (offers.length > 1) {
            return <SellerOffersPanel offers={offers} />;
        }

        // Otherwise just show the vendor badge
        if (!vendor) return null;
        return <VendorBadge vendor={vendor} />;
    } catch {
        return null;
    }
}
