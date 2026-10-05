"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { Search, Store, ShoppingBag, X, ArrowRight, Sparkles, MapPin, Tag, Zap, CheckCircle2 } from 'lucide-react';
import { getAssetUrl, getShopApiUrl } from '@/lib/vendure/api-utils';
import { fetchWithClientCache } from '@/lib/vendure/client-cache';
import { useLocation } from '@/contexts/location-context';
import { MasterDisplayItem, processAndResolveDisplayItems, DisplayEngineContext } from '@/lib/vendure/display-engine';

interface MarketProductSearchProps {
    config?: {
        title?: string;
        subtitle?: string;
        placeholder?: string;
        marketId?: string;
        marketName?: string;
        marketSlug?: string;
        backgroundColor?: string;
        bgGradient?: string;
        cardBgColor?: string;
        textColor?: string;
        accentColor?: string;
        searchStyle?: 'floating-pill' | 'modern-card' | 'minimal' | 'glass';
        quickTags?: string[];
        showQuickTags?: boolean;
        showVendorMatches?: boolean;
        maxSuggestions?: number;
        [key: string]: any;
    };
}

function formatCFA(price: number): string {
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'XOF',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(price);
}

export function MarketProductSearch({ config = {} }: MarketProductSearchProps) {
    const { selectedLocation } = useLocation();
    const [searchTerm, setSearchTerm] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [marketProducts, setMarketProducts] = useState<MasterDisplayItem[]>([]);
    const [marketVendors, setMarketVendors] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [marketInfo, setMarketInfo] = useState<any>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // 1. Detect active market context
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const ahizanMarket = (window as any).ahizan?.market;
            if (ahizanMarket) {
                setMarketInfo(ahizanMarket);
            }
        }
    }, []);

    const effectiveMarket = marketInfo || {};
    const effectiveMarketId = config.marketId || effectiveMarket.id;
    const effectiveMarketName = config.marketName || effectiveMarket.name || "ce marché";
    const effectiveMarketSlug = config.marketSlug || effectiveMarket.slug || "";

    // 2. Fetch Central Catalog + Real Seller Offers, then Score via Ahizan Display Engine
    useEffect(() => {
        if (!effectiveMarketId) return;

        let isMounted = true;
        setLoading(true);
        const shopApiUrl = getShopApiUrl();

        const catalogQuery = `
            query GetMarketSearchUnifiedCatalog {
                vendors(options: { filter: { status: { eq: "APPROVED" } }, take: 100 }) {
                    items {
                        id
                        name
                        slug
                        rating
                        ratingCount
                        verificationStatus
                        latitude
                        longitude
                        logo { preview }
                        physicalMarket { id name }
                        location { id name }
                    }
                }
                search(input: { take: 150, groupByProduct: false }) {
                    items {
                        productId
                        productVariantId
                        productName
                        productVariantName
                        slug
                        facetValueIds
                        productAsset { id preview }
                        productVariantAsset { id preview }
                        priceWithTax {
                            __typename
                            ... on SinglePrice { value }
                            ... on PriceRange { min max }
                        }
                        currencyCode
                        inStock
                        collections { id name slug }
                    }
                }
            }
        `;

        fetchWithClientCache(shopApiUrl, catalogQuery, {})
            .then(async (data: any) => {
                if (!isMounted) return;

                const vendorsList: any[] = data?.vendors?.items || [];
                const searchItems: any[] = data?.search?.items || [];

                // Filter vendors belonging to or nearby this market
                const vendorsInMarket = vendorsList.filter((v: any) => 
                    String(v.physicalMarket?.id) === String(effectiveMarketId) ||
                    (v.physicalMarket?.name && effectiveMarketName && v.physicalMarket.name.toLowerCase().includes(effectiveMarketName.toLowerCase()))
                );
                setMarketVendors(vendorsInMarket.length > 0 ? vendorsInMarket : vendorsList.slice(0, 8));

                const searchVariantIds = Array.from(new Set(searchItems.map((i: any) => i.productVariantId).filter(Boolean)));
                const rawCandidateProducts: any[] = [];

                if (searchVariantIds.length > 0) {
                    try {
                        const offersQuery = `
                            query GetSellerOffersForMarketSearch($vIds: [ID!]!) {
                                sellerOffersForVariants(variantIds: $vIds) {
                                    id
                                    price
                                    stock
                                    onPromotion
                                    promotionalPrice
                                    condition
                                    deliveryTimeValue
                                    deliveryTimeUnit
                                    vendor {
                                        id
                                        name
                                        slug
                                        phoneNumber
                                        latitude
                                        longitude
                                        verificationStatus
                                        rating
                                        ratingCount
                                        logo { preview }
                                        location { id name }
                                        physicalMarket { id name }
                                    }
                                    productVariant {
                                        id
                                        name
                                        sku
                                        featuredAsset { id preview }
                                        options { id name code group { id name } }
                                        product {
                                            id
                                            name
                                            slug
                                            featuredAsset { id preview }
                                            collections { id name slug }
                                        }
                                    }
                                }
                            }
                        `;
                        const offersData = await fetchWithClientCache(shopApiUrl, offersQuery, { vIds: searchVariantIds });
                        const offers: any[] = offersData?.sellerOffersForVariants || [];

                        for (const item of searchItems) {
                            const vId = String(item.productVariantId);
                            const matchingOffers = offers.filter(o => String(o.productVariant?.id) === vId && o.vendor?.id);
                            for (const off of matchingOffers) {
                                rawCandidateProducts.push({
                                    id: `${item.productId}-${vId}-${off.vendor?.id}`,
                                    productId: item.productId || off.productVariant?.product?.id,
                                    productName: item.productName || off.productVariant?.product?.name,
                                    productVariantId: vId,
                                    productVariantName: off.productVariant?.name || item.productVariantName,
                                    productVariant: off.productVariant,
                                    slug: item.slug || off.productVariant?.product?.slug,
                                    featuredAsset: off.productVariant?.featuredAsset || item.productVariantAsset || item.productAsset,
                                    sku: off.productVariant?.sku,
                                    vendorId: off.vendor?.id,
                                    vendorName: off.vendor?.name,
                                    marketName: off.vendor?.physicalMarket?.name,
                                    marketId: off.vendor?.physicalMarket?.id,
                                    locationName: off.vendor?.location?.name,
                                    locationId: off.vendor?.location?.id,
                                    latitude: off.vendor?.latitude,
                                    longitude: off.vendor?.longitude,
                                    price: off.price,
                                    promotionalPrice: off.promotionalPrice,
                                    onPromotion: off.onPromotion,
                                    stock: off.stock,
                                    condition: off.condition,
                                    deliveryTimeValue: off.deliveryTimeValue,
                                    deliveryTimeUnit: off.deliveryTimeUnit,
                                    vendor: off.vendor,
                                    collections: item.collections || off.productVariant?.product?.collections || [],
                                    options: off.productVariant?.options || [],
                                    facetValueIds: item.facetValueIds || [],
                                    customFields: {
                                        vendor: off.vendor,
                                        onPromotion: off.onPromotion,
                                        promotionalPrice: off.promotionalPrice,
                                    }
                                });
                            }
                        }
                    } catch (e) {
                        console.warn('[MarketProductSearch] Candidate offers error:', e);
                    }
                }

                // 3. Process and Score via Ahizan Display Engine with full location & market context
                const userLat = selectedLocation?.latitude != null 
                    ? Number(selectedLocation.latitude) 
                    : (effectiveMarket.centerLatitude ? Number(effectiveMarket.centerLatitude) : undefined);
                
                const userLon = selectedLocation?.longitude != null 
                    ? Number(selectedLocation.longitude) 
                    : (effectiveMarket.centerLongitude ? Number(effectiveMarket.centerLongitude) : undefined);

                const displayContext: DisplayEngineContext = {
                    pageType: 'MARKET_PAGE',
                    experienceStrategy: 'LOCAL_DISCOVERY',
                    marketId: effectiveMarketId ? String(effectiveMarketId) : undefined,
                    userLocation: selectedLocation,
                    userLat,
                    userLon,
                    communeName: selectedLocation?.name || effectiveMarket.geoZone?.name || 'Cotonou',
                    boostCertifiedVendors: true,
                    maxVariantsPerCentralProduct: 3,
                };

                const resolved = processAndResolveDisplayItems(rawCandidateProducts, displayContext);

                if (isMounted) {
                    setMarketProducts(resolved);
                    setLoading(false);
                }
            })
            .catch((err) => {
                console.error('[MarketProductSearch] Load error:', err);
                if (isMounted) setLoading(false);
            });

        return () => { isMounted = false; };
    }, [effectiveMarketId, selectedLocation?.latitude, selectedLocation?.longitude, effectiveMarket.centerLatitude, effectiveMarket.centerLongitude]);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Filter results strictly preserving the Display Engine ranking
    const maxSuggestions = Number(config.maxSuggestions || 8);
    const trimmed = searchTerm.trim().toLowerCase();

    const filteredProducts = useMemo(() => {
        if (!trimmed) {
            // If no term, show top Display Engine ranked items
            return marketProducts.slice(0, maxSuggestions);
        }
        return marketProducts.filter(p => {
            const nameMatch = (p.name || p.productName || '').toLowerCase().includes(trimmed);
            const vendorMatch = (p.vendorName || p.winningOffer?.vendor?.name || '').toLowerCase().includes(trimmed);
            const declinationMatch = (p.declinationName || p.winningOffer?.declinationName || '').toLowerCase().includes(trimmed);
            return nameMatch || vendorMatch || declinationMatch;
        }).slice(0, maxSuggestions);
    }, [marketProducts, trimmed, maxSuggestions]);

    const filteredVendors = useMemo(() => {
        if (!trimmed || config.showVendorMatches === false) return [];
        return marketVendors.filter(v => 
            (v.name || '').toLowerCase().includes(trimmed)
        ).slice(0, 3);
    }, [marketVendors, trimmed, config.showVendorMatches]);

    const defaultTags = [
        "Tomates & Légumes", 
        "Tissu Wax & Mode", 
        "Gari & Vivriers", 
        "Poissons & Viandes", 
        "Épices & Condiments",
        "Maroquinerie"
    ];
    const quickTags: string[] = Array.isArray(config.quickTags) && config.quickTags.length > 0 
        ? config.quickTags 
        : defaultTags;

    const rawPlaceholder = config.placeholder || `Rechercher un produit au {{market.name}}...`;
    const placeholder = rawPlaceholder.replace(/\{\{market\.name\}\}/g, effectiveMarketName);

    const searchStyle = config.searchStyle || 'floating-pill';
    const accentColor = config.accentColor || '#0B1E3B';

    return (
        <section 
            className="w-full py-6 md:py-8 relative z-30 transition-all duration-300"
            style={{
                backgroundColor: config.backgroundColor || 'transparent',
                backgroundImage: config.bgGradient || undefined,
            }}
        >
            <div className="container mx-auto px-4 max-w-4xl" ref={containerRef}>
                
                {/* Optional Header */}
                {(config.title || config.subtitle) && (
                    <div className="text-center mb-4 space-y-1">
                        {config.title && (
                            <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                {config.title.replace(/\{\{market\.name\}\}/g, effectiveMarketName)}
                            </h2>
                        )}
                        {config.subtitle && (
                            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                                {config.subtitle.replace(/\{\{market\.name\}\}/g, effectiveMarketName)}
                            </p>
                        )}
                    </div>
                )}

                {/* Main Search Bar Input */}
                <div className="relative">
                    <div 
                        className={`flex items-center gap-3 bg-white dark:bg-slate-900 border-2 transition-all duration-300 ${
                            searchStyle === 'floating-pill' 
                                ? 'rounded-full shadow-xl hover:shadow-2xl focus-within:shadow-2xl p-2 sm:p-2.5' 
                                : searchStyle === 'glass' 
                                    ? 'rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-lg p-2.5' 
                                    : 'rounded-2xl shadow-md p-2.5'
                        }`}
                        style={{
                            borderColor: isOpen ? accentColor : 'rgba(11, 30, 59, 0.15)',
                        }}
                    >
                        <div className="pl-3 text-slate-400 shrink-0">
                            <Search className="w-5 h-5" style={{ color: isOpen ? accentColor : undefined }} />
                        </div>

                        <input 
                            type="text"
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setIsOpen(true);
                            }}
                            onFocus={() => setIsOpen(true)}
                            placeholder={placeholder}
                            className="w-full bg-transparent border-none outline-none text-sm sm:text-base font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 placeholder:font-normal"
                        />

                        {searchTerm && (
                            <button 
                                type="button"
                                onClick={() => {
                                    setSearchTerm('');
                                    setIsOpen(false);
                                }}
                                className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}

                        <div className="hidden sm:flex items-center gap-1 shrink-0 pr-1">
                            <span className="text-[11px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700 whitespace-nowrap flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-primary" />
                                {effectiveMarketName}
                            </span>
                        </div>
                    </div>

                    {/* Instant Live Results Dropdown */}
                    {isOpen && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200 divide-y divide-slate-100 dark:divide-slate-800">
                            
                            {/* Matching Boutiques Header */}
                            {filteredVendors.length > 0 && (
                                <div className="p-3 bg-slate-50/80 dark:bg-slate-800/50">
                                    <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                                        <Store className="w-3.5 h-3.5 text-primary" />
                                        <span>Boutiques du marché {effectiveMarketName}</span>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {filteredVendors.map((vendor) => (
                                            <Link 
                                                key={vendor.id}
                                                href={`/vendor/${vendor.slug || vendor.id}`}
                                                className="flex items-center gap-2.5 p-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-primary/5 hover:border-primary/40 border border-slate-200/60 dark:border-slate-700 transition-all no-underline text-inherit group"
                                                onClick={() => setIsOpen(false)}
                                            >
                                                <div className="w-8 h-8 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-700 shrink-0 flex items-center justify-center">
                                                    {vendor.logo?.preview ? (
                                                        <img src={getAssetUrl(vendor.logo.preview)} alt={vendor.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <Store className="w-4 h-4 text-slate-400" />
                                                    )}
                                                </div>
                                                <span className="font-bold text-xs text-slate-900 dark:text-white group-hover:text-primary truncate">
                                                    {vendor.name}
                                                </span>
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Products List */}
                            <div className="max-h-[380px] overflow-y-auto p-2 sm:p-3 space-y-1">
                                <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 px-2 py-1 flex items-center justify-between">
                                    <span className="flex items-center gap-1.5">
                                        <ShoppingBag className="w-3.5 h-3.5 text-primary" />
                                        <span>
                                            {trimmed ? `Résultats pour "${searchTerm}"` : `Top Sélections au ${effectiveMarketName}`}
                                        </span>
                                    </span>
                                    <span className="text-[10px] font-bold text-slate-400">
                                        {filteredProducts.length} produit{filteredProducts.length > 1 ? 's' : ''}
                                    </span>
                                </div>

                                {loading ? (
                                    <div className="p-6 text-center text-slate-400 text-xs">
                                        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
                                        <span>Chargement des offres du marché...</span>
                                    </div>
                                ) : filteredProducts.length === 0 ? (
                                    <div className="p-6 text-center text-slate-500 text-xs">
                                        <ShoppingBag className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                                        <p className="font-semibold">Aucun article trouvé pour "{searchTerm}" dans ce marché.</p>
                                        <p className="text-[11px] text-slate-400 mt-1">Essayez un autre mot-clé ou parcourez les rayons ci-dessous.</p>
                                    </div>
                                ) : (
                                    filteredProducts.map((prod) => {
                                        const imgUrl = prod.featuredAsset?.preview ? getAssetUrl(prod.featuredAsset.preview) : (prod.productAsset?.preview ? getAssetUrl(prod.productAsset.preview) : null);
                                        const vendorName = prod.vendorName || prod.winningOffer?.vendor?.name || 'Vendeur Certifié';
                                        const isPromo = prod.onPromotion || prod.winningOffer?.onPromotion;
                                        const price = prod.promotionalPrice || prod.price || prod.winningOffer?.promotionalPrice || prod.winningOffer?.price || 0;
                                        const oldPrice = isPromo ? (prod.price || prod.winningOffer?.price) : null;

                                        return (
                                            <Link 
                                                key={prod.id}
                                                href={`/product/${prod.slug}?offerId=${prod.winningOffer?.id || prod.id}`}
                                                className="flex items-center gap-3 p-2 sm:p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-all no-underline text-inherit group"
                                                onClick={() => setIsOpen(false)}
                                            >
                                                <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0 border border-slate-200/50 relative">
                                                    {imgUrl ? (
                                                        <img src={imgUrl} alt={prod.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                                                            <ShoppingBag className="w-5 h-5" />
                                                        </div>
                                                    )}
                                                    {isPromo && (
                                                        <span className="absolute top-0.5 right-0.5 bg-rose-500 text-white text-[9px] font-black px-1 rounded">
                                                            PROMO
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white truncate group-hover:text-primary transition-colors">
                                                        {prod.declinationName ? `${prod.productName} — ${prod.declinationName}` : prod.name}
                                                    </h4>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 truncate">
                                                            <Store className="w-3 h-3 text-slate-400 shrink-0" />
                                                            {vendorName}
                                                        </span>
                                                        {prod.fallbackLabel && (
                                                            <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded font-bold">
                                                                {prod.fallbackLabel}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="text-right shrink-0">
                                                    <span className="font-black text-xs sm:text-sm text-primary block">
                                                        {formatCFA(price)}
                                                    </span>
                                                    {oldPrice && oldPrice > price && (
                                                        <span className="text-[10px] text-slate-400 line-through">
                                                            {formatCFA(oldPrice)}
                                                        </span>
                                                    )}
                                                </div>
                                            </Link>
                                        );
                                    })
                                )}
                            </div>

                        </div>
                    )}
                </div>

                {/* Quick Tags / Popular Searches */}
                {config.showQuickTags !== false && quickTags.length > 0 && (
                    <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-1 scrollbar-none no-scrollbar flex-wrap sm:flex-nowrap justify-center sm:justify-start">
                        <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 shrink-0 flex items-center gap-1">
                            <Tag className="w-3 h-3" />
                            Rayons rapides :
                        </span>
                        {quickTags.map((tag, idx) => (
                            <button
                                key={idx}
                                type="button"
                                onClick={() => {
                                    setSearchTerm(tag);
                                    setIsOpen(true);
                                }}
                                className="text-[11px] font-semibold px-3 py-1 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-primary hover:text-primary hover:bg-primary/5 transition-all shadow-xs shrink-0 cursor-pointer"
                            >
                                {tag}
                            </button>
                        ))}
                    </div>
                )}

            </div>
        </section>
    );
}

export default MarketProductSearch;
