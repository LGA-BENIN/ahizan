"use client";

import React, { useEffect } from 'react';
import { CheckCircle2, X } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Price } from '@/components/commerce/price';
import { getAssetUrl } from '@/lib/vendure/api-utils';

interface AddToCartModalProps {
    isOpen: boolean;
    onClose: () => void;
    productTitle: string;
    variantName?: string;
    price: number;
    currencyCode?: string;
    imagePreview?: string | null;
    vendorName?: string;
}

export function AddToCartModal({
    isOpen,
    onClose,
    productTitle,
    variantName,
    price,
    currencyCode = 'XOF',
    imagePreview,
    vendorName
}: AddToCartModalProps) {
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const imageUrl = getAssetUrl(imagePreview) || '/placeholder.png';
    const displayName = variantName ? `${productTitle} — ${variantName}` : productTitle;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div 
                className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity" 
                onClick={onClose}
            />

            {/* Modal Box */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 shadow-2xl relative z-10 transform transition-all animate-in fade-in zoom-in-95 duration-200">
                
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
                        <span className="font-bold text-sm sm:text-base">L&apos;article a bien été ajouté au panier</span>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                        aria-label="Fermer"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Product Detail */}
                <div className="flex items-center gap-4 py-5">
                    <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0">
                        <Image
                            src={imageUrl}
                            alt={displayName}
                            fill
                            sizes="96px"
                            className="object-cover"
                        />
                    </div>
                    <div className="space-y-1 text-left flex-1 min-w-0">
                        <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white line-clamp-2">
                            {displayName}
                        </h3>
                        {vendorName && (
                            <p className="text-xs text-muted-foreground font-medium truncate">
                                Vendeur : <span className="text-slate-700 dark:text-slate-300 font-semibold">{vendorName}</span>
                            </p>
                        )}
                        <p className="text-sm sm:text-base font-black text-slate-900 dark:text-white pt-1">
                            Prix: <span className="text-primary font-bold"><Price value={price} currencyCode={currencyCode} /></span>
                        </p>
                    </div>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                    <Button 
                        variant="outline"
                        onClick={onClose}
                        className="w-full rounded-xl font-bold text-xs sm:text-sm border-[#e11d48] text-[#e11d48] hover:bg-rose-50 dark:hover:bg-rose-950/20 py-2.5 h-auto transition-colors"
                    >
                        Continuer vos achats
                    </Button>
                    <Button 
                        asChild
                        className="w-full rounded-xl font-bold text-xs sm:text-sm bg-[#e11d48] hover:bg-[#be123c] text-white py-2.5 h-auto shadow-md transition-all active:scale-[0.98]"
                    >
                        <Link href="/cart">
                            Voir le panier
                        </Link>
                    </Button>
                </div>
            </div>
        </div>
    );
}
