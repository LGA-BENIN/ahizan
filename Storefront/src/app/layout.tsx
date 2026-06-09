import React from "react";
import type { Metadata, Viewport } from 'next';
import "./globals.css";
import { SITE_NAME, SITE_URL } from "@/lib/metadata";

export const metadata: Metadata = {
    metadataBase: new URL(SITE_URL),
    title: {
        default: SITE_NAME,
        template: `%s | ${SITE_NAME}`,
    },
    description: "Shop the best products at Vendure Store. Quality products, competitive prices, and fast delivery.",
    icons: [
        {
            rel: 'icon',
            type: 'image/png',
            sizes: '32x32',
            url: '/logo-light.png',
        },
        {
            rel: 'icon',
            type: 'image/png',
            sizes: '16x16',
            url: '/logo-light.png',
        },
        {
            rel: 'apple-touch-icon',
            sizes: '180x180',
            url: '/logo-light.png',
        },
    ],
    openGraph: { type: "website", siteName: SITE_NAME, locale: "en_US" },
    twitter: { card: "summary_large_image" },
    robots: {
        index: true, follow: true,
        googleBot: { index: true, follow: true, "max-video-preview": -1, "max-image-preview": "large", "max-snippet": -1 },
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="fr" suppressHydrationWarning>
            <body className="font-sans antialiased min-h-screen flex flex-col">
                {children}
            </body>
        </html>
    );
}
