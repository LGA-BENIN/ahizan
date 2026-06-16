import React, { useState, useRef, useEffect } from 'react';
import { useNode } from '@craftjs/core';
import { useViewport } from './FreeformBuilderSettings';

export const DraggableResizeable = ({ 
    children, 
    position, top, left, right, bottom, zIndex, width, height, 
    mobileTop, mobileLeft, mobileWidth, mobileHeight,
    onSetProp 
}: any) => {
    const { connectors: { connect, drag }, selected } = useNode((state) => ({
        selected: state.events.selected
    }));
    
    const [isDragging, setIsDragging] = useState(false);
    const [resizeState, setResizeState] = useState<{ active: boolean, dir: string }>({ active: false, dir: '' });
    
    const { viewport } = useViewport();

    const divRef = useRef<HTMLDivElement>(null);
    const startPos = useRef({ x: 0, y: 0 });
    const originalStyle = useRef({ top: 0, left: 0, width: 0, height: 0 });

    const isAbsolute = position === 'absolute' || position === 'fixed';

    const getNum = (val: any) => parseInt(val) || 0;

    const activeTop = viewport === 'mobile' && mobileTop ? mobileTop : top;
    const activeLeft = viewport === 'mobile' && mobileLeft ? mobileLeft : left;
    const activeWidth = viewport === 'mobile' && mobileWidth ? mobileWidth : width;
    const activeHeight = viewport === 'mobile' && mobileHeight ? mobileHeight : height;

    const handleMouseDown = (e: React.MouseEvent) => {
        if (!isAbsolute || !selected) return;
        // Don't drag if clicking on a resize handle
        if ((e.target as HTMLElement).className.includes('resize-handle')) return;
        
        e.stopPropagation();
        setIsDragging(true);
        startPos.current = { x: e.clientX, y: e.clientY };
        originalStyle.current = { 
            top: getNum(activeTop), left: getNum(activeLeft), 
            width: divRef.current?.offsetWidth || getNum(activeWidth), 
            height: divRef.current?.offsetHeight || getNum(activeHeight) 
        };
    };

    const handleResizeMouseDown = (e: React.MouseEvent, dir: string) => {
        e.stopPropagation();
        setResizeState({ active: true, dir });
        startPos.current = { x: e.clientX, y: e.clientY };
        originalStyle.current = { 
            top: getNum(activeTop), left: getNum(activeLeft), 
            width: divRef.current?.offsetWidth || getNum(activeWidth), 
            height: divRef.current?.offsetHeight || getNum(activeHeight) 
        };
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDragging) {
                const dx = e.clientX - startPos.current.x;
                const dy = e.clientY - startPos.current.y;
                onSetProp((props: any) => {
                    if (viewport === 'mobile') {
                        props.mobileLeft = `${originalStyle.current.left + dx}px`;
                        props.mobileTop = `${originalStyle.current.top + dy}px`;
                        // Default fallback width/height for mobile if not set yet
                        if (!props.mobileWidth) props.mobileWidth = props.width;
                        if (!props.mobileHeight) props.mobileHeight = props.height;
                    } else {
                        props.left = `${originalStyle.current.left + dx}px`;
                        props.top = `${originalStyle.current.top + dy}px`;
                    }
                });
            } else if (resizeState.active) {
                const dx = e.clientX - startPos.current.x;
                const dy = e.clientY - startPos.current.y;
                
                onSetProp((props: any) => {
                    let newWidth = originalStyle.current.width;
                    let newHeight = originalStyle.current.height;
                    let newLeft = originalStyle.current.left;
                    let newTop = originalStyle.current.top;

                    if (resizeState.dir.includes('e')) newWidth += dx;
                    if (resizeState.dir.includes('s')) newHeight += dy;
                    if (resizeState.dir.includes('w')) {
                        newWidth -= dx;
                        if (isAbsolute) newLeft += dx;
                    }
                    if (resizeState.dir.includes('n')) {
                        newHeight -= dy;
                        if (isAbsolute) newTop += dy;
                    }

                    if (viewport === 'mobile') {
                        if (newWidth > 20) props.mobileWidth = `${newWidth}px`;
                        if (newHeight > 20) props.mobileHeight = `${newHeight}px`;
                        if (isAbsolute) {
                            props.mobileLeft = `${newLeft}px`;
                            props.mobileTop = `${newTop}px`;
                        }
                    } else {
                        if (newWidth > 20) props.width = `${newWidth}px`;
                        if (newHeight > 20) props.height = `${newHeight}px`;
                        if (isAbsolute) {
                            props.left = `${newLeft}px`;
                            props.top = `${newTop}px`;
                        }
                    }
                });
            }
        };

        const handleMouseUp = () => {
            setIsDragging(false);
            setResizeState({ active: false, dir: '' });
        };

        if (isDragging || resizeState.active) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, resizeState, onSetProp, isAbsolute, viewport, activeTop, activeLeft, activeWidth, activeHeight]);

    // Handle CSS for handles
    const handleStyle = (dir: string): React.CSSProperties => {
        const base: React.CSSProperties = {
            position: 'absolute',
            width: '10px', height: '10px',
            background: 'white',
            border: '2px solid var(--builder-primary, #3b82f6)',
            borderRadius: '50%',
            zIndex: 10
        };
        if (dir === 'nw') return { ...base, top: -5, left: -5, cursor: 'nwse-resize' };
        if (dir === 'ne') return { ...base, top: -5, right: -5, cursor: 'nesw-resize' };
        if (dir === 'sw') return { ...base, bottom: -5, left: -5, cursor: 'nesw-resize' };
        if (dir === 'se') return { ...base, bottom: -5, right: -5, cursor: 'nwse-resize' };
        if (dir === 'n') return { ...base, top: -5, left: '50%', transform: 'translateX(-50%)', cursor: 'ns-resize' };
        if (dir === 's') return { ...base, bottom: -5, left: '50%', transform: 'translateX(-50%)', cursor: 'ns-resize' };
        if (dir === 'e') return { ...base, top: '50%', right: -5, transform: 'translateY(-50%)', cursor: 'ew-resize' };
        if (dir === 'w') return { ...base, top: '50%', left: -5, transform: 'translateY(-50%)', cursor: 'ew-resize' };
        return base;
    };

    return (
        <div
            ref={(ref: any) => { connect(drag(ref)); divRef.current = ref; }}
            onMouseDown={handleMouseDown}
            style={{
                position, top: activeTop, left: activeLeft, right, bottom, zIndex, width: activeWidth, height: activeHeight,
                outline: selected ? '2px dashed var(--builder-primary, #3b82f6)' : 'none',
                cursor: isAbsolute && selected ? 'move' : 'default',
            }}
        >
            <div style={{ pointerEvents: (isDragging || resizeState.active) ? 'none' : 'auto', width: '100%', height: '100%' }}>
                {children}
            </div>

            {selected && (
                <>
                    {['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'].map((dir) => (
                        <div
                            key={dir}
                            className={`resize-handle handle-${dir}`}
                            style={handleStyle(dir)}
                            onMouseDown={(e) => handleResizeMouseDown(e, dir)}
                        />
                    ))}
                </>
            )}
        </div>
    );
};

