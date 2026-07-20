"use client";

import { getAssetUrl } from "@/lib/vendure/api-utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface PromoBannerProps {
    promoConfig: any;
}

const isGif = (url: string) => url?.toLowerCase().endsWith('.gif');

export function PromoBanner({ promoConfig }: PromoBannerProps) {
    if (!promoConfig.showPromoBanner) return null;

    const banner = promoConfig.promoBanner;
    const isBgGif = isGif(banner.bgUrl);

    return (
        <div className="rounded-xl overflow-hidden shadow-md animate-in zoom-in-95 duration-700">
            <div 
                className="h-28 md:h-44 flex flex-col md:flex-row items-center justify-between px-6 md:px-16 overflow-hidden relative group cursor-pointer"
                style={{ 
                    backgroundColor: (banner.bgType === 'color' || !banner.bgType) ? (banner.bgColor || '#e31837') : 'transparent',
                    backgroundImage: ((banner.bgType === 'image' || banner.type === 'image') && banner.bgUrl && !isBgGif) ? `url("${getAssetUrl(banner.bgUrl)}")` : 'none',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                }}
            >
                {/* Video Background */}
                {(banner.bgType === 'video' || banner.type === 'video') && banner.bgUrl && (
                    <video autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover z-0">
                        <source src={getAssetUrl(banner.bgUrl)} type="video/mp4" />
                    </video>
                )}

                {/* GIF Background */}
                {(banner.bgType === 'image' || banner.type === 'image') && banner.bgUrl && isBgGif && (
                    <img src={getAssetUrl(banner.bgUrl)} alt="" className="absolute inset-0 w-full h-full object-cover z-0" />
                )}

                {/* Gradient overlay for readability */}
                <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-black/10 z-0" />

                <div className={`relative z-10 flex flex-col items-center md:items-start text-center md:text-left ${
                    banner.textColor === 'black' ? 'text-secondary' : 'text-white'
                }`}>
                    {banner.type !== 'image' && banner.type !== 'video' && (
                        <>
                            <h2 className="text-2xl md:text-4xl font-black tracking-tight drop-shadow-lg">
                                {banner.title}
                            </h2>
                            {banner.subtitle && (
                                <p className="mt-1 text-xs md:text-base font-semibold opacity-90 tracking-tight">
                                    {banner.subtitle}
                                </p>
                            )}
                        </>
                    )}
                </div>

                <div className="relative z-10 mt-4 md:mt-0">
                    {banner.type === 'text' && banner.ctaText && (
                        <Button 
                            variant={banner.textColor === 'black' ? "default" : "secondary"}
                            size="lg"
                            className="px-8 md:px-12 h-10 md:h-12 text-sm md:text-base font-black rounded-xl shadow-lg hover:scale-105 active:scale-95 transition-all duration-200"
                        >
                            {banner.ctaText}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
