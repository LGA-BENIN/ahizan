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
    onSave: () => void;
    sidebarMode: 'hidden' | 'normal' | 'wide';
    onToggleSidebar: () => void;
}

const Topbar = ({ onSave, sidebarMode, onToggleSidebar }: TopbarProps) => {
    return (
        <div style={{ padding: '8px 16px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#475569' }}>
                    Éditeur de Grille
                </span>
                <button 
                    onClick={onToggleSidebar}
                    className="btn-pro" 
                    style={{ fontSize: '12px', padding: '4px 8px', height: 'auto', background: '#f1f5f9', color: '#334155' }}
                >
                    {sidebarMode === 'hidden' ? 'Afficher les paramètres' : 'Masquer les paramètres'}
                </button>
            </div>
            <button
                onClick={onSave}
                className="btn-pro btn-pro-primary"
                style={{ height: '32px', padding: '0 16px', fontSize: '13px' }}
            >
                Mettre à jour la section
            </button>
        </div>
    );
};

interface SmartVisualGridEditorTabProps {
    craftState: string;
    onSaveCraftState: (data: string, silent?: boolean) => void;
    onForceSave: () => void;
}

const SmartVisualGridEditorTab = ({ craftState, onSaveCraftState, onForceSave }: SmartVisualGridEditorTabProps) => {
    const [sidebarMode, setSidebarMode] = useState<'hidden' | 'normal' | 'wide'>('normal');

    const hasData = craftState && craftState !== '{}' && craftState.includes('GridRoot');

    let sidebarWidth = '320px';
    if (sidebarMode === 'hidden') sidebarWidth = '0px';
    if (sidebarMode === 'wide') sidebarWidth = '450px';

    return (
        <Editor resolver={{ GridRoot, GridItem, Element }}>
            <AutoSaver onSave={onSaveCraftState} />
            <Topbar 
                onSave={onForceSave} 
                sidebarMode={sidebarMode} 
                onToggleSidebar={() => setSidebarMode(prev => prev === 'hidden' ? 'normal' : 'hidden')} 
            />
            
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRight: sidebarMode !== 'hidden' ? '1px solid #e2e8f0' : 'none', minWidth: 0 }}>
                    <Toolbox />
                    <div style={{ flex: 1, padding: '24px', overflow: 'auto', background: '#f1f5f9' }}>
                        <div style={{ background: '#fff', minHeight: '400px', minWidth: '1024px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', borderRadius: '8px', overflow: 'hidden' }}>
                            <Frame data={hasData ? craftState : undefined}>
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

                <div style={{ width: sidebarWidth, transition: 'width 0.3s ease', background: '#fff', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    {sidebarMode !== 'hidden' && (
                        <div style={{ minWidth: sidebarWidth === '450px' ? '450px' : '320px', width: '100%', flex: 1, minHeight: 0 }}>
                            <SettingsPanel onToggleSize={() => setSidebarMode(prev => prev === 'wide' ? 'normal' : 'wide')} />
                        </div>
                    )}
                </div>
            </div>
        </Editor>
    );
};

export interface SmartVisualGridSettingsProps {
    data: any;
    onSave: (data: string) => void;
}

export const SmartVisualGridSettings = ({ data, onSave }: SmartVisualGridSettingsProps) => {
    // Determine initial state
    const initData = typeof data === 'string' ? JSON.parse(data || '{}') : data;
    const isGrouped = initData.isGrouped === true;

    const [config, setConfig] = useState(() => {
        if (isGrouped) return initData;
        
        // Migrate legacy to default tab
        const defaultCraftState = typeof data === 'string' ? data : JSON.stringify(data);
        return {
            isGrouped: true,
            groupStyle: 'pillule',
            activeColor: '#ef4444', // Default to a brand color, e.g., red
            tabs: [
                { id: 't_' + Date.now(), label: 'Onglet par défaut', craftState: defaultCraftState && defaultCraftState !== '{}' ? defaultCraftState : '' }
            ]
        };
    });

    const [activeTabId, setActiveTabId] = useState(config.tabs[0]?.id);
    const activeTab = config.tabs.find((t: any) => t.id === activeTabId) || config.tabs[0];
    const lastSavedRef = useRef<string>(JSON.stringify(config));

    // Global Auto-save for the entire configuration
    useEffect(() => {
        const currentJson = JSON.stringify(config);
        if (currentJson === lastSavedRef.current) return;

        const timer = setTimeout(() => {
            lastSavedRef.current = currentJson;
            // The SectionEditorFactory's handleSave accepts a second 'silent' argument
            (onSave as any)(currentJson, true);
        }, 1000);

        return () => clearTimeout(timer);
    }, [config, onSave]);

    const updateConfig = (newConfig: any) => {
        setConfig(newConfig);
    };

    const handleAddTab = () => {
        const newTab = { id: 't_' + Date.now(), label: 'Nouveau Groupe', craftState: '' };
        updateConfig({ ...config, tabs: [...config.tabs, newTab] });
        setActiveTabId(newTab.id);
    };

    const handleRemoveTab = (id: string) => {
        if (config.tabs.length <= 1) return; // Must have at least one tab
        const newTabs = config.tabs.filter((t: any) => t.id !== id);
        updateConfig({ ...config, tabs: newTabs });
        if (activeTabId === id) setActiveTabId(newTabs[0].id);
    };

    const handleUpdateTabLabel = (id: string, label: string) => {
        updateConfig({
            ...config,
            tabs: config.tabs.map((t: any) => t.id === id ? { ...t, label } : t)
        });
    };

    const handleSaveCraftState = (craftState: string) => {
        updateConfig({
            ...config,
            tabs: config.tabs.map((t: any) => t.id === activeTabId ? { ...t, craftState } : t)
        });
    };

    const handleForceSave = () => {
        const currentJson = JSON.stringify(config);
        lastSavedRef.current = currentJson;
        (onSave as any)(currentJson, false);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '700px', maxHeight: 'calc(100vh - 100px)', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
            {/* TABS MANAGER UI */}
            <div style={{ padding: '16px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#0f172a' }}>
                            Grille Visuelle Intelligente (Groupes)
                        </h2>
                        <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748b' }}>
                            Gérez plusieurs grilles et affichez-les sous forme d'onglets (pillules ou rectangles).
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Style des onglets :</label>
                            <select 
                                value={config.groupStyle || 'pillule'} 
                                onChange={(e) => updateConfig({...config, groupStyle: e.target.value})}
                                style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                            >
                                <option value="pillule">Pillules (Arrondies)</option>
                                <option value="rectangle">Rectangles</option>
                            </select>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Couleur active :</label>
                            <input 
                                type="color" 
                                value={config.activeColor || '#ef4444'} 
                                onChange={(e) => updateConfig({...config, activeColor: e.target.value})}
                                style={{ width: '32px', height: '32px', padding: '0', border: 'none', cursor: 'pointer', borderRadius: '4px' }}
                            />
                        </div>
                        <button onClick={handleForceSave} className="btn-pro btn-pro-primary">
                            💾 Tout Enregistrer
                        </button>
                    </div>
                </div>

                {/* Tabs List */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                    {config.tabs.map((tab: any) => (
                        <div 
                            key={tab.id}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '6px 12px',
                                background: activeTabId === tab.id ? config.activeColor || '#ef4444' : '#fff',
                                color: activeTabId === tab.id ? '#fff' : '#475569',
                                border: `1px solid ${activeTabId === tab.id ? config.activeColor || '#ef4444' : '#cbd5e1'}`,
                                borderRadius: config.groupStyle === 'rectangle' ? '6px' : '999px',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                fontWeight: activeTabId === tab.id ? 'bold' : 'normal'
                            }}
                            onClick={() => setActiveTabId(tab.id)}
                        >
                            {activeTabId === tab.id ? (
                                <input 
                                    type="text" 
                                    value={tab.label}
                                    onChange={(e) => handleUpdateTabLabel(tab.id, e.target.value)}
                                    style={{ 
                                        background: 'transparent', 
                                        border: 'none', 
                                        color: 'inherit', 
                                        fontWeight: 'inherit',
                                        width: `${Math.max(tab.label.length, 5) * 8}px`,
                                        outline: 'none'
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                />
                            ) : (
                                <span>{tab.label}</span>
                            )}
                            
                            {config.tabs.length > 1 && (
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handleRemoveTab(tab.id); }}
                                    style={{ 
                                        background: 'none', border: 'none', 
                                        color: activeTabId === tab.id ? '#fff' : '#94a3b8', 
                                        cursor: 'pointer', padding: '0 4px', fontSize: '14px',
                                        opacity: 0.7
                                    }}
                                    title="Supprimer"
                                >
                                    ×
                                </button>
                            )}
                        </div>
                    ))}
                    <button 
                        onClick={handleAddTab}
                        style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            width: '32px', height: '32px',
                            background: '#e2e8f0', color: '#475569',
                            border: 'none', borderRadius: '50%', cursor: 'pointer',
                            fontSize: '18px', fontWeight: 'bold'
                        }}
                        title="Ajouter un groupe"
                    >
                        +
                    </button>
                </div>
            </div>

            {/* CRAFTJS EDITOR FOR ACTIVE TAB */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <SmartVisualGridEditorTab 
                    key={activeTabId} 
                    craftState={activeTab.craftState} 
                    onSaveCraftState={handleSaveCraftState}
                    onForceSave={handleForceSave}
                />
            </div>
        </div>
    );
};
