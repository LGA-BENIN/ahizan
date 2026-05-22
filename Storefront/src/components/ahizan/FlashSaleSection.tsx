"use client";

import { useState, useEffect } from "react";
import { Clock, ChevronRight, Zap } from "lucide-react";
import Link from "next/link";
import { getAssetUrl } from "@/lib/vendure/api-utils";
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
    const [timeLeft, setTimeLeft] = useState({ h: '00', m: '00', s: '00' });
    const themeSettings = useThemeSettings();
    const defaultImage = themeSettings?.defaultProductImage;

    useEffect(() => {
        if (!activeFlash?.endTime) return;
        
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
            const shopApiUrl = process.env.NEXT_PUBLIC_VENDURE_SHOP_API_URL || 'http://127.0.0.1:3000/shop-api';

            const searchQuery = `
                query GetFlashProducts($input: SearchInput!) {
                    search(input: $input) {
                        items {
                            productId
                            productName
                            slug
                            productAsset {
                                id
                                preview
                            }
                            priceWithTax {
                                ... on PriceRange { min max }
                                ... on SinglePrice { value }
                            }
                        }
                    }
                }
            `;

            const fetchForCollection = (collectionId?: string) => {
                const searchInput: any = {
                    groupByProduct: true,
                    take: activeFlash.filterCriteria?.take || 50
                };
                if (collectionId) {
                    searchInput.collectionId = String(collectionId);
                }

                if (activeFlash.filterCriteria?.facetValueIds?.length > 0) {
                    searchInput.facetValueIds = activeFlash.filterCriteria.facetValueIds.map((id: any) => String(id));
                }

                return fetch(shopApiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        query: searchQuery, 
                        variables: { input: searchInput } 
                    })
                })
                .then(res => res.json())
                .then(data => {
                    if (data.errors) return [];
                    return data.data?.search?.items || [];
                })
                .catch(err => {
                    console.error('Fetch error:', err);
                    return [];
                });
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
                    const { minPrice, maxPrice, minDiscount } = activeFlash.filterCriteria;
                    
                    items = items.filter((item: any) => {
                        const price = item.priceWithTax?.min ?? item.priceWithTax?.value ?? 0;
                        const priceInFcfa = price / 100;

                        if (minPrice && priceInFcfa < minPrice) return false;
                        if (maxPrice && priceInFcfa > maxPrice) return false;
                        
                        if (minDiscount > 0) {
                            const listPrice = price * 1.25; 
                            const discount = Math.round((1 - price / listPrice) * 100);
                            if (discount < minDiscount) return false;
                        }

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
                        listPrice: (item.priceWithTax?.min ?? item.priceWithTax?.value ?? 0) * 1.25,
                        stockLevel: 'En stock'
                    }]
                })));
                setLoading(false);
            })
            .catch(err => { console.error(`Fetch error for flash sale ${activeFlash.id}:`, err); setLoading(false); });

        } else if (activeFlash.selectionType === 'MANUAL' && activeFlash.manualProductIds?.length > 0) {
            const shopApiUrl = process.env.NEXT_PUBLIC_VENDURE_SHOP_API_URL || 'http://127.0.0.1:3000/shop-api';
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
                                        listPrice
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
    const isNotEnded = activeFlash.endTime ? now <= new Date(activeFlash.endTime) : true;
    // Simple mode always shows regardless of scheduling
    if (!activeFlash.isSimpleMode && (!isStarted || !isNotEnded)) return null;

    // Don't render if there's no meaningful config at all
    if (!activeFlash.title && !activeFlash.subtitle && !activeFlash.endTime && flashProducts.length === 0 && !loading) return null;

    return (
        <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
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

                {!activeFlash.isSimpleMode && (
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
                
                {/* Fallback View All for Simple Mode if countdown is hidden */}
                {activeFlash.isSimpleMode && (
                    <div className="relative z-10">
                        <Button variant="link" asChild className="text-primary font-black p-0 h-auto">
                            <Link href="/search?sales=true">TOUT VOIR <ChevronRight className="w-4 h-4 ml-1" /></Link>
                        </Button>
                    </div>
                )}
            </div>

            {/* Product Grid */}
            <div className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2 sm:gap-3 md:gap-4 ${
                activeFlash.isSimpleMode 
                ? '' 
                : 'bg-white/50 backdrop-blur-sm border-x border-b border-border/30 rounded-b-2xl p-2 sm:p-3 md:p-4'
            }`}>
                {flashProducts.length === 0 && !loading && (
                    <div className="col-span-full text-center py-8 text-muted-foreground text-sm">
                        Aucun produit en vente flash pour le moment
                    </div>
                )}
                {(loading ? [1, 2, 3, 4, 5, 6] : flashProducts).map((p: any, i) => {
                    const isPlaceholder = typeof p === 'number';
                    const price = isPlaceholder ? (199 + i * 50) : (p.variants?.[0]?.price || 0);
                    const listPrice = isPlaceholder ? (350 + i * 50) : (p.variants?.[0]?.listPrice || price * 1.5);
                    const discount = Math.round((1 - price / listPrice) * 100);
                    const stockPercent = isPlaceholder ? (30 + i * 12) : (75 - (i * 5));
                    
                    return (
                        <Link
                            key={isPlaceholder ? i : p.id}
                            href={isPlaceholder ? "#" : `/product/${p.slug}`}
                            className="group relative flex flex-col bg-white rounded-xl overflow-hidden border border-border/20 hover:border-primary/20 hover:shadow-lg transition-all duration-300"
                        >
                            <div className="relative aspect-square bg-muted/10 overflow-hidden flex items-center justify-center">
                                <Badge className="absolute top-2 left-2 bg-primary text-white font-black text-[10px] px-1.5 py-0.5 z-10 rounded-sm">
                                    -{discount}%
                                </Badge>
                                
                                {isPlaceholder ? (
                                    <div className="w-6 h-6 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                                ) : (
                                    <img 
                                        src={getAssetUrl(p.assets?.[0]?.preview || defaultImage)} 
                                        className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500 p-2" 
                                        alt={p.name} 
                                    />
                                )}
                            </div>
                            
                            <div className="flex flex-col p-2 sm:p-2.5 flex-1">
                                <h4 className="text-[10px] sm:text-[11px] md:text-xs font-semibold text-secondary line-clamp-2 min-h-[24px] sm:min-h-[28px] leading-tight mb-1 sm:mb-1.5 group-hover:text-primary transition-colors">
                                    {isPlaceholder ? `Produit #${i+1}` : p.name}
                                </h4>
                                
                                <div className="mt-auto space-y-1 sm:space-y-1.5">
                                    <div className="flex items-baseline gap-1">
                                        <span className="font-black text-xs sm:text-sm md:text-base text-primary tracking-tight">
                                            {isPlaceholder ? price : (price / 100).toLocaleString()} <span className="text-[7px] sm:text-[8px] font-bold">XOF</span>
                                        </span>
                                        <span className="text-[8px] sm:text-[9px] text-muted-foreground line-through font-medium opacity-50">
                                            {isPlaceholder ? listPrice : (listPrice / 100).toLocaleString()}
                                        </span>
                                    </div>

                                    {/* Urgency Progress Bar */}
                                    <div>
                                        <div className="flex justify-between items-center text-[8px] font-bold uppercase tracking-tight">
                                            <span className="text-primary">{stockPercent > 80 ? '🔥 Presque plus' : 'Stock'}</span>
                                            <span className="text-muted-foreground">{stockPercent}%</span>
                                        </div>
                                        <Progress value={stockPercent} className="h-1 bg-muted" />
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
