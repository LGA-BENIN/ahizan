import React, { useState, useEffect } from 'react';
import { Label } from '../../../ui/label';
import { Select } from '../../../ui/select';
import { Input } from '../../../ui/input';
import { useAutoSave } from '../useAutoSave';

interface RelatedProductsSettingsProps {
    data: any;
    onSave: (newData: any) => void;
}

export const RelatedProductsSettings = ({ data, onSave }: RelatedProductsSettingsProps) => {
    const [config, setConfig] = useState(data);
    useAutoSave(config, onSave);

    useEffect(() => {
        const defaults = {
            showRelated: true,
            title: 'Vous aimerez aussi',
            subtitle: '',
            source: 'same-collection',
            maxProducts: 8,
            columns: 4,
            columnsMobile: 2,
            cardStyle: 'standard',
            showPrice: true,
            showDiscountBadge: true,
            scrollable: true,
            bgColor: '#f8fafc',
        };
        setConfig({ ...defaults, ...data });
    }, [data]);

    const handleChange = (field: string, value: any) => setConfig({ ...config, [field]: value });

    return (
        <div className="stack-lg" style={{ width: '100%', maxWidth: '860px', height: '100%', maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
            <div className="settings-card">
                <div className="settings-card-header">🔄 Section Produits Similaires</div>
                <div className="toggle-row">
                    <label><input type="checkbox" checked={config.showRelated} onChange={(e) => handleChange('showRelated', e.target.checked)} /> Afficher les produits similaires</label>
                </div>
            </div>

            {config.showRelated && (
                <>
                    <div className="settings-card">
                        <div className="settings-card-header">📝 Contenu</div>
                        <div className="grid-2">
                            <div>
                                <Label htmlFor="rp-title">Titre de la section</Label>
                                <Input id="rp-title" value={config.title} onChange={(e) => handleChange('title', e.target.value)} />
                            </div>
                            <div>
                                <Label htmlFor="rp-subtitle">Sous-titre (optionnel)</Label>
                                <Input id="rp-subtitle" value={config.subtitle} onChange={(e) => handleChange('subtitle', e.target.value)} />
                            </div>
                        </div>
                        <div className="mt-4">
                            <Label htmlFor="rp-source">Source des produits</Label>
                            <Select id="rp-source" value={config.source} onChange={(e) => handleChange('source', e.target.value)}>
                                <option value="same-collection">Même collection</option>
                                <option value="cross-sell">Ventes croisées (cross-sell)</option>
                                <option value="popular">Populaires du site</option>
                                <option value="random">Aléatoire</option>
                            </Select>
                        </div>
                    </div>

                    <div className="settings-card">
                        <div className="settings-card-header">📐 Disposition</div>
                        <div className="grid-3">
                            <div>
                                <Label htmlFor="rp-max">Nombre de produits</Label>
                                <Select id="rp-max" value={config.maxProducts} onChange={(e) => handleChange('maxProducts', parseInt(e.target.value))}>
                                    <option value={4}>4</option>
                                    <option value={6}>6</option>
                                    <option value={8}>8</option>
                                    <option value={12}>12</option>
                                </Select>
                            </div>
                            <div>
                                <Label htmlFor="rp-cols">Colonnes</Label>
                                <Select id="rp-cols" value={config.columns} onChange={(e) => handleChange('columns', parseInt(e.target.value))}>
                                    <option value={3}>3</option>
                                    <option value={4}>4</option>
                                    <option value={5}>5</option>
                                </Select>
                            </div>
                            <div>
                                <Label htmlFor="rp-card">Style de carte</Label>
                                <Select id="rp-card" value={config.cardStyle} onChange={(e) => handleChange('cardStyle', e.target.value)}>
                                    <option value="standard">Standard</option>
                                    <option value="compact">Compact</option>
                                    <option value="minimal">Minimaliste</option>
                                </Select>
                            </div>
                        </div>
                        <div className="grid-2 mt-4">
                            <div className="toggle-row"><label><input type="checkbox" checked={config.showPrice} onChange={(e) => handleChange('showPrice', e.target.checked)} /> Afficher le prix</label></div>
                            <div className="toggle-row"><label><input type="checkbox" checked={config.showDiscountBadge} onChange={(e) => handleChange('showDiscountBadge', e.target.checked)} /> Badges promo</label></div>
                        </div>
                        <div className="mt-4">
                            <div className="toggle-row"><label><input type="checkbox" checked={config.scrollable} onChange={(e) => handleChange('scrollable', e.target.checked)} /> Carrousel horizontal (au lieu de grille)</label></div>
                        </div>
                    </div>

                    <div className="settings-card">
                        <div className="settings-card-header">🎨 Apparence</div>
                        <div>
                            <Label htmlFor="rp-bg">Couleur d'arrière-plan</Label>
                            <div className="color-row">
                                <input type="color" className="color-swatch" value={config.bgColor || '#f8fafc'} onChange={(e) => handleChange('bgColor', e.target.value)} />
                                <Input id="rp-bg" value={config.bgColor} onChange={(e) => handleChange('bgColor', e.target.value)} />
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
