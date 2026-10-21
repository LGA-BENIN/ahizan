"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { getAssetUrl } from '@/lib/vendure/api-utils';

export interface SlimBannerSlide {
    id?: string | number;
    title: string;
    subtitle?: string;
    bgGradient?: string;
    bgColor?: string;
    textColor?: string;
    highlightBadge?: string;
    badgeBgColor?: string;
    productImage?: string;
    ctaText?: string;
    ctaUrl?: string;
}

export interface HeroSlimBannerProps {
    slides?: SlimBannerSlide[];
    autoplaySpeed?: number | string;
    className?: string;
}

const DEFAULT_SLIDES: SlimBannerSlide[] = [
    {
        title: "Opération Bons Plans Cotonou",
        subtitle: "Livraison rapide dans tous les arrondissements",
        bgGradient: "linear-gradient(100deg, #1e3a8a 0%, #3b82f6 50%, #60a5fa 100%)",
        highlightBadge: "JUSQU'À -40%",
        badgeBgColor: "#ef4444",
        productImage: "https://images.unsplash.com/photo-1546868871-7041f2a55e12?q=80&w=600&auto=format&fit=crop",
        ctaText: "En profiter",
        ctaUrl: "/flash-deals"
    },
    {
        title: "Super Semaine High-Tech & PC",
        subtitle: "Garantie & Authenticité assurées sur Ahizan",
        bgGradient: "linear-gradient(100deg, #701a75 0%, #a21caf 50%, #e879f9 100%)",
        highlightBadge: "-25 000 FCFA",
        badgeBgColor: "#f59e0b",
        productImage: "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?q=80&w=600&auto=format&fit=crop",
        ctaText: "Découvrir",
        ctaUrl: "/search?category=informatique"
    },
    {
        title: "Paiement Mobile Money Simplifié",
        subtitle: "Réglez vos commandes en toute sécurité par MTN ou Moov",
        bgGradient: "linear-gradient(100deg, #064e3b 0%, #059669 50%, #34d399 100%)",
        highlightBadge: "0 FRAIS CACHÉS",
        badgeBgColor: "#10b981",
        productImage: "https://images.unsplash.com/photo-1563013544-824ae1b704d3?q=80&w=600&auto=format&fit=crop",
        ctaText: "Commander",
        ctaUrl: "/local-discovery"
    }
];

export function HeroSlimBanner({
    slides = DEFAULT_SLIDES,
    autoplaySpeed = 6000,
    className = ""
}: HeroSlimBannerProps) {
    const displaySlides = slides && slides.length > 0 ? slides : DEFAULT_SLIDES;
    const [current, setCurrent] = useState(0);

    const speed = Number(autoplaySpeed) > 0 ? Number(autoplaySpeed) : 6000;

    const next = useCallback(() => {
        setCurrent((prev) => (prev + 1) % displaySlides.length);
    }, [displaySlides.length]);

    const prev = useCallback(() => {
        setCurrent((prev) => (prev - 1 + displaySlides.length) % displaySlides.length);
    }, [displaySlides.length]);

    useEffect(() => {
        if (displaySlides.length <= 1) return;
        const interval = setInterval(next, speed);
        return () => clearInterval(interval);
    }, [displaySlides.length, next, speed]);

    const slide = displaySlides[current] || displaySlides[0];
    const imgSrc = slide.productImage ? (getAssetUrl(slide.productImage) || slide.productImage) : null;

    return (
        <section className={`w-full relative overflow-hidden rounded-2xl md:rounded-3xl shadow-md border border-white/10 group/banner select-none ${className}`}>
            <div
                className="relative w-full h-[145px] sm:h-[165px] md:h-[185px] transition-all duration-700 ease-in-out flex items-center px-4 sm:px-8 md:px-12"
                style={{
                    background: slide.bgGradient || slide.bgColor || 'linear-gradient(100deg, #0f172a 0%, #1e293b 100%)',
                }}
            >
                {/* Left Content Area */}
                <div className="flex-1 z-10 text-left max-w-[65%] sm:max-w-[60%]">
                    {slide.highlightBadge && (
                        <div className="mb-1.5 sm:mb-2">
                            <span
                                className="inline-block text-[9px] sm:text-[11px] font-black uppercase tracking-wider px-2 sm:px-2.5 py-0.5 rounded-full text-white shadow-sm"
                                style={{ backgroundColor: slide.badgeBgColor || '#ef4444' }}
                            >
                                {slide.highlightBadge}
                            </span>
                        </div>
                    )}
                    <h2 className="font-black text-sm sm:text-xl md:text-2xl text-white tracking-tight leading-tight line-clamp-1 drop-shadow-sm">
                        {slide.title}
                    </h2>
                    {slide.subtitle && (
                        <p className="text-[11px] sm:text-xs md:text-sm text-white/85 font-medium mt-0.5 sm:mt-1 line-clamp-1 drop-shadow-xs">
                            {slide.subtitle}
                        </p>
                    )}
                    <div className="mt-2 sm:mt-3">
                        <Link
                            href={slide.ctaUrl || '#'}
                            className="inline-flex items-center gap-1.5 bg-white text-slate-900 hover:bg-slate-100 font-extrabold text-[10px] sm:text-xs px-3 sm:px-4 py-1.5 rounded-full shadow-md hover:scale-105 active:scale-95 transition-all"
                        >
                            <span>{slide.ctaText || "Profiter de l'offre"}</span>
                            <ArrowRight className="w-3.5 h-3.5 stroke-[2.5px]" />
                        </Link>
                    </div>
                </div>

                {/* Right Product Showcase (Detached / Cutout Image) */}
                {imgSrc && (
                    <div className="relative z-10 w-[35%] sm:w-[40%] h-full flex items-center justify-end">
                        <div className="relative w-28 h-28 sm:w-36 sm:h-36 md:w-44 md:h-44 transition-transform duration-500 transform group-hover/banner:scale-105">
                            <img
                                src={imgSrc}
                                alt={slide.title}
                                className="w-full h-full object-contain filter drop-shadow-2xl"
                                loading="lazy"
                            />
                        </div>
                    </div>
                )}

                {/* Navigation Arrows for Slides */}
                {displaySlides.length > 1 && (
                    <>
                        <button
                            onClick={(e) => { e.preventDefault(); prev(); }}
                            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-black/30 hover:bg-black/60 text-white flex items-center justify-center opacity-0 group-hover/banner:opacity-100 transition-opacity"
                            aria-label="Diapositive précédente"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                            onClick={(e) => { e.preventDefault(); next(); }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-black/30 hover:bg-black/60 text-white flex items-center justify-center opacity-0 group-hover/banner:opacity-100 transition-opacity"
                            aria-label="Diapositive suivante"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>

                        {/* Navigation Dots */}
                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 flex gap-1.5 items-center">
                            {displaySlides.map((_, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setCurrent(idx)}
                                    className={`transition-all duration-300 rounded-full ${
                                        idx === current ? 'w-5 h-1 bg-white' : 'w-1.5 h-1 bg-white/40 hover:bg-white/70'
                                    }`}
                                    aria-label={`Aller au slide ${idx + 1}`}
                                />
                            ))}
                        </div>
                    </>
                )}
            </div>
        </section>
    );
}

export default HeroSlimBanner;
