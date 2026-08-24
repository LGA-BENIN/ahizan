"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { DenseProductCard } from "@/components/commerce/dense-product-card";
import { ProductCard } from "@/components/commerce/product-card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useThemeSettings } from '@/components/providers/theme-provider';
import { getAssetUrl, getShopApiUrl } from '@/lib/vendure/api-utils';
import { useLocation } from '@/contexts/location-context';
import { fetchWithClientCache } from '@/lib/vendure/client-cache';

interface TabConfig {
    id: string;
    label: string;
    icon?: string;
    filterType: string;
    collectionSlug?: string;
    collectionIds?: string[];
    facetValueIds?: string[];
    take: number;
}

interface TabbedProductGridProps {
    title?: string;
    subtitle?: string;
    badgeText?: string;
    badgeBgColor?: string;
    badgeTextColor?: string;
    headerStyle?: string;
    enableTabs?: boolean;
    layout?: string;
    columns?: number;
    cardStyle?: string;
    tabs: TabConfig[];
    defaultTabIndex?: number;
    tabStyle?: 'pill' | 'underline' | 'boxed';
    tabColor?: string;
    tabActiveColor?: string;
}

function formatCFA(price: number): string {
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'XOF',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(price);
}

export function TabbedProductGrid(props: TabbedProductGridProps) {
    const { selectedLocation } = useLocation();
    const [activeTab, setActiveTab] = useState(props.tabs?.[props.defaultTabIndex || 0]?.id || '');
    const [productsMap, setProductsMap] = useState<Record<string, any[]>>({});
    const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});
    const themeSettings = useThemeSettings();
    const defaultImage = themeSettings?.defaultProductImage;
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const scroll = (direction: 'left' | 'right') => {
        if (scrollContainerRef.current) {
            const { current } = scrollContainerRef;
            const scrollAmount = current.clientWidth * 0.8;
            current.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
        }
    };

    const fetchProducts = useCallback(async (tab: TabConfig) => {
        if (!tab) return;
        setLoadingMap(prev => ({ ...prev, [tab.id]: true }));

        const take = tab.take || 10;
        const collectionSlug = tab.collectionSlug || '';
        const collectionIds = tab.collectionIds || [];
        const selectionMode = (tab as any).selectionMode || 'COLLECTIONS';
        const manualProductIds = (tab as any).manualProductIds || [];

        const searchQuery = `
            query GetTabProducts($input: SearchInput!) {
                search(input: $input) {
                    items {
                        productId
                        productName
                        slug
                        productAsset { id preview }
                        priceWithTax {
                            __typename
                            ... on PriceRange { min max }
                            ... on SinglePrice { value }
                        }
                        currencyCode
                        facetValueIds
                        inStock
                    }
                }
            }
        `;

        const shopApiUrl = getShopApiUrl();

        const fetchForCollection = async (collectionId?: string) => {
            const input: any = {
                groupByProduct: true,
                take,
            };

            if (collectionId && String(collectionId).trim() !== '' && String(collectionId) !== 'undefined') {
                input.collectionId = String(collectionId);
            } else if (collectionSlug && collectionSlug.trim() !== '') {
                input.collectionSlug = collectionSlug;
            }

            if (tab.filterType === 'BEST_SELLERS') {
                input.sort = { price: 'DESC' };
            }

            if (tab.facetValueIds && tab.facetValueIds.length > 0) {
                input.facetValueIds = tab.facetValueIds;
            }

            try {
                const data = await fetchWithClientCache(shopApiUrl, searchQuery, { input });
                let items = data?.search?.items || [];
                
                // Fallback for when Vendure search index is empty but collection has direct variants
                if (items.length === 0 && collectionSlug) {
                    const fallbackQuery = `
                        query GetFallback($slug: String!, $take: Int!) {
                            collection(slug: $slug) {
                                productVariants(options: { take: $take }) {
                                    items {
                                        product { id name slug assets { preview } }
                                        priceWithTax
                                        currencyCode
                                    }
                                }
                            }
                        }
                    `;
                    const fallbackData = await fetchWithClientCache(shopApiUrl, fallbackQuery, { slug: collectionSlug, take });
                    const variants = fallbackData?.collection?.productVariants?.items || [];
                    if (variants.length > 0) {
                        items = variants.map((v: any) => ({
                            productId: v.product.id,
                            productName: v.product.name,
                            slug: v.product.slug,
                            productAsset: v.product.assets?.[0],
                            priceWithTax: { __typename: 'SinglePrice', value: v.priceWithTax },
                            currencyCode: v.currencyCode,
                            inStock: true,
                            collectionIds: [],
                            facetValueIds: []
                        }));
                    }
                }
                
                return items;
            } catch (err) {
                console.error('Error fetching tab products:', err);
                return [];
            }
        };

        const fetchManualProducts = async () => {
            if (manualProductIds.length === 0) return [];
            try {
                const manualQuery = `
                    query GetManualProducts($ids: [ID!]!) {
                        products(options: { filter: { id: { in: $ids } } }) {
                            items {
                                id
                                name
                                slug
                                featuredAsset { id preview }
                                variants {
                                    id
                                    priceWithTax
                                }
                                customFields {
                                    vendor {
                                        id
                                        name
                                        physicalMarket { id name }
                                        location { id name }
                                    }
                                }
                            }
                        }
                    }
                `;
                const data = await fetchWithClientCache(shopApiUrl, manualQuery, { ids: manualProductIds.map(String) });
                return (data?.products?.items || []).map((p: any) => ({
                    productId: p.id,
                    productName: p.name,
                    slug: p.slug,
                    productAsset: p.featuredAsset,
                    priceWithTax: { __typename: 'SinglePrice', value: p.variants?.[0]?.priceWithTax || 0 },
                    currencyCode: 'XOF',
                    inStock: true,
                    collectionIds: [],
                    facetValueIds: [],
                    vendorName: p.customFields?.vendor?.name || null,
                    marketName: p.customFields?.vendor?.physicalMarket?.name || null,
                    locationName: p.customFields?.vendor?.location?.name || null
                }));
            } catch (err) {
                console.error('Error fetching manual products for hybrid tab:', err);
                return [];
            }
        };

        try {
            if (selectionMode === 'AUTOMATIC') {
                const marketId = selectedLocation?.type === 'MARKET' ? selectedLocation.id : null;
                const locationId = selectedLocation && selectedLocation.type !== 'MARKET' ? selectedLocation.id : null;
                let items: any[] = [];
                
                if (selectedLocation) {
                    const localQuery = `
                        query GetLocalProducts($marketId: ID, $locationId: ID) {
                            vendors(
                                marketId: $marketId, 
                                locationId: $locationId, 
                                options: { filter: { status: { eq: "APPROVED" } } }
                            ) {
                                items {
                                    id
                                    name
                                    physicalMarket { id name }
                                    location { id name }
                                    products {
                                        id
                                        name
                                        slug
                                        featuredAsset { preview }
                                        variants {
                                            id
                                            priceWithTax
                                        }
                                    }
                                }
                            }
                        }
                    `;
                    const res = await fetch(shopApiUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ query: localQuery, variables: { marketId, locationId } })
                    });
                    const result = await res.json();
                    const vendorsList = result.data?.vendors?.items || [];
                    items = vendorsList.flatMap((v: any) => (v.products || []).map((p: any) => ({
                        productId: p.id,
                        productName: p.name,
                        slug: p.slug,
                        productAsset: p.featuredAsset,
                        priceWithTax: { __typename: 'SinglePrice', value: p.variants?.[0]?.priceWithTax || 0 },
                        currencyCode: 'XOF',
                        inStock: true,
                        collectionIds: [],
                        facetValueIds: [],
                        vendorName: v.name,
                        marketName: v.physicalMarket?.name || null,
                        locationName: v.location?.name || null
                    })));
                }

                if (items.length === 0) {
                    const fallbackSearchInput = {
                        groupByProduct: true,
                        take,
                        sort: { price: 'DESC' }
                    };
                    const resFallback = await fetch(shopApiUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ query: searchQuery, variables: { input: fallbackSearchInput } })
                    });
                    const resultFallback = await resFallback.json();
                    items = resultFallback.data?.search?.items || [];
                }

                const seen = new Set();
                items = items.filter((item: any) => {
                    if (seen.has(item.productId)) return false;
                    seen.add(item.productId);
                    return true;
                });
                setProductsMap(prev => ({ ...prev, [tab.id]: items.slice(0, take) }));
            } else if (selectionMode === 'PRODUCTS') {
                const items = await fetchManualProducts();
                setProductsMap(prev => ({ ...prev, [tab.id]: items.slice(0, take) }));
            } else if (selectionMode === 'HYBRID') {
                const [collectionItems, manualItems] = await Promise.all([
                    (async () => {
                        if (collectionIds.length > 0) {
                            const promises = collectionIds.map((id: string) => fetchForCollection(id));
                            const results = await Promise.all(promises);
                            return results.flat();
                        } else {
                            return await fetchForCollection();
                        }
                    })(),
                    fetchManualProducts()
                ]);
                
                let items = [...manualItems, ...collectionItems];
                const seen = new Set();
                items = items.filter((item: any) => {
                    if (seen.has(item.productId)) return false;
                    seen.add(item.productId);
                    return true;
                });
                setProductsMap(prev => ({ ...prev, [tab.id]: items.slice(0, take) }));
            } else {
                // COLLECTIONS
                if (collectionIds.length > 0) {
                    const promises = collectionIds.map((id: string) => fetchForCollection(id));
                    const results = await Promise.all(promises);
                    let items = results.flat();
                    
                    const seen = new Set();
                    items = items.filter((item: any) => {
                        if (seen.has(item.productId)) return false;
                        seen.add(item.productId);
                        return true;
                    });
                    setProductsMap(prev => ({ ...prev, [tab.id]: items.slice(0, take) }));
                } else {
                    const items = await fetchForCollection();
                    setProductsMap(prev => ({ ...prev, [tab.id]: items.slice(0, take) }));
                }
            }
        } catch (err) {
            console.error('Error in fetchProducts workflow:', err);
        } finally {
            setLoadingMap(prev => ({ ...prev, [tab.id]: false }));
        }
    }, [selectedLocation]);

    // Fetch all tabs on mount, and refetch when tab changes
    useEffect(() => {
        if (!props.tabs || props.tabs.length === 0) return;
        // Pre-fetch all tabs
        props.tabs.forEach(tab => {
            if (!productsMap[tab.id] && !loadingMap[tab.id]) {
                fetchProducts(tab);
            }
        });
    }, [JSON.stringify(props.tabs)]);

    if (!props.tabs || props.tabs.length === 0) return null;

    const columns = props.columns || 5;
    const colClasses: Record<number, string> = {
        3: 'grid-cols-2 md:grid-cols-3',
        4: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
        5: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-5',
        6: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-6',
    };
    const gridClass = colClasses[columns] || colClasses[5];
    const tabStyle = props.tabStyle || 'pill';

    const renderGrid = (tab: TabConfig) => {
        const products = productsMap[tab.id] || [];
        const loading = loadingMap[tab.id] ?? true;

        if (loading) {
            if (props.layout === 'carousel') {
                return (
                    <div 
                        className={`flex overflow-x-auto snap-x snap-mandatory ${props.cardStyle === 'dense' ? 'gap-2 md:gap-3' : 'gap-3 md:gap-4'} pb-4`}
                        style={{
                            scrollbarWidth: 'none',
                            msOverflowStyle: 'none',
                        } as React.CSSProperties}
                    >
                        {Array.from({ length: 8 }).map((_, i) => (
                            <div key={i} className={
                                props.cardStyle === 'dense'
                                ? "snap-start flex-shrink-0 w-[100px] sm:w-[120px] md:w-[140px] lg:w-[160px]"
                                : "snap-start flex-shrink-0 w-[200px] sm:w-[220px] md:w-[240px] lg:w-[260px]"
                            }>
                                <Card className="overflow-hidden h-full">
                                    <Skeleton className="aspect-[4/3] w-full" />
                                    <CardContent className="p-1.5 space-y-1.5">
                                        <Skeleton className="h-2 w-3/4" />
                                        <Skeleton className="h-2.5 w-1/2" />
                                    </CardContent>
                                </Card>
                            </div>
                        ))}
                    </div>
                );
            }
            return (
                <div className={`grid ${gridClass} ${props.cardStyle === 'dense' ? 'gap-2 md:gap-3' : 'gap-3 md:gap-4'}`}>
                    {Array.from({ length: tab.take || 10 }).map((_, i) => (
                        <Card key={i} className="overflow-hidden">
                            <Skeleton className="aspect-[4/3]" />
                            <CardContent className="p-2 space-y-1.5">
                                <Skeleton className="h-2 w-3/4" />
                                <Skeleton className="h-2.5 w-1/2" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            );
        }

        if (products.length === 0) {
            return (
                <div className="text-center py-12 text-muted-foreground text-sm bg-muted/20 rounded-xl border border-border/30">
                    Aucun produit disponible dans cette sélection pour le moment.
                </div>
            );
        }

        if (props.layout === 'carousel') {
            return (
                <div className="relative group/carousel">
                    {/* Left Navigation Arrow */}
                    <button 
                        onClick={() => scroll('left')}
                        className="absolute left-0 top-1/2 -translate-y-1/2 -ml-4 z-20 bg-white shadow-lg rounded-full p-2 border border-border/50 text-foreground hover:bg-muted hover:scale-110 transition-all opacity-0 group-hover/carousel:opacity-100 hidden md:flex items-center justify-center"
                        aria-label="Défiler vers la gauche"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>

                    {/* Right Navigation Arrow */}
                    <button 
                        onClick={() => scroll('right')}
                        className="absolute right-0 top-1/2 -translate-y-1/2 -mr-4 z-20 bg-white shadow-lg rounded-full p-2 border border-border/50 text-foreground hover:bg-muted hover:scale-110 transition-all opacity-0 group-hover/carousel:opacity-100 hidden md:flex items-center justify-center"
                        aria-label="Défiler vers la droite"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>

                    <div 
                        ref={scrollContainerRef}
                        className={`flex overflow-x-auto snap-x snap-mandatory ${props.cardStyle === 'dense' ? 'gap-2 md:gap-3' : 'gap-3 md:gap-4'} pb-4`}
                        style={{
                            scrollbarWidth: 'none',
                            msOverflowStyle: 'none',
                        } as React.CSSProperties}
                    >
                        {products.map((p: any) => (
                            <div key={p.productId} className={
                                props.cardStyle === 'dense' 
                                ? "snap-start flex-shrink-0 w-[100px] sm:w-[120px] md:w-[140px] lg:w-[160px]"
                                : "snap-start flex-shrink-0 w-[200px] sm:w-[220px] md:w-[240px] lg:w-[260px]"
                            }>
                                {props.cardStyle === 'dense' ? (
                                    <DenseProductCard product={p} />
                                ) : (
                                    <ProductCard product={p} config={props} />
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        return (
            <div className={`grid ${gridClass} ${props.cardStyle === 'dense' ? 'gap-2 md:gap-3' : 'gap-3 md:gap-4'}`}>
                {products.map((p: any) =>
                    props.cardStyle === 'dense' ? (
                        <DenseProductCard key={p.productId} product={p} />
                    ) : (
                        <ProductCard key={p.productId} product={p} config={props} />
                    )
                )}
            </div>
        );
    };

    const showTabs = props.enableTabs !== false && props.tabs && props.tabs.length > 1;
    const badgeText = props.badgeText && props.badgeText.trim() !== '' ? props.badgeText : null;
    const badgeBgColor = props.badgeBgColor || '#e31837';
    const badgeTextColor = props.badgeTextColor || '#ffffff';

    return (
        <section className="container mx-auto px-4 py-2 md:py-3">
            {(props.title || badgeText || props.subtitle) && (
                <div className="mb-3 flex flex-col items-start gap-1">
                    {badgeText && (
                        <div 
                            className="flex items-center gap-1.5 font-extrabold uppercase text-[10px] tracking-wider px-3 py-1 rounded-full shadow-sm w-fit"
                            style={{ backgroundColor: badgeBgColor, color: badgeTextColor }}
                        >
                            <span>{badgeText}</span>
                        </div>
                    )}
                    {props.title && props.title.trim() !== '' && (
                        <h2 className="text-xl md:text-2xl font-black tracking-tight text-foreground uppercase leading-tight mt-0.5">
                            {props.title}
                        </h2>
                    )}
                    {props.subtitle && props.subtitle.trim() !== '' && (
                        <p className="font-medium text-xs sm:text-sm text-muted-foreground mt-0.5 max-w-2xl">
                            {props.subtitle}
                        </p>
                    )}
                    {(props.title || badgeText) && (
                        <div className="h-1 w-12 bg-primary mt-1.5 rounded-full" style={{ backgroundColor: badgeBgColor }} />
                    )}
                </div>
            )}

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                {showTabs && (
                    <TabsList className={`mb-3 ${tabStyle === 'pill' ? 'bg-muted rounded-full h-auto p-1 gap-1' : tabStyle === 'boxed' ? 'bg-transparent h-auto p-0 gap-2' : 'bg-transparent h-auto p-0 border-b rounded-none w-full justify-start gap-0'}`}>
                        {props.tabs.map((tab) => (
                            <TabsTrigger
                                key={tab.id}
                                value={tab.id}
                                className={
                                    tabStyle === 'pill'
                                        ? 'rounded-full data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-md font-bold text-sm'
                                        : tabStyle === 'boxed'
                                        ? 'rounded-lg border data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:border-primary font-bold text-sm'
                                        : 'rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary font-bold text-sm px-4 py-2'
                                }
                            >
                                {tab.icon && <span>{tab.icon}</span>}
                                {tab.label}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                )}

                {props.tabs.map((tab) => (
                    <TabsContent key={tab.id} value={tab.id} className="mt-0">
                        {renderGrid(tab)}
                    </TabsContent>
                ))}
            </Tabs>
        </section>
    );
}
