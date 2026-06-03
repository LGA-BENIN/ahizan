import React, { useState, useEffect } from 'react';
import { Button } from '../../../ui/button';
import { Input } from '../../../ui/input';
import { Label } from '../../../ui/label';
import { Select } from '../../../ui/select';
import { fetchGraphQL } from '../../../lib/utils';
import { useAutoSave } from '../useAutoSave';

interface TabConfig {
    id: string;
    label: string;
    icon: string;
    filterType: string;
    collectionSlug: string;
    collectionIds: string[];
    take: number;
}

interface TabbedProductGridSettingsProps {
    data: any;
    onSave: (newData: any) => void;
}

export const TabbedProductGridSettings = ({ data, onSave }: TabbedProductGridSettingsProps) => {
    const [config, setConfig] = useState(data);
    useAutoSave(config, onSave);
    const [collections, setCollections] = useState<any[]>([]);
    const [collectionTree, setCollectionTree] = useState<any[]>([]);
    const [activeTabIdx, setActiveTabIdx] = useState(0);

    useEffect(() => {
        const defaults = {
            title: 'Nos Produits',
            layout: 'grid',
            columns: 5,
            cardStyle: 'dense',
            tabs: [
                {
                    id: 'tab-1',
                    label: 'Meilleures Ventes',
                    icon: '🔥',
                    filterType: 'BEST_SELLERS',
                    collectionSlug: '',
                    collectionIds: [],
                    take: 10,
                },
                {
                    id: 'tab-2',
                    label: 'Nouveautés',
                    icon: '✨',
                    filterType: 'LATEST',
                    collectionSlug: '',
                    collectionIds: [],
                    take: 10,
                },
            ],
            defaultTabIndex: 0,
            tabStyle: 'pill',
            tabColor: '#0f172a',
            tabActiveColor: '#e31837',
        };
        setConfig({ ...defaults, ...data });
    }, [data]);

    // Fetch collections for selection
    useEffect(() => {
        const fetchOptions = async () => {
            try {
                const treeData = await fetchGraphQL(`query GetCmsCollectionsTree { cmsCollectionsTree { id name slug children { id name slug } } }`);
                setCollectionTree(treeData?.cmsCollectionsTree || []);
            } catch (err) {
                console.error('Failed to fetch options:', err);
            }
        };
        fetchOptions();
    }, []);

    const handleChange = (field: string, value: any) => setConfig({ ...config, [field]: value });

    const tabs: TabConfig[] = config.tabs || [];

    const updateTab = (index: number, field: string, value: any) => {
        const newTabs = [...config.tabs];
        newTabs[index] = { ...newTabs[index], [field]: value };
        
        // Auto-update collectionSlug if we're setting collectionIds
        if (field === 'collectionIds' && Array.isArray(value)) {
            let firstSlug = '';
            if (value.length > 0) {
                const findSlug = (nodes: any[]): string => {
                    for (const n of nodes) {
                        if (n.id === value[0]) return n.slug;
                        if (n.children) {
                            const res = findSlug(n.children);
                            if (res) return res;
                        }
                    }
                    return '';
                };
                firstSlug = findSlug(collectionTree);
            }
            newTabs[index].collectionSlug = firstSlug;
            newTabs[index].filterType = value.length > 0 ? 'COLLECTION' : 'LATEST';
        }
        
        setConfig({ ...config, tabs: newTabs });
    };

    const addTab = () => {
        const newTab: TabConfig = {
            id: `tab-${Date.now()}`,
            label: `Onglet ${tabs.length + 1}`,
            icon: '📦',
            filterType: 'LATEST',
            collectionSlug: '',
            collectionIds: [],
            take: 10,
        };
        handleChange('tabs', [...tabs, newTab]);
    };

    const removeTab = (idx: number) => {
        const newTabs = tabs.filter((_: any, i: number) => i !== idx);
        handleChange('tabs', newTabs);
        if (activeTabIdx >= newTabs.length) setActiveTabIdx(Math.max(0, newTabs.length - 1));
    };

    const moveTab = (idx: number, direction: 'up' | 'down') => {
        const newIdx = direction === 'up' ? idx - 1 : idx + 1;
        if (newIdx < 0 || newIdx >= tabs.length) return;
        const newTabs = [...tabs];
        [newTabs[idx], newTabs[newIdx]] = [newTabs[newIdx], newTabs[idx]];
        handleChange('tabs', newTabs);
        if (activeTabIdx === idx) setActiveTabIdx(newIdx);
    };

    const toggleTabCollection = (tabIdx: number, collId: string) => {
        const tab = tabs[tabIdx];
        const current = tab.collectionIds || [];
        const newIds = current.includes(collId) ? current.filter((cid: string) => cid !== collId) : [...current, collId];
        updateTab(tabIdx, 'collectionIds', newIds);
    };

    const currentTab = tabs[activeTabIdx];

    return (
        <div className="stack-lg" style={{ width: '100%', maxWidth: '860px', height: '100%', maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
            {/* Header */}
            <div className="settings-card">
                <div className="settings-card-header">📝 Entête de section</div>
                <div className="grid-2">
                    <div>
                        <Label htmlFor="tpg-title">Titre</Label>
                        <Input id="tpg-title" value={config.title} onChange={(e) => handleChange('title', e.target.value)} />
                    </div>
                    <div>
                        <Label htmlFor="tpg-tab-style">Style d'onglets</Label>
                        <Select id="tpg-tab-style" value={config.tabStyle} onChange={(e) => handleChange('tabStyle', e.target.value)}>
                            <option value="pill">Pilule (arrondi)</option>
                            <option value="underline">Souligné</option>
                            <option value="boxed">Encadré</option>
                        </Select>
                    </div>
                </div>
            </div>

            {/* Grid & Card Style */}
            <div className="settings-card">
                <div className="settings-card-header">🎨 Grille et Carte</div>
                <div className="grid-3">
                    <div>
                        <Label htmlFor="tpg-columns">Colonnes</Label>
                        <Select id="tpg-columns" value={config.columns} onChange={(e) => handleChange('columns', parseInt(e.target.value))}>
                            <option value={3}>3 Colonnes</option>
                            <option value={4}>4 Colonnes</option>
                            <option value={5}>5 Colonnes (Ultra-dense)</option>
                            <option value={6}>6 Colonnes</option>
                        </Select>
                    </div>
                    <div>
                        <Label htmlFor="tpg-card-style">Style de carte</Label>
                        <Select id="tpg-card-style" value={config.cardStyle} onChange={(e) => handleChange('cardStyle', e.target.value)}>
                            <option value="standard">Standard</option>
                            <option value="compact">Compact</option>
                            <option value="dense">Dense (Marketplace)</option>
                            <option value="elevated">Élevé</option>
                        </Select>
                    </div>
                    <div>
                        <Label htmlFor="tpg-default-tab">Onglet par défaut</Label>
                        <Select id="tpg-default-tab" value={config.defaultTabIndex || 0} onChange={(e) => handleChange('defaultTabIndex', parseInt(e.target.value))}>
                            {tabs.map((t: TabConfig, i: number) => (
                                <option key={t.id} value={i}>{t.label || `Onglet ${i + 1}`}</option>
                            ))}
                        </Select>
                    </div>
                </div>
            </div>

            {/* Tab List Management */}
            <div className="settings-card">
                <div className="settings-card-header">📑 Onglets</div>
                <div className="flex gap-1 flex-wrap mb-2">
                    {tabs.map((tab: TabConfig, idx: number) => (
                        <Button
                            key={tab.id}
                            variant={idx === activeTabIdx ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setActiveTabIdx(idx)}
                        >
                            <span>{tab.icon}</span> {tab.label}
                        </Button>
                    ))}
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={addTab}
                        className="border border-dashed border-[var(--builder-border)]"
                    >
                        + Ajouter
                    </Button>
                </div>

                {/* Active Tab Editor */}
                {currentTab && (
                    <div className="border border-[var(--builder-border)] rounded-lg p-3 bg-gray-50/50">
                        <div className="flex justify-between mb-2">
                            <span className="text-xs font-bold">Onglet : {currentTab.label}</span>
                            <div className="flex gap-1">
                                <Button variant="ghost" size="sm" onClick={() => moveTab(activeTabIdx, 'up')} disabled={activeTabIdx === 0}>▲</Button>
                                <Button variant="ghost" size="sm" onClick={() => moveTab(activeTabIdx, 'down')} disabled={activeTabIdx === tabs.length - 1}>▼</Button>
                                <Button variant="destructive" size="sm" onClick={() => removeTab(activeTabIdx)}>✕</Button>
                            </div>
                        </div>
                        <div className="grid-2">
                            <div>
                                <Label htmlFor={`tab-label-${activeTabIdx}`}>Label</Label>
                                <Input id={`tab-label-${activeTabIdx}`} value={currentTab.label} onChange={(e) => updateTab(activeTabIdx, 'label', e.target.value)} />
                            </div>
                            <div>
                                <Label htmlFor={`tab-icon-${activeTabIdx}`}>Icône (emoji)</Label>
                                <Input id={`tab-icon-${activeTabIdx}`} value={currentTab.icon} onChange={(e) => updateTab(activeTabIdx, 'icon', e.target.value)} />
                            </div>
                        </div>
                        <div className="grid-2 mt-2">
                            <div>
                                <Label htmlFor={`tab-filter-${activeTabIdx}`}>Source de produits</Label>
                                <Select id={`tab-filter-${activeTabIdx}`} value={currentTab.filterType} onChange={(e) => updateTab(activeTabIdx, 'filterType', e.target.value)}>
                                    <option value="LATEST">Derniers arrivages</option>
                                    <option value="BEST_SELLERS">Meilleures ventes</option>
                                    <option value="COLLECTION">Par collection</option>
                                </Select>
                            </div>
                            <div>
                                <Label htmlFor={`tab-collection-${activeTabIdx}`}>Collection</Label>
                                <Select id={`tab-collection-${activeTabIdx}`} value={currentTab.collectionSlug} onChange={(e) => updateTab(activeTabIdx, 'collectionSlug', e.target.value)}>
                                    <option value="">Tous les produits</option>
                                    {collections.map((c: any) => (
                                        <option key={c.id} value={c.slug}>{c.name}</option>
                                    ))}
                                </Select>
                            </div>
                        </div>
                        <div className="grid-2 mt-2">
                            <div>
                                <Label htmlFor={`tab-take-${activeTabIdx}`}>Produits à afficher</Label>
                                <Select id={`tab-take-${activeTabIdx}`} value={currentTab.take} onChange={(e) => updateTab(activeTabIdx, 'take', parseInt(e.target.value))}>
                                    <option value={4}>4</option>
                                    <option value={8}>8</option>
                                    <option value={10}>10</option>
                                    <option value={12}>12</option>
                                    <option value={16}>16</option>
                                </Select>
                            </div>
                        </div>
                        {/* Collection filter per tab */}
                        {collectionTree.length > 0 && (
                            <div className="mt-2">
                                <Label>Filtrer par collection</Label>
                                {(() => {
                                    const renderNode = (node: any) => (
                                        <div key={node.id} className="mb-1">
                                            <div className="text-[0.6rem] font-bold text-[var(--builder-text-muted)] uppercase">{node.name}</div>
                                            <div className="flex flex-wrap gap-1">
                                                <Button
                                                    variant={(currentTab.collectionIds || []).includes(node.id) ? 'default' : 'outline'}
                                                    size="sm"
                                                    onClick={() => toggleTabCollection(activeTabIdx, node.id)}
                                                >
                                                    {node.name}
                                                </Button>
                                                {node.children && node.children.map((child: any) => (
                                                    <Button
                                                        key={child.id}
                                                        variant={(currentTab.collectionIds || []).includes(child.id) ? 'default' : 'outline'}
                                                        size="sm"
                                                        onClick={() => toggleTabCollection(activeTabIdx, child.id)}
                                                    >
                                                        {child.name}
                                                    </Button>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                    return collectionTree.map(renderNode);
                                })()}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
