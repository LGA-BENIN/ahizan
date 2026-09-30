"use client";

import React, { useState, useEffect } from "react";
import { MapPin, Store, ShoppingBag, ArrowRight, ChevronLeft, ChevronRight, ShieldCheck, Sparkles } from "lucide-react";
import { getAssetUrl, getShopApiUrl } from "@/lib/vendure/api-utils";
import { fetchWithClientCache } from "@/lib/vendure/client-cache";

const FALLBACK_MARKET_BANNER = "https://images.unsplash.com/photo-1533900298318-6b8da08a523e?q=80&w=1200&auto=format&fit=crop";

interface SlideItem {
    id?: string;
    imageUrl: string;
    title?: string;
    subtitle?: string;
    ctaText?: string;
    ctaLink?: string;
}

interface MarketHeroBannerProps {
    config?: {
        bgType?: 'DEFAULT_MARKET_IMAGE' | 'CUSTOM_IMAGE' | 'SLIDESHOW' | 'COLOR_GRADIENT';
        bgImageUrl?: string;
        bgImage?: string;
        bgColor?: string;
        bgGradient?: string;
        slides?: SlideItem[];
        autoplaySpeed?: number;
        overlayOpacity?: number;
        height?: 'compact' | 'medium' | 'large' | 'full';
        textAlign?: 'left' | 'center';

        // Content
        title?: string;
        subtitle?: string;
        description?: string;
        welcomeText?: string;

        // Badges
        showLocationBadge?: boolean;
        locationBadgeText?: string;
        showVendorsBadge?: boolean;
        vendorsBadgeText?: string;
        manualVendorsCount?: number;
        showProductsBadge?: boolean;
        productsBadgeText?: string;
        manualProductsCount?: number;
        showVerifiedBadge?: boolean;
        verifiedBadgeText?: string;

        // CTA Button
        showCta?: boolean;
        ctaText?: string;
        ctaLink?: string;
        ctaStyle?: 'solid' | 'glass' | 'outline';

        // Dynamic market context
        marketId?: string;
        marketName?: string;
        marketSlug?: string;
        marketImage?: string;
        image?: string;
        bannerImage?: string;
        marketDescription?: string;
        marketLocation?: string;
        locationName?: string;
    };
}

