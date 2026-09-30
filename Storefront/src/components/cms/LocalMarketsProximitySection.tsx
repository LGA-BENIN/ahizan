'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Store, MapPin, ChevronLeft, ChevronRight, ArrowRight, Compass } from 'lucide-react';
import { getAssetUrl, getShopApiUrl } from '@/lib/vendure/api-utils';
import { fetchWithClientCache } from '@/lib/vendure/client-cache';
import { useLocation } from '@/contexts/location-context';
import { interpolateLocalVariables } from '@/lib/cms/interpolation';

const CURATED_MARKET_IMAGES = [
    "https://images.unsplash.com/photo-1533900298318-6b8da08a523e?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1488459716781-31db52582fe9?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1578916171728-46686eac8d58?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1526470608268-f674ce90ebd4?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?q=80&w=800&auto=format&fit=crop",
];

const FALLBACK_MARKETS = [
    { 
        id: "1", 
        name: "Marché Dantokpa", 
        slug: "marche-dantokpa", 
        description: "Le plus grand marché à ciel ouvert de l'Afrique de l'Ouest.",
        image: "https://images.unsplash.com/photo-1533900298318-6b8da08a523e?q=80&w=800&auto=format&fit=crop",
        centerLatitude: 6.367, 
        centerLongitude: 2.44, 
        geoZone: { name: "Cotonou" } 
    },
    { 
        id: "2", 
        name: "Marché Moderne de PK3", 
        slug: "marche-moderne-de-pk3", 
        description: "Hub ultra-moderne entièrement dédié à la friperie et aux grossistes.",
        image: "https://images.unsplash.com/photo-1488459716781-31db52582fe9?q=80&w=800&auto=format&fit=crop",
        centerLatitude: 6.388, 
        centerLongitude: 2.47, 
        geoZone: { name: "Cotonou" } 
    },
    { 
        id: "3", 
        name: "Marché de Ouando", 
        slug: "marche-de-ouando", 
        description: "Plus grand pôle commercial de Porto-Novo pour les vivriers et l'artisanat.",
        image: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=800&auto=format&fit=crop",
        centerLatitude: 6.505, 
        centerLongitude: 2.618, 
        geoZone: { name: "Porto-Novo" } 
    },
    { 
        id: "4", 
        name: "Marché de Cadjèhoun", 
        slug: "marche-de-cadjehoun", 
        description: "Marché sélectif pour vos achats alimentaires frais au cœur de la ville.",
        image: "https://images.unsplash.com/photo-1578916171728-46686eac8d58?q=80&w=800&auto=format&fit=crop",
        centerLatitude: 6.362, 
        centerLongitude: 2.40, 
        geoZone: { name: "Cotonou" } 
    },
];

function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

interface LocalMarketsProximitySectionProps {
    config?: any;
}

