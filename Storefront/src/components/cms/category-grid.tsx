"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getShopApiUrl, getAssetUrl } from '@/lib/vendure/api-utils';

interface CategoryItem {
    name: string;
    slug: string;
    imageUrl?: string;
    productCount?: number;
}

interface CategoryGridProps {
    title?: string;
    description?: string;
    layout?: 'grid' | 'carousel' | 'list';
    categories?: CategoryItem[];
    take?: number;
    autoplaySpeed?: number | string;
    cardStyle?: string;
    columnsDesktop?: number;
}

const isGif = (url: string | undefined | null) => url?.toLowerCase().endsWith('.gif');

const GET_COLLECTIONS_WITH_ASSETS = `
    query GetCollectionsWithAssets {
        collections(options: { filter: { parentId: { eq: "1" } }, take: 30 }) {
            items {
                id
                name
                slug
                featuredAsset { preview }
                productVariants { totalItems }
            }
        }
    }
`;

async function fetchCollectionsClient(): Promise<CategoryItem[]> {
    try {
        const shopApiUrl = getShopApiUrl();
        const res = await fetch(shopApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: GET_COLLECTIONS_WITH_ASSETS }),
        });
        const data = await res.json();
        return (data?.data?.collections?.items || []).map((c: any) => ({
            name: c.name,
            slug: c.slug,
            imageUrl: getAssetUrl(c.featuredAsset?.preview) || null,
            productCount: c.productVariants?.totalItems ?? 0,
        }));
    } catch (e) {
        console.error("[CATEGORY_GRID] Failed to fetch collections", e);
        return [];
    }
}

