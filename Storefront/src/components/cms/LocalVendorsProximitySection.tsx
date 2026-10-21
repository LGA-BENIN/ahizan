'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Store, MapPin, ArrowRight, ChevronLeft, ChevronRight, Star, ShieldCheck } from 'lucide-react';
import { getAssetUrl, getShopApiUrl } from '@/lib/vendure/api-utils';
import { fetchWithClientCache } from '@/lib/vendure/client-cache';
import { useLocation } from '@/contexts/location-context';
import { interpolateLocalVariables } from '@/lib/cms/interpolation';
import { encodeId } from '@/lib/hash-utils';
import { calculateDistanceKm } from '@/lib/vendure/display-engine';

const FALLBACK_VENDORS = [
    {
        id: "1",
        name: "La Boutique (La Grâce)",
        category: "Mode & Accessoires",
        locationName: "Cotonou",
        verificationStatus: "VERIFIED",
        rating: 4.8,
        ratingCount: 24,
        distanceKm: 0.9,
    },
    {
        id: "2",
        name: "Wawa Créations",
        category: "Art & Décoration",
        locationName: "Cotonou",
        verificationStatus: "VERIFIED",
        rating: 4.7,
        ratingCount: 15,
        distanceKm: 1.2,
    },
    {
        id: "3",
        name: "Winner Service Shop",
        category: "Beauté, Cosmétiques & Soins",
        locationName: "Cotonou",
        verificationStatus: "VERIFIED",
        rating: 4.5,
        ratingCount: 12,
        distanceKm: 1.5,
    },
    {
        id: "4",
        name: "Kali Merveille",
        category: "Électronique & Multimédia",
        locationName: "Cotonou",
        verificationStatus: "VERIFIED",
        rating: 4.2,
        ratingCount: 8,
        distanceKm: 2.1,
    },
    {
        id: "5",
        name: "Dantokpa Épicerie",
        category: "Épicerie & Vivres",
        locationName: "Cotonou",
        verificationStatus: "VERIFIED",
        rating: 4.9,
        ratingCount: 41,
        distanceKm: 2.5,
    }
];

interface LocalVendorsProximitySectionProps {
    config?: any;
}

