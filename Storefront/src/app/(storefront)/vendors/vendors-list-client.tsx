"use client";

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { encodeId } from '@/lib/hash-utils';
import { Search, MapPin, Star, Store, ArrowRight, CheckCircle2, Navigation, SlidersHorizontal, Compass, Sparkles } from 'lucide-react';
import { useLocation } from '@/contexts/location-context';

interface MarketRef {
    id: string;
    name: string;
    slug?: string;
    centerLatitude?: number | null;
    centerLongitude?: number | null;
}

interface LocationRef {
    id: string;
    name: string;
    centerLatitude?: number | null;
    centerLongitude?: number | null;
}

interface Vendor {
    id: string;
    name: string;
    description?: string;
    zone?: string;
    address?: string;
    rating?: number;
    ratingCount?: number;
    latitude?: number | null;
    longitude?: number | null;
    verificationStatus?: boolean;
    logo?: { preview: string } | null;
    coverImage?: { preview: string } | null;
    location?: LocationRef | null;
    physicalMarket?: MarketRef | null;
    markets?: Array<{ id: string; name: string }>;
}

interface VendorsListClientProps {
    initialVendors: Vendor[];
}

// Haversine formula to compute distance in km
function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

const KNOWN_BENIN_COORDS: Record<string, { lat: number; lon: number }> = {
    'dantokpa': { lat: 6.367, lon: 2.44 },
    'missebo': { lat: 6.363, lon: 2.435 },
    'ganhi': { lat: 6.357, lon: 2.43 },
    'cadjehoun': { lat: 6.362, lon: 2.40 },
    'gbegamey': { lat: 6.365, lon: 2.408 },
    'menontin': { lat: 6.371, lon: 2.385 },
    'aidjedo': { lat: 6.377, lon: 2.418 },
    'wologuede': { lat: 6.372, lon: 2.413 },
    'zongo': { lat: 6.366, lon: 2.422 },
    'hlakome': { lat: 6.3754, lon: 2.4468 },
    'gankpodo': { lat: 6.3873, lon: 2.4572 },
    'cotonou': { lat: 6.3654, lon: 2.4183 },
    'ouando': { lat: 6.505, lon: 2.618 },
    'porto-novo': { lat: 6.4969, lon: 2.6289 },
    'godomey': { lat: 6.415, lon: 2.355 },
    'zogbadje': { lat: 6.422, lon: 2.342 },
    'calavi': { lat: 6.4486, lon: 2.3556 },
    'abomey-calavi': { lat: 6.4486, lon: 2.3556 },
    'pk3': { lat: 6.388, lon: 2.47 },
    'seme-kpodji': { lat: 6.388, lon: 2.47 },
    'parakou': { lat: 9.3371, lon: 2.6303 },
    'bohicon': { lat: 7.1783, lon: 2.0667 },
    'ouidah': { lat: 6.3631, lon: 2.0851 },
};

