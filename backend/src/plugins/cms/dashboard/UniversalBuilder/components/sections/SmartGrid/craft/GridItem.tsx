import React, { useContext, useState, useEffect } from 'react';
import { useNode } from '@craftjs/core';
import { MediaUploadField } from '../../MediaUploadField';
import { GridGlobalContext } from './GridRoot';
import { fetchGraphQL, getAssetUrl } from '../../../../../lib/utils';

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

    const effectivePosX = props.imagePosX !== undefined ? props.imagePosX : (globalContext.globalImagePosX !== undefined ? globalContext.globalImagePosX : 0);
    const effectivePosY = props.imagePosY !== undefined ? props.imagePosY : (globalContext.globalImagePosY !== undefined ? globalContext.globalImagePosY : 0);

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
        if (activeAnimHover === 'scale') hoverTransform = 'scale(1.03)';
        if (activeAnimHover === 'lift') hoverTransform = 'translateY(-6px)';
        if (activeAnimHover === 'glow') hoverBoxShadow = '0 0 15px rgba(59,130,246,0.3)';
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

    // Interactive image transform & panning (moves smoothly for any fit mode)
    const imgStyle: React.CSSProperties = {
        width: props.imageWidth ? '100%' : (activeFitMode === 'manual' ? 'auto' : '100%'),
        height: props.imageHeight ? '100%' : (activeFitMode === 'manual' ? 'auto' : '100%'),
        maxWidth: 'none',
        maxHeight: 'none',
        zIndex: 2,
        objectFit: (activeFit || 'contain') as any,
        objectPosition: `${50 + effectivePosX}% ${50 + effectivePosY}%`,
        transform: `translate(${effectivePosX}%, ${effectivePosY}%) scale(${currentScale})`,
        transformOrigin: 'center center',
        transition: 'transform 0.15s ease, width 0.2s ease, height 0.2s ease',
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
            overflow: 'hidden',
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
                        objectPosition: `${50 + effectivePosX}% ${50 + effectivePosY}%`,
                        transform: `translate(${effectivePosX}%, ${effectivePosY}%) scale(${currentScale})`,
                        transformOrigin: 'center center',
                        transition: 'transform 0.15s ease'
                    }} 
                />
            ) : null}

            {(props.overlayEnabled || isOverlayLayout) && (
                <div style={{
                    position: 'absolute',
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: props.overlayEnabled ? props.overlayColor : '#000000',
                    opacity: props.overlayEnabled ? props.overlayOpacity : 0.4,
                    pointerEvents: 'none',
                    zIndex: 1
                }} />
            )}
        </div>
    ) : (
        <div style={{
            position: 'relative',
            width: isShapeLayout ? `min(100%, ${props.imageWidth || globalContext.globalImageWidth || '120px'})` : boxWidth,
            maxWidth: isRowLayout ? '50%' : '100%',
            height: isShapeLayout ? 'auto' : (props.imageHeight ? undefined : 'auto'),
            aspectRatio: isOverlayLayout ? undefined : (isShapeLayout ? (isRect ? '16/9' : '1/1') : (props.imageHeight ? undefined : (isRect ? '16/9' : '1/1'))),
            borderRadius: isShapeLayout ? undefined : getBorderRadius(),
            overflow: 'hidden',
            backgroundColor: (props.imageUrl || isShapeLayout) ? 'transparent' : '#f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            margin: isRowLayout ? undefined : '0 auto',
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
                            style={{
                                ...imgStyle,
                                width: '100%',
                                height: '100%',
                                top: 0,
                                left: 0,
                            }} 
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
                    backgroundColor: '#2563eb',
                    color: '#ffffff',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 700,
                }}>
                    {activeCtaText}
                </span>
            )}
            {activeCtaStyle === 'outline' && (
                <span style={{
                    display: 'inline-block',
                    padding: '5px 13px',
                    backgroundColor: 'transparent',
                    border: '1px solid #2563eb',
                    color: '#2563eb',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 700,
                }}>
                    {activeCtaText}
                </span>
            )}
            {activeCtaStyle === 'link' && (
                <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    color: '#2563eb',
                    fontSize: '12px',
                    fontWeight: 700,
                }}>
                    {activeCtaText} ➔
                </span>
            )}
        </div>
    );

    const textContentElement = (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: isOverlayLayout ? overlayFlex.justifyContent : 'center',
            alignItems: isOverlayLayout ? overlayFlex.alignItems : (activeAlignment === 'center' ? 'center' : activeAlignment === 'right' ? 'flex-end' : 'flex-start'),
            textAlign: overlayTextAlign as any,
            padding: `${activePadding}px`,
            gap: `${activeGap}px`,
            position: isOverlayLayout ? 'absolute' : 'relative',
            top: isOverlayLayout ? 0 : undefined,
            left: isOverlayLayout ? 0 : undefined,
            right: isOverlayLayout ? 0 : undefined,
            bottom: isOverlayLayout ? 0 : undefined,
            zIndex: isOverlayLayout ? 3 : 1,
            pointerEvents: isOverlayLayout ? 'none' : 'auto',
            width: '100%',
            boxSizing: 'border-box'
        }}>
            {props.titleText && (
                <div style={{
                    fontSize: activeTitleSize,
                    fontWeight: activeTitleWeight as any,
                    color: isOverlayLayout ? '#ffffff' : activeTitleColor,
                    textTransform: activeTitleTransform as any,
                    lineHeight: 1.25,
                    margin: 0,
                    textShadow: isOverlayLayout ? '0 1px 3px rgba(0,0,0,0.6)' : 'none'
                }}>
                    {props.titleText}
                </div>
            )}

            {props.descText && (
                <div style={{
                    fontSize: activeDescSize,
                    fontWeight: activeDescWeight as any,
                    color: isOverlayLayout ? '#e2e8f0' : activeDescColor,
                    lineHeight: 1.4,
                    margin: 0,
                    display: '-webkit-box',
                    WebkitLineClamp: activeDescLines > 0 ? activeDescLines : undefined,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    textShadow: isOverlayLayout ? '0 1px 2px rgba(0,0,0,0.5)' : 'none'
                }}>
                    {props.descText}
                </div>
            )}

            {/* Price section */}
            {(props.priceText || props.oldPriceText) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px', flexWrap: 'wrap' }}>
                    {props.priceText && (
                        <span style={{
                            fontSize: props.priceFontSize || '15px',
                            fontWeight: 800,
                            color: isOverlayLayout ? '#34d399' : (props.priceColor || '#059669')
                        }}>
                            {props.priceText}
                        </span>
                    )}
                    {props.oldPriceText && (
                        <span style={{
                            fontSize: '12px',
                            textDecoration: 'line-through',
                            color: isOverlayLayout ? '#94a3b8' : (props.oldPriceColor || '#94a3b8')
                        }}>
                            {props.oldPriceText}
                        </span>
                    )}
                </div>
            )}

            {ctaButtonElement}
        </div>
    );

    const getPromoBadgeStyle = () => {
        const bg = props.promoCardBgColor || '#ef4444';
        const color = props.promoCardTextColor || '#ffffff';
        const style = props.promoCardStyle || 'solid';

        const base: React.CSSProperties = {
            position: 'absolute',
            zIndex: 10,
            fontSize: '10px',
            fontWeight: 800,
            padding: '3px 8px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            pointerEvents: 'none'
        };

        switch (props.promoCardPosition) {
            case 'top-left': base.top = '10px'; base.left = '10px'; break;
            case 'top-right': base.top = '10px'; base.right = '10px'; break;
            case 'top-center': base.top = '10px'; base.left = '50%'; base.transform = 'translateX(-50%)'; break;
            case 'bottom-left': base.bottom = '10px'; base.left = '10px'; break;
            case 'bottom-right': base.bottom = '10px'; base.right = '10px'; break;
            case 'bottom-center': base.bottom = '10px'; base.left = '50%'; base.transform = 'translateX(-50%)'; break;
            default: base.top = '10px'; base.left = '10px'; break;
        }

        if (style === 'pill') {
            base.borderRadius = '999px';
            base.backgroundColor = bg;
            base.color = color;
            base.boxShadow = '0 2px 6px rgba(0,0,0,0.15)';
        } else if (style === 'glass') {
            base.borderRadius = '6px';
            base.backgroundColor = 'rgba(255, 255, 255, 0.85)';
            base.color = bg;
            base.backdropFilter = 'blur(4px)';
            base.border = `1px solid ${bg}`;
            base.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
        } else if (style === 'outline') {
            base.borderRadius = '4px';
            base.backgroundColor = '#ffffff';
            base.border = `1.5px solid ${bg}`;
            base.color = bg;
        } else {
            base.borderRadius = '4px';
            base.backgroundColor = bg;
            base.color = color;
            base.boxShadow = '0 2px 6px rgba(0,0,0,0.15)';
        }

        return base;
    };

    const promoBadgeElement = props.promoCardEnabled && (
        <div style={getPromoBadgeStyle()}>
            {props.promoCardText || 'PROMO'}
        </div>
    );

    const cardStyles: React.CSSProperties = {
        position: 'relative',
        display: 'flex',
        flexDirection: isRowLayout ? 'row' : 'column',
        alignItems: isRowLayout ? 'center' : (activeAlignment === 'center' ? 'center' : activeAlignment === 'right' ? 'flex-end' : 'flex-start'),
        justifyContent: isOverlayLayout ? 'center' : 'flex-start',
        backgroundColor: currentBgColor,
        borderWidth: `${effectiveBorderWidth}px`,
        borderStyle: effectiveBorderWidth > 0 ? 'solid' : 'none',
        borderColor: effectiveBorderColor,
        borderRadius: effectiveBorderRadius,
        minHeight: props.cardMinHeight || undefined,
        gridColumn: props.cardColSpan ? `span ${props.cardColSpan}` : undefined,
        gridRow: props.cardRowSpan ? `span ${props.cardRowSpan}` : undefined,
        width: isCarousel ? `calc((100% - ${(columnsDesktop - 1) * gapX}px) / ${columnsDesktop})` : '100%',
        flexShrink: isCarousel ? 0 : undefined,
        overflow: 'hidden',
        boxSizing: 'border-box',
        cursor: 'pointer',
        transform: hoverTransform,
        boxShadow: selected ? '0 0 0 2px #2563eb, 0 4px 12px rgba(37,99,235,0.2)' : hoverBoxShadow,
        outline: selected ? '2px solid #2563eb' : 'none',
        transition: 'all 0.2s ease',
    };

    return (
        <div 
            ref={(ref: any) => connect(drag(ref))}
            style={cardStyles}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {promoBadgeElement}

            {isReverse ? (
                <>
                    {textContentElement}
                    {imageElement}
                </>
            ) : (
                <>
                    {imageElement}
                    {textContentElement}
                </>
            )}
        </div>
    );
};

