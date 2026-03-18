import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { cacheLife } from "next/cache";
import { query } from "@/lib/vendure/api";
import { GetTopCollectionsQuery } from "@/lib/vendure/queries";

interface CategoryItem {
    name: string;
    slug: string;
    imageUrl?: string;
}

interface CategoryGridProps {
    title?: string;
    description?: string;
    categories?: CategoryItem[];
}

async function getTopCollections() {
    'use cache'
    cacheLife('days')
    try {
        const result = await query(GetTopCollectionsQuery);
        return result.data.collections.items.map((c: any) => ({
            name: c.name,
            slug: c.slug,
            imageUrl: c.featuredAsset?.preview
        }));
    } catch (e) {
        console.error("Failed to fetch top collections", e);
        return [];
    }
}

export async function CategoryGrid({
    title = "Nos Collections",
    description = "Découvrez nos univers produits soigneusement sélectionnés",
    categories: manualCategories
}: CategoryGridProps) {

    // Resolve categories: either manual list or fetch top collections
    const categories = manualCategories?.length ? manualCategories : (await getTopCollections());

    if (!categories || categories.length === 0) return null;

    return (
        <section className="py-20 container mx-auto px-4">
            {(title || description) && (
                <div className="mb-14 text-center max-w-3xl mx-auto">
                    {title && <h2 className="text-4xl md:text-5xl font-black tracking-tighter mb-4 italic uppercase leading-none">{title}</h2>}
                    {description && <p className="text-muted-foreground font-medium text-lg md:text-xl leading-relaxed">{description}</p>}
                    <div className="h-1.5 w-32 bg-primary mx-auto mt-8 rounded-full shadow-lg shadow-primary/20" />
                </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 md:gap-10">
                {categories.map((category) => (
                    <Link
                        key={category.slug}
                        href={`/search?collection=${category.slug}`}
                        className="group flex flex-col items-center text-center space-y-6"
                    >
                        <div className="relative w-32 h-32 md:w-44 md:h-44 bg-white rounded-[3.5rem] overflow-hidden group-hover:shadow-[0_20px_50px_rgba(0,0,0,0.15)] group-hover:shadow-primary/10 group-hover:-translate-y-3 transition-all duration-700 border border-muted group-hover:border-primary/20 p-2">
                            <div className="relative w-full h-full rounded-[2.8rem] overflow-hidden bg-muted">
                                {category.imageUrl ? (
                                    <Image
                                        src={category.imageUrl}
                                        alt={category.name}
                                        fill
                                        className="object-cover group-hover:scale-110 transition-transform duration-1000"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-5xl font-black text-primary/10 bg-primary/5 uppercase">
                                        {category.name.charAt(0)}
                                    </div>
                                )}
                            </div>
                            <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        </div>
                        <div className="space-y-1">
                            <span className="block font-black text-base uppercase tracking-widest group-hover:text-primary transition-colors duration-300">{category.name}</span>
                            <span className="block text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">Voir plus</span>
                        </div>
                    </Link>
                ))}
            </div>
        </section>
    );
}
