import React, { Suspense } from "react";
import type { Metadata, Viewport } from 'next';
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { AhizanNavbar } from "@/components/ahizan/AhizanNavbar";
import { AhizanPreloader } from "@/components/ahizan/Preloader";
import { TopFlashBanner } from "@/components/ahizan/TopFlashBanner";
import { Footer } from "@/components/layout/footer";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { SITE_NAME, SITE_URL } from "@/lib/metadata";
import { GlobalPopupProvider } from "@/components/cms/global-popup-provider";
import { getPageContent, ThemeSettingsData, FooterConfData } from "@/lib/vendure/cms-queries";
import { getBannerApiUrl, getAssetUrl } from "@/lib/vendure/api-utils";
import { getActiveCustomer, getActiveOrder } from "@/lib/vendure/actions";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    metadataBase: new URL(SITE_URL),
    title: {
        default: SITE_NAME,
        template: `%s | ${SITE_NAME}`,
    },
    description:
        "Shop the best products at Vendure Store. Quality products, competitive prices, and fast delivery.",
    openGraph: {
        type: "website",
        siteName: SITE_NAME,
        locale: "en_US",
    },
    twitter: {
        card: "summary_large_image",
    },
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            "max-video-preview": -1,
            "max-image-preview": "large",
            "max-snippet": -1,
        },
    },
};

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
    themeColor: [
        { media: "(prefers-color-scheme: light)", color: "#ffffff" },
        { media: "(prefers-color-scheme: dark)", color: "#000000" },
    ],
};

/**
 * Component that handles the dynamic background and preloader based on CMS and Banner configs.
 * Moved to a separate component to be wrapped in Suspense, avoiding the "Blocking Route" error.
 */
async function DynamicBranding({ children, footer }: { children: React.ReactNode; footer: FooterConfData }) {
    const homePage = await getPageContent('home');
    const sections = homePage?.sections || [];

    // Fetch user and cart data
    const [customer, order] = await Promise.all([
        getActiveCustomer(),
        getActiveOrder()
    ]);

    // Fetch our General Config for Branding & System
    let generalConfig: any = null;
    try {
        const res = await fetch(getBannerApiUrl('general-config'), { 
            cache: 'no-store'
        });
        generalConfig = await res.json();
    } catch (e) {
        console.error("Failed to fetch general config in DynamicBranding:", e);
    }

    const theme = sections.find(s => s.type === 'THEME_SETTINGS')?.data as ThemeSettingsData;

    // --- Robust Background Selection ---
    let bgType = 'color';
    let bgValue = '#ffffff';

    // 1. Check General Config (Banner Manager) - HIGHEST PRIORITY
    if (generalConfig?.background?.type && generalConfig?.background?.value) {
        bgType = generalConfig.background.type;
        bgValue = generalConfig.background.value;
    } 
    // 2. Fallback to Theme Settings (CMS Plugin)
    else if (theme?.backgroundType) {
        bgType = theme.backgroundType;
        if (bgType === 'color') bgValue = theme.backgroundColor || '#ffffff';
        else if (bgType === 'image') bgValue = theme.backgroundImageUrl || '';
        else if (bgType === 'video') bgValue = theme.backgroundVideoUrl || '';
    }

    const themeStyles = {
        '--primary': theme?.primaryColor || "#0f172a",
        '--brand-primary': theme?.primaryColor || "#0f172a",
        '--brand-secondary': theme?.secondaryColor || "#f59e0b",
        '--radius': theme?.borderRadius || "8px",
        '--content-max-width': (theme?.layoutMode || 'boxed') === 'boxed' ? '1280px' : '100%',
    } as React.CSSProperties;

    return (
        <body
            className={`${geistSans.variable} ${geistMono.variable} antialiased flex flex-col min-h-screen relative`}
            style={themeStyles}
        >
            <ThemeProvider>
                <AhizanPreloader config={generalConfig} />
                
                {/* Global Background Layer */}
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
                            key={bgValue} // Force re-render if URL changes
                            className="absolute min-w-full min-h-full object-cover opacity-60"
                        >
                            <source src={getAssetUrl(bgValue)} type="video/mp4" />
                        </video>
                    )}
                </div>

                {/* Sticky Header */}
                <div className="sticky top-0 z-50 w-full shadow-sm">
                    <TopFlashBanner />
                    <AhizanNavbar 
                        logoUrl={generalConfig?.logoUrl} 
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
            </ThemeProvider>
        </body>
    );
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
    const homePage = await getPageContent('home');
    const footer = homePage?.sections.find(s => s.type === 'FOOTER_CONF')?.data as FooterConfData;

    return (
        <html lang="fr" suppressHydrationWarning>
            <Suspense fallback={
                <body className={`${geistSans.variable} ${geistMono.variable} antialiased flex flex-col min-h-screen relative`}>
                    <div className="fixed inset-0 flex items-center justify-center bg-white z-[9999]">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-900"></div>
                    </div>
                </body>
            }>
                <DynamicBranding footer={footer}>
                    {children}
                </DynamicBranding>
            </Suspense>
        </html>
    );
}
