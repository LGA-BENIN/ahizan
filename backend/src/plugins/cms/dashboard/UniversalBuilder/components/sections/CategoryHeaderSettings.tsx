import React, { useState, useEffect } from 'react';
import { FileUploadField } from './FileUploadField';
import { Input } from '../../../ui/input';
import { Label } from '../../../ui/label';
import { Select } from '../../../ui/select';
import { useAutoSave } from '../useAutoSave';

interface CategoryHeaderSettingsProps {
    data: any;
    onSave: (newData: any) => void;
}

export const CategoryHeaderSettings = ({ data, onSave }: CategoryHeaderSettingsProps) => {
    const [config, setConfig] = useState(data);
    useAutoSave(config, onSave);

    useEffect(() => {
        const defaults = {
            showBanner: true,
            useCollectionImage: true,
            bannerImageUrl: '',
            bannerHeight: '280px',
            bannerOverlayColor: 'rgba(0,0,0,0.35)',
            titleColor: '#ffffff',
            titleAlign: 'center',
            titleSize: '3rem',
            showDescription: true,
            descriptionText: '',
            showProductCount: true,
            showBreadcrumbs: true,
            showSubcategories: true,
            subcategoryStyle: 'pills',
            bgColor: '#ffffff',
        };
        setConfig({ ...defaults, ...data });
    }, [data]);

    const handleChange = (field: string, value: any) => setConfig({ ...config, [field]: value });

    return (
        <div className="stack-lg" style={{ width: "100%", height: "100%", maxHeight: "calc(100vh - 200px)", overflowY: "auto" }}>
            {/* Banner */}
            <div className="settings-card">
                <div className="settings-card-header">🖼️ Bannière de Catégorie</div>
                <div className="toggle-row">
                    <label><input type="checkbox" checked={config.showBanner} onChange={(e) => handleChange('showBanner', e.target.checked)} /> Afficher la bannière</label>
                </div>
                {config.showBanner && (
                    <>
                        <div className="mt-4 toggle-row">
                            <label><input type="checkbox" checked={config.useCollectionImage !== false} onChange={(e) => handleChange('useCollectionImage', e.target.checked)} /> Utiliser l'image de la collection (si disponible)</label>
                        </div>
                        {config.useCollectionImage === false && (
                            <div className="mt-4">
                                <FileUploadField label="Image de bannière personnalisée" value={config.bannerImageUrl} onChange={(v) => handleChange('bannerImageUrl', v)} accept="image/*" />
                            </div>
                        )}
                        <div className="grid-2 mt-4">
                            <div>
                                <Label htmlFor="ch-banner-height">Hauteur de bannière</Label>
                                <Select id="ch-banner-height" value={config.bannerHeight} onChange={(e) => handleChange('bannerHeight', e.target.value)}>
                                    <option value="180px">Petite (180px)</option>
                                    <option value="280px">Moyenne (280px)</option>
                                    <option value="400px">Grande (400px)</option>
                                    <option value="500px">Très grande (500px)</option>
                                </Select>
                            </div>
                            <div>
                                <Label htmlFor="ch-overlay-color">Couleur de l'overlay</Label>
                                <div className="color-row">
                                    <input type="color" className="color-swatch" value={config.bannerOverlayColor?.replace(/rgba?\([\d,.\s]+\)/, '#000000') || '#000000'} onChange={(e) => handleChange('bannerOverlayColor', `${e.target.value}59`)} />
                                    <Input id="ch-overlay-color" value={config.bannerOverlayColor} onChange={(e) => handleChange('bannerOverlayColor', e.target.value)} placeholder="rgba(0,0,0,0.35)" />
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Title */}
            <div className="settings-card">
                <div className="settings-card-header">✏️ Titre et Texte</div>
                <div className="grid-2">
                    <div>
                        <Label htmlFor="ch-title-color">Couleur du titre</Label>
                        <div className="color-row">
                            <input type="color" className="color-swatch" value={config.titleColor || '#ffffff'} onChange={(e) => handleChange('titleColor', e.target.value)} />
                            <Input id="ch-title-color" value={config.titleColor} onChange={(e) => handleChange('titleColor', e.target.value)} />
                        </div>
                    </div>
                    <div>
                        <Label htmlFor="ch-title-align">Alignement du titre</Label>
                        <Select id="ch-title-align" value={config.titleAlign} onChange={(e) => handleChange('titleAlign', e.target.value)}>
                            <option value="left">Gauche</option>
                            <option value="center">Centré</option>
                            <option value="right">Droite</option>
                        </Select>
                    </div>
                </div>
                <div className="mt-4">
                    <Label htmlFor="ch-title-size">Taille du titre</Label>
                    <Select id="ch-title-size" value={config.titleSize} onChange={(e) => handleChange('titleSize', e.target.value)}>
                        <option value="1.5rem">Petit</option>
                        <option value="2rem">Moyen</option>
                        <option value="3rem">Grand</option>
                        <option value="4rem">Très grand</option>
                    </Select>
                </div>
                <div className="mt-4">
                    <div className="toggle-row"><label><input type="checkbox" checked={config.showDescription} onChange={(e) => handleChange('showDescription', e.target.checked)} /> Afficher une description personnalisée</label></div>
                    {config.showDescription && (
                        <div className="mt-2">
                            <Label htmlFor="ch-desc">Description (optionnel, remplace la description par défaut)</Label>
                            <textarea id="ch-desc" value={config.descriptionText || ''} onChange={(e) => handleChange('descriptionText', e.target.value)} rows={3} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '0.8rem', resize: 'vertical' }} placeholder="Laissez vide pour utiliser le nombre de produits automatique..." />
                        </div>
                    )}
                </div>
            </div>

            {/* Navigation */}
            <div className="settings-card">
                <div className="settings-card-header">🧭 Navigation</div>
                <div className="grid-2">
                    <div className="toggle-row"><label><input type="checkbox" checked={config.showBreadcrumbs} onChange={(e) => handleChange('showBreadcrumbs', e.target.checked)} /> Afficher le fil d'Ariane</label></div>
                    <div className="toggle-row"><label><input type="checkbox" checked={config.showProductCount} onChange={(e) => handleChange('showProductCount', e.target.checked)} /> Afficher le nombre de produits</label></div>
                </div>
                <div className="mt-4">
                    <div className="toggle-row"><label><input type="checkbox" checked={config.showSubcategories} onChange={(e) => handleChange('showSubcategories', e.target.checked)} /> Afficher les sous-catégories</label></div>
                    {config.showSubcategories && (
                        <div className="mt-2">
                            <Label htmlFor="ch-sub-style">Style des sous-catégories</Label>
                            <Select id="ch-sub-style" value={config.subcategoryStyle} onChange={(e) => handleChange('subcategoryStyle', e.target.value)}>
                                <option value="pills">Pilules (arrondies)</option>
                                <option value="cards">Cartes avec image</option>
                                <option value="links">Liens simples</option>
                            </Select>
                        </div>
                    )}
                </div>
            </div>

            {/* Background */}
            <div className="settings-card">
                <div className="settings-card-header">🎨 Arrière-plan global</div>
                <div>
                    <Label htmlFor="ch-bg-color">Couleur d'arrière-plan de la page</Label>
                    <div className="color-row">
                        <input type="color" className="color-swatch" value={config.bgColor || '#ffffff'} onChange={(e) => handleChange('bgColor', e.target.value)} />
                        <Input id="ch-bg-color" value={config.bgColor || '#ffffff'} onChange={(e) => handleChange('bgColor', e.target.value)} />
                    </div>
                </div>
            </div>
        </div>
    );
};
