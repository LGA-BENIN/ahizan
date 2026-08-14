import React, { useContext, useState } from 'react';
import { useNode } from '@craftjs/core';
import { MediaUploadField } from '../../MediaUploadField';
import { GridGlobalContext } from './GridRoot';

export interface GridItemProps {
    bgColor: string;
    hoverBgColor: string;
    borderWidth: number;
    borderColor: string;

    imageUrl: string;
    
    overlayEnabled: boolean;
    overlayColor: string;
    overlayOpacity: number;

    titleText: string;
    titleColor: string;
    titleFontSize?: string;
    titleFontWeight?: string;

    descText: string;
    descColor: string;
    descFontSize?: string;
    descFontWeight?: string;

    // Price fields for e-commerce offer cards
    priceText?: string;
    oldPriceText?: string;
    priceColor?: string;
    oldPriceColor?: string;
    priceFontSize?: string;

    linkUrl: string;
    linkNewTab: boolean;

    imageWidth?: string;
    imageHeight?: string;
    imageFitMode?: 'fit' | 'manual' | '';
    imageFit?: 'contain' | 'cover' | 'fill' | '';
    shapeBgColor?: string;
    shapeBgImage?: string;
    imagePosX?: number;
    imagePosY?: number;
    imageSize?: number;

    // Card sizing & layout overrides
    cardColSpan?: number;
    cardRowSpan?: number;
    cardMinHeight?: string;
    cardContentLayout?: 'image-above-text' | 'image-below-text' | 'image-left-text-right' | 'text-left-image-right' | 'image-overlay' | 'image-on-shape' | '';

    // Promo Card / Badge Props
    promoCardEnabled?: boolean;
    promoCardText?: string;
    promoCardPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center' | 'bottom-center';
    promoCardBgColor?: string;
    promoCardTextColor?: string;
    promoCardStyle?: 'solid' | 'pill' | 'glass' | 'outline';

    // Inside text position override
    insideTextPosition?: 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center' | 'bottom-center' | 'middle-left' | 'middle-right';
    
    // Typography and CTA overrides
    titleTransform?: 'none' | 'uppercase' | 'capitalize' | 'lowercase';
    descLines?: number;
    showCta?: boolean;
    ctaText?: string;
    ctaUrl?: string;
    ctaStyle?: 'solid' | 'outline' | 'link';
}

