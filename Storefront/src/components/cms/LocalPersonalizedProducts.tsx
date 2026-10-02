 "use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { getShopApiUrl } from '@/lib/vendure/api-utils';
import { VendorProductCard } from '@/components/commerce/vendor-product-card';
import { MasterProductCard } from '@/components/commerce/master-product-card';
import { processAndResolveDisplayItems } from '@/lib/vendure/display-engine';
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

    // Carousel Autoplay
    useEffect(() => {
        const speed = Number(config?.autoplaySpeed || 0);
        if (config?.layout !== 'carousel' || speed <= 0) return;

        const interval = setInterval(() => {
            if (scrollContainerRef.current) {
                const maxScrollLeft = scrollContainerRef.current.scrollWidth - scrollContainerRef.current.clientWidth;
                if (scrollContainerRef.current.scrollLeft >= maxScrollLeft - 10) {
                    scrollContainerRef.current.scrollTo({ left: 0, behavior: 'smooth' });
                } else {
                    scroll('right');
                }
            }
        }, speed);

        return () => clearInterval(interval);
    }, [config?.layout, config?.autoplaySpeed]);

    const displayTitle = config?.title !== undefined && config?.title !== null ? config.title : "Produits à Proximité";
    const displayIcon = config?.icon ?? '🛍️';
    const displaySubtitle = config?.subtitle || '';
    const displayBadgeText = config?.badgeText || '';
    const rawLimit = config?.limit ?? config?.take ?? config?.maxProducts ?? config?.count;
    const limit = (rawLimit !== undefined && rawLimit !== null && !isNaN(Number(rawLimit)) && Number(rawLimit) > 0) 
        ? Number(rawLimit) 
        : 8;
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
            if (isFixedMarket && marketIdFromConfig && !isNaN(Number(marketIdFromConfig))) {
                variables.marketId = String(marketIdFromConfig);
                displayName = config?.marketName || '';
            } else if (isFixedLocation && locationIdFromConfig && !isNaN(Number(locationIdFromConfig))) {
                variables.locationId = String(locationIdFromConfig);
                displayName = config?.locationName || '';
            }
        } else {
            let activeLoc = selectedLocation;
            if (!activeLoc && typeof window !== 'undefined') {
                try {
                    const saved = localStorage.getItem('ahizan_client_location');
                    if (saved) activeLoc = JSON.parse(saved);
                } catch (e) {}
            }

            if (activeLoc) {
                hasLocation = true;
                displayName = activeLoc.name || '';
                const mId = activeLoc.marketId || (activeLoc.type === 'MARKET' && !isNaN(Number(activeLoc.id)) ? activeLoc.id : undefined);
                if (mId && !isNaN(Number(mId))) {
                    variables.marketId = String(mId);
                }
                const zId = activeLoc.geoZoneId || (activeLoc.type !== 'MARKET' && activeLoc.id !== 'gps_raw' && !isNaN(Number(activeLoc.id)) ? activeLoc.id : undefined);
                if (zId && !isNaN(Number(zId))) {
                    variables.locationId = String(zId);
                }
                if (activeLoc.latitude != null && activeLoc.longitude != null && !isNaN(Number(activeLoc.latitude)) && !isNaN(Number(activeLoc.longitude))) {
                    variables.latitude = Number(activeLoc.latitude);
                    variables.longitude = Number(activeLoc.longitude);
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
                                    options {
                                        id
                                        name
                                        code
                                        group { id name }
                                    }
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

            let resultLocal = await fetchWithClientCache(shopApiUrl, localQuery, variables);
            let vendorsList = resultLocal?.vendors?.items || [];

            // Progressive Proximity Fallback:
            // If the filtered query returned 0 vendors (e.g. user in a subzone without direct local vendors),
            // seamlessly expand to all approved vendors across the region and let the Display Engine score them by distance/city.
            if (vendorsList.length === 0 && (variables.marketId || variables.locationId || variables.latitude)) {
                const globalVendorsResult = await fetchWithClientCache(shopApiUrl, localQuery, {});
                vendorsList = globalVendorsResult?.vendors?.items || [];
            }

            const rawVendorProducts: any[] = [];

            // Also fetch multivendor seller offers to support modern catalog architecture
            try {
                const searchCandidateQuery = `
                    query GetCandidatesForLocal {
                        search(input: { take: 200, groupByProduct: false }) {
                            items {
                                productId
                                productVariantId
                                productName
                                productVariantName
                                slug
                                productAsset { id preview }
                                productVariantAsset { id preview }
                                priceWithTax {
                                    __typename
                                    ... on SinglePrice { value }
                                    ... on PriceRange { min max }
                                }
                                inStock
                            }
                        }
                    }
                `;
                const searchRes = await fetchWithClientCache(shopApiUrl, searchCandidateQuery);
                const sItems = searchRes?.search?.items || [];
                const variantIds = Array.from(new Set(sItems.map((i: any) => i.productVariantId).filter(Boolean)));

                if (variantIds.length > 0) {
                    const sellerOffersQuery = `
                        query GetLocalSellerOffers($variantIds: [ID!]!) {
                            sellerOffersForVariants(variantIds: $variantIds) {
                                id
                                price
                                stock
                                onPromotion
                                promotionalPrice
                                condition
                                deliveryTimeValue
                                deliveryTimeUnit
                                vendor {
                                    id
                                    name
                                    phoneNumber
                                    latitude
                                    longitude
                                    verificationStatus
                                    rating
                                    ratingCount
                                    logo { preview }
                                    location { id name }
                                    physicalMarket { id name }
                                }
                                productVariant {
                                    id
                                    name
                                    sku
                                    featuredAsset { id preview }
                                    options { id name code group { id name } }
                                    product {
                                        id
                                        name
                                        slug
                                        featuredAsset { id preview }
                                    }
                                }
                            }
                        }
                    `;
                    const offersRes = await fetchWithClientCache(shopApiUrl, sellerOffersQuery, { variantIds });
                    const offers: any[] = offersRes?.sellerOffersForVariants || [];

                    for (const item of sItems) {
                        const vId = String(item.productVariantId);
                        const matchingOffers = offers.filter(o => String(o.productVariant?.id) === vId && o.vendor?.id);
                        for (const off of matchingOffers) {
                            rawVendorProducts.push({
                                ...item,
                                productId: item.productId || off.productVariant?.product?.id,
                                productName: item.productName || off.productVariant?.product?.name,
                                productVariantId: vId,
                                productVariantName: off.productVariant?.name || item.productVariantName,
                                productVariant: off.productVariant,
                                sku: off.productVariant?.sku,
                                vendorId: off.vendor?.id,
                                vendorName: off.vendor?.name,
                                marketName: off.vendor?.physicalMarket?.name,
                                marketId: off.vendor?.physicalMarket?.id,
                                locationName: off.vendor?.location?.name,
                                locationId: off.vendor?.location?.id,
                                latitude: off.vendor?.latitude,
                                longitude: off.vendor?.longitude,
                                price: off.price,
                                promotionalPrice: off.promotionalPrice,
                                onPromotion: off.onPromotion,
                                stock: off.stock,
                                condition: off.condition,
                                deliveryTimeValue: off.deliveryTimeValue,
                                deliveryTimeUnit: off.deliveryTimeUnit,
                                vendor: off.vendor,
                                options: off.productVariant?.options,
                                customFields: {
                                    vendor: off.vendor,
                                    onPromotion: off.onPromotion,
                                    promotionalPrice: off.promotionalPrice,
                                }
                            });
                        }
                    }
                }
            } catch (err) {
                console.warn('Error fetching candidate seller offers for local products:', err);
            }

            // Context for Decision Engine
            const activeLoc = selectedLocation || (typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('ahizan_client_location') || 'null') : null);
            const displayContext = {
                experienceStrategy: config?.experienceStrategy || 'LOCAL_DISCOVERY',
                userLat: variables.latitude ?? (activeLoc?.latitude ? Number(activeLoc.latitude) : undefined),
                userLon: variables.longitude ?? (activeLoc?.longitude ? Number(activeLoc.longitude) : undefined),
                marketId: variables.marketId ?? activeLoc?.marketId,
                locationId: variables.locationId ?? activeLoc?.geoZoneId ?? activeLoc?.id,
                communeName: displayName || activeLoc?.commune || activeLoc?.name,
                maxItemsPerVendor: config?.maxItemsPerVendor || (config?.experienceStrategy === 'HOME_FEED' ? 3 : 4),
                maxVariantsPerCentralProduct: config?.maxVariantsPerCentralProduct || 2,
                boostCertifiedVendors: config?.boostCertifiedVendors !== false,
            };

            // Resolve items via Decision Engine
            let resolvedLocal = processAndResolveDisplayItems(rawVendorProducts, displayContext);

            // 1. Filter by Categories / Rayons if specified
            const categoryFilterMode = config?.categoryFilterMode || 'ALL';
            const isAllCategories = categoryFilterMode === 'ALL';

            const collectionIds = (!isAllCategories && Array.isArray(config?.collectionIds) && config.collectionIds.length > 0)
                ? config.collectionIds.map(String)
                : (!isAllCategories && config?.mixCollectionId ? [String(config.mixCollectionId)] : []);

            if (!isAllCategories && collectionIds.length > 0) {
                resolvedLocal = resolvedLocal.filter((p: any) => 
                    (p.collections || []).some((c: any) => collectionIds.includes(String(c.id)))
                );
            }

            // 2. Sorting by strategy
            const experienceStrategy = config?.experienceStrategy || 'LOCAL_DISCOVERY';
            if (experienceStrategy === 'TRENDING') {
                resolvedLocal.sort((a: any, b: any) => {
                    const valA = a.winningOffer?.onPromotion ? 1 : 0;
                    const valB = b.winningOffer?.onPromotion ? 1 : 0;
                    return valB - valA;
                });
            }

            localProductsList = resolvedLocal;

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
                                        options {
                                            id
                                            name
                                            code
                                            group { id name }
                                        }
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
                    manualProductsList = processAndResolveDisplayItems(manualItems, displayContext);
                } catch (e) {
                    console.error("Error fetching manual products globally:", e);
                }
            }

            // Construct final products list according to selectionMode
            let finalProducts: any[] = [];

            if (selectionMode === 'COLLECTIONS') {
                if (config?.collectionDisplayType === 'PRODUCTS' && manualProductIds.length > 0) {
                    finalProducts = localProductsList.filter((p: any) => 
                        manualProductIds.map(String).includes(String(p.productId || p.id))
                    );
                } else {
                    finalProducts = localProductsList;
                }
            } else if (selectionMode === 'PRODUCTS') {
                // Mode 2: Manual selected products
                finalProducts = manualProductsList.length > 0 ? manualProductsList : localProductsList;
            } else if (selectionMode === 'HYBRID') {
                // Mode 3: Hybrid (Manual + Local)
                const seenIds = new Set<string>();
                finalProducts = [];
                for (const mp of [...manualProductsList, ...localProductsList]) {
                    const id = String(mp.productId || mp.id);
                    if (!seenIds.has(id)) {
                        seenIds.add(id);
                        finalProducts.push(mp);
                    }
                }
            } else {
                finalProducts = localProductsList;
            }

            const mixMode = config?.mixMode || 'none';
            // Progressive Fallback: Never leave a section empty if products exist in broader catalog
            if (finalProducts.length === 0 && (!requireConfirmedLocation || mixMode === 'fallback' || mixMode === 'hybrid')) {
                try {
                    const catalogFallbackQuery = `
                        query GetCatalogProducts($take: Int!) {
                            products(options: { take: $take }) {
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
                                        options {
                                            id
                                            name
                                            code
                                            group { id name }
                                        }
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
                    const fbData = await fetchWithClientCache(shopApiUrl, catalogFallbackQuery, { take: Math.max(limit, 12) });
                    const fbItems = fbData?.products?.items || [];
                    finalProducts = processAndResolveDisplayItems(fbItems, {
                        ...displayContext,
                        limit,
                    });
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
    }, [selectedLocation, marketIdFromConfig, locationIdFromConfig, limit, rawLimit, config?.limit, config?.take, config?.maxProducts, config?.mixCollectionId, config?.mixMode, config?.interleaveSchema, config?.selectionMode, JSON.stringify(config?.collectionIds), JSON.stringify(config?.manualProductIds), config?.experienceStrategy, config?.radiusKm]);

    const renderProductsLayout = () => {
        const columns = config?.columns || 4;
        const colClasses: Record<number, string> = {
            3: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3',
            4: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
            5: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-5',
            6: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6',
        };
        const gridClass = `grid ${colClasses[columns] || colClasses[4]} gap-4 md:gap-6`;
        const displayedProducts = products.slice(0, limit);

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
                        {displayedProducts.map((product, idx) => (
                            <div key={`${product.vendorId || 'v'}-${product.productId || product.id || idx}`} className="w-[200px] sm:w-[220px] md:w-[240px] lg:w-[260px] shrink-0 snap-start">
                                <MasterProductCard item={product} config={config} />
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        return (
            <div className={gridClass}>
                {displayedProducts.map((product, idx) => (
                    <MasterProductCard key={`${product.vendorId || 'v'}-${product.productId || product.id || idx}`} item={product} config={config} />
                ))}
            </div>
        );
    };

    const alignClass = textAlign === 'center' ? 'text-center items-center justify-center' : textAlign === 'right' ? 'text-right items-end' : 'text-left items-start';
    const headerStyle = config?.headerStyle || 'smart_cart';

    if (!loading && products.length === 0 && !isCmsPreview) {
        return null;
    }

    return (
        <section className="py-3 md:py-5 max-w-[1440px] mx-auto w-full px-3 sm:px-4 md:px-8 lg:px-12 font-sans animate-in fade-in duration-500">
            {headerStyle === 'standard' && (
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                    <div className={`flex flex-col ${alignClass} gap-1`}>
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
                    <Link 
                        href="/local-discovery"
                        className="text-xs font-black text-primary hover:underline flex items-center gap-1 shrink-0 py-1"
                    >
                        <span>VOIR TOUT</span>
                        <ChevronRight className="w-4 h-4" />
                    </Link>
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
                    <Link 
                        href="/local-discovery"
                        className="text-xs font-black text-primary hover:underline flex items-center gap-1 shrink-0 py-1"
                    >
                        <span>VOIR TOUT</span>
                        <ChevronRight className="w-4 h-4" />
                    </Link>
                </div>
            )}
            {(headerStyle === 'smart_cart' || !['standard', 'bordered'].includes(headerStyle)) && (
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                    <div className={`flex flex-col ${alignClass} gap-1`}>
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

                    <Link 
                        href="/local-discovery"
                        className="text-xs font-black text-primary hover:underline flex items-center gap-1 shrink-0 py-1"
                    >
                        <span>VOIR TOUT</span>
                        <ChevronRight className="w-4 h-4" />
                    </Link>
                </div>
            )}

            {loading ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="aspect-[3/4] rounded-3xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
                    ))}
                </div>
            ) : products.length === 0 ? (
                isCmsPreview ? (
                    <div className="flex flex-col items-center justify-center py-8 px-6 rounded-2xl border border-dashed border-border bg-muted/20 text-center max-w-md mx-auto text-xs text-muted-foreground">
                        <MapPin className="w-6 h-6 text-primary mb-2" />
                        <span>Section Découverte Locale (aucun produit correspondant aux critères actuels)</span>
                    </div>
                ) : null
            ) : (
                renderProductsLayout()
            )}
        </section>
    );
}
