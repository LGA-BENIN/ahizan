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
        mobileImageUrl,
        displayMode = 'text'
    } = config;

    const desktopImage = imageUrl;
    const mobileImage = mobileImageUrl || imageUrl;

    const hasImageOrGif = (displayMode === 'image' || displayMode === 'both') && (!!desktopImage || !!mobileImage);
    const bannerHeight = hasImageOrGif ? (config.imageHeight || '60px') : (height || '36px');
    const animClass = animationType === 'marquee' ? 'animate-[marquee_15s_linear_infinite] whitespace-nowrap' : animationType === 'fade' ? 'animate-pulse' : '';

    const renderMedia = (url: string, className: string) => {
        if (!url) return null;
        const isImageGif = isGif(url);
        return (
            <div className={`absolute inset-0 w-full h-full z-0 ${className}`}>
                {isImageGif ? (
                    <img 
                        src={getAssetUrl(url)} 
                        alt="" 
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div 
                        className="w-full h-full"
                        style={{
                            backgroundImage: `url(${getAssetUrl(url)})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                        }}
                    />
                )}
            </div>
        );
    };

    const bannerContent = (
        <div 
            className={`w-full flex items-center justify-center overflow-hidden relative`}
            style={{ 
                backgroundColor: bgColor, 
                color: textColor, 
                fontSize: fontSize, 
                height: bannerHeight,
                minHeight: bannerHeight
            }}
        >
            {/* Background Media (Desktop & Mobile) */}
            {(displayMode === 'image' || displayMode === 'both') && (
                <>
                    {mobileImageUrl ? (
                        <>
                            {renderMedia(desktopImage, 'hidden md:block')}
                            {renderMedia(mobileImage, 'block md:hidden')}
                        </>
                    ) : (
                        renderMedia(desktopImage, 'block')
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
