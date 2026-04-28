import type { Metadata } from 'next';
import { Suspense } from 'react';
import { query } from '@/lib/vendure/api';
import { SearchProductsQuery, GetCollectionProductsQuery } from '@/lib/vendure/queries';
import { ProductGrid } from '@/components/commerce/product-grid';
import { FacetFilters } from '@/components/commerce/facet-filters';
import { ProductGridSkeleton } from '@/components/shared/product-grid-skeleton';
import { buildSearchInput, getCurrentPage } from '@/lib/search-helpers';
import { cacheLife, cacheTag } from 'next/cache';
import {
    SITE_NAME,
    truncateDescription,
    buildCanonicalUrl,
    buildOgImages,
} from '@/lib/metadata';
import { getBannerApiUrl, getAssetUrl } from '@/lib/vendure/api-utils';

async function getCollectionProducts(slug: string, searchParams: { [key: string]: string | string[] | undefined }) {
    'use cache';
    cacheLife('hours');
    cacheTag(`collection-${slug}`);

    return query(SearchProductsQuery, {
        input: buildSearchInput({
            searchParams,
            collectionSlug: slug
        })
    });
}

async function getCollectionMetadata(slug: string) {
    'use cache';
    cacheLife('hours');
    cacheTag(`collection-meta-${slug}`);

    return query(GetCollectionProductsQuery, {
        slug,
        input: { take: 0, collectionSlug: slug, groupByProduct: true },
    });
}

export async function generateMetadata({
    params,
}: PageProps<'/collection/[slug]'>): Promise<Metadata> {
    const { slug } = await params;
    const result = await getCollectionMetadata(slug);
    const collection = result.data.collection;

    if (!collection) {
        return {
            title: 'Collection Not Found',
        };
    }

    const description =
        truncateDescription(collection.description) ||
        `Browse our ${collection.name} collection at ${SITE_NAME}`;

    return {
        title: collection.name,
        description,
        alternates: {
            canonical: buildCanonicalUrl(`/collection/${collection.slug}`),
        },
        openGraph: {
            title: collection.name,
            description,
            type: 'website',
            url: buildCanonicalUrl(`/collection/${collection.slug}`),
            images: buildOgImages(collection.featuredAsset?.preview, collection.name),
        },
        twitter: {
            card: 'summary_large_image',
            title: collection.name,
            description,
            images: collection.featuredAsset?.preview
                ? [collection.featuredAsset.preview]
                : undefined,
        },
    };
}

async function getCategoryConfig() {
    try {
        const res = await fetch(getBannerApiUrl('category-page-config'), {
            next: { revalidate: 60, tags: ['category-config'] }
        });
        if (!res.ok) return null;
        return res.json();
    } catch (e) {
        return null;
    }
}

