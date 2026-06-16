import React, { useState, useEffect, useRef, createContext, useContext } from 'react';
import { Editor, Frame, Element, useEditor } from '@craftjs/core';
import { FreeformRoot } from './FreeformRoot';
import { ContainerNode } from './ContainerNode';
import { TextNode } from './TextNode';
import { ImageNode } from './ImageNode';
import { ButtonNode } from './ButtonNode';

export const ViewportContext = createContext<{ viewport: 'desktop' | 'mobile'; setViewport: (v: 'desktop' | 'mobile') => void }>({
    viewport: 'desktop',
    setViewport: () => {}
});

export const useViewport = () => useContext(ViewportContext);

const AutoSaver = ({ onSave }: { onSave: (data: string, silent?: boolean) => void }) => {
    const { query, state } = useEditor((state) => ({ state }));
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const lastSavedRef = useRef<string>('');
    const onSaveRef = useRef(onSave);
    const queryRef = useRef(query);

    useEffect(() => {
        onSaveRef.current = onSave;
        queryRef.current = query;
    }, [onSave, query]);

    useEffect(() => {
        lastSavedRef.current = query.serialize();
    }, []);

    useEffect(() => {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
            const currentJson = query.serialize();
            if (currentJson !== lastSavedRef.current) {
                lastSavedRef.current = currentJson;
                onSave(currentJson, true); // silent save
            }
        }, 1000);

        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
                const currentJson = queryRef.current.serialize();
                if (currentJson !== lastSavedRef.current) {
                    lastSavedRef.current = currentJson;
                    onSaveRef.current(currentJson, true);
                }
            }
        };
    }, [state]);

    return null;
};

