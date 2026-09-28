export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

async function getProductData(slugOrId: string) {
    if (!slugOrId || slugOrId === 'undefined' || slugOrId === 'null') {
        return { data: { product: null } };
    }
    let decoded = slugOrId;
    try {
        decoded = decodeURIComponent(slugOrId);
    } catch (_) {}

    try {
        // 1. Try slug with decoded value
        let result = await query(GetProductDetailQuery, { slug: decoded });
        if (result?.data?.product) return result;

        // 2. Try slug with original raw value
        if (decoded !== slugOrId) {
            result = await query(GetProductDetailQuery, { slug: slugOrId });
            if (result?.data?.product) return result;
        }

        // 3. Try lookup by ID with decoded value
        result = await query(GetProductDetailQuery, { id: decoded });
        if (result?.data?.product) return result;

        // 4. Try lookup by ID with raw value
        if (decoded !== slugOrId) {
            result = await query(GetProductDetailQuery, { id: slugOrId });
            if (result?.data?.product) return result;
        }

        // 5. Try lookup if slugOrId is a variant ID
        try {
            const GET_PRODUCT_BY_VARIANT_ID = `
                query GetProductByVariant($variantId: ID!) {
                    productVariant(id: $variantId) {
                        id
                        product {
                            id
                            slug
                        }
                    }
                }
            `;
            const variantRes = await rawQuery(GET_PRODUCT_BY_VARIANT_ID, { variables: { variantId: decoded } });
            const prodId = variantRes?.productVariant?.product?.id;
            if (prodId) {
                result = await query(GetProductDetailQuery, { id: prodId });
                if (result?.data?.product) return result;
            }
        } catch {}

        return { data: { product: null } };
    } catch (err) {
        console.warn(`[getProductData] Query error for "${slugOrId}":`, err);
        return { data: { product: null } };
    }
}

export async function generateMetadata({ params, searchParams }: any): Promise<Metadata> {
    const { slug } = await params;
    const resolvedSearchParams = searchParams ? await searchParams : {};
    try {
        const result = await getProductData(slug);
        const product = result?.data?.product;

        if (!product) {
            return {
                title: 'Produit non trouvé',
            };
        }

    const rawVariantParam = resolvedSearchParams?.variant || resolvedSearchParams?.variantId;
    let targetVariant = product.variants?.[0];
    if (rawVariantParam) {
        const vId = String(Array.isArray(rawVariantParam) ? rawVariantParam[0] : rawVariantParam);
        const matched = product.variants?.find((v: any) => String(v.id) === vId);
        if (matched) {
            targetVariant = matched;
        }
    }

    const description = truncateDescription(product.description);
    const ogImage = targetVariant?.featuredAsset?.preview || targetVariant?.assets?.[0]?.preview || product.assets?.[0]?.preview;
    const priceAmount = targetVariant?.priceWithTax ? (targetVariant.priceWithTax).toString() : undefined;
    const optNames = (targetVariant?.options || []).map((o: any) => o.name || o.code).filter(Boolean).join(' • ');
    let declSuffix = optNames;
    if (!declSuffix && targetVariant?.name) {
        const vName = targetVariant.name.trim();
        if (vName.toLowerCase().startsWith(product.name.toLowerCase()) && vName.length > product.name.length) {
            const clean = vName.substring(product.name.length).replace(/^[\s\-–—:]+/, '').trim();
            if (clean && clean.toLowerCase() !== product.name.toLowerCase()) {
                declSuffix = clean;
            }
        }
    }
    const collectionsStr = product.collections?.map((c: any) => c.name).join(', ');
    const fullTitle = declSuffix ? `${product.name} — ${declSuffix}` : product.name;
    const keywords = [product.name, declSuffix, collectionsStr, SITE_NAME, 'Bénin', 'E-commerce', 'Achat en ligne'].filter(Boolean).join(', ');

        return {
            title: fullTitle,
            description: description || `Achetez ${fullTitle} sur ${SITE_NAME}`,
            keywords,
            alternates: {
                canonical: buildCanonicalUrl(`/product/${product.slug}${targetVariant?.id ? `?variant=${targetVariant.id}` : ''}`),
            },
            openGraph: {
                title: fullTitle,
                description: description || `Achetez ${fullTitle} sur ${SITE_NAME}`,
                type: 'website',
                url: buildCanonicalUrl(`/product/${product.slug}${targetVariant?.id ? `?variant=${targetVariant.id}` : ''}`),
                images: buildOgImages(ogImage, fullTitle),
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
                title: fullTitle,
                description: description || `Achetez ${fullTitle} sur ${SITE_NAME}`,
                images: ogImage ? [ogImage] : undefined,
            },
        };
    } catch {
        return {
            title: 'Produit',
        };
    }
}

