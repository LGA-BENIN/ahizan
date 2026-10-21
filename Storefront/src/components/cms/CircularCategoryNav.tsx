"use client";

import React, { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { 
    ChevronLeft, ChevronRight, Smartphone, Laptop, Home, 
    Sparkles, ShoppingBag, UtensilsCrossed, Baby, Store 
} from 'lucide-react';
import { getAssetUrl, getShopApiUrl } from '@/lib/vendure/api-utils';

export interface CircularCategoryItem {
    id?: string | number;
    label: string;
    imageUrl?: string;
    slug: string;
    count?: number;
}

export interface CircularCategoryNavProps {
    title?: string;
    subtitle?: string;
    categories?: CircularCategoryItem[];
    autoFetch?: boolean;
    className?: string;
}

const CATEGORY_FALLBACK_IMAGES: Record<string, string> = {
    'telephones-tablettes-c': 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?q=80&w=300&auto=format&fit=crop',
    'electronique-photo-d': 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=300&auto=format&fit=crop',
    'maison-bureau-b': 'https://images.unsplash.com/photo-1513694203232-719a280e022f?q=80&w=300&auto=format&fit=crop',
    'alimentation-a': 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?q=80&w=300&auto=format&fit=crop',
    'beaute-hygiene-e': 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?q=80&w=300&auto=format&fit=crop',
    'bebes-enfants-f': 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?q=80&w=300&auto=format&fit=crop',
};

function getCategoryVectorIcon(label: string, slug: string) {
    const text = `${label} ${slug}`.toLowerCase();
    if (text.includes('telephon') || text.includes('smart')) return Smartphone;
    if (text.includes('info') || text.includes('electro') || text.includes('photo')) return Laptop;
    if (text.includes('maison') || text.includes('bureau') || text.includes('meuble')) return Home;
    if (text.includes('alimen') || text.includes('cuisin') || text.includes('boisson')) return UtensilsCrossed;
    if (text.includes('beaut') || text.includes('hygien') || text.includes('soin')) return Sparkles;
    if (text.includes('bebe') || text.includes('enfant')) return Baby;
    if (text.includes('march') || text.includes('boutique')) return Store;
    return ShoppingBag;
}

const DEFAULT_CIRCULAR_CATEGORIES: CircularCategoryItem[] = [
    {
        label: "Téléphonie",
        slug: "telephonie",
        imageUrl: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?q=80&w=300&auto=format&fit=crop"
    },
    {
        label: "Informatique",
        slug: "informatique",
        imageUrl: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?q=80&w=300&auto=format&fit=crop"
    },
    {
        label: "Mode & Beauté",
        slug: "mode",
        imageUrl: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=300&auto=format&fit=crop"
    },
    {
        label: "Maison & Déco",
        slug: "maison",
        imageUrl: "https://images.unsplash.com/photo-1513694203232-719a280e022f?q=80&w=300&auto=format&fit=crop"
    },
    {
        label: "Électroménager",
        slug: "electromenager",
        imageUrl: "https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?q=80&w=300&auto=format&fit=crop"
    },
    {
        label: "Marchés Locaux",
        slug: "marches-locaux",
        imageUrl: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=300&auto=format&fit=crop"
    },
    {
        label: "Audio & Son",
        slug: "audio",
        imageUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=300&auto=format&fit=crop"
    },
    {
        label: "Alimentation",
        slug: "alimentation",
        imageUrl: "https://images.unsplash.com/photo-1540420773420-3366772f4999?q=80&w=300&auto=format&fit=crop"
    }
];

export function CircularCategoryNav({
    title = "Les Incontournables",
    subtitle,
    categories: manualCategories,
    autoFetch = false,
    className = ""
}: CircularCategoryNavProps) {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [fetchedCategories, setFetchedCategories] = useState<CircularCategoryItem[]>([]);

    const scroll = (direction: 'left' | 'right') => {
        if (scrollContainerRef.current) {
            const amount = scrollContainerRef.current.clientWidth * 0.75;
            scrollContainerRef.current.scrollBy({
                left: direction === 'left' ? -amount : amount,
                behavior: 'smooth'
            });
        }
    };

    useEffect(() => {
        if (manualCategories && manualCategories.length > 0) return;
        if (!autoFetch) return;

        const query = `
            query GetTopCollectionsTree {
                collections(options: { filter: { parentId: { eq: "1" } }, take: 16 }) {
                    items {
                        id
                        name
                        slug
                        featuredAsset { preview }
                    }
                }
            }
        `;

        fetch(getShopApiUrl(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query }),
        })
            .then(res => res.json())
            .then(data => {
                const items = data?.data?.collections?.items || [];
                if (items.length > 0) {
                    setFetchedCategories(items.map((c: any) => ({
                        id: c.id,
                        label: c.name,
                        slug: c.slug,
                        imageUrl: getAssetUrl(c.featuredAsset?.preview)
                    })));
                }
            })
            .catch(err => console.error("Error auto-fetching circular categories", err));
    }, [manualCategories, autoFetch]);

    const displayCats = (manualCategories && manualCategories.length > 0)
        ? manualCategories
        : (fetchedCategories.length > 0 ? fetchedCategories : DEFAULT_CIRCULAR_CATEGORIES);

    return (
        <section className={`w-full my-4 relative group/circ ${className}`}>
            {(title || subtitle) && (
                <div className="flex items-center justify-between mb-3 px-1">
                    <div>
                        {title && (
                            <h2 className="text-lg md:text-xl font-black tracking-tight text-foreground">
                                {title}
                            </h2>
                        )}
                        {subtitle && (
                            <p className="text-xs text-muted-foreground font-medium mt-0.5">
                                {subtitle}
                            </p>
                        )}
                    </div>
                    <div className="hidden sm:flex items-center gap-1.5">
                        <button
                            onClick={() => scroll('left')}
                            className="p-1.5 rounded-full border border-border/60 hover:bg-muted transition-colors text-foreground"
                            aria-label="Défiler à gauche"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => scroll('right')}
                            className="p-1.5 rounded-full border border-border/60 hover:bg-muted transition-colors text-foreground"
                            aria-label="Défiler à droite"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* Desktop Navigation Floating Arrows */}
            <button
                onClick={() => scroll('left')}
                className="hidden md:flex absolute left-[-12px] top-[60%] -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white dark:bg-slate-900 shadow-md border border-border/60 items-center justify-center text-foreground hover:scale-110 opacity-0 group-hover/circ:opacity-100 transition-all cursor-pointer"
                aria-label="Précédent"
            >
                <ChevronLeft className="w-4 h-4" />
            </button>
            <button
                onClick={() => scroll('right')}
                className="hidden md:flex absolute right-[-12px] top-[60%] -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white dark:bg-slate-900 shadow-md border border-border/60 items-center justify-center text-foreground hover:scale-110 opacity-0 group-hover/circ:opacity-100 transition-all cursor-pointer"
                aria-label="Suivant"
            >
                <ChevronRight className="w-4 h-4" />
            </button>

            {/* Horizontal Round Avatars Track */}
            <div
                ref={scrollContainerRef}
                className="flex gap-4 sm:gap-6 md:gap-8 overflow-x-auto pb-2 pt-1 snap-x scrollbar-none no-scrollbar -mx-3 px-3 sm:mx-0 sm:px-0 scroll-smooth items-start md:justify-center"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
                {displayCats.map((cat, idx) => {
                    const rawImg = cat.imageUrl || CATEGORY_FALLBACK_IMAGES[cat.slug];
                    const imgSrc = getAssetUrl(rawImg) || rawImg;
                    const CategoryIcon = getCategoryVectorIcon(cat.label, cat.slug);

                    return (
                        <Link
                            key={cat.id || cat.slug || idx}
                            href={`/collection/${cat.slug}`}
                            className="group/avatar flex flex-col items-center text-center flex-shrink-0 snap-start no-underline select-none"
                            style={{ width: '84px' }}
                        >
                            {/* Circular Avatar Container */}
                            <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 group-hover/avatar:border-primary group-hover/avatar:shadow-md transition-all duration-300 transform group-hover/avatar:scale-105">
                                <div className="w-full h-full rounded-full overflow-hidden bg-slate-50 dark:bg-slate-800 flex items-center justify-center p-0.5 shadow-inner">
                                    {imgSrc ? (
                                        <img
                                            src={imgSrc}
                                            alt={cat.label}
                                            className="w-full h-full object-cover rounded-full group-hover/avatar:scale-110 transition-transform duration-300"
                                            loading="lazy"
                                        />
                                    ) : (
                                        <div className="w-full h-full rounded-full bg-red-50 dark:bg-red-950/40 flex items-center justify-center text-red-600">
                                            <CategoryIcon className="w-7 h-7 sm:w-8 sm:h-8 stroke-[1.75]" />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Label */}
                            <span className="mt-2 block font-bold text-xs sm:text-xs text-foreground group-hover/avatar:text-primary transition-colors line-clamp-1 w-full text-center">
                                {cat.label}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </section>
    );
}

export default CircularCategoryNav;
