'use client';

import { useActionState, useEffect, useState, useRef, useTransition, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { updateVendorProfileAction, changePasswordAction } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Store, Shield, Globe, MapPin, Palette, Contact, Eye, CheckCircle2, RefreshCw, UploadCloud, Save, CreditCard, Landmark } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getAssetUrl } from '@/lib/vendure/api-utils';

interface AccountSettingsFormProps {
    vendor: any;
    initialMarkets?: any[];
    initialNeighborhoods?: any[];
}

export function AccountSettingsForm({ vendor, initialMarkets = [], initialNeighborhoods = [] }: AccountSettingsFormProps) {
    const router = useRouter();
    const [profileState, profileAction, isProfilePending] = useActionState<any, FormData>(updateVendorProfileAction, undefined);
    const [passwordState, passwordAction, isPasswordPending] = useActionState<any, FormData>(changePasswordAction, undefined);
    const [activeTab, setActiveTab] = useState('general');
    
    // Form dirtiness tracking
    const [isDirty, setIsDirty] = useState(false);
    const formRef = useRef<HTMLFormElement>(null);
    const initialValuesRef = useRef<Record<string, string>>({});

    // Visual Identity States (Banner & Logo previews)
    const [bannerUrl, setBannerUrl] = useState<string>(getAssetUrl(vendor?.coverImage?.preview) || 'https://lh3.googleusercontent.com/aida-public/AB6AXuB1uy1r93iwW9yNwkvjtjWpQtp-WgvPOWIixujkgolgJIoBIU2X528DvC-jLmqSQ5Uh5fcB-dh7kYg0MAcp3w3UeamQXVijk2sT1l9z8FC8ntzmQV_z4iuaFKQW-a5ReSPqA17DF6kl3OW6TdKjbGLECaSd_NJTOAr6BLAVSy16icuB2d23RDvBCBm6-jcImg5t0KR1KrW9cyJh2ld6C4Rj8nwpqYmYDyxSVEDcAAYYDmzWK7hldASxynb4Ms4djh7tHG_RHDWReJfV');
    const [logoUrl, setLogoUrl] = useState<string>(getAssetUrl(vendor?.logo?.preview) || '');
    const [isPublic, setIsPublic] = useState(true);

    const bannerInputRef = useRef<HTMLInputElement>(null);
    const logoInputRef = useRef<HTMLInputElement>(null);

    // Geolocation & Markets States
    const [leafletReady, setLeafletReady] = useState(false);
    const [lat, setLat] = useState<number | null>(vendor?.latitude || null);
    const [lng, setLng] = useState<number | null>(vendor?.longitude || null);
    const [markets, setMarkets] = useState<any[]>(initialMarkets || []);
    const [neighborhoods, setNeighborhoods] = useState<any[]>(initialNeighborhoods || []);
    const [locationsLoading, setLocationsLoading] = useState(false);
    const [debugLogs, setDebugLogs] = useState<string[]>(['Système de débogage initialisé']);

    const addDebugLog = (msg: string) => {
        const ts = new Date().toLocaleTimeString();
        setDebugLogs(prev => [`[${ts}] ${msg}`, ...prev.slice(0, 25)]);
    };

    // Payment Method selection state
    const [paymentMethod, setPaymentMethod] = useState<string>(vendor?.paymentMethod || 'CASH');

    const mapRef = useRef<any>(null);
    const markerRef = useRef<any>(null);
    const marketLayersRef = useRef<any[]>([]);
    // Stores coords requested before the map was initialized (e.g. GPS from another tab)
    const pendingPositionRef = useRef<{ lat: number; lng: number } | null>(null);

    // Selected markets for dynamic map rendering
    const [selectedPhysicalMarketId, setSelectedPhysicalMarketId] = useState<string>(vendor?.physicalMarket?.id || '');
    const [selectedSecondaryMarketIds, setSelectedSecondaryMarketIds] = useState<string[]>(
        vendor?.markets ? vendor.markets.map((m: any) => m.id) : []
    );

    // Load locations (markets & neighborhoods) from GraphQL Shop API
    useEffect(() => {
        const loadLocations = async () => {
            setLocationsLoading(true);
            const queryStr = `
                query GetLocationsForVendorSettings {
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
                const shopApiUrl = process.env.NEXT_PUBLIC_VENDURE_SHOP_API_URL || 'http://localhost:3000/shop-api';
                const res = await fetch(shopApiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ query: queryStr })
                });
                const result = await res.json();
                if (result.data?.markets && result.data.markets.length > 0) {
                    setMarkets(result.data.markets);
                } else if (initialMarkets && initialMarkets.length > 0) {
                    setMarkets(initialMarkets);
                }
                if (result.data?.geographicLocations && result.data.geographicLocations.length > 0) {
                    setNeighborhoods(result.data.geographicLocations);
                } else if (initialNeighborhoods && initialNeighborhoods.length > 0) {
                    setNeighborhoods(initialNeighborhoods);
                }
            } catch (err) {
                console.error('Failed to load locations in settings:', err);
                if (initialMarkets && initialMarkets.length > 0) setMarkets(initialMarkets);
                if (initialNeighborhoods && initialNeighborhoods.length > 0) setNeighborhoods(initialNeighborhoods);
            } finally {
                setLocationsLoading(false);
            }
        };
        loadLocations();
    }, [initialMarkets, initialNeighborhoods]);

    // Load Leaflet dynamically client-side
    useEffect(() => {
        if (typeof window === 'undefined') return;

        if ((window as any).L) {
            setLeafletReady(true);
            addDebugLog('Leaflet (window.L) déjà présent en mémoire');
            return;
        }

        addDebugLog('Chargement de Leaflet depuis le CDN...');
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);

        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.onload = () => {
            setLeafletReady(true);
            addDebugLog('Script Leaflet chargé avec succès');
        };
        script.onerror = () => {
            addDebugLog('Erreur lors du chargement du CDN Leaflet');
        };
        document.body.appendChild(script);
    }, []);

    // Initialize Leaflet Map Core Logic
    const initLeafletMap = useCallback(() => {
        if (!leafletReady || typeof window === 'undefined') {
            return false;
        }
        const L = (window as any).L;
        if (!L) {
            addDebugLog('Erreur Init: window.L introuvable');
            return false;
        }

        const mapContainer = document.getElementById('vendor-settings-map');
        if (!mapContainer) {
            return false;
        }
        if (mapRef.current) {
            mapRef.current.invalidateSize();
            return true;
        }

        addDebugLog(`Conteneur trouvé (${mapContainer.clientWidth}px x ${mapContainer.clientHeight}px). Initialisation...`);

        const pending = pendingPositionRef.current;
        const initLat = pending?.lat ?? lat ?? 6.37;
        const initLng = pending?.lng ?? lng ?? 2.42;
        const initZoom = pending ? 15 : 13;

        const map = L.map('vendor-settings-map').setView([initLat, initLng], initZoom);
        mapRef.current = map;
        addDebugLog(`L.map() créé avec succès. Centre: [${initLat.toFixed(4)}, ${initLng.toFixed(4)}]`);

        setTimeout(() => {
            if (mapRef.current) {
                mapRef.current.invalidateSize();
                addDebugLog('map.invalidateSize() exécuté (150ms)');
            }
        }, 150);
        setTimeout(() => {
            if (mapRef.current) {
                mapRef.current.invalidateSize();
                addDebugLog('map.invalidateSize() exécuté (450ms)');
            }
        }, 450);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);

        const pinIcon = L.icon({
            iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
            shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
        });

        const markerLat = pending?.lat ?? lat;
        const markerLng = pending?.lng ?? lng;
        if (markerLat && markerLng) {
            const marker = L.marker([markerLat, markerLng], { icon: pinIcon, draggable: true }).addTo(map);
            markerRef.current = marker;

            marker.on('dragend', () => {
                const position = marker.getLatLng();
                setLat(position.lat);
                setLng(position.lng);
                setIsDirty(true);
            });
        }

        pendingPositionRef.current = null;

        map.on('click', (e: any) => {
            const position = e.latlng;
            setLat(position.lat);
            setLng(position.lng);
            setIsDirty(true);

            if (markerRef.current) {
                markerRef.current.setLatLng(position);
            } else {
                const marker = L.marker([position.lat, position.lng], { icon: pinIcon, draggable: true }).addTo(map);
                markerRef.current = marker;

                marker.on('dragend', () => {
                    const pos = marker.getLatLng();
                    setLat(pos.lat);
                    setLng(pos.lng);
                    setIsDirty(true);
                });
            }
        });

        return true;
    }, [leafletReady, lat, lng, markets]);

    // Initialize Leaflet Map with polling retry loop when activeTab is localisation
    useEffect(() => {
        if (activeTab !== 'localisation' || !leafletReady) {
            return;
        }

        let timer: any;
        let attempts = 0;

        const tryCreateMap = () => {
            attempts++;
            const success = initLeafletMap();
            if (!success && attempts < 20) {
                if (attempts === 1 || attempts % 5 === 0) {
                    addDebugLog(`Attente conteneur DOM #vendor-settings-map (essai ${attempts}/20)...`);
                }
                timer = setTimeout(tryCreateMap, 100);
            } else if (!success) {
                addDebugLog('Erreur: #vendor-settings-map introuvable après 2 secondes');
            }
        };

        tryCreateMap();

        return () => {
            if (timer) clearTimeout(timer);
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
                markerRef.current = null;
            }
        };
    }, [activeTab, leafletReady, initLeafletMap]);

    const [gpsDetecting, setGpsDetecting] = useState(false);

    const updatePositionStateAndMap = (newLat: number, newLng: number) => {
        setLat(newLat);
        setLng(newLng);
        setIsDirty(true);

        if (mapRef.current) {
            // Map is already initialized: update it directly
            const newPos = [newLat, newLng];
            const L = (window as any).L;
            if (L) {
                if (markerRef.current) {
                    markerRef.current.setLatLng(newPos);
                } else {
                    const pinIcon = L.icon({
                        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
                        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
                        iconSize: [25, 41],
                        iconAnchor: [12, 41],
                        popupAnchor: [1, -34],
                        shadowSize: [41, 41]
                    });
                    markerRef.current = L.marker(newPos, { icon: pinIcon, draggable: true }).addTo(mapRef.current);
                    markerRef.current.on('dragend', () => {
                        const pos = markerRef.current.getLatLng();
                        setLat(pos.lat);
                        setLng(pos.lng);
                        setIsDirty(true);
                    });
                }
                mapRef.current.setView(newPos, 15);
            }
        } else {
            // Map not yet initialized (user is on another tab): store for later
            pendingPositionRef.current = { lat: newLat, lng: newLng };
        }
    };

    const detectCurrentPosition = () => {
        if (!navigator.geolocation) {
            toast.error("La géolocalisation n'est pas supportée par votre navigateur.");
            return;
        }
        setGpsDetecting(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                updatePositionStateAndMap(latitude, longitude);
                setGpsDetecting(false);
                toast.success("Position détectée avec succès !");
            },
            (error) => {
                setGpsDetecting(false);
                toast.error("Impossible de détecter la position : " + error.message);
            },
            { enableHighAccuracy: true, timeout: 8000 }
        );
    };

    // Dynamically display ONLY selected markets on the Leaflet map
    useEffect(() => {
        if (!mapRef.current || typeof window === 'undefined' || !(window as any).L) return;
        const L = (window as any).L;

        // Clean up previous market layers
        marketLayersRef.current.forEach(layer => {
            if (mapRef.current) mapRef.current.removeLayer(layer);
        });
        marketLayersRef.current = [];

        // Define icons
        const physicalMarketIcon = L.icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png',
            shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
        });

        const secondaryMarketIcon = L.icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
            shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
        });

        markets.forEach((m: any) => {
            const isPhysical = m.id === selectedPhysicalMarketId;
            const isSecondary = selectedSecondaryMarketIds.includes(m.id);

            if (isPhysical || isSecondary) {
                if (m.centerLatitude && m.centerLongitude) {
                    const markerIcon = isPhysical ? physicalMarketIcon : secondaryMarketIcon;
                    const markerTitle = isPhysical ? `<b>Marché Principal : ${m.name}</b>` : `<b>Marché Desservi : ${m.name}</b>`;
                    
                    const marker = L.marker([m.centerLatitude, m.centerLongitude], { icon: markerIcon })
                        .addTo(mapRef.current)
                        .bindPopup(`${markerTitle}<br/>Zone de chalandise : ${m.radiusMeters || 500}m`);
                    marketLayersRef.current.push(marker);

                    if (m.radiusMeters) {
                        const circle = L.circle([m.centerLatitude, m.centerLongitude], {
                            color: isPhysical ? '#f59e0b' : '#10b981',
                            fillColor: isPhysical ? '#f59e0b' : '#10b981',
                            fillOpacity: isPhysical ? 0.15 : 0.08,
                            weight: isPhysical ? 2 : 1,
                            radius: m.radiusMeters
                        }).addTo(mapRef.current);
                        marketLayersRef.current.push(circle);
                    }
                }
            }
        });
    }, [markets, selectedPhysicalMarketId, selectedSecondaryMarketIds, leafletReady, activeTab]);

    const handleLocationSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        if (!val) return;
        const matched = neighborhoods.find(n => n.id === val);
        if (matched && matched.centerLatitude && matched.centerLongitude) {
            updatePositionStateAndMap(matched.centerLatitude, matched.centerLongitude);
        }
    };

    const handlePhysicalMarketSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        setSelectedPhysicalMarketId(val);
        setIsDirty(true);
        if (!val) return;
        const matched = markets.find(m => m.id === val);
        if (matched && matched.centerLatitude && matched.centerLongitude) {
            updatePositionStateAndMap(matched.centerLatitude, matched.centerLongitude);
        }
    };

    const handleLatChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseFloat(e.target.value);
        const nextLat = isNaN(val) ? null : val;
        setLat(nextLat);
        setIsDirty(true);
        if (mapRef.current && nextLat !== null && lng !== null) {
            const newPos = [nextLat, lng];
            if (markerRef.current) {
                markerRef.current.setLatLng(newPos);
            } else {
                const L = (window as any).L;
                if (L) {
                    const pinIcon = L.icon({
                        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
                        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
                        iconSize: [25, 41],
                        iconAnchor: [12, 41],
                        popupAnchor: [1, -34],
                        shadowSize: [41, 41]
                    });
                    markerRef.current = L.marker(newPos, { icon: pinIcon, draggable: true }).addTo(mapRef.current);
                    markerRef.current.on('dragend', () => {
                        const position = markerRef.current.getLatLng();
                        setLat(position.lat);
                        setLng(position.lng);
                        setIsDirty(true);
                    });
                }
            }
            mapRef.current.setView(newPos, mapRef.current.getZoom());
        }
    };

    const handleLngChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseFloat(e.target.value);
        const nextLng = isNaN(val) ? null : val;
        setLng(nextLng);
        setIsDirty(true);
        if (mapRef.current && lat !== null && nextLng !== null) {
            const newPos = [lat, nextLng];
            if (markerRef.current) {
                markerRef.current.setLatLng(newPos);
            } else {
                const L = (window as any).L;
                if (L) {
                    const pinIcon = L.icon({
                        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
                        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
                        iconSize: [25, 41],
                        iconAnchor: [12, 41],
                        popupAnchor: [1, -34],
                        shadowSize: [41, 41]
                    });
                    markerRef.current = L.marker(newPos, { icon: pinIcon, draggable: true }).addTo(mapRef.current);
                    markerRef.current.on('dragend', () => {
                        const position = markerRef.current.getLatLng();
                        setLat(position.lat);
                        setLng(position.lng);
                        setIsDirty(true);
                    });
                }
            }
            mapRef.current.setView(newPos, mapRef.current.getZoom());
        }
    };

    // Capture initial values for dirty state comparison
    useEffect(() => {
        if (vendor) {
            const vals = {
                name: vendor.name || '',
                description: vendor.description || '',
                phoneNumber: vendor.phoneNumber || '',
                address: vendor.address || '',
                zone: vendor.zone || '',
                deliveryInfo: vendor.deliveryInfo || '',
                returnPolicy: vendor.returnPolicy || '',
                website: vendor.website || '',
                facebook: vendor.facebook || '',
                instagram: vendor.instagram || '',
                latitude: vendor.latitude ? String(vendor.latitude) : '',
                longitude: vendor.longitude ? String(vendor.longitude) : '',
                locationId: vendor.location?.id || '',
                physicalMarketId: vendor.physicalMarket?.id || '',
                marketIds: vendor.markets ? vendor.markets.map((m: any) => m.id).sort().join(',') : '',
                paymentMethod: vendor.paymentMethod || 'CASH',
                mobileMoneyProvider: vendor.mobileMoneyProvider || '',
                mobileMoneyNumber: vendor.mobileMoneyNumber || '',
                bankName: vendor.bankName || '',
                bankAccountNumber: vendor.bankAccountNumber || '',
            };
            initialValuesRef.current = vals;
            setPaymentMethod(vendor.paymentMethod || 'CASH');
        }
    }, [vendor]);

    // Handle hash change for tabs navigation
    useEffect(() => {
        const hash = window.location.hash.replace('#', '');
        if (hash && ['general', 'localisation', 'details', 'social', 'payment', 'security'].includes(hash)) {
            setActiveTab(hash === 'details' ? 'localisation' : hash);
        }

        const handleHashChange = () => {
            const newHash = window.location.hash.replace('#', '');
            if (newHash && ['general', 'localisation', 'details', 'social', 'payment', 'security'].includes(newHash)) {
                setActiveTab(newHash === 'details' ? 'localisation' : newHash);
            }
        };

        window.addEventListener('hashchange', handleHashChange);
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, []);

    // Form modification detection
    const handleFormChange = () => {
        if (!formRef.current) return;
        const formData = new FormData(formRef.current);
        
        let dirty = false;
        for (const [key, value] of Object.entries(initialValuesRef.current)) {
            if (key === 'marketIds') {
                const selected = formData.getAll('marketIds').sort().join(',');
                if (selected !== value) {
                    dirty = true;
                    break;
                }
                continue;
            }
            const currentValue = formData.get(key) as string;
            if (currentValue !== null && currentValue !== value) {
                dirty = true;
                break;
            }
        }
        setIsDirty(dirty);
    };

    // Actions state feedback
    useEffect(() => {
        if (profileState?.success) {
            toast.success('Profil mis à jour avec succès');
            setIsDirty(false);
            router.refresh();
        } else if (profileState?.error) {
            toast.error(profileState.error);
        }
    }, [profileState, router]);

    useEffect(() => {
        if (passwordState?.success) {
            toast.success('Mot de passe mis à jour avec succès');
            if (formRef.current) {
                const currentPass = formRef.current.querySelector('#currentPassword') as HTMLInputElement;
                const newPass = formRef.current.querySelector('#newPassword') as HTMLInputElement;
                const confirmPass = formRef.current.querySelector('#confirmPassword') as HTMLInputElement;
                if (currentPass) currentPass.value = '';
                if (newPass) newPass.value = '';
                if (confirmPass) confirmPass.value = '';
            }
            router.refresh();
        } else if (passwordState?.error) {
            toast.error(passwordState.error);
        }
    }, [passwordState, router]);

    // File upload previews (simulated client side for instant premium feel)
    const handleBannerFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            setBannerUrl(url);
            setIsDirty(true);
            toast.success('Bannière chargée temporairement (Aperçu)');
        }
    };

    const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            setLogoUrl(url);
            setIsDirty(true);
            toast.success('Logo chargé temporairement (Aperçu)');
        }
    };

    const triggerBannerUpload = () => bannerInputRef.current?.click();
    const triggerLogoUpload = () => logoInputRef.current?.click();

    // Trigger form submit via float footer
    const handleSaveClick = () => {
        if (formRef.current) {
            formRef.current.requestSubmit();
        }
    };

    const handleCancelClick = () => {
        if (formRef.current) {
            // Reset inputs to initial values
            for (const [key, value] of Object.entries(initialValuesRef.current)) {
                if (key === 'marketIds') {
                    const marketIdsArray = (value as string).split(',');
                    const checkboxes = formRef.current.querySelectorAll('input[name="marketIds"]') as NodeListOf<HTMLInputElement>;
                    checkboxes.forEach(cb => {
                        cb.checked = marketIdsArray.includes(cb.value);
                    });
                    continue;
                }
                const input = formRef.current.querySelector(`[name="${key}"]`) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
                if (input) input.value = value as string;
            }
            setLat(vendor?.latitude || null);
            setLng(vendor?.longitude || null);
            setPaymentMethod(vendor?.paymentMethod || 'CASH');
            
            // Move marker back to initial
            if (markerRef.current) {
                if (vendor?.latitude && vendor?.longitude) {
                    markerRef.current.setLatLng([vendor.latitude, vendor.longitude]);
                    mapRef.current?.setView([vendor.latitude, vendor.longitude], 13);
                } else {
                    mapRef.current?.removeLayer(markerRef.current);
                    markerRef.current = null;
                }
            }

            setIsDirty(false);
            toast.info('Modifications annulées');
        }
    };

    const calculateProgress = () => {
        let score = 0;
        if (vendor?.name) score += 10;
        if (vendor?.phoneNumber) score += 15;
        if (vendor?.address) score += 15;
        if (vendor?.description) score += 10;
        if (vendor?.logo?.preview || logoUrl) score += 15;
        if (bannerUrl && bannerUrl !== 'https://lh3.googleusercontent.com/aida-public/AB6AXuB1uy1r93iwW9yNwkvjtjWpQtp-WgvPOWIixujkgolgJIoBIU2X528DvC-jLmqSQ5Uh5fcB-dh7kYg0MAcp3w3UeamQXVijk2sT1l9z8FC8ntzmQV_z4iuaFKQW-a5ReSPqA17DF6kl3OW6TdKjbGLECaSd_NJTOAr6BLAVSy16icuB2d23RDvBCBm6-jcImg5t0KR1KrW9cyJh2ld6C4Rj8nwpqYmYDyxSVEDcAAYYDmzWK7hldASxynb4Ms4djh7tHG_RHDWReJfV') score += 15;
        if (lat && lng) score += 10;
        if (vendor?.location?.id || vendor?.physicalMarket?.id || (vendor?.markets && vendor.markets.length > 0)) score += 10;
        return score;
    };

    const progress = calculateProgress();

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
            {/* Onboarding Progress Header Card */}
            <Card className="border border-border shadow-sm bg-card rounded-2xl md:rounded-[2rem] overflow-hidden">
                <CardContent className="p-6 md:p-8 flex flex-col md:flex-row items-center gap-6">
                    <div className="relative w-20 h-20 shrink-0 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90">
                            <circle
                                cx="40"
                                cy="40"
                                r="34"
                                stroke="#e2e8f0"
                                strokeWidth="6"
                                fill="transparent"
                            />
                            <circle
                                cx="40"
                                cy="40"
                                r="34"
                                stroke="#e31837"
                                strokeWidth="6"
                                fill="transparent"
                                strokeDasharray={2 * Math.PI * 34}
                                strokeDashoffset={2 * Math.PI * 34 * (1 - progress / 100)}
                                className="transition-all duration-1000 ease-out"
                            />
                        </svg>
                        <span className="absolute text-sm font-black text-foreground font-mono">{progress}%</span>
                    </div>
                    <div className="flex-1 text-center md:text-left space-y-2 w-full">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-2">
                                <h2 className="text-lg font-serif font-black text-foreground">Complétude de votre Profil Vendeur</h2>
                                {progress === 100 ? (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase tracking-wider">
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        Profil Finalisé
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-amber-500/10 text-amber-500 text-[10px] font-black uppercase tracking-wider">
                                        En cours d'onboarding ({progress}%)
                                    </span>
                                )}
                            </div>
                            <span className="text-xs font-black text-[#e31837] font-mono">{progress}% complet</span>
                        </div>
                        {/* Horizontal progress bar */}
                        <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-[#e31837] transition-all duration-1000 ease-out" 
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {progress === 100 
                                ? "Félicitations ! Votre profil est complet et optimisé pour la livraison et la visibilité locale." 
                                : "Complétez votre adresse, position GPS, marchés de diffusion et modes de paiement pour maximiser vos ventes."}
                        </p>
                    </div>
                </CardContent>
            </Card>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <div className="flex flex-col lg:flex-row gap-8">
                    
                    {/* Left Navigation Menu */}
                    <aside className="w-full lg:w-52 shrink-0 overflow-x-auto lg:overflow-visible custom-scrollbar">
                        <TabsList className="flex flex-row lg:flex-col h-auto bg-transparent border-none p-0 space-x-1 lg:space-x-0 lg:space-y-1">
                            <TabsTrigger 
                                value="general" 
                                className="w-auto lg:w-full justify-start gap-3 px-4 py-3 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white transition-all text-muted-foreground hover:bg-muted font-bold text-xs uppercase tracking-wider shrink-0"
                            >
                                <Store className="w-4 h-4 shrink-0" />
                                <span className="whitespace-nowrap">Boutique</span>
                            </TabsTrigger>
                            <TabsTrigger 
                                value="localisation" 
                                className="w-auto lg:w-full justify-start gap-3 px-4 py-3 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white transition-all text-muted-foreground hover:bg-muted font-bold text-xs uppercase tracking-wider shrink-0"
                            >
                                <MapPin className="w-4 h-4 shrink-0" />
                                <span className="whitespace-nowrap">Localisation</span>
                            </TabsTrigger>
                            <TabsTrigger 
                                value="social" 
                                className="w-auto lg:w-full justify-start gap-3 px-4 py-3 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white transition-all text-muted-foreground hover:bg-muted font-bold text-xs uppercase tracking-wider shrink-0"
                            >
                                <Globe className="w-4 h-4 shrink-0" />
                                <span className="whitespace-nowrap">Sociaux</span>
                            </TabsTrigger>
                            <TabsTrigger 
                                value="payment" 
                                className="w-auto lg:w-full justify-start gap-3 px-4 py-3 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white transition-all text-muted-foreground hover:bg-muted font-bold text-xs uppercase tracking-wider shrink-0"
                            >
                                <CreditCard className="w-4 h-4 shrink-0" />
                                <span className="whitespace-nowrap">Paiements</span>
                            </TabsTrigger>
                            <TabsTrigger 
                                value="security" 
                                className="w-auto lg:w-full justify-start gap-3 px-4 py-3 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white transition-all text-muted-foreground hover:bg-muted font-bold text-xs uppercase tracking-wider shrink-0"
                            >
                                <Shield className="w-4 h-4 shrink-0" />
                                <span className="whitespace-nowrap">Sécurité</span>
                            </TabsTrigger>
                        </TabsList>
                    </aside>

                    {/* Middle Bento Form Fields (7 Cols equivalent) */}
                    <div className="flex-1 min-w-0">
                        <form ref={formRef} action={profileAction} onChange={handleFormChange}>
                            
                            {/* Tab 1: Identity/General */}
                            <TabsContent value="general" className="m-0 space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                
                                {/* Visual Identity Card */}
                                <Card className="border border-border shadow-sm bg-card rounded-2xl md:rounded-[2rem] overflow-hidden">
                                    <CardHeader className="p-6 sm:p-8 pb-4">
                                        <CardTitle className="text-xl md:text-2xl font-serif font-black flex items-center gap-2">
                                            <Palette className="w-5 h-5 text-primary" />
                                            Identité visuelle de votre boutique
                                        </CardTitle>
                                        <CardDescription className="text-[10px] uppercase font-black tracking-wider text-muted-foreground">
                                            Gérez la bannière et le logo public.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="p-6 sm:p-8 pt-0 space-y-6">
                                        
                                        {/* Banner Upload Section */}
                                        <div className="relative">
                                            <label className="block text-[10px] font-black uppercase mb-2 text-muted-foreground tracking-wider">
                                                Bannière de la boutique
                                            </label>
                                            <div 
                                                onClick={triggerBannerUpload}
                                                className="w-full h-44 rounded-xl bg-muted overflow-hidden group relative cursor-pointer border border-border border-dashed hover:border-primary/50 transition-all"
                                            >
                                                <div 
                                                    className="w-full h-full bg-cover bg-center opacity-70 group-hover:opacity-50 transition-opacity" 
                                                    style={{ backgroundImage: `url('${bannerUrl}')` }}
                                                />
                                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                                    <UploadCloud className="w-8 h-8 text-foreground/80 group-hover:scale-110 transition-transform duration-300" />
                                                    <span className="text-xs font-bold text-foreground mt-2 bg-card/80 px-3 py-1.5 rounded-lg border shadow-sm">
                                                        Cliquez pour charger une bannière
                                                    </span>
                                                </div>
                                                <input 
                                                    type="file" 
                                                    ref={bannerInputRef} 
                                                    onChange={handleBannerFileChange} 
                                                    accept="image/*" 
                                                    className="hidden" 
                                                    name="coverImage"
                                                />
                                            </div>
                                        </div>

                                        <div className="flex flex-col sm:flex-row gap-6 items-start">
                                            
                                            {/* Logo Upload Section */}
                                            <div className="flex-shrink-0 w-full sm:w-auto">
                                                <label className="block text-[10px] font-black uppercase mb-2 text-muted-foreground tracking-wider">
                                                    Logo
                                                </label>
                                                <div 
                                                    onClick={triggerLogoUpload}
                                                    className="w-32 h-32 mx-auto sm:mx-0 rounded-2xl bg-muted border border-border border-dashed flex items-center justify-center cursor-pointer group hover:border-primary/50 transition-all overflow-hidden relative shadow-inner"
                                                >
                                                    {logoUrl ? (
                                                        <img src={logoUrl} alt="Logo Preview" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="flex flex-col items-center justify-center text-muted-foreground text-center p-2">
                                                            <UploadCloud className="w-6 h-6 mb-1 text-muted-foreground group-hover:text-primary transition-colors" />
                                                            <span className="text-[9px] font-bold uppercase tracking-wider">Logo 128x128</span>
                                                        </div>
                                                    )}
                                                    <div className="absolute inset-0 bg-primary/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <span className="text-[10px] font-black text-primary uppercase tracking-widest bg-white/90 px-2 py-1 rounded border shadow-sm">Modifier</span>
                                                    </div>
                                                    <input 
                                                        type="file" 
                                                        ref={logoInputRef} 
                                                        onChange={handleLogoFileChange} 
                                                        accept="image/*" 
                                                        className="hidden" 
                                                        name="logo"
                                                    />
                                                </div>
                                            </div>

                                            {/* Core Info Inputs with micro-animations */}
                                            <div className="flex-1 w-full space-y-6">
                                                <div className="space-y-2 group">
                                                    <Label htmlFor="name" className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Nom de la boutique</Label>
                                                    <Input 
                                                        id="name" 
                                                        name="name" 
                                                        defaultValue={vendor?.name} 
                                                        className="h-12 rounded-xl bg-card border-border focus-visible:ring-2 focus-visible:ring-primary/10 transition-all duration-300 focus-visible:scale-[1.01]" 
                                                    />
                                                </div>
                                                <div className="space-y-2 group">
                                                    <Label htmlFor="description" className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Description professionnelle</Label>
                                                    <Textarea 
                                                        id="description" 
                                                        name="description" 
                                                        defaultValue={vendor?.description} 
                                                        rows={4} 
                                                        className="rounded-xl bg-card border-border resize-none focus-visible:ring-2 focus-visible:ring-primary/10 transition-all duration-300 focus-visible:scale-[1.01]" 
                                                        placeholder="Décrivez l'activité, l'expertise et la vision de votre boutique..."
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                    </CardContent>
                                </Card>

                                {/* Contact Card */}
                                <Card className="border border-border shadow-sm bg-card rounded-2xl md:rounded-[2rem]">
                                    <CardHeader className="p-6 sm:p-8 pb-4">
                                        <CardTitle className="text-xl md:text-2xl font-serif font-black flex items-center gap-2">
                                            <Contact className="w-5 h-5 text-primary" />
                                            Coordonnées
                                        </CardTitle>
                                        <CardDescription className="text-[10px] uppercase font-black tracking-wider text-muted-foreground">
                                            Informations de contact public et marchand.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="p-6 sm:p-8 pt-0">
                                        <div className="space-y-2">
                                            <Label htmlFor="phoneNumber" className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Téléphone de contact</Label>
                                            <Input 
                                                id="phoneNumber" 
                                                name="phoneNumber" 
                                                type="tel"
                                                defaultValue={vendor?.phoneNumber} 
                                                className="h-12 rounded-xl bg-card border-border focus-visible:ring-2 focus-visible:ring-primary/10 transition-all duration-300 focus-visible:scale-[1.01]" 
                                            />
                                        </div>
                                    </CardContent>
                                </Card>

                            </TabsContent>

                            {/* Tab 2: Location/Details */}
                            <TabsContent value="localisation" className="m-0 space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                <Card className="border border-border shadow-sm bg-card rounded-2xl md:rounded-[2rem]">
                                    <CardHeader className="p-6 sm:p-8 pb-4">
                                        <CardTitle className="text-xl md:text-2xl font-serif font-black flex items-center gap-2">
                                            <MapPin className="w-5 h-5 text-primary" />
                                            Localisation & Expéditions
                                        </CardTitle>
                                        <CardDescription className="text-[10px] uppercase font-black tracking-wider text-muted-foreground">
                                            Gérez votre adresse physique et vos politiques.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="p-6 sm:p-8 pt-0 space-y-6">
                                        <div className="space-y-6">
                                            <div className="space-y-2">
                                                <Label htmlFor="address" className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Adresse de la boutique</Label>
                                                <Input 
                                                    id="address" 
                                                    name="address" 
                                                    defaultValue={vendor?.address} 
                                                    className="h-12 rounded-xl bg-card border-border focus-visible:ring-2 focus-visible:ring-primary/10 transition-all duration-300 focus-visible:scale-[1.01]" 
                                                />
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="zone" className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Zone géographique (Ville, Pays)</Label>
                                                    <Input 
                                                        id="zone" 
                                                        name="zone" 
                                                        defaultValue={vendor?.zone} 
                                                        className="h-12 rounded-xl bg-card border-border focus-visible:ring-2 focus-visible:ring-primary/10 transition-all duration-300 focus-visible:scale-[1.01]" 
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="type" className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Type de marchand</Label>
                                                    <Input 
                                                        id="type" 
                                                        name="type" 
                                                        defaultValue={vendor?.type || 'ONLINE'} 
                                                        className="h-12 rounded-xl bg-muted/60 text-muted-foreground border-border cursor-not-allowed font-bold text-xs tracking-wider" 
                                                        readOnly 
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="deliveryInfo" className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Politiques et informations de livraison</Label>
                                                <Textarea 
                                                    id="deliveryInfo" 
                                                    name="deliveryInfo" 
                                                    defaultValue={vendor?.deliveryInfo} 
                                                    rows={3} 
                                                    className="rounded-xl bg-card border-border resize-none focus-visible:ring-2 focus-visible:ring-primary/10 transition-all duration-300 focus-visible:scale-[1.01]" 
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="returnPolicy" className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Politique de retour et remboursement</Label>
                                                <Textarea 
                                                    id="returnPolicy" 
                                                    name="returnPolicy" 
                                                    defaultValue={vendor?.returnPolicy} 
                                                    rows={3} 
                                                    className="rounded-xl bg-card border-border resize-none focus-visible:ring-2 focus-visible:ring-primary/10 transition-all duration-300 focus-visible:scale-[1.01]" 
                                                />
                                            </div>

                                            <div className="border-t border-border/60 pt-6 space-y-4">
                                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                                    <div>
                                                        <h3 className="text-base font-serif font-black text-foreground">Position Géographique</h3>
                                                        <p className="text-xs text-muted-foreground">
                                                            Cliquez sur la carte, déplacez le marqueur ou entrez vos coordonnées ci-dessous.
                                                        </p>
                                                    </div>
                                                    <Button
                                                        type="button"
                                                        onClick={detectCurrentPosition}
                                                        disabled={gpsDetecting}
                                                        className="h-10 px-4 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all active:scale-95 shadow-md shrink-0"
                                                    >
                                                        {gpsDetecting ? (
                                                            <>
                                                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                                                Détection...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <MapPin className="w-3.5 h-3.5" />
                                                                Ma Position Actuelle
                                                            </>
                                                        )}
                                                    </Button>
                                                </div>
                                                
                                                <div id="vendor-settings-map" className="h-64 w-full rounded-2xl border border-border overflow-hidden bg-muted relative" style={{ minHeight: '260px', zIndex: 10 }}>
                                                    {!leafletReady && (
                                                        <div className="absolute inset-0 flex items-center justify-center bg-card/60 backdrop-blur-sm z-[20]">
                                                            <div className="flex flex-col items-center gap-2">
                                                                <RefreshCw className="w-6 h-6 animate-spin text-primary" />
                                                                <span className="text-xs text-muted-foreground font-bold">Chargement de la carte...</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
  
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <Label htmlFor="latitude-input" className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Latitude GPS</Label>
                                                        <Input
                                                            id="latitude-input"
                                                            type="number"
                                                            step="any"
                                                            name="latitude"
                                                            value={lat !== null ? lat : ''}
                                                            onChange={handleLatChange}
                                                            className="h-12 rounded-xl bg-card border-border font-mono text-xs focus-visible:ring-2 focus-visible:ring-primary/10 transition-all duration-300 focus-visible:scale-[1.01]"
                                                            placeholder="Ex: 6.370000"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label htmlFor="longitude-input" className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Longitude GPS</Label>
                                                        <Input
                                                            id="longitude-input"
                                                            type="number"
                                                            step="any"
                                                            name="longitude"
                                                            value={lng !== null ? lng : ''}
                                                            onChange={handleLngChange}
                                                            className="h-12 rounded-xl bg-card border-border font-mono text-xs focus-visible:ring-2 focus-visible:ring-primary/10 transition-all duration-300 focus-visible:scale-[1.01]"
                                                            placeholder="Ex: 2.420000"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
 
                                            <div className="border-t border-border/60 pt-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
                                                <div className="space-y-2">
                                                    <Label htmlFor="locationId" className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Quartier / Arrondissement de résidence</Label>
                                                    <select
                                                        id="locationId"
                                                        name="locationId"
                                                        defaultValue={vendor?.location?.id || ''}
                                                        onChange={handleLocationSelect}
                                                        className="w-full h-12 px-4 rounded-xl bg-card border border-border text-xs font-bold outline-none focus:ring-2 focus:ring-primary/10 transition-all duration-300"
                                                    >
                                                        <option value="">Sélectionnez votre quartier...</option>
                                                        {neighborhoods.map((n: any) => (
                                                            <option key={n.id} value={n.id}>{n.name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="physicalMarketId" className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Marché principal (Boutique physique)</Label>
                                                    <select
                                                        id="physicalMarketId"
                                                        name="physicalMarketId"
                                                        value={selectedPhysicalMarketId}
                                                        onChange={handlePhysicalMarketSelect}
                                                        className="w-full h-12 px-4 rounded-xl bg-card border border-border text-xs font-bold outline-none focus:ring-2 focus:ring-primary/10 transition-all duration-300"
                                                    >
                                                        <option value="">Hors marché (Vendeur en ligne / Domicile)</option>
                                                        {markets.map((m: any) => (
                                                            <option key={m.id} value={m.id}>{m.name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>

                                            <div className="border-t border-border/60 pt-6 space-y-3">
                                                <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Marchés de diffusion secondaire (diffusion de vos produits)</Label>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 p-4 rounded-2xl bg-muted/10 border border-border max-h-60 overflow-y-auto">
                                                    {markets.map(m => {
                                                        const isChecked = selectedSecondaryMarketIds.includes(m.id);
                                                        return (
                                                            <label key={m.id} className="flex items-center gap-3 p-2.5 rounded-xl border border-border/60 hover:bg-card cursor-pointer transition-colors text-xs font-bold text-foreground">
                                                                <input 
                                                                    type="checkbox" 
                                                                    name="marketIds" 
                                                                    value={m.id} 
                                                                    checked={isChecked}
                                                                    onChange={(e) => {
                                                                        if (e.target.checked) {
                                                                            setSelectedSecondaryMarketIds(prev => [...prev, m.id]);
                                                                        } else {
                                                                            setSelectedSecondaryMarketIds(prev => prev.filter(id => id !== m.id));
                                                                        }
                                                                        setIsDirty(true);
                                                                    }}
                                                                    className="w-4 h-4 rounded text-primary focus:ring-primary border-border"
                                                                />
                                                                <span>{m.name}</span>
                                                            </label>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            {/* Tab 3: Social/Web */}
                            <TabsContent value="social" className="m-0 space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                <Card className="border border-border shadow-sm bg-card rounded-2xl md:rounded-[2rem]">
                                    <CardHeader className="p-6 sm:p-8 pb-4">
                                        <CardTitle className="text-xl md:text-2xl font-serif font-black flex items-center gap-2">
                                            <Globe className="w-5 h-5 text-primary" />
                                            Liens & Réseaux Sociaux
                                        </CardTitle>
                                        <CardDescription className="text-[10px] uppercase font-black tracking-wider text-muted-foreground">
                                            Associez votre e-boutique à vos canaux digitaux.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="p-6 sm:p-8 pt-0 space-y-6">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <Label htmlFor="website" className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Site Internet officiel</Label>
                                                <Input 
                                                    id="website" 
                                                    name="website" 
                                                    placeholder="https://www.votresite.com"
                                                    defaultValue={vendor?.website} 
                                                    className="h-12 rounded-xl bg-card border-border focus-visible:ring-2 focus-visible:ring-primary/10 transition-all duration-300 focus-visible:scale-[1.01]" 
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="facebook" className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Page Facebook (URL)</Label>
                                                <Input 
                                                    id="facebook" 
                                                    name="facebook" 
                                                    placeholder="https://facebook.com/nom_boutique"
                                                    defaultValue={vendor?.facebook} 
                                                    className="h-12 rounded-xl bg-card border-border focus-visible:ring-2 focus-visible:ring-primary/10 transition-all duration-300 focus-visible:scale-[1.01]" 
                                                />
                                            </div>
                                            <div className="space-y-2 sm:col-span-2">
                                                <Label htmlFor="instagram" className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Compte Instagram (URL)</Label>
                                                <Input 
                                                    id="instagram" 
                                                    name="instagram" 
                                                    placeholder="https://instagram.com/nom_boutique"
                                                    defaultValue={vendor?.instagram} 
                                                    className="h-12 rounded-xl bg-card border-border focus-visible:ring-2 focus-visible:ring-primary/10 transition-all duration-300 focus-visible:scale-[1.01]" 
                                                />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            {/* Tab 4: Payments Configuration */}
                            <TabsContent value="payment" className="m-0 space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                <Card className="border border-border shadow-sm bg-card rounded-2xl md:rounded-[2rem]">
                                    <CardHeader className="p-6 sm:p-8 pb-4">
                                        <CardTitle className="text-xl md:text-2xl font-serif font-black flex items-center gap-2">
                                            <CreditCard className="w-5 h-5 text-primary" />
                                            Modes de Règlement Acceptés
                                        </CardTitle>
                                        <CardDescription className="text-[10px] uppercase font-black tracking-wider text-muted-foreground">
                                            Configurez comment vous souhaitez encaisser vos ventes.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="p-6 sm:p-8 pt-0 space-y-6">
                                        <div className="space-y-6">
                                            {/* Mandatory Cash on Delivery */}
                                            <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 flex items-start gap-3">
                                                <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                                                <div>
                                                    <h4 className="text-xs font-bold text-foreground uppercase tracking-wide">Paiement en espèces à la livraison (CoD)</h4>
                                                    <p className="text-[10.5px] text-muted-foreground mt-0.5">
                                                        Ce mode de règlement est activé par défaut et obligatoire pour garantir la meilleure expérience de livraison de proximité sur Ahizan.
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Select Primary Method */}
                                            <div className="space-y-2">
                                                <Label htmlFor="paymentMethod" className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Méthode de paiement alternative principale</Label>
                                                <select
                                                    id="paymentMethod"
                                                    name="paymentMethod"
                                                    value={paymentMethod}
                                                    onChange={(e) => setPaymentMethod(e.target.value)}
                                                    className="w-full h-12 px-4 rounded-xl bg-card border border-border text-xs font-bold outline-none focus:ring-2 focus:ring-primary/10 transition-all duration-300"
                                                >
                                                    <option value="CASH">Espèces uniquement (Livraison)</option>
                                                    <option value="MOBILE_MONEY">Mobile Money (MTN, Moov, Celtiis)</option>
                                                    <option value="BANK_TRANSFER">Virement bancaire</option>
                                                </select>
                                            </div>

                                            {/* Mobile Money Details */}
                                            {paymentMethod === 'MOBILE_MONEY' && (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5 rounded-2xl bg-muted/20 border border-border animate-in fade-in slide-in-from-top-4 duration-300">
                                                    <div className="space-y-2">
                                                        <Label htmlFor="mobileMoneyProvider" className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Opérateur Mobile Money</Label>
                                                        <select
                                                            id="mobileMoneyProvider"
                                                            name="mobileMoneyProvider"
                                                            defaultValue={vendor?.mobileMoneyProvider || 'MTN'}
                                                            className="w-full h-12 px-4 rounded-xl bg-card border border-border text-xs font-bold outline-none focus:ring-2 focus:ring-primary/10 transition-all duration-300"
                                                        >
                                                            <option value="MTN">MTN Mobile Money (Momo)</option>
                                                            <option value="MOOV">Moov Money (Flooz)</option>
                                                            <option value="CELTIIS">Celtiis Cash</option>
                                                        </select>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label htmlFor="mobileMoneyNumber" className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Numéro de téléphone Momo</Label>
                                                        <Input
                                                            id="mobileMoneyNumber"
                                                            name="mobileMoneyNumber"
                                                            placeholder="Ex: 61002233"
                                                            defaultValue={vendor?.mobileMoneyNumber}
                                                            className="h-12 rounded-xl bg-card border-border focus-visible:ring-2 focus-visible:ring-primary/10 transition-all duration-300 focus-visible:scale-[1.01]"
                                                        />
                                                    </div>
                                                </div>
                                            )}

                                            {/* Bank Transfer Details */}
                                            {paymentMethod === 'BANK_TRANSFER' && (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5 rounded-2xl bg-muted/20 border border-border animate-in fade-in slide-in-from-top-4 duration-300">
                                                    <div className="space-y-2">
                                                        <Label htmlFor="bankName" className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Nom de la Banque</Label>
                                                        <Input
                                                            id="bankName"
                                                            name="bankName"
                                                            placeholder="Ex: BOA, Ecobank, UBA..."
                                                            defaultValue={vendor?.bankName}
                                                            className="h-12 rounded-xl bg-card border-border focus-visible:ring-2 focus-visible:ring-primary/10 transition-all duration-300 focus-visible:scale-[1.01]"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label htmlFor="bankAccountNumber" className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Numéro de Compte Bancaire / RIB</Label>
                                                        <Input
                                                            id="bankAccountNumber"
                                                            name="bankAccountNumber"
                                                            placeholder="Ex: BJ062 01001 0023456701 45"
                                                            defaultValue={vendor?.bankAccountNumber}
                                                            className="h-12 rounded-xl bg-card border-border focus-visible:ring-2 focus-visible:ring-primary/10 transition-all duration-300 focus-visible:scale-[1.01]"
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>
                            <div className="pt-6 mt-6 border-t border-border flex justify-end">
                                <Button 
                                    type="submit" 
                                    disabled={isProfilePending} 
                                    className="h-12 px-8 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold flex items-center gap-2 uppercase text-xs tracking-widest transition-all active:scale-95 shadow-lg shadow-primary/20 cursor-pointer"
                                >
                                    {isProfilePending ? (
                                        <>
                                            <RefreshCw className="w-4 h-4 animate-spin" />
                                            Enregistrement...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-4 h-4" />
                                            Enregistrer les paramètres
                                        </>
                                    )}
                                </Button>
                            </div>
                        </form>

                        {/* Tab 4: Security (handled via its own form submission) */}
                        <TabsContent value="security" className="m-0 space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <form action={passwordAction} className="space-y-6">
                                <Card className="border border-border shadow-sm bg-card rounded-2xl md:rounded-[2rem]">
                                    <CardHeader className="p-6 sm:p-8 pb-4">
                                        <CardTitle className="text-xl md:text-2xl font-serif font-black flex items-center gap-2">
                                            <Shield className="w-5 h-5 text-primary" />
                                            Sécurité du compte
                                        </CardTitle>
                                        <CardDescription className="text-[10px] uppercase font-black tracking-wider text-muted-foreground">
                                            Mettez à jour vos identifiants de connexion.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="p-6 sm:p-8 pt-0 space-y-6">
                                        <div className="grid grid-cols-1 gap-6 max-w-md">
                                            <div className="space-y-2">
                                                <Label htmlFor="currentPassword" className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Mot de passe actuel</Label>
                                                <Input 
                                                    id="currentPassword" 
                                                    name="currentPassword" 
                                                    type="password" 
                                                    className="h-12 rounded-xl bg-card border-border focus-visible:ring-2 focus-visible:ring-primary/10 transition-all duration-300 focus-visible:scale-[1.01]" 
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="newPassword" className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Nouveau mot de passe</Label>
                                                <Input 
                                                    id="newPassword" 
                                                    name="newPassword" 
                                                    type="password" 
                                                    className="h-12 rounded-xl bg-card border-border focus-visible:ring-2 focus-visible:ring-primary/10 transition-all duration-300 focus-visible:scale-[1.01]" 
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="confirmPassword" className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Confirmer le nouveau mot de passe</Label>
                                                <Input 
                                                    id="confirmPassword" 
                                                    name="confirmPassword" 
                                                    type="password" 
                                                    className="h-12 rounded-xl bg-card border-border focus-visible:ring-2 focus-visible:ring-primary/10 transition-all duration-300 focus-visible:scale-[1.01]" 
                                                />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                                <Button 
                                    type="submit" 
                                    disabled={isPasswordPending} 
                                    className="h-12 px-8 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold ml-auto flex items-center gap-2 uppercase text-[10px] tracking-widest transition-all active:scale-95 shadow-md"
                                >
                                    {isPasswordPending ? (
                                        <>
                                            <RefreshCw className="w-4 h-4 animate-spin" />
                                            Mise à jour...
                                        </>
                                    ) : (
                                        'Changer le mot de passe'
                                    )}
                                </Button>
                            </form>
                        </TabsContent>
                    </div>

                    {/* Right Sidebar Column (4 Cols equivalent) */}
                    <aside className="w-full lg:w-72 space-y-6">
                        
                        {/* Shop Status Card */}
                        <Card className="border border-border shadow-sm bg-card rounded-2xl overflow-hidden">
                            <CardHeader className="p-5 pb-3">
                                <h3 className="text-sm font-black uppercase tracking-wider text-foreground">Statut de la boutique</h3>
                            </CardHeader>
                            <CardContent className="p-5 pt-0 space-y-4">
                                <div className="flex items-center justify-between p-3.5 bg-muted/40 rounded-xl border border-border/50">
                                    <span className="text-xs font-semibold text-foreground">Visibilité publique</span>
                                    
                                    {/* Toggle Switch */}
                                    <button 
                                        type="button"
                                        onClick={() => {
                                            setIsPublic(!isPublic);
                                            toast.info(isPublic ? 'Boutique masquée du public (simulation)' : 'Boutique mise en ligne (simulation)');
                                        }}
                                        className={cn(
                                            "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                                            isPublic ? "bg-primary" : "bg-slate-250 dark:bg-slate-800"
                                        )}
                                    >
                                        <span 
                                            className={cn(
                                                "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                                                isPublic ? "translate-x-5" : "translate-x-0"
                                            )}
                                        />
                                    </button>
                                </div>
                                <div className="p-4 bg-tertiary/5 text-tertiary rounded-xl border border-tertiary/10 text-xs leading-relaxed font-medium">
                                    Votre boutique est actuellement en ligne. Toutes les modifications textuelles et réseaux s'appliqueront instantanément au profil public.
                                </div>
                            </CardContent>
                        </Card>

                        {/* Public Preview Card */}
                        <Card className="border border-border shadow-sm bg-card rounded-2xl overflow-hidden text-center p-6 flex flex-col items-center">
                            <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-5 self-start">Aperçu rapide</h3>
                            <div className="w-20 h-20 rounded-full bg-muted shadow-inner mb-4 flex items-center justify-center overflow-hidden border border-border/75">
                                {logoUrl ? (
                                    <img src={logoUrl} alt="Store logo" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-lg font-black text-muted-foreground">
                                        {vendor?.name ? vendor.name.substring(0, 2).toUpperCase() : 'AH'}
                                    </span>
                                )}
                            </div>
                            <div className="font-serif font-black text-base text-foreground leading-tight">{vendor?.name || 'Boutique'}</div>
                            <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mt-1 flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5 text-primary" />
                                {vendor?.zone || 'Bénin'}
                            </div>
                            
                            <Button 
                                variant="link" 
                                className="text-primary font-bold text-xs uppercase tracking-wider mt-5 hover:underline flex items-center gap-1.5"
                                onClick={() => toast.info('Affichage du profil public')}
                            >
                                <Eye className="w-4 h-4" />
                                Voir mon profil public
                            </Button>
                        </Card>
                    </aside>

                </div>
            </Tabs>



        </div>
    );
}
