"use client";

import Image from 'next/image';
import {FragmentOf, readFragment} from '@/graphql';
import {ProductCardFragment} from '@/lib/vendure/fragments';
import {Price} from '@/components/commerce/price';
import {Suspense} from "react";
import Link from "next/link";
import { useThemeSettings } from '@/components/providers/theme-provider';
import { getAssetUrl } from '@/lib/vendure/api-utils';

interface ProductCardProps {
    product: FragmentOf<typeof ProductCardFragment>;
    config?: any;
}

const isGif = (url: string | undefined | null) => url?.toLowerCase().endsWith('.gif');

export function ProductCard({product: productProp, config}: ProductCardProps) {
    const product = readFragment(ProductCardFragment, productProp);
    const themeSettings = useThemeSettings();
    const imageUrl = product.productAsset?.preview;
    const isImageGif = isGif(imageUrl);
    const defaultImage = themeSettings?.defaultProductImage;
    const displayImageUrl = imageUrl || defaultImage;
    const isDisplayGif = isGif(displayImageUrl);

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
            <div className="p-3 space-y-2">
                <h3 className="text-base sm:text-lg font-bold line-clamp-2 group-hover:text-primary transition-colors leading-tight">
                    {product.productName}
                </h3>
                <Suspense fallback={<div className="h-4 w-20 rounded bg-muted"></div>}>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                        {config?.showPromoPrice ? (
                            <>
                                <p className="text-xl sm:text-2xl font-black text-red-600 tracking-tight">
                                    {product.priceWithTax.__typename === 'PriceRange' ? (
                                        product.priceWithTax.min !== product.priceWithTax.max ? (
                                            <>à partir de <Price value={product.priceWithTax.min}/></>
                                        ) : (<Price value={product.priceWithTax.min}/>)
                                    ) : product.priceWithTax.__typename === 'SinglePrice' ? (
                                        <Price value={product.priceWithTax.value}/>
                                    ) : null}
                                </p>
                                {config?.showStrikethroughPrice !== false && (
                                    <p className="text-sm font-bold text-muted-foreground line-through decoration-red-500/70 decoration-2 opacity-80">
                                        {product.priceWithTax.__typename === 'PriceRange' ? (
                                            <Price value={product.priceWithTax.min * 1.25}/>
                                        ) : product.priceWithTax.__typename === 'SinglePrice' ? (
                                            <Price value={product.priceWithTax.value * 1.25}/>
                                        ) : null}
                                    </p>
                                )}
                            </>
                        ) : (
                            <p className="text-xl sm:text-2xl font-black text-primary tracking-tight">
                                {product.priceWithTax.__typename === 'PriceRange' ? (
                                    product.priceWithTax.min !== product.priceWithTax.max ? (
                                        <>à partir de <Price value={product.priceWithTax.min}/></>
                                    ) : (<Price value={product.priceWithTax.min}/>)
                                ) : product.priceWithTax.__typename === 'SinglePrice' ? (
                                    <Price value={product.priceWithTax.value}/>
                                ) : null}
                            </p>
                        )}
                    </div>
                </Suspense>
            </div>
        </Link>
    );
}
