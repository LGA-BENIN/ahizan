"use client";

import React, { useState, useEffect } from 'react';
import { ProductCard } from '@/components/commerce/product-card';

interface FlashDealsProps {
    title?: string;
    description?: string;
    endTime: string;
    products: any[];
}

export function FlashDealsSection({ title = "Offres Flash", description, endTime, products }: FlashDealsProps) {
    const [timeLeft, setTimeLeft] = useState<{ h: number, m: number, s: number } | null>(null);

    useEffect(() => {
        const target = new Date(endTime).getTime();

        const timer = setInterval(() => {
            const now = new Date().getTime();
            const difference = target - now;

            if (difference <= 0) {
                clearInterval(timer);
                setTimeLeft({ h: 0, m: 0, s: 0 });
            } else {
                setTimeLeft({
                    h: Math.floor((difference / (1000 * 60 * 60))),
                    m: Math.floor((difference / 1000 / 60) % 60),
                    s: Math.floor((difference / 1000) % 60)
                });
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [endTime]);

    if (!products || products.length === 0) return null;

    return (
        <section className="py-10 bg-muted/30 rounded-[40px] my-12 overflow-hidden border border-border/50 shadow-inner">
            <div className="container mx-auto px-4">
                <div className="flex flex-col md:flex-row justify-between items-center mb-12 gap-8">
                    <div>
                        <div className="flex items-center gap-4 mb-3">
                            <span className="flex h-3 w-3 relative">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                            </span>
                            <h2 className="text-2xl font-black tracking-tighter uppercase italic">{title}</h2>
                        </div>
                        {description && <p className="text-muted-foreground font-medium text-base">{description}</p>}
                    </div>

                    {timeLeft && (
                        <div className="flex gap-4">
                            {[
                                { label: 'Hrs', value: timeLeft.h },
                                { label: 'Min', value: timeLeft.m },
                                { label: 'Sec', value: timeLeft.s }
                            ].map((unit, i) => (
                                <div key={i} className="flex flex-col items-center">
                                    <div className="bg-white px-4 py-2 rounded-2xl shadow-xl border border-border min-w-[60px] text-center transform transition-transform hover:scale-105">
                                        <span className="text-xl font-black text-primary tabular-nums">{unit.value.toString().padStart(2, '0')}</span>
                                    </div>
                                    <span className="text-[10px] font-black uppercase mt-2 tracking-widest text-muted-foreground">{unit.label}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                    {products.map((product) => (
                        <div key={product.id} className="transform transition-transform hover:-translate-y-2">
                            <ProductCard product={product} />
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
