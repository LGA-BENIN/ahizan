import React from 'react';
import { useNode } from '@craftjs/core';
import { DraggableResizeable, AdvancedSettings } from './DraggableResizeable';
import { useViewport } from './FreeformBuilderSettings';

export const TextNode = ({ text, fontSize, textAlign, color, fontWeight, margin, width, height, position, top, left, right = 'auto', bottom = 'auto', zIndex = 1, mobileTop, mobileLeft, mobileWidth, mobileHeight, hideOnMobile, hideOnDesktop, animationType, animationDuration, animationDelay }: any) => {
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
            <div 
                style={{
                    display: (viewport === 'mobile' && hideOnMobile) ? 'none' : (viewport === 'desktop' && hideOnDesktop) ? 'none' : 'block',
                    fontSize,
                    textAlign,
                    color,
                    fontWeight,
                    margin,
                    width: '100%',
                    height: '100%',
                    cursor: 'text',
                }}
            >
                <div 
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => setProp((props: any) => props.text = e.currentTarget.innerText)}
                    style={{ outline: 'none', width: '100%', height: '100%' }}
                >
                    {text}
                </div>
            </div>
        </DraggableResizeable>
    );
};

export const TextSettings = () => {
    const { setProp, props } = useNode((node) => ({ props: node.data.props }));

    return (
        <div className="stack-lg" style={{ padding: '16px' }}>
            <div className="settings-card">
                <div className="settings-card-header">📝 Texte</div>
                <div className="grid-2">
                    <div>
                        <label className="label-pro">Taille de police</label>
                        <input className="input-pro" value={props.fontSize} onChange={e => setProp((p: any) => p.fontSize = e.target.value)} />
                    </div>
                    <div>
                        <label className="label-pro">Couleur</label>
                        <input type="color" className="input-pro" style={{ height: '40px', padding: 0 }} value={props.color} onChange={e => setProp((p: any) => p.color = e.target.value)} />
                    </div>
                </div>
                <div className="grid-2" style={{ marginTop: '1rem' }}>
                    <div>
                        <label className="label-pro">Alignement</label>
                        <select className="input-pro" value={props.textAlign} onChange={e => setProp((p: any) => p.textAlign = e.target.value)}>
                            <option value="left">Gauche</option>
                            <option value="center">Centre</option>
                            <option value="right">Droite</option>
                        </select>
                    </div>
                    <div>
                        <label className="label-pro">Poids (Gras)</label>
                        <select className="input-pro" value={props.fontWeight} onChange={e => setProp((p: any) => p.fontWeight = e.target.value)}>
                            <option value="normal">Normal</option>
                            <option value="bold">Gras</option>
                            <option value="900">Très gras</option>
                        </select>
                    </div>
                </div>
                <div className="grid-2" style={{ marginTop: '1rem' }}>
                    <div>
                        <label className="label-pro">Largeur</label>
                        <input className="input-pro" value={props.width} onChange={e => setProp((p: any) => p.width = e.target.value)} placeholder="ex: 100% ou 200px" />
                    </div>
                    <div>
                        <label className="label-pro">Hauteur</label>
                        <input className="input-pro" value={props.height} onChange={e => setProp((p: any) => p.height = e.target.value)} placeholder="ex: auto ou 100px" />
                    </div>
                </div>
                <div style={{ marginTop: '1rem' }}>
                    <label className="label-pro">Marges externes</label>
                    <input className="input-pro" value={props.margin} onChange={e => setProp((p: any) => p.margin = e.target.value)} placeholder="ex: 10px 0" />
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

TextNode.craft = {
    props: {
        text: 'Nouveau texte',
        fontSize: '16px',
        textAlign: 'left',
        color: '#333333',
        fontWeight: 'normal',
        margin: '0px',
        width: '100%',
        height: 'auto',
        position: 'relative',
        top: 'auto',
        left: 'auto',
        right: 'auto',
        bottom: 'auto',
        zIndex: 1
    },
    related: { settings: TextSettings }
};