function CategoryHeader({ collection, config }: { collection: any, config: any }) {
    if (!config.showBanner) {
        return (
            <div className="mb-8 px-4">
                <h1 className="text-4xl font-black text-gray-900 uppercase tracking-tighter">{collection.name}</h1>
                {config.descriptionPosition === 'top' && collection.description && (
                    <div className="mt-4 text-gray-600 max-w-3xl prose prose-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: collection.description }} />
                )}
            </div>
        );
    }

    const style = config.bannerStyle || 'full';
    const overlay = config.bannerOverlay ?? 0.4;
    const featuredImage = collection.featuredAsset?.preview;

    if (style === 'minimal') {
        return (
            <div className="relative h-48 rounded-2xl overflow-hidden mb-12 group mx-4">
                {featuredImage ? (
                    <img src={featuredImage} alt={collection.name} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                ) : (
                    <div className="absolute inset-0 bg-gradient-to-r from-[#002f6c] to-[#00408e]" />
                )}
                <div className="absolute inset-0 bg-black/40 flex items-center px-8">
                    <h1 className="text-3xl font-black text-white uppercase tracking-tighter drop-shadow-lg">{collection.name}</h1>
                </div>
            </div>
        );
    }

    if (style === 'glass') {
        return (
            <div className="relative h-64 rounded-3xl overflow-hidden mb-12 flex items-center justify-center mx-4">
                {featuredImage && <img src={featuredImage} alt={collection.name} className="absolute inset-0 w-full h-full object-cover blur-md scale-110" />}
                <div className="absolute inset-0 bg-white/10 backdrop-blur-xl border border-white/20 z-10" />
                <div className="relative z-20 text-center px-8">
                    <h1 className="text-5xl font-black text-white uppercase tracking-tight drop-shadow-2xl mb-4">{collection.name}</h1>
                    {config.descriptionPosition === 'banner' && collection.description && (
                        <div className="text-white/90 max-w-xl mx-auto font-medium drop-shadow-lg line-clamp-2" dangerouslySetInnerHTML={{ __html: collection.description }} />
                    )}
                </div>
            </div>
        );
    }

    // Default: Full / Immersive (Boutique Ahizan Style)
    return (
        <div className="relative h-[450px] -mx-4 md:-mx-8 lg:-mx-12 mb-12 flex items-center overflow-hidden">
            {featuredImage ? (
                <img src={featuredImage} alt={collection.name} className="absolute inset-0 w-full h-full object-cover" />
            ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-[#002f6c] via-[#00408e] to-[#e31837]" />
            )}
            <div 
                className="absolute inset-0 z-10 bg-gradient-to-t from-black/80 via-black/20 to-transparent" 
                style={{ opacity: overlay + 0.2 }} 
            />
            <div className="container mx-auto px-8 relative z-20 mt-20">
                <div className="max-w-3xl">
                    <div className="inline-block px-3 py-1 bg-[#e31837] text-white text-[10px] font-black uppercase tracking-widest mb-4 rounded-sm">Collection Officielle</div>
                    <h1 className="text-6xl md:text-8xl font-black text-white uppercase tracking-tighter leading-[0.9] mb-8 drop-shadow-2xl">
                        {collection.name}
                    </h1>
                    {config.descriptionPosition === 'banner' && collection.description && (
                        <div className="text-xl text-white/80 font-medium leading-relaxed max-w-xl border-l-4 border-[#e31837] pl-6 py-2" dangerouslySetInnerHTML={{ __html: collection.description }} />
                    )}
                </div>
            </div>
        </div>
    );
}

export default async function CollectionPage({params, searchParams}: PageProps<'/collection/[slug]'>) {
    const { slug } = await params;
    const searchParamsResolved = await searchParams;
    const page = getCurrentPage(searchParamsResolved);

    const productDataPromise = getCollectionProducts(slug, searchParamsResolved);
    const [collectionMeta, config] = await Promise.all([
        getCollectionMetadata(slug),
        getCategoryConfig()
    ]);

    const collection = collectionMeta.data.collection;
    if (!collection) return null;

    const c = config || {
        showBanner: true,
        bannerStyle: 'full',
        bannerOverlay: 0.4,
        columnsDesktop: 4,
        sidebarPosition: 'left',
        productsPerPage: 12,
        descriptionPosition: 'top'
    };

    const isSidebarNone = c.sidebarPosition === 'none';
    const isSidebarRight = c.sidebarPosition === 'right';

    return (
        <div className="container mx-auto px-4 py-8 mt-16 min-h-screen">
            <CategoryHeader collection={collection} config={c} />

            {c.descriptionPosition === 'top' && !c.showBanner && collection.description && (
                <div className="mb-12 px-4 text-gray-700 prose max-w-none border-l-2 border-gray-100 pl-8" dangerouslySetInnerHTML={{ __html: collection.description }} />
            )}

            <div className={`flex flex-col ${isSidebarRight ? 'lg:flex-row-reverse' : 'lg:flex-row'} gap-12`}>
                {/* Filters Sidebar */}
                {!isSidebarNone && (
                    <aside className="w-full lg:w-1/4 shrink-0 px-4 lg:px-0">
                        <div className="sticky top-28 bg-white/50 backdrop-blur-sm p-6 rounded-2xl border border-gray-100 shadow-sm">
                            <h2 className="text-xs font-black uppercase tracking-widest text-[#002f6c] mb-6 flex items-center gap-2">
                                <span className="w-2 h-2 bg-[#e31837] rounded-full animate-pulse"></span>
                                Filtrer par
                            </h2>
                            <Suspense fallback={<div className="h-96 animate-pulse bg-gray-50 rounded-xl" />}>
                                <FacetFilters productDataPromise={productDataPromise} />
                            </Suspense>
                        </div>
                    </aside>
                )}

                {/* Product Grid */}
                <div className={`flex-grow px-4 lg:px-0 ${isSidebarNone ? 'w-full' : ''}`}>
                    <Suspense fallback={<ProductGridSkeleton />}>
                        <ProductGrid 
                            productDataPromise={productDataPromise} 
                            currentPage={page} 
                            take={c.productsPerPage || 12} 
                            columns={c.columnsDesktop || 4}
                        />
                    </Suspense>

                    {c.descriptionPosition === 'bottom' && collection.description && (
                        <div className="mt-24 pt-12 border-t border-gray-100 text-gray-400 prose max-w-none italic text-sm" dangerouslySetInnerHTML={{ __html: collection.description }} />
                    )}
                </div>
            </div>
        </div>
    );
}