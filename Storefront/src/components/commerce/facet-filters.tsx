'use client';

import { use } from 'react';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { ResultOf } from '@/graphql';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {SearchProductsQuery} from "@/lib/vendure/queries";

interface FacetFiltersProps {
    productData: {
        data: ResultOf<typeof SearchProductsQuery>;
        token?: string;
    };
    allowedFacetIds?: string[];
    allowedFacets?: Array<{
        id: string;
        name: string;
        values: Array<{ id: string; name: string }>;
    }>;
}

export function FacetFilters({ productData, allowedFacetIds, allowedFacets }: FacetFiltersProps) {
    const searchResult = productData.data.search;
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const router = useRouter();

    // Group facet values by facet
    interface FacetGroup {
        id: string;
        name: string;
        values: Array<{ id: string; name: string; count: number }>;
    }

    // Initialize facet groups from allowedFacets if provided
    const facetGroups: Record<string, FacetGroup> = {};

    if (allowedFacets && allowedFacets.length > 0) {
        allowedFacets.forEach(facet => {
            const facetId = String(facet.id);
            // Only include if it's in the allowed list (if list exists)
            if (!allowedFacetIds || allowedFacetIds.length === 0 || allowedFacetIds.includes(facetId)) {
                facetGroups[facetId] = {
                    id: facetId,
                    name: facet.name,
                    values: facet.values.map(v => ({
                        id: v.id,
                        name: v.name,
                        count: 0
                    }))
                };
            }
        });
    }

    // Merge or Add facets from search results
    searchResult.facetValues.forEach(item => {
        const facet = item.facetValue.facet;
        const facetId = String(facet.id);
        const fv = item.facetValue;

        // Check if this facet is allowed
        const isAllowed = !allowedFacetIds || allowedFacetIds.length === 0 || allowedFacetIds.includes(facetId);
        if (!isAllowed) return;

        if (!facetGroups[facetId]) {
            facetGroups[facetId] = {
                id: facetId,
                name: facet.name,
                values: []
            };
        }

        const existingValue = facetGroups[facetId].values.find(v => v.id === fv.id);
        if (existingValue) {
            existingValue.count = item.count;
        } else {
            facetGroups[facetId].values.push({
                id: fv.id,
                name: fv.name,
                count: item.count
            });
        }
    });

    // Remove groups that ended up with no values
    const activeFacetGroups = Object.values(facetGroups).filter(g => g.values.length > 0);

    const selectedFacets = searchParams.getAll('facets');

    const toggleFacet = (facetId: string) => {
        const params = new URLSearchParams(searchParams);
        const current = params.getAll('facets');

        if (current.includes(facetId)) {
            params.delete('facets');
            current.filter(id => id !== facetId).forEach(id => params.append('facets', id));
        } else {
            params.append('facets', facetId);
        }

        // Reset to page 1 when filters change
        params.delete('page');

        router.push(`${pathname}?${params.toString()}`);
    };

    const clearFilters = () => {
        const params = new URLSearchParams(searchParams);
        params.delete('facets');
        params.delete('page');
        router.push(`${pathname}?${params.toString()}`);
    };

    const hasActiveFilters = selectedFacets.length > 0;

    return (
        <div className="space-y-6 text-foreground">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <h2 className="font-bold text-sm uppercase tracking-wider text-[#002f6c]">Filters</h2>
                {hasActiveFilters && (
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={clearFilters}
                        className="h-7 px-2 text-[10px] uppercase font-bold text-[#e31837] hover:bg-red-50"
                    >
                        Clear all
                    </Button>
                )}
            </div>

            {activeFacetGroups.map((facet) => (
                <div key={facet.id} className="space-y-3">
                    <h3 className="font-black text-[10px] uppercase tracking-widest text-gray-400">{facet.name}</h3>
                    <div className="space-y-2">
                        {facet.values.map((value) => {
                            const isChecked = selectedFacets.includes(value.id);
                            return (
                                <div key={value.id} className="flex items-center space-x-2 group">
                                    <Checkbox
                                        id={value.id}
                                        checked={isChecked}
                                        onCheckedChange={() => toggleFacet(value.id)}
                                        className="border-gray-300 data-[state=checked]:bg-[#002f6c] data-[state=checked]:border-[#002f6c]"
                                    />
                                    <Label
                                        htmlFor={value.id}
                                        className="text-xs font-bold text-gray-700 cursor-pointer flex items-center justify-between w-full group-hover:text-[#002f6c] transition-colors"
                                    >
                                        <span>{value.name}</span>
                                        <span className="text-[10px] font-medium text-gray-300 bg-gray-50 px-1.5 py-0.5 rounded-full">
                                            {value.count}
                                        </span>
                                    </Label>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
}
