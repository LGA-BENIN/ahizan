import type { MetadataRoute } from 'next';
import { getPageContent, ThemeSettingsData } from '@/lib/vendure/cms-queries';
import { getAssetUrl } from '@/lib/vendure/api-utils';

export const dynamic = 'force-dynamic';

export default async function manifest(): Promise<MetadataRoute.Manifest> {

    const homePage = await getPageContent('home');
    const sections = homePage?.sections || [];
    const theme = sections.find(s => s.type === 'THEME_SETTINGS')?.data as ThemeSettingsData;
    
    const siteName = theme?.favicon ? "Ahizan" : "Ahizan Marketplace";
    const primaryColor = theme?.primaryColor || "#0f172a";
    const backgroundColor = theme?.backgroundColor || "#ffffff";
    const faviconUrl = theme?.favicon ? getAssetUrl(theme.favicon) : "/icons/icon-192x192.png";

    return {
        name: siteName,
        short_name: siteName,
        description: "Découvrez des produits de haute qualité à des prix compétitifs sur Ahizan.",
        start_url: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: backgroundColor,
        theme_color: primaryColor,
        icons: [
            {
                src: faviconUrl || "/icons/icon-192x192.png",
                sizes: "192x192",
                type: "image/png",
                purpose: "any"
            },
            {
                src: faviconUrl || "/icons/icon-512x512.png",
                sizes: "512x512",
                type: "image/png",
                purpose: "maskable"
            }
        ]
    };
}
