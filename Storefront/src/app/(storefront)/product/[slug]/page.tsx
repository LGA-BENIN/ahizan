console.log('[ProductPage File] LOADING FILE: src/app/product/[slug]/page.tsx');
import type { Metadata } from 'next';
import { query } from '@/lib/vendure/api';
import { GetProductDetailQuery } from '@/lib/vendure/queries';
import { ProductImageCarousel } from '@/components/commerce/product-image-carousel';
import { ProductInfo } from '@/components/commerce/product-info';
import { ProductLongDescription } from '@/components/commerce/product-long-description';
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
import { rawQuery } from '@/lib/vendure/raw-api';

const GET_GLOBAL_WHATSAPP = `
    query GetGlobalWhatsapp {
        whatsappNumber
    }
`;

async function getWhatsappNumber(): Promise<string> {
    try {
        const data = await rawQuery(GET_GLOBAL_WHATSAPP);
        return data?.whatsappNumber || '';
    } catch {
        return '';
    }
}

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
    const mainVariant = product.variants?.[0];
    const priceAmount = mainVariant?.priceWithTax ? (mainVariant.priceWithTax / 100).toString() : undefined;
    const collectionsStr = product.collections?.map((c: any) => c.name).join(', ');
    const keywords = [product.name, collectionsStr, SITE_NAME, 'Bénin', 'E-commerce', 'Achat en ligne'].filter(Boolean).join(', ');

    return {
        title: product.name,
        description: description || `Achetez ${product.name} sur ${SITE_NAME}`,
        keywords,
        alternates: {
            canonical: buildCanonicalUrl(`/product/${product.slug}`),
        },
        openGraph: {
            title: product.name,
            description: description || `Achetez ${product.name} sur ${SITE_NAME}`,
            type: 'website',
            url: buildCanonicalUrl(`/product/${product.slug}`),
            images: buildOgImages(ogImage, product.name),
            ...(priceAmount ? {
                other: {
                    'product:price:amount': priceAmount,
                    'product:price:currency': 'XOF',
                    'product:availability': 'in stock',
                }
            } : {})
        },
        twitter: {
            card: 'summary_large_image',
            title: product.name,
            description: description || `Achetez ${product.name} sur ${SITE_NAME}`,
            images: ogImage ? [ogImage] : undefined,
        },
    };
}

function buildProductJsonLd(product: any) {
    const mainVariant = product.variants?.[0];
    const rawPrice = mainVariant?.priceWithTax ? mainVariant.priceWithTax / 100 : 0;
    const cleanDescription = truncateDescription(product.description, 500);
    const images = product.assets?.map((a: any) => a.preview).filter(Boolean) || [];

    const jsonLd: any = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.name,
        image: images.length > 0 ? images : undefined,
        description: cleanDescription || `Achetez ${product.name} sur ${SITE_NAME}`,
        sku: mainVariant?.sku || product.id,
        offers: {
            '@type': 'Offer',
            url: buildCanonicalUrl(`/product/${product.slug}`),
            priceCurrency: 'XOF',
            price: rawPrice,
            availability: (mainVariant?.stockLevel !== 'IN_STOCK' && mainVariant?.stockLevel === 'OUT_OF_STOCK') 
                ? 'https://schema.org/OutOfStock' 
                : 'https://schema.org/InStock',
            itemCondition: 'https://schema.org/NewCondition',
        },
    };

    if (product.collections?.length > 0) {
        jsonLd.category = product.collections[0].name;
    }

    return JSON.stringify(jsonLd);
}

function buildBreadcrumbJsonLd(product: any) {
    const items: any[] = [
        {
            '@type': 'ListItem',
            position: 1,
            name: 'Accueil',
            item: buildCanonicalUrl('/'),
        },
    ];

    if (product.collections && product.collections.length > 0) {
        product.collections.forEach((col: any, idx: number) => {
            items.push({
                '@type': 'ListItem',
                position: idx + 2,
                name: col.name,
                item: buildCanonicalUrl(`/collection/${col.slug}`),
            });
        });
    }

    items.push({
        '@type': 'ListItem',
        position: items.length + 1,
        name: product.name,
        item: buildCanonicalUrl(`/product/${product.slug}`),
    });

    return JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: items,
    });
}


