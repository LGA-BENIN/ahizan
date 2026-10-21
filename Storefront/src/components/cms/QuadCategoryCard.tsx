"use client";

import React from 'react';
import Link from 'next/link';
import { ChevronRight, Compass } from 'lucide-react';
import { getAssetUrl } from '@/lib/vendure/api-utils';

export interface QuadCategoryItem {
    name: string;
    imageUrl: string;
    targetUrl: string;
}

export interface QuadCategoryCardProps {
    cardTitle: string;
    targetCategoryUrl?: string;
    items: QuadCategoryItem[];
    ctaLabel?: string;
    className?: string;
}

export interface QuadCategoryGridProps {
    title?: string;
    subtitle?: string;
    cards?: QuadCategoryCardProps[];
    className?: string;
}

const DEFAULT_QUAD_CARDS: QuadCategoryCardProps[] = [
    {
        cardTitle: "Branchez-vous à la High-Tech",
        targetCategoryUrl: "/search?category=electronique",
        ctaLabel: "Explorer l'univers High-Tech",
        items: [
            {
                name: "Casques & Audio",
                imageUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=400&auto=format&fit=crop",
                targetUrl: "/search?category=audio"
            },
            {
                name: "Smartphones",
                imageUrl: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?q=80&w=400&auto=format&fit=crop",
                targetUrl: "/search?category=telephonie"
            },
            {
                name: "Tablettes & iPad",
                imageUrl: "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?q=80&w=400&auto=format&fit=crop",
                targetUrl: "/search?category=tablettes"
            },
            {
                name: "Enceintes Bluetooth",
                imageUrl: "https://images.unsplash.com/photo-1545454675-3531b543be5d?q=80&w=400&auto=format&fit=crop",
                targetUrl: "/search?category=enceintes"
            }
        ]
    },
    {
        cardTitle: "Mode & Beauté Homme / Femme",
        targetCategoryUrl: "/search?category=mode",
        ctaLabel: "Voir toute la collection",
        items: [
            {
                name: "Robes & Tenues",
                imageUrl: "https://images.unsplash.com/photo-1496747611176-843222e1e57c?q=80&w=400&auto=format&fit=crop",
                targetUrl: "/search?category=vetements"
            },
            {
                name: "Montres & Bijoux",
                imageUrl: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?q=80&w=400&auto=format&fit=crop",
                targetUrl: "/search?category=accessoires"
            },
            {
                name: "Sneakers & Chaussures",
                imageUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=400&auto=format&fit=crop",
                targetUrl: "/search?category=chaussures"
            },
            {
                name: "Sacs & Maroquinerie",
                imageUrl: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?q=80&w=400&auto=format&fit=crop",
                targetUrl: "/search?category=sacs"
            }
        ]
    },
    {
        cardTitle: "Maison, Déco & Cuisine",
        targetCategoryUrl: "/search?category=maison",
        ctaLabel: "Équiper ma maison",
        items: [
            {
                name: "Petit Électro",
                imageUrl: "https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?q=80&w=400&auto=format&fit=crop",
                targetUrl: "/search?category=electromenager"
            },
            {
                name: "Ustensiles Cuisine",
                imageUrl: "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?q=80&w=400&auto=format&fit=crop",
                targetUrl: "/search?category=cuisine"
            },
            {
                name: "Luminaires & Lampes",
                imageUrl: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?q=80&w=400&auto=format&fit=crop",
                targetUrl: "/search?category=luminaires"
            },
            {
                name: "Linge de lit & Maison",
                imageUrl: "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?q=80&w=400&auto=format&fit=crop",
                targetUrl: "/search?category=linge"
            }
        ]
    },
    {
        cardTitle: "Alimentation & Marchés Locaux",
        targetCategoryUrl: "/local-discovery",
        ctaLabel: "Voir les marchands à proximité",
        items: [
            {
                name: "Épices & Condiments",
                imageUrl: "https://images.unsplash.com/photo-1532336414038-cf19250c5757?q=80&w=400&auto=format&fit=crop",
                targetUrl: "/search?category=epicerie"
            },
            {
                name: "Boissons & Jus",
                imageUrl: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?q=80&w=400&auto=format&fit=crop",
                targetUrl: "/search?category=boissons"
            },
            {
                name: "Produits Vivriers",
                imageUrl: "https://images.unsplash.com/photo-1540420773420-3366772f4999?q=80&w=400&auto=format&fit=crop",
                targetUrl: "/search?category=frais"
            },
            {
                name: "Hygiène & Soins",
                imageUrl: "https://images.unsplash.com/photo-1556228720-195a672e8a03?q=80&w=400&auto=format&fit=crop",
                targetUrl: "/search?category=hygiene"
            }
        ]
    }
];

