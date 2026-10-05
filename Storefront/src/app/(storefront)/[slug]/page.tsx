import type { Metadata } from "next";
import { SITE_NAME, buildCanonicalUrl } from "@/lib/metadata";
import { AhizanHome } from "@/components/ahizan/AhizanHome";
import { getPageContent } from "@/lib/vendure/cms-queries";
import { getShopApiUrl } from "@/lib/vendure/api-utils";
import { notFound } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { AhizanContextExposer } from "@/components/ahizan/AhizanContextExposer";
import { MarketHubPage } from "@/components/market/MarketHubPage";
import { expandProductsWithSellerOffers } from "@/lib/vendure/seller-offers";

function normalizeSlugStr(str: string): string {
    return (str || '')
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/^(marche|grand-marche|marche-moderne)-?(de-)?(la-)?(du-)?(d-)?/, '')
        .replace(/[^a-z0-9]/g, '');
}

async function getMarketBySlug(slug: string): Promise<any | null> {
    if (!slug) return null;
    const cleanSlug = slug.trim().toLowerCase();

    // 1. Direct query with exact slug
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
            next: { revalidate: 60 }
        });
        const data = await res.json();
        if (data?.data?.market) {
            return data.data.market;
        }
    } catch {
        // Fall through
    }

    // 2. Fetch all markets to fuzzy match shorthand slugs (e.g. "marche-pk3", "pk3", "marche-ouando")
    try {
        const allMarketsQuery = `
            query GetAllMarketsForSlugMatch {
                markets {
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
        const res = await fetch(getShopApiUrl(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: allMarketsQuery }),
            next: { revalidate: 300 }
        });
        const data = await res.json();
        const markets: any[] = data?.data?.markets || [];
        
        // Exact slug or ID match
        let found = markets.find(m => m.slug === cleanSlug || String(m.id) === cleanSlug);
        if (found) return found;

        // Normalized slug match
        const targetNorm = normalizeSlugStr(cleanSlug);
        if (targetNorm) {
            found = markets.find(m => {
                const mNorm = normalizeSlugStr(m.slug);
                const mNameNorm = normalizeSlugStr(m.name);
                return mNorm === targetNorm || mNameNorm === targetNorm || mNorm.includes(targetNorm) || targetNorm.includes(mNorm);
            });
            if (found) return found;
        }
    } catch {
        // Fall through
    }

    return null;
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

    // 1. Check if slug corresponds to a CMS page first or a Physical Market
    const [pageRes, market, homePage] = await Promise.all([
        getPageContent(slug).catch(() => null),
        getMarketBySlug(slug).catch(() => null),
        getPageContent('home').catch(() => null)
    ]);

    // Extract market overrides from home page "Marchés Populaires du Bénin" section
    let marketCustomImage = '';
    if (market && homePage?.sections) {
        const marketSection = homePage.sections.find((s: any) => (s.type || '').includes('MARKET'));
        const overrides = marketSection?.data?.marketOverrides;
        if (overrides) {
            const mId = String(market.id);
            const mSlug = market.slug;
            if (overrides[mId]?.image) {
                marketCustomImage = overrides[mId].image;
            } else if (overrides[mSlug]?.image) {
                marketCustomImage = overrides[mSlug].image;
            }
        }
    }

    if (market && marketCustomImage) {
        market.image = marketCustomImage;
    }

    let page = pageRes;
    let marketData: any = market;
    let neighborhoodData: any = null;

    if (page && page.isActive && page.sections && page.sections.length > 0) {
        const marketSection = page.sections?.find((s: any) => s.type === 'MARKET_INFO');
        if (marketSection) marketData = marketSection.data;

        const neighborhoodSection = page.sections?.find((s: any) => s.type === 'NEIGHBORHOOD_INFO');
        if (neighborhoodSection) neighborhoodData = neighborhoodSection.data;
    } else if (market) {
        // ------------------------------------------------------------------
        // Fallback: fetch the CMS "market-default-template" page configured
        // in the Page Builder. We inject the real market data into each
        // section so nothing is hardcoded here.
        // ------------------------------------------------------------------
        const defaultTemplate = await getPageContent('market-default-template').catch(() => null);

        if (defaultTemplate && defaultTemplate.isActive && defaultTemplate.sections?.length > 0) {
            // Clone template sections and inject real market context into each one
            const injectedSections = defaultTemplate.sections.map((section: any, idx: number) => ({
                ...section,
                id: `${section.id || section.type}_${market.id}_${idx}`,
                data: {
                    ...section.data,
                    // Inject market context into every section automatically
                    marketId: String(market.id),
                    marketName: market.name,
                    marketSlug: market.slug,
                    // Hero-specific overrides
                    ...(section.type === 'MARKET_HERO_BANNER' ? {
                        title: section.data?.title || market.name,
                        subtitle: section.data?.subtitle || market.description || `Bienvenue au cœur du ${market.name}.`,
                        bgImage: marketCustomImage || market.image || section.data?.bgImage,
                        locationName: market.geoZone?.name || section.data?.locationName || 'Bénin',
                        badgeText: section.data?.badgeText || (market.geoZone?.name ? `Pôle Commercial ${market.geoZone.name}` : 'Pôle Commercial Certifié Ahizan'),
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
            // Last resort: "market-default-template" n'existe pas encore dans le CMS.
            // Crée cette page dans le Page Builder pour tout contrôler depuis le CMS.
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
                        description: '',
                        layout: 'full',
                        order: 1,
                        isActive: true,
                        data: {
                            title: market.name,
                            marketId: String(market.id),
                            marketSlug: market.slug,
                            marketName: market.name,
                            subtitle: market.description || `Bienvenue au cœur du ${market.name}.`,
                            bgImage: marketCustomImage || market.image,
                            locationName: market.geoZone?.name || 'Bénin',
                            badgeText: market.geoZone?.name ? `Pôle Commercial ${market.geoZone.name}` : 'Pôle Commercial Certifié Ahizan',
                            showSearch: true,
                            showStats: true,
                            showLiveBadge: true,
                        }
                    },
                    {
                        id: `sec_flash_${market.id}`,
                        type: 'FLASH_DEALS',
                        title: `Ventes Flash du ${market.name}`,
                        description: '',
                        layout: 'full',
                        order: 2,
                        isActive: true,
                        data: {
                            title: `⚡ Ventes Flash & Bons Plans du ${market.name}`,
                            subtitle: `Profitez des meilleures promotions dans ce marché.`,
                            marketId: String(market.id),
                            take: 4
                        }
                    },
                    {
                        id: `sec_catalog_${market.id}`,
                        type: 'MARKET_FACETED_GRID',
                        title: `Catalogue du ${market.name}`,
                        description: '',
                        layout: 'full',
                        order: 3,
                        isActive: true,
                        data: {
                            title: `Rayons & Produits du ${market.name}`,
                            subtitle: `Parcourez le catalogue complet.`,
                            marketId: String(market.id),
                            marketName: market.name,
                            showPriceFilter: true,
                            showFacetsFilter: true,
                            showQuickToggles: true,
                            showCategoriesBar: true,
                            defaultViewMode: 'grid-4'
                        }
                    },
                    {
                        id: `sec_info_${market.id}`,
                        type: 'MARKET_INFO',
                        title: `Informations du ${market.name}`,
                        description: '',
                        layout: 'full',
                        order: 4,
                        isActive: true,
                        data: {
                            title: `Services & Livraison du ${market.name}`,
                            marketId: String(market.id),
                            marketName: market.name
                        }
                    }
                ]
            };
        }
    } else {
        // Fallback Zone / Quartier
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
                    }
                ]
            };
        } else {
            notFound();
        }
    }

    return (
        <div className="min-h-screen">
            <AhizanContextExposer 
                page={page} 
                market={marketData} 
                neighborhood={neighborhoodData} 
            />
            <AhizanHome sections={page?.sections || []} />
        </div>
    );
}
