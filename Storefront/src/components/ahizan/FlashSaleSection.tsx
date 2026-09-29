"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Clock, ChevronRight, ChevronLeft, Sparkles } from "lucide-react";
import * as LucideIcons from "lucide-react";
import Link from "next/link";
import { ProductCard } from "@/components/commerce/product-card";
import { MasterProductCard } from "@/components/commerce/master-product-card";
import { processAndResolveDisplayItems } from "@/lib/vendure/display-engine";
import { getAssetUrl, getShopApiUrl, getPromoPriceInfo } from "@/lib/vendure/api-utils";
import { fetchWithClientCache } from "@/lib/vendure/client-cache";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useThemeSettings } from '@/components/providers/theme-provider';
import { useLocation } from '@/contexts/location-context';

interface FlashSaleSectionProps {
    config: any;
}

const isGif = (url: string) => url?.toLowerCase().endsWith('.gif');

export function FlashSaleSection({ config: activeFlash }: FlashSaleSectionProps) {
    const hasExplicitCountdown = !activeFlash?.isUnlimited && 
        activeFlash?.showCountdown !== false && 
        Boolean(activeFlash?.countdownEnd || activeFlash?.endTime);

    let endTimeStr = activeFlash?.countdownEnd || activeFlash?.endTime;
    let endMs = typeof endTimeStr === 'string' && endTimeStr.trim().length > 0 ? new Date(endTimeStr).getTime() : NaN;
    
    if (hasExplicitCountdown && (isNaN(endMs) || endMs <= Date.now())) {
        if (activeFlash?.forceHideWhenExpired === true) {
            return null;
        }
    }

    const { selectedLocation } = useLocation();
    const [clientLoc, setClientLoc] = useState<any>(selectedLocation || null);
    const [flashProducts, setFlashProducts] = useState<any[]>([]);
    const iconValue = activeFlash?.icon || '⚡';
    const DynamicIcon = (LucideIcons as any)[iconValue];
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [timeLeft, setTimeLeft] = useState({ h: '00', m: '00', s: '00' });
    const themeSettings = useThemeSettings();
    const defaultImage = themeSettings?.defaultProductImage;
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Synchronize client location from context or localStorage
    useEffect(() => {
        if (selectedLocation) {
            setClientLoc(selectedLocation);
        } else if (typeof window !== 'undefined') {
            try {
                const savedLoc = localStorage.getItem('ahizan_client_location');
                if (savedLoc) setClientLoc(JSON.parse(savedLoc));
            } catch (_) {}
        }
    }, [selectedLocation]);

    // Listen to real-time location changes across the platform (e.g. city selector modal)
    useEffect(() => {
        const handleLocationChange = () => {
            try {
                const saved = localStorage.getItem('ahizan_client_location');
                if (saved) {
                    setClientLoc(JSON.parse(saved));
                } else {
                    setClientLoc(null);
                }
            } catch (_) {}
        };
        window.addEventListener('ahizan_location_changed', handleLocationChange);
        return () => window.removeEventListener('ahizan_location_changed', handleLocationChange);
    }, []);

    const scroll = (direction: 'left' | 'right') => {
        if (scrollContainerRef.current) {
            const { current } = scrollContainerRef;
            const scrollAmount = current.clientWidth * 0.8;
            current.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
        }
    };

    // Calculate smart view all link preserving collection, market and filters
    const targetViewAllLink = useMemo(() => {
        if (activeFlash?.viewAllLink && typeof activeFlash.viewAllLink === 'string' && activeFlash.viewAllLink.trim().length > 0) {
            return activeFlash.viewAllLink.trim();
        }
        const params = new URLSearchParams();
        if (activeFlash?.collectionSlug) {
            params.set('collection', String(activeFlash.collectionSlug));
        } else if (activeFlash?.collectionId) {
            params.set('collectionId', String(activeFlash.collectionId));
        } else if (Array.isArray(activeFlash?.filterCriteria?.collectionIds) && activeFlash.filterCriteria.collectionIds.length > 0) {
            params.set('collectionId', activeFlash.filterCriteria.collectionIds.map(String).join(','));
        } else if (Array.isArray(activeFlash?.collectionIds) && activeFlash.collectionIds.length > 0) {
            params.set('collectionId', activeFlash.collectionIds.map(String).join(','));
        }
        if (activeFlash?.marketId) {
            params.set('marketId', String(activeFlash.marketId));
        } else if (activeFlash?.selectionType === 'LOCAL_MARKET' && clientLoc?.id) {
            params.set('marketId', String(clientLoc.id));
        }
        const qs = params.toString();
        return `/flash-deals${qs ? `?${qs}` : ''}`;
    }, [activeFlash?.viewAllLink, activeFlash?.collectionSlug, activeFlash?.collectionId, activeFlash?.filterCriteria, activeFlash?.collectionIds, activeFlash?.marketId, activeFlash?.selectionType, clientLoc?.id]);

    useEffect(() => {
        if (!hasExplicitCountdown || !endTimeStr) return;
        
        const updateTimer = () => {
            const now = new Date();
            const end = new Date(endTimeStr);
            const start = activeFlash.startTime ? new Date(activeFlash.startTime) : now;
            
            const isActive = now >= start && now <= end;
            const isSimple = activeFlash.isSimpleMode;

            if (!isActive && !isSimple) {
                setTimeLeft({ h: '00', m: '00', s: '00' });
                return;
            }

            const diff = end.getTime() - now.getTime();
            if (diff <= 0) {
                setTimeLeft({ h: '00', m: '00', s: '00' });
                return;
            }
        
            const h = Math.floor(diff / (1000 * 60 * 60));
            const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const s = Math.floor((diff % (1000 * 60)) / 1000);
            
            setTimeLeft({
                h: h < 10 ? `0${h}` : `${h}`,
                m: m < 10 ? `0${m}` : `${m}`,
                s: s < 10 ? `0${s}` : `${s}`
            });
        };

        updateTimer();
        const timer = setInterval(updateTimer, 1000);
        return () => clearInterval(timer);
    }, [hasExplicitCountdown, endTimeStr, activeFlash]);

    const activeFlashStr = JSON.stringify(activeFlash);

    useEffect(() => {
        const activeFlashObj = activeFlashStr ? JSON.parse(activeFlashStr) : null;
        if (!activeFlashObj) return;

        const locObj = clientLoc;
        const isLocalMode = activeFlashObj.selectionType === 'LOCAL_NEIGHBORHOOD' || activeFlashObj.selectionType === 'LOCAL_MARKET';
        const isManualMode = activeFlashObj.selectionType === 'MANUAL';
        const manualProductIds = (activeFlashObj.manualProductIds || []).map(String).filter(Boolean);
        const collectionIds = (activeFlashObj.filterCriteria?.collectionIds || activeFlashObj.collectionIds || []).map(String).filter(Boolean);
        const collectionSlug = activeFlashObj.collectionSlug || activeFlashObj.filterCriteria?.collectionSlug;

        // 1. Strict Empty Check:
        // If in FILTER mode (or default) and NO collections are selected -> DO NOT show random products.
        if (!isLocalMode && !isManualMode && collectionIds.length === 0 && !collectionSlug) {
            setFlashProducts([]);
            setLoading(false);
            return;
        }

        // If in MANUAL mode and NO product IDs -> show nothing.
        if (isManualMode && manualProductIds.length === 0) {
            setFlashProducts([]);
            setLoading(false);
            return;
        }

        if (isLocalMode && !locObj && activeFlashObj.unconfirmedLocationBehavior === 'hide_completely') {
            setFlashProducts([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        setErrorMsg(null);

        const targetMarketId = locObj?.marketId || (locObj?.type === 'MARKET' && locObj?.id && !isNaN(Number(locObj.id)) ? String(locObj.id) : undefined);
        const targetLocationId = locObj?.geoZoneId || (locObj?.type !== 'MARKET' && locObj?.id && locObj.id !== 'gps_raw' && !isNaN(Number(locObj.id)) ? String(locObj.id) : undefined);
        const userLat = locObj?.latitude != null && !isNaN(Number(locObj.latitude)) ? Number(locObj.latitude) : undefined;
        const userLon = locObj?.longitude != null && !isNaN(Number(locObj.longitude)) ? Number(locObj.longitude) : undefined;

        const shopApiUrl = getShopApiUrl();

        const loadProducts = async () => {
            try {
                let baseItems: any[] = [];

                if (isManualMode) {
                    const manualQuery = `
                        query GetManualFlashProducts($ids: [ID!]!) {
                            products(options: { filter: { id: { in: $ids } } }) {
                                items {
                                    id
                                    name
                                    slug
                                    featuredAsset { id preview }
                                    assets { id preview }
                                    variants {
                                        id
                                        name
                                        priceWithTax
                                        featuredAsset { id preview }
                                        options { id name code group { id name } }
                                    }
                                }
                            }
                        }
                    `;
                    const res = await fetchWithClientCache(shopApiUrl, manualQuery, { ids: manualProductIds });
                    const pList = res?.products?.items || [];
                    for (const p of pList) {
                        for (const vr of (p.variants || [])) {
                            baseItems.push({
                                productId: p.id,
                                id: p.id,
                                name: p.name,
                                slug: p.slug,
                                featuredAsset: vr.featuredAsset || p.featuredAsset || p.assets?.[0],
                                productAsset: p.featuredAsset || p.assets?.[0],
                                productVariantId: vr.id,
                                productVariantName: vr.name,
                                variants: [vr],
                                priceWithTax: { __typename: 'SinglePrice', value: vr.priceWithTax },
                                inStock: true,
                            });
                        }
                    }
                } else if (!isLocalMode) {
                    // FILTER MODE: Strictly fetch items for the configured collection(s)
                    const searchFlashQuery = `
                        query GetFlashSearchProducts($input: SearchInput!) {
                            search(input: $input) {
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
                                    currencyCode
                                    inStock
                                }
                            }
                        }
                    `;

                    if (collectionIds.length > 0) {
                        const searchPromises = collectionIds.map((cId: string) => 
                            fetchWithClientCache(shopApiUrl, searchFlashQuery, { 
                                input: { collectionId: cId, take: 50, groupByProduct: false } 
                            }).catch(() => null)
                        );
                        const results = await Promise.all(searchPromises);
                        const seenKeys = new Set<string>();
                        for (const r of results) {
                            const items = r?.search?.items || [];
                            for (const item of items) {
                                const key = `${item.productId}-${item.productVariantId}`;
                                if (!seenKeys.has(key)) {
                                    seenKeys.add(key);
                                    baseItems.push({
                                        productId: item.productId,
                                        productVariantId: item.productVariantId,
                                        id: item.productId,
                                        name: item.productName,
                                        productName: item.productName,
                                        productVariantName: item.productVariantName,
                                        slug: item.slug,
                                        featuredAsset: item.productAsset || item.productVariantAsset,
                                        productAsset: item.productAsset,
                                        productVariantAsset: item.productVariantAsset,
                                        variants: [{
                                            id: item.productVariantId,
                                            name: item.productVariantName || item.productName,
                                            priceWithTax: item.priceWithTax?.value ?? item.priceWithTax?.min ?? 0,
                                            featuredAsset: item.productVariantAsset || item.productAsset,
                                        }],
                                        priceWithTax: item.priceWithTax,
                                        inStock: item.inStock !== false,
                                    });
                                }
                            }
                        }
                    } else if (collectionSlug) {
                        const r = await fetchWithClientCache(shopApiUrl, searchFlashQuery, { 
                            input: { collectionSlug, take: 50, groupByProduct: false } 
                        });
                        const items = r?.search?.items || [];
                        for (const item of items) {
                            baseItems.push({
                                productId: item.productId,
                                productVariantId: item.productVariantId,
                                id: item.productId,
                                name: item.productName,
                                productName: item.productName,
                                productVariantName: item.productVariantName,
                                slug: item.slug,
                                featuredAsset: item.productAsset || item.productVariantAsset,
                                productAsset: item.productAsset,
                                productVariantAsset: item.productVariantAsset,
                                variants: [{
                                    id: item.productVariantId,
                                    name: item.productVariantName || item.productName,
                                    priceWithTax: item.priceWithTax?.value ?? item.priceWithTax?.min ?? 0,
                                    featuredAsset: item.productVariantAsset || item.productAsset,
                                }],
                                priceWithTax: item.priceWithTax,
                                inStock: item.inStock !== false,
                            });
                        }
                    }
                } else {
                    // LOCAL MODE (Local Market or Neighborhood)
                    const localQuery = `
                        query GetLocalFlashVendors($marketId: ID, $locationId: ID) {
                            vendors(marketId: $marketId, locationId: $locationId, options: { filter: { status: { eq: "APPROVED" } }, take: 100 }) {
                                items {
                                    id
                                    name
                                    location { id name }
                                    physicalMarket { id name }
                                    products {
                                        id
                                        name
                                        slug
                                        featuredAsset { id preview }
                                        assets { id preview }
                                        collections { id }
                                        variants {
                                            id
                                            name
                                            priceWithTax
                                            featuredAsset { id preview }
                                            options { id name code group { id name } }
                                        }
                                    }
                                }
                            }
                        }
                    `;
                    const res = await fetchWithClientCache(shopApiUrl, localQuery, { 
                        marketId: targetMarketId, 
                        locationId: targetLocationId 
                    });
                    const vendors = res?.vendors?.items || [];
                    for (const v of vendors) {
                        for (const p of (v.products || [])) {
                            for (const vr of (p.variants || [])) {
                                baseItems.push({
                                    productId: p.id,
                                    id: p.id,
                                    name: p.name,
                                    slug: p.slug,
                                    featuredAsset: vr.featuredAsset || p.featuredAsset || p.assets?.[0],
                                    productAsset: p.featuredAsset || p.assets?.[0],
                                    productVariantId: vr.id,
                                    productVariantName: vr.name,
                                    vendorId: v.id,
                                    vendorName: v.name,
                                    marketName: v.physicalMarket?.name,
                                    marketId: v.physicalMarket?.id,
                                    locationName: v.location?.name,
                                    locationId: v.location?.id,
                                    variants: [vr],
                                    priceWithTax: { __typename: 'SinglePrice', value: vr.priceWithTax },
                                    inStock: true,
                                    customFields: {
                                        vendor: v,
                                    }
                                });
                            }
                        }
                    }
                }

                if (baseItems.length === 0) {
                    setFlashProducts([]);
                    setLoading(false);
                    return;
                }

                // 2. Expand strictly selected base items with seller offers
                const variantIds = Array.from(
                    new Set(baseItems.map(i => i.productVariantId || i.id).filter(Boolean))
                );

                let rawCandidates: any[] = [];

                if (variantIds.length > 0) {
                    try {
                        const sellerOffersQuery = `
                            query GetFlashSellerOffers($variantIds: [ID!]!) {
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

                        for (const item of baseItems) {
                            const vId = String(item.productVariantId || item.id);
                            const matchingOffers = offers.filter(
                                o => String(o.productVariant?.id) === vId && o.vendor?.id
                            );

                            if (matchingOffers.length > 0) {
                                for (const off of matchingOffers) {
                                    rawCandidates.push({
                                        ...item,
                                        productId: item.productId || off.productVariant?.product?.id,
                                        productName: item.productName || off.productVariant?.product?.name,
                                        productVariantId: vId,
                                        productVariantName: off.productVariant?.name || item.productVariantName,
                                        productVariant: off.productVariant || item.productVariant,
                                        sku: off.productVariant?.sku || item.sku,
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
                                        options: off.productVariant?.options || item.options,
                                        customFields: {
                                            ...(item.customFields || {}),
                                            vendor: off.vendor,
                                            onPromotion: off.onPromotion,
                                            promotionalPrice: off.promotionalPrice,
                                        }
                                    });
                                }
                            } else {
                                // Default catalog variant if no seller offer
                                rawCandidates.push(item);
                            }
                        }
                    } catch (offerErr) {
                        console.warn('Error fetching seller offers for flash sale:', offerErr);
                        rawCandidates = baseItems;
                    }
                } else {
                    rawCandidates = baseItems;
                }

                // 3. Score candidates with GeoEngine based on user's active location
                let resolved = processAndResolveDisplayItems(rawCandidates, {
                    experienceStrategy: 'FLASH_SALE',
                    pageType: 'FLASH_SALE',
                    userLocation: locObj,
                    userLat,
                    userLon,
                    marketId: targetMarketId,
                    locationId: targetLocationId,
                    communeName: locObj?.commune || locObj?.name,
                    boostCertifiedVendors: true,
                    requirePromotion: false,
                    requireVariantsWithOptions: false,
                    maxVariantsPerCentralProduct: 2,
                });

                // 4. Apply price filters if configured
                if (activeFlashObj.filterCriteria) {
                    const { minPrice, maxPrice } = activeFlashObj.filterCriteria;
                    if (minPrice > 0 || maxPrice > 0) {
                        resolved = resolved.filter((item: any) => {
                            const price = item.price ?? item.winningOffer?.price ?? 0;
                            if (minPrice > 0 && price < minPrice) return false;
                            if (maxPrice > 0 && price > maxPrice) return false;
                            return true;
                        });
                    }
                }

                const rawLimit = activeFlashObj.filterCriteria?.take ?? activeFlashObj.limit ?? activeFlashObj.take ?? 12;
                const limit = Number(rawLimit) > 0 ? Number(rawLimit) : 12;
                setFlashProducts(resolved.slice(0, limit));
            } catch (err) {
                console.error('Fetch error for flash sale:', err);
                setErrorMsg('Erreur lors du chargement des ventes flash.');
            } finally {
                setLoading(false);
            }
        };

        loadProducts();
    }, [activeFlashStr, clientLoc]);

    if (!loading && flashProducts.length === 0) {
        return null;
    }

    return (
        <div className="animate-in fade-in slide-in-from-bottom-6 duration-500 relative group/carousel">
            {/* Header section */}
            {activeFlash.headerStyle === 'smart_cart' ? (
                <div className="flex flex-col text-left items-start mb-6 gap-1 px-2 sm:px-4 pt-4">
                    <div 
                        className="flex items-center gap-1.5 font-extrabold uppercase text-[10px] tracking-wider px-3 py-1 rounded-full shadow-sm text-white"
                        style={{ backgroundColor: activeFlash.badgeBgColor || activeFlash.accentColor || activeFlash.bgColor || '#e31837' }}
                    >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{activeFlash?.badgeText || (activeFlash?.selectionType === 'LOCAL_NEIGHBORHOOD' ? '📍 OFFRES DE QUARTIER' : activeFlash?.selectionType === 'LOCAL_MARKET' ? '📍 OFFRES DE MARCHÉ' : '✨ VENTES FLASH SPÉCIALES')}</span>
                    </div>
                    <div className="flex items-center justify-between w-full mt-3 flex-wrap gap-4">
                        <h2 
                            className="text-xl md:text-2xl font-black tracking-tight uppercase leading-tight flex items-center gap-2"
                            style={{ color: activeFlash.textColor || undefined }}
                        >
                            <span>{activeFlash?.icon || '🛍️'}</span> {activeFlash?.title || "Ventes Flash"}
                        </h2>
                        <div className="flex items-center gap-3">
                            {hasExplicitCountdown && (
                                <div className="flex items-center gap-2 bg-muted/60 px-3 py-1.5 rounded-xl border border-border">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Expire dans:</span>
                                    <div 
                                        className="flex items-center gap-1 font-black text-xs sm:text-sm"
                                        style={{ color: activeFlash.accentColor || activeFlash.badgeBgColor || 'var(--primary)' }}
                                    >
                                        <span className="bg-card px-1.5 py-0.5 rounded shadow-2xs">{timeLeft.h}</span>:
                                        <span className="bg-card px-1.5 py-0.5 rounded shadow-2xs">{timeLeft.m}</span>:
                                        <span className="bg-card px-1.5 py-0.5 rounded shadow-2xs">{timeLeft.s}</span>
                                    </div>
                                </div>
                            )}
                            <Link 
                                href={targetViewAllLink}
                                className="text-xs font-black text-primary hover:underline flex items-center gap-1 shrink-0 py-1"
                            >
                                <span>VOIR TOUT</span>
                                <ChevronRight className="w-4 h-4" />
                            </Link>
                        </div>
                    </div>
                    <p className="font-medium text-xs sm:text-sm mt-1 max-w-2xl text-muted-foreground">
                        {activeFlash?.subtitle || "Profitez de nos remises exceptionnelles du moment"}
                    </p>
                    <div 
                        className="h-1 w-16 mt-3 rounded-full" 
                        style={{ backgroundColor: activeFlash.badgeBgColor || activeFlash.accentColor || activeFlash.bgColor || '#e31837' }}
                    />
                </div>
            ) : activeFlash.bgType === 'image_only' && activeFlash.bgImageUrl ? (
                <div className="relative w-full overflow-hidden rounded-t-xl">
                    <img 
                        src={getAssetUrl(activeFlash.bgImageUrl)} 
                        alt="" 
                        className="w-full h-auto object-cover max-h-[350px] rounded-t-xl" 
                    />
                    <div className="absolute top-4 right-4 z-10">
                        <Button variant="outline" size="sm" asChild className="bg-black/60 text-white border-white/20 hover:bg-white hover:text-black font-black">
                            <Link href={targetViewAllLink}>TOUT VOIR <ChevronRight className="w-4 h-4 ml-1" /></Link>
                        </Button>
                    </div>
                </div>
            ) : (
                <div 
                    className={`flex flex-row items-center justify-between gap-2 sm:gap-4 overflow-hidden relative w-full text-left ${
                        activeFlash.isSimpleMode 
                        ? 'bg-transparent py-2 border-b border-border/40' 
                        : 'rounded-t-xl p-2.5 sm:p-3 md:p-4 shadow-sm'
                    }`}
                    style={{ 
                        backgroundColor: activeFlash.isSimpleMode ? 'transparent' : (activeFlash.bgColor || '#0f172a'),
                        backgroundImage: (!activeFlash.isSimpleMode && activeFlash?.bgImageUrl && !isGif(activeFlash.bgImageUrl)) ? `url(${getAssetUrl(activeFlash.bgImageUrl)})` : 'none',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                    }}
                >
                    {/* GIF Background */}
                    {!activeFlash.isSimpleMode && activeFlash?.bgImageUrl && isGif(activeFlash.bgImageUrl) && (
                        <img src={getAssetUrl(activeFlash.bgImageUrl)} alt="" className="absolute inset-0 w-full h-full object-cover z-0" />
                    )}

                    {/* Overlay for better text readability (Styled Mode Only) */}
                    {!activeFlash.isSimpleMode && <div className="absolute inset-x-0 inset-y-0 bg-black/40 z-0" />}

                    <div className="flex items-center gap-2 sm:gap-4 relative z-10 text-left min-w-0 flex-1">
                        {!activeFlash.isSimpleMode && (
                            <div className="flex items-center justify-center min-w-[24px] min-h-[24px]">
                                {DynamicIcon ? (
                                    <DynamicIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white fill-white" />
                                ) : (
                                    <span className="text-[18px] sm:text-[22px] leading-none">{iconValue}</span>
                                )}
                            </div>
                        )}
                        <div className="text-left min-w-0">
                            <h2 
                                className={`font-black tracking-tight flex items-center gap-2 text-left truncate ${
                                    activeFlash.isSimpleMode ? 'text-xs sm:text-lg text-black' : 'text-xs sm:text-lg md:text-xl text-white'
                                }`}
                                style={{ color: activeFlash.textColor || undefined }}
                            >
                                {activeFlash?.title || "Ventes Flash"}
                            </h2>
                            <p className={`text-[9px] sm:text-[12px] font-bold uppercase tracking-widest text-left truncate ${
                                activeFlash.isSimpleMode ? 'text-muted-foreground' : 'text-white/80'
                            }`}>
                                {activeFlash?.subtitle || "Stock limité !"}
                            </p>
                        </div>
                    </div>

                    <div className="ml-auto flex items-center gap-2 sm:gap-4 relative z-10 flex-shrink-0">
                        {hasExplicitCountdown && (
                            <div className="flex items-center gap-1.5 sm:gap-2">
                                <span className={`text-[10px] font-black uppercase tracking-widest hidden sm:block ${
                                    activeFlash.isSimpleMode ? 'text-muted-foreground' : 'text-white/60'
                                }`}>Fini dans:</span>
                                <div className={`flex items-center gap-0.5 sm:gap-1.5 font-black text-[11px] sm:text-lg md:text-xl ${
                                    activeFlash.isSimpleMode ? 'text-primary' : 'text-white'
                                }`}>
                                    <span className={`${activeFlash.isSimpleMode ? 'bg-muted' : 'bg-white/10 border border-white/20'} px-1 sm:px-2 py-0.5 sm:py-1 rounded min-w-[22px] sm:min-w-[32px] text-center`}>{timeLeft.h}</span>
                                    <span className="opacity-40">:</span>
                                    <span className={`${activeFlash.isSimpleMode ? 'bg-muted' : 'bg-white/10 border border-white/20'} px-1 sm:px-2 py-0.5 sm:py-1 rounded min-w-[22px] sm:min-w-[32px] text-center`}>{timeLeft.m}</span>
                                    <span className="opacity-40">:</span>
                                    <span className={`${activeFlash.isSimpleMode ? 'bg-muted' : 'bg-white/10 border border-white/20'} px-1 sm:px-2 py-0.5 sm:py-1 rounded min-w-[22px] sm:min-w-[32px] text-center`}>{timeLeft.s}</span>
                                </div>
                            </div>
                        )}
                        
                        <Button 
                            variant={activeFlash.isSimpleMode ? "link" : "outline"} 
                            size="sm" 
                            asChild 
                            className={activeFlash.isSimpleMode 
                                ? "text-primary font-black p-0 h-auto" 
                                : "bg-white/10 text-white border-white/20 hover:bg-white hover:text-black font-black text-xs"
                            }
                        >
                            <Link href={targetViewAllLink}>TOUT VOIR <ChevronRight className="w-4 h-4 ml-1" /></Link>
                        </Button>
                    </div>
                </div>
            )}

            {!clientLoc && (activeFlash?.selectionType === 'LOCAL_NEIGHBORHOOD' || activeFlash?.selectionType === 'LOCAL_MARKET') && activeFlash?.unconfirmedLocationBehavior !== 'hide_completely' && (
                <div className="mx-3 sm:mx-4 my-3 p-4 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
                    <div className="flex items-center gap-3 text-center sm:text-left">
                        <span className="text-2xl">📍</span>
                        <div>
                            <h4 className="font-black text-sm uppercase">Position non sélectionnée</h4>
                            <p className="text-xs font-medium opacity-90">
                                Veuillez choisir votre position en haut de page pour découvrir les offres flash exclusives de votre zone !
                            </p>
                        </div>
                    </div>
                    <button 
                        type="button"
                        onClick={() => window.dispatchEvent(new CustomEvent('open-location-modal'))}
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs uppercase rounded-lg shrink-0 transition-colors shadow-sm"
                    >
                        Choisir ma position
                    </button>
                </div>
            )}

            {/* Left/Right Navigation Arrows (Desktop) */}
            {activeFlash.displayLayout !== 'vertical_grid' && (
                <>
                    <button 
                        onClick={() => scroll('left')}
                        className="absolute left-0 top-[60%] -translate-y-1/2 -ml-4 z-20 bg-white shadow-lg rounded-full p-2 border border-border/50 text-foreground hover:bg-muted hover:scale-110 transition-all opacity-0 group-hover/carousel:opacity-100 hidden md:flex items-center justify-center"
                        aria-label="Défiler vers la gauche"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>

                    <button 
                        onClick={() => scroll('right')}
                        className="absolute right-0 top-[60%] -translate-y-1/2 -mr-4 z-20 bg-white shadow-lg rounded-full p-2 border border-border/50 text-foreground hover:bg-muted hover:scale-110 transition-all opacity-0 group-hover/carousel:opacity-100 hidden md:flex items-center justify-center"
                        aria-label="Défiler vers la droite"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </>
            )}

            {/* Product Carousel / Grid */}
            <div 
                ref={activeFlash.displayLayout !== 'vertical_grid' ? scrollContainerRef : null}
                className={`${activeFlash.displayLayout === 'vertical_grid' ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 overflow-visible' : 'flex overflow-x-auto snap-x snap-mandatory'} gap-3 sm:gap-4 pb-4 ${
                    activeFlash.isSimpleMode 
                    ? 'pt-5' 
                    : 'bg-white border-x border-b border-border/30 rounded-b-xl p-3 sm:p-4 md:p-5'
                }`}
                style={activeFlash.displayLayout !== 'vertical_grid' ? {
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                } : {}}
            >
                {errorMsg && (
                    <div className="w-full flex-shrink-0 text-center py-8 text-red-500 font-bold text-sm">
                        {errorMsg}
                    </div>
                )}
                {flashProducts.length === 0 && !loading && !errorMsg && (
                    <div className="w-full flex-shrink-0 text-center py-8 text-muted-foreground text-sm">
                        Aucun produit en vente flash pour le moment
                    </div>
                )}
                {(loading ? [1, 2, 3, 4, 5, 6, 7, 8] : flashProducts).map((p: any, i) => {
                    const isPlaceholder = typeof p === 'number';
                    
                    if (isPlaceholder) {
                        return (
                            <div 
                                key={i} 
                                className={
                                    activeFlash.displayLayout === 'vertical_grid'
                                    ? "w-full aspect-square bg-white rounded-xl border border-border/30 flex items-center justify-center p-4"
                                    : "snap-start flex-shrink-0 w-[160px] sm:w-[180px] md:w-[200px] lg:w-[220px] aspect-square bg-white rounded-xl border border-border/30 flex items-center justify-center p-4"
                                }
                                style={{
                                    width: activeFlash.cardWidth || undefined,
                                    minWidth: activeFlash.cardWidth || undefined,
                                    height: activeFlash.cardHeight || undefined,
                                }}
                            >
                                <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                            </div>
                        );
                    }

                    return (
                        <div 
                            key={p.productId || p.id} 
                            className={
                                activeFlash.displayLayout === 'vertical_grid'
                                ? "w-full"
                                : "snap-start flex-shrink-0 w-[200px] sm:w-[220px] md:w-[240px] lg:w-[260px]"
                            }
                            style={{
                                width: activeFlash.cardWidth || undefined,
                                minWidth: activeFlash.cardWidth || undefined,
                                height: activeFlash.cardHeight || undefined,
                            }}
                        >
                            <MasterProductCard item={p} config={activeFlash} />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
