console.log('[ProductPage File] LOADING FILE: src/app/product/[slug]/page.tsx');
import type { Metadata } from 'next';
import { query } from '@/lib/vendure/api';
import { GetProductDetailQuery } from '@/lib/vendure/queries';
import { ProductImageCarousel } from '@/components/commerce/product-image-carousel';
import { ProductInfo } from '@/components/commerce/product-info';
import { RelatedProducts } from '@/components/commerce/related-products';
import { notFound } from 'next/navigation';
import {
    SITE_NAME,
    truncateDescription,
    buildCanonicalUrl,
    buildOgImages,
} from '@/lib/metadata';
import { ProductVendor } from '@/components/commerce/product-vendor';
import { getPageContent, getPreviewHabillageContent } from '@/lib/vendure/cms-queries';
import { BodySectionRenderer } from '@/components/ahizan/BodySectionRenderer';
import { Suspense } from 'react';
import Link from 'next/link';
import React from 'react';

async function getProductData(slug: string) {
    console.log(`[getProductData] Fetching for slug: "${slug}"`);
    const result = await query(GetProductDetailQuery, { slug });
    console.log(`[getProductData] Result for "${slug}":`, result.data.product ? 'FOUND' : 'NOT FOUND');
    return result;
}

export async function generateMetadata({ params }: any): Promise<Metadata> {
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

function ProductOverview({ config, product, searchParams, slug }: { config: any, product: any, searchParams: any, slug: string }) {
    if (!product) return null;

    const layout = config.layout || 'split';
    const showVendor = config.showVendor !== false;
    const showBadges = config.showBadges !== false;
    const addToCartStyle = config.addToCartStyle || 'primary';
    const showDescription = config.showDescription !== false;
    const showSpecifications = config.showSpecifications !== false;

    let containerClass = "grid grid-cols-1 gap-6 lg:gap-12 items-start";
    let leftColClass = "w-full mx-auto";
    
    if (layout === 'split') {
        containerClass += " lg:grid-cols-[280px_1fr]";
        leftColClass += " lg:sticky lg:top-20 max-w-[280px]";
    } else if (layout === 'gallery-top') {
        containerClass += " lg:grid-cols-1";
        leftColClass += " max-w-xl";
    } else {
        containerClass += " lg:grid-cols-[400px_1fr]";
        leftColClass += " lg:sticky lg:top-20 max-w-[400px]";
    }

    return (
        <div className="container mx-auto px-4 md:px-6 lg:px-8 py-4 mt-6 md:mt-8">
            <div className={containerClass}>
                {/* Left Column: Image Carousel */}
                <div className={leftColClass}>
                    <ProductImageCarousel images={product.assets} />
                </div>

                {/* Right Column: Product Info */}
                <div className="flex flex-col gap-6">
                    <ProductInfo product={product} searchParams={searchParams} config={config} />
                    
                    {showVendor && (
                        <div className="pt-4 border-t">
                            <Suspense fallback={null}>
                                <ProductVendor productSlug={slug} />
                            </Suspense>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function ProductReviews({ config }: { config: any }) {
    const showReviews = config.showReviews !== false;
    const reviewsCount = Number(config.reviewsCount) || 5;

    if (!showReviews) return null;

    const mockReviews = [
        { name: "Mariam K.", rating: 5, date: "Il y a 3 jours", text: "Produit d'excellente qualité, la texture et la couleur sont exactement comme sur les photos. Je recommande vivement !" },
        { name: "Kofi A.", rating: 4, date: "Il y a 1 semaine", text: "Très satisfait de mon achat. Livraison rapide au Bénin et service client très réactif." },
        { name: "Chantal T.", rating: 5, date: "Il y a 2 semaines", text: "Une merveille ! L'artisanat africain à son meilleur niveau. Bravo à Ahizan pour cette sélection." },
        { name: "Jean-Pierre D.", rating: 4, date: "Il y a 3 semaines", text: "Bon produit. Conforme à la description et de bonne facture." },
        { name: "Awa S.", rating: 5, date: "Le mois dernier", text: "Magnifique ! Absolument ravie de cet achat." }
    ].slice(0, reviewsCount);

    return (
        <section className="max-w-[1440px] mx-auto w-full px-4 sm:px-4 md:px-8 lg:px-12 mt-8 md:mt-12 py-8 border-t border-gray-200">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-secondary tracking-tight mb-6">Avis clients</h2>
            <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-8">
                <div className="bg-gray-50 p-6 rounded-2xl border flex flex-col items-center justify-center text-center h-fit">
                    <div className="text-5xl font-black text-foreground">4.6</div>
                    <div className="flex gap-1 my-2">
                        {[1, 2, 3, 4, 5].map((s) => (
                            <span key={s} className="text-yellow-500 text-lg">★</span>
                        ))}
                    </div>
                    <div className="text-xs text-muted-foreground font-bold font-sans">Sur la base de {mockReviews.length} avis</div>
                </div>

                <div className="space-y-4">
                    {mockReviews.map((r, i) => (
                        <div key={i} className="bg-card p-5 rounded-2xl border shadow-sm">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <div className="font-bold text-sm text-foreground">{r.name}</div>
                                    <div className="flex gap-0.5 text-xs text-yellow-500">
                                        {Array.from({ length: r.rating }).map((_, idx) => (
                                            <span key={idx}>★</span>
                                        ))}
                                    </div>
                                </div>
                                <span className="text-[10px] text-muted-foreground font-semibold">{r.date}</span>
                            </div>
                            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed font-medium">{r.text}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

export default async function ProductDetailPage({ params, searchParams }: any) {
    const { slug } = await params;
    const searchParamsResolved = await searchParams;

    console.log(`[ProductDetailPage] Rendering for slug: "${slug}"`);
    const result = await getProductData(slug);
    const product = result.data.product;

    if (!product) {
        notFound();
    }

    const primaryCollection = product.collections?.find((c: any) => c.parent?.id) ?? product.collections?.[0];

    // Load CMS configurations (preset preview or published page)
    const presetId = searchParamsResolved?.presetId;
    let cmsPage = null;
    if (presetId) {
        cmsPage = await getPreviewHabillageContent(presetId);
    } else {
        cmsPage = await getPageContent('product');
    }
    const sections = (cmsPage?.sections || [])
        .filter(s => (s.pageSlug || 'home') === 'product')
        .sort((a, b) => a.order - b.order);
    const activeSections = sections.filter(s => s.isActive);

    if (activeSections.length > 0) {
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
                                {product.collections.map((collection: any, index: any) => (
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

                <div className="space-y-4">
                    {activeSections.map((section, idx) => {
                        if (section.type === 'PRODUCT_OVERVIEW') {
                            return (
                                <ProductOverview 
                                    key={section.id || idx}
                                    config={section.data || {}}
                                    product={product}
                                    searchParams={searchParamsResolved}
                                    slug={slug}
                                />
                            );
                        }
                        if (section.type === 'PRODUCT_REVIEWS') {
                            return (
                                <ProductReviews 
                                    key={section.id || idx}
                                    config={section.data || {}}
                                />
                            );
                        }
                        if (section.type === 'RELATED_PRODUCTS') {
                            return primaryCollection ? (
                                <RelatedProducts
                                    key={section.id || idx}
                                    collectionSlug={primaryCollection.slug}
                                    currentProductId={product.id}
                                    title={section.data?.title}
                                    productsCount={Number(section.data?.productsCount)}
                                />
                            ) : null;
                        }
                        return (
                            <div key={section.id || idx}>
                                <BodySectionRenderer 
                                    section={section}
                                    siteCategories={[]}
                                    globalPromoConfig={{}}
                                />
                            </div>
                        );
                    })}
                </div>
            </>
        );
    }

    // Fallback to default hardcoded layout
    return (
        <>
            {product.collections && product.collections.length > 0 && (
                <div className="bg-gray-50 border-b border-gray-200">
                    <div className="container mx-auto px-4 md:px-6 lg:px-8 py-2">
                        <nav className="flex items-center gap-1.5 text-xs md:text-sm overflow-x-auto">
                            <Link href="/" className="text-gray-600 hover:text-gray-900 whitespace-nowrap">
                                Accueil
                            </Link>
                            <span className="text-gray-400">/</span>
                            {product.collections.map((collection: any, index: any) => (
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
                    <div className="lg:sticky lg:top-20 w-full max-w-[280px] mx-auto">
                        <ProductImageCarousel images={product.assets} />
                    </div>

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

            {primaryCollection && (
                <RelatedProducts
                    collectionSlug={primaryCollection.slug}
                    currentProductId={product.id}
                />
            )}
        </>
    );
}
