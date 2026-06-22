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
            {
                src: '/icons/seller-icon-192x192.png',
                sizes: '192x192',
                type: 'image/png',
                purpose: 'any'
            },
            {
                src: '/icons/seller-icon-512x512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'maskable'
            }
        ]
    };
}
