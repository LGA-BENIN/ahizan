import React from 'react';
import Link from 'next/link';

interface FlexGridItem {
    title: string;
    description: string;
    imageUrl?: string;
    link?: string;
}

interface FlexGridProps {
    title?: string;
    template?: 'IMAGE_LEFT' | 'IMAGE_RIGHT' | 'IMAGE_TOP';
    columns?: number;
    items?: FlexGridItem[];
}

export function FlexGrid({
    title,
    template = 'IMAGE_LEFT',
    columns = 3,
    items = []
}: FlexGridProps) {
    if (!items.length) return null;

    const renderItem = (item: FlexGridItem, idx: number) => {
        const isColumn = template === 'IMAGE_TOP';
        const isRight = template === 'IMAGE_RIGHT';

        return (
            <div 
                key={idx} 
                className={`flex gap-6 p-6 rounded-[2.5rem] bg-white/40 backdrop-blur-xl border border-white/60 shadow-sm hover:shadow-xl transition-all duration-500 group relative ${
                    isColumn ? 'flex-col items-center text-center' : 'flex-col sm:flex-row items-center sm:items-start'
                } ${isRight ? 'sm:flex-row-reverse text-right' : 'text-left'}`}
            >
                {item.imageUrl && (
                    <div className={`flex-shrink-0 overflow-hidden rounded-[2rem] bg-muted shadow-inner ${
                        isColumn ? 'w-full aspect-video mb-8' : 'w-full sm:w-1/2 aspect-square mb-6 sm:mb-0'
                    }`}>
                        <img 
                            src={item.imageUrl} 
                            alt={item.title} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                        />
                    </div>
                )}
                <div className={`${!isColumn ? 'sm:w-1/2' : 'w-full'} flex flex-col justify-center`}>
                    <h3 className="text-xl font-black tracking-tight mb-4 uppercase italic leading-none">{item.title}</h3>
                    <p className="text-base text-muted-foreground font-medium leading-relaxed opacity-80">{item.description}</p>
                    {item.link && (
                        <div className="mt-6">
                             <div className="inline-block px-6 py-2 bg-primary text-white font-black uppercase italic text-xs tracking-widest rounded-full">En savoir plus</div>
                        </div>
                    )}
                    {item.link && <Link href={item.link} className="absolute inset-0 z-10" />}
                </div>
            </div>
        );
    };

    return (
        <section className="py-12 container mx-auto px-4">
            {title && (
                <div className="mb-12">
                    <h2 className="text-2xl md:text-3xl font-black tracking-tighter uppercase italic">{title}</h2>
                    <div className="h-1.5 w-16 bg-primary mt-4 rounded-full" />
                </div>
            )}
            <div className={`grid gap-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-${columns}`}>
                {items.map((item, idx) => renderItem(item, idx))}
            </div>
        </section>
    );
}
