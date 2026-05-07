"use client";

import React from 'react';
import Link from 'next/link';

export function TopFlashBanner({ config }: { config?: any }) {
    if (!config || !config.enabled) {
        return null;
    }

    const {
        text,
        bgColor = '#0f172a',
        textColor = '#ffffff',
        fontSize = '12px',
        height = '36px',
        link,
        animationType = 'none'
    } = config;

    const bannerContent = (
        <div 
            className={`w-full flex items-center justify-center overflow-hidden`}
            style={{ 
                backgroundColor: bgColor, 
                color: textColor, 
                fontSize: fontSize, 
                height: height,
                minHeight: height
            }}
        >
            <div className={`max-w-[1400px] mx-auto px-4 w-full text-center font-medium
                ${animationType === 'marquee' ? 'animate-[marquee_15s_linear_infinite] whitespace-nowrap' : ''}
                ${animationType === 'fade' ? 'animate-pulse' : ''}
            `}>
                <span dangerouslySetInnerHTML={{ __html: text || '' }} />
            </div>
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
