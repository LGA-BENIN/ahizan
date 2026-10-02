'use client';

import React, { useState, useMemo, useEffect, useTransition } from 'react';
import { MasterProductCard } from '@/components/commerce/master-product-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Sparkles, Clock, Flame, SlidersHorizontal, ArrowUpDown, Tag, AlertCircle, ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import { getAssetUrl, getShopApiUrl } from '@/lib/vendure/api-utils';
import { priceFromSubunit } from '@/lib/format';
import { BodySectionRenderer } from '@/components/ahizan/BodySectionRenderer';

import { useLocation } from '@/contexts/location-context';
import { calculateDistanceKm } from '@/lib/vendure/display-engine';

interface FlashDealsClientProps {
    initialProducts: any[];
    cmsPage?: any;
}

export function FlashDealsClient({ initialProducts, cmsPage }: FlashDealsClientProps) {
    const { selectedLocation } = useLocation();
    const userLat = selectedLocation?.latitude;
    const userLon = selectedLocation?.longitude;

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDiscount, setSelectedDiscount] = useState<number>(0);
    const [maxPrice, setMaxPrice] = useState<number>(0);
    const [sortBy, setSortBy] = useState<'recommended' | 'discount_desc' | 'price_asc' | 'price_desc' | 'newest'>('recommended');
    
    // General catalog fallback search state
    const [catalogResults, setCatalogResults] = useState<any[]>([]);
    const [isSearchingCatalog, setIsSearchingCatalog] = useState(false);
    const [isPending, startTransition] = useTransition();

    // 1. Identify active CMS sections
    const sections = (cmsPage?.sections || [])
        .filter((s: any) => (s.pageSlug || 'flash_deals') === 'flash_deals' || !['THEME_SETTINGS', 'HEADER_CONF', 'TOP_BAR', 'FOOTER_CONF'].includes(s.type))
        .sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
    const activeSections = sections.filter((s: any) => s.isActive !== false);

    // 2. Extract hero banner & countdown configuration
    const heroSection = activeSections.find((s: any) => s.type === 'FLASH_HERO_BANNER');
    const heroConfig = heroSection?.data || {};
    
    const flashSection = activeSections.find((s: any) => s.type === 'FLASH_DEALS');
    const flashConfig = flashSection?.data?.flashVersions?.[0] || flashSection?.data;

    const hasConfiguredCountdown = Boolean(
        (heroConfig.showCountdown && !heroConfig.isUnlimited && heroConfig.countdownEnd) ||
        (flashConfig?.showCountdown && !flashConfig?.isUnlimited && (flashConfig?.endTime || flashConfig?.countdownEnd))
    );
    const configuredEndTime = heroConfig.countdownEnd || flashConfig?.endTime || flashConfig?.countdownEnd;

    const [timeLeft, setTimeLeft] = useState<{ h: string; m: string; s: string }>({ h: '00', m: '00', s: '00' });

    useEffect(() => {
        if (!hasConfiguredCountdown || !configuredEndTime) return;

        const calculateTime = () => {
            const now = new Date();
            const end = new Date(configuredEndTime);
            const diff = end.getTime() - now.getTime();

            if (diff > 0) {
                const totalHours = Math.floor(diff / (1000 * 60 * 60));
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((diff % (1000 * 60)) / 1000);
                setTimeLeft({
                    h: String(totalHours).padStart(2, '0'),
                    m: String(minutes).padStart(2, '0'),
                    s: String(seconds).padStart(2, '0')
                });
            } else {
                setTimeLeft({ h: '00', m: '00', s: '00' });
            }
        };

        calculateTime();
        const interval = setInterval(calculateTime, 1000);
        return () => clearInterval(interval);
    }, [hasConfiguredCountdown, configuredEndTime]);

    // 3. Filter & sort flash sale products
    const filteredFlashProducts = useMemo(() => {
        let list = [...initialProducts];

        if (searchTerm.trim()) {
            const q = searchTerm.toLowerCase().trim();
            list = list.filter((p: any) => {
                const name = (p.name || p.productName || '').toLowerCase();
                const variantName = (p.variantName || p.declinationName || '').toLowerCase();
                const vendorName = (p.vendorName || p.winningOffer?.vendor?.name || '').toLowerCase();
                const marketName = (p.marketName || p.winningOffer?.vendor?.physicalMarket?.name || '').toLowerCase();
                return name.includes(q) || variantName.includes(q) || vendorName.includes(q) || marketName.includes(q);
            });
        }

        if (selectedDiscount > 0) {
            list = list.filter((p: any) => {
                const disc = Number(p.discountPercentage || p.winningOffer?.discountPercentage || 0);
                return disc >= selectedDiscount;
            });
        }

        if (maxPrice > 0) {
            list = list.filter((p: any) => {
                const rawPrice = p.price ?? p.winningOffer?.price ?? 0;
                const promoPrice = p.promotionalPrice ?? p.winningOffer?.promotionalPrice;
                const activePrice = p.onPromotion && promoPrice ? promoPrice : rawPrice;
                const userPrice = priceFromSubunit(activePrice);
                return userPrice <= maxPrice;
            });
        }

        // Dynamic distance calculation
        list = list.map(item => {
            const vLat = Number(item.latitude ?? item.winningOffer?.vendor?.latitude ?? item.vendor?.latitude);
            const vLon = Number(item.longitude ?? item.winningOffer?.vendor?.longitude ?? item.vendor?.longitude);
            let dKm: number | null = null;
            if (userLat && userLon && !isNaN(vLat) && !isNaN(vLon) && vLat !== 0 && vLon !== 0) {
                dKm = Math.round(calculateDistanceKm(userLat, userLon, vLat, vLon) * 10) / 10;
            }
            return {
                ...item,
                distanceKm: dKm !== null ? dKm : item.distanceKm,
            };
        });

        // Sorting
        if (sortBy === 'recommended') {
            list.sort((a: any, b: any) => {
                const scoreA = a.score ?? a.winningOffer?.score ?? (a.distanceKm != null ? (10000 - a.distanceKm * 100) : 0);
                const scoreB = b.score ?? b.winningOffer?.score ?? (b.distanceKm != null ? (10000 - b.distanceKm * 100) : 0);
                return scoreB - scoreA;
            });
        } else if (sortBy === 'discount_desc') {
            list.sort((a: any, b: any) => {
                const discA = Number(a.discountPercentage || a.winningOffer?.discountPercentage || 0);
                const discB = Number(b.discountPercentage || b.winningOffer?.discountPercentage || 0);
                return discB - discA;
            });
        } else if (sortBy === 'price_asc') {
            list.sort((a: any, b: any) => {
                const priceA = a.onPromotion && a.promotionalPrice ? a.promotionalPrice : (a.price || 0);
                const priceB = b.onPromotion && b.promotionalPrice ? b.promotionalPrice : (b.price || 0);
                return priceA - priceB;
            });
        } else if (sortBy === 'price_desc') {
            list.sort((a: any, b: any) => {
                const priceA = a.onPromotion && a.promotionalPrice ? a.promotionalPrice : (a.price || 0);
                const priceB = b.onPromotion && b.promotionalPrice ? b.promotionalPrice : (b.price || 0);
                return priceB - priceA;
            });
        }

        return list;
    }, [initialProducts, searchTerm, selectedDiscount, maxPrice, sortBy, userLat, userLon]);

    // 4. Fallback search on general catalog when user types a search query
    useEffect(() => {
        if (!searchTerm.trim()) {
            setCatalogResults([]);
            return;
        }

        const q = searchTerm.trim();
        const timeout = setTimeout(async () => {
            setIsSearchingCatalog(true);
            try {
                const apiUrl = getShopApiUrl();
                const query = `
                    query SearchCatalogFallback($term: String!) {
                        search(input: { term: $term, take: 12, groupByProduct: false }) {
                            items {
                                productId
                                productVariantId
                                productName
                                productVariantName
                                slug
                                productAsset { preview }
                                productVariantAsset { preview }
                                priceWithTax {
                                    __typename
                                    ... on SinglePrice { value }
                                    ... on PriceRange { min max }
                                }
                            }
                        }
                    }
                `;
                const res = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ query, variables: { term: q } })
                });
                const json = await res.json();
                const items = json?.data?.search?.items || [];
                
                // Exclude items already present in filtered flash sale list
                const flashIds = new Set(filteredFlashProducts.map((p: any) => String(p.productVariantId || p.productId || p.id)));
                const fallbackItems = items.filter((item: any) => !flashIds.has(String(item.productVariantId || item.productId)));
                setCatalogResults(fallbackItems);
            } catch (err) {
                console.warn('[FlashDealsClient] Catalog fallback error:', err);
                setCatalogResults([]);
            } finally {
                setIsSearchingCatalog(false);
            }
        }, 300);

        return () => clearTimeout(timeout);
    }, [searchTerm, filteredFlashProducts]);

    // Render Subcomponents
    const renderHeroBanner = (config?: any) => {
        const title = config?.title || 'Les Meilleures Remises Du Moment';
        const subtitle = config?.subtitle || 'Découvrez toutes les offres promotionnelles à durée et stock limités proposées par nos boutiques et marchands vérifiés au Bénin.';
        const badgeText = config?.badgeText || 'Ventes Flash Quotidiennes';
        const showGuarantees = config?.showBeninGuarantees !== false;
        const customBg = config?.bgColor ? { background: config.bgColor } : {};
        const customColor = config?.textColor ? { color: config.textColor } : {};

        return (
            <div 
                style={customBg} 
                className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-rose-950 text-white p-6 sm:p-10 md:p-12 shadow-2xl border border-rose-500/20"
            >
                <div className="absolute top-0 right-0 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-80 h-80 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

                <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                    <div className="space-y-4 max-w-2xl">
                        <div 
                            style={config?.badgeBgColor ? { backgroundColor: config.badgeBgColor } : {}}
                            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-600/30 border border-rose-500/50 text-rose-300 text-xs font-black uppercase tracking-wider"
                        >
                            <Flame className="w-4 h-4 text-rose-400 fill-rose-400 animate-pulse" />
                            <span>{badgeText}</span>
                        </div>
                        <h1 style={customColor} className="text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight leading-tight">
                            {title}
                        </h1>
                        <p className="text-slate-300 text-sm sm:text-base font-medium">
                            {subtitle}
                        </p>
                    </div>

                    {/* Countdown Clock or Benin Marketplace Guarantee Badge */}
                    {hasConfiguredCountdown ? (
                        <div className="bg-slate-900/80 backdrop-blur-md p-5 rounded-2xl border border-white/10 shadow-xl flex flex-col items-center justify-center shrink-0">
                            <div className="flex items-center gap-2 text-xs font-black text-rose-400 uppercase tracking-widest mb-3">
                                <Clock className="w-4 h-4" />
                                <span>Offres Valables Encore :</span>
                            </div>
                            <div className="flex items-center gap-2 font-black text-2xl sm:text-3xl tracking-tight">
                                <div className="flex flex-col items-center">
                                    <span className="bg-white/10 border border-white/20 px-3 py-2 rounded-xl min-w-[56px] text-center shadow-inner">
                                        {timeLeft.h}
                                    </span>
                                    <span className="text-[9px] uppercase tracking-widest text-slate-400 mt-1">Heures</span>
                                </div>
                                <span className="text-rose-500 mb-4 font-bold">:</span>
                                <div className="flex flex-col items-center">
                                    <span className="bg-white/10 border border-white/20 px-3 py-2 rounded-xl min-w-[56px] text-center shadow-inner">
                                        {timeLeft.m}
                                    </span>
                                    <span className="text-[9px] uppercase tracking-widest text-slate-400 mt-1">Minutes</span>
                                </div>
                                <span className="text-rose-500 mb-4 font-bold">:</span>
                                <div className="flex flex-col items-center">
                                    <span className="bg-white/10 border border-white/20 px-3 py-2 rounded-xl min-w-[56px] text-center shadow-inner">
                                        {timeLeft.s}
                                    </span>
                                    <span className="text-[9px] uppercase tracking-widest text-slate-400 mt-1">Secondes</span>
                                </div>
                            </div>
                        </div>
                    ) : showGuarantees ? (
                        <div className="bg-slate-900/80 backdrop-blur-md p-5 rounded-2xl border border-white/10 shadow-xl flex flex-col gap-2 shrink-0 max-w-sm">
                            <div className="flex items-center gap-2 text-xs font-black text-amber-400 uppercase tracking-wider">
                                <span>🇧🇯 Marketplace Certifiée Bénin</span>
                            </div>
                            <ul className="text-xs text-slate-300 space-y-1 font-medium">
                                <li className="flex items-center gap-1.5">
                                    <span className="text-emerald-400 font-bold">✓</span>
                                    <span>Prix négociés en direct avec les boutiques</span>
                                </li>
                                <li className="flex items-center gap-1.5">
                                    <span className="text-emerald-400 font-bold">✓</span>
                                    <span>Paiement Moov / MTN / Livraison</span>
                                </li>
                                <li className="flex items-center gap-1.5">
                                    <span className="text-emerald-400 font-bold">✓</span>
                                    <span>Retrait Dantokpa, Ganhi ou livraison express</span>
                                </li>
                            </ul>
                        </div>
                    ) : null}
                </div>
            </div>
        );
    };

    const renderSearchHub = (config?: any) => {
        const showSearch = config?.showSearch !== false;
        const showDiscounts = config?.showDiscountFilters !== false;
        const showSort = config?.showSort !== false;

        return (
            <div className="bg-card border border-border/80 rounded-2xl p-4 sm:p-6 shadow-sm space-y-4">
                <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
                    {/* Search bar */}
                    {showSearch && (
                        <div className="relative w-full md:max-w-md">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Rechercher une offre flash (t-shirt, chaussures, boutique...)"
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
                    )}

                    {/* Sort Dropdown */}
                    {showSort && (
                        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                            <ArrowUpDown className="w-4 h-4 text-muted-foreground hidden sm:block" />
                            <select
                                value={sortBy}
                                onChange={(e: any) => setSortBy(e.target.value)}
                                className="h-11 px-3 rounded-xl border border-border bg-background text-xs sm:text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary w-full sm:w-auto"
                            >
                                <option value="recommended">📍 Recommandé (Proximité)</option>
                                <option value="discount_desc">🔥 Plus grande remise (%)</option>
                                <option value="price_asc">💰 Prix croissant</option>
                                <option value="price_desc">💎 Prix décroissant</option>
                            </select>
                        </div>
                    )}
                </div>

                {/* Discount Filter Pills */}
                {showDiscounts && (
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide pt-2 border-t border-border/40">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap shrink-0 flex items-center gap-1 mr-1">
                            <Tag className="w-3.5 h-3.5" /> Remise :
                        </span>
                        {[
                            { label: 'Toutes les promos', value: 0 },
                            { label: '-20% et +', value: 20 },
                            { label: '-30% et +', value: 30 },
                            { label: '-50% et +', value: 50 },
                            { label: '-70% et +', value: 70 },
                        ].map((pill) => (
                            <button
                                key={pill.value}
                                onClick={() => setSelectedDiscount(pill.value)}
                                className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                                    selectedDiscount === pill.value
                                        ? 'bg-primary text-primary-foreground shadow-sm scale-105'
                                        : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                                }`}
                            >
                                {pill.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    const renderFlashGrid = (config?: any) => {
        const take = Number(config?.take) > 0 ? Number(config.take) : 200;
        const columns = Number(config?.columns) || 4;
        const displayItems = filteredFlashProducts.slice(0, take);

        let gridColsClass = "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4";
        if (columns === 2) gridColsClass = "grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2";
        else if (columns === 3) gridColsClass = "grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3";
        else if (columns === 5) gridColsClass = "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5";
        else if (columns === 6) gridColsClass = "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6";

        if (displayItems.length === 0) {
            return (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-6 text-center space-y-3 max-w-xl mx-auto">
                    <AlertCircle className="w-8 h-8 text-amber-600 mx-auto" />
                    <h3 className="font-black text-base text-foreground">
                        {searchTerm ? `Aucune vente flash trouvée pour « ${searchTerm} »` : 'Aucun produit en vente flash correspondant à vos critères'}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                        {searchTerm 
                            ? 'Découvrez ci-dessous les articles correspondants disponibles dans le catalogue général de nos boutiques :'
                            : 'Essayez de réinitialiser vos filtres pour découvrir toutes les offres disponibles.'}
                    </p>
                    {selectedDiscount > 0 && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => { setSelectedDiscount(0); setSearchTerm(''); }}
                            className="font-bold text-xs"
                        >
                            Voir toutes les ventes flash
                        </Button>
                    )}
                </div>
            );
        }

        return (
            <div className="space-y-4">
                <div className="flex items-center justify-between text-xs font-bold text-muted-foreground uppercase tracking-wider px-1">
                    <span>{displayItems.length} offre{displayItems.length > 1 ? 's' : ''} en vente flash</span>
                </div>
                <div className={`grid ${gridColsClass} gap-3 sm:gap-4 md:gap-6`}>
                    {displayItems.map((item, idx) => (
                        <MasterProductCard
                            key={`${item.vendorId || 'v'}-${item.productVariantId || item.productId || idx}`}
                            item={item}
                        />
                    ))}
                </div>
            </div>
        );
    };

    const renderCatalogFallback = () => {
        if (!searchTerm.trim() || catalogResults.length === 0) return null;

        return (
            <div className="pt-10 border-t border-border space-y-6">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <h2 className="text-lg sm:text-xl font-black uppercase tracking-tight flex items-center gap-2">
                            <ShoppingBag className="w-5 h-5 text-primary" />
                            <span>Autres articles du catalogue pour « {searchTerm} »</span>
                        </h2>
                        <p className="text-xs text-muted-foreground font-medium">
                            Articles disponibles chez nos marchands certifiés
                        </p>
                    </div>
                    <Button variant="ghost" size="sm" asChild className="text-xs font-bold text-primary">
                        <Link href={`/search?term=${encodeURIComponent(searchTerm)}`}>
                            Voir tout dans la recherche →
                        </Link>
                    </Button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 md:gap-6">
                    {catalogResults.map((item, idx) => (
                        <MasterProductCard
                            key={`cat-${item.productVariantId || item.productId || idx}`}
                            item={item}
                        />
                    ))}
                </div>
            </div>
        );
    };

    // If CMS sections are active for this page, render them according to the configured list
    if (activeSections.length > 0) {
        return (
            <div className="space-y-8 pb-16">
                {activeSections.map((sec: any, idx: number) => {
                    if (sec.type === 'FLASH_HERO_BANNER') {
                        return <React.Fragment key={sec.id || idx}>{renderHeroBanner(sec.data)}</React.Fragment>;
                    }
                    if (sec.type === 'FLASH_DEALS_SEARCH_HUB') {
                        return <React.Fragment key={sec.id || idx}>{renderSearchHub(sec.data)}</React.Fragment>;
                    }
                    if (sec.type === 'FLASH_DEALS_GRID') {
                        return <React.Fragment key={sec.id || idx}>{renderFlashGrid(sec.data)}</React.Fragment>;
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

                {/* Always include catalog fallback when user searches */}
                {renderCatalogFallback()}
            </div>
        );
    }

    // Default Fallback Layout when no custom sections configured
    return (
        <div className="space-y-8 pb-16">
            {renderHeroBanner()}
            {renderSearchHub()}
            {renderFlashGrid()}
            {renderCatalogFallback()}
        </div>
    );
}