export function MarketHeroBanner({ config = {} }: MarketHeroBannerProps) {
    const [activeSlide, setActiveSlide] = useState(0);
    const [vendorsCount, setVendorsCount] = useState<number | null>(config.manualVendorsCount || null);
    const [productsCount, setProductsCount] = useState<number | null>(config.manualProductsCount || null);
    const [marketInfo, setMarketInfo] = useState<any>(null);

    // Context / Global market detection
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const ahizanMarket = (window as any).ahizan?.market;
            if (ahizanMarket) {
                setMarketInfo(ahizanMarket);
            }
        }
    }, []);

    const effectiveMarket = marketInfo || {};
    const marketName = config.marketName || config.title || effectiveMarket.name || "Ce Marché";
    const marketLocation = config.marketLocation || config.locationName || effectiveMarket.geoZone?.name || effectiveMarket.location?.name || effectiveMarket.parent?.name || "Bénin";
    const marketDesc = config.marketDescription || config.description || effectiveMarket.description || "";

    // Candidate image resolution
    const candidateImage = 
        config.bgImageUrl || 
        config.bgImage || 
        config.marketImage || 
        config.image || 
        config.bannerImage || 
        effectiveMarket.image || 
        effectiveMarket.bgImage || 
        effectiveMarket.bgImageUrl || 
        "";

    const bgType = config.bgType || (config.slides && config.slides.length > 0 ? 'SLIDESHOW' : (candidateImage ? 'CUSTOM_IMAGE' : 'DEFAULT_MARKET_IMAGE'));
    const overlayOpacity = config.overlayOpacity !== undefined ? Number(config.overlayOpacity) : 40;
    
    const slides: SlideItem[] = config.slides && config.slides.length > 0 ? config.slides : [
        { imageUrl: candidateImage || FALLBACK_MARKET_BANNER }
    ];

    // Fetch dynamic live counts of vendors and products for this market
    const effectiveMarketId = config.marketId || effectiveMarket.id;
    useEffect(() => {
        if (!effectiveMarketId) return;

        const query = `
            query GetMarketLiveCounts($marketId: ID!) {
                vendors(marketId: $marketId, options: { filter: { status: { eq: "APPROVED" } }, take: 100 }) {
                    totalItems
                    items {
                        id
                        products { id }
                    }
                }
            }
        `;

        fetchWithClientCache(getShopApiUrl(), query, { marketId: String(effectiveMarketId) })
            .then((data: any) => {
                const vendorItems = data?.vendors?.items || [];
                const vCount = data?.vendors?.totalItems || vendorItems.length;
                if (!config.manualVendorsCount) {
                    setVendorsCount(vCount);
                }
                if (!config.manualProductsCount) {
                    const pCount = vendorItems.reduce((acc: number, v: any) => acc + (v.products?.length || 0), 0);
                    setProductsCount(pCount > 0 ? pCount : null);
                }
            })
            .catch(() => {});
    }, [effectiveMarketId, config.manualVendorsCount, config.manualProductsCount]);

    // Slideshow autoplay
    useEffect(() => {
        if (bgType !== 'SLIDESHOW' || slides.length <= 1) return;
        const speed = Number(config.autoplaySpeed) || 5000;
        const timer = setInterval(() => {
            setActiveSlide(prev => (prev + 1) % slides.length);
        }, speed);
        return () => clearInterval(timer);
    }, [bgType, slides.length, config.autoplaySpeed]);

    // Compact & Elegant Height classes
    const heightClasses = {
        compact: 'min-h-[190px] sm:min-h-[220px] md:min-h-[260px]',
        medium: 'min-h-[240px] sm:min-h-[280px] md:min-h-[320px]',
        large: 'min-h-[320px] sm:min-h-[380px] md:min-h-[440px]',
        full: 'min-h-[55vh]',
    }[config.height || 'medium'];

    const rawTitle = config.title || "🌴 {{market.name}}";
    const titleText = rawTitle.replace(/\{\{market\.name\}\}/g, marketName);

    const rawSubtitle = config.subtitle || "Le marché officiel de {{market.location}}";
    const subtitleText = rawSubtitle
        .replace(/\{\{market\.name\}\}/g, marketName)
        .replace(/\{\{market\.location\}\}/g, marketLocation);

    const descText = config.description || marketDesc || "";

    const activeImageRaw = bgType === 'SLIDESHOW'
        ? (slides[activeSlide]?.imageUrl || candidateImage || FALLBACK_MARKET_BANNER)
        : (candidateImage || FALLBACK_MARKET_BANNER);

    const resolvedImage = getAssetUrl(activeImageRaw) || activeImageRaw;

    const handleCtaClick = (e: React.MouseEvent<HTMLAnchorElement>, href?: string) => {
        if (href && href.startsWith('#')) {
            e.preventDefault();
            const target = document.querySelector(href);
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
    };

    return (
        <div className="w-full relative overflow-hidden rounded-2xl sm:rounded-3xl my-3 shadow-lg border border-slate-200/50 dark:border-slate-800">
            <div className={`relative ${heightClasses} flex flex-col justify-end p-4 sm:p-6 md:p-8 text-white`}>
                
                {/* Background Layer */}
                {bgType === 'COLOR_GRADIENT' ? (
                    <div 
                        className="absolute inset-0 z-0" 
                        style={{ 
                            background: config.bgGradient || config.bgColor || 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #047857 100%)' 
                        }} 
                    />
                ) : (
                    <>
                        {resolvedImage && (
                            <div className="absolute inset-0 z-0 overflow-hidden bg-slate-900">
                                <img
                                    src={resolvedImage}
                                    alt={marketName}
                                    className="w-full h-full object-cover object-center transition-all duration-700 ease-out"
                                />
                            </div>
                        )}
                        {/* Gradient Vignette for perfect text readability */}
                        <div 
                            className="absolute inset-0 z-0"
                            style={{
                                background: `linear-gradient(to top, rgba(15, 23, 42, 0.95) 0%, rgba(15, 23, 42, ${overlayOpacity / 100}) 55%, rgba(15, 23, 42, 0.25) 100%)`
                            }}
                        />
                    </>
                )}

                {/* Slideshow Navigation Buttons */}
                {bgType === 'SLIDESHOW' && slides.length > 1 && (
                    <>
                        <button 
                            onClick={() => setActiveSlide((activeSlide - 1 + slides.length) % slides.length)}
                            className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/40 hover:bg-black/70 backdrop-blur-md flex items-center justify-center text-white transition-all cursor-pointer"
                            aria-label="Slide précédente"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button 
                            onClick={() => setActiveSlide((activeSlide + 1) % slides.length)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/40 hover:bg-black/70 backdrop-blur-md flex items-center justify-center text-white transition-all cursor-pointer"
                            aria-label="Slide suivante"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>

                        {/* Slide Indicators */}
                        <div className="absolute top-4 right-4 z-20 flex gap-1 bg-black/40 px-2.5 py-1 rounded-full backdrop-blur-md">
                            {slides.map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => setActiveSlide(i)}
                                    className={`h-1.5 rounded-full transition-all cursor-pointer ${i === activeSlide ? 'w-4 bg-white' : 'w-1.5 bg-white/40'}`}
                                />
                            ))}
                        </div>
                    </>
                )}

                {/* Content Container */}
                <div className={`relative z-10 max-w-3xl flex flex-col gap-2.5 sm:gap-3 ${config.textAlign === 'center' ? 'items-center text-center mx-auto' : 'items-start text-left'}`}>
                    
                    {/* Welcome / Ambient Tag */}
                    {config.welcomeText !== "" && (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-[10px] sm:text-xs font-black tracking-wider uppercase text-white shadow-xs">
                            <Sparkles className="w-3 h-3 text-amber-300" />
                            {config.welcomeText || "Bienvenue au Cœur du Marché"}
                        </div>
                    )}

                    {/* Main Title */}
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-white uppercase drop-shadow-md leading-tight">
                        {titleText}
                    </h1>

                    {/* Subtitle */}
                    {subtitleText && (
                        <p className="text-xs sm:text-sm md:text-base text-slate-200 font-medium leading-snug drop-shadow line-clamp-2">
                            {subtitleText}
                        </p>
                    )}

                    {/* Description */}
                    {descText && (
                        <p className="text-[11px] sm:text-xs text-slate-300 font-normal leading-relaxed line-clamp-2 max-w-2xl">
                            {descText}
                        </p>
                    )}

                    {/* Badges Bar (Location, Vendors, Products, Verification) */}
                    <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 pt-1">
                        {config.showLocationBadge !== false && (
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/80 backdrop-blur-md border border-slate-700/60 text-[11px] font-bold text-slate-100 shadow-xs">
                                <MapPin className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                                <span>{config.locationBadgeText || `📍 ${marketName} · ${marketLocation}`}</span>
                            </div>
                        )}

                        {config.showVendorsBadge !== false && (
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/80 backdrop-blur-md border border-slate-700/60 text-[11px] font-bold text-slate-100 shadow-xs">
                                <Store className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                                <span>
                                    {config.vendorsBadgeText 
                                        ? config.vendorsBadgeText 
                                        : `${vendorsCount != null ? vendorsCount : '10+'} boutiques résidentes`
                                    }
                                </span>
                            </div>
                        )}

                        {config.showProductsBadge !== false && (
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/80 backdrop-blur-md border border-slate-700/60 text-[11px] font-bold text-slate-100 shadow-xs">
                                <ShoppingBag className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                                <span>
                                    {config.productsBadgeText 
                                        ? config.productsBadgeText 
                                        : `${productsCount != null ? productsCount : '100+'} articles disponibles`
                                    }
                                </span>
                            </div>
                        )}

                        {config.showVerifiedBadge !== false && (
                            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/70 backdrop-blur-md border border-emerald-700/50 text-[11px] font-bold text-emerald-300 shadow-xs">
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                                <span>{config.verifiedBadgeText || "Vendeurs Vérifiés & Certifiés"}</span>
                            </div>
                        )}
                    </div>

                    {/* CTA Exploration Button */}
                    {config.showCta !== false && (
                        <div className="pt-2">
                            <a
                                href={config.ctaLink || "#boutiques"}
                                onClick={(e) => handleCtaClick(e, config.ctaLink || "#boutiques")}
                                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-black text-xs uppercase tracking-wider transition-all shadow-md hover:shadow-primary/30 no-underline cursor-pointer"
                            >
                                <span>{config.ctaText || "Explorer le Marché"}</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                            </a>
                        </div>
                    )}

                </div>

            </div>
        </div>
    );
}

export default MarketHeroBanner;
