import Link from "next/link";
import { ProductCarousel } from "@/components/commerce/product-carousel";
import { cacheLife } from "next/cache";
import { query } from "@/lib/vendure/api";
import { GetCollectionProductsQuery } from "@/lib/vendure/queries";

interface ProductGridProps {
    title?: string;
    description?: string;
    layout?: 'grid' | 'carousel';
    collectionSlug?: string;
    take?: number;
    products?: any[]; // For manual selection
}

import { SearchProductsQuery } from "@/lib/vendure/queries";

async function getFeaturedProducts(filterType: string, collectionSlug: string, take: number) {
    'use cache'
    cacheLife('days')

    const sort: any = {};
    const filter: any = {};

    if (filterType === 'LATEST') {
        // SearchResultSortParameter doesn't support createdAt by default in Vendure
        // We'll leave it empty to use default search relevance/order
    } else if (filterType === 'BEST_SELLERS') {
        sort.price = 'DESC';
    }

    if (filterType === 'COLLECTION' && collectionSlug) {
        filter.collectionSlug = { eq: collectionSlug };
    }

    try {
        const result = await query(SearchProductsQuery, {
            input: {
                take,
                skip: 0,
                sort,
                groupByProduct: true,
                ...(collectionSlug && filterType === 'COLLECTION' ? { collectionSlug } : {})
            }
        });
        return result.data.search.items;
    } catch (e) {
        console.error(`Failed to fetch featured products`, e);
        return [];
    }
}

export async function FeaturedProducts({
    filterType = "LATEST",
    collectionSlug = "electronics",
    title,
    description,
    layout = "carousel",
    take = 12,
    products: manualProducts
}: ProductGridProps & { filterType?: string }) {

    const products = manualProducts || (await getFeaturedProducts(filterType, collectionSlug, take));
    const sectionTitle = title || (filterType === 'LATEST' ? "Nouveaux Arrivages" : filterType === 'BEST_SELLERS' ? "Meilleures Ventes" : "Produits Sélectionnés");

    if (products.length === 0) return null;

    return (
        <section className="container mx-auto px-4 py-10">
            {(sectionTitle || description) && (
                <div className="mb-14 text-left">
                    {sectionTitle && <h2 className="text-2xl md:text-4xl font-black tracking-tight mb-4 uppercase italic leading-none">{sectionTitle}</h2>}
                    {description && <p className="text-muted-foreground font-medium text-base max-w-2xl">{description}</p>}
                    <div className="h-1 w-20 bg-primary mt-6 rounded-full shadow-lg shadow-primary/20" />
                </div>
            )}

            {layout === 'grid' ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {products.map((product: any) => (
                        <Link 
                            key={product.id} 
                            href={`/product/${product.slug}`}
                            className="group relative bg-white rounded-2xl p-4 shadow-sm hover:shadow-xl transition-all border border-transparent hover:border-muted overflow-hidden flex flex-col no-underline text-inherit"
                        >
                            <div className="aspect-square relative mb-4 overflow-hidden rounded-xl bg-muted">
                                <img
                                    src={product.productAsset?.preview || '/placeholder.png'}
                                    alt={product.productName}
                                    className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-700"
                                />
                            </div>
                            <h3 className="font-bold text-sm md:text-base mb-1 truncate">{product.productName}</h3>
                            <p className="text-primary font-black mt-auto">
                                {product.priceWithTax?.__typename === 'SinglePrice' 
                                    ? (product.priceWithTax.value / 100) 
                                    : (product.priceWithTax?.min / 100)} {product.currencyCode}
                            </p>
                        </Link>
                    ))}
                </div>
            ) : (
                <ProductCarousel
                    title="" // Pass empty as we render our own header
                    products={products}
                />
            )}
        </section>
    )
}
