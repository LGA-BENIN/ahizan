import React, { useEffect, useState, useRef } from 'react';
import { Editor, Frame, Element, useEditor, useNode } from '@craftjs/core';
import { GridRoot } from './craft/GridRoot';
import { GridItem } from './craft/GridItem';

// Auto-saver for CraftJS internal state with clean initial mount protection
const AutoSaver = ({ onSave }: { onSave: (data: string, silent?: boolean) => void }) => {
    const { query, state } = useEditor((state) => ({ state }));
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const lastSavedRef = useRef<string>('');
    const isInitializedRef = useRef<boolean>(false);

    useEffect(() => {
        if (!isInitializedRef.current) {
            try {
                lastSavedRef.current = query.serialize();
            } catch (e) {}
            isInitializedRef.current = true;
            return;
        }

        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
            try {
                const currentJson = query.serialize();
                if (currentJson && currentJson !== lastSavedRef.current) {
                    lastSavedRef.current = currentJson;
                    onSave(currentJson, true); // true = silent background save
                }
            } catch (e) {}
        }, 500);

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [state, query, onSave]);

    return null;
};

// Side Inspector Panel (Sticky on the right, independently scrollable)
const SideInspectorPanel = () => {
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
            <div style={{ padding: '32px 20px', textAlign: 'center', color: '#64748b', fontSize: '13px', overflowY: 'auto' }}>
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>👆</div>
                <div style={{ fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Aucun élément sélectionné</div>
                <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>
                    Cliquez sur une carte dans l'aperçu ou sur la grille globale pour afficher ses options.
                </p>
                <button
                    onClick={() => actions.selectNode('ROOT')}
                    style={{
                        marginTop: '16px',
                        padding: '8px 14px',
                        background: '#eff6ff',
                        color: '#2563eb',
                        border: '1px solid #bfdbfe',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer'
                    }}
                >
                    ⚙️ Paramètres Globaux de la Grille
                </button>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, background: '#ffffff', overflow: 'hidden' }}>
            {/* Inspector Header */}
            <div style={{
                padding: '12px 16px',
                background: '#f8fafc',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                flexShrink: 0
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                        <span style={{ fontSize: '16px' }}>{selected.name === 'GridRoot' ? '⚙️' : '🗂️'}</span>
                        <div style={{ minWidth: 0 }}>
                            <div style={{
                                fontSize: '13px',
                                fontWeight: 800,
                                color: '#0f172a',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                            }}>
                                {selected.name === 'GridRoot' ? 'Paramètres Globaux' : (selected.props?.titleText || 'Carte Produit')}
                            </div>
                            <div style={{ fontSize: '11px', color: '#64748b' }}>
                                {selected.name === 'GridRoot' ? 'Structure & Grille' : 'Élément sélectionné'}
                            </div>
                        </div>
                    </div>

                    {selected.name !== 'GridRoot' && (
                        <button
                            onClick={() => actions.selectNode('ROOT')}
                            title="Revenir aux réglages globaux"
                            style={{
                                fontSize: '11px',
                                background: '#eff6ff',
                                color: '#2563eb',
                                border: '1px solid #bfdbfe',
                                borderRadius: '6px',
                                padding: '4px 8px',
                                cursor: 'pointer',
                                fontWeight: 700,
                                flexShrink: 0
                            }}
                        >
                            🌐 Grille globale
                        </button>
                    )}
                </div>

                {/* Card Quick Action Bar */}
                {selected.isDeletable && (
                    <div style={{ display: 'flex', gap: '6px', borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}>
                        <button
                            onClick={() => {
                                if (selected.name === 'GridItem' && selected.parent) {
                                    const nodeTree = query.parseReactElement(<GridItem {...selected.props as any} />).toNodeTree();
                                    actions.addNodeTree(nodeTree, selected.parent);
                                }
                            }}
                            title="Dupliquer cette carte"
                            style={{
                                flex: 1,
                                background: '#f8fafc',
                                border: '1px solid #cbd5e1',
                                borderRadius: '6px',
                                padding: '5px 8px',
                                cursor: 'pointer',
                                fontSize: '11px',
                                fontWeight: 600,
                                color: '#2563eb',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '4px'
                            }}
                        >
                            📑 Dupliquer
                        </button>
                        <button
                            onClick={() => actions.selectNode(null as any)}
                            title="Désélectionner"
                            style={{
                                background: '#f8fafc',
                                border: '1px solid #cbd5e1',
                                borderRadius: '6px',
                                padding: '5px 8px',
                                cursor: 'pointer',
                                fontSize: '11px',
                                color: '#64748b'
                            }}
                        >
                            ✖ Fermer
                        </button>
                        <button
                            onClick={() => actions.delete(selected.id)}
                            title="Supprimer cette carte"
                            style={{
                                background: '#fef2f2',
                                border: '1px solid #fecaca',
                                borderRadius: '6px',
                                padding: '5px 8px',
                                cursor: 'pointer',
                                fontSize: '11px',
                                color: '#ef4444',
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '4px'
                            }}
                        >
                            🗑️ Supprimer
                        </button>
                    </div>
                )}
            </div>

            {/* Active Component Settings Body (Scrollable independently all the way down) */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '14px', minHeight: 0 }}>
                {selected.settings ? React.createElement(selected.settings) : null}
            </div>
        </div>
    );
};

interface TopbarProps {
    onSave: () => void;
    previewDevice: 'desktop' | 'tablet' | 'mobile';
    onDeviceChange: (device: 'desktop' | 'tablet' | 'mobile') => void;
    onAddCard: () => void;
}

const Topbar = ({ onSave, previewDevice, onDeviceChange, onAddCard }: TopbarProps) => {
    return (
        <div style={{
            padding: '10px 18px',
            background: '#ffffff',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            flexShrink: 0
        }}>
            {/* Left: Title & Quick Add */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>🎨</span> Smart Grid Builder
                </span>
                
                <button
                    type="button"
                    onClick={onAddCard}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: '#eff6ff',
                        color: '#2563eb',
                        border: '1px solid #bfdbfe',
                        borderRadius: '6px',
                        padding: '6px 12px',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.15s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#dbeafe'}
                    onMouseLeave={(e) => e.currentTarget.style.background = '#eff6ff'}
                >
                    ➕ Ajouter une carte
                </button>
            </div>

            {/* Center: Device Viewport Switcher */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                background: '#f1f5f9',
                borderRadius: '8px',
                padding: '3px',
                border: '1px solid #e2e8f0',
                gap: '2px'
            }}>
                <button
                    type="button"
                    onClick={() => onDeviceChange('desktop')}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '5px 10px',
                        borderRadius: '6px',
                        border: 'none',
                        fontSize: '11px',
                        fontWeight: previewDevice === 'desktop' ? 700 : 500,
                        background: previewDevice === 'desktop' ? '#ffffff' : 'transparent',
                        color: previewDevice === 'desktop' ? '#0f172a' : '#64748b',
                        boxShadow: previewDevice === 'desktop' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                        cursor: 'pointer'
                    }}
                >
                    🖥️ Desktop
                </button>
                <button
                    type="button"
                    onClick={() => onDeviceChange('tablet')}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '5px 10px',
                        borderRadius: '6px',
                        border: 'none',
                        fontSize: '11px',
                        fontWeight: previewDevice === 'tablet' ? 700 : 500,
                        background: previewDevice === 'tablet' ? '#ffffff' : 'transparent',
                        color: previewDevice === 'tablet' ? '#0f172a' : '#64748b',
                        boxShadow: previewDevice === 'tablet' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                        cursor: 'pointer'
                    }}
                >
                    💻 Tablette (768px)
                </button>
                <button
                    type="button"
                    onClick={() => onDeviceChange('mobile')}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '5px 10px',
                        borderRadius: '6px',
                        border: 'none',
                        fontSize: '11px',
                        fontWeight: previewDevice === 'mobile' ? 700 : 500,
                        background: previewDevice === 'mobile' ? '#ffffff' : 'transparent',
                        color: previewDevice === 'mobile' ? '#0f172a' : '#64748b',
                        boxShadow: previewDevice === 'mobile' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                        cursor: 'pointer'
                    }}
                >
                    📱 Mobile (380px)
                </button>
            </div>

            {/* Right: Save Section */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                    onClick={onSave}
                    className="btn-pro btn-pro-primary"
                    style={{
                        height: '34px',
                        padding: '0 16px',
                        fontSize: '12px',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                    }}
                >
                    💾 Enregistrer
                </button>
            </div>
        </div>
    );
};

