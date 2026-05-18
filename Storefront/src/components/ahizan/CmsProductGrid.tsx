"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DenseProductCard } from "@/components/commerce/dense-product-card";

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

export function CmsProductGrid({ config }: CmsProductGridProps) {
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProducts = async () => {
            setLoading(true);
            const take = config.take || 8;
            const collectionSlug = config.collectionSlug || "";
            
            const searchQuery = `
                query GetCmsGridProducts($input: SearchInput!) {
                    search(input: $input) {
                        items {
                            productId
                            productName
                            slug
                            productAsset {
                                id
                                preview
                            }
                            priceWithTax {
                                ... on PriceRange { min max }
                                ... on SinglePrice { value }
                            }
                        }
                    }
                }
            `;

            const input: any = {
                groupByProduct: true,
                take: take,
            };

            if (collectionSlug) {
                input.collectionSlug = collectionSlug;
            }

            if (config.facetValueIds && config.facetValueIds.length > 0) {
                input.facetValueIds = config.facetValueIds;
            }

            try {
                const shopApiUrl = process.env.NEXT_PUBLIC_VENDURE_SHOP_API_URL || 'http://127.0.0.1:3000/shop-api';
                const res = await fetch(shopApiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        query: searchQuery, 
                        variables: { input } 
                    })
                });
                const data = await res.json();
                setProducts(data.data?.search?.items || []);
            } catch (err) {
                console.error('Error fetching CMS grid products:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchProducts();
    }, [config]);

    if (!loading && products.length === 0) return null;

    const columns = config.columns || 4;
    const colClasses: Record<number, string> = {
        2: 'grid-cols-2 md:grid-cols-2',
        3: 'grid-cols-2 md:grid-cols-3',
        4: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
        5: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-5',
        6: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-6',
    };
    const gridClass = colClasses[columns] || colClasses[4];

    const bgStyle: any = {};
    if (config.bgType === 'image' && config.bgImageUrl) {
        bgStyle.backgroundImage = `url(${config.bgImageUrl})`;
        bgStyle.backgroundSize = 'cover';
        bgStyle.backgroundPosition = 'center';
    } else if (config.bgColor) {
        bgStyle.backgroundColor = config.bgColor;
    }

    return (
        <div className="animate-in fade-in slide-in-from-bottom-6 duration-700 rounded-xl p-4 md:p-6" style={bgStyle}>
            {/* Section Header */}
            {config.headerStyle === 'centered' ? (
                <div className="text-center mb-6 pb-4 border-b border-border/30">
                    <h2 className="text-xl md:text-2xl font-black text-secondary tracking-tight">
                        {config.title || "Sélection pour vous"}
                    </h2>
                    {config.subtitle && <p className="text-xs text-muted-foreground mt-1 font-medium">{config.subtitle}</p>}
                </div>
            ) : (
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-border/30">
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

            {/* Product Grid */}
            <div className={`grid ${gridClass} ${config.cardStyle === 'dense' ? 'gap-2 md:gap-3' : 'gap-4 md:gap-6'}`}>
                {(loading ? [1, 2, 3, 4, 5, 6, 7, 8] : products).map((p: any, i) => {
                    // Dense card mode
                    if (!loading && config.cardStyle === 'dense') {
                        return (
                            <DenseProductCard
                                key={p.productId}
                                product={p}
                                showDiscountBadge={config.showDiscount !== false}
                                showStrikethroughPrice={config.showDiscount !== false}
                                showAddToCartButton={config.showAddToCart}
                                imageRatio={config.imageRatio || '4:3'}
                            />
                        );
                    }

                    const isPlaceholder = typeof p === 'number';
                    const price = isPlaceholder ? 0 : (p.priceWithTax?.min ?? p.priceWithTax?.value ?? 0);
                    
                    return (
                        <Link 
                            key={isPlaceholder ? i : p.productId}
                            href={isPlaceholder ? "#" : `/product/${p.slug}`}
                            className="group bg-white rounded-xl overflow-hidden border border-border/30 hover:border-primary/20 hover:shadow-lg transition-all duration-300"
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
                                        {isPlaceholder ? "---" : (price / 100).toLocaleString()} <span className="text-[9px] font-bold">XOF</span>
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
