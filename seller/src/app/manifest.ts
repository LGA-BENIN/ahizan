import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'Ahizan Espace Vendeur',
        short_name: 'Ahizan Vendeur',
        description: 'Gérez vos produits, commandes et votre boutique sur la marketplace Ahizan.',
        start_url: '/dashboard',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#ffffff',
        theme_color: '#002f6c',
        icons: [
            { src: '/icons/seller-icon-72x72.png',   sizes: '72x72',   type: 'image/png', purpose: 'any' },
            { src: '/icons/seller-icon-96x96.png',   sizes: '96x96',   type: 'image/png', purpose: 'any' },
            { src: '/icons/seller-icon-128x128.png', sizes: '128x128', type: 'image/png', purpose: 'any' },
            { src: '/icons/seller-icon-144x144.png', sizes: '144x144', type: 'image/png', purpose: 'any' },
            { src: '/icons/seller-icon-152x152.png', sizes: '152x152', type: 'image/png', purpose: 'any' },
            { src: '/icons/seller-icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: '/icons/seller-icon-384x384.png', sizes: '384x384', type: 'image/png', purpose: 'any' },
            { src: '/icons/seller-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ],
        shortcuts: [
            {
                name: 'Tableau de bord',
                short_name: 'Dashboard',
                description: 'Accéder à votre tableau de bord',
                url: '/dashboard',
                icons: [{ src: '/icons/seller-icon-192x192.png', sizes: '192x192', type: 'image/png' }]
            },
            {
                name: 'Mes Produits',
                short_name: 'Produits',
                description: 'Gérer vos produits',
                url: '/dashboard/products',
                icons: [{ src: '/icons/seller-icon-192x192.png', sizes: '192x192', type: 'image/png' }]
            },
            {
                name: 'Mes Ventes',
                short_name: 'Ventes',
                description: 'Suivre vos commandes et ventes',
                url: '/dashboard/orders',
                icons: [{ src: '/icons/seller-icon-192x192.png', sizes: '192x192', type: 'image/png' }]
            }
        ]
    };
}
