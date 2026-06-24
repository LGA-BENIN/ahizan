import { ProductCarousel } from "@/components/commerce/product-carousel";
import { cacheLife, cacheTag } from "next/cache";
import { query } from "@/lib/vendure/api";
import { GetCollectionProductsQuery } from "@/lib/vendure/queries";
import { readFragment } from "@/graphql";
import { ProductCardFragment } from "@/lib/vendure/fragments";

interface RelatedProductsProps {
    collectionSlug: string;
    currentProductId: string;
    title?: string;
    productsCount?: number;
}

async function getRelatedProducts(collectionSlug: string, currentProductId: string) {

    const result = await query(GetCollectionProductsQuery, {
        slug: collectionSlug,
        input: {
            collectionSlug: collectionSlug,
            take: 20, // Fetch extra to account for filtering out current product
            skip: 0,
            groupByProduct: true
        }
    });

    // Filter out the current product
    return result.data.search.items
        .filter((item: any) => {
            const product = readFragment(ProductCardFragment, item);
            return product.productId !== currentProductId;
        });
}

export async function RelatedProducts({ collectionSlug, currentProductId, title, productsCount }: RelatedProductsProps) {
    const products = await getRelatedProducts(collectionSlug, currentProductId);
    const limit = productsCount || 4;
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
