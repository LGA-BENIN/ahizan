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

    descText: string;
    descColor: string;

    linkUrl: string;
    linkNewTab: boolean;

    imageWidth?: string;
    imageHeight?: string;
    shapeBgColor?: string;
    shapeBgImage?: string;
    imagePosX?: number;
    imagePosY?: number;
    imageSize?: number;
}

export const GridItem = (props: GridItemProps) => {
    const { connectors: { connect, drag }, selected } = useNode((node) => ({
        selected: node.events.selected
    }));
    
    const [isHovered, setIsHovered] = useState(false);
    const globalContext = useContext(GridGlobalContext) || {};

    const activeShape = globalContext.globalShape || 'circle';
    const activeLayout = globalContext.globalContentLayout || 'image-above-text';
    const isShapeLayout = activeLayout === 'image-on-shape';
    const activeWidth = isShapeLayout ? (globalContext.globalImageWidth || '120px') : (props.imageWidth || globalContext.globalImageWidth || '120px');
    const activeHeight = isShapeLayout ? (globalContext.globalImageHeight || '120px') : (props.imageHeight || globalContext.globalImageHeight || '120px');
    const activeAnimHover = globalContext.globalAnimHover || 'scale';
    const activeAlignment = globalContext.globalItemAlignment || 'center';
    const activeTitleSize = globalContext.globalItemTitleSize || '16px';
    const activeTitleWeight = globalContext.globalItemTitleWeight || 'bold';
    const activeDescSize = globalContext.globalItemDescSize || '14px';
    const activeDescWeight = globalContext.globalItemDescWeight || 'normal';
    
    const isRowLayout = activeLayout === 'image-left-text-right' || activeLayout === 'text-left-image-right';
    const isReverse = activeLayout === 'image-below-text' || activeLayout === 'text-left-image-right';

    const isCarousel = globalContext.isCarousel;
    const columnsDesktop = globalContext.columnsDesktop || 4;
    const gapX = globalContext.gapX || 16;

    const effectivePosX = props.imagePosX !== undefined ? props.imagePosX : (globalContext.globalImagePosX !== undefined ? globalContext.globalImagePosX : (isShapeLayout ? -10 : 0));
    const effectivePosY = props.imagePosY !== undefined ? props.imagePosY : (globalContext.globalImagePosY !== undefined ? globalContext.globalImagePosY : (isShapeLayout ? -10 : 0));

    const getBorderRadius = () => {
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
    const currentBgColor = isHovered && props.hoverBgColor !== 'transparent' ? props.hoverBgColor : props.bgColor;
    
    let hoverTransform = 'none';
    let hoverBoxShadow = 'none';

    if (isHovered && activeAnimHover !== 'none') {
        if (activeAnimHover === 'scale') hoverTransform = 'scale(1.05)';
        if (activeAnimHover === 'lift') hoverTransform = 'translateY(-8px)';
        if (activeAnimHover === 'glow') hoverBoxShadow = '0 0 15px rgba(255,255,255,0.8)'; // default glow
    }

    const isOverlayLayout = activeLayout === 'image-overlay';

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
                        objectFit: 'cover',
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
            width: activeWidth || '100%',
            maxWidth: isRowLayout ? '50%' : '100%',
            height: activeHeight || 'auto',
            aspectRatio: isShapeLayout ? undefined : (isRect ? '16/9' : '1/1'),
            borderRadius: isShapeLayout ? undefined : getBorderRadius(),
            overflow: isShapeLayout ? 'visible' : 'hidden',
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
                            style={{
                                position: 'absolute',
                                width: props.imageWidth || `${props.imageSize !== undefined ? props.imageSize : 120}%`,
                                height: props.imageHeight || `${props.imageSize !== undefined ? props.imageSize : 120}%`,
                                top: `${effectivePosY}%`,
                                left: `${effectivePosX}%`,
                                objectFit: 'contain',
                                zIndex: 2
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
                            style={{ 
                                width: '100%', 
                                height: '100%', 
                                objectFit: 'cover',
                                objectPosition: `${50 + effectivePosX}% ${50 + effectivePosY}%`
                            }} 
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

    const textElement = (props.titleText || props.descText) && (
        <div style={{ 
            flex: isRowLayout ? 1 : undefined, 
            width: isRowLayout ? undefined : '100%', 
            minWidth: 0, 
            textAlign: activeAlignment as any,
            position: isOverlayLayout ? 'relative' : undefined,
            zIndex: isOverlayLayout ? 2 : undefined
        }}>
            {props.titleText && (
                <div style={{
                    color: isOverlayLayout && (props.titleColor === 'var(--builder-text-main)' || props.titleColor === '#0f172a') ? '#ffffff' : props.titleColor,
                    fontSize: activeTitleSize,
                    fontWeight: activeTitleWeight,
                    textAlign: activeAlignment as any,
                    marginBottom: '4px'
                }}>
                    {props.titleText}
                </div>
            )}
            {props.descText && (
                <div style={{
                    color: isOverlayLayout && (props.descColor === 'var(--builder-text-muted)' || props.descColor === '#64748b') ? '#cbd5e1' : props.descColor,
                    fontSize: activeDescSize,
                    fontWeight: activeDescWeight,
                    textAlign: activeAlignment as any
                }}>
                    {props.descText}
                </div>
            )}
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
                alignItems: activeAlignment === 'left' ? 'flex-start' : activeAlignment === 'right' ? 'flex-end' : 'center',
                justifyContent: isOverlayLayout ? 'center' : undefined,
                gap: '12px',
                padding: isOverlayLayout ? '24px' : '16px',
                backgroundColor: currentBgColor,
                border: `${props.borderWidth}px solid ${props.borderColor}`,
                outline: selected ? '2px solid var(--builder-primary)' : 'none',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                transform: hoverTransform,
                boxShadow: hoverBoxShadow,
                boxSizing: 'border-box',
                width: isCarousel ? `calc(100% / ${columnsDesktop} - ${gapX * (columnsDesktop - 1) / columnsDesktop}px)` : '100%',
                flexShrink: isCarousel ? 0 : 1,
                scrollSnapAlign: isCarousel ? 'start' : undefined,
                height: '100%',
                borderRadius: isOverlayLayout ? getBorderRadius() : '8px',
                overflow: 'hidden',
                minHeight: isOverlayLayout ? '180px' : 'auto',
                zIndex: isHovered ? 10 : 1 // Bring to front when scaled
            }}
        >
            {/* Elements handled by Flex Direction */}
            {imageElement}
            {textElement}
        </div>
    );
};

const ColorField = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
    <div>
        <label className="label-pro">{label}</label>
        <div className="color-row">
            <input type="color" className="color-swatch" value={value || '#000000'} onChange={(e) => onChange(e.target.value)} />
            <input className="input-pro" value={value || ''} onChange={(e) => onChange(e.target.value)} />
        </div>
    </div>
);

