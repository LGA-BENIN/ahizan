"use client";

import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, Search, Check, Loader2, Landmark } from 'lucide-react';
import { getShopApiUrl } from '@/lib/vendure/api-utils';
import { toast } from 'sonner';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

export interface LocationData {
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

export function LocationWidget() {
    const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [markets, setMarkets] = useState<any[]>([]);
    const [neighborhoods, setNeighborhoods] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [gpsLoading, setGpsLoading] = useState(false);

    // Load initial location and listen for changes
    useEffect(() => {
        const loadLocation = () => {
            const saved = localStorage.getItem('ahizan_client_location');
            if (saved) {
                try {
                    setSelectedLocation(JSON.parse(saved));
                } catch (e) {
                    console.error('Failed to parse saved location', e);
                }
            } else {
                setSelectedLocation(null);
            }
        };

        loadLocation();

        if (typeof window !== 'undefined') {
            window.addEventListener('ahizan_location_changed', loadLocation);
            return () => {
                window.removeEventListener('ahizan_location_changed', loadLocation);
            };
        }
    }, []);

    // Background GPS check for dynamic zone updates
    useEffect(() => {
        const runBackgroundGpsCheck = async () => {
            const saved = localStorage.getItem('ahizan_client_location');
            if (!saved) return;

            try {
                const parsedLoc = JSON.parse(saved);
                if (!navigator.geolocation || !navigator.permissions) return;

                // Query permission status first to avoid browser prompt
                const perm = await navigator.permissions.query({ name: 'geolocation' as any });
                if (perm.state !== 'granted') return;

                navigator.geolocation.getCurrentPosition(async (position) => {
                    const { latitude, longitude } = position.coords;
                    
                    // Fetch locations list if not already loaded to calculate the closest one
                    let currentMarkets = markets;
                    let currentNeighborhoods = neighborhoods;

                    if (currentMarkets.length === 0) {
                        const query = `
                            query BackgroundGpsCheck {
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
                            const shopApiUrl = getShopApiUrl();
                            const res = await fetch(shopApiUrl, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ query })
                            });
                            const result = await res.json();
                            currentMarkets = result.data?.markets || [];
                            currentNeighborhoods = result.data?.geographicLocations || [];
                        } catch (e) {
                            console.error('Failed to load locations for background GPS check', e);
                            return;
                        }
                    }

                    // Find closest market or neighborhood
                    let closestItem: any = null;
                    let minDistance = Infinity;
                    let itemType: 'MARKET' | 'NEIGHBORHOOD' = 'NEIGHBORHOOD';

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

                    if (closestItem && closestItem.name !== parsedLoc.name) {
                        // Different zone detected! Show toast/notification to suggest updating
                        toast(`📍 Nouvelle zone détectée : ${closestItem.name}`, {
                            description: "Voulez-vous mettre à jour vos recommandations pour cette zone ?",
                            action: {
                                label: "Mettre à jour",
                                onClick: () => {
                                    const newLoc: LocationData = {
                                        id: closestItem.id,
                                        name: closestItem.name,
                                        latitude: closestItem.centerLatitude || closestItem.latitude,
                                        longitude: closestItem.centerLongitude || closestItem.longitude,
                                        type: itemType
                                    };
                                    setSelectedLocation(newLoc);
                                    localStorage.setItem('ahizan_client_location', JSON.stringify(newLoc));
                                    window.dispatchEvent(new Event('ahizan_location_changed'));
                                    toast.success(`Position mise à jour sur : ${closestItem.name}`);
                                }
                            },
                            duration: 10000,
                        });
                    }
                }, (error) => {
                    console.warn('[LocationWidget] Background GPS check warning:', error);
                }, { enableHighAccuracy: false, timeout: 10000 });
            } catch (e) {
                console.error('[LocationWidget] Background GPS check error:', e);
            }
        };

        // Delay background check to let main resources load first
        const timer = setTimeout(runBackgroundGpsCheck, 4000);
        return () => clearTimeout(timer);
    }, [markets.length]);


    // Fetch markets and neighborhoods for selection list
    const loadAllLocations = async () => {
        setLoading(true);
        const query = `
            query GetAllLocationsForSelection {
                markets {
                    id
                    name
                    slug
                    centerLatitude
                    centerLongitude
                    radiusMeters
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
            const shopApiUrl = getShopApiUrl();
            const res = await fetch(shopApiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query })
            });
            const data = await res.json();
            setMarkets(data.data?.markets || []);
            setNeighborhoods(data.data?.geographicLocations || []);
        } catch (err) {
            console.error('Error fetching locations:', err);
        } finally {
            setLoading(false);
        }
    };

    // Trigger loading locations when dialog is opened
    useEffect(() => {
        if (isOpen && markets.length === 0) {
            loadAllLocations();
        }
    }, [isOpen]);

    const handleSelectLocation = (loc: LocationData) => {
        setSelectedLocation(loc);
        localStorage.setItem('ahizan_client_location', JSON.stringify(loc));
        window.dispatchEvent(new Event('ahizan_location_changed'));
        setIsOpen(false);
        toast.success(`Position définie sur : ${loc.name}`);
    };

    const handleUseGps = () => {
        if (!navigator.geolocation) {
            toast.error("La géolocalisation n'est pas supportée par votre navigateur.");
            return;
        }

        setGpsLoading(true);
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                
                // Fetch locations list if not already loaded to calculate the closest one
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
                        const shopApiUrl = getShopApiUrl();
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
                        console.error('Failed to load locations for GPS', e);
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

                setGpsLoading(false);

                if (closestItem) {
                    const gpsLoc: LocationData = {
                        id: closestItem.id,
                        name: closestItem.name,
                        latitude: closestItem.latitude || closestItem.centerLatitude,
                        longitude: closestItem.longitude || closestItem.centerLongitude,
                        type: itemType
                    };
                    handleSelectLocation(gpsLoc);
                } else {
                    // Fallback to raw coordinates if no seed coordinates match
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
                setGpsLoading(false);
                toast.error("Impossible de récupérer votre position GPS. Veuillez en choisir une manuellement.");
                console.error('GPS error:', error);
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    const handleClearLocation = () => {
        setSelectedLocation(null);
        localStorage.removeItem('ahizan_client_location');
        window.dispatchEvent(new Event('ahizan_location_changed'));
        setIsOpen(false);
        toast.info("Position réinitialisée.");
    };

    const filteredMarkets = markets.filter(m => 
        m.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    const filteredNeighborhoods = neighborhoods.filter(n => 
        n.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors text-slate-700 dark:text-slate-200 text-xs font-bold shadow-sm focus:outline-none">
                    <MapPin className="w-3.5 h-3.5 text-primary" />
                    <span>{selectedLocation ? selectedLocation.name : 'Choisir ma zone'}</span>
                </button>
            </DialogTrigger>
            
            <DialogContent className="max-w-md w-full p-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-2xl z-[99999] font-sans">
                <DialogHeader className="mb-4">
                    <DialogTitle className="text-lg font-black text-slate-950 dark:text-white uppercase tracking-tight flex items-center gap-2">
                        📍 Localisation de Livraison
                    </DialogTitle>
                </DialogHeader>

                <div className="flex flex-col gap-4">
                    {/* GPS Button */}
                    <button
                        onClick={handleUseGps}
                        disabled={gpsLoading}
                        className="w-full flex items-center justify-center gap-2.5 py-3.5 bg-primary text-white font-extrabold rounded-2xl shadow-lg shadow-primary/20 hover:bg-primary/95 hover:shadow-primary/30 transition-all text-sm disabled:opacity-85"
                    >
                        {gpsLoading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Détection en cours...</span>
                            </>
                        ) : (
                            <>
                                <Navigation className="w-4 h-4 fill-white" />
                                <span>Utiliser ma position actuelle</span>
                            </>
                        )}
                    </button>

                    {/* Search Field */}
                    <div className="relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Rechercher un marché ou quartier..."
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {/* List */}
                    <div className="flex flex-col gap-1 max-h-[250px] overflow-y-auto pr-1">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-10 gap-2">
                                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                                <span className="text-xs text-slate-400 font-semibold">Chargement des zones...</span>
                            </div>
                        ) : (
                            <>
                                {/* Markets Category */}
                                {filteredMarkets.length > 0 && (
                                    <div className="mb-2">
                                        <h4 className="text-[10px] uppercase font-black tracking-widest text-slate-400 px-2.5 mb-1.5">Marchés</h4>
                                        {filteredMarkets.map(m => {
                                            const isSelected = selectedLocation?.type === 'MARKET' && selectedLocation.id === m.id;
                                            return (
                                                <button
                                                    key={m.id}
                                                    onClick={() => handleSelectLocation({ id: m.id, name: m.name, latitude: m.centerLatitude, longitude: m.centerLongitude, type: 'MARKET' })}
                                                    className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/40 text-left text-sm transition-colors text-slate-700 dark:text-slate-300 font-bold"
                                                >
                                                    <span className="flex items-center gap-2">
                                                        <Landmark className="w-4 h-4 text-primary opacity-80" />
                                                        {m.name}
                                                    </span>
                                                    {isSelected && <Check className="w-4 h-4 text-emerald-600 font-bold" />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Neighborhoods Category */}
                                {filteredNeighborhoods.length > 0 && (
                                    <div>
                                        <h4 className="text-[10px] uppercase font-black tracking-widest text-slate-400 px-2.5 mb-1.5">Quartiers / Arrondissements</h4>
                                        {filteredNeighborhoods.map(n => {
                                            const isSelected = selectedLocation?.type === 'NEIGHBORHOOD' && selectedLocation.id === n.id;
                                            return (
                                                <button
                                                    key={n.id}
                                                    onClick={() => handleSelectLocation({ id: n.id, name: n.name, latitude: n.centerLatitude, longitude: n.centerLongitude, type: 'NEIGHBORHOOD' })}
                                                    className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/40 text-left text-sm transition-colors text-slate-700 dark:text-slate-300 font-bold"
                                                >
                                                    <span className="flex items-center gap-2">
                                                        <MapPin className="w-4 h-4 text-primary opacity-80" />
                                                        {n.name}
                                                    </span>
                                                    {isSelected && <Check className="w-4 h-4 text-emerald-600 font-bold" />}
                                                </button>
                                            );
                                        })}
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

                    {/* Clear / Reset Position */}
                    {selectedLocation && (
                        <button
                            onClick={handleClearLocation}
                            className="text-xs font-bold text-slate-400 hover:text-primary transition-colors text-center py-2 mt-2"
                        >
                            Réinitialiser la position
                        </button>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
