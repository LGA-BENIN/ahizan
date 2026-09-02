"use client";

import React, { useState, useEffect, useRef } from 'react';
import { getShopApiUrl } from '@/lib/vendure/api-utils';
import { VendorProductCard } from '@/components/commerce/vendor-product-card';
import { Sparkles, MapPin, Store, ChevronLeft, ChevronRight } from 'lucide-react';
import { useLocation } from '@/contexts/location-context';

import { fetchWithClientCache } from '@/lib/vendure/client-cache';

interface LocalPersonalizedProductsProps {
    config?: {
        title?: string;
        icon?: string;
        subtitle?: string;
        badgeText?: string;
        limit?: number;
        take?: number;
        layout?: string;
        requireConfirmedLocation?: boolean;
        marketId?: string;
        locationId?: string;
        marketName?: string;
        locationName?: string;

        // Advanced controls
        textAlign?: string;
        titleColor?: string;
        subtitleColor?: string;
        badgeBgColor?: string;
        badgeTextColor?: string;
        cardTheme?: string;
        topLeftBadge?: string;
        topRightBadge?: string;
        bottomLeftBadge?: string;
        bottomRightBadge?: string;
        mixCollectionId?: string;
        mixMode?: string;
        interleaveSchema?: string;
        headerStyle?: string;

        // ESM selection controls
        selectionMode?: string;
        collectionIds?: string[];
        manualProductIds?: string[];
        collectionDisplayType?: string;
        experienceStrategy?: string;
        maxItemsPerVendor?: number;
        boostCertifiedVendors?: boolean;
        columns?: number;
    };
}

