console.log('[ProductPage File] LOADING FILE: src/app/product/[slug]/page.tsx');
import type { Metadata } from 'next';
import { query } from '@/lib/vendure/api';
import { GetProductDetailQuery } from '@/lib/vendure/queries';
import { ProductImageCarousel } from '@/components/commerce/product-image-carousel';
import { ProductInfo } from '@/components/commerce/product-info';
import { RelatedProducts } from '@/components/commerce/related-products';
import { notFound } from 'next/navigation';
import { cacheLife, cacheTag } from 'next/cache';
import {
    SITE_NAME,
    truncateDescription,
    buildCanonicalUrl,
    buildOgImages,
} from '@/lib/metadata';
import { ProductVendor } from '@/components/commerce/product-vendor';
import { Suspense } from 'react';
import Link from 'next/link';
import React from 'react';

async function getProductData(slug: string) {
    // 'use cache';
    // cacheLife('hours');
    // cacheTag(`product-${slug}`);

    console.log(`[getProductData] Fetching for slug: "${slug}"`);
    const result = await query(GetProductDetailQuery, { slug });
    console.log(`[getProductData] Result for "${slug}":`, result.data.product ? 'FOUND' : 'NOT FOUND');
    return result;
}

export async function generateMetadata({
    params,
}: PageProps<'/product/[slug]'>): Promise<Metadata> {
    const { slug } = await params;
    const result = await getProductData(slug);
    const product = result.data.product;

    if (!product) {
        return {
            title: 'Produit non trouvé',
        };
    }

    const description = truncateDescription(product.description);
    const ogImage = product.assets?.[0]?.preview;

    return {
        title: product.name,
        description: description || `Achetez ${product.name} sur ${SITE_NAME}`,
        alternates: {
            canonical: buildCanonicalUrl(`/product/${product.slug}`),
        },
        openGraph: {
            title: product.name,
            description: description || `Achetez ${product.name} sur ${SITE_NAME}`,
            type: 'website',
            url: buildCanonicalUrl(`/product/${product.slug}`),
            images: buildOgImages(ogImage, product.name),
        },
        twitter: {
            card: 'summary_large_image',
            title: product.name,
            description: description || `Achetez ${product.name} sur ${SITE_NAME}`,
            images: ogImage ? [ogImage] : undefined,
        },
    };
}

export default async function ProductDetailPage({params, searchParams}: PageProps<'/product/[slug]'>) {
    const { slug } = await params;
    const searchParamsResolved = await searchParams;

    console.log(`[ProductDetailPage] Rendering for slug: "${slug}"`);
    const result = await getProductData(slug);

    const product = result.data.product;

    if (!product) {
        notFound();
    }

    // Get the primary collection (prefer deepest nested / most specific)
    const primaryCollection = product.collections?.find(c => c.parent?.id) ?? product.collections?.[0];

    return (
        <>
            {/* Breadcrumb Navigation */}
            {product.collections && product.collections.length > 0 && (
                <div className="bg-gray-50 border-b border-gray-200">
                    <div className="container mx-auto px-4 md:px-6 lg:px-8 py-2">
                        <nav className="flex items-center gap-1.5 text-xs md:text-sm overflow-x-auto">
                            <Link href="/" className="text-gray-600 hover:text-gray-900 whitespace-nowrap">
                                Accueil
                            </Link>
                            <span className="text-gray-400">/</span>
                            {product.collections.map((collection, index) => (
                                <React.Fragment key={collection.id}>
                                    <Link 
                                        href={`/collection/${collection.slug}`}
                                        className="text-gray-600 hover:text-gray-900 whitespace-nowrap"
                                    >
                                        {collection.name}
                                    </Link>
                                    {index < product.collections.length - 1 && (
                                        <span className="text-gray-400">/</span>
                                    )}
                                </React.Fragment>
                            ))}
                        </nav>
                    </div>
                </div>
            )}

            <div className="container mx-auto px-4 md:px-6 lg:px-8 py-4 mt-6 md:mt-8">
                <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 lg:gap-12 items-start">
                    {/* Left Column: Image Carousel */}
                    <div className="lg:sticky lg:top-20 w-full max-w-[280px] mx-auto">
                        <ProductImageCarousel images={product.assets} />
                    </div>

                    {/* Right Column: Product Info */}
                    <div className="flex flex-col gap-6">
                        <ProductInfo product={product} searchParams={searchParamsResolved} />
                        <div className="pt-4 border-t">
                            <Suspense fallback={null}>
                                <ProductVendor productSlug={slug} />
                            </Suspense>
                        </div>
                    </div>
                </div>
            </div>

            {/* Related Products */}
            {primaryCollection && (
                <RelatedProducts
                    collectionSlug={primaryCollection.slug}
                    currentProductId={product.id}
                />
            )}
        </>
    );
}
