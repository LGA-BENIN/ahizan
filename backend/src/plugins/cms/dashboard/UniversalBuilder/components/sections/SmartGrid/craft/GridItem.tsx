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
}

export const GridItem = (props: GridItemProps) => {
    const { connectors: { connect, drag }, selected } = useNode((node) => ({
        selected: node.events.selected
    }));
    
    const [isHovered, setIsHovered] = useState(false);
    const globalContext = useContext(GridGlobalContext) || {};

    const activeShape = globalContext.globalShape || 'circle';
    const activeWidth = globalContext.globalImageWidth || '120px';
    const activeHeight = globalContext.globalImageHeight || '120px';
    const activeAnimHover = globalContext.globalAnimHover || 'scale';
    const activeAlignment = globalContext.globalItemAlignment || 'center';
    const activeTitleSize = globalContext.globalItemTitleSize || '16px';
    const activeTitleWeight = globalContext.globalItemTitleWeight || 'bold';
    const activeDescSize = globalContext.globalItemDescSize || '14px';
    const activeDescWeight = globalContext.globalItemDescWeight || 'normal';
    
    const activeLayout = globalContext.globalContentLayout || 'image-above-text';
    const isRowLayout = activeLayout === 'image-left-text-right' || activeLayout === 'text-left-image-right';
    const isReverse = activeLayout === 'image-below-text' || activeLayout === 'text-left-image-right';

    const isCarousel = globalContext.isCarousel;
    const columnsDesktop = globalContext.columnsDesktop || 4;
    const gapX = globalContext.gapX || 16;

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

    const imageElement = (
        <div style={{
            position: 'relative',
            width: activeWidth || '100%',
            maxWidth: isRowLayout ? '50%' : '100%',
            height: activeHeight || 'auto',
            aspectRatio: isRect ? '16/9' : '1/1',
            borderRadius: getBorderRadius(),
            overflow: 'hidden',
            backgroundColor: props.imageUrl ? 'transparent' : '#f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
        }}>
            {props.imageUrl ? (
                <img 
                    src={props.imageUrl} 
                    alt={props.titleText} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
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
        </div>
    );

    const textElement = (props.titleText || props.descText) && (
        <div style={{ flex: isRowLayout ? 1 : undefined, width: isRowLayout ? undefined : '100%', minWidth: 0, textAlign: activeAlignment as any }}>
            {props.titleText && (
                <div style={{
                    color: props.titleColor,
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
                    color: props.descColor,
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
                flexDirection: isRowLayout ? (isReverse ? 'row-reverse' : 'row') : (isReverse ? 'column-reverse' : 'column'),
                alignItems: activeAlignment === 'left' ? 'flex-start' : activeAlignment === 'right' ? 'flex-end' : 'center',
                gap: '12px',
                padding: '16px',
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
                borderRadius: '8px',
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
    },
    related: {
        settings: GridItemSettings
    }
};
