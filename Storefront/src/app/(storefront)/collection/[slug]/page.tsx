export const dynamic = 'force-dynamic';
export const revalidate = 0;

import type { Metadata } from 'next';
import { query } from '@/lib/vendure/api';
import { GetCollectionProductsQuery, GetCollectionAllowedFacetsQuery } from '@/lib/vendure/queries';
import { ProductGrid } from '@/components/commerce/product-grid';
import { FacetFilters } from '@/components/commerce/facet-filters';
import { getCurrentPage, buildSearchInput } from '@/lib/search-helpers';
import { SITE_NAME } from '@/lib/metadata';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { getAssetUrl } from '@/lib/vendure/api-utils';
import { getPageContent, getPreviewHabillageContent } from '@/lib/vendure/cms-queries';
import { BodySectionRenderer } from '@/components/ahizan/BodySectionRenderer';
import { FiltersToggleWrapper } from '@/components/commerce/FiltersToggleWrapper';
import { priceFromSubunit } from '@/lib/format';
import { expandProductsWithSellerOffers } from '@/lib/vendure/seller-offers';
import React from 'react';

async function getCollectionMetadata(slug: string) {
    return query(GetCollectionProductsQuery, {
        slug,
        input: { take: 100, collectionSlug: slug, groupByProduct: false },
    });
}

async function getCollectionAllowedFacets(slug: string) {
    try {
        const collectionResult = await query(GetCollectionProductsQuery, {
            slug,
            input: { take: 0, collectionSlug: slug, groupByProduct: false },
        });
        const collectionId = collectionResult?.data?.collection?.id;
        
        if (!collectionId) return null;
        
        return await query(GetCollectionAllowedFacetsQuery, { collectionId });
    } catch (err) {
        console.error('Failed to fetch collection allowed facets:', err);
        return null;
    }
}

export async function generateMetadata({ params }: any): Promise<Metadata> {
    const { slug } = await params;
    const result = await getCollectionMetadata(slug);
    const collection = result?.data?.collection;
    if (!collection) return { title: 'Collection' };
    return { title: collection.name };
}

