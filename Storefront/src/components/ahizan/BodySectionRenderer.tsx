"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { getAssetUrl, getShopApiUrl } from "@/lib/vendure/api-utils";
import { QuickLinks } from "./QuickLinks";
import { FlashSaleSection } from "./FlashSaleSection";

import { RichTextSection } from './RichTextSection';
import { HomeModal } from "./HomeModal";
import { CmsSection } from "@/lib/vendure/cms-queries";
import { adaptLegacySection } from "@/lib/cms/legacy-section.adapter";
import { UniversalProductCollection } from "@/components/cms/UniversalProductCollection";
import { CategoryCollection } from "@/components/cms/CategoryCollection";
import { TabbedProductGrid } from "@/components/cms/tabbed-product-grid";
import { CategoryGrid } from "@/components/cms/category-grid";
import { SmartVisualGridSection } from "./SmartGrid/SmartVisualGridSection";
import { FreeformBuilderSection } from './FreeformBuilderSection';
import MarketInfoRenderer from "@/components/cms/MarketInfoRenderer";
import { LocalPersonalizedProducts } from "@/components/cms/LocalPersonalizedProducts";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Script from "next/script";
import { useLocation } from "@/contexts/location-context";

interface Props {
    section: CmsSection;
    siteCategories: any[];
    globalPromoConfig: any;
    allSections?: CmsSection[];
}

const isGif = (url: string) => url?.toLowerCase().endsWith('.gif');

// IsolatedHtmlContainer: renders custom HTML+CSS inside a Shadow DOM.
// Shadow DOM is the ONLY 100% guaranteed way to prevent <style> leakage.
// Styles inside shadow root are completely invisible to the rest of the page.
function IsolatedHtmlContainer({ html, css }: { html: string; css?: string }) {
    const hostRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        const host = hostRef.current;
        if (!host) return;

        // Attach shadow root once
        let shadow = host.shadowRoot;
        if (!shadow) {
            shadow = host.attachShadow({ mode: 'open' });
        }

        // Build shadow DOM content: base reset + link to public fonts if needed + user CSS + user HTML
        shadow.innerHTML = `
            <style>
                :host {
                    display: block;
                    width: 100%;
                    all: initial;
                    contain: content;
                    font-family: inherit;
                    font-size: 16px;
                    line-height: 1.5;
                    color: #111;
                    box-sizing: border-box;
                }
                *, *::before, *::after {
                    box-sizing: border-box;
                }
                img, video { max-width: 100%; display: block; }
                a { color: inherit; }
            </style>
            ${css ? `<style>${css}</style>` : ''}
            <div class="custom-html-root">${html}</div>
        `;
    }, [html, css]);

    return <div ref={hostRef} style={{ display: 'block', width: '100%' }} />;
}



