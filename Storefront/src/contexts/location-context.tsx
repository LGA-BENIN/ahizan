"use client";

import { createContext, useContext, useState, ReactNode, useEffect, useRef } from "react";
import { getShopApiUrl } from "@/lib/vendure/api-utils";
import { usePathname } from "next/navigation";
import { toast } from "sonner";

export interface LocationData {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    type: 'MARKET' | 'NEIGHBORHOOD' | 'GPS';
}

interface LocationContextType {
    selectedLocation: LocationData | null;
    markets: any[];
    neighborhoods: any[];
    loading: boolean;
    gpsLoading: boolean;
    gpsPermission: PermissionState | null;
    selectLocation: (loc: LocationData) => void;
    clearLocation: () => void;
    useGps: () => Promise<void>;
    refreshLocations: () => Promise<void>;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

// Only update if user moved more than 500 meters
const ZONE_CHANGE_THRESHOLD_METERS = 500;

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3;
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const dPhi = ((lat2 - lat1) * Math.PI) / 180;
    const dLambda = ((lon2 - lon1) * Math.PI) / 180;
    const a =
        Math.sin(dPhi / 2) ** 2 +
        Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const FALLBACK_MARKETS = [
    { id: "1", name: "Marché Dantokpa", slug: "marche-dantokpa", centerLatitude: 6.367, centerLongitude: 2.44, radiusMeters: 1200 },
    { id: "12", name: "Marché Missèbo", slug: "marche-missebo", centerLatitude: 6.363, centerLongitude: 2.435, radiusMeters: 800 },
    { id: "20", name: "Marché de Zogbadjè", slug: "marche-de-zogbadje", centerLatitude: 6.422, centerLongitude: 2.342, radiusMeters: 600 },
    { id: "21", name: "Marché de Glo-Djigbé", slug: "marche-de-glo-djigbe", centerLatitude: 6.550, centerLongitude: 2.316, radiusMeters: 800 },
    { id: "30", name: "Marché de Porto-Novo (Grand Marché)", slug: "marche-porto-novo", centerLatitude: 6.4969, centerLongitude: 2.6289, radiusMeters: 1000 },
    { id: "31", name: "Marché Arzèkè (Parakou)", slug: "marche-arzeke-parakou", centerLatitude: 9.3371, centerLongitude: 2.6303, radiusMeters: 1000 },
    { id: "32", name: "Marché Kpassè (Ouidah)", slug: "marche-kpasse-ouidah", centerLatitude: 6.3631, centerLongitude: 2.0851, radiusMeters: 800 },
    { id: "33", name: "Marché de Bohicon", slug: "marche-bohicon", centerLatitude: 7.1783, centerLongitude: 2.0667, radiusMeters: 900 }
];

const FALLBACK_NEIGHBORHOODS = [
    { id: "nz1", name: "Cotonou - Centre / Littoral", centerLatitude: 6.3654, centerLongitude: 2.4183 },
    { id: "nz2", name: "Abomey-Calavi - Centre", centerLatitude: 6.4485, centerLongitude: 2.3556 },
    { id: "nz3", name: "Porto-Novo - Ouando / Centre", centerLatitude: 6.4969, centerLongitude: 2.6289 },
    { id: "nz4", name: "Parakou - Albarika / Centre", centerLatitude: 9.3371, centerLongitude: 2.6303 },
    { id: "nz5", name: "Ouidah - Centre / Pahou", centerLatitude: 6.3631, centerLongitude: 2.0851 },
    { id: "nz6", name: "Bohicon - Centre", centerLatitude: 7.1783, centerLongitude: 2.0667 }
];

export function LocationProvider({ children }: { children: ReactNode }) {
    const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null);
    const [markets, setMarkets] = useState<any[]>(FALLBACK_MARKETS);
    const [neighborhoods, setNeighborhoods] = useState<any[]>(FALLBACK_NEIGHBORHOODS);
    const [loading, setLoading] = useState(false);
    const [gpsLoading, setGpsLoading] = useState(false);
    const [gpsPermission, setGpsPermission] = useState<PermissionState | null>(null);

    const watchIdRef = useRef<number | null>(null);
    const lastAutoUpdateRef = useRef<{ lat: number; lon: number } | null>(null);

