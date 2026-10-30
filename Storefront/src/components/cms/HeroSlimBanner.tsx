"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { getAssetUrl } from '@/lib/vendure/api-utils';

export interface SlimBannerSlide {
    id?: string | number;
    title?: string;
    subtitle?: string;
    bgGradient?: string;
    bgColor?: string;
    textColor?: string;
    highlightBadge?: string;
    badgeBgColor?: string;
    productImage?: string;
    ctaText?: string;
    ctaUrl?: string;

    // Champs pour le Style 2 (Carrousel d'Images Promotionnelles)
    imageUrl?: string;          // Image Desktop / Principale
    desktopImageUrl?: string;   // Alias Image Desktop
    mobileImageUrl?: string;    // Image Mobile dédiée (Optionnelle)
    linkUrl?: string;           // Lien de redirection au clic
    alt?: string;               // Texte alternatif
}

export interface HeroSlimBannerProps {
    bannerStyle?: 'panoramic_card' | 'image_carousel';
    style?: 'panoramic_card' | 'image_carousel'; // Alias de bannerStyle
    slides?: SlimBannerSlide[];
    imageSlides?: SlimBannerSlide[];             // Slides spécifiques au Style 2
    autoplaySpeed?: number | string;
    className?: string;
}

const DEFAULT_SLIDES_STYLE_1: SlimBannerSlide[] = [
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

const DEFAULT_SLIDES_STYLE_2: SlimBannerSlide[] = [
    {
        id: 'promo-1',
        imageUrl: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?q=80&w=1600&auto=format&fit=crop",
        mobileImageUrl: "https://images.unsplash.com/photo-1607082349566-187342175e2f?q=80&w=800&auto=format&fit=crop",
        linkUrl: "/flash-deals",
        alt: "Offres Spéciales Flash Deals"
    },
    {
        id: 'promo-2',
        imageUrl: "https://images.unsplash.com/photo-1593642702821-c8da6771f0c6?q=80&w=1600&auto=format&fit=crop",
        mobileImageUrl: "https://images.unsplash.com/photo-1593642634367-d91a135587b5?q=80&w=800&auto=format&fit=crop",
        linkUrl: "/search?category=informatique",
        alt: "Sélection High-Tech & Gaming"
    },
    {
        id: 'promo-3',
        imageUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=1600&auto=format&fit=crop",
        mobileImageUrl: "https://images.unsplash.com/photo-1552346154-21d32810aba3?q=80&w=800&auto=format&fit=crop",
        linkUrl: "/flash-deals",
        alt: "Promotions & Nouveautés"
    }
];

export function HeroSlimBanner({
    bannerStyle,
    style,
    slides,
    imageSlides,
    autoplaySpeed = 5000,
    className = ""
}: HeroSlimBannerProps) {
    const activeStyle = bannerStyle || style || 'panoramic_card';

    if (activeStyle === 'image_carousel') {
        const carouselSlides = (imageSlides && imageSlides.length > 0)
            ? imageSlides
            : (slides && slides.length > 0 && (slides[0].imageUrl || slides[0].desktopImageUrl))
                ? slides
                : (slides && slides.length > 0)
                    ? slides
                    : DEFAULT_SLIDES_STYLE_2;

        return (
            <ImagePeekCarousel
                slides={carouselSlides}
                autoplaySpeed={autoplaySpeed}
                className={className}
            />
        );
    }

    return (
        <PanoramicCardBanner
            slides={slides && slides.length > 0 ? slides : DEFAULT_SLIDES_STYLE_1}
            autoplaySpeed={autoplaySpeed}
            className={className}
        />
    );
}

/**
 * STYLE 2 : Carrousel Grand Format d'Images Défilantes avec Effet Peek (PC & Mobile)
 * - Diapositives images avec peek sur les côtés (tranches des slides précédente et suivante visibles)
 * - Gestion indépendante ou unifiée de l'image Desktop et de l'image Mobile
 * - Défilement tactile (touch swipe) et glissement à la souris
 * - Flèches de navigation et indicateurs (pilules de pagination)
 */
function ImagePeekCarousel({
    slides = DEFAULT_SLIDES_STYLE_2,
    autoplaySpeed = 5000,
    className = ""
}: {
    slides?: SlimBannerSlide[];
    autoplaySpeed?: number | string;
    className?: string;
}) {
    const [current, setCurrent] = useState(0);
    const [isHovered, setIsHovered] = useState(false);
    const [dragOffset, setDragOffset] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const startXRef = useRef(0);
    const hasDraggedRef = useRef(false);

    const speed = Number(autoplaySpeed) > 0 ? Number(autoplaySpeed) : 5000;
    const total = slides.length;

    const next = useCallback(() => {
        if (total <= 1) return;
        setCurrent((prev) => (prev + 1) % total);
    }, [total]);

    const prev = useCallback(() => {
        if (total <= 1) return;
        setCurrent((prev) => (prev - 1 + total) % total);
    }, [total]);

    // Autoplay timer
    useEffect(() => {
        if (total <= 1 || isHovered || isDragging) return;
        const interval = setInterval(next, speed);
        return () => clearInterval(interval);
    }, [total, next, speed, isHovered, isDragging]);

    // Touch handlers for mobile swipe
    const handleTouchStart = (e: React.TouchEvent) => {
        startXRef.current = e.touches[0].clientX;
        hasDraggedRef.current = false;
        setIsDragging(true);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        const deltaX = e.touches[0].clientX - startXRef.current;
        if (Math.abs(deltaX) > 5) {
            hasDraggedRef.current = true;
        }
        setDragOffset(deltaX);
    };

    const handleTouchEnd = () => {
        if (dragOffset < -45) {
            next();
        } else if (dragOffset > 45) {
            prev();
        }
        setDragOffset(0);
        setIsDragging(false);
    };

    // Mouse drag handlers for desktop
    const handleMouseDown = (e: React.MouseEvent) => {
        startXRef.current = e.clientX;
        hasDraggedRef.current = false;
        setIsDragging(true);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging) return;
        const deltaX = e.clientX - startXRef.current;
        if (Math.abs(deltaX) > 5) {
            hasDraggedRef.current = true;
        }
        setDragOffset(deltaX);
    };

    const handleMouseUp = () => {
        if (!isDragging) return;
        if (dragOffset < -50) {
            next();
        } else if (dragOffset > 50) {
            prev();
        }
        setDragOffset(0);
        setIsDragging(false);
    };

    const handleMouseLeave = () => {
        if (isDragging) {
            handleMouseUp();
        }
        setIsHovered(false);
    };

    return (
        <section 
            className={`w-full relative overflow-hidden select-none py-1 sm:py-2 ${className}`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={handleMouseLeave}
        >
            {/* Carousel track container */}
            <div 
                className="relative w-full overflow-hidden cursor-grab active:cursor-grabbing touch-pan-y"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
            >
                <div
                    className={`flex items-center ${
                        isDragging ? 'transition-none' : 'transition-transform duration-500 ease-out'
                    }`}
                    style={{
                        // Ultra-slim peek matching Screenshot 2: Main slide occupies 91%, 4.5% peek on each side, razor-thin 8px gap
                        transform: `translateX(calc(4.5% - ${current} * (91% + 8px) + ${dragOffset}px))`,
                        gap: '8px'
                    }}
                >
                    {slides.map((slide, idx) => {
                        const desktopImg = slide.imageUrl || slide.desktopImageUrl || slide.productImage || '';
                        const mobileImg = slide.mobileImageUrl || desktopImg;
                        const desktopSrc = desktopImg ? (getAssetUrl(desktopImg) || desktopImg) : null;
                        const mobileSrc = mobileImg ? (getAssetUrl(mobileImg) || mobileImg) : desktopSrc;
                        const href = slide.linkUrl || slide.ctaUrl || null;
                        const isActive = idx === current;

                        const content = (
                            <div 
                                className={`relative w-full h-[175px] xs:h-[190px] sm:h-[200px] md:h-[185px] lg:h-[205px] xl:h-[220px] overflow-hidden rounded-md sm:rounded-lg border-[0.5px] border-slate-200/50 dark:border-slate-800/50 shadow-none transition-all duration-300 ${
                                    isActive ? 'opacity-100 scale-100' : 'opacity-80 scale-[0.99] hover:opacity-95'
                                }`}
                                onClick={(e) => {
                                    if (hasDraggedRef.current) {
                                        e.preventDefault();
                                        return;
                                    }
                                    if (!isActive) {
                                        e.preventDefault();
                                        setCurrent(idx);
                                    }
                                }}
                            >
                                {desktopSrc ? (
                                    <picture className="w-full h-full block">
                                        {slide.mobileImageUrl && mobileSrc && (
                                            <source media="(max-width: 767px)" srcSet={mobileSrc} />
                                        )}
                                        <img
                                            src={desktopSrc}
                                            alt={slide.alt || slide.title || `Bannière promo ${idx + 1}`}
                                            className="w-full h-full object-cover object-center pointer-events-none"
                                            loading={idx === 0 ? "eager" : "lazy"}
                                            draggable={false}
                                        />
                                    </picture>
                                ) : (
                                    <div 
                                        className="w-full h-full flex flex-col items-center justify-center text-white px-6 text-center"
                                        style={{ background: slide.bgGradient || slide.bgColor || 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)' }}
                                    >
                                        {slide.highlightBadge && (
                                            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-none bg-red-600 mb-1">
                                                {slide.highlightBadge}
                                            </span>
                                        )}
                                        <h3 className="text-sm md:text-lg font-black">{slide.title || "Bannière Promotionnelle"}</h3>
                                        {slide.subtitle && <p className="text-[11px] md:text-xs text-white/80 mt-0.5">{slide.subtitle}</p>}
                                    </div>
                                )}
                            </div>
                        );

                        return (
                            <div
                                key={slide.id || idx}
                                className="flex-shrink-0"
                                style={{ width: '91%' }}
                            >
                                {href && isActive ? (
                                    <Link href={href} className="block w-full h-full cursor-pointer">
                                        {content}
                                    </Link>
                                ) : (
                                    content
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Navigation Arrows for PC / Tablet (Style Pointu sans ombre) */}
            {total > 1 && (
                <>
                    <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); prev(); }}
                        className="absolute left-1 sm:left-2 md:left-2.5 top-1/2 -translate-y-1/2 z-20 w-6 sm:w-7 md:w-8 h-12 sm:h-14 md:h-16 bg-white hover:bg-slate-50 text-slate-800 rounded-none shadow-none border border-slate-300/80 dark:border-slate-700 flex items-center justify-center transition-all duration-200 opacity-95 hover:opacity-100"
                        aria-label="Bannière précédente"
                    >
                        <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 text-slate-800 stroke-[2.5px]" />
                    </button>
                    <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); next(); }}
                        className="absolute right-1 sm:right-2 md:right-2.5 top-1/2 -translate-y-1/2 z-20 w-6 sm:w-7 md:w-8 h-12 sm:h-14 md:h-16 bg-white hover:bg-slate-50 text-slate-800 rounded-none shadow-none border border-slate-300/80 dark:border-slate-700 flex items-center justify-center transition-all duration-200 opacity-95 hover:opacity-100"
                        aria-label="Bannière suivante"
                    >
                        <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-slate-800 stroke-[2.5px]" />
                    </button>
                </>
            )}

            {/* Responsive Pagination Indicators (Tirets rectangulaires pointus sans arrondis) */}
            {total > 1 && (
                <div className="flex justify-center items-center gap-1.5 sm:gap-2 mt-2 sm:mt-3">
                    {slides.map((_, idx) => (
                        <button
                            key={idx}
                            type="button"
                            onClick={() => setCurrent(idx)}
                            className={`transition-all duration-300 rounded-none ${
                                idx === current 
                                    ? 'w-6 sm:w-8 h-1 sm:h-1.5 bg-slate-800 dark:bg-slate-200' 
                                    : 'w-2 sm:w-2.5 h-1 sm:h-1.5 bg-slate-300 dark:bg-slate-600 hover:bg-slate-400 dark:hover:bg-slate-500'
                            }`}
                            aria-label={`Aller à la bannière ${idx + 1}`}
                        />
                    ))}
                </div>
            )}
        </section>
    );
}

/**
 * STYLE 1 : Bannière Panoramique Compacte Cdiscount (Texte + Dégradé + Produit Détouré)
 * - Conserve l'intégralité du design et des fonctionnalités existants sans régression.
 */
function PanoramicCardBanner({
    slides = DEFAULT_SLIDES_STYLE_1,
    autoplaySpeed = 6000,
    className = ""
}: {
    slides?: SlimBannerSlide[];
    autoplaySpeed?: number | string;
    className?: string;
}) {
    const displaySlides = slides && slides.length > 0 ? slides : DEFAULT_SLIDES_STYLE_1;
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
