"use client";

import React, { useRef } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { getAssetUrl } from '@/lib/vendure/api-utils';

export interface StoryCard {
    id?: string | number;
    title: string;
    subtitle?: string;
    coverImage: string;
    linkUrl: string;
    tag?: string;
    tagColor?: string;
    buttonText?: string;
}

export interface HeroStoryScrollerProps {
    title?: string;
    subtitle?: string;
    cards?: StoryCard[];
    autoplaySpeed?: number | string;
    className?: string;
}

const DEFAULT_CARDS: StoryCard[] = [
    {
        title: "Nouvelle Collection High-Tech",
        subtitle: "Smartphones & Accessoires",
        coverImage: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?q=80&w=800&auto=format&fit=crop",
        linkUrl: "/search?category=electronique",
        tag: "TENDANCE",
        tagColor: "#ef4444",
        buttonText: "Découvrir"
    },
    {
        title: "Mode & Beauté Africaine",
        subtitle: "Le meilleur du style local",
        coverImage: "https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=800&auto=format&fit=crop",
        linkUrl: "/search?category=mode",
        tag: "EXCLUSIF",
        tagColor: "#f59e0b",
        buttonText: "Explorer"
    },
    {
        title: "Maison & Décoration",
        subtitle: "Sublimez votre intérieur",
        coverImage: "https://images.unsplash.com/photo-1513694203232-719a280e022f?q=80&w=800&auto=format&fit=crop",
        linkUrl: "/search?category=maison",
        tag: "NOUVEAUTÉ",
        tagColor: "#10b981",
        buttonText: "Voir les offres"
    },
    {
        title: "Marchés Locaux de Cotonou",
        subtitle: "Dantokpa & Commerces de quartier",
        coverImage: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=800&auto=format&fit=crop",
        linkUrl: "/local-discovery",
        tag: "PROXIMITÉ",
        tagColor: "#8b5cf6",
        buttonText: "Commander"
    },
    {
        title: "Électroménager & Équipement",
        subtitle: "Prix imbattables garantis",
        coverImage: "https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?q=80&w=800&auto=format&fit=crop",
        linkUrl: "/search?category=electromenager",
        tag: "BONS PLANS",
        tagColor: "#06b6d4",
        buttonText: "Profiter"
    }
];

export function HeroStoryScroller({
    title,
    subtitle,
    cards = DEFAULT_CARDS,
    className = ""
}: HeroStoryScrollerProps) {
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const scroll = (direction: 'left' | 'right') => {
        if (scrollContainerRef.current) {
            const amount = scrollContainerRef.current.clientWidth * 0.75;
            scrollContainerRef.current.scrollBy({
                left: direction === 'left' ? -amount : amount,
                behavior: 'smooth'
            });
        }
    };

    const displayCards = cards && cards.length > 0 ? cards : DEFAULT_CARDS;

    return (
        <section className={`w-full relative group/story ${className}`}>
            {(title || subtitle) && (
                <div className="flex items-center justify-between mb-3 px-1">
                    <div>
                        {title && (
                            <h2 className="text-lg md:text-xl font-black tracking-tight text-foreground flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-primary" />
                                {title}
                            </h2>
                        )}
                        {subtitle && (
                            <p className="text-xs text-muted-foreground font-medium mt-0.5">{subtitle}</p>
                        )}
                    </div>
                    <div className="hidden sm:flex items-center gap-1.5">
                        <button
                            onClick={() => scroll('left')}
                            className="p-1.5 rounded-full border border-border/60 hover:bg-muted transition-colors text-foreground"
                            aria-label="Faire défiler vers la gauche"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => scroll('right')}
                            className="p-1.5 rounded-full border border-border/60 hover:bg-muted transition-colors text-foreground"
                            aria-label="Faire défiler vers la droite"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* Desktop Navigation Floating Arrows */}
            <button
                onClick={() => scroll('left')}
                className="hidden md:flex absolute left-[-12px] top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white/95 dark:bg-slate-900 shadow-xl border border-border/60 items-center justify-center text-foreground hover:scale-110 opacity-0 group-hover/story:opacity-100 transition-all cursor-pointer"
                aria-label="Précédent"
            >
                <ChevronLeft className="w-5 h-5" />
            </button>
            <button
                onClick={() => scroll('right')}
                className="hidden md:flex absolute right-[-12px] top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white/95 dark:bg-slate-900 shadow-xl border border-border/60 items-center justify-center text-foreground hover:scale-110 opacity-0 group-hover/story:opacity-100 transition-all cursor-pointer"
                aria-label="Suivant"
            >
                <ChevronRight className="w-5 h-5" />
            </button>

            {/* Horizontal Story Cards Track */}
            <div
                ref={scrollContainerRef}
                className="flex gap-3 sm:gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scroll-smooth scrollbar-none no-scrollbar -mx-3 px-3 sm:mx-0 sm:px-0"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
                {displayCards.map((card, idx) => {
                    const imgSrc = getAssetUrl(card.coverImage) || card.coverImage;

                    return (
                        <Link
                            key={card.id || idx}
                            href={card.linkUrl || '#'}
                            className="group/card relative flex-shrink-0 snap-start w-[145px] sm:w-[175px] md:w-[210px] aspect-[9/15] rounded-2xl md:rounded-3xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 block border border-white/20 select-none"
                        >
                            {/* Background Image */}
                            <img
                                src={imgSrc}
                                alt={card.title}
                                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover/card:scale-110"
                                loading="lazy"
                            />

                            {/* Dual Dark Gradient Overlays (Top & Bottom Protection) */}
                            <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/75 via-black/35 to-transparent pointer-events-none" />
                            <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-none" />

                            {/* Top Badge (Tag) */}
                            {card.tag && (
                                <div className="absolute top-2.5 left-2.5 z-10">
                                    <span
                                        className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full text-white shadow-xs backdrop-blur-xs"
                                        style={{ backgroundColor: card.tagColor || 'var(--primary, #ef4444)' }}
                                    >
                                        {card.tag}
                                    </span>
                                </div>
                            )}

                            {/* Bottom Content Area */}
                            <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4 z-10 flex flex-col justify-end text-left">
                                <h3 className="font-extrabold text-xs sm:text-sm md:text-base text-white leading-snug drop-shadow-md line-clamp-2">
                                    {card.title}
                                </h3>
                                {card.subtitle && (
                                    <p className="text-[10px] sm:text-xs text-white/80 font-medium mt-0.5 line-clamp-1">
                                        {card.subtitle}
                                    </p>
                                )}
                                <div className="mt-2 pt-2 border-t border-white/20 flex items-center justify-between text-white/95 group-hover/card:text-amber-300 transition-colors">
                                    <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider">
                                        {card.buttonText || "Explorer"}
                                    </span>
                                    <ChevronRight className="w-3.5 h-3.5 transform group-hover/card:translate-x-1 transition-transform" />
                                </div>
                            </div>
                        </Link>
                    );
                })}
            </div>
        </section>
    );
}

export default HeroStoryScroller;
