import React from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { PromoBannerData } from '@/lib/vendure/cms-queries';

export function PromoBanner({
    title,
    description,
    backgroundColor = '#f3f4f6', // primary color fallback or tailwind classes
    ctaText,
    ctaLink
}: PromoBannerData) {
    // Determine if backgroundColor is a tailwind class or a hex color
    const isHexColor = backgroundColor.startsWith('#') || backgroundColor.startsWith('rgb');

    return (
        <section
            className={`w-full py-12 px-4 md:px-6 lg:px-8 flex flex-col items-center justify-center text-center ${!isHexColor ? backgroundColor : ''}`}
            style={isHexColor ? { backgroundColor } : undefined}
        >
            <div className="max-w-3xl mx-auto space-y-4">
                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                    {title}
                </h2>

                {description && (
                    <p className="text-lg text-muted-foreground">
                        {description}
                    </p>
                )}

                {ctaText && ctaLink && (
                    <div className="pt-4">
                        <Button asChild size="lg">
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
