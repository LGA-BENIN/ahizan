"use client";

import React, { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { 
    MapPin, 
    Search, 
    Sparkles, 
    Clock, 
    ShieldCheck, 
    Truck, 
    ChevronRight, 
    ShoppingBag, 
    X,
    ArrowRight
} from "lucide-react";
import { getAssetUrl, getShopApiUrl } from "@/lib/vendure/api-utils";
import { fetchWithClientCache } from "@/lib/vendure/client-cache";
import { Button } from "@/components/ui/button";

const CURATED_MARKET_HERO_IMAGES: Record<string, string> = {
    "1": "https://images.unsplash.com/photo-1533900298318-6b8da08a523e?q=80&w=1600&auto=format&fit=crop", // Dantokpa
    "2": "https://images.unsplash.com/photo-1488459716781-31db52582fe9?q=80&w=1600&auto=format&fit=crop", // PK3
    "3": "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=1600&auto=format&fit=crop", // Ganhi
    "4": "https://images.unsplash.com/photo-1578916171728-46686eac8d58?q=80&w=1600&auto=format&fit=crop", // Cadjèhoun
    "12": "https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=1600&auto=format&fit=crop", // Missèbo
    "14": "https://images.unsplash.com/photo-1526470608268-f674ce90ebd4?q=80&w=1600&auto=format&fit=crop", // Ouando
    "default": "https://images.unsplash.com/photo-1533900298318-6b8da08a523e?q=80&w=1600&auto=format&fit=crop"
};

interface MarketHeroBannerProps {
    config?: {
        title?: string;
        subtitle?: string;
        description?: string;
        badgeText?: string;
        locationName?: string;
        marketId?: string;
        marketName?: string;
        marketSlug?: string;
        bgImage?: string;
        bgImageUrl?: string;
        image?: string;
        bannerImage?: string;
        showSearch?: boolean;
        showStats?: boolean;
        showLiveBadge?: boolean;
        manualProductsCount?: number;
        overlayOpacity?: number;
        height?: 'compact' | 'medium' | 'large' | 'full';
        [key: string]: any;
    };
}

export function MarketHeroBanner({ config = {} }: MarketHeroBannerProps) {
    const [marketInfo, setMarketInfo] = useState<any>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [liveProductsCount, setLiveProductsCount] = useState<number | null>(config.manualProductsCount || null);
    const [cmsMarketOverrides, setCmsMarketOverrides] = useState<Record<string, { image?: string }>>({});

    // 1. Detect active market context from window or props
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const ahizanMarket = (window as any).ahizan?.market;
            if (ahizanMarket) {
                setMarketInfo(ahizanMarket);
            }
        }
    }, []);

    const effectiveMarket = marketInfo || {};
    const effectiveMarketId = String(config.marketId || effectiveMarket.id || "1");
    const effectiveMarketName = config.marketName || config.title || effectiveMarket.name || "Ce Marché";
    const effectiveMarketSlug = config.marketSlug || effectiveMarket.slug || "";
    const effectiveLocationName = config.locationName || effectiveMarket.geoZone?.name || effectiveMarket.location?.name || "Bénin";
    const effectiveDescription = config.description || config.subtitle || effectiveMarket.description || `Bienvenue au cœur de ${effectiveMarketName}. Commandez directement auprès des commerçants du marché avec livraison express.`;

    // 2. Load CMS Market Overrides from homepage if not already loaded
    useEffect(() => {
        const query = `
            query GetHomeMarketOverrides {
                page(slug: "home") {
                    sections {
                        type
                        dataJson
                    }
                }
            }
        `;
        fetchWithClientCache(getShopApiUrl(), query, {})
            .then((data: any) => {
                const sections = data?.page?.sections || [];
                const marketSection = sections.find((s: any) => (s.type || '').includes('MARKET'));
                if (marketSection?.dataJson) {
                    try {
                        const parsed = typeof marketSection.dataJson === 'string' ? JSON.parse(marketSection.dataJson) : marketSection.dataJson;
                        if (parsed.marketOverrides) {
                            setCmsMarketOverrides(parsed.marketOverrides);
                        }
                    } catch {}
                }
            })
            .catch(() => {});
    }, []);

    // 3. Resolve background image strictly following CMS priority
    const resolvedHeroImageUrl = useMemo(() => {
        // Priority 1: Direct configuration in this section
        if (config.bgImageUrl) return config.bgImageUrl.startsWith('http') ? config.bgImageUrl : (getAssetUrl(config.bgImageUrl) || '');
        if (config.bgImage) return config.bgImage.startsWith('http') ? config.bgImage : (getAssetUrl(config.bgImage) || '');
        if (config.image) return config.image.startsWith('http') ? config.image : (getAssetUrl(config.image) || '');
        if (config.bannerImage) return config.bannerImage.startsWith('http') ? config.bannerImage : (getAssetUrl(config.bannerImage) || '');

        // Priority 2: "Marchés Populaires du Bénin" CMS Overrides by marketId or slug
        const override = cmsMarketOverrides[effectiveMarketId] || (effectiveMarketSlug ? cmsMarketOverrides[effectiveMarketSlug] : undefined);
        if (override?.image) {
            return override.image.startsWith('http') ? override.image : (getAssetUrl(override.image) || '');
        }

        // Priority 3: Market's entity image
        if (effectiveMarket.image) {
            return effectiveMarket.image.startsWith('http') ? effectiveMarket.image : (getAssetUrl(effectiveMarket.image) || '');
        }

        // Priority 4: Curated image map for Benin markets
        return CURATED_MARKET_HERO_IMAGES[effectiveMarketId] || CURATED_MARKET_HERO_IMAGES.default;
    }, [config, cmsMarketOverrides, effectiveMarketId, effectiveMarketSlug, effectiveMarket.image]);

    // 4. Fetch dynamic count of products available in market
    useEffect(() => {
        if (!effectiveMarketId) return;

        const query = `
            query GetMarketSearchTotal($marketId: ID!) {
                vendors(marketId: $marketId, options: { filter: { status: { eq: "APPROVED" } }, take: 100 }) {
                    totalItems
                    items {
                        id
                        products { id }
                    }
                }
            }
        `;

        fetchWithClientCache(getShopApiUrl(), query, { marketId: effectiveMarketId })
            .then((data: any) => {
                const vendorItems = data?.vendors?.items || [];
                const pCount = vendorItems.reduce((acc: number, v: any) => acc + (v.products?.length || 0), 0);
                if (pCount > 0 && !config.manualProductsCount) {
                    setLiveProductsCount(pCount);
                }
            })
            .catch(() => {});
    }, [effectiveMarketId, config.manualProductsCount]);

    return (
        <div className="relative w-full overflow-hidden bg-slate-950 text-white shadow-2xl rounded-3xl mb-8">
            {/* Background Image with Deep Cinematic Gradients */}
            <div className="absolute inset-0 z-0">
                <Image 
                    src={resolvedHeroImageUrl} 
                    alt={effectiveMarketName}
                    fill
                    priority
                    className="object-cover opacity-35 filter scale-105 transition-transform duration-1000 ease-out"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A] via-[#0F172A]/75 to-transparent" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-500/15 via-transparent to-transparent" />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-12 md:pb-16">
                {/* Breadcrumbs */}
                <nav className="flex items-center space-x-2 text-xs md:text-sm text-slate-300/80 mb-6 backdrop-blur-md bg-white/5 py-1.5 px-4 rounded-full w-fit border border-white/10">
                    <Link href="/" className="hover:text-amber-400 transition-colors">Accueil</Link>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    <Link href="/vendors" className="hover:text-amber-400 transition-colors">Marchés du Bénin</Link>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-amber-400 font-semibold">{effectiveMarketName}</span>
                </nav>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                    <div className="lg:col-span-8 space-y-4">
                        {/* Badges */}
                        <div className="flex flex-wrap items-center gap-2.5">
                            {config.showLiveBadge !== false && (
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 backdrop-blur-md shadow-sm">
                                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse mr-2" />
                                    Marché Ouvert en Direct
                                </span>
                            )}
                            {effectiveLocationName && (
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-slate-200 border border-white/15 backdrop-blur-md">
                                    <MapPin className="w-3.5 h-3.5 mr-1 text-amber-400" />
                                    {effectiveLocationName}
                                </span>
                            )}
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 backdrop-blur-md">
                                <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                                {config.badgeText || "Pôle Commercial Certifié Ahizan"}
                            </span>
                        </div>

                        {/* Title */}
                        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
                            {effectiveMarketName}
                        </h1>

                        {/* Description */}
                        <p className="text-base sm:text-lg text-slate-200/90 max-w-3xl leading-relaxed font-normal">
                            {effectiveDescription}
                        </p>
                    </div>

                    {/* Right Quick Stats Card */}
                    {config.showStats !== false && (
                        <div className="lg:col-span-4">
                            <div className="bg-slate-900/80 backdrop-blur-xl border border-white/15 rounded-3xl p-6 shadow-2xl space-y-5">
                                <h3 className="text-sm font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                                    <Sparkles className="w-4 h-4" />
                                    Disponibilité & Logistique
                                </h3>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
                                        <div className="text-2xl sm:text-3xl font-black text-white">
                                            {liveProductsCount || '300+'}
                                        </div>
                                        <div className="text-xs text-slate-300 mt-1 font-medium">Articles en Rayon</div>
                                    </div>
                                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
                                        <div className="text-2xl sm:text-3xl font-black text-amber-400">
                                            30-60m
                                        </div>
                                        <div className="text-xs text-slate-300 mt-1 font-medium">Délai Coursier</div>
                                    </div>
                                </div>

                                <div className="space-y-3 pt-2 border-t border-white/10 text-xs text-slate-300">
                                    <div className="flex items-center justify-between">
                                        <span className="flex items-center gap-2 text-slate-400">
                                            <Truck className="w-4 h-4 text-emerald-400" />
                                            Livraison :
                                        </span>
                                        <span className="font-bold text-white">Directe depuis {effectiveMarketName}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="flex items-center gap-2 text-slate-400">
                                            <ShoppingBag className="w-4 h-4 text-amber-400" />
                                            Panier Groupé :
                                        </span>
                                        <span className="font-bold text-emerald-400">1 seule course payée</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
