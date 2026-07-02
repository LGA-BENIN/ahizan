import React, { Suspense } from "react";
import type { Metadata } from 'next';
import Link from "next/link";
import { Toaster } from "@/components/ui/sonner";
import { AhizanNavbar } from "@/components/ahizan/AhizanNavbar";
import { HeaderWrapper } from "@/components/ahizan/HeaderWrapper";
import { AhizanPreloader } from "@/components/ahizan/Preloader";
import { TopFlashBanner } from "@/components/ahizan/TopFlashBanner";
import { MobileCategorySidebar } from "@/components/ahizan/MobileCategorySidebar";
import { MobileBottomNav } from "@/components/ahizan/MobileBottomNav";
import { Footer } from "@/components/layout/footer";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { SITE_NAME, SITE_URL } from "@/lib/metadata";
import { GlobalPopupProvider } from "@/components/cms/global-popup-provider";
import { CookieConsent } from "@/components/ahizan/cookie-consent";
import { ScrollToTop } from "@/components/ahizan/ScrollToTop";
import { PushPermissionManager } from "@/components/ahizan/PushPermissionManager";
import { getPageContent, ThemeSettingsData, FooterConfData, HeaderConfData } from "@/lib/vendure/cms-queries";
import { getBannerApiUrl, getAssetUrl } from "@/lib/vendure/api-utils";
import { getActiveCustomer, getActiveOrder } from "@/lib/vendure/actions";
import { MobileMenuProvider, MobileMenuHeader } from "@/contexts/mobile-menu-context";
import { getTopCollections } from "@/lib/vendure/cached";

// Force dynamic rendering to prevent static generation issues during build
export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
    const homePage = await getPageContent('home');
    const sections = homePage?.sections || [];
    const theme = sections.find(s => s.type === 'THEME_SETTINGS')?.data as ThemeSettingsData;
    
    if (theme?.favicon) {
        const faviconUrl = getAssetUrl(theme.favicon);
        if (faviconUrl) {
            return {
                icons: [
                    {
                        rel: 'icon',
                        url: faviconUrl,
                    },
                    {
                        rel: 'apple-touch-icon',
                        url: faviconUrl,
                    }
                ]
            };
        }
    }
    return {};
}

