'use client';

import React, { useEffect, useState } from 'react';
import { MapPin, AlertCircle, ArrowRight, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { query } from '@/lib/vendure/api';
import { GetMyVendorFullProfileQuery } from '@/lib/vendure/queries';

import { isVendorLocationValid } from '@/lib/vendor-location';

interface LocationRequiredModalProps {
    hasLocation?: boolean;
}

export default function LocationRequiredModal({ hasLocation: initialHasLocation }: LocationRequiredModalProps) {
    const [missingLocation, setMissingLocation] = useState<boolean>(initialHasLocation === false);
    const [loading, setLoading] = useState<boolean>(initialHasLocation === undefined);

    useEffect(() => {
        let isMounted = true;
        
        async function checkVendorLocation() {
            try {
                const res = await query(GetMyVendorFullProfileQuery, {}, { useAuthToken: true });
                const vendor = (res?.data as any)?.myVendorProfile;
                if (isMounted) {
                    if (!vendor) {
                        setMissingLocation(true);
                    } else {
                        const valid = isVendorLocationValid(vendor);
                        setMissingLocation(!valid);
                    }
                    setLoading(false);
                }
            } catch (err) {
                console.error('[LocationRequiredModal] Error checking location:', err);
                if (isMounted) {
                    if (initialHasLocation !== undefined) {
                        setMissingLocation(!initialHasLocation);
                    }
                    setLoading(false);
                }
            }
        }

        checkVendorLocation();

        return () => {
            isMounted = false;
        };
    }, [initialHasLocation]);

    if (loading || !missingLocation) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-card w-full max-w-lg p-6 sm:p-8 rounded-3xl border border-border shadow-2xl space-y-6 text-center animate-in zoom-in-95 duration-300 relative overflow-hidden">
                <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/10 rounded-full blur-2xl pointer-events-none" />
                <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

                <div className="w-20 h-20 rounded-3xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto shadow-inner border border-amber-500/20">
                    <MapPin className="w-10 h-10 animate-bounce" />
                </div>

                <div className="space-y-3">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                        <AlertCircle className="w-3.5 h-3.5" /> Action requise avant publication
                    </span>
                    <h2 className="text-2xl font-black text-foreground font-serif tracking-tight">
                        Position géographique requise
                    </h2>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        Pour pouvoir ajouter un produit ou proposer une offre sur <strong>Ahizan</strong>, vous devez obligatoirement renseigner la localisation précise de votre boutique (coordonnées GPS ou marché).
                    </p>
                    <p className="text-xs text-muted-foreground/80 bg-muted/50 p-3 rounded-xl border border-border/50 text-left">
                        💡 <strong>Pourquoi ?</strong> Cela permet aux clients de voir vos articles à proximité et permet au système de calculer les frais et trajets de livraison au kilomètre.
                    </p>
                </div>

                <div className="flex flex-col gap-3 pt-2">
                    <Link href="/dashboard/settings?tab=localisation" className="w-full">
                        <Button className="w-full h-12 rounded-2xl font-bold bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-primary/25 text-xs uppercase tracking-wider">
                            <MapPin className="w-4 h-4" />
                            Configurer ma position dans les Paramètres
                            <ArrowRight className="w-4 h-4 ml-1" />
                        </Button>
                    </Link>

                    <Link href="/dashboard/products" className="w-full">
                        <Button variant="ghost" className="w-full h-11 rounded-2xl font-semibold text-xs text-muted-foreground hover:text-foreground cursor-pointer">
                            <Store className="w-4 h-4 mr-2" />
                            Retour à la liste de mes produits
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    );
}
