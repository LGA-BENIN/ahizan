'use client';

import { use, useState } from 'react';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { ResultOf } from '@/graphql';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {SearchProductsQuery} from "@/lib/vendure/queries";
import { ChevronDown, ChevronUp } from 'lucide-react';

interface FacetFiltersProps {
    productData?: {
        data: ResultOf<typeof SearchProductsQuery>;
        token?: string;
    };
    productDataPromise?: Promise<{
        data: ResultOf<typeof SearchProductsQuery>;
        token?: string;
    }>;
    allowedFacetIds?: string[];
    allowedFacets?: Array<{
        id: string;
        name: string;
        values: Array<{ id: string; name: string }>;
    }>;
}

export function FacetFilters({ productData, productDataPromise, allowedFacetIds, allowedFacets }: FacetFiltersProps) {
    const resolvedData = productData || (productDataPromise ? use(productDataPromise) : null);
    const searchResult = resolvedData?.data?.search;
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const router = useRouter();

    const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
    const initialMin = searchParams.get('minPrice') || '';
    const initialMax = searchParams.get('maxPrice') || '';
    const [minPrice, setMinPrice] = useState(initialMin);
    const [maxPrice, setMaxPrice] = useState(initialMax);

    if (!searchResult) {
        return <div className="text-sm text-gray-500">No filter data available</div>;
    }

    // Group facet values by facet
    interface FacetGroup {
        id: string;
        name: string;
        values: Array<{ id: string; name: string; count: number }>;
    }

    // Initialize facet groups from allowedFacets if provided
    const facetGroups: Record<string, FacetGroup> = {};

    // Build facet groups from allowedFacets (already filtered for this collection)
    if (allowedFacets && allowedFacets.length > 0) {
        allowedFacets.forEach(facet => {
            const facetId = String(facet.id);
            facetGroups[facetId] = {
                id: facetId,
                name: facet.name,
                values: facet.values.map(v => ({
                    id: v.id,
                    name: v.name,
                    count: 0
                }))
            };
        });
    }

    // Merge or Add facets from search results
    const searchFacetValues = searchResult?.facetValues || [];
    searchFacetValues.forEach(item => {
        const facet = item.facetValue.facet;
        const facetId = String(facet.id);
        const fv = item.facetValue;

        // Check if allowedFacetIds is explicitly provided (e.g. on a collection page)
        const isAllowed = allowedFacetIds !== undefined
            ? allowedFacetIds.includes(facetId)
            : true;
            
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

    const toggleGroup = (groupId: string) => {
        setCollapsedGroups(prev => ({
            ...prev,
            [groupId]: !prev[groupId]
        }));
    };

    const applyPriceFilter = () => {
        const params = new URLSearchParams(searchParams);
        const minVal = minPrice ? parseFloat(minPrice) : NaN;
        const maxVal = maxPrice ? parseFloat(maxPrice) : NaN;

        if (!isNaN(minVal) && minVal >= 0) {
            params.set('minPrice', String(minVal));
        } else {
            params.delete('minPrice');
        }

        if (!isNaN(maxVal) && maxVal >= 0) {
            params.set('maxPrice', String(maxVal));
        } else {
            params.delete('maxPrice');
        }
        params.delete('page');
        router.push(`${pathname}?${params.toString()}`);
    };

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
        params.delete('minPrice');
        params.delete('maxPrice');
        params.delete('page');
        setMinPrice('');
        setMaxPrice('');
        router.push(`${pathname}?${params.toString()}`);
    };

    const hasActiveFilters = selectedFacets.length > 0 || !!searchParams.get('minPrice') || !!searchParams.get('maxPrice');

    return (
        <div className="space-y-6 text-foreground">
            <div className="flex items-center justify-between border-b pb-4">
                <h2 className="font-black text-xs uppercase tracking-[0.2em] text-muted-foreground/80">Filtres</h2>
                {hasActiveFilters && (
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={clearFilters}
                        className="h-8 px-3 text-[10px] uppercase font-black text-primary hover:bg-primary/5 rounded-lg"
                    >
                        Réinitialiser
                    </Button>
                )}
            </div>

            {/* Price Filter Section */}
            <div className="space-y-3 pb-4 border-b border-muted-foreground/10">
                <h3 className="font-black text-[11px] uppercase tracking-widest text-foreground/70 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                    Filtrer par Prix
                </h3>
                <div className="flex items-center gap-2 pl-1">
                    <input
                        type="number"
                        placeholder="Min"
                        min="0"
                        value={minPrice}
                        onChange={(e) => {
                            const val = e.target.value;
                            if (val === '' || parseFloat(val) >= 0) {
                                setMinPrice(val);
                            }
                        }}
                        className="w-full bg-background border border-muted-foreground/20 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary font-bold text-center"
                    />
                    <span className="text-muted-foreground text-xs font-bold">-</span>
                    <input
                        type="number"
                        placeholder="Max"
                        min="0"
                        value={maxPrice}
                        onChange={(e) => {
                            const val = e.target.value;
                            if (val === '' || parseFloat(val) >= 0) {
                                setMaxPrice(val);
                            }
                        }}
                        className="w-full bg-background border border-muted-foreground/20 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary font-bold text-center"
                    />
                    <Button
                        onClick={applyPriceFilter}
                        className="bg-primary hover:bg-primary/90 text-white rounded-lg px-3 py-1.5 h-8 text-[10px] uppercase font-black"
                    >
                        Filtrer
                    </Button>
                </div>
            </div>

            {activeFacetGroups.length === 0 && !hasActiveFilters && (
                <div className="text-xs text-muted-foreground font-medium italic py-4">
                    Aucun filtre disponible pour cette sélection.
                </div>
            )}

            {activeFacetGroups.map((facet) => {
                const isCollapsed = !!collapsedGroups[facet.id];
                return (
                    <div key={facet.id} className="space-y-4 pb-4 border-b border-muted-foreground/5 last:border-0 last:pb-0">
                        <button
                            onClick={() => toggleGroup(facet.id)}
                            className="w-full flex items-center justify-between font-black text-[11px] uppercase tracking-widest text-foreground/70 hover:text-primary transition-colors text-left"
                        >
                            <span className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                                {facet.name}
                            </span>
                            <span className="text-muted-foreground">
                                {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                            </span>
                        </button>
                        
                        {!isCollapsed && (
                            <div className="space-y-3 pl-1 animate-in fade-in slide-in-from-top-1 duration-200">
                                {facet.values.map((value) => {
                                    const isChecked = selectedFacets.includes(value.id);
                                    return (
                                        <div key={value.id} className="flex items-center space-x-3 group">
                                            <Checkbox
                                                id={value.id}
                                                checked={isChecked}
                                                onCheckedChange={() => toggleFacet(value.id)}
                                                className="w-5 h-5 rounded-md border-muted-foreground/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary transition-all"
                                            />
                                            <Label
                                                htmlFor={value.id}
                                                className="text-sm font-bold text-muted-foreground cursor-pointer flex items-center justify-between w-full group-hover:text-foreground transition-colors"
                                            >
                                                <span className={isChecked ? "text-foreground" : ""}>{value.name}</span>
                                                <span className="text-[10px] font-black tabular-nums bg-muted/50 px-2 py-0.5 rounded-md min-w-[24px] text-center">
                                                    {value.count}
                                                </span>
                                            </Label>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}