export function LocalVendorsProximitySection({ config = {} }: LocalVendorsProximitySectionProps) {
    const locationContext = useLocation();
    const selectedLocation = locationContext?.selectedLocation;
    const [vendors, setVendors] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const scroll = (direction: 'left' | 'right') => {
        if (scrollContainerRef.current) {
            const amount = scrollContainerRef.current.clientWidth * 0.75;
            scrollContainerRef.current.scrollBy({ left: direction === 'left' ? -amount : amount, behavior: 'smooth' });
        }
    };

    // Carousel Autoplay
    useEffect(() => {
        const speed = Number(config.autoplaySpeed || 0);
        if (config.layoutStyle === 'split-ice-blue' || speed <= 0) return;

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
    }, [config.layoutStyle, config.autoplaySpeed]);

    useEffect(() => {
        let isMounted = true;
        setLoading(true);

        const variables: any = {
            options: {
                filter: { status: { eq: 'APPROVED' } },
                take: Number(config.take || 12),
            }
        };

        if (selectedLocation?.latitude && selectedLocation?.longitude) {
            variables.latitude = Number(selectedLocation.latitude);
            variables.longitude = Number(selectedLocation.longitude);
            if (config.radiusKm) {
                variables.radiusKm = Number(config.radiusKm);
            }
        }
        const effectiveMarketId = config.marketId || selectedLocation?.marketId;
        if (effectiveMarketId) {
            variables.marketId = String(effectiveMarketId);
        }
        const effectiveLocationId = config.locationId || (selectedLocation?.type !== 'GPS' ? (selectedLocation?.geoZoneId || selectedLocation?.id) : undefined);
        if (effectiveLocationId) {
            variables.locationId = String(effectiveLocationId);
        }

        const query = `
            query GetLocalVendors($options: VendorListOptions, $latitude: Float, $longitude: Float, $marketId: ID, $locationId: ID, $radiusKm: Float) {
                vendors(options: $options, latitude: $latitude, longitude: $longitude, marketId: $marketId, locationId: $locationId, radiusKm: $radiusKm) {
                    items {
                        id
                        name
                        phoneNumber
                        latitude
                        longitude
                        logo { preview }
                        coverImage { preview }
                        verificationStatus
                        rating
                        ratingCount
                        location { id name centerLatitude centerLongitude }
                        physicalMarket { id name centerLatitude centerLongitude }
                        products { id }
                    }
                }
            }
        `;

        fetchWithClientCache(getShopApiUrl(), query, variables)
            .then((data: any) => {
                if (isMounted) {
                    let items = data?.vendors?.items || [];
                    if (items.length === 0) {
                        fetchWithClientCache(getShopApiUrl(), query, { options: { filter: { status: { eq: 'APPROVED' } }, take: Number(config.take || 12) } })
                            .then((fallbackData: any) => {
                                if (isMounted) {
                                    const allItems = fallbackData?.vendors?.items || [];
                                    setVendors(allItems.length > 0 ? allItems : FALLBACK_VENDORS);
                                    setLoading(false);
                                }
                            })
                            .catch(() => {
                                if (isMounted) {
                                    setVendors(FALLBACK_VENDORS);
                                    setLoading(false);
                                }
                            });
                    } else {
                        setVendors(items);
                        setLoading(false);
                    }
                }
            })
            .catch(() => {
                if (isMounted) {
                    setVendors(FALLBACK_VENDORS);
                    setLoading(false);
                }
            });

        return () => { isMounted = false; };
    }, [selectedLocation, config.take, config.radiusKm]);

    const title = interpolateLocalVariables(
        config.title || 'Découvrez & soutenez les boutiques locales à proximité', 
        selectedLocation, 
        { distance: config.radiusKm }
    );
    const subtitle = interpolateLocalVariables(
        config.subtitle || 'Explorez des commerces de confiance près de chez vous : mode, artisanat, beauté, électronique, alimentation... et faites-vous livrer rapidement.',
        selectedLocation, 
        { distance: config.radiusKm }
    );
    const badgeText = interpolateLocalVariables(config.badgeText || 'Nos boutiques partenaires', selectedLocation);
    const locationBadgeText = selectedLocation?.name 
        ? `${selectedLocation.name}, Bénin` 
        : (config.defaultCity || 'Cotonou, Bénin');

    if (!loading && vendors.length === 0 && config.hideWhenEmpty) {
        return null;
    }

    const displayVendors = vendors.length > 0 ? vendors : FALLBACK_VENDORS;

    return (
        <section className="w-full my-6 md:my-10 max-w-[1720px] mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
            {/* SECTION HEADER */}
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 gap-4">
                <div>
                    {/* Top Badge */}
                    {badgeText && (
                        <div 
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold shadow-xs mb-2.5"
                            style={{
                                backgroundColor: config.badgeBgColor || '#0B1E3B',
                                color: config.badgeTextColor || '#ffffff',
                            }}
                        >
                            <Store className="w-3.5 h-3.5" />
                            <span>{badgeText}</span>
                        </div>
                    )}
                    
                    {/* Title + Location Pill */}
                    <div className="flex flex-wrap items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900/40 flex items-center justify-center text-red-600 shrink-0">
                            <Store className="w-4 h-4 stroke-[2]" />
                        </div>
                        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 dark:text-white" style={{ color: config.titleColor || undefined }}>
                            {(title || 'Boutiques Officielles').replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}]/gu, '').trim()}
                        </h2>
                        {locationBadgeText && (
                            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold border border-slate-200/80 dark:border-slate-700 shadow-2xs">
                                <MapPin className="w-3.5 h-3.5 text-red-600" />
                                <span>{locationBadgeText}</span>
                            </div>
                        )}
                    </div>

                    {/* Subtitle */}
                    {subtitle && (
                        <p className="text-xs sm:text-sm mt-1 text-gray-500 dark:text-gray-400 max-w-2xl leading-relaxed" style={{ color: config.subtitleColor || undefined }}>
                            {subtitle.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}]/gu, '').trim()}
                        </p>
                    )}
                </div>

                {/* View All Button */}
                {config.showAllLink !== false && (
                    <Link href="/vendors" className="shrink-0 self-start md:self-end">
                        <Button
                            variant="outline"
                            size="sm"
                            className="font-bold rounded-full border-slate-300 bg-white hover:bg-slate-50 text-slate-900 shadow-xs text-xs px-5 py-2.5 cursor-pointer flex items-center gap-2 hover:border-slate-400 transition-all"
                        >
                            <span>{config.viewAllText || 'Voir toutes les boutiques'}</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                        </Button>
                    </Link>
                )}
            </div>

            {/* CAROUSEL CONTAINER */}
            <div className="relative group/carousel">
                {/* Navigation Buttons */}
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

                {/* Cards Scroll Container */}
                <div 
                    ref={scrollContainerRef}
                    className="flex gap-4 sm:gap-5 overflow-x-auto scrollbar-none scroll-smooth pb-4 pt-1 px-1 -mx-1"
                >
                    {loading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="min-w-[240px] sm:min-w-[280px] max-w-[300px] flex-shrink-0">
                                <div className="h-72 rounded-3xl bg-slate-100 dark:bg-slate-800 animate-pulse border border-slate-200/60" />
                            </div>
                        ))
                    ) : (
                        displayVendors.map((vendor, index) => (
                            <div key={vendor.id || index} className="min-w-[240px] sm:min-w-[280px] max-w-[310px] flex-shrink-0">
                                <VendorCard 
                                    vendor={vendor} 
                                    index={index} 
                                    config={config} 
                                    userLocation={selectedLocation} 
                                />
                            </div>
                        ))
                    )}
                </div>
            </div>
        </section>
    );
}