export const GridItem = (props: GridItemProps) => {
    const { connectors: { connect, drag }, selected } = useNode((node) => ({
        selected: node.events.selected
    }));
    
    const [isHovered, setIsHovered] = useState(false);
    const globalContext = useContext(GridGlobalContext) || {};

    const activeShape = globalContext.globalShape || 'circle';
    const activeLayout = props.cardContentLayout || globalContext.globalContentLayout || 'image-above-text';
    const isShapeLayout = activeLayout === 'image-on-shape';
    const isOverlayLayout = activeLayout === 'image-overlay';

    const activeFitMode = props.imageFitMode || globalContext.globalImageFitMode || 'fit';
    const activeFit = props.imageFit || globalContext.globalImageFit || 'contain';

    const effectiveBorderWidth = props.borderWidth !== undefined && props.borderWidth !== 0 ? props.borderWidth : (globalContext.globalCardBorderWidth || 0);
    const effectiveBorderColor = props.borderColor && props.borderColor !== 'transparent' ? props.borderColor : (globalContext.globalCardBorderColor || 'transparent');
    const effectiveBorderRadius = globalContext.globalCardBorderRadius || '12px';
    const effectiveBgColor = props.bgColor && props.bgColor !== 'transparent' ? props.bgColor : (globalContext.globalCardBgColor || 'transparent');
    const effectiveHoverBg = props.hoverBgColor && props.hoverBgColor !== 'transparent' ? props.hoverBgColor : (globalContext.globalCardHoverBgColor || 'transparent');

    const activeAnimHover = globalContext.globalAnimHover || 'scale';
    const activeAlignment = globalContext.globalItemAlignment || 'center';

    const activeTitleSize = props.titleFontSize || globalContext.globalItemTitleSize || '16px';
    const activeTitleWeight = props.titleFontWeight || globalContext.globalItemTitleWeight || 'bold';
    const activeTitleColor = props.titleColor && props.titleColor !== 'var(--builder-text-main)' && props.titleColor !== '#0f172a' ? props.titleColor : (globalContext.globalItemTitleColor || '#0f172a');
    const activeTitleTransform = props.titleTransform || globalContext.globalItemTitleTransform || 'none';

    const activeDescSize = props.descFontSize || globalContext.globalItemDescSize || '14px';
    const activeDescWeight = props.descFontWeight || globalContext.globalItemDescWeight || 'normal';
    const activeDescColor = props.descColor && props.descColor !== 'var(--builder-text-muted)' && props.descColor !== '#64748b' ? props.descColor : (globalContext.globalItemDescColor || '#64748b');
    const activeDescLines = props.descLines !== undefined ? props.descLines : (globalContext.globalItemDescLines !== undefined ? globalContext.globalItemDescLines : 2);

    const activePadding = globalContext.globalTextPadding !== undefined ? globalContext.globalTextPadding : 16;
    const activeGap = globalContext.globalTextGap !== undefined ? globalContext.globalTextGap : 6;
    
    const isRowLayout = activeLayout === 'image-left-text-right' || activeLayout === 'text-left-image-right';
    const isReverse = activeLayout === 'image-below-text' || activeLayout === 'text-left-image-right';

    const isCarousel = globalContext.isCarousel;
    const columnsDesktop = globalContext.columnsDesktop || 4;
    const gapX = globalContext.gapX || 16;

    const effectivePosX = props.imagePosX !== undefined ? props.imagePosX : (globalContext.globalImagePosX !== undefined ? globalContext.globalImagePosX : (isShapeLayout ? -10 : 0));
    const effectivePosY = props.imagePosY !== undefined ? props.imagePosY : (globalContext.globalImagePosY !== undefined ? globalContext.globalImagePosY : (isShapeLayout ? -10 : 0));

    const getBorderRadius = () => {
        if (globalContext.globalImageBorderRadius) return globalContext.globalImageBorderRadius;
        switch (activeShape) {
            case 'circle': return '50%';
            case 'square': return '0px';
            case 'rounded-square': return '16px';
            case 'rectangle': return '0px';
            case 'rounded-rectangle': return '16px';
            default: return '0px';
        }
    };

    const isRect = activeShape === 'rectangle' || activeShape === 'rounded-rectangle';

    // Hover state simulation in CMS
    const currentBgColor = isHovered && effectiveHoverBg !== 'transparent' ? effectiveHoverBg : effectiveBgColor;
    
    let hoverTransform = 'none';
    let hoverBoxShadow = 'none';

    if (isHovered && activeAnimHover !== 'none') {
        if (activeAnimHover === 'scale') hoverTransform = 'scale(1.05)';
        if (activeAnimHover === 'lift') hoverTransform = 'translateY(-8px)';
        if (activeAnimHover === 'glow') hoverBoxShadow = '0 0 15px rgba(255,255,255,0.8)';
    }

    const effectiveInsidePos = props.insideTextPosition || globalContext.globalInsideTextPosition || 'center';

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
    const overlayTextAlign = isOverlayLayout ? getOverlayTextAlign() : activeAlignment;

    const boxWidth = props.imageWidth ? props.imageWidth : (globalContext.globalImageWidth || '100%');
    const boxHeight = props.imageHeight ? props.imageHeight : (globalContext.globalImageHeight || 'auto');
    const currentScale = (props.imageSize !== undefined ? props.imageSize : 100) / 100;

    const imgStyle: React.CSSProperties = {
        width: props.imageWidth ? '100%' : (activeFitMode === 'manual' ? 'auto' : '100%'),
        height: props.imageHeight ? '100%' : (activeFitMode === 'manual' ? 'auto' : '100%'),
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
        <div style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            width: '100%',
            height: '100%',
            backgroundColor: props.imageUrl ? 'transparent' : '#f1f5f9',
            zIndex: 0
        }}>
            {props.imageUrl ? (
                <img 
                    src={props.imageUrl} 
                    alt={props.titleText} 
                    style={{ 
                        width: '100%', 
                        height: '100%', 
                        objectFit: activeFitMode === 'fit' ? activeFit : 'cover',
                        objectPosition: `${50 + effectivePosX}% ${50 + effectivePosY}%`
                    }} 
                />
            ) : null}

            {(props.overlayEnabled || isOverlayLayout) && (
                <div style={{
                    position: 'absolute',
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: props.overlayEnabled ? props.overlayColor : '#000000',
                    opacity: props.overlayEnabled ? props.overlayOpacity : 0.4,
                    pointerEvents: 'none'
                }} />
            )}
        </div>
    ) : (
        <div style={{
            position: 'relative',
            width: isShapeLayout ? (globalContext.globalImageWidth || '120px') : boxWidth,
            maxWidth: isRowLayout ? '50%' : '100%',
            height: isShapeLayout ? (globalContext.globalImageHeight || '120px') : boxHeight,
            aspectRatio: (isOverlayLayout || isShapeLayout) ? undefined : (props.imageHeight ? undefined : (isRect ? '16/9' : '1/1')),
            borderRadius: isShapeLayout ? undefined : getBorderRadius(),
            overflow: 'visible',
            backgroundColor: (props.imageUrl || isShapeLayout) ? 'transparent' : '#f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
        }}>
            {isShapeLayout ? (
                <>
                    <div style={{
                        width: '100%',
                        height: '100%',
                        aspectRatio: isRect ? '16/9' : '1/1',
                        borderRadius: getBorderRadius(),
                        backgroundColor: props.shapeBgColor || '#e0e7ff',
                        backgroundImage: props.shapeBgImage ? `url(${props.shapeBgImage})` : undefined,
                        backgroundPosition: 'center',
                        backgroundSize: 'cover',
                        backgroundRepeat: 'no-repeat',
                    }} />
                    {props.imageUrl && (
                        <img 
                            src={props.imageUrl} 
                            alt={props.titleText} 
                            style={imgStyle} 
                        />
                    )}
                </>
            ) : (
                <>
                    {props.imageUrl ? (
                        <img 
                            src={props.imageUrl} 
                            alt={props.titleText} 
                            style={imgStyle} 
                        />
                    ) : null}

                    {props.overlayEnabled && (
                        <div style={{
                            position: 'absolute',
                            top: 0, left: 0, right: 0, bottom: 0,
                            backgroundColor: props.overlayColor,
                            opacity: props.overlayOpacity,
                            pointerEvents: 'none'
                        }} />
                    )}
                </>
            )}
        </div>
    );

    const activeShowCta = props.showCta !== undefined ? props.showCta : globalContext.globalShowCta;
    const activeCtaText = props.ctaText || globalContext.globalCtaText || 'Découvrir';
    const activeCtaStyle = props.ctaStyle || globalContext.globalCtaStyle || 'solid';

    const ctaButtonElement = activeShowCta && (
        <div style={{ marginTop: `${activeGap}px` }}>
            {activeCtaStyle === 'solid' && (
                <span style={{
                    display: 'inline-block',
                    padding: '6px 14px',
                    backgroundColor: 'var(--builder-primary, #3b82f6)',
                    color: '#ffffff',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    borderRadius: '6px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.15)'
                }}>
                    {activeCtaText}
                </span>
            )}
            {activeCtaStyle === 'outline' && (
                <span style={{
                    display: 'inline-block',
                    padding: '5px 13px',
                    border: '1.5px solid currentColor',
                    color: isOverlayLayout ? '#ffffff' : 'var(--builder-primary, #3b82f6)',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    borderRadius: '6px'
                }}>
                    {activeCtaText}
                </span>
            )}
            {activeCtaStyle === 'link' && (
                <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    color: isOverlayLayout ? '#ffffff' : 'var(--builder-primary, #3b82f6)',
                    fontSize: '13px',
                    fontWeight: 'bold'
                }}>
                    {activeCtaText} ➔
                </span>
            )}
        </div>
    );

    const priceBlockElement = (props.priceText || props.oldPriceText) && (
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
            {props.oldPriceText && (
                <span style={{ 
                    textDecoration: 'line-through', 
                    color: props.oldPriceColor || '#94a3b8', 
                    fontSize: '12px' 
                }}>
                    {props.oldPriceText}
                </span>
            )}
            {props.priceText && (
                <span style={{ 
                    color: props.priceColor || '#ef4444', 
                    fontSize: props.priceFontSize || '16px', 
                    fontWeight: 'bold' 
                }}>
                    {props.priceText}
                </span>
            )}
        </div>
    );

    const textElement = (props.titleText || props.descText || props.priceText || activeShowCta) && (
        <div style={{ 
            flex: isRowLayout ? 1 : undefined, 
            width: isRowLayout ? undefined : (isOverlayLayout ? 'auto' : '100%'), 
            maxWidth: isOverlayLayout ? '100%' : undefined,
            minWidth: 0, 
            textAlign: overlayTextAlign as any,
            position: isOverlayLayout ? 'relative' : undefined,
            zIndex: isOverlayLayout ? 2 : undefined,
            display: 'flex',
            flexDirection: 'column',
            gap: `${activeGap}px`
        }}>
            {props.titleText && (
                <div style={{
                    color: isOverlayLayout && (activeTitleColor === 'var(--builder-text-main)' || activeTitleColor === '#0f172a') ? '#ffffff' : activeTitleColor,
                    fontSize: activeTitleSize,
                    fontWeight: activeTitleWeight,
                    textAlign: overlayTextAlign as any,
                    textTransform: activeTitleTransform as any,
                    marginBottom: '0px'
                }}>
                    {props.titleText}
                </div>
            )}
            {props.descText && (
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
                    {props.descText}
                </div>
            )}
            {priceBlockElement}
            {ctaButtonElement}
        </div>
    );

    const promoPos = props.promoCardPosition || 'top-left';
    const isBottom = promoPos.includes('bottom');
    const isRight = promoPos.includes('right');
    const isCenterHoriz = promoPos.includes('center');

    const promoStyle = props.promoCardStyle || 'solid';

    const promoBadge = props.promoCardEnabled && (
        <div style={{
            position: 'absolute',
            top: isBottom ? undefined : '10px',
            bottom: isBottom ? '10px' : undefined,
            left: isCenterHoriz ? '50%' : (isRight ? undefined : '10px'),
            right: isCenterHoriz ? undefined : (isRight ? '10px' : undefined),
            transform: isCenterHoriz ? 'translateX(-50%)' : undefined,
            backgroundColor: promoStyle === 'glass' ? 'rgba(255,255,255,0.75)' : (promoStyle === 'outline' ? 'transparent' : (props.promoCardBgColor || '#ef4444')),
            color: promoStyle === 'glass' ? '#0f172a' : (promoStyle === 'outline' ? (props.promoCardBgColor || '#ef4444') : (props.promoCardTextColor || '#ffffff')),
            border: promoStyle === 'outline' ? `2px solid ${props.promoCardBgColor || '#ef4444'}` : (promoStyle === 'glass' ? '1px solid rgba(255,255,255,0.4)' : 'none'),
            backdropFilter: promoStyle === 'glass' ? 'blur(8px)' : undefined,
            fontSize: '11px',
            fontWeight: 'bold',
            padding: promoStyle === 'pill' ? '5px 14px' : '4px 10px',
            borderRadius: promoStyle === 'pill' ? '9999px' : '6px',
            boxShadow: promoStyle === 'glass' ? '0 4px 12px rgba(0,0,0,0.15)' : '0 2px 8px rgba(0,0,0,0.25)',
            zIndex: 15,
            pointerEvents: 'none',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
        }}>
            {props.promoCardText || 'PROMO'}
        </div>
    );

    return (
        <div
            ref={(ref: any) => connect(drag(ref))}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{
                position: 'relative',
                display: 'flex',
                flexDirection: isOverlayLayout ? 'column' : (isRowLayout ? (isReverse ? 'row-reverse' : 'row') : (isReverse ? 'column-reverse' : 'column')),
                alignItems: isOverlayLayout ? overlayFlex.alignItems as any : (activeAlignment === 'left' ? 'flex-start' : activeAlignment === 'right' ? 'flex-end' : 'center'),
                justifyContent: isOverlayLayout ? overlayFlex.justifyContent as any : undefined,
                gap: isOverlayLayout ? '0px' : `${activeGap}px`,
                padding: isOverlayLayout ? '24px' : `${activePadding}px`,
                backgroundColor: currentBgColor,
                border: `${effectiveBorderWidth}px solid ${effectiveBorderColor}`,
                borderRadius: effectiveBorderRadius,
                outline: selected ? '2px solid var(--builder-primary)' : 'none',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                transform: hoverTransform,
                boxShadow: hoverBoxShadow,
                boxSizing: 'border-box',
                gridColumn: !isCarousel && props.cardColSpan ? `span ${props.cardColSpan}` : undefined,
                gridRow: !isCarousel && props.cardRowSpan ? `span ${props.cardRowSpan}` : undefined,
                width: isCarousel ? `calc(100% / ${columnsDesktop} - ${gapX * (columnsDesktop - 1) / columnsDesktop}px)` : '100%',
                flexShrink: isCarousel ? 0 : 1,
                scrollSnapAlign: isCarousel ? 'start' : undefined,
                height: '100%',
                minHeight: props.cardMinHeight || (isOverlayLayout ? '180px' : 'auto'),
                overflow: isOverlayLayout ? 'hidden' : 'visible',
                zIndex: isHovered ? 10 : 1
            }}
        >
            {promoBadge}
            {imageElement}
            {textElement}
        </div>
    );
};

