"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Smartphone, ChevronRight, X, Download } from "lucide-react";
import { getAssetUrl } from "@/lib/vendure/api-utils";
import { useMobileMenu } from "@/contexts/mobile-menu-context";

export function MobileCategorySidebar({ categories = [], menuItems = [] }: { categories?: any[]; menuItems?: any[] }) {
    const { mobileMenuOpen, setMobileMenuOpen, expandedMobileCat, setExpandedMobileCat, logoUrl, promoConfig } = useMobileMenu();
    const [hoveredCat, setHoveredCat] = useState<any>(null);

    // Fallback skeletons if categories are not provided yet
    let displayCategories = categories.length > 0 ? categories : [{}, {}, {}, {}, {}, {}];

    // Apply the same STRICT filtering as HeroSection
    if (categories.length > 0 && promoConfig?.enabledCategories) {
        const enabledCats = promoConfig.enabledCategories;
        const enabledSlugs = Object.entries(enabledCats).filter(([, v]) => v === true).map(([k]) => k);
        if (enabledSlugs.length > 0) {
            displayCategories = categories.filter((cat: any) => enabledSlugs.includes(cat.slug) || enabledSlugs.includes(cat.id));
            if (displayCategories.length === 0) displayCategories = categories;
        }
    }

    const [canShowInstall, setCanShowInstall] = useState(false);

    React.useEffect(() => {
        if (typeof window === "undefined") return;

        const checkIfInstalled = () => {
            const isStandalone = 
                window.matchMedia("(display-mode: standalone)").matches || 
                window.matchMedia("(display-mode: fullscreen)").matches || 
                window.matchMedia("(display-mode: minimal-ui)").matches || 
                (window.navigator as any).standalone === true ||
                document.referrer.includes('android-app://');
            
            let isInstalledInStorage = false;
            try {
                isInstalledInStorage = localStorage.getItem('ahizan_pwa_installed') === '1';
            } catch {}

            if (isStandalone || isInstalledInStorage) {
                setCanShowInstall(false);
            } else {
                setCanShowInstall(true);
            }
        };

        checkIfInstalled();

        const handleInstalled = () => {
            try {
                localStorage.setItem('ahizan_pwa_installed', '1');
            } catch {}
            setCanShowInstall(false);
        };

        window.addEventListener("appinstalled", handleInstalled);
        window.addEventListener("pwa-installed", handleInstalled);

        return () => {
            window.removeEventListener("appinstalled", handleInstalled);
            window.removeEventListener("pwa-installed", handleInstalled);
        };
    }, []);

    // Close on route change is handled by context

    return (
        <>
            {/* Mobile Backdrop */}
            {mobileMenuOpen && (
                <div
                    onClick={() => setMobileMenuOpen(false)}
                    className="fixed inset-0 bg-black/50 z-[200] lg:hidden animate-in fade-in duration-200"
                />
            )}

            {/* Mobile Sidebar */}
            <aside
                className={`fixed lg:hidden w-72 max-w-[85vw] border border-border/60 rounded-r-2xl self-stretch bg-white shadow-xl z-[210] transition-transform duration-300 ease-in-out ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} top-0 left-0 h-full`}
                onMouseLeave={() => setHoveredCat(null)}
            >
                {/* Mobile Header with Logo and Close Button */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-border/40 bg-muted/5">
                    <Link href="/" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 flex-shrink-0">
                        {logoUrl ? (
                            <img src={getAssetUrl(logoUrl)} className="h-9 w-auto object-contain" alt="Logo" />
                        ) : (
                            <span className="text-xl font-bold tracking-tight text-[#002f6c]">AHIZAN</span>
                        )}
                    </Link>
                    <button
                        onClick={() => setMobileMenuOpen(false)}
                        className="p-2 rounded-lg hover:bg-muted transition-colors"
                        aria-label="Close menu"
                    >
                        <X className="w-5 h-5 text-foreground" />
                    </button>
                </div>
                <div className="flex flex-col w-full h-[calc(100%-73px)] relative">
                    {/* CMS Navigation Menu Items Section (Mobile) */}
                    {menuItems && menuItems.length > 0 && (
                        <div className="border-b border-border/40 bg-slate-50/50 py-2.5 px-3">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-2 block mb-1.5">Navigation</span>
                            <div className="flex flex-col gap-1">
                                {menuItems.map((item: any, idx: number) => {
                                    const isPill = item.style === 'pill';
                                    const isRect = item.style === 'rectangle';
                                    const hasCustomStyle = isPill || isRect;

                                    return (
                                        <Link
                                            key={idx}
                                            href={item.link || '#'}
                                            onClick={() => setMobileMenuOpen(false)}
                                            className={`px-3 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-between ${
                                                hasCustomStyle
                                                    ? 'shadow-xs font-bold'
                                                    : item.isHighlighted
                                                    ? 'bg-red-50 text-red-600 font-bold border border-red-100'
                                                    : 'text-slate-800 hover:bg-slate-100'
                                            }`}
                                            style={hasCustomStyle ? {
                                                backgroundColor: item.bgColor || '#e31837',
                                                color: item.textColor || '#ffffff',
                                                borderRadius: isPill ? '9999px' : '8px'
                                            } : undefined}
                                        >
                                            <span className="truncate">{item.label}</span>
                                            {item.isHighlighted && !hasCustomStyle && (
                                                <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
                                            )}
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    <div className="px-5 py-2.5 border-b border-border/40 bg-muted/5">
                        <span className="text-[10px] font-black uppercase tracking-widest text-black">Catégories</span>
                    </div>
                    <div className="flex-1 overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-muted-foreground/20 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/40 py-2">
                        {displayCategories.map((cat: any, i: number) => (
                            <div
                                key={cat.id || i}
                                className="group/cat relative"
                                onMouseEnter={() => setHoveredCat(cat)}
                            >
                                <div className={`flex items-center justify-between px-5 py-2.5 hover:bg-muted/30 transition-all ${!cat.id ? 'opacity-50 pointer-events-none' : ''}`}>
                                    <Link
                                        href={cat.id ? `/collection/${cat.slug}` : '#'}
                                        onClick={() => setMobileMenuOpen(false)}
                                        className="flex items-center gap-3 flex-1 min-w-0 text-[13px] text-foreground/80 hover:text-primary"
                                    >
                                        <div className="w-5 h-5 flex items-center justify-center text-foreground group-hover/cat:text-primary transition-colors">
                                            {cat.id && promoConfig?.heroIcons?.[cat.slug] ? (
                                                <img src={getAssetUrl(promoConfig.heroIcons[cat.slug])} className="w-full h-full object-cover rounded-sm" alt="" />
                                            ) : cat.id && promoConfig?.collectionMedia?.[cat.slug] ? (
                                                <img src={getAssetUrl(promoConfig.collectionMedia[cat.slug])} className="w-full h-full object-cover rounded-sm" alt="" />
                                            ) : cat.featuredAsset?.preview ? (
                                                <img src={getAssetUrl(cat.featuredAsset.preview)} className="w-full h-full object-cover rounded-sm" alt="" />
                                            ) : (
                                                cat.id ? <Smartphone className="w-3.5 h-3.5" /> : <div className="w-3.5 h-3.5 bg-muted animate-pulse rounded-full" />
                                            )}
                                        </div>
                                        <span className={`truncate font-semibold tracking-tight flex-1 ${!cat.id ? 'bg-muted animate-pulse text-transparent rounded w-20 h-3' : ''}`}>
                                            {cat.name || '...'}
                                        </span>
                                    </Link>
                                    {cat.children?.length > 0 && (
                                        <button 
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setExpandedMobileCat(expandedMobileCat === cat ? null : cat);
                                            }}
                                            className="p-2 -mr-2 ml-2 text-muted-foreground hover:bg-muted rounded-md transition-colors"
                                            aria-label="Toggle subcategories"
                                        >
                                            <ChevronRight className={`w-4 h-4 transition-transform ${expandedMobileCat === cat ? 'rotate-90' : ''}`} />
                                        </button>
                                    )}
                                </div>
                                {/* Mobile subcategories inline expansion */}
                                {cat.children?.length > 0 && expandedMobileCat === cat && (
                                    <div className="pl-10 pr-5 py-2 space-y-1 animate-in slide-in-from-top-2 duration-200">
                                        {cat.children.map((sub: any) => (
                                            <Link
                                                key={sub.id}
                                                href={`/collection/${sub.slug}`}
                                                onClick={() => setMobileMenuOpen(false)}
                                                className="flex items-start gap-2 p-2 rounded-lg hover:bg-muted/50 transition-all text-[12px] text-foreground/70 hover:text-primary"
                                            >
                                                <div className="w-4 h-4 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                    {sub.featuredAsset?.preview ? (
                                                        <img src={getAssetUrl(sub.featuredAsset.preview)} className="w-full h-full object-cover rounded-sm" alt="" />
                                                    ) : (
                                                        <div className="w-1.5 h-1.5 rounded-full bg-primary/40" />
                                                    )}
                                                </div>
                                                <span className="font-medium leading-snug break-words">{sub.name}</span>
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                    {/* Bottom PWA Install Button (Only displayed if NOT yet installed) */}
                    {canShowInstall && (
                        <div className="p-4 border-t border-border/40 bg-muted/5">
                            <button
                                onClick={() => {
                                    setMobileMenuOpen(false);
                                    window.dispatchEvent(new CustomEvent("ahizan:open-pwa-modal"));
                                }}
                                className="w-full py-2.5 px-4 bg-primary text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-primary/20 hover:bg-primary/90 transition-all active:scale-[0.98]"
                            >
                                <Download className="w-4 h-4 animate-bounce" />
                                Installer l'application
                            </button>
                        </div>
                    )}
                </div>
            </aside>
        </>
    );
}