export function LocalPersonalizedProducts({ config }: LocalPersonalizedProductsProps = {}) {
    const { selectedLocation } = useLocation();
    const [products, setProducts] = useState<any[]>([]);
    const [locationName, setLocationName] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [isCmsPreview, setIsCmsPreview] = useState(false);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const scroll = (direction: 'left' | 'right') => {
        if (scrollContainerRef.current) {
            const { current } = scrollContainerRef;
            const scrollAmount = current.clientWidth * 0.8;
            current.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
        }
    };

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const preview = window.location.search.includes('presetId') || window.location.search.includes('v=') || window.parent !== window;
            setIsCmsPreview(preview);
        }
    }, []);

    const displayTitle = config?.title !== undefined && config?.title !== null ? config.title : "Produits à Proximité";
    const displayIcon = config?.icon ?? '🛍️';
    const displaySubtitle = config?.subtitle || '';
    const displayBadgeText = config?.badgeText || '';
    const limit = (config?.limit || config?.take) ? Number(config?.limit || config?.take) : 8;
    const layout = config?.layout || 'grid-4';
    const requireConfirmedLocation = config?.requireConfirmedLocation !== false; // true par défaut

    // Advanced configs
    const textAlign = config?.textAlign || 'left';
    const titleColor = config?.titleColor || '';
    const subtitleColor = config?.subtitleColor || '';
    const badgeBgColor = config?.badgeBgColor || '#e31837';
    const badgeTextColor = config?.badgeTextColor || '#ffffff';

    const marketIdFromConfig = config?.marketId;
    const locationIdFromConfig = config?.locationId;
    const isOverride = !!(marketIdFromConfig || locationIdFromConfig);

    const fetchLocalProducts = async () => {
        let variables: any = {};
        let displayName = '';
        let hasLocation = false;

        if (isOverride) {
            hasLocation = true;
            if (marketIdFromConfig) {
                variables = { marketId: marketIdFromConfig };
                displayName = config?.marketName || '';
            } else {
                variables = { locationId: locationIdFromConfig };
                displayName = config?.locationName || '';
            }
        } else if (selectedLocation) {
            hasLocation = true;
            displayName = selectedLocation.name;
            variables = selectedLocation.type === 'MARKET' ? { marketId: selectedLocation.id } : { locationId: selectedLocation.id };
        } else {
            const saved = typeof window !== 'undefined' ? localStorage.getItem('ahizan_client_location') : null;
            if (saved) {
                try {
                    const loc = JSON.parse(saved);
                    displayName = loc.name;
                    variables = loc.type === 'MARKET' ? { marketId: loc.id } : { locationId: loc.id };
                    hasLocation = true;
                } catch (e) {
                    console.error("Error parsing client location:", e);
                }
            }
        }

        setLoading(true);
        try {
            setLocationName(displayName);

            const shopApiUrl = getShopApiUrl();
            let localProductsList: any[] = [];

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
                                collections { id }
                                customFields { approvalStatus }
                                variants {
                                    id
                                    priceWithTax
                                    customFields {
                                        compareAtPrice
                                        onPromotion
                                        promotionalPrice
                                    }
                                }
                            }
                        }
                    }
                }
            `;

            const resultLocal = await fetchWithClientCache(shopApiUrl, localQuery, variables);
            const vendorsList = resultLocal?.vendors?.items || [];
            
            localProductsList = vendorsList.flatMap((v: any) => (v.products || [])
                .filter((p: any) => !p.customFields || p.customFields.approvalStatus === 'approved')
                .map((p: any) => ({
                    ...p,
                    vendorName: v.name,
                    vendorId: v.id,
                    marketName: v.physicalMarket?.name,
                    marketId: v.physicalMarket?.id,
                    locationName: v.location?.name,
                    locationId: v.location?.id,
                }))
            );

            // Filter by Selection Mode (Collections / Products / Hybrid)
            const selectionMode = config?.selectionMode || 'COLLECTIONS';
            const manualProductIds = config?.manualProductIds || [];
            const collectionIds = config?.collectionIds || (config?.mixCollectionId ? [config.mixCollectionId] : []);

            // Fetch manual products globally if specified
            let manualProductsList: any[] = [];
            if (manualProductIds.length > 0) {
                try {
                    const manualQuery = `
                        query GetManualProducts($ids: [ID!]!) {
                            products(options: { filter: { id: { in: $ids } } }) {
                                items {
                                    id
                                    name
                                    slug
                                    featuredAsset { preview }
                                    collections { id }
                                    variants {
                                        id
                                        priceWithTax
                                        customFields {
                                            compareAtPrice
                                            onPromotion
                                            promotionalPrice
                                        }
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
                    const resultManual = await fetchWithClientCache(shopApiUrl, manualQuery, { ids: manualProductIds.map(String) });
                    const manualItems = resultManual?.products?.items || [];
                    manualProductsList = manualItems.map((p: any) => ({
                        ...p,
                        vendorName: p.customFields?.vendor?.name,
                        vendorId: p.customFields?.vendor?.id,
                        marketName: p.customFields?.vendor?.physicalMarket?.name,
                        marketId: p.customFields?.vendor?.physicalMarket?.id,
                        locationName: p.customFields?.vendor?.location?.name,
                        locationId: p.customFields?.vendor?.location?.id,
                    }));
                } catch (e) {
                    console.error("Error fetching manual products globally:", e);
                }
            }

            // Apply strategy specific ranking & filtering rules on local products before merging
            const experienceStrategy = config?.experienceStrategy || 'LOCAL_DISCOVERY';
            
            if (experienceStrategy === 'HOME_FEED') {
                // Quota max of products per merchant
                const maxItemsPerVendor = config?.maxItemsPerVendor || 3;
                const vendorCounts: Record<string, number> = {};
                localProductsList = localProductsList.filter((p: any) => {
                    const vId = p.vendorId;
                    if (!vId) return true;
                    vendorCounts[vId] = (vendorCounts[vId] || 0) + 1;
                    return vendorCounts[vId] <= maxItemsPerVendor;
                });

                // Boost certified vendors (Dantokpa/Ganhi)
                if (config?.boostCertifiedVendors !== false) {
                    localProductsList.sort((a: any, b: any) => {
                        const aBoost = (a.marketName?.toLowerCase().includes('dantokpa') || a.marketName?.toLowerCase().includes('ganhi')) ? 1 : 0;
                        const bBoost = (b.marketName?.toLowerCase().includes('dantokpa') || b.marketName?.toLowerCase().includes('ganhi')) ? 1 : 0;
                        return bBoost - aBoost;
                    });
                }
            } else if (experienceStrategy === 'TRENDING') {
                // Sort by promotion or popular criteria
                localProductsList.sort((a: any, b: any) => {
                    const valA = a.variants?.[0]?.customFields?.onPromotion ? 1 : 0;
                    const valB = b.variants?.[0]?.customFields?.onPromotion ? 1 : 0;
                    return valB - valA;
                });
            }

            // Construct final products list according to selectionMode
            let finalProducts: any[] = [];

            if (selectionMode === 'COLLECTIONS') {
                if (config?.collectionDisplayType === 'PRODUCTS' && manualProductIds.length > 0) {
                    finalProducts = localProductsList.filter((p: any) => 
                        manualProductIds.map(String).includes(String(p.id))
                    );
                } else if (collectionIds.length > 0) {
                    finalProducts = localProductsList.filter((p: any) => 
                        (p.collections || []).some((c: any) => collectionIds.map(String).includes(String(c.id)))
                    );
                } else {
                    finalProducts = localProductsList;
                }
            } else if (selectionMode === 'PRODUCTS') {
                // Mode 2: Manual + Local Engine (ESM)
                const seenIds = new Set<string>();
                for (const mp of manualProductsList) {
                    if (!seenIds.has(String(mp.id))) {
                        finalProducts.push(mp);
                        seenIds.add(String(mp.id));
                    }
                }
                for (const lp of localProductsList) {
                    if (finalProducts.length >= limit) break;
                    if (!seenIds.has(String(lp.id))) {
                        finalProducts.push(lp);
                        seenIds.add(String(lp.id));
                    }
                }
            } else if (selectionMode === 'HYBRID') {
                // Mode 3: Hybrid
                const seenIds = new Set<string>();
                
                // 1. Products of chosen collection in the local zone
                const localCollectionProducts = localProductsList.filter((p: any) => 
                    collectionIds.length > 0 && (p.collections || []).some((c: any) => collectionIds.map(String).includes(String(c.id)))
                );
                for (const lcp of localCollectionProducts) {
                    if (!seenIds.has(String(lcp.id))) {
                        finalProducts.push(lcp);
                        seenIds.add(String(lcp.id));
                    }
                }

                // 2. Manual products
                for (const mp of manualProductsList) {
                    if (finalProducts.length >= limit) break;
                    if (!seenIds.has(String(mp.id))) {
                        finalProducts.push(mp);
                        seenIds.add(String(mp.id));
                    }
                }

                // 3. Fallback to remaining local zone products
                for (const lp of localProductsList) {
                    if (finalProducts.length >= limit) break;
                    if (!seenIds.has(String(lp.id))) {
                        finalProducts.push(lp);
                        seenIds.add(String(lp.id));
                    }
                }
            } else {
                finalProducts = localProductsList;
            }

            if (finalProducts.length === 0) {
                // Fallback vers le catalogue général si aucun marchand local n'est encore enregistré dans la zone
                try {
                    const fallbackRes = await fetch(shopApiUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            query: `
                                query GetFallbackProducts($take: Int!) {
                                    search(input: { groupByProduct: false, take: $take }) {
                                        items {
                                            productId
                                            productName
                                            productVariantId
                                            productVariantName
                                            slug
                                            productAsset { preview }
                                            productVariantAsset { preview }
                                            priceWithTax {
                                                __typename
                                                ... on PriceRange { min max }
                                                ... on SinglePrice { value }
                                            }
                                            currencyCode
                                            inStock
                                        }
                                    }
                                }
                            `,
                            variables: { take: limit }
                        })
                    });
                    const fbData = await fallbackRes.json();
                    const fbItems = fbData.data?.search?.items || [];
                    finalProducts = fbItems.map((p: any) => ({
                        id: p.productVariantId || p.productId,
                        productId: p.productId,
                        productVariantId: p.productVariantId || p.productId,
                        productName: p.productName,
                        productVariantName: p.productVariantName,
                        slug: p.slug,
                        productAsset: p.productVariantAsset || p.productAsset,
                        priceWithTax: p.priceWithTax,
                        currencyCode: p.currencyCode || 'XOF',
                        inStock: true
                    }));
                } catch (e) {
                    console.error("Fallback fetch error:", e);
                }
            }

            setProducts(finalProducts.slice(0, limit));
        } catch (err) {
            console.error('Error fetching personalized local products:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLocalProducts();

        if (typeof window !== 'undefined') {
            window.addEventListener('ahizan_location_changed', fetchLocalProducts);
            return () => {
                window.removeEventListener('ahizan_location_changed', fetchLocalProducts);
            };
        }
    }, [selectedLocation, marketIdFromConfig, locationIdFromConfig, limit, config?.mixCollectionId, config?.mixMode, config?.interleaveSchema, config?.selectionMode, JSON.stringify(config?.collectionIds), JSON.stringify(config?.manualProductIds), config?.experienceStrategy]);

    const renderProductsLayout = () => {
        const columns = config?.columns || 4;
        const colClasses: Record<number, string> = {
            3: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3',
            4: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
            5: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-5',
            6: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6',
        };
        const gridClass = `grid ${colClasses[columns] || colClasses[4]} gap-4 md:gap-6`;

        if (layout === 'carousel') {
            return (
                <div className="relative group/carousel">
                    {/* Left Navigation Arrow */}
                    <button 
                        onClick={() => scroll('left')}
                        className="absolute left-[-16px] top-1/2 -translate-y-1/2 z-20 bg-white shadow-lg rounded-full p-2 border border-border/50 text-foreground hover:bg-muted hover:scale-110 transition-all opacity-0 group-hover/carousel:opacity-100 hidden md:flex items-center justify-center"
                        aria-label="Défiler vers la gauche"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>

                    {/* Right Navigation Arrow */}
                    <button 
                        onClick={() => scroll('right')}
                        className="absolute right-[-16px] top-1/2 -translate-y-1/2 z-20 bg-white shadow-lg rounded-full p-2 border border-border/50 text-foreground hover:bg-muted hover:scale-110 transition-all opacity-0 group-hover/carousel:opacity-100 hidden md:flex items-center justify-center"
                        aria-label="Défiler vers la droite"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>

                    <div 
                        ref={scrollContainerRef}
                        className="flex overflow-x-auto pb-6 gap-4 md:gap-6 custom-scrollbar snap-x snap-mandatory"
                        style={{
                            scrollbarWidth: 'none',
                            msOverflowStyle: 'none',
                        } as React.CSSProperties}
                    >
                        {products.map(product => (
                            <div key={product.id} className="w-[200px] sm:w-[220px] md:w-[240px] lg:w-[260px] shrink-0 snap-start">
                                <VendorProductCard product={product} config={config} />
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        return (
            <div className={gridClass}>
                {products.map(product => (
                    <VendorProductCard key={product.id} product={product} config={config} />
                ))}
            </div>
        );
    };

    const alignClass = textAlign === 'center' ? 'text-center items-center justify-center' : textAlign === 'right' ? 'text-right items-end' : 'text-left items-start';
    const headerStyle = config?.headerStyle || 'smart_cart';

    return (
        <section className="py-3 md:py-5 max-w-[1440px] mx-auto w-full px-3 sm:px-4 md:px-8 lg:px-12 font-sans animate-in fade-in duration-500">
            {headerStyle === 'standard' && (
                <div className={`flex flex-col ${alignClass} mb-4 gap-1`}>
                    {displayTitle && displayTitle.trim() !== '' && (
                        <h2 className="text-xl md:text-2xl font-black tracking-tight text-foreground flex items-center gap-2" style={{ color: titleColor || undefined }}>
                            {displayIcon && <span>{displayIcon}</span>} {displayTitle}
                        </h2>
                    )}
                    {displaySubtitle && displaySubtitle.trim() !== '' && (
                        <p className="font-medium text-xs sm:text-sm text-muted-foreground mt-0.5 max-w-2xl" style={{ color: subtitleColor || undefined }}>
                            {displaySubtitle}
                        </p>
                    )}
                </div>
            )}
            {headerStyle === 'bordered' && (
                <div className="mb-4 p-4 rounded-2xl bg-card border border-border shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                        {displayBadgeText && displayBadgeText.trim() !== '' && (
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-primary/10 text-primary">{displayBadgeText}</span>
                            </div>
                        )}
                        {displayTitle && displayTitle.trim() !== '' && (
                            <h2 className="text-xl md:text-2xl font-black text-foreground flex items-center gap-2" style={{ color: titleColor || undefined }}>
                                {displayIcon && <span>{displayIcon}</span>} {displayTitle}
                            </h2>
                        )}
                        {displaySubtitle && displaySubtitle.trim() !== '' && <p className="text-xs sm:text-sm text-muted-foreground mt-0.5" style={{ color: subtitleColor || undefined }}>{displaySubtitle}</p>}
                    </div>
                </div>
            )}
            {(headerStyle === 'smart_cart' || !['standard', 'bordered'].includes(headerStyle)) && (
                <div className={`flex flex-col ${alignClass} mb-4 gap-1`}>
                    {displayBadgeText && displayBadgeText.trim() !== '' && (
                        <div 
                            className="flex items-center gap-1.5 font-extrabold uppercase text-[10px] tracking-wider px-3 py-1 rounded-full shadow-sm w-fit"
                            style={{ backgroundColor: badgeBgColor, color: badgeTextColor }}
                        >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>{displayBadgeText}</span>
                        </div>
                    )}
                    {displayTitle && displayTitle.trim() !== '' && (
                        <h2 
                            className="text-xl md:text-2xl font-black tracking-tight uppercase leading-tight mt-1 flex items-center gap-2"
                            style={{ color: titleColor || undefined }}
                        >
                            {displayIcon && <span>{displayIcon}</span>} {displayTitle}
                        </h2>
                    )}
                    {displaySubtitle && displaySubtitle.trim() !== '' && (
                        <p 
                            className="font-medium text-xs sm:text-sm mt-0.5 max-w-2xl text-muted-foreground"
                            style={{ color: subtitleColor || undefined }}
                        >
                            {displaySubtitle}
                        </p>
                    )}
                    {(displayTitle || displayBadgeText) && (
                        <div className="h-1 w-12 bg-primary mt-1.5 rounded-full" style={{ backgroundColor: badgeBgColor }} />
                    )}
                </div>
            )}

            {loading ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="aspect-[3/4] rounded-3xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
                    ))}
                </div>
            ) : products.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-6 rounded-[2rem] border border-dashed border-border bg-muted/20 text-center max-w-xl mx-auto">
                    <Store className="w-10 h-10 text-muted-foreground/60 mb-3" />
                    <h3 className="text-sm font-bold text-foreground">Aucun article disponible dans cette zone</h3>
                    <p className="text-xs text-muted-foreground mt-1.5 max-w-sm">
                        Les marchands de ce secteur (<strong>{locationName}</strong>) n'ont pas encore publié d'articles pour le moment.
                    </p>
                </div>
            ) : (
                renderProductsLayout()
            )}
        </section>
    );
}
