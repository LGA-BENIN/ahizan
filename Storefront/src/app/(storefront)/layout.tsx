import React, { Suspense } from "react";
import type { Metadata } from 'next';
import Link from "next/link";
import { Toaster } from "@/components/ui/sonner";
import { AhizanNavbar } from "@/components/ahizan/AhizanNavbar";
import { AhizanPreloader } from "@/components/ahizan/Preloader";
import { TopFlashBanner } from "@/components/ahizan/TopFlashBanner";
import { Footer } from "@/components/layout/footer";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { SITE_NAME, SITE_URL } from "@/lib/metadata";
import { GlobalPopupProvider } from "@/components/cms/global-popup-provider";
import { CookieConsent } from "@/components/ahizan/cookie-consent";
import { getPageContent, ThemeSettingsData, FooterConfData, HeaderConfData } from "@/lib/vendure/cms-queries";
import { getBannerApiUrl, getAssetUrl } from "@/lib/vendure/api-utils";
import { getActiveCustomer, getActiveOrder } from "@/lib/vendure/actions";

// Force dynamic rendering to prevent static generation issues during build
export const dynamic = 'force-dynamic';

async function DynamicBranding({ children }: { children: React.ReactNode }) {

    const homePage = await getPageContent('home');
    const sections = homePage?.sections || [];
    const footer = sections.find(s => s.type === 'FOOTER_CONF')?.data as FooterConfData;

    // Because of 'use cache: private', this will now safely wait for a real user request!
    const [customer, order] = await Promise.all([
        getActiveCustomer(),
        getActiveOrder()
    ]);

    const theme = sections.find(s => s.type === 'THEME_SETTINGS')?.data as ThemeSettingsData;

    let bgType = 'color';
    let bgValue = '#ffffff';

    if (theme?.backgroundType) {
        bgType = theme.backgroundType;
        if (bgType === 'color') bgValue = theme.backgroundColor || '#ffffff';
        else if (bgType === 'image') bgValue = theme.backgroundImageUrl || '';
        else if (bgType === 'video') bgValue = theme.backgroundVideoUrl || '';
    }

    const headerConfig = sections.find(s => s.type === 'HEADER_CONF')?.data as HeaderConfData;

    const maxW = theme?.layoutMode === 'full' ? '100%' : theme?.layoutMode === 'wide' ? '1440px' : (theme?.maxWidth || '1280px');
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
    } as React.CSSProperties;

    return (
        <div
            className="flex flex-col min-h-screen relative overflow-x-hidden"
            style={themeStyles}
        >
            <ThemeProvider themeSettings={{ defaultProductImage: theme?.defaultProductImage }}>
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

                <div className="sticky top-0 z-50 w-full shadow-sm">
                    <TopFlashBanner config={headerConfig?.topBar} />
                    <AhizanNavbar 
                        config={headerConfig} 
                        customer={customer}
                        order={order}
                    />
                </div>

                <main className="relative z-10 flex-grow w-full mx-auto">
                    {children}
                </main>

                <Footer config={footer} />
                <Toaster />
                <Suspense fallback={null}>
                    <GlobalPopupProvider />
                </Suspense>
                <CookieConsent config={theme?.cookieConsent} />
            </ThemeProvider>
        </div>
    );
}

export default function StorefrontLayout({ children }: { children: React.ReactNode }) {
    return (
        <Suspense fallback={
            <div className="flex flex-col min-h-screen relative">
                <div className="fixed inset-0 flex items-center justify-center bg-background z-[9999]">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-900"></div>
                </div>
            </div>
        }>
            <DynamicBranding>
                {children}
            </DynamicBranding>
        </Suspense>
    );
}