import React from 'react';
import Link from 'next/link';

interface GridItemRendererProps {
    props: any;
    contentLayout?: string;
}

export const GridItemRenderer = ({ props, contentLayout }: GridItemRendererProps) => {
    const {
        bgColor,
        hoverBgColor,
        borderWidth = 0,
        borderColor = 'transparent',
        imageUrl = '',
        imageShape = 'circle',
        globalImageBorderRadius = '',
        imageWidth,
        imageHeight,
        globalImageWidth,
        globalImageHeight,
        imageFitMode,
        globalImageFitMode = 'fit',
        imageFit,
        globalImageFit = 'contain',
        shapeBgColor = '#e0e7ff',
        shapeBgImage = '',
        overlayEnabled = false,
        overlayColor = '#000000',
        overlayOpacity = 0.5,
        titleText = '',
        titleFontSize,
        globalItemTitleSize = '16px',
        titleFontWeight,
        globalItemTitleWeight = 'bold',
        titleColor,
        globalItemTitleColor = '#0f172a',
        titleAlign = 'center',
        descText = '',
        descFontSize,
        globalItemDescSize = '14px',
        descFontWeight,
        globalItemDescWeight = 'normal',
        descColor,
        globalItemDescColor = '#64748b',
        descAlign = 'center',
        priceText = '',
        oldPriceText = '',
        priceColor = '#ef4444',
        oldPriceColor = '#94a3b8',
        priceFontSize = '16px',
        itemAlignment = 'center',
        linkUrl = '',
        linkNewTab = false,
        animEntrance = 'none',
        animHover = 'none',
        imagePosX,
        imagePosY,
        globalImagePosX = 0,
        globalImagePosY = 0,
        imageSize = 100,
        cardColSpan,
        cardRowSpan,
        cardMinHeight,
        cardContentLayout,
        promoCardEnabled = false,
        promoCardText = 'PROMO',
        promoCardPosition = 'top-left',
        promoCardBgColor = '#ef4444',
        promoCardTextColor = '#ffffff',
        promoCardStyle = 'solid',
        insideTextPosition,
        globalInsideTextPosition = 'center',
        titleTransform,
        globalItemTitleTransform = 'none',
        descLines,
        globalItemDescLines = 2,
        globalTextPadding = 16,
        globalTextGap = 6,
        showCta,
        globalShowCta = false,
        ctaText,
        globalCtaText = 'Découvrir',
        ctaUrl,
        ctaStyle,
        globalCtaStyle = 'solid',
        globalCardBorderWidth = 0,
        globalCardBorderColor = 'transparent',
        globalCardBorderRadius = '12px',
        globalCardBgColor = 'transparent',
        globalCardHoverBgColor = 'transparent',
    } = props;

    // Computed effective variables
    const activeLayout = cardContentLayout || contentLayout || 'image-above-text';
    const isShapeLayout = activeLayout === 'image-on-shape';
    const isOverlayLayout = activeLayout === 'image-overlay';
    const isRowLayout = activeLayout === 'image-left-text-right' || activeLayout === 'text-left-image-right';
    const isReverse = activeLayout === 'image-below-text' || activeLayout === 'text-left-image-right';

    const activeFitMode = imageFitMode || globalImageFitMode || 'fit';
    const activeFit = imageFit || globalImageFit || 'contain';

    const effectiveBorderWidth = borderWidth !== undefined && borderWidth !== 0 ? borderWidth : globalCardBorderWidth;
    const effectiveBorderColor = borderColor && borderColor !== 'transparent' ? borderColor : globalCardBorderColor;
    const effectiveBorderRadius = globalCardBorderRadius || '12px';
    const effectiveBgColor = bgColor && bgColor !== 'transparent' ? bgColor : globalCardBgColor;
    const effectiveHoverBgColor = hoverBgColor && hoverBgColor !== 'transparent' ? hoverBgColor : globalCardHoverBgColor;

    const activeTitleColor = titleColor && titleColor !== 'var(--builder-text-main)' && titleColor !== '#0f172a' ? titleColor : globalItemTitleColor;
    const activeTitleSize = titleFontSize || globalItemTitleSize || '16px';
    const activeTitleWeight = titleFontWeight || globalItemTitleWeight || 'bold';

    const activeDescColor = descColor && descColor !== 'var(--builder-text-muted)' && descColor !== '#64748b' ? descColor : globalItemDescColor;
    const activeDescSize = descFontSize || globalItemDescSize || '14px';
    const activeDescWeight = descFontWeight || globalItemDescWeight || 'normal';

    const effectivePosX = imagePosX !== undefined ? imagePosX : (globalImagePosX !== undefined ? globalImagePosX : (isShapeLayout ? -10 : 0));
    const effectivePosY = imagePosY !== undefined ? imagePosY : (globalImagePosY !== undefined ? globalImagePosY : (isShapeLayout ? -10 : 0));

    const activeTitleTransform = titleTransform || globalItemTitleTransform || 'none';
    const activeDescLines = descLines !== undefined ? descLines : (globalItemDescLines !== undefined ? globalItemDescLines : 2);
    const activeTextPadding = globalTextPadding !== undefined ? `${globalTextPadding}px` : '16px';
    const activeTextGap = globalTextGap !== undefined ? `${globalTextGap}px` : '6px';

    const activeShowCta = showCta !== undefined ? showCta : globalShowCta;
    const activeCtaText = ctaText || globalCtaText || 'Découvrir';
    const activeCtaStyle = ctaStyle || globalCtaStyle || 'solid';

    const getBorderRadius = () => {
        if (globalImageBorderRadius) return globalImageBorderRadius;
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

    // Unique class for hover
    const uniqueId = `grid-item-${Math.random().toString(36).substring(2, 9)}`;

    // Animation Classes
    let hoverClass = 'transition-all duration-300 group';
    if (animHover === 'scale') hoverClass += ' hover:scale-105';
    if (animHover === 'lift') hoverClass += ' hover:-translate-y-2 hover:shadow-xl';
    if (animHover === 'glow') hoverClass += ' hover:shadow-[0_0_20px_rgba(59,130,246,0.5)]';

    let entranceClass = '';
    if (animEntrance === 'fade-in') entranceClass = 'animate-fade-in';
    if (animEntrance === 'fade-up') entranceClass = 'animate-fade-up';
    if (animEntrance === 'zoom-in') entranceClass = 'animate-zoom-in';

    const Wrapper = linkUrl ? Link : 'div';
    const wrapperProps = linkUrl ? { href: linkUrl, target: linkNewTab ? '_blank' : '_self' } : {};

    const effectiveInsidePos = insideTextPosition || globalInsideTextPosition || 'center';

    const getOverlayFlexAlignment = () => {
        switch (effectiveInsidePos) {
            case 'top-left': return { justifyContent: 'flex-start', alignItems: 'flex-start' };
            case 'top-center': return { justifyContent: 'flex-start', alignItems: 'center' };
            case 'top-right': return { justifyContent: 'flex-start', alignItems: 'flex-end' };
            case 'middle-left': return { justifyContent: 'center', alignItems: 'flex-start' };
            case 'middle-right': return { justifyContent: 'center', alignItems: 'flex-end' };
            case 'bottom-left': return { justifyContent: 'flex-end', alignItems: 'flex-start' };
            case 'bottom-center': return { justifyContent: 'flex-end', alignItems: 'center' };
            case 'bottom-right': return { justifyContent: 'flex-end', alignItems: 'flex-end' };
            case 'center':
            default: return { justifyContent: 'center', alignItems: 'center' };
        }
    };

    const getOverlayTextAlign = () => {
        if (effectiveInsidePos.endsWith('left')) return 'left';
        if (effectiveInsidePos.endsWith('right')) return 'right';
        return 'center';
    };

    const overlayFlex = isOverlayLayout ? getOverlayFlexAlignment() : { justifyContent: undefined, alignItems: undefined };
    const overlayTextAlign = isOverlayLayout ? getOverlayTextAlign() : itemAlignment;

    const boxWidth = imageWidth ? imageWidth : (globalImageWidth || '100%');
    const boxHeight = imageHeight ? imageHeight : (globalImageHeight || 'auto');
    const currentScale = (imageSize !== undefined ? imageSize : 100) / 100;

    const imgStyle: React.CSSProperties = {
        width: imageWidth ? '100%' : (activeFitMode === 'manual' ? 'auto' : '100%'),
        height: imageHeight ? '100%' : (activeFitMode === 'manual' ? 'auto' : '100%'),
        maxWidth: 'none',
        maxHeight: 'none',
        zIndex: 2,
        objectFit: (activeFit || 'contain') as any,
        objectPosition: `${50 + effectivePosX}% ${50 + effectivePosY}%`,
        transform: `scale(${currentScale})`,
        transformOrigin: 'center center',
        transition: 'transform 0.2s ease, width 0.2s ease, height 0.2s ease',
    };

    if (isShapeLayout) {
        imgStyle.position = 'absolute';
        imgStyle.top = `${effectivePosY}%`;
        imgStyle.left = `${effectivePosX}%`;
        imgStyle.objectFit = 'contain';
    }

    const imageElement = isOverlayLayout ? (
        <div className="absolute inset-0 w-full h-full z-0 overflow-hidden" style={{ backgroundColor: imageUrl ? 'transparent' : '#f1f5f9' }}>
            {imageUrl ? (
                <img 
                    src={imageUrl} 
                    alt={titleText} 
                    className="w-full h-full transition-transform duration-500 group-hover:scale-105"
                    style={{ 
                        objectFit: activeFitMode === 'fit' ? activeFit : 'cover',
                        objectPosition: `${50 + effectivePosX}% ${50 + effectivePosY}%`
                    }}
                    loading="lazy"
                />
            ) : null}

            {(overlayEnabled || isOverlayLayout) && (
                <div 
                    className="absolute inset-0 pointer-events-none transition-opacity duration-300"
                    style={{
                        backgroundColor: overlayEnabled ? overlayColor : '#000000',
                        opacity: overlayEnabled ? overlayOpacity : 0.4,
                        zIndex: isOverlayLayout ? 1 : undefined,
                    }} 
                />
            )}
        </div>
    ) : (
        <div 
            className="relative flex items-center justify-center flex-shrink-0"
            style={{
                width: isShapeLayout ? (globalImageWidth || '120px') : boxWidth,
                maxWidth: isRowLayout ? '50%' : '100%',
                height: isShapeLayout ? (globalImageHeight || '120px') : boxHeight,
                aspectRatio: (isOverlayLayout || isShapeLayout) ? undefined : (imageHeight ? undefined : (isRect ? '16/9' : '1/1')),
                borderRadius: isShapeLayout ? undefined : getBorderRadius(),
                overflow: 'visible',
                backgroundColor: (imageUrl || isShapeLayout) ? 'transparent' : '#f1f5f9',
            }}
        >
            {isShapeLayout ? (
                <>
                    <div 
                        className="w-full h-full shadow-inner transition-transform duration-300 group-hover:scale-105"
                        style={{
                            aspectRatio: isRect ? '16/9' : '1/1',
                            borderRadius: getBorderRadius(),
                            backgroundColor: shapeBgColor || '#e0e7ff',
                            backgroundImage: shapeBgImage ? `url(${shapeBgImage})` : undefined,
                            backgroundPosition: 'center',
                            backgroundSize: 'cover',
                            backgroundRepeat: 'no-repeat',
                        }} 
                    />
                    {imageUrl && (
                        <img 
                            src={imageUrl} 
                            alt={titleText} 
                            style={imgStyle}
                            loading="lazy"
                        />
                    )}
                </>
            ) : (
                <>
                    {imageUrl ? (
                        <img 
                            src={imageUrl} 
                            alt={titleText} 
                            style={imgStyle}
                            loading="lazy"
                        />
                    ) : null}

                    {(overlayEnabled || isOverlayLayout) && (
                        <div 
                            className="absolute inset-0 pointer-events-none transition-opacity duration-300"
                            style={{
                                backgroundColor: overlayEnabled ? overlayColor : '#000000',
                                opacity: overlayEnabled ? overlayOpacity : 0.4,
                                zIndex: isOverlayLayout ? 1 : undefined,
                            }} 
                        />
                    )}
                </>
            )}
        </div>
    );

    const ctaButtonElement = activeShowCta && (
        <div style={{ marginTop: activeTextGap }}>
            {activeCtaStyle === 'solid' && (
                <span className="inline-block px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-md shadow-sm transition-colors duration-200">
                    {activeCtaText}
                </span>
            )}
            {activeCtaStyle === 'outline' && (
                <span className={`inline-block px-3.5 py-1.5 border-1.5 border-current font-bold text-xs rounded-md transition-colors duration-200 ${isOverlayLayout ? 'text-white border-white' : 'text-blue-600 border-blue-600'}`}>
                    {activeCtaText}
                </span>
            )}
            {activeCtaStyle === 'link' && (
                <span className={`inline-flex items-center gap-1 font-bold text-xs transition-colors duration-200 ${isOverlayLayout ? 'text-white' : 'text-blue-600'}`}>
                    {activeCtaText} ➔
                </span>
            )}
        </div>
    );

    const priceBlockElement = (priceText || oldPriceText) && (
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
            {oldPriceText && (
                <span style={{ 
                    textDecoration: 'line-through', 
                    color: oldPriceColor || '#94a3b8', 
                    fontSize: '12px' 
                }}>
                    {oldPriceText}
                </span>
            )}
            {priceText && (
                <span style={{ 
                    color: priceColor || '#ef4444', 
                    fontSize: priceFontSize || '16px', 
                    fontWeight: 'bold' 
                }}>
                    {priceText}
                </span>
            )}
        </div>
    );

    const textElement = (titleText || descText || priceText || activeShowCta) && (
        <div 
            className={isOverlayLayout ? "relative z-10 flex flex-col" : (isRowLayout ? "flex-1 min-w-0 flex flex-col" : "w-full flex flex-col")} 
            style={{ 
                textAlign: overlayTextAlign as any,
                maxWidth: isOverlayLayout ? '100%' : undefined,
                gap: activeTextGap,
            }}
        >
            {titleText && (
                <div style={{
                    color: isOverlayLayout && (activeTitleColor === 'var(--builder-text-main)' || activeTitleColor === '#0f172a') ? '#ffffff' : activeTitleColor,
                    fontSize: activeTitleSize,
                    fontWeight: activeTitleWeight,
                    textAlign: overlayTextAlign as any,
                    textTransform: activeTitleTransform as any,
                }}>
                    {titleText}
                </div>
            )}
            {descText && (
                <div style={{
                    color: isOverlayLayout && (activeDescColor === 'var(--builder-text-muted)' || activeDescColor === '#64748b') ? '#cbd5e1' : activeDescColor,
                    fontSize: activeDescSize,
                    fontWeight: activeDescWeight,
                    textAlign: overlayTextAlign as any,
                    display: activeDescLines > 0 ? '-webkit-box' : 'block',
                    WebkitLineClamp: activeDescLines > 0 ? activeDescLines : undefined,
                    WebkitBoxOrient: activeDescLines > 0 ? 'vertical' : undefined,
                    overflow: activeDescLines > 0 ? 'hidden' : 'visible'
                }}>
                    {descText}
                </div>
            )}
            {priceBlockElement}
            {ctaButtonElement}
        </div>
    );

    const promoPos = promoCardPosition || 'top-left';
    const isBottom = promoPos.includes('bottom');
    const isRight = promoPos.includes('right');
    const isCenterHoriz = promoPos.includes('center');

    const promoStyle = promoCardStyle || 'solid';

    const getBadgeStyle = (): React.CSSProperties => {
        const baseStyle: React.CSSProperties = {
            top: isBottom ? undefined : '10px',
            bottom: isBottom ? '10px' : undefined,
            left: isCenterHoriz ? '50%' : (isRight ? undefined : '10px'),
            right: isCenterHoriz ? undefined : (isRight ? '10px' : undefined),
            transform: isCenterHoriz ? 'translateX(-50%)' : undefined,
            fontSize: '11px',
            lineHeight: '1',
            padding: promoStyle === 'pill' ? '5px 14px' : '4px 10px',
            borderRadius: promoStyle === 'pill' ? '9999px' : '6px',
        };

        if (promoStyle === 'glass') {
            baseStyle.backgroundColor = 'rgba(255, 255, 255, 0.75)';
            baseStyle.color = '#0f172a';
            baseStyle.border = '1px solid rgba(255, 255, 255, 0.4)';
            baseStyle.backdropFilter = 'blur(8px)';
        } else if (promoStyle === 'outline') {
            baseStyle.backgroundColor = 'transparent';
            baseStyle.color = promoCardBgColor || '#ef4444';
            baseStyle.border = `2px solid ${promoCardBgColor || '#ef4444'}`;
        } else {
            baseStyle.backgroundColor = promoCardBgColor || '#ef4444';
            baseStyle.color = promoCardTextColor || '#ffffff';
        }

        return baseStyle;
    };

    const promoBadge = promoCardEnabled && (
        <div 
            className="absolute font-bold text-xs uppercase tracking-wider shadow-md pointer-events-none z-20"
            style={getBadgeStyle()}
        >
            {promoCardText || 'PROMO'}
        </div>
    );

    const containerContent = (
        <>
            {effectiveHoverBgColor && (
                <style dangerouslySetInnerHTML={{__html: `
                    .${uniqueId}:hover {
                        background-color: ${effectiveHoverBgColor} !important;
                    }
                `}} />
            )}

            {promoBadge}
            {imageElement}
            {textElement}
        </>
    );

    const containerStyle: React.CSSProperties = {
        alignItems: isOverlayLayout ? overlayFlex.alignItems as any : (itemAlignment === 'left' ? 'flex-start' : itemAlignment === 'right' ? 'flex-end' : 'center'),
        justifyContent: isOverlayLayout ? overlayFlex.justifyContent as any : undefined,
        gap: isOverlayLayout ? '0px' : '12px',
        padding: isOverlayLayout ? '24px' : activeTextPadding,
        border: `${effectiveBorderWidth}px solid ${effectiveBorderColor}`,
        borderRadius: effectiveBorderRadius,
        backgroundColor: effectiveBgColor,
        overflow: 'visible',
        minHeight: cardMinHeight || (isOverlayLayout ? '180px' : undefined),
    };

    const containerClass = `flex ${isOverlayLayout ? 'flex-col' : (isRowLayout ? 'flex-row' : 'flex-col')} ${isReverse ? (isRowLayout ? 'flex-row-reverse' : 'flex-col-reverse') : ''} relative w-full h-full box-border ${hoverClass} ${entranceClass} ${uniqueId}`;

    if (linkUrl) {
        return (
            <Link
                href={linkUrl}
                target={linkNewTab ? '_blank' : '_self'}
                className={containerClass}
                style={containerStyle}
            >
                {containerContent}
            </Link>
        );
    }

    return (
        <div
            className={containerClass}
            style={containerStyle}
        >
            {containerContent}
        </div>
    );
};
