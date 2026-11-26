"use client";

import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, Loader2, X } from 'lucide-react';
import { useLocation, DEFAULT_FALLBACK_LOCATION } from '@/contexts/location-context';

interface LocationOnboardingModalProps {
    shopApiUrl?: string;
}

export function LocationOnboardingModal({ shopApiUrl }: LocationOnboardingModalProps) {
    const {
        selectedLocation,
        gpsLoading,
        selectLocation,
        useGps,
    } = useLocation();

    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        try {
            const savedLocation = localStorage.getItem('ahizan_client_location');
            if (!savedLocation) {
                // Show smoothly after page hydration without blocking the user
                const timer = setTimeout(() => {
                    setIsVisible(true);
                }, 1000);
                return () => clearTimeout(timer);
            }
        } catch (e) {
            // Guard against iframe/storage restriction errors
        }
    }, []);

    const handleGpsClick = async () => {
        try {
            await useGps();
            setIsVisible(false);
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('ahizan:location-resolved'));
            }
        } catch (e) {
            console.error('[LocationToast] GPS detection error:', e);
        }
    };

    const handleConfirmDefault = () => {
        selectLocation(DEFAULT_FALLBACK_LOCATION);
        setIsVisible(false);
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('ahizan:location-resolved'));
        }
    };

    const handleClose = () => {
        // Dismiss and keep Cotonou by default in localStorage
        try {
            localStorage.setItem('ahizan_client_location', JSON.stringify(DEFAULT_FALLBACK_LOCATION));
            document.cookie = `ahizan_client_location=${encodeURIComponent(JSON.stringify(DEFAULT_FALLBACK_LOCATION))}; path=/; max-age=31536000; SameSite=Lax`;
        } catch {}
        setIsVisible(false);
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('ahizan:location-resolved'));
        }
    };

    if (!isVisible) return null;

    return (
        <aside
            aria-label="Notification de localisation"
            className="fixed bottom-20 left-3 right-3 sm:left-6 sm:bottom-6 sm:right-auto sm:max-w-sm z-[90] animate-in slide-in-from-bottom-5 fade-in duration-400 ease-out pointer-events-auto"
        >
            <div className="bg-white/95 dark:bg-slate-900/95 rounded-2xl shadow-xl border border-slate-200/90 dark:border-slate-800 p-3 sm:p-3.5 backdrop-blur-md font-sans text-slate-950 dark:text-slate-100">
                {/* Header (Slim) */}
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                            <MapPin className="w-3.5 h-3.5 animate-bounce" />
                        </div>
                        <h3 className="font-black text-xs text-slate-900 dark:text-white truncate">
                            Zone de livraison
                        </h3>
                    </div>
                    <button 
                        type="button"
                        onClick={handleClose}
                        aria-label="Fermer"
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1 -mr-1 cursor-pointer shrink-0"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>

                {/* Body Message (Compact) */}
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug my-1.5 font-medium">
                    Activez votre position pour vos frais exacts (sans choix, <strong className="text-slate-800 dark:text-slate-200">Cotonou</strong> est appliqué).
                </p>

                {/* Actions (Horizontal Row - Low Height) */}
                <div className="flex items-center gap-1.5 mt-1">
                    {/* Primary Button: GPS */}
                    <button
                        type="button"
                        onClick={handleGpsClick}
                        disabled={gpsLoading}
                        className="flex-1 h-7 sm:h-8 px-2 bg-primary text-white font-extrabold rounded-lg shadow-sm hover:bg-primary/95 transition-all text-[11px] flex items-center justify-center gap-1 cursor-pointer disabled:opacity-85 min-w-0 truncate"
                    >
                        {gpsLoading ? (
                            <>
                                <Loader2 className="w-3 h-3 animate-spin shrink-0" />
                                <span className="truncate">Détection...</span>
                            </>
                        ) : (
                            <>
                                <Navigation className="w-3 h-3 fill-white shrink-0" />
                                <span className="truncate">Position GPS</span>
                            </>
                        )}
                    </button>

                    {/* Secondary Button: OK Cotonou */}
                    <button
                        type="button"
                        onClick={handleConfirmDefault}
                        className="h-7 sm:h-8 px-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-lg transition-all text-[11px] flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700 cursor-pointer"
                    >
                        <span>OK Cotonou</span>
                    </button>
                </div>
            </div>
        </aside>
    );
}
