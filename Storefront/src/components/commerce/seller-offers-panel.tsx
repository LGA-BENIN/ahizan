'use client';

import { useState, useTransition } from 'react';
import { addToCart } from '@/app/(storefront)/product/[slug]/actions';
import { toast } from 'sonner';
import { ShoppingCart, Loader2, Star, Clock, Package, CheckCircle2, BadgeCheck, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

function priceFromCents(cents: number): string {
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'XOF',
        maximumFractionDigits: 0,
    }).format(Math.round(cents / 100));
}

function formatDelivery(value: number, unit: string): string {
    if (unit === 'h') return `${value}h de délai`;
    return `${value} jour${value > 1 ? 's' : ''} de délai`;
}

function conditionLabel(condition: string): { label: string; color: string } {
    switch (condition) {
        case 'NEW': return { label: 'Neuf', color: 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400' };
        case 'USED': return { label: 'Occasion', color: 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/20 dark:text-amber-400' };
        case 'REFURBISHED': return { label: 'Reconditionné', color: 'bg-sky-50 text-sky-700 border-sky-100 dark:bg-sky-950/20 dark:text-sky-400' };
        default: return { label: condition, color: 'bg-muted text-muted-foreground' };
    }
}

interface Offer {
    id: string;
    price: number;
    stock: number;
    deliveryTimeValue: number;
    deliveryTimeUnit: string;
    condition: string;
    vendor: {
        id: string;
        name: string;
        rating?: number;
        ratingCount?: number;
        logo?: { preview: string } | null;
    };
    productVariant: {
        id: string;
    };
}

interface SellerOffersPanelProps {
    offers: Offer[];
    quantity?: number;
}

export function SellerOffersPanel({ offers, quantity = 1 }: SellerOffersPanelProps) {
    const [selectedOfferId, setSelectedOfferId] = useState<string | null>(
        offers.length > 0 ? offers[0].id : null
    );
    const [isPending, startTransition] = useTransition();
    const [addedOfferId, setAddedOfferId] = useState<string | null>(null);

    if (!offers || offers.length === 0) return null;

    const selectedOffer = offers.find(o => o.id === selectedOfferId) || offers[0];

    const handleAddToCart = (offer: Offer) => {
        startTransition(async () => {
            const result = await addToCart(offer.productVariant.id, quantity, offer.vendor.id);
            if (result.success) {
                toast.success('Ajouté au panier !');
                setAddedOfferId(offer.id);
                setTimeout(() => setAddedOfferId(null), 2500);
            } else {
                toast.error(result.error || 'Erreur lors de l\'ajout au panier');
            }
        });
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-muted-foreground" />
                <h3 className="text-sm font-black uppercase tracking-widest text-foreground">
                    {offers.length} offre{offers.length > 1 ? 's' : ''} disponible{offers.length > 1 ? 's' : ''}
                </h3>
            </div>

            <div className="space-y-2">
                {offers.map((offer) => {
                    const isSelected = offer.id === selectedOfferId;
                    const isAdded = offer.id === addedOfferId;
                    const cond = conditionLabel(offer.condition);

                    return (
                        <div
                            key={offer.id}
                            onClick={() => setSelectedOfferId(offer.id)}
                            className={`relative rounded-xl border p-4 cursor-pointer transition-all duration-200 ${
                                isSelected
                                    ? 'border-primary bg-primary/[0.04] shadow-sm ring-1 ring-primary/20'
                                    : 'border-border bg-card hover:border-primary/40 hover:bg-muted/20'
                            }`}
                        >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                {/* Vendor info + meta */}
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    {/* Vendor logo */}
                                    <div className="w-9 h-9 rounded-lg overflow-hidden bg-muted border border-border flex items-center justify-center flex-shrink-0">
                                        {offer.vendor.logo?.preview ? (
                                            <img src={offer.vendor.logo.preview} alt={offer.vendor.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-xs font-black text-muted-foreground uppercase">
                                                {offer.vendor.name?.slice(0, 2)}
                                            </span>
                                        )}
                                    </div>

                                    <div className="min-w-0">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            <span className="font-bold text-sm truncate max-w-[140px]">{offer.vendor.name}</span>
                                            <BadgeCheck className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                                        </div>
                                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                            {offer.vendor.rating !== undefined && (
                                                <span className="flex items-center gap-0.5 text-[10px] font-bold text-amber-500">
                                                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                                    {offer.vendor.rating.toFixed(1)}
                                                    {offer.vendor.ratingCount ? (
                                                        <span className="text-muted-foreground font-medium">({offer.vendor.ratingCount})</span>
                                                    ) : null}
                                                </span>
                                            )}
                                            <span className="flex items-center gap-1 text-[10px] text-muted-foreground font-medium">
                                                <Clock className="w-3 h-3" />
                                                {formatDelivery(offer.deliveryTimeValue, offer.deliveryTimeUnit)}
                                            </span>
                                            <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded-full border ${cond.color} uppercase tracking-wider`}>
                                                {cond.label}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Price + CTA */}
                                <div className="flex items-center gap-3 flex-shrink-0">
                                    <span className="text-base font-black text-foreground">
                                        {priceFromCents(offer.price)}
                                    </span>
                                    <Button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleAddToCart(offer);
                                        }}
                                        disabled={isPending || offer.stock === 0}
                                        size="sm"
                                        className={`h-9 px-4 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer ${
                                            isAdded
                                                ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                                                : 'bg-primary hover:bg-primary/90 text-primary-foreground'
                                        } ${offer.stock === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        {isPending && isSelected ? (
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        ) : isAdded ? (
                                            <><CheckCircle2 className="w-3.5 h-3.5 mr-1" />Ajouté</>
                                        ) : offer.stock === 0 ? (
                                            'Épuisé'
                                        ) : (
                                            <><ShoppingCart className="w-3.5 h-3.5 mr-1" />Ajouter</>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
