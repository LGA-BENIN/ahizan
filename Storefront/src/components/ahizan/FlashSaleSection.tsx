"use client";

import { useState, useEffect, useRef } from "react";
import { Clock, ChevronRight, ChevronLeft, Zap } from "lucide-react";
import Link from "next/link";
import { getAssetUrl, getShopApiUrl } from "@/lib/vendure/api-utils";
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

    useEffect(() => {
        if (!activeFlash) return;

        const isFilterMode = activeFlash.selectionType === 'FILTER';
        setLoading(true);
        
        if (isFilterMode) {
            const collectionIds = activeFlash.filterCriteria?.collectionIds || [];
            const shopApiUrl = getShopApiUrl();

            const fetchForCollection = (collectionId?: string) => {
                const take = activeFlash.filterCriteria?.take || 50;
                
                if (collectionId) {
                    const collectionQuery = `
                        query GetCollectionProducts($id: ID!, $take: Int!) {
                            collection(id: $id) {
                                productVariants(options: { take: $take }) {
                                    items {
                                        priceWithTax
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
                                    priceWithTax: { value: item.priceWithTax }
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
                            variables: { options: { take } } 
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
                
                if (activeFlash.filterCriteria) {
                    const { minPrice, maxPrice } = activeFlash.filterCriteria;
                    
                    items = items.filter((item: any) => {
                        const price = item.priceWithTax?.min ?? item.priceWithTax?.value ?? 0;
                        const priceInFcfa = price;

                        if (minPrice > 0 && priceInFcfa < minPrice) return false;
                        if (maxPrice > 0 && priceInFcfa > maxPrice) return false;

                        return true;
                    });
                }

                const limit = activeFlash.filterCriteria?.take || 12;
                items = items.slice(0, limit);

                setFlashProducts(items.map((item: any) => ({
                    id: item.productId,
                    name: item.productName,
                    slug: item.slug,
                    assets: item.productAsset ? [{ preview: item.productAsset.preview }] : [],
                    variants: [{
                        price: item.priceWithTax?.min ?? item.priceWithTax?.value ?? 0,
                        priceWithTax: item.priceWithTax?.min ?? item.priceWithTax?.value ?? 0,
                        stockLevel: 'IN_STOCK'
                    }]
                })));
                setLoading(false);
            })
            .catch(err => { 
                console.error(`Fetch error for flash sale ${activeFlash.id}:`, err); 
                setErrorMsg(err.message);
                setLoading(false); 
            });

        } else if (activeFlash.selectionType === 'MANUAL' && activeFlash.manualProductIds?.length > 0) {
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
                            filter: { id: { in: activeFlash.manualProductIds } },
                            take: activeFlash.filterCriteria?.take || 12
                        } 
                    } 
                })
            })
            .then(res => res.json())
            .then(data => {
                setFlashProducts(data.data?.products?.items || []);
                setLoading(false);
            })
            .catch(err => { console.error('Error fetching manual products:', err); setLoading(false); });
        }
    }, [activeFlash]);

    const now = new Date();
    const isStarted = !activeFlash.startTime || now >= new Date(activeFlash.startTime);
    const isNotEnded = activeFlash.isUnlimited || !activeFlash.endTime || now <= new Date(activeFlash.endTime);
    // Simple mode always shows regardless of scheduling
    if (!activeFlash.isSimpleMode && (!isStarted || !isNotEnded)) return null;

    // Don't render if there's no meaningful config at all
    if (!activeFlash.title && !activeFlash.subtitle && !activeFlash.endTime && flashProducts.length === 0 && !loading) return null;

    return (
        <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 relative group/carousel">
            {/* Header section */}
            <div 
                className={`flex flex-col md:flex-row items-center justify-between gap-2 sm:gap-4 overflow-hidden relative ${
                    activeFlash.isSimpleMode 
                    ? 'bg-transparent py-2 border-b border-border/40' 
                    : 'rounded-t-2xl p-3 sm:p-4 md:p-6 shadow-sm'
                }`}
                style={{ 
                    backgroundColor: activeFlash.isSimpleMode ? 'transparent' : (activeFlash.bgColor || '#000'),
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
                        <div className="bg-primary p-1.5 sm:p-2 rounded-lg shadow-lg">
                            <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-white fill-white" />
                        </div>
                    )}
                    <div>
                        <h2 className={`font-black tracking-tight flex items-center gap-2 ${
                            activeFlash.isSimpleMode ? 'text-base sm:text-xl text-black' : 'text-base sm:text-xl md:text-2xl text-white'
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

            {/* Product Carousel */}
            <div 
                ref={scrollContainerRef}
                className={`flex overflow-x-auto snap-x snap-mandatory gap-2 sm:gap-3 md:gap-4 pb-2 ${
                    activeFlash.isSimpleMode 
                    ? 'pt-4' 
                    : 'bg-white/50 backdrop-blur-sm border-x border-b border-border/30 rounded-b-2xl p-2 sm:p-3 md:p-4'
                }`}
                style={{
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                } as React.CSSProperties}
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
                    const price = isPlaceholder ? (199 + i * 50) : (p.variants?.[0]?.price || 0);
                    
                    return (
                        <Link
                            key={isPlaceholder ? i : p.id}
                            href={isPlaceholder ? "#" : `/product/${p.slug}`}
                            className="snap-start flex-shrink-0 w-[100px] sm:w-[120px] md:w-[140px] lg:w-[160px] group relative flex flex-col bg-white rounded-xl overflow-hidden border border-border/20 hover:border-primary/20 hover:shadow-lg transition-all duration-300"
                        >
                            <div className="relative aspect-square bg-muted/10 overflow-hidden flex items-center justify-center">
                                {activeFlash.discountPercentage && activeFlash.discountPercentage > 0 && (
                                    <Badge className="absolute top-1.5 left-1.5 bg-primary text-white font-black text-[8px] px-1 py-0.5 z-10 rounded-sm">
                                        -{activeFlash.discountPercentage}%
                                    </Badge>
                                )}
                                
                                {isPlaceholder ? (
                                    <div className="w-4 h-4 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                                ) : (
                                    <img 
                                        src={getAssetUrl(p.assets?.[0]?.preview || defaultImage)} 
                                        className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500 p-1.5" 
                                        alt={p.name} 
                                    />
                                )}
                            </div>
                            
                            <div className="flex flex-col p-1.5 sm:p-2 flex-1">
                                <h4 className="text-[8px] sm:text-[9px] md:text-[10px] font-semibold text-secondary line-clamp-2 min-h-[20px] sm:min-h-[22px] leading-tight mb-1 group-hover:text-primary transition-colors">
                                    {isPlaceholder ? `Produit #${i+1}` : p.name}
                                </h4>
                                
                                <div className="mt-auto space-y-0.5 sm:space-y-1">
                                    <div className="flex items-baseline gap-0.5">
                                        <span className="font-black text-[9px] sm:text-[10px] md:text-xs text-primary tracking-tight">
                                            {isPlaceholder ? price : price.toLocaleString()} <span className="text-[6px] sm:text-[7px] font-bold">XOF</span>
                                        </span>
                                    </div>

                                    {/* Stock Status */}
                                    <div>
                                        <span className={`text-[6px] sm:text-[7px] font-bold uppercase tracking-tight ${
                                            isPlaceholder ? 'text-green-600' : (p.variants?.[0]?.stockLevel === 'IN_STOCK' ? 'text-green-600' : 'text-red-600')
                                        }`}>
                                            {isPlaceholder ? 'En stock' : (p.variants?.[0]?.stockLevel === 'IN_STOCK' ? 'En stock' : 'Rupture')}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
