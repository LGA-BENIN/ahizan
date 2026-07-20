import React, { useRef, useEffect } from 'react';
import { useNode } from '@craftjs/core';
import { DraggableResizeable, AdvancedSettings } from './DraggableResizeable';
import { useViewport } from './FreeformBuilderSettings';

export const ContainerNode = ({
    children,
    width = '100%',
    height = 'auto',
    flexDirection = 'column',
    alignItems = 'flex-start',
    justifyContent = 'flex-start',
    padding = '16px',
    margin = '0px',
    backgroundColor = 'transparent',
    borderWidth = '0px',
    borderColor = '#000000',
    borderRadius = '0px',
    position = 'relative',
    top = 'auto',
    left = 'auto',
    right = 'auto',
    bottom = 'auto',
    zIndex = 1,
    mobileTop, mobileLeft, mobileWidth, mobileHeight,
    hideOnMobile, hideOnDesktop,
    animationType, animationDuration, animationDelay
}: any) => {
    const { viewport } = useViewport();
    const { connectors: { connect, drag }, setProp, selected } = useNode((state) => ({
        selected: state.events.selected
    }));
    
    const divRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!divRef.current) return;
        const resizeObserver = new ResizeObserver((entries) => {
            for (let entry of entries) {
                // We only want to save if the user manually resized via the CSS resize handle.
                // It's tricky to differentiate between content-driven resize vs user resize,
                // so we rely on the inline style that the browser's resize handler sets.
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
            <div
                style={{
                    display: (viewport === 'mobile' && hideOnMobile) ? 'none' : (viewport === 'desktop' && hideOnDesktop) ? 'none' : 'flex',
                    flexDirection,
                    alignItems,
                    justifyContent,
                    padding,
                    margin,
                    backgroundColor,
                    border: `${borderWidth} solid ${borderColor}`,
                    borderRadius,
                    boxSizing: 'border-box',
                    width: '100%',
                    height: '100%',
                    minHeight: '50px',
                }}
            >
                {children}
            </div>
        </DraggableResizeable>
    );
};

export const ContainerSettings = () => {
    const { setProp, props } = useNode((node) => ({
        props: node.data.props
    }));

    return (
        <div className="stack-lg" style={{ padding: '16px' }}>
            <div className="settings-card">
                <div className="settings-card-header">📏 Dimensions & Layout</div>
                <div className="grid-2">
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
                        <label className="label-pro">Direction (Flex)</label>
                        <select className="input-pro" value={props.flexDirection} onChange={e => setProp((p: any) => p.flexDirection = e.target.value)}>
                            <option value="row">Horizontal (Row)</option>
                            <option value="column">Vertical (Column)</option>
                        </select>
                    </div>
                    <div>
                        <label className="label-pro">Alignement vertical</label>
                        <select className="input-pro" value={props.alignItems} onChange={e => setProp((p: any) => p.alignItems = e.target.value)}>
                            <option value="flex-start">Début</option>
                            <option value="center">Centre</option>
                            <option value="flex-end">Fin</option>
                            <option value="stretch">Étirer</option>
                        </select>
                    </div>
                </div>
                <div style={{ marginTop: '1rem' }}>
                    <label className="label-pro">Alignement horizontal</label>
                    <select className="input-pro" value={props.justifyContent} onChange={e => setProp((p: any) => p.justifyContent = e.target.value)}>
                        <option value="flex-start">Début</option>
                        <option value="center">Centre</option>
                        <option value="flex-end">Fin</option>
                        <option value="space-between">Espacé</option>
                    </select>
                </div>
            </div>

            <div className="settings-card">
                <div className="settings-card-header">🎨 Apparence</div>
                <div className="grid-2">
                    <div>
                        <label className="label-pro">Fond</label>
                        <input type="color" className="input-pro" style={{ height: '40px', padding: 0 }} value={props.backgroundColor} onChange={e => setProp((p: any) => p.backgroundColor = e.target.value)} />
                    </div>
                    <div>
                        <label className="label-pro">Bordure</label>
                        <input type="color" className="input-pro" style={{ height: '40px', padding: 0 }} value={props.borderColor} onChange={e => setProp((p: any) => p.borderColor = e.target.value)} />
                    </div>
                </div>

                <div className="grid-2" style={{ marginTop: '1rem' }}>
                    <div>
                        <label className="label-pro">Épaisseur bordure</label>
                        <input className="input-pro" value={props.borderWidth} onChange={e => setProp((p: any) => p.borderWidth = e.target.value)} />
                    </div>
                    <div>
                        <label className="label-pro">Arrondi (Border-radius)</label>
                        <input className="input-pro" value={props.borderRadius} onChange={e => setProp((p: any) => p.borderRadius = e.target.value)} />
                    </div>
                </div>
            </div>

            <div className="settings-card">
                <div className="settings-card-header">📐 Espacements</div>
                <div className="grid-2">
                    <div>
                        <label className="label-pro">Padding interne</label>
                        <input className="input-pro" value={props.padding} onChange={e => setProp((p: any) => p.padding = e.target.value)} />
                    </div>
                    <div>
                        <label className="label-pro">Margin (Marge ext.)</label>
                        <input className="input-pro" value={props.margin} onChange={e => setProp((p: any) => p.margin = e.target.value)} />
                    </div>
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

ContainerNode.craft = {
    props: {
        width: '100%',
        height: 'auto',
        flexDirection: 'column',
        alignItems: 'flex-start',
        justifyContent: 'flex-start',
        padding: '16px',
        margin: '0px',
        backgroundColor: 'transparent',
        borderWidth: '0px',
        borderColor: '#000000',
        borderRadius: '0px',
        position: 'relative',
        top: 'auto',
        left: 'auto',
        right: 'auto',
        bottom: 'auto',
        zIndex: 1
    },
    related: {
        settings: ContainerSettings
    }
};
