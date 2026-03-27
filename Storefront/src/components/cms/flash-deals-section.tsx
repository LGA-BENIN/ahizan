"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface FlashDealProduct {
    id: string;
    name: string;
    slug: string;
    imageUrl?: string;
    price: number;
    originalPrice?: number;
    currencyCode?: string;
}

interface FlashDealsProps {
    title?: string;
    description?: string;
    startAt?: string;
    endAt?: string;
    endTime?: string;
    products?: FlashDealProduct[];
    collectionSlug?: string;
    backgroundColor?: string;
}

function formatCFA(price: number): string {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(price / 100);
}

function useCountdown(endDate: string | undefined) {
    const [timeLeft, setTimeLeft] = useState<{ d: number; h: number; m: number; s: number } | null>(null);
    const [expired, setExpired] = useState(false);

    useEffect(() => {
        if (!endDate) return;
        const target = new Date(endDate).getTime();

        const tick = () => {
            const diff = target - Date.now();
            if (diff <= 0) {
                setExpired(true);
                setTimeLeft({ d: 0, h: 0, m: 0, s: 0 });
                return;
            }
            setTimeLeft({
                d: Math.floor(diff / (1000 * 60 * 60 * 24)),
                h: Math.floor((diff / (1000 * 60 * 60)) % 24),
                m: Math.floor((diff / (1000 * 60)) % 60),
                s: Math.floor((diff / 1000) % 60),
            });
        };

        tick();
        const timer = setInterval(tick, 1000);
        return () => clearInterval(timer);
    }, [endDate]);

    return { timeLeft, expired };
}

export function FlashDealsSection({
    title = "Offres Flash ⚡",
    description,
    startAt,
    endAt,
    endTime,
    products,
    backgroundColor,
}: FlashDealsProps) {
    const resolvedEnd = endAt || endTime;
    const { timeLeft, expired } = useCountdown(resolvedEnd);

    if (startAt && new Date(startAt).getTime() > Date.now()) return null;
    if (expired) return null;
    if (!products || products.length === 0) return null;

    return (
        <section className="py-10 my-8 rounded-2xl overflow-hidden border border-red-200/50"
            style={{ backgroundColor: backgroundColor || '#FEF2F2' }}>
            <div className="container mx-auto px-4">
                <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <span className="flex h-3 w-3 relative">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                            </span>
                            <h2 className="text-2xl font-black tracking-tight uppercase">{title}</h2>
                        </div>
                        {description && <p className="text-muted-foreground font-medium text-sm">{description}</p>}
                    </div>

                    {timeLeft && (
                        <div className="flex gap-2">
                            {[
                                { label: 'J', value: timeLeft.d },
                                { label: 'H', value: timeLeft.h },
                                { label: 'M', value: timeLeft.m },
                                { label: 'S', value: timeLeft.s },
                            ].map((unit, i) => (
                                <div key={i} className="flex flex-col items-center">
                                    <div className="bg-white px-3 py-1.5 rounded-xl shadow-md border border-border min-w-[48px] text-center">
                                        <span className="text-lg font-black text-red-600 tabular-nums">{unit.value.toString().padStart(2, '0')}</span>
                                    </div>
                                    <span className="text-[9px] font-bold uppercase mt-1 tracking-widest text-muted-foreground">{unit.label}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                    {products.map((product) => {
                        if (!product.slug) {
                            console.warn(`[FlashDeals] Product ${product.name} (ID: ${product.id}) is missing a slug!`);
                        }
                        return (
                            <Link key={product.id} href={`/product/${product.slug}`}
                                className="group bg-white rounded-xl p-3 shadow-sm hover:shadow-lg transition-all border border-transparent hover:border-red-200 no-underline text-inherit">
                            <div className="aspect-square relative mb-3 overflow-hidden rounded-lg bg-muted">
                                {product.imageUrl && (
                                    <img src={product.imageUrl} alt={product.name} className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500" />
                                )}
                                {product.originalPrice && product.originalPrice > product.price && (
                                    <span className="absolute top-2 left-2 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                                        -{Math.round((1 - product.price / product.originalPrice) * 100)}%
                                    </span>
                                )}
                            </div>
                            <h3 className="font-bold text-xs truncate mb-1">{product.name}</h3>
                            <div className="flex items-center gap-2">
                                <span className="text-red-600 font-black text-sm">{formatCFA(product.price)}</span>
                                {product.originalPrice && product.originalPrice > product.price && (
                                    <span className="text-muted-foreground line-through text-xs">{formatCFA(product.originalPrice)}</span>
                                )}
                            </div>
                        </Link>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
