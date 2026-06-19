"use client";

import Image from 'next/image';
import { Price } from '@/components/commerce/price';
import { Suspense } from "react";
import Link from "next/link";
import { useThemeSettings } from '@/components/providers/theme-provider';
import { getAssetUrl, getPromoPriceInfo } from '@/lib/vendure/api-utils';

interface VendorProductCardProps {
    product: any;
    config?: any;
}

const isGif = (url: string | undefined | null) => url?.toLowerCase().endsWith('.gif');

export function VendorProductCard({ product, config }: VendorProductCardProps) {
    const themeSettings = useThemeSettings();
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

    return (
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
                <Suspense fallback={<div className="h-4 w-20 rounded bg-muted"></div>}>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
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
            </div>
        </Link>
    );
}
