 "use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { getShopApiUrl } from '@/lib/vendure/api-utils';
import { VendorProductCard } from '@/components/commerce/vendor-product-card';
import { MasterProductCard } from '@/components/commerce/master-product-card';
import { processAndResolveDisplayItems } from '@/lib/vendure/display-engine';
import { Sparkles, MapPin, Store, ChevronLeft, ChevronRight, ArrowRight, ArrowUpRight } from 'lucide-react';
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
    const displayIcon = config?.icon || '';
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

            const searchCandidateQuery = `
                query GetCandidatesForLocal($take: Int!) {
                    search(input: { take: $take, groupByProduct: false }) {
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

            const nearbyVendorsQuery = `
                query GetNearbyVendorsForLocal($marketId: ID, $locationId: ID, $latitude: Float, $longitude: Float, $radiusKm: Float) {
                    vendors(
                        marketId: $marketId, 
                        locationId: $locationId, 
                        latitude: $latitude, 
                        longitude: $longitude,
                        radiusKm: $radiusKm,
                        options: { filter: { status: { eq: "APPROVED" } }, take: 50 }
                    ) {
                        items {
                            id
                            name
                            latitude
                            longitude
                            physicalMarket { id name }
                            location { id name }
                            products {
                                id
                                name
                                slug
                                featuredAsset { preview }
                                variants {
                                    id
                                    name
                                    priceWithTax
                                    featuredAsset { preview }
                                }
                            }
                        }
                    }
                }
            `;

            // Fetch search candidate products & nearby vendor products in parallel
            const [searchRes, vendorsRes] = await Promise.all([
                fetchWithClientCache(shopApiUrl, searchCandidateQuery, { take: 100 }).catch(() => null),
                fetchWithClientCache(shopApiUrl, nearbyVendorsQuery, {
                    marketId: variables.marketId,
                    locationId: variables.locationId,
                    latitude: variables.latitude,
                    longitude: variables.longitude,
                    radiusKm: variables.radiusKm,
                }).catch(() => null),
            ]);

            const rawVendorProducts: any[] = [];

            // Multivendor seller offers to support modern catalog architecture
            try {
                const sItems = searchRes?.search?.items || [];
                const vVendors = vendorsRes?.vendors?.items || [];
                const vItems = vVendors.flatMap((v: any) =>
                    (v.products || []).flatMap((p: any) =>
                        (p.variants || []).map((vr: any) => ({
                            productId: p.id,
                            productName: p.name,
                            slug: p.slug,
                            productAsset: p.featuredAsset,
                            productVariantId: vr.id,
                            productVariantName: vr.name,
                            featuredAsset: vr.featuredAsset || p.featuredAsset,
                            priceWithTax: { __typename: 'SinglePrice', value: vr.priceWithTax },
                            inStock: true,
                            vendor: v,
                        }))
                    )
                );

                const candidatePool = [...vItems, ...sItems];
                const variantIds = Array.from(new Set(candidatePool.map((i: any) => String(i.productVariantId || i.id)).filter(Boolean))).slice(0, 150);

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
                                featuredAsset { id preview }
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

                    for (const item of candidatePool) {
                        const vId = String(item.productVariantId || item.id);
                        const matchingOffers = offers.filter(o => String(o.productVariant?.id) === vId && o.vendor?.id);
                        for (const off of matchingOffers) {
                            const resolvedAsset = off.featuredAsset 
                                || off.productVariant?.featuredAsset 
                                || off.productVariant?.product?.featuredAsset 
                                || item.featuredAsset 
                                || item.productVariantAsset 
                                || item.productAsset 
                                || (typeof item.productPreview === 'string' ? { preview: item.productPreview } : item.productPreview);

                            rawVendorProducts.push({
                                ...item,
                                productId: off.productVariant?.product?.id || item.productId,
                                productName: off.productVariant?.product?.name || item.productName,
                                slug: off.productVariant?.product?.slug || item.slug,
                                productVariantId: vId,
                                productVariantName: off.productVariant?.name || item.productVariantName,
                                productVariant: {
                                    ...off.productVariant,
                                    featuredAsset: off.productVariant?.featuredAsset || resolvedAsset,
                                },
                                featuredAsset: resolvedAsset,
                                productAsset: off.productVariant?.product?.featuredAsset || item.productAsset || resolvedAsset,
                                productVariantAsset: off.productVariant?.featuredAsset || resolvedAsset,
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
                limit: limit,
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
                fetchLocalProducts();
            };
            window.addEventListener('ahizan_location_changed', handleLocationChanged);
            return () => {
                window.removeEventListener('ahizan_location_changed', handleLocationChanged);
            };
        }
    }, [selectedLocation, marketIdFromConfig, locationIdFromConfig, limit, rawLimit, config?.limit, config?.take, config?.maxProducts, config?.mixCollectionId, config?.mixMode, config?.interleaveSchema, config?.selectionMode, JSON.stringify(config?.collectionIds), JSON.stringify(config?.manualProductIds), config?.experienceStrategy, config?.radiusKm]);

    const renderProductsLayout = () => {
        const columns = config?.columns || 5;
        const colClasses: Record<number, string> = {
            3: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7',
            4: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7',
            5: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7',
            6: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8',
        };
        const gridClass = `grid ${colClasses[columns] || colClasses[5]} gap-2.5 sm:gap-3.5 md:gap-4`;
        const displayedProducts = products.slice(0, limit);

        if (layout === 'carousel') {
            return (
                <div className="relative group/carousel">
                    {/* Left Navigation Arrow */}
                    <button 
                        onClick={() => scroll('left')}
                        className="absolute left-[-16px] top-1/2 -translate-y-1/2 z-20 bg-white shadow-lg rounded-full p-2 border border-border/50 text-foreground hover:bg-muted hover:scale-110 transition-all opacity-0 group-hover/carousel:opacity-100 hidden md:flex items-center justify-center cursor-pointer"
                        aria-label="Défiler vers la gauche"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>

                    {/* Right Navigation Arrow */}
                    <button 
                        onClick={() => scroll('right')}
                        className="absolute right-[-16px] top-1/2 -translate-y-1/2 z-20 bg-white shadow-lg rounded-full p-2 border border-border/50 text-foreground hover:bg-muted hover:scale-110 transition-all opacity-0 group-hover/carousel:opacity-100 hidden md:flex items-center justify-center cursor-pointer"
                        aria-label="Défiler vers la droite"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>

                    <div 
                        ref={scrollContainerRef}
                        className="flex overflow-x-auto pb-4 gap-2.5 sm:gap-3.5 md:gap-4 custom-scrollbar snap-x snap-mandatory"
                        style={{
                            scrollbarWidth: 'none',
                            msOverflowStyle: 'none',
                        } as React.CSSProperties}
                    >
                        {displayedProducts.map((product, idx) => (
                            <div key={`${product.vendorId || 'v'}-${product.productId || product.id || idx}`} className="w-[145px] sm:w-[165px] md:w-[180px] lg:w-[190px] shrink-0 snap-start">
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
        <section className="w-full max-w-[1720px] mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-3 md:py-5 font-sans animate-in fade-in duration-500">
            {/* Modern Header: Centered Icon, Title on top, Subtitle underneath aligned */}
            <div className="flex items-center justify-between mb-4 md:mb-5 gap-3 w-full">
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900/40 flex items-center justify-center text-red-600 shrink-0">
                        <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2]" />
                    </div>
                    <div className="flex flex-col min-w-0">
                        <h2 
                            className="text-base sm:text-xl md:text-2xl font-bold tracking-tight text-gray-900 dark:text-white leading-tight truncate max-w-[220px] sm:max-w-md"
                            style={{ color: titleColor || undefined }}
                        >
                            {(displayTitle || 'Près de chez vous').replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}]/gu, '').trim() || 'Près de chez vous'}
                        </h2>
                        {displaySubtitle && displaySubtitle.trim() !== '' && (
                            <p 
                                className="text-[11px] sm:text-xs md:text-sm font-medium text-gray-500 dark:text-gray-400 leading-snug line-clamp-1 sm:line-clamp-2 max-w-[260px] sm:max-w-xl truncate mt-0.5"
                                style={{ color: subtitleColor || undefined }}
                            >
                                {(displaySubtitle).replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}]/gu, '').trim()}
                            </p>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    {/* Desktop: Full button with text */}
                    <Link 
                        href="/local-discovery"
                        className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900/90 hover:bg-white dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs sm:text-sm font-bold shadow-2xs hover:shadow-xs transition-all shrink-0 cursor-pointer"
                    >
                        <span>Voir tout</span>
                        <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-600 dark:text-slate-300" />
                    </Link>

                    {/* Mobile: Sleek compact circular button with ArrowUpRight */}
                    <Link 
                        href="/local-discovery"
                        className="sm:hidden w-8 h-8 rounded-full border border-slate-300/80 bg-white dark:bg-slate-800 shadow-2xs flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-50 active:scale-95 shrink-0"
                        aria-label="Voir tout"
                        title="Voir tout"
                    >
                        <ArrowUpRight className="w-4 h-4" />
                    </Link>
                </div>
            </div>

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
