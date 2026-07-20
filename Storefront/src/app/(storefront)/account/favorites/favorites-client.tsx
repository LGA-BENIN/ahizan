'use client';

import React, { useState, useTransition } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Heart, Trash2, ShoppingBag, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Price } from '@/components/commerce/price';
import { getAssetUrl } from '@/lib/vendure/api-utils';
import { toggleProductLikeAction } from '@/app/(storefront)/likes-actions';

interface LikedProduct {
    id: string;
    name: string;
    slug: string;
    featuredAsset?: {
        id: string;
        preview: string;
    } | null;
    variants?: Array<{
        id: string;
        priceWithTax: number;
        stockLevel?: string;
    }> | null;
}

interface FavoritesClientProps {
    initialProducts: LikedProduct[];
}

export function FavoritesClient({ initialProducts }: FavoritesClientProps) {
    const [products, setProducts] = useState<LikedProduct[]>(initialProducts);
    const [isPending, startTransition] = useTransition();
    const [removingId, setRemovingId] = useState<string | null>(null);

    const handleRemoveLike = (productId: string, productName: string) => {
        setRemovingId(productId);
        startTransition(async () => {
            const res = await toggleProductLikeAction(productId);
            if (res.success && !res.liked) {
                setProducts((prev) => prev.filter((p) => p.id !== productId));
                toast.success(`${productName} a ete retire de vos favoris.`);
            } else if (res.success && res.liked) {
                // If for some reason it liked it again, keep it
                toast.info(`${productName} est toujours dans vos favoris.`);
            } else {
                toast.error(res.error || 'Une erreur est survenue lors de la suppression.');
            }
            setRemovingId(null);
        });
    };

    if (products.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-slate-50 dark:bg-slate-900/40 border border-dashed border-slate-200 dark:border-slate-850 rounded-3xl">
                <div className="h-16 w-16 rounded-2xl bg-primary/5 flex items-center justify-center mb-5 text-primary">
                    <Heart className="h-8 w-8 stroke-[1.5]" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50">
                    Votre liste de favoris est vide
                </h2>
                <p className="text-slate-500 dark:text-slate-400 max-w-sm mt-2 text-sm">
                    Parcourez notre catalogue et ajoutez les produits qui vous plaisent pour les retrouver plus tard.
                </p>
                <Link
                    href="/"
                    className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground text-sm font-bold rounded-xl shadow-sm hover:opacity-90 transition-opacity"
                >
                    <ShoppingBag className="h-4 w-4" />
                    Decouvrir les produits
                </Link>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {products.map((product) => {
                const imageUrl = product.featuredAsset?.preview;
                const price = product.variants?.[0]?.priceWithTax || 0;
                const isCurrentlyRemoving = removingId === product.id && isPending;

                return (
                    <div
                        key={product.id}
                        className="group relative bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 flex flex-col h-full"
                    >
                        {/* Image Container */}
                        <Link href={`/product/${product.slug}`} className="block aspect-square relative bg-slate-55 dark:bg-slate-950 overflow-hidden">
                            {imageUrl ? (
                                <Image
                                    src={getAssetUrl(imageUrl) as string}
                                    alt={product.name}
                                    fill
                                    className="object-contain p-4 group-hover:scale-105 transition-transform duration-500"
                                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">
                                    Aucune image
                                </div>
                            )}

                            {/* Hover Overlay */}
                            <div className="absolute inset-0 bg-slate-950/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        </Link>

                        {/* Product Info */}
                        <div className="p-4 flex flex-col flex-grow justify-between gap-4">
                            <div className="space-y-1">
                                <Link
                                    href={`/product/${product.slug}`}
                                    className="block group-hover:text-primary transition-colors duration-200"
                                >
                                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-50 line-clamp-2 leading-snug">
                                        {product.name}
                                    </h3>
                                </Link>
                                <p className="text-sm font-black text-slate-900 dark:text-slate-50">
                                    <Price value={price} />
                                </p>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-2 pt-2 border-t border-slate-50 dark:border-slate-850">
                                <Link
                                    href={`/product/${product.slug}`}
                                    className="flex-grow inline-flex items-center justify-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-lg hover:bg-slate-100 dark:hover:bg-slate-750 transition-colors"
                                >
                                    Voir le produit
                                </Link>
                                <button
                                    onClick={() => handleRemoveLike(product.id, product.name)}
                                    disabled={isCurrentlyRemoving}
                                    className="inline-flex items-center justify-center p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 border border-slate-100 dark:border-slate-800 hover:border-red-100 dark:hover:border-red-900 rounded-lg transition-all disabled:opacity-50"
                                    title="Retirer des favoris"
                                >
                                    {isCurrentlyRemoving ? (
                                        <Loader2 className="h-4 w-4 animate-spin text-red-500" />
                                    ) : (
                                        <Trash2 className="h-4 w-4" />
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
