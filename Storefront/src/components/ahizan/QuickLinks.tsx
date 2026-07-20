"use client";

import { ChevronRight } from "lucide-react";
import { getAssetUrl } from "@/lib/vendure/api-utils";

interface QuickLinksProps {
    promoConfig: any;
}

const isGif = (url: string) => url?.toLowerCase().endsWith('.gif');

export function QuickLinks({ promoConfig }: QuickLinksProps) {
    // Support both old single banner and new multi-banner
    const activeBanners = (promoConfig.promoBanners || [])
        .filter((b: any) => b.isActive !== false);
    // Fallback: if old promoBanner exists but no promoBanners, use the old one
    const showBanners = promoConfig.showPromoBanners !== false && activeBanners.length > 0;
    const showOldBanner = !promoConfig.promoBanners && promoConfig.showPromoBanner !== false && promoConfig.promoBanner;

    if (!showBanners && !showOldBanner) return null;

    return (
        <div className="w-full animate-in fade-in slide-in-from-bottom-2 duration-500 space-y-4">
            {/* ===== PROMOTIONAL BANNERS (MULTI) ===== */}
            {showBanners && activeBanners.map((banner: any) => (
                <BraderieBanner key={banner.id} promoBanner={banner} />
            ))}

            {/* ===== FALLBACK: OLD SINGLE BANNER ===== */}
            {showOldBanner && (
                <BraderieBanner promoBanner={promoConfig.promoBanner} />
            )}
        </div>
    );
}

/* ──────────────── BRADERIE PROMO BANNER ──────────────── */
function BraderieBanner({ promoBanner }: { promoBanner: any }) {
    if (!promoBanner) return null;

    const {
        title = 'LA GRANDE BRADERIE AHIZAN',
        subtitle = "Remises jusqu'à -80% !",
        ctaText = 'PROFITER MAINTENANT',
        ctaLink = '/search',
        bgType = 'color',
        bgColor = '#e31837',
        bgGradient = 'linear-gradient(135deg, #e31837, #b91c1c)',
        bgImageUrl = '',
        bgVideoUrl = '',
        textColor = '#ffffff',
        height = '120px',
        borderRadius = '0px',
        fontSize = '24px',
        fontWeight = '900',
        ctaBgColor = '#ffffff',
        ctaTextColor = '#e31837',
        ctaRadius = '8px',
        showBadge = true,
        badgeText = 'PROMO',
        badgeColor = '#f59e0b',
        animation = 'none',
        padding = '24px 32px',
    } = promoBanner;

    const isBgGif = isGif(bgImageUrl);

    // Build background style — use auto height on phones so content doesn't overflow
    const bgStyle: React.CSSProperties = {
        minHeight: height,
        height: 'auto',
        borderRadius,
        position: 'relative',
        overflow: 'hidden',
        color: textColor,
    };

    if (bgType === 'color') {
        bgStyle.backgroundColor = bgColor;
    } else if (bgType === 'gradient') {
        bgStyle.background = bgGradient || bgStyle.backgroundColor;
    } else if (bgType === 'image' && bgImageUrl && !isBgGif) {
        bgStyle.backgroundImage = `url("${getAssetUrl(bgImageUrl)}")`;
        bgStyle.backgroundSize = 'cover';
        bgStyle.backgroundPosition = 'center';
    }

    return (
        <div className="w-full" style={{ borderRadius }}>
            <div style={bgStyle}>
                {/* Video background */}
                {bgType === 'video' && bgVideoUrl && (
                    <video
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="absolute inset-0 w-full h-full object-cover z-0"
                    >
                        <source src={getAssetUrl(bgVideoUrl)} type="video/mp4" />
                    </video>
                )}

                {/* GIF background */}
                {bgType === 'image' && bgImageUrl && isBgGif && (
                    <img
                        src={getAssetUrl(bgImageUrl)}
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover z-0"
                    />
                )}

                {/* Overlay for image/video */}
                {(bgType === 'image' || bgType === 'video') && (
                    <div className="absolute inset-0 bg-black/40 z-0" />
                )}

                {/* Content */}
                <div
                    className="relative z-10 flex flex-col md:flex-row items-center justify-between h-full gap-2 sm:gap-4 px-3 py-3 sm:px-5 sm:py-4 md:px-8 md:py-6"
                >
                    <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                        {showBadge && (
                            <span
                                className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider text-white flex-shrink-0"
                                style={{ backgroundColor: badgeColor }}
                            >
                                {badgeText}
                            </span>
                        )}
                        <div className="min-w-0 overflow-hidden">
                            <h2
                                className="font-black tracking-tight leading-tight text-xs sm:text-sm md:text-lg truncate"
                                style={{ fontWeight }}
                            >
                                {title}
                            </h2>
                            {subtitle && (
                                <p className="text-[10px] sm:text-sm md:text-base font-semibold opacity-90 mt-0.5">
                                    {subtitle}
                                </p>
                            )}
                        </div>
                    </div>

                    {ctaText && (
                        <a
                            href={ctaLink}
                            className="inline-flex items-center gap-1.5 sm:gap-2 font-black px-3 sm:px-6 py-2 sm:py-3 flex-shrink-0 hover:scale-105 active:scale-95 transition-transform shadow-lg text-[11px] sm:text-sm"
                            style={{
                                backgroundColor: ctaBgColor,
                                color: ctaTextColor,
                                borderRadius: ctaRadius,
                            }}
                        >
                            {ctaText} <ChevronRight className="w-4 h-4" />
                        </a>
                    )}
                </div>
            </div>
        </div>
    );
}