function InlineCategorySection({ config, siteCategories, globalPromoConfig, wrapper }: { config: any, siteCategories: any[], globalPromoConfig: any, wrapper: string }) {
    const scrollContainerRef = React.useRef<HTMLDivElement>(null);
    
    const scroll = (direction: 'left' | 'right') => {
        if (scrollContainerRef.current) {
            const amount = scrollContainerRef.current.clientWidth * 0.8;
            scrollContainerRef.current.scrollBy({ left: direction === 'left' ? -amount : amount, behavior: 'smooth' });
        }
    };

    const enabledCategories = config.enabledCategories || {};
    const enabledSlugs = Object.entries(enabledCategories).filter(([, v]) => v === true).map(([k]) => k);
    if (enabledSlugs.length === 0) return null;
    
    const catCollectionMedia = config.collectionMedia || globalPromoConfig?.collectionMedia || {};
    const filteredCats = siteCategories.filter((cat: any) => enabledSlugs.includes(cat.slug) || enabledSlugs.includes(cat.id));
    if (filteredCats.length === 0) return null;

    return (
        <section className={`${wrapper} mt-8 md:mt-10`}>
            <div className="flex items-center justify-between mb-4 md:mb-6">
                <div>
                    <h2 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">{config.title || "Catégories"}</h2>
                    {config.subtitle && <p className="text-sm text-slate-500 mt-1">{config.subtitle}</p>}
                </div>
                <div className="flex gap-2">
                    <button onClick={() => scroll('left')} className="p-2 rounded-full border border-slate-200 hover:bg-slate-100 transition-colors">
                        <ChevronLeft className="w-5 h-5 text-slate-600" />
                    </button>
                    <button onClick={() => scroll('right')} className="p-2 rounded-full border border-slate-200 hover:bg-slate-100 transition-colors">
                        <ChevronRight className="w-5 h-5 text-slate-600" />
                    </button>
                </div>
            </div>
            <div ref={scrollContainerRef} className="flex gap-4 overflow-x-auto scrollbar-none scroll-smooth pb-4">
                {filteredCats.map((cat: any) => {
                    const customImg = catCollectionMedia[cat.slug]?.image || catCollectionMedia[cat.id]?.image;
                    const displayImg = customImg || cat.icon || getAssetUrl(cat.featuredAsset?.source);
                    return (
                        <Link key={cat.id} href={`/search?category=${cat.slug}`} className="flex-shrink-0 w-36 md:w-44 group">
                            <div className="aspect-square rounded-2xl bg-slate-100 overflow-hidden mb-3 border border-slate-200/60 group-hover:shadow-md transition-all duration-300">
                                {displayImg ? (
                                    <img src={displayImg} alt={cat.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-3xl">📦</div>
                                )}
                            </div>
                            <h3 className="text-sm font-semibold text-slate-800 text-center group-hover:text-red-600 transition-colors line-clamp-1">{cat.name}</h3>
                        </Link>
                    );
                })}
            </div>
        </section>
    );
}

export function CustomCodeRenderer({ config, wrapperClass }: { config: any; wrapperClass?: string }) {
    const rawHtml = config.htmlContent || config.html || config.code || config.value || config.content || '';
    const rawCss = config.cssContent || config.css || '';
    const js = config.jsContent || config.js || '';
    const scriptId = React.useId().replace(/:/g, 'sc-');

    // Extract any embedded <style> blocks from the HTML and merge them into rawCss
    // so that they are safely injected inside the Shadow DOM and not into the global document
    let html = rawHtml;
    let css = rawCss;
    html = html.replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, (_: string, innerCss: string) => {
        css += '\n' + innerCss;
        return '';
    });

    return (
        <section className={wrapperClass || "w-full"}>
            <IsolatedHtmlContainer html={html} css={css} />
            {js && js.trim().length > 0 && (
                <Script id={`js-${scriptId}`} strategy="afterInteractive" dangerouslySetInnerHTML={{
                    __html: `(() => {
                        try {
                            ${js}
                        } catch(e) {
                            console.error("Custom code execution error:", e);
                        }
                    })()`
                }} />
            )}
        </section>
    );
}

function evaluateSectionRules(rulesJsonStr?: string, selectedLocation?: any): boolean {
    if (!rulesJsonStr || typeof rulesJsonStr !== 'string' || rulesJsonStr.trim() === '') return true;
    try {
        const rules = JSON.parse(rulesJsonStr);

        // 1. Évaluation dynamique de n'importe quelle GeoZone (GeoEngine)
        if (rules.geoZones && Array.isArray(rules.geoZones) && rules.geoZones.length > 0) {
            const activeLocName = selectedLocation?.name || '';
            if (!activeLocName) return true; // Si aucune localisation n'est sélectionnée, afficher par défaut

            // Helper de normalisation dynamique (supprime les accents, tirets, espaces et casse)
            const normalizeGeoStr = (str: string) => (str || '')
                .toUpperCase()
                .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                .replace(/[^A-Z0-9]/g, "");

            const normActiveLoc = normalizeGeoStr(activeLocName);

            const isMatch = rules.geoZones.some((zone: string) => {
                const normZone = normalizeGeoStr(zone);
                if (!normZone || !normActiveLoc) return false;
                return normActiveLoc.includes(normZone) || normZone.includes(normActiveLoc);
            });

            if (!isMatch) {
                return false; // Section masquée car l'utilisateur est hors de la GeoZone ciblée
            }
        }

        // 2. Évaluation de la plage horaire
        if (rules.timeRange?.start && rules.timeRange?.end) {
            const now = new Date();
            const currentHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
            if (currentHHMM < rules.timeRange.start || currentHHMM > rules.timeRange.end) {
                return false;
            }
        }

        return true;
    } catch (e) {
        return true;
    }
}

/**
 * Strict body-section renderer.
 * Each case renders ONLY if the section has meaningful data.
 * Returns null when there's nothing to show, preventing empty cards.
 */
