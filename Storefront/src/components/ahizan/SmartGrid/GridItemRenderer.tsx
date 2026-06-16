import React from 'react';
import Link from 'next/link';

interface GridItemRendererProps {
    props: any;
    contentLayout: 'image-above-text' | 'image-below-text' | 'image-left-text-right' | 'text-left-image-right';
}

export const GridItemRenderer = ({ props, contentLayout }: GridItemRendererProps) => {
    // Destructure all the properties
    const {
        bgColor = 'transparent',
        hoverBgColor = 'transparent',
        borderWidth = 0,
        borderColor = 'transparent',
        imageUrl = '',
        imageShape = 'square',
        imageWidth = '100%',
        imageHeight = 'auto',
        overlayEnabled = false,
        overlayColor = '#000000',
        overlayOpacity = 0.5,
        titleText = '',
        titleFontSize = '16px',
        titleFontWeight = 'bold',
        titleColor = '#0f172a',
        titleAlign = 'center',
        descText = '',
        descFontSize = '14px',
        descFontWeight = 'normal',
        descColor = '#64748b',
        descAlign = 'center',
        itemAlignment = 'center',
        linkUrl = '',
        linkNewTab = false,
        animEntrance = 'none',
        animHover = 'none',
    } = props;

    const getBorderRadius = () => {
        switch (imageShape) {
            case 'circle': return '50%';
            case 'square': return '0px';
            case 'rounded-square': return '16px';
            case 'rectangle': return '0px';
            case 'rounded-rectangle': return '16px';
            default: return '0px';
        }
    };

    const isRect = imageShape === 'rectangle' || imageShape === 'rounded-rectangle';

    // Animation Classes
    let hoverClass = 'transition-all duration-300 group'; // base transition
    if (animHover === 'scale') hoverClass += ' hover:scale-105';
    if (animHover === 'lift') hoverClass += ' hover:-translate-y-2 hover:shadow-xl';
    if (animHover === 'glow') hoverClass += ' hover:shadow-[0_0_20px_rgba(59,130,246,0.5)]';

    let entranceClass = '';
    if (animEntrance === 'fade-in') entranceClass = 'animate-fade-in';
    if (animEntrance === 'fade-up') entranceClass = 'animate-fade-up';
    if (animEntrance === 'zoom-in') entranceClass = 'animate-zoom-in';

    const Wrapper = linkUrl ? Link : 'div';
    const wrapperProps: any = linkUrl ? { href: linkUrl, target: linkNewTab ? '_blank' : '_self' } : {};

    // Dynamic class for hover bg using CSS variables or Tailwind arbitrary variants
    // Using inline style for base properties and group-hover for the hover background
    const uniqueId = `grid-item-${React.useId().replace(/:/g, '')}`;

    const isRowLayout = contentLayout === 'image-left-text-right' || contentLayout === 'text-left-image-right';

    const imageElement = (
        <div 
            className={`relative flex items-center justify-center overflow-hidden shrink-0 ${isRowLayout ? 'max-w-[50%]' : 'max-w-full'}`}
            style={{
                width: imageWidth,
                height: imageHeight,
                aspectRatio: isRect ? '16/9' : '1/1',
                borderRadius: getBorderRadius(),
                backgroundColor: imageUrl ? 'transparent' : '#f1f5f9',
            }}
        >
            {imageUrl ? (
                <img 
                    src={imageUrl} 
                    alt={titleText} 
                    className={`w-full h-full object-cover transition-transform duration-500 ${animHover === 'scale' ? 'group-hover:scale-110' : ''}`}
                    loading="lazy"
                />
            ) : null}

            {overlayEnabled && (
                <div 
                    className="absolute inset-0 pointer-events-none transition-opacity duration-300"
                    style={{
                        backgroundColor: overlayColor,
                        opacity: overlayOpacity,
                    }} 
                />
            )}
        </div>
    );

    const textElement = (titleText || descText) && (
        <div className={isRowLayout ? "flex-1 min-w-0" : "w-full"} style={{ textAlign: itemAlignment as any }}>
            {titleText && (
                <div style={{
                    color: titleColor,
                    fontSize: titleFontSize,
                    fontWeight: titleFontWeight,
                    textAlign: titleAlign as any,
                    marginBottom: '4px'
                }}>
                    {titleText}
                </div>
            )}
            {descText && (
                <div style={{
                    color: descColor,
                    fontSize: descFontSize,
                    fontWeight: descFontWeight,
                    textAlign: descAlign as any
                }}>
                    {descText}
                </div>
            )}
        </div>
    );

    const isReverse = contentLayout === 'image-below-text' || contentLayout === 'text-left-image-right';

    return (
        <Wrapper 
            {...wrapperProps}
            className={`flex ${isRowLayout ? 'flex-row' : 'flex-col'} ${isReverse ? (isRowLayout ? 'flex-row-reverse' : 'flex-col-reverse') : ''} relative w-full h-full box-border ${hoverClass} ${entranceClass} ${uniqueId}`}
            style={{
                alignItems: itemAlignment === 'left' ? 'flex-start' : itemAlignment === 'right' ? 'flex-end' : 'center',
                gap: '12px',
                padding: '16px',
                border: `${borderWidth}px solid ${borderColor}`,
                backgroundColor: bgColor,
                // Fallback for styling
            }}
        >
            {/* Inject a tiny style block to handle the dynamic hover background color properly */}
            <style dangerouslySetInnerHTML={{__html: `
                .${uniqueId}:hover {
                    background-color: ${hoverBgColor} !important;
                }
            `}} />

            {imageElement}
            {textElement}
        </Wrapper>
    );
};
