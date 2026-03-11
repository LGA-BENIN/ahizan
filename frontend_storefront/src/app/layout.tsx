import React, { Suspense } from "react";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { Navbar } from "@/components/layout/navbar";
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

    const theme = sections.find(s => s.type === 'THEME_SETTINGS')?.data as ThemeSettingsData;
    const topBar = sections.find(s => s.type === 'TOP_BAR')?.data as TopBarData;
    const header = sections.find(s => s.type === 'HEADER_CONF')?.data as HeaderConfData;
    const footer = sections.find(s => s.type === 'FOOTER_CONF')?.data as FooterConfData;

    // Default theme fallbacks
    const primaryColor = theme?.primaryColor || "#0f172a";
    const secondaryColor = theme?.secondaryColor || "#f59e0b";
    const borderRadius = theme?.borderRadius || "8px";
    const layoutMode = theme?.layoutMode || 'boxed';

    const themeStyles = {
        '--primary': primaryColor,
        '--brand-primary': primaryColor,
        '--brand-secondary': secondaryColor,
        '--radius': borderRadius,
        '--content-max-width': layoutMode === 'boxed' ? '1280px' : '100%',
    } as React.CSSProperties;

    return (
        <html lang="fr" suppressHydrationWarning>
            <body
                className={`${geistSans.variable} ${geistMono.variable} antialiased flex flex-col min-h-screen relative`}
                style={themeStyles}
            >
                <ThemeProvider>
                    {/* Global Background Layer */}
                    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
                        {theme?.backgroundType === 'color' && (
                            <div className="absolute inset-0" style={{ background: theme.backgroundColor || '#ffffff' }} />
                        )}
                        {theme?.backgroundType === 'image' && theme.backgroundImageUrl && (
                            <div
                                className="absolute inset-0 bg-cover bg-center"
                                style={{ backgroundImage: `url(${theme.backgroundImageUrl})` }}
                            />
                        )}
                        {theme?.backgroundType === 'video' && theme.backgroundVideoUrl && (
                            <video
                                autoPlay
                                muted
                                loop
                                playsInline
                                className="absolute min-w-full min-h-full object-cover opacity-30"
                            >
                                <source src={theme.backgroundVideoUrl} type="video/mp4" />
                            </video>
                        )}
                    </div>

                    {/* Integrated Sticky Header */}
                    <div className="sticky top-0 z-50 w-full shadow-sm">
                        {/* Top Ad Area */}
                        {topBar?.adMediaUrl && (
                            <div className="w-full bg-slate-900 overflow-hidden flex justify-center items-center">
                                {topBar.adMediaType === 'video' ? (
                                    <video autoPlay muted loop playsInline className="w-full max-h-[80px] object-cover">
                                        <source src={topBar.adMediaUrl} />
                                    </video>
                                ) : (
                                    <Link href={topBar.adLink || '#'} className="w-full">
                                        <img src={topBar.adMediaUrl} alt="Publicité" className="w-full max-h-[80px] object-cover" />
                                    </Link>
                                )}
                            </div>
                        )}

                        {topBar?.text && (
                            <div style={{ background: topBar.backgroundColor || '#0f172a', color: topBar.textColor || '#ffffff', padding: '8px', textAlign: 'center', fontSize: '12px', fontWeight: 'bold', letterSpacing: '0.05em' }}>
                                {topBar.text}
                            </div>
                        )}

                        <Navbar config={header} />
                    </div>

                    <main className={`flex-grow w-full mx-auto ${layoutMode === 'boxed' ? 'max-w-[var(--content-max-width)] px-4' : 'max-w-none'}`}>
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
