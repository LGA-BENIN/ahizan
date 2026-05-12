import type { Metadata } from 'next';
import { query } from '@/lib/vendure/api';
import { GetCollectionProductsQuery, GetCollectionAllowedFacetsQuery, GetProductsQuery } from '@/lib/vendure/queries';
import { ProductGrid } from '@/components/commerce/product-grid';
import { FacetFilters } from '@/components/commerce/facet-filters';
import { getCurrentPage, buildSearchInput } from '@/lib/search-helpers';
import { SITE_NAME } from '@/lib/metadata';
import Link from 'next/link';

async function getCollectionMetadata(slug: string) {
    try {
        return await query(GetCollectionProductsQuery, {
            slug,
            input: { take: 100, collectionSlug: slug, groupByProduct: true },
        });
    } catch (e) {
        console.warn(`[getCollectionMetadata] Backend unavailable for slug ${slug}`);
        return { data: { collection: null, search: { items: [], totalItems: 0, facetValues: [] } } };
    }
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
        if (!collection) return <div className="mt-20 p-10">Collection not found.</div>;

        const allowedFacets = (allowedFacetsData?.data as any)?.collectionAllowedFacets?.allowedFacets || [];
        const allowedFacetIds = (allowedFacetsData?.data as any)?.collectionAllowedFacets?.allowedFacetIds || [];

        // 2. Try Vendure's native search API with collectionSlug first
        const searchInput = buildSearchInput({ searchParams: searchParamsResolved, collectionSlug: slug });
        let searchResult;
        try {
            searchResult = await query(GetCollectionProductsQuery, {
                slug,
                input: searchInput,
            });
        } catch (e) {
            console.warn('[CollectionPage] Search query failed, using empty results');
            searchResult = { data: { search: { items: [], totalItems: 0, facetValues: [] } } };
        }

        const searchData = searchResult?.data?.search;
        let totalItems = searchData?.totalItems || 0;
        let products = searchData?.items || [];
        let facetValues: any[] = searchData?.facetValues || [];

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
                const collectionProducts = allProducts.filter((p: any) =>
                    (p.collections || []).some((c: any) => descendantIds.has(String(c.id)))
                );

                console.log(`[CollectionPage] Fallback: ${collectionProducts.length} products match collection ${collectionId} or descendants`);

                if (collectionProducts.length > 0) {
                    totalItems = collectionProducts.length;
                    // Use products as-is to preserve fragment types
                    products = collectionProducts as any;

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
                <div className="mb-12 border-b pb-6">
                    <h1 className="text-5xl font-black text-gray-900 uppercase tracking-tighter">
                        {collection.name}
                    </h1>
                    <p className="text-gray-500 mt-2">
                        {totalItems} produit{totalItems !== 1 ? 's' : ''} dans cette catégorie
                    </p>
                </div>

                <div className="flex flex-col lg:flex-row gap-12">
                    {/* Sidebar - Facet Filters */}
                    <aside className="w-full lg:w-1/4 shrink-0">
                        <div className="sticky top-28">
                            {allowedFacets.length > 0 ? (
                                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                    <FacetFilters 
                                        productData={productData} 
                                        allowedFacetIds={allowedFacetIds}
                                        allowedFacets={allowedFacets}
                                    />
                                </div>
                            ) : (
                                <div className="bg-gray-50 p-6 rounded-xl border border-dashed border-gray-300">
                                    <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Navigation</h2>
                                    <ul className="space-y-2 text-sm font-medium">
                                       <li><Link href="/" className="hover:text-red-600">← Retour à l'accueil</Link></li>
                                    </ul>
                                </div>
                            )}
                        </div>
                    </aside>

                    {/* Main Grid */}
                    <div className="flex-grow">
                        {totalItems > 0 ? (
                            <ProductGrid 
                                productData={productData} 
                                currentPage={page} 
                                take={12} 
                                columns={3} 
                            />
                        ) : (
                            <div className="bg-gray-50 text-gray-500 p-10 rounded-xl border border-gray-200 text-center">
                                <h2 className="text-2xl font-bold mb-2">Aucun produit trouvé</h2>
                                <p>Cette catégorie ne contient encore aucun produit.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    } catch (error) {
        console.error('[CollectionPage] Error:', error);
        return <div className="mt-20 p-10">Error loading collection: {(error as any).message}</div>;
    }
}