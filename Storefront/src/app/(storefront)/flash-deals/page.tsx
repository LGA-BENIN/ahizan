import type { Metadata } from 'next';
import { SITE_NAME, buildCanonicalUrl } from '@/lib/metadata';
import { rawQuery } from '@/lib/vendure/raw-api';
import { getPageContent, getPreviewHabillageContent } from '@/lib/vendure/cms-queries';
import { expandProductsWithSellerOffers } from '@/lib/vendure/seller-offers';
import { FlashDealsClient } from './flash-deals-client';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
    return {
        title: `⚡ Ventes Flash & Bonnes Affaires | ${SITE_NAME}`,
        description: 'Profitez des meilleures remises, ventes flash et promotions exceptionnelles des boutiques certifiées sur Ahizan au Bénin.',
        alternates: {
            canonical: buildCanonicalUrl('/flash-deals'),
        },
    };
}

const GET_FLASH_CANDIDATE_PRODUCTS = `
    query GetFlashCandidateProducts($collectionSlug: String, $collectionId: ID) {
        search(input: { 
            collectionSlug: $collectionSlug, 
            collectionId: $collectionId,
            take: 500, 
            skip: 0, 
            groupByProduct: false 
        }) {
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
    }
`;

export default async function FlashDealsPage({ searchParams }: any) {
    const resolvedSearchParams = searchParams ? await searchParams : {};
    const presetId = resolvedSearchParams?.presetId;
    const collectionSlug = resolvedSearchParams?.collection || resolvedSearchParams?.category || resolvedSearchParams?.collectionSlug || undefined;
    const rawCollectionId = resolvedSearchParams?.collectionId || undefined;
    const marketId = resolvedSearchParams?.marketId || undefined;
    const firstCollectionId = rawCollectionId ? String(rawCollectionId).split(',')[0].trim() : undefined;

    let rawItems: any[] = [];
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
        const [searchRes, cmsRes] = await Promise.all([
            rawQuery(GET_FLASH_CANDIDATE_PRODUCTS, {
                variables: {
                    collectionSlug: collectionSlug || undefined,
                    collectionId: firstCollectionId || undefined,
                }
            }),
            presetId ? getPreviewHabillageContent(presetId).catch(() => null) : getPageContent('flash_deals').catch(() => null)
        ]);

        rawItems = searchRes?.search?.items || [];
        cmsPage = cmsRes;
    } catch (err) {
        console.error('[FlashDealsPage] Error loading data:', err);
    }

    // Expand items with seller offers and score with FLASH_SALE strategy
    let flashProducts: any[] = [];
    try {
        const targetMarketId = marketId || (userLocation?.marketId ? String(userLocation.marketId) : undefined);
        const expanded = await expandProductsWithSellerOffers(rawItems, {
            experienceStrategy: 'FLASH_SALE',
            pageType: 'FLASH_SALE',
            userLocation,
            userLat: userLocation?.latitude ? Number(userLocation.latitude) : undefined,
            userLon: userLocation?.longitude ? Number(userLocation.longitude) : undefined,
            marketId: targetMarketId,
            locationId: userLocation?.geoZoneId || userLocation?.id ? String(userLocation.geoZoneId || userLocation.id) : undefined,
            communeName: userLocation?.commune || userLocation?.name,
            requirePromotion: false,
            boostCertifiedVendors: true,
            maxVariantsPerCentralProduct: 4,
            maxItemsPerVendor: 30,
            limit: 300,
        });

        // Retain items with active promotion or competitive pricing
        const promoOnly = expanded.filter((p: any) => {
            const isPromo = Boolean(p.onPromotion || p.winningOffer?.onPromotion);
            const disc = Number(p.discountPercentage || p.winningOffer?.discountPercentage || 0);
            return isPromo || disc > 0 || (p.price && p.promotionalPrice && p.price > p.promotionalPrice);
        });

        // If promotional list has items, use it; otherwise use full geo-scored expanded list
        flashProducts = promoOnly.length >= 12 ? promoOnly : expanded;
    } catch (e) {
        console.warn('[FlashDealsPage] expandProducts error:', e);
        flashProducts = rawItems;
    }

    return (
        <main className="min-h-screen bg-slate-50/50 dark:bg-slate-950 py-8 md:py-12">
            <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
                <FlashDealsClient 
                    initialProducts={flashProducts} 
                    cmsPage={cmsPage} 
                />
            </div>
        </main>
    );
}
