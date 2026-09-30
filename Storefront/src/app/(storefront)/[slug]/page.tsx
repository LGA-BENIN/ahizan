import type { Metadata } from "next";
import { SITE_NAME, buildCanonicalUrl } from "@/lib/metadata";
import { AhizanHome } from "@/components/ahizan/AhizanHome";
import { getPageContent } from "@/lib/vendure/cms-queries";
import { getShopApiUrl } from "@/lib/vendure/api-utils";
import { notFound } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { AhizanContextExposer } from "@/components/ahizan/AhizanContextExposer";

async function getMarketBySlug(slug: string): Promise<any | null> {
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
            body: JSON.stringify({ query, variables: { slug } }),
            next: { revalidate: 60 }
        });
        const data = await res.json();
        return data?.data?.market || null;
    } catch {
        return null;
    }
}

async function getGeoZoneBySlug(slug: string): Promise<any | null> {
    const query = `
        query GetGeoZoneBySlug($slug: String!) {
            geoZoneBySlug(slug: $slug) {
                id
                name
                slug
                type
                centerLatitude
                centerLongitude
                radiusMeters
                parent { id name }
            }
        }
    `;
    try {
        const res = await fetch(getShopApiUrl(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, variables: { slug } }),
            next: { revalidate: 60 }
        });
        const data = await res.json();
        return data?.data?.geoZoneBySlug || null;
    } catch {
        return null;
    }
}

export async function generateMetadata({ params }: any): Promise<Metadata> {
    const { slug } = await params;
    const page = await getPageContent(slug);

    if (page && page.isActive) {
        return {
            title: {
                absolute: `${page.title} - ${SITE_NAME}`,
            },
            description: "Découvrez des produits de haute qualité à des prix compétitifs sur Ahizan.", 
            alternates: {
                canonical: buildCanonicalUrl(`/${slug}`),
            },
        };
    }

    const market = await getMarketBySlug(slug);
    if (market) {
        return {
            title: {
                absolute: `${market.name} - Marché ${market.geoZone?.name || 'Bénin'} | ${SITE_NAME}`,
            },
            description: market.description || `Découvrez les commerçants et produits disponibles au ${market.name}.`,
            alternates: {
                canonical: buildCanonicalUrl(`/${slug}`),
            },
        };
    }

    const zone = await getGeoZoneBySlug(slug);
    if (zone) {
        return {
            title: {
                absolute: `${zone.name} - Boutiques et Produits Locaux | ${SITE_NAME}`,
            },
            description: `Découvrez les boutiques et offres de proximité à ${zone.name}.`,
            alternates: {
                canonical: buildCanonicalUrl(`/${slug}`),
            },
        };
    }

    return { title: 'Page Introuvable' };
}

export default async function CustomCmsPage({ params }: any) {
    const { slug } = await params;
    
    noStore();
    let page = await getPageContent(slug);

    let marketData: any = null;
    let neighborhoodData: any = null;

    if (page && page.isActive) {
        const marketSection = page.sections?.find((s: any) => s.type === 'MARKET_INFO');
        marketData = marketSection ? marketSection.data : null;

        const neighborhoodSection = page.sections?.find((s: any) => s.type === 'NEIGHBORHOOD_INFO');
        neighborhoodData = neighborhoodSection ? neighborhoodSection.data : null;
    } else {
        // Fallback 1: Physical Market landing page
        const market = await getMarketBySlug(slug);
        if (market) {
            marketData = market;
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
                        description: market.description || '',
                        layout: 'full',
                        order: 1,
                        isActive: true,
                        data: {
                            title: market.name,
                            marketName: market.name,
                            subtitle: market.description || `Explorez tous les commerçants et offres du ${market.name}.`,
                            badgeText: market.geoZone?.name || 'Pôle Commercial',
                            locationName: market.geoZone?.name || 'Bénin',
                            bgImage: market.image,
                            showDistance: true,
                        }
                    },
                    {
                        id: `sec_vendors_${market.id}`,
                        type: 'LOCAL_VENDORS',
                        title: `Boutiques du ${market.name}`,
                        description: '',
                        layout: 'grid',
                        order: 2,
                        isActive: true,
                        data: {
                            title: `Boutiques & Échoppes du ${market.name}`,
                            subtitle: `Achetez directement auprès des commerçants vérifiés du ${market.name}.`,
                            badgeText: 'Commerçants Vérifiés',
                            marketId: String(market.id),
                            layoutStyle: 'grid',
                            columns: 4,
                            take: 8
                        }
                    },
                    {
                        id: `sec_products_${market.id}`,
                        type: 'LOCAL_PRODUCTS',
                        title: `Produits au ${market.name}`,
                        description: '',
                        layout: 'grid-4',
                        order: 3,
                        isActive: true,
                        data: {
                            title: `Rayons & Produits du ${market.name}`,
                            subtitle: `Produits frais, mode, épicerie et artisanat livrés chez vous.`,
                            badgeText: 'En Direct du Marché',
                            locationSource: 'FIXED_MARKET',
                            marketId: String(market.id),
                            marketName: market.name,
                            layout: 'grid-4',
                            limit: 12
                        }
                    },
                    {
                        id: `sec_other_markets_${market.id}`,
                        type: 'LOCAL_MARKETS',
                        title: `Autres Marchés aux Alentours`,
                        description: '',
                        layout: 'carousel',
                        order: 4,
                        isActive: true,
                        data: {
                            title: `Autres Marchés aux Alentours`,
                            subtitle: `Découvrez également les autres pôles commerciaux à proximité.`,
                            badgeText: 'Marchés Voisins',
                            layout: 'carousel',
                            take: 8
                        }
                    }
                ]
            };
        } else {
            // Fallback 2: Neighborhood / Zone landing page
            const zone = await getGeoZoneBySlug(slug);
            if (zone) {
                neighborhoodData = zone;
                page = {
                    id: `dynamic_zone_${zone.id}`,
                    slug: zone.slug,
                    title: zone.name,
                    type: 'NEIGHBORHOOD',
                    isActive: true,
                    sections: [
                        {
                            id: `sec_zone_products_${zone.id}`,
                            type: 'LOCAL_PRODUCTS',
                            title: `Produits Disponibles à ${zone.name}`,
                            description: '',
                            layout: 'grid-4',
                            order: 1,
                            isActive: true,
                            data: {
                                title: `Offres & Produits à ${zone.name}`,
                                subtitle: `Explorez les produits disponibles à proximité de ${zone.name}.`,
                                badgeText: zone.parent?.name ? `Zone ${zone.parent.name}` : 'Offres Locales',
                                locationSource: 'FIXED_LOCATION',
                                locationId: String(zone.id),
                                locationName: zone.name,
                                layout: 'grid-4',
                                limit: 12
                            }
                        },
                        {
                            id: `sec_zone_markets_${zone.id}`,
                            type: 'LOCAL_MARKETS',
                            title: `Marchés Proches de ${zone.name}`,
                            description: '',
                            layout: 'carousel',
                            order: 2,
                            isActive: true,
                            data: {
                                title: `Marchés Proches de ${zone.name}`,
                                subtitle: `Faites vos courses dans les grands marchés de votre secteur.`,
                                badgeText: 'Marchés Proches',
                                layout: 'carousel',
                                take: 8
                            }
                        }
                    ]
                };
            } else {
                notFound();
            }
        }
    }

    return (
        <div className="min-h-screen">
            <AhizanContextExposer 
                page={page} 
                market={marketData} 
                neighborhood={neighborhoodData} 
            />
            <AhizanHome sections={page.sections || []} />
        </div>
    );
}
