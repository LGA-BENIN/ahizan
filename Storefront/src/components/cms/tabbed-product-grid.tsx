"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { DenseProductCard } from "@/components/commerce/dense-product-card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useThemeSettings } from '@/components/providers/theme-provider';
import { getAssetUrl, getShopApiUrl } from '@/lib/vendure/api-utils';

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

        const searchQuery = `
            query GetTabProducts($input: SearchInput!) {
                search(input: $input) {
                    items {
                        productId
                        productName
                        slug
                        productAsset { id preview }
                        priceWithTax {
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

        const fetchForCollection = async (collectionId?: string) => {
            const input: any = {
                groupByProduct: true,
                take,
            };

            if (collectionId) {
                input.collectionId = String(collectionId);
            } else if (collectionSlug) {
                input.collectionSlug = collectionSlug;
            }

            if (tab.filterType === 'BEST_SELLERS') {
                input.sort = { price: 'DESC' };
            }

            if (tab.facetValueIds && tab.facetValueIds.length > 0) {
                input.facetValueIds = tab.facetValueIds;
            }

            try {
                const shopApiUrl = getShopApiUrl();
                const res = await fetch(shopApiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ query: searchQuery, variables: { input } }),
                });
                const data = await res.json();
                let items = data.data?.search?.items || [];
                
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
                    const fallbackRes = await fetch(shopApiUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ query: fallbackQuery, variables: { slug: collectionSlug, take } }),
                    });
                    const fallbackData = await fallbackRes.json();
                    const variants = fallbackData.data?.collection?.productVariants?.items || [];
                    if (variants.length > 0) {
                        items = variants.map((v: any) => ({
                            productId: v.product.id,
                            productName: v.product.name,
                            slug: v.product.slug,
                            productAsset: v.product.assets?.[0],
                            priceWithTax: { value: v.priceWithTax },
                            currencyCode: v.currencyCode,
                            inStock: true
                        }));
                    }
                }
                
                return items;
            } catch (err) {
                console.error('Error fetching tab products:', err);
                return [];
            }
        };

        try {
            if (collectionIds.length > 0) {
                const promises = collectionIds.map((id: string) => fetchForCollection(id));
                const results = await Promise.all(promises);
                let items = results.flat();
                
                // Deduplicate
                const seen = new Set();
                items = items.filter((item: any) => {
                    if (seen.has(item.productId)) return false;
                    seen.add(item.productId);
                    return true;
                });
                setProductsMap(prev => ({ ...prev, [tab.id]: items }));
            } else {
                const items = await fetchForCollection();
                setProductsMap(prev => ({ ...prev, [tab.id]: items }));
            }
        } finally {
            setLoadingMap(prev => ({ ...prev, [tab.id]: false }));
        }
    }, []);

    // Fetch all tabs on mount, and refetch when tab changes
    useEffect(() => {
        if (!props.tabs || props.tabs.length === 0) return;
        // Pre-fetch all tabs
        props.tabs.forEach(tab => {
            if (!productsMap[tab.id] && !loadingMap[tab.id]) {
                fetchProducts(tab);
            }
        });
    }, [props.tabs]);

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
                    <div className={`flex overflow-x-auto snap-x snap-mandatory no-scrollbar ${props.cardStyle === 'dense' ? 'gap-2 md:gap-3' : 'gap-4 md:gap-6'} pb-4`}>
                        {Array.from({ length: 8 }).map((_, i) => (
                            <div key={i} className="snap-start flex-shrink-0 w-[140px] sm:w-[160px] md:w-[180px] lg:w-[200px]">
                                <Card className="overflow-hidden h-full">
                                    <Skeleton className="aspect-[4/3] w-full" />
                                    <CardContent className="p-2 space-y-2">
                                        <Skeleton className="h-3 w-3/4" />
                                        <Skeleton className="h-4 w-1/2" />
                                    </CardContent>
                                </Card>
                            </div>
                        ))}
                    </div>
                );
            }
            return (
                <div className={`grid ${gridClass} ${props.cardStyle === 'dense' ? 'gap-2 md:gap-3' : 'gap-4 md:gap-6'}`}>
                    {Array.from({ length: tab.take || 10 }).map((_, i) => (
                        <Card key={i} className="overflow-hidden">
                            <Skeleton className="aspect-[4/3]" />
                            <CardContent className="p-2 space-y-2">
                                <Skeleton className="h-3 w-3/4" />
                                <Skeleton className="h-4 w-1/2" />
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
                        className={`flex overflow-x-auto snap-x snap-mandatory no-scrollbar ${props.cardStyle === 'dense' ? 'gap-2 md:gap-3' : 'gap-4 md:gap-6'} pb-4`}
                    >
                        {products.map((p: any) => (
                            <div key={p.productId} className="snap-start flex-shrink-0 w-[140px] sm:w-[160px] md:w-[180px] lg:w-[200px]">
                                {props.cardStyle === 'dense' ? (
                                    <DenseProductCard product={p} />
                                ) : (
                                    <Link
                                        href={`/product/${p.slug}`}
                                        className="group bg-white rounded-xl overflow-hidden border border-border/30 hover:shadow-lg transition-all block h-full"
                                    >
                                        <div className="aspect-square bg-muted/10 relative overflow-hidden">
                                            {(p.productAsset?.preview || defaultImage) ? (
                                                <img
                                                    src={getAssetUrl(p.productAsset?.preview || defaultImage)}
                                                    alt={p.productName}
                                                    className="w-full h-full object-contain p-3 group-hover:scale-105 transition-transform duration-300"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                                                    Aucune image
                                                </div>
                                            )}
                                        </div>
                                        <div className="p-3 flex flex-col justify-between" style={{ height: 'calc(100% - auto)' }}>
                                            <h3 className="font-semibold text-xs md:text-sm line-clamp-2 mb-1 group-hover:text-primary transition-colors">
                                                {p.productName}
                                            </h3>
                                            <span className="font-black text-sm text-primary">
                                                {formatCFA(p.priceWithTax?.min ?? p.priceWithTax?.value ?? 0)}
                                            </span>
                                        </div>
                                    </Link>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        return (
            <div className={`grid ${gridClass} ${props.cardStyle === 'dense' ? 'gap-2 md:gap-3' : 'gap-4 md:gap-6'}`}>
                {products.map((p: any) =>
                    props.cardStyle === 'dense' ? (
                        <DenseProductCard key={p.productId} product={p} />
                    ) : (
                        <Link
                            key={p.productId}
                            href={`/product/${p.slug}`}
                            className="group bg-white rounded-xl overflow-hidden border border-border/30 hover:shadow-lg transition-all"
                        >
                            <div className="aspect-square bg-muted/10 relative overflow-hidden">
                                {(p.productAsset?.preview || defaultImage) ? (
                                    <img
                                        src={getAssetUrl(p.productAsset?.preview || defaultImage)}
                                        alt={p.productName}
                                        className="w-full h-full object-contain p-3 group-hover:scale-105 transition-transform duration-300"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                                        Aucune image
                                    </div>
                                )}
                            </div>
                            <div className="p-3">
                                <h3 className="font-semibold text-xs md:text-sm line-clamp-2 mb-1 group-hover:text-primary transition-colors">
                                    {p.productName}
                                </h3>
                                <span className="font-black text-sm text-primary">
                                    {formatCFA(p.priceWithTax?.min ?? p.priceWithTax?.value ?? 0)}
                                </span>
                            </div>
                        </Link>
                    )
                )}
            </div>
        );
    };

    return (
        <section className="container mx-auto px-4 py-8">
            {props.title && (
                <h2 className="text-2xl font-black mb-6 tracking-tight">{props.title}</h2>
            )}

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className={`mb-6 ${tabStyle === 'pill' ? 'bg-muted rounded-full h-auto p-1 gap-1' : tabStyle === 'boxed' ? 'bg-transparent h-auto p-0 gap-2' : 'bg-transparent h-auto p-0 border-b rounded-none w-full justify-start gap-0'}`}>
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

                {props.tabs.map((tab) => (
                    <TabsContent key={tab.id} value={tab.id} className="mt-0">
                        {renderGrid(tab)}
                    </TabsContent>
                ))}
            </Tabs>
        </section>
    );
}
