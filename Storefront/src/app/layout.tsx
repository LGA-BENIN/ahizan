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

import { getPageContent, ThemeSettingsData, TopBarData, HeaderConfData, FooterConfData } from "@/lib/vendure/cms-queries";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
    const homePage = await getPageContent('home');
    const sections = homePage?.sections || [];

    // Fetch our NEW General Config for Branding & System
    let generalConfig: any = null;
    try {
        const res = await fetch('http://localhost:3000/banner/general-config', { cache: 'no-store' });
        generalConfig = await res.json();
    } catch (e) {
        console.error("Failed to fetch general config in layout:", e);
    }

    const theme = sections.find(s => s.type === 'THEME_SETTINGS')?.data as ThemeSettingsData;
    const footer = sections.find(s => s.type === 'FOOTER_CONF')?.data as FooterConfData;

    // Use General Config for Background if available, fallback to section-based theme
    const bgType = generalConfig?.background?.type || theme?.backgroundType || 'color';
    const bgValue = generalConfig?.background?.value || (bgType === 'color' ? theme?.backgroundColor : (bgType === 'image' ? theme?.backgroundImageUrl : theme?.backgroundVideoUrl)) || '#ffffff';

    const themeStyles = {
        '--primary': theme?.primaryColor || "#0f172a",
        '--brand-primary': theme?.primaryColor || "#0f172a",
        '--brand-secondary': theme?.secondaryColor || "#f59e0b",
        '--radius': theme?.borderRadius || "8px",
        '--content-max-width': (theme?.layoutMode || 'boxed') === 'boxed' ? '1280px' : '100%',
    } as React.CSSProperties;

    return (
        <html lang="fr" suppressHydrationWarning>
            <body
                className={`${geistSans.variable} ${geistMono.variable} antialiased flex flex-col min-h-screen relative`}
                style={themeStyles}
            >
                <ThemeProvider>
                    <AhizanPreloader config={generalConfig} />
                    
                    {/* Global Background Layer - centralizing both systems */}
                    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
                        {bgType === 'color' && (
                            <div className="absolute inset-0" style={{ background: bgValue }} />
                        )}
                        {bgType === 'image' && bgValue && (
                            <div
                                className="absolute inset-0 bg-cover bg-center bg-fixed"
                                style={{ backgroundImage: `url(${bgValue.startsWith('/') ? `http://localhost:3000${bgValue}` : bgValue})` }}
                            />
                        )}
                        {bgType === 'video' && bgValue && (
                            <video
                                autoPlay
                                muted
                                loop
                                playsInline
                                className="absolute min-w-full min-h-full object-cover opacity-30"
                            >
                                <source src={bgValue.startsWith('/') ? `http://localhost:3000${bgValue}` : bgValue} type="video/mp4" />
                            </video>
                        )}
                    </div>

                    {/* Sticky Header */}
                    <div className="sticky top-0 z-50 w-full shadow-sm">
                        <TopFlashBanner />
                        <AhizanNavbar logoUrl={generalConfig?.logoUrl} />
                    </div>

                    <main className="relative z-10 flex-grow w-full mx-auto">
                        {children}
                    </main>

                    <Footer config={footer} />
                    <Toaster />
                    <React.Suspense fallback={null}>
                        <GlobalPopupProvider />
                    </React.Suspense>
                </ThemeProvider>
            </body>
        </html>
    );
}
