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

    const autoTablet = columnsDesktop <= 2 ? columnsDesktop : Math.min(columnsDesktop, Math.max(2, Math.ceil(columnsDesktop / 2)));
    const autoMobile = columnsDesktop === 1 ? 1 : 2;

    const [isHovered, setIsHovered] = useState(false);

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

    const gridColsClass = `grid`;

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

    let sectionAnimClass = '';
    if (sectionAnimation === 'fade-in') sectionAnimClass = 'animate-fade-in';
    else if (sectionAnimation === 'fade-up') sectionAnimClass = 'animate-fade-up';
    else if (sectionAnimation === 'zoom-in') sectionAnimClass = 'animate-zoom-in';

    const isCarousel = scrollMode === 'carousel';

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
                className="max-w-[1380px] mx-auto relative group px-4 sm:px-6 lg:px-8"
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
                                className="m-0" 
                                style={{ fontSize: globalTitleSize, color: globalTitleColor, fontWeight: 'bold' }}
                            >
                                {globalTitle}
                            </h2>
                        )}

                        {sectionHeaderCtaEnabled && (
                            <Link href={sectionHeaderCtaUrl || '#'} className="inline-block no-underline flex-shrink-0 ml-auto">
                                {sectionHeaderCtaStyle === 'solid' && (
                                    <span className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-lg shadow-sm transition-colors duration-200">
                                        {sectionHeaderCtaText || 'Voir Tout'}
                                    </span>
                                )}
                                {sectionHeaderCtaStyle === 'outline' && (
                                    <span className="px-5 py-2 border-2 border-blue-600 text-blue-600 hover:bg-blue-50 font-bold text-sm rounded-lg transition-colors duration-200">
                                        {sectionHeaderCtaText || 'Voir Tout'}
                                    </span>
                                )}
                                {sectionHeaderCtaStyle === 'link' && (
                                    <span className="inline-flex items-center gap-1.5 text-blue-600 font-bold text-sm hover:underline">
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
                    @media (min-width: 640px) {
                        .${gridColsClass} { --grid-cols: ${autoTablet}; }
                    }
                    @media (min-width: 1024px) {
                        .${gridColsClass} { --grid-cols: ${columnsDesktop}; }
                    }
                    .scrollbar-hide::-webkit-scrollbar {
                        display: none;
                    }
                    .scrollbar-hide {
                        -ms-overflow-style: none;
                        scrollbar-width: none;
                    }
                `}} />

                {itemsToRender.length > 0 ? (
                    <div 
                        ref={scrollContainerRef}
                        onMouseEnter={() => setIsHovered(true)}
                        onMouseLeave={() => setIsHovered(false)}
                        className={`${gridColsClass} ${isCarousel ? 'flex overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-4' : ''} transition-opacity duration-300`}
                        style={{
                            display: isCarousel ? 'flex' : 'grid',
                            gap: `${gapY}px ${gapX}px`,
                            gridTemplateColumns: isCarousel ? undefined : `repeat(var(--grid-cols, ${autoMobile}), minmax(0, 1fr))`,
                            gridAutoRows: isCarousel ? undefined : 'minmax(min-content, max-content)',
                            justifyItems: isCarousel ? undefined : getAlignment()
                        }}
                    >
                        {itemsToRender.map((itemProps: any, index: number) => (
                            <div 
                                key={index} 
                                className={isCarousel ? 'flex-shrink-0 snap-start h-full' : 'w-full h-full'} 
                                style={{ 
                                    width: isCarousel ? `calc(100% / var(--grid-cols, ${autoMobile}) - ${gapX * (columnsDesktop - 1) / columnsDesktop}px)` : '100%',
                                    gridColumn: !isCarousel && itemProps.cardColSpan ? `span ${Math.min(itemProps.cardColSpan, columnsDesktop)}` : undefined,
                                    gridRow: !isCarousel && itemProps.cardRowSpan ? `span ${itemProps.cardRowSpan}` : undefined,
                                }}
                            >
                                <GridItemRenderer 
                                    props={itemProps} 
                                    contentLayout={contentLayout}
                                />
                            </div>
                        ))}
                    </div>
                ) : null}
            </div>
        </section>
    );
};
