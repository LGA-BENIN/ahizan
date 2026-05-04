import type { Metadata } from 'next';
import { query } from '@/lib/vendure/api';
import { GetCollectionProductsQuery, GetCollectionAllowedFacetsQuery, GetProductsQuery } from '@/lib/vendure/queries';
import { ProductGrid } from '@/components/commerce/product-grid';
import { FacetFilters } from '@/components/commerce/facet-filters';
import { getCurrentPage } from '@/lib/search-helpers';
import { SITE_NAME } from '@/lib/metadata';
import { getBannerApiUrl } from '@/lib/vendure/api-utils';
import Link from 'next/link';

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

        console.log(`[CollectionPage] Starting collection page for slug: ${slug}`);

        // 1. Get Collection Meta & Allowed Facets
        const [collectionMeta, allowedFacetsData] = await Promise.all([
            getCollectionMetadata(slug),
            getCollectionAllowedFacets(slug) // Will use slug to get collectionId inside
        ]);

        const collection = collectionMeta?.data?.collection;
        if (!collection) return <div className="mt-20 p-10">Collection not found.</div>;

        // Get allowed facets for this collection
        const allowedFacets = (allowedFacetsData?.data as any)?.collectionAllowedFacets?.allowedFacets || [];
        const allowedFacetIds = (allowedFacetsData?.data as any)?.collectionAllowedFacets?.allowedFacetIds || [];
        
        console.log(`[CollectionPage] Collection: ${collection.name} (id: ${collection.id})`);
        console.log(`[CollectionPage] Allowed facets: ${allowedFacets.length}, IDs: ${JSON.stringify(allowedFacetIds)}`);

        // 2. Fetch ALL products directly from DB (bypassing search index)
        let allProducts: any[] = [];
        try {
            const productsResult = await query(GetProductsQuery, {
                options: { take: 100 }
            });
            allProducts = (productsResult?.data?.products?.items || []) as any[];
            console.log(`[CollectionPage] Direct DB fetch: ${allProducts.length} products total`);
        } catch (e) {
            console.error('[CollectionPage] Failed to fetch products directly:', e);
        }

        // Build productData structure for ProductGrid compatibility
        let productData: any = {
            data: {
                search: {
                    totalItems: allProducts.length,
                    items: allProducts.map((p: any) => ({
                        productId: p.id,
                        productName: p.name,
                        slug: p.slug,
                        productAsset: p.featuredAsset,
                        priceWithTax: p.variants?.[0]?.priceWithTax ? { 
                            __typename: 'SinglePrice', 
                            value: p.variants[0].priceWithTax 
                        } : null,
                        currencyCode: 'USD',
                        description: p.description,
                        collectionIds: p.collections?.map((c: any) => c.id) || [],
                        facetValueIds: p.facetValues?.map((fv: any) => fv.id) || [],
                        inStock: p.variants?.some((v: any) => v.stockLevel && v.stockLevel !== 'OUT_OF_STOCK')
                    })),
                    facetValues: []
                }
            }
        };
        console.log(`[CollectionPage] Built productData with ${productData.data.search.totalItems} products`);

        // 3. Filter products by collection membership and selected facets
        let collectionProducts = productData?.data?.search?.items || [];
        const collectionId = collection.id;
        
        // First: filter by collection - only show products in this collection
        collectionProducts = collectionProducts.filter((product: any) => {
            const inCollection = (product.collectionIds || []).includes(collectionId);
            return inCollection;
        });
        console.log(`[CollectionPage] After collection filter: ${collectionProducts.length} products`);
        
        // Fallback: if no products in collection, show all products with warning (backend fix needed)
        let filteredProducts = collectionProducts;
        if (collectionProducts.length === 0 && productData?.data?.search?.items?.length > 0) {
            console.log(`[CollectionPage] WARNING: No products in collection ${collectionId}, showing all products`);
            filteredProducts = productData.data.search.items;
        }
        
        // Second: filter by selected facet values from URL
        const selectedFacetValueIds = Array.isArray(searchParamsResolved?.facets) 
            ? searchParamsResolved.facets 
            : (searchParamsResolved?.facets ? [searchParamsResolved.facets] : []);
        
        if (selectedFacetValueIds.length > 0) {
            filteredProducts = filteredProducts.filter((product: any) => {
                const productFacetValueIds = new Set((product.facetValueIds || []).map(String));
                const hasAllSelected = selectedFacetValueIds.every((selectedId: string) =>
                    productFacetValueIds.has(String(selectedId))
                );
                return hasAllSelected;
            });
            console.log(`[CollectionPage] After facet filter: ${filteredProducts.length} products`);
        }

        // Update productData with filtered products
        if (productData?.data?.search) {
            productData.data.search.items = filteredProducts;
            productData.data.search.totalItems = filteredProducts.length;
            
            // Build facetValues counts from ALL collection products (not just filtered)
            // This ensures facet counts are based on the collection, not current filter
            const facetValueCounts = new Map<string, number>();
            collectionProducts.forEach((product: any) => {
                (product.facetValueIds || []).forEach((fvId: string) => {
                    facetValueCounts.set(fvId, (facetValueCounts.get(fvId) || 0) + 1);
                });
            });
            
            // Build facetValues array from actual products' facet values
            // Group by facet for the FacetFilters component
            const facetValueMap = new Map<string, any>();
            collectionProducts.forEach((product: any) => {
                (product.facetValueIds || []).forEach((fvId: string) => {
                    if (!facetValueMap.has(fvId)) {
                        // Find the facet info from the product's facetValues if available
                        // Fallback: just use the ID
                        facetValueMap.set(fvId, { id: fvId, name: fvId, facetId: '', facetName: 'Filter' });
                    }
                });
            });
            
            // Build facetValues array for FacetFilters from allowedFacets config + actual counts
            productData.data.search.facetValues = [];
            allowedFacets.forEach((facet: any) => {
                (facet.values || []).forEach((value: any) => {
                    const count = facetValueCounts.get(value.id) || 0;
                    if (count > 0) { // Only show facets that exist on products
                        productData.data.search.facetValues.push({
                            count,
                            facetValue: {
                                id: value.id,
                                name: value.name,
                                facet: {
                                    id: facet.id,
                                    name: facet.name
                                }
                            }
                        });
                    }
                });
            });
        }

        return (
            <div className="container mx-auto px-4 py-8 mt-16 min-h-screen">
                {/* Debug Info */}
                <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded text-xs">
                    <strong>Debug Info:</strong>
                    <br/>Collection: {collection.name} (id: {collection.id})
                    <br/>Allowed facets: {allowedFacets.length} (IDs: {JSON.stringify(allowedFacetIds)})
                    <br/>Total products in DB: {allProducts.length}
                    <br/>Products in this collection: {collectionProducts.length}
                    <br/>Products after facet filter: {filteredProducts.length}
                    <br/>Selected facets: {selectedFacetValueIds.join(', ') || 'None'}
                    {collectionProducts.length === 0 && allProducts.length > 0 && (
                        <><br/><strong className="text-red-600">WARNING: No products assigned to this collection in database!</strong></>
                    )}
                </div>

                <div className="mb-12 border-b pb-6">
                    <h1 className="text-5xl font-black text-gray-900 uppercase tracking-tighter">
                        {collection.name}
                    </h1>
                    <p className="text-gray-500 mt-2 font-mono">
                        {allowedFacetIds.length > 0 
                            ? `Facet-based filtering (${allowedFacets.length} facets, ${filteredProducts.length} products)`
                            : `Direct Database Access (${filteredProducts.length} products)`
                        }
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
                                       <li><Link href="/" className="hover:text-red-600">← Back to Home</Link></li>
                                    </ul>
                                </div>
                            )}
                        </div>
                    </aside>

                    {/* Main Grid */}
                    <div className="flex-grow">
                        {filteredProducts.length > 0 ? (
                            <ProductGrid 
                                productData={productData} 
                                currentPage={page} 
                                take={12} 
                                columns={3} 
                            />
                        ) : (
                            <div className="bg-red-50 text-red-600 p-10 rounded-xl border border-red-200 text-center">
                                <h2 className="text-2xl font-bold mb-2">No Products Found</h2>
                                <p>
                                    {allowedFacetIds.length > 0 
                                        ? 'No products match the facet criteria for this collection.'
                                        : 'No products available in the database.'}
                                </p>
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