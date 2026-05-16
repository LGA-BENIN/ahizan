import Link from "next/link";
import { ProductCarousel } from "@/components/commerce/product-carousel";
import { cacheLife } from "next/cache";
import { query } from "@/lib/vendure/api";
import { SearchProductsQuery } from "@/lib/vendure/queries";

interface ProductGridProps {
    title?: string;
    description?: string;
    layout?: 'grid' | 'carousel' | 'list';
    collectionSlug?: string;
    filterType?: string;
    productIds?: string[];
    take?: number;
    products?: any[];
}

function formatCFA(price: number): string {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(price / 100);
}

function getPrice(product: any): number {
    if (product.priceWithTax?.__typename === 'SinglePrice') return product.priceWithTax.value;
    return product.priceWithTax?.min ?? 0;
}

async function fetchProducts(filterType: string, collectionSlug: string, take: number) {
    'use cache'
    cacheLife('hours')

    const sort: any = {};
    if (filterType === 'BEST_SELLERS') sort.price = 'DESC';

    try {
        const result = await query(SearchProductsQuery, {
            input: {
                take,
                skip: 0,
                sort,
                groupByProduct: true,
                ...(filterType === 'COLLECTION' && collectionSlug ? { collectionSlug } : {})
            }
        });
        return result.data.search.items;
    } catch (e) {
        console.error(`[PRODUCT_GRID] Failed to fetch products (filterType=${filterType})`, e);
        return [];
    }
}

export async function FeaturedProducts({
    filterType = "LATEST",
    collectionSlug = "",
    title,
    description,
    layout = "carousel",
    take = 12,
    productIds,
    products: manualProducts
}: ProductGridProps) {

    let products = manualProducts || [];

    if (products.length === 0) {
        products = await fetchProducts(filterType, collectionSlug, take);
    }

    if (productIds && productIds.length > 0 && products.length > 0) {
        const idSet = new Set(productIds);
        products = products.filter((p: any) => idSet.has(p.productId?.toString()) || idSet.has(p.id?.toString()));
    }

    // Ensure all products have slugs - if manual products only have IDs, we need info.
    // However, usually these manual products from CMS already come with slugs if stored correctly.
    // If slugs are missing, we log a warning as a safety measure.
    products.forEach((p: any) => {
        if (!p.slug && (p.productId || p.id)) {
            console.warn(`[FeaturedProducts] Product ${p.productName || p.id} is missing a slug! Link to product page will be broken.`);
        }
    });

    const sectionTitle = title || (
        filterType === 'LATEST' ? "Nouveaux Arrivages" :
        filterType === 'BEST_SELLERS' ? "Meilleures Ventes" :
        filterType === 'COLLECTION' ? "Sélection" :
        "Produits Sélectionnés"
    );

    if (products.length === 0) return null;

    return (
        <section className="container mx-auto px-4 py-10">
            {(sectionTitle || description) && (
                <div className="mb-10 text-left">
                    {sectionTitle && <h2 className="text-2xl md:text-3xl font-black tracking-tight mb-3 uppercase leading-none">{sectionTitle}</h2>}
                    {description && <p className="text-muted-foreground font-medium text-base max-w-2xl">{description}</p>}
                    <div className="h-1 w-16 bg-primary mt-4 rounded-full" />
                </div>
            )}

            {layout === 'list' ? (
                <div className="space-y-4">
                    {products.map((product: any) => (
                        <Link key={product.productId} href={`/product/${product.slug}`}
                            className="group flex items-center gap-4 bg-card rounded-xl p-3 shadow-sm hover:shadow-lg transition-all border border-transparent hover:border-muted no-underline text-inherit">
                            <div className="w-20 h-20 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
                                <img src={product.productAsset?.preview || '/placeholder.png'} alt={product.productName}
                                    className="object-cover w-full h-full group-hover:scale-105 transition-transform" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-sm truncate">{product.productName}</h3>
                                <p className="text-primary font-black text-sm mt-1">{formatCFA(getPrice(product))}</p>
                            </div>
                        </Link>
                    ))}
                </div>
            ) : layout === 'grid' ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                    {products.map((product: any) => (
                        <Link key={product.productId} href={`/product/${product.slug}`}
                            className="group relative bg-card rounded-2xl p-3 md:p-4 shadow-sm hover:shadow-xl transition-all border border-transparent hover:border-muted overflow-hidden flex flex-col no-underline text-inherit">
                            <div className="aspect-square relative mb-3 overflow-hidden rounded-xl bg-muted">
                                <img src={product.productAsset?.preview || '/placeholder.png'} alt={product.productName}
                                    className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-500" />
                            </div>
                            <h3 className="font-bold text-xs md:text-sm mb-1 truncate">{product.productName}</h3>
                            <p className="text-primary font-black text-sm mt-auto">{formatCFA(getPrice(product))}</p>
                        </Link>
                    ))}
                </div>
            ) : (
                <ProductCarousel title="" products={products} />
            )}
        </section>
    );
}
