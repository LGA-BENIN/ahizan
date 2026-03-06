import { ProductCarousel } from "@/components/commerce/product-carousel";
import { cacheLife } from "next/cache";
import { query } from "@/lib/vendure/api";
import { GetCollectionProductsQuery } from "@/lib/vendure/queries";
import { ProductListData } from "@/lib/vendure/cms-queries";

async function getFeaturedCollectionProducts(collectionSlug: string, take: number) {
    'use cache'
    cacheLife('days')

    // Fetch featured products from a specific collection
    const result = await query(GetCollectionProductsQuery, {
        slug: collectionSlug,
        input: {
            collectionSlug,
            take,
            skip: 0,
            groupByProduct: true
        }
    });

    return result.data.search.items;
}


export async function FeaturedProducts({
    collectionSlug = "electronics",
    title = "Featured Products",
    take = 12
}: ProductListData) {
    const products = await getFeaturedCollectionProducts(collectionSlug, take);

    return (
        <ProductCarousel
            title={title}
            products={products}
        />
    )
}