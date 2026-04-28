"use client";

import React from "react";
import Link from "next/link";
import { getAssetUrl } from "@/lib/vendure/api-utils";
import { QuickLinks } from "./QuickLinks";
import { FlashSaleSection } from "./FlashSaleSection";
import { HomeModal } from "./HomeModal";
import { CmsSection } from "@/lib/vendure/cms-queries";
import { TabbedProductGrid } from "@/components/cms/tabbed-product-grid";
import { CategoryGrid } from "@/components/cms/category-grid";

interface Props {
    section: CmsSection;
    siteCategories: any[];
    globalPromoConfig: any;
}

/**
 * Strict body-section renderer.
 * Each case renders ONLY if the section has meaningful data.
 * Returns null when there's nothing to show, preventing empty cards.
 */
export function BodySectionRenderer({ section, siteCategories, globalPromoConfig }: Props) {
    const config = section.data || {};
    const type = section.type;

    // Strict emptiness check helper
    const isEmpty = (v: any) => v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);

    const wrapper = "max-w-[1440px] mx-auto w-full px-3 sm:px-4 md:px-8 lg:px-12";

    switch (type) {
        case 'QUICK_LINKS': {
            // QuickLinks now only renders promotional banners
            const hasBanners = (config.promoBanners && config.promoBanners.length > 0) || config.promoBanner;
            if (!config.showPromoBanners && !config.showPromoBanner && !hasBanners) return null;
            return (
                <section className={`${wrapper} mt-6 md:mt-8`}>
                    <QuickLinks promoConfig={config} />
                </section>
            );
        }

        case 'FLASH_DEALS': {
            // FlashSettings saves flashVersions array; render ALL active campaigns
            let activeVersions: any[] = [];
            if (config.flashVersions && Array.isArray(config.flashVersions)) {
                activeVersions = config.flashVersions.filter((v: any) => v.isActive);
                // Fallback: if none are active, use the first one
                if (activeVersions.length === 0 && config.flashVersions.length > 0) {
                    activeVersions = [config.flashVersions[0]];
                }
            } else if (config.title || config.endTime || config.manualProductIds?.length || config.filterCriteria) {
                // Legacy: config itself is a single flash deal
                activeVersions = [config];
            }
            if (activeVersions.length === 0) return null;
            return (
                <section className={`${wrapper} mt-8 md:mt-10 space-y-6`}>
                    {activeVersions.map((flash: any, idx: number) => (
                        <FlashSaleSection key={flash.id || idx} config={flash} />
                    ))}
                </section>
            );
        }

        case 'CATEGORIES': {
            // STRICT: Only render categories explicitly enabled in the CATEGORIES section settings.
            // Never fall back to siteCategories — that list is uncontrolled and may contain unwanted items.
            const enabledCategories = config.enabledCategories || {};
            const enabledSlugs = Object.entries(enabledCategories).filter(([, v]) => v === true).map(([k]) => k);
            if (enabledSlugs.length === 0) return null;
            const catCollectionMedia = config.collectionMedia || globalPromoConfig?.collectionMedia || {};
            // Match siteCategories by slug/code against enabledSlugs
            const filteredCats = siteCategories.filter((cat: any) => enabledSlugs.includes(cat.slug) || enabledSlugs.includes(cat.id));
            if (filteredCats.length === 0) return null;

            const cols = config.columnsDesktop === 2 ? 'grid-cols-2' :
                config.columnsDesktop === 3 ? 'grid-cols-2 md:grid-cols-3' :
                config.columnsDesktop === 4 ? 'grid-cols-2 md:grid-cols-4' :
                config.columnsDesktop === 6 ? 'grid-cols-3 md:grid-cols-6' :
                'grid-cols-2 md:grid-cols-3 lg:grid-cols-6';
            const cardRadius = config.cardBorderRadius || '12px';
            const cardStyle = config.cardStyle || 'standard';
            const imageShape = config.imageShape || 'rounded';
            const imgRadius = imageShape === 'circle' ? '50%' : imageShape === 'square' ? '4px' : '12px';

            const limit = config.limit || 12;
            const catsToShow = filteredCats.slice(0, limit);

            return (
                <section className={`${wrapper} mt-8 md:mt-10`}>
                    {(config.title || config.subtitle) && (
                        <div className="mb-4 sm:mb-6 md:mb-8 text-center">
                            {config.title && <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-secondary tracking-tight">{config.title}</h2>}
                            {config.subtitle && <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 sm:mt-2 font-medium">{config.subtitle}</p>}
                        </div>
                    )}
                    <div className={`grid gap-2 sm:gap-3 md:gap-4 ${cols}`}>
                        {catsToShow.map((cat: any) => {
                            const catImg = catCollectionMedia[cat.slug] || catCollectionMedia[cat.id] || cat.image || cat.icon || null;
                            const isElevated = cardStyle === 'elevated';
                            const isBold = cardStyle === 'bold';
                            const isMinimal = cardStyle === 'minimal';

                            return (
                                <Link
                                    key={cat.id}
                                    href={`/search?facets=${cat.id}`}
                                    className={`group flex flex-col items-center justify-center overflow-hidden transition-all duration-200 ${
                                        isElevated ? 'p-3 sm:p-5 hover:-translate-y-1 hover:shadow-xl' :
                                        isBold ? 'p-2 sm:p-3 hover:-translate-y-0.5 hover:shadow-lg' :
                                        isMinimal ? 'p-1.5 sm:p-2 hover:opacity-80' :
                                        'p-2.5 sm:p-4 hover:-translate-y-0.5 hover:shadow-lg'
                                    }`}
                                    style={{
                                        borderRadius: cardRadius,
                                        border: isMinimal ? 'none' : `1px solid var(--border, #e2e8f0)`,
                                        backgroundColor: config.cardBgColor || '#fff',
                                        boxShadow: isElevated ? '0 4px 12px rgba(0,0,0,0.06)' : config.cardShadow ? '0 1px 3px rgba(0,0,0,0.04)' : 'none',
                                    }}
                                >
                                    <div
                                        className={`overflow-hidden flex items-center justify-center mb-1.5 sm:mb-2.5 group-hover:scale-105 transition-transform duration-300 ${
                                            isBold ? 'w-10 h-10 sm:w-14 sm:h-14 md:w-18 md:h-18' : isMinimal ? 'w-9 h-9 sm:w-12 sm:h-12 md:w-16 md:h-16' : 'w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20'
                                        }`}
                                        style={{
                                            borderRadius: imgRadius,
                                            backgroundColor: catImg ? 'transparent' : 'var(--primary-5, rgba(226,232,240,0.5))',
                                        }}
                                    >
                                        {catImg ? (
                                            <img
                                                src={getAssetUrl(catImg)}
                                                alt={cat.name}
                                                className="w-full h-full object-cover"
                                                style={{ borderRadius: imgRadius }}
                                            />
                                        ) : (
                                            <span className={`font-black text-primary/30 ${isBold ? 'text-3xl' : 'text-2xl'}`}>
                                                {cat.name?.charAt(0) || '?'}
                                            </span>
                                        )}
                                    </div>
                                    {config.showLabels !== false && (
                                        <span
                                            className="font-bold text-center text-secondary line-clamp-2 group-hover:text-primary transition-colors"
                                            style={{
                                                fontSize: config.labelFontSize || '11px',
                                                fontWeight: config.labelFontWeight || '700',
                                                color: config.labelColor || undefined,
                                            }}
                                        >
                                            {cat.name}
                                        </span>
                                    )}
                                </Link>
                            );
                        })}
                    </div>
                </section>
            );
        }

        case 'FEATURES': {
            const features = config.features || config.items || [];
            if (features.length === 0) return null;
            return (
                <section className="w-full mt-8 md:mt-10 border-y border-border/30" style={config.bgColor ? { backgroundColor: config.bgColor } : { backgroundColor: '#fafafa' }}>
                    <div className={`${wrapper} py-6 md:py-8`}>
                        {config.title && (
                            <h2 className="text-xl md:text-2xl font-black text-center mb-6 text-secondary">{config.title}</h2>
                        )}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
                            {features.map((feat: any, idx: number) => (
                                <div key={idx} className="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg hover:bg-white/50 transition-colors">
                                    <div className="shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center text-base sm:text-xl">
                                        {feat.icon || '✨'}
                                    </div>
                                    <div>
                                        <div className="font-bold text-xs sm:text-sm text-secondary">{feat.title || feat.label}</div>
                                        {feat.description && <div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">{feat.description}</div>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            );
        }

        case 'CTA_VENDOR': {
            if (!config.title && !config.description && !config.buttonText) return null;
            return (
                <section className={`${wrapper} mt-8 md:mt-10`}>
                    <div
                        className="rounded-xl sm:rounded-2xl md:rounded-3xl overflow-hidden relative p-5 sm:p-8 md:p-14 text-center shadow-xl"
                        style={{
                            background: config.bgImageUrl
                                ? `linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.65)), url(${getAssetUrl(config.bgImageUrl)})`
                                : 'linear-gradient(135deg, var(--primary, #0f172a) 0%, #1e40af 100%)',
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                        }}
                    >
                        <h2 className="text-lg sm:text-2xl md:text-4xl font-black text-white tracking-tight mb-2 sm:mb-3">
                            {config.title || 'Rejoignez-nous en tant que vendeur'}
                        </h2>
                        <p className="text-white/90 text-xs sm:text-sm md:text-base max-w-2xl mx-auto mb-4 sm:mb-6 md:mb-8 font-medium">
                            {config.description || 'Développez votre activité sur notre marketplace'}
                        </p>
                        <a
                            href={config.buttonLink || '/vendor/register'}
                            className="inline-flex items-center gap-2 bg-white text-secondary font-black px-4 sm:px-6 md:px-10 py-2.5 sm:py-3 md:py-4 rounded-xl hover:scale-105 active:scale-95 transition-transform shadow-lg text-xs sm:text-sm md:text-base"
                        >
                            {config.buttonText || 'Devenir vendeur'} →
                        </a>
                    </div>
                </section>
            );
        }

        case 'NEWSLETTER': {
            if (!config.title && !config.subtitle && !config.buttonText) return null;
            return (
                <section className={`${wrapper} mt-8 md:mt-10`}>
                    <div
                        className="rounded-xl sm:rounded-2xl p-5 sm:p-8 md:p-12 text-center border border-border/30"
                        style={config.bgColor ? { backgroundColor: config.bgColor } : { background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)' }}
                    >
                        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-4">
                            <span className="text-2xl">✉️</span>
                        </div>
                        <h2 className="text-base sm:text-xl md:text-2xl font-black text-secondary mb-2">{config.title || 'Newsletter'}</h2>
                        <p className="text-xs sm:text-sm text-muted-foreground mb-4 sm:mb-6 max-w-lg mx-auto">{config.subtitle || 'Recevez nos offres exclusives'}</p>
                        <form className="flex flex-col sm:flex-row max-w-md mx-auto gap-2">
                            <input
                                type="email"
                                placeholder={config.placeholder || 'Votre email'}
                                className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border border-border bg-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                            />
                            <button
                                type="submit"
                                className="bg-primary text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-black text-xs sm:text-sm hover:opacity-90 active:scale-95 transition-all shadow-md"
                            >
                                {config.buttonText || "S'inscrire"}
                            </button>
                        </form>
                    </div>
                </section>
            );
        }

        case 'TESTIMONIALS': {
            const testimonials = config.testimonials || config.items || [];
            if (testimonials.length === 0) return null;
            return (
                <section className={`${wrapper} mt-8 md:mt-10`}>
                    {config.title && (
                        <div className="mb-4 sm:mb-6 md:mb-8 text-center">
                            <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-secondary">{config.title}</h2>
                            {config.subtitle && <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 sm:mt-2">{config.subtitle}</p>}
                        </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
                        {testimonials.map((t: any, idx: number) => (
                            <div key={idx} className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-border/30 hover:shadow-lg transition-shadow relative">
                                <div className="absolute -top-3 -left-2 text-5xl text-primary/20 font-serif leading-none">&ldquo;</div>
                                <p className="text-sm text-secondary/80 italic mb-4 relative z-10 leading-relaxed">
                                    {t.text || t.content}
                                </p>
                                <div className="flex items-center gap-3 pt-4 border-t border-border/20">
                                    {t.avatar && <img src={getAssetUrl(t.avatar)} alt={t.author} className="w-10 h-10 rounded-full object-cover" />}
                                    <div>
                                        <div className="font-bold text-sm text-secondary">{t.author || t.name}</div>
                                        {t.role && <div className="text-xs text-muted-foreground">{t.role}</div>}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            );
        }

        case 'BLOG_POSTS': {
            const posts = config.posts || config.items || [];
            if (posts.length === 0) return null;
            return (
                <section className={`${wrapper} mt-8 md:mt-10`}>
                    {config.title && (
                        <div className="mb-4 sm:mb-6 md:mb-8 flex items-end justify-between">
                            <div>
                                <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-secondary">{config.title}</h2>
                                {config.subtitle && <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 sm:mt-2">{config.subtitle}</p>}
                            </div>
                            {config.viewAllLink && (
                                <Link href={config.viewAllLink} className="text-sm font-bold text-primary hover:underline">
                                    Tout voir →
                                </Link>
                            )}
                        </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
                        {posts.map((post: any, idx: number) => (
                            <Link
                                key={idx}
                                href={post.link || '#'}
                                className="group bg-white rounded-xl sm:rounded-2xl overflow-hidden border border-border/30 hover:shadow-lg hover:-translate-y-1 transition-all duration-200"
                            >
                                {post.imageUrl && (
                                    <div className="aspect-[16/9] overflow-hidden bg-muted/10">
                                        <img
                                            src={getAssetUrl(post.imageUrl)}
                                            alt={post.title}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        />
                                    </div>
                                )}
                                <div className="p-3 sm:p-5">
                                    {post.category && (
                                        <span className="text-[10px] font-black uppercase tracking-wider text-primary">{post.category}</span>
                                    )}
                                    <h3 className="font-bold text-base text-secondary mt-1 mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                                        {post.title}
                                    </h3>
                                    {(post.excerpt || post.description) && (
                                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                            {post.excerpt || post.description}
                                        </p>
                                    )}
                                </div>
                            </Link>
                        ))}
                    </div>
                </section>
            );
        }

        case 'CUSTOM': {
            const html = config.htmlContent || config.customHtml || config.html;
            if (!html || html.trim() === '') return null;
            return (
                <section className={`${wrapper} mt-8 md:mt-12 overflow-hidden`}>
                    {config.customCss && <style dangerouslySetInnerHTML={{ __html: config.customCss }} />}
                    <div dangerouslySetInnerHTML={{ __html: html }} />
                    {config.customJs && (
                        <script dangerouslySetInnerHTML={{ __html: config.customJs }} />
                    )}
                </section>
            );
        }

        case 'MODALS': {
            // Modals render at any time but have no layout presence
            const hasModals = config.modals?.some((m: any) => m.enabled);
            if (!config.enabled && !hasModals) return null;
            return <HomeModal config={config} />;
        }

        case 'TABBED_PRODUCT_GRID': {
            if (!config.tabs || config.tabs.length === 0) return null;
            return (
                <section className={`${wrapper} mt-8 md:mt-10`}>
                    <TabbedProductGrid {...config} />
                </section>
            );
        }

        case 'PRODUCT_GRID': {
            // Product grid with configurable filter type
            if (!config.title && !config.filterType && !config.collectionSlug) return null;
            const gridCols = config.columns === 2 ? 'grid-cols-2' :
                config.columns === 3 ? 'grid-cols-2 md:grid-cols-3' :
                config.columns === 5 ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-5' :
                'grid-cols-2 md:grid-cols-3 lg:grid-cols-4';
            return (
                <section className={`${wrapper} mt-8 md:mt-10`}>
                    {config.title && (
                        <div className="mb-4 sm:mb-6 md:mb-8 text-center">
                            <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-secondary tracking-tight">{config.title}</h2>
                            {config.subtitle && <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 sm:mt-2">{config.subtitle}</p>}
                        </div>
                    )}
                    <div className={`grid ${gridCols} gap-3 sm:gap-4 md:gap-6`}>
                        {/* Product grid renders via TabbedProductGrid with a single tab as fallback */}
                    </div>
                    <TabbedProductGrid
                        title=""
                        tabs={[{
                            id: 'product-grid-tab',
                            label: config.title || 'Produits',
                            filterType: config.filterType || 'LATEST',
                            collectionSlug: config.collectionSlug,
                            facetValueIds: config.facetValueIds,
                            take: config.take || 8,
                        }]}
                        layout={config.layout || 'grid'}
                        columns={config.columns || 4}
                        cardStyle={config.cardStyle || 'standard'}
                    />
                </section>
            );
        }

        case 'CATEGORY_GRID': {
            // Category grid using the cms/CategoryGrid component
            return (
                <section className={`${wrapper} mt-8 md:mt-10`}>
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

        default:
            return null;
    }
}
