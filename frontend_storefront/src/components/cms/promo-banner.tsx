import React from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface PromoBannerProps {
    title?: string;
    description?: string;
    backgroundColor?: string;
    ctaText?: string;
    ctaLink?: string;
    layout?: 'wide' | 'contained';
}

export function PromoBanner({
    title,
    description,
    backgroundColor = 'bg-primary',
    ctaText,
    ctaLink,
    layout = 'wide'
}: PromoBannerProps) {
    const isHexColor = backgroundColor.startsWith('#') || backgroundColor.startsWith('rgb');

    return (
        <section
            className={`w-full py-12 px-8 flex flex-col items-center justify-center text-center overflow-hidden relative group ${!isHexColor ? backgroundColor : ''} ${layout === 'contained' ? 'container mx-auto rounded-[3rem] my-12 shadow-2xl' : ''}`}
            style={isHexColor ? { backgroundColor } : undefined}
        >
            {/* Decorative elements */}
            <div className="absolute top-0 left-0 w-64 h-64 bg-white/10 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl group-hover:scale-110 transition-transform duration-700" />
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-black/10 rounded-full translate-x-1/4 translate-y-1/4 blur-3xl group-hover:scale-110 transition-transform duration-700" />

            <div className="max-w-4xl mx-auto space-y-8 relative z-10 text-white">
                <div className="space-y-4">
                    {title && (
                        <h2 className="text-2xl md:text-4xl font-black tracking-tighter uppercase italic leading-none">
                            {title}
                        </h2>
                    )}
                    {description && (
                        <p className="text-lg font-medium opacity-90 max-w-2xl mx-auto leading-relaxed">
                            {description}
                        </p>
                    )}
                </div>

                {ctaText && ctaLink && (
                    <div className="pt-4">
                        <Button asChild size="lg" variant="secondary" className="rounded-full px-12 py-4 text-lg font-black shadow-2xl hover:scale-105 transition-all bg-white text-black hover:bg-white/95 border-none">
                            <Link href={ctaLink}>
                                {ctaText}
                            </Link>
                        </Button>
                    </div>
                )}
            </div>
        </section>
    );
}
