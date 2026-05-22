import React, { useState, useEffect } from 'react';
import { FileUploadField } from './FileUploadField';
import { Button } from '../../../ui/button';
import { Input } from '../../../ui/input';
import { Label } from '../../../ui/label';
import { Select } from '../../../ui/select';
import { fetchGraphQL } from '../../../lib/utils';
import { useAutoSave } from '../useAutoSave';

interface ProductGridSettingsProps {
    data: any;
    onSave: (newData: any) => void;
}

export const ProductGridSettings = ({ data, onSave }: ProductGridSettingsProps) => {
    const [config, setConfig] = useState(data);
    useAutoSave(config, onSave);
    const [collections, setCollections] = useState<any[]>([]);
    const [collectionTree, setCollectionTree] = useState<any[]>([]);

    useEffect(() => {
        const defaults = {
            title: 'Sélection pour vous',
            subtitle: 'Des produits choisis pour vous',
            collectionSlug: '',
            collectionIds: [],
            take: 8,
            columns: 4,
            cardStyle: 'standard',
            showPrice: true,
            showDiscount: true,
            showAddToCart: false,
            showDiscountBadge: true,
            showStrikethroughPrice: true,
            showStockIndicator: false,
            showNewBadge: true,
            imageRatio: '1:1',
            bgType: 'color',
            bgColor: '#ffffff',
            bgImageUrl: '',
            sectionPadding: '48px',
            headerStyle: 'bordered'
        };
        setConfig({ ...defaults, ...data });
    }, [data]);

    // Fetch collections for selection
    useEffect(() => {
        const fetchOptions = async () => {
            try {
                const [collData, treeData] = await Promise.all([
                    fetchGraphQL(`query GetCollections { collections { items { id name slug } } }`),
                    fetchGraphQL(`query GetCmsCollectionsTree { cmsCollectionsTree { id name slug children { id name slug } } }`)
                ]);
                setCollections(collData?.collections?.items || []);
                setCollectionTree(treeData?.cmsCollectionsTree || []);
            } catch (err) {
                console.error('Failed to fetch options:', err);
            }
        };
        fetchOptions();
    }, []);

    const handleChange = (field: string, value: any) => setConfig({ ...config, [field]: value });

    const toggleCollection = (id: string, slug?: string) => {
        const current = config.collectionIds || [];
        const newIds = current.includes(id) ? current.filter((cid: string) => cid !== id) : [...current, id];
        
        setConfig({
            ...config,
            collectionIds: newIds,
            collectionSlug: newIds.length > 0 ? (slug || collections.find(c => c.id === newIds[0])?.slug || '') : ''
        });
    };

    return (
        <div className="stack-lg" style={{ width: '100%', maxWidth: '860px' }}>
            {/* Header */}
            <div className="settings-card">
                <div className="settings-card-header">📝 Entête de section</div>
                <div className="grid-2">
                    <div>
                        <Label htmlFor="pg-title">Titre</Label>
                        <Input id="pg-title" value={config.title} onChange={(e) => handleChange('title', e.target.value)} />
                    </div>
                    <div>
                        <Label htmlFor="pg-subtitle">Sous-titre</Label>
                        <Input id="pg-subtitle" value={config.subtitle} onChange={(e) => handleChange('subtitle', e.target.value)} />
                    </div>
                </div>
                <div className="mt-4">
                    <Label htmlFor="pg-header-style">Style d'entête</Label>
                    <Select id="pg-header-style" value={config.headerStyle} onChange={(e) => handleChange('headerStyle', e.target.value)}>
                        <option value="bordered">Bordé (avec séparateur)</option>
                        <option value="simple">Simple (texte uniquement)</option>
                        <option value="centered">Centré</option>
                        <option value="badge">Style Badge</option>
                    </Select>
                </div>
            </div>

            {/* Product Source */}
            <div className="settings-card">
                <div className="settings-card-header">📦 Source des produits</div>
                <div className="grid-2">
                    <div style={{ visibility: 'hidden', height: 0, overflow: 'hidden' }}>
                        {/* Removed duplicate collection selector */}
                    </div>
                    <div>
                        <Label htmlFor="pg-take">Produits à afficher</Label>
                        <Select id="pg-take" value={config.take} onChange={(e) => handleChange('take', parseInt(e.target.value))}>
                            <option value={4}>4 Produits</option>
                            <option value={8}>8 Produits</option>
                            <option value={12}>12 Produits</option>
                            <option value={16}>16 Produits</option>
                            <option value={24}>24 Produits</option>
                        </Select>
                    </div>
                </div>
                <div className="mt-4">
                    <Label htmlFor="pg-columns">Colonnes de la grille</Label>
                    <Select id="pg-columns" value={config.columns} onChange={(e) => handleChange('columns', parseInt(e.target.value))}>
                        <option value={2}>2 Colonnes</option>
                        <option value={3}>3 Colonnes</option>
                        <option value={4}>4 Colonnes</option>
                        <option value={5}>5 Colonnes (Ultra-dense)</option>
                        <option value={6}>6 Colonnes</option>
                    </Select>
                </div>
                {/* Category/Collection filter */}
                {collectionTree.length > 0 && (
                    <div className="mt-4">
                        <Label>Filtrer par collection</Label>
                        {(() => {
                            // Render collection tree as selectable buttons
                            const renderNode = (node: any) => (
                                <div key={node.id} className="mb-1.5">
                                    <div className="text-[0.65rem] font-bold text-[var(--builder-text-muted)] uppercase mb-0.5">{node.name}</div>
                                    <div className="flex flex-wrap gap-1.5">
                                        <Button
                                            variant={(config.collectionIds || []).includes(node.id) ? 'default' : 'outline'}
                                            size="sm"
                                            onClick={() => toggleCollection(node.id, node.slug)}
                                        >
                                            {node.name}
                                        </Button>
                                        {node.children && node.children.map((child: any) => (
                                            <Button
                                                key={child.id}
                                                variant={(config.collectionIds || []).includes(child.id) ? 'default' : 'outline'}
                                                size="sm"
                                                onClick={() => toggleCollection(child.id, child.slug)}
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

            {/* Card Style */}
            <div className="settings-card">
                <div className="settings-card-header">🎨 Style de carte</div>
                <div className="grid-3">
                    <div>
                        <Label htmlFor="pg-card-style">Style de carte</Label>
                        <Select id="pg-card-style" value={config.cardStyle} onChange={(e) => handleChange('cardStyle', e.target.value)}>
                            <option value="standard">Standard</option>
                            <option value="compact">Compact</option>
                            <option value="minimal">Minimaliste</option>
                            <option value="elevated">Élevé</option>
                            <option value="dense">Dense (Style Marketplace)</option>
                        </Select>
                    </div>
                    <div className="toggle-row"><label><input type="checkbox" checked={config.showPrice} onChange={(e) => handleChange('showPrice', e.target.checked)} /> Afficher le prix</label></div>
                    <div className="toggle-row"><label><input type="checkbox" checked={config.showDiscount} onChange={(e) => handleChange('showDiscount', e.target.checked)} /> Afficher le badge de remise</label></div>
                </div>
                {/* Dense card options */}
                {config.cardStyle === 'dense' && (
                    <div className="mt-4">
                        <div className="text-[0.7rem] font-bold text-[var(--builder-text-muted)] mb-1.5 uppercase">🏪 Options Carte Dense</div>
                        <div className="grid-3">
                            <div className="toggle-row"><label><input type="checkbox" checked={config.showDiscountBadge} onChange={(e) => handleChange('showDiscountBadge', e.target.checked)} /> Badge de remise</label></div>
                            <div className="toggle-row"><label><input type="checkbox" checked={config.showStrikethroughPrice} onChange={(e) => handleChange('showStrikethroughPrice', e.target.checked)} /> Prix barré</label></div>
                            <div className="toggle-row"><label><input type="checkbox" checked={config.showAddToCart} onChange={(e) => handleChange('showAddToCart', e.target.checked)} /> Bouton panier flottant</label></div>
                        </div>
                        <div className="grid-2 mt-4">
                            <div>
                                <Label htmlFor="pg-image-ratio">Ratio d'image</Label>
                                <Select id="pg-image-ratio" value={config.imageRatio} onChange={(e) => handleChange('imageRatio', e.target.value)}>
                                    <option value="1:1">Carré (1:1)</option>
                                    <option value="4:3">Standard (4:3)</option>
                                    <option value="16:9">Panoramique (16:9)</option>
                                </Select>
                            </div>
                            <div className="toggle-row"><label><input type="checkbox" checked={config.showStockIndicator} onChange={(e) => handleChange('showStockIndicator', e.target.checked)} /> Indicateur de stock</label></div>
                        </div>
                        <div className="grid-2 mt-2">
                            <div className="toggle-row"><label><input type="checkbox" checked={config.showNewBadge} onChange={(e) => handleChange('showNewBadge', e.target.checked)} /> Badge "Nouveau"</label></div>
                        </div>
                    </div>
                )}
            </div>

            {/* Section Background */}
            <div className="settings-card">
                <div className="settings-card-header">🖼️ Arrière-plan de la section</div>
                <div>
                    <Label htmlFor="pg-bg-type">Type d'arrière-plan</Label>
                    <Select id="pg-bg-type" value={config.bgType} onChange={(e) => handleChange('bgType', e.target.value)}>
                        <option value="color">Couleur unie</option>
                        <option value="image">Image</option>
                    </Select>
                </div>
                {config.bgType === 'color' ? (
                    <div className="mt-4">
                        <Label htmlFor="pg-bg-color">Couleur d'arrière-plan</Label>
                        <div className="color-row">
                            <input type="color" id="pg-bg-color-swatch" className="color-swatch" value={config.bgColor || '#ffffff'} onChange={(e) => handleChange('bgColor', e.target.value)} />
                            <Input id="pg-bg-color" value={config.bgColor || '#ffffff'} onChange={(e) => handleChange('bgColor', e.target.value)} />
                        </div>
                    </div>
                ) : (
                    <div className="mt-4">
                        <FileUploadField label="Image d'arrière-plan" value={config.bgImageUrl} onChange={(v) => handleChange('bgImageUrl', v)} accept="image/*,image/gif" />
                    </div>
                )}
            </div>

            <Button className="section-save-btn w-full justify-center text-sm py-3" onClick={() => onSave(config)}>
                💾 Enregistrer la grille de produits
            </Button>
        </div>
    );
};
