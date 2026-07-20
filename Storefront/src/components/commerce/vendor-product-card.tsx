'use client';

import Image from 'next/image';
import { Price } from '@/components/commerce/price';
import { Suspense, useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { useThemeSettings } from '@/components/providers/theme-provider';
import { getAssetUrl, getPromoPriceInfo } from '@/lib/vendure/api-utils';
import { Heart, Loader2, MapPin, Landmark, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';
import { toggleProductLikeAction, checkProductLikeStatus } from '@/app/(storefront)/likes-actions';
import { LoginPromptModal } from '@/components/shared/login-prompt-modal';
import { addToCart } from '@/app/(storefront)/product/[slug]/actions';

interface VendorProductCardProps {
    product: any;
    config?: any;
}

const isGif = (url: string | undefined | null) => url?.toLowerCase().endsWith('.gif');

export function VendorProductCard({ product, config }: VendorProductCardProps) {
    const themeSettings = useThemeSettings();
    const [isLiked, setIsLiked] = useState(false);
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    
    const imageUrl = getAssetUrl(product.featuredAsset?.preview || product.productAsset?.preview);
    const isImageGif = isGif(imageUrl);
    const defaultImage = themeSettings?.defaultProductImage;
    const displayImageUrl = imageUrl || defaultImage;
    const isDisplayGif = isGif(displayImageUrl);
    
    const activeFlash = themeSettings?.activeFlashSale;
    const applyToCollection = themeSettings?.applyFlashPromoToCollections;

    // Use the first variant's price if available
    const basePrice = product.variants?.[0]?.priceWithTax || 0;

    const priceInfo = getPromoPriceInfo({
        price: basePrice,
        variantCustomFields: product.variants?.[0]?.customFields || null,
        productId: product.id,
        collectionIds: [], // Similar here, simplified for vendor card
        activeFlash,
        globalApplySettings: {
            isCollectionPage: true,
            applyToCollection,
        }
    });

    // Fetch initial like status on mount
    useEffect(() => {
        let isMounted = true;
        checkProductLikeStatus(product.id).then(status => {
            if (isMounted) {
                setIsLiked(status);
            }
        });
        return () => {
            isMounted = false;
        };
    }, [product.id]);

    const handleLike = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        
        startTransition(async () => {
            const res = await toggleProductLikeAction(product.id);
            if (res.success) {
                setIsLiked(!!res.liked);
                if (res.liked) {
                    toast.success(`${product.name} ajouté à vos favoris !`);
                } else {
                    toast.info(`${product.name} retiré de vos favoris.`);
                }
            } else if (res.authenticated === false) {
                setIsLoginModalOpen(true);
            } else {
                toast.error(res.error || "Erreur lors de la mise à jour du favori");
            }
        });
    };

    // Card Theme Styling
    const cardTheme = config?.cardTheme || 'default';
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
    } else {
        // default
        cardThemeClass = "bg-card border border-border hover:shadow-lg transition-shadow";
    }

    const renderBadge = (position: string, type: string) => {
        if (!type || type === 'none') return null;

        let posClass = "";
        if (position === 'top-left') posClass = "absolute top-2 left-2 z-20";
        else if (position === 'top-right') posClass = "absolute top-2 right-2 z-20";
        else if (position === 'bottom-left') posClass = "absolute bottom-2 left-2 z-20";
        else if (position === 'bottom-right') posClass = "absolute bottom-2 right-2 z-20";

        if (type === 'vendor_name' && product.vendorName) {
            return (
                <span className={`${posClass} bg-black/80 backdrop-blur-sm text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider shadow-sm max-w-[120px] truncate`}>
                    👤 {product.vendorName}
                </span>
            );
        }

        if (type === 'market_badge' && product.marketName) {
            return (
                <span className={`${posClass} bg-red-600 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-md tracking-wider shadow-sm flex items-center gap-1`}>
                    🏛️ {product.marketName}
                </span>
            );
        }

        if (type === 'market_name_short' && product.marketName) {
            const shortName = product.marketName.replace(/Marché de |Marché d'/i, '');
            return (
                <span className={`${posClass} bg-slate-900/90 dark:bg-slate-950/90 text-white text-[8px] font-bold px-1.5 py-0.5 rounded shadow-sm`}>
                    📍 {shortName}
                </span>
            );
        }

        if (type === 'promo_percent' && priceInfo.hasPromotion) {
            const discount = Math.round(((priceInfo.originalPrice - priceInfo.promotionalPrice) / priceInfo.originalPrice) * 100);
            if (discount > 0) {
                return (
                    <span className={`${posClass} bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm`}>
                        -{discount}%
                    </span>
                );
            }
        }

        if (type === 'location_distance' && product.locationName) {
            return (
                <span className={`${posClass} bg-emerald-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-sm`}>
                    📍 {product.locationName}
                </span>
            );
        }

        if (type === 'stock_status') {
            const inStock = product.inStock !== false;
            return (
                <span className={`${posClass} ${inStock ? 'bg-green-600/95' : 'bg-red-600/95'} text-white text-[8px] font-bold px-1.5 py-0.5 rounded shadow-sm`}>
                    {inStock ? 'En Stock' : 'Rupture'}
                </span>
            );
        }

        if (type === 'delivery_time') {
            return (
                <span className={`${posClass} bg-blue-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded shadow-sm`}>
                    ⚡ 15-30 min
                </span>
            );
        }

        if (type === 'market_icon' && product.marketName) {
            return (
                <div className={`${posClass} bg-white dark:bg-slate-900 border border-border p-1 rounded-full shadow-md text-primary`} title={product.marketName}>
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
                        toast.success(`${product.name} ajouté au panier !`);
                    }}
                    className={`${posClass} p-1.5 rounded-full bg-primary text-white hover:bg-primary/95 hover:scale-105 active:scale-95 transition-all shadow-md flex items-center justify-center`}
                    title="Ajouter au panier"
                >
                    <ShoppingCart className="w-3 h-3" />
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

    // 1. SPLIT (HORIZONTAL) CARD LAYOUT
    if (config?.layout === 'list-split') {
        return (
            <>
                <Link
                    href={`/product/${product.slug}`}
                    className={`group flex items-center rounded-xl overflow-hidden p-2.5 gap-4 transition-all duration-300 ${cardThemeClass}`}
                >
                    <div className="w-28 h-28 relative bg-muted shrink-0 rounded-lg overflow-hidden">
                        {displayImageUrl ? (
                            isDisplayGif ? (
                                <img
                                    src={getAssetUrl(displayImageUrl)}
                                    alt={product.name}
                                    className="w-full h-full object-contain p-1.5 group-hover:scale-105 transition-transform duration-300"
                                />
                            ) : (
                                <Image
                                    src={getAssetUrl(displayImageUrl) as string}
                                    alt={product.name}
                                    fill
                                    className="object-contain p-1.5 group-hover:scale-105 transition-transform duration-300"
                                    sizes="96px"
                                />
                            )
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-[10px]">
                                Aucune image
                            </div>
                        )}
                        {renderCornerBadges()}
                    </div>
                    <div className="flex-grow min-w-0 p-1 flex flex-col justify-between h-28 relative">
                        <div className="space-y-1">
                            <div className="flex items-start justify-between gap-1">
                                <h3 className="text-xs sm:text-sm font-bold line-clamp-2 group-hover:text-primary transition-colors leading-tight flex-1">
                                    {product.name}
                                </h3>
                                {(config?.showCartIcon || config?.showAddToCart) && (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            if (isPending) return;
                                            const variantId = product.productVariantId || product.variants?.[0]?.id || product.id;
                                            if (!variantId) {
                                                toast.error("Variante indisponible pour ce produit");
                                                return;
                                            }
                                            startTransition(async () => {
                                                const res = await addToCart(variantId, 1);
                                                if (res.success) {
                                                    toast.success(`${product.name} ajouté au panier !`);
                                                } else {
                                                    toast.error(res.error || "Erreur lors de l'ajout au panier");
                                                }
                                            });
                                        }}
                                        disabled={isPending}
                                        className="p-1.5 bg-white/95 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-primary hover:text-white rounded-full shadow-md border border-slate-200/80 dark:border-slate-700 shrink-0 transition-all duration-200 hover:scale-105 flex items-center justify-center relative z-10 group/cartbtn"
                                        title="Ajouter au panier rapidement"
                                    >
                                        {isPending ? (
                                            <Loader2 className="w-3 h-3 animate-spin text-primary group-hover/cartbtn:text-white" />
                                        ) : (
                                            <ShoppingCart className="w-3.5 h-3.5 stroke-[2.2] transition-colors" />
                                        )}
                                    </button>
                                )}
                            </div>
                            {product.vendorName && (
                                <p className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
                                    👤 {product.vendorName}
                                </p>
                            )}
                        </div>
                        <div className="flex items-center justify-between gap-1">
                            <Suspense fallback={<div className="h-4 w-20 rounded bg-muted"></div>}>
                                <div className="flex flex-col gap-0.5">
                                    {priceInfo.hasPromotion ? (
                                        <>
                                            <p className={`text-sm sm:text-base font-black tracking-tight ${priceInfo.showBothPrices ? 'text-red-600' : 'text-primary'}`}>
                                                <Price value={priceInfo.promotionalPrice} />
                                            </p>
                                            {priceInfo.showBothPrices && (
                                                <p className="text-[10px] font-medium text-muted-foreground line-through decoration-red-500/70">
                                                    <Price value={priceInfo.originalPrice} />
                                                </p>
                                            )}
                                        </>
                                    ) : config?.showPromoPrice ? (
                                        <>
                                            <p className="text-sm sm:text-base font-black text-red-600 tracking-tight">
                                                <Price value={priceInfo.originalPrice} />
                                            </p>
                                            {config?.showStrikethroughPrice !== false && (
                                                <p className="text-[10px] font-medium text-muted-foreground line-through decoration-red-500/70">
                                                    <Price value={priceInfo.originalPrice * 1.25} />
                                                </p>
                                            )}
                                        </>
                                    ) : (
                                        <p className="text-sm sm:text-base font-black text-primary tracking-tight">
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
                                    className="p-2 rounded-full bg-secondary/5 dark:bg-slate-700 text-secondary dark:text-slate-200 hover:bg-primary/10 hover:text-primary transition-colors flex-shrink-0 shadow-sm disabled:opacity-50"
                                    title="Ajouter aux favoris"
                                >
                                    {isPending ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                        <Heart className={`h-3.5 w-3.5 transition-colors ${isLiked ? 'fill-primary text-primary' : 'text-slate-550 dark:text-slate-350'}`} />
                                    )}
                                </button>
                            )}
                        </div>
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

    // 2. STANDARD (GRID/CAROUSEL) CARD LAYOUT
    return (
        <>
            <Link
                href={`/product/${product.slug}`}
                className={`group block rounded-xl overflow-hidden transition-all duration-300 ${cardThemeClass}`}
            >
                <div className="aspect-square relative bg-muted">
                    {displayImageUrl ? (
                        isDisplayGif ? (
                            <img
                                src={getAssetUrl(displayImageUrl)}
                                alt={product.name}
                                className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-300"
                            />
                        ) : (
                            <Image
                                src={getAssetUrl(displayImageUrl) as string}
                                alt={product.name}
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
                    {renderCornerBadges()}
                </div>
                <div className="p-3 space-y-2 relative">
                    <div className="space-y-0.5">
                        <div className="flex items-start justify-between gap-1">
                            <h3 className="text-sm font-bold line-clamp-2 group-hover:text-primary transition-colors leading-tight flex-1">
                                {product.name}
                            </h3>
                            {(config?.showCartIcon || config?.showAddToCart) && (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        if (isPending) return;
                                        const variantId = product.productVariantId || product.variants?.[0]?.id || product.id;
                                        if (!variantId) {
                                            toast.error("Variante indisponible pour ce produit");
                                            return;
                                        }
                                        startTransition(async () => {
                                            const res = await addToCart(variantId, 1);
                                            if (res.success) {
                                                toast.success(`${product.name} ajouté au panier !`);
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
                        {product.vendorName && (
                            <p className="text-[10px] text-muted-foreground font-semibold">
                                👤 {product.vendorName}
                            </p>
                        )}
                    </div>
                    <div className="flex items-center justify-between gap-2 pt-1">
                        <Suspense fallback={<div className="h-4 w-20 rounded bg-muted"></div>}>
                            <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2">
                                {priceInfo.hasPromotion ? (
                                    <>
                                        <p className={`text-base sm:text-lg font-black tracking-tight ${priceInfo.showBothPrices ? 'text-red-600' : 'text-primary'}`}>
                                            <Price value={priceInfo.promotionalPrice} />
                                        </p>
                                        {priceInfo.showBothPrices && (
                                            <p className="text-[10px] sm:text-xs font-medium text-muted-foreground line-through decoration-red-500/70">
                                                <Price value={priceInfo.originalPrice} />
                                            </p>
                                        )}
                                    </>
                                ) : config?.showPromoPrice ? (
                                    <>
                                        <p className="text-base sm:text-lg font-black text-red-600 tracking-tight">
                                            <Price value={priceInfo.originalPrice} />
                                        </p>
                                        {config?.showStrikethroughPrice !== false && (
                                            <p className="text-[10px] sm:text-xs font-medium text-muted-foreground line-through decoration-red-500/70">
                                                <Price value={priceInfo.originalPrice * 1.25} />
                                            </p>
                                        )}
                                    </>
                                ) : (
                                    <p className="text-base sm:text-lg font-black text-primary tracking-tight">
                                        <Price value={priceInfo.originalPrice} />
                                    </p>
                                )}
                            </div>
                        </Suspense>
                        {showBottomLike && (
                            <button
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
