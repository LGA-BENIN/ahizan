import type { Metadata } from 'next';
import { SITE_NAME, buildCanonicalUrl } from '@/lib/metadata';
import { rawQuery } from '@/lib/vendure/raw-api';
import { getPageContent, getPreviewHabillageContent } from '@/lib/vendure/cms-queries';
import { expandProductsWithSellerOffers } from '@/lib/vendure/seller-offers';
import { LocalDiscoveryClient } from './local-discovery-client';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
    return {
        title: `📍 Découverte Locale & Marchés du Bénin | ${SITE_NAME}`,
        description: 'Trouvez les produits, marchés physiques et boutiques vérifiées les plus proches de chez vous au Bénin avec livraison express sur Ahizan.',
        alternates: {
            canonical: buildCanonicalUrl('/local-discovery'),
        },
    };
}

const GET_LOCAL_CANDIDATE_PRODUCTS = `
    query GetLocalCandidateProducts {
        search(input: { take: 120, skip: 0, groupByProduct: false }) {
            totalItems
            items {
                productId
                productVariantId
                productName
                productVariantName
                slug
                productAsset {
                    id
                    preview
                }
                productVariantAsset {
                    id
                    preview
                }
                priceWithTax {
                    __typename
                    ... on SinglePrice {
                        value
                    }
                    ... on PriceRange {
                        min
                        max
                    }
                }
                currencyCode
                inStock
            }
        }
        markets {
            id
            name
            slug
            centerLatitude
            centerLongitude
            radiusMeters
        }
        geoZones {
            id
            name
            slug
            type
            centerLatitude
            centerLongitude
        }
        vendors(options: { filter: { status: { eq: "APPROVED" } }, take: 100 }) {
            items {
                id
                name
                phoneNumber
                zone
                address
                rating
                ratingCount
                verificationStatus
                latitude
                longitude
                logo { preview }
                location { id name }
                physicalMarket { id name }
            }
        }
    }
`;

export default async function LocalDiscoveryPage({ searchParams }: any) {
    const resolvedSearchParams = searchParams ? await searchParams : {};
    const presetId = resolvedSearchParams?.presetId;

    let rawItems: any[] = [];
    let markets: any[] = [];
    let neighborhoods: any[] = [];
    let vendors: any[] = [];
    let cmsPage: any = null;
    let userLocation: any = undefined;

    try {
        const cookieStore = await cookies();
        const locCookie = cookieStore.get('ahizan_client_location')?.value;
        if (locCookie) {
            userLocation = JSON.parse(decodeURIComponent(locCookie));
        }
    } catch {}

    try {
        const [data, cmsRes] = await Promise.all([
            rawQuery(GET_LOCAL_CANDIDATE_PRODUCTS),
            presetId ? getPreviewHabillageContent(presetId).catch(() => null) : getPageContent('local_discovery').catch(() => null)
        ]);

        rawItems = data?.search?.items || [];
        markets = data?.markets || [];
        const geoZones = data?.geoZones || [];
        neighborhoods = geoZones.filter((z: any) => z.type !== 'COMMUNE' && z.type !== 'CITY');
        vendors = data?.vendors?.items || [];
        cmsPage = cmsRes;
    } catch (err) {
        console.error('[LocalDiscoveryPage] Error loading data:', err);
    }

    // Expand items with seller offers and score with LOCAL_DISCOVERY strategy
    let localProducts: any[] = [];
    try {
        localProducts = await expandProductsWithSellerOffers(rawItems, {
            experienceStrategy: 'LOCAL_DISCOVERY',
            pageType: 'LOCAL_DISCOVERY',
            userLocation,
            userLat: userLocation?.latitude ? Number(userLocation.latitude) : undefined,
            userLon: userLocation?.longitude ? Number(userLocation.longitude) : undefined,
            marketId: userLocation?.marketId ? String(userLocation.marketId) : undefined,
            locationId: userLocation?.geoZoneId || userLocation?.id ? String(userLocation.geoZoneId || userLocation.id) : undefined,
            communeName: userLocation?.commune || userLocation?.name,
            boostCertifiedVendors: true,
            maxVariantsPerCentralProduct: 2,
        });
    } catch (e) {
        console.warn('[LocalDiscoveryPage] expandProducts error:', e);
        localProducts = rawItems;
    }

    return (
        <main className="min-h-screen bg-slate-50/50 dark:bg-slate-950 py-8 md:py-12">
            <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
                <LocalDiscoveryClient
                    initialProducts={localProducts}
                    markets={markets}
                    neighborhoods={neighborhoods}
                    vendors={vendors}
                    cmsPage={cmsPage}
                />
            </div>
        </main>
    );
}