const ColorField = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
    <div>
        <label className="label-pro">{label}</label>
        <div className="color-row" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input type="color" className="color-swatch" value={value || '#000000'} onChange={(e) => onChange(e.target.value)} style={{ width: '32px', height: '32px', padding: '0', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer' }} />
            <input className="input-pro" value={value || ''} onChange={(e) => onChange(e.target.value)} style={{ flex: 1 }} />
        </div>
    </div>
);

const AccordionSection = ({ 
    title, 
    icon, 
    children, 
    isOpen, 
    onToggle 
}: { 
    title: string; 
    icon: string; 
    children: React.ReactNode; 
    isOpen?: boolean; 
    onToggle?: () => void; 
}) => {
    const [localOpen, setLocalOpen] = useState(false);
    const open = isOpen !== undefined ? isOpen : localOpen;
    const toggle = onToggle ? onToggle : () => setLocalOpen(!localOpen);

    return (
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '10px', overflow: 'hidden', background: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
            <button
                type="button"
                onClick={toggle}
                style={{
                    width: '100%',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: open ? '#f8fafc' : '#fff',
                    border: 'none',
                    borderBottom: open ? '1px solid #e2e8f0' : 'none',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 700,
                    color: '#0f172a',
                    textAlign: 'left'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '15px' }}>{icon}</span>
                    <span>{title}</span>
                </div>
                <span style={{ fontSize: '12px', color: '#64748b', transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>▼</span>
            </button>
            {open && (
                <div style={{ padding: '16px' }}>
                    {children}
                </div>
            )}
        </div>
    );
};

export const GridItemSettings = () => {
    const { setProp, props } = useNode((node) => ({
        props: node.data.props as GridItemProps
    }));
    
    const globalContext = useContext(GridGlobalContext) || {};
    const activeLayout = props.cardContentLayout || globalContext.globalContentLayout || 'image-above-text';
    const isOverlayLayout = activeLayout === 'image-overlay';

    // Accordion single-open state: only 1 section open at a time
    const [openSectionId, setOpenSectionId] = useState<string>('card-size');

    const toggleSection = (sectionId: string) => {
        setOpenSectionId(prev => prev === sectionId ? '' : sectionId);
    };

    return (
        <div style={{ padding: '16px', maxHeight: '100%', overflowY: 'auto' }}>
            
            {/* 1. TAILLE SPECIFIQUE DE LA CARTE */}
            <AccordionSection 
                title="Taille & Span de la Carte (Lignes / Colonnes)" 
                icon="📏" 
                isOpen={openSectionId === 'card-size'}
                onToggle={() => toggleSection('card-size')}
            >
                <div className="grid-2" style={{ marginBottom: '12px' }}>
                    <div>
                        <label className="label-pro">Largeur / Colonnes (Col Span)</label>
                        <select 
                            className="input-pro" 
                            value={props.cardColSpan || ''} 
                            onChange={(e) => setProp((p: any) => p.cardColSpan = e.target.value ? parseInt(e.target.value) : undefined)}
                        >
                            <option value="">(1 colonne)</option>
                            <option value={2}>2 colonnes (Large)</option>
                            <option value={3}>3 colonnes</option>
                            <option value={4}>4 colonnes</option>
                            <option value={6}>6 colonnes (Moitié)</option>
                            <option value={12}>12 colonnes (Pleine Largeur)</option>
                        </select>
                    </div>
                    <div>
                        <label className="label-pro">Hauteur / Lignes (Row Span)</label>
                        <select 
                            className="input-pro" 
                            value={props.cardRowSpan || ''} 
                            onChange={(e) => setProp((p: any) => p.cardRowSpan = e.target.value ? parseInt(e.target.value) : undefined)}
                        >
                            <option value="">(1 ligne - Normal)</option>
                            <option value={2}>2 lignes (Double Hauteur / Image 1)</option>
                            <option value={3}>3 lignes (Triple Hauteur)</option>
                        </select>
                    </div>
                </div>

                <div style={{ marginBottom: '12px' }}>
                    <label className="label-pro">Hauteur Min Spécifique (ex: 280px)</label>
                    <input 
                        className="input-pro" 
                        type="text" 
                        placeholder="ex: 250px" 
                        value={props.cardMinHeight || ''} 
                        onChange={(e) => setProp((p: any) => p.cardMinHeight = e.target.value)} 
                    />
                </div>
            </AccordionSection>

            {/* 2. PLACEMENT TEXTE & IMAGE */}
            <AccordionSection 
                title="Position Image / Texte (Propre à cette carte)" 
                icon="🖼️"
                isOpen={openSectionId === 'card-layout'}
                onToggle={() => toggleSection('card-layout')}
            >
                <div style={{ marginBottom: '12px' }}>
                    <label className="label-pro">Placement Image / Texte</label>
                    <select
                        className="input-pro"
                        value={props.cardContentLayout || ''}
                        onChange={(e) => setProp((p: any) => p.cardContentLayout = e.target.value as any)}
                    >
                        <option value="">(Hériter de la grille globale)</option>
                        <option value="image-above-text">⬆️ Image au-dessus (Texte en-dessous)</option>
                        <option value="image-below-text">⬇️ Image en-dessous (Texte au-dessus)</option>
                        <option value="image-left-text-right">⬅️ Image à gauche (Texte à droite)</option>
                        <option value="text-left-image-right">➡️ Image à droite (Texte à gauche)</option>
                        <option value="image-overlay">🖼️ Texte DANS l'image (Superposition / Overlay)</option>
                    </select>
                </div>

                <MediaUploadField 
                    label="Image de l'élément"
                    value={props.imageUrl}
                    onChange={(url) => setProp((p: any) => p.imageUrl = url)}
                />

                <div className="grid-2" style={{ marginTop: '12px', marginBottom: '12px' }}>
                    <div>
                        <label className="label-pro">Mode Ajustement Image</label>
                        <select
                            className="input-pro"
                            value={props.imageFitMode || ''}
                            onChange={(e) => setProp((p: any) => p.imageFitMode = e.target.value as any)}
                        >
                            <option value="">(Hériter du global)</option>
                            <option value="fit">Ajuster (Box Fit)</option>
                            <option value="manual">Dimensions Manuelles</option>
                        </select>
                    </div>
                    <div>
                        <label className="label-pro">Fit (Remplissage)</label>
                        <select
                            className="input-pro"
                            value={props.imageFit || ''}
                            onChange={(e) => setProp((p: any) => p.imageFit = e.target.value as any)}
                        >
                            <option value="">(Hériter du global)</option>
                            <option value="contain">Contain (Conserver visuel)</option>
                            <option value="cover">Cover (Remplir tout)</option>
                            <option value="fill">Fill (Étirer)</option>
                        </select>
                    </div>
                </div>

                <div className="grid-2" style={{ marginBottom: '12px' }}>
                    <div>
                        <label className="label-pro">Largeur Image (ex: 150px)</label>
                        <input className="input-pro" type="text" placeholder="Défaut" value={props.imageWidth || ''} onChange={(e) => setProp((p: any) => p.imageWidth = e.target.value)} />
                    </div>
                    <div>
                        <label className="label-pro">Hauteur Image (ex: 150px)</label>
                        <input className="input-pro" type="text" placeholder="Défaut" value={props.imageHeight || ''} onChange={(e) => setProp((p: any) => p.imageHeight = e.target.value)} />
                    </div>
                </div>

                <div style={{ marginBottom: '12px' }}>
                    <label className="label-pro">Échelle Image (%) : {props.imageSize !== undefined ? props.imageSize : 100}%</label>
                    <input 
                        className="range-pro" 
                        type="range" min="10" max="500" step="5" 
                        value={props.imageSize !== undefined ? props.imageSize : 100} 
                        onChange={(e) => setProp((p: any) => p.imageSize = parseInt(e.target.value) || 100)} 
                    />
                </div>

                <div className="grid-2">
                    <div>
                        <label className="label-pro">Décalage X Image ({props.imagePosX || 0}%)</label>
                        <input className="range-pro" type="range" min="-100" max="100" step="1" value={props.imagePosX || 0} onChange={(e) => setProp((p: any) => p.imagePosX = parseInt(e.target.value) || 0)} />
                    </div>
                    <div>
                        <label className="label-pro">Décalage Y Image ({props.imagePosY || 0}%)</label>
                        <input className="range-pro" type="range" min="-100" max="100" step="1" value={props.imagePosY || 0} onChange={(e) => setProp((p: any) => p.imagePosY = parseInt(e.target.value) || 0)} />
                    </div>
                </div>
            </AccordionSection>

            {/* 3. PRIX & PRIX PROMO */}
            <AccordionSection 
                title="Prix & Tarifs Promo" 
                icon="🏷️"
                isOpen={openSectionId === 'card-price'}
                onToggle={() => toggleSection('card-price')}
            >
                <div className="grid-2" style={{ marginBottom: '12px' }}>
                    <div>
                        <label className="label-pro">Prix Vente / Promo (ex: 314,99€)</label>
                        <input className="input-pro" type="text" placeholder="314,99€" value={props.priceText || ''} onChange={(e) => setProp((p: any) => p.priceText = e.target.value)} />
                    </div>
                    <div>
                        <label className="label-pro">Prix Barré (ex: 389,90€)</label>
                        <input className="input-pro" type="text" placeholder="389,90€" value={props.oldPriceText || ''} onChange={(e) => setProp((p: any) => p.oldPriceText = e.target.value)} />
                    </div>
                </div>
                <div className="grid-2">
                    <ColorField label="Couleur Prix Promo" value={props.priceColor || '#ef4444'} onChange={(v) => setProp((p: any) => p.priceColor = v)} />
                    <ColorField label="Couleur Prix Barré" value={props.oldPriceColor || '#94a3b8'} onChange={(v) => setProp((p: any) => p.oldPriceColor = v)} />
                </div>
            </AccordionSection>

            {/* 4. CONTOUR ET APPARENCE DES CARTES */}
            <AccordionSection 
                title="Contour & Couleurs de la Carte" 
                icon="🎨"
                isOpen={openSectionId === 'card-appearance'}
                onToggle={() => toggleSection('card-appearance')}
            >
                <div className="grid-2" style={{ marginBottom: '12px' }}>
                    <ColorField label="Couleur de fond" value={props.bgColor} onChange={(v) => setProp((p: any) => p.bgColor = v)} />
                    <ColorField label="Fond au survol" value={props.hoverBgColor} onChange={(v) => setProp((p: any) => p.hoverBgColor = v)} />
                </div>
                
                <div className="grid-2" style={{ marginBottom: '12px' }}>
                    <div>
                        <label className="label-pro">Bordure (px)</label>
                        <input className="input-pro" type="number" min={0} value={props.borderWidth} onChange={(e) => setProp((p: any) => p.borderWidth = parseInt(e.target.value) || 0)} />
                    </div>
                    <ColorField label="Couleur bordure" value={props.borderColor} onChange={(v) => setProp((p: any) => p.borderColor = v)} />
                </div>

                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '10px' }}>
                    <label style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', marginBottom: '8px' }}>
                        <input type="checkbox" checked={props.overlayEnabled} onChange={(e) => setProp((p: any) => p.overlayEnabled = e.target.checked)} />
                        Voile Sombre (Overlay)
                    </label>

                    {props.overlayEnabled && (
                        <div className="grid-2">
                            <ColorField label="Couleur voile" value={props.overlayColor} onChange={(v) => setProp((p: any) => p.overlayColor = v)} />
                            <div>
                                <label className="label-pro">Opacité ({Math.round(props.overlayOpacity * 100)}%)</label>
                                <input className="range-pro" type="range" step="0.1" min="0" max="1" value={props.overlayOpacity} onChange={(e) => setProp((p: any) => p.overlayOpacity = parseFloat(e.target.value) || 0)} />
                            </div>
                        </div>
                    )}
                </div>
            </AccordionSection>

            {/* 5. TEXTES ET TYPOGRAPHIE */}
            <AccordionSection 
                title="Titre, Description & Typographie" 
                icon="📝"
                isOpen={openSectionId === 'card-text'}
                onToggle={() => toggleSection('card-text')}
            >
                {isOverlayLayout && (
                    <div style={{ marginBottom: '12px', background: '#f8fafc', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                        <label className="label-pro">📍 Position spécifique du texte dans l'image</label>
                        <select 
                            className="input-pro" 
                            value={props.insideTextPosition || ''} 
                            onChange={(e) => setProp((p: any) => p.insideTextPosition = e.target.value as any)}
                        >
                            <option value="">(Utiliser la position globale)</option>
                            <option value="center">Centre</option>
                            <option value="top-left">Haut Gauche</option>
                            <option value="top-center">Haut Centre</option>
                            <option value="top-right">Haut Droite</option>
                            <option value="middle-left">Milieu Gauche</option>
                            <option value="middle-right">Milieu Droite</option>
                            <option value="bottom-left">Bas Gauche</option>
                            <option value="bottom-center">Bas Centre</option>
                            <option value="bottom-right">Bas Droite</option>
                        </select>
                    </div>
                )}

                <div style={{ marginBottom: '12px' }}>
                    <label className="label-pro">Titre de la carte</label>
                    <input className="input-pro" type="text" placeholder="Titre principal" value={props.titleText} onChange={(e) => setProp((p: any) => p.titleText = e.target.value)} />
                </div>
                
                <div className="grid-2" style={{ marginBottom: '12px' }}>
                    <ColorField label="Couleur Titre" value={props.titleColor} onChange={(v) => setProp((p: any) => p.titleColor = v)} />
                    <div>
                        <label className="label-pro">Taille Titre (ex: 18px)</label>
                        <input className="input-pro" type="text" placeholder="Défaut" value={props.titleFontSize || ''} onChange={(e) => setProp((p: any) => p.titleFontSize = e.target.value)} />
                    </div>
                </div>

                <div className="grid-2" style={{ marginBottom: '12px' }}>
                    <div>
                        <label className="label-pro">Graisse Titre</label>
                        <select className="input-pro" value={props.titleFontWeight || ''} onChange={(e) => setProp((p: any) => p.titleFontWeight = e.target.value)}>
                            <option value="">(Défaut global)</option>
                            <option value="normal">Normal (400)</option>
                            <option value="medium">Moyen (500)</option>
                            <option value="bold">Gras (700)</option>
                            <option value="900">Black (900)</option>
                        </select>
                    </div>
                    <div>
                        <label className="label-pro">Casse Titre</label>
                        <select className="input-pro" value={props.titleTransform || ''} onChange={(e) => setProp((p: any) => p.titleTransform = e.target.value as any)}>
                            <option value="">(Défaut global)</option>
                            <option value="none">Normal</option>
                            <option value="uppercase">MAJUSCULES</option>
                            <option value="capitalize">Capitaliser</option>
                        </select>
                    </div>
                </div>

                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '10px', marginTop: '10px' }}>
                    <label className="label-pro">Description</label>
                    <textarea className="input-pro" rows={3} placeholder="Courte description..." value={props.descText} onChange={(e) => setProp((p: any) => p.descText = e.target.value)} />
                </div>

                <div className="grid-2" style={{ marginTop: '10px', marginBottom: '12px' }}>
                    <ColorField label="Couleur Description" value={props.descColor} onChange={(v) => setProp((p: any) => p.descColor = v)} />
                    <div>
                        <label className="label-pro">Taille Description</label>
                        <input className="input-pro" type="text" placeholder="Défaut" value={props.descFontSize || ''} onChange={(e) => setProp((p: any) => p.descFontSize = e.target.value)} />
                    </div>
                </div>

                <div className="grid-2">
                    <div>
                        <label className="label-pro">Graisse Description</label>
                        <select className="input-pro" value={props.descFontWeight || ''} onChange={(e) => setProp((p: any) => p.descFontWeight = e.target.value)}>
                            <option value="">(Défaut global)</option>
                            <option value="normal">Normal</option>
                            <option value="medium">Moyen</option>
                            <option value="bold">Gras</option>
                        </select>
                    </div>
                    <div>
                        <label className="label-pro">Lignes max description</label>
                        <select className="input-pro" value={props.descLines !== undefined ? props.descLines : ''} onChange={(e) => setProp((p: any) => p.descLines = e.target.value !== '' ? parseInt(e.target.value) : undefined)}>
                            <option value="">(Défaut global)</option>
                            <option value={0}>Illimité</option>
                            <option value={1}>1 Ligne</option>
                            <option value={2}>2 Lignes</option>
                            <option value={3}>3 Lignes</option>
                        </select>
                    </div>
                </div>
            </AccordionSection>

            {/* 6. PROMOTION & BADGES */}
            <AccordionSection 
                title="Carte de Promotion / Badge" 
                icon="📌"
                isOpen={openSectionId === 'card-promo'}
                onToggle={() => toggleSection('card-promo')}
            >
                <label style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', marginBottom: '10px' }}>
                    <input type="checkbox" checked={props.promoCardEnabled || false} onChange={(e) => setProp((p: any) => p.promoCardEnabled = e.target.checked)} />
                    Afficher un badge / étiquette promo
                </label>

                {props.promoCardEnabled && (
                    <>
                        <div style={{ marginBottom: '12px' }}>
                            <label className="label-pro">Texte du badge (ex: PROMO, -30%, Nouveau)</label>
                            <input className="input-pro" type="text" placeholder="PROMO" value={props.promoCardText || 'PROMO'} onChange={(e) => setProp((p: any) => p.promoCardText = e.target.value)} />
                        </div>

                        <div className="grid-2" style={{ marginBottom: '12px' }}>
                            <div>
                                <label className="label-pro">Position du Badge</label>
                                <select className="input-pro" value={props.promoCardPosition || 'top-left'} onChange={(e) => setProp((p: any) => p.promoCardPosition = e.target.value as any)}>
                                    <option value="top-left">Haut Gauche</option>
                                    <option value="top-center">Haut Centre</option>
                                    <option value="top-right">Haut Droite</option>
                                    <option value="bottom-left">Bas Gauche</option>
                                    <option value="bottom-center">Bas Centre</option>
                                    <option value="bottom-right">Bas Droite</option>
                                </select>
                            </div>
                            <div>
                                <label className="label-pro">Style Visuel</label>
                                <select className="input-pro" value={props.promoCardStyle || 'solid'} onChange={(e) => setProp((p: any) => p.promoCardStyle = e.target.value as any)}>
                                    <option value="solid">Plein (Classique)</option>
                                    <option value="pill">Pilule Arrondie</option>
                                    <option value="glass">Effet Verre (Glass)</option>
                                    <option value="outline">Contour</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid-2">
                            <ColorField label="Fond badge" value={props.promoCardBgColor || '#ef4444'} onChange={(v) => setProp((p: any) => p.promoCardBgColor = v)} />
                            <ColorField label="Texte badge" value={props.promoCardTextColor || '#ffffff'} onChange={(v) => setProp((p: any) => p.promoCardTextColor = v)} />
                        </div>
                    </>
                )}
            </AccordionSection>

            {/* 7. BOUTON ACTION CTA */}
            <AccordionSection 
                title="Bouton d'Action (CTA)" 
                icon="🔘"
                isOpen={openSectionId === 'card-cta'}
                onToggle={() => toggleSection('card-cta')}
            >
                <label style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', marginBottom: '10px' }}>
                    <input 
                        type="checkbox" 
                        checked={props.showCta !== undefined ? props.showCta : false} 
                        onChange={(e) => setProp((p: any) => p.showCta = e.target.checked)} 
                    />
                    Activer le bouton d'action sur cette carte
                </label>

                {props.showCta && (
                    <div className="grid-2">
                        <div>
                            <label className="label-pro">Texte du bouton</label>
                            <input className="input-pro" type="text" placeholder="Découvrir" value={props.ctaText || ''} onChange={(e) => setProp((p: any) => p.ctaText = e.target.value)} />
                        </div>
                        <div>
                            <label className="label-pro">Style du bouton</label>
                            <select className="input-pro" value={props.ctaStyle || 'solid'} onChange={(e) => setProp((p: any) => p.ctaStyle = e.target.value as any)}>
                                <option value="solid">Bouton Rempli</option>
                                <option value="outline">Bouton Contour</option>
                                <option value="link">Lien Texte ➔</option>
                            </select>
                        </div>
                    </div>
                )}
            </AccordionSection>

            {/* 8. LIEN CIBLE */}
            <AccordionSection 
                title="Lien Cible de la Carte" 
                icon="🔗"
                isOpen={openSectionId === 'card-link'}
                onToggle={() => toggleSection('card-link')}
            >
                <div style={{ marginBottom: '12px' }}>
                    <label className="label-pro">URL Cible</label>
                    <input className="input-pro" type="text" placeholder="/collection/..." value={props.linkUrl} onChange={(e) => setProp((p: any) => p.linkUrl = e.target.value)} />
                </div>
                <div>
                    <label style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
                        <input type="checkbox" checked={props.linkNewTab} onChange={(e) => setProp((p: any) => p.linkNewTab = e.target.checked)} />
                        Ouvrir dans un nouvel onglet
                    </label>
                </div>
            </AccordionSection>

        </div>
    );
};

GridItem.craft = {
    props: {
        bgColor: 'transparent',
        hoverBgColor: 'transparent',
        borderWidth: 0,
        borderColor: 'transparent',
        imageUrl: '',
        overlayEnabled: false,
        overlayColor: '#000000',
        overlayOpacity: 0.5,
        titleText: 'Nouveau Titre',
        titleColor: 'var(--builder-text-main)',
        titleFontSize: '',
        titleFontWeight: '',
        titleTransform: 'none',
        descText: 'Description de la carte',
        descColor: 'var(--builder-text-muted)',
        descFontSize: '',
        descFontWeight: '',
        descLines: 2,
        priceText: '',
        oldPriceText: '',
        priceColor: '#ef4444',
        oldPriceColor: '#94a3b8',
        priceFontSize: '16px',
        linkUrl: '',
        linkNewTab: false,
        imageWidth: '',
        imageHeight: '',
        imageFitMode: '',
        imageFit: '',
        shapeBgColor: '#e0e7ff',
        shapeBgImage: '',
        imagePosX: -10,
        imagePosY: -10,
        imageSize: 100,
        cardColSpan: undefined,
        cardRowSpan: undefined,
        cardMinHeight: '',
        cardContentLayout: '',
        promoCardEnabled: false,
        promoCardText: 'PROMO',
        promoCardPosition: 'top-left',
        promoCardBgColor: '#ef4444',
        promoCardTextColor: '#ffffff',
        promoCardStyle: 'solid',
        insideTextPosition: 'center',
        showCta: false,
        ctaText: 'Découvrir',
        ctaStyle: 'solid',
    },
    related: {
        settings: GridItemSettings
    }
};