const ColorField = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
    <div>
        <label className="label-pro">{label}</label>
        <div className="color-row" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input 
                type="color" 
                className="color-swatch" 
                value={value || '#000000'} 
                onChange={(e) => onChange(e.target.value)} 
                style={{ width: '30px', height: '30px', padding: '0', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer' }} 
            />
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
    const [localOpen, setLocalOpen] = useState(true);
    const open = isOpen !== undefined ? isOpen : localOpen;
    const toggle = onToggle ? onToggle : () => setLocalOpen(!localOpen);

    return (
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '8px', overflow: 'hidden', background: '#ffffff', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
            <button
                type="button"
                onClick={toggle}
                style={{
                    width: '100%',
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: open ? '#f8fafc' : '#ffffff',
                    border: 'none',
                    borderBottom: open ? '1px solid #e2e8f0' : 'none',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#0f172a',
                    textAlign: 'left'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '14px' }}>{icon}</span>
                    <span>{title}</span>
                </div>
                <span style={{ fontSize: '11px', color: '#64748b', transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>▼</span>
            </button>
            {open && (
                <div style={{ padding: '14px', background: '#ffffff' }}>
                    {children}
                </div>
            )}
        </div>
    );
};

const ProductPickerModal = ({ isOpen, onClose, onSelect }: { isOpen: boolean; onClose: () => void; onSelect: (product: any) => void }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        setLoading(true);
        const term = searchTerm.trim();
        const query = term 
            ? `query SearchProducts($term: String!) {
                products(options: { filter: { name: { contains: $term } }, take: 20 }) {
                    items { id name slug description featuredAsset { id preview source } variants { id name price priceWithTax } }
                }
            }`
            : `query GetInitialProducts {
                products(options: { take: 20 }) {
                    items { id name slug description featuredAsset { id preview source } variants { id name price priceWithTax } }
                }
            }`;
        
        fetchGraphQL(query, term ? { term } : undefined)
            .then((res: any) => {
                setProducts(res?.products?.items || []);
            })
            .catch((err) => console.error("Error fetching products for SmartGrid", err))
            .finally(() => setLoading(false));
    }, [isOpen, searchTerm]);

    if (!isOpen) return null;

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
            <div style={{ background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '600px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                <div style={{ padding: '14px 18px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '18px' }}>📦</span>
                        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>Choisir un Produit Vendure</h3>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#64748b' }}>✕</button>
                </div>
                
                <div style={{ padding: '12px 18px', borderBottom: '1px solid #f1f5f9' }}>
                    <input 
                        type="text" 
                        placeholder="Rechercher par nom de produit..." 
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="input-pro"
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                        autoFocus
                    />
                </div>

                <div style={{ padding: '14px 18px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '24px', color: '#64748b', fontSize: '13px' }}>Chargement des produits...</div>
                    ) : products.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '24px', color: '#94a3b8', fontSize: '13px' }}>Aucun produit trouvé</div>
                    ) : (
                        products.map((p) => {
                            const img = getAssetUrl(p.featuredAsset?.preview || p.featuredAsset?.source);
                            const price = p.variants?.[0]?.priceWithTax ? `${(p.variants[0].priceWithTax / 100).toLocaleString('fr-FR')} FCFA` : '';
                            return (
                                <div 
                                    key={p.id}
                                    onClick={() => {
                                        onSelect({
                                            name: p.name,
                                            slug: p.slug,
                                            image: img,
                                            price: price,
                                            description: p.description || ''
                                        });
                                        onClose();
                                    }}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        padding: '8px 12px',
                                        borderRadius: '8px',
                                        border: '1px solid #e2e8f0',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s',
                                        background: '#fff'
                                    }}
                                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#2563eb'; e.currentTarget.style.background = '#f8fafc'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#fff'; }}
                                >
                                    <div style={{ width: '42px', height: '42px', borderRadius: '6px', background: '#f1f5f9', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {img ? <img src={img} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '📦'}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: 600, fontSize: '12px', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                                        <div style={{ fontSize: '11px', color: '#64748b' }}>/product/{p.slug}</div>
                                    </div>
                                    {price && (
                                        <div style={{ fontWeight: 700, fontSize: '12px', color: '#059669', flexShrink: 0 }}>
                                            {price}
                                        </div>
                                    )}
                                    <button style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>
                                        Choisir
                                    </button>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
};

const CollectionPickerModal = ({ isOpen, onClose, onSelect }: { isOpen: boolean; onClose: () => void; onSelect: (col: any) => void }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [collections, setCollections] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        setLoading(true);
        fetchGraphQL(`query GetCollectionsTree { cmsCollectionsTree { id name slug featuredAsset { id preview source } children { id name slug featuredAsset { id preview source } } } }`)
            .then((res: any) => {
                const tree = res?.cmsCollectionsTree || [];
                const flat: any[] = [];
                const flatten = (nodes: any[]) => {
                    for (const node of nodes) {
                        flat.push(node);
                        if (node.children && node.children.length > 0) flatten(node.children);
                    }
                };
                flatten(tree);
                setCollections(flat);
            })
            .catch((err) => console.error("Error fetching collections for SmartGrid", err))
            .finally(() => setLoading(false));
    }, [isOpen]);

    if (!isOpen) return null;

    const filtered = collections.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
            <div style={{ background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '600px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                <div style={{ padding: '14px 18px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '18px' }}>🗂️</span>
                        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>Choisir une Collection / Rayon</h3>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#64748b' }}>✕</button>
                </div>
                
                <div style={{ padding: '12px 18px', borderBottom: '1px solid #f1f5f9' }}>
                    <input 
                        type="text" 
                        placeholder="Filtrer les collections..." 
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="input-pro"
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                        autoFocus
                    />
                </div>

                <div style={{ padding: '14px 18px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '24px', color: '#64748b', fontSize: '13px' }}>Chargement des collections...</div>
                    ) : filtered.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '24px', color: '#94a3b8', fontSize: '13px' }}>Aucune collection trouvée</div>
                    ) : (
                        filtered.map((c) => {
                            const img = getAssetUrl(c.featuredAsset?.preview || c.featuredAsset?.source);
                            return (
                                <div 
                                    key={c.id}
                                    onClick={() => {
                                        onSelect({
                                            name: c.name,
                                            slug: c.slug,
                                            image: img,
                                        });
                                        onClose();
                                    }}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        padding: '8px 12px',
                                        borderRadius: '8px',
                                        border: '1px solid #e2e8f0',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s',
                                        background: '#fff'
                                    }}
                                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#2563eb'; e.currentTarget.style.background = '#f8fafc'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#fff'; }}
                                >
                                    <div style={{ width: '42px', height: '42px', borderRadius: '6px', background: '#f1f5f9', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {img ? <img src={img} alt={c.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '📁'}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: 600, fontSize: '12px', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
                                        <div style={{ fontSize: '11px', color: '#64748b' }}>/collection/{c.slug}</div>
                                    </div>
                                    <button style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>
                                        Choisir
                                    </button>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
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
    const isShapeLayout = activeLayout === 'image-on-shape';

    const [isProductPickerOpen, setIsProductPickerOpen] = useState(false);
    const [isCollectionPickerOpen, setIsCollectionPickerOpen] = useState(false);

    // Accordion multi-open state
    const [openSections, setOpenSections] = useState<{ [key: string]: boolean }>({
        'card-source': true,
        'card-image-pos': true,
        'card-price': true,
        'card-text': false,
        'card-appearance': false,
        'card-promo': false,
    });

    const toggleSection = (sectionId: string) => {
        setOpenSections(prev => ({ ...prev, [sectionId]: !prev[sectionId] }));
    };

    const handleSelectProduct = (product: any) => {
        setProp((p: any) => {
            if (product.name) p.titleText = product.name;
            if (product.image) p.imageUrl = product.image;
            if (product.slug) p.linkUrl = `/product/${product.slug}`;
            if (product.price) p.priceText = product.price;
            if (product.description) p.descText = product.description.replace(/<[^>]*>?/gm, '').substring(0, 100);
        });
    };

    const handleSelectCollection = (col: any) => {
        setProp((p: any) => {
            if (col.name) p.titleText = col.name;
            if (col.image) p.imageUrl = col.image;
            if (col.slug) p.linkUrl = `/collection/${col.slug}`;
            p.descText = `Découvrez notre sélection ${col.name}`;
        });
    };

    // Helper to shift image position interactively
    const shiftImagePos = (dx: number, dy: number) => {
        setProp((p: any) => {
            const currentX = p.imagePosX !== undefined ? p.imagePosX : 0;
            const currentY = p.imagePosY !== undefined ? p.imagePosY : 0;
            p.imagePosX = Math.max(-100, Math.min(100, currentX + dx));
            p.imagePosY = Math.max(-100, Math.min(100, currentY + dy));
        });
    };

    const resetImagePos = () => {
        setProp((p: any) => {
            p.imagePosX = 0;
            p.imagePosY = 0;
            p.imageSize = 100;
        });
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingBottom: '30px' }}>
            
            <ProductPickerModal 
                isOpen={isProductPickerOpen} 
                onClose={() => setIsProductPickerOpen(false)} 
                onSelect={handleSelectProduct} 
            />

            <CollectionPickerModal 
                isOpen={isCollectionPickerOpen} 
                onClose={() => setIsCollectionPickerOpen(false)} 
                onSelect={handleSelectCollection} 
            />

            {/* 1. SOURCE & REMPLISSAGE AUTOMATIQUE */}
            <AccordionSection 
                title="Source & Produit Associé" 
                icon="⚡" 
                isOpen={openSections['card-source']}
                onToggle={() => toggleSection('card-source')}
            >
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '10px 12px', marginBottom: '12px' }}>
                    <div style={{ fontSize: '11px', color: '#166534', fontWeight: 600, marginBottom: '6px' }}>
                        📦 Sélectionner directement un article Vendure :
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                        <button
                            type="button"
                            onClick={() => setIsProductPickerOpen(true)}
                            style={{
                                background: '#16a34a',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '6px',
                                padding: '8px 10px',
                                fontSize: '11px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '4px'
                            }}
                        >
                            📦 Choisir Produit
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsCollectionPickerOpen(true)}
                            style={{
                                background: '#ffffff',
                                color: '#166534',
                                border: '1px solid #86efac',
                                borderRadius: '6px',
                                padding: '8px 10px',
                                fontSize: '11px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '4px'
                            }}
                        >
                            🗂️ Choisir Rayon
                        </button>
                    </div>
                </div>

                <MediaUploadField 
                    label="Image principale de l'élément"
                    value={props.imageUrl}
                    onChange={(url) => setProp((p: any) => p.imageUrl = url)}
                />

                <div style={{ marginTop: '10px' }}>
                    <label className="label-pro">Lien URL de redirection</label>
                    <input 
                        className="input-pro" 
                        type="text" 
                        placeholder="/product/mon-produit" 
                        value={props.linkUrl || ''} 
                        onChange={(e) => setProp((p: any) => p.linkUrl = e.target.value)} 
                    />
                </div>
            </AccordionSection>

            {/* 2. DÉPLACEMENT & AJUSTEMENT DE L'IMAGE (PAN & ZOOM) */}
            <AccordionSection 
                title="Position & Cadrage de l'Image" 
                icon="🖼️"
                isOpen={openSections['card-image-pos']}
                onToggle={() => toggleSection('card-image-pos')}
            >
                {/* Visual D-Pad & Quick Controls */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', marginBottom: '12px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#334155', marginBottom: '8px', textAlign: 'center' }}>
                        🎯 Déplacer l'image dans son cadre :
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                        <button 
                            type="button" 
                            onClick={() => shiftImagePos(0, -5)} 
                            title="Monter"
                            style={{ width: '34px', height: '28px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                        >
                            ▲
                        </button>
                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                            <button 
                                type="button" 
                                onClick={() => shiftImagePos(-5, 0)} 
                                title="Déplacer à gauche"
                                style={{ width: '34px', height: '28px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                            >
                                ◀
                            </button>
                            <button 
                                type="button" 
                                onClick={resetImagePos} 
                                title="Réinitialiser la position au centre"
                                style={{ padding: '0 8px', height: '28px', background: '#eff6ff', border: '1px solid #bfdbfe', color: '#2563eb', borderRadius: '4px', cursor: 'pointer', fontSize: '10px', fontWeight: 700 }}
                            >
                                Centrer
                            </button>
                            <button 
                                type="button" 
                                onClick={() => shiftImagePos(5, 0)} 
                                title="Déplacer à droite"
                                style={{ width: '34px', height: '28px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                            >
                                ▶
                            </button>
                        </div>
                        <button 
                            type="button" 
                            onClick={() => shiftImagePos(0, 5)} 
                            title="Descendre"
                            style={{ width: '34px', height: '28px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                        >
                            ▼
                        </button>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#64748b', marginTop: '8px' }}>
                        <span>Position X : <strong>{props.imagePosX || 0}%</strong></span>
                        <span>Position Y : <strong>{props.imagePosY || 0}%</strong></span>
                    </div>
                </div>

                {/* Fine Tuning Sliders */}
                <div style={{ marginBottom: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <label className="label-pro">🔍 Zoom / Échelle Image</label>
                        <span style={{ fontSize: '11px', color: '#2563eb', fontWeight: 700 }}>{props.imageSize !== undefined ? props.imageSize : 100}%</span>
                    </div>
                    <input 
                        className="range-pro" 
                        type="range" min="20" max="300" step="5" 
                        value={props.imageSize !== undefined ? props.imageSize : 100} 
                        onChange={(e) => setProp((p: any) => p.imageSize = parseInt(e.target.value) || 100)} 
                    />
                </div>

                <div className="grid-2" style={{ marginBottom: '10px' }}>
                    <div>
                        <label className="label-pro">Décalage X ({props.imagePosX || 0}%)</label>
                        <input className="range-pro" type="range" min="-100" max="100" step="1" value={props.imagePosX || 0} onChange={(e) => setProp((p: any) => p.imagePosX = parseInt(e.target.value) || 0)} />
                    </div>
                    <div>
                        <label className="label-pro">Décalage Y ({props.imagePosY || 0}%)</label>
                        <input className="range-pro" type="range" min="-100" max="100" step="1" value={props.imagePosY || 0} onChange={(e) => setProp((p: any) => p.imagePosY = parseInt(e.target.value) || 0)} />
                    </div>
                </div>

                <div className="grid-2" style={{ marginBottom: '10px' }}>
                    <div>
                        <label className="label-pro">Cadrage Image (Fit)</label>
                        <select
                            className="input-pro"
                            value={props.imageFit || ''}
                            onChange={(e) => setProp((p: any) => p.imageFit = e.target.value as any)}
                        >
                            <option value="">(Global)</option>
                            <option value="contain">Contain (Conserver visuel)</option>
                            <option value="cover">Cover (Plein cadre)</option>
                            <option value="fill">Fill (Étirer)</option>
                        </select>
                    </div>
                    <div>
                        <label className="label-pro">Placement Image / Texte</label>
                        <select
                            className="input-pro"
                            value={props.cardContentLayout || ''}
                            onChange={(e) => setProp((p: any) => p.cardContentLayout = e.target.value as any)}
                        >
                            <option value="">(Global)</option>
                            <option value="image-above-text">⬆️ Image en haut</option>
                            <option value="image-below-text">⬇️ Image en bas</option>
                            <option value="image-left-text-right">⬅️ Image à gauche</option>
                            <option value="text-left-image-right">➡️ Image à droite</option>
                            <option value="image-overlay">🖼️ Texte dans image (Overlay)</option>
                            <option value="image-on-shape">🎨 Image sur Forme (3D / Dépassante)</option>
                        </select>
                    </div>
                </div>

                {/* IMAGE SUR FORME (3D / DÉPASSANTE) */}
                {(isShapeLayout || props.cardContentLayout === 'image-on-shape') && (
                    <div style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: '8px', padding: '12px', marginBottom: '12px' }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#6d28d9', marginBottom: '8px' }}>
                            🎨 Configuration de la Forme Arrière-Plan :
                        </div>
                        <div className="grid-2" style={{ marginBottom: '10px' }}>
                            <ColorField label="Couleur de la forme" value={props.shapeBgColor || '#e0e7ff'} onChange={(v) => setProp((p: any) => p.shapeBgColor = v)} />
                        </div>
                        <MediaUploadField 
                            label="Image de fond sur la forme (Texture/Décor)" 
                            value={props.shapeBgImage || ''} 
                            onChange={(url) => setProp((p: any) => p.shapeBgImage = url)} 
                        />
                    </div>
                )}

                {/* TEXT POSITION IN OVERLAY */}
                {isOverlayLayout && (
                    <div style={{ marginBottom: '12px', background: '#f8fafc', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                        <label className="label-pro">📍 Position du texte dans l'image</label>
                        <select 
                            className="input-pro" 
                            value={props.insideTextPosition || ''} 
                            onChange={(e) => setProp((p: any) => p.insideTextPosition = e.target.value as any)}
                        >
                            <option value="">(Position globale)</option>
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

                {/* Dimensions Manuelles Optionnelles */}
                <div className="grid-2" style={{ marginBottom: '10px' }}>
                    <div>
                        <label className="label-pro">Largeur Image (ex: 150px)</label>
                        <input className="input-pro" type="text" placeholder="Défaut" value={props.imageWidth || ''} onChange={(e) => setProp((p: any) => p.imageWidth = e.target.value)} />
                    </div>
                    <div>
                        <label className="label-pro">Hauteur Image (ex: 150px)</label>
                        <input className="input-pro" type="text" placeholder="Défaut" value={props.imageHeight || ''} onChange={(e) => setProp((p: any) => p.imageHeight = e.target.value)} />
                    </div>
                </div>

                <div style={{ marginBottom: '10px' }}>
                    <label className="label-pro">Hauteur Min Carte (ex: 280px)</label>
                    <input className="input-pro" type="text" placeholder="ex: 250px" value={props.cardMinHeight || ''} onChange={(e) => setProp((p: any) => p.cardMinHeight = e.target.value)} />
                </div>

                {/* Spans */}
                <div className="grid-2">
                    <div>
                        <label className="label-pro">Colonnes (Col Span)</label>
                        <select 
                            className="input-pro" 
                            value={props.cardColSpan || ''} 
                            onChange={(e) => setProp((p: any) => p.cardColSpan = e.target.value ? parseInt(e.target.value) : undefined)}
                        >
                            <option value="">(1 colonne standard)</option>
                            <option value={2}>2 colonnes (Large)</option>
                            <option value={3}>3 colonnes</option>
                            <option value={4}>4 colonnes</option>
                            <option value={6}>6 colonnes (Demi-page)</option>
                            <option value={12}>12 colonnes (Pleine largeur)</option>
                        </select>
                    </div>
                    <div>
                        <label className="label-pro">Lignes (Row Span)</label>
                        <select 
                            className="input-pro" 
                            value={props.cardRowSpan || ''} 
                            onChange={(e) => setProp((p: any) => p.cardRowSpan = e.target.value ? parseInt(e.target.value) : undefined)}
                        >
                            <option value="">(1 ligne standard)</option>
                            <option value={2}>2 lignes (Double Hauteur)</option>
                            <option value={3}>3 lignes (Triple)</option>
                        </select>
                    </div>
                </div>
            </AccordionSection>

            {/* 3. PRIX & TARIFS */}
            <AccordionSection 
                title="Prix & Tarifs Promo" 
                icon="🏷️"
                isOpen={openSections['card-price']}
                onToggle={() => toggleSection('card-price')}
            >
                <div className="grid-2" style={{ marginBottom: '10px' }}>
                    <div>
                        <label className="label-pro">Prix du Produit</label>
                        <input className="input-pro" type="text" placeholder="ex: 15 000 FCFA" value={props.priceText || ''} onChange={(e) => setProp((p: any) => p.priceText = e.target.value)} />
                    </div>
                    <div>
                        <label className="label-pro">Prix Barré (Optionnel)</label>
                        <input className="input-pro" type="text" placeholder="ex: 20 000 FCFA" value={props.oldPriceText || ''} onChange={(e) => setProp((p: any) => p.oldPriceText = e.target.value)} />
                    </div>
                </div>
                <div className="grid-2">
                    <ColorField label="Couleur Prix" value={props.priceColor || '#059669'} onChange={(v) => setProp((p: any) => p.priceColor = v)} />
                    <ColorField label="Couleur Prix Barré" value={props.oldPriceColor || '#94a3b8'} onChange={(v) => setProp((p: any) => p.oldPriceColor = v)} />
                </div>
            </AccordionSection>

            {/* 4. TEXTES & TYPOGRAPHIE */}
            <AccordionSection 
                title="Titre, Description & Typographie" 
                icon="📝"
                isOpen={openSections['card-text']}
                onToggle={() => toggleSection('card-text')}
            >
                <div style={{ marginBottom: '10px' }}>
                    <label className="label-pro">Titre de la carte</label>
                    <input className="input-pro" type="text" placeholder="Titre principal" value={props.titleText} onChange={(e) => setProp((p: any) => p.titleText = e.target.value)} />
                </div>
                
                <div className="grid-2" style={{ marginBottom: '10px' }}>
                    <ColorField label="Couleur Titre" value={props.titleColor} onChange={(v) => setProp((p: any) => p.titleColor = v)} />
                    <div>
                        <label className="label-pro">Taille Titre</label>
                        <input className="input-pro" type="text" placeholder="16px" value={props.titleFontSize || ''} onChange={(e) => setProp((p: any) => p.titleFontSize = e.target.value)} />
                    </div>
                </div>

                <div className="grid-2" style={{ marginBottom: '10px' }}>
                    <div>
                        <label className="label-pro">Graisse Titre</label>
                        <select className="input-pro" value={props.titleFontWeight || ''} onChange={(e) => setProp((p: any) => p.titleFontWeight = e.target.value)}>
                            <option value="">(Global)</option>
                            <option value="normal">Normal (400)</option>
                            <option value="medium">Moyen (500)</option>
                            <option value="bold">Gras (700)</option>
                            <option value="900">Black (900)</option>
                        </select>
                    </div>
                    <div>
                        <label className="label-pro">Casse Titre</label>
                        <select className="input-pro" value={props.titleTransform || ''} onChange={(e) => setProp((p: any) => p.titleTransform = e.target.value as any)}>
                            <option value="">(Global)</option>
                            <option value="none">Normal</option>
                            <option value="uppercase">MAJUSCULES</option>
                            <option value="capitalize">Capitaliser</option>
                        </select>
                    </div>
                </div>

                <div style={{ marginBottom: '10px' }}>
                    <label className="label-pro">Description</label>
                    <textarea className="input-pro" rows={2} placeholder="Courte description..." value={props.descText} onChange={(e) => setProp((p: any) => p.descText = e.target.value)} />
                </div>

                <div className="grid-2">
                    <ColorField label="Couleur Description" value={props.descColor} onChange={(v) => setProp((p: any) => p.descColor = v)} />
                    <div>
                        <label className="label-pro">Lignes max</label>
                        <select className="input-pro" value={props.descLines !== undefined ? props.descLines : ''} onChange={(e) => setProp((p: any) => p.descLines = e.target.value !== '' ? parseInt(e.target.value) : undefined)}>
                            <option value="">(Global)</option>
                            <option value={1}>1 Ligne</option>
                            <option value={2}>2 Lignes</option>
                            <option value={3}>3 Lignes</option>
                        </select>
                    </div>
                </div>
            </AccordionSection>

            {/* 5. STYLE & FOND DE LA CARTE */}
            <AccordionSection 
                title="Style, Fond & Voile Sombre" 
                icon="🎨"
                isOpen={openSections['card-appearance']}
                onToggle={() => toggleSection('card-appearance')}
            >
                <div className="grid-2" style={{ marginBottom: '10px' }}>
                    <ColorField label="Couleur de fond" value={props.bgColor} onChange={(v) => setProp((p: any) => p.bgColor = v)} />
                    <ColorField label="Fond au survol" value={props.hoverBgColor} onChange={(v) => setProp((p: any) => p.hoverBgColor = v)} />
                </div>
                
                <div className="grid-2" style={{ marginBottom: '10px' }}>
                    <div>
                        <label className="label-pro">Bordure (px)</label>
                        <input className="input-pro" type="number" min={0} value={props.borderWidth} onChange={(e) => setProp((p: any) => p.borderWidth = parseInt(e.target.value) || 0)} />
                    </div>
                    <ColorField label="Couleur bordure" value={props.borderColor} onChange={(v) => setProp((p: any) => p.borderColor = v)} />
                </div>

                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}>
                    <label style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, cursor: 'pointer' }}>
                        <input type="checkbox" checked={props.overlayEnabled} onChange={(e) => setProp((p: any) => p.overlayEnabled = e.target.checked)} />
                        Voile sombre sur l'image (Overlay)
                    </label>

                    {props.overlayEnabled && (
                        <div className="grid-2" style={{ marginTop: '8px' }}>
                            <ColorField label="Couleur voile" value={props.overlayColor} onChange={(v) => setProp((p: any) => p.overlayColor = v)} />
                            <div>
                                <label className="label-pro">Opacité ({Math.round(props.overlayOpacity * 100)}%)</label>
                                <input className="range-pro" type="range" step="0.1" min="0" max="1" value={props.overlayOpacity} onChange={(e) => setProp((p: any) => p.overlayOpacity = parseFloat(e.target.value) || 0)} />
                            </div>
                        </div>
                    )}
                </div>
            </AccordionSection>

            {/* 6. BADGES & BOUTON CTA */}
            <AccordionSection 
                title="Badge Promo & Bouton CTA" 
                icon="📌"
                isOpen={openSections['card-promo']}
                onToggle={() => toggleSection('card-promo')}
            >
                <label style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, marginBottom: '8px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={props.promoCardEnabled || false} onChange={(e) => setProp((p: any) => p.promoCardEnabled = e.target.checked)} />
                    Afficher un badge (ex: PROMO, -20%)
                </label>

                {props.promoCardEnabled && (
                    <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '6px', marginBottom: '10px' }}>
                        <div style={{ marginBottom: '8px' }}>
                            <label className="label-pro">Texte du badge</label>
                            <input className="input-pro" type="text" placeholder="PROMO" value={props.promoCardText || 'PROMO'} onChange={(e) => setProp((p: any) => p.promoCardText = e.target.value)} />
                        </div>
                        <div className="grid-2" style={{ marginBottom: '8px' }}>
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
                    </div>
                )}

                <label style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, marginTop: '8px', cursor: 'pointer' }}>
                    <input 
                        type="checkbox" 
                        checked={props.showCta !== undefined ? props.showCta : false} 
                        onChange={(e) => setProp((p: any) => p.showCta = e.target.checked)} 
                    />
                    Afficher un bouton d'action (CTA)
                </label>

                {props.showCta && (
                    <div className="grid-2" style={{ marginTop: '8px' }}>
                        <div>
                            <label className="label-pro">Texte du bouton</label>
                            <input className="input-pro" type="text" placeholder="Découvrir" value={props.ctaText || ''} onChange={(e) => setProp((p: any) => p.ctaText = e.target.value)} />
                        </div>
                        <div>
                            <label className="label-pro">Style</label>
                            <select className="input-pro" value={props.ctaStyle || 'solid'} onChange={(e) => setProp((p: any) => p.ctaStyle = e.target.value as any)}>
                                <option value="solid">Bouton Plein</option>
                                <option value="outline">Contour</option>
                                <option value="link">Lien Texte ➔</option>
                            </select>
                        </div>
                    </div>
                )}
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
        priceColor: '#059669',
        oldPriceColor: '#94a3b8',
        priceFontSize: '15px',
        linkUrl: '',
        linkNewTab: false,
        imageWidth: '',
        imageHeight: '',
        imageFitMode: '',
        imageFit: '',
        shapeBgColor: '#e0e7ff',
        shapeBgImage: '',
        imagePosX: 0,
        imagePosY: 0,
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
