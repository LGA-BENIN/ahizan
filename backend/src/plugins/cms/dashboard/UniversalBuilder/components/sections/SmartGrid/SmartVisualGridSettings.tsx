import React, { useEffect, useState, useRef } from 'react';
import { Editor, Frame, Element, useEditor, useNode } from '@craftjs/core';
import { GridRoot } from './craft/GridRoot';
import { GridItem } from './craft/GridItem';

const AutoSaver = ({ onSave }: { onSave: (data: string, silent?: boolean) => void }) => {
    const { query, state } = useEditor((state) => ({ state }));
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const lastSavedRef = useRef<string>('');

    useEffect(() => {
        if (!lastSavedRef.current) {
            lastSavedRef.current = query.serialize();
            return;
        }

        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
            const currentJson = query.serialize();
            if (currentJson !== lastSavedRef.current) {
                lastSavedRef.current = currentJson;
                onSave(currentJson, true); // true = silent save
            }
        }, 1000);

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [state, query, onSave]);

    return null;
};

const Toolbox = () => {
    const { connectors: { create } } = useEditor();
    return (
        <div style={{ padding: '16px', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '8px' }}>
            <div
                ref={(ref: any) => create(ref, <GridItem {...({} as any)} />)}
                style={{
                    padding: '8px 16px',
                    background: 'var(--builder-bg)',
                    border: '1px dashed var(--builder-primary)',
                    borderRadius: '6px',
                    cursor: 'grab',
                    fontSize: '12px',
                    color: 'var(--builder-primary)'
                }}
            >
                ➕ Ajouter un élément
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', alignSelf: 'center' }}>
                Faites glisser vers la grille ci-dessous.
            </div>
        </div>
    );
};

