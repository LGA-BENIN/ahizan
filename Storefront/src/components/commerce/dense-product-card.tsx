"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Star } from "lucide-react";

interface DenseProductCardProps {
    product: any;
    showDiscountBadge?: boolean;
    showStrikethroughPrice?: boolean;
    showAddToCartButton?: boolean;
    showStockIndicator?: boolean;
    showNewBadge?: boolean;
    imageRatio?: string;
    facetMap?: Record<string, { name: string; code: string }>;
}

function formatCFA(price: number): string {
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'XOF',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(price / 100);
}

function getPrice(product: any): number {
    if (product.priceWithTax?.__typename === 'SinglePrice') return product.priceWithTax.value;
    return product.priceWithTax?.min ?? 0;
}

function getMaxPrice(product: any): number | null {
    if (product.priceWithTax?.__typename === 'PriceRange') {
        return product.priceWithTax.max ?? null;
    }
    return null;
}

export function DenseProductCard({
    product,
    showDiscountBadge = true,
    showStrikethroughPrice = true,
    showAddToCartButton = true,
    showStockIndicator = false,
    showNewBadge = true,
    imageRatio = '4:3',
    facetMap,
}: DenseProductCardProps) {
    const price = getPrice(product);
    const maxPrice = getMaxPrice(product);

    // Determine discount percentage
    let discountPercent: number | null = null;
    let oldPrice: number | null = null;
    if (showStrikethroughPrice && maxPrice && maxPrice > price) {
        oldPrice = maxPrice;
        discountPercent = Math.round(((maxPrice - price) / maxPrice) * 100);
    }
    // If compareAtPrice custom field is available
    if (product.compareAtPrice && product.compareAtPrice > price) {
        oldPrice = product.compareAtPrice;
        discountPercent = Math.round(((product.compareAtPrice - price) / product.compareAtPrice) * 100);
    }

    // Resolve facet badges
    const facetValueIds: string[] = product.facetValueIds || [];
    const isFlash = facetMap
        ? facetValueIds.some(id => facetMap[id]?.code === 'flash' || facetMap[id]?.name === 'Flash')
        : false;
    const isNew = facetMap
        ? facetValueIds.some(id => facetMap[id]?.code === 'new' || facetMap[id]?.name === 'Nouveau')
        : false;

    // Image aspect ratio class
    const aspectClass =
        imageRatio === '1:1' ? 'aspect-square' :
        imageRatio === '16:9' ? 'aspect-video' :
        'aspect-[4/3]'; // default 4:3

    // Stock indicator
    const lowStock = product.inStock === true && product.stockLevel !== undefined && product.stockLevel <= 5;

    return (
        <Link
            href={`/product/${product.slug}`}
            className="group bg-card rounded-lg border border-border/30 overflow-hidden hover:shadow-md transition-all duration-200"
        >
            {/* Image */}
            <div className={`${aspectClass} relative bg-muted/10 overflow-hidden`}>
                {product.productAsset ? (
                    <img
                        src={product.productAsset.preview || undefined}
                        alt={product.productName}
                        className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-300"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                        Pas d&apos;image
                    </div>
                )}

                {/* Discount badge overlay */}
                {showDiscountBadge && discountPercent && discountPercent > 0 && (
                    <Badge
                        variant="destructive"
                        className="absolute top-1 left-1 text-[9px] px-1.5 py-0 font-black"
                    >
                        -{discountPercent}%
                    </Badge>
                )}

                {/* Flash badge overlay */}
                {isFlash && (
                    <Badge
                        variant="destructive"
                        className="absolute top-1 right-1 text-[9px] px-1.5 py-0 font-black"
                    >
                        🔥 FLASH
                    </Badge>
                )}

                {/* Floating cart button */}
                {showAddToCartButton && (
                    <Button
                        size="icon"
                        variant="outline"
                        className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 bg-card/90 hover:bg-card"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            // TODO: Add to cart logic
                        }}
                    >
                        <ShoppingCart className="h-3.5 w-3.5" />
                    </Button>
                )}
            </div>

            {/* Content */}
            <div className="p-2 space-y-1">
                <h3 className="text-xs font-semibold line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                    {product.productName}
                </h3>

                {/* Mini stars (placeholder) */}
                {product.rating && (
                    <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                                key={i}
                                className={`h-2.5 w-2.5 ${i < Math.round(product.rating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}`}
                            />
                        ))}
                    </div>
                )}

                {/* Price row */}
                <div className="flex items-baseline gap-1.5 flex-wrap">
                    {showStrikethroughPrice && oldPrice && (
                        <span className="line-through text-[10px] text-muted-foreground">
                            {formatCFA(oldPrice)}
                        </span>
                    )}
                    <span className="font-black text-sm text-primary">
                        {formatCFA(price)}
                    </span>
                </div>

                {/* Bottom badges */}
                <div className="flex gap-1 flex-wrap">
                    {isFlash && (
                        <Badge variant="destructive" className="text-[9px] px-1 py-0 leading-tight">
                            FLASH
                        </Badge>
                    )}
                    {showNewBadge && isNew && (
                        <Badge variant="secondary" className="text-[9px] px-1 py-0 leading-tight">
                            Nouveau
                        </Badge>
                    )}
                </div>

                {/* Stock indicator */}
                {showStockIndicator && lowStock && (
                    <p className="text-[10px] text-red-500 font-bold">
                        Plus que {product.stockLevel} !
                    </p>
                )}
            </div>
        </Link>
    );
}
