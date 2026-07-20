import React from 'react';
import { useNode } from '@craftjs/core';
import { DraggableResizeable, AdvancedSettings } from './DraggableResizeable';
import { useViewport } from './FreeformBuilderSettings';

export const ButtonNode = ({ 
    text, link, bgColor, color, padding, borderRadius, fontSize, 
    margin, position, top, left, right = 'auto', bottom = 'auto', zIndex = 1, width, height,
    mobileTop, mobileLeft, mobileWidth, mobileHeight, hideOnMobile, hideOnDesktop,
    animationType, animationDuration, animationDelay
}: any) => {
    const { viewport } = useViewport();
    const { connectors: { connect, drag }, selected, setProp } = useNode((state) => ({
        selected: state.events.selected
    }));

    return (
        <DraggableResizeable
            position={position} top={top} left={left} right={right} bottom={bottom} zIndex={zIndex} width={width} height={height}
            mobileTop={mobileTop} mobileLeft={mobileLeft} mobileWidth={mobileWidth} mobileHeight={mobileHeight}
            onSetProp={setProp}
        >
            <div style={{ display: (viewport === 'mobile' && hideOnMobile) ? 'none' : (viewport === 'desktop' && hideOnDesktop) ? 'none' : 'inline-block', width: '100%', height: '100%' }}>
            <a
                href={link || '#'}
                onClick={(e) => e.preventDefault()} // Prevent navigation in editor
                style={{
                    display: 'inline-block',
                    backgroundColor: bgColor,
                    color,
                    padding,
                    borderRadius,
                    fontSize,
                    textDecoration: 'none',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                }}
            >
                {text}
            </a>
            </div>
        </DraggableResizeable>
    );
};

export const ButtonSettings = () => {
    const { setProp, props } = useNode((node) => ({ props: node.data.props }));

    return (
        <div className="stack-lg" style={{ padding: '16px' }}>
            <div className="settings-card">
                <div className="settings-card-header">🔘 Bouton</div>
                <div style={{ marginBottom: '1rem' }}>
                    <label className="label-pro">Texte du bouton</label>
                    <input className="input-pro" value={props.text} onChange={e => setProp((p: any) => p.text = e.target.value)} />
                </div>
                <div style={{ marginBottom: '1rem' }}>
                    <label className="label-pro">Lien URL</label>
                    <input className="input-pro" value={props.link} onChange={e => setProp((p: any) => p.link = e.target.value)} placeholder="/produits" />
                </div>
                
                <div className="grid-2">
                    <div>
                        <label className="label-pro">Couleur de fond</label>
                        <input type="color" className="input-pro" style={{ height: '40px', padding: 0 }} value={props.bgColor} onChange={e => setProp((p: any) => p.bgColor = e.target.value)} />
                    </div>
                    <div>
                        <label className="label-pro">Couleur du texte</label>
                        <input type="color" className="input-pro" style={{ height: '40px', padding: 0 }} value={props.color} onChange={e => setProp((p: any) => p.color = e.target.value)} />
                    </div>
                </div>

                <div className="grid-2" style={{ marginTop: '1rem' }}>
                    <div>
                        <label className="label-pro">Padding</label>
                        <input className="input-pro" value={props.padding} onChange={e => setProp((p: any) => p.padding = e.target.value)} placeholder="12px 24px" />
                    </div>
                    <div>
                        <label className="label-pro">Arrondi (Radius)</label>
                        <input className="input-pro" value={props.borderRadius} onChange={e => setProp((p: any) => p.borderRadius = e.target.value)} />
                    </div>
                </div>
                
                <div className="grid-2" style={{ marginTop: '1rem' }}>
                    <div>
                        <label className="label-pro">Taille de police</label>
                        <input className="input-pro" value={props.fontSize} onChange={e => setProp((p: any) => p.fontSize = e.target.value)} />
                    </div>
                    <div>
                        <label className="label-pro">Marges externes</label>
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
                    <label className="label-pro">Z-Index</label>
                    <input type="number" className="input-pro" value={props.zIndex} onChange={e => setProp((p: any) => p.zIndex = parseInt(e.target.value) || 0)} />
                </div>
            </div>

            <AdvancedSettings props={props} setProp={setProp} />
        </div>
    );
};

ButtonNode.craft = {
    props: {
        text: 'Cliquez ici',
        link: '',
        bgColor: '#000000',
        color: '#ffffff',
        padding: '12px 24px',
        borderRadius: '6px',
        fontSize: '16px',
        margin: '0px',
        position: 'relative',
        top: 'auto',
        left: 'auto',
        right: 'auto',
        bottom: 'auto',
        zIndex: 1
    },
    related: { settings: ButtonSettings }
};
