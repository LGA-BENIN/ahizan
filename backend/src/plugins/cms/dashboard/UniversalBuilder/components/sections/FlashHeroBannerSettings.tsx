import React, { useState, useEffect } from 'react';
import { useAutoSave } from '../useAutoSave';
import { FileUploadField } from './FileUploadField';

interface FlashHeroBannerSettingsProps {
    data: any;
    onSave: (newData: any) => void;
}

export const FlashHeroBannerSettings = ({ data, onSave }: FlashHeroBannerSettingsProps) => {
    const [config, setConfig] = useState(data);
    useAutoSave(config, onSave);

    useEffect(() => {
        const defaults = {
            title: 'Les Meilleures Remises Du Moment',
            subtitle: 'Découvrez toutes les offres promotionnelles à durée et stock limités proposées par nos boutiques au Bénin.',
            badgeText: '⚡ Ventes Flash Quotidiennes',
            icon: '⚡',
            showCountdown: false,
            isUnlimited: true,
            countdownEnd: '',
            bgColor: '#0f172a',
            textColor: '#ffffff',
            badgeBgColor: '#e11d48',
            showBeninGuarantees: true,
            bgImageUrl: '',
        };
        setConfig({ ...defaults, ...data });
    }, [data]);

    const handleChange = (field: string, value: any) => setConfig({ ...config, [field]: value });

    return (
        <div className="stack-lg" style={{ width: "100%", height: "100%", maxHeight: "calc(100vh - 200px)", overflowY: "auto" }}>
            <div className="settings-card">
                <div className="settings-card-header">⚡ En-tête et Titre de la page Ventes Flash</div>
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
                <div className="settings-card-header">⏰ Compte à rebours & Planification</div>
                <div className="grid-2">
                    <div className="toggle-row">
                        <label>
                            <input 
                                type="checkbox" 
                                checked={config.isUnlimited} 
                                onChange={(e) => handleChange('isUnlimited', e.target.checked)} 
                            /> 
                            Durée illimitée (pas de compte à rebours fake)
                        </label>
                    </div>
                    {!config.isUnlimited && (
                        <div className="toggle-row">
                            <label>
                                <input 
                                    type="checkbox" 
                                    checked={config.showCountdown} 
                                    onChange={(e) => handleChange('showCountdown', e.target.checked)} 
                                /> 
                                Afficher le compte à rebours
                            </label>
                        </div>
                    )}
                </div>
                {!config.isUnlimited && (
                    <div style={{ marginTop: '1rem' }}>
                        <label className="label-pro">Date et heure d'expiration</label>
                        <input 
                            type="datetime-local" 
                            className="input-pro"
                            value={config.countdownEnd ? new Date(config.countdownEnd).toISOString().slice(0, 16) : ''} 
                            onChange={(e) => handleChange('countdownEnd', new Date(e.target.value).toISOString())} 
                        />
                    </div>
                )}
                <div className="toggle-row" style={{ marginTop: '1rem' }}>
                    <label>
                        <input 
                            type="checkbox" 
                            checked={config.showBeninGuarantees !== false} 
                            onChange={(e) => handleChange('showBeninGuarantees', e.target.checked)} 
                        /> 
                        Afficher les badges de garantie Bénin (Moov/MTN Money, Retrait Marché, Direct Vendeur)
                    </label>
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
                                value={config.badgeBgColor || '#e11d48'} 
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
