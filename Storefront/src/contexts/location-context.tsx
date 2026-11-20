"use client";

import { createContext, useContext, useState, ReactNode, useEffect, useRef } from "react";
import { getShopApiUrl } from "@/lib/vendure/api-utils";
import { clearClientCache } from "@/lib/vendure/client-cache";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";

export interface LocationData {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    type: 'MARKET' | 'NEIGHBORHOOD' | 'COMMUNE' | 'GPS';
    commune?: string;
    department?: string;
    arrondissement?: string;
    neighborhood?: string;
    marketId?: string;
    marketName?: string;
    geoZoneId?: string;
}

interface LocationContextType {
    selectedLocation: LocationData | null;
    markets: any[];
    neighborhoods: any[];
    cities: any[];
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
// Hardcoded fallback neighborhoods removed in favor of dynamic GeoEngine PostGIS resolution

const FALLBACK_CITIES = [
    { id: "18", name: "Cotonou", slug: "cotonou", type: "COMMUNE", centerLatitude: 6.3654, centerLongitude: 2.4183 },
    { id: "3", name: "Abomey-Calavi", slug: "abomey-calavi", type: "COMMUNE", centerLatitude: 6.5109, centerLongitude: 2.3303 },
    { id: "2", name: "Porto-Novo", slug: "porto-novo", type: "COMMUNE", centerLatitude: 6.4935, centerLongitude: 2.6247 }
];

export function LocationProvider({ children }: { children: ReactNode }) {
    const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null);
    const [markets, setMarkets] = useState<any[]>(FALLBACK_MARKETS);
    const [neighborhoods, setNeighborhoods] = useState<any[]>([]);
    const [cities, setCities] = useState<any[]>(FALLBACK_CITIES);
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

    // 2. Load markets & geoZones (Cities + Neighborhoods) from API
    const refreshLocations = async () => {
        setLoading(true);
        const apiUrl = getShopApiUrl();
        const queryStr = `
            query GetLocations {
                markets {
                    id
                    name
                    slug
                    description
                    image
                    icon
                    centerLatitude
                    centerLongitude
                    radiusMeters
                    geoZone {
                        id
                        name
                        slug
                        parent { id name }
                    }
                }
                geoZones {
                    id
                    name
                    slug
                    code
                    type
                    status
                    image
                    icon
                    banner
                    centerLatitude
                    centerLongitude
                    radiusMeters
                    parent {
                        id
                        name
                        slug
                    }
                }
            }
        `;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

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
            if (fetchedZones.length > 0) {
                const activeZones = fetchedZones.filter((z: any) => z.status !== 'DRAFT' && z.status !== 'ARCHIVED');
                
                const isCity = (z: any) => {
                    const t = (z.type || '').toUpperCase();
                    return t === 'COMMUNE' || t === 'CITY';
                };
                const isNeigh = (z: any) => {
                    const t = (z.type || '').toUpperCase();
                    return t === 'NEIGHBORHOOD' || t === 'QUARTIER' || t === 'VILLAGE' || t === 'ARRONDISSEMENT' || (!['COMMUNE', 'CITY', 'DEPARTMENT', 'COUNTRY'].includes(t));
                };

                const fetchedCities = activeZones.filter(isCity);
                const fetchedNeighborhoods = activeZones
                    .filter(isNeigh)
                    .map((z: any) => ({
                        ...z,
                        commune: z.parent?.name || (isCity(z) ? z.name : '')
                    }));

                if (fetchedCities.length > 0) setCities(fetchedCities);
                if (fetchedNeighborhoods.length > 0) setNeighborhoods(fetchedNeighborhoods);
            }
        } catch (err) {
            clearTimeout(timeoutId);
            console.warn('Locations fetch timed out or failed:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refreshLocations();
    }, []);

    // 3. Helper to find closest item by GPS coordinates
    const findClosest = (lat: number, lon: number, items: any[]) => {
        let best: any = null;
        let minD = Infinity;
        for (const it of items) {
            const iLat = Number(it.centerLatitude ?? it.latitude);
            const iLon = Number(it.centerLongitude ?? it.longitude);
            if (!isNaN(iLat) && !isNaN(iLon) && iLat !== 0 && iLon !== 0) {
                const d = getDistance(lat, lon, iLat, iLon);
                if (d < minD) {
                    minD = d;
                    best = { item: it, distanceMeters: d };
                }
            }
        }
        return best;
    };