export function LocalMarketsProximitySection({ config = {} }: LocalMarketsProximitySectionProps) {
    const locationContext = useLocation();
    const selectedLocation = locationContext?.selectedLocation;
    const [rawMarkets, setRawMarkets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const scroll = (direction: 'left' | 'right') => {
        if (scrollContainerRef.current) {
            const amount = scrollContainerRef.current.clientWidth * 0.8;
            scrollContainerRef.current.scrollBy({ left: direction === 'left' ? -amount : amount, behavior: 'smooth' });
        }
    };

    useEffect(() => {
        let isMounted = true;
        setLoading(true);

        const query = `
            query GetMarkets {
                markets {
                    id
                    name
                    slug
                    description
                    image
                    icon
                    centerLatitude
                    centerLongitude
                    radiusMeters
                    geoZone {
                        id
                        name
                        slug
                        parent { id name }
                    }
                }
            }
        `;

        fetchWithClientCache(getShopApiUrl(), query, {})
            .then((data: any) => {
                if (isMounted) {
                    const items = (data?.markets && Array.isArray(data.markets) && data.markets.length > 0) 
                        ? data.markets 
                        : FALLBACK_MARKETS;
                    setRawMarkets(items);
                    setLoading(false);
                }
            })
            .catch(() => {
                if (isMounted) {
                    setRawMarkets(FALLBACK_MARKETS);
                    setLoading(false);
                }
            });

        return () => { isMounted = false; };
    }, []);

    // Intelligently compute distance, filter, and sort markets
    const processedMarkets = useMemo(() => {
        let items = [...rawMarkets];

        // 1. Filter specific markets if configured by admin
        if (config.selectionMode === 'CUSTOM' && Array.isArray(config.selectedMarketIds) && config.selectedMarketIds.length > 0) {
            const allowed = config.selectedMarketIds.map(String);
            const filtered = items.filter((m: any) => allowed.includes(String(m.id)));
            if (filtered.length > 0) {
                items = filtered;
            }
        }

        // 2. User coordinates or commune
        const uLat = selectedLocation?.latitude ? Number(selectedLocation.latitude) : null;
        const uLon = selectedLocation?.longitude ? Number(selectedLocation.longitude) : null;
        const uCommune = (selectedLocation?.commune || selectedLocation?.name || '').toLowerCase();

        items = items.map((m: any, index: number) => {
            let distanceKm: number | null = null;
            const mLat = m.centerLatitude !== undefined && m.centerLatitude !== null ? Number(m.centerLatitude) : null;
            const mLon = m.centerLongitude !== undefined && m.centerLongitude !== null ? Number(m.centerLongitude) : null;

            if (uLat !== null && uLon !== null && mLat !== null && mLon !== null && !isNaN(uLat) && !isNaN(uLon) && !isNaN(mLat) && !isNaN(mLon)) {
                const d = calculateDistanceKm(uLat, uLon, mLat, mLon);
                distanceKm = Math.round(d * 10) / 10;
            }

            const zoneName = (m.geoZone?.name || m.geoZone?.parent?.name || '').toLowerCase();
            const isSameCommune = uCommune && zoneName && (zoneName.includes(uCommune) || uCommune.includes(zoneName));

            // Curated fallback photo so cards are NEVER blank
            const fallbackImg = CURATED_MARKET_IMAGES[index % CURATED_MARKET_IMAGES.length];
            const override = config.marketOverrides?.[m.id] || config.marketOverrides?.[String(m.id)] || {};
            const image = override.image || m.image || fallbackImg;
            const description = override.description !== undefined ? override.description : (m.description || "Grand marché local et dynamique.");
            const name = override.name || m.name;

            return {
                ...m,
                name: (name || '').trim(),
                image,
                description,
                distanceKm,
                isSameCommune,
            };
        });

        // 3. Filter / Sort:
        // If the user selected a specific commune, show all markets of that commune
        const sameCommuneItems = items.filter((m: any) => m.isSameCommune);
        
        let finalItems = items;
        if (sameCommuneItems.length > 0) {
            sameCommuneItems.sort((a: any, b: any) => {
                if (a.distanceKm !== null && b.distanceKm !== null) return a.distanceKm - b.distanceKm;
                return (a.name || '').localeCompare(b.name || '');
            });
            finalItems = sameCommuneItems;
        } else {
            finalItems.sort((a: any, b: any) => {
                if (a.distanceKm !== null && b.distanceKm !== null) return a.distanceKm - b.distanceKm;
                if (a.distanceKm !== null) return -1;
                if (b.distanceKm !== null) return 1;
                return 0;
            });
        }

        const take = Number(config.take || 12);
        return finalItems.slice(0, Math.max(take, sameCommuneItems.length));
    }, [rawMarkets, selectedLocation, config.selectionMode, config.selectedMarketIds, config.marketOverrides, config.take]);

    const title = interpolateLocalVariables(config.title || 'Marchés Populaires & Traditionnels', selectedLocation);
    const subtitle = interpolateLocalVariables(config.subtitle || 'Explorez les grands marchés du Bénin et faites vos achats directement auprès de leurs commerçants.', selectedLocation);
    const badgeText = interpolateLocalVariables(config.badgeText || 'Pôles Commerciaux', selectedLocation);

    const layout = config.layout || 'grid';
    const cardStyle = config.cardStyle || 'navy-modern';
    const columns = config.columns || 4;

    const gridColsClass = {
        2: 'grid-cols-1 sm:grid-cols-2',
        3: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3',
        4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
        5: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5',
    }[columns as 2 | 3 | 4 | 5] || 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4';

    // Horizontal split grid columns
    const horizontalGridColsClass = {
        2: 'grid-cols-1 md:grid-cols-2',
        3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
        4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3',
        5: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    }[columns as 2 | 3 | 4 | 5] || 'grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3';

    // Round circle grid columns (can be denser)
    const circleGridColsClass = {
        2: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4',
        3: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6',
        4: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6',
        5: 'grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8',
    }[columns as 2 | 3 | 4 | 5] || 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6';

    const effectiveGridCols = cardStyle === 'horizontal-split' 
        ? horizontalGridColsClass 
        : cardStyle === 'round-circle' 
            ? circleGridColsClass 
            : gridColsClass;

    if (!loading && processedMarkets.length === 0 && config.hideWhenEmpty) {
        return null;
    }

    const bgImage = config.bgImage ? getAssetUrl(config.bgImage) : null;
    const overlayOpacity = config.bgImageOverlayOpacity !== undefined ? Number(config.bgImageOverlayOpacity) : 40;

    // Carousel Autoplay
    useEffect(() => {
        const speed = Number(config.autoplaySpeed || 0);
        if (layout !== 'carousel' || speed <= 0) return;

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
    }, [layout, config.autoplaySpeed]);

    // Determine carousel item container width based on card style
    const getCarouselItemWidthClass = () => {
        switch (cardStyle) {
            case 'round-circle':
                return 'min-w-[130px] sm:min-w-[160px] max-w-[180px]';
            case 'horizontal-split':
                return 'min-w-[320px] sm:min-w-[420px] max-w-[480px]';
            case 'white-card':
            case 'navy-modern':
            default:
                return 'min-w-[260px] sm:min-w-[280px] max-w-[320px]';
        }
    };

    return (
        <section 
            className="w-full py-6 md:py-10 relative overflow-hidden transition-all duration-300"
            style={{
                backgroundColor: config.backgroundColor || config.bgColor || 'transparent',
                backgroundImage: config.gradientBackground || config.bgGradient || undefined,
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

            <div className="container mx-auto px-4 relative z-10">
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 gap-4">
                    <div className="space-y-1.5 max-w-2xl">
                        {badgeText && (
                            <Badge 
                                variant="outline" 
                                className="px-3 py-1 font-semibold uppercase tracking-wider text-[11px] rounded-full border shadow-xs"
                                style={{
                                    borderColor: config.badgeColor || '#0B1E3B',
                                    color: config.badgeColor || '#0B1E3B',
                                    backgroundColor: config.badgeBgColor || 'rgba(11, 30, 59, 0.08)',
                                }}
                            >
                                <Store className="w-3.5 h-3.5 mr-1.5" />
                                {badgeText}
                            </Badge>
                        )}
                        <h2 
                            className="text-2xl md:text-3xl font-black tracking-tight"
                            style={{ color: config.titleColor || '#0B1E3B' }}
                        >
                            {title}
                        </h2>
                        {subtitle && (
                            <p 
                                className="text-xs sm:text-sm opacity-85 leading-relaxed text-slate-600 dark:text-slate-300"
                                style={{ color: config.subtitleColor || undefined }}
                            >
                                {subtitle}
                            </p>
                        )}
                    </div>

                    <div className="flex items-center gap-2 self-start md:self-auto">
                        {config.showAllLink !== false && (
                            <Link href="/local-discovery?tab=markets">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="font-semibold rounded-full border-slate-300 bg-white hover:bg-slate-50 shadow-xs text-xs px-4 cursor-pointer text-slate-900"
                                >
                                    {config.viewAllText || 'Tous les marchés'}
                                    <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                                </Button>
                            </Link>
                        )}
                    </div>
                </div>

                {loading ? (
                    <div className={`grid ${effectiveGridCols} gap-5`}>
                        {Array.from({ length: columns }).map((_, i) => (
                            <div key={i} className="h-72 rounded-[28px] bg-muted/60 animate-pulse border border-border/40" />
                        ))}
                    </div>
                ) : processedMarkets.length === 0 ? (
                    <div className="p-8 text-center rounded-2xl border border-dashed border-border bg-card/50">
                        <Store className="w-8 h-8 mx-auto text-muted-foreground/60 mb-2" />
                        <p className="text-xs font-semibold text-muted-foreground">Aucun marché configuré pour le moment.</p>
                    </div>
                ) : layout === 'carousel' ? (
                    <div className="relative group/carousel">
                        {/* Flanking Navigation Arrows */}
                        <button 
                            onClick={() => scroll('left')}
                            className="absolute left-0 top-1/2 -translate-y-1/2 -ml-3 sm:-ml-4 z-20 bg-white dark:bg-slate-800 shadow-lg rounded-full p-2.5 border border-border/50 text-foreground hover:bg-muted hover:scale-110 transition-all opacity-0 group-hover/carousel:opacity-100 hidden md:flex items-center justify-center cursor-pointer"
                            aria-label="Défiler vers la gauche"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>

                        <button 
                            onClick={() => scroll('right')}
                            className="absolute right-0 top-1/2 -translate-y-1/2 -mr-3 sm:-mr-4 z-20 bg-white dark:bg-slate-800 shadow-lg rounded-full p-2.5 border border-border/50 text-foreground hover:bg-muted hover:scale-110 transition-all opacity-0 group-hover/carousel:opacity-100 hidden md:flex items-center justify-center cursor-pointer"
                            aria-label="Défiler vers la droite"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>

                        <div 
                            ref={scrollContainerRef} 
                            className="flex gap-5 overflow-x-auto pb-4 pt-1 snap-x scrollbar-none no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 scroll-smooth items-stretch"
                        >
                            {processedMarkets.map((market) => (
                                <div key={market.id} className={`${getCarouselItemWidthClass()} flex-shrink-0 snap-start flex flex-col`}>
                                    <MarketCard market={market} config={config} cardStyle={cardStyle} />
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className={`grid ${effectiveGridCols} gap-5`}>
                        {processedMarkets.map((market) => (
                            <MarketCard key={market.id} market={market} config={config} cardStyle={cardStyle} />
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}

// Unified Card Component supporting 4 rich styles
function MarketCard({ market, config, cardStyle = 'navy-modern' }: { market: any; config: any; cardStyle?: string }) {
    const marketImageUrl: string = market.image 
        ? (market.image.startsWith('http') ? market.image : (getAssetUrl(market.image) || CURATED_MARKET_IMAGES[0])) 
        : CURATED_MARKET_IMAGES[0];

    const marketLink = market.slug ? `/${market.slug}` : `/local-discovery?marketId=${market.id}`;

    const hoverEffect = config.hoverEffect || 'lift';
    const animationType = config.animationType || 'fade-in';

    const hoverClass = {
        lift: 'hover:-translate-y-1.5 hover:shadow-2xl',
        zoom: 'hover:scale-[1.03] hover:shadow-xl',
        glow: 'hover:ring-2 hover:ring-primary/40 hover:shadow-xl',
        none: 'hover:shadow-md'
    }[hoverEffect as 'lift' | 'zoom' | 'glow' | 'none'] || 'hover:-translate-y-1.5 hover:shadow-2xl';

    const animClass = {
        'fade-in': 'animate-in fade-in duration-500',
        'slide-up': 'animate-in fade-in slide-in-from-bottom-4 duration-500',
        'zoom-in': 'animate-in fade-in zoom-in-95 duration-500',
        'none': ''
    }[animationType as 'fade-in' | 'slide-up' | 'zoom-in' | 'none'] || '';

    // ==========================================
    // STYLE 1: ROUND-CIRCLE (Avatar Circulaire)
    // ==========================================
    if (cardStyle === 'round-circle') {
        return (
            <Link href={marketLink} className={`flex flex-col items-center text-center group cursor-pointer p-2 ${animClass} no-underline`}>
                <div className="relative w-28 h-28 sm:w-36 sm:h-36 rounded-full overflow-hidden p-1 bg-gradient-to-tr from-primary/80 via-primary/30 to-amber-500 shadow-md group-hover:shadow-xl group-hover:scale-105 transition-all duration-300">
                    <div className="w-full h-full rounded-full overflow-hidden bg-slate-900">
                        <img 
                            src={marketImageUrl} 
                            alt={market.name} 
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-115" 
                        />
                    </div>
                    {market.distanceKm !== null && config.showDistance !== false && (
                        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-md whitespace-nowrap">
                            {market.distanceKm} km
                        </div>
                    )}
                </div>
                <h3 className="mt-3 font-extrabold text-sm sm:text-base text-slate-900 dark:text-white line-clamp-1 group-hover:text-primary transition-colors">
                    {market.name}
                </h3>
                {market.geoZone?.name && (
                    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                        📍 {market.geoZone.name}
                    </span>
                )}
            </Link>
        );
    }

    // ==========================================
    // STYLE 2: HORIZONTAL-SPLIT (Rectangle Horizontal)
    // ==========================================
    if (cardStyle === 'horizontal-split') {
        return (
            <div 
                className={`relative rounded-[24px] overflow-hidden shadow-md transition-all duration-300 flex flex-row group border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 h-[190px] sm:h-[210px] w-full ${hoverClass} ${animClass}`}
                style={{
                    backgroundColor: config.cardBgColor && config.cardBgColor !== '#0B1E3B' ? config.cardBgColor : undefined,
                    borderColor: config.cardBorderColor || undefined,
                }}
            >
                {/* Left Image Side */}
                <div className="relative w-5/12 min-w-[130px] sm:min-w-[160px] h-full overflow-hidden bg-slate-900 shrink-0">
                    <img 
                        src={marketImageUrl} 
                        alt={market.name} 
                        className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                    {market.distanceKm !== null && config.showDistance !== false && (
                        <div className="absolute top-2.5 left-2.5 bg-emerald-600/95 backdrop-blur-md text-white text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-sm">
                            📍 {market.distanceKm} km
                        </div>
                    )}
                </div>

                {/* Right Content Side */}
                <div className="p-3.5 sm:p-4.5 flex flex-col justify-between flex-1 min-w-0">
                    <div>
                        {market.geoZone?.name && (
                            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-primary">
                                {market.geoZone.name}
                            </span>
                        )}
                        <h3 
                            className="font-black text-sm sm:text-base text-slate-950 dark:text-white line-clamp-1 mt-0.5"
                            title={market.name}
                        >
                            {market.name}
                        </h3>
                        {market.description && (
                            <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-300 line-clamp-2 mt-1 leading-relaxed">
                                {market.description}
                            </p>
                        )}
                    </div>

                    <Link href={marketLink} className="mt-2 block w-full no-underline">
                        <button className="w-full py-1.5 sm:py-2 px-3 rounded-xl bg-slate-900 hover:bg-primary text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs">
                            <span>Visiter</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                    </Link>
                </div>
            </div>
        );
    }

    // ==========================================
    // STYLE 3: WHITE-CARD (Carte Blanche Épurée)
    // ==========================================
    if (cardStyle === 'white-card') {
        return (
            <div 
                className={`relative rounded-[24px] overflow-hidden shadow-md transition-all duration-300 flex flex-col group border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 h-full ${hoverClass} ${animClass}`}
                style={{
                    backgroundColor: config.cardBgColor && config.cardBgColor !== '#0B1E3B' ? config.cardBgColor : undefined,
                    borderColor: config.cardBorderColor || undefined,
                }}
            >
                {/* Top Image */}
                <div className="relative h-44 sm:h-48 w-full overflow-hidden bg-slate-900 shrink-0">
                    <img 
                        src={marketImageUrl} 
                        alt={market.name} 
                        className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
                    
                    {/* Floating Badges on Image */}
                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-1.5">
                        {market.geoZone?.name && (
                            <span className="text-[10px] font-black text-white bg-black/60 backdrop-blur-md px-2.5 py-0.5 rounded-full border border-white/20">
                                {market.geoZone.name}
                            </span>
                        )}
                        {market.distanceKm !== null && config.showDistance !== false && (
                            <span className="text-[10px] font-black text-white bg-emerald-600/90 backdrop-blur-md px-2.5 py-0.5 rounded-full shadow-sm ml-auto">
                                📍 {market.distanceKm} km
                            </span>
                        )}
                    </div>
                </div>

                {/* Card Body */}
                <div className="p-4 flex flex-col justify-between flex-1 gap-3">
                    <div>
                        <h3 
                            className="font-black text-base text-slate-950 dark:text-white line-clamp-1"
                            title={market.name}
                        >
                            {market.name}
                        </h3>
                        {market.description && (
                            <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 mt-1 leading-relaxed">
                                {market.description}
                            </p>
                        )}
                    </div>

                    <Link href={marketLink} className="w-full no-underline mt-auto">
                        <button className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-primary hover:text-white text-slate-900 dark:bg-slate-800 dark:text-slate-100 font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs">
                            <span>Découvrir ce marché</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                    </Link>
                </div>
            </div>
        );
    }

    // ==========================================
    // STYLE 4 (DEFAULT): NAVY-MODERN (Style Capture / Fond Sombre Immersif)
    // ==========================================
    return (
        <div 
            className={`relative rounded-[28px] sm:rounded-[32px] overflow-hidden shadow-lg transition-all duration-300 h-[340px] sm:h-[380px] w-full flex flex-col justify-between group border border-slate-200/60 dark:border-slate-800 ${hoverClass} ${animClass}`}
            style={{
                backgroundColor: config.cardBgColor || '#0B1E3B',
                borderColor: config.cardBorderColor || undefined,
            }}
        >
            {/* Full Card Background Image */}
            <div className="absolute inset-0 z-0 overflow-hidden bg-slate-900">
                <img 
                    src={marketImageUrl} 
                    alt={market.name} 
                    className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110" 
                />
                {/* Subtle gradient vignette for depth */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-black/35 pointer-events-none" />
            </div>

            {/* Top Badges (Distance & Commune) */}
            <div className="relative z-10 p-3.5 sm:p-4 flex items-center justify-between gap-2">
                {market.geoZone?.name && (
                    <span className="text-[11px] font-black text-white bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 shadow-sm">
                        {market.geoZone.name}
                    </span>
                )}
                {market.distanceKm !== null && config.showDistance !== false && (
                    <span className="text-[11px] font-black text-white bg-emerald-600/90 backdrop-blur-md px-3 py-1 rounded-full shadow-sm ml-auto">
                        📍 à {market.distanceKm} km
                    </span>
                )}
            </div>

            {/* Floating White Rounded Box (Bottom / Center) */}
            <div className="relative z-10 p-3 sm:p-4">
                <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-[22px] sm:rounded-[24px] p-4 sm:p-5 shadow-2xl border border-white/40 dark:border-slate-700/50 flex flex-col items-center justify-center text-center gap-2.5 transition-transform duration-300 group-hover:scale-[1.02]">
                    <div className="flex items-center justify-center gap-2 max-w-full px-1">
                        <MapPin className="w-4 h-4 text-red-600 fill-red-600 shrink-0" />
                        <h3 
                            className="font-black text-base sm:text-lg text-slate-950 dark:text-white tracking-tight truncate"
                            title={market.name}
                        >
                            {market.name}
                        </h3>
                    </div>

                    <Link href={marketLink} className="w-full mt-1 no-underline">
                        <button className="w-full py-2 sm:py-2.5 px-4 rounded-full bg-[#0B1E3B] hover:bg-[#162a4d] text-white font-black text-xs shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer">
                            <span>Visiter ce marché</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default LocalMarketsProximitySection;
