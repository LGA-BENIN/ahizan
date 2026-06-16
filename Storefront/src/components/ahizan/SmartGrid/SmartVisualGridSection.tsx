import React, { useRef, useState } from 'react';
import { GridItemRenderer } from './GridItemRenderer';
import { ChevronLeft, ChevronRight } from 'lucide-react';

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
        } else if (config.ROOT || config.isGrouped) {
            parsedConfig = config;
        } else if (typeof config.dataJson === 'string') {
            parsedConfig = JSON.parse(config.dataJson);
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

    if (isGrouped) {
        const activeTab = parsedConfig.tabs?.find((t: any) => t.id === activeTabId) || parsedConfig.tabs?.[0];
        if (activeTab && activeTab.craftState) {
            try {
                craftState = typeof activeTab.craftState === 'string' ? JSON.parse(activeTab.craftState) : activeTab.craftState;
            } catch(e) {
                console.error("Failed to parse tab craft state");
            }
        }
    } else {
        craftState = parsedConfig;
    }

    const rootNode = craftState?.ROOT;
    const rootProps = rootNode?.props || {};

    const {
        columnsDesktop = 4,
        columnsTablet = 2,
        columnsMobile = 1,
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
        scrollMode = 'grid',
        carouselArrows = 'circle',
        globalShape = 'circle',
        globalImageWidth = '120px',
        globalImageHeight = '120px',
        globalAnimEntrance = 'none',
        globalAnimHover = 'scale',
        
        globalItemAlignment = 'center',
        globalItemTitleSize = '16px',
        globalItemTitleWeight = 'bold',
        globalItemDescSize = '14px',
        globalItemDescWeight = 'normal',
    } = rootProps;

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
            imageWidth: globalImageWidth,
            imageHeight: globalImageHeight,
            animEntrance: globalAnimEntrance,
            animHover: globalAnimHover,
            itemAlignment: globalItemAlignment,
            titleFontSize: globalItemTitleSize,
            titleFontWeight: globalItemTitleWeight,
            titleAlign: globalItemAlignment,
            descFontSize: globalItemDescSize,
            descFontWeight: globalItemDescWeight,
            descAlign: globalItemAlignment,
        };
    }).filter(Boolean);

    let sectionAnimClass = '';
    if (sectionAnimation === 'fade-in') sectionAnimClass = 'animate-fade-in';
    else if (sectionAnimation === 'fade-up') sectionAnimClass = 'animate-fade-up';
    else if (sectionAnimation === 'zoom-in') sectionAnimClass = 'animate-zoom-in';

    const isCarousel = scrollMode === 'carousel';

    return (
        <section 
            className={`w-full overflow-hidden ${sectionAnimClass}`}
            style={{
                background: bgStyle,
                paddingTop: `${paddingTop}px`,
                paddingBottom: `${paddingBottom}px`,
                paddingLeft: `${paddingLeft}px`,
                paddingRight: `${paddingRight}px`,
            }}
        >
            <div className="max-w-[1440px] mx-auto relative group">
                
                {globalTitle && (
                    <h2 
                        className="text-center mb-6" 
                        style={{ fontSize: globalTitleSize, color: globalTitleColor, fontWeight: 'bold' }}
                    >
                        {globalTitle}
                    </h2>
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
                        .${gridColsClass} { --grid-cols: ${columnsTablet}; }
                    }
                    @media (min-width: 1024px) {
                        .${gridColsClass} { --grid-cols: ${columnsDesktop}; }
                    }
                    /* Hide scrollbar for carousel */
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
                        className={`${gridColsClass} ${isCarousel ? 'flex overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-4' : ''} transition-opacity duration-300`}
                        style={{
                            display: isCarousel ? 'flex' : 'grid',
                            gap: `${gapY}px ${gapX}px`,
                            gridTemplateColumns: isCarousel ? undefined : `repeat(var(--grid-cols, ${columnsMobile}), minmax(0, 1fr))`,
                            justifyItems: isCarousel ? undefined : getAlignment()
                        }}
                    >
                        {itemsToRender.map((itemProps: any, index: number) => (
                            <div 
                                key={index} 
                                className={isCarousel ? 'flex-shrink-0 snap-start h-full' : 'w-full h-full'} 
                                style={{ 
                                    width: isCarousel ? `calc(100% / var(--grid-cols, ${columnsMobile}) - ${gapX * (columnsDesktop - 1) / columnsDesktop}px)` : '100%' 
                                }}
                            >
                                <GridItemRenderer 
                                    props={itemProps} 
                                    contentLayout={contentLayout}
                                />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="py-12 text-center text-gray-500 font-medium">
                        Aucun élément dans cet onglet.
                    </div>
                )}
            </div>
        </section>
    );
};
