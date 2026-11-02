'use client';

import React, { useState, useEffect, useTransition } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Price } from '@/components/commerce/price';
import { useThemeSettings } from '@/components/providers/theme-provider';
import { getAssetUrl, getAssetDownloadUrl, getPromoPriceInfo } from '@/lib/vendure/api-utils';
import { Heart, Loader2, MapPin, ShoppingCart, Store, Zap, Clock, Plus, Star, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';
import { toggleProductLikeAction, checkProductLikeStatus } from '@/app/(storefront)/likes-actions';
import { LoginPromptModal } from '@/components/shared/login-prompt-modal';
import { addToCart } from '@/app/(storefront)/product/[slug]/actions';
import { MasterDisplayItem, resolveDeclinationName } from '@/lib/vendure/display-engine';
import { priceFromSubunit } from '@/lib/format';
import { Progress } from '@/components/ui/progress';

interface MasterProductCardProps {
    item: MasterDisplayItem | any;
    config?: any;
    onSelectVariant?: (variantId: string) => void;
}

const isGif = (url: string | undefined | null) => url?.toLowerCase().endsWith('.gif');

function truncateString(str: string, maxLen: number): string {
    if (!str || str.length <= maxLen) return str;
    const truncated = str.slice(0, maxLen).trim();
    const lastSpace = truncated.lastIndexOf(' ');
    if (lastSpace > maxLen * 0.65) {
        return `${truncated.slice(0, lastSpace)}...`;
    }
    return `${truncated}...`;
}

export function MasterProductCard({ item, config }: MasterProductCardProps) {
    const themeSettings = useThemeSettings();
    const [isLiked, setIsLiked] = useState(false);
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
    const [isPending, startTransition] = useTransition();

    const winningOffer = item.winningOffer;
    const firstVariant = item.variants?.[0] || item.product?.variants?.[0];
    const initialVariant = winningOffer?.productVariant || winningOffer?.selectedVariant || firstVariant;
    const targetVariantId = initialVariant?.id || item.productVariantId || item.variants?.[0]?.id;

    const productId = item.productId || item.id;
    const productName = item.productName || item.name || 'Produit';
    const productSlug = item.slug || item.productSlug || item.productId || item.id;

    // Resolve title and declination suffix robustly
    const declinationName = item.declinationName 
        || winningOffer?.declinationName 
        || resolveDeclinationName(
            productName,
            initialVariant?.options || item.options,
            initialVariant?.name,
            [item.productVariantName, item.variantName]
        );

    const cleanProd = (productName || '').trim();
    const rawDecl = (declinationName || '').trim();
    let displayTitle = cleanProd;

    if (rawDecl && rawDecl.toLowerCase() !== cleanProd.toLowerCase()) {
        if (rawDecl.toLowerCase().startsWith(cleanProd.toLowerCase())) {
            displayTitle = rawDecl;
        } else if (cleanProd.toLowerCase().includes(rawDecl.toLowerCase())) {
            displayTitle = cleanProd;
        } else {
            displayTitle = `${cleanProd} — ${rawDecl}`;
        }
    }

    // Resolve active vendor / shop info
    const activeVendor = winningOffer?.vendor || item.vendor || item.customFields?.vendor || {
        id: item.vendorId || item.vendor?.id || item.customFields?.vendor?.id,
        name: item.vendorName || item.vendor?.name || item.customFields?.vendor?.name,
        location: item.locationName ? { name: item.locationName } : item.customFields?.vendor?.location,
        physicalMarket: item.marketName ? { name: item.marketName } : item.customFields?.vendor?.physicalMarket,
    };

    const vendorName = activeVendor?.name || winningOffer?.vendor?.name || item.vendorName || item.vendor?.name || item.customFields?.vendor?.name || item.customFields?.vendorName || '';
    const marketName = activeVendor?.physicalMarket?.name || winningOffer?.vendor?.physicalMarket?.name || item.marketName;
    const locationName = activeVendor?.location?.name || winningOffer?.vendor?.location?.name || item.locationName;
    const geoTag = marketName || locationName;

    // Pricing & Promotion calculation
    const rawPrice = item.price ?? winningOffer?.price ?? (typeof firstVariant?.priceWithTax === 'object' ? firstVariant.priceWithTax?.value : firstVariant?.priceWithTax) ?? 0;
    const isPromoActive = Boolean(item.onPromotion || winningOffer?.onPromotion);
    const promoPrice = item.promotionalPrice ?? winningOffer?.promotionalPrice;
    const activePrice = isPromoActive && promoPrice ? promoPrice : rawPrice;
    const originalPrice = isPromoActive && promoPrice ? rawPrice : 0;
    const discountPercent = item.discountPercentage || winningOffer?.discountPercentage || (originalPrice > activePrice && originalPrice > 0 ? Math.round(((originalPrice - activePrice) / originalPrice) * 100) : 0);

    // Image resolution: robust resolution cascading from variant -> offer -> product parent -> search preview
    const rawAsset = winningOffer?.featuredAsset?.preview 
        || (typeof winningOffer?.featuredAsset === 'string' ? winningOffer.featuredAsset : null)
        || item.featuredAsset?.preview 
        || (typeof item.featuredAsset === 'string' ? item.featuredAsset : null)
        || item.productVariantAsset?.preview 
        || (typeof item.productVariantAsset === 'string' ? item.productVariantAsset : null)
        || item.productAsset?.preview 
        || (typeof item.productAsset === 'string' ? item.productAsset : null)
        || (typeof item.productPreview === 'string' ? item.productPreview : item.productPreview?.preview)
        || initialVariant?.featuredAsset?.preview 
        || (typeof initialVariant?.featuredAsset === 'string' ? initialVariant.featuredAsset : null)
        || initialVariant?.productVariantAsset?.preview 
        || winningOffer?.productVariant?.featuredAsset?.preview
        || winningOffer?.productVariant?.product?.featuredAsset?.preview
        || initialVariant?.product?.featuredAsset?.preview
        || item.product?.featuredAsset?.preview
        || (typeof item.product?.featuredAsset === 'string' ? item.product.featuredAsset : null)
        || item.product?.productAsset?.preview
        || item.assets?.[0]?.preview 
        || item.product?.assets?.[0]?.preview
        || (typeof item.assets?.[0] === 'string' ? item.assets[0] : null)
        || item.imageUrl 
        || null;
    const resolvedUrl = getAssetUrl(rawAsset);
    const displayImageUrl = (resolvedUrl && !resolvedUrl.includes('whatsapp-image')) 
        ? resolvedUrl 
        : null;
    const isDisplayGif = isGif(displayImageUrl);

    // PDP URL with variant and seller query parameters
    const queryParams = new URLSearchParams();
    if (targetVariantId) {
        queryParams.set('variantId', String(targetVariantId));
        queryParams.set('variant', String(targetVariantId));
    }
    if (activeVendor?.id) {
        queryParams.set('sellerId', String(activeVendor.id));
        queryParams.set('vendorId', String(activeVendor.id));
    }
    const queryString = queryParams.toString();
    const productDetailHref = `/product/${productSlug}${queryString ? `?${queryString}` : ''}`;

    // Likes status
    useEffect(() => {
        let isMounted = true;
        if (!productId) return;
        checkProductLikeStatus(productId).then(status => {
            if (isMounted) setIsLiked(status);
        });
        return () => { isMounted = false; };
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
                    toast.success(`${displayTitle} ajouté à vos favoris !`);
                } else {
                    toast.info(`${displayTitle} retiré de vos favoris.`);
                }
            } else if (res.authenticated === false || res.error === 'UNAUTHORIZED') {
                setIsLoginModalOpen(true);
            } else {
                toast.error(res.error || 'Erreur lors de la mise à jour du favori');
            }
        });
    };

    const handleAddToCart = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!targetVariantId) {
            toast.error("Variante indisponible pour cette offre");
            return;
        }

        startTransition(async () => {
            try {
                const assignedVendorId = activeVendor?.id || undefined;
                const sellerOfferId = winningOffer?.id || undefined;
                const res = await addToCart(targetVariantId, 1, assignedVendorId, sellerOfferId);
                if (res.success) {
                    toast.success('Ajouté au panier !', {
                        description: `${displayTitle} (${vendorName})`,
                    });
                } else {
                    toast.error(res.error || "Impossible d'ajouter l'article au panier");
                }
            } catch (err: any) {
                toast.error(err.message || 'Erreur lors de l’ajout');
            }
        });
    };

    // Card Theme styling
    const cardTheme = config?.cardTheme || config?.cardStyle || 'default';
    let cardThemeClass = "bg-card rounded-2xl border border-border/70 hover:border-primary/50 hover:shadow-lg transition-all duration-300";
    if (cardTheme === 'flat') {
        cardThemeClass = "shadow-none border border-border bg-card hover:border-slate-400 dark:hover:border-slate-700";
    } else if (cardTheme === 'glassmorphism') {
        cardThemeClass = "bg-white/10 dark:bg-slate-900/40 backdrop-blur-md border border-white/20 dark:border-slate-800/50 shadow-md hover:shadow-xl";
    } else if (cardTheme === 'elevated') {
        cardThemeClass = "bg-card rounded-2xl border border-primary/20 shadow-md hover:shadow-xl";
    }

    const ratioClass = config?.imageRatio === '4:3' 
        ? 'aspect-[4/3]' 
        : config?.imageRatio === '3:4' 
        ? 'aspect-[3/4]' 
        : config?.imageRatio === '16:9' 
        ? 'aspect-[16/9]' 
        : 'aspect-square';

    return (
        <>
            <div className={`group/card relative flex flex-col h-full overflow-hidden transition-all duration-300 ${cardThemeClass}`}>
                {/* Product/Declination Image */}
                <div 
                    className={`relative ${ratioClass} w-full overflow-hidden bg-slate-50 dark:bg-slate-900/50 flex-shrink-0 cursor-pointer`}
                    onContextMenu={(e) => {
                        e.preventDefault();
                        const downloadTarget = rawAsset || displayImageUrl;
                        const downloadUrl = getAssetDownloadUrl(downloadTarget);
                        if (downloadUrl) {
                            const link = document.createElement('a');
                            link.href = downloadUrl;
                            link.setAttribute('download', `ahizan-${productSlug}.jpg`);
                            link.style.display = 'none';
                            document.body.appendChild(link);
                            link.click();
                            setTimeout(() => {
                                try { document.body.removeChild(link); } catch (err) {}
                            }, 500);
                            toast.success("Téléchargement de l'image officielle protégée...");
                        }
                    }}
                >
                    <Link href={productDetailHref} className="block w-full h-full">
                        {displayImageUrl ? (
                            <Image
                                src={displayImageUrl}
                                alt={displayTitle}
                                fill
                                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                                className="object-cover group-hover/card:scale-105 transition-transform duration-500"
                                unoptimized={isDisplayGif}
                            />
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-850 text-slate-400 p-4 transition-colors">
                                <ShoppingBag className="w-9 h-9 text-slate-300 dark:text-slate-600 stroke-[1.25] mb-1.5" />
                                <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 line-clamp-1 text-center px-2">
                                    {displayTitle}
                                </span>
                            </div>
                        )}
                    </Link>

                    {/* Corner Badges: Contextual (Cdiscount) & Promo (Jumia) */}
                    <div className="absolute top-2 left-2 flex flex-col gap-1 z-10 max-w-[70%]">
                        {Boolean(item.contextBadge || config?.contextBadge) && (
                            <span className={`inline-flex items-center text-[10px] font-black px-2 py-0.5 rounded-md shadow-xs text-white uppercase tracking-wider ${
                                (item.contextBadge || config?.contextBadge)?.toLowerCase().includes('bon plan') 
                                    ? 'bg-blue-600'
                                    : (item.contextBadge || config?.contextBadge)?.toLowerCase().includes('meilleur') 
                                    ? 'bg-amber-700'
                                    : (item.contextBadge || config?.contextBadge)?.toLowerCase().includes('responsable') 
                                    ? 'bg-emerald-600'
                                    : 'bg-primary'
                            }`}>
                                {item.contextBadge || config?.contextBadge}
                            </span>
                        )}
                        {isPromoActive && (
                            <span className="inline-flex items-center gap-1 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-xs w-fit">
                                <Zap className="w-2.5 h-2.5 fill-white stroke-[1.5]" />
                                {discountPercent > 0 ? `-${discountPercent}%` : 'PROMO'}
                            </span>
                        )}
                    </div>

                    {/* Favorite Heart Button */}
                    <button
                        onClick={handleLike}
                        disabled={isPending}
                        aria-label="Ajouter aux favoris"
                        className="absolute top-2 right-2 z-10 w-8 h-8 rounded-full bg-white/90 backdrop-blur-md dark:bg-black/80 flex items-center justify-center text-foreground hover:text-red-500 hover:scale-110 shadow-xs transition-all"
                    >
                        {isPending ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                            <Heart className={`w-4 h-4 transition-colors ${isLiked ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`} />
                        )}
                    </button>

                    {/* Quick Add '+' Button (Jumia style - immediate action without leaving page) */}
                    {(config?.showQuickAddButton || config?.actionStyle === 'quick_add' || config?.isFlashSaleCard) ? (
                        <button
                            onClick={handleAddToCart}
                            disabled={isPending}
                            aria-label="Ajout rapide au panier"
                            title="Ajout rapide au panier"
                            className="absolute bottom-2 right-2 z-10 w-8 h-8 sm:w-8 sm:h-8 rounded-full bg-slate-900/95 hover:bg-red-600 text-white flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all duration-200 border border-white/20"
                        >
                            {isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Plus className="w-4 h-4 stroke-[3px]" />
                            )}
                        </button>
                    ) : config?.showQuickAddToCart ? (
                        <button
                            onClick={handleAddToCart}
                            disabled={isPending}
                            aria-label="Ajouter au panier"
                            className="absolute bottom-2 right-2 z-10 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center shadow-md translate-y-2 opacity-0 group-hover/card:translate-y-0 group-hover/card:opacity-100 transition-all duration-300"
                            title="Ajouter au panier"
                        >
                            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />}
                        </button>
                    ) : null}
                </div>

                {/* Card Content */}
                <div className="p-2 sm:p-2.5 flex flex-col flex-1 text-left relative justify-between gap-1 sm:gap-1.5">
                    {/* Store / Vendor Name & Location Badge */}
                    {Boolean(!config?.hideVendorBadge && (vendorName || geoTag)) && (
                        <div className="flex items-center justify-between gap-1 text-[10.5px] sm:text-[11px] font-semibold text-muted-foreground truncate">
                            {vendorName ? (
                                <div className="flex items-center gap-1.5 truncate">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                    <span className="truncate text-foreground font-bold">{vendorName}</span>
                                </div>
                            ) : <div />}
                            {geoTag && (
                                <span className="text-[9.5px] sm:text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded shrink-0 flex items-center gap-0.5">
                                    <MapPin className="w-2.5 h-2.5" />
                                    {geoTag}
                                </span>
                            )}
                        </div>
                    )}

                    {/* Title with Declination */}
                    <Link href={productDetailHref} className="block flex-1 min-w-0 mt-0.5">
                        <h3 
                            className="font-bold text-xs sm:text-[13px] text-foreground hover:text-primary transition-colors line-clamp-2 leading-snug break-words"
                            title={displayTitle}
                        >
                            <span className="sm:hidden">{truncateString(displayTitle, 48)}</span>
                            <span className="hidden sm:inline">{truncateString(displayTitle, 70)}</span>
                        </h3>
                    </Link>

                    {rawDecl && rawDecl.length <= 25 && !displayTitle.toLowerCase().includes(rawDecl.toLowerCase()) && (
                        <div className="flex items-center gap-1.5 flex-wrap max-w-full overflow-hidden">
                            <span className="inline-flex items-center gap-1 text-[9.5px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-muted/80 text-foreground border border-border/50 max-w-full">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block shrink-0" />
                                <span className="truncate">{rawDecl}</span>
                            </span>
                        </div>
                    )}

                    {/* Social Proof / Rating */}
                    {Boolean(item.rating || item.score || item.reviewCount || config?.showRating) && (
                        <div className="flex items-center gap-1 text-[11px] text-amber-500 font-bold">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                            <span>{(item.rating || item.score || 4.5).toFixed(1)}</span>
                            {Boolean(item.reviewCount || item.reviewsCount) && (
                                <span className="text-[10px] text-muted-foreground font-normal">
                                    ({item.reviewCount || item.reviewsCount})
                                </span>
                            )}
                        </div>
                    )}

                    {/* Stock Urgency / Scarcity Gauge (FOMO) */}
                    {(Boolean(item.stockRemaining != null || config?.stockRemaining != null) || config?.showStockGauge) && (
                        <div className="space-y-1 my-1">
                            {(() => {
                                const remaining = item.stockRemaining ?? config?.stockRemaining ?? 12;
                                const total = item.stockTotal ?? config?.stockTotal ?? 30;
                                const percent = Math.min(100, Math.max(10, Math.round((remaining / total) * 100)));
                                return (
                                    <>
                                        <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground">
                                            <span className="text-red-600 dark:text-red-400 font-extrabold flex items-center gap-1">
                                                <Clock className="w-2.5 h-2.5 inline" />
                                                {remaining <= 5 ? `Plus que ${remaining} en stock !` : `${remaining} restants`}
                                            </span>
                                        </div>
                                        <Progress value={percent} className="h-1.5 bg-muted rounded-full" />
                                    </>
                                );
                            })()}
                        </div>
                    )}

                    {/* Price Block */}
                    <div className="pt-1.5 border-t border-border/40 flex items-baseline justify-between gap-1 mt-auto">
                        <div className="flex items-baseline gap-1.5 flex-wrap">
                            <span className="text-sm sm:text-base font-black text-foreground">
                                <Price value={activePrice} currencyCode="XOF" />
                            </span>
                            {isPromoActive && originalPrice > activePrice && (
                                <span className="text-[10px] sm:text-xs text-muted-foreground line-through font-medium">
                                    <Price value={originalPrice} currencyCode="XOF" />
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Login Prompt Modal for guests */}
            <LoginPromptModal
                isOpen={isLoginModalOpen}
                onClose={() => setIsLoginModalOpen(false)}
                title="Connectez-vous pour vos favoris"
                description="Sauvegardez vos articles préférés dans votre liste de souhaits en un clic."
            />
        </>
    );
}