function buildProductJsonLd(product: any) {
    const mainVariant = product.variants?.[0];
    const rawPrice = mainVariant?.priceWithTax ? mainVariant.priceWithTax : 0;
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

function isRootCollection(col: any): boolean {
    if (!col) return true;
    const name = (col.name || '').toLowerCase().trim();
    const slug = (col.slug || '').toLowerCase().trim();
    return !name || name.includes('root_collection') || name.startsWith('_root') || slug.includes('root_collection') || slug.startsWith('_root');
}

function getProductBreadcrumbTrail(product: any): Array<{ id: string; name: string; slug: string }> {
    const collections = product?.collections || [];
    if (collections.length === 0) return [];

    let bestTrail: any[] = [];

    // 1. Prioritize real hierarchical ancestor breadcrumbs from the deepest collection
    for (const col of collections) {
        if (isRootCollection(col)) continue;
        const crumbs = (col.breadcrumbs || []).filter((b: any) => !isRootCollection(b));
        if (crumbs.length > bestTrail.length) {
            bestTrail = crumbs;
        }
    }

    if (bestTrail.length > 0) {
        return bestTrail;
    }

    // 2. Fallback: Pick the deepest collection (with parent) or first valid collection
    const validCollections = collections.filter((col: any) => !isRootCollection(col));
    if (validCollections.length === 0) return [];

    const deepest = validCollections.find((c: any) => c.parent?.id) || validCollections[0];
    if (deepest.parent && deepest.parent.name && !isRootCollection(deepest.parent)) {
        return [deepest.parent, deepest];
    }
    return [deepest];
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

    const breadcrumbTrail = getProductBreadcrumbTrail(product);
    breadcrumbTrail.forEach((col: any, idx: number) => {
        items.push({
            '@type': 'ListItem',
            position: idx + 2,
            name: col.name,
            item: buildCanonicalUrl(`/collection/${col.slug}`),
        });
    });

    items.push({
        '@type': 'ListItem',
        position: breadcrumbTrail.length + 2,
        name: product.name,
        item: buildCanonicalUrl(`/product/${product.slug}`),
    });

    return JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: items,
    });
}


