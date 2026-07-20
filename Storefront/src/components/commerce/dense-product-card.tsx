"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Star, Heart, Loader2 } from "lucide-react";
import { useThemeSettings } from '@/components/providers/theme-provider';
import { getAssetUrl, getPromoPriceInfo } from '@/lib/vendure/api-utils';
import { useState, useEffect, useTransition } from "react";
import { toast } from 'sonner';
import { toggleProductLikeAction, checkProductLikeStatus } from '@/app/(storefront)/likes-actions';
import { LoginPromptModal } from '@/components/shared/login-prompt-modal';

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
    }).format(price);
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
    const themeSettings = useThemeSettings();
    const [isLiked, setIsLiked] = useState(false);
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
    const [isPending, startTransition] = useTransition();

    // Fetch initial like status on mount
    useEffect(() => {
        let isMounted = true;
        const targetId = product.productId || product.id;
        if (targetId) {
            checkProductLikeStatus(targetId).then(status => {
                if (isMounted) {
                    setIsLiked(status);
                }
            });
        }
        return () => {
            isMounted = false;
        };
    }, [product.productId, product.id]);

    const handleLike = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        
        const targetId = product.productId || product.id;
        if (!targetId) return;

        startTransition(async () => {
            const res = await toggleProductLikeAction(targetId);
            if (res.success) {
                setIsLiked(!!res.liked);
                if (res.liked) {
                    toast.success(`${product.productName || product.name} ajouté à vos favoris !`);
                } else {
                    toast.info(`${product.productName || product.name} retiré de vos favoris.`);
                }
            } else if (res.authenticated === false) {
                setIsLoginModalOpen(true);
            } else {
                toast.error(res.error || "Erreur lors de la mise à jour du favori");
            }
        });
    };

    const price = getPrice(product);
    const maxPrice = getMaxPrice(product);
    const defaultImage = themeSettings?.defaultProductImage;
    const imageUrl = product.productAsset?.preview || defaultImage;

    const activeFlash = themeSettings?.activeFlashSale;
    const applyToCollection = themeSettings?.applyFlashPromoToCollections;

    const priceInfo = getPromoPriceInfo({
        price,
        variantCustomFields: product.customFields || null,
        productId: product.productId || product.id,
        collectionIds: product.collectionIds || [],
        activeFlash,
        globalApplySettings: {
            isCollectionPage: true,
            applyToCollection,
        }
    });

    // Determine discount percentage and final display prices
    let discountPercent: number | null = null;
    let oldPrice: number | null = null;
    let displayPrice = price;

    if (priceInfo.hasPromotion) {
        displayPrice = priceInfo.promotionalPrice;
        if (priceInfo.showBothPrices) {
            oldPrice = priceInfo.originalPrice;
            discountPercent = priceInfo.discountPercentage;
        }
    } else {
        if (showStrikethroughPrice && maxPrice && maxPrice > price) {
            oldPrice = maxPrice;
            discountPercent = Math.round(((maxPrice - price) / maxPrice) * 100);
        }
        // If compareAtPrice custom field is available
        if (product.compareAtPrice && product.compareAtPrice > price) {
            oldPrice = product.compareAtPrice;
            discountPercent = Math.round(((product.compareAtPrice - price) / product.compareAtPrice) * 100);
        }
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
        <>
            <Link
                href={`/product/${product.slug}`}
                className="group bg-card rounded-lg border border-border/30 overflow-hidden hover:shadow-md transition-all duration-200"
            >
                {/* Image */}
                <div className={`${aspectClass} relative bg-muted/10 overflow-hidden`}>
                    {imageUrl ? (
                        <img
                            src={getAssetUrl(imageUrl)}
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
                <div className="p-3 space-y-2">
                    <h3 className="text-[11px] sm:text-[13px] font-bold line-clamp-2 leading-tight group-hover:text-primary transition-colors">
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
    
                    {/* Price row and Like button */}
                    <div className="flex justify-between items-center gap-1.5 pt-1">
                        <div className="flex flex-col sm:flex-row sm:items-baseline gap-1">
                            {showStrikethroughPrice && oldPrice && (
                                <span className="line-through text-[10px] sm:text-[11px] font-bold text-muted-foreground decoration-red-500/70 decoration-2">
                                    {formatCFA(oldPrice)}
                                </span>
                            )}
                            <span className={`font-black text-[13px] sm:text-[15px] md:text-base tracking-tight ${oldPrice ? 'text-red-600' : 'text-primary'}`}>
                                {formatCFA(displayPrice)}
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={handleLike}
                            disabled={isPending}
                            className="p-1.5 rounded-full bg-secondary/5 dark:bg-slate-700 text-secondary dark:text-slate-200 hover:bg-primary/10 hover:text-primary transition-colors flex-shrink-0 shadow-sm disabled:opacity-50"
                            title="Ajouter aux favoris"
                        >
                            {isPending ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                                <Heart className={`h-3.5 w-3.5 transition-colors ${isLiked ? 'fill-primary text-primary' : 'text-slate-550 dark:text-slate-300'}`} />
                            )}
                        </button>
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

            <LoginPromptModal 
                isOpen={isLoginModalOpen} 
                onClose={() => setIsLoginModalOpen(false)} 
                title="Aimer ce produit"
                description="Connectez-vous ou créez un compte gratuit pour ajouter ce produit à vos favoris et recevoir des offres exclusives de nos vendeurs certifiés."
            />
        </>
    );
}
