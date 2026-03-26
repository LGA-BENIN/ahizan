"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { getBannerApiUrl, getAssetUrl } from '@/lib/vendure/api-utils';

interface BannerConfig {
    isActive: boolean;
    type: 'text' | 'image' | 'video';
    targetUrl: string;
    // Text Banner fields
    topText?: string;
    mainText?: string;
    linkText?: string;
    // Image Banner fields
    desktopImageUrl?: string;
    mobileImageUrl?: string;
    // Video Banner fields
    videoUrl?: string;
}

export function TopFlashBanner() {
    const [config, setConfig] = useState<BannerConfig | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Fetch the flat-file config from our new backend REST endpoint
        fetch(getBannerApiUrl('config'))
            .then(res => res.json())
            .then(data => {
                setConfig(data);
                setLoading(false);
            })
            .catch(err => {
                console.error('Error fetching TopFlashBanner config:', err);
                setLoading(false);
            });
    }, []);

    if (loading || !config || !config.isActive) {
        return null;
    }

    if (config.type === 'text') {
        return (
            <div className="w-full bg-[#e31837] text-white py-2 px-4 shadow-sm">
                <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row items-center justify-center gap-3 md:gap-6">
                    {/* Badge */}
                    <span className="bg-white/10 text-white text-[10px] md:text-[11px] font-bold px-3 py-1 rounded-full border border-white/20 tracking-wider whitespace-nowrap">
                        {config.topText || 'OFFRE FLASH'}
                    </span>
                    
                    {/* Main Text */}
                    <p className="text-[12px] md:text-[14px] font-medium text-center md:text-left leading-tight">
                        {config.mainText}
                    </p>

                    {/* CTA Link */}
                    {config.targetUrl && (
                        <Link 
                            href={config.targetUrl} 
                            className="flex items-center gap-1.5 text-[11px] md:text-[13px] font-bold border-b border-white/30 hover:border-white transition-all whitespace-nowrap pb-0.5 group"
                        >
                            {config.linkText || 'En savoir plus'}
                            <span className="group-hover:translate-x-1 transition-transform">→</span>
                        </Link>
                    )}
                </div>
            </div>
        );
    }

    const bannerContent = config.type === 'video' && config.videoUrl ? (
        <div className="w-full h-[45px] md:h-[70px] relative overflow-hidden flex items-center justify-center bg-black">
             <video 
                autoPlay 
                muted 
                loop 
                playsInline 
                className="w-full h-full object-cover"
                key={config.videoUrl}
            >
                <source src={getAssetUrl(config.videoUrl)} />
                Your browser does not support the video tag.
            </video>
        </div>
    ) : (
        <picture className="w-full">
            {/* Desktop Image */}
            {config.desktopImageUrl && (
                <source 
                    media="(min-width: 768px)" 
                    srcSet={getAssetUrl(config.desktopImageUrl)} 
                />
            )}
            {/* Mobile Image (Default) */}
            <img 
                src={getAssetUrl(config.mobileImageUrl || config.desktopImageUrl || '')} 
                alt="Promotion Banner"
                className="w-full h-auto object-cover max-h-[120px] md:max-h-[80px]"
            />
        </picture>
    );

    return (
        <div className="w-full overflow-hidden bg-[#e31837]">
            {config.targetUrl ? (
                <Link href={config.targetUrl} className="block w-full hover:opacity-95 transition-opacity">
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
