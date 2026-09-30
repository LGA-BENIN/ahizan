"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { Search, Store, ShoppingBag, X, ArrowRight, Sparkles, MapPin, Tag } from 'lucide-react';
import { getAssetUrl, getShopApiUrl } from '@/lib/vendure/api-utils';
import { fetchWithClientCache } from '@/lib/vendure/client-cache';
import { interpolateLocalVariables } from '@/lib/cms/interpolation';
import { useLocation } from '@/contexts/location-context';

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
    const [marketProducts, setMarketProducts] = useState<any[]>([]);
    const [marketVendors, setMarketVendors] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [marketInfo, setMarketInfo] = useState<any>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Detect active market context
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

    // Fetch all products from vendors belonging to this specific market
    useEffect(() => {
        if (!effectiveMarketId) return;

        let isMounted = true;
        setLoading(true);

        const query = `
            query GetMarketSearchCatalog($marketId: ID!) {
                vendors(marketId: $marketId, options: { filter: { status: { eq: "APPROVED" } }, take: 100 }) {
                    items {
                        id
                        name
                        slug
                        logo { preview }
                        physicalMarket { id name }
                        products {
                            id
                            name
                            slug
                            featuredAsset { preview }
                            variants {
                                id
                                priceWithTax
                                customFields {
                                    onPromotion
                                    promotionalPrice
                                    compareAtPrice
                                }
                            }
                        }
                    }
                }
            }
        `;

        fetchWithClientCache(getShopApiUrl(), query, { marketId: String(effectiveMarketId) })
            .then((data: any) => {
                if (!isMounted) return;
                const vendors = data?.vendors?.items || [];
                setMarketVendors(vendors);

                const prods: any[] = [];
                vendors.forEach((vendor: any) => {
                    (vendor.products || []).forEach((prod: any) => {
                        const variant = prod.variants?.[0];
                        const price = variant?.customFields?.onPromotion && variant?.customFields?.promotionalPrice
                            ? variant.customFields.promotionalPrice
                            : variant?.priceWithTax || 0;

                        prods.push({
                            id: prod.id,
                            name: prod.name,
                            slug: prod.slug,
                            image: prod.featuredAsset?.preview ? getAssetUrl(prod.featuredAsset.preview) : null,
                            price,
                            vendorId: vendor.id,
                            vendorName: vendor.name,
                            vendorLogo: vendor.logo?.preview ? getAssetUrl(vendor.logo.preview) : null,
                            vendorSlug: vendor.slug || vendor.id,
                        });
                    });
                });

                setMarketProducts(prods);
                setLoading(false);
            })
            .catch(() => {
                if (isMounted) setLoading(false);
            });

        return () => { isMounted = false; };
    }, [effectiveMarketId]);

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

    // Filter results strictly within this market
    const maxSuggestions = Number(config.maxSuggestions || 8);
    const trimmed = searchTerm.trim().toLowerCase();

    const filteredProducts = useMemo(() => {
        if (!trimmed) return [];
        return marketProducts.filter(p => 
            p.name.toLowerCase().includes(trimmed) || 
            p.vendorName.toLowerCase().includes(trimmed)
        ).slice(0, maxSuggestions);
    }, [marketProducts, trimmed, maxSuggestions]);

    const filteredVendors = useMemo(() => {
        if (!trimmed || config.showVendorMatches === false) return [];
        return marketVendors.filter(v => 
            v.name.toLowerCase().includes(trimmed)
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

    const rawPlaceholder = config.placeholder || `Rechercher un produit au ${effectiveMarketName}...`;
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
                            <span className="text-[11px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700 whitespace-nowrap">
                                🏪 {effectiveMarketName}
                            </span>
                        </div>
                    </div>

                    {/* Instant Live Results Dropdown */}
                    {isOpen && trimmed.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200 divide-y divide-slate-100 dark:divide-slate-800">
                            
                            {/* Matching Boutiques Header */}
                            {filteredVendors.length > 0 && (
                                <div className="p-3 bg-slate-50/80 dark:bg-slate-800/50">
                                    <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                                        <Store className="w-3.5 h-3.5 text-primary" />
                                        <span>Boutiques de {effectiveMarketName}</span>
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
                                        <span>Produits disponibles à {effectiveMarketName}</span>
                                    </span>
                                    <span className="text-[10px] font-bold text-slate-400">
                                        {filteredProducts.length} résultat{filteredProducts.length > 1 ? 's' : ''}
                                    </span>
                                </div>

                                {filteredProducts.length === 0 ? (
                                    <div className="p-6 text-center text-slate-500 text-xs">
                                        <ShoppingBag className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                                        <p className="font-semibold">Aucun article trouvé pour "{searchTerm}" dans ce marché.</p>
                                        <p className="text-[11px] text-slate-400 mt-1">Essayez un autre mot-clé ou consultez les allées du marché.</p>
                                    </div>
                                ) : (
                                    filteredProducts.map((prod) => (
                                        <Link 
                                            key={prod.id}
                                            href={`/product/${prod.slug}`}
                                            className="flex items-center gap-3 p-2 sm:p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-all no-underline text-inherit group"
                                            onClick={() => setIsOpen(false)}
                                        >
                                            <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0 border border-slate-200/50">
                                                {prod.image ? (
                                                    <img src={prod.image} alt={prod.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                                                        <ShoppingBag className="w-5 h-5" />
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white truncate group-hover:text-primary transition-colors">
                                                    {prod.name}
                                                </h4>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 truncate">
                                                        <Store className="w-3 h-3 text-slate-400 shrink-0" />
                                                        {prod.vendorName}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="text-right shrink-0">
                                                <span className="font-black text-xs sm:text-sm text-primary">
                                                    {formatCFA(prod.price)}
                                                </span>
                                            </div>
                                        </Link>
                                    ))
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
