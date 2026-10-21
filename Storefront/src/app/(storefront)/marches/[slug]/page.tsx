import type { Metadata } from 'next';
import { SITE_NAME, buildCanonicalUrl } from '@/lib/metadata';
import { getShopApiUrl, getAssetUrl } from '@/lib/vendure/api-utils';
import { getPageContent } from '@/lib/vendure/cms-queries';
import { notFound } from 'next/navigation';
import { AhizanHome } from '@/components/ahizan/AhizanHome';
import { AhizanContextExposer } from '@/components/ahizan/AhizanContextExposer';
import Link from 'next/link';

export const revalidate = 3600;

async function getMarket(slug: string) {
    if (!slug) return null;
    const cleanSlug = slug.trim().toLowerCase();
    const query = `
        query GetMarketBySlug($slug: String!) {
            market(slug: $slug) {
                id
                name
                slug
                description
                image
                centerLatitude
                centerLongitude
                radiusMeters
                geoZone {
                    id
                    name
                    slug
                    parent { id name }
                }
            }
        }
    `;
    try {
        const res = await fetch(getShopApiUrl(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, variables: { slug: cleanSlug } }),
            next: { revalidate: 3600 },
        });
        const data = await res.json();
        if (data?.data?.market) {
            return data.data.market;
        }

        // Fuzzy match if direct slug not found
        const allRes = await fetch(getShopApiUrl(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query: `query { markets { id name slug description image centerLatitude centerLongitude geoZone { id name slug } } }`
            }),
            next: { revalidate: 3600 },
        });
        const allData = await allRes.json();
        const list: any[] = allData?.data?.markets || [];
        return list.find(m => m.slug === cleanSlug || String(m.id) === cleanSlug || m.slug?.includes(cleanSlug)) || null;
    } catch {
        return null;
    }
}

export async function generateMetadata({ params }: any): Promise<Metadata> {
    const { slug } = await params;
    const market = await getMarket(slug);
    if (!market) {
        return { title: 'Marché Introuvable' };
    }

    const title = `${market.name} - Grand Marché à ${market.geoZone?.name || 'Cotonou'} | ${SITE_NAME}`;
    const description = market.description || `Découvrez les commerçants, boutiques et produits phares du ${market.name} au Bénin avec livraison express sur Ahizan.`;

    return {
        title: { absolute: title },
        description,
        alternates: {
            canonical: buildCanonicalUrl(`/marches/${slug}`),
        },
        openGraph: {
            title,
            description,
            type: 'website',
            locale: 'fr_BJ',
            siteName: SITE_NAME,
            images: market.image ? [{ url: market.image }] : undefined,
        },
    };
}

export default async function MarketDetailsPage({ params }: any) {
    const { slug } = await params;
    const market = await getMarket(slug);

    if (!market) {
        notFound();
    }

    // Try fetching template or construct dynamic sections
    const defaultTemplate = await getPageContent('market-default-template').catch(() => null);
    let page: any = null;

    if (defaultTemplate && defaultTemplate.isActive && defaultTemplate.sections?.length > 0) {
        const injectedSections = defaultTemplate.sections.map((section: any, idx: number) => ({
            ...section,
            id: `${section.id || section.type}_${market.id}_${idx}`,
            data: {
                ...section.data,
                marketId: String(market.id),
                marketSlug: market.slug,
                marketName: market.name,
                title: section.data?.title?.replace(/\{marketName\}/g, market.name) || market.name,
                subtitle: section.data?.subtitle?.replace(/\{marketName\}/g, market.name) || market.description,
                ...(section.type === 'MARKET_HERO_BANNER' || (section.type || '').includes('HERO') ? {
                    bgImage: market.image || section.data?.bgImage,
                    locationName: market.geoZone?.name || section.data?.locationName || 'Bénin',
                    badgeText: market.geoZone?.name ? `Pôle Commercial ${market.geoZone.name}` : 'Pôle Commercial Certifié Ahizan',
                } : {}),
            }
        }));

        page = {
            ...defaultTemplate,
            id: `dynamic_market_${market.id}`,
            slug: market.slug,
            title: market.name,
            sections: injectedSections,
        };
    } else {
        page = {
            id: `dynamic_market_${market.id}`,
            slug: market.slug,
            title: market.name,
            type: 'MARKET',
            isActive: true,
            sections: [
                {
                    id: `sec_hero_${market.id}`,
                    type: 'MARKET_HERO_BANNER',
                    title: market.name,
                    order: 1,
                    isActive: true,
                    data: {
                        title: market.name,
                        marketId: String(market.id),
                        marketSlug: market.slug,
                        marketName: market.name,
                        subtitle: market.description || `Bienvenue au cœur du ${market.name}.`,
                        bgImage: market.image,
                        locationName: market.geoZone?.name || 'Bénin',
                        badgeText: market.geoZone?.name ? `Pôle Commercial ${market.geoZone.name}` : 'Pôle Commercial Certifié Ahizan',
                        showSearch: true,
                        showStats: true,
                        showLiveBadge: true,
                    }
                },
                {
                    id: `sec_vendors_${market.id}`,
                    type: 'LOCAL_VENDORS_PROXIMITY',
                    title: `Boutiques du ${market.name}`,
                    order: 2,
                    isActive: true,
                    data: {
                        title: `Boutiques & Commerçants au ${market.name}`,
                        subtitle: `Achetez auprès des commerçants certifiés présents dans ce marché.`,
                        marketId: String(market.id),
                        take: 8,
                    }
                },
                {
                    id: `sec_catalog_${market.id}`,
                    type: 'TABBED_PRODUCT_GRID',
                    title: `Produits du ${market.name}`,
                    order: 3,
                    isActive: true,
                    data: {
                        title: `Rayons & Produits du ${market.name}`,
                        marketId: String(market.id),
                        take: 12,
                    }
                }
            ]
        };
    }

    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'ShoppingCenter',
        name: market.name,
        description: market.description || `Marché ${market.name} au Bénin`,
        image: market.image,
        geo: market.centerLatitude && market.centerLongitude ? {
            '@type': 'GeoCoordinates',
            latitude: Number(market.centerLatitude),
            longitude: Number(market.centerLongitude),
        } : undefined,
        address: {
            '@type': 'PostalAddress',
            addressLocality: market.geoZone?.name || 'Cotonou',
            addressCountry: 'BJ',
        },
        hasMap: `https://www.openstreetmap.org/?mlat=${market.centerLatitude || 6.367}&mlon=${market.centerLongitude || 2.44}`,
    };

    const breadcrumbsLd = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
            {
                '@type': 'ListItem',
                position: 1,
                name: 'Accueil',
                item: 'https://ahizan.com',
            },
            {
                '@type': 'ListItem',
                position: 2,
                name: 'Marchés',
                item: 'https://ahizan.com/marches',
            },
            {
                '@type': 'ListItem',
                position: 3,
                name: market.name,
                item: `https://ahizan.com/marches/${market.slug}`,
            },
        ],
    };

    return (
        <div className="min-h-screen">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbsLd) }}
            />

            <AhizanContextExposer
                page={page}
                market={market}
                neighborhood={null}
            />
            <AhizanHome sections={page?.sections || []} />
        </div>
    );
}
