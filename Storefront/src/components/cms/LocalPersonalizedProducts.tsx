"use client";

import React, { useState, useEffect, useRef } from 'react';
import { getShopApiUrl } from '@/lib/vendure/api-utils';
import { VendorProductCard } from '@/components/commerce/vendor-product-card';
import { Sparkles, MapPin, Store, ChevronLeft, ChevronRight } from 'lucide-react';
import { useLocation } from '@/contexts/location-context';

import { fetchWithClientCache, clearClientCache } from '@/lib/vendure/client-cache';

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
        radiusKm?: number;
        categoryFilterMode?: string;
        locationSource?: string;
        [key: string]: any;
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
    const requireConfirmedLocation = config?.requireConfirmedLocation === true; // false par défaut (affiche pour tout le monde sauf si explicitement activé)

    // Advanced configs
    const textAlign = config?.textAlign || 'left';
    const titleColor = config?.titleColor || '';
    const subtitleColor = config?.subtitleColor || '';
    const badgeBgColor = config?.badgeBgColor || '#e31837';
    const badgeTextColor = config?.badgeTextColor || '#ffffff';

    const locationSource = config?.locationSource || 'AUTO';
    const isFixedMarket = locationSource === 'FIXED_MARKET' && !!config?.marketId;
    const isFixedLocation = locationSource === 'FIXED_LOCATION' && !!config?.locationId;
    const isOverride = isFixedMarket || isFixedLocation;

    const marketIdFromConfig = isFixedMarket ? config?.marketId : undefined;
    const locationIdFromConfig = isFixedLocation ? config?.locationId : undefined;

    const fetchLocalProducts = async () => {
        let variables: any = {};
        let displayName = '';
        let hasLocation = false;

        if (config?.radiusKm && Number(config.radiusKm) > 0) {
            variables.radiusKm = Number(config.radiusKm);
        }

        if (isOverride) {
            hasLocation = true;
            if (isFixedMarket) {
                variables.marketId = String(marketIdFromConfig);
                displayName = config?.marketName || '';
            } else if (isFixedLocation) {
                variables.locationId = String(locationIdFromConfig);
                displayName = config?.locationName || '';
            }
        } else if (selectedLocation) {
            hasLocation = true;
            displayName = selectedLocation.name;
            if (selectedLocation.marketId || selectedLocation.type === 'MARKET') {
                variables.marketId = String(selectedLocation.marketId || selectedLocation.id);
            } else if (selectedLocation.geoZoneId || selectedLocation.id) {
                variables.locationId = String(selectedLocation.geoZoneId || selectedLocation.id);
            }
            if (selectedLocation.latitude && selectedLocation.longitude) {
                variables.latitude = selectedLocation.latitude;
                variables.longitude = selectedLocation.longitude;
            }
        } else {
            const saved = typeof window !== 'undefined' ? localStorage.getItem('ahizan_client_location') : null;
            if (saved) {
                try {
                    const loc = JSON.parse(saved);
                    displayName = loc.name;
                    if (loc.marketId || loc.type === 'MARKET') {
                        variables.marketId = String(loc.marketId || loc.id);
                    } else if (loc.geoZoneId || loc.id) {
                        variables.locationId = String(loc.geoZoneId || loc.id);
                    }
                    if (loc.latitude && loc.longitude) {
                        variables.latitude = loc.latitude;
                        variables.longitude = loc.longitude;
                    }
                    hasLocation = true;
                } catch (e) {
                    console.error("Error parsing client location:", e);
                }
            }
        }

        if (requireConfirmedLocation && !hasLocation && !isCmsPreview) {
            setProducts([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            setLocationName(displayName);

            const shopApiUrl = getShopApiUrl();
            let localProductsList: any[] = [];

            const localQuery = `
                query GetLocalProducts($marketId: ID, $locationId: ID, $latitude: Float, $longitude: Float, $radiusKm: Float) {
                    vendors(
                        marketId: $marketId, 
                        locationId: $locationId, 
                        latitude: $latitude,
                        longitude: $longitude,
                        radiusKm: $radiusKm,
                        options: { filter: { status: { eq: "APPROVED" } }, take: 100 }
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
                                    name
                                    priceWithTax
                                    featuredAsset { preview }
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
            
            localProductsList = vendorsList.flatMap((v: any) => {
                return (v.products || [])
                    .filter((p: any) => !p.customFields?.approvalStatus || String(p.customFields.approvalStatus).toLowerCase() === 'approved')
                    .flatMap((p: any) => {
                        const variants = (p.variants || []).filter((vr: any) => !vr.deletedAt);
                        if (variants.length === 0) return [];
                        return variants.map((vr: any) => {
                            const effectiveAsset = vr.featuredAsset || p.featuredAsset;
                            return {
                                id: `${v.id}-${p.id}-${vr.id}`,
                                productId: p.id,
                                productVariantId: vr.id,
                                name: p.name,
                                productName: p.name,
                                productVariantName: vr.name,
                                slug: p.slug,
                                vendorId: v.id,
                                vendorName: v.name,
                                marketName: v.physicalMarket?.name,
                                marketId: v.physicalMarket?.id,
                                locationName: v.location?.name,
                                locationId: v.location?.id,
                                featuredAsset: effectiveAsset,
                                productVariantAsset: vr.featuredAsset,
                                productAsset: p.featuredAsset,
                                priceWithTax: vr.priceWithTax,
                                price: vr.priceWithTax,
                                variants: [vr],
                                customFields: {
                                    ...(vr.customFields || {}),
                                    approvalStatus: p.customFields?.approvalStatus,
                                    vendor: {
                                        id: v.id,
                                        name: v.name,
                                        physicalMarket: v.physicalMarket,
                                        location: v.location,
                                    }
                                },
                                collections: p.collections,
                            };
                        });
                    });
            });

            // 1. Filter by Categories / Rayons if specified
            const categoryFilterMode = config?.categoryFilterMode || 'ALL';
            const isAllCategories = categoryFilterMode === 'ALL';

            const collectionIds = (!isAllCategories && Array.isArray(config?.collectionIds) && config.collectionIds.length > 0)
                ? config.collectionIds.map(String)
                : (!isAllCategories && config?.mixCollectionId ? [String(config.mixCollectionId)] : []);

            if (!isAllCategories && collectionIds.length > 0) {
                localProductsList = localProductsList.filter((p: any) => 
                    (p.collections || []).some((c: any) => collectionIds.includes(String(c.id)))
                );
            }

            // 2. Apply strategy-specific ranking & filtering rules on local products
            const experienceStrategy = config?.experienceStrategy || 'LOCAL_DISCOVERY';
            
            if (experienceStrategy === 'HOME_FEED') {
                // Quota max of products per merchant
                const maxItemsPerVendor = config?.maxItemsPerVendor || 3;
                const vendorCounts: Record<string, number> = {};
                localProductsList = localProductsList.filter((p: any) => {
                    const vId = p.vendorId || 'unknown';
                    vendorCounts[vId] = (vendorCounts[vId] || 0) + 1;
                    return vendorCounts[vId] <= maxItemsPerVendor;
                });
            } else if (experienceStrategy === 'TRENDING') {
                // Sort by promotion or popular criteria
                localProductsList.sort((a: any, b: any) => {
                    const valA = a.variants?.[0]?.customFields?.onPromotion ? 1 : 0;
                    const valB = b.variants?.[0]?.customFields?.onPromotion ? 1 : 0;
                    return valB - valA;
                });
            }

            // 3. Fair round-robin interleaving so sellers are evenly distributed and certified vendors boosted if enabled
            const vendorBuckets: Record<string, any[]> = {};
            const vendorPriority: Record<string, number> = {};
            for (const item of localProductsList) {
                const vId = String(item.vendorId || 'unknown');
                if (!vendorBuckets[vId]) {
                    vendorBuckets[vId] = [];
                    const isCertified = item.marketName && (item.marketName.toLowerCase().includes('dantokpa') || item.marketName.toLowerCase().includes('ganhi'));
                    vendorPriority[vId] = (config?.boostCertifiedVendors !== false && isCertified) ? 1 : 0;
                }
                vendorBuckets[vId].push(item);
            }

            const sortedVendorIds = Object.keys(vendorBuckets).sort((a, b) => (vendorPriority[b] || 0) - (vendorPriority[a] || 0));
            const interleaved: any[] = [];
            const maxLen = Math.max(...Object.values(vendorBuckets).map(b => b.length), 0);
            for (let i = 0; i < maxLen; i++) {
                for (const vId of sortedVendorIds) {
                    if (vendorBuckets[vId][i]) {
                        interleaved.push(vendorBuckets[vId][i]);
                    }
                }
            }
            localProductsList = interleaved;

            // 4. Filter by Selection Mode (Collections / Products / Hybrid)
            const selectionMode = config?.selectionMode || 'COLLECTIONS';
            const manualProductIds = config?.manualProductIds || [];

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
                                        name
                                        priceWithTax
                                        featuredAsset { preview }
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
                    manualProductsList = manualItems.flatMap((p: any) => {
                        const variants = (p.variants || []).filter((vr: any) => !vr.deletedAt);
                        const v = p.customFields?.vendor;
                        if (variants.length === 0) {
                            return [{
                                ...p,
                                vendorName: v?.name,
                                vendorId: v?.id,
                                marketName: v?.physicalMarket?.name,
                                marketId: v?.physicalMarket?.id,
                                locationName: v?.location?.name,
                                locationId: v?.location?.id,
                            }];
                        }
                        return variants.map((vr: any) => ({
                            id: `${v?.id || 'm'}-${p.id}-${vr.id}`,
                            productId: p.id,
                            productVariantId: vr.id,
                            name: p.name,
                            productName: p.name,
                            productVariantName: vr.name,
                            slug: p.slug,
                            vendorId: v?.id,
                            vendorName: v?.name,
                            marketName: v?.physicalMarket?.name,
                            marketId: v?.physicalMarket?.id,
                            locationName: v?.location?.name,
                            locationId: v?.location?.id,
                            featuredAsset: vr.featuredAsset || p.featuredAsset,
                            productVariantAsset: vr.featuredAsset,
                            productAsset: p.featuredAsset,
                            priceWithTax: vr.priceWithTax,
                            price: vr.priceWithTax,
                            variants: [vr],
                            customFields: {
                                ...(vr.customFields || {}),
                                vendor: v,
                            },
                            collections: p.collections,
                        }));
                    });
                } catch (e) {
                    console.error("Error fetching manual products globally:", e);
                }
            }

            // Construct final products list according to selectionMode
            let finalProducts: any[] = [];

            if (selectionMode === 'COLLECTIONS') {
                if (config?.collectionDisplayType === 'PRODUCTS' && manualProductIds.length > 0) {
                    finalProducts = localProductsList.filter((p: any) => 
                        manualProductIds.map(String).includes(String(p.id))
                    );
                } else {
                    finalProducts = localProductsList;
                }
            } else if (selectionMode === 'PRODUCTS') {
                // Mode 2: Manual + Local Engine (ESM)
                const seenKeys = new Set<string>();
                for (const mp of manualProductsList) {
                    const k = `${mp.vendorId || ''}-${mp.id}`;
                    if (!seenKeys.has(k)) {
                        finalProducts.push(mp);
                        seenKeys.add(k);
                    }
                }
                for (const lp of localProductsList) {
                    if (finalProducts.length >= limit) break;
                    const k = `${lp.vendorId || ''}-${lp.id}`;
                    if (!seenKeys.has(k)) {
                        finalProducts.push(lp);
                        seenKeys.add(k);
                    }
                }
            } else if (selectionMode === 'HYBRID') {
                // Mode 3: Hybrid
                const seenKeys = new Set<string>();
                
                // 1. Products of chosen collection in the local zone
                for (const lcp of localProductsList) {
                    const k = `${lcp.vendorId || ''}-${lcp.id}`;
                    if (!seenKeys.has(k)) {
                        finalProducts.push(lcp);
                        seenKeys.add(k);
                    }
                }

                // 2. Manual products
                for (const mp of manualProductsList) {
                    if (finalProducts.length >= limit) break;
                    const k = `${mp.vendorId || ''}-${mp.id}`;
                    if (!seenKeys.has(k)) {
                        finalProducts.push(mp);
                        seenKeys.add(k);
                    }
                }
            } else {
                finalProducts = localProductsList;
            }

            const mixMode = config?.mixMode || 'none';
            if (finalProducts.length === 0 && (mixMode === 'fallback' || mixMode === 'hybrid')) {
                // Fallback vers le catalogue général UNIQUEMENT si le mixMode l'autorise explicitement
                try {
                    const fallbackQuery = `
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
                    `;
                    const fbData = await fetchWithClientCache(shopApiUrl, fallbackQuery, { take: limit });
                    const fbItems = fbData?.search?.items || [];
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
            const handleLocationChanged = () => {
                clearClientCache();
                fetchLocalProducts();
            };
            window.addEventListener('ahizan_location_changed', handleLocationChanged);
            return () => {
                window.removeEventListener('ahizan_location_changed', handleLocationChanged);
            };
        }
    }, [selectedLocation, marketIdFromConfig, locationIdFromConfig, limit, config?.mixCollectionId, config?.mixMode, config?.interleaveSchema, config?.selectionMode, JSON.stringify(config?.collectionIds), JSON.stringify(config?.manualProductIds), config?.experienceStrategy, config?.radiusKm]);

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
                        {products.map((product, idx) => (
                            <div key={`${product.vendorId || 'v'}-${product.productVariantId || product.id || idx}`} className="w-[200px] sm:w-[220px] md:w-[240px] lg:w-[260px] shrink-0 snap-start">
                                <VendorProductCard product={product} config={config} />
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        return (
            <div className={gridClass}>
                {products.map((product, idx) => (
                    <VendorProductCard key={`${product.vendorId || 'v'}-${product.productVariantId || product.id || idx}`} product={product} config={config} />
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
                    {displayBadgeText && displayBadgeText.trim() !== '' && (
                        <span 
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase shadow-sm w-fit"
                            style={{ backgroundColor: badgeBgColor, color: badgeTextColor }}
                        >
                            {displayBadgeText}
                        </span>
                    )}
                    {displayTitle && displayTitle.trim() !== '' && (
                        <h2 className="text-xl md:text-2xl font-black text-foreground flex items-center gap-2" style={{ color: titleColor || undefined }}>
                            {displayIcon && <span>{displayIcon}</span>} {displayTitle}
                        </h2>
                    )}
                    {displaySubtitle && displaySubtitle.trim() !== '' && <p className="text-xs sm:text-sm text-muted-foreground mt-0.5" style={{ color: subtitleColor || undefined }}>{displaySubtitle}</p>}
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
                    <MapPin className="w-10 h-10 text-muted-foreground/60 mb-3 text-primary animate-bounce" />
                    <h3 className="text-sm font-bold text-foreground">Aucun article dans ce périmètre</h3>
                    <p className="text-xs text-muted-foreground mt-1.5 max-w-sm">
                        Aucun vendeur actif trouvé dans un rayon de <strong>{config?.radiusKm ? `${config.radiusKm} km` : '15 km'}</strong> autour de <strong>{locationName || selectedLocation?.name || 'votre position'}</strong>.
                    </p>
                    <p className="text-[11px] text-muted-foreground/70 mt-1">
                        Conseil : élargissez le rayon de recherche ou sélectionnez un grand marché comme Dantokpa ou Ganhi.
                    </p>
                </div>
            ) : (
                renderProductsLayout()
            )}
        </section>
    );
}
