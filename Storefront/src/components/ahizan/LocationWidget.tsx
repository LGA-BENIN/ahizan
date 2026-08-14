"use client";

import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, Search, Check, Loader2, Landmark, ChevronDown } from 'lucide-react';
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
    type: 'MARKET' | 'NEIGHBORHOOD' | 'COMMUNE' | 'GPS';
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

export function LocationWidget({ variant = 'desktop' }: { variant?: 'desktop' | 'mobile' }) {
    const {
        selectedLocation,
        markets,
        neighborhoods,
        cities = [],
        loading,
        gpsLoading,
        gpsPermission,
        selectLocation,
        clearLocation,
        useGps,
    } = useLocation();

    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const handleTriggerClick = () => {
        setIsOpen(true);
    };

    const filteredCities = (cities || []).filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    const filteredMarkets = (markets || []).filter(m =>
        m.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    const filteredNeighborhoods = (neighborhoods || []).filter(n =>
        n.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const isMobile = variant === 'mobile';

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <button
                    onClick={handleTriggerClick}
                    disabled={gpsLoading}
                    className={isMobile
                        ? "flex items-center gap-1 px-2 py-0.5 rounded-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 hover:border-primary/60 transition-all text-slate-700 dark:text-slate-200 focus:outline-none disabled:opacity-70 cursor-pointer overflow-hidden flex-shrink-0 max-w-[130px]"
                        : "flex items-center gap-1.5 px-3 py-1 rounded-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 hover:border-primary/60 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all text-slate-700 dark:text-slate-200 focus:outline-none disabled:opacity-70 max-w-[160px] min-h-[34px] leading-tight overflow-hidden cursor-pointer"
                    }
                >
                    {gpsLoading ? (
                        <div className="flex items-center gap-1">
                            <span className="w-2.5 h-2.5 border-2 border-primary border-t-transparent rounded-full animate-spin flex-shrink-0" />
                            <span className="text-[10px] font-semibold truncate">Loc...</span>
                        </div>
                    ) : (
                        isMobile ? (
                            <>
                                <MapPin className="w-3 h-3 text-slate-600 dark:text-slate-300 flex-shrink-0" />
                                <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200 truncate max-w-[85px] leading-none">
                                    {selectedLocation
                                        ? selectedLocation.name
                                        : 'Ma zone'}
                                </span>
                                <ChevronDown className="w-2.5 h-2.5 text-slate-500 dark:text-slate-400 flex-shrink-0" />
                            </>
                        ) : (
                            <div className="flex items-center gap-1.5">
                                <MapPin className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                                <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200 line-clamp-2 break-words text-left leading-tight max-w-[110px]">
                                    {selectedLocation ? selectedLocation.name : 'Choisir ma zone'}
                                </span>
                            </div>
                        )
                    )}
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
                        onClick={async () => { await useGps(); setIsOpen(false); }}
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
                            placeholder="Rechercher une ville, un marché ou quartier..."
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {/* List */}
                    <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto pr-1">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-10 gap-2">
                                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                                <span className="text-xs text-slate-400 font-semibold">Chargement des zones...</span>
                            </div>
                        ) : (
                            <>
                                {/* Villes / Communes Category */}
                                {filteredCities.length > 0 && (
                                    <div>
                                        <h4 className="text-[10px] uppercase font-black tracking-widest text-primary px-2.5 mb-1.5 flex items-center gap-1">
                                            <span>🏙️</span> Villes & Communes
                                        </h4>
                                        {filteredCities.map(c => {
                                            const isSelected = (selectedLocation?.type === 'COMMUNE' || selectedLocation?.type === 'NEIGHBORHOOD') && selectedLocation.id === c.id;
                                            return (
                                                <button
                                                    key={c.id}
                                                    onClick={() => { selectLocation({ id: c.id, name: c.name, latitude: c.centerLatitude, longitude: c.centerLongitude, type: 'COMMUNE' }); setIsOpen(false); }}
                                                    className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/40 text-left text-sm transition-colors text-slate-700 dark:text-slate-300 font-bold"
                                                >
                                                    <span className="flex items-center gap-2">
                                                        <MapPin className="w-4 h-4 text-primary font-black" />
                                                        {c.name}
                                                    </span>
                                                    {isSelected && <Check className="w-4 h-4 text-emerald-600 font-bold" />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Neighborhoods & Arrondissements Category */}
                                {filteredNeighborhoods.length > 0 && (
                                    <div>
                                        <h4 className="text-[10px] uppercase font-black tracking-widest text-slate-400 px-2.5 mb-1.5 flex items-center gap-1">
                                            <span>📍</span> Quartiers & Arrondissements
                                        </h4>
                                        {filteredNeighborhoods.map(n => {
                                            const isSelected = selectedLocation?.type === 'NEIGHBORHOOD' && selectedLocation.id === n.id;
                                            return (
                                                <button
                                                    key={n.id}
                                                    onClick={() => { selectLocation({ id: n.id, name: n.name, latitude: n.centerLatitude, longitude: n.centerLongitude, type: 'NEIGHBORHOOD' }); setIsOpen(false); }}
                                                    className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/40 text-left text-sm transition-colors text-slate-700 dark:text-slate-300 font-bold"
                                                >
                                                    <span className="flex items-center gap-2">
                                                        <MapPin className="w-4 h-4 text-slate-400 opacity-80" />
                                                        {n.name}
                                                    </span>
                                                    {isSelected && <Check className="w-4 h-4 text-emerald-600 font-bold" />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Markets Category */}
                                {filteredMarkets.length > 0 && (
                                    <div>
                                        <h4 className="text-[10px] uppercase font-black tracking-widest text-slate-400 px-2.5 mb-1.5 flex items-center gap-1">
                                            <span>🛍️</span> Marchés
                                        </h4>
                                        {filteredMarkets.map(m => {
                                            const isSelected = selectedLocation?.type === 'MARKET' && selectedLocation.id === m.id;
                                            return (
                                                <button
                                                    key={m.id}
                                                    onClick={() => { selectLocation({ id: m.id, name: m.name, latitude: m.centerLatitude, longitude: m.centerLongitude, type: 'MARKET' }); setIsOpen(false); }}
                                                    className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/40 text-left text-sm transition-colors text-slate-700 dark:text-slate-300 font-bold"
                                                >
                                                    <span className="flex items-center gap-2">
                                                        <Landmark className="w-4 h-4 text-amber-600 opacity-80" />
                                                        {m.name}
                                                    </span>
                                                    {isSelected && <Check className="w-4 h-4 text-emerald-600 font-bold" />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}

                                {filteredCities.length === 0 && filteredMarkets.length === 0 && filteredNeighborhoods.length === 0 && (
                                    <div className="text-center py-8">
                                        <p className="text-xs text-slate-400 font-medium">Aucune ville, quartier ni marché correspondant.</p>
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {/* Clear / Reset Position */}
                    {selectedLocation && (
                        <button
                            onClick={() => { clearLocation(); setIsOpen(false); }}
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
