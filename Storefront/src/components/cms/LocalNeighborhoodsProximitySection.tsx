'use client';

import React, { useRef } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Navigation, ChevronLeft, ChevronRight, Compass } from 'lucide-react';
import { useLocation } from '@/contexts/location-context';
import { interpolateLocalVariables } from '@/lib/cms/interpolation';
import { getAssetUrl } from '@/lib/vendure/api-utils';

function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface LocalNeighborhoodsProximitySectionProps {
    config?: any;
}

export function LocalNeighborhoodsProximitySection({ config = {} }: LocalNeighborhoodsProximitySectionProps) {
    const { selectedLocation, neighborhoods } = useLocation();
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const isNeighborhoodType = (item: any) => {
        const t = (item.type || '').toUpperCase();
        return t === 'NEIGHBORHOOD' || t === 'QUARTIER' || t === 'VILLAGE' || t === 'ARRONDISSEMENT' || (!['COMMUNE', 'CITY', 'DEPARTMENT', 'COUNTRY'].includes(t));
    };

    let rawList: any[] = (neighborhoods && neighborhoods.length > 0) 
        ? neighborhoods.filter(isNeighborhoodType) 
        : [];

    if (config.filterCommune && config.filterCommune !== 'ALL') {
        const commTarget = config.filterCommune.toLowerCase().trim();
        rawList = rawList.filter((item: any) => {
            const itemComm = (item.commune || item.parent?.name || '').toLowerCase();
            const itemName = (item.name || '').toLowerCase();
            return itemComm.includes(commTarget) || itemName.includes(commTarget);
        });
    }

    if (Array.isArray(config.selectedZoneIds) && config.selectedZoneIds.length > 0) {
        const allowed = config.selectedZoneIds.map(String);
        rawList = rawList.filter((item: any) => allowed.includes(String(item.id)));
    }

    if (selectedLocation?.latitude && selectedLocation?.longitude) {
        const uLat = Number(selectedLocation.latitude);
        const uLon = Number(selectedLocation.longitude);
        rawList = rawList.map((item: any) => {
            if (item.centerLatitude && item.centerLongitude) {
                const dist = calculateDistanceKm(uLat, uLon, Number(item.centerLatitude), Number(item.centerLongitude));
                const itemComm = (item.commune || item.parent?.name || '').toLowerCase().trim();
                const uComm = (selectedLocation.commune || selectedLocation.name || '').toLowerCase().trim();
                const isSameCommune = Boolean(uComm && itemComm && (itemComm.includes(uComm) || uComm.includes(itemComm)));
                return { ...item, distanceKm: Math.round(dist * 10) / 10, isSameCommune };
            }
            return item;
        }).sort((a: any, b: any) => {
            if (a.isSameCommune && !b.isSameCommune) return -1;
            if (!a.isSameCommune && b.isSameCommune) return 1;
            return (a.distanceKm ?? 999) - (b.distanceKm ?? 999);
        });
    }

    const take = Number(config.take || 12);
    const displayItems = rawList.slice(0, take);

    const scroll = (direction: 'left' | 'right') => {
        if (scrollContainerRef.current) {
            const amount = scrollContainerRef.current.clientWidth * 0.8;
            scrollContainerRef.current.scrollBy({ left: direction === 'left' ? -amount : amount, behavior: 'smooth' });
        }
    };

    const layout = config.layout || 'carousel';
    const columns = config.columns || 4;

    React.useEffect(() => {
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

    const title = interpolateLocalVariables(config.title || 'Quartiers du Bénin', selectedLocation);
    const subtitle = interpolateLocalVariables(config.subtitle || 'Sélectionnez votre zone (Cotonou, Calavi, Porto-Novo, Parakou...) pour explorer les commerces locaux.', selectedLocation);
    const badgeText = interpolateLocalVariables(config.badgeText || 'ZONES DESSERVIES', selectedLocation);

    const gridColsClass = {
        2: 'grid-cols-1 sm:grid-cols-2',
        3: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3',
        4: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4',
        5: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-5',
        6: 'grid-cols-2 sm:grid-cols-4 md:grid-cols-6',
    }[columns as 2 | 3 | 4 | 5 | 6] || 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4';

    if (displayItems.length === 0 && config.hideWhenEmpty) {
        return null;
    }

    const bgImage = config.bgImage ? getAssetUrl(config.bgImage) : null;
    const overlayOpacity = config.bgImageOverlayOpacity !== undefined ? Number(config.bgImageOverlayOpacity) : 40;

    return (
        <section
            className="w-full py-8 md:py-12 relative overflow-hidden transition-all duration-300"
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

            <div className="max-w-[1720px] mx-auto px-3 sm:px-4 md:px-6 lg:px-8 relative z-10">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
                    <div className="space-y-2 max-w-2xl">
                        {badgeText && (
                            <Badge
                                variant="outline"
                                className="px-3 py-1 font-bold uppercase tracking-wider text-xs rounded-full border shadow-2xs"
                                style={{
                                    borderColor: config.badgeColor || '#2563eb',
                                    color: config.badgeColor || '#2563eb',
                                    backgroundColor: config.badgeBgColor || 'rgba(37, 99, 235, 0.08)',
                                }}
                            >
                                <Compass className="w-3.5 h-3.5 mr-1.5" />
                                {badgeText}
                            </Badge>
                        )}
                        <h2
                            className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white"
                            style={{ color: config.titleColor || undefined }}
                        >
                            {title}
                        </h2>
                        {subtitle && (
                            <p
                                className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed"
                                style={{ color: config.subtitleColor || undefined }}
                            >
                                {subtitle}
                            </p>
                        )}
                    </div>

                    <div className="flex items-center gap-2 self-start md:self-auto">
                        {config.showAllLink !== false && (
                            <Link href="/local-discovery?tab=neighborhoods">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="font-bold rounded-full border-slate-300 bg-white hover:bg-slate-50 text-slate-900 shadow-2xs text-xs px-5 py-2.5 cursor-pointer flex items-center gap-2"
                                >
                                    <span>{config.viewAllText || 'Toutes les zones'}</span>
                                    <Navigation className="w-3.5 h-3.5 text-blue-600" />
                                </Button>
                            </Link>
                        )}
                    </div>
                </div>

                {/* Items Presentation */}
                {layout === 'carousel' ? (
                    <div className="relative group/carousel">
                        <button 
                            onClick={() => scroll('left')}
                            className="absolute -left-3 sm:-left-5 top-1/2 -translate-y-1/2 z-20 bg-white dark:bg-slate-800 shadow-xl rounded-full w-10 h-10 border border-slate-200/80 dark:border-slate-700 text-slate-800 dark:text-white hover:bg-slate-50 hover:scale-110 active:scale-95 transition-all flex items-center justify-center cursor-pointer opacity-90 group-hover/carousel:opacity-100"
                            aria-label="Défiler vers la gauche"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>

                        <button 
                            onClick={() => scroll('right')}
                            className="absolute -right-3 sm:-right-5 top-1/2 -translate-y-1/2 z-20 bg-white dark:bg-slate-800 shadow-xl rounded-full w-10 h-10 border border-slate-200/80 dark:border-slate-700 text-slate-800 dark:text-white hover:bg-slate-50 hover:scale-110 active:scale-95 transition-all flex items-center justify-center cursor-pointer opacity-90 group-hover/carousel:opacity-100"
                            aria-label="Défiler vers la droite"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>

                        <div
                            ref={scrollContainerRef}
                            className="flex gap-4 sm:gap-5 overflow-x-auto pb-4 pt-1 snap-x scrollbar-none no-scrollbar -mx-2 px-2 scroll-smooth"
                        >
                            {displayItems.map((item, index) => (
                                <div key={item.id || index} className="min-w-[220px] sm:min-w-[260px] max-w-[280px] flex-shrink-0 snap-start">
                                    <NeighborhoodCard
                                        item={item}
                                        index={index}
                                        config={config}
                                        isSelected={selectedLocation?.id === String(item.id) || selectedLocation?.name === item.name}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className={`grid gap-4 ${gridColsClass}`}>
                        {displayItems.map((item, index) => (
                            <NeighborhoodCard
                                key={item.id || index}
                                item={item}
                                index={index}
                                config={config}
                                isSelected={selectedLocation?.id === String(item.id) || selectedLocation?.name === item.name}
                            />
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}

const NEIGHBORHOOD_GRADIENTS = [
    'from-slate-900 via-indigo-950 to-slate-900',
    'from-slate-900 via-blue-950 to-slate-900',
    'from-slate-900 via-sky-950 to-slate-900',
    'from-slate-900 via-emerald-950 to-slate-900',
    'from-slate-900 via-violet-950 to-slate-900',
];

function NeighborhoodCard({
    item,
    index = 0,
    config,
    isSelected,
}: {
    item: any;
    index?: number;
    config: any;
    isSelected: boolean;
}) {
    const targetUrl = item.slug ? `/${item.slug}` : `/local-discovery?tab=neighborhoods`;
    const subtitleText = item.commune || item.parent?.name ? `Quartier • ${item.commune || item.parent?.name}` : 'Quartier';
    
    // Resolve image from geoZone image or icon or banner
    let imageUrl: string | null = null;
    if (item.image) {
        const raw = String(item.image);
        imageUrl = raw.startsWith('http') ? raw : (getAssetUrl(raw) || raw);
    } else if (item.banner) {
        const raw = String(item.banner);
        imageUrl = raw.startsWith('http') ? raw : (getAssetUrl(raw) || raw);
    }

    let iconUrl: string | null = null;
    if (item.icon) {
        const raw = String(item.icon);
        iconUrl = raw.startsWith('http') ? raw : (getAssetUrl(raw) || raw);
    }

    const gradient = NEIGHBORHOOD_GRADIENTS[index % NEIGHBORHOOD_GRADIENTS.length];

    return (
        <Link href={targetUrl} className="block no-underline">
            <div
                className={`group relative overflow-hidden rounded-3xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
                    isSelected
                        ? 'ring-2 ring-blue-600 shadow-lg border-blue-500'
                        : 'border-slate-200/80 dark:border-slate-800 shadow-sm'
                }`}
                style={{
                    minHeight: '200px',
                    backgroundColor: config.cardBgColor || '#0f172a',
                }}
            >
                {/* Background: Actual Uploaded Photo or Elegant Modern Gradient */}
                {imageUrl ? (
                    <div
                        className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                        style={{ backgroundImage: `url('${imageUrl}')` }}
                    />
                ) : (
                    <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`}>
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none" />
                        <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-500/10 rounded-full blur-xl pointer-events-none" />
                    </div>
                )}

                {/* Dark Vignette Overlay for Crisp Legibility */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/20" />

                {/* Top Badges */}
                <div className="relative z-10 p-4 flex items-center justify-between">
                    <div className="w-8 h-8 rounded-full bg-white/95 backdrop-blur-md text-blue-600 flex items-center justify-center shadow-md border border-white/40">
                        {iconUrl ? (
                            <img src={iconUrl} alt="" className="w-4 h-4 object-contain rounded-full" />
                        ) : (
                            <MapPin className="w-4 h-4 text-blue-600" />
                        )}
                    </div>

                    {item.distanceKm !== undefined && (
                        <span className="bg-black/60 backdrop-blur-md text-white text-[11px] font-bold px-2.5 py-1 rounded-full border border-white/20 shadow-2xs">
                            ~ {item.distanceKm} km
                        </span>
                    )}
                </div>

                {/* Bottom Details */}
                <div className="relative z-10 p-4 pt-10 mt-auto flex flex-col justify-end">
                    <h4 className="font-black text-base sm:text-lg text-white truncate drop-shadow-md group-hover:text-blue-300 transition-colors">
                        {item.name}
                    </h4>
                    <div className="flex items-center justify-between mt-1 text-xs text-slate-300">
                        <span className="truncate font-medium">{subtitleText}</span>
                        <span className="text-blue-400 font-bold flex items-center gap-1 shrink-0 group-hover:translate-x-1 transition-transform">
                            Découvrir &rarr;
                        </span>
                    </div>
                </div>
            </div>
        </Link>
    );
}
