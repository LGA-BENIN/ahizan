'use client';

import Image from 'next/image';
import { Price } from '@/components/commerce/price';
import { Suspense, useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { useThemeSettings } from '@/components/providers/theme-provider';
import { getAssetUrl, getPromoPriceInfo } from '@/lib/vendure/api-utils';
import { Heart, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { toggleProductLikeAction, checkProductLikeStatus } from '@/app/(storefront)/likes-actions';
import { LoginPromptModal } from '@/components/shared/login-prompt-modal';

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
    
    const imageUrl = product.featuredAsset?.preview;
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

    return (
        <>
            <Link
                href={`/product/${product.slug}`}
                className="group block bg-card rounded-lg overflow-hidden border border-border hover:shadow-lg transition-shadow"
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
                </div>
                <div className="p-3 space-y-2">
                    <h3 className="text-sm sm:text-base font-medium line-clamp-2 group-hover:text-primary transition-colors leading-tight">
                        {product.name}
                    </h3>
                    <div className="flex items-center justify-between gap-2 pt-1">
                        <Suspense fallback={<div className="h-4 w-20 rounded bg-muted"></div>}>
                            <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2">
                                {priceInfo.hasPromotion ? (
                                    <>
                                        <p className={`text-lg sm:text-xl font-bold tracking-tight ${priceInfo.showBothPrices ? 'text-red-600' : 'text-primary'}`}>
                                            <Price value={priceInfo.promotionalPrice} />
                                        </p>
                                        {priceInfo.showBothPrices && (
                                            <p className="text-xs sm:text-sm font-medium text-muted-foreground line-through decoration-red-500/70 decoration-2 opacity-80">
                                                <Price value={priceInfo.originalPrice} />
                                            </p>
                                        )}
                                    </>
                                ) : config?.showPromoPrice ? (
                                    <>
                                        <p className="text-lg sm:text-xl font-bold text-red-600 tracking-tight">
                                            <Price value={priceInfo.originalPrice} />
                                        </p>
                                        {config?.showStrikethroughPrice !== false && (
                                            <p className="text-xs sm:text-sm font-medium text-muted-foreground line-through decoration-red-500/70 decoration-2 opacity-80">
                                                <Price value={priceInfo.originalPrice * 1.25} />
                                            </p>
                                        )}
                                    </>
                                ) : (
                                    <p className="text-lg sm:text-xl font-bold text-primary tracking-tight">
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
