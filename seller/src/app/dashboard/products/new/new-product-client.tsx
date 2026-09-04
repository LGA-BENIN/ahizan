'use client';

import React, { useState } from 'react';
import AffiliateProductPage from '@/app/dashboard/products/affiliate/page';
import CreateProductForm from '@/components/dashboard/products/create-form';
import { Sparkles, PlusCircle, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface NewProductClientProps {
    collectionTree: any[];
    hasLocation?: boolean;
}

export default function NewProductClient({ collectionTree, hasLocation = true }: NewProductClientProps) {
    const [activeMode, setActiveMode] = useState<'create' | 'affiliate'>('create');
    const [preselectedGraftTerm, setPreselectedGraftTerm] = useState<string>('');

    return (
        <div className="space-y-6 max-w-5xl mx-auto relative">
            {/* Modal popup if location is missing */}
            {!hasLocation && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-card w-full max-w-md p-6 sm:p-8 rounded-3xl border border-border shadow-2xl space-y-6 text-center animate-in zoom-in-95 duration-300">
                        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto shadow-inner border border-amber-500/20">
                            <MapPin className="w-8 h-8 animate-bounce" />
                        </div>

                        <div className="space-y-2">
                            <h2 className="text-xl font-black text-foreground font-serif">Position géographique requise</h2>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                Avant de pouvoir ajouter ou vendre un produit sur Ahizan, vous devez obligatoirement renseigner la localisation de votre boutique (marché, quartier ou coordonnées GPS).
                            </p>
                        </div>

                        <div className="flex flex-col gap-3 pt-2">
                            <Link href="/dashboard/settings?tab=localisation">
                                <Button className="w-full h-12 rounded-2xl font-bold bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-primary/20 text-xs uppercase tracking-wider">
                                    <MapPin className="w-4 h-4" />
                                    Ajouter ma position
                                </Button>
                            </Link>

                            <Link href="/dashboard/products">
                                <Button variant="ghost" className="w-full h-10 rounded-2xl font-semibold text-xs text-muted-foreground hover:text-foreground cursor-pointer">
                                    Retour à mes produits
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            )}

            {/* Top mode switcher */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                    type="button"
                    onClick={() => setActiveMode('affiliate')}
                    className={cn(
                        "p-4 sm:p-5 rounded-2xl border-2 text-left transition-all duration-200 cursor-pointer flex items-start gap-4 shadow-sm",
                        activeMode === 'affiliate'
                            ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                            : "border-border bg-card hover:border-primary/40 hover:bg-muted/30"
                    )}
                >
                    <div className={cn(
                        "p-3 rounded-xl shrink-0 transition-colors",
                        activeMode === 'affiliate' ? "bg-primary text-white" : "bg-muted text-foreground"
                    )}>
                        <Sparkles className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="font-bold text-sm sm:text-base text-foreground">Vendre un article existant</h3>
                            <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                ⚡ Rapide (30s)
                            </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                            Recherchez un article déjà présent sur Ahizan pour y ajouter votre offre et votre tarif en quelques clics.
                        </p>
                    </div>
                </button>

                <button
                    type="button"
                    onClick={() => setActiveMode('create')}
                    className={cn(
                        "p-4 sm:p-5 rounded-2xl border-2 text-left transition-all duration-200 cursor-pointer flex items-start gap-4 shadow-sm",
                        activeMode === 'create'
                            ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                            : "border-border bg-card hover:border-primary/40 hover:bg-muted/30"
                    )}
                >
                    <div className={cn(
                        "p-3 rounded-xl shrink-0 transition-colors",
                        activeMode === 'create' ? "bg-primary text-white" : "bg-muted text-foreground"
                    )}>
                        <PlusCircle className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="font-bold text-sm sm:text-base text-foreground">Proposer un nouvel article</h3>
                            <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                                ✨ 3 étapes
                            </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                            Votre article n'existe pas encore sur Ahizan ? Proposez une nouvelle fiche facilement avec vos photos.
                        </p>
                    </div>
                </button>
            </div>

            {/* Active Content */}
            <div className="pt-2">
                {activeMode === 'affiliate' ? (
                    <AffiliateProductPage initialSearchTerm={preselectedGraftTerm} />
                ) : (
                    <CreateProductForm 
                        collectionTree={collectionTree} 
                        onSwitchToGraft={(term) => {
                            setPreselectedGraftTerm(term);
                            setActiveMode('affiliate');
                        }}
                    />
                )}
            </div>
        </div>
    );
}
