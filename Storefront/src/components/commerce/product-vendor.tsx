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

import { decodeId } from '@/lib/hash-utils';

interface ProductVendorProps {
    productSlug: string;
    vendorId?: string;
    variantId?: string;
}

export async function ProductVendor({ productSlug, vendorId, variantId }: ProductVendorProps) {
    try {
        const data = await rawQuery(GET_PRODUCT_VENDOR_AND_OFFERS, {
            variables: { slug: productSlug },
        });
        const product = data?.product;
        const vendor = product?.customFields?.vendor;
        const targetVariantId = variantId || product?.variants?.[0]?.id;

        // Fetch seller offers for the target variant
        let offers: any[] = [];
        if (targetVariantId) {
            try {
                const offersData = await rawQuery(GET_SELLER_OFFERS, {
                    variables: { variantId: targetVariantId },
                });
                offers = offersData?.sellerOffersForVariant || [];
            } catch (e) {
                console.warn('[ProductVendor] Could not fetch seller offers:', e);
            }
        }

        // If a specific vendorId was specified in the URL/navigation, prioritize showing that vendor's badge
        if (vendorId) {
            const rawVendorId = decodeId(vendorId) || vendorId;
            const matchedOffer = offers.find(o => String(o.vendor?.id) === String(rawVendorId) || String(o.vendor?.id) === String(vendorId));
            if (matchedOffer?.vendor) {
                return <VendorBadge vendor={matchedOffer.vendor} />;
            }
            if (vendor && (String(vendor.id) === String(rawVendorId) || String(vendor.id) === String(vendorId))) {
                return <VendorBadge vendor={vendor} />;
            }
        }

        // If there are multiple seller offers and no specific vendor was requested, show the multi-vendor panel
        if (offers.length > 1 && !vendorId) {
            return <SellerOffersPanel offers={offers} />;
        }

        // Otherwise show the vendor badge from product or first offer
        const activeVendor = (offers.length > 0 ? offers[0]?.vendor : null) || vendor;
        if (!activeVendor) return null;
        return <VendorBadge vendor={activeVendor} />;
    } catch {
        return null;
    }
}
