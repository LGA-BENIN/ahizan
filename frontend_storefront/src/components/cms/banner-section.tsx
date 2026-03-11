import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface BannerItem {
    imageUrl: string;
    link?: string;
    title?: string;
    subtitle?: string;
}

interface BannerSectionProps {
    title?: string;
    description?: string;
    layout?: 'carousel' | 'grid' | 'single';
    banners?: BannerItem[];
    // Single banner fallback props
    imageUrl?: string;
    link?: string;
    subtitle?: string;
}

export function BannerSection({
    title,
    description,
    layout = 'single',
    banners,
    imageUrl,
    link,
    subtitle,
    ctaText = "Découvrir",
    backgroundColor = "transparent"
}: BannerSectionProps & { ctaText?: string, backgroundColor?: string }) {
    // Determine the items to render
    const items: BannerItem[] = banners || (imageUrl ? [{ imageUrl, link, title: title || "", subtitle: subtitle || "" }] : []);

    if (items.length === 0) return null;

    const isHexColor = backgroundColor.startsWith('#') || backgroundColor.startsWith('rgb');

    const renderBanner = (banner: BannerItem, isSingle: boolean) => (
        <div
            key={banner.imageUrl}
            className={`relative w-full ${isSingle ? 'aspect-[21/9] min-h-[400px]' : 'aspect-square'} overflow-hidden rounded-[2rem] group/banner shadow-xl border border-muted`}
            style={isHexColor ? { backgroundColor } : undefined}
        >
            <Image
                src={banner.imageUrl}
                alt={banner.title || "Banner"}
                fill
                className="object-cover transition-transform duration-1000 group-hover/banner:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent flex flex-col justify-center px-8 md:px-20 text-white text-left">
                <div className="max-w-2xl space-y-4">
                    {banner.title && <h2 className="text-3xl md:text-6xl font-black mb-2 tracking-tighter uppercase italic leading-none">{banner.title}</h2>}
                    {banner.subtitle && <p className="text-sm md:text-xl font-medium opacity-90 mb-6 leading-relaxed max-w-lg">{banner.subtitle}</p>}
                    {(banner.link || ctaText) && (
                        <Button asChild size="lg" className="w-fit rounded-full px-10 py-7 text-lg font-black bg-white text-black hover:bg-white/90 border-none transition-all hover:scale-105 shadow-2xl">
                            <Link href={banner.link || '#'}>{ctaText}</Link>
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );

    return (
        <section className={`container mx-auto px-4 py-16 ${!isHexColor ? backgroundColor : ''}`} style={isHexColor ? { backgroundColor } : undefined}>
            {(title || description) && layout !== 'single' && (
                <div className="mb-12 max-w-3xl">
                    {title && <h2 className="text-4xl font-black tracking-tighter mb-4 uppercase italic">{title}</h2>}
                    {description && <p className="text-muted-foreground font-medium text-lg leading-relaxed">{description}</p>}
                    <div className="h-1.5 w-24 bg-primary mt-6 rounded-full" />
                </div>
            )}

            {items.length === 1 || layout === 'single' ? (
                renderBanner(items[0], true)
            ) : (
                <div className={`grid gap-8 ${layout === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
                    {items.map(item => renderBanner(item, false))}
                </div>
            )}
        </section>
    );
}