export const AdvancedSettings = ({ props, setProp }: any) => {
    return (
        <>
            <div className="settings-card">
                <div className="settings-card-header">💫 Animations (Storefront)</div>
                <div>
                    <label className="label-pro">Type d'animation</label>
                    <select className="input-pro" value={props.animationType || 'none'} onChange={e => setProp((p: any) => p.animationType = e.target.value)}>
                        <option value="none">Aucune</option>
                        <option value="fade-in">Fondu (Fade In)</option>
                        <option value="slide-up">Glissement Haut (Slide Up)</option>
                        <option value="slide-left">Glissement Gauche (Slide Left)</option>
                        <option value="slide-right">Glissement Droite (Slide Right)</option>
                        <option value="zoom-in">Zoom In</option>
                        <option value="bounce">Rebond (Bounce)</option>
                    </select>
                </div>
                <div style={{ marginTop: '1rem' }}>
                    <label className="label-pro">Durée (ex: 0.5s, 1s)</label>
                    <input className="input-pro" value={props.animationDuration || '0.5s'} onChange={e => setProp((p: any) => p.animationDuration = e.target.value)} />
                </div>
                <div style={{ marginTop: '1rem' }}>
                    <label className="label-pro">Délai (ex: 0s, 0.5s)</label>
                    <input className="input-pro" value={props.animationDelay || '0s'} onChange={e => setProp((p: any) => p.animationDelay = e.target.value)} />
                </div>
            </div>

            <div className="settings-card">
                <div className="settings-card-header">👁️ Visibilité</div>
                <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input type="checkbox" checked={props.hideOnDesktop || false} onChange={e => setProp((p: any) => p.hideOnDesktop = e.target.checked)} />
                    <label style={{ fontSize: '0.85rem', color: '#475569' }}>Cacher sur PC (Desktop)</label>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input type="checkbox" checked={props.hideOnMobile || false} onChange={e => setProp((p: any) => p.hideOnMobile = e.target.checked)} />
                    <label style={{ fontSize: '0.85rem', color: '#475569' }}>Cacher sur Mobile</label>
                </div>
            </div>
        </>
    );
};
