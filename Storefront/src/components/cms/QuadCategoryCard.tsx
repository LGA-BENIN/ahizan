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
        cardTitle: "Smartphones & Accessoires",
        targetCategoryUrl: "/collection/telephones-tablettes-c",
        ctaLabel: "Voir tout l'univers High-Tech",
        items: [
            {
                name: "Téléphones Portables",
                imageUrl: "/assets/categories/telephone-portables.jpg",
                targetUrl: "/collection/telephone-portables-c-1"
            },
            {
                name: "Accessoires Téléphone",
                imageUrl: "/assets/categories/accessoires-telephone.jpg",
                targetUrl: "/collection/accessoires-telephone-c-2"
            },
            {
                name: "Écouteurs & Audio",
                imageUrl: "/assets/categories/ecouteurs-audio.jpg",
                targetUrl: "/search?category=audio"
            },
            {
                name: "Chargeurs & Câbles",
                imageUrl: "/assets/categories/chargeurs-cables.jpg",
                targetUrl: "/search?category=chargeurs"
            }
        ]
    },
    {
        cardTitle: "Maison, Cuisine & Électroménager",
        targetCategoryUrl: "/collection/maison-bureau-b",
        ctaLabel: "Équiper votre maison",
        items: [
            {
                name: "Petit Électroménager",
                imageUrl: "/assets/categories/petit-electromenager.jpg",
                targetUrl: "/collection/petit-electromenager-b-1"
            },
            {
                name: "Gros Électroménager",
                imageUrl: "/assets/categories/gros-electromenager.jpg",
                targetUrl: "/collection/gros-electromenager-b-2"
            },
            {
                name: "Arts de la Table",
                imageUrl: "/assets/categories/arts-de-la-table.jpg",
                targetUrl: "/collection/cuisine-et-arts-de-la-table-b-3"
            },
            {
                name: "Maison & Ameublement",
                imageUrl: "/assets/categories/maison-ameublement.jpg",
                targetUrl: "/collection/maison-et-ameublement-b-4"
            }
        ]
    },
    {
        cardTitle: "Alimentation & Épicerie Béninoise",
        targetCategoryUrl: "/collection/alimentation-a",
        ctaLabel: "Faire votre marché local",
        items: [
            {
                name: "Boissons & Jus Locaux",
                imageUrl: "/assets/categories/boissons-jus-locaux.jpg",
                targetUrl: "/collection/alimentation-a"
            },
            {
                name: "Épices & Condiments",
                imageUrl: "/assets/categories/epices-condiments.jpg",
                targetUrl: "/collection/alimentation-a"
            },
            {
                name: "Céréales & Farines",
                imageUrl: "/assets/categories/cereales-farines.jpg",
                targetUrl: "/collection/alimentation-a"
            },
            {
                name: "Produits Vivriers Frais",
                imageUrl: "/assets/categories/produits-vivriers-frais.jpg",
                targetUrl: "/collection/alimentation-a"
            }
        ]
    },
    {
        cardTitle: "Beauté, Cosmétiques & Soins",
        targetCategoryUrl: "/collection/beaute-hygiene-e",
        ctaLabel: "Découvrir les soins",
        items: [
            {
                name: "Soins du Visage",
                imageUrl: "/assets/categories/soins-du-visage.jpg",
                targetUrl: "/collection/beaute-hygiene-e"
            },
            {
                name: "Parfums & Eaux",
                imageUrl: "/assets/categories/parfums-eaux.jpg",
                targetUrl: "/collection/beaute-hygiene-e"
            },
            {
                name: "Soins Capillaires",
                imageUrl: "/assets/categories/soins-capillaires.jpg",
                targetUrl: "/collection/beaute-hygiene-e"
            },
            {
                name: "Hygiène Quotidienne",
                imageUrl: "/assets/categories/hygiene-quotidienne.jpg",
                targetUrl: "/collection/beaute-hygiene-e"
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