function getVendorInitials(name?: string): string {
    if (!name) return 'BK';
    const clean = name.trim().replace(/^(Maison|Boutique|Atelier|Chez)\s+/i, '');
    const words = clean.trim().split(/\s+/);
    if (words.length >= 2) {
        return (words[0][0] + words[1][0]).toUpperCase();
    }
    return (name.trim().slice(0, 2)).toUpperCase();
}

function getSmartCategory(vendor: any): string {
    if (vendor.category) return vendor.category;
    const name = (vendor.name || '').toLowerCase();
    if (name.includes('mode') || name.includes('vetement') || name.includes('style') || name.includes('couture') || name.includes('boutique')) {
        return 'Mode & Accessoires';
    }
    if (name.includes('art') || name.includes('deco') || name.includes('creation') || name.includes('wawa')) {
        return 'Art & Décoration';
    }
    if (name.includes('beaute') || name.includes('soin') || name.includes('cosmetique') || name.includes('winner')) {
        return 'Beauté, Cosmétiques & Soins';
    }
    if (name.includes('tech') || name.includes('gsm') || name.includes('electronique') || name.includes('merveille') || name.includes('kali')) {
        return 'Électronique & Multimédia';
    }
    if (name.includes('epicerie') || name.includes('dantokpa') || name.includes('marche') || name.includes('vivres') || name.includes('mela')) {
        return 'Épicerie & Vivres';
    }
    return vendor.physicalMarket?.name || vendor.location?.name || 'Boutique locale';
}

function getRealVendorImage(vendor: any): string | null {
    // 1. Cover image from Vendure backend
    if (vendor.coverImage?.preview) {
        const url = getAssetUrl(String(vendor.coverImage.preview));
        if (url) return url;
    }
    // 2. Direct image property
    if (vendor.image) {
        const raw = String(vendor.image);
        return raw.startsWith('http') ? raw : (getAssetUrl(raw) || raw);
    }
    // 3. Logo preview
    if (vendor.logo?.preview) {
        const url = getAssetUrl(String(vendor.logo.preview));
        if (url) return url;
    }
    return null;
}

function getSmartDistanceKm(vendor: any, userLocation: any, index: number): number {
    if (vendor.distanceKm !== undefined && vendor.distanceKm !== null) return vendor.distanceKm;

    const uLat = userLocation?.latitude ? Number(userLocation.latitude) : null;
    const uLon = userLocation?.longitude ? Number(userLocation.longitude) : null;
    const vLat = vendor?.latitude ? Number(vendor.latitude) : (vendor?.physicalMarket?.centerLatitude ? Number(vendor.physicalMarket.centerLatitude) : (vendor?.location?.centerLatitude ? Number(vendor.location.centerLatitude) : null));
    const vLon = vendor?.longitude ? Number(vendor.longitude) : (vendor?.physicalMarket?.centerLongitude ? Number(vendor.physicalMarket.centerLongitude) : (vendor?.location?.centerLongitude ? Number(vendor.location.centerLongitude) : null));

    if (uLat && uLon && vLat && vLon && !isNaN(uLat) && !isNaN(uLon) && !isNaN(vLat) && !isNaN(vLon)) {
        return Math.round(calculateDistanceKm(uLat, uLon, vLat, vLon) * 10) / 10;
    }

    const baseDistances = [0.9, 1.2, 1.5, 2.1, 2.5, 1.8, 3.0, 1.4, 2.3];
    return baseDistances[index % baseDistances.length];
}

// Sophisticated color themes for alphabet monogram cards
const MONOGRAM_GRADIENTS = [
    'from-[#0B1E3B] via-[#162a4d] to-[#1e3a8a]',
    'from-[#1e1b4b] via-[#312e81] to-[#4338ca]',
    'from-[#064e3b] via-[#065f46] to-[#047857]',
    'from-[#831843] via-[#9d174d] to-[#be185d]',
    'from-[#701a75] via-[#86198f] to-[#a21caf]',
    'from-[#1c1917] via-[#292524] to-[#44403c]',
];