    // 1. Restore location from localStorage on mount
    useEffect(() => {
        try {
            const stored = localStorage.getItem('ahizan_client_location');
            if (stored) setSelectedLocation(JSON.parse(stored));
        } catch (e) {
            console.error('Failed to parse stored location:', e);
        }
    }, []);

    // 2. Load markets & neighborhoods from API (with instant fallback & strict timeout)
    const refreshLocations = async () => {
        setLoading(true);
        const apiUrl = getShopApiUrl();
        const queryStr = `
            query GetLocations {
                markets {
                    id
                    name
                    slug
                    centerLatitude
                    centerLongitude
                    radiusMeters
                }
                geoZones(type: "NEIGHBORHOOD") {
                    id
                    name
                    centerLatitude
                    centerLongitude
                }
            }
        `;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

        try {
            const res = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: queryStr }),
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            const result = await res.json();
            const fetchedMarkets = result.data?.markets || [];
            const fetchedZones = result.data?.geoZones || [];
            if (fetchedMarkets.length > 0) setMarkets(fetchedMarkets);
            if (fetchedZones.length > 0) setNeighborhoods(fetchedZones);
        } catch (err) {
            clearTimeout(timeoutId);
            console.warn('Locations fetch timed out or failed, using fast fallback list:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refreshLocations();
    }, []);

    // 3. Reverse geocode: PostGIS first, then Nominatim fallback (with strict timeouts)
    const reverseGeocode = async (latitude: number, longitude: number): Promise<LocationData> => {
        const apiUrl = getShopApiUrl();
        const reverseQuery = `
            query ReverseGeocode($lat: Float!, $lng: Float!) {
                reverseGeocode(latitude: $lat, longitude: $lng) {
                    id
                    name
                    centerLatitude
                    centerLongitude
                }
            }
        `;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);

        try {
            const res = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: reverseQuery, variables: { lat: latitude, lng: longitude } }),
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            const result = await res.json();
            const matchedZones = result.data?.reverseGeocode || [];
            if (matchedZones.length > 0) {
                const zone = matchedZones[0];
                return {
                    id: zone.id,
                    name: zone.name,
                    latitude: zone.centerLatitude || latitude,
                    longitude: zone.centerLongitude || longitude,
                    type: 'NEIGHBORHOOD'
                };
            }
        } catch (err) {
            clearTimeout(timeoutId);
            console.warn('PostGIS reverse geocode error or timeout:', err);
        }

        // Nominatim fallback with strict timeout
        const osmController = new AbortController();
        const osmTimeout = setTimeout(() => osmController.abort(), 3500);
        try {
            const osmRes = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
                { headers: { 'Accept-Language': 'fr' }, signal: osmController.signal }
            );
            clearTimeout(osmTimeout);
            const osmData = await osmRes.json();
            const address = osmData.address || {};
            const name = address.suburb || address.neighbourhood || address.city_district || address.city || 'Ma position GPS';
            return { id: 'gps_raw', name, latitude, longitude, type: 'GPS' };
        } catch (err) {
            clearTimeout(osmTimeout);
            console.warn('Nominatim fallback error or timeout:', err);
        }

        return {
            id: 'gps_raw',
            name: `GPS (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`,
            latitude,
            longitude,
            type: 'GPS'
        };
    };

    // 4. Internal apply (no toast) — used by auto-tracking
    const _applyLocation = (loc: LocationData) => {
        setSelectedLocation(loc);
        localStorage.setItem('ahizan_client_location', JSON.stringify(loc));
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('ahizan_location_changed'));
        }
    };

    // 5. Public select/clear with user feedback
    const selectLocation = (loc: LocationData) => {
        _applyLocation(loc);
        toast.success(`Position définie sur : ${loc.name}`);
    };

    const clearLocation = () => {
        setSelectedLocation(null);
        localStorage.removeItem('ahizan_client_location');
        if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
        }
        lastAutoUpdateRef.current = null;
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('ahizan_location_changed'));
        }
        toast.info('Position réinitialisée.');
    };

    // 6. Start silent background GPS watch (only if > 500m movement)
    const startWatchPosition = () => {
        if (!navigator.geolocation) return;
        if (watchIdRef.current !== null) return; // Already watching

        watchIdRef.current = navigator.geolocation.watchPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;

                // Skip if hasn't moved enough
                if (lastAutoUpdateRef.current) {
                    const dist = getDistance(
                        lastAutoUpdateRef.current.lat,
                        lastAutoUpdateRef.current.lon,
                        latitude,
                        longitude
                    );
                    if (dist < ZONE_CHANGE_THRESHOLD_METERS) return;
                }

                lastAutoUpdateRef.current = { lat: latitude, lon: longitude };

                try {
                    const loc = await reverseGeocode(latitude, longitude);
                    const stored = localStorage.getItem('ahizan_client_location');
                    const current = stored ? (JSON.parse(stored) as LocationData) : null;

                    // Only update if the zone actually changed
                    if (!current || current.id !== loc.id || current.name !== loc.name) {
                        _applyLocation(loc);
                        toast.info(`📍 Zone mise à jour : ${loc.name}`, { duration: 4000 });
                    }
                } catch (err) {
                    console.error('Auto GPS zone update error:', err);
                }
            },
            (error) => {
                console.warn('watchPosition error:', error);
                watchIdRef.current = null;
            },
            { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 }
        );
    };

    // 7. Manual GPS trigger (with loading UI)
    const useGps = async (): Promise<void> => {
        if (!navigator.geolocation) {
            toast.error("La géolocalisation n'est pas supportée par votre navigateur.");
            return;
        }

        setGpsLoading(true);
        toast.loading('Recherche de votre position GPS...', { id: 'gps-locate' });

        let isDone = false;
        const watchdog = setTimeout(() => {
            if (!isDone) {
                isDone = true;
                setGpsLoading(false);
                toast.dismiss('gps-locate');
                toast.error("Le délai d'attente GPS a expiré. Veuillez choisir manuellement votre zone dans la liste ci-dessous.");
            }
        }, 6500);

        return new Promise((resolve) => {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    if (isDone) { resolve(); return; }
                    const { latitude, longitude } = position.coords;
                    try {
                        const loc = await reverseGeocode(latitude, longitude);
                        if (isDone) { resolve(); return; }
                        isDone = true;
                        clearTimeout(watchdog);
                        _applyLocation(loc);
                        toast.success(`Position détectée : ${loc.name}`, { id: 'gps-locate' });
                        lastAutoUpdateRef.current = { lat: latitude, lon: longitude };
                        startWatchPosition();
                    } catch (err) {
                        if (isDone) { resolve(); return; }
                        isDone = true;
                        clearTimeout(watchdog);
                        console.error('useGps error:', err);
                        toast.error('Erreur lors de la détection de zone.', { id: 'gps-locate' });
                    } finally {
                        setGpsLoading(false);
                        resolve();
                    }
                },
                (error) => {
                    if (isDone) { resolve(); return; }
                    isDone = true;
                    clearTimeout(watchdog);
                    console.error('GPS error:', error);
                    toast.error("Impossible d'accéder à votre position GPS. Veuillez autoriser l'accès ou choisir dans la liste.", { id: 'gps-locate' });
                    setGpsLoading(false);
                    resolve();
                },
                { enableHighAccuracy: false, timeout: 5500, maximumAge: 60000 }
            );
        });
    };

    // 8. On mount — auto-GPS logic based on permission state
    useEffect(() => {
        if (typeof window === 'undefined') return;

        // Use window.navigator to avoid TypeScript narrowing issues with 'in' guards
        const nav = window.navigator as Navigator;
        if (!nav.geolocation) return;

        const geo = nav.geolocation;

        const doReverseAndApply = async (latitude: number, longitude: number, silent = false) => {
            lastAutoUpdateRef.current = { lat: latitude, lon: longitude };
            const loc = await reverseGeocode(latitude, longitude);
            const stored = localStorage.getItem('ahizan_client_location');

            if (!stored) {
                _applyLocation(loc);
            } else {
                const current = JSON.parse(stored) as LocationData;
                if (current.type === 'GPS' || current.id !== loc.id) {
                    _applyLocation(loc);
                    if (!silent) toast.info(`📍 Zone mise à jour : ${loc.name}`, { duration: 4000 });
                }
            }
            startWatchPosition();
        };

        const runAutoGps = (permState: PermissionState) => {
            const stored = localStorage.getItem('ahizan_client_location');

            if (permState === 'granted') {
                // Already granted → silent position fix + watch
                geo.getCurrentPosition(
                    async (pos) => doReverseAndApply(pos.coords.latitude, pos.coords.longitude, true),
                    (err) => console.warn('Silent GPS init failed:', err),
                    { enableHighAccuracy: false, timeout: 8000, maximumAge: 120000 }
                );
            } else if (permState === 'prompt' && !stored) {
                // Not yet asked AND no saved location → trigger native browser prompt automatically
                geo.getCurrentPosition(
                    async (pos) => doReverseAndApply(pos.coords.latitude, pos.coords.longitude, false),
                    (err) => console.info('Auto GPS prompt declined:', err.code),
                    { enableHighAccuracy: true, timeout: 15000 }
                );
            }
            // 'denied' or has stored location → do nothing, user can change via widget
        };

        const tryDirectGps = () => {
            const stored = localStorage.getItem('ahizan_client_location');
            if (!stored) {
                geo.getCurrentPosition(
                    async (pos) => doReverseAndApply(pos.coords.latitude, pos.coords.longitude, false),
                    (err) => console.info('Auto GPS (no PermAPI) declined:', err.code),
                    { enableHighAccuracy: true, timeout: 15000 }
                );
            }
        };

        const permissionsApi = (nav as any).permissions as Permissions | undefined;

        if (permissionsApi) {
            permissionsApi.query({ name: 'geolocation' as PermissionName }).then((result) => {
                setGpsPermission(result.state);
                runAutoGps(result.state);

                result.addEventListener('change', () => {
                    setGpsPermission(result.state);
                    if (result.state === 'granted') {
                        startWatchPosition();
                    } else if (result.state === 'denied' && watchIdRef.current !== null) {
                        geo.clearWatch(watchIdRef.current);
                        watchIdRef.current = null;
                    }
                });
            }).catch(() => {
                tryDirectGps();
            });
        } else {
            tryDirectGps();
        }

        return () => {
            if (watchIdRef.current !== null) {
                geo.clearWatch(watchIdRef.current);
                watchIdRef.current = null;
            }
        };
    }, []);

    const pathname = usePathname();

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const nav = window.navigator as Navigator;
        if (!nav.geolocation) return;

        const checkGpsAndUpdate = async () => {
            const permissionsApi = (nav as any).permissions as Permissions | undefined;
            if (permissionsApi) {
                try {
                    const result = await permissionsApi.query({ name: 'geolocation' as PermissionName });
                    if (result.state === 'granted') {
                        nav.geolocation.getCurrentPosition(
                            async (pos) => {
                                const { latitude, longitude } = pos.coords;
                                const loc = await reverseGeocode(latitude, longitude);
                                const stored = localStorage.getItem('ahizan_client_location');
                                if (stored) {
                                    const current = JSON.parse(stored) as LocationData;
                                    if (current.id !== loc.id) {
                                        _applyLocation(loc);
                                        toast.info(`📍 Zone mise à jour : ${loc.name}`, { duration: 4000 });
                                    }
                                } else {
                                    _applyLocation(loc);
                                    toast.info(`📍 Zone détectée : ${loc.name}`, { duration: 4000 });
                                }
                            },
                            (err) => console.warn('Active background GPS check failed:', err),
                            { enableHighAccuracy: false, timeout: 5000, maximumAge: 30000 }
                        );
                    }
                } catch (e) {
                    console.error('Error checking permissions:', e);
                }
            }
        };

        checkGpsAndUpdate();

        const handleFocus = () => {
            checkGpsAndUpdate();
        };
        window.addEventListener('focus', handleFocus);
        return () => {
            window.removeEventListener('focus', handleFocus);
        };
    }, [pathname]);


    return (
        <LocationContext.Provider value={{
            selectedLocation,
            markets,
            neighborhoods,
            loading,
            gpsLoading,
            gpsPermission,
            selectLocation,
            clearLocation,
            useGps,
            refreshLocations
        }}>
            {children}
        </LocationContext.Provider>
    );
}

export function useLocation() {
    const context = useContext(LocationContext);
    if (context === undefined) {
        throw new Error('useLocation must be used within a LocationProvider');
    }
    return context;
}
