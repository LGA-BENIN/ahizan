import { ProductCarousel } from "@/components/commerce/product-carousel";
import { query } from "@/lib/vendure/api";
import { GetVendorProductQuery } from "@/lib/vendure/queries";

interface RelatedProductsProps {
    collectionSlug: string;
    currentProductId: string;
}

async function getRelatedProducts(collectionSlug: string, currentProductId: string) {
    // Seller dashboard doesn't need related products
    return [];
}

export async function RelatedProducts({ collectionSlug, currentProductId }: RelatedProductsProps) {
    const products = await getRelatedProducts(collectionSlug, currentProductId);

    if (products.length === 0) {
        return null;
    }

    return (
        <ProductCarousel
            title="Related Products"
            products={products}
        />
    );
}
