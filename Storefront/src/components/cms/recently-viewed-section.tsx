"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface RecentProduct {
    id: string;
    name: string;
    slug: string;
    imageUrl: string;
    price: number;
}

interface RecentlyViewedProps {
    title?: string;
    take?: number;
}

const STORAGE_KEY = 'ahizan_recently_viewed';

function formatCFA(price: number): string {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(price);
}

export function addToRecentlyViewed(product: RecentProduct) {
    if (typeof window === 'undefined') return;
    try {
        const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') as RecentProduct[];
        const filtered = stored.filter(p => p.id !== product.id);
        filtered.unshift(product);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered.slice(0, 20)));
    } catch { }
}

export function RecentlyViewedSection({ title = "Vus récemment", take = 8 }: RecentlyViewedProps) {
    const [products, setProducts] = useState<RecentProduct[]>([]);

    useEffect(() => {
        try {
            const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') as RecentProduct[];
            setProducts(stored.slice(0, take));
        } catch { }
    }, [take]);

    if (products.length === 0) return null;

    return (
        <section className="container mx-auto px-4 py-10">
            <div className="mb-8">
                <h2 className="text-2xl md:text-3xl font-black tracking-tight uppercase leading-none">{title}</h2>
                <div className="h-1 w-16 bg-primary mt-4 rounded-full" />
            </div>
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                {products.map((product) => (
                    <Link key={product.id} href={`/product/${product.slug}`}
                        className="group flex-shrink-0 w-40 bg-white rounded-xl p-3 shadow-sm hover:shadow-lg transition-all border border-transparent hover:border-muted no-underline text-inherit">
                        <div className="aspect-square relative mb-2 overflow-hidden rounded-lg bg-muted">
                            <img src={product.imageUrl} alt={product.name} className="object-cover w-full h-full group-hover:scale-105 transition-transform" />
                        </div>
                        <h3 className="font-bold text-xs truncate">{product.name}</h3>
                        <p className="text-primary font-black text-xs mt-1">{formatCFA(product.price)}</p>
                    </Link>
                ))}
            </div>
        </section>
    );
}
