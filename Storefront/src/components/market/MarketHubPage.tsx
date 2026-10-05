'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { 
    MapPin, 
    Search, 
    Sparkles, 
    Clock, 
    ShieldCheck, 
    Truck, 
    SlidersHorizontal, 
    Grid3X3, 
    Grid2X2, 
    Layers, 
    Zap, 
    ChevronRight, 
    CheckCircle2, 
    ShoppingBag, 
    X, 
    Check,
    ArrowUpDown,
    Flame,
    ChevronDown,
    ChevronUp,
    Filter
} from 'lucide-react';
import { MasterProductCard } from '@/components/commerce/master-product-card';
import { Button } from '@/components/ui/button';
import { getAssetUrl } from '@/lib/vendure/api-utils';
import { MasterDisplayItem } from '@/lib/vendure/display-engine';

interface FacetValueItem {
    count: number;
    facetValue: {
        id: string;
        name: string;
        code?: string;
        facet?: {
            id: string;
            name: string;
            code?: string;
        };
    };
}

interface MarketHubPageProps {
    market: {
        id: string;
        name: string;
        slug: string;
        description?: string;
        image?: string;
        centerLatitude?: number;
        centerLongitude?: number;
        radiusMeters?: number;
        geoZone?: {
            id: string;
            name: string;
            slug?: string;
            parent?: { id: string; name: string };
        };
    };
    products: MasterDisplayItem[];
    collections?: Array<{
        id: string;
        name: string;
        slug: string;
        featuredAsset?: any;
    }>;
    facetValues?: FacetValueItem[];
}