export function QuadCategoryCard({
    cardTitle,
    targetCategoryUrl = "#",
    items = [],
    ctaLabel = "En savoir plus",
    className = ""
}: QuadCategoryCardProps) {
    const displayItems = (items || []).slice(0, 4);

    return (
        <div className={`bg-card rounded-2xl md:rounded-3xl p-4 sm:p-5 border border-border/70 shadow-xs hover:shadow-md transition-all flex flex-col justify-between ${className}`}>
            <div>
                {/* Header Title with Link */}
                <Link
                    href={targetCategoryUrl}
                    className="group/title flex items-center justify-between mb-3.5 no-underline"
                >
                    <h3 className="font-extrabold text-base sm:text-lg text-foreground group-hover/title:text-primary transition-colors tracking-tight line-clamp-1">
                        {cardTitle}
                    </h3>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover/title:text-primary group-hover/title:translate-x-1 transition-all shrink-0 ml-1" />
                </Link>

                {/* 2x2 Grid Internal Container */}
                <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                    {displayItems.map((item, index) => {
                        const imgSrc = getAssetUrl(item.imageUrl) || item.imageUrl;

                        return (
                            <Link
                                key={index}
                                href={item.targetUrl || targetCategoryUrl}
                                className="group/cell flex flex-col items-center text-center no-underline"
                            >
                                <div className="w-full aspect-square rounded-xl sm:rounded-2xl bg-muted/30 overflow-hidden p-1.5 border border-border/40 group-hover/cell:border-primary/40 group-hover/cell:shadow-sm transition-all duration-300">
                                    <div className="w-full h-full rounded-lg overflow-hidden bg-white dark:bg-slate-900 flex items-center justify-center">
                                        {imgSrc ? (
                                            <img
                                                src={imgSrc}
                                                alt={item.name}
                                                className="w-full h-full object-cover group-hover/cell:scale-105 transition-transform duration-300"
                                                loading="lazy"
                                            />
                                        ) : (
                                            <span className="text-xl">🛍️</span>
                                        )}
                                    </div>
                                </div>
                                <span className="block font-semibold text-[11px] sm:text-xs text-foreground group-hover/cell:text-primary transition-colors mt-1.5 line-clamp-1 w-full">
                                    {item.name}
                                </span>
                            </Link>
                        );
                    })}
                </div>
            </div>

            {/* Bottom Global Action Link */}
            <div className="mt-4 pt-3 border-t border-border/40">
                <Link
                    href={targetCategoryUrl}
                    className="text-xs font-black text-primary hover:underline inline-flex items-center gap-1 group/cta"
                >
                    <span>{ctaLabel}</span>
                    <ChevronRight className="w-3.5 h-3.5 group-hover/cta:translate-x-0.5 transition-transform" />
                </Link>
            </div>
        </div>
    );
}

export function QuadCategoryGrid({
    title,
    subtitle,
    cards = DEFAULT_QUAD_CARDS,
    className = ""
}: QuadCategoryGridProps) {
    const displayCards = cards && cards.length > 0 ? cards : DEFAULT_QUAD_CARDS;
    const cleanTitle = title ? title.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}]/gu, '').trim() : '';
    const cleanSubtitle = subtitle ? subtitle.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}]/gu, '').trim() : '';

    return (
        <section className={`w-full my-4 sm:my-6 ${className}`}>
            {(cleanTitle || cleanSubtitle) && (
                <div className="mb-4 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center text-red-600 border border-red-100 flex-shrink-0">
                        <Compass className="w-4 h-4 stroke-[2]" />
                    </div>
                    <div>
                        {cleanTitle && (
                            <h2 className="text-lg md:text-xl font-bold tracking-tight text-gray-900">
                                {cleanTitle}
                            </h2>
                        )}
                        {cleanSubtitle && (
                            <p className="text-xs md:text-sm text-gray-500 font-medium">
                                {cleanSubtitle}
                            </p>
                        )}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5">
                {displayCards.map((c, idx) => (
                    <QuadCategoryCard
                        key={idx}
                        cardTitle={c.cardTitle}
                        targetCategoryUrl={c.targetCategoryUrl}
                        items={c.items}
                        ctaLabel={c.ctaLabel}
                    />
                ))}
            </div>
        </section>
    );
}

export default QuadCategoryCard;