export const GridItemSettings = () => {
    const { setProp, props } = useNode((node) => ({
        props: node.data.props as GridItemProps
    }));
    
    const globalContext = useContext(GridGlobalContext) || {};
    const activeLayout = globalContext.globalContentLayout || 'image-above-text';
    const isShapeLayout = activeLayout === 'image-on-shape';

    return (
        <div className="stack-lg" style={{ padding: '16px', maxHeight: '100%', overflowY: 'auto' }}>
            
            <div className="settings-card">
                <div className="settings-card-header">🎨 Apparence</div>
                <div className="grid-2">
                    <ColorField label="Couleur de fond" value={props.bgColor} onChange={(v) => setProp((p: any) => p.bgColor = v)} />
                    <ColorField label="Fond au survol" value={props.hoverBgColor} onChange={(v) => setProp((p: any) => p.hoverBgColor = v)} />
                </div>
                
                <div className="divider" style={{ margin: '1rem 0' }} />
                
                <div className="grid-2">
                    <div>
                        <label className="label-pro">Bordure (px)</label>
                        <input className="input-pro" type="number" min={0} value={props.borderWidth} onChange={(e) => setProp((p: any) => p.borderWidth = parseInt(e.target.value) || 0)} />
                    </div>
                    <ColorField label="Couleur de bordure" value={props.borderColor} onChange={(v) => setProp((p: any) => p.borderColor = v)} />
                </div>
            </div>

            <div className="settings-card">
                <div className="settings-card-header">🖼️ Image</div>
                
                <MediaUploadField 
                    label="Image de l'élément"
                    value={props.imageUrl}
                    onChange={(url) => setProp((p: any) => p.imageUrl = url)}
                />

                <div className="grid-2" style={{ marginTop: '1rem' }}>
                    <div>
                        <label className="label-pro">Largeur Image (ex: 120px)</label>
                        <input className="input-pro" type="text" placeholder="Défaut global" value={props.imageWidth || ''} onChange={(e) => setProp((p: any) => p.imageWidth = e.target.value)} />
                    </div>
                    <div>
                        <label className="label-pro">Hauteur Image (ex: 120px)</label>
                        <input className="input-pro" type="text" placeholder="Défaut global" value={props.imageHeight || ''} onChange={(e) => setProp((p: any) => p.imageHeight = e.target.value)} />
                    </div>
                </div>

                {isShapeLayout && (
                    <div style={{ marginTop: '1rem' }}>
                        <label className="label-pro">Taille/Échelle de l'image (%) : {props.imageSize !== undefined ? props.imageSize : 120}%</label>
                        <input 
                            className="range-pro" 
                            type="range" 
                            min="50" 
                            max="300" 
                            step="5" 
                            value={props.imageSize !== undefined ? props.imageSize : 120} 
                            onChange={(e) => setProp((p: any) => p.imageSize = parseInt(e.target.value) || 0)} 
                        />
                    </div>
                )}

                <div className="grid-2" style={{ marginTop: '1rem' }}>
                    <div>
                        <label className="label-pro">Déplacer X (Horizontal) : {props.imagePosX !== undefined ? props.imagePosX : (isShapeLayout ? -10 : 0)}%</label>
                        <input 
                            className="range-pro" 
                            type="range" 
                            min={isShapeLayout ? "-100" : "-50"}
                            max={isShapeLayout ? "100" : "50"}
                            step="1" 
                            value={props.imagePosX !== undefined ? props.imagePosX : (isShapeLayout ? -10 : 0)} 
                            onChange={(e) => setProp((p: any) => p.imagePosX = parseInt(e.target.value) || 0)} 
                        />
                    </div>
                    <div>
                        <label className="label-pro">Déplacer Y (Vertical) : {props.imagePosY !== undefined ? props.imagePosY : (isShapeLayout ? -10 : 0)}%</label>
                        <input 
                            className="range-pro" 
                            type="range" 
                            min={isShapeLayout ? "-100" : "-50"}
                            max={isShapeLayout ? "100" : "50"}
                            step="1" 
                            value={props.imagePosY !== undefined ? props.imagePosY : (isShapeLayout ? -10 : 0)} 
                            onChange={(e) => setProp((p: any) => p.imagePosY = parseInt(e.target.value) || 0)} 
                        />
                    </div>
                </div>
            </div>

            <div className="settings-card">
                <div className="settings-card-header" style={{ fontSize: '0.9rem', marginBottom: '8px' }}>🎨 Fond de Forme (Image sur Forme)</div>
                <div className="grid-2">
                    <ColorField label="Couleur de la forme" value={props.shapeBgColor || '#e0e7ff'} onChange={(v) => setProp((p: any) => p.shapeBgColor = v)} />
                    <div>
                        <MediaUploadField 
                            label="Image de la forme"
                            value={props.shapeBgImage || ''}
                            onChange={(url) => setProp((p: any) => p.shapeBgImage = url)}
                        />
                    </div>
                </div>

                <div className="divider" style={{ margin: '1rem 0' }} />
                
                <label style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                    <input type="checkbox" checked={props.overlayEnabled} onChange={(e) => setProp((p: any) => p.overlayEnabled = e.target.checked)} />
                    Activer le voile sombre (Overlay)
                </label>

                {props.overlayEnabled && (
                    <div className="grid-2" style={{ marginTop: '1rem' }}>
                        <ColorField label="Couleur de l'overlay" value={props.overlayColor} onChange={(v) => setProp((p: any) => p.overlayColor = v)} />
                        <div>
                            <label className="label-pro">Opacité ({Math.round(props.overlayOpacity * 100)}%)</label>
                            <input className="range-pro" type="range" step="0.1" min="0" max="1" value={props.overlayOpacity} onChange={(e) => setProp((p: any) => p.overlayOpacity = parseFloat(e.target.value) || 0)} />
                        </div>
                    </div>
                )}
            </div>

            <div className="settings-card">
                <div className="settings-card-header">📝 Textes</div>
                
                <div>
                    <label className="label-pro">Titre</label>
                    <input className="input-pro" type="text" placeholder="Titre principal" value={props.titleText} onChange={(e) => setProp((p: any) => p.titleText = e.target.value)} />
                </div>
                
                <div style={{ marginTop: '1rem' }}>
                    <ColorField label="Couleur du titre" value={props.titleColor} onChange={(v) => setProp((p: any) => p.titleColor = v)} />
                </div>

                <div className="divider" style={{ margin: '1rem 0' }} />

                <div>
                    <label className="label-pro">Description</label>
                    <textarea className="input-pro" rows={3} placeholder="Courte description" value={props.descText} onChange={(e) => setProp((p: any) => p.descText = e.target.value)} />
                </div>

                <div style={{ marginTop: '1rem' }}>
                    <ColorField label="Couleur de la description" value={props.descColor} onChange={(v) => setProp((p: any) => p.descColor = v)} />
                </div>
            </div>

            <div className="settings-card">
                <div className="settings-card-header">🔗 Lien</div>
                <div>
                    <label className="label-pro">URL Cible</label>
                    <input className="input-pro" type="text" placeholder="/categorie/..." value={props.linkUrl} onChange={(e) => setProp((p: any) => p.linkUrl = e.target.value)} />
                </div>
                <div style={{ marginTop: '1rem' }}>
                    <label style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                        <input type="checkbox" checked={props.linkNewTab} onChange={(e) => setProp((p: any) => p.linkNewTab = e.target.checked)} />
                        Ouvrir dans un nouvel onglet
                    </label>
                </div>
            </div>
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
        descText: 'Description de la carte',
        descColor: 'var(--builder-text-muted)',
        linkUrl: '',
        linkNewTab: false,
        imageWidth: '',
        imageHeight: '',
        shapeBgColor: '#e0e7ff',
        shapeBgImage: '',
        imagePosX: -10,
        imagePosY: -10,
        imageSize: 120,
    },
    related: {
        settings: GridItemSettings
    }
};