function ProductOverview({ config, product, searchParams, slug, whatsappNumber }: { config: any, product: any, searchParams: any, slug: string, whatsappNumber?: string }) {
    if (!product) return null;

    const layout = config.layout || 'split';
    const showVendor = config.showVendor !== false;

    let containerClass = "grid grid-cols-1 gap-6 lg:gap-12 items-start";
    let leftColClass = "w-full mx-auto";
    let rightColClass = "flex flex-col gap-6";
    
    if (layout === 'split') {
        containerClass += " lg:grid-cols-12 gap-8 lg:gap-12";
        leftColClass += " lg:col-span-5 xl:col-span-5 max-w-[480px] lg:sticky lg:top-20 w-full mx-auto lg:mx-0";
        rightColClass += " lg:col-span-7 xl:col-span-7";
    } else if (layout === 'gallery-top') {
        containerClass += " lg:grid-cols-1";
        leftColClass += " w-full max-w-2xl mx-auto";
        rightColClass += " w-full max-w-3xl mx-auto";
    } else {
        containerClass += " lg:grid-cols-12 gap-8 lg:gap-12";
        leftColClass += " lg:col-span-5 xl:col-span-5 max-w-[480px] lg:sticky lg:top-20 w-full mx-auto lg:mx-0";
        rightColClass += " lg:col-span-7 xl:col-span-7";
    }

    return (
        <>
            <div className="container mx-auto px-4 md:px-6 lg:px-8 py-4 mt-6 md:mt-8">
                <div className={containerClass}>
                    {/* Left Column: Image Carousel */}
                    <div className={leftColClass}>
                        <ProductImageCarousel images={product.assets} />
                    </div>

                    {/* Right Column: Product Info */}
                    <div className={rightColClass}>
                        <ProductInfo product={product} searchParams={searchParams} config={config} whatsappNumber={whatsappNumber} />
                        
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

            {/* Long Description full-width */}
            <ProductLongDescription description={product.description} />
        </>
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
                        {[...Array(5)].map((_, i) => (
                            <span key={i} className="text-amber-400 text-lg">★</span>
                        ))}
                    </div>
                    <p className="text-xs text-muted-foreground font-semibold">Basé sur {mockReviews.length * 3 + 12} avis</p>
                </div>
                <div className="space-y-4">
                    {mockReviews.map((r, i) => (
                        <div key={i} className="bg-gray-50/50 p-4 rounded-xl border border-gray-100 space-y-1">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-sm text-foreground">{r.name}</span>
                                    <div className="flex text-amber-400 text-xs">
                                        {[...Array(r.rating)].map((_, j) => (
                                            <span key={j}>★</span>
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
    const [result, whatsappNumber] = await Promise.all([
        getProductData(slug),
        getWhatsappNumber(),
    ]);
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

    const penultimateIdx = activeSections.length >= 2 ? activeSections.length - 2 : activeSections.length - 1;

    if (activeSections.length > 0) {
        return (
            <>
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: buildProductJsonLd(product) }}
                />
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: buildBreadcrumbJsonLd(product) }}
                />
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
                        const isPenultimate = idx === penultimateIdx;
                        const isLast = idx === activeSections.length - 1;
                        const sectionId = isPenultimate ? "cms-penultimate-section" : undefined;

                        let content = null;
                        if (section.type === 'PRODUCT_OVERVIEW') {
                            content = (
                                <ProductOverview 
                                    config={section.data || {}}
                                    product={product}
                                    searchParams={searchParamsResolved}
                                    slug={slug}
                                    whatsappNumber={whatsappNumber}
                                />
                            );
                        } else if (section.type === 'PRODUCT_REVIEWS') {
                            content = (
                                <ProductReviews 
                                    config={section.data || {}}
                                />
                            );
                        } else if (section.type === 'RELATED_PRODUCTS') {
                            content = primaryCollection ? (
                                <RelatedProducts
                                    collectionSlug={primaryCollection.slug}
                                    currentProductId={product.id}
                                    title={section.data?.title}
                                    productsCount={Number(section.data?.productsCount)}
                                />
                            ) : null;
                        } else {
                            content = (
                                <BodySectionRenderer 
                                    section={section}
                                    siteCategories={[]}
                                    globalPromoConfig={{}}
                                />
                            );
                        }

                        return (
                            <React.Fragment key={section.id || idx}>
                                {isLast && <div id="cms-last-section-top" />}
                                <div id={sectionId}>
                                    {content}
                                    {isPenultimate && <div id="cms-penultimate-section-bottom" />}
                                </div>
                            </React.Fragment>
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

            <div className="container mx-auto px-4 md:px-6 lg:px-8 py-4 mt-6 md:mt-8" id="cms-penultimate-section">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
                    <div className="lg:col-span-5 xl:col-span-5 max-w-[480px] lg:sticky lg:top-20 w-full mx-auto lg:mx-0">
                        <ProductImageCarousel images={product.assets} />
                    </div>

                    <div className="lg:col-span-7 xl:col-span-7 flex flex-col gap-6">
                        <ProductInfo product={product} searchParams={searchParamsResolved} whatsappNumber={whatsappNumber} />
                        <div className="pt-4 border-t">
                            <Suspense fallback={null}>
                                <ProductVendor productSlug={slug} />
                            </Suspense>
                        </div>
                    </div>
                </div>
                <div id="cms-penultimate-section-bottom" />
            </div>

            {/* Long Description full-width */}
            <ProductLongDescription description={product.description} />

            <div id="cms-last-section-top" />

            {primaryCollection && (
                <RelatedProducts
                    collectionSlug={primaryCollection.slug}
                    currentProductId={product.id}
                />
            )}
        </>
    );
}
