'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Store, MapPin, ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { getAssetUrl, getShopApiUrl } from '@/lib/vendure/api-utils';
import { fetchWithClientCache } from '@/lib/vendure/client-cache';
import { useLocation } from '@/contexts/location-context';
import { interpolateLocalVariables } from '@/lib/cms/interpolation';

const FALLBACK_MARKETS = [
    { 
        id: "1", 
        name: "Marché Dangba", 
        slug: "marche-dangba", 
        description: "Le plus grand marché de Cotonou, au cœur de l'activité commerciale.",
        image: "https://images.unsplash.com/photo-1533900298318-6b8da08a523e?q=80&w=600&auto=format&fit=crop",
        centerLatitude: 6.367, 
        centerLongitude: 2.44, 
        geoZone: { name: "Cotonou" } 
    },
    { 
        id: "2", 
        name: "Marché Zongo", 
        slug: "marche-zongo", 
        description: "Un marché emblématique, riche en produits variés.",
        image: "https://images.unsplash.com/photo-1488459716781-31db52582fe9?q=80&w=600&auto=format&fit=crop",
        centerLatitude: 6.365, 
        centerLongitude: 2.42, 
        geoZone: { name: "Cotonou" } 
    },
    { 
        id: "3", 
        name: "Marché Wémè", 
        slug: "marche-weme", 
        description: "Des produits locaux et artisanaux au meilleur prix.",
        image: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=600&auto=format&fit=crop",
        centerLatitude: 6.505, 
        centerLongitude: 2.618, 
        geoZone: { name: "Porto-Novo" } 
    },
    { 
        id: "4", 
        name: "Marché Houéyiho", 
        slug: "marche-houeyiho", 
        description: "Le choix idéal pour vos achats au quotidien.",
        image: "https://images.unsplash.com/photo-1578916171728-46686eac8d58?q=80&w=600&auto=format&fit=crop",
        centerLatitude: 6.36, 
        centerLongitude: 2.38, 
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
                    const items = (data?.markets && data.markets.length > 0) ? data.markets : FALLBACK_MARKETS;
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

    // Intelligently compute distance and sort markets by proximity to the user
    const processedMarkets = useMemo(() => {
        let items = [...rawMarkets];

        // 1. Filter specific markets if configured by admin
        if (Array.isArray(config.selectedMarketIds) && config.selectedMarketIds.length > 0) {
            const allowed = config.selectedMarketIds.map(String);
            items = items.filter((m: any) => allowed.includes(String(m.id)));
        }

        // 2. User coordinates or commune
        const uLat = selectedLocation?.latitude ? Number(selectedLocation.latitude) : null;
        const uLon = selectedLocation?.longitude ? Number(selectedLocation.longitude) : null;
        const uCommune = (selectedLocation?.commune || selectedLocation?.name || '').toLowerCase();

        items = items.map((m: any, index: number) => {
            let distanceKm: number | null = null;
            const mLat = m.centerLatitude ? Number(m.centerLatitude) : null;
            const mLon = m.centerLongitude ? Number(m.centerLongitude) : null;

            if (uLat !== null && uLon !== null && mLat !== null && mLon !== null) {
                const d = calculateDistanceKm(uLat, uLon, mLat, mLon);
                distanceKm = Math.round(d * 10) / 10;
            }

            const zoneName = (m.geoZone?.name || m.geoZone?.parent?.name || '').toLowerCase();
            const isSameCommune = uCommune && zoneName && (zoneName.includes(uCommune) || uCommune.includes(zoneName));

            // Provide fallback image & description if missing, or use admin CMS overrides
            const fallbackItem = FALLBACK_MARKETS[index % FALLBACK_MARKETS.length];
            const override = config.marketOverrides?.[m.id] || config.marketOverrides?.[String(m.id)] || {};
            const image = override.image || m.image || fallbackItem.image;
            const description = override.description !== undefined ? override.description : (m.description || fallbackItem.description);
            const name = override.name || m.name;

            return {
                ...m,
                name,
                image,
                description,
                distanceKm,
                isSameCommune,
            };
        });

        // 3. Sort: Closest distance or same commune first
        items.sort((a: any, b: any) => {
            if (a.distanceKm !== null && b.distanceKm !== null) {
                return a.distanceKm - b.distanceKm;
            }
            if (a.isSameCommune && !b.isSameCommune) return -1;
            if (!a.isSameCommune && b.isSameCommune) return 1;
            if (a.distanceKm !== null) return -1;
            if (b.distanceKm !== null) return 1;
            return 0;
        });

        const take = Number(config.take || 12);
        return items.slice(0, take);
    }, [rawMarkets, selectedLocation, config.selectedMarketIds, config.marketOverrides, config.take]);

    const title = interpolateLocalVariables(config.title || 'Marchés Populaires & Traditionnels', selectedLocation);
    const subtitle = interpolateLocalVariables(config.subtitle || 'Explorez les grands marchés du Bénin et faites vos achats directement auprès de leurs commerçants.', selectedLocation);
    const badgeText = interpolateLocalVariables(config.badgeText || 'Pôles Commerciaux', selectedLocation);

    const layout = config.layout || 'grid';
    const columns = config.columns || 4;

    const gridColsClass = {
        2: 'grid-cols-1 sm:grid-cols-2',
        3: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3',
        4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
        5: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-5',
    }[columns as 2 | 3 | 4 | 5] || 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4';

    if (!loading && processedMarkets.length === 0 && config.hideWhenEmpty) {
        return null;
    }

    const bgImage = config.bgImage ? getAssetUrl(config.bgImage) : null;
    const overlayOpacity = config.bgImageOverlayOpacity !== undefined ? Number(config.bgImageOverlayOpacity) : 40;

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
                                    className="font-semibold rounded-full border-slate-300 bg-white hover:bg-slate-50 shadow-xs text-xs px-4 cursor-pointer"
                                >
                                    {config.viewAllText || 'Tous les marchés'}
                                    <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                                </Button>
                            </Link>
                        )}
                    </div>
                </div>

                {loading ? (
                    <div className={`grid ${gridColsClass} gap-5`}>
                        {Array.from({ length: columns }).map((_, i) => (
                            <div key={i} className="h-72 rounded-2xl bg-muted/60 animate-pulse border border-border/40" />
                        ))}
                    </div>
                ) : processedMarkets.length === 0 ? (
                    <div className="p-8 text-center rounded-2xl border border-dashed border-border bg-card/50">
                        <Store className="w-8 h-8 mx-auto text-muted-foreground/60 mb-2" />
                        <p className="text-xs font-semibold text-muted-foreground">Aucun marché configuré pour le moment.</p>
                    </div>
                ) : layout === 'carousel' ? (
                    <div className="relative group/carousel">
                        {/* Flanking Navigation Arrows (Flash Sale style) */}
                        <button 
                            onClick={() => scroll('left')}
                            className="absolute left-0 top-1/2 -translate-y-1/2 -ml-3 sm:-ml-4 z-20 bg-white dark:bg-slate-800 shadow-lg rounded-full p-2 border border-border/50 text-foreground hover:bg-muted hover:scale-110 transition-all opacity-0 group-hover/carousel:opacity-100 hidden md:flex items-center justify-center cursor-pointer"
                            aria-label="Défiler vers la gauche"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>

                        <button 
                            onClick={() => scroll('right')}
                            className="absolute right-0 top-1/2 -translate-y-1/2 -mr-3 sm:-mr-4 z-20 bg-white dark:bg-slate-800 shadow-lg rounded-full p-2 border border-border/50 text-foreground hover:bg-muted hover:scale-110 transition-all opacity-0 group-hover/carousel:opacity-100 hidden md:flex items-center justify-center cursor-pointer"
                            aria-label="Défiler vers la droite"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>

                        <div 
                            ref={scrollContainerRef} 
                            className="flex gap-5 overflow-x-auto pb-4 pt-1 snap-x scrollbar-none no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 scroll-smooth"
                        >
                            {processedMarkets.map((market) => (
                                <div key={market.id} className="min-w-[260px] sm:min-w-[280px] max-w-[320px] flex-shrink-0 snap-start">
                                    <MarketCard market={market} config={config} />
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className={`grid ${gridColsClass} gap-5`}>
                        {processedMarkets.map((market) => (
                            <MarketCard key={market.id} market={market} config={config} />
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}

function MarketCard({ market, config }: { market: any; config: any }) {
    const marketImageUrl: string | null = market.image 
        ? (market.image.startsWith('http') ? market.image : (getAssetUrl(market.image) || null)) 
        : null;

    const cardStyle = config.cardStyle || 'navy-modern';

    // 1. Style Circulaire / Rond
    if (cardStyle === 'round-circle') {
        return (
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md border border-slate-200 dark:border-slate-700 flex flex-col items-center text-center group transition-all h-full justify-between">
                <div className="flex flex-col items-center w-full">
                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden mb-3.5 border-3 border-slate-200 dark:border-slate-700 bg-slate-100 shadow-sm relative">
                        {marketImageUrl ? (
                            <img src={marketImageUrl} alt={market.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400 bg-slate-100"><Store className="w-8 h-8" /></div>
                        )}
                    </div>
                    <h3 className="font-black text-base text-slate-950 dark:text-white truncate max-w-[220px] group-hover:text-blue-600 transition-colors">
                        {market.name}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap justify-center">
                        {market.geoZone?.name && (
                            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{market.geoZone.name}</span>
                        )}
                        {market.distanceKm !== null && (
                            <span className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                                • à {market.distanceKm} km
                            </span>
                        )}
                    </div>
                    {market.description && (
                        <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mt-2 font-medium">
                            {market.description}
                        </p>
                    )}
                </div>
                <Link href={`/local-discovery?marketId=${market.id}`} className="mt-4 w-full">
                    <button className="w-full py-2 px-4 rounded-full bg-[#0B1E3B] hover:bg-[#162a4d] text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer">
                        <span>Visiter le marché</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                </Link>
            </div>
        );
    }

    // 2. Style Blanc Épuré
    if (cardStyle === 'white-card') {
        return (
            <div className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-xs hover:shadow-lg border border-slate-200 dark:border-slate-700 transition-all flex flex-col h-full group">
                <div className="relative h-44 w-full overflow-hidden bg-slate-100">
                    {marketImageUrl ? (
                        <img src={marketImageUrl} alt={market.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400 bg-slate-100"><Store className="w-10 h-10" /></div>
                    )}
                    <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
                        {market.geoZone?.name && (
                            <span className="text-[11px] font-black text-white bg-slate-900/80 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/20 shadow-sm">
                                {market.geoZone.name}
                            </span>
                        )}
                        {market.distanceKm !== null && (
                            <span className="text-[11px] font-black text-white bg-emerald-600 backdrop-blur-md px-2.5 py-1 rounded-full shadow-sm">
                                à {market.distanceKm} km
                            </span>
                        )}
                    </div>
                </div>
                <div className="p-5 flex flex-col flex-1 justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                                <MapPin className="w-3.5 h-3.5" />
                            </div>
                            <h3 className="font-black text-base text-slate-950 dark:text-white truncate group-hover:text-blue-600 transition-colors">
                                {market.name}
                            </h3>
                        </div>
                        {market.description && (
                            <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 line-clamp-2 leading-relaxed font-medium">
                                {market.description}
                            </p>
                        )}
                    </div>
                    <div className="pt-4 mt-auto">
                        <Link href={`/local-discovery?marketId=${market.id}`}>
                            <button className="w-full py-2.5 rounded-xl bg-[#0B1E3B] hover:bg-[#162a4d] text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs">
                                <span>Voir le marché</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // 3. Style Par Défaut : Moderne Bleu Nuit (Ultra Haute Visibilité & Contraste)
    return (
        <div 
            className="rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col h-full bg-[#0B1E3B] border border-slate-700/80 group"
            style={{
                backgroundColor: config.cardBgColor || '#0B1E3B',
            }}
        >
            {/* Market Top Image */}
            <div className="relative h-44 sm:h-48 w-full overflow-hidden bg-slate-900">
                {marketImageUrl ? (
                    <img 
                        src={marketImageUrl} 
                        alt={market.name} 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-900 text-slate-400">
                        <Store className="w-12 h-12 opacity-60" />
                    </div>
                )}
                <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
                    {market.geoZone?.name && (
                        <span className="text-[11px] font-black text-white bg-slate-950/85 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/20 shadow-md">
                            {market.geoZone.name}
                        </span>
                    )}
                    {market.distanceKm !== null && (
                        <span className="text-[11px] font-black text-white bg-emerald-600 backdrop-blur-md px-2.5 py-1 rounded-full shadow-md">
                            à {market.distanceKm} km
                        </span>
                    )}
                </div>
            </div>

            {/* Market Card Content (Midnight Navy with Crisp Pure White Text) */}
            <div className="p-5 flex flex-col flex-1 justify-between text-white">
                <div>
                    <div className="flex items-center gap-2.5 mb-2.5">
                        <div className="w-7 h-7 rounded-full bg-red-600 flex items-center justify-center shrink-0 shadow-sm">
                            <MapPin className="w-4 h-4 text-white" />
                        </div>
                        <h3 
                            className="font-black text-base sm:text-lg text-white tracking-tight truncate group-hover:text-sky-300 transition-colors drop-shadow-xs"
                            title={market.name}
                            style={{ color: config.cardTextColor || '#ffffff' }}
                        >
                            {market.name}
                        </h3>
                    </div>

                    {market.description && (
                        <p 
                            className="text-xs sm:text-sm font-medium text-slate-100 dark:text-slate-200 leading-relaxed line-clamp-2 min-h-[36px] drop-shadow-xs"
                            style={{ color: config.cardTextColor ? `${config.cardTextColor}ee` : '#f1f5f9' }}
                        >
                            {market.description}
                        </p>
                    )}
                </div>

                <div className="pt-4 mt-auto">
                    <Link href={`/local-discovery?marketId=${market.id}`}>
                        <button className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white hover:bg-slate-100 text-slate-950 font-black text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all cursor-pointer">
                            <span>Voir le marché</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                    </Link>
                </div>
            </div>
        </div>
    );
}

