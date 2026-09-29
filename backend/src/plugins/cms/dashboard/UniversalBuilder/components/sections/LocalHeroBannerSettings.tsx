import React, { useState, useEffect } from 'react';
import { useAutoSave } from '../useAutoSave';
import { FileUploadField } from './FileUploadField';

interface LocalHeroBannerSettingsProps {
    data: any;
    onSave: (newData: any) => void;
}

export const LocalHeroBannerSettings = ({ data, onSave }: LocalHeroBannerSettingsProps) => {
    const [config, setConfig] = useState(data);
    useAutoSave(config, onSave);

    useEffect(() => {
        const defaults = {
            title: 'Découvrez Vos Commerces & Marchés',
            subtitle: 'Retrouvez les produits, marchés physiques et boutiques vérifiées les plus proches de chez vous au Bénin avec livraison express.',
            badgeText: '📍 Découverte Locale & Proximité',
            icon: '📍',
            showQuickLocationSelector: true,
            showGpsDetectionButton: true,
            bgColor: '#0f172a',
            textColor: '#ffffff',
            badgeBgColor: '#059669',
            bgImageUrl: '',
        };
        setConfig({ ...defaults, ...data });
    }, [data]);

    const handleChange = (field: string, value: any) => setConfig({ ...config, [field]: value });

    return (
        <div className="stack-lg" style={{ width: "100%", height: "100%", maxHeight: "calc(100vh - 200px)", overflowY: "auto" }}>
            <div className="settings-card">
                <div className="settings-card-header">📍 En-tête de la page Découverte Locale</div>
                <div className="grid-2">
                    <div>
                        <label className="label-pro">Titre principal</label>
                        <input className="input-pro" value={config.title || ''} onChange={(e) => handleChange('title', e.target.value)} />
                    </div>
                    <div>
                        <label className="label-pro">Badge supérieur</label>
                        <input className="input-pro" value={config.badgeText || ''} onChange={(e) => handleChange('badgeText', e.target.value)} />
                    </div>
                </div>
                <div style={{ marginTop: '1rem' }}>
                    <label className="label-pro">Sous-titre explicatif</label>
                    <input className="input-pro" value={config.subtitle || ''} onChange={(e) => handleChange('subtitle', e.target.value)} />
                </div>
            </div>

            <div className="settings-card">
                <div className="settings-card-header">🛰️ Outils de géolocalisation & Sélecteur rapide</div>
                <div className="grid-2">
                    <div className="toggle-row">
                        <label>
                            <input 
                                type="checkbox" 
                                checked={config.showQuickLocationSelector !== false} 
                                onChange={(e) => handleChange('showQuickLocationSelector', e.target.checked)} 
                            /> 
                            Afficher le sélecteur rapide de position
                        </label>
                    </div>
                    <div className="toggle-row">
                        <label>
                            <input 
                                type="checkbox" 
                                checked={config.showGpsDetectionButton !== false} 
                                onChange={(e) => handleChange('showGpsDetectionButton', e.target.checked)} 
                            /> 
                            Bouton de détection GPS automatique
                        </label>
                    </div>
                </div>
            </div>

            <div className="settings-card">
                <div className="settings-card-header">🎨 Couleurs & Image d'arrière-plan</div>
                <div className="grid-3">
                    <div>
                        <label className="label-pro">Couleur de fond</label>
                        <div className="color-row">
                            <input 
                                type="color" 
                                className="color-swatch" 
                                value={config.bgColor || '#0f172a'} 
                                onChange={(e) => handleChange('bgColor', e.target.value)} 
                            />
                            <input className="input-pro" value={config.bgColor || ''} onChange={(e) => handleChange('bgColor', e.target.value)} />
                        </div>
                    </div>
                    <div>
                        <label className="label-pro">Couleur du texte</label>
                        <div className="color-row">
                            <input 
                                type="color" 
                                className="color-swatch" 
                                value={config.textColor || '#ffffff'} 
                                onChange={(e) => handleChange('textColor', e.target.value)} 
                            />
                            <input className="input-pro" value={config.textColor || ''} onChange={(e) => handleChange('textColor', e.target.value)} />
                        </div>
                    </div>
                    <div>
                        <label className="label-pro">Couleur du badge</label>
                        <div className="color-row">
                            <input 
                                type="color" 
                                className="color-swatch" 
                                value={config.badgeBgColor || '#059669'} 
                                onChange={(e) => handleChange('badgeBgColor', e.target.value)} 
                            />
                            <input className="input-pro" value={config.badgeBgColor || ''} onChange={(e) => handleChange('badgeBgColor', e.target.value)} />
                        </div>
                    </div>
                </div>
                <div style={{ marginTop: '1rem' }}>
                    <FileUploadField 
                        label="Image de fond (optionnel)" 
                        value={config.bgImageUrl || ''} 
                        onChange={(val) => handleChange('bgImageUrl', val)} 
                    />
                </div>
            </div>
        </div>
    );
};
