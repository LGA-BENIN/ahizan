"use client";

import { useState, useEffect, useRef } from "react";
import { Clock, ChevronRight, ChevronLeft } from "lucide-react";
import * as LucideIcons from "lucide-react";
import Link from "next/link";
import { ProductCard } from "@/components/commerce/product-card";
import { getAssetUrl, getShopApiUrl, getPromoPriceInfo } from "@/lib/vendure/api-utils";
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
    const [flashProducts, setFlashProducts] = useState<any[]>([]);
    const iconValue = activeFlash?.icon || '⚡';
    const DynamicIcon = (LucideIcons as any)[iconValue];
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [timeLeft, setTimeLeft] = useState({ h: '00', m: '00', s: '00' });
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
        if (!activeFlash?.endTime || activeFlash.isUnlimited) return;
        
        const timer = setInterval(() => {
            const now = new Date();
            const end = new Date(activeFlash.endTime);
            const start = activeFlash.startTime ? new Date(activeFlash.startTime) : now;
            
            const isActive = now >= start && now <= end;
            const isSimple = activeFlash.isSimpleMode;

            if (!isActive && !isSimple) {
                setTimeLeft({ h: '00', m: '00', s: '00' });
                clearInterval(timer);
                return;
            }

            const diff = end.getTime() - now.getTime();
            if (diff <= 0) {
                setTimeLeft({ h: '00', m: '00', s: '00' });
                clearInterval(timer);
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
        }, 1000);
        
        return () => clearInterval(timer);
    }, [activeFlash]);

    const activeFlashStr = JSON.stringify(activeFlash);

    useEffect(() => {
        const activeFlashObj = activeFlashStr ? JSON.parse(activeFlashStr) : null;
        if (!activeFlashObj) return;

        const isFilterMode = activeFlashObj.selectionType === 'FILTER';
        console.log("DEBUG: isFilterMode =", isFilterMode, "collectionIds =", activeFlashObj.filterCriteria?.collectionIds);
        setLoading(true);
        setErrorMsg(null);
        
        if (isFilterMode) {
            const collectionIds = activeFlashObj.filterCriteria?.collectionIds || [];
            const shopApiUrl = getShopApiUrl();

            const fetchForCollection = (collectionId?: string) => {
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
                                        }
                                    }
                                }
                            }
                        }
                    `;
                    return fetch(shopApiUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            query: collectionQuery, 
                            variables: { id: String(collectionId), take } 
                        })
                    })
                    .then(res => res.json())
                    .then(data => {
                        if (data.errors) {
                            console.error('GraphQL errors:', data.errors);
                            throw new Error(data.errors[0]?.message || 'GraphQL Error');
                        }
                        if (!data.data?.collection?.productVariants?.items) return [];
                        const items = data.data.collection.productVariants.items;
                        const seen = new Set();
                        return items.reduce((acc: any[], item: any) => {
                            if (!seen.has(item.product.id)) {
                                seen.add(item.product.id);
                                acc.push({
                                    productId: item.product.id,
                                    productName: item.product.name,
                                    slug: item.product.slug,
                                    productAsset: item.product.assets?.[0],
                                    priceWithTax: { value: item.priceWithTax },
                                    customFields: item.customFields
                                });
                            }
                            return acc;
                        }, []);
                    })
                    .catch(err => {
                        console.error('Fetch error:', err);
                        setErrorMsg(err.message);
                        return [];
                    });
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
                                        priceWithTax
                                    }
                                }
                            }
                        }
                    `;
                    return fetch(shopApiUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            query: productsQuery, 
                            variables: { 
                                options: { 
                                    take,
                                    filter: { approvalStatus: { eq: "approved" } }
                                } 
                            } 
                        })
                    })
                    .then(res => res.json())
                    .then(data => {
                        if (data.errors || !data.data?.products?.items) return [];
                        return data.data.products.items.map((prod: any) => ({
                            productId: prod.id,
                            productName: prod.name,
                            slug: prod.slug,
                            productAsset: prod.assets?.[0],
                            priceWithTax: { value: prod.variants?.[0]?.priceWithTax || 0 }
                        }));
                    })
                    .catch(err => {
                        console.error('Fetch error:', err);
                        return [];
                    });
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
                setErrorMsg(err.message);
                setLoading(false); 
            });

        } else if (activeFlashObj.selectionType === 'MANUAL' && activeFlashObj.manualProductIds?.length > 0) {
            const shopApiUrl = getShopApiUrl();
            fetch(shopApiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    query: `
                        query GetFlashProducts($options: ProductListOptions) {
                            products(options: $options) {
                                items {
                                    id
                                    name
                                    slug
                                    variants {
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
                                }
                            }
                        }
                    `, 
                    variables: { 
                        options: { 
                            filter: { id: { in: activeFlashObj.manualProductIds } },
                            take: activeFlashObj.filterCriteria?.take || 12
                        } 
                    } 
                })
            })
            .then(res => res.json())
            .then(data => {
                const items = data.data?.products?.items || [];
                setFlashProducts(items.map((p: any) => ({
                    productId: p.id,
                    productName: p.name,
                    slug: p.slug,
                    productAsset: p.assets?.[0] || null,
                    priceWithTax: { __typename: 'SinglePrice', value: p.variants?.[0]?.priceWithTax || 0 },
                    currencyCode: 'XOF',
                    inStock: p.variants?.[0]?.stockLevel === 'IN_STOCK',
                    collectionIds: [],
                    facetValueIds: []
                })));
                setLoading(false);
            })
            .catch(err => { console.error('Error fetching manual products:', err); setLoading(false); });
        } else {
            setLoading(false);
        }
    }, [activeFlashStr]);

    const now = new Date();
    const isStarted = !activeFlash.startTime || now >= new Date(activeFlash.startTime);
    const isNotEnded = activeFlash.isUnlimited || !activeFlash.endTime || now <= new Date(activeFlash.endTime);
    // Simple mode always shows regardless of scheduling
    if (!activeFlash.isSimpleMode && (!isStarted || !isNotEnded)) return null;

    // Don't render if there's no meaningful config at all
    if (!activeFlash.title && !activeFlash.subtitle && !activeFlash.endTime && flashProducts.length === 0 && !loading) return null;

    return (
        <div className="animate-in fade-in slide-in-from-bottom-6 duration-500 relative group/carousel">
            {/* Header section */}
            <div 
                className={`flex flex-col md:flex-row items-center justify-between gap-2 sm:gap-3 overflow-hidden relative ${
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

                <div className="flex items-center gap-3 sm:gap-4 relative z-10">
                    {!activeFlash.isSimpleMode && (
                        <div className="bg-primary p-1.5 sm:p-2 rounded-full shadow-sm flex items-center justify-center min-w-[28px] min-h-[28px] sm:min-w-[32px] sm:min-h-[32px]">
                            {DynamicIcon ? (
                                <DynamicIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white fill-white" />
                            ) : (
                                <span className="text-[14px] sm:text-[16px] leading-none">{iconValue}</span>
                            )}
                        </div>
                    )}
                    <div>
                        <h2 className={`font-black tracking-tight flex items-center gap-2 ${
                            activeFlash.isSimpleMode ? 'text-sm sm:text-lg text-black' : 'text-sm sm:text-lg md:text-xl text-white'
                        }`}>
                            {activeFlash?.title || "Ventes Flash"}
                        </h2>
                        <p className={`text-[10px] sm:text-[12px] font-bold uppercase tracking-widest ${
                            activeFlash.isSimpleMode ? 'text-muted-foreground' : 'text-white/80'
                        }`}>
                            {activeFlash?.subtitle || "Stock limité !"}
                        </p>
                    </div>
                </div>

                {!activeFlash.isSimpleMode && !activeFlash.isUnlimited && (
                    <div className="flex items-center gap-3 sm:gap-6 relative z-10">
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
                        Erreur de chargement: {errorMsg}
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
                            <div key={i} className={
                                activeFlash.displayLayout === 'vertical_grid'
                                ? "w-full aspect-square bg-white rounded-xl border border-border/30 flex items-center justify-center p-4"
                                : "snap-start flex-shrink-0 w-[160px] sm:w-[180px] md:w-[200px] lg:w-[220px] aspect-square bg-white rounded-xl border border-border/30 flex items-center justify-center p-4"
                            }>
                                <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                            </div>
                        );
                    }

                    return (
                        <div key={p.productId} className={
                            activeFlash.displayLayout === 'vertical_grid'
                            ? "w-full"
                            : "snap-start flex-shrink-0 w-[200px] sm:w-[220px] md:w-[240px] lg:w-[260px]"
                        }>
                            <ProductCard product={p} />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
