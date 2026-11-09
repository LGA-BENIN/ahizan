import { ProductCarousel } from "@/components/commerce/product-carousel";
import { query } from "@/lib/vendure/api";
import { GetCollectionProductsQuery, SearchProductsQuery } from "@/lib/vendure/queries";
import { expandProductsWithSellerOffers } from "@/lib/vendure/seller-offers";

interface RelatedProductsProps {
    collectionSlug?: string;
    collectionSlugs?: string[] | string;
    currentProductId: string;
    title?: string;
    productsCount?: number;
}

async function getRelatedProducts(
    collectionSlugsInput: string[] | string | undefined, 
    currentProductId: string
) {
    try {
        let slugs: string[] = [];
        if (Array.isArray(collectionSlugsInput)) {
            slugs = collectionSlugsInput.filter(Boolean);
        } else if (typeof collectionSlugsInput === 'string' && collectionSlugsInput) {
            slugs = [collectionSlugsInput];
        }

        const rawItems: any[] = [];
        const seenProductIds = new Set<string>();
        if (currentProductId) {
            seenProductIds.add(String(currentProductId));
        }

        // 1. Query candidate collections in order of specificity
        for (const slug of slugs) {
            if (!slug || slug === '_root_collection_') continue;
            try {
                const result = await query(GetCollectionProductsQuery, {
                    slug: slug,
                    input: {
                        collectionSlug: slug,
                        take: 16,
                        skip: 0,
                        groupByProduct: true
                    }
                });

                const items = result?.data?.search?.items || [];
                for (const item of items) {
                    const prodId = String(item.productId || item.product?.id || item.id);
                    if (!seenProductIds.has(prodId)) {
                        seenProductIds.add(prodId);
                        rawItems.push(item);
                    }
                }

                // If we have gathered enough candidates, stop querying further collections
                if (rawItems.length >= 12) {
                    break;
                }
            } catch (err) {
                console.warn(`[getRelatedProducts] Error querying collection slug "${slug}":`, err);
            }
        }

        // 2. If fewer than 6 distinct items found, enrich with general catalog products safely
        if (rawItems.length < 6) {
            try {
                const generalResult = await query(SearchProductsQuery, {
                    input: {
                        take: 16,
                        skip: 0,
                        groupByProduct: true
                    }
                });

                for (const item of (generalResult?.data?.search?.items || [])) {
                    const id = String(item.productId || item.product?.id || item.id);
                    if (!seenProductIds.has(id)) {
                        seenProductIds.add(id);
                        rawItems.push(item);
                    }
                }
            } catch (err) {
                console.warn('[getRelatedProducts] Error querying general catalog fallback:', err);
            }
        }

        if (rawItems.length === 0) return [];

        const expanded = await expandProductsWithSellerOffers(rawItems, {
            pageType: 'PDP_SIMILAR',
            maxVariantsPerCentralProduct: 1,
            maxItemsPerVendor: 2,
            boostCertifiedVendors: true,
        });

        // Strict verification: exclude deleted, unapproved, out of stock, or invalid products
        const validProducts = expanded.filter(p => {
            // 1. Exclude current product
            const pId = String(p.productId || p.product?.id || p.id);
            if (pId === String(currentProductId)) return false;

            // 2. Exclude soft-deleted or archived products
            if (p.deletedAt || p.product?.deletedAt) return false;

            // 3. Exclude products without valid active price
            const activePrice = p.price ?? p.winningOffer?.price ?? 0;
            if (!activePrice || activePrice <= 0) return false;

            // 4. Exclude products from unapproved or disabled vendors
            const vendorStatus = p.vendor?.status || p.winningOffer?.vendor?.status;
            if (vendorStatus && vendorStatus !== 'APPROVED') return false;

            // 5. Must have an identifiable title
            if (!p.productName && !p.name) return false;

            return true;
        });

        return validProducts;
    } catch (e) {
        console.warn('[getRelatedProducts] Failed to fetch or expand related products:', e);
        return [];
    }
}

export async function RelatedProducts({ 
    collectionSlug, 
    collectionSlugs, 
    currentProductId, 
    title, 
    productsCount 
}: RelatedProductsProps) {
    const slugs = collectionSlugs || collectionSlug;
    const products = await getRelatedProducts(slugs, currentProductId);
    const limit = productsCount || 8;
    const finalProducts = products.slice(0, limit);

    if (finalProducts.length === 0) {
        return null;
    }

    return (
        <ProductCarousel
            title={title || "Vous aimerez aussi"}
            products={finalProducts}
        />
    );
}
