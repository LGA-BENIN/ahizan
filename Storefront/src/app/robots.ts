import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://ahizan.com';

    return {
        rules: [
            {
                userAgent: '*',
                allow: '/',
                disallow: [
                    '/checkout',
                    '/account',
                    '/cart',
                    '/sign-in',
                    '/register',
                    '/reset-password',
                    '/track-order',
                    '/verify',
                    '/verify-pending'
                ],
            },
        ],
        sitemap: `${baseUrl}/sitemap.xml`,
    };
}
