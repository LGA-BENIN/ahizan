import React, { useRef, useState } from 'react';
import { GridItemRenderer } from './GridItemRenderer';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';

interface SmartVisualGridSectionProps {
    config: any;
    siteCategories: any[];
}

export const SmartVisualGridSection = ({ config, siteCategories }: SmartVisualGridSectionProps) => {
    // 1. Parse JSON configuration
    let parsedConfig: any = null;
    try {
        if (typeof config === 'string') {
            parsedConfig = JSON.parse(config);
        } else if (config.ROOT || config.isGrouped || config.tabs) {
            parsedConfig = config;
        } else if (config.dataJson) {
            parsedConfig = typeof config.dataJson === 'string' ? JSON.parse(config.dataJson) : config.dataJson;
        } else if (config.data) {
            parsedConfig = typeof config.data === 'string' ? JSON.parse(config.data) : config.data;
        } else {
            parsedConfig = config;
        }
    } catch (e) {
        console.error("Failed to parse SmartVisualGrid config", e);
        return null;
    }

    if (!parsedConfig) return null;

    // Detect if we're using the new tabbed layout or legacy
    const isGrouped = parsedConfig.isGrouped === true;
    
    // Tab state
    const [activeTabId, setActiveTabId] = useState(() => {
        if (isGrouped && parsedConfig.tabs?.length > 0) {
            return parsedConfig.tabs[0].id;
        }
        return null;
    });

    let craftState: any = null;

    if (isGrouped && parsedConfig.tabs?.length > 0) {
        const activeTab = parsedConfig.tabs?.find((t: any) => t.id === activeTabId) || parsedConfig.tabs?.[0];
        if (activeTab && activeTab.craftState) {
            try {
                craftState = typeof activeTab.craftState === 'string' ? JSON.parse(activeTab.craftState) : activeTab.craftState;
            } catch(e) {
                console.error("Failed to parse tab craft state", e);
            }
        }
    } else {
        if (parsedConfig.craftState) {
            try {
                craftState = typeof parsedConfig.craftState === 'string' ? JSON.parse(parsedConfig.craftState) : parsedConfig.craftState;
            } catch(e) {
                console.error("Failed to parse craftState", e);
            }
        } else if (parsedConfig.ROOT) {
            craftState = parsedConfig;
        }
    }

    const rootNode = craftState?.ROOT;
    const rootProps = rootNode?.props || {};

    const {
        columnsDesktop = 4,
        columnsTablet,
        columnsMobile,
        gapX = 16,
        gapY = 16,
        paddingTop = 0,
        paddingBottom = 0,
        paddingLeft = 0,
        paddingRight = 0,
        bgColor = 'transparent',
        bgImage = '',
        bgGradient = '',
        contentSource = 'manual',
        sectionAnimation = 'none',
        contentLayout = 'image-above-text',
        gridAlignment = 'center',
        
        globalTitle = '',
        globalTitleSize = '24px',
        globalTitleColor = '#0f172a',
        sectionHeaderAlign = 'center',
        sectionHeaderCtaEnabled = false,
        sectionHeaderCtaText = 'Voir Tout',
        sectionHeaderCtaUrl = '#',
        sectionHeaderCtaStyle = 'solid',

        scrollMode = 'grid',
        carouselArrows = 'circle',
        globalShape = 'circle',
        globalImageBorderRadius = '',
        globalImageWidth = '120px',
        globalImageHeight = '120px',
        globalImageFitMode = 'fit',
        globalImageFit = 'contain',
        globalImagePosX = 0,
        globalImagePosY = 0,
        globalAnimEntrance = 'none',
        globalAnimHover = 'scale',
        
        globalItemAlignment = 'center',
        globalItemTitleSize = '16px',
        globalItemTitleWeight = 'bold',
        globalItemTitleColor = '#0f172a',
        globalItemTitleTransform = 'none',
        globalItemDescSize = '14px',
        globalItemDescWeight = 'normal',
        globalItemDescColor = '#64748b',
        globalItemDescLines = 2,
        globalInsideTextPosition = 'center',
        globalTextPadding = 16,
        globalTextGap = 6,

        globalCardBorderWidth = 0,
        globalCardBorderColor = 'transparent',
        globalCardBorderRadius = '12px',
        globalCardBgColor = 'transparent',
        globalCardHoverBgColor = 'transparent',

        globalShowCta = false,
        globalCtaText = 'Découvrir',
        globalCtaStyle = 'solid',
        autoplay = false,
        autoplaySpeed = 3000,
        autoplayDirection = 'right',
    } = rootProps;

    const isCarousel = scrollMode === 'carousel';
    const isShapeMode = contentLayout === 'image-on-shape' || globalShape === 'circle';
    const isHeroOrBanner = (rootNode?.nodes || []).some((id: string) => {
        const p = craftState[id]?.props || {};
        return (p.cardColSpan && p.cardColSpan > 1) || p.cardContentLayout === 'image-overlay';
    });

    const parsedColMobile = parseFloat(String(columnsMobile));
    const isMobileAuto = !columnsMobile || columnsMobile === 'auto' || isNaN(parsedColMobile) || parsedColMobile <= 0;

    let effectiveMobileNumber: number;
    if (isMobileAuto) {
        if (isCarousel) {
            // En carrousel automatique : 3.5 pour les cercles de catégories, 1.4-1.5 pour les bannières / 1 et demi, 2.4 pour les produits
            if (isShapeMode) {
                effectiveMobileNumber = 3.5;
            } else if (isHeroOrBanner || Number(columnsDesktop) <= 2) {
                effectiveMobileNumber = 1.4;
            } else {
                effectiveMobileNumber = 2.4;
            }
        } else {
            effectiveMobileNumber = isShapeMode ? 3 : (isHeroOrBanner ? 1 : 2);
        }
    } else {
        effectiveMobileNumber = parsedColMobile;
    }

    const autoTablet = Number(columnsTablet) || (Number(columnsDesktop) <= 2 ? Number(columnsDesktop) : Math.min(Number(columnsDesktop), Math.max(2, Math.ceil(Number(columnsDesktop) / 2))));
    const effectiveDesktop = Number(columnsDesktop) || 4;
    const effectiveTablet = autoTablet;
    const effectiveMobile = effectiveMobileNumber;

    const [isHovered, setIsHovered] = useState(false);
    const gridInstanceId = React.useId ? `svg-${React.useId().replace(/[^a-zA-Z0-9_-]/g, '')}` : 'svg-grid-root';

    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const scroll = (direction: 'left' | 'right') => {
        if (scrollContainerRef.current) {
            const container = scrollContainerRef.current;
            const scrollAmount = container.clientWidth * 0.8;
            container.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
        }
    };

    let bgStyle = bgColor;
    if (bgGradient) {
        bgStyle = bgGradient;
    } else if (bgImage) {
        bgStyle = `url(${bgImage}) center/cover no-repeat ${bgColor}`;
    }

    const gridColsClass = gridInstanceId;

    const getAlignment = () => {
        if (gridAlignment === 'left') return 'start';
        if (gridAlignment === 'right') return 'end';
        return 'center';
    };

    // Extract items to render natively from the CMS
    const childNodeIds = rootNode?.nodes || [];
    const itemsToRender = childNodeIds.map((id: string) => {
        const itemProps = craftState[id]?.props || {};
        return {
            ...itemProps,
            imageShape: globalShape,
            globalImageBorderRadius,
            imageWidth: itemProps.imageWidth,
            imageHeight: itemProps.imageHeight,
            globalImageWidth,
            globalImageHeight,
            globalImageFitMode,
            globalImageFit,
            globalImagePosX,
            globalImagePosY,
            animEntrance: globalAnimEntrance,
            animHover: globalAnimHover,
            itemAlignment: globalItemAlignment,
            globalInsideTextPosition,
            globalTextPadding,
            globalTextGap,
            globalCardBorderWidth,
            globalCardBorderColor,
            globalCardBorderRadius,
            globalCardBgColor,
            globalCardHoverBgColor,
            globalShowCta,
            globalCtaText,
            globalCtaStyle,
            globalItemTitleTransform,
            globalItemDescLines,
            globalItemTitleColor,
            globalItemDescColor,
            titleFontSize: itemProps.titleFontSize || globalItemTitleSize,
            titleFontWeight: itemProps.titleFontWeight || globalItemTitleWeight,
            titleAlign: globalItemAlignment,
            descFontSize: itemProps.descFontSize || globalItemDescSize,
            descFontWeight: itemProps.descFontWeight || globalItemDescWeight,
            descAlign: globalItemAlignment,
        };
    }).filter(Boolean);

    // Live catalog enrichment (Real products & collections, no frozen prices)
    const [liveItems, setLiveItems] = React.useState<any[]>(itemsToRender);

    React.useEffect(() => {
        let isMounted = true;
        setLiveItems(itemsToRender);

        const slugsOrIds: string[] = [];
        itemsToRender.forEach((item: any) => {
            if (item.productId) slugsOrIds.push(String(item.productId));
            else if (item.productSlug) slugsOrIds.push(String(item.productSlug));
            else if (item.linkUrl && item.linkUrl.includes('/product/')) {
                const match = item.linkUrl.match(/\/product\/([a-zA-Z0-9_-]+)/);
                if (match && match[1]) slugsOrIds.push(match[1]);
            }
        });

        if (slugsOrIds.length === 0) return;

        const query = `
            query GetSmartGridLiveProducts {
                products(options: { take: 100 }) {
                    items {
                        id
                        slug
                        name
                        featuredAsset { preview }
                        variants {
                            id
                            price
                            priceWithTax
                            customFields {
                                onPromotion
                                promotionalPrice
                            }
                        }
                    }
                }
            }
        `;

        import('@/lib/vendure/api-utils').then(({ getShopApiUrl, getAssetUrl }) => {
            fetch(getShopApiUrl(), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query }),
            })
            .then(res => res.json())
            .then(data => {
                if (!isMounted) return;
                const fetchedProducts: any[] = data?.data?.products?.items || [];
                const prodMap = new Map<string, any>();
                fetchedProducts.forEach(p => {
                    prodMap.set(p.slug, p);
                    prodMap.set(String(p.id), p);
                });

                const enriched = itemsToRender.map((item: any) => {
                    let targetKey = '';
                    if (item.productSlug) targetKey = item.productSlug;
                    else if (item.productId) targetKey = String(item.productId);
                    else if (item.linkUrl && item.linkUrl.includes('/product/')) {
                        const m = item.linkUrl.match(/\/product\/([a-zA-Z0-9_-]+)/);
                        if (m && m[1]) targetKey = m[1];
                    }

                    const liveProd = targetKey ? prodMap.get(targetKey) : null;
                    if (!liveProd) return item;

                    const v = liveProd.variants?.[0];
                    const rawPrice = v?.priceWithTax ?? v?.price ?? 0;
                    const isPromo = v?.customFields?.onPromotion === true && v?.customFields?.promotionalPrice;
                    const promoVal = isPromo ? Number(v.customFields.promotionalPrice) : null;
                    const activePriceNum = promoVal !== null ? promoVal : rawPrice;

                    const livePriceText = activePriceNum > 0 
                        ? `${Number(activePriceNum).toLocaleString('fr-FR')} FCFA` 
                        : item.priceText;
                    const liveOldPrice = promoVal !== null && rawPrice > promoVal 
                        ? `${Number(rawPrice).toLocaleString('fr-FR')} FCFA` 
                        : item.oldPriceText;

                    return {
                        ...item,
                        titleText: (!item.titleText || item.titleText.startsWith('Produit ') || item.titleText === 'Nouveau Titre') ? liveProd.name : item.titleText,
                        imageUrl: item.imageUrl || (liveProd.featuredAsset?.preview ? getAssetUrl(liveProd.featuredAsset.preview) : item.imageUrl),
                        priceText: livePriceText || item.priceText,
                        oldPriceText: liveOldPrice || item.oldPriceText,
                        linkUrl: item.linkUrl || `/product/${liveProd.slug}`,
                    };
                });

                setLiveItems(enriched);
            })
            .catch(() => {});
        });

        return () => { isMounted = false; };
    }, [JSON.stringify(itemsToRender.map((i: any) => ({ url: i.linkUrl, slug: i.productSlug, id: i.productId })))]);

    let sectionAnimClass = '';
    if (sectionAnimation === 'fade-in') sectionAnimClass = 'animate-fade-in';
    else if (sectionAnimation === 'fade-up') sectionAnimClass = 'animate-fade-up';
    else if (sectionAnimation === 'zoom-in') sectionAnimClass = 'animate-zoom-in';

    React.useEffect(() => {
        if (!isCarousel || !autoplay || itemsToRender.length === 0) return;

        const interval = setInterval(() => {
            if (isHovered) return;

            const container = scrollContainerRef.current;
            if (!container) return;

            const maxScrollLeft = container.scrollWidth - container.clientWidth;
            const itemWidth = container.scrollWidth / itemsToRender.length;
            let newScrollLeft = container.scrollLeft + (autoplayDirection === 'right' ? itemWidth : -itemWidth);

            if (autoplayDirection === 'right') {
                if (container.scrollLeft >= maxScrollLeft - 5) {
                    newScrollLeft = 0;
                }
            } else {
                if (container.scrollLeft <= 5) {
                    newScrollLeft = maxScrollLeft;
                }
            }

            container.scrollTo({
                left: newScrollLeft,
                behavior: 'smooth'
            });
        }, autoplaySpeed);

        return () => clearInterval(interval);
    }, [isCarousel, autoplay, autoplaySpeed, autoplayDirection, itemsToRender.length, isHovered]);

    return (
        <section 
            className={`w-full overflow-hidden ${sectionAnimClass} my-4 md:my-6`}
            style={{
                background: bgStyle,
                paddingTop: `${paddingTop ? paddingTop : 24}px`,
                paddingBottom: `${paddingBottom ? paddingBottom : 20}px`,
            }}
        >
            <div 
                className="max-w-[1720px] w-full mx-auto relative group px-3 sm:px-4 md:px-6 lg:px-8"
                style={{
                    paddingLeft: paddingLeft && paddingLeft > 0 ? `${paddingLeft}px` : undefined,
                    paddingRight: paddingRight && paddingRight > 0 ? `${paddingRight}px` : undefined,
                }}
            >
                
                {/* SECTION HEADER: TITLE & CTA */}
                {(globalTitle || sectionHeaderCtaEnabled) && (
                    <div 
                        className="mb-6 w-full flex items-center justify-between flex-wrap gap-3"
                    >
                        {globalTitle && (
                            <h2 
                                className="m-0 tracking-tight" 
                                style={{ fontSize: `clamp(18px, 4.5vw, ${globalTitleSize || '24px'})`, color: globalTitleColor, fontWeight: 'bold' }}
                            >
                                {globalTitle}
                            </h2>
                        )}

                        {sectionHeaderCtaEnabled && (
                            <Link href={sectionHeaderCtaUrl || '#'} className="inline-block no-underline flex-shrink-0 ml-auto">
                                {sectionHeaderCtaStyle === 'solid' && (
                                    <span className="px-3.5 py-1.5 sm:px-5 sm:py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-lg shadow-sm transition-colors duration-200">
                                        {sectionHeaderCtaText || 'Voir Tout'}
                                    </span>
                                )}
                                {sectionHeaderCtaStyle === 'outline' && (
                                    <span className="px-3.5 py-1.5 sm:px-5 sm:py-2 border-2 border-blue-600 text-blue-600 hover:bg-blue-50 font-bold text-xs sm:text-sm rounded-lg transition-colors duration-200">
                                        {sectionHeaderCtaText || 'Voir Tout'}
                                    </span>
                                )}
                                {sectionHeaderCtaStyle === 'link' && (
                                    <span className="inline-flex items-center gap-1.5 text-blue-600 font-bold text-xs sm:text-sm hover:underline">
                                        {sectionHeaderCtaText || 'Voir Tout'} ➔
                                    </span>
                                )}
                            </Link>
                        )}
                    </div>
                )}

                {/* GROUP TABS SELECTOR */}
                {isGrouped && parsedConfig.tabs?.length > 1 && (
                    <div className={`flex ${parsedConfig.tabLayout === 'wrap' ? 'flex-wrap' : 'flex-nowrap overflow-x-auto scrollbar-hide pb-2'} ${parsedConfig.tabAlignment === 'center' ? 'justify-center' : parsedConfig.tabAlignment === 'right' ? 'justify-end' : 'justify-start'} gap-3 mb-6 px-4`}>
                        {parsedConfig.tabs.map((tab: any) => {
                            const isActive = tab.id === activeTabId;
                            const isPill = parsedConfig.groupStyle !== 'rectangle';
                            const activeColor = parsedConfig.activeColor || '#ef4444';
                            
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTabId(tab.id)}
                                    style={{
                                        backgroundColor: isActive ? activeColor : '#ffffff',
                                        color: isActive ? '#ffffff' : '#475569',
                                        borderColor: isActive ? activeColor : '#e2e8f0',
                                    }}
                                    className={`px-6 py-2.5 border-2 transition-all duration-300 font-semibold text-sm whitespace-nowrap shadow-sm hover:shadow-md ${
                                        isPill ? 'rounded-full' : 'rounded-xl'
                                    } ${isActive ? 'scale-105' : 'hover:border-gray-300'}`}
                                >
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* CAROUSEL ARROWS */}
                {isCarousel && carouselArrows !== 'none' && itemsToRender.length > 0 && (
                    <>
                        <button 
                            onClick={() => scroll('left')}
                            className={`absolute left-0 top-1/2 -translate-y-1/2 z-10 hidden md:flex items-center justify-center transition-all ${
                                carouselArrows === 'circle' ? 'w-10 h-10 rounded-full bg-white shadow-md text-gray-800 hover:scale-110' :
                                carouselArrows === 'square' ? 'w-10 h-10 rounded-md bg-white shadow-md text-gray-800 hover:scale-110' :
                                'text-gray-600 hover:text-black'
                            }`}
                        >
                            <ChevronLeft size={24} />
                        </button>
                        <button 
                            onClick={() => scroll('right')}
                            className={`absolute right-0 top-1/2 -translate-y-1/2 z-10 hidden md:flex items-center justify-center transition-all ${
                                carouselArrows === 'circle' ? 'w-10 h-10 rounded-full bg-white shadow-md text-gray-800 hover:scale-110' :
                                carouselArrows === 'square' ? 'w-10 h-10 rounded-md bg-white shadow-md text-gray-800 hover:scale-110' :
                                'text-gray-600 hover:text-black'
                            }`}
                        >
                            <ChevronRight size={24} />
                        </button>
                    </>
                )}

                <style dangerouslySetInnerHTML={{__html: `
                    .${gridColsClass} {
                        --grid-cols: ${effectiveMobile};
                    }
                    .${gridColsClass} .svg-hero-banner {
                        grid-column: 1 / -1 !important;
                        grid-row: auto !important;
                    }
                    @media (min-width: 640px) {
                        .${gridColsClass} { --grid-cols: ${effectiveTablet}; }
                        .${gridColsClass} .svg-hero-banner {
                            grid-column: 1 / -1 !important;
                            grid-row: auto !important;
                        }
                    }
                    @media (min-width: 1024px) {
                        .${gridColsClass} { --grid-cols: ${effectiveDesktop}; }
                        .${gridColsClass} .svg-hero-banner {
                            grid-column: span var(--hero-col-span, 1) !important;
                            grid-row: span var(--hero-row-span, 1) !important;
                        }
                    }
                    .scrollbar-hide::-webkit-scrollbar {
                        display: none;
                    }
                    .scrollbar-hide {
                        -ms-overflow-style: none;
                        scrollbar-width: none;
                    }
                `}} />

                {liveItems.length > 0 ? (
                    <div 
                        ref={scrollContainerRef}
                        onMouseEnter={() => setIsHovered(true)}
                        onMouseLeave={() => setIsHovered(false)}
                        className={`${gridColsClass} ${isCarousel ? 'flex overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-4' : 'grid'} transition-opacity duration-300`}
                        style={{
                            display: isCarousel ? 'flex' : 'grid',
                            gap: `${gapY}px ${gapX}px`,
                            gridTemplateColumns: isCarousel ? undefined : `repeat(var(--grid-cols), minmax(0, 1fr))`,
                            gridAutoRows: isCarousel ? undefined : 'minmax(min-content, max-content)',
                            justifyItems: isCarousel ? undefined : getAlignment()
                        }}
                    >
                        {liveItems.map((itemProps: any, index: number) => {
                            const isHero = Boolean((itemProps.cardRowSpan && itemProps.cardRowSpan > 1) || (itemProps.cardColSpan && itemProps.cardColSpan > 1) || itemProps.cardContentLayout === 'image-overlay');
                            const colSpan = itemProps.cardColSpan || 1;
                            const rowSpan = itemProps.cardRowSpan || 1;
                            
                            return (
                                <div 
                                    key={index} 
                                    className={`${isHero ? 'svg-hero-banner ' : ''}${isCarousel ? 'flex-shrink-0 snap-start h-full' : 'w-full h-full'}`} 
                                    style={{ 
                                        width: isCarousel ? `calc((100% - (var(--grid-cols) - 1) * ${gapX}px) / var(--grid-cols))` : '100%',
                                        flex: isCarousel ? `0 0 calc((100% - (var(--grid-cols) - 1) * ${gapX}px) / var(--grid-cols))` : undefined,
                                        ['--hero-col-span' as any]: Math.min(colSpan, effectiveDesktop),
                                        ['--hero-row-span' as any]: rowSpan,
                                    }}
                                >
                                    <GridItemRenderer 
                                        props={itemProps} 
                                        contentLayout={contentLayout}
                                    />
                                </div>
                            );
                        })}
                    </div>
                ) : null}
            </div>
        </section>
    );
};
