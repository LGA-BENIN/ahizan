'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Store, ShieldCheck, MapPin, Heart, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { getAssetUrl, getShopApiUrl } from '@/lib/vendure/api-utils';
import { fetchWithClientCache } from '@/lib/vendure/client-cache';
import { useLocation } from '@/contexts/location-context';
import { interpolateLocalVariables } from '@/lib/cms/interpolation';
import { encodeId } from '@/lib/hash-utils';

const FALLBACK_VENDORS = [
    {
        id: "1",
        name: "Maison Bénin Style",
        category: "Mode & Vêtements",
        locationName: "Cotonou",
        verificationStatus: "VERIFIED",
        rating: 4.9,
    },
    {
        id: "2",
        name: "Artisanat Béninois",
        category: "Art & Décoration",
        locationName: "Porto-Novo",
        verificationStatus: "VERIFIED",
        rating: 4.8,
    },
    {
        id: "3",
        name: "Beauté Naturelle",
        category: "Beauté & Soins",
        locationName: "Abomey-Calavi",
        verificationStatus: "VERIFIED",
        rating: 5.0,
    },
    {
        id: "4",
        name: "Tech Bénin",
        category: "Électronique",
        locationName: "Cotonou",
        verificationStatus: "VERIFIED",
        rating: 4.9,
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
            const amount = scrollContainerRef.current.clientWidth * 0.8;
            scrollContainerRef.current.scrollBy({ left: direction === 'left' ? -amount : amount, behavior: 'smooth' });
        }
    };

    useEffect(() => {
        let isMounted = true;
        setLoading(true);

        const variables: any = {
            options: {
                filter: { status: { eq: 'APPROVED' } },
                take: Number(config.take || 8),
            }
        };

        if (selectedLocation?.latitude && selectedLocation?.longitude) {
            variables.latitude = Number(selectedLocation.latitude);
            variables.longitude = Number(selectedLocation.longitude);
            if (config.radiusKm) {
                variables.radiusKm = Number(config.radiusKm);
            }
        }
        if (selectedLocation?.marketId) {
            variables.marketId = String(selectedLocation.marketId);
        }

        const query = `
            query GetLocalVendors($options: VendorListOptions, $latitude: Float, $longitude: Float, $marketId: ID, $radiusKm: Float) {
                vendors(options: $options, latitude: $latitude, longitude: $longitude, marketId: $marketId, radiusKm: $radiusKm) {
                    items {
                        id
                        name
                        phoneNumber
                        logo { preview }
                        verificationStatus
                        rating
                        ratingCount
                        location { id name }
                        physicalMarket { id name }
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
                        // Fallback to all approved vendors if strictly filtered had 0
                        fetchWithClientCache(getShopApiUrl(), query, { options: { filter: { status: { eq: 'APPROVED' } }, take: Number(config.take || 8) } })
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

    const title = interpolateLocalVariables(config.title || 'Soutenez les boutiques locales du Bénin', selectedLocation, { distance: config.radiusKm });
    const subtitle = interpolateLocalVariables(
        config.subtitle || 'Découvrez des boutiques de confiance, près de chez vous. Mode, artisanat, beauté, maison, électronique et bien plus encore.',
        selectedLocation, 
        { distance: config.radiusKm }
    );
    const badgeText = interpolateLocalVariables(config.badgeText || 'Nos boutiques', selectedLocation);

    if (!loading && vendors.length === 0 && config.hideWhenEmpty) {
        return null;
    }

    const displayVendors = vendors.length > 0 ? vendors : FALLBACK_VENDORS;

    const layoutStyle = config.layoutStyle || 'split-ice-blue';
    const showPillars = config.showPillars !== false;
    const pillar1 = config.pillar1Text || 'Boutiques vérifiées';
    const pillar2 = config.pillar2Text || 'Proches de vous';
    const pillar3 = config.pillar3Text || 'Produits locaux et authentiques';

    // Standard Grid or Carousel Layout (if admin opted for standard full-width layout)
    if (layoutStyle === 'grid' || layoutStyle === 'carousel') {
        const columns = config.columns || 4;
        const gridColsClass = {
            2: 'grid-cols-1 sm:grid-cols-2',
            3: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3',
            4: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
            5: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-5',
        }[columns as 2 | 3 | 4 | 5] || 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4';

        return (
            <section className="w-full my-6 md:my-10 px-4 container mx-auto">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 gap-3">
                    <div>
                        {badgeText && (
                            <div 
                                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold shadow-xs mb-2"
                                style={{
                                    backgroundColor: config.badgeBgColor || '#0B1E3B',
                                    color: config.badgeTextColor || '#ffffff',
                                }}
                            >
                                <Store className="w-3.5 h-3.5" />
                                <span>{badgeText}</span>
                            </div>
                        )}
                        <h2 className="text-2xl md:text-3xl font-black tracking-tight" style={{ color: config.titleColor || '#0B1E3B' }}>
                            {title}
                        </h2>
                        {subtitle && (
                            <p className="text-xs sm:text-sm mt-1 text-slate-600 dark:text-slate-400 max-w-2xl" style={{ color: config.subtitleColor || undefined }}>
                                {subtitle}
                            </p>
                        )}
                    </div>
                    {config.showAllLink !== false && (
                        <Link href="/vendors">
                            <Button
                                variant="outline"
                                size="sm"
                                className="font-semibold rounded-full border-slate-300 bg-white hover:bg-slate-50 shadow-xs text-xs px-4 cursor-pointer"
                            >
                                <span>{config.viewAllText || 'Toutes les boutiques'}</span>
                                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                            </Button>
                        </Link>
                    )}
                </div>

                {layoutStyle === 'carousel' ? (
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

                        <div ref={scrollContainerRef} className="flex gap-4 overflow-x-auto scrollbar-none scroll-smooth pb-2 -mx-1 px-1">
                            {displayVendors.map((vendor, index) => (
                                <div key={vendor.id || index} className="min-w-[200px] sm:min-w-[240px] max-w-[280px] flex-shrink-0">
                                    <VendorCard vendor={vendor} index={index} config={config} />
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className={`grid ${gridColsClass} gap-4`}>
                        {displayVendors.map((vendor, index) => (
                            <VendorCard key={vendor.id || index} vendor={vendor} index={index} config={config} />
                        ))}
                    </div>
                )}
            </section>
        );
    }

    // Default: Style Capture (Split Ice-Blue Box)
    return (
        <section className="w-full my-6 md:my-10 px-4 container mx-auto">
            <div 
                className="w-full rounded-3xl p-6 sm:p-8 md:p-10 transition-all relative overflow-hidden bg-[#F0F7FF] dark:bg-slate-900/80 border border-sky-100 dark:border-slate-800 shadow-xs"
                style={{
                    backgroundColor: config.containerBgColor || config.bgColor || undefined,
                }}
            >
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                    
                    {/* Left Column: Heading, Value propositions, Trust badges, and CTA */}
                    <div className="lg:col-span-5 flex flex-col justify-between h-full space-y-6">
                        <div className="space-y-4">
                            {/* Badge */}
                            {badgeText && (
                                <div 
                                    className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold shadow-xs"
                                    style={{
                                        backgroundColor: config.badgeBgColor || '#0B1E3B',
                                        color: config.badgeTextColor || '#ffffff',
                                    }}
                                >
                                    <Store className="w-3.5 h-3.5" />
                                    <span>{badgeText}</span>
                                </div>
                            )}

                            {/* Main Title */}
                            <h2 
                                className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight leading-tight"
                                style={{ color: config.titleColor || '#0B1E3B' }}
                            >
                                {title}
                            </h2>

                            {/* Subtitle / Description */}
                            {subtitle && (
                                <p 
                                    className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-md"
                                    style={{ color: config.subtitleColor || undefined }}
                                >
                                    {subtitle}
                                </p>
                            )}
                        </div>

                        {/* 3 Trust Pillars */}
                        {showPillars && (
                            <div className="flex flex-wrap items-center gap-4 sm:gap-6 pt-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950/60 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                                        <ShieldCheck className="w-4 h-4" />
                                    </div>
                                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                        {pillar1}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950/60 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                                        <MapPin className="w-4 h-4" />
                                    </div>
                                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                        {pillar2}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950/60 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                                        <Heart className="w-4 h-4" />
                                    </div>
                                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                        {pillar3}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* CTA Button */}
                        <div className="pt-2">
                            <Link href="/vendors">
                                <button className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#0B1E3B] hover:bg-[#162a4d] text-white font-bold text-xs sm:text-sm shadow-sm transition-all cursor-pointer">
                                    <span>{config.viewAllText || 'Voir toutes les boutiques'}</span>
                                    <ArrowRight className="w-4 h-4" />
                                </button>
                            </Link>
                        </div>
                    </div>

                    {/* Right Column: Shop Cards */}
                    <div className="lg:col-span-7">
                        {loading ? (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                {Array.from({ length: 4 }).map((_, i) => (
                                    <div key={i} className="h-56 rounded-2xl bg-white/60 dark:bg-slate-800/60 animate-pulse border border-sky-100/50" />
                                ))}
                            </div>
                        ) : (
                            <div className="relative">
                                <div 
                                    ref={scrollContainerRef}
                                    className="grid grid-cols-2 sm:grid-cols-4 gap-4 overflow-x-auto sm:overflow-visible pb-2 sm:pb-0"
                                >
                                    {displayVendors.slice(0, Number(config.take || 8)).map((vendor, index) => (
                                        <VendorCard key={vendor.id || index} vendor={vendor} index={index} config={config} />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

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

function VendorCard({ vendor, index, config }: { vendor: any; index: number; config: any }) {
    const fallback = FALLBACK_VENDORS[index % FALLBACK_VENDORS.length];
    
    // Determine image: vendor logo or custom image
    let imageUrl: string | null = null;
    if (vendor.logo?.preview) {
        const url = getAssetUrl(String(vendor.logo.preview));
        if (url) imageUrl = url;
    } else if (vendor.image) {
        const raw = String(vendor.image);
        if (raw.startsWith('http')) {
            imageUrl = raw;
        } else {
            const url = getAssetUrl(raw);
            if (url) imageUrl = url;
        }
    }

    const subtitle = vendor.category || vendor.physicalMarket?.name || vendor.location?.name || fallback.category;
    const vendorLink = vendor.id && !vendor.id.startsWith('mock') ? `/vendor/${encodeId(vendor.id)}` : `/vendors`;
    const initials = getVendorInitials(vendor.name);

    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-3.5 shadow-xs hover:shadow-md transition-all duration-300 border border-slate-200/70 dark:border-slate-700/60 flex flex-col justify-between group h-full">
            <div>
                {/* Shop Image or 2-letter Avatar */}
                <div className="aspect-square w-full rounded-2xl overflow-hidden mb-3 bg-slate-100 dark:bg-slate-700/80 relative flex items-center justify-center border border-slate-200/60 dark:border-slate-700">
                    {imageUrl ? (
                        <img 
                            src={imageUrl} 
                            alt={vendor.name} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                        />
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#0B1E3B] to-[#1e3a8a] text-white p-2 text-center select-none">
                            <span className="text-2xl sm:text-3xl font-black tracking-widest uppercase">
                                {initials}
                            </span>
                            <span className="text-[10px] font-bold text-sky-200 uppercase tracking-widest mt-1 opacity-85">
                                Boutique
                            </span>
                        </div>
                    )}
                </div>

                {/* Shop Name */}
                <h3 
                    className="font-black text-xs sm:text-sm text-slate-900 dark:text-white truncate group-hover:text-blue-600 transition-colors"
                    title={vendor.name}
                >
                    {vendor.name}
                </h3>

                {/* Category / Subtitle */}
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {subtitle}
                </p>
            </div>

            {/* Action Round Arrow Button */}
            <div className="mt-3 flex justify-start">
                <Link href={vendorLink}>
                    <button 
                        className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 hover:bg-[#0B1E3B] hover:text-white dark:hover:bg-blue-600 flex items-center justify-center text-slate-700 dark:text-slate-200 transition-all cursor-pointer shadow-2xs"
                        aria-label={`Visiter ${vendor.name || 'la boutique'}`}
                    >
                        <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                </Link>
            </div>
        </div>
    );
}

