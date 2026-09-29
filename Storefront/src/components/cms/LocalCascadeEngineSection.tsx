'use client';

import React from 'react';
import { LocalPersonalizedProducts } from './LocalPersonalizedProducts';
import { useLocation } from '@/contexts/location-context';
import { interpolateLocalVariables } from '@/lib/cms/interpolation';
import { getAssetUrl } from '@/lib/vendure/api-utils';

interface LocalCascadeEngineSectionProps {
    config?: any;
}

export function LocalCascadeEngineSection({ config = {} }: LocalCascadeEngineSectionProps) {
    const { selectedLocation } = useLocation();

    // Dynamically interpolate tokens in titles and subtitles
    const rawTitle = config.title || 'Offres & Boutiques à {{position}}';
    const rawSubtitle = config.subtitle || 'Sélection en direct des vendeurs et marchés à proximité immédiate de {{position}}';
    const rawBadgeText = config.badgeText || 'Zone Active • {{position}}';

    const interpolatedTitle = interpolateLocalVariables(rawTitle, selectedLocation);
    const interpolatedSubtitle = interpolateLocalVariables(rawSubtitle, selectedLocation);
    const interpolatedBadgeText = interpolateLocalVariables(rawBadgeText, selectedLocation);

    const bgImage = config.bgImage ? getAssetUrl(config.bgImage) : null;
    const overlayOpacity = config.bgImageOverlayOpacity !== undefined ? Number(config.bgImageOverlayOpacity) : 40;

    const mergedConfig = {
        ...config,
        title: interpolatedTitle,
        subtitle: interpolatedSubtitle,
        badgeText: interpolatedBadgeText,
    };

    return (
        <section
            className="w-full relative overflow-hidden transition-all duration-300"
            style={{
                backgroundColor: config.backgroundColor || 'transparent',
                backgroundImage: config.gradientBackground || undefined,
            }}
        >
            {bgImage && (
                <div
                    className="absolute inset-0 pointer-events-none bg-cover bg-center z-0 transition-opacity duration-300"
                    style={{
                        backgroundImage: `url('${bgImage}')`,
                        opacity: (100 - overlayOpacity) / 100,
                    }}
                />
            )}

            <div className="relative z-10">
                <LocalPersonalizedProducts config={mergedConfig} />
            </div>
        </section>
    );
}
