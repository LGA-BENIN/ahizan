import type { Metadata } from 'next';
import { query } from '@/lib/vendure/api';
import { GetCollectionProductsQuery, GetCollectionAllowedFacetsQuery, GetProductsQuery } from '@/lib/vendure/queries';
import { ProductGrid } from '@/components/commerce/product-grid';
import { FacetFilters } from '@/components/commerce/facet-filters';
import { getCurrentPage, buildSearchInput } from '@/lib/search-helpers';
import { SITE_NAME } from '@/lib/metadata';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

async function getCollectionMetadata(slug: string) {
    return query(GetCollectionProductsQuery, {
        slug,
        input: { take: 100, collectionSlug: slug, groupByProduct: true },
    });
}

async function getCollectionAllowedFacets(slug: string) {
    try {
        // First get collection by slug to get collectionId
        const collectionResult = await query(GetCollectionProductsQuery, {
            slug,
            input: { take: 0, collectionSlug: slug, groupByProduct: true },
        });
        const collectionId = collectionResult?.data?.collection?.id;
        
        if (!collectionId) return null;
        
        // Then fetch allowed facets for this collection
        return await query(GetCollectionAllowedFacetsQuery, { collectionId });
    } catch (err) {
        console.error('Failed to fetch collection allowed facets:', err);
        return null;
    }
}

export async function generateMetadata({ params }: any): Promise<Metadata> {
    const { slug } = await params;
    const result = await getCollectionMetadata(slug);
    const collection = result?.data?.collection;
    if (!collection) return { title: 'Collection' };
    return { title: collection.name };
}

