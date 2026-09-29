'use client';

import React, { useRef } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Navigation, ChevronLeft, ChevronRight, Building2, Compass } from 'lucide-react';
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
    const { selectedLocation, neighborhoods, selectLocation } = useLocation();
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Focus strictly on authentic neighborhoods & villages (filter out any macro-communes)
    let rawList: any[] = (neighborhoods && neighborhoods.length > 0) 
        ? neighborhoods.filter((item: any) => item.type !== 'COMMUNE' && item.type !== 'CITY') 
        : [];

    if (rawList.length === 0) {
        rawList = [
            { id: "101", name: "Védoko", slug: "vedoko", type: "NEIGHBORHOOD", commune: "Cotonou", centerLatitude: 6.3750, centerLongitude: 2.3920 },
            { id: "102", name: "Mènontin", slug: "menontin", type: "NEIGHBORHOOD", commune: "Cotonou", centerLatitude: 6.3710, centerLongitude: 2.3850 },
            { id: "103", name: "Agla", slug: "agla", type: "NEIGHBORHOOD", commune: "Cotonou", centerLatitude: 6.3650, centerLongitude: 2.3780 },
            { id: "104", name: "Fidjrossè", slug: "fidjrosse", type: "NEIGHBORHOOD", commune: "Cotonou", centerLatitude: 6.3690, centerLongitude: 2.3610 },
            { id: "105", name: "Cadjèhoun", slug: "cadjehoun", type: "NEIGHBORHOOD", commune: "Cotonou", centerLatitude: 6.3620, centerLongitude: 2.4000 },
            { id: "106", name: "Gbégamey", slug: "gbegamey", type: "NEIGHBORHOOD", commune: "Cotonou", centerLatitude: 6.3650, centerLongitude: 2.4080 },
            { id: "107", name: "Akpakpa Dodomè", slug: "akpakpa-dodome", type: "NEIGHBORHOOD", commune: "Cotonou", centerLatitude: 6.3873, centerLongitude: 2.4573 },
            { id: "108", name: "Sikècodji", slug: "sikecodji", type: "NEIGHBORHOOD", commune: "Cotonou", centerLatitude: 6.3740, centerLongitude: 2.4130 },
            { id: "109", name: "Sainte-Rita", slug: "sainte-rita", type: "NEIGHBORHOOD", commune: "Cotonou", centerLatitude: 6.3780, centerLongitude: 2.4050 },
            { id: "110", name: "Haie Vive", slug: "haie-vive", type: "NEIGHBORHOOD", commune: "Cotonou", centerLatitude: 6.3720, centerLongitude: 2.3950 },
            { id: "111", name: "Zongo", slug: "zongo", type: "NEIGHBORHOOD", commune: "Cotonou", centerLatitude: 6.3660, centerLongitude: 2.4220 },
            { id: "14", name: "Tokpota", slug: "tokpota", type: "NEIGHBORHOOD", commune: "Porto-Novo", centerLatitude: 6.515, centerLongitude: 2.632 },
            { id: "13", name: "Ahouangbo", slug: "ahouangbo", type: "NEIGHBORHOOD", commune: "Porto-Novo", centerLatitude: 6.488, centerLongitude: 2.628 },
            { id: "12", name: "Ouando", slug: "ouando", type: "NEIGHBORHOOD", commune: "Porto-Novo", centerLatitude: 6.505, centerLongitude: 2.618 },
            { id: "112", name: "Djassin", slug: "djassin", type: "NEIGHBORHOOD", commune: "Porto-Novo", centerLatitude: 6.478, centerLongitude: 2.632 },
            { id: "17", name: "Cococodji", slug: "cococodji", type: "NEIGHBORHOOD", commune: "Abomey-Calavi", centerLatitude: 6.425, centerLongitude: 2.298 },
            { id: "15", name: "Zogbadjè", slug: "zogbadje", type: "NEIGHBORHOOD", commune: "Abomey-Calavi", centerLatitude: 6.4236, centerLongitude: 2.3347 },
            { id: "16", name: "Godomey", slug: "godomey", type: "NEIGHBORHOOD", commune: "Abomey-Calavi", centerLatitude: 6.3854, centerLongitude: 2.3432 }
        ];
    }

    // Filter by specific commune if configured
    if (config.filterCommune && config.filterCommune !== 'ALL') {
        const commTarget = config.filterCommune.toLowerCase();
        rawList = rawList.filter((item: any) => (item.commune || '').toLowerCase().includes(commTarget));
    }

    // Filter by manual IDs if configured
    if (Array.isArray(config.selectedZoneIds) && config.selectedZoneIds.length > 0) {
        const allowed = config.selectedZoneIds.map(String);
        rawList = rawList.filter((item: any) => allowed.includes(String(item.id)));
    }

    // Sort neighborhoods by real proximity to the user's active position
    if (selectedLocation?.latitude && selectedLocation?.longitude) {
        const uLat = Number(selectedLocation.latitude);
        const uLon = Number(selectedLocation.longitude);
        rawList = rawList.map((item: any) => {
            if (item.centerLatitude && item.centerLongitude) {
                const dist = calculateDistanceKm(uLat, uLon, Number(item.centerLatitude), Number(item.centerLongitude));
                return { ...item, distanceKm: Math.round(dist * 10) / 10 };
            }
            return item;
        }).sort((a: any, b: any) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));
    }

    const take = Number(config.take || 12);
    const displayItems = rawList.slice(0, take);

    const scroll = (direction: 'left' | 'right') => {
        if (scrollContainerRef.current) {
            const amount = scrollContainerRef.current.clientWidth * 0.8;
            scrollContainerRef.current.scrollBy({ left: direction === 'left' ? -amount : amount, behavior: 'smooth' });
        }
    };

    const title = interpolateLocalVariables(config.title || 'Quartiers & Villages du Bénin', selectedLocation);
    const subtitle = interpolateLocalVariables(config.subtitle || 'Découvrez les offres et boutiques situées directement dans votre quartier ou rue voisine.', selectedLocation);
    const badgeText = interpolateLocalVariables(config.badgeText || 'Quartiers Proches', selectedLocation);

    const layout = config.layout || 'grid';
    const columns = config.columns || 4;

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

            <div className="container mx-auto px-4 relative z-10">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
                    <div className="space-y-2 max-w-2xl">
                        {badgeText && (
                            <Badge
                                variant="outline"
                                className="px-3 py-1 font-semibold uppercase tracking-wider text-xs rounded-full border shadow-sm"
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
                            className="text-2xl md:text-3xl font-extrabold tracking-tight"
                            style={{ color: config.titleColor || '#0f172a' }}
                        >
                            {title}
                        </h2>
                        {subtitle && (
                            <p
                                className="text-sm md:text-base opacity-85 leading-relaxed"
                                style={{ color: config.subtitleColor || '#475569' }}
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
                                    className="font-medium rounded-full border-slate-300 bg-white/90 hover:bg-white shadow-sm text-xs md:text-sm px-4 cursor-pointer"
                                >
                                    {config.viewAllText || 'Toutes les zones'}
                                    <Navigation className="w-3.5 h-3.5 ml-1.5 text-blue-600" />
                                </Button>
                            </Link>
                        )}
                    </div>
                </div>

                {/* Items Presentation */}
                {layout === 'carousel' ? (
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
                            className="flex gap-4 overflow-x-auto pb-4 pt-1 snap-x scrollbar-none no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 scroll-smooth"
                        >
                            {displayItems.map((item) => (
                                <div key={item.id} className="min-w-[200px] sm:min-w-[240px] max-w-[280px] flex-shrink-0 snap-start">
                                    <NeighborhoodCard
                                        item={item}
                                        config={config}
                                        isSelected={selectedLocation?.id === String(item.id) || selectedLocation?.name === item.name}
                                        onSelect={() => selectLocation({
                                            id: String(item.id),
                                            name: item.name,
                                            latitude: item.centerLatitude || 6.3654,
                                            longitude: item.centerLongitude || 2.4183,
                                            type: item.type || 'NEIGHBORHOOD',
                                            commune: item.commune,
                                            neighborhood: item.name,
                                            geoZoneId: String(item.id)
                                        })}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className={`grid gap-4 ${gridColsClass}`}>
                        {displayItems.map((item) => (
                            <NeighborhoodCard
                                key={item.id}
                                item={item}
                                config={config}
                                isSelected={selectedLocation?.id === String(item.id) || selectedLocation?.name === item.name}
                                onSelect={() => selectLocation({
                                    id: String(item.id),
                                    name: item.name,
                                    latitude: item.centerLatitude || 6.3654,
                                    longitude: item.centerLongitude || 2.4183,
                                    type: item.type || 'NEIGHBORHOOD',
                                    geoZoneId: String(item.id)
                                })}
                            />
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}

function NeighborhoodCard({
    item,
    config,
    isSelected,
    onSelect,
}: {
    item: any;
    config: any;
    isSelected: boolean;
    onSelect: () => void;
}) {
    const isCity = item.type === 'COMMUNE';

    return (
        <Card
            onClick={onSelect}
            className={`group cursor-pointer overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 rounded-xl border backdrop-blur-sm ${
                isSelected
                    ? 'ring-2 ring-blue-600 shadow-md border-blue-500 bg-blue-50/70 dark:bg-blue-950/40'
                    : 'border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/90'
            }`}
            style={{
                backgroundColor: isSelected ? undefined : config.cardBgColor,
                borderColor: isSelected ? '#2563eb' : config.cardBorderColor,
            }}
        >
            <CardContent className="p-4 flex items-center gap-3.5">
                <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105 shadow-sm ${
                        isSelected
                            ? 'bg-blue-600 text-white'
                            : isCity
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                    }`}
                >
                    {isCity ? <Building2 className="w-5 h-5" /> : <MapPin className="w-5 h-5" />}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                        <h4
                            className="font-bold text-sm truncate group-hover:text-blue-600 transition-colors"
                            style={{ color: config.cardTextColor }}
                        >
                            {item.name}
                        </h4>
                        {isSelected && (
                            <span className="inline-block w-2 h-2 rounded-full bg-blue-600 shrink-0" title="Zone active" />
                        )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 capitalize truncate mt-0.5">
                        {isCity ? 'Commune / Ville' : 'Quartier / Arrondissement'}
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}