// Subcomponent that triggers card additions into ROOT
const EditorActionsWrapper = ({ onSave, children }: { onSave: () => void; children: (addCard: () => void) => React.ReactNode }) => {
    const { actions, query } = useEditor();

    const handleAddCard = () => {
        try {
            const nodeTree = query.parseReactElement(
                <GridItem 
                    titleText="Nouvelle Carte"
                    linkUrl="/"
                    imageUrl=""
                    bgColor="transparent"
                    descText=""
                    borderWidth={0}
                    borderColor="transparent"
                    overlayEnabled={false}
                    overlayColor="#000000"
                    overlayOpacity={0.4}
                    titleColor="#0f172a"
                    descColor="#64748b"
                    hoverBgColor="transparent"
                    linkNewTab={false}
                />
            ).toNodeTree();
            actions.addNodeTree(nodeTree, 'ROOT');
        } catch (e) {
            console.error("Error adding card to ROOT", e);
        }
    };

    return <>{children(handleAddCard)}</>;
};

interface SmartVisualGridEditorTabProps {
    craftState: string;
    onSaveCraftState: (data: string, silent?: boolean) => void;
    onForceSave: () => void;
}

const SmartVisualGridEditorTab = ({ craftState, onSaveCraftState, onForceSave }: SmartVisualGridEditorTabProps) => {
    const hasData = craftState && craftState !== '{}' && craftState.includes('GridRoot');
    const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

    const getPreviewContainerWidth = () => {
        switch (previewDevice) {
            case 'mobile': return '390px';
            case 'tablet': return '768px';
            case 'desktop':
            default: return '100%';
        }
    };

    return (
        <Editor resolver={{ GridRoot, GridItem, Element }}>
            <AutoSaver onSave={onSaveCraftState} />
            
            <EditorActionsWrapper onSave={onForceSave}>
                {(handleAddCard) => (
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, height: '100%', minHeight: 0, overflow: 'hidden' }}>
                        <Topbar 
                            onSave={onForceSave} 
                            previewDevice={previewDevice} 
                            onDeviceChange={setPreviewDevice} 
                            onAddCard={handleAddCard}
                        />

                        {/* Split-View Workspace: Canvas on Left, Inspector on Right */}
                        <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
                            
                            {/* 1. Left / Center: Live Interactive Canvas */}
                            <div style={{
                                flex: 1,
                                height: '100%',
                                minHeight: 0,
                                overflowY: 'auto',
                                overflowX: 'auto',
                                background: '#f8fafc',
                                backgroundImage: 'radial-gradient(#cbd5e1 1.2px, transparent 1.2px)',
                                backgroundSize: '20px 20px',
                                padding: '24px',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center'
                            }}>
                                {/* Device simulation frame wrapper */}
                                <div style={{
                                    width: getPreviewContainerWidth(),
                                    maxWidth: '100%',
                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                    display: 'flex',
                                    flexDirection: 'column'
                                }}>
                                    {/* Preview Header Hint */}
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '6px 12px',
                                        background: '#ffffff',
                                        border: '1px solid #e2e8f0',
                                        borderBottom: 'none',
                                        borderTopLeftRadius: '10px',
                                        borderTopRightRadius: '10px',
                                        fontSize: '11px',
                                        color: '#64748b'
                                    }}>
                                        <span>🔍 Vue : <strong>{previewDevice.toUpperCase()}</strong></span>
                                        <span style={{ color: '#059669', fontWeight: 600 }}>● Aperçu Direct Synchronisé</span>
                                    </div>

                                    {/* Actual Craft Frame */}
                                    <div style={{
                                        background: '#ffffff',
                                        minHeight: '380px',
                                        width: '100%',
                                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
                                        borderBottomLeftRadius: '10px',
                                        borderBottomRightRadius: '10px',
                                        overflow: 'hidden',
                                        border: '1px solid #e2e8f0',
                                        position: 'relative'
                                    }}>
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

                            {/* 2. Right: Sticky & Scrollable Inspector */}
                            <div style={{
                                width: '420px',
                                minWidth: '380px',
                                borderLeft: '1px solid #e2e8f0',
                                background: '#ffffff',
                                display: 'flex',
                                flexDirection: 'column',
                                height: '100%',
                                minHeight: 0,
                                boxShadow: '-2px 0 8px rgba(0,0,0,0.03)',
                                zIndex: 10
                            }}>
                                <SideInspectorPanel />
                            </div>

                        </div>
                    </div>
                )}
            </EditorActionsWrapper>
        </Editor>
    );
};