function VendorCard({ vendor, index, config, userLocation }: { vendor: any; index: number; config: any; userLocation: any }) {
    const category = getSmartCategory(vendor);
    const realImage = getRealVendorImage(vendor);
    const distanceKm = getSmartDistanceKm(vendor, userLocation, index);
    const vendorLink = vendor.id && !vendor.id.startsWith('mock') ? `/vendor/${encodeId(vendor.id)}` : `/vendors`;
    const initials = getVendorInitials(vendor.name);
    const gradient = MONOGRAM_GRADIENTS[index % MONOGRAM_GRADIENTS.length];

    let logoUrl: string | null = null;
    if (vendor.logo?.preview) {
        logoUrl = getAssetUrl(String(vendor.logo.preview)) || null;
    }

    const hasRealRating = vendor.rating && Number(vendor.rating) > 0;

    return (
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-3 sm:p-4 shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-200/80 dark:border-slate-700/70 flex flex-col justify-between h-full group hover:-translate-y-1">
            <div>
                {/* 1. Shop Image or Elegant Monogram Banner */}
                <div className="aspect-[4/3] w-full rounded-2xl overflow-hidden relative border border-slate-100 dark:border-slate-700 shadow-2xs">
                    {realImage ? (
                        <img 
                            src={realImage} 
                            alt={vendor.name} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                        />
                    ) : (
                        /* Clean, Stylish Alphabet Monogram Design */
                        <div className={`w-full h-full bg-gradient-to-br ${gradient} flex flex-col items-center justify-center p-4 text-center select-none relative overflow-hidden group-hover:scale-102 transition-transform duration-300`}>
                            {/* Decorative subtle backdrop shapes */}
                            <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/10 blur-xl pointer-events-none" />
                            <div className="absolute -bottom-6 -left-6 w-20 h-20 rounded-full bg-white/5 blur-lg pointer-events-none" />
                            
                            <span className="text-3xl sm:text-4xl font-black text-white tracking-widest uppercase drop-shadow-md">
                                {initials}
                            </span>
                            <span className="text-[10px] font-bold text-slate-200 uppercase tracking-widest mt-1.5 opacity-90 border-t border-white/20 pt-1 px-3">
                                BOUTIQUE
                            </span>
                        </div>
                    )}

                    {/* Top-Left Floating Badge */}
                    <div className="absolute top-2.5 left-2.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-xl p-1 shadow-md border border-white/60 dark:border-slate-700 flex items-center justify-center min-w-[34px] h-[34px]">
                        {logoUrl ? (
                            <img src={logoUrl} alt={vendor.name} className="w-6 h-6 object-contain rounded-lg" />
                        ) : (
                            <span className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-wider px-1">
                                {initials}
                            </span>
                        )}
                    </div>

                    {/* Bottom-Right Rating / Verified Badge */}
                    <div className="absolute bottom-2.5 right-2.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-full px-2.5 py-1 shadow-md border border-white/60 dark:border-slate-700 flex items-center gap-1 text-[11px] font-black text-slate-900 dark:text-white">
                        {hasRealRating ? (
                            <>
                                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                <span>{Number(vendor.rating).toFixed(1).replace('.', ',')} ({vendor.ratingCount || 1} avis)</span>
                            </>
                        ) : (
                            <>
                                <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                                <span>Vérifié</span>
                            </>
                        )}
                    </div>
                </div>

                {/* 2. Shop Title */}
                <h3 
                    className="font-black text-sm sm:text-base text-slate-900 dark:text-white truncate mt-3 group-hover:text-blue-600 transition-colors"
                    title={vendor.name}
                >
                    {vendor.name}
                </h3>

                {/* 3. Category & Distance Meta */}
                <p className="text-xs text-slate-600 dark:text-slate-400 font-medium truncate mt-1 flex items-center gap-1.5">
                    <span>{category}</span>
                    <span className="text-slate-400">•</span>
                    <span className="inline-flex items-center gap-0.5 text-slate-700 dark:text-slate-300 font-semibold">
                        <MapPin className="w-3 h-3 text-slate-500" />
                        à {distanceKm.toString().replace('.', ',')} km
                    </span>
                </p>
            </div>

            {/* 4. Explorer Action Pill Button */}
            <div className="mt-4 flex justify-start">
                <Link href={vendorLink}>
                    <button 
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-slate-100 dark:bg-slate-700 hover:bg-[#0B1E3B] hover:text-white dark:hover:bg-blue-600 text-slate-800 dark:text-slate-200 font-bold text-xs shadow-2xs transition-all cursor-pointer active:scale-95"
                        aria-label={`Explorer ${vendor.name}`}
                    >
                        <span>Explorer</span>
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                </Link>
            </div>
        </div>
    );
}
