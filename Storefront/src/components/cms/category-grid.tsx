"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
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
}

const isGif = (url: string | undefined | null) => url?.toLowerCase().endsWith('.gif');

const GET_COLLECTIONS_WITH_ASSETS = `
    query GetCollectionsWithAssets {
        collections(options: { filter: { parentId: { eq: "1" } }, take: 20 }) {
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
}: CategoryGridProps) {

    const [fetchedCategories, setFetchedCategories] = useState<CategoryItem[]>([]);
    const [loading, setLoading] = useState(!manualCategories?.length);

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

    if (loading) {
        return (
            <section className="py-14 container mx-auto px-4">
                <div className="text-center text-muted-foreground">Chargement des collections...</div>
            </section>
        );
    }

    if (!categories || categories.length === 0) return null;

    return (
        <section className="py-14 container mx-auto px-4">
            {(title || description) && (
                <div className="mb-10 text-left">
                    {title && <h2 className="text-2xl md:text-3xl font-black tracking-tight mb-3 uppercase leading-none">{title}</h2>}
                    {description && <p className="text-muted-foreground font-medium text-base max-w-2xl">{description}</p>}
                    <div className="h-1 w-16 bg-primary mt-4 rounded-full" />
                </div>
            )}

            {layout === 'list' ? (
                <div className="space-y-3">
                    {categories.map((cat) => {
                        const isCatGif = isGif(cat.imageUrl);
                        return (
                            <Link key={cat.slug} href={`/collection/${cat.slug}`}
                                className="group flex items-center gap-4 bg-card rounded-xl p-3 shadow-sm hover:shadow-lg transition-all border border-transparent hover:border-muted no-underline text-inherit">
                                <div className="w-16 h-16 flex-shrink-0 overflow-hidden rounded-lg bg-muted relative">
                                    {cat.imageUrl ? (
                                        isCatGif ? (
                                            <img src={cat.imageUrl} alt={cat.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <Image src={cat.imageUrl} alt={cat.name} fill className="object-cover" />
                                        )
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-2xl font-black text-primary/20 bg-primary/5">{cat.name.charAt(0)}</div>
                                    )}
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-bold text-sm group-hover:text-primary transition-colors">{cat.name}</h3>
                                    {cat.productCount != null && <p className="text-xs text-muted-foreground">{cat.productCount} produits</p>}
                                </div>
                            </Link>
                        );
                    })}
                </div>
            ) : (
                <div className={`grid gap-4 md:gap-6 ${categories.length <= 4 ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-6'}`}>
                    {categories.map((cat) => {
                        const isCatGif = isGif(cat.imageUrl);
                        return (
                            <Link key={cat.slug} href={`/collection/${cat.slug}`}
                                className="group flex flex-col items-center text-center space-y-4">
                                <div className="relative w-28 h-28 md:w-36 md:h-36 bg-card rounded-3xl overflow-hidden group-hover:shadow-xl group-hover:-translate-y-2 transition-all duration-500 border border-muted group-hover:border-primary/20 p-1.5">
                                    <div className="relative w-full h-full rounded-2xl overflow-hidden bg-muted">
                                        {cat.imageUrl ? (
                                            isCatGif ? (
                                                <img src={cat.imageUrl} alt={cat.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                            ) : (
                                                <Image src={cat.imageUrl} alt={cat.name} fill className="object-cover group-hover:scale-110 transition-transform duration-700" />
                                            )
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-4xl font-black text-primary/10 bg-primary/5 uppercase">{cat.name.charAt(0)}</div>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <span className="block font-bold text-sm uppercase tracking-wide group-hover:text-primary transition-colors">{cat.name}</span>
                                    {cat.productCount != null && <span className="block text-[10px] text-muted-foreground mt-0.5">{cat.productCount} produits</span>}
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}
        </section>
    );
}
