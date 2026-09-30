'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { MasterProductCard } from '@/components/commerce/master-product-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
    MapPin, 
    Navigation, 
    Search, 
    Clock, 
    CheckCircle2, 
    Star, 
    Building2, 
    Compass, 
    MessageCircle,
    AlertCircle
} from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useLocation } from '@/contexts/location-context';
import { getAssetUrl } from '@/lib/vendure/api-utils';
import { calculateDistanceKm } from '@/lib/vendure/display-engine';
import { BodySectionRenderer } from '@/components/ahizan/BodySectionRenderer';
import { encodeId } from '@/lib/hash-utils';

interface LocalDiscoveryClientProps {
    initialProducts: any[];
    markets: any[];
    neighborhoods: any[];
    vendors: any[];
    cmsPage?: any;
}

export function LocalDiscoveryClient({
    initialProducts,
    markets,
    neighborhoods,
    vendors,
    cmsPage
}: LocalDiscoveryClientProps) {
    const { selectedLocation, selectLocation, useGps, gpsLoading } = useLocation();
    const searchParams = useSearchParams();

    // 1. Identify active CMS sections
    const sections = (cmsPage?.sections || [])
        .filter((s: any) => (s.pageSlug || 'local_discovery') === 'local_discovery' || !['THEME_SETTINGS', 'HEADER_CONF', 'TOP_BAR', 'FOOTER_CONF'].includes(s.type))
        .sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
    const activeSections = sections.filter((s: any) => s.isActive !== false);

    const tabsSection = activeSections.find((s: any) => s.type === 'LOCAL_DISCOVERY_TABS');
    const tabsConfig = tabsSection?.data || {};

    const cascadeSection = activeSections.find((s: any) => s.type === 'LOCAL_CASCADE_ENGINE');
    const cascadeConfig = cascadeSection?.data || {};

    const defaultTab = tabsConfig?.defaultTab || 'products';
    const tabParam = searchParams.get('tab');
    const marketIdParam = searchParams.get('marketId');

    const [activeTab, setActiveTab] = useState<'products' | 'markets' | 'neighborhoods' | 'vendors'>(
        tabParam && ['products', 'markets', 'neighborhoods', 'vendors'].includes(tabParam)
            ? (tabParam as any)
            : defaultTab
    );
    
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedMarketId, setSelectedMarketId] = useState<string>(marketIdParam || '');

    useEffect(() => {
        if (marketIdParam) {
            setSelectedMarketId(marketIdParam);
            if (!tabParam || tabParam === 'markets') {
                setActiveTab('products');
            }
        } else if (tabParam && ['products', 'markets', 'neighborhoods', 'vendors'].includes(tabParam)) {
            setActiveTab(tabParam as any);
        }
    }, [tabParam, marketIdParam]);
    const [onlyFastSla, setOnlyFastSla] = useState(false); // < 2h delivery
    const [sortBy, setSortBy] = useState<'distance_asc' | 'rating_desc' | 'price_asc'>('distance_asc');

    // Radii & labels from back office CMS configuration
    const zoneARadius = Number(cascadeConfig?.zoneARadiusKm) || 3;
    const zoneBRadius = Number(cascadeConfig?.zoneBRadiusKm) || 10;
    const zoneALabel = cascadeConfig?.zoneALabel || `📍 Zone Immédiate (< ${zoneARadius} km / Votre Marché)`;
    const zoneBLabel = cascadeConfig?.zoneBLabel || `🛵 Zone Ville & Arrondissement (< ${zoneBRadius} km)`;
    const zoneCLabel = cascadeConfig?.zoneCLabel || '📦 Zone Élargie & Bénin Entier (Livraison Standard)';

    // Current user GPS Coordinates
    const userLat = selectedLocation?.latitude;
    const userLon = selectedLocation?.longitude;

    // Compute dynamic distance for markets
    const marketsWithDistance = useMemo(() => {
        const uComm = (selectedLocation?.commune || selectedLocation?.name || '').toLowerCase().trim();

        let list = (markets || []).map((m: any) => {
            let distanceKm: number | null = null;
            if (userLat && userLon && m.centerLatitude && m.centerLongitude) {
                const d = calculateDistanceKm(userLat, userLon, Number(m.centerLatitude), Number(m.centerLongitude));
                distanceKm = Math.round(d * 10) / 10;
            }
            const zoneName = (m.geoZone?.name || m.geoZone?.parent?.name || '').toLowerCase().trim();
            const isSameCommune = Boolean(uComm && zoneName && (zoneName.includes(uComm) || uComm.includes(zoneName)));
            return {
                ...m,
                distanceKm,
                isSameCommune
            };
        });

        const sameCommune = list.filter((m: any) => m.isSameCommune);
        if (sameCommune.length > 0) {
            sameCommune.sort((a: any, b: any) => {
                if (a.distanceKm !== null && b.distanceKm !== null) return a.distanceKm - b.distanceKm;
                return (a.name || '').localeCompare(b.name || '');
            });
            const others = list.filter((m: any) => !m.isSameCommune).sort((a: any, b: any) => {
                if (a.distanceKm !== null && b.distanceKm !== null) return a.distanceKm - b.distanceKm;
                return 0;
            });
            return [...sameCommune, ...others];
        }

        list.sort((a: any, b: any) => {
            if (a.distanceKm !== null && b.distanceKm !== null) return a.distanceKm - b.distanceKm;
            if (a.distanceKm !== null) return -1;
            return 0;
        });
        return list;
    }, [markets, userLat, userLon, selectedLocation]);

    // Active selected market info
    const currentMarket = useMemo(() => {
        if (!selectedMarketId) return null;
        return (marketsWithDistance || []).find((m: any) => String(m.id) === String(selectedMarketId)) ||
               (markets || []).find((m: any) => String(m.id) === String(selectedMarketId)) || null;
    }, [selectedMarketId, marketsWithDistance, markets]);

    // Compute dynamic distance for vendors
    const vendorsWithDistance = useMemo(() => {
        let list = (vendors || []).map((v: any) => {
            let distanceKm: number | null = null;
            if (userLat && userLon && v.latitude && v.longitude) {
                const d = calculateDistanceKm(userLat, userLon, Number(v.latitude), Number(v.longitude));
                distanceKm = Math.round(d * 10) / 10;
            }
            return {
                ...v,
                distanceKm
            };
        });

        if (searchTerm.trim()) {
            const q = searchTerm.toLowerCase().trim();
            list = list.filter((v: any) => 
                (v.name || '').toLowerCase().includes(q) ||
                (v.zone || '').toLowerCase().includes(q) ||
                (v.address || '').toLowerCase().includes(q) ||
                (v.physicalMarket?.name || '').toLowerCase().includes(q)
            );
        }

        if (selectedMarketId) {
            list = list.filter((v: any) => String(v.physicalMarket?.id || v.physicalMarketId) === selectedMarketId);
        }

        list.sort((a: any, b: any) => {
            if (a.distanceKm !== null && b.distanceKm !== null) return a.distanceKm - b.distanceKm;
            return (b.rating || 0) - (a.rating || 0);
        });

        return list;
    }, [vendors, userLat, userLon, searchTerm, selectedMarketId]);

    // Compute categorized products by proximity zone (Zone A, Zone B, Zone C)
    const categorizedProducts = useMemo(() => {
        let list = [...initialProducts];

        if (searchTerm.trim()) {
            const q = searchTerm.toLowerCase().trim();
            list = list.filter((p: any) => {
                const name = (p.name || p.productName || '').toLowerCase();
                const variantName = (p.variantName || p.declinationName || '').toLowerCase();
                const vendorName = (p.vendorName || p.winningOffer?.vendor?.name || '').toLowerCase();
                const marketName = (p.marketName || p.winningOffer?.vendor?.physicalMarket?.name || '').toLowerCase();
                const locationName = (p.locationName || p.winningOffer?.vendor?.location?.name || '').toLowerCase();
                return name.includes(q) || variantName.includes(q) || vendorName.includes(q) || marketName.includes(q) || locationName.includes(q);
            });
        }

        if (selectedMarketId) {
            list = list.filter((p: any) => {
                const pMarketId = String(p.marketId || p.winningOffer?.vendor?.physicalMarket?.id || '');
                return pMarketId === selectedMarketId;
            });
        }

        if (onlyFastSla) {
            list = list.filter((p: any) => {
                const sla = Number(p.deliveryTimeValue ?? p.winningOffer?.deliveryTimeValue ?? 2);
                const unit = p.deliveryTimeUnit || p.winningOffer?.deliveryTimeUnit || 'HOURS';
                return (unit === 'HOURS' || unit === 'h') && sla <= 2;
            });
        }

        // Zone Cascading grouping using CMS configured radii
        const zoneA: any[] = [];
        const zoneB: any[] = [];
        const zoneC: any[] = [];

        for (const item of list) {
            const dist = item.distanceKm ?? item.winningOffer?.distanceKm;
            const fallback = item.fallbackLevel ?? item.winningOffer?.fallbackLevel ?? 3;

            if (dist !== undefined && dist !== null) {
                if (dist <= zoneARadius) zoneA.push(item);
                else if (dist <= zoneBRadius) zoneB.push(item);
                else zoneC.push(item);
            } else {
                if (fallback === 1) zoneA.push(item);
                else if (fallback === 2) zoneB.push(item);
                else zoneC.push(item);
            }
        }

        // Sorting within lists
        const sortFn = (a: any, b: any) => {
            if (sortBy === 'distance_asc') {
                const dA = a.distanceKm ?? 999;
                const dB = b.distanceKm ?? 999;
                return dA - dB;
            }
            if (sortBy === 'price_asc') {
                const pA = a.onPromotion && a.promotionalPrice ? a.promotionalPrice : (a.price || 0);
                const pB = b.onPromotion && b.promotionalPrice ? b.promotionalPrice : (b.price || 0);
                return pA - pB;
            }
            if (sortBy === 'rating_desc') {
                const rA = a.winningOffer?.vendor?.rating || a.vendor?.rating || 0;
                const rB = b.winningOffer?.vendor?.rating || b.vendor?.rating || 0;
                return rB - rA;
            }
            return 0;
        };

        zoneA.sort(sortFn);
        zoneB.sort(sortFn);
        zoneC.sort(sortFn);

        return {
            all: list,
            zoneA,
            zoneB,
            zoneC
        };
    }, [initialProducts, searchTerm, selectedMarketId, onlyFastSla, sortBy, zoneARadius, zoneBRadius]);

    // Section Renderers
    const renderHeroBanner = (config?: any) => {
        const title = config?.title || 'Achetez Près De Chez Vous';
        const subtitle = config?.subtitle || "Explorez les offres de vos marchés locaux, les boutiques de votre quartier et bénéficiez d'une livraison ultra-rapide en direct au Bénin.";
        const badgeText = config?.badgeText || 'Commerce Local & Proximité';
        const showGps = config?.showGpsDetectionButton !== false;
        const customBg = config?.bgColor ? { background: config.bgColor } : {};
        const customColor = config?.textColor ? { color: config.textColor } : {};

        return (
            <div 
                style={customBg} 
                className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-950 text-white p-6 sm:p-10 md:p-12 shadow-2xl border border-emerald-500/20"
            >
                <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-80 h-80 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />

                <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                    <div className="space-y-4 max-w-2xl">
                        <div 
                            style={config?.badgeBgColor ? { backgroundColor: config.badgeBgColor } : {}}
                            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-600/30 border border-emerald-500/50 text-emerald-300 text-xs font-black uppercase tracking-wider"
                        >
                            <Compass className="w-4 h-4 text-emerald-400" />
                            <span>{badgeText}</span>
                        </div>
                        <h1 style={customColor} className="text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight leading-tight">
                            {title}
                        </h1>
                        <p className="text-slate-300 text-sm sm:text-base font-medium">
                            {subtitle}
                        </p>
                    </div>

                    {/* Geolocation Card */}
                    <div className="bg-slate-900/90 backdrop-blur-md p-5 rounded-2xl border border-white/10 shadow-xl space-y-3 shrink-0 max-w-sm">
                        <div className="flex items-center gap-2 text-xs font-black text-emerald-400 uppercase tracking-widest">
                            <MapPin className="w-4 h-4" />
                            <span>Votre Localisation :</span>
                        </div>
                        <div className="font-black text-base sm:text-lg text-white truncate">
                            {selectedLocation?.name || 'Bénin (Non défini)'}
                        </div>
                        <p className="text-[11px] text-slate-400">
                            {selectedLocation?.type === 'MARKET' ? 'Marché sélectionné' : selectedLocation?.type === 'GPS' ? 'Position GPS exacte' : 'Quartier / Ville de référence'}
                        </p>
                        {showGps && (
                            <Button
                                size="sm"
                                onClick={useGps}
                                disabled={gpsLoading}
                                className="w-full h-9 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-2"
                            >
                                <Navigation className="w-3.5 h-3.5" />
                                {gpsLoading ? 'Localisation en cours...' : 'Détecter ma position GPS'}
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const renderTabsNav = (config?: any) => {
        const showProducts = config?.showProductsTab !== false;
        const showMarkets = config?.showMarketsTab !== false;
        const showNeighborhoods = config?.showNeighborhoodsTab !== false;
        const showVendors = config?.showVendorsTab !== false;

        const tabItems = [
            showProducts ? { id: 'products', label: '🛍️ Produits & Offres Proches', count: categorizedProducts.all.length } : null,
            showMarkets ? { id: 'markets', label: '🏛️ Marchés du Bénin', count: markets.length } : null,
            showNeighborhoods ? { id: 'neighborhoods', label: '📍 Quartiers & Zones', count: neighborhoods.length } : null,
            showVendors ? { id: 'vendors', label: '🏪 Boutiques Vérifiées', count: vendorsWithDistance.length } : null,
        ].filter(Boolean) as Array<{ id: 'products' | 'markets' | 'neighborhoods' | 'vendors'; label: string; count: number }>;

        return (
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide border-b border-border">
                {tabItems.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm whitespace-nowrap transition-all flex items-center gap-2 border ${
                            activeTab === tab.id
                                ? 'bg-primary text-primary-foreground border-primary shadow-sm scale-102'
                                : 'bg-card text-muted-foreground border-border hover:bg-muted hover:text-foreground'
                        }`}
                    >
                        <span>{tab.label}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                            activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'
                        }`}>
                            {tab.count}
                        </span>
                    </button>
                ))}
            </div>
        );
    };

    const renderCascadeEngine = (config?: any) => {
        const marketVendorsCount = selectedMarketId 
            ? vendorsWithDistance.filter((v: any) => String(v.physicalMarket?.id || v.physicalMarketId) === selectedMarketId).length
            : 0;

        return (
            <div className="space-y-8">
                {/* Active Market Banner */}
                {currentMarket && (
                    <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden border border-emerald-500/30">
                        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="space-y-2">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                                        <Building2 className="w-3.5 h-3.5 text-emerald-300" />
                                        Marché Actif
                                    </span>
                                    {currentMarket.distanceKm !== null && (
                                        <span className="px-3 py-1 bg-white/15 rounded-full text-xs font-bold text-emerald-200">
                                            📍 À {currentMarket.distanceKm} km
                                        </span>
                                    )}
                                    {currentMarket.geoZone?.name && (
                                        <span className="px-3 py-1 bg-white/10 rounded-full text-xs font-medium text-slate-200">
                                            {currentMarket.geoZone.name}
                                        </span>
                                    )}
                                </div>
                                <h1 className="text-2xl sm:text-3xl font-black">{currentMarket.name}</h1>
                                <p className="text-emerald-100/90 text-xs sm:text-sm max-w-xl font-medium">
                                    {currentMarket.description || `Explorez tous les commerçants, boutiques et produits disponibles au ${currentMarket.name}.`}
                                </p>
                            </div>

                            <div className="flex flex-wrap items-center gap-2.5">
                                <Button
                                    size="sm"
                                    onClick={() => setActiveTab('vendors')}
                                    className="bg-white hover:bg-slate-100 text-emerald-950 font-black text-xs rounded-xl shadow-md"
                                >
                                    Boutiques ({marketVendorsCount})
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setSelectedMarketId('')}
                                    className="bg-white/10 hover:bg-white/20 text-white border-white/20 font-bold text-xs rounded-xl"
                                >
                                    Tous les marchés ✕
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Filter toolbar */}
                <div className="bg-card border border-border rounded-2xl p-4 sm:p-6 shadow-sm space-y-4">
                    <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
                        {/* Search */}
                        <div className="relative w-full md:max-w-md">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Rechercher un produit à proximité (ex: téléphone, tissu...)"
                                className="pl-10 h-11 rounded-xl bg-muted/30 font-medium text-sm border-border"
                            />
                            {searchTerm && (
                                <button
                                    onClick={() => setSearchTerm('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground hover:text-foreground"
                                >
                                    Effacer
                                </button>
                            )}
                        </div>

                        {/* Market selector & Sort */}
                        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
                            <select
                                value={selectedMarketId}
                                onChange={(e) => setSelectedMarketId(e.target.value)}
                                className="h-11 px-3 rounded-xl border border-border bg-background text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                            >
                                <option value="">🏛️ Tous les marchés</option>
                                {markets.map((m: any) => (
                                    <option key={m.id} value={String(m.id)}>{m.name}</option>
                                ))}
                            </select>

                            <select
                                value={sortBy}
                                onChange={(e: any) => setSortBy(e.target.value)}
                                className="h-11 px-3 rounded-xl border border-border bg-background text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                            >
                                <option value="distance_asc">📍 Plus proches d'abord</option>
                                <option value="rating_desc">⭐ Meilleure note vendeur</option>
                                <option value="price_asc">💰 Prix croissant</option>
                            </select>
                        </div>
                    </div>

                    {/* Quick filter pills */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide pt-2 border-t border-border/40">
                        <button
                            onClick={() => setOnlyFastSla(!onlyFastSla)}
                            className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                                onlyFastSla 
                                    ? 'bg-emerald-600 text-white shadow-sm' 
                                    : 'bg-muted/60 text-muted-foreground hover:bg-muted'
                            }`}
                        >
                            <Clock className="w-3.5 h-3.5" />
                            <span>Livraison express (&lt; 2h)</span>
                        </button>

                        {selectedMarketId && (
                            <button
                                onClick={() => setSelectedMarketId('')}
                                className="px-3 py-1.5 rounded-full text-xs font-bold bg-primary/10 text-primary hover:bg-primary/20"
                            >
                                Réinitialiser le marché ✕
                            </button>
                        )}
                    </div>
                </div>

                {/* Zone A: Immediate Proximity (< zoneARadius km) */}
                {categorizedProducts.zoneA.length > 0 && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/30 px-4 py-3 rounded-2xl">
                            <div className="flex items-center gap-2">
                                <span className="flex h-3 w-3 rounded-full bg-emerald-500 animate-ping" />
                                <h2 className="font-black text-sm uppercase tracking-wider text-emerald-950 dark:text-emerald-300">
                                    {zoneALabel}
                                </h2>
                            </div>
                            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                                {categorizedProducts.zoneA.length} offre{categorizedProducts.zoneA.length > 1 ? 's' : ''}
                            </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 md:gap-6">
                            {categorizedProducts.zoneA.map((item, idx) => (
                                <MasterProductCard
                                    key={`za-${item.vendorId || 'v'}-${item.productVariantId || item.productId || idx}`}
                                    item={item}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Zone B: City / Commune (< zoneBRadius km) */}
                {categorizedProducts.zoneB.length > 0 && (
                    <div className="space-y-4 pt-4">
                        <div className="flex items-center justify-between bg-blue-500/10 border border-blue-500/30 px-4 py-3 rounded-2xl">
                            <div className="flex items-center gap-2">
                                <h2 className="font-black text-sm uppercase tracking-wider text-blue-950 dark:text-blue-300">
                                    {zoneBLabel}
                                </h2>
                            </div>
                            <span className="text-xs font-bold text-blue-700 dark:text-blue-400">
                                {categorizedProducts.zoneB.length} offre{categorizedProducts.zoneB.length > 1 ? 's' : ''}
                            </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 md:gap-6">
                            {categorizedProducts.zoneB.map((item, idx) => (
                                <MasterProductCard
                                    key={`zb-${item.vendorId || 'v'}-${item.productVariantId || item.productId || idx}`}
                                    item={item}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Zone C: Extended / National Delivery */}
                {categorizedProducts.zoneC.length > 0 && (
                    <div className="space-y-4 pt-4">
                        <div className="flex items-center justify-between bg-slate-500/10 border border-slate-500/30 px-4 py-3 rounded-2xl">
                            <div className="flex items-center gap-2">
                                <h2 className="font-black text-sm uppercase tracking-wider text-slate-800 dark:text-slate-300">
                                    {zoneCLabel}
                                </h2>
                            </div>
                            <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                                {categorizedProducts.zoneC.length} offre{categorizedProducts.zoneC.length > 1 ? 's' : ''}
                            </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 md:gap-6">
                            {categorizedProducts.zoneC.map((item, idx) => (
                                <MasterProductCard
                                    key={`zc-${item.vendorId || 'v'}-${item.productVariantId || item.productId || idx}`}
                                    item={item}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {categorizedProducts.all.length === 0 && (
                    <div className="bg-muted/30 border border-border rounded-2xl p-8 text-center space-y-3 max-w-md mx-auto">
                        <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto" />
                        <h3 className="font-black text-base text-foreground">Aucun produit trouvé</h3>
                        <p className="text-xs text-muted-foreground">
                            Essayez de modifier vos critères de recherche ou de changer de marché.
                        </p>
                    </div>
                )}
            </div>
        );
    };

    const renderMarketsSection = (config?: any) => {
        const take = Number(config?.take) || 12;
        const title = config?.title || 'Marchés Populaires du Bénin';
        const subtitle = config?.subtitle || 'Explorez les grands pôles commerciaux et leurs commerçants.';
        const showDistance = config?.showDistance !== false;
        const displayMarkets = marketsWithDistance.slice(0, take);

        return (
            <div className="space-y-6">
                {(config?.title || config?.subtitle) && (
                    <div>
                        <h2 className="text-xl md:text-2xl font-black text-foreground">{title}</h2>
                        {subtitle && <p className="text-xs sm:text-sm text-muted-foreground mt-1">{subtitle}</p>}
                    </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                    {displayMarkets.map((market: any) => {
                        const isSelected = selectedLocation?.marketId === String(market.id);
                        return (
                            <div
                                key={market.id}
                                className={`bg-card border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between ${
                                    isSelected ? 'border-primary ring-2 ring-primary/20' : 'border-border'
                                }`}
                            >
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600">
                                            <Building2 className="w-5 h-5" />
                                        </span>
                                        {showDistance && market.distanceKm !== null && (
                                            <span className="text-xs font-black px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                                                À {market.distanceKm} km
                                            </span>
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="font-black text-lg text-foreground">{market.name}</h3>
                                        <p className="text-xs text-muted-foreground font-medium mt-1">
                                            Marché physique traditionnel et moderne de référence au Bénin
                                        </p>
                                    </div>
                                </div>

                                <div className="pt-5 border-t border-border/50 flex items-center justify-between mt-4">
                                    <button
                                        onClick={() => {
                                            selectLocation({
                                                id: String(market.id),
                                                name: market.name,
                                                latitude: market.centerLatitude || 6.36,
                                                longitude: market.centerLongitude || 2.44,
                                                type: 'MARKET',
                                                marketId: String(market.id),
                                                marketName: market.name,
                                            });
                                            setSelectedMarketId(String(market.id));
                                            setActiveTab('products');
                                        }}
                                        className="font-bold text-xs text-primary hover:underline flex items-center gap-1"
                                    >
                                        Sélectionner ce marché →
                                    </button>
                                    <Link
                                        href={`/search?marketId=${market.id}`}
                                        className="text-xs font-bold text-muted-foreground hover:text-foreground"
                                    >
                                        Voir le catalogue
                                    </Link>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const renderNeighborhoodsSection = (config?: any) => {
        const take = Number(config?.take) || 24;
        const title = config?.title || 'Quartiers & Villes du Bénin';
        const subtitle = config?.subtitle || 'Sélectionnez votre quartier pour afficher les offres de proximité.';
        const displayNeighborhoods = neighborhoods.slice(0, take);

        return (
            <div className="space-y-6">
                {(config?.title || config?.subtitle) && (
                    <div>
                        <h2 className="text-xl md:text-2xl font-black text-foreground">{title}</h2>
                        {subtitle && <p className="text-xs sm:text-sm text-muted-foreground mt-1">{subtitle}</p>}
                    </div>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {displayNeighborhoods.map((n: any) => (
                        <button
                            key={n.id}
                            onClick={() => {
                                selectLocation({
                                    id: String(n.id),
                                    name: n.name,
                                    latitude: n.centerLatitude || 6.36,
                                    longitude: n.centerLongitude || 2.44,
                                    type: 'NEIGHBORHOOD',
                                    geoZoneId: String(n.id)
                                });
                                setActiveTab('products');
                            }}
                            className="p-4 rounded-2xl bg-card border border-border hover:border-primary hover:shadow-sm transition-all text-center space-y-1.5 group"
                        >
                            <MapPin className="w-5 h-5 text-muted-foreground group-hover:text-primary mx-auto transition-colors" />
                            <div className="font-bold text-xs sm:text-sm text-foreground truncate">{n.name}</div>
                            <span className="text-[10px] text-muted-foreground block">Quartier</span>
                        </button>
                    ))}
                </div>
            </div>
        );
    };

    const renderVendorsSection = (config?: any) => {
        const take = Number(config?.take) || 24;
        const title = config?.title || 'Boutiques et Marchands Certifiés';
        const subtitle = config?.subtitle || 'Commandez en direct auprès de boutiques de confiance au Bénin.';
        const showWhatsapp = config?.showWhatsappDirect !== false;
        const showMarketBadge = config?.showMarketBadge !== false;
        const displayVendors = vendorsWithDistance.slice(0, take);

        return (
            <div className="space-y-6">
                {(config?.title || config?.subtitle) && (
                    <div>
                        <h2 className="text-xl md:text-2xl font-black text-foreground">{title}</h2>
                        {subtitle && <p className="text-xs sm:text-sm text-muted-foreground mt-1">{subtitle}</p>}
                    </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                    {displayVendors.map((vendor: any) => {
                        const marketName = vendor.physicalMarket?.name || vendor.zone || vendor.location?.name;
                        return (
                            <div
                                key={vendor.id}
                                className="bg-card border border-border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                            >
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3.5">
                                        <div className="w-12 h-12 rounded-xl bg-muted overflow-hidden shrink-0 border border-border">
                                            {vendor.logo?.preview ? (
                                                <img src={getAssetUrl(vendor.logo.preview)} alt={vendor.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center font-black text-sm text-muted-foreground">
                                                    {vendor.name?.charAt(0) || 'B'}
                                                </div>
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-1.5">
                                                <h3 className="font-black text-base text-foreground truncate">{vendor.name}</h3>
                                                {vendor.verificationStatus && (
                                                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                                                )}
                                            </div>
                                            {showMarketBadge && marketName && (
                                                <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5 font-medium">
                                                    <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
                                                    <span>{marketName}</span>
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between text-xs pt-2 border-t border-border/40">
                                        <div className="flex items-center gap-1 font-black text-foreground">
                                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                            <span>{(vendor.rating || 5.0).toFixed(1)}</span>
                                            <span className="text-muted-foreground font-normal">({vendor.ratingCount || 0} avis)</span>
                                        </div>
                                        {vendor.distanceKm !== null && (
                                            <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                                À {vendor.distanceKm} km
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="pt-4 mt-4 border-t border-border flex items-center gap-2">
                                    <Button size="sm" asChild className="w-full rounded-xl font-bold text-xs">
                                        <Link href={`/vendor/${encodeId(vendor.id)}`}>
                                            Visiter la boutique
                                        </Link>
                                    </Button>
                                    {showWhatsapp && vendor.phoneNumber && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => {
                                                const clean = vendor.phoneNumber.replace(/[^0-9+]/g, '');
                                                const phone = clean.startsWith('+') ? clean.slice(1) : clean;
                                                window.open(`https://wa.me/${phone}?text=${encodeURIComponent(`Bonjour ${vendor.name}, je vous contacte depuis Ahizan.`)}`, '_blank');
                                            }}
                                            className="rounded-xl px-2.5 text-[#25D366] hover:bg-[#25D366]/10 border-[#25D366]/30"
                                            title="Contacter sur WhatsApp"
                                        >
                                            <MessageCircle className="w-4 h-4 fill-current" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    // If custom CMS sections are defined on local_discovery page:
    if (activeSections.length > 0) {
        return (
            <div className="space-y-8 pb-16">
                {activeSections.map((sec: any, idx: number) => {
                    if (sec.type === 'LOCAL_HERO_BANNER') {
                        return <React.Fragment key={sec.id || idx}>{renderHeroBanner(sec.data)}</React.Fragment>;
                    }
                    if (sec.type === 'LOCAL_DISCOVERY_TABS') {
                        return <React.Fragment key={sec.id || idx}>{renderTabsNav(sec.data)}</React.Fragment>;
                    }
                    if (sec.type === 'LOCAL_CASCADE_ENGINE') {
                        return <React.Fragment key={sec.id || idx}>{activeTab === 'products' && renderCascadeEngine(sec.data)}</React.Fragment>;
                    }
                    if (sec.type === 'LOCAL_MARKETS_SECTION') {
                        return <React.Fragment key={sec.id || idx}>{(activeTab === 'markets' || !tabsSection) && renderMarketsSection(sec.data)}</React.Fragment>;
                    }
                    if (sec.type === 'LOCAL_NEIGHBORHOODS_SECTION') {
                        return <React.Fragment key={sec.id || idx}>{(activeTab === 'neighborhoods' || !tabsSection) && renderNeighborhoodsSection(sec.data)}</React.Fragment>;
                    }
                    if (sec.type === 'LOCAL_VENDORS_SECTION') {
                        return <React.Fragment key={sec.id || idx}>{(activeTab === 'vendors' || !tabsSection) && renderVendorsSection(sec.data)}</React.Fragment>;
                    }
                    return (
                        <div key={sec.id || idx}>
                            <BodySectionRenderer 
                                section={sec} 
                                siteCategories={[]} 
                                globalPromoConfig={{}} 
                            />
                        </div>
                    );
                })}

                {/* If tabs are present and tab switched to markets/neighborhoods/vendors while cascade engine is in view */}
                {tabsSection && activeTab === 'markets' && !activeSections.some((s: any) => s.type === 'LOCAL_MARKETS_SECTION') && renderMarketsSection()}
                {tabsSection && activeTab === 'neighborhoods' && !activeSections.some((s: any) => s.type === 'LOCAL_NEIGHBORHOODS_SECTION') && renderNeighborhoodsSection()}
                {tabsSection && activeTab === 'vendors' && !activeSections.some((s: any) => s.type === 'LOCAL_VENDORS_SECTION') && renderVendorsSection()}
            </div>
        );
    }

    // Default Fallback Layout when no sections are customized
    return (
        <div className="space-y-8 pb-16">
            {renderHeroBanner()}
            {renderTabsNav()}
            {activeTab === 'products' && renderCascadeEngine()}
            {activeTab === 'markets' && renderMarketsSection()}
            {activeTab === 'neighborhoods' && renderNeighborhoodsSection()}
            {activeTab === 'vendors' && renderVendorsSection()}
        </div>
    );
}
