"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
    Store, 
    Package, 
    ShieldCheck, 
    ChevronRight,
    Sparkles
} from "lucide-react";
import { getShopApiUrl } from "@/lib/vendure/api-utils";
import { fetchWithClientCache } from "@/lib/vendure/client-cache";

interface MarketHeroBannerProps {
    config?: {
        title?: string;
        subtitle?: string;
        description?: string;
        badgeText?: string;
        locationName?: string;
        marketId?: string;
        marketName?: string;
        marketSlug?: string;
        bgImage?: string;
        bgImageUrl?: string;
        image?: string;
        bannerImage?: string;
        showSearch?: boolean;
        showStats?: boolean;
        showLiveBadge?: boolean;
        manualProductsCount?: number;
        manualVendorsCount?: number;
        [key: string]: any;
    };
}

export function MarketHeroBanner({ config = {} }: MarketHeroBannerProps) {
    const [marketInfo, setMarketInfo] = useState<any>(null);
    const [liveProductsCount, setLiveProductsCount] = useState<number | null>(config.manualProductsCount || null);
    const [liveVendorsCount, setLiveVendorsCount] = useState<number | null>(config.manualVendorsCount || null);

    // 1. Detect active market context from window or props
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const ahizanMarket = (window as any).ahizan?.market;
            if (ahizanMarket) {
                setMarketInfo(ahizanMarket);
            }
        }
    }, []);

    const effectiveMarket = marketInfo || {};
    const effectiveMarketId = String(config.marketId || effectiveMarket.id || "1");
    const effectiveMarketName = config.marketName || config.title || effectiveMarket.name || "Marché";
    const effectiveLocationName = config.locationName || effectiveMarket.geoZone?.name || effectiveMarket.location?.name || "Bénin";
    const effectiveDescription = config.description || config.subtitle || effectiveMarket.description || "Découvrez des milliers de produits au meilleur prix sur Ahizan, vendus par des boutiques et vendeurs béninois.";

    // 2. Fetch live vendors & products count for this market
    useEffect(() => {
        if (!effectiveMarketId) return;

        const query = `
            query GetMarketStats($marketId: ID!) {
                vendors(marketId: $marketId, options: { filter: { status: { eq: "APPROVED" } }, take: 100 }) {
                    totalItems
                    items {
                        id
                        products { id }
                    }
                }
            }
        `;

        fetchWithClientCache(getShopApiUrl(), query, { marketId: effectiveMarketId })
            .then((data: any) => {
                const vendorItems = data?.vendors?.items || [];
                const vCount = data?.vendors?.totalItems || vendorItems.length;
                if (vCount > 0 && !config.manualVendorsCount) {
                    setLiveVendorsCount(vCount);
                }
                const pCount = vendorItems.reduce((acc: number, v: any) => acc + (v.products?.length || 0), 0);
                if (pCount > 0 && !config.manualProductsCount) {
                    setLiveProductsCount(pCount);
                }
            })
            .catch(() => {});
    }, [effectiveMarketId, config.manualVendorsCount, config.manualProductsCount]);

    return (
        <header className="w-full bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 py-4 sm:py-6 mb-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
                {/* Breadcrumbs */}
                <nav className="flex items-center space-x-1.5 text-xs text-slate-500 dark:text-slate-400 font-semibold">
                    <Link href="/" className="hover:text-primary transition-colors">Accueil</Link>
                    <ChevronRight className="w-3 h-3 text-slate-300" />
                    <Link href="/marches" className="hover:text-primary transition-colors">Marchés du Bénin</Link>
                    <ChevronRight className="w-3 h-3 text-slate-300" />
                    <span className="text-slate-900 dark:text-white font-bold">{effectiveMarketName}</span>
                </nav>

                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    {/* Left: Market Title with Ahizan Red Accent & Subtitle */}
                    <div className="max-w-2xl space-y-2">
                        <div className="relative inline-block">
                            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-950 dark:text-white tracking-tight">
                                {effectiveMarketName}
                            </h1>
                            {/* Red accent bar matching Image 1 */}
                            <div className="h-1 w-12 bg-primary rounded-full mt-1.5" />
                        </div>

                        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                            {effectiveDescription}
                        </p>
                    </div>

                    {/* Right: Trust Stat Badge Card matching Image 1 */}
                    <div className="bg-red-50/80 dark:bg-red-950/20 border border-red-100 dark:border-red-900/40 rounded-2xl p-3 px-4 sm:px-6 flex items-center justify-between sm:justify-start gap-4 sm:gap-6 shadow-2xs shrink-0">
                        {/* Stat 1: Boutiques */}
                        <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center shrink-0 shadow-xs">
                                <Store className="w-4 h-4" />
                            </div>
                            <div>
                                <div className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                                    {liveVendorsCount ? `${liveVendorsCount}+` : '500+'}
                                </div>
                                <div className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 font-semibold whitespace-nowrap">
                                    Boutiques partenaires
                                </div>
                            </div>
                        </div>

                        {/* Divider */}
                        <div className="h-8 w-px bg-red-200/70 dark:bg-red-800/50" />

                        {/* Stat 2: Produits */}
                        <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center shrink-0 shadow-xs">
                                <Package className="w-4 h-4" />
                            </div>
                            <div>
                                <div className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                                    {liveProductsCount ? `${liveProductsCount}+` : '10K+'}
                                </div>
                                <div className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 font-semibold whitespace-nowrap">
                                    Produits disponibles
                                </div>
                            </div>
                        </div>

                        {/* Divider */}
                        <div className="h-8 w-px bg-red-200/70 dark:bg-red-800/50 hidden sm:block" />

                        {/* Stat 3: Achat sécurisé */}
                        <div className="hidden sm:flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center shrink-0 shadow-xs">
                                <ShieldCheck className="w-4 h-4" />
                            </div>
                            <div>
                                <div className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                                    Achat sécurisé
                                </div>
                                <div className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 font-semibold whitespace-nowrap">
                                    en toute confiance
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}