export function MarketHubPage({
    market,
    products = [],
    collections = [],
    facetValues = []
}: MarketHubPageProps) {
    // Search & Filter State
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCollection, setSelectedCollection] = useState<string>('all');
    const [selectedFacetValueIds, setSelectedFacetValueIds] = useState<string[]>([]);
    const [onlyFlashDeals, setOnlyFlashDeals] = useState<boolean>(false);
    const [onlyInStock, setOnlyInStock] = useState<boolean>(false);
    const [onlyFastDelivery, setOnlyFastDelivery] = useState<boolean>(false);
    
    // Price Filters
    const [minPriceInput, setMinPriceInput] = useState<string>('');
    const [maxPriceInput, setMaxPriceInput] = useState<string>('');
    const [priceRangeSlider, setPriceRangeSlider] = useState<number>(500000);
    
    // UI State
    const [sortBy, setSortBy] = useState<'recommended' | 'price_asc' | 'price_desc' | 'rating_desc' | 'delivery_fast'>('recommended');
    const [viewMode, setViewMode] = useState<'grid-4' | 'grid-3'>('grid-4');
    const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
    const [collapsedFacetGroups, setCollapsedFacetGroups] = useState<Record<string, boolean>>({});

    // Fallback banner image if not defined
    const resolvedHeroUrl = market.image 
        ? (market.image.startsWith('http') ? market.image : (getAssetUrl(market.image) || ''))
        : '';
    const marketHeroImage: string = resolvedHeroUrl || 'https://images.unsplash.com/photo-1533900298318-6b8da08a523e?q=80&w=1600&auto=format&fit=crop';

    // Group Facets dynamically from Vendure
    const groupedFacets = useMemo(() => {
        const groups: Record<string, { id: string; name: string; values: Array<{ id: string; name: string; count: number }> }> = {};

        (facetValues || []).forEach(fv => {
            const facet = fv.facetValue?.facet;
            const facetId = facet?.id || 'other';
            const facetName = facet?.name || 'Caractéristiques';
            const valId = fv.facetValue?.id;
            const valName = fv.facetValue?.name;

            if (!valId || !valName) return;

            if (!groups[facetId]) {
                groups[facetId] = {
                    id: facetId,
                    name: facetName,
                    values: []
                };
            }

            // Check if already in group
            const existing = groups[facetId].values.find(v => v.id === valId);
            if (!existing) {
                groups[facetId].values.push({
                    id: valId,
                    name: valName,
                    count: fv.count || 0
                });
            }
        });

        return Object.values(groups);
    }, [facetValues]);

    // Extract dynamic collections and counts
    const availableCategories = useMemo(() => {
        const catMap = new Map<string, { id: string; name: string; slug: string; count: number }>();

        (collections || []).forEach(c => {
            if (c.id && c.name && !c.name.startsWith('_') && !c.name.toLowerCase().includes('root')) {
                catMap.set(String(c.id), {
                    id: String(c.id),
                    name: c.name,
                    slug: c.slug || String(c.id),
                    count: 0
                });
            }
        });

        products.forEach(p => {
            const pCols = p.collections || [];
            pCols.forEach((col: any) => {
                if (!col.id || !col.name) return;
                const key = String(col.id);
                const existing = catMap.get(key);
                if (existing) {
                    existing.count += 1;
                } else {
                    catMap.set(key, {
                        id: key,
                        name: col.name,
                        slug: col.slug || key,
                        count: 1
                    });
                }
            });
        });

        return Array.from(catMap.values()).slice(0, 12);
    }, [products, collections]);

    // Flash deals extracted from products belonging to this market
    const flashDeals = useMemo(() => {
        const promos = products.filter(p => {
            const isPromo = p.onPromotion || p.winningOffer?.onPromotion;
            const hasDiscount = (p.discountPercentage || p.winningOffer?.discountPercentage || 0) > 0;
            return isPromo || hasDiscount;
        });

        if (promos.length > 0) return promos.slice(0, 8);
        return products.slice(0, 4);
    }, [products]);

    // Toggle a facet value selection
    const toggleFacetValue = (facetValueId: string) => {
        setSelectedFacetValueIds(prev => 
            prev.includes(facetValueId)
                ? prev.filter(id => id !== facetValueId)
                : [...prev, facetValueId]
        );
    };

    // Toggle collapsible facet group
    const toggleFacetGroup = (groupId: string) => {
        setCollapsedFacetGroups(prev => ({
            ...prev,
            [groupId]: !prev[groupId]
        }));
    };

    // Price bounds
    const effectiveMinPrice = minPriceInput ? Number(minPriceInput) : 0;
    const effectiveMaxPrice = maxPriceInput ? Number(maxPriceInput) : priceRangeSlider;

    // Filter and sort products
    const filteredProducts = useMemo(() => {
        return products.filter(item => {
            // Search query filter
            if (searchTerm.trim()) {
                const term = searchTerm.toLowerCase();
                const matchName = (item.productName || item.name || '').toLowerCase().includes(term);
                const matchVendor = (item.vendorName || item.winningOffer?.vendor?.name || '').toLowerCase().includes(term);
                const matchDeclination = (item.declinationName || item.winningOffer?.declinationName || '').toLowerCase().includes(term);
                if (!matchName && !matchVendor && !matchDeclination) return false;
            }

            // Collection filter
            if (selectedCollection !== 'all') {
                const itemCols = item.collections || [];
                const inCol = itemCols.some((c: any) => String(c.id) === String(selectedCollection) || c.slug === selectedCollection);
                if (!inCol) return false;
            }

            // Facet filters
            if (selectedFacetValueIds.length > 0) {
                const itemFacets: string[] = (item.facetValueIds || []).map((id: any) => String(id));
                const hasFacet = selectedFacetValueIds.some(fid => itemFacets.includes(fid));
                if (!hasFacet) return false;
            }

            // Flash deals only
            if (onlyFlashDeals) {
                const isPromo = item.onPromotion || item.winningOffer?.onPromotion;
                const hasDiscount = (item.discountPercentage || item.winningOffer?.discountPercentage || 0) > 0;
                if (!isPromo && !hasDiscount) return false;
            }

            // Stock filter
            if (onlyInStock) {
                const stock = item.stock ?? item.winningOffer?.stock ?? 1;
                if (stock <= 0) return false;
            }

            // Fast delivery (< 2h)
            if (onlyFastDelivery) {
                const unit = (item.deliveryTimeUnit || item.winningOffer?.deliveryTimeUnit || '').toLowerCase();
                const val = Number(item.deliveryTimeValue || item.winningOffer?.deliveryTimeValue || 0);
                const isFast = unit.includes('heure') || unit.includes('hour') || unit.includes('min') || (val <= 2 && !unit.includes('jour'));
                if (!isFast) return false;
            }

            // Price range filter
            const price = item.promotionalPrice || item.price || item.winningOffer?.promotionalPrice || item.winningOffer?.price || 0;
            if (price < effectiveMinPrice || price > effectiveMaxPrice) return false;

            return true;
        }).sort((a, b) => {
            const priceA = a.promotionalPrice || a.price || a.winningOffer?.price || 0;
            const priceB = b.promotionalPrice || b.price || b.winningOffer?.price || 0;
            const ratingA = a.winningOffer?.vendor?.rating || 0;
            const ratingB = b.winningOffer?.vendor?.rating || 0;
            const scoreA = a.score || a.winningOffer?.score || 0;
            const scoreB = b.score || b.winningOffer?.score || 0;

            if (sortBy === 'price_asc') return priceA - priceB;
            if (sortBy === 'price_desc') return priceB - priceA;
            if (sortBy === 'rating_desc') return ratingB - ratingA;
            if (sortBy === 'delivery_fast') {
                const distA = a.distanceKm ?? a.winningOffer?.distanceKm ?? 999;
                const distB = b.distanceKm ?? b.winningOffer?.distanceKm ?? 999;
                return distA - distB;
            }
            return scoreB - scoreA;
        });
    }, [
        products, 
        searchTerm, 
        selectedCollection, 
        selectedFacetValueIds,
        onlyFlashDeals, 
        onlyInStock, 
        onlyFastDelivery, 
        effectiveMinPrice,
        effectiveMaxPrice, 
        sortBy
    ]);

    const activeFiltersCount = useMemo(() => {
        let count = 0;
        if (selectedCollection !== 'all') count++;
        if (selectedFacetValueIds.length > 0) count += selectedFacetValueIds.length;
        if (onlyFlashDeals) count++;
        if (onlyFastDelivery) count++;
        if (onlyInStock) count++;
        if (minPriceInput || maxPriceInput) count++;
        if (searchTerm.trim()) count++;
        return count;
    }, [selectedCollection, selectedFacetValueIds, onlyFlashDeals, onlyFastDelivery, onlyInStock, minPriceInput, maxPriceInput, searchTerm]);

    const resetFilters = () => {
        setSearchTerm('');
        setSelectedCollection('all');
        setSelectedFacetValueIds([]);
        setOnlyFlashDeals(false);
        setOnlyFastDelivery(false);
        setOnlyInStock(false);
        setMinPriceInput('');
        setMaxPriceInput('');
        setPriceRangeSlider(500000);
        setSortBy('recommended');
    };

    return (
        <div className="min-h-screen bg-[#FAF9F6] text-slate-900 pb-20 font-sans selection:bg-amber-500 selection:text-white">
            
            {/* 1. HERO IMMERSIF DU MARCHÉ (NOUVEAU HEADER) */}
            <div className="relative w-full overflow-hidden bg-slate-950 text-white shadow-2xl">
                {/* Background Image with Deep Gradient */}
                <div className="absolute inset-0 z-0">
                    <Image 
                        src={marketHeroImage} 
                        alt={market.name}
                        fill
                        priority
                        className="object-cover opacity-35 filter scale-105 transition-transform duration-1000 ease-out"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A] via-[#0F172A]/75 to-transparent" />
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-500/15 via-transparent to-transparent" />
                </div>

                <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-12 md:pb-16">
                    {/* Breadcrumbs */}
                    <nav className="flex items-center space-x-2 text-xs md:text-sm text-slate-300/80 mb-6 backdrop-blur-md bg-white/5 py-1.5 px-4 rounded-full w-fit border border-white/10">
                        <Link href="/" className="hover:text-amber-400 transition-colors">Accueil</Link>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                        <Link href="/vendors" className="hover:text-amber-400 transition-colors">Marchés du Bénin</Link>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-amber-400 font-semibold">{market.name}</span>
                    </nav>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                        <div className="lg:col-span-8 space-y-4">
                            {/* Live Badges */}
                            <div className="flex flex-wrap items-center gap-2.5">
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 backdrop-blur-md shadow-sm">
                                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse mr-2" />
                                    Marché Ouvert en Direct
                                </span>
                                {market.geoZone?.name && (
                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-slate-200 border border-white/15 backdrop-blur-md">
                                        <MapPin className="w-3.5 h-3.5 mr-1 text-amber-400" />
                                        {market.geoZone.name} {market.geoZone.parent?.name ? `(${market.geoZone.parent.name})` : ''}
                                    </span>
                                )}
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 backdrop-blur-md">
                                    <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                                    Pôle Commercial Certifié Ahizan
                                </span>
                            </div>

                            {/* Market Title */}
                            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
                                {market.name}
                            </h1>

                            {/* Market Description */}
                            <p className="text-base sm:text-lg text-slate-200/90 max-w-3xl leading-relaxed font-normal">
                                {market.description || `Bienvenue au cœur du ${market.name}. Commandez directement les articles disponibles auprès des commerçants du marché avec livraison express sécurisée.`}
                            </p>

                            {/* Scoped Search bar inside market */}
                            <div className="pt-2 max-w-2xl">
                                <div className="relative flex items-center bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl p-1.5 border border-white/20 focus-within:ring-2 focus-within:ring-amber-500 transition-all">
                                    <Search className="w-5 h-5 text-slate-400 ml-3 shrink-0" />
                                    <input 
                                        type="text"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        placeholder={`Rechercher un produit dans ${market.name}...`}
                                        className="w-full bg-transparent px-3 py-2.5 text-sm md:text-base text-slate-900 placeholder:text-slate-400 focus:outline-none"
                                    />
                                    {searchTerm && (
                                        <button 
                                            onClick={() => setSearchTerm('')}
                                            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full transition-colors mr-1"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    )}
                                    <Button 
                                        className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-5 py-2.5 rounded-xl shadow-md transition-all shrink-0"
                                    >
                                        Rechercher
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* Right Quick Stats Card */}
                        <div className="lg:col-span-4">
                            <div className="bg-slate-900/80 backdrop-blur-xl border border-white/15 rounded-3xl p-6 shadow-2xl space-y-5">
                                <h3 className="text-sm font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                                    <Sparkles className="w-4 h-4" />
                                    Disponibilité & Logistique
                                </h3>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
                                        <div className="text-2xl sm:text-3xl font-black text-white">
                                            {products.length}
                                        </div>
                                        <div className="text-xs text-slate-300 mt-1 font-medium">Articles en Rayon</div>
                                    </div>
                                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
                                        <div className="text-2xl sm:text-3xl font-black text-amber-400">
                                            30-60m
                                        </div>
                                        <div className="text-xs text-slate-300 mt-1 font-medium">Délai Coursier</div>
                                    </div>
                                </div>

                                <div className="space-y-3 pt-2 border-t border-white/10 text-xs text-slate-300">
                                    <div className="flex items-center justify-between">
                                        <span className="flex items-center gap-2 text-slate-400">
                                            <Truck className="w-4 h-4 text-emerald-400" />
                                            Livraison :
                                        </span>
                                        <span className="font-bold text-white">Directe depuis {market.name}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="flex items-center gap-2 text-slate-400">
                                            <ShoppingBag className="w-4 h-4 text-amber-400" />
                                            Panier Groupé :
                                        </span>
                                        <span className="font-bold text-emerald-400">1 seule course payée</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. SECTION RAYONS / SECTEURS DU MARCHÉ */}
            <div className="border-b border-slate-200 bg-white sticky top-0 z-30 shadow-sm backdrop-blur-md bg-white/90">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
                    <div className="flex items-center justify-between gap-4 overflow-x-auto no-scrollbar scroll-smooth">
                        <div className="flex items-center space-x-2 shrink-0">
                            <button
                                onClick={() => setSelectedCollection('all')}
                                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 flex items-center gap-2 ${
                                    selectedCollection === 'all'
                                        ? 'bg-slate-900 text-white shadow-md'
                                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                }`}
                            >
                                <Layers className="w-4 h-4" />
                                Tous les Rayons ({products.length})
                            </button>

                            {availableCategories.map((cat) => (
                                <button
                                    key={cat.id}
                                    onClick={() => setSelectedCollection(cat.id)}
                                    className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all shrink-0 flex items-center gap-1.5 ${
                                        selectedCollection === cat.id
                                            ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                    }`}
                                >
                                    <span>{cat.name}</span>
                                    {cat.count > 0 && (
                                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-black/10 font-bold">
                                            {cat.count}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* Mobile Filters Toggle Button */}
                        <div className="lg:hidden shrink-0">
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => setIsMobileFiltersOpen(true)}
                                className="border-slate-300 font-semibold text-xs flex items-center gap-1.5"
                            >
                                <SlidersHorizontal className="w-3.5 h-3.5 text-amber-600" />
                                Filtres & Facettes
                                {activeFiltersCount > 0 && (
                                    <span className="w-4 h-4 rounded-full bg-amber-500 text-slate-950 font-black text-[10px] flex items-center justify-center">
                                        {activeFiltersCount}
                                    </span>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* MAIN CONTENT CONTAINER */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-10">

                {/* 3. VENTES FLASH DU MARCHÉ */}
                {flashDeals.length > 0 && (
                    <section className="bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
                        <div className="relative z-10 space-y-6">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="space-y-1">
                                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-bold uppercase tracking-wider backdrop-blur-md">
                                        <Flame className="w-4 h-4 text-amber-200 fill-amber-200" />
                                        Bons Plans du Marché
                                    </div>
                                    <h3 className="text-2xl sm:text-3xl font-black">
                                        Ventes Flash & Promotions de {market.name}
                                    </h3>
                                </div>
                                <button
                                    onClick={() => setOnlyFlashDeals(!onlyFlashDeals)}
                                    className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-md flex items-center gap-2 self-start sm:self-auto ${
                                        onlyFlashDeals 
                                            ? 'bg-slate-950 text-white ring-2 ring-white' 
                                            : 'bg-white text-slate-900 hover:bg-slate-100'
                                    }`}
                                >
                                    <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
                                    {onlyFlashDeals ? 'Afficher tout le catalogue' : 'Filtrer uniquement les promos'}
                                </button>
                            </div>

                            {/* Flash Deals Carousel / Grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                {flashDeals.slice(0, 4).map((deal) => (
                                    <div key={deal.id} className="bg-white rounded-2xl p-2 text-slate-900 shadow-lg">
                                        <MasterProductCard item={deal} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>
                )}

                {/* 4. LE GRAND ÉTALAGE : CATALOGUE AVEC SYSTÈME DE FACETTES ET PRIX */}
                <section className="pt-2">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        
                        {/* SIDEBAR DE FILTRES & FACETTES (DESKTOP) */}
                        <aside className="hidden lg:block lg:col-span-3 space-y-6">
                            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-6 sticky top-24">
                                
                                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                                    <h3 className="font-black text-slate-900 flex items-center gap-2 text-sm">
                                        <SlidersHorizontal className="w-4 h-4 text-amber-500" />
                                        Filtres & Facettes
                                    </h3>
                                    {activeFiltersCount > 0 && (
                                        <button 
                                            onClick={resetFilters}
                                            className="text-xs text-amber-600 hover:underline font-bold"
                                        >
                                            Effacer tout ({activeFiltersCount})
                                        </button>
                                    )}
                                </div>

                                {/* Quick Checkbox Filters */}
                                <div className="space-y-3">
                                    <label className="flex items-center space-x-2.5 cursor-pointer text-xs font-semibold text-slate-700 hover:text-slate-900 transition-colors">
                                        <input 
                                            type="checkbox"
                                            checked={onlyFlashDeals}
                                            onChange={(e) => setOnlyFlashDeals(e.target.checked)}
                                            className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500"
                                        />
                                        <span className="flex items-center gap-1.5">
                                            <Zap className="w-3.5 h-3.5 text-red-500" />
                                            En Promotion / Vente Flash
                                        </span>
                                    </label>

                                    <label className="flex items-center space-x-2.5 cursor-pointer text-xs font-semibold text-slate-700 hover:text-slate-900 transition-colors">
                                        <input 
                                            type="checkbox"
                                            checked={onlyFastDelivery}
                                            onChange={(e) => setOnlyFastDelivery(e.target.checked)}
                                            className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500"
                                        />
                                        <span className="flex items-center gap-1.5">
                                            <Clock className="w-3.5 h-3.5 text-emerald-500" />
                                            Livraison Express (&lt; 2h)
                                        </span>
                                    </label>

                                    <label className="flex items-center space-x-2.5 cursor-pointer text-xs font-semibold text-slate-700 hover:text-slate-900 transition-colors">
                                        <input 
                                            type="checkbox"
                                            checked={onlyInStock}
                                            onChange={(e) => setOnlyInStock(e.target.checked)}
                                            className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500"
                                        />
                                        <span className="flex items-center gap-1.5">
                                            <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />
                                            En Stock Immédiat
                                        </span>
                                    </label>
                                </div>

                                {/* FILTRE DE PRIX COMPLET (MIN/MAX + SLIDER + BOUTONS) */}
                                <div className="space-y-3 pt-4 border-t border-slate-100">
                                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">
                                        Fourchette de Prix (FCFA)
                                    </h4>

                                    {/* Min & Max Inputs */}
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="text-[10px] text-slate-400 font-semibold block mb-1">Min</label>
                                            <input 
                                                type="number"
                                                placeholder="0"
                                                value={minPriceInput}
                                                onChange={(e) => setMinPriceInput(e.target.value)}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-slate-400 font-semibold block mb-1">Max</label>
                                            <input 
                                                type="number"
                                                placeholder="500000"
                                                value={maxPriceInput}
                                                onChange={(e) => setMaxPriceInput(e.target.value)}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                            />
                                        </div>
                                    </div>

                                    {/* Range Slider */}
                                    <div className="space-y-1 pt-1">
                                        <input 
                                            type="range"
                                            min={1000}
                                            max={500000}
                                            step={5000}
                                            value={priceRangeSlider}
                                            onChange={(e) => {
                                                setPriceRangeSlider(Number(e.target.value));
                                                setMaxPriceInput(e.target.value);
                                            }}
                                            className="w-full accent-amber-500"
                                        />
                                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                                            <span>0 F</span>
                                            <span className="text-amber-600">{priceRangeSlider.toLocaleString()} FCFA</span>
                                        </div>
                                    </div>

                                    {/* Quick Price Pills */}
                                    <div className="flex flex-wrap gap-1.5 pt-1">
                                        <button
                                            onClick={() => { setMinPriceInput('0'); setMaxPriceInput('5000'); }}
                                            className="text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded-lg transition-colors"
                                        >
                                            &lt; 5 000 F
                                        </button>
                                        <button
                                            onClick={() => { setMinPriceInput('5000'); setMaxPriceInput('25000'); }}
                                            className="text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded-lg transition-colors"
                                        >
                                            5k - 25k F
                                        </button>
                                        <button
                                            onClick={() => { setMinPriceInput('25000'); setMaxPriceInput('100000'); }}
                                            className="text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded-lg transition-colors"
                                        >
                                            25k - 100k F
                                        </button>
                                    </div>
                                </div>

                                {/* SYSTÈME DE FACETTES DYNAMIQUES VENDURE */}
                                {groupedFacets.map((group) => {
                                    const isCollapsed = collapsedFacetGroups[group.id];
                                    return (
                                        <div key={group.id} className="pt-4 border-t border-slate-100 space-y-2.5">
                                            <div 
                                                onClick={() => toggleFacetGroup(group.id)}
                                                className="flex items-center justify-between cursor-pointer group select-none"
                                            >
                                                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 group-hover:text-amber-600 transition-colors">
                                                    {group.name}
                                                </h4>
                                                {isCollapsed ? (
                                                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                                                ) : (
                                                    <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                                                )}
                                            </div>

                                            {!isCollapsed && (
                                                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 text-xs">
                                                    {group.values.map((val) => {
                                                        const isSelected = selectedFacetValueIds.includes(val.id);
                                                        return (
                                                            <label 
                                                                key={val.id}
                                                                className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-50 cursor-pointer text-slate-700 transition-colors"
                                                            >
                                                                <div className="flex items-center space-x-2">
                                                                    <input 
                                                                        type="checkbox"
                                                                        checked={isSelected}
                                                                        onChange={() => toggleFacetValue(val.id)}
                                                                        className="w-3.5 h-3.5 text-amber-600 rounded border-slate-300 focus:ring-amber-500"
                                                                    />
                                                                    <span className={`text-xs ${isSelected ? 'font-bold text-amber-900' : 'font-medium'}`}>
                                                                        {val.name}
                                                                    </span>
                                                                </div>
                                                                {val.count > 0 && (
                                                                    <span className="text-[10px] text-slate-400 font-bold bg-slate-100 px-1.5 py-0.5 rounded-full">
                                                                        {val.count}
                                                                    </span>
                                                                )}
                                                            </label>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}

                            </div>
                        </aside>

                        {/* PRODUCT GRID CONTAINER */}
                        <div className="lg:col-span-9 space-y-6">
                            
                            {/* Toolbar: Count, Sorting, View Toggle */}
                            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex items-center gap-2">
                                    <span className="font-extrabold text-slate-900 text-sm md:text-base">
                                        {filteredProducts.length} Article{filteredProducts.length > 1 ? 's' : ''} disponible{filteredProducts.length > 1 ? 's' : ''}
                                    </span>
                                    {activeFiltersCount > 0 && (
                                        <span className="text-xs bg-amber-100 text-amber-900 px-2.5 py-1 rounded-full font-bold">
                                            {activeFiltersCount} filtre{activeFiltersCount > 1 ? 's' : ''} actif{activeFiltersCount > 1 ? 's' : ''}
                                        </span>
                                    )}
                                </div>

                                <div className="flex items-center gap-3">
                                    {/* Sort Dropdown */}
                                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                                        <select
                                            value={sortBy}
                                            onChange={(e) => setSortBy(e.target.value as any)}
                                            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                                        >
                                            <option value="recommended">Recommandés par Ahizan</option>
                                            <option value="price_asc">Prix : Moins cher d'abord</option>
                                            <option value="price_desc">Prix : Plus cher d'abord</option>
                                            <option value="rating_desc">Meilleures notes commerçants</option>
                                            <option value="delivery_fast">Livraison la plus rapide</option>
                                        </select>
                                    </div>

                                    {/* View Mode Toggle */}
                                    <div className="hidden sm:flex items-center border border-slate-200 rounded-xl p-0.5 bg-slate-50">
                                        <button
                                            onClick={() => setViewMode('grid-4')}
                                            className={`p-1.5 rounded-lg transition-colors ${viewMode === 'grid-4' ? 'bg-white shadow text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
                                            title="Grille 4 colonnes"
                                        >
                                            <Grid3X3 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => setViewMode('grid-3')}
                                            className={`p-1.5 rounded-lg transition-colors ${viewMode === 'grid-3' ? 'bg-white shadow text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
                                            title="Grille 3 colonnes"
                                        >
                                            <Grid2X2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Products Rendering */}
                            {filteredProducts.length > 0 ? (
                                <div className={`grid gap-4 ${
                                    viewMode === 'grid-4' 
                                        ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4' 
                                        : 'grid-cols-2 sm:grid-cols-2 md:grid-cols-3'
                                }`}>
                                    {filteredProducts.map((item) => (
                                        <div key={item.id} className="h-full">
                                            <MasterProductCard item={item} />
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-4 shadow-sm">
                                    <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-500 mx-auto flex items-center justify-center">
                                        <ShoppingBag className="w-8 h-8" />
                                    </div>
                                    <h3 className="text-lg font-black text-slate-900">
                                        Aucun produit ne correspond à vos filtres
                                    </h3>
                                    <p className="text-sm text-slate-500 max-w-md mx-auto">
                                        Modifiez votre fourchette de prix ou vos facettes sélectionnées pour voir les autres articles disponibles au {market.name}.
                                    </p>
                                    <Button 
                                        onClick={resetFilters}
                                        className="bg-slate-900 text-white font-bold rounded-xl px-6 py-2.5"
                                    >
                                        Réinitialiser tous les filtres
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                {/* 5. HUB LOGISTIQUE MARCHÉ */}
                <section className="bg-slate-900 text-white rounded-3xl p-8 sm:p-10 shadow-xl border border-slate-800">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="space-y-2">
                            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mb-3">
                                <Truck className="w-6 h-6" />
                            </div>
                            <h4 className="font-black text-lg">Livraison Groupée du Marché</h4>
                            <p className="text-xs text-slate-400 leading-relaxed">
                                Vos achats effectués sur {market.name} sont regroupés par un coursier dédié pour une livraison en une seule course à votre adresse.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3">
                                <ShieldCheck className="w-6 h-6" />
                            </div>
                            <h4 className="font-black text-lg">Garantie Fraîcheur & Authenticité</h4>
                            <p className="text-xs text-slate-400 leading-relaxed">
                                Tous les produits de {market.name} sont vérifiés lors de l'enlèvement. Vous payez en toute sécurité par Mobile Money ou Carte bancaire.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <div className="w-12 h-12 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center mb-3">
                                <Clock className="w-6 h-6" />
                            </div>
                            <h4 className="font-black text-lg">Expédition Express en Direct</h4>
                            <p className="text-xs text-slate-400 leading-relaxed">
                                Les commandes passées pendant les heures d'ouverture du marché sont préparées et prises en charge immédiatement par les livreurs locaux.
                            </p>
                        </div>
                    </div>
                </section>

            </div>
        </div>
    );
}