async function DynamicBranding({ children }: { children: React.ReactNode }) {

    const homePage = await getPageContent('home');
    const sections = homePage?.sections || [];
    const footer = sections.find(s => s.type === 'FOOTER_CONF')?.data as FooterConfData;

    // Because of 'use cache: private', this will now safely wait for a real user request!
    const [customer, order, collectionsTree] = await Promise.all([
        getActiveCustomer(),
        getActiveOrder(),
        getTopCollections()
    ]);
    
    // We only keep the required fields to reduce payload size, same structure as client used to do
    const collections = ((collectionsTree as any[]) || []).map((coll: any) => ({
        id: coll.id,
        name: coll.name,
        slug: coll.slug,
        featuredAsset: coll.featuredAsset,
        children: (coll.children || []).map((child: any) => ({
            id: child.id,
            name: child.name,
            slug: child.slug,
            featuredAsset: child.featuredAsset
        }))
    }));

    const theme = sections.find(s => s.type === 'THEME_SETTINGS')?.data as ThemeSettingsData;
    const flashSection = sections.find(s => s.type === 'FLASH_SALE')?.data;
    let activeFlash = null;
    if (flashSection) {
        if (flashSection.flashVersions && Array.isArray(flashSection.flashVersions)) {
            activeFlash = flashSection.flashVersions.find((v: any) => v.isActive) || flashSection.flashVersions[0];
        } else {
            activeFlash = flashSection;
        }
    }

    let bgType = 'color';
    let bgValue = '#ffffff';

    if (theme?.backgroundType) {
        bgType = theme.backgroundType;
        if (bgType === 'color') bgValue = theme.backgroundColor || '#ffffff';
        else if (bgType === 'image') bgValue = theme.backgroundImageUrl || '';
        else if (bgType === 'video') bgValue = theme.backgroundVideoUrl || '';
    }

    const maxW = theme?.layoutMode === 'full' ? '100%' : theme?.layoutMode === 'wide' ? '1440px' : (theme?.maxWidth || '1280px');

    // Extract font families (remove fallbacks like ", sans-serif")
    const mainFont = theme?.fontFamily?.split(',')[0].replace(/['"]/g, '').trim() || 'Inter';
    const headingFont = theme?.headingFontFamily?.split(',')[0].replace(/['"]/g, '').trim() || mainFont;
    
    // Construct Google Fonts URL for dynamic loading
    const fontsToLoad = Array.from(new Set([mainFont, headingFont]))
        .filter(f => f !== 'system-ui' && f !== 'sans-serif' && f !== 'serif' && f !== 'monospace')
        .map(f => `family=${f.replace(/ /g, '+')}:wght@400;500;600;700;800;900`)
        .join('&');
    const googleFontsUrl = fontsToLoad ? `https://fonts.googleapis.com/css2?${fontsToLoad}&display=swap` : '';

    const headerConfig = sections.find(s => s.type === 'HEADER_CONF')?.data as HeaderConfData;

    const themeStyles = {
        '--primary': theme?.primaryColor || "#0f172a",
        '--brand-primary': theme?.primaryColor || "#0f172a",
        '--brand-secondary': theme?.secondaryColor || "#f59e0b",
        '--accent': theme?.accentColor || "#e31837",
        '--success': theme?.successColor || "#059669",
        '--warning': theme?.warningColor || "#d97706",
        '--danger': theme?.dangerColor || "#dc2626",
        '--background': theme?.backgroundColor || "#ffffff",
        '--surface': theme?.surfaceColor || "#f8fafc",
        '--foreground': theme?.textColor || "#1e293b",
        '--muted-foreground': theme?.textMutedColor || "#64748b",
        '--border': theme?.borderColor || "#e2e8f0",
        '--font-family': theme?.fontFamily || "Inter, sans-serif",
        '--heading-font': theme?.headingFontFamily || theme?.fontFamily || "Inter, sans-serif",
        '--base-font-size': theme?.baseFontSize || "16px",
        '--heading-weight': theme?.headingFontWeight || "800",
        '--body-line-height': theme?.bodyLineHeight || "1.6",
        '--radius': theme?.borderRadius || "8px",
        '--button-radius': theme?.buttonRadius || "8px",
        '--card-radius': theme?.cardRadius || "12px",
        '--input-radius': theme?.inputRadius || "8px",
        '--content-max-width': maxW,
        '--section-spacing': theme?.sectionSpacing || "48px",
        '--container-padding': theme?.containerPadding || "16px",
        '--mobile-nav-offset': (headerConfig?.mobileNavStyle === 'bottom' || headerConfig?.mobileNavStyle === 'both' || !headerConfig?.mobileNavStyle) ? '5rem' : '1.5rem',
    } as React.CSSProperties;

    return (
        <div
            className="flex flex-col min-h-screen relative font-sans overflow-x-clip"
            style={themeStyles}
        >
            {googleFontsUrl && (
                <link rel="stylesheet" href={googleFontsUrl} />
            )}
            <style dangerouslySetInnerHTML={{ __html: `
                :root {
                    --font-family: ${theme?.fontFamily || "Inter, sans-serif"};
                    --heading-font: ${theme?.headingFontFamily || theme?.fontFamily || "Inter, sans-serif"};
                }
                body {
                    font-family: var(--font-family) !important;
                }
                h1, h2, h3, h4, h5, h6 {
                    font-family: var(--heading-font) !important;
                }
            ` }} />
            <NextThemesProvider attribute="class" defaultTheme="light" forcedTheme="light" disableTransitionOnChange>
                <ThemeProvider themeSettings={{
                    defaultProductImage: theme?.defaultProductImage,
                    applyFlashPromoToProducts: (theme as any)?.applyFlashPromoToProducts === true,
                    applyFlashPromoToCollections: (theme as any)?.applyFlashPromoToCollections === true,
                    activeFlashSale: activeFlash
                }}>
                    <MobileMenuProvider>
                    <AhizanPreloader config={{ preloader: theme?.preloader }} />
                    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
                        {bgType === 'color' && (
                            <div className="absolute inset-0" style={{ background: bgValue }} />
                        )}
                        {bgType === 'image' && bgValue && (
                            <div
                                className="absolute inset-0 bg-cover bg-center bg-fixed"
                                style={{ backgroundImage: `url(${getAssetUrl(bgValue)})` }}
                            />
                        )}
                        {bgType === 'video' && bgValue && (
                            <video
                                autoPlay
                                muted
                                loop
                                playsInline
                                key={bgValue}
                                className="absolute min-w-full min-h-full object-cover opacity-60"
                            >
                                <source src={getAssetUrl(bgValue)} type="video/mp4" />
                            </video>
                        )}
                    </div>

                    <MobileMenuHeader>
                        <HeaderWrapper config={headerConfig}>
                            <TopFlashBanner config={headerConfig?.topBar} />
                            <AhizanNavbar
                                config={headerConfig}
                                customer={customer}
                                order={order}
                            />
                        </HeaderWrapper>
                    </MobileMenuHeader>

                    {/* Global mobile category sidebar - available on all pages */}
                    <MobileCategorySidebar categories={collections} />

                    <main className={`relative z-10 flex-grow w-full mx-auto ${(headerConfig?.mobileNavStyle === 'bottom' || headerConfig?.mobileNavStyle === 'both' || !headerConfig?.mobileNavStyle) ? 'pb-16 lg:pb-0' : ''}`}>
                        {children}
                    </main>

                    {(headerConfig?.mobileNavStyle === 'bottom' || headerConfig?.mobileNavStyle === 'both' || !headerConfig?.mobileNavStyle) && (
                        <MobileBottomNav config={headerConfig} customer={customer} order={order} />
                    )}

                    <Footer config={footer} />
                    <Toaster />
                    <Suspense fallback={null}>
                        <GlobalPopupProvider />
                    </Suspense>
                    <CookieConsent config={theme?.cookieConsent} />
                    <ScrollToTop config={theme?.scrollToTop} />
                    <PushPermissionManager
                        authToken={(customer as any)?.authToken}
                        userId={String((customer as any)?.userId || '')}
                        shopApiUrl={process.env.NEXT_PUBLIC_VENDURE_SHOP_API_URL || process.env.NEXT_PUBLIC_SHOP_API_URL || 'https://api.ahizan.com/shop-api'}
                        vapidPublicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''}
                        delaySeconds={theme?.pushNotificationDelay}
                        maxPerDay={theme?.pushNotificationMaxPerDay}
                        intervalMinutes={theme?.pushNotificationInterval}
                    />
                </MobileMenuProvider>
                </ThemeProvider>
            </NextThemesProvider>
        </div>
    );
}

export default function StorefrontLayout({ children }: { children: React.ReactNode }) {
    return (
        <Suspense fallback={
            <div className="flex flex-col min-h-screen relative bg-background">
                <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-background">
                    <div className="flex items-center justify-center" style={{ width: '260px', height: '260px', position: 'relative' }}>
                        {/* Circle spinner around the logo in fallback */}
                        <svg className="preloader-circle-spinner" viewBox="0 0 100 100" style={{
                            position: 'absolute',
                            width: '100%',
                            height: '100%',
                            top: 0,
                            left: 0,
                            pointerEvents: 'none',
                            transformOrigin: 'center center',
                            animation: 'preloader-spin 1.2s linear infinite',
                            opacity: 0.3
                        }}>
                            <circle 
                                cx="50" 
                                cy="50" 
                                r="46" 
                                fill="none" 
                                stroke="#E31E24" 
                                strokeWidth="0.6" 
                                strokeDasharray="132 12"
                                strokeLinecap="round"
                            />
                        </svg>
                        {/* Wrapper for robust animations */}
                        <div style={{
                            width: '70%',
                            height: '70%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transformOrigin: 'center center',
                            position: 'relative',
                            zIndex: 10,
                            animation: 'fallback-pulse 1.6s ease-in-out infinite'
                        }}>
                            <img 
                                src="/logo-ahizan-official.svg" 
                                alt="Ahizan Logo" 
                                style={{ 
                                    width: '100%', 
                                    height: '100%'
                                }} 
                            />
                        </div>
                        <style dangerouslySetInnerHTML={{ __html: `
                            @keyframes fallback-pulse {
                                0% { transform: scale(1); opacity: 0.9; }
                                50% { transform: scale(1.03); opacity: 1; filter: drop-shadow(0 0 12px rgba(227, 30, 36, 0.2)); }
                                100% { transform: scale(1); opacity: 0.9; }
                            }
                            @keyframes preloader-spin {
                                0% { transform: rotate(0deg); }
                                100% { transform: rotate(360deg); }
                            }
                        ` }} />
                    </div>
                </div>
            </div>
        }>
            <DynamicBranding>
                {children}
            </DynamicBranding>
        </Suspense>
    );
}