export function CategoryGrid({
    title = "Nos Collections",
    description,
    layout = 'grid',
    categories: manualCategories,
    take = 12,
    autoplaySpeed = 0,
    cardStyle = 'standard',
    columnsDesktop = 6,
}: CategoryGridProps) {

    const [fetchedCategories, setFetchedCategories] = useState<CategoryItem[]>([]);
    const [loading, setLoading] = useState(!manualCategories?.length);
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

    useEffect(() => {
        if (!manualCategories?.length) {
            setLoading(true);
            fetchCollectionsClient().then(cats => {
                setFetchedCategories(cats);
                setLoading(false);
            });
        }
    }, [manualCategories]);

    let categories = manualCategories?.length ? manualCategories : fetchedCategories;
    if (take && categories.length > take) categories = categories.slice(0, take);

    // Carousel Autoplay
    useEffect(() => {
        const speed = Number(autoplaySpeed || 0);
        if (layout !== 'carousel' || speed <= 0) return;

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
    }, [layout, autoplaySpeed]);

    if (loading) {
        return (
            <section className="py-8 md:py-12 container mx-auto px-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="flex flex-col items-center gap-3">
                            <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-3xl bg-muted/60 animate-pulse" />
                            <div className="w-20 h-4 rounded bg-muted/60 animate-pulse" />
                        </div>
                    ))}
                </div>
            </section>
        );
    }

    if (!categories || categories.length === 0) return null;

    return (
        <section className="py-8 md:py-12 container mx-auto px-4">
            {(title || description) && (
                <div className="mb-6 md:mb-8 text-left">
                    {title && <h2 className="text-xl md:text-3xl font-black tracking-tight mb-2 uppercase leading-none">{title}</h2>}
                    {description && <p className="text-muted-foreground font-medium text-xs sm:text-sm max-w-2xl">{description}</p>}
                    <div className="h-1 w-14 bg-primary mt-3 rounded-full" />
                </div>
            )}

            {layout === 'list' ? (
                <div className="space-y-3">
                    {categories.map((cat) => {
                        const isCatGif = isGif(cat.imageUrl);
                        return (
                            <Link 
                                key={cat.slug} 
                                href={`/collection/${cat.slug}`}
                                className="group flex items-center gap-4 bg-card rounded-2xl p-3.5 shadow-sm hover:shadow-md transition-all border border-border/50 hover:border-primary/30 no-underline text-inherit"
                            >
                                <div className="w-16 h-16 flex-shrink-0 overflow-hidden rounded-xl bg-muted relative">
                                    {cat.imageUrl ? (
                                        isCatGif ? (
                                            <img src={cat.imageUrl} alt={cat.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                        ) : (
                                            <Image src={cat.imageUrl} alt={cat.name} fill className="object-cover group-hover:scale-110 transition-transform duration-500" />
                                        )
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-2xl font-black text-primary/20 bg-primary/5">{cat.name.charAt(0)}</div>
                                    )}
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-bold text-sm group-hover:text-primary transition-colors">{cat.name}</h3>
                                    {cat.productCount != null && <p className="text-xs text-muted-foreground mt-0.5">{cat.productCount} produits</p>}
                                </div>
                            </Link>
                        );
                    })}
                </div>
            ) : layout === 'carousel' ? (
                <div className="relative group/carousel">
                    {/* Left Flanking Arrow */}
                    <button 
                        onClick={() => scroll('left')}
                        className="absolute left-[-14px] top-1/2 -translate-y-1/2 z-20 bg-white dark:bg-slate-800 shadow-xl rounded-full p-2.5 border border-border/60 text-foreground hover:bg-muted hover:scale-110 transition-all opacity-0 group-hover/carousel:opacity-100 hidden md:flex items-center justify-center cursor-pointer"
                        aria-label="Défiler vers la gauche"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>

                    {/* Right Flanking Arrow */}
                    <button 
                        onClick={() => scroll('right')}
                        className="absolute right-[-14px] top-1/2 -translate-y-1/2 z-20 bg-white dark:bg-slate-800 shadow-xl rounded-full p-2.5 border border-border/60 text-foreground hover:bg-muted hover:scale-110 transition-all opacity-0 group-hover/carousel:opacity-100 hidden md:flex items-center justify-center cursor-pointer"
                        aria-label="Défiler vers la droite"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>

                    {/* Horizontal Scrollable Row */}
                    <div 
                        ref={scrollContainerRef}
                        className="flex gap-4 md:gap-6 overflow-x-auto pb-4 pt-1 snap-x scrollbar-none no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 scroll-smooth items-stretch"
                    >
                        {categories.map((cat) => {
                            const isCatGif = isGif(cat.imageUrl);
                            return (
                                <div key={cat.slug} className="min-w-[130px] sm:min-w-[160px] md:min-w-[180px] max-w-[200px] flex-shrink-0 snap-start">
                                    <Link 
                                        href={`/collection/${cat.slug}`}
                                        className="group flex flex-col items-center text-center space-y-3 p-2 rounded-2xl hover:bg-muted/30 transition-all no-underline text-inherit"
                                    >
                                        <div className="relative w-28 h-28 sm:w-32 sm:h-32 md:w-36 md:h-36 bg-card rounded-3xl overflow-hidden group-hover:shadow-xl group-hover:-translate-y-1.5 transition-all duration-300 border border-border/60 group-hover:border-primary/40 p-1.5 shadow-sm">
                                            <div className="relative w-full h-full rounded-2xl overflow-hidden bg-muted">
                                                {cat.imageUrl ? (
                                                    isCatGif ? (
                                                        <img src={cat.imageUrl} alt={cat.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                                    ) : (
                                                        <Image src={cat.imageUrl} alt={cat.name} fill className="object-cover group-hover:scale-110 transition-transform duration-500" />
                                                    )
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-3xl font-black text-primary/20 bg-primary/5 uppercase">
                                                        {cat.name.charAt(0)}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div>
                                            <span className="block font-bold text-xs sm:text-sm uppercase tracking-wide group-hover:text-primary transition-colors line-clamp-1">
                                                {cat.name}
                                            </span>
                                            {cat.productCount != null && (
                                                <span className="inline-block text-[10px] font-semibold text-muted-foreground mt-0.5 px-2 py-0.5 rounded-full bg-muted/60">
                                                    {cat.productCount} articles
                                                </span>
                                            )}
                                        </div>
                                    </Link>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : (
                <div className={`grid gap-4 md:gap-6 ${categories.length <= 4 ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6'}`}>
                    {categories.map((cat) => {
                        const isCatGif = isGif(cat.imageUrl);
                        return (
                            <Link 
                                key={cat.slug} 
                                href={`/collection/${cat.slug}`}
                                className="group flex flex-col items-center text-center space-y-3 p-2 rounded-2xl hover:bg-muted/30 transition-all no-underline text-inherit"
                            >
                                <div className="relative w-28 h-28 sm:w-32 sm:h-32 md:w-36 md:h-36 bg-card rounded-3xl overflow-hidden group-hover:shadow-xl group-hover:-translate-y-1.5 transition-all duration-300 border border-border/60 group-hover:border-primary/40 p-1.5 shadow-sm">
                                    <div className="relative w-full h-full rounded-2xl overflow-hidden bg-muted">
                                        {cat.imageUrl ? (
                                            isCatGif ? (
                                                <img src={cat.imageUrl} alt={cat.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                            ) : (
                                                <Image src={cat.imageUrl} alt={cat.name} fill className="object-cover group-hover:scale-110 transition-transform duration-500" />
                                            )
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-3xl font-black text-primary/20 bg-primary/5 uppercase">
                                                {cat.name.charAt(0)}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <span className="block font-bold text-xs sm:text-sm uppercase tracking-wide group-hover:text-primary transition-colors line-clamp-1">
                                        {cat.name}
                                    </span>
                                    {cat.productCount != null && (
                                        <span className="inline-block text-[10px] font-semibold text-muted-foreground mt-0.5 px-2 py-0.5 rounded-full bg-muted/60">
                                            {cat.productCount} articles
                                        </span>
                                    )}
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}
        </section>
    );
}

export default CategoryGrid;