function CategoryHeader({ config, collection, totalItems, fallbackCollectionImage }: { config: any, collection: any, totalItems: number, fallbackCollectionImage?: string }) {
    if (!collection) return null;

    const showBreadcrumbs = config.showBreadcrumbs !== false;
    const showSubcategories = config.showSubcategories !== false;
    const subcategoryStyle = config.subcategoryStyle || 'pills';
    
    const titleOverride = config.title || '';
    const description = config.description || '';
    
    // Check if useCollectionImage is explicitly true or missing (default true), and if collection has an image
    const useCollectionImg = config.useCollectionImage !== false;
    const resolvedCollectionImage = collection.featuredAsset?.preview || fallbackCollectionImage;
    const collectionImage = useCollectionImg && resolvedCollectionImage ? resolvedCollectionImage : '';
    const bannerImage = collectionImage || config.bannerImageUrl || '';
    
    const height = config.bannerHeight || '280px';
    const align = config.titleAlign || 'center';
    const textColor = config.titleColor || '#ffffff';
    const bgColor = config.bgColor || '#f8fafc';
    const overlayColor = config.bannerOverlayColor || 'rgba(0,0,0,0.35)';

    const displayTitle = titleOverride || collection.name;
    const alignClass = align === 'left' ? 'text-left items-start' : align === 'right' ? 'text-right items-end' : 'text-center items-center';

    const bgStyle = bannerImage 
        ? {
            backgroundImage: `url(${getAssetUrl(bannerImage)})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            minHeight: height,
          }
        : {
            backgroundColor: bgColor,
            minHeight: height,
          };

    return (
        <div 
            className="w-full relative overflow-hidden transition-all duration-300 rounded-2xl md:rounded-3xl border shadow-sm mb-8"
            style={bgStyle}
        >
            {bannerImage && (
                <div 
                    className="absolute inset-0 z-0" 
                    style={{ backgroundColor: overlayColor }} 
                />
            )}
            
            <div className={`relative z-10 container mx-auto px-4 md:px-8 py-12 flex flex-col justify-center h-full min-h-[inherit] ${alignClass}`}>
                {showBreadcrumbs && (
                    <nav className="flex text-xs md:text-sm mb-4 whitespace-nowrap overflow-x-auto pb-2 scrollbar-hide" style={{ color: bannerImage ? 'rgba(255,255,255,0.8)' : 'var(--muted-foreground)' }}>
                        <Link href="/" className="hover:text-primary font-medium shrink-0">Accueil</Link>
                        <span className="mx-2 shrink-0">/</span>
                        {collection.parent && collection.parent.name !== '__root_collection__' && (
                            <>
                                <Link href={`/collection/${collection.parent.slug}`} className="hover:text-primary font-medium shrink-0">
                                    {collection.parent.name}
                                </Link>
                                <span className="mx-2 shrink-0">/</span>
                            </>
                        )}
                        <span className="font-bold shrink-0" style={{ color: bannerImage ? '#ffffff' : 'var(--foreground)' }}>{collection.name}</span>
                    </nav>
                )}

                <h1 
                    className="text-3xl md:text-6xl font-black uppercase tracking-tighter drop-shadow-sm transition-all duration-300"
                    style={{ color: bannerImage ? '#ffffff' : textColor }}
                >
                    {displayTitle}
                </h1>

                {description && (
                    <p 
                        className="mt-3 text-sm md:text-lg max-w-2xl font-medium opacity-90 transition-all duration-300"
                        style={{ color: bannerImage ? '#ffffff' : textColor }}
                    >
                        {description}
                    </p>
                )}

                <p 
                    className="mt-2 text-xs md:text-sm font-semibold opacity-75"
                    style={{ color: bannerImage ? '#ffffff' : 'var(--muted-foreground)' }}
                >
                    {totalItems} produit{totalItems !== 1 ? 's' : ''} disponible{totalItems !== 1 ? 's' : ''}
                </p>

                {showSubcategories && collection.children && collection.children.length > 0 && (
                    <div className="mt-6 w-full">
                        {subcategoryStyle === 'cards' ? (
                            <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4 ${align === 'left' ? 'justify-items-start' : align === 'right' ? 'justify-items-end' : 'justify-items-center'}`}>
                                {collection.children.map((child: any) => {
                                    const childImg = child.featuredAsset?.preview ? getAssetUrl(child.featuredAsset.preview) : null;
                                    return (
                                        <Link 
                                            key={child.id} 
                                            href={`/collection/${child.slug}`}
                                            className="group relative rounded-xl overflow-hidden bg-card/90 backdrop-blur-sm border border-border/60 hover:border-primary hover:shadow-lg transition-all p-3 flex flex-col items-center text-center no-underline w-full"
                                            style={!bannerImage ? { backgroundColor: 'var(--card)', color: 'var(--foreground)' } : { backgroundColor: 'rgba(255,255,255,0.15)', color: '#ffffff', borderColor: 'rgba(255,255,255,0.25)' }}
                                        >
                                            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg bg-muted/80 mb-2 overflow-hidden flex items-center justify-center relative">
                                                {childImg ? (
                                                    <img src={childImg} alt={child.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                                ) : (
                                                    <span className="text-xl">📁</span>
                                                )}
                                            </div>
                                            <span className="font-bold text-xs sm:text-sm line-clamp-1 group-hover:text-primary transition-colors">
                                                {child.name}
                                            </span>
                                        </Link>
                                    );
                                })}
                            </div>
                        ) : subcategoryStyle === 'links' ? (
                            <div className={`flex flex-wrap gap-4 ${align === 'left' ? 'justify-start' : align === 'right' ? 'justify-end' : 'justify-center'}`}>
                                {collection.children.map((child: any) => (
                                    <Link 
                                        key={child.id} 
                                        href={`/collection/${child.slug}`}
                                        className="text-xs md:text-sm font-bold underline underline-offset-4 decoration-primary/50 hover:decoration-primary hover:text-primary transition-colors"
                                        style={bannerImage ? { color: '#ffffff' } : { color: 'var(--foreground)' }}
                                    >
                                        {child.name} →
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <div className={`flex overflow-x-auto gap-2 pb-2 scrollbar-hide max-w-full ${align === 'left' ? 'justify-start' : align === 'right' ? 'justify-end' : 'justify-center'}`}>
                                {collection.children.map((child: any) => (
                                    <Link 
                                        key={child.id} 
                                        href={`/collection/${child.slug}`}
                                        className="shrink-0 px-4 py-2 bg-white/10 backdrop-blur-md hover:bg-white/20 text-white font-bold text-xs md:text-sm rounded-full transition-all border border-white/20 shadow-sm"
                                        style={!bannerImage ? {
                                            backgroundColor: 'var(--surface)',
                                            color: 'var(--foreground)',
                                            borderColor: 'var(--border)'
                                        } : {}}
                                    >
                                        {child.name}
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

function DynamicProductGrid({ config, productData, currentPage, allowedFacets, allowedFacetIds }: { config: any, productData: any, currentPage: number, allowedFacets: any[], allowedFacetIds: string[] }) {
    const showFilters = config.showFilters !== false;
    const columns = Number(config.columns) || 3;
    const productsPerPage = Number(config.productsPerPage) || 12;

    const totalItems = productData?.data?.search?.totalItems || 0;

    const sidebarContent = (
        <div className="bg-card p-6 rounded-2xl border shadow-sm">
            <FacetFilters 
                productData={productData as any} 
                allowedFacetIds={allowedFacetIds}
                allowedFacets={allowedFacets}
            />
        </div>
    );

    const gridContent = (
        totalItems > 0 ? (
            <ProductGrid 
                aria-label="Grille de produits"
                productData={productData as any} 
                currentPage={currentPage} 
                take={productsPerPage} 
                columns={columns} 
                config={config}
            />
        ) : (
            <div className="bg-muted/30 text-muted-foreground p-16 rounded-3xl border border-dashed border-border text-center">
                <h2 className="text-3xl font-black mb-3 text-foreground tracking-tight">Aucun produit trouvé</h2>
                <p className="font-medium opacity-80">Cette catégorie ne contient encore aucun produit correspondant à vos critères.</p>
                <Button asChild variant="outline" className="mt-8 rounded-xl font-bold">
                    <Link href="/search">Découvrir d'autres produits</Link>
                </Button>
            </div>
        )
    );

    if (showFilters && sidebarContent) {
        if (config.filtersPosition === 'top') {
            return (
                <div className="space-y-8">
                    <div className="bg-card/90 backdrop-blur-sm p-6 rounded-2xl border border-border shadow-sm">
                        <div className="flex items-center justify-between mb-4 border-b border-border/50 pb-3">
                            <span className="font-black text-sm uppercase tracking-wider flex items-center gap-2 text-foreground">
                                🔍 Filtres et Options de Tri
                            </span>
                        </div>
                        {sidebarContent}
                    </div>
                    {gridContent}
                </div>
            );
        }
        return (
            <FiltersToggleWrapper sidebar={sidebarContent}>
                {gridContent}
            </FiltersToggleWrapper>
        );
    }

    return (
        <div className="flex flex-col lg:flex-row gap-12">
            <div className="flex-grow">
                {gridContent}
            </div>
        </div>
    );
}

export default async function CollectionPage({ params, searchParams }: any) {
    try {
        const { slug } = await params;
        const searchParamsResolved = await searchParams;
        const page = getCurrentPage(searchParamsResolved);

        // Build native search input
        const searchInput = buildSearchInput({ searchParams: searchParamsResolved, collectionSlug: slug });

        // Load CMS layout configuration (preset preview or published page) & allowed facets concurrently
        const presetId = searchParamsResolved?.presetId;
        const [cmsPage, homeCmsPage, allowedFacetsData] = await Promise.all([
            presetId ? getPreviewHabillageContent(presetId) : getPageContent('category'),
            getPageContent('home'),
            getCollectionAllowedFacets(slug)
        ]);

        const sections = (cmsPage?.sections || [])
            .filter((s: any) => (s.pageSlug || 'home') === 'category')
            .sort((a: any, b: any) => a.order - b.order);

        // Handle products per page from CMS settings if present
        const gridSection = sections.find((s: any) => s.type === 'DYNAMIC_PRODUCT_GRID');
        if (gridSection?.data?.productsPerPage) {
            searchInput.take = Number(gridSection.data.productsPerPage);
            searchInput.skip = (page - 1) * searchInput.take;
        }

        // Execute unified native query for collection details + search results
        const searchResult = await query(GetCollectionProductsQuery, {
            slug,
            input: searchInput,
        });

        const collection = searchResult?.data?.collection;
        if (!collection) return <div className="mt-20 p-10 text-center font-bold text-xl">Collection non trouvée.</div>;

        const allowedFacets = (allowedFacetsData?.data as any)?.collectionAllowedFacets?.allowedFacets || [];
        const allowedFacetIds = (allowedFacetsData?.data as any)?.collectionAllowedFacets?.allowedFacetIds || [];

        let fallbackCollectionImage = '';
        if (homeCmsPage?.sections) {
            const categoriesSection = homeCmsPage.sections.find((s: any) => s.type === 'CATEGORIES' && s.isActive);
            if (categoriesSection?.data?.collectionMedia?.[slug]) {
                fallbackCollectionImage = categoriesSection.data.collectionMedia[slug];
            }
        }

        const searchData = searchResult?.data?.search;
        let rawProducts: any[] = searchData?.items || [];
        let products: any[] = await expandProductsWithSellerOffers(rawProducts);
        let totalItems = products.length || searchData?.totalItems || 0;
        const facetValues = searchData?.facetValues || [];

        // Filter products by price range on storefront side if minPrice/maxPrice is specified
        const minPriceNum = searchParamsResolved?.minPrice ? Number(searchParamsResolved.minPrice) : undefined;
        const maxPriceNum = searchParamsResolved?.maxPrice ? Number(searchParamsResolved.maxPrice) : undefined;

        if (minPriceNum !== undefined || maxPriceNum !== undefined) {
            products = products.filter((p: any) => {
                let price = 0;
                if (p.priceWithTax) {
                    if (p.priceWithTax.__typename === 'SinglePrice') {
                        price = p.priceWithTax.value;
                    } else if (p.priceWithTax.__typename === 'PriceRange') {
                        price = p.priceWithTax.min || 0;
                    } else if (typeof p.priceWithTax === 'number') {
                        price = p.priceWithTax;
                    }
                } else if (p.variants?.[0]?.priceWithTax) {
                    price = p.variants[0].priceWithTax;
                }
                const userPrice = priceFromSubunit(price);

                if (minPriceNum !== undefined && userPrice < minPriceNum) return false;
                if (maxPriceNum !== undefined && userPrice > maxPriceNum) return false;
                return true;
            });
            totalItems = products.length;
        }

        const productData = {
            data: {
                search: {
                    totalItems,
                    items: products,
                    facetValues,
                }
            }
        };

        const activeSections = sections.filter(s => s.isActive);

        if (activeSections.length > 0) {
            return (
                <div className="container mx-auto px-4 py-8 mt-16 min-h-screen">
                    <div className="space-y-8">
                        {activeSections.map((section, idx) => {
                            if (section.type === 'CATEGORY_HEADER') {
                                return (
                                    <CategoryHeader 
                                        key={section.id || idx}
                                        config={section.data || {}}
                                        collection={collection}
                                        totalItems={totalItems}
                                        fallbackCollectionImage={fallbackCollectionImage}
                                    />
                                );
                            }
                            if (section.type === 'DYNAMIC_PRODUCT_GRID') {
                                return (
                                    <DynamicProductGrid 
                                        key={section.id || idx}
                                        config={section.data || {}}
                                        productData={productData}
                                        currentPage={page}
                                        allowedFacets={allowedFacets}
                                        allowedFacetIds={allowedFacetIds}
                                    />
                                );
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
                </div>
            );
        }

        // Fallback to default hardcoded layout
        return (
            <div className="container mx-auto px-4 md:px-6 lg:px-8 py-8 mt-16 min-h-screen">
                <div className="mb-8 md:mb-12 border-b pb-6">
                    <nav className="flex text-xs md:text-sm text-gray-500 mb-4 whitespace-nowrap overflow-x-auto pb-2 scrollbar-hide">
                        <Link href="/" className="hover:text-red-600 font-medium shrink-0">Accueil</Link>
                        <span className="mx-2 shrink-0">/</span>
                        {collection.parent && collection.parent.name !== '__root_collection__' && (
                            <>
                                <Link href={`/collection/${collection.parent.slug}`} className="hover:text-red-600 font-medium shrink-0">
                                    {collection.parent.name}
                                </Link>
                                <span className="mx-2 shrink-0">/</span>
                            </>
                        )}
                        <span className="text-gray-900 font-bold shrink-0">{collection.name}</span>
                    </nav>

                    <h1 className="text-3xl md:text-6xl font-black text-foreground uppercase tracking-tighter drop-shadow-sm">
                        {collection.name}
                    </h1>
                    <p className="text-muted-foreground mt-3 text-sm md:text-lg font-medium">
                        {totalItems} produit{totalItems !== 1 ? 's' : ''} disponible{totalItems !== 1 ? 's' : ''}
                    </p>

                    {collection.children && collection.children.length > 0 && (
                        <div className="mt-6 flex overflow-x-auto gap-2 pb-2 scrollbar-hide">
                            {collection.children.map((child: any) => (
                                <Link 
                                    key={child.id} 
                                    href={`/collection/${child.slug}`}
                                    className="shrink-0 px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-800 font-bold text-xs md:text-sm rounded-full transition-colors border border-gray-200 shadow-sm"
                                >
                                    {child.name}
                                </Link>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex flex-col lg:flex-row gap-12">
                    <aside className="w-full lg:w-1/4 shrink-0">
                        <div className="sticky top-28">
                            <div className="bg-card p-6 rounded-2xl border shadow-sm">
                                <FacetFilters 
                                    productData={productData as any} 
                                    allowedFacetIds={allowedFacetIds}
                                    allowedFacets={allowedFacets}
                                />
                            </div>
                        </div>
                    </aside>

                    <div className="flex-grow">
                        {totalItems > 0 ? (
                            <ProductGrid 
                                aria-label="Grille de produits"
                                productData={productData as any} 
                                currentPage={page} 
                                take={12} 
                                columns={3} 
                            />
                        ) : (
                            <div className="bg-muted/30 text-muted-foreground p-16 rounded-3xl border border-dashed border-border text-center">
                                <h2 className="text-3xl font-black mb-3 text-foreground tracking-tight">Aucun produit trouvé</h2>
                                <p className="font-medium opacity-80">Cette catégorie ne contient encore aucun produit correspondant à vos critères.</p>
                                <Button asChild variant="outline" className="mt-8 rounded-xl font-bold">
                                    <Link href="/search">Découvrir d'autres produits</Link>
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    } catch (error) {
        console.error('[CollectionPage] Error:', error);
        return <div className="mt-20 p-10 text-center text-destructive font-bold">Erreur lors du chargement de la collection: {(error as any).message}</div>;
    }
}