    // 4. Centralized resolveCoordinates query calling PostGIS + Local spatial matching
    const reverseGeocode = async (latitude: number, longitude: number): Promise<LocationData> => {
        const apiUrl = getShopApiUrl();
        const queryStr = `
            query ResolveCoordinates($lat: Float!, $lng: Float!) {
                resolveCoordinates(latitude: $lat, longitude: $lng) {
                    geoId
                    hierarchicalCode
                    latitude
                    longitude
                    geoZoneId
                    displayName
                    country
                    department
                    commune
                    arrondissement
                    neighborhood
                    marketId
                    marketName
                    deliveryZonePrice
                    confidence
                }
            }
        `;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);

        // Precompute closest neighborhood and market in memory
        const currentNeighborhoods = neighborhoods;
        const currentMarkets = markets.length > 0 ? markets : FALLBACK_MARKETS;
        const currentCities = cities.length > 0 ? cities : FALLBACK_CITIES;

        const closestNeigh = findClosest(latitude, longitude, currentNeighborhoods);
        const closestMkt = findClosest(latitude, longitude, currentMarkets);
        const closestCity = findClosest(latitude, longitude, currentCities);

        try {
            const res = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: queryStr, variables: { lat: latitude, lng: longitude } }),
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            const result = await res.json();
            const loc = result.data?.resolveCoordinates;
            if (loc) {
                const finalNeighborhood = loc.neighborhood || closestNeigh?.item?.name;
                const finalCommune = loc.commune || closestNeigh?.item?.commune || closestCity?.item?.name || 'Cotonou';
                const finalMarketId = loc.marketId ? String(loc.marketId) : (closestMkt && closestMkt.distanceMeters <= (closestMkt.item.radiusMeters || 500) ? String(closestMkt.item.id) : undefined);
                const finalMarketName = loc.marketName || (finalMarketId && closestMkt ? closestMkt.item.name : undefined);

                return {
                    id: loc.geoId || String(loc.geoZoneId || closestNeigh?.item?.id || 'gps_raw'),
                    name: finalNeighborhood ? `${finalNeighborhood}` : (loc.displayName || finalCommune || 'Cotonou'),
                    latitude: loc.latitude || latitude,
                    longitude: loc.longitude || longitude,
                    type: finalMarketId ? 'MARKET' : (finalNeighborhood ? 'NEIGHBORHOOD' : 'COMMUNE'),
                    commune: finalCommune,
                    department: loc.department,
                    arrondissement: loc.arrondissement,
                    neighborhood: finalNeighborhood,
                    marketId: finalMarketId,
                    marketName: finalMarketName,
                    geoZoneId: loc.geoZoneId ? String(loc.geoZoneId) : (closestNeigh?.item?.id ? String(closestNeigh.item.id) : undefined)
                };
            }
        } catch (err) {
            clearTimeout(timeoutId);
            console.warn('GeoEngine resolveCoordinates call timeout or error, using high-precision local fallback:', err);
        }

        // High-precision local spatial fallback
        const bestNeigh = closestNeigh?.item;
        const bestMkt = (closestMkt && closestMkt.distanceMeters <= (closestMkt.item.radiusMeters || 500)) ? closestMkt.item : null;
        const bestCityName = bestNeigh?.commune || closestCity?.item?.name || 'Cotonou';

        return {
            id: bestNeigh?.id ? String(bestNeigh.id) : 'gps_raw',
            name: bestNeigh?.name ? `${bestNeigh.name}` : bestCityName,
            latitude,
            longitude,
            type: bestMkt ? 'MARKET' : (bestNeigh ? 'NEIGHBORHOOD' : 'GPS'),
            commune: bestCityName,
            neighborhood: bestNeigh?.name,
            marketId: bestMkt ? String(bestMkt.id) : undefined,
            marketName: bestMkt?.name,
            geoZoneId: bestNeigh?.id ? String(bestNeigh.id) : undefined
        };
    };

    const router = useRouter();

    // 4. Internal apply (no toast) — used by auto-tracking
    const _applyLocation = (loc: LocationData) => {
        setSelectedLocation(loc);
        localStorage.setItem('ahizan_client_location', JSON.stringify(loc));
        if (typeof window !== 'undefined') {
            document.cookie = `ahizan_client_location=${encodeURIComponent(JSON.stringify(loc))}; path=/; max-age=31536000; SameSite=Lax`;
            window.dispatchEvent(new Event('ahizan_location_changed'));
        }
    };

    // 5. Public select/clear with user feedback
    const selectLocation = (loc: LocationData) => {
        if (watchIdRef.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
        }
        _applyLocation(loc);
        toast.success(`Position définie sur : ${loc.name}`);
    };

    const clearLocation = () => {
        clearClientCache();
        setSelectedLocation(null);
        localStorage.removeItem('ahizan_client_location');
        if (watchIdRef.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
        }
        lastAutoUpdateRef.current = null;
        if (typeof window !== 'undefined') {
            document.cookie = `ahizan_client_location=; path=/; max-age=0; SameSite=Lax`;
            window.dispatchEvent(new Event('ahizan_location_changed'));
            try {
                router.refresh();
            } catch {}
        }
        toast.info('Position réinitialisée.');
    };

    // 6. Start silent background GPS watch (only if user explicitly activated GPS mode and > 500m movement)
    const startWatchPosition = () => {
        if (typeof navigator === 'undefined' || !navigator.geolocation) return;
        if (watchIdRef.current !== null) return; // Already watching

        watchIdRef.current = navigator.geolocation.watchPosition(
            async (position) => {
                const stored = localStorage.getItem('ahizan_client_location');
                const current = stored ? (JSON.parse(stored) as LocationData) : null;

                // CRITICAL: If the user manually chose a COMMUNE, NEIGHBORHOOD or MARKET, never overwrite it!
                if (current && current.type !== 'GPS') {
                    if (watchIdRef.current !== null) {
                        navigator.geolocation.clearWatch(watchIdRef.current);
                        watchIdRef.current = null;
                    }
                    return;
                }

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
                    loc.type = 'GPS';

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
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
        );
    };

    // 7. Manual GPS trigger (with resilient 2-stage fallback)
    const useGps = async (): Promise<void> => {
        if (typeof navigator === 'undefined' || !navigator.geolocation) {
            toast.error("La géolocalisation n'est pas supportée par votre navigateur.");
            return;
        }

        setGpsLoading(true);
        toast.loading('Recherche de votre position GPS...', { id: 'gps-locate' });

        return new Promise((resolve) => {
            const handleSuccess = async (position: GeolocationPosition) => {
                const { latitude, longitude } = position.coords;
                try {
                    const loc = await reverseGeocode(latitude, longitude);
                    loc.type = 'GPS';
                    _applyLocation(loc);
                    toast.success(`Position détectée : ${loc.name}`, { id: 'gps-locate' });
                    lastAutoUpdateRef.current = { lat: latitude, lon: longitude };
                    startWatchPosition();
                } catch (err) {
                    console.error('useGps error:', err);
                    toast.error('Erreur lors de la détection de zone.', { id: 'gps-locate' });
                } finally {
                    setGpsLoading(false);
                    resolve();
                }
            };

            const handleError = (error: GeolocationPositionError, isRetry = false) => {
                console.warn('GPS error:', error);
                if (!isRetry && error.code !== 1) {
                    // Fallback to high accuracy if low-power location is unavailable
                    navigator.geolocation.getCurrentPosition(
                        handleSuccess,
                        (fallbackErr) => handleError(fallbackErr, true),
                        { enableHighAccuracy: true, timeout: 6000, maximumAge: 0 }
                    );
                    return;
                }

                if (error.code === 1) {
                    toast.error("Accès GPS refusé. Veuillez autoriser la géolocalisation dans votre navigateur.", { id: 'gps-locate' });
                } else {
                    toast.error("Impossible d'accéder à votre position GPS. Veuillez choisir dans la liste.", { id: 'gps-locate' });
                }
                setGpsLoading(false);
                resolve();
            };

            // Request high-precision GPS directly (satellites on mobile, high-accuracy Wi-Fi scanning on desktop)
            navigator.geolocation.getCurrentPosition(
                handleSuccess,
                (err) => {
                    // If high accuracy times out, fallback to low accuracy
                    navigator.geolocation.getCurrentPosition(
                        handleSuccess,
                        (fallbackErr) => handleError(fallbackErr, true),
                        { enableHighAccuracy: false, timeout: 6000, maximumAge: 10000 }
                    );
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        });
    };

    // 8. On mount — auto-GPS logic based on permission state
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const nav = window.navigator as Navigator;
        if (!nav.geolocation) return;

        const geo = nav.geolocation;

        const doReverseAndApply = async (latitude: number, longitude: number, silent = false) => {
            const stored = localStorage.getItem('ahizan_client_location');
            const current = stored ? (JSON.parse(stored) as LocationData) : null;

            // If user has a manual location selected, NEVER overwrite with GPS!
            if (current && current.type !== 'GPS') {
                return;
            }

            lastAutoUpdateRef.current = { lat: latitude, lon: longitude };
            const loc = await reverseGeocode(latitude, longitude);
            loc.type = 'GPS';

            if (!stored || (current && current.type === 'GPS')) {
                _applyLocation(loc);
                if (!silent) toast.info(`📍 Zone mise à jour : ${loc.name}`, { duration: 4000 });
                startWatchPosition();
            }
        };

        const runAutoGps = (permState: PermissionState) => {
            const stored = localStorage.getItem('ahizan_client_location');
            const current = stored ? (JSON.parse(stored) as LocationData) : null;

            // If user has a manual selection, do not trigger auto-GPS
            if (current && current.type !== 'GPS') {
                return;
            }

            if (permState === 'granted') {
                // Already granted & GPS mode / no selection → silent position fix + watch
                geo.getCurrentPosition(
                    async (pos) => doReverseAndApply(pos.coords.latitude, pos.coords.longitude, true),
                    (err) => console.warn('Silent GPS init failed:', err),
                    { enableHighAccuracy: true, timeout: 9000, maximumAge: 0 }
                );
            } else if (permState === 'prompt' && !stored) {
                // Not yet asked AND no saved location → trigger native browser prompt automatically
                geo.getCurrentPosition(
                    async (pos) => doReverseAndApply(pos.coords.latitude, pos.coords.longitude, false),
                    (err) => console.info('Auto GPS prompt declined:', err.code),
                    { enableHighAccuracy: true, timeout: 15000 }
                );
            }
        };

        const tryDirectGps = () => {
            const stored = localStorage.getItem('ahizan_client_location');
            const current = stored ? (JSON.parse(stored) as LocationData) : null;
            if (!stored || current?.type === 'GPS') {
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
                        const stored = localStorage.getItem('ahizan_client_location');
                        const current = stored ? (JSON.parse(stored) as LocationData) : null;
                        if (!current || current.type === 'GPS') {
                            startWatchPosition();
                        }
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
            if (watchIdRef.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
                navigator.geolocation.clearWatch(watchIdRef.current);
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
                                const stored = localStorage.getItem('ahizan_client_location');
                                const current = stored ? (JSON.parse(stored) as LocationData) : null;
                                if (current && current.type !== 'GPS') {
                                    return;
                                }
                                const { latitude, longitude } = pos.coords;
                                const loc = await reverseGeocode(latitude, longitude);
                                loc.type = 'GPS';
                                if (stored) {
                                    if (current && current.id !== loc.id) {
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

        const handleFocus = () => {
            checkGpsAndUpdate();
        };
        window.addEventListener('focus', handleFocus);
        return () => {
            window.removeEventListener('focus', handleFocus);
        };
    }, []);


    return (
        <LocationContext.Provider value={{
            selectedLocation,
            markets,
            neighborhoods,
            cities,
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
