import React, { useRef } from 'react';
import { GridItemRenderer } from './GridItemRenderer';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface SmartVisualGridSectionProps {
    config: any;
    siteCategories: any[];
}

export const SmartVisualGridSection = ({ config, siteCategories }: SmartVisualGridSectionProps) => {
    // Determine the JSON state. It might be directly passed or needs parsing.
    let craftState: any = null;
    
    try {
        if (typeof config === 'string') {
            craftState = JSON.parse(config);
        } else if (config.ROOT) {
            craftState = config;
        } else if (typeof config.dataJson === 'string') {
            craftState = JSON.parse(config.dataJson);
        }
    } catch (e) {
        console.error("Failed to parse SmartVisualGrid config", e);
        return null;
    }

    if (!craftState || !craftState.ROOT) {
        return null; // Empty or invalid configuration
    }

    const rootNode = craftState.ROOT;
    const rootProps = rootNode.props || {};

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

    // Determine grid classes dynamically via inline style + responsive variables,
    // or standard tailwind classes where possible.
    const gridColsClass = `grid`;

    const getAlignment = () => {
        if (gridAlignment === 'left') return 'start';
        if (gridAlignment === 'right') return 'end';
        return 'center';
    };

    // Extract items to render natively from the CMS (WYSIWYG)
    const childNodeIds = rootNode.nodes || [];
    const itemsToRender = childNodeIds.map((id: string) => {
        const itemProps = craftState[id]?.props || {};
        return {
            ...itemProps,
            // Forcer les attributs globaux sur le composant final
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

    if (itemsToRender.length === 0) return null;

    // Animation classes for the section
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

                {isCarousel && carouselArrows !== 'none' && itemsToRender.length > 0 && (
                    <>
                        <button 
                            onClick={() => scroll('left')}
                            className={`absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 hidden md:flex items-center justify-center transition-all ${
                                carouselArrows === 'circle' ? 'w-10 h-10 rounded-full bg-white shadow-md text-gray-800 hover:scale-110' :
                                carouselArrows === 'square' ? 'w-10 h-10 rounded-md bg-white shadow-md text-gray-800 hover:scale-110' :
                                'text-gray-600 hover:text-black'
                            }`}
                        >
                            <ChevronLeft size={24} />
                        </button>
                        <button 
                            onClick={() => scroll('right')}
                            className={`absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 hidden md:flex items-center justify-center transition-all ${
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

                <div 
                    ref={scrollContainerRef}
                    className={`${gridColsClass} ${isCarousel ? 'flex overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-4' : ''}`}
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
            </div>
        </section>
    );
};