const SettingsPanel = ({ onToggleSize }: { onToggleSize: () => void }) => {
    const { selected } = useEditor((state) => {
        const selectedSet = state.events.selected;
        const currentNodeId = (selectedSet && selectedSet.size > 0) ? Array.from(selectedSet)[0] : 'ROOT';
        let selected;
        if (currentNodeId && state.nodes[currentNodeId]) {
            selected = {
                id: currentNodeId,
                name: state.nodes[currentNodeId].data.name,
                props: state.nodes[currentNodeId].data.props,
                parent: state.nodes[currentNodeId].data.parent,
                settings: state.nodes[currentNodeId].related && state.nodes[currentNodeId].related.settings,
                isDeletable: state.nodes[currentNodeId].data.name !== 'GridRoot'
            };
        }
        return { selected };
    });

    const { actions, query } = useEditor();

    if (!selected) {
        return (
            <div style={{ padding: '0', display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
                <div style={{ padding: '12px 16px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button 
                            onClick={onToggleSize} 
                            title="Agrandir/Réduire le panneau" 
                            style={{ background: 'none', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', padding: '2px 6px', fontSize: '12px' }}
                        >
                            ⇦⇨
                        </button>
                        <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 'bold' }}>
                            Paramètres
                        </h3>
                    </div>
                </div>
                <div style={{ padding: '16px', color: '#64748b', fontSize: '13px', textAlign: 'center' }}>
                    Sélectionnez un élément pour afficher ses paramètres.
                </div>
            </div>
        );
    }

    return (
        <div style={{ padding: '0', display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
            <div style={{ padding: '12px 16px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button 
                        onClick={onToggleSize} 
                        title="Agrandir/Réduire le panneau" 
                        style={{ background: 'none', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', padding: '2px 6px', fontSize: '12px' }}
                    >
                        ⇦⇨
                    </button>
                    <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 'bold' }}>
                        Paramètres ({selected.name})
                    </h3>
                </div>
                
                {selected.name !== 'GridRoot' && (
                    <button 
                        onClick={() => actions.selectNode('ROOT')}
                        style={{ fontSize: '11px', background: 'var(--builder-primary)', color: '#fff', border: 'none', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', fontWeight: 500 }}
                    >
                        ⬆️ Grille Globale
                    </button>
                )}

                {selected.isDeletable && (
                    <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
                        <button
                            onClick={() => {
                                if (selected.name === 'GridItem' && selected.parent) {
                                    const nodeTree = query.parseReactElement(<GridItem {...selected.props as any} />).toNodeTree();
                                    actions.addNodeTree(nodeTree, selected.parent);
                                }
                            }}
                            title="Dupliquer"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', color: '#3b82f6' }}
                        >
                            📑
                        </button>
                        <button
                            onClick={() => actions.selectNode(null as any)}
                            title="Désélectionner"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: '#64748b' }}
                        >
                            ✖
                        </button>
                        <button
                            onClick={() => actions.delete(selected.id)}
                            title="Supprimer"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}
                        >
                            🗑️
                        </button>
                    </div>
                )}
            </div>
            <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
                {selected.settings ? React.createElement(selected.settings) : null}
            </div>
        </div>
    );
};

interface TopbarProps {
    onSave: (data: string) => void;
    sidebarMode: 'hidden' | 'normal' | 'wide';
    onToggleSidebar: () => void;
}

const Topbar = ({ onSave, sidebarMode, onToggleSidebar }: TopbarProps) => {
    const { query } = useEditor();

    return (
        <div style={{ padding: '12px 16px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#0f172a' }}>
                    Grille Visuelle Intelligente
                </h2>
                <button 
                    onClick={onToggleSidebar}
                    className="btn-pro" 
                    style={{ fontSize: '12px', padding: '4px 8px', height: 'auto' }}
                >
                    {sidebarMode === 'hidden' ? 'Afficher les paramètres' : 'Masquer les paramètres'}
                </button>
            </div>
            <button
                onClick={() => {
                    const json = query.serialize();
                    onSave(json);
                }}
                className="btn-pro btn-pro-primary"
                style={{ height: '36px', padding: '0 16px', fontSize: '13px' }}
            >
                Enregistrer la section
            </button>
        </div>
    );
};

export interface SmartVisualGridSettingsProps {
    data: any;
    onSave: (data: string) => void;
}

export const SmartVisualGridSettings = ({ data, onSave }: SmartVisualGridSettingsProps) => {
    const [sidebarMode, setSidebarMode] = useState<'hidden' | 'normal' | 'wide'>('normal');

    // Determine initial state
    const jsonToLoad = typeof data === 'string' ? data : JSON.stringify(data);
    const hasData = jsonToLoad && jsonToLoad !== '{}' && jsonToLoad.includes('GridRoot');

    let sidebarWidth = '320px';
    if (sidebarMode === 'hidden') sidebarWidth = '0px';
    if (sidebarMode === 'wide') sidebarWidth = '450px';

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '600px', maxHeight: 'calc(100vh - 200px)', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
            <Editor resolver={{ GridRoot, GridItem, Element }}>
                <AutoSaver onSave={onSave as any} />
                <Topbar 
                    onSave={onSave} 
                    sidebarMode={sidebarMode} 
                    onToggleSidebar={() => setSidebarMode(prev => prev === 'hidden' ? 'normal' : 'hidden')} 
                />
                
                <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                    {/* Main Canvas Area */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRight: sidebarMode !== 'hidden' ? '1px solid #e2e8f0' : 'none', minWidth: 0 }}>
                        <Toolbox />
                        <div style={{ flex: 1, padding: '24px', overflow: 'auto', background: '#f1f5f9' }}>
                            <div style={{ background: '#fff', minHeight: '400px', minWidth: '1024px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', borderRadius: '8px', overflow: 'hidden' }}>
                                <Frame data={hasData ? jsonToLoad : undefined}>
                                    <Element is={GridRoot} canvas {...({} as any)}>
                                        <GridItem {...({} as any)} />
                                        <GridItem {...({} as any)} />
                                        <GridItem {...({} as any)} />
                                        <GridItem {...({} as any)} />
                                    </Element>
                                </Frame>
                            </div>
                        </div>
                    </div>

                    {/* Settings Sidebar */}
                    <div style={{ width: sidebarWidth, transition: 'width 0.3s ease', background: '#fff', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        {sidebarMode !== 'hidden' && (
                            <div style={{ minWidth: sidebarWidth === '450px' ? '450px' : '320px', width: '100%', flex: 1, minHeight: 0 }}>
                                <SettingsPanel onToggleSize={() => setSidebarMode(prev => prev === 'wide' ? 'normal' : 'wide')} />
                            </div>
                        )}
                    </div>
                </div>
            </Editor>
        </div>
    );
};
