"use client";

import React, { useState, useEffect } from 'react';
import { Bell, MapPin, Navigation, Landmark, Search, Check, Loader2, ArrowRight, X } from 'lucide-react';
import { getShopApiUrl } from '@/lib/vendure/api-utils';
import { toast } from 'sonner';

interface LocationOnboardingModalProps {
    shopApiUrl?: string;
}

interface LocationData {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    type: 'MARKET' | 'NEIGHBORHOOD' | 'GPS';
}

const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // meters
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a =
        Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
        Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
};

import { useLocation } from '@/contexts/location-context';

export function LocationOnboardingModal({ shopApiUrl: propShopApiUrl }: LocationOnboardingModalProps) {
    const {
        selectedLocation,
        markets,
        neighborhoods,
        loading: loadingLocations,
        gpsLoading,
        selectLocation,
        useGps,
    } = useLocation();

    const [isOpen, setIsOpen] = useState(false);
    const [step, setStep] = useState<'welcome' | 'search'>('welcome');
    const [searchTerm, setSearchTerm] = useState('');
    
    // States for permissions
    const [pushStatus, setPushStatus] = useState<'default' | 'granted' | 'denied'>('default');

    useEffect(() => {
        // If user has no saved location, request GPS permission directly (no popup)
        const savedLocation = localStorage.getItem('ahizan_client_location');
        if (!savedLocation) {
            // Check notification permission state for status tracking
            if ('Notification' in window) {
                setPushStatus(Notification.permission as any);
            }
            // Trigger GPS silently: if permission is already granted → useGps handles it via context
            // If not yet decided → the browser will prompt natively. Don't show our popup.
            // The LocationWidget icon is always available for manual selection.
        }
    }, []);

    const handleSelectLocation = (loc: LocationData) => {
        selectLocation(loc);
        setIsOpen(false);
    };

    // Unified permission request: notifications + geolocation
    const handleEnableAllPermissions = async () => {
        // 1. Request Push Notification Permission
        if ('Notification' in window) {
            try {
                const permission = await Notification.requestPermission();
                setPushStatus(permission);
                if (permission === 'granted') {
                    // Register Service Worker for silent syncing
                    if ('serviceWorker' in navigator) {
                        await navigator.serviceWorker.register('/sw.js').catch(err => 
                            console.warn('[Onboarding] SW registration failed:', err)
                        );
                    }
                }
            } catch (e) {
                console.error('[Onboarding] Notification request error:', e);
            }
        }

        // 2. Request Geolocation (GPS)
        try {
            await useGps();
            const stored = localStorage.getItem('ahizan_client_location');
            if (stored) {
                setIsOpen(false);
            } else {
                setStep('search');
            }
        } catch (e) {
            setStep('search');
        }
    };

    if (!isOpen) return null;

    const filteredMarkets = markets.filter(m => 
        m.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    const filteredNeighborhoods = neighborhoods.filter(n => 
        n.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
            {/* Backdrop blur overlay */}
            <div 
                className="absolute inset-0 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-300"
                onClick={() => setIsOpen(false)}
            />

            {/* Modal Box */}
            <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] w-full max-w-lg shadow-2xl p-8 z-10 animate-in zoom-in-95 duration-300 font-sans text-slate-950 dark:text-slate-100">
                
                {/* Close Button */}
                <button 
                    onClick={() => setIsOpen(false)}
                    className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-450 dark:text-slate-400 transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                {step === 'welcome' ? (
                    <div className="flex flex-col items-center text-center">
                        {/* Double Icon Badge */}
                        <div className="flex items-center gap-2 mb-6">
                            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                                <MapPin className="w-7 h-7" />
                            </div>
                            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-inner">
                                <Bell className="w-7 h-7 animate-bounce" />
                            </div>
                        </div>

                        <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white leading-tight">
                            Achetez local à proximité !
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-3 font-medium max-w-sm">
                            Pour une meilleure expérience, activez la <strong>localisation</strong> pour découvrir les produits près de chez vous et les <strong>notifications</strong> pour le suivi de livraison.
                        </p>

                        {/* Permission Benefit Checkbox indicators */}
                        <div className="w-full mt-6 space-y-3 text-left bg-slate-50 dark:bg-slate-850 p-5 rounded-3xl border border-slate-100 dark:border-slate-850">
                            <div className="flex items-start gap-3">
                                <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 shrink-0 mt-0.5">
                                    <Check className="w-3.5 h-3.5" />
                                </div>
                                <div className="text-xs">
                                    <span className="font-bold">Affichage Contextuel</span> : Voir uniquement les marchands qui peuvent vous livrer immédiatement.
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 shrink-0 mt-0.5">
                                    <Check className="w-3.5 h-3.5" />
                                </div>
                                <div className="text-xs">
                                    <span className="font-bold">Suivi Intelligent</span> : Recevoir des alertes de livraison et promotions en temps réel.
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="w-full flex flex-col gap-3 mt-8">
                            <button
                                onClick={handleEnableAllPermissions}
                                disabled={gpsLoading}
                                className="w-full py-4 bg-primary text-white font-extrabold rounded-2xl shadow-lg shadow-primary/20 hover:bg-primary/95 transition-all text-sm flex items-center justify-center gap-2"
                            >
                                {gpsLoading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>Détection GPS en cours...</span>
                                    </>
                                ) : (
                                    <>
                                        <Navigation className="w-4 h-4 fill-white" />
                                        <span>Activer Localisation & Notifications</span>
                                    </>
                                )}
                            </button>

                            <button
                                onClick={() => setStep('search')}
                                className="w-full py-3.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-extrabold rounded-2xl transition-all text-sm flex items-center justify-center gap-1.5"
                            >
                                <span>Choisir mon quartier manuellement</span>
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2 mb-4">
                            <MapPin className="w-5 h-5 text-primary" />
                            <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white">
                                Sélectionner votre quartier
                            </h3>
                        </div>

                        {/* Search Input */}
                        <div className="relative mb-4">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Rechercher un marché ou quartier..."
                                className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition-all font-medium"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                autoFocus
                            />
                        </div>

                        {/* Search list container */}
                        <div className="flex flex-col gap-1 max-h-[250px] overflow-y-auto pr-1">
                            {loadingLocations ? (
                                <div className="flex flex-col items-center justify-center py-10 gap-2">
                                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                                    <span className="text-xs text-slate-450 font-bold">Chargement des zones...</span>
                                </div>
                            ) : (
                                <>
                                    {/* Markets */}
                                    {filteredMarkets.length > 0 && (
                                        <div className="mb-2">
                                            <h4 className="text-[10px] uppercase font-black tracking-widest text-slate-400 px-2.5 mb-1.5">Marchés</h4>
                                            {filteredMarkets.map(m => (
                                                <button
                                                    key={m.id}
                                                    onClick={() => handleSelectLocation({ id: m.id, name: m.name, latitude: m.centerLatitude, longitude: m.centerLongitude, type: 'MARKET' })}
                                                    className="w-full flex items-center gap-2.5 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/40 text-left text-xs text-slate-700 dark:text-slate-300 font-extrabold transition-colors"
                                                >
                                                    <Landmark className="w-4 h-4 text-primary opacity-80" />
                                                    <span>{m.name}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {/* Neighborhoods */}
                                    {filteredNeighborhoods.length > 0 && (
                                        <div>
                                            <h4 className="text-[10px] uppercase font-black tracking-widest text-slate-400 px-2.5 mb-1.5">Quartiers / Arrondissements</h4>
                                            {filteredNeighborhoods.map(n => (
                                                <button
                                                    key={n.id}
                                                    onClick={() => handleSelectLocation({ id: n.id, name: n.name, latitude: n.centerLatitude, longitude: n.centerLongitude, type: 'NEIGHBORHOOD' })}
                                                    className="w-full flex items-center gap-2.5 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/40 text-left text-xs text-slate-700 dark:text-slate-300 font-extrabold transition-colors"
                                                >
                                                    <MapPin className="w-4 h-4 text-primary opacity-80" />
                                                    <span>{n.name}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {filteredMarkets.length === 0 && filteredNeighborhoods.length === 0 && (
                                        <div className="text-center py-8">
                                            <p className="text-xs text-slate-400 font-medium">Aucun marché ni quartier correspondant.</p>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Back button */}
                        <button
                            onClick={() => setStep('welcome')}
                            className="mt-4 text-xs font-bold text-slate-400 hover:text-primary transition-colors text-center py-2"
                        >
                            Retour
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