export function BodySectionRenderer({ section, siteCategories, globalPromoConfig, allSections = [] }: Props) {
    const locationContext = useLocation();
    const selectedLocation = locationContext?.selectedLocation;

    const adaptedSection = adaptLegacySection(section);
    const config = adaptedSection.data || {};
    const type = adaptedSection.type;

    // Évaluation dynamique des règles conditionnelles EMS (GeoZone, Horaire, Segment)
    const rulesJsonStr = config._rulesJson || config.rulesJson || section.data?._rulesJson || section.data?.rulesJson;
    if (!evaluateSectionRules(rulesJsonStr, selectedLocation)) {
        return null; // Masquer la section si les conditions GeoZone/Horaire ne sont pas remplies
    }

    // Masquage automatique des Ventes Flash expirées (uniquement si Vente Flash limitée avec masque forcé et date valide)
    const isFlashStrategy = type === 'FLASH_DEALS' || type === 'FLASH_SALE' || config.experienceStrategy === 'FLASH_SALE' || config.showCountdown;
    const endTimeStr = config.countdownEnd || config.endTime;
    const isUnlimited = config.isUnlimited === true;
    const shouldAutoHide = config.forceHideWhenExpired === true || (config.autoHideExpired === true && config.forceHideWhenExpired !== false);
    if (isFlashStrategy && !isUnlimited && shouldAutoHide && typeof endTimeStr === 'string' && endTimeStr.trim().length > 0) {
        const endMs = new Date(endTimeStr).getTime();
        if (!isNaN(endMs) && endMs < Date.now()) {
            return null; // Masquer la section uniquement si le chrono flash est réellement expiré et explicitement configuré pour se masquer
        }
    }

    // Strict emptiness check helper
    const isEmpty = (v: any) => v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);

    const wrapper = "max-w-[1440px] mx-auto w-full px-3 sm:px-4 md:px-8 lg:px-12";

    switch (type) {
        case 'PRODUCT_COLLECTION': {
            return (
                <section className={`${wrapper} mt-2 md:mt-3`}>
                    <UniversalProductCollection {...config} />
                </section>
            );
        }

        case 'CATEGORY_COLLECTION': {
            return (
                <section className={`${wrapper} mt-2 md:mt-3`}>
                    <CategoryCollection {...config} />
                </section>
            );
        }
        case 'QUICK_LINKS': {
            // QuickLinks now only renders promotional banners
            const hasBanners = (config.promoBanners && config.promoBanners.length > 0) || config.promoBanner;
            if (!config.showPromoBanners && !config.showPromoBanner && !hasBanners) return null;
            return (
                <section className={`${wrapper} mt-3 md:mt-4`}>
                    <QuickLinks promoConfig={config} />
                </section>
            );
        }

        case 'FLASH_SALE':
        case 'FLASH_DEALS': {
            return (
                <section className={`${wrapper} mt-2 md:mt-3`}>
                    <FlashSaleSection config={config} />
                </section>
            );
        }

        case 'RICH_TEXT': {
            return (
                <RichTextSection config={config} wrapper={wrapper} />
            );
        }

        case 'MODALS': {
            return <HomeModal config={config} />;
        }

        case 'CATEGORIES': {
            return <InlineCategorySection config={config} siteCategories={siteCategories} globalPromoConfig={globalPromoConfig} wrapper={wrapper} />;
        }

        case 'PRODUCT_GRID': {
            // Standard product grid section using the cms/TabbedProductGrid component
            return (
                <section className={`${wrapper} mt-2 md:mt-3`}>
                    <TabbedProductGrid
                        title={config.title}
                        layout={config.layout || 'grid'}
                        columns={config.columns || 4}
                        cardStyle={config.cardStyle || 'standard'}
                        tabs={config.tabs}
                    />
                </section>
            );
        }

        case 'CATEGORY_GRID': {
            // Category grid using the cms/CategoryGrid component
            return (
                <section className={`${wrapper} mt-2 md:mt-3`}>
                    <CategoryGrid
                        title={config.title}
                        description={config.description}
                        layout={config.layout || 'grid'}
                        categories={config.categories}
                        take={config.take || 12}
                    />
                </section>
            );
        }

        case 'SMART_VISUAL_GRID': {
            return <SmartVisualGridSection config={config} siteCategories={siteCategories} />;
        }
        
        case 'FREEFORM_BUILDER': {
            return <FreeformBuilderSection config={config} />;
        }

        case 'LOCAL_PRODUCTS': {
            return (
                <section className={`${wrapper} mt-2 md:mt-3`}>
                    <LocalPersonalizedProducts config={config} />
                </section>
            );
        }

        case 'MARKET_INFO':
        case 'NEIGHBORHOOD_INFO': {
            const hasOtherProductsSection = allSections.some(
                (s: any) => s.isActive && s.id !== section.id && ['LOCAL_PRODUCTS', 'PRODUCT_GRID'].includes(s.type)
            );
            return <MarketInfoRenderer config={config} showProducts={!hasOtherProductsSection} />;
        }

        case 'CUSTOM':
        case 'CUSTOM_HTML':
        case 'MARKET_CODE':
        case 'NEIGHBORHOOD_CODE': {
            return <CustomCodeRenderer config={config} wrapperClass={`${wrapper} mt-8 md:mt-10`} />;
        }

        default:
            return null;
    }
}
