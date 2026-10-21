import { MetadataRoute } from 'next';
import { getShopApiUrl } from '@/lib/vendure/api-utils';

export const revalidate = 3600; // Revalidate every hour

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://ahizan.com';
    const now = new Date();

    const staticRoutes: MetadataRoute.Sitemap = [
        {
            url: baseUrl,
            lastModified: now,
            changeFrequency: 'daily',
            priority: 1.0,
        },
        {
            url: `${baseUrl}/local-discovery`,
            lastModified: now,
            changeFrequency: 'daily',
            priority: 0.9,
        },
        {
            url: `${baseUrl}/flash-deals`,
            lastModified: now,
            changeFrequency: 'hourly',
            priority: 0.9,
        },
        {
            url: `${baseUrl}/vendors`,
            lastModified: now,
            changeFrequency: 'daily',
            priority: 0.8,
        },
        {
            url: `${baseUrl}/marches`,
            lastModified: now,
            changeFrequency: 'daily',
            priority: 0.85,
        },
    ];

    try {
        const query = `
            query GetSitemapData {
                markets {
                    id
                    slug
                    updatedAt
                }
                geoZones(topLevelOnly: true) {
                    id
                    slug
                    type
                    updatedAt
                }
                collections(options: { take: 100 }) {
                    items {
                        slug
                        updatedAt
                    }
                }
                products(options: { take: 1000 }) {
                    items {
                        slug
                        updatedAt
                    }
                }
            }
        `;

        const res = await fetch(getShopApiUrl(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query }),
            next: { revalidate: 3600 },
        });

        if (!res.ok) {
            return staticRoutes;
        }

        const data = await res.json();
        const markets = data?.data?.markets || [];
        const geoZones = data?.data?.geoZones || [];
        const collections = data?.data?.collections?.items || [];
        const products = data?.data?.products?.items || [];

        const marketRoutes: MetadataRoute.Sitemap = markets
            .filter((m: any) => m.slug)
            .flatMap((m: any) => [
                {
                    url: `${baseUrl}/marches/${m.slug}`,
                    lastModified: m.updatedAt ? new Date(m.updatedAt) : now,
                    changeFrequency: 'weekly' as const,
                    priority: 0.7,
                },
                {
                    url: `${baseUrl}/${m.slug}`,
                    lastModified: m.updatedAt ? new Date(m.updatedAt) : now,
                    changeFrequency: 'weekly' as const,
                    priority: 0.65,
                },
            ]);

        const zoneRoutes: MetadataRoute.Sitemap = geoZones
            .filter((z: any) => z.slug)
            .map((z: any) => ({
                url: `${baseUrl}/quartiers/${z.slug}`,
                lastModified: z.updatedAt ? new Date(z.updatedAt) : now,
                changeFrequency: 'weekly' as const,
                priority: 0.6,
            }));

        const collectionRoutes: MetadataRoute.Sitemap = collections
            .filter((c: any) => c.slug)
            .map((c: any) => ({
                url: `${baseUrl}/collection/${c.slug}`,
                lastModified: c.updatedAt ? new Date(c.updatedAt) : now,
                changeFrequency: 'weekly' as const,
                priority: 0.5,
            }));

        // Product pages have highest priority (1.0) so Google directs shoppers straight to the exact product
        const productRoutes: MetadataRoute.Sitemap = products
            .filter((p: any) => p.slug)
            .map((p: any) => ({
                url: `${baseUrl}/product/${p.slug}`,
                lastModified: p.updatedAt ? new Date(p.updatedAt) : now,
                changeFrequency: 'daily' as const,
                priority: 1.0,
            }));

        return [...staticRoutes, ...marketRoutes, ...zoneRoutes, ...collectionRoutes, ...productRoutes];
    } catch (e) {
        console.warn('[sitemap] Failed to fetch dynamic entities, returning static routes:', e);
        return staticRoutes;
    }
}
