"use client";

import React from 'react';
import Link from 'next/link';
import { getAssetUrl } from '@/lib/vendure/api-utils';
import { useMobileMenu } from '@/contexts/mobile-menu-context';

const isGif = (url: string) => url?.toLowerCase().endsWith('.gif');

export function TopFlashBanner({ config }: { config?: any }) {
    const { mobileMenuOpen } = useMobileMenu();

    if (!config || !config.enabled) {
        return null;
    }

    // Hide banner on mobile when menu is open
    if (mobileMenuOpen) {
        return null;
    }

    const {
        text,
        bgColor = '#0f172a',
        textColor = '#ffffff',
        fontSize = '12px',
        height = '36px',
        link,
        animationType = 'none',
        imageUrl,
        displayMode = 'text'
    } = config;

    const isImageGif = isGif(imageUrl);
    const animClass = animationType === 'marquee' ? 'animate-[marquee_15s_linear_infinite] whitespace-nowrap' : animationType === 'fade' ? 'animate-pulse' : '';

    const bannerContent = (
        <div 
            className={`w-full flex items-center justify-center overflow-hidden relative`}
            style={{ 
                backgroundColor: bgColor, 
                color: textColor, 
                fontSize: fontSize, 
                height: height,
                minHeight: height
            }}
        >
            {/* GIF Background */}
            {(displayMode === 'image' || displayMode === 'both') && imageUrl && (
                <>
                    {isImageGif ? (
                        <img 
                            src={getAssetUrl(imageUrl)} 
                            alt="" 
                            className="absolute inset-0 w-full h-full object-cover z-0"
                        />
                    ) : (
                        <div 
                            className="absolute inset-0 w-full h-full z-0"
                            style={{
                                backgroundImage: `url(${getAssetUrl(imageUrl)})`,
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                            }}
                        />
                    )}
                    <div className="absolute inset-0 bg-black/20 z-0" />
                </>
            )}

            {(displayMode === 'text' || displayMode === 'both') && (
                <div className={`max-w-[1400px] mx-auto px-4 w-full text-center font-medium relative z-10 ${animClass}`}>
                    <span dangerouslySetInnerHTML={{ __html: text || '' }} />
                </div>
            )}
        </div>
    );

    return (
        <div className="w-full">
            {link ? (
                <Link href={link} className="block w-full hover:opacity-95 transition-opacity">
                    {bannerContent}
                </Link>
            ) : (
                <div className="block w-full">
                    {bannerContent}
                </div>
            )}
        </div>
    );
}