function ProductOverview({ config, product, searchParams, slug, whatsappNumber, allOffers }: { config: any, product: any, searchParams: any, slug: string, whatsappNumber?: string, allOffers?: any[] }) {
    if (!product) return null;

    const layout = config.layout || 'split';

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
                        <ProductInfo 
                            product={product} 
                            searchParams={searchParams} 
                            config={config} 
                            whatsappNumber={whatsappNumber} 
                            allOffers={allOffers}
                        />
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
    const searchParamsResolved = searchParams ? await searchParams : {};

    let product = null;
    let whatsappNumber = '';
    try {
        const [result, wa] = await Promise.all([
            getProductData(slug),
            getWhatsappNumber(),
        ]);
        product = result?.data?.product;
        whatsappNumber = wa || '';
    } catch (e) {
        console.error('[ProductDetailPage] Error fetching product data:', e);
    }

    if (!product) {
        notFound();
    }

    // Fetch all approved seller offers for this product's variants
    const variantIds = (product.variants || []).map((v: any) => v.id);
    let allOffers: any[] = [];
    if (variantIds.length > 0) {
        try {
            const GET_PRODUCT_OFFERS_QUERY = `
                query GetProductOffers($variantIds: [ID!]!) {
                    sellerOffersForVariants(variantIds: $variantIds) {
                        id
                        price
                        stock
                        onPromotion
                        promotionalPrice
                        condition
                        deliveryTimeValue
                        deliveryTimeUnit
                        vendor {
                            id
                            name
                            rating
                            ratingCount
                            verificationStatus
                            latitude
                            longitude
                            zone
                            address
                            logo {
                                preview
                            }
                            location {
                                id
                                name
                            }
                            physicalMarket {
                                id
                                name
                            }
                        }
                        productVariant {
                            id
                            name
                            sku
                        }
                    }
                }
            `;
            const offersRes = await rawQuery(GET_PRODUCT_OFFERS_QUERY, { variables: { variantIds } });
            allOffers = offersRes?.sellerOffersForVariants || [];

        } catch (e) {
            console.warn('[ProductDetailPage] Failed to fetch sellerOffersForVariants:', e);
        }
    }

    const sortedCollectionSlugs = (product.collections || [])
        .filter((col: any) => !isRootCollection(col))
        .sort((a: any, b: any) => {
            const aDepth = (a.breadcrumbs?.length || (a.parent?.id ? 2 : 1));
            const bDepth = (b.breadcrumbs?.length || (b.parent?.id ? 2 : 1));
            return bDepth - aDepth;
        })
        .map((c: any) => c.slug)
        .filter(Boolean);

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
                {(() => {
                    const breadcrumbTrail = getProductBreadcrumbTrail(product);
                    if (breadcrumbTrail.length === 0) return null;
                    return (
                        <div className="bg-gray-50 border-b border-gray-200">
                            <div className="container mx-auto px-4 md:px-6 lg:px-8 py-2">
                                <nav className="flex items-center gap-1.5 text-xs md:text-sm overflow-x-auto">
                                    <Link href="/" className="text-gray-600 hover:text-gray-900 whitespace-nowrap">
                                        Accueil
                                    </Link>
                                    <span className="text-gray-400">/</span>
                                    {breadcrumbTrail.map((collection: any, index: number) => (
                                        <React.Fragment key={collection.id || collection.slug || index}>
                                            <Link 
                                                href={`/collection/${collection.slug}`}
                                                className="text-gray-600 hover:text-gray-900 whitespace-nowrap"
                                            >
                                                {collection.name}
                                            </Link>
                                            {index < breadcrumbTrail.length - 1 && (
                                                <span className="text-gray-400">/</span>
                                            )}
                                        </React.Fragment>
                                    ))}
                                </nav>
                            </div>
                        </div>
                    );
                })()}

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
                                    allOffers={allOffers}
                                />
                            );
                        } else if (section.type === 'PRODUCT_REVIEWS') {

                            content = (
                                <ProductReviews 
                                    config={section.data || {}}
                                />
                            );
                        } else if (section.type === 'RELATED_PRODUCTS') {
                            content = (
                                <RelatedProducts
                                    collectionSlugs={sortedCollectionSlugs}
                                    currentProductId={product.id}
                                    title={section.data?.title}
                                    productsCount={Number(section.data?.productsCount)}
                                />
                            );
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
            {(() => {
                const breadcrumbTrail = getProductBreadcrumbTrail(product);
                if (breadcrumbTrail.length === 0) return null;
                return (
                    <div className="bg-gray-50 border-b border-gray-200">
                        <div className="container mx-auto px-4 md:px-6 lg:px-8 py-2">
                            <nav className="flex items-center gap-1.5 text-xs md:text-sm overflow-x-auto">
                                <Link href="/" className="text-gray-600 hover:text-gray-900 whitespace-nowrap">
                                    Accueil
                                </Link>
                                <span className="text-gray-400">/</span>
                                {breadcrumbTrail.map((collection: any, index: number) => (
                                    <React.Fragment key={collection.id || collection.slug || index}>
                                        <Link 
                                            href={`/collection/${collection.slug}`}
                                            className="text-gray-600 hover:text-gray-900 whitespace-nowrap"
                                        >
                                            {collection.name}
                                        </Link>
                                        {index < breadcrumbTrail.length - 1 && (
                                            <span className="text-gray-400">/</span>
                                        )}
                                    </React.Fragment>
                                ))}
                            </nav>
                        </div>
                    </div>
                );
            })()}

            <div className="container mx-auto px-4 md:px-6 lg:px-8 py-4 mt-6 md:mt-8" id="cms-penultimate-section">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
                    <div className="lg:col-span-5 xl:col-span-5 max-w-[480px] lg:sticky lg:top-20 w-full mx-auto lg:mx-0">
                        <ProductImageCarousel images={product.assets} />
                    </div>

                    <div className="lg:col-span-7 xl:col-span-7 flex flex-col gap-6">
                        <ProductInfo 
                            product={product} 
                            searchParams={searchParamsResolved} 
                            whatsappNumber={whatsappNumber} 
                            allOffers={allOffers}
                        />
                    </div>

                </div>
                <div id="cms-penultimate-section-bottom" />
            </div>

            {/* Long Description full-width */}
            <ProductLongDescription description={product.description} />

            <div id="cms-last-section-top" />

            <RelatedProducts
                collectionSlugs={sortedCollectionSlugs}
                currentProductId={product.id}
            />
        </>
    );
}