export interface SmartVisualGridSettingsProps {
    data: any;
    onSave: (data: string) => void;
}

const normalizeGridData = (raw: any) => {
    try {
        const parsed = typeof raw === 'string' ? JSON.parse(raw || '{}') : (raw || {});
        if (parsed.isGrouped && Array.isArray(parsed.tabs) && parsed.tabs.length > 0) {
            return parsed;
        }
        
        let craftState = '';
        if (parsed.craftState) {
            craftState = typeof parsed.craftState === 'string' ? parsed.craftState : JSON.stringify(parsed.craftState);
        } else if (parsed.ROOT || parsed['ROOT']) {
            craftState = typeof raw === 'string' ? raw : JSON.stringify(raw);
        }

        return {
            isGrouped: true,
            groupStyle: 'pillule',
            activeColor: '#2563eb',
            tabAlignment: 'left',
            tabLayout: 'scroll',
            tabs: [
                {
                    id: 't_default',
                    label: 'Onglet principal',
                    craftState: craftState
                }
            ]
        };
    } catch (e) {
        return {
            isGrouped: true,
            groupStyle: 'pillule',
            activeColor: '#2563eb',
            tabAlignment: 'left',
            tabLayout: 'scroll',
            tabs: [
                { id: 't_default', label: 'Onglet principal', craftState: '' }
            ]
        };
    }
};