export default async function CollectionPage({ params, searchParams }: any) {
    try {
        const { slug } = await params;
        const searchParamsResolved = await searchParams;
        const page = getCurrentPage(searchParamsResolved);

        // 1. Get Collection Meta & Allowed Facets
        const [collectionMeta, allowedFacetsData] = await Promise.all([
            getCollectionMetadata(slug),
            getCollectionAllowedFacets(slug)
        ]);

        const collection = collectionMeta?.data?.collection;
        if (!collection) return <div className="mt-20 p-10 text-center font-bold text-xl">Collection non trouvée.</div>;

        const allowedFacets = (allowedFacetsData?.data as any)?.collectionAllowedFacets?.allowedFacets || [];
        const allowedFacetIds = (allowedFacetsData?.data as any)?.collectionAllowedFacets?.allowedFacetIds || [];

        // 2. Try Vendure's native search API with collectionSlug first
        const searchInput = buildSearchInput({ searchParams: searchParamsResolved, collectionSlug: slug });
        const searchResult = await query(GetCollectionProductsQuery, {
            slug,
            input: searchInput,
        });

        const searchData = searchResult?.data?.search;
        let totalItems = searchData?.totalItems || 0;
        let products: any[] = searchData?.items || [];
        let facetValues = searchData?.facetValues || [];

        console.log(`[CollectionPage] slug=${slug} collectionId=${collection.id} searchTotalItems=${totalItems}`);

        // 3. Fallback: if search index is stale (0 results), query products directly
        // and filter by collection membership on the server side
        if (totalItems === 0) {
            try {
                const directResult = await query(GetProductsQuery, {
                    options: { take: 100 }
                });
                const allProducts = (directResult?.data?.products?.items || []) as any[];
                const collectionId = collection.id;

                // Build the list of valid collection IDs : current + all descendants (children + grandchildren)
                const descendantIds = new Set<string>([String(collectionId)]);
                const children = (collection as any).children || [];
                children.forEach((child: any) => {
                    descendantIds.add(String(child.id));
                    (child.children || []).forEach((grandChild: any) => {
                        descendantIds.add(String(grandChild.id));
                    });
                });

                console.log(`[CollectionPage] Fallback: fetched ${allProducts.length} products`);
                console.log(`[CollectionPage] Valid collection IDs (with descendants):`, Array.from(descendantIds));
                allProducts.forEach((p: any) => {
                    const colls = (p.collections || []).map((c: any) => `${c.id}:${c.slug}`).join(',');
                    console.log(`[CollectionPage] Product ${p.id} (${p.name}) collections: [${colls}]`);
                });

                // Filter products that belong to this collection OR any of its descendants
                let collectionProducts = allProducts.filter((p: any) =>
                    (p.collections || []).some((c: any) => descendantIds.has(String(c.id)))
                );
                
                const activeFacetIds = searchInput.facetValueFilters?.map((f: any) => f.and) || [];
                if (activeFacetIds.length > 0) {
                    collectionProducts = collectionProducts.filter((p: any) => {
                        const productFacetIds = (p.facetValues || []).map((fv: any) => String(fv.id));
                        return activeFacetIds.every(id => productFacetIds.includes(String(id)));
                    });
                }

                console.log(`[CollectionPage] Fallback: ${collectionProducts.length} products match collection ${collectionId} or descendants with filters`);

                if (collectionProducts.length > 0) {
                    totalItems = collectionProducts.length;
                    products = collectionProducts.map((p: any) => ({
                        productId: p.id,
                        productName: p.name,
                        slug: p.slug,
                        productAsset: p.featuredAsset,
                        priceWithTax: p.variants?.[0]?.priceWithTax ? {
                            __typename: 'SinglePrice',
                            value: p.variants[0].priceWithTax
                        } : null,
                        currencyCode: 'XOF',
                        description: p.description,
                        collectionIds: (p.collections || []).map((c: any) => c.id),
                        facetValueIds: (p.facetValues || []).map((fv: any) => fv.id),
                        inStock: p.variants?.some((v: any) => v.stockLevel && v.stockLevel !== 'OUT_OF_STOCK')
                    }));

                    // Build facet values from allowed facets + product counts
                    const facetValueCounts = new Map<string, number>();
                    collectionProducts.forEach((p: any) => {
                        (p.facetValues || []).forEach((fv: any) => {
                            facetValueCounts.set(String(fv.id), (facetValueCounts.get(String(fv.id)) || 0) + 1);
                        });
                    });

                    facetValues = [];
                    allowedFacets.forEach((facet: any) => {
                        (facet.values || []).forEach((value: any) => {
                            const count = facetValueCounts.get(String(value.id)) || 0;
                            if (count > 0) {
                                facetValues.push({
                                    count,
                                    facetValue: {
                                        id: value.id,
                                        name: value.name,
                                        facet: { id: facet.id, name: facet.name }
                                    }
                                });
                            }
                        });
                    });
                }
            } catch (e) {
                console.error('[CollectionPage] Fallback query failed:', e);
            }
        }

        // Build productData for ProductGrid/FacetFilters compatibility
        const productData = {
            data: {
                search: {
                    totalItems,
                    items: products,
                    facetValues,
                }
            }
        };

        return (
            <div className="container mx-auto px-4 py-8 mt-16 min-h-screen">
                <div className="mb-8 md:mb-12 border-b pb-6">
                    {/* Breadcrumbs */}
                    <nav className="flex text-xs md:text-sm text-gray-500 mb-4 whitespace-nowrap overflow-x-auto pb-2 scrollbar-hide">
                        <Link href="/" className="hover:text-red-600 font-medium shrink-0">Accueil</Link>
                        <span className="mx-2 shrink-0">/</span>
                        {collection.parent && collection.parent.name !== '__root_collection__' && (
                            <>
                                <Link href={`/collection/${collection.parent.slug}`} className="hover:text-red-600 font-medium shrink-0">
                                    {collection.parent.name}
                                </Link>
                                <span className="mx-2 shrink-0">/</span>
                            </>
                        )}
                        <span className="text-gray-900 font-bold shrink-0">{collection.name}</span>
                    </nav>

                    <h1 className="text-3xl md:text-6xl font-black text-foreground uppercase tracking-tighter drop-shadow-sm">
                        {collection.name}
                    </h1>
                    <p className="text-muted-foreground mt-3 text-sm md:text-lg font-medium">
                        {totalItems} produit{totalItems !== 1 ? 's' : ''} disponible{totalItems !== 1 ? 's' : ''}
                    </p>

                    {/* Subcategories */}
                    {collection.children && collection.children.length > 0 && (
                        <div className="mt-6 flex overflow-x-auto gap-2 pb-2 scrollbar-hide">
                            {collection.children.map((child: any) => (
                                <Link 
                                    key={child.id} 
                                    href={`/collection/${child.slug}`}
                                    className="shrink-0 px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-800 font-bold text-xs md:text-sm rounded-full transition-colors border border-gray-200 shadow-sm"
                                >
                                    {child.name}
                                </Link>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex flex-col lg:flex-row gap-12">
                    {/* Sidebar - Facet Filters */}
                    <aside className="w-full lg:w-1/4 shrink-0">
                        <div className="sticky top-28">
                            {allowedFacets.length > 0 ? (
                                <div className="bg-card p-6 rounded-2xl border shadow-sm">
                                    <FacetFilters 
                                        productData={productData as any} 
                                        allowedFacetIds={allowedFacetIds}
                                        allowedFacets={allowedFacets}
                                    />
                                </div>
                            ) : (
                                <div className="bg-muted/50 p-8 rounded-2xl border border-dashed border-border flex flex-col items-center text-center">
                                    <div className="w-12 h-12 bg-background rounded-full flex items-center justify-center shadow-sm mb-4">
                                        <svg className="w-6 h-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                        </svg>
                                    </div>
                                    <h2 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-4">Navigation</h2>
                                    <ul className="space-y-2 text-sm font-bold">
                                       <li><Link href="/" className="text-primary hover:underline">← Accueil</Link></li>
                                    </ul>
                                </div>
                            )}
                        </div>
                    </aside>

                    {/* Main Grid */}
                    <div className="flex-grow">
                        {totalItems > 0 ? (
                            <ProductGrid 
                                aria-label="Grille de produits"
                                productData={productData as any} 
                                currentPage={page} 
                                take={12} 
                                columns={3} 
                            />
                        ) : (
                            <div className="bg-muted/30 text-muted-foreground p-16 rounded-3xl border border-dashed border-border text-center">
                                <h2 className="text-3xl font-black mb-3 text-foreground tracking-tight">Aucun produit trouvé</h2>
                                <p className="font-medium opacity-80">Cette catégorie ne contient encore aucun produit correspondant à vos critères.</p>
                                <Button asChild variant="outline" className="mt-8 rounded-xl font-bold">
                                    <Link href="/search">Découvrir d'autres produits</Link>
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    } catch (error) {
        console.error('[CollectionPage] Error:', error);
        return <div className="mt-20 p-10 text-center text-destructive font-bold">Erreur lors du chargement de la collection: {(error as any).message}</div>;
    }
}