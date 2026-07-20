import React from 'react';
import Link from 'next/link';

interface PromoItem {
    imageUrl: string;
    link: string;
    title?: string;
    subtitle?: string;
}

interface PromoGridProps {
    title?: string;
    items?: PromoItem[];
    layout?: '2cols' | '3cols' | 'asymmetric';
}

export function PromoGridSection({
    title,
    items = [],
    layout = '2cols',
}: PromoGridProps) {
    if (!items || items.length === 0) return null;

    const gridClass =
        layout === '3cols' ? 'grid-cols-1 md:grid-cols-3' :
        layout === 'asymmetric' ? 'grid-cols-1 md:grid-cols-3' :
        'grid-cols-1 md:grid-cols-2';

    return (
        <section className="container mx-auto px-4 py-10">
            {title && (
                <div className="mb-8">
                    <h2 className="text-2xl md:text-3xl font-black tracking-tight uppercase leading-none">{title}</h2>
                    <div className="h-1 w-16 bg-primary mt-4 rounded-full" />
                </div>
            )}
            <div className={`grid gap-4 ${gridClass}`}>
                {items.map((item, i) => (
                    <Link key={i} href={item.link || '#'}
                        className={`group relative overflow-hidden rounded-2xl ${layout === 'asymmetric' && i === 0 ? 'md:col-span-2 md:row-span-2' : ''}`}>
                        <div className={`relative ${layout === 'asymmetric' && i === 0 ? 'aspect-[2/1] md:aspect-square' : 'aspect-[2/1]'} bg-muted`}>
                            <img src={item.imageUrl} alt={item.title || ''} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                            {(item.title || item.subtitle) && (
                                <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6">
                                    {item.title && <h3 className="text-white font-bold text-lg md:text-xl">{item.title}</h3>}
                                    {item.subtitle && <p className="text-gray-200 text-sm mt-1">{item.subtitle}</p>}
                                </div>
                            )}
                        </div>
                    </Link>
                ))}
            </div>
        </section>
    );
}
