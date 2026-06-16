import React, { useRef, useEffect } from 'react';
import { useNode } from '@craftjs/core';
import { MediaUploadField } from '../MediaUploadField';
import { DraggableResizeable, AdvancedSettings } from './DraggableResizeable';
import { useViewport } from './FreeformBuilderSettings';

export const ImageNode = ({ src, width, height, borderRadius, objectFit, margin, position, top, left, right = 'auto', bottom = 'auto', zIndex = 1, mobileTop, mobileLeft, mobileWidth, mobileHeight, hideOnMobile, hideOnDesktop }: any) => {
    const { viewport } = useViewport();
    const { connectors: { connect, drag }, selected, setProp } = useNode((state) => ({
        selected: state.events.selected
    }));
    
    const divRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!divRef.current) return;
        const resizeObserver = new ResizeObserver((entries) => {
            for (let entry of entries) {
                if (entry.target instanceof HTMLElement && entry.target.style.width) {
                    const target = entry.target as HTMLElement;
                    setProp((props: any) => {
                        props.width = target.style.width;
                        props.height = target.style.height || props.height;
                    });
                }
            }
        });
        resizeObserver.observe(divRef.current);
        return () => resizeObserver.disconnect();
    }, [setProp]);

    return (
        <DraggableResizeable
            position={position} top={top} left={left} right={right} bottom={bottom} zIndex={zIndex} width={width} height={height}
            mobileTop={mobileTop} mobileLeft={mobileLeft} mobileWidth={mobileWidth} mobileHeight={mobileHeight}
            onSetProp={setProp}
        >
            <div style={{ display: (viewport === 'mobile' && hideOnMobile) ? 'none' : (viewport === 'desktop' && hideOnDesktop) ? 'none' : 'block', width: '100%', height: '100%', margin }}>
            {src ? (
                <img 
                    src={src} 
                    alt="Image" 
                    style={{ width: '100%', height: '100%', objectFit, borderRadius, display: 'block' }} 
                />
            ) : (
                <div style={{ width: '100%', height: '100%', minHeight: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9', borderRadius, color: '#94a3b8' }}>
                    🖼️ Image
                </div>
            )}
            </div>
        </DraggableResizeable>
    );
};

export const ImageSettings = () => {
    const { setProp, props } = useNode((node) => ({ props: node.data.props }));

    return (
        <div className="stack-lg" style={{ padding: '16px' }}>
            <div className="settings-card">
                <div className="settings-card-header">🖼️ Image</div>
                <MediaUploadField 
                    label="Source de l'image"
                    value={props.src}
                    onChange={(url) => setProp((p: any) => p.src = url)}
                />
                
                <div className="grid-2" style={{ marginTop: '1rem' }}>
                    <div>
                        <label className="label-pro">Largeur</label>
                        <input className="input-pro" value={props.width} onChange={e => setProp((p: any) => p.width = e.target.value)} />
                    </div>
                    <div>
                        <label className="label-pro">Hauteur</label>
                        <input className="input-pro" value={props.height} onChange={e => setProp((p: any) => p.height = e.target.value)} />
                    </div>
                </div>

                <div className="grid-2" style={{ marginTop: '1rem' }}>
                    <div>
                        <label className="label-pro">Mode d'ajustement</label>
                        <select className="input-pro" value={props.objectFit} onChange={e => setProp((p: any) => p.objectFit = e.target.value)}>
                            <option value="cover">Remplir (Cover)</option>
                            <option value="contain">Contenir (Contain)</option>
                            <option value="fill">Étirer (Fill)</option>
                        </select>
                    </div>
                    <div>
                        <label className="label-pro">Arrondi</label>
                        <input className="input-pro" value={props.borderRadius} onChange={e => setProp((p: any) => p.borderRadius = e.target.value)} />
                    </div>
                </div>
                
                <div style={{ marginTop: '1rem' }}>
                    <label className="label-pro">Marges externes</label>
                    <input className="input-pro" value={props.margin} onChange={e => setProp((p: any) => p.margin = e.target.value)} />
                </div>
            </div>

            <div className="settings-card">
                <div className="settings-card-header">📍 Positionnement Libre</div>
                <div style={{ marginBottom: '1rem' }}>
                    <label className="label-pro">Type de position</label>
                    <select className="input-pro" value={props.position} onChange={e => setProp((p: any) => p.position = e.target.value)}>
                        <option value="relative">Relatif (Défaut)</option>
                        <option value="absolute">Absolu (Libre)</option>
                        <option value="fixed">Fixe</option>
                    </select>
                </div>
                {props.position === 'absolute' || props.position === 'fixed' ? (
                    <div className="grid-2">
                        <div>
                            <label className="label-pro">Haut (Top)</label>
                            <input className="input-pro" value={props.top} onChange={e => setProp((p: any) => p.top = e.target.value)} placeholder="ex: 50px" />
                        </div>
                        <div>
                            <label className="label-pro">Gauche (Left)</label>
                            <input className="input-pro" value={props.left} onChange={e => setProp((p: any) => p.left = e.target.value)} placeholder="ex: 50px" />
                        </div>
                        <div style={{ marginTop: '0.5rem' }}>
                            <label className="label-pro">Bas (Bottom)</label>
                            <input className="input-pro" value={props.bottom} onChange={e => setProp((p: any) => p.bottom = e.target.value)} placeholder="ex: auto" />
                        </div>
                        <div style={{ marginTop: '0.5rem' }}>
                            <label className="label-pro">Droite (Right)</label>
                            <input className="input-pro" value={props.right} onChange={e => setProp((p: any) => p.right = e.target.value)} placeholder="ex: auto" />
                        </div>
                    </div>
                ) : null}
                <div style={{ marginTop: '1rem' }}>
                    <label className="label-pro">Z-Index (Profondeur)</label>
                    <input type="number" className="input-pro" value={props.zIndex} onChange={e => setProp((p: any) => p.zIndex = parseInt(e.target.value) || 0)} />
                </div>
            </div>

            <AdvancedSettings props={props} setProp={setProp} />
        </div>
    );
};

ImageNode.craft = {
    props: {
        src: '',
        width: '300px',
        height: 'auto',
        borderRadius: '0px',
        objectFit: 'cover',
        margin: '0px',
        position: 'relative',
        top: 'auto',
        left: 'auto',
        right: 'auto',
        bottom: 'auto',
        zIndex: 1
    },
    related: { settings: ImageSettings }
};
