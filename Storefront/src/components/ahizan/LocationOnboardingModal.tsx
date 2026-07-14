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

export function LocationOnboardingModal({ shopApiUrl: propShopApiUrl }: LocationOnboardingModalProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [step, setStep] = useState<'welcome' | 'search'>('welcome');
    const [searchTerm, setSearchTerm] = useState('');
    const [markets, setMarkets] = useState<any[]>([]);
    const [neighborhoods, setNeighborhoods] = useState<any[]>([]);
    const [loadingLocations, setLoadingLocations] = useState(false);
    
    // States for permissions
    const [pushStatus, setPushStatus] = useState<'default' | 'granted' | 'denied'>('default');
    const [gpsStatus, setGpsStatus] = useState<'default' | 'loading' | 'success' | 'failed'>('default');

    const shopApiUrl = propShopApiUrl || getShopApiUrl();

    useEffect(() => {
        // Only show onboarding if user has not set location yet
        const savedLocation = localStorage.getItem('ahizan_client_location');
        if (!savedLocation) {
            // Check if notification permission is in default state
            if ('Notification' in window) {
                setPushStatus(Notification.permission);
            }
            
            // Show modal after a short delay (e.g. 2.5s) to allow first page render
            const timer = setTimeout(() => {
                setIsOpen(true);
            }, 2500);
            return () => clearTimeout(timer);
        }
    }, []);

    // Load markets & neighborhoods in the background if they open search step
    useEffect(() => {
        if (step === 'search' && markets.length === 0) {
            loadLocations();
        }
    }, [step]);

    const loadLocations = async () => {
        setLoadingLocations(true);
        const query = `
            query GetOnboardingLocations {
                markets {
                    id
                    name
                    centerLatitude
                    centerLongitude
                }
                geographicLocations(type: "NEIGHBORHOOD") {
                    id
                    name
                    centerLatitude
                    centerLongitude
                }
            }
        `;
        try {
            const res = await fetch(shopApiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query })
            });
            const data = await res.json();
            setMarkets(data.data?.markets || []);
            setNeighborhoods(data.data?.geographicLocations || []);
        } catch (err) {
            console.error('[Onboarding] Error loading locations:', err);
        } finally {
            setLoadingLocations(false);
        }
    };

    const handleSelectLocation = (loc: LocationData) => {
        localStorage.setItem('ahizan_client_location', JSON.stringify(loc));
        window.dispatchEvent(new Event('ahizan_location_changed'));
        setIsOpen(false);
        toast.success(`Votre zone de livraison est configurée sur : ${loc.name}`);
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
        if (!navigator.geolocation) {
            toast.error("La géolocalisation n'est pas supportée par votre navigateur.");
            setStep('search');
            return;
        }

        setGpsStatus('loading');
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                setGpsStatus('success');

                // Load locations lists to find the closest
                let currentMarkets = markets;
                let currentNeighborhoods = neighborhoods;

                if (currentMarkets.length === 0) {
                    const query = `
                        query GetLocationsForGps {
                            markets {
                                id
                                name
                                centerLatitude
                                centerLongitude
                            }
                            geographicLocations(type: "NEIGHBORHOOD") {
                                id
                                name
                                centerLatitude
                                centerLongitude
                            }
                        }
                    `;
                    try {
                        const res = await fetch(shopApiUrl, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ query })
                        });
                        const data = await res.json();
                        currentMarkets = data.data?.markets || [];
                        currentNeighborhoods = data.data?.geographicLocations || [];
                        setMarkets(currentMarkets);
                        setNeighborhoods(currentNeighborhoods);
                    } catch (e) {
                        console.error('Failed to load locations for GPS match', e);
                    }
                }

                // Find closest market or neighborhood
                let closestItem: any = null;
                let minDistance = Infinity;
                let itemType: 'MARKET' | 'NEIGHBORHOOD' = 'NEIGHBORHOOD';

                // Check markets
                currentMarkets.forEach(m => {
                    if (m.centerLatitude && m.centerLongitude) {
                        const dist = getDistance(latitude, longitude, m.centerLatitude, m.centerLongitude);
                        if (dist < minDistance) {
                            minDistance = dist;
                            closestItem = m;
                            itemType = 'MARKET';
                        }
                    }
                });

                // Check neighborhoods
                currentNeighborhoods.forEach(n => {
                    if (n.centerLatitude && n.centerLongitude) {
                        const dist = getDistance(latitude, longitude, n.centerLatitude, n.centerLongitude);
                        if (dist < minDistance) {
                            minDistance = dist;
                            closestItem = n;
                            itemType = 'NEIGHBORHOOD';
                        }
                    }
                });

                if (closestItem) {
                    const gpsLoc: LocationData = {
                        id: closestItem.id,
                        name: closestItem.name,
                        latitude: closestItem.centerLatitude,
                        longitude: closestItem.centerLongitude,
                        type: itemType
                    };
                    handleSelectLocation(gpsLoc);
                } else {
                    // Raw coordinates fallback
                    const rawLoc: LocationData = {
                        id: 'gps_raw',
                        name: 'Ma position GPS',
                        latitude,
                        longitude,
                        type: 'GPS'
                    };
                    handleSelectLocation(rawLoc);
                }
            },
            (error) => {
                setGpsStatus('failed');
                toast.error("Impossible de récupérer la position GPS. Veuillez sélectionner votre zone.");
                setStep('search');
                console.error('[Onboarding] GPS error:', error);
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
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
                                disabled={gpsStatus === 'loading'}
                                className="w-full py-4 bg-primary text-white font-extrabold rounded-2xl shadow-lg shadow-primary/20 hover:bg-primary/95 transition-all text-sm flex items-center justify-center gap-2"
                            >
                                {gpsStatus === 'loading' ? (
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
