import type { MetadataRoute } from 'next';

export const dynamic = 'force-dynamic';

export default async function manifest(): Promise<MetadataRoute.Manifest> {
    const siteName = "Ahizan Portail Vendeur";
    const primaryColor = "#E31E24";
    const backgroundColor = "#ffffff";

    return {
        name: siteName,
        short_name: siteName,
        description: "Gérez votre boutique, vos produits et vos commandes sur le Portail Vendeur Ahizan.",
        start_url: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: backgroundColor,
        theme_color: primaryColor,
        icons: [
            { src: '/logo-ahizan-official.svg', sizes: '192x192', type: 'image/svg+xml', purpose: 'any' },
            { src: '/logo-ahizan-official.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'maskable' }
        ],
        shortcuts: [
            {
                name: 'Tableau de bord',
                short_name: 'Dashboard',
                description: 'Accédez à votre tableau de bord vendeur',
                url: '/dashboard',
                icons: [{ src: '/logo-ahizan-official.svg', sizes: '192x192', type: 'image/svg+xml' }]
            },
            {
                name: 'Mes Produits',
                short_name: 'Produits',
                description: 'Gérez vos produits',
                url: '/dashboard/products',
                icons: [{ src: '/logo-ahizan-official.svg', sizes: '192x192', type: 'image/svg+xml' }]
            },
            {
                name: 'Commandes',
                short_name: 'Commandes',
                description: 'Suivez les commandes clients',
                url: '/dashboard/orders',
                icons: [{ src: '/logo-ahizan-official.svg', sizes: '192x192', type: 'image/svg+xml' }]
            }
        ]
    };
}
