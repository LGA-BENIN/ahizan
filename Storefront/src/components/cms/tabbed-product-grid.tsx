"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { DenseProductCard } from "@/components/commerce/dense-product-card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

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
    }).format(price / 100);
}

export function TabbedProductGrid(props: TabbedProductGridProps) {
    const [activeTab, setActiveTab] = useState(props.tabs?.[props.defaultTabIndex || 0]?.id || '');
    const [productsMap, setProductsMap] = useState<Record<string, any[]>>({});
    const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});

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
                const shopApiUrl = process.env.NEXT_PUBLIC_VENDURE_SHOP_API_URL || 'http://127.0.0.1:3000/shop-api';
                const res = await fetch(shopApiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ query: searchQuery, variables: { input } }),
                });
                const data = await res.json();
                return data.data?.search?.items || [];
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
                                {p.productAsset?.preview && (
                                    <img
                                        src={p.productAsset.preview}
                                        alt={p.productName}
                                        className="w-full h-full object-contain p-3 group-hover:scale-105 transition-transform duration-300"
                                    />
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
