import {Suspense} from "react";
import {FacetFilters} from "@/components/commerce/facet-filters";
import {ProductGridSkeleton} from "@/components/shared/product-grid-skeleton";
import {ProductGrid} from "@/components/commerce/product-grid";
import {buildSearchInput, getCurrentPage} from "@/lib/search-helpers";
import {query} from "@/lib/vendure/api";
import {SearchProductsQuery} from "@/lib/vendure/queries";

interface SearchResultsProps {
    searchParams: Promise<{
        page?: string
    }>
}

export async function SearchResults({searchParams}: SearchResultsProps) {
    const searchParamsResolved = await searchParams;
    const page = getCurrentPage(searchParamsResolved);

    let productData;
    try {
        productData = await query(SearchProductsQuery, {
            input: buildSearchInput({searchParams: searchParamsResolved})
        });
    } catch (e) {
        console.warn('[SearchResults] Backend unavailable, using empty results');
        productData = { data: { search: { items: [], totalItems: 0, facetValues: [] } } };
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Filters Sidebar */}
            <aside className="lg:col-span-1">
                <Suspense fallback={<div className="h-64 animate-pulse bg-muted rounded-lg"/>}>
                    <FacetFilters productData={productData}/>
                </Suspense>
            </aside>

            {/* Product Grid */}
            <div className="lg:col-span-3">
                <Suspense fallback={<ProductGridSkeleton/>}>
                    <ProductGrid productData={productData} currentPage={page} take={12}/>
                </Suspense>
            </div>
        </div>
    )
}