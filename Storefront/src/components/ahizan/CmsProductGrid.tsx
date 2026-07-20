"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DenseProductCard } from "@/components/commerce/dense-product-card";
import { ProductCard } from "@/components/commerce/product-card";
import { getShopApiUrl, getAssetUrl } from "@/lib/vendure/api-utils";

interface CmsProductGridProps {
    config: {
        title?: string;
        subtitle?: string;
        collectionSlug?: string;
        facetValueIds?: string[];
        take?: number;
        columns?: number;
        cardStyle?: string;
        showPrice?: boolean;
        showDiscount?: boolean;
        showAddToCart?: boolean;
        imageRatio?: string;
        bgType?: string;
        bgColor?: string;
        bgImageUrl?: string;
        headerStyle?: string;
    };
}

const isGif = (url: string | undefined) => url?.toLowerCase().endsWith('.gif');

export function CmsProductGrid({ config }: CmsProductGridProps) {
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const scroll = (direction: 'left' | 'right') => {
        if (scrollContainerRef.current) {
            const { current } = scrollContainerRef;
            const scrollAmount = current.clientWidth * 0.8;
            current.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
        }
    };

    useEffect(() => {
        const fetchProducts = async () => {
            setLoading(true);
            const take = config.take || 8;
            const collectionSlug = config.collectionSlug || "";
            
            try {
                const shopApiUrl = getShopApiUrl();
                let fetchedProducts: any[] = [];

                if (collectionSlug) {
                    const collectionQuery = `
                        query GetCollectionProducts($slug: String!, $take: Int!) {
                            collection(slug: $slug) {
                                productVariants(options: { take: $take }) {
                                    items {
                                        priceWithTax
                                        product {
                                            id
                                            name
                                            slug
                                            assets {
                                                id
                                                preview
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    `;
                    const res = await fetch(shopApiUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            query: collectionQuery, 
                            variables: { slug: collectionSlug, take } 
                        })
                    });
                    const data = await res.json();
                    
                    if (data.errors) {
                        console.error('GraphQL errors in CmsProductGrid:', data.errors);
                        throw new Error(data.errors[0]?.message || 'GraphQL Error');
                    }
                    
                    if (data.data?.collection?.productVariants?.items) {
                        const seen = new Set();
                        fetchedProducts = data.data.collection.productVariants.items.reduce((acc: any[], item: any) => {
                            if (!seen.has(item.product.id)) {
                                seen.add(item.product.id);
                                acc.push({
                                    productId: item.product.id,
                                    productName: item.product.name,
                                    slug: item.product.slug,
                                    productAsset: item.product.assets?.[0],
                                    priceWithTax: { __typename: 'SinglePrice', value: item.priceWithTax },
                                    currencyCode: 'XOF',
                                    inStock: true,
                                    collectionIds: [],
                                    facetValueIds: []
                                });
                            }
                            return acc;
                        }, []);
                    }
                } else {
                    const productsQuery = `
                        query GetProducts($options: ProductListOptions) {
                            products(options: $options) {
                                items {
                                    id
                                    name
                                    slug
                                    assets {
                                        id
                                        preview
                                    }
                                    variants {
                                        priceWithTax
                                    }
                                }
                            }
                        }
                    `;
                    const res = await fetch(shopApiUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            query: productsQuery, 
                            variables: { 
                                options: { 
                                    take,
                                    filter: { approvalStatus: { eq: "approved" } }
                                } 
                            } 
                        })
                    });
                    const data = await res.json();
                    
                    if (data.errors) {
                        console.error('GraphQL errors in CmsProductGrid:', data.errors);
                        throw new Error(data.errors[0]?.message || 'GraphQL Error');
                    }
                    
                    if (data.data?.products?.items) {
                        fetchedProducts = data.data.products.items.map((prod: any) => ({
                            productId: prod.id,
                            productName: prod.name,
                            slug: prod.slug,
                            productAsset: prod.assets?.[0],
                            priceWithTax: { __typename: 'SinglePrice', value: prod.variants?.[0]?.priceWithTax || 0 },
                            currencyCode: 'XOF',
                            inStock: true,
                            collectionIds: [],
                            facetValueIds: []
                        }));
                    }
                }
                
                setProducts(fetchedProducts);
            } catch (err: any) {
                console.error('Error fetching CMS grid products:', err);
                setErrorMsg(err.message || 'Erreur de chargement');
            } finally {
                setLoading(false);
            }
        };

        fetchProducts();
    }, [config]);

    const isBgGif = isGif(config.bgImageUrl);
    const bgStyle: any = {};
    if (config.bgType === 'image' && config.bgImageUrl && !isBgGif) {
        bgStyle.backgroundImage = `url(${getAssetUrl(config.bgImageUrl)})`;
        bgStyle.backgroundSize = 'cover';
        bgStyle.backgroundPosition = 'center';
    } else if (config.bgColor) {
        bgStyle.backgroundColor = config.bgColor;
    }

    return (
        <div className="animate-in fade-in slide-in-from-bottom-6 duration-700 rounded-xl p-4 md:p-6 relative overflow-hidden group/carousel" style={bgStyle}>
            {/* GIF Background */}
            {config.bgType === 'image' && config.bgImageUrl && isBgGif && (
                <img src={getAssetUrl(config.bgImageUrl)} alt="" className="absolute inset-0 w-full h-full object-cover z-0" />
            )}
            {/* Section Header */}
            {config.headerStyle === 'centered' ? (
                <div className="text-center mb-6 pb-4 border-b border-border/30 relative z-10">
                    <h2 className="text-xl md:text-2xl font-black text-secondary tracking-tight">
                        {config.title || "Sélection pour vous"}
                    </h2>
                    {config.subtitle && <p className="text-xs text-muted-foreground mt-1 font-medium">{config.subtitle}</p>}
                </div>
            ) : (
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-border/30 relative z-10">
                    <div>
                        <h2 className="text-xl md:text-2xl font-black text-secondary tracking-tight">
                            {config.title || "Sélection pour vous"}
                        </h2>
                        {config.subtitle && <p className="text-xs text-muted-foreground mt-1 font-medium">{config.subtitle}</p>}
                    </div>
                    <Link 
                        href={config.collectionSlug ? `/collection/${config.collectionSlug}` : "/search"}
                        className="flex items-center gap-1 text-primary font-bold text-xs md:text-sm hover:gap-2 transition-all"
                    >
                        Voir tout <ChevronRight className="w-4 h-4" />
                    </Link>
                </div>
            )}

            {/* Error or Empty State */}
            {errorMsg && (
                <div className="text-center py-8 text-red-500 font-bold text-sm bg-white/50 backdrop-blur-sm rounded-lg border border-red-200 relative z-10">
                    Erreur de chargement de la grille: {errorMsg}
                </div>
            )}
            {!loading && products.length === 0 && !errorMsg && (
                <div className="text-center py-8 text-muted-foreground text-sm bg-white/50 backdrop-blur-sm rounded-lg border border-border/30 relative z-10">
                    Aucun produit disponible dans cette catégorie (Essayez de sélectionner une sous-catégorie)
                </div>
            )}

            {/* Left/Right Navigation Arrows (Desktop) */}
            <button 
                onClick={() => scroll('left')}
                className="absolute left-0 top-[60%] -translate-y-1/2 ml-2 z-20 bg-white shadow-lg rounded-full p-2 border border-border/50 text-foreground hover:bg-muted hover:scale-110 transition-all opacity-0 group-hover/carousel:opacity-100 hidden md:flex items-center justify-center"
                aria-label="Défiler vers la gauche"
            >
                <ChevronLeft className="w-5 h-5" />
            </button>

            <button 
                onClick={() => scroll('right')}
                className="absolute right-0 top-[60%] -translate-y-1/2 mr-2 z-20 bg-white shadow-lg rounded-full p-2 border border-border/50 text-foreground hover:bg-muted hover:scale-110 transition-all opacity-0 group-hover/carousel:opacity-100 hidden md:flex items-center justify-center"
                aria-label="Défiler vers la droite"
            >
                <ChevronRight className="w-5 h-5" />
            </button>

            {/* Product Carousel */}
            <div 
                ref={scrollContainerRef}
                className={`flex overflow-x-auto snap-x snap-mandatory no-scrollbar ${config.cardStyle === 'dense' ? 'gap-2 md:gap-3' : 'gap-4 md:gap-6'} pb-4 relative z-10`}
            >
                {(loading ? [1, 2, 3, 4, 5, 6, 7, 8] : products).map((p: any, i) => {
                    // Dense card mode
                    if (!loading && config.cardStyle === 'dense') {
                        return (
                            <div key={p.productId} className="snap-start flex-shrink-0 w-[140px] sm:w-[160px] md:w-[180px] lg:w-[200px]">
                                <DenseProductCard
                                    product={p}
                                    showDiscountBadge={config.showDiscount !== false}
                                    showStrikethroughPrice={config.showDiscount !== false}
                                    showAddToCartButton={config.showAddToCart}
                                    imageRatio={config.imageRatio || '4:3'}
                                />
                            </div>
                        );
                    }

                    const isPlaceholder = typeof p === 'number';
                    
                    if (isPlaceholder) {
                        return (
                            <div key={i} className="snap-start flex-shrink-0 w-[200px] sm:w-[220px] md:w-[240px] lg:w-[260px] bg-white rounded-xl overflow-hidden border border-border/30 p-4 flex flex-col items-center justify-center aspect-square">
                                <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                            </div>
                        );
                    }

                    return (
                        <div key={p.productId} className="snap-start flex-shrink-0 w-[200px] sm:w-[220px] md:w-[240px] lg:w-[260px]">
                            <ProductCard product={p} />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
