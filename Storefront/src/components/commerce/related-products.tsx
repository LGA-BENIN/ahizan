import { ProductCarousel } from "@/components/commerce/product-carousel";
import { query } from "@/lib/vendure/api";
import { GetCollectionProductsQuery } from "@/lib/vendure/queries";
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

        // 2. If fewer than 6 distinct items found, enrich with general catalog products
        if (rawItems.length < 6) {
            try {
                const generalResult = await query(GetCollectionProductsQuery, {
                    slug: '',
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
            maxItemsPerVendor: 3,
            boostCertifiedVendors: true,
        });

        return expanded;
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
    const limit = productsCount || 6;
    const finalProducts = products.slice(0, limit);

    if (finalProducts.length === 0) {
        return null;
    }

    return (
        <ProductCarousel
            title={title || "Produits similaires"}
            products={finalProducts}
        />
    );
}
