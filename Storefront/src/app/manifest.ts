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
            { src: '/icons/icon-72x72.png',   sizes: '72x72',   type: 'image/png', purpose: 'any' },
            { src: '/icons/icon-96x96.png',   sizes: '96x96',   type: 'image/png', purpose: 'any' },
            { src: '/icons/icon-128x128.png', sizes: '128x128', type: 'image/png', purpose: 'any' },
            { src: '/icons/icon-144x144.png', sizes: '144x144', type: 'image/png', purpose: 'any' },
            { src: '/icons/icon-152x152.png', sizes: '152x152', type: 'image/png', purpose: 'any' },
            { src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: '/icons/icon-384x384.png', sizes: '384x384', type: 'image/png', purpose: 'any' },
            { src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ],
        shortcuts: [
            {
                name: 'Mes Favoris',
                short_name: 'Favoris',
                description: 'Retrouvez vos produits favoris',
                url: '/account/favorites',
                icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' }]
            },
            {
                name: 'Mes Commandes',
                short_name: 'Commandes',
                description: 'Suivez vos commandes en cours',
                url: '/account/orders',
                icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' }]
            },
            {
                name: 'Recherche',
                short_name: 'Rechercher',
                description: 'Recherchez des produits',
                url: '/search',
                icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' }]
            }
        ]
    };
}
