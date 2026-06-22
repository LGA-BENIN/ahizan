import type {Metadata, Viewport} from "next";
import "./globals.css";
import {Toaster} from "@/components/ui/sonner";
import {ConditionalLayout} from "@/components/layout/conditional-layout";
import {ThemeProvider} from "@/components/providers/theme-provider";
import {SITE_NAME, SITE_URL} from "@/lib/metadata";

export const metadata: Metadata = {
    metadataBase: new URL(SITE_URL),
    title: {
        default: SITE_NAME,
        template: `%s | ${SITE_NAME}`,
    },
    description:
        "Shop the best products at AHIZAN. Quality products, competitive prices, and fast delivery.",
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
        {media: "(prefers-color-scheme: light)", color: "#ffffff"},
        {media: "(prefers-color-scheme: dark)", color: "#000000"},
    ],
};

import {Navbar} from "@/components/layout/navbar";
import {Footer} from "@/components/layout/footer";

import {PWAInstallPrompt} from "@/components/shared/PWAInstallPrompt";

export default function RootLayout({children}: { children: React.ReactNode }) {
    return (
        <html lang="fr" suppressHydrationWarning>
            <head>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=Inter:wght@400;500;600&family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
            </head>
            <body
                className="font-sans antialiased flex flex-col min-h-screen"
            >
                <ThemeProvider>
                    <ConditionalLayout 
                        navbar={<Navbar />} 
                        footer={<Footer />}
                    >
                          {children}
                    </ConditionalLayout>
                    <Toaster />
                    <PWAInstallPrompt />
                </ThemeProvider>
            </body>
        </html>
    );
}
