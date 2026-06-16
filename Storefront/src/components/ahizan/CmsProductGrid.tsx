"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DenseProductCard } from "@/components/commerce/dense-product-card";
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
                                    priceWithTax: { value: item.priceWithTax }
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
                            variables: { options: { take } } 
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
                            priceWithTax: { value: prod.variants?.[0]?.priceWithTax || 0 }
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
                    const price = isPlaceholder ? 0 : (p.priceWithTax?.min ?? p.priceWithTax?.value ?? 0);
                    
                    return (
                        <Link 
                            key={isPlaceholder ? i : p.productId}
                            href={isPlaceholder ? "#" : `/product/${p.slug}`}
                            className="snap-start flex-shrink-0 w-[140px] sm:w-[160px] md:w-[180px] lg:w-[200px] group bg-white rounded-xl overflow-hidden border border-border/30 hover:border-primary/20 hover:shadow-lg transition-all duration-300"
                        >
                            <div className="aspect-square bg-muted/10 relative flex items-center justify-center overflow-hidden">
                                {!isPlaceholder && p.productAsset && (
                                    <img 
                                        src={p.productAsset.preview} 
                                        alt={p.productName}
                                        className="w-full h-full object-contain p-3 group-hover:scale-105 transition-transform duration-500"
                                    />
                                )}
                                {isPlaceholder && (
                                    <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                                )}
                            </div>
                            <div className="p-3 md:p-4">
                                <h3 className="font-semibold text-xs md:text-sm text-secondary line-clamp-2 min-h-[36px] mb-2 group-hover:text-primary transition-colors">
                                    {isPlaceholder ? "Chargement..." : p.productName}
                                </h3>
                                <div className="flex items-center justify-between">
                                    <span className="font-black text-base md:text-lg text-primary">
                                        {isPlaceholder ? "---" : price.toLocaleString()} <span className="text-[9px] font-bold">XOF</span>
                                    </span>
                                    <div className="w-7 h-7 rounded-full bg-primary/5 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                                        <ChevronRight className="w-3.5 h-3.5" />
                                    </div>
                                </div>
                            </div>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
