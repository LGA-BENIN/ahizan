import {ProductCarousel} from "@/components/commerce/product-carousel";
import {query} from "@/lib/vendure/api";

async function getFeaturedCollectionProducts() {
    // Seller dashboard doesn't need featured products
    return [];
}


export async function FeaturedProducts() {
    const products = await getFeaturedCollectionProducts();

    return (
        <ProductCarousel
            title="Featured Products"
            products={products}
        />
    )
}