export const SmartVisualGridSettings = ({ data, onSave }: SmartVisualGridSettingsProps) => {
    const [config, setConfig] = useState(() => normalizeGridData(data));
    const [activeTabId, setActiveTabId] = useState(() => config.tabs[0]?.id || 't_default');
    const activeTab = config.tabs.find((t: any) => t.id === activeTabId) || config.tabs[0];
    const lastSavedRef = useRef<string>(JSON.stringify(config));
    const isInitRef = useRef<boolean>(false);

    // Keep local config in sync with incoming data prop
    useEffect(() => {
        try {
            const normalized = normalizeGridData(data);
            const currentStr = JSON.stringify(normalized);
            if (currentStr !== lastSavedRef.current) {
                lastSavedRef.current = currentStr;
                setConfig(normalized);
                if (normalized.tabs.length > 0 && !normalized.tabs.some((t: any) => t.id === activeTabId)) {
                    setActiveTabId(normalized.tabs[0].id);
                }
            }
        } catch (e) {
            console.error(e);
        }
    }, [data]);

    // Global Auto-save for the entire configuration
    useEffect(() => {
        if (!isInitRef.current) {
            isInitRef.current = true;
            return;
        }

        const currentJson = JSON.stringify(config);
        if (currentJson === lastSavedRef.current) return;

        const timer = setTimeout(() => {
            lastSavedRef.current = currentJson;
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
        if (config.tabs.length <= 1) return;
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
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: 'calc(100vh - 170px)',
            minHeight: '680px',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            overflow: 'hidden'
        }}>
            {/* TABS MANAGER UI (Header) */}
            <div style={{ padding: '12px 18px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', flexShrink: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>✨</span> Groupes & Onglets Smart Grid
                        </h2>
                        <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#64748b' }}>
                            Basculez entre vos différents groupes ou personnalisez leur style d'affichage.
                        </p>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>Alignement :</label>
                            <select 
                                value={config.tabAlignment || 'left'} 
                                onChange={(e) => updateConfig({...config, tabAlignment: e.target.value})}
                                style={{ padding: '3px 6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '11px' }}
                            >
                                <option value="left">Gauche</option>
                                <option value="center">Centre</option>
                                <option value="right">Droite</option>
                            </select>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>Style :</label>
                            <select 
                                value={config.groupStyle || 'pillule'} 
                                onChange={(e) => updateConfig({...config, groupStyle: e.target.value})}
                                style={{ padding: '3px 6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '11px' }}
                            >
                                <option value="pillule">Pilules</option>
                                <option value="rectangle">Rectangles</option>
                            </select>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>Couleur active :</label>
                            <input 
                                type="color" 
                                value={config.activeColor || '#2563eb'} 
                                onChange={(e) => updateConfig({...config, activeColor: e.target.value})}
                                style={{ width: '26px', height: '26px', padding: '0', border: '1px solid #cbd5e1', cursor: 'pointer', borderRadius: '4px' }}
                            />
                        </div>
                    </div>
                </div>

                {/* Tabs List */}
                <div style={{
                    display: 'flex',
                    flexWrap: config.tabLayout === 'scroll' ? 'nowrap' : 'wrap',
                    overflowX: config.tabLayout === 'scroll' ? 'auto' : 'visible',
                    gap: '8px',
                    alignItems: 'center',
                    justifyContent: config.tabAlignment === 'center' ? 'center' : config.tabAlignment === 'right' ? 'flex-end' : 'flex-start',
                    paddingBottom: '4px'
                }}>
                    {config.tabs.map((tab: any) => (
                        <div 
                            key={tab.id}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '5px 12px',
                                background: activeTabId === tab.id ? (config.activeColor || '#2563eb') : '#ffffff',
                                color: activeTabId === tab.id ? '#ffffff' : '#475569',
                                border: `1px solid ${activeTabId === tab.id ? (config.activeColor || '#2563eb') : '#cbd5e1'}`,
                                borderRadius: config.groupStyle === 'rectangle' ? '6px' : '999px',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                fontWeight: activeTabId === tab.id ? 700 : 500,
                                fontSize: '12px'
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
                                        fontSize: 'inherit',
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
                                        background: 'none',
                                        border: 'none', 
                                        color: activeTabId === tab.id ? '#ffffff' : '#94a3b8', 
                                        cursor: 'pointer',
                                        padding: '0 2px',
                                        fontSize: '14px',
                                        opacity: 0.8
                                    }}
                                    title="Supprimer cet onglet"
                                >
                                    ×
                                </button>
                            )}
                        </div>
                    ))}
                    
                    <button 
                        onClick={handleAddTab}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '28px',
                            height: '28px',
                            background: '#e2e8f0',
                            color: '#475569',
                            border: 'none',
                            borderRadius: '50%',
                            cursor: 'pointer',
                            fontSize: '16px',
                            fontWeight: 'bold'
                        }}
                        title="Ajouter un groupe"
                    >
                        +
                    </button>
                </div>
            </div>

            {/* CRAFTJS SPLIT-VIEW WORKSPACE FOR ACTIVE TAB */}
            <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
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
