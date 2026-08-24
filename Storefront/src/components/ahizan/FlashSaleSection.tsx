"use client";

import { useState, useEffect, useRef } from "react";
import { Clock, ChevronRight, ChevronLeft, Sparkles } from "lucide-react";
import * as LucideIcons from "lucide-react";
import Link from "next/link";
import { ProductCard } from "@/components/commerce/product-card";
import { getAssetUrl, getShopApiUrl, getPromoPriceInfo } from "@/lib/vendure/api-utils";
import { fetchWithClientCache } from "@/lib/vendure/client-cache";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useThemeSettings } from '@/components/providers/theme-provider';

interface FlashSaleSectionProps {
    config: any;
}

const isGif = (url: string) => url?.toLowerCase().endsWith('.gif');

export function FlashSaleSection({ config: activeFlash }: FlashSaleSectionProps) {
    let endTimeStr = activeFlash?.countdownEnd || activeFlash?.endTime;
    let endMs = typeof endTimeStr === 'string' && endTimeStr.trim().length > 0 ? new Date(endTimeStr).getTime() : NaN;
    
    // If date is missing or in the past, provide an active 24h rolling countdown fallback so the section never disappears unexpectedly
    if (isNaN(endMs) || endMs <= Date.now()) {
        if (activeFlash?.forceHideWhenExpired === true) {
            return null;
        }
        const fallbackEnd = new Date(Date.now() + 24 * 60 * 60 * 1000);
        endTimeStr = fallbackEnd.toISOString();
        endMs = fallbackEnd.getTime();
    }

    const [flashProducts, setFlashProducts] = useState<any[]>([]);
    const iconValue = activeFlash?.icon || '⚡';
    const DynamicIcon = (LucideIcons as any)[iconValue];
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [timeLeft, setTimeLeft] = useState({ h: '00', m: '00', s: '00' });
    const [clientLoc, setClientLoc] = useState<any>(null);
    const themeSettings = useThemeSettings();
    const defaultImage = themeSettings?.defaultProductImage;
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const scroll = (direction: 'left' | 'right') => {
        if (scrollContainerRef.current) {
            const { current } = scrollContainerRef;
            const scrollAmount = current.clientWidth * 0.8;
            current.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
        }
    };

    useEffect(() => {
        if (!endTimeStr || activeFlash.isUnlimited) return;
        
        const updateTimer = () => {
            const now = new Date();
            const end = new Date(endTimeStr);
            const start = activeFlash.startTime ? new Date(activeFlash.startTime) : now;
            
            const isActive = now >= start && now <= end;
            const isSimple = activeFlash.isSimpleMode;

            if (!isActive && !isSimple) {
                setTimeLeft({ h: '00', m: '00', s: '00' });
                return;
            }

            const diff = end.getTime() - now.getTime();
            if (diff <= 0) {
                setTimeLeft({ h: '00', m: '00', s: '00' });
                return;
            }
        
            const h = Math.floor(diff / (1000 * 60 * 60));
            const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const s = Math.floor((diff % (1000 * 60)) / 1000);
            
            setTimeLeft({
                h: h < 10 ? `0${h}` : `${h}`,
                m: m < 10 ? `0${m}` : `${m}`,
                s: s < 10 ? `0${s}` : `${s}`
            });
        };

        updateTimer();
        const timer = setInterval(updateTimer, 1000);
        return () => clearInterval(timer);
    }, [endTimeStr, activeFlash]);

    const activeFlashStr = JSON.stringify(activeFlash);

    useEffect(() => {
        const activeFlashObj = activeFlashStr ? JSON.parse(activeFlashStr) : null;
        if (!activeFlashObj) return;

        const savedLoc = typeof window !== 'undefined' ? localStorage.getItem('ahizan_client_location') : null;
        const locObj = savedLoc ? JSON.parse(savedLoc) : null;
        setClientLoc(locObj);

        const isLocalMode = activeFlashObj.selectionType === 'LOCAL_NEIGHBORHOOD' || activeFlashObj.selectionType === 'LOCAL_MARKET';
        const isManualMode = activeFlashObj.selectionType === 'MANUAL' && activeFlashObj.manualProductIds?.length > 0;
        const isFilterMode = !isLocalMode && !isManualMode;
        
        if (isLocalMode && !locObj && activeFlashObj.unconfirmedLocationBehavior === 'hide_completely') {
            setFlashProducts([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        setErrorMsg(null);

        if (isLocalMode) {
            const variables = locObj 
                ? (activeFlashObj.selectionType === 'LOCAL_MARKET' || locObj.type === 'MARKET' ? { marketId: locObj.id } : { locationId: locObj.id })
                : {};
            const localQuery = `
                query GetLocalFlashProducts($marketId: ID, $locationId: ID) {
                    vendors(
                        marketId: $marketId, 
                        locationId: $locationId, 
                        options: { filter: { status: { eq: "APPROVED" } } }
                    ) {
                        items {
                            id
                            name
                            location {
                                id
                                name
                            }
                            physicalMarket {
                                id
                                name
                            }
                            products {
                                id
                                name
                                slug
                                featuredAsset { preview }
                                variants {
                                    id
                                    priceWithTax
                                    customFields {
                                        compareAtPrice
                                        onPromotion
                                        promotionalPrice
                                    }
                                }
                            }
                        }
                    }
                }
            `;
            const shopApiUrl = getShopApiUrl();
            fetchWithClientCache(shopApiUrl, localQuery, variables)
                .then(data => {
                    const vendorsList = data?.vendors?.items || [];
                    let items = vendorsList.flatMap((v: any) => (v.products || []).map((p: any) => ({
                        productId: p.id,
                        productVariantId: p.variants?.[0]?.id || p.id,
                        variants: p.variants,
                        productName: p.name,
                        slug: p.slug,
                        productAsset: p.featuredAsset || null,
                        priceWithTax: { __typename: 'SinglePrice', value: p.variants?.[0]?.priceWithTax || 0 },
                        currencyCode: 'XOF',
                        inStock: true,
                        collectionIds: [],
                        facetValueIds: [],
                        vendorName: v.name,
                        marketName: v.physicalMarket?.name || null,
                        locationName: v.location?.name || null
                    })));
                    const limit = activeFlashObj.filterCriteria?.take || 12;
                    setFlashProducts(items.slice(0, limit));
                    setLoading(false);
                })
                .catch(err => {
                    console.error('Fetch error for local flash:', err);
                    setLoading(false);
                });
            return;
        }
        
        if (isFilterMode) {
            const collectionIds = activeFlashObj.filterCriteria?.collectionIds || [];
            const shopApiUrl = getShopApiUrl();

            const fetchForCollection = async (collectionId?: string) => {
                const take = activeFlashObj.filterCriteria?.take || 50;
                
                if (collectionId) {
                    const collectionQuery = `
                        query GetCollectionProducts($id: ID!, $take: Int!) {
                            collection(id: $id) {
                                productVariants(options: { take: $take }) {
                                    items {
                                        priceWithTax
                                        customFields {
                                            compareAtPrice
                                            onPromotion
                                            promotionalPrice
                                        }
                                        product {
                                            id
                                            name
                                            slug
                                            assets {
                                                id
                                                preview
                                            }
                                            customFields {
                                                vendor {
                                                    id
                                                    name
                                                    location { name }
                                                    physicalMarket { name }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    `;
                    try {
                        const data = await fetchWithClientCache(shopApiUrl, collectionQuery, { id: String(collectionId), take });
                        if (!data?.collection?.productVariants?.items) return [];
                        const items = data.collection.productVariants.items;
                        const seen = new Set();
                        return items.reduce((acc: any[], item: any) => {
                            if (!seen.has(item.product.id)) {
                                seen.add(item.product.id);
                                acc.push({
                                    productId: item.product.id,
                                    productVariantId: item.id,
                                    productName: item.product.name,
                                    slug: item.product.slug,
                                    productAsset: item.product.assets?.[0],
                                    priceWithTax: { value: item.priceWithTax },
                                    customFields: item.customFields,
                                    vendorName: item.product.customFields?.vendor?.name || null,
                                    marketName: item.product.customFields?.vendor?.physicalMarket?.name || null,
                                    locationName: item.product.customFields?.vendor?.location?.name || null
                                });
                            }
                            return acc;
                        }, []);
                    } catch (err) {
                        console.error('Fetch error:', err);
                        return [];
                    }
                } else {
                    const productsQuery = `
                        query GetProducts($options: ProductListOptions) {
                            products(options: $options) {
                                items {
                                    id
                                    name
                                    slug
                                    assets {
                                        id
                                        preview
                                    }
                                    variants {
                                        id
                                        priceWithTax
                                    }
                                    customFields {
                                        vendor {
                                            id
                                            name
                                            location { name }
                                            physicalMarket { name }
                                        }
                                    }
                                }
                            }
                        }
                    `;
                    try {
                        const data = await fetchWithClientCache(shopApiUrl, productsQuery, { options: { take } });
                        if (!data?.products?.items) return [];
                        return data.products.items.map((prod: any) => ({
                            productId: prod.id,
                            productVariantId: prod.variants?.[0]?.id || prod.id,
                            variants: prod.variants,
                            productName: prod.name,
                            slug: prod.slug,
                            productAsset: prod.assets?.[0],
                            priceWithTax: { value: prod.variants?.[0]?.priceWithTax || 0 },
                            vendorName: prod.customFields?.vendor?.name || null,
                            marketName: prod.customFields?.vendor?.physicalMarket?.name || null,
                            locationName: prod.customFields?.vendor?.location?.name || null
                        }));
                    } catch (err) {
                        console.error('Fetch error:', err);
                        return [];
                    }
                }
            };

            const promises = collectionIds.length > 0 
                ? collectionIds.map((id: string) => fetchForCollection(id))
                : [fetchForCollection()];

            Promise.all(promises).then(results => {
                let items = results.flat();
                
                // Deduplicate items by productId
                const seen = new Set();
                items = items.filter(item => {
                    if (seen.has(item.productId)) return false;
                    seen.add(item.productId);
                    return true;
                });
                
                if (activeFlashObj.filterCriteria) {
                    const { minPrice, maxPrice } = activeFlashObj.filterCriteria;
                    
                    items = items.filter((item: any) => {
                        const price = item.priceWithTax?.min ?? item.priceWithTax?.value ?? 0;
                        const priceInFcfa = price;

                        if (minPrice > 0 && priceInFcfa < minPrice) return false;
                        if (maxPrice > 0 && priceInFcfa > maxPrice) return false;

                        return true;
                    });
                }

                const limit = activeFlashObj.filterCriteria?.take || 12;
                items = items.slice(0, limit);

                setFlashProducts(items.map((item: any) => ({
                    productId: item.productId,
                    productVariantId: item.productVariantId || item.variants?.[0]?.id || item.productId,
                    variants: item.variants,
                    productName: item.productName,
                    slug: item.slug,
                    productAsset: item.productAsset || null,
                    priceWithTax: { __typename: 'SinglePrice', value: item.priceWithTax?.min ?? item.priceWithTax?.value ?? 0 },
                    currencyCode: 'XOF',
                    inStock: true,
                    collectionIds: [],
                    facetValueIds: []
                })));
                setLoading(false);
            })
            .catch(err => { 
                console.error(`Fetch error for flash sale ${activeFlashObj.id}:`, err); 
                setErrorMsg('Connexion instable. Veuillez vérifier votre connexion internet et actualiser la page.');
                setLoading(false); 
            });

        } else if (activeFlashObj.selectionType === 'MANUAL' && activeFlashObj.manualProductIds?.length > 0) {
            const shopApiUrl = getShopApiUrl();
            const manualQuery = `
                query GetFlashProducts($options: ProductListOptions) {
                    products(options: $options) {
                        items {
                            id
                            name
                            slug
                            variants {
                                id
                                price
                                priceWithTax
                                stockLevel
                                customFields {
                                    compareAtPrice
                                    onPromotion
                                    promotionalPrice
                                }
                            }
                            assets {
                                preview
                            }
                            customFields {
                                vendor {
                                    id
                                    name
                                    location { name }
                                    physicalMarket { name }
                                }
                            }
                        }
                    }
                }
            `;
            fetchWithClientCache(shopApiUrl, manualQuery, {
                options: { 
                    filter: { id: { in: activeFlashObj.manualProductIds } },
                    take: activeFlashObj.filterCriteria?.take || 12
                } 
            })
            .then(data => {
                const items = data?.products?.items || [];
                setFlashProducts(items.map((p: any) => ({
                    productId: p.id,
                    productVariantId: p.variants?.[0]?.id || p.id,
                    variants: p.variants,
                    productName: p.name,
                    slug: p.slug,
                    productAsset: p.assets?.[0] || null,
                    priceWithTax: { __typename: 'SinglePrice', value: p.variants?.[0]?.priceWithTax || 0 },
                    currencyCode: 'XOF',
                    inStock: p.variants?.[0]?.stockLevel === 'IN_STOCK',
                    collectionIds: [],
                    facetValueIds: [],
                    vendorName: p.customFields?.vendor?.name || null,
                    marketName: p.customFields?.vendor?.physicalMarket?.name || null,
                    locationName: p.customFields?.vendor?.location?.name || null
                })));
                setLoading(false);
            })
            .catch(err => {
                console.error('Fetch error for manual flash products:', err);
                setLoading(false);
            });
        }
    }, [activeFlashStr]);

    const now = new Date();
    // Do not hide section silently when products are loading or empty

    return (
        <div className="animate-in fade-in slide-in-from-bottom-6 duration-500 relative group/carousel">
            {/* Header section */}
            {activeFlash.headerStyle === 'smart_cart' ? (
                <div className="flex flex-col text-left items-start mb-6 gap-1 px-2 sm:px-4 pt-4">
                    <div 
                        className="flex items-center gap-1.5 font-extrabold uppercase text-[10px] tracking-wider px-3 py-1 rounded-full shadow-sm text-white"
                        style={{ backgroundColor: activeFlash.badgeBgColor || activeFlash.accentColor || activeFlash.bgColor || '#e31837' }}
                    >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{activeFlash?.badgeText || (activeFlash?.selectionType === 'LOCAL_NEIGHBORHOOD' ? '📍 OFFRES DE QUARTIER' : activeFlash?.selectionType === 'LOCAL_MARKET' ? '📍 OFFRES DE MARCHÉ' : '✨ VENTES FLASH SPÉCIALES')}</span>
                    </div>
                    <div className="flex items-center justify-between w-full mt-3 flex-wrap gap-4">
                        <h2 
                            className="text-xl md:text-2xl font-black tracking-tight uppercase leading-tight flex items-center gap-2"
                            style={{ color: activeFlash.textColor || undefined }}
                        >
                            <span>{activeFlash?.icon || '🛍️'}</span> {activeFlash?.title || "Ventes Flash"}
                        </h2>
                        {!activeFlash.isUnlimited && (
                            <div className="flex items-center gap-2 bg-muted/60 px-3 py-1.5 rounded-xl border border-border">
                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Expire dans:</span>
                                <div 
                                    className="flex items-center gap-1 font-black text-xs sm:text-sm"
                                    style={{ color: activeFlash.accentColor || activeFlash.badgeBgColor || 'var(--primary)' }}
                                >
                                    <span className="bg-card px-1.5 py-0.5 rounded shadow-2xs">{timeLeft.h}</span>:
                                    <span className="bg-card px-1.5 py-0.5 rounded shadow-2xs">{timeLeft.m}</span>:
                                    <span className="bg-card px-1.5 py-0.5 rounded shadow-2xs">{timeLeft.s}</span>
                                </div>
                            </div>
                        )}
                    </div>
                    <p className="font-medium text-xs sm:text-sm mt-1 max-w-2xl text-muted-foreground">
                        {activeFlash?.subtitle || "Profitez de nos remises exceptionnelles en cours d'expiration"}
                    </p>
                    <div 
                        className="h-1 w-16 mt-3 rounded-full" 
                        style={{ backgroundColor: activeFlash.badgeBgColor || activeFlash.accentColor || activeFlash.bgColor || '#e31837' }}
                    />
                </div>
            ) : activeFlash.bgType === 'image_only' && activeFlash.bgImageUrl ? (
                <div className="relative w-full overflow-hidden rounded-t-xl">
                    <img 
                        src={getAssetUrl(activeFlash.bgImageUrl)} 
                        alt="" 
                        className="w-full h-auto object-cover max-h-[350px] rounded-t-xl" 
                    />
                </div>
            ) : (
                <div 
                    className={`flex flex-row items-center justify-between gap-2 sm:gap-4 overflow-hidden relative w-full text-left ${
                        activeFlash.isSimpleMode 
                        ? 'bg-transparent py-2 border-b border-border/40' 
                        : 'rounded-t-xl p-2.5 sm:p-3 md:p-4 shadow-sm'
                    }`}
                    style={{ 
                        backgroundColor: activeFlash.isSimpleMode ? 'transparent' : (activeFlash.bgColor || '#0f172a'),
                        backgroundImage: (!activeFlash.isSimpleMode && activeFlash?.bgImageUrl && !isGif(activeFlash.bgImageUrl)) ? `url(${getAssetUrl(activeFlash.bgImageUrl)})` : 'none',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                    }}
                >
                    {/* GIF Background */}
                    {!activeFlash.isSimpleMode && activeFlash?.bgImageUrl && isGif(activeFlash.bgImageUrl) && (
                        <img src={getAssetUrl(activeFlash.bgImageUrl)} alt="" className="absolute inset-0 w-full h-full object-cover z-0" />
                    )}

                    {/* Overlay for better text readability (Styled Mode Only) */}
                    {!activeFlash.isSimpleMode && <div className="absolute inset-x-0 inset-y-0 bg-black/40 z-0" />}

                    <div className="flex items-center gap-2 sm:gap-4 relative z-10 text-left min-w-0 flex-1">
                        {!activeFlash.isSimpleMode && (
                            <div className="flex items-center justify-center min-w-[24px] min-h-[24px]">
                                {DynamicIcon ? (
                                    <DynamicIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white fill-white" />
                                ) : (
                                    <span className="text-[18px] sm:text-[22px] leading-none">{iconValue}</span>
                                )}
                            </div>
                        )}
                        <div className="text-left min-w-0">
                            <h2 
                                className={`font-black tracking-tight flex items-center gap-2 text-left truncate ${
                                    activeFlash.isSimpleMode ? 'text-xs sm:text-lg text-black' : 'text-xs sm:text-lg md:text-xl text-white'
                                }`}
                                style={{ color: activeFlash.textColor || undefined }}
                            >
                                {activeFlash?.title || "Ventes Flash"}
                            </h2>
                            <p className={`text-[9px] sm:text-[12px] font-bold uppercase tracking-widest text-left truncate ${
                                activeFlash.isSimpleMode ? 'text-muted-foreground' : 'text-white/80'
                            }`}>
                                {activeFlash?.subtitle || "Stock limité !"}
                            </p>
                        </div>
                    </div>

                    {!activeFlash.isSimpleMode && !activeFlash.isUnlimited && (
                        <div className="ml-auto flex items-center gap-2 sm:gap-4 relative z-10 flex-shrink-0">
                            <div className="flex items-center gap-1.5 sm:gap-2">
                                <span className={`text-[10px] font-black uppercase tracking-widest hidden sm:block ${
                                    activeFlash.isSimpleMode ? 'text-muted-foreground' : 'text-white/60'
                                }`}>Fini dans:</span>
                                <div className={`flex items-center gap-0.5 sm:gap-1.5 font-black text-[11px] sm:text-lg md:text-xl ${
                                    activeFlash.isSimpleMode ? 'text-primary' : 'text-white'
                                }`}>
                                    <span className={`${activeFlash.isSimpleMode ? 'bg-muted' : 'bg-white/10 border border-white/20'} px-1 sm:px-2 py-0.5 sm:py-1 rounded min-w-[22px] sm:min-w-[32px] text-center`}>{timeLeft.h}</span>
                                    <span className="opacity-40">:</span>
                                    <span className={`${activeFlash.isSimpleMode ? 'bg-muted' : 'bg-white/10 border border-white/20'} px-1 sm:px-2 py-0.5 sm:py-1 rounded min-w-[22px] sm:min-w-[32px] text-center`}>{timeLeft.m}</span>
                                    <span className="opacity-40">:</span>
                                    <span className={`${activeFlash.isSimpleMode ? 'bg-muted' : 'bg-white/10 border border-white/20'} px-1 sm:px-2 py-0.5 sm:py-1 rounded min-w-[22px] sm:min-w-[32px] text-center`}>{timeLeft.s}</span>
                                </div>
                            </div>
                            
                            <Button 
                                variant={activeFlash.isSimpleMode ? "link" : "outline"} 
                                size="sm" 
                                asChild 
                                className={activeFlash.isSimpleMode 
                                    ? "text-primary font-black p-0 h-auto" 
                                    : "bg-white/10 text-white border-white/20 hover:bg-white hover:text-black font-black hidden md:flex"
                                }
                            >
                                <Link href="/search?sales=true">TOUT VOIR</Link>
                            </Button>
                        </div>
                    )}
                    
                    {/* Fallback View All for Simple Mode or Unlimited Mode */}
                    {(activeFlash.isSimpleMode || activeFlash.isUnlimited) && (
                        <div className="relative z-10">
                            <Button variant="link" asChild className={activeFlash.isSimpleMode ? "text-primary font-black p-0 h-auto" : "bg-white/10 text-white border-white/20 hover:bg-white hover:text-black font-black p-0 h-auto"}>
                                <Link href="/search?sales=true">TOUT VOIR <ChevronRight className="w-4 h-4 ml-1" /></Link>
                            </Button>
                        </div>
                    )}
                </div>
            )}

            {!clientLoc && (activeFlash?.selectionType === 'LOCAL_NEIGHBORHOOD' || activeFlash?.selectionType === 'LOCAL_MARKET') && activeFlash?.unconfirmedLocationBehavior !== 'hide_completely' && (
                <div className="mx-3 sm:mx-4 my-3 p-4 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
                    <div className="flex items-center gap-3 text-center sm:text-left">
                        <span className="text-2xl">📍</span>
                        <div>
                            <h4 className="font-black text-sm uppercase">Position non sélectionnée</h4>
                            <p className="text-xs font-medium opacity-90">
                                Veuillez choisir votre position en haut de page pour découvrir les offres flash exclusives de votre zone !
                            </p>
                        </div>
                    </div>
                    <button 
                        type="button"
                        onClick={() => window.dispatchEvent(new CustomEvent('open-location-modal'))}
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs uppercase rounded-lg shrink-0 transition-colors shadow-sm"
                    >
                        Choisir ma position
                    </button>
                </div>
            )}

            {/* Left/Right Navigation Arrows (Desktop) */}
            {activeFlash.displayLayout !== 'vertical_grid' && (
                <>
                    <button 
                        onClick={() => scroll('left')}
                        className="absolute left-0 top-[60%] -translate-y-1/2 -ml-4 z-20 bg-white shadow-lg rounded-full p-2 border border-border/50 text-foreground hover:bg-muted hover:scale-110 transition-all opacity-0 group-hover/carousel:opacity-100 hidden md:flex items-center justify-center"
                        aria-label="Défiler vers la gauche"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>

                    <button 
                        onClick={() => scroll('right')}
                        className="absolute right-0 top-[60%] -translate-y-1/2 -mr-4 z-20 bg-white shadow-lg rounded-full p-2 border border-border/50 text-foreground hover:bg-muted hover:scale-110 transition-all opacity-0 group-hover/carousel:opacity-100 hidden md:flex items-center justify-center"
                        aria-label="Défiler vers la droite"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </>
            )}

            {/* Product Carousel / Grid */}
            <div 
                ref={activeFlash.displayLayout !== 'vertical_grid' ? scrollContainerRef : null}
                className={`${activeFlash.displayLayout === 'vertical_grid' ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 overflow-visible' : 'flex overflow-x-auto snap-x snap-mandatory'} gap-3 sm:gap-4 pb-4 ${
                    activeFlash.isSimpleMode 
                    ? 'pt-5' 
                    : 'bg-white border-x border-b border-border/30 rounded-b-xl p-3 sm:p-4 md:p-5'
                }`}
                style={activeFlash.displayLayout !== 'vertical_grid' ? {
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                } : {}}
            >
                {errorMsg && (
                    <div className="w-full flex-shrink-0 text-center py-8 text-red-500 font-bold text-sm">
                        {errorMsg}
                    </div>
                )}
                {flashProducts.length === 0 && !loading && !errorMsg && (
                    <div className="w-full flex-shrink-0 text-center py-8 text-muted-foreground text-sm">
                        Aucun produit en vente flash pour le moment
                    </div>
                )}
                {(loading ? [1, 2, 3, 4, 5, 6, 7, 8] : flashProducts).map((p: any, i) => {
                    const isPlaceholder = typeof p === 'number';
                    
                    if (isPlaceholder) {
                        return (
                            <div 
                                key={i} 
                                className={
                                    activeFlash.displayLayout === 'vertical_grid'
                                    ? "w-full aspect-square bg-white rounded-xl border border-border/30 flex items-center justify-center p-4"
                                    : "snap-start flex-shrink-0 w-[160px] sm:w-[180px] md:w-[200px] lg:w-[220px] aspect-square bg-white rounded-xl border border-border/30 flex items-center justify-center p-4"
                                }
                                style={{
                                    width: activeFlash.cardWidth || undefined,
                                    minWidth: activeFlash.cardWidth || undefined,
                                    height: activeFlash.cardHeight || undefined,
                                }}
                            >
                                <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                            </div>
                        );
                    }

                    return (
                        <div 
                            key={p.productId} 
                            className={
                                activeFlash.displayLayout === 'vertical_grid'
                                ? "w-full"
                                : "snap-start flex-shrink-0 w-[200px] sm:w-[220px] md:w-[240px] lg:w-[260px]"
                            }
                            style={{
                                width: activeFlash.cardWidth || undefined,
                                minWidth: activeFlash.cardWidth || undefined,
                                height: activeFlash.cardHeight || undefined,
                            }}
                        >
                            <ProductCard product={p} config={activeFlash} />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
