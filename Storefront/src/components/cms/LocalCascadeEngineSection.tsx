'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useLocation } from '@/contexts/location-context';
import { interpolateLocalVariables } from '@/lib/cms/interpolation';
import { getAssetUrl, getShopApiUrl } from '@/lib/vendure/api-utils';
import { fetchWithClientCache } from '@/lib/vendure/client-cache';
import { processAndResolveDisplayItems } from '@/lib/vendure/display-engine';
import { MasterProductCard } from '@/components/commerce/master-product-card';
import { MapPin, Navigation, Sparkles, ChevronLeft, ChevronRight, Store, Clock, ShieldCheck, Zap } from 'lucide-react';

interface LocalCascadeEngineSectionProps {
    config?: any;
}

type CascadeZone = 'ALL' | 'ZONE_A' | 'ZONE_B' | 'ZONE_C';

export function LocalCascadeEngineSection({ config = {} }: LocalCascadeEngineSectionProps) {
    const { selectedLocation } = useLocation();
    const [allProducts, setAllProducts] = useState<any[]>([]);
    const [activeZone, setActiveZone] = useState<CascadeZone>('ALL');
    const [loading, setLoading] = useState(false);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Dynamically interpolate tokens in titles and subtitles
    const rawTitle = config.title || 'Cascade Territoriale • {{position}}';
    const rawSubtitle = config.subtitle || 'Promesse Ahizan : Vendeurs immédiats, agglomération et marchands du Bénin';
    const rawBadgeText = config.badgeText || 'Zones A • B • C';

    const interpolatedTitle = interpolateLocalVariables(rawTitle, selectedLocation);
    const interpolatedSubtitle = interpolateLocalVariables(rawSubtitle, selectedLocation);
    const interpolatedBadgeText = interpolateLocalVariables(rawBadgeText, selectedLocation);

    const bgImage = config.bgImage ? getAssetUrl(config.bgImage) : null;
    const overlayOpacity = config.bgImageOverlayOpacity !== undefined ? Number(config.bgImageOverlayOpacity) : 40;
    const limit = Number(config.limit || config.take || 16);
    const layout = config.layout || 'carousel';

    const scroll = (direction: 'left' | 'right') => {
        if (scrollContainerRef.current) {
            const { current } = scrollContainerRef;
            const scrollAmount = current.clientWidth * 0.8;
            current.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
        }
    };

    // Load cascade products
    useEffect(() => {
        let activeLoc = selectedLocation;
        if (!activeLoc && typeof window !== 'undefined') {
            try {
                const saved = localStorage.getItem('ahizan_client_location');
                if (saved) activeLoc = JSON.parse(saved);
            } catch (_) {}
        }

        const shopApiUrl = getShopApiUrl();
        setLoading(true);

        const loadCascade = async () => {
            try {
                const userLat = activeLoc?.latitude != null && !isNaN(Number(activeLoc.latitude)) ? Number(activeLoc.latitude) : undefined;
                const userLon = activeLoc?.longitude != null && !isNaN(Number(activeLoc.longitude)) ? Number(activeLoc.longitude) : undefined;
                const marketId = activeLoc?.marketId || (activeLoc?.type === 'MARKET' && !isNaN(Number(activeLoc.id)) ? String(activeLoc.id) : undefined);
                const locationId = activeLoc?.geoZoneId || (activeLoc?.type !== 'MARKET' && activeLoc?.id && activeLoc.id !== 'gps_raw' && !isNaN(Number(activeLoc.id)) ? String(activeLoc.id) : undefined);

                const searchCandidateQuery = `
                    query GetCascadeCandidates($take: Int!) {
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
                    query GetCascadeVendors($marketId: ID, $locationId: ID, $latitude: Float, $longitude: Float) {
                        vendors(
                            marketId: $marketId, 
                            locationId: $locationId, 
                            latitude: $latitude, 
                            longitude: $longitude,
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

                const [searchRes, vendorsRes] = await Promise.all([
                    fetchWithClientCache(shopApiUrl, searchCandidateQuery, { take: 100 }).catch(() => null),
                    fetchWithClientCache(shopApiUrl, nearbyVendorsQuery, {
                        marketId,
                        locationId,
                        latitude: userLat,
                        longitude: userLon,
                    }).catch(() => null),
                ]);

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
                const variantIds = Array.from(
                    new Set(candidatePool.map((i: any) => String(i.productVariantId || i.id)).filter(Boolean))
                ).slice(0, 150);

                let rawCandidates: any[] = [];

                if (variantIds.length > 0) {
                    const sellerOffersQuery = `
                        query GetCascadeSellerOffers($variantIds: [ID!]!) {
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
                    const offersRes = await fetchWithClientCache(shopApiUrl, sellerOffersQuery, { variantIds }).catch(() => null);
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
                                || item.productAsset;

                            rawCandidates.push({
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

                const displayContext = {
                    experienceStrategy: 'LOCAL_DISCOVERY',
                    userLat,
                    userLon,
                    marketId,
                    locationId,
                    communeName: activeLoc?.commune || activeLoc?.name,
                    boostCertifiedVendors: true,
                    limit: 50,
                    maxVariantsPerCentralProduct: 2,
                    maxItemsPerVendor: 4,
                };

                const resolved = processAndResolveDisplayItems(rawCandidates, displayContext);
                setAllProducts(resolved);
            } catch (err) {
                console.error('Error fetching cascade engine products:', err);
            } finally {
                setLoading(false);
            }
        };

        loadCascade();
    }, [selectedLocation?.id, selectedLocation?.latitude, selectedLocation?.longitude, selectedLocation?.name]);

    // Partition products into Zones A, B, C
    const zoneCounts = useMemo(() => {
        let zoneA = 0;
        let zoneB = 0;
        let zoneC = 0;

        for (const p of allProducts) {
            const dist = p.distanceKm;
            const fallback = p.fallbackLevel ?? 4;
            if ((dist !== null && dist !== undefined && dist <= 6.0) || fallback === 1) {
                zoneA++;
            } else if ((dist !== null && dist !== undefined && dist <= 18.0) || fallback === 2) {
                zoneB++;
            } else {
                zoneC++;
            }
        }
        return { zoneA, zoneB, zoneC, all: allProducts.length };
    }, [allProducts]);

    // Filter displayed products based on activeZone tab
    const filteredProducts = useMemo(() => {
        if (activeZone === 'ALL') return allProducts.slice(0, limit);

        return allProducts.filter((p) => {
            const dist = p.distanceKm;
            const fallback = p.fallbackLevel ?? 4;
            if (activeZone === 'ZONE_A') {
                return (dist !== null && dist !== undefined && dist <= 6.0) || fallback === 1;
            }
            if (activeZone === 'ZONE_B') {
                return (dist !== null && dist !== undefined && dist > 6.0 && dist <= 18.0) || fallback === 2;
            }
            if (activeZone === 'ZONE_C') {
                return (dist !== null && dist !== undefined && dist > 18.0) || fallback >= 3;
            }
            return true;
        }).slice(0, limit);
    }, [allProducts, activeZone, limit]);

    if (!loading && allProducts.length === 0) {
        return null;
    }

    return (
        <section
            className="w-full relative overflow-hidden transition-all duration-300 py-6 sm:py-8"
            style={{
                backgroundColor: config.backgroundColor || 'transparent',
                backgroundImage: config.gradientBackground || undefined,
            }}
        >
            {bgImage && (
                <div
                    className="absolute inset-0 pointer-events-none bg-cover bg-center z-0 transition-opacity duration-300"
                    style={{
                        backgroundImage: `url('${bgImage}')`,
                        opacity: (100 - overlayOpacity) / 100,
                    }}
                />
            )}

            <div className="relative z-10 max-w-[1720px] mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-4 sm:mb-6">
                    <div className="space-y-1.5">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-rose-600 text-white shadow-xs">
                            <Navigation className="w-3.5 h-3.5" />
                            <span>{interpolatedBadgeText}</span>
                        </div>
                        <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-foreground tracking-tight flex items-center gap-2">
                            <span>🎯</span> {interpolatedTitle}
                        </h2>
                        {interpolatedSubtitle && (
                            <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl font-medium">
                                {interpolatedSubtitle}
                            </p>
                        )}
                    </div>

                    {/* Zone Selector Pills */}
                    <div className="flex items-center gap-1.5 p-1 bg-muted/60 dark:bg-muted/30 rounded-2xl border border-border/80 flex-wrap">
                        <button
                            type="button"
                            onClick={() => setActiveZone('ALL')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                                activeZone === 'ALL'
                                    ? 'bg-card text-foreground shadow-xs border border-border/60'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            <span>🌟 Toutes les zones</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-muted font-black">{zoneCounts.all}</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveZone('ZONE_A')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                                activeZone === 'ZONE_A'
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse" />
                            <span>Zone A (&lt; 6 km)</span>
                            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${activeZone === 'ZONE_A' ? 'bg-emerald-700/80 text-white' : 'bg-muted'}`}>
                                {zoneCounts.zoneA}
                            </span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveZone('ZONE_B')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                                activeZone === 'ZONE_B'
                                    ? 'bg-blue-600 text-white shadow-xs'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
                            <span>Zone B (6-18 km)</span>
                            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${activeZone === 'ZONE_B' ? 'bg-blue-700/80 text-white' : 'bg-muted'}`}>
                                {zoneCounts.zoneB}
                            </span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveZone('ZONE_C')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                                activeZone === 'ZONE_C'
                                    ? 'bg-purple-600 text-white shadow-xs'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            <span className="w-2 h-2 rounded-full bg-purple-400 inline-block" />
                            <span>Zone C (Bénin)</span>
                            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${activeZone === 'ZONE_C' ? 'bg-purple-700/80 text-white' : 'bg-muted'}`}>
                                {zoneCounts.zoneC}
                            </span>
                        </button>
                    </div>
                </div>

                {/* Zone Guarantee Info Banner */}
                <div className="mb-4 sm:mb-6 p-3 sm:p-4 rounded-2xl bg-card border border-border/80 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                            <MapPin className="w-4 h-4" />
                        </div>
                        <div>
                            <span className="font-bold text-foreground">
                                {activeZone === 'ZONE_A' && '🟢 Zone A : Hyper-Proximité (< 6 km)'}
                                {activeZone === 'ZONE_B' && '🔵 Zone B : Agglomération & Rayon 6 à 18 km'}
                                {activeZone === 'ZONE_C' && '🟣 Zone C : Marchands & Boutiques Nationales (> 18 km)'}
                                {activeZone === 'ALL' && '🌟 Cascade Intelligente Ahizan'}
                            </span>
                            <p className="text-[11px] text-muted-foreground">
                                {activeZone === 'ZONE_A' && 'Vendeurs de votre quartier & marchés centraux immédiats • Livraison express 1h à 2h'}
                                {activeZone === 'ZONE_B' && 'Grandes communes voisines (Cotonou, Calavi, Sèmè) • Livraison le jour même en 2h à 4h'}
                                {activeZone === 'ZONE_C' && 'Porto-Novo, Parakou, Bohicon et tout le Bénin • Expédition sous 24h à 48h'}
                                {activeZone === 'ALL' && 'Priorité absolue aux vendeurs les plus proches, complétée par les meilleures offres nationales'}
                            </p>
                        </div>
                    </div>
                    {selectedLocation?.name && (
                        <div className="text-[11px] text-muted-foreground bg-muted/60 px-2.5 py-1 rounded-lg">
                            Position : <span className="font-bold text-foreground">{selectedLocation.name}</span>
                        </div>
                    )}
                </div>

                {/* Products Grid or Carousel */}
                {loading ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="aspect-square bg-muted/50 rounded-2xl animate-pulse" />
                        ))}
                    </div>
                ) : filteredProducts.length === 0 ? (
                    <div className="p-8 text-center rounded-2xl bg-card border border-border text-muted-foreground text-xs space-y-1">
                        <Store className="w-8 h-8 mx-auto text-muted-foreground/60 mb-2" />
                        <p className="font-bold text-foreground text-sm">Aucun produit dans cette zone pour l'instant</p>
                        <p>Consultez les autres zones ou revenez à "Toutes les zones" pour voir l'ensemble du catalogue.</p>
                    </div>
                ) : layout === 'grid' ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5 sm:gap-3.5 md:gap-4">
                        {filteredProducts.map((item) => (
                            <div key={item.id} className="relative">
                                <MasterProductCard item={item} />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="relative group/carousel">
                        <button
                            type="button"
                            onClick={() => scroll('left')}
                            className="absolute -left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-background/90 backdrop-blur-sm border border-border shadow-md flex items-center justify-center text-foreground hover:bg-background transition-opacity opacity-0 group-hover/carousel:opacity-100 disabled:opacity-0"
                            aria-label="Défiler à gauche"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button
                            type="button"
                            onClick={() => scroll('right')}
                            className="absolute -right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-background/90 backdrop-blur-sm border border-border shadow-md flex items-center justify-center text-foreground hover:bg-background transition-opacity opacity-0 group-hover/carousel:opacity-100 disabled:opacity-0"
                            aria-label="Défiler à droite"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>

                        <div
                            ref={scrollContainerRef}
                            className="flex overflow-x-auto snap-x snap-mandatory gap-2.5 sm:gap-3.5 md:gap-4 pb-4 scroll-smooth"
                            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                        >
                            {filteredProducts.map((item) => (
                                <div
                                    key={item.id}
                                    className="snap-start flex-shrink-0 w-[145px] sm:w-[165px] md:w-[180px] lg:w-[195px]"
                                >
                                    <MasterProductCard item={item} />
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
}
