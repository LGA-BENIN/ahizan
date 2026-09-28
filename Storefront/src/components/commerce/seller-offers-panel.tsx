'use client';

import React, { useState, useTransition, useMemo } from 'react';
import Link from 'next/link';
import { addToCart } from '@/app/(storefront)/product/[slug]/actions';
import { toast } from 'sonner';
import { 
    ShoppingCart, Loader2, Star, Clock, Package, CheckCircle2, 
    BadgeCheck, Store, MapPin, Zap, ExternalLink, ArrowRight, ShieldCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { encodeId } from '@/lib/hash-utils';
import { getAssetUrl } from '@/lib/vendure/api-utils';

function priceFromCents(price: number): string {
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'XOF',
        maximumFractionDigits: 0,
    }).format(Math.round(price));
}

function formatDelivery(value?: number, unit?: string): string {
    if (!value) return 'Livraison standard rapide';
    if (unit === 'h') return `Livraison en ${value}h`;
    return `Livraison en ${value} jour${value > 1 ? 's' : ''}`;
}

function conditionLabel(condition: string): { label: string; color: string } {
    switch (condition) {
        case 'NEW': return { label: 'Neuf & Authentique', color: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400' };
        case 'USED': return { label: 'Occasion vérifiée', color: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400' };
        case 'REFURBISHED': return { label: 'Reconditionné garanti', color: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/30 dark:text-sky-400' };
        default: return { label: 'Produit garanti', color: 'bg-muted text-muted-foreground border-border' };
    }
}

export interface Offer {
    id: string;
    price: number;
    stock: number;
    onPromotion?: boolean;
    promotionalPrice?: number;
    deliveryTimeValue?: number;
    deliveryTimeUnit?: string;
    condition?: string;
    vendor: {
        id: string;
        name: string;
        rating?: number;
        ratingCount?: number;
        verificationStatus?: boolean;
        zone?: string;
        address?: string;
        logo?: { preview: string } | null;
        location?: { id: string; name: string } | null;
        physicalMarket?: { id: string; name: string } | null;
    };
    productVariant: {
        id: string;
        name?: string;
        sku?: string;
    };
}

interface SellerOffersPanelProps {
    offers: Offer[];
    selectedVendorId?: string | null;
    onSelectVendor?: (vendorId: string, variantId?: string) => void;
    quantity?: number;
}

export function SellerOffersPanel({ 
    offers, 
    selectedVendorId, 
    onSelectVendor, 
    quantity = 1 
}: SellerOffersPanelProps) {
    const [filterTab, setFilterTab] = useState<'all' | 'proximity' | 'fast' | 'topRated'>('all');
    const [isPending, startTransition] = useTransition();
    const [addedOfferId, setAddedOfferId] = useState<string | null>(null);

    if (!offers || offers.length === 0) return null;

    // Filter and group offers
    const filteredOffers = useMemo(() => {
        let list = [...offers];
        if (filterTab === 'proximity') {
            list = list.filter(o => o.vendor?.physicalMarket?.name || o.vendor?.location?.name || o.vendor?.zone);
        } else if (filterTab === 'fast') {
            list.sort((a, b) => {
                const timeA = (a.deliveryTimeUnit === 'h' ? a.deliveryTimeValue || 24 : (a.deliveryTimeValue || 3) * 24);
                const timeB = (b.deliveryTimeUnit === 'h' ? b.deliveryTimeValue || 24 : (b.deliveryTimeValue || 3) * 24);
                return timeA - timeB;
            });
        } else if (filterTab === 'topRated') {
            list.sort((a, b) => (b.vendor?.rating || 0) - (a.vendor?.rating || 0));
        }
        return list;
    }, [offers, filterTab]);

    const handleAddToCart = (offer: Offer, e: React.MouseEvent) => {
        e.stopPropagation();
        startTransition(async () => {
            const result = await addToCart(offer.productVariant.id, quantity, offer.vendor.id, offer.id);
            if (result.success) {
                toast.success('Ajouté au panier !', {
                    description: `Offre de ${offer.vendor.name} ajoutée`,
                });
                setAddedOfferId(offer.id);
                setTimeout(() => setAddedOfferId(null), 2500);
            } else {
                toast.error(result.error || "Erreur lors de l'ajout au panier");
            }
        });
    };

    return (
        <div className="space-y-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-gradient-to-b from-slate-50/60 to-white dark:from-slate-900/50 dark:to-slate-900/20 p-4 sm:p-5 shadow-sm">
            {/* Header with Title and context */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                    <div className="flex items-center gap-2">
                        <Store className="w-4 h-4 text-primary" />
                        <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                            Boutiques & Vendeurs Partenaires ({offers.length})
                        </h3>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                        Choisissez la boutique selon la proximité, le délai de livraison ou vos préférences de confiance.
                    </p>
                </div>
            </div>

            {/* Filter Pills */}
            {offers.length > 2 && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                    <button
                        type="button"
                        onClick={() => setFilterTab('all')}
                        className={`text-[11px] font-bold px-3 py-1 rounded-full transition-all whitespace-nowrap ${
                            filterTab === 'all'
                                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                        }`}
                    >
                        Tous les vendeurs
                    </button>
                    <button
                        type="button"
                        onClick={() => setFilterTab('proximity')}
                        className={`text-[11px] font-bold px-3 py-1 rounded-full transition-all whitespace-nowrap flex items-center gap-1 ${
                            filterTab === 'proximity'
                                ? 'bg-primary text-white shadow-sm'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                        }`}
                    >
                        <MapPin className="w-3 h-3" /> Marchés & Proximité
                    </button>
                    <button
                        type="button"
                        onClick={() => setFilterTab('fast')}
                        className={`text-[11px] font-bold px-3 py-1 rounded-full transition-all whitespace-nowrap flex items-center gap-1 ${
                            filterTab === 'fast'
                                ? 'bg-amber-600 text-white shadow-sm'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                        }`}
                    >
                        <Zap className="w-3 h-3" /> Livraison Express
                    </button>
                    <button
                        type="button"
                        onClick={() => setFilterTab('topRated')}
                        className={`text-[11px] font-bold px-3 py-1 rounded-full transition-all whitespace-nowrap flex items-center gap-1 ${
                            filterTab === 'topRated'
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                        }`}
                    >
                        <Star className="w-3 h-3 fill-current" /> Mieux Notés
                    </button>
                </div>
            )}

            {/* List of Offers */}
            <div className="space-y-3">
                {filteredOffers.map((offer) => {
                    const isSelectedVendor = String(offer.vendor.id) === String(selectedVendorId);
                    const isAdded = offer.id === addedOfferId;
                    const cond = conditionLabel(offer.condition || 'NEW');
                    const vendorLogoUrl = offer.vendor.logo?.preview ? getAssetUrl(offer.vendor.logo.preview) : null;
                    const marketOrZone = offer.vendor.physicalMarket?.name || offer.vendor.location?.name || offer.vendor.zone || offer.vendor.address;
                    const effectivePrice = offer.onPromotion && offer.promotionalPrice ? offer.promotionalPrice : offer.price;

                    return (
                        <div
                            key={offer.id}
                            className={`relative rounded-2xl border transition-all duration-200 p-4 ${
                                isSelectedVendor
                                    ? 'border-primary/60 bg-primary/[0.03] shadow-md ring-2 ring-primary/20'
                                    : 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm'
                            }`}
                        >
                            {/* Selected Badge */}
                            {isSelectedVendor && (
                                <div className="absolute -top-2.5 right-4 bg-primary text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-sm flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" /> Vendeur sélectionné
                                </div>
                            )}

                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                {/* Vendor Identity + Trust details */}
                                <div className="flex items-start gap-3.5 flex-1 min-w-0">
                                    {/* Logo */}
                                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center flex-shrink-0 shadow-inner">
                                        {vendorLogoUrl ? (
                                            <img src={vendorLogoUrl} alt={offer.vendor.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <Store className="w-6 h-6 text-slate-400" />
                                        )}
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-extrabold text-sm md:text-base text-slate-900 dark:text-white truncate">
                                                {offer.vendor.name}
                                            </span>
                                            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-1.5 py-0.5 rounded-md">
                                                <BadgeCheck className="w-3 h-3" /> Certifié
                                            </span>
                                        </div>

                                        {/* Proximity / Market Location Badge */}
                                        <div className="flex items-center gap-2 mt-1.5 flex-wrap text-xs text-slate-500 dark:text-slate-400 font-medium">
                                            {marketOrZone && (
                                                <span className="inline-flex items-center gap-1 text-slate-700 dark:text-slate-300 font-bold bg-slate-100 dark:bg-slate-700/60 px-2 py-0.5 rounded-md">
                                                    <MapPin className="w-3.5 h-3.5 text-primary" />
                                                    {marketOrZone}
                                                </span>
                                            )}

                                            {offer.vendor.rating !== undefined && (
                                                <span className="inline-flex items-center gap-1 text-amber-500 font-bold">
                                                    <Star className="w-3.5 h-3.5 fill-amber-400" />
                                                    {(offer.vendor.rating || 5.0).toFixed(1)}
                                                    {offer.vendor.ratingCount ? (
                                                        <span className="text-slate-400 font-normal">({offer.vendor.ratingCount})</span>
                                                    ) : null}
                                                </span>
                                            )}

                                            <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300">
                                                <Clock className="w-3.5 h-3.5 text-slate-400" />
                                                {formatDelivery(offer.deliveryTimeValue, offer.deliveryTimeUnit)}
                                            </span>

                                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md border ${cond.color}`}>
                                                {cond.label}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Pricing + Multi-Criteria Actions */}
                                <div className="flex items-center justify-between md:justify-end gap-3 flex-shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-700/50">
                                    <div className="text-left md:text-right">
                                        <div className="text-base md:text-lg font-black text-slate-900 dark:text-white">
                                            {priceFromCents(effectivePrice)}
                                        </div>
                                        {offer.onPromotion && offer.promotionalPrice && offer.promotionalPrice < offer.price && (
                                            <div className="text-xs text-slate-400 line-through">
                                                {priceFromCents(offer.price)}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {/* Switch active boutique button */}
                                        {!isSelectedVendor && onSelectVendor && (
                                            <button
                                                type="button"
                                                onClick={() => onSelectVendor(offer.vendor.id, offer.productVariant.id)}
                                                className="px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 hover:border-primary hover:text-primary bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                                                title="Voir ce produit avec les options de cette boutique"
                                            >
                                                Choisir
                                            </button>
                                        )}

                                        {/* Direct Add To Cart Button */}
                                        <Button
                                            onClick={(e) => handleAddToCart(offer, e)}
                                            disabled={isPending || offer.stock === 0}
                                            size="sm"
                                            className={`h-9 px-3.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                                isAdded
                                                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                                                    : 'bg-primary hover:bg-primary/90 text-white shadow-sm'
                                            } ${offer.stock === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        >
                                            {isPending ? (
                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            ) : isAdded ? (
                                                <><CheckCircle2 className="w-3.5 h-3.5 mr-1" />Ajouté</>
                                            ) : offer.stock === 0 ? (
                                                'Épuisé'
                                            ) : (
                                                <><ShoppingCart className="w-3.5 h-3.5 mr-1" />Acheter</>
                                            )}
                                        </Button>

                                        {/* Vendor Profile Link */}
                                        <Link
                                            href={`/vendor/${encodeId(offer.vendor.id)}`}
                                            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 hover:text-primary transition-colors"
                                            title="Visiter la boutique officielle"
                                        >
                                            <ExternalLink className="w-4 h-4" />
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