const Toolbox = () => {
    const { connectors: { create } } = useEditor();
    
    return (
        <div style={{ display: 'flex', gap: '8px', padding: '12px 16px', background: '#ffffff', borderBottom: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', display: 'flex', alignItems: 'center', marginRight: '16px' }}>
                🧰 Composants :
            </div>
            
            <button 
                ref={(ref: any) => create(ref, <Element is={ContainerNode} canvas />)}
                style={{ padding: '6px 12px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.8rem', cursor: 'grab', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
                📦 Conteneur
            </button>

            <button 
                ref={(ref: any) => create(ref, <TextNode />)}
                style={{ padding: '6px 12px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.8rem', cursor: 'grab', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
                📝 Texte
            </button>

            <button 
                ref={(ref: any) => create(ref, <ImageNode />)}
                style={{ padding: '6px 12px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.8rem', cursor: 'grab', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
                🖼️ Image
            </button>

            <button 
                ref={(ref: any) => create(ref, <ButtonNode />)}
                style={{ padding: '6px 12px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.8rem', cursor: 'grab', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
                🔘 Bouton
            </button>
        </div>
    );
};

const SettingsPanel = ({ sidebarMode }: { sidebarMode: 'hidden' | 'normal' | 'wide' }) => {
    const { selected, selectedId } = useEditor((state) => {
        const selectedSet = state.events.selected;
        let selectedId = null;
        if (selectedSet && selectedSet.size > 0) {
            selectedId = Array.from(selectedSet)[0];
        }
        let selectedNode;
        if (selectedId) {
            selectedNode = state.nodes[selectedId as string];
        }
        return { selected: selectedNode, selectedId, parentId: selectedNode?.data.parent };
    });

    const { actions } = useEditor();

    if (sidebarMode === 'hidden') return null;

    const width = sidebarMode === 'wide' ? '450px' : '320px';

    return (
        <div style={{ width, borderLeft: '1px solid #e2e8f0', background: '#ffffff', display: 'flex', flexDirection: 'column', flexShrink: 0, transition: 'width 0.2s' }}>
            <div style={{ padding: '16px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '1.2rem' }}>⚙️</span> Paramètres
                </div>
                {selectedId && selectedId !== 'ROOT' && (
                    <button
                        onClick={() => actions.delete(selectedId)}
                        style={{
                            background: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5', borderRadius: '4px', padding: '4px 8px', fontSize: '0.7rem', fontWeight: 'bold', cursor: 'pointer'
                        }}
                    >
                        🗑️ Supprimer
                    </button>
                )}
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
                {selected && selected.related && selected.related.settings ? (
                    React.createElement(selected.related.settings)
                ) : (
                    <div style={{ padding: '32px 16px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                        Cliquez sur un composant pour modifier ses paramètres.
                    </div>
                )}
            </div>
        </div>
    );
};

const Topbar = ({ onSave, sidebarMode, setSidebarMode, isFullscreen, setIsFullscreen, viewport, setViewport }: any) => {
    const { query } = useEditor();
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', background: '#ffffff', borderBottom: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <h2 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a', fontWeight: 800 }}>🏗️ Constructeur Libre</h2>
                <span style={{ fontSize: '0.75rem', background: '#ecfdf5', color: '#059669', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>Drag & Drop</span>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '6px', padding: '2px', border: '1px solid #cbd5e1' }}>
                    <button
                        onClick={() => setViewport('desktop')}
                        style={{ padding: '4px 12px', background: viewport === 'desktop' ? '#ffffff' : 'transparent', border: 'none', borderRadius: '4px', boxShadow: viewport === 'desktop' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, color: viewport === 'desktop' ? '#0f172a' : '#64748b' }}
                    >
                        🖥️ PC
                    </button>
                    <button
                        onClick={() => setViewport('mobile')}
                        style={{ padding: '4px 12px', background: viewport === 'mobile' ? '#ffffff' : 'transparent', border: 'none', borderRadius: '4px', boxShadow: viewport === 'mobile' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, color: viewport === 'mobile' ? '#0f172a' : '#64748b' }}
                    >
                        📱 Mobile
                    </button>
                </div>
                
                <button 
                    onClick={() => {
                        if (sidebarMode === 'hidden') setSidebarMode('normal');
                        else if (sidebarMode === 'normal') setSidebarMode('wide');
                        else setSidebarMode('hidden');
                    }}
                    style={{
                        padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#475569', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
                    }}
                >
                    {sidebarMode === 'hidden' ? '👁️ Afficher Paramètres' : sidebarMode === 'wide' ? '👁️ Masquer Paramètres' : '⇦⇨ Élargir Paramètres'}
                </button>
                
                <button 
                    onClick={() => setIsFullscreen(!isFullscreen)}
                    style={{
                        padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', background: isFullscreen ? '#fca5a5' : '#f8fafc', color: isFullscreen ? '#b91c1c' : '#475569', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
                    }}
                >
                    {isFullscreen ? '✖️ Quitter Plein Écran' : '🔲 Plein Écran'}
                </button>
                
                <button 
                    onClick={() => onSave(query.serialize())}
                    style={{
                        padding: '8px 20px', borderRadius: '6px', border: 'none', background: '#000000', color: '#ffffff', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
                    }}
                >
                    💾 Enregistrer
                </button>
            </div>
        </div>
    );
};

export const FreeformBuilderSettings = ({ data, onSave }: any) => {
    const [sidebarMode, setSidebarMode] = useState<'hidden' | 'normal' | 'wide'>('normal');
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [viewport, setViewport] = useState<'desktop' | 'mobile'>('desktop');

    const containerStyle: React.CSSProperties = isFullscreen ? {
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 9999,
        background: '#f8fafc',
        display: 'flex',
        flexDirection: 'column',
    } : {
        display: 'flex', flexDirection: 'column', minHeight: '85vh', height: '100%', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden'
    };

    return (
        <div style={containerStyle}>
            <ViewportContext.Provider value={{ viewport, setViewport }}>
            <Editor resolver={{ FreeformRoot, ContainerNode, TextNode, ImageNode, ButtonNode, Element }}>
                <AutoSaver onSave={onSave as any} />
                <Topbar 
                    onSave={onSave} 
                    sidebarMode={sidebarMode} 
                    setSidebarMode={setSidebarMode}
                    isFullscreen={isFullscreen}
                    setIsFullscreen={setIsFullscreen}
                    viewport={viewport}
                    setViewport={setViewport}
                />
                <Toolbox />
                
                <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                    {/* Canvas Area */}
                    <div style={{ flex: 1, overflow: 'auto', padding: '2rem', display: 'flex', justifyContent: 'center' }}>
                        <div style={{ 
                            width: viewport === 'mobile' ? '375px' : '100%', 
                            transition: 'width 0.3s ease',
                            boxShadow: '0 10px 40px rgba(0,0,0,0.08)', 
                            borderRadius: '8px', 
                            overflow: 'hidden' 
                        }}>
                            <Frame data={data && Object.keys(data).length > 0 ? data : undefined}>
                                <Element is={FreeformRoot} canvas />
                            </Frame>
                        </div>
                    </div>
                    
                    {/* Settings Sidebar */}
                    <SettingsPanel sidebarMode={sidebarMode} />
                </div>
            </Editor>
            </ViewportContext.Provider>
        </div>
    );
};
