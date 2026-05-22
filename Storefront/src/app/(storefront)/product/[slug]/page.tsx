console.log('[ProductPage File] LOADING FILE: src/app/product/[slug]/page.tsx');
import type { Metadata } from 'next';
import { query } from '@/lib/vendure/api';
import { GetProductDetailQuery } from '@/lib/vendure/queries';
import { ProductImageCarousel } from '@/components/commerce/product-image-carousel';
import { ProductInfo } from '@/components/commerce/product-info';
import { RelatedProducts } from '@/components/commerce/related-products';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion';
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
            <div className="container mx-auto px-6 md:px-12 lg:px-20 py-4 mt-8 md:mt-12">
                <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-8 lg:gap-16 items-start">
                    {/* Left Column: Image Carousel */}
                    <div className="lg:sticky lg:top-24 w-full max-w-[320px] mx-auto">
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

            {/* Product Benefits Section */}
            <section className="py-10 bg-muted/20 mt-8 border-y border-border/50">
                <div className="container mx-auto px-6 md:px-12 lg:px-20">
                    <h2 className="text-xl font-bold text-center mb-6 text-foreground/80 tracking-tight uppercase text-[12px]">Nos Engagements</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                        <div className="flex flex-col items-center gap-2">
                            <div className="w-10 h-10 bg-primary/5 rounded-full flex items-center justify-center">
                                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                </svg>
                            </div>
                            <h3 className="text-sm font-bold text-foreground">Qualité Premium</h3>
                            <p className="text-xs text-muted-foreground max-w-[200px]">Produits sélectionnés avec soin</p>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                            <div className="w-10 h-10 bg-primary/5 rounded-full flex items-center justify-center">
                                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                                </svg>
                            </div>
                            <h3 className="text-sm font-bold text-foreground">Vendeurs locaux</h3>
                            <p className="text-xs text-muted-foreground max-w-[200px]">Soutenez le commerce de proximité</p>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                            <div className="w-10 h-10 bg-primary/5 rounded-full flex items-center justify-center">
                                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                </svg>
                            </div>
                            <h3 className="text-sm font-bold text-foreground">Satisfaction garantie</h3>
                            <p className="text-xs text-muted-foreground max-w-[200px]">Paiement sécurisé et suivi</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Store FAQ Section */}
            <section className="py-10">
                <div className="container mx-auto px-6 md:px-12 lg:px-20 max-w-4xl">
                    <h2 className="text-lg font-bold text-center mb-6 text-foreground tracking-tight">Questions fréquentes</h2>
                    <Accordion type="single" collapsible className="w-full space-y-2">
                        <AccordionItem value="shipping" className="border rounded-lg px-4 bg-card shadow-sm">
                            <AccordionTrigger className="text-sm font-semibold hover:no-underline py-3">Options de livraison</AccordionTrigger>
                            <AccordionContent className="text-xs text-muted-foreground leading-relaxed">
                                La livraison est gérée par chaque vendeur. Les délais et tarifs varient selon la zone géographique.
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="returns" className="border rounded-lg px-4 bg-card shadow-sm">
                            <AccordionTrigger className="text-sm font-semibold hover:no-underline py-3">Politique de retour</AccordionTrigger>
                            <AccordionContent className="text-xs text-muted-foreground leading-relaxed">
                                Chaque vendeur définit sa propre politique de retour. Consultez les conditions avant d'acheter.
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="tracking" className="border rounded-lg px-4 bg-card shadow-sm">
                            <AccordionTrigger className="text-sm font-semibold hover:no-underline py-3">Suivi de commande</AccordionTrigger>
                            <AccordionContent className="text-xs text-muted-foreground leading-relaxed">
                                Consultez la section "Mes commandes" pour suivre l'état de vos commandes en temps réel.
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </div>
            </section>

            {primaryCollection && (
                <RelatedProducts
                    collectionSlug={primaryCollection.slug}
                    currentProductId={product.id}
                />
            )}
        </>
    );
}