export function VendorsListClient({ initialVendors }: VendorsListClientProps) {
    const { selectedLocation } = useLocation();

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedMarket, setSelectedMarket] = useState('all');
    const [selectedCommune, setSelectedCommune] = useState('all');
    const [sortBy, setSortBy] = useState<'distance' | 'rating' | 'reviews' | 'name'>('distance');

    // User coordinates from general header if available
    const userLat = selectedLocation?.latitude ? Number(selectedLocation.latitude) : (selectedLocation as any)?.centerLatitude ? Number((selectedLocation as any).centerLatitude) : null;
    const userLon = selectedLocation?.longitude ? Number(selectedLocation.longitude) : (selectedLocation as any)?.centerLongitude ? Number((selectedLocation as any).centerLongitude) : null;
    const effectiveUserLat = (userLat && !isNaN(userLat)) ? userLat : 6.3654;
    const effectiveUserLon = (userLon && !isNaN(userLon)) ? userLon : 2.4183;
    const hasUserCoordinates = true;

    // Extract all distinct physical markets
    const availableMarkets = useMemo(() => {
        const set = new Set<string>();
        initialVendors.forEach(v => {
            if (v.physicalMarket?.name) set.add(v.physicalMarket.name);
        });
        return Array.from(set).sort();
    }, [initialVendors]);

    // Extract all distinct communes / zones
    const availableCommunes = useMemo(() => {
        const set = new Set<string>();
        initialVendors.forEach(v => {
            const comm = v.location?.name || v.zone;
            if (comm) set.add(comm);
        });
        return Array.from(set).sort();
    }, [initialVendors]);

    // Enrich vendors with distance to user if coordinates available
    const vendorsWithDistance = useMemo(() => {
        return initialVendors.map(vendor => {
            let distanceKm: number | null = null;

            // Direct coordinates
            const vLat = vendor.latitude ? Number(vendor.latitude) : null;
            const vLon = vendor.longitude ? Number(vendor.longitude) : null;

            let lat = (vLat && !isNaN(vLat)) ? vLat : null;
            let lon = (vLon && !isNaN(vLon)) ? vLon : null;

            if (!lat || !lon) {
                if (vendor.physicalMarket?.centerLatitude && vendor.physicalMarket?.centerLongitude) {
                    lat = Number(vendor.physicalMarket.centerLatitude);
                    lon = Number(vendor.physicalMarket.centerLongitude);
                } else if (vendor.location?.centerLatitude && vendor.location?.centerLongitude) {
                    lat = Number(vendor.location.centerLatitude);
                    lon = Number(vendor.location.centerLongitude);
                } else {
                    const text = `${vendor.zone || ''} ${vendor.address || ''} ${vendor.name || ''}`.toLowerCase();
                    for (const [key, coords] of Object.entries(KNOWN_BENIN_COORDS)) {
                        if (text.includes(key)) {
                            lat = coords.lat;
                            lon = coords.lon;
                            break;
                        }
                    }
                }
            }

            if (lat && lon) {
                const dist = calculateDistanceKm(effectiveUserLat, effectiveUserLon, lat, lon);
                distanceKm = Math.round(dist * 10) / 10;
            }

            return {
                ...vendor,
                distanceKm,
            };
        });
    }, [initialVendors, effectiveUserLat, effectiveUserLon]);

    // Filter & Sort vendors
    const processedVendors = useMemo(() => {
        let result = vendorsWithDistance.filter(vendor => {
            // Search match
            if (searchTerm.trim()) {
                const term = searchTerm.toLowerCase();
                const nameMatch = vendor.name.toLowerCase().includes(term);
                const descMatch = (vendor.description || '').toLowerCase().includes(term);
                const marketMatch = (vendor.physicalMarket?.name || '').toLowerCase().includes(term);
                const zoneMatch = (vendor.location?.name || vendor.zone || vendor.address || '').toLowerCase().includes(term);
                if (!nameMatch && !descMatch && !marketMatch && !zoneMatch) return false;
            }

            // Market filter
            if (selectedMarket !== 'all') {
                if (vendor.physicalMarket?.name !== selectedMarket) return false;
            }

            // Commune filter
            if (selectedCommune !== 'all') {
                const vendorLoc = vendor.location?.name || vendor.zone;
                if (vendorLoc !== selectedCommune) return false;
            }

            return true;
        });

        // Sorting
        result.sort((a, b) => {
            if (sortBy === 'distance') {
                if (a.distanceKm != null && b.distanceKm != null) {
                    return a.distanceKm - b.distanceKm;
                }
                if (a.distanceKm != null) return -1;
                if (b.distanceKm != null) return 1;
                const rA = a.rating || 0;
                const rB = b.rating || 0;
                if (rB !== rA) return rB - rA;
                return (a.name || '').localeCompare(b.name || '');
            }

            if (sortBy === 'rating') {
                const rA = a.rating || 0;
                const rB = b.rating || 0;
                if (rB !== rA) return rB - rA;
                return (b.ratingCount || 0) - (a.ratingCount || 0);
            }

            if (sortBy === 'reviews') {
                return (b.ratingCount || 0) - (a.ratingCount || 0);
            }

            if (sortBy === 'name') {
                return a.name.localeCompare(b.name);
            }

            return 0;
        });

        return result;
    }, [vendorsWithDistance, searchTerm, selectedMarket, selectedCommune, sortBy]);

    return (
        <div className="space-y-6 sm:space-y-8">
            {/* Header Proximity Awareness Banner */}
            {selectedLocation?.name && (
                <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                            <Compass className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                            <p className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                                Position active : <span className="text-primary">{selectedLocation.name}</span>
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                Les boutiques les plus proches de votre position sont affichées en premier
                            </p>
                        </div>
                    </div>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold border border-emerald-200/80 dark:border-emerald-800/80 shrink-0 self-start sm:self-auto">
                        <Navigation className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>Trié par proximité</span>
                    </div>
                </div>
            )}

            {/* Filter and Control Bar */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-xs space-y-4">
                {/* Search input + quick stats */}
                <div className="flex flex-col md:flex-row gap-3">
                    <div className="relative flex-1">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 text-slate-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Rechercher une boutique, marché (Dantokpa, Missèbo...), artisan..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="block w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl leading-5 bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary text-xs sm:text-sm transition-all"
                        />
                    </div>

                    {/* Quick Filters */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        {/* Market Select */}
                        <div className="relative">
                            <select
                                value={selectedMarket}
                                onChange={(e) => setSelectedMarket(e.target.value)}
                                className="block w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-xs font-bold focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                            >
                                <option value="all">Tous les Marchés</option>
                                {availableMarkets.map(m => (
                                    <option key={m} value={m}>{m}</option>
                                ))}
                            </select>
                        </div>

                        {/* Commune Select */}
                        <div className="relative">
                            <select
                                value={selectedCommune}
                                onChange={(e) => setSelectedCommune(e.target.value)}
                                className="block w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-xs font-bold focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                            >
                                <option value="all">Toutes les Communes</option>
                                {availableCommunes.map(c => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>

                        {/* Sort Select */}
                        <div className="relative">
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value as any)}
                                className="block w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-xs font-bold focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                            >
                                <option value="distance">Plus proches 📍</option>
                                <option value="rating">Mieux notées ⭐</option>
                                <option value="reviews">Nombre d&apos;avis</option>
                                <option value="name">Nom (A-Z)</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Filter summary and reset if filtered */}
                <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                        {processedVendors.length} boutique{processedVendors.length > 1 ? 's' : ''} disponible{processedVendors.length > 1 ? 's' : ''}
                    </span>
                    {(searchTerm || selectedMarket !== 'all' || selectedCommune !== 'all' || sortBy !== 'distance') && (
                        <button
                            onClick={() => {
                                setSearchTerm('');
                                setSelectedMarket('all');
                                setSelectedCommune('all');
                                setSortBy('distance');
                            }}
                            className="text-primary hover:underline font-bold text-xs"
                        >
                            Réinitialiser les filtres
                        </button>
                    )}
                </div>
            </div>

            {/* Compact Responsive Vendor Cards Grid */}
            {processedVendors.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
                    {processedVendors.map((vendor) => {
                        const logoUrl = vendor.logo?.preview || null;
                        const coverUrl = vendor.coverImage?.preview || null;
                        const hasRating = typeof vendor.rating === 'number' && vendor.rating > 0;
                        const isCertified = vendor.verificationStatus !== false;

                        return (
                            <Link
                                key={vendor.id}
                                href={`/vendor/${encodeId(vendor.id)}`}
                                className="group bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden hover:shadow-lg hover:border-primary/40 hover:-translate-y-1 transition-all duration-300 flex flex-col h-full no-underline"
                            >
                                {/* Compact Cover Image */}
                                <div className="h-24 sm:h-28 w-full bg-slate-950 relative overflow-hidden shrink-0">
                                    {coverUrl ? (
                                        <img
                                            src={coverUrl}
                                            alt={`${vendor.name} Cover`}
                                            className="w-full h-full object-cover opacity-85 group-hover:scale-105 transition-transform duration-500"
                                            loading="lazy"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-gradient-to-br from-[#07152b] via-[#0c234b] to-slate-900 flex items-center justify-center opacity-80">
                                            <Store className="h-6 w-6 text-slate-500" />
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

                                    {/* Distance pill on cover if available */}
                                    {vendor.distanceKm != null && (
                                        <div className="absolute top-2 right-2 z-10">
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-white text-[10.5px] font-black border border-white/20">
                                                <Navigation className="h-2.5 w-2.5 text-primary" />
                                                <span>{vendor.distanceKm < 1 ? `${Math.round(vendor.distanceKm * 1000)} m` : `${vendor.distanceKm.toFixed(1)} km`}</span>
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Compact Content Body */}
                                <div className="p-3.5 sm:p-4 pt-0 relative flex-1 flex flex-col">
                                    {/* Logo circular / rounded-xl */}
                                    <div className="h-12 w-12 sm:h-13 sm:w-13 rounded-xl border-2 border-white dark:border-slate-800 bg-white shadow-md flex items-center justify-center overflow-hidden -mt-6 sm:-mt-6.5 mb-2.5 relative z-10 shrink-0">
                                        {logoUrl ? (
                                            <img
                                                src={logoUrl}
                                                alt={`${vendor.name} Logo`}
                                                className="h-full w-full object-cover"
                                                loading="lazy"
                                            />
                                        ) : (
                                            <Store className="h-5 w-5 text-slate-400" />
                                        )}
                                    </div>

                                    {/* Name and Certification */}
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white line-clamp-1 group-hover:text-primary transition-colors">
                                            {vendor.name}
                                        </h3>
                                        {isCertified && (
                                            <span title="Boutique Vérifiée Ahizan" className="shrink-0">
                                                <CheckCircle2 className="h-4 w-4 text-emerald-500 fill-emerald-500/10" />
                                            </span>
                                        )}
                                    </div>

                                    {/* Market / Location / Rating Badges */}
                                    <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-2.5 flex-wrap">
                                        {vendor.physicalMarket?.name && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 font-bold border border-amber-200/80 dark:border-amber-800/60 text-[10.5px]">
                                                <Store className="h-3 w-3 shrink-0" />
                                                <span className="truncate max-w-[140px]">{vendor.physicalMarket.name}</span>
                                            </span>
                                        )}
                                        {(vendor.location?.name || vendor.zone) && (
                                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                                                <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                                                <span className="truncate max-w-[120px]">{vendor.location?.name || vendor.zone}</span>
                                            </span>
                                        )}
                                        {hasRating && (
                                            <span className="inline-flex items-center gap-1 text-amber-500 font-bold text-[11px] ml-auto">
                                                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                                                <span>{vendor.rating?.toFixed(1)}</span>
                                                <span className="text-slate-400 font-normal">({vendor.ratingCount || 0})</span>
                                            </span>
                                        )}
                                    </div>

                                    {/* Compact Description */}
                                    {vendor.description && (
                                        <p className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed line-clamp-2 mb-3">
                                            {vendor.description}
                                        </p>
                                    )}

                                    {/* Footer Link */}
                                    <div className="mt-auto pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-primary group-hover:text-red-700 transition-colors">
                                        <span>Visiter la boutique</span>
                                        <ArrowRight className="h-3.5 w-3.5 transform group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            ) : (
                <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-8 shadow-xs">
                    <Store className="h-10 w-10 text-slate-400 mx-auto mb-3" />
                    <h3 className="font-bold text-base text-slate-900 dark:text-white mb-1">Aucune boutique trouvée</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-xs max-w-sm mx-auto mb-4">
                        Aucun résultat ne correspond à votre filtre actuel. Essayez d&apos;élargir vos critères de recherche.
                    </p>
                    <button
                        onClick={() => {
                            setSearchTerm('');
                            setSelectedMarket('all');
                            setSelectedCommune('all');
                        }}
                        className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-red-700 transition-colors shadow-xs"
                    >
                        Afficher toutes les boutiques
                    </button>
                </div>
            )}
        </div>
    );
}
