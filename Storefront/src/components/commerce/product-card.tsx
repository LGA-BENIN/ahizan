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
    const rawProduct = (productProp as any) || {};
    const fragmentProduct = readFragment(ProductCardFragment, productProp) || {};
    
    // Clean fragmentProduct of undefined or null values to prevent overwriting valid rawProduct properties
    const cleanFragment = Object.fromEntries(
        Object.entries(fragmentProduct).filter(([_, v]) => v !== undefined && v !== null)
    );

    const product = {
        ...rawProduct,
        ...cleanFragment
    };

    const themeSettings = useThemeSettings();
    const [isLiked, setIsLiked] = useState(false);
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
    const [isPending, startTransition] = useTransition();

    const productId = product.productId || product.id || rawProduct.id || rawProduct.productId;
    const displayName = (product.productVariantName && product.productVariantName !== 'Produit')
        ? product.productVariantName
        : (product.productName || product.name || rawProduct.name || rawProduct.productName || "Produit");
    
    const targetVariantId = product.productVariantId || rawProduct.productVariantId || rawProduct.variants?.[0]?.id;
    const targetVendorId = product.vendorId || rawProduct.vendorId || rawProduct.customFields?.vendor?.id;
    const queryParams = new URLSearchParams();
    if (targetVariantId) queryParams.set('variantId', String(targetVariantId));
    if (targetVendorId) queryParams.set('vendorId', String(targetVendorId));
    const queryString = queryParams.toString();
    const productDetailHref = `/product/${product.slug || rawProduct.slug}${queryString ? `?${queryString}` : ''}`;

    const vendorName = rawProduct.vendorName || product.vendorName || rawProduct.customFields?.vendor?.name;
    const marketName = rawProduct.marketName || product.marketName || rawProduct.customFields?.vendor?.physicalMarket?.name;
    const locationName = rawProduct.locationName || product.locationName || rawProduct.customFields?.vendor?.location?.name;

    const productAsset = product.productVariantAsset || rawProduct.productVariantAsset || product.productAsset || rawProduct.productAsset || product.featuredAsset || rawProduct.featuredAsset || rawProduct.assets?.[0];
    const imageUrl = getAssetUrl(productAsset?.preview || productAsset?.source);
    const isImageGif = isGif(imageUrl);
    const defaultImage = themeSettings?.defaultProductImage;
    const displayImageUrl = imageUrl || defaultImage;
    const isDisplayGif = isGif(displayImageUrl);
    
    const activeFlash = config?.discountPercentage ? config : (themeSettings?.activeFlashSale || config);
    const applyToCollection = themeSettings?.applyFlashPromoToCollections;

    const priceWithTax = product.priceWithTax || rawProduct.priceWithTax || rawProduct.variants?.[0]?.priceWithTax;
    const basePrice = priceWithTax
        ? (priceWithTax.__typename === 'PriceRange'
            ? priceWithTax.min
            : priceWithTax.__typename === 'SinglePrice'
                ? priceWithTax.value
                : (typeof priceWithTax === 'number' ? priceWithTax : (priceWithTax.value || (priceWithTax.price || 0))))
        : 0;

    const collectionIds = product.collectionIds || rawProduct.collectionIds || [];

    const priceInfo = getPromoPriceInfo({
        price: basePrice,
        variantCustomFields: null,
        productId: productId,
        collectionIds: collectionIds,
        activeFlash,
        globalApplySettings: {
            isCollectionPage: true,
            applyToCollection,
        }
    });

    const renderBadge = (position: string, type: string) => {
        if (!type || type === 'none') return null;

        let posClass = "";
        if (position === 'top-left') posClass = "absolute top-2 left-2 z-20";
        else if (position === 'top-right') posClass = "absolute top-2 right-2 z-20";
        else if (position === 'bottom-left') posClass = "absolute bottom-2 left-2 z-20";
        else if (position === 'bottom-right') posClass = "absolute bottom-2 right-2 z-20";

        if (type === 'vendor_name' && vendorName) {
            return (
                <span className={`${posClass} bg-black/85 backdrop-blur-sm text-white text-[11px] font-black uppercase px-2.5 py-1 rounded-full tracking-wider shadow-md max-w-[120px] truncate border border-white/15`}>
                    👤 {vendorName}
                </span>
            );
        }

        if (type === 'market_badge' && marketName) {
            return (
                <span className={`${posClass} bg-red-650 text-white text-[11px] font-black uppercase px-2.5 py-1 rounded-md tracking-wider shadow-md flex items-center gap-1 border border-red-500/25`}>
                    🏛️ {marketName}
                </span>
            );
        }

        if (type === 'market_name_short' && marketName) {
            return (
                <span className={`${posClass} bg-slate-900/90 dark:bg-slate-950/90 text-white text-[10px] font-bold px-2 py-1 rounded shadow-md border border-slate-700/40`}>
                    📍 {marketName.replace(/Marché de |Marché d'/i, '')}
                </span>
            );
        }

        if ((type === 'promo_percent' || type === 'auto') && priceInfo.hasPromotion) {
            const discount = Math.round(((priceInfo.originalPrice - priceInfo.promotionalPrice) / priceInfo.originalPrice) * 100);
            if (discount > 0) {
                return (
                    <span className={`${posClass} bg-[#e31837] text-white text-[11px] font-black px-2.5 py-1 rounded-full shadow-md animate-pulse`}>
                        -{discount}%
                    </span>
                );
            }
        }

        if (type === 'location_distance' && locationName) {
            return (
                <span className={`${posClass} bg-emerald-600 text-white text-[11px] font-black px-2.5 py-1 rounded-full shadow-md`}>
                    📍 {locationName}
                </span>
            );
        }

        if (type === 'stock_status') {
            const inStock = product.inStock !== false;
            return (
                <span className={`${posClass} ${inStock ? 'bg-green-605' : 'bg-red-605'} text-white text-[10px] font-extrabold px-2.5 py-1 rounded shadow-md`}>
                    {inStock ? 'En Stock' : 'Rupture'}
                </span>
            );
        }

        if (type === 'delivery_time') {
            return (
                <span className={`${posClass} bg-blue-600 text-white text-[10px] font-black px-2 py-1 rounded shadow-md`}>
                    ⚡ 15-30 min
                </span>
            );
        }

        if (type === 'market_icon' && marketName) {
            return (
                <div className={`${posClass} bg-white dark:bg-slate-900 border border-border p-1.5 rounded-full shadow-md text-primary`} title={marketName}>
                    🏛️
                </div>
            );
        }

        if (type === 'cart_button') {
            return (
                <button
                    type="button"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (isPending) return;
                        const targetVariantId = product.productVariantId || rawProduct.productVariantId || rawProduct.variants?.[0]?.id || rawProduct.id || productId;
                        if (!targetVariantId) {
                            toast.error("Variante indisponible pour ce produit");
                            return;
                        }
                        startTransition(async () => {
                            const res = await addToCart(targetVariantId, 1);
                            if (res.success) {
                                toast.success(`${displayName} ajouté au panier !`);
                            } else {
                                toast.error(res.error || "Erreur lors de l'ajout au panier");
                            }
                        });
                    }}
                    className={`${posClass} p-2 rounded-full bg-primary text-white hover:bg-primary/95 hover:scale-110 active:scale-95 transition-all shadow-lg flex items-center justify-center`}
                    title="Ajouter au panier"
                >
                    <ShoppingCart className="w-3.5 h-3.5" />
                </button>
            );
        }

        return null;
    };

    const renderCornerBadges = () => (
        <>
            {config?.topLeftBadge && renderBadge('top-left', config.topLeftBadge)}
            {config?.topRightBadge === 'like_button' ? (
                <button
                    type="button"
                    onClick={handleLike}
                    disabled={isPending}
                    className="absolute top-2 right-2 z-20 p-2 rounded-full bg-white/95 dark:bg-slate-900/95 text-secondary dark:text-slate-200 hover:bg-primary/10 hover:text-primary transition-colors shadow-md disabled:opacity-50"
                    title="Ajouter aux favoris"
                >
                    {isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                        <Heart className={`h-3.5 w-3.5 transition-colors ${isLiked ? 'fill-primary text-primary' : 'text-slate-550 dark:text-slate-300'}`} />
                    )}
                </button>
            ) : (
                config?.topRightBadge && renderBadge('top-right', config.topRightBadge)
            )}
            {config?.bottomLeftBadge && renderBadge('bottom-left', config.bottomLeftBadge)}
            {config?.bottomRightBadge && renderBadge('bottom-right', config.bottomRightBadge)}
        </>
    );

    const showBottomLike = config?.topRightBadge !== 'like_button';

    // Fetch initial like status on mount
    useEffect(() => {
        if (!productId) return;
        let isMounted = true;
        checkProductLikeStatus(productId).then(status => {
            if (isMounted) {
                setIsLiked(status);
            }
        });
        return () => {
            isMounted = false;
        };
    }, [productId]);

    const handleLike = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!productId) return;
        
        startTransition(async () => {
            const res = await toggleProductLikeAction(productId);
            if (res.success) {
                setIsLiked(!!res.liked);
                if (res.liked) {
                    toast.success(`${displayName} ajouté à vos favoris !`);
                } else {
                    toast.success(`${displayName} retiré de vos favoris.`);
                }
            } else if (res.authenticated === false || res.error === 'UNAUTHORIZED') {
                setIsLoginModalOpen(true);
            } else {
                toast.error(res.error || "Une erreur est survenue");
            }
        });
    };

    const ratioClass = config?.imageRatio === '4:3' ? 'aspect-[4/3]' : config?.imageRatio === '3:4' ? 'aspect-[3/4]' : config?.imageRatio === '16:9' ? 'aspect-[16/9]' : 'aspect-square';
    
    const cardTheme = config?.cardTheme || config?.cardStyle || 'default';
    let cardThemeClass = "";
    if (cardTheme === 'flat') {
        cardThemeClass = "shadow-none border border-border bg-card hover:border-slate-350 dark:hover:border-slate-700";
    } else if (cardTheme === 'glassmorphism') {
        cardThemeClass = "bg-white/10 dark:bg-slate-900/40 backdrop-blur-md border border-white/20 dark:border-slate-800/50 shadow-lg hover:shadow-xl hover:bg-white/15 dark:hover:bg-slate-900/50";
    } else if (cardTheme === 'neon') {
        cardThemeClass = "bg-slate-950 border border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.12)] hover:shadow-[0_0_20px_rgba(239,68,68,0.22)] hover:border-red-500 text-white";
    } else if (cardTheme === 'bold-border') {
        cardThemeClass = "border-4 border-slate-950 dark:border-white bg-card shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all";
    } else if (cardTheme === 'gradient-bg') {
        cardThemeClass = "bg-gradient-to-br from-red-50/50 to-indigo-50/50 dark:from-slate-900 dark:to-slate-800 border border-border shadow-md hover:shadow-lg";
    } else if (cardTheme === 'minimal') {
        cardThemeClass = "bg-transparent border-none hover:bg-card/50 transition-all rounded-lg";
    } else if (cardTheme === 'elevated') {
        cardThemeClass = "bg-card rounded-xl border border-primary/20 shadow-md hover:shadow-xl transition-all";
    } else if (cardTheme === 'compact' || cardTheme === 'dense') {
        cardThemeClass = "bg-card rounded-md border border-border hover:shadow-md transition-all text-sm";
    } else {
        cardThemeClass = "bg-card border border-border hover:shadow-lg transition-all";
    }

    return (
        <>
            <Link
                href={productDetailHref}
                className={`group block overflow-hidden h-full flex flex-col justify-between ${cardThemeClass}`}
            >
                <div className={`${ratioClass} relative bg-muted flex-shrink-0`}>
                    {renderCornerBadges()}
                    {displayImageUrl ? (
                        isDisplayGif ? (
                            <img
                                src={getAssetUrl(displayImageUrl)}
                                alt={displayName}
                                className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-300"
                            />
                        ) : (
                            <Image
                                src={getAssetUrl(displayImageUrl) as string}
                                alt={displayName}
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
                <div className={`${config?.cardStyle === 'compact' || config?.cardStyle === 'dense' ? 'p-2 space-y-1' : 'p-3 space-y-2'} relative flex-1 flex flex-col justify-between`}>
                    <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm sm:text-base font-bold line-clamp-2 min-h-[2.4rem] max-h-[2.5rem] overflow-hidden group-hover:text-primary transition-colors leading-tight flex-1 break-words" title={displayName}>
                            {displayName}
                        </h3>
                        {(config?.showCartIcon || config?.showAddToCart) && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    if (isPending) return;
                                    const targetVariantId = product.productVariantId || rawProduct.productVariantId || rawProduct.variants?.[0]?.id || rawProduct.id || productId;
                                    if (!targetVariantId) {
                                        toast.error("Variante indisponible pour ce produit");
                                        return;
                                    }
                                    startTransition(async () => {
                                        const res = await addToCart(targetVariantId, 1);
                                        if (res.success) {
                                            toast.success(`${displayName} ajouté au panier !`);
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
                        {showBottomLike && (
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
                        )}
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
