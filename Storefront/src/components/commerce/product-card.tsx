"use client";

import Image from 'next/image';
import {FragmentOf, readFragment} from '@/graphql';
import {ProductCardFragment} from '@/lib/vendure/fragments';
import {Price} from '@/components/commerce/price';
import {Suspense, useState, useEffect, useTransition} from "react";
import Link from "next/link";
import { useThemeSettings } from '@/components/providers/theme-provider';
import { getAssetUrl, getPromoPriceInfo } from '@/lib/vendure/api-utils';
import { Heart, Loader2, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';
import { toggleProductLikeAction, checkProductLikeStatus } from '@/app/(storefront)/likes-actions';
import { LoginPromptModal } from '@/components/shared/login-prompt-modal';
import { addToCart } from '@/app/(storefront)/product/[slug]/actions';

interface ProductCardProps {
    product: FragmentOf<typeof ProductCardFragment>;
    config?: any;
}

const isGif = (url: string | undefined | null) => url?.toLowerCase().endsWith('.gif');

export function ProductCard({product: productProp, config}: ProductCardProps) {
    const product = readFragment(ProductCardFragment, productProp);
    const themeSettings = useThemeSettings();
    const [isLiked, setIsLiked] = useState(false);
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    
    const imageUrl = getAssetUrl(product.productAsset?.preview);
    const isImageGif = isGif(imageUrl);
    const defaultImage = themeSettings?.defaultProductImage;
    const displayImageUrl = imageUrl || defaultImage;
    const isDisplayGif = isGif(displayImageUrl);
    
    const activeFlash = themeSettings?.activeFlashSale;
    const applyToCollection = themeSettings?.applyFlashPromoToCollections;

    const basePrice = product.priceWithTax.__typename === 'PriceRange'
        ? product.priceWithTax.min
        : product.priceWithTax.__typename === 'SinglePrice'
            ? product.priceWithTax.value
            : 0;

    const priceInfo = getPromoPriceInfo({
        price: basePrice,
        variantCustomFields: null,
        productId: product.productId,
        collectionIds: product.collectionIds || [],
        activeFlash,
        globalApplySettings: {
            isCollectionPage: true,
            applyToCollection,
        }
    });

    // Fetch initial like status on mount
    useEffect(() => {
        let isMounted = true;
        checkProductLikeStatus(product.productId).then(status => {
            if (isMounted) {
                setIsLiked(status);
            }
        });
        return () => {
            isMounted = false;
        };
    }, [product.productId]);

    const handleLike = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        
        startTransition(async () => {
            const res = await toggleProductLikeAction(product.productId);
            if (res.success) {
                setIsLiked(!!res.liked);
                if (res.liked) {
                    toast.success(`${product.productName} ajouté à vos favoris !`);
                } else {
                    toast.info(`${product.productName} retiré de vos favoris.`);
                }
            } else if (res.authenticated === false) {
                // User not logged in, prompt modal
                setIsLoginModalOpen(true);
            } else {
                toast.error(res.error || "Erreur lors de la mise à jour du favori");
            }
        });
    };

    const ratioClass = config?.imageRatio === '4:3' ? 'aspect-[4/3]' : config?.imageRatio === '3:4' ? 'aspect-[3/4]' : config?.imageRatio === '16:9' ? 'aspect-[16/9]' : 'aspect-square';
    
    let cardStyleClass = "bg-card rounded-lg border border-border hover:shadow-lg transition-all";
    if (config?.cardStyle === 'minimal') {
        cardStyleClass = "bg-transparent border-none hover:bg-card/50 transition-all rounded-lg";
    } else if (config?.cardStyle === 'elevated') {
        cardStyleClass = "bg-card rounded-xl border border-primary/20 shadow-md hover:shadow-xl transition-all";
    } else if (config?.cardStyle === 'compact' || config?.cardStyle === 'dense') {
        cardStyleClass = "bg-card rounded-md border border-border hover:shadow-md transition-all text-sm";
    }

    return (
        <>
            <Link
                href={`/product/${product.slug}`}
                className={`group block overflow-hidden ${cardStyleClass}`}
            >
                <div className={`${ratioClass} relative bg-muted`}>
                    {displayImageUrl ? (
                        isDisplayGif ? (
                            <img
                                src={getAssetUrl(displayImageUrl)}
                                alt={product.productName}
                                className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-300"
                            />
                        ) : (
                            <Image
                                src={getAssetUrl(displayImageUrl) as string}
                                alt={product.productName}
                                fill
                                className="object-contain p-2 group-hover:scale-105 transition-transform duration-300"
                                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                            />
                        )
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground text-[10px]">
                            Aucune image
                        </div>
                    )}
                </div>
                <div className={`${config?.cardStyle === 'compact' || config?.cardStyle === 'dense' ? 'p-2 space-y-1' : 'p-3 space-y-2'} relative`}>
                    <div className="flex items-start justify-between gap-2">
                        <h3 className="text-base sm:text-lg font-bold line-clamp-2 group-hover:text-primary transition-colors leading-tight flex-1">
                            {product.productName}
                        </h3>
                        {(config?.showCartIcon || config?.showAddToCart) && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    if (isPending) return;
                                    const targetVariantId = product.productVariantId || (productProp as any).productVariantId || (productProp as any).variants?.[0]?.id || (productProp as any).id || product.productId;
                                    if (!targetVariantId) {
                                        toast.error("Variante indisponible pour ce produit");
                                        return;
                                    }
                                    startTransition(async () => {
                                        const res = await addToCart(targetVariantId, 1);
                                        if (res.success) {
                                            toast.success(`${product.productName} ajouté au panier !`);
                                        } else {
                                            toast.error(res.error || "Erreur lors de l'ajout au panier");
                                        }
                                    });
                                }}
                                disabled={isPending}
                                className="p-2 -mt-5 -mr-1 bg-white/95 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-primary hover:text-white rounded-full shadow-md border border-slate-200/80 dark:border-slate-700 shrink-0 transition-all duration-200 hover:scale-105 flex items-center justify-center relative z-10 group/cartbtn"
                                title="Ajouter au panier rapidement"
                            >
                                {isPending ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin text-primary group-hover/cartbtn:text-white" />
                                ) : (
                                    <ShoppingCart className="w-3.5 h-3.5 stroke-[2.2] transition-colors" />
                                )}
                            </button>
                        )}
                    </div>
                    <div className="flex items-center justify-between gap-2 pt-1">
                        <Suspense fallback={<div className="h-4 w-20 rounded bg-muted"></div>}>
                            <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2">
                                {priceInfo.hasPromotion ? (
                                    <>
                                        <p className={`text-xl sm:text-2xl font-black tracking-tight ${priceInfo.showBothPrices ? 'text-red-600' : 'text-primary'}`}>
                                            <Price value={priceInfo.promotionalPrice} />
                                        </p>
                                        {priceInfo.showBothPrices && (
                                            <p className="text-sm font-bold text-muted-foreground line-through decoration-red-500/70 decoration-2 opacity-80">
                                                <Price value={priceInfo.originalPrice} />
                                            </p>
                                        )}
                                    </>
                                ) : config?.showPromoPrice ? (
                                    <>
                                        <p className="text-xl sm:text-2xl font-black text-red-600 tracking-tight">
                                            <Price value={priceInfo.originalPrice} />
                                        </p>
                                        {config?.showStrikethroughPrice !== false && (
                                            <p className="text-sm font-bold text-muted-foreground line-through decoration-red-500/70 decoration-2 opacity-80">
                                                <Price value={priceInfo.originalPrice * 1.25} />
                                            </p>
                                        )}
                                    </>
                                ) : (
                                    <p className="text-xl sm:text-2xl font-black text-primary tracking-tight">
                                        <Price value={priceInfo.originalPrice} />
                                    </p>
                                )}
                            </div>
                        </Suspense>
                        <button
                            type="button"
                            onClick={handleLike}
                            disabled={isPending}
                            className="p-2.5 rounded-full bg-secondary/5 dark:bg-slate-700 text-secondary dark:text-slate-200 hover:bg-primary/10 hover:text-primary transition-colors flex-shrink-0 shadow-sm disabled:opacity-50"
                            title="Ajouter aux favoris"
                        >
                            {isPending ? (
                                <Loader2 className="h-4.5 w-4.5 animate-spin" />
                            ) : (
                                <Heart className={`h-4.5 w-4.5 transition-colors ${isLiked ? 'fill-primary text-primary' : 'text-slate-550 dark:text-slate-300'}`} />
                            )}
                        </button>
                    </div>
                    {config?.showAddToCart && (
                        <div className="mt-2 pt-2 border-t border-border/40 flex items-center justify-center bg-primary/10 hover:bg-primary text-primary hover:text-white font-bold text-xs py-2 px-3 rounded-md transition-colors w-full gap-1 shadow-2xs">
                            🛒 Commander
                        </div>
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
