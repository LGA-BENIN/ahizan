"use client";

import React, { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { 
    ChevronLeft, ChevronRight, Smartphone, Laptop, Home, 
    Sparkles, ShoppingBag, UtensilsCrossed, Baby, Store 
} from 'lucide-react';
import { getAssetUrl, getShopApiUrl } from '@/lib/vendure/api-utils';
import { AhizanBrandDevice, AhizanCartIcon } from '@/components/shared/AhizanBrandIcons';

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
    // CMS Customization controls
    shape?: 'circle' | 'rounded' | 'square';
    bgSvg?: 'brand-device' | 'cart' | 'custom' | 'none';
    customSvg?: string;
    svgColor?: string;
    svgScale?: number;
    svgOpacity?: number;
    borderWidth?: number;
    borderColor?: string;
    bgColor?: string;
}

const CATEGORY_FALLBACK_IMAGES: Record<string, string> = {
    'service': '/assets/categories/service.jpg',
    'alimentation-a': '/assets/categories/alimentation.jpg',
    'maison-bureau-b': '/assets/categories/maison-bureau.jpg',
    'telephones-tablettes-c': '/assets/categories/telephones-tablettes.jpg',
    'electronique-photo-d': '/assets/categories/electronique-photo.jpg',
    'beaute-hygiene-e': '/assets/categories/beaute-hygiene.jpg',
    'bebes-enfants-f': '/assets/categories/bebes-enfants.jpg',
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
        label: "Service",
        slug: "service",
        imageUrl: "/assets/categories/service.jpg"
    },
    {
        label: "Alimentation",
        slug: "alimentation-a",
        imageUrl: "/assets/categories/alimentation.jpg"
    },
    {
        label: "Maison & Bureau",
        slug: "maison-bureau-b",
        imageUrl: "/assets/categories/maison-bureau.jpg"
    },
    {
        label: "Téléphones & Tablettes",
        slug: "telephones-tablettes-c",
        imageUrl: "/assets/categories/telephones-tablettes.jpg"
    },
    {
        label: "Électronique & Photo",
        slug: "electronique-photo-d",
        imageUrl: "/assets/categories/electronique-photo.jpg"
    },
    {
        label: "Beauté & Hygiène",
        slug: "beaute-hygiene-e",
        imageUrl: "/assets/categories/beaute-hygiene.jpg"
    },
    {
        label: "Bébés & Enfants",
        slug: "bebes-enfants-f",
        imageUrl: "/assets/categories/bebes-enfants.jpg"
    }
];

export function CircularCategoryNav({
    title = "Les Incontournables",
    subtitle,
    categories: manualCategories,
    autoFetch = false,
    className = "",
    shape = 'circle',
    bgSvg = 'brand-device',
    customSvg,
    svgColor = '#DF1B33',
    svgScale = 110,
    svgOpacity = 90,
    borderWidth = 1,
    borderColor = '#E2E8F0',
    bgColor = '#FFFFFF'
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
                    const shapeClass = shape === 'square' ? 'rounded-none' : shape === 'rounded' ? 'rounded-2xl' : 'rounded-full';
                    const scaleVal = (svgScale || 110) / 100;
                    const opacityVal = (svgOpacity ?? 90) / 100;
                    const hasBorder = (borderWidth ?? 1) > 0;

                    return (
                        <Link
                            key={cat.id || cat.slug || idx}
                            href={`/collection/${cat.slug}`}
                            className="group/avatar flex flex-col items-center text-center flex-shrink-0 snap-start no-underline select-none w-[88px] md:w-[114px] lg:w-[124px] py-1"
                        >
                            {/* Avatar Container with Configurable Background Motif */}
                            <div className="relative w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 lg:w-[104px] lg:h-[104px] flex items-center justify-center">
                                {/* Background SVG Motif (Brand Device, Cart, Custom, or None) */}
                                {bgSvg !== 'none' && (
                                    <div 
                                        className="absolute -inset-3 sm:-inset-4 md:-inset-5 z-0 pointer-events-none transition-transform duration-500 ease-out group-hover/avatar:scale-115 group-hover/avatar:rotate-6 flex items-center justify-center"
                                        style={{
                                            transform: `scale(${scaleVal})`,
                                            opacity: opacityVal
                                        }}
                                    >
                                        {bgSvg === 'brand-device' && (
                                            <AhizanBrandDevice className="w-full h-full drop-shadow-sm" color={svgColor || '#DF1B33'} />
                                        )}
                                        {bgSvg === 'cart' && (
                                            <AhizanCartIcon className="w-full h-full drop-shadow-sm" color={svgColor || '#DA2037'} />
                                        )}
                                        {bgSvg === 'custom' && customSvg && (
                                            <div 
                                                className="w-full h-full flex items-center justify-center [&>svg]:w-full [&>svg]:h-full"
                                                style={{ color: svgColor }}
                                                dangerouslySetInnerHTML={{ __html: customSvg }} 
                                            />
                                        )}
                                    </div>
                                )}

                                {/* Image Card Container with Configurable Shape and Border */}
                                <div 
                                    className={`relative z-10 w-full h-full ${shapeClass} p-1 group-hover/avatar:shadow-md transition-all duration-300 transform group-hover/avatar:scale-105`}
                                    style={{
                                        backgroundColor: bgColor || '#FFFFFF',
                                        borderWidth: hasBorder ? `${borderWidth ?? 1}px` : '0px',
                                        borderStyle: hasBorder ? 'solid' : 'none',
                                        borderColor: hasBorder ? (borderColor || '#E2E8F0') : 'transparent',
                                    }}
                                >
                                    <div className={`w-full h-full ${shapeClass} overflow-hidden bg-slate-50 dark:bg-slate-800 flex items-center justify-center p-0.5 shadow-inner`}>
                                        {imgSrc ? (
                                            <img
                                                src={imgSrc}
                                                alt={cat.label}
                                                className={`w-full h-full object-cover ${shapeClass} group-hover/avatar:scale-110 transition-transform duration-300`}
                                                loading="lazy"
                                            />
                                        ) : (
                                            <div className={`w-full h-full ${shapeClass} bg-red-50 dark:bg-red-950/40 flex items-center justify-center text-red-600`}>
                                                <CategoryIcon className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 stroke-[1.75]" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Label */}
                            <span className="mt-2 block font-bold text-xs md:text-sm text-foreground group-hover/avatar:text-primary transition-colors line-clamp-1 w-full text-center">
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
