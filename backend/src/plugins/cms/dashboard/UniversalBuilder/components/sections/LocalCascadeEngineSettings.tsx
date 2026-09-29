import React, { useState, useEffect } from 'react';
import { useAutoSave } from '../useAutoSave';
import { FileUploadField } from './FileUploadField';

interface LocalCascadeEngineSettingsProps {
    data: any;
    onSave: (newData: any) => void;
}

export const LocalCascadeEngineSettings = ({ data, onSave }: LocalCascadeEngineSettingsProps) => {
    const [config, setConfig] = useState(data);
    useAutoSave(config, onSave);

    useEffect(() => {
        const defaults = {
            title: 'Sélection de Produits à {{position}}',
            subtitle: 'Offres exclusives des commerçants et marchés situés à proximité immédiate.',
            badgeText: 'Proximité Active',
            zoneARadiusKm: 3,
            zoneBRadiusKm: 10,
            zoneALabel: 'À proximité immédiate (< 3 km)',
            zoneBLabel: 'Dans votre commune / ville (< 10 km)',
            zoneCLabel: 'Disponibles au Bénin avec livraison',
            boostCertified: true,
            maxPerZone: 16,
            showZoneBadges: true,
            showSlaInfo: true,
            backgroundColor: '#ffffff',
            titleColor: '#0f172a',
            subtitleColor: '#475569',
            badgeColor: '#e11d48',
            badgeBgColor: '#ffe4e6',
            bgImage: '',
            bgImageOverlayOpacity: 40,
            gradientBackground: '',
        };
        setConfig({ ...defaults, ...data });
    }, [data]);

    const handleChange = (field: string, value: any) => setConfig({ ...config, [field]: value });

    const insertToken = (field: string, token: string) => {
        const currentVal = config[field] || '';
        handleChange(field, `${currentVal} ${token}`.trim());
    };

    return (
        <div className="stack-lg" style={{ width: "100%", height: "100%", maxHeight: "calc(100vh - 200px)", overflowY: "auto", paddingBottom: "2rem" }}>
            
            {/* Dynamic Tokens Guide */}
            <div className="settings-card" style={{ borderLeft: '4px solid #e11d48', background: '#fff1f2' }}>
                <div className="settings-card-header" style={{ color: '#9f1239', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    💡 Variables Dynamiques de Géolocalisation
                </div>
                <p style={{ fontSize: '12px', color: '#be123c', margin: '4px 0 10px 0' }}>
                    Adaptez le titre automatiquement en insérant ces variables :
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    <button type="button" onClick={() => insertToken('title', '{{position}}')} className="badge-token" style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #fda4af', background: '#ffffff', color: '#be123c', fontSize: '11px', cursor: 'pointer', fontWeight: 600 }}>
                        + {"{{position}}"} (ex: Cotonou / Dantokpa)
                    </button>
                    <button type="button" onClick={() => insertToken('title', '{{quartier}}')} className="badge-token" style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #fda4af', background: '#ffffff', color: '#be123c', fontSize: '11px', cursor: 'pointer', fontWeight: 600 }}>
                        + {"{{quartier}}"} (ex: Tokpota)
                    </button>
                    <button type="button" onClick={() => insertToken('title', '{{ville}}')} className="badge-token" style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #fda4af', background: '#ffffff', color: '#be123c', fontSize: '11px', cursor: 'pointer', fontWeight: 600 }}>
                        + {"{{ville}}"} (ex: Cotonou)
                    </button>
                    <button type="button" onClick={() => insertToken('title', '{{marche}}')} className="badge-token" style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #fda4af', background: '#ffffff', color: '#be123c', fontSize: '11px', cursor: 'pointer', fontWeight: 600 }}>
                        + {"{{marche}}"} (ex: Dantokpa)
                    </button>
                </div>
            </div>

            {/* Contenu et Textes */}
            <div className="settings-card">
                <div className="settings-card-header">🎯 Moteur de Cascade de Proximité (Zones Géographiques)</div>
                <div className="grid-2">
                    <div>
                        <label className="label-pro">Titre de la section</label>
                        <input className="input-pro" value={config.title || ''} onChange={(e) => handleChange('title', e.target.value)} />
                    </div>
                    <div>
                        <label className="label-pro">Sous-titre</label>
                        <input className="input-pro" value={config.subtitle || ''} onChange={(e) => handleChange('subtitle', e.target.value)} />
                    </div>
                </div>
                <div className="grid-2" style={{ marginTop: '1rem' }}>
                    <div>
                        <label className="label-pro">Badge supérieur</label>
                        <input className="input-pro" value={config.badgeText || ''} onChange={(e) => handleChange('badgeText', e.target.value)} />
                    </div>
                    <div>
                        <label className="label-pro">Max produits par zone</label>
                        <input className="input-pro" type="number" min={4} max={50} value={config.maxPerZone || 16} onChange={(e) => handleChange('maxPerZone', parseInt(e.target.value))} />
                    </div>
                </div>
            </div>

            {/* Rayons Kilométriques */}
            <div className="settings-card">
                <div className="settings-card-header">📏 Configuration des Rayons Kilométriques</div>
                <div className="grid-2">
                    <div>
                        <label className="label-pro">Rayon Zone A (Proximité immédiate en km)</label>
                        <input className="input-pro" type="number" min={1} max={20} value={config.zoneARadiusKm || 3} onChange={(e) => handleChange('zoneARadiusKm', parseFloat(e.target.value))} />
                    </div>
                    <div>
                        <label className="label-pro">Libellé Zone A</label>
                        <input className="input-pro" value={config.zoneALabel || ''} onChange={(e) => handleChange('zoneALabel', e.target.value)} />
                    </div>
                </div>
                <div className="grid-2" style={{ marginTop: '1rem' }}>
                    <div>
                        <label className="label-pro">Rayon Zone B (Commune / Ville en km)</label>
                        <input className="input-pro" type="number" min={4} max={50} value={config.zoneBRadiusKm || 10} onChange={(e) => handleChange('zoneBRadiusKm', parseFloat(e.target.value))} />
                    </div>
                    <div>
                        <label className="label-pro">Libellé Zone B</label>
                        <input className="input-pro" value={config.zoneBLabel || ''} onChange={(e) => handleChange('zoneBLabel', e.target.value)} />
                    </div>
                </div>
                <div style={{ marginTop: '1rem' }}>
                    <label className="label-pro">Libellé Zone C (Régionale / Nationale)</label>
                    <input className="input-pro" value={config.zoneCLabel || ''} onChange={(e) => handleChange('zoneCLabel', e.target.value)} />
                </div>
            </div>

            {/* Options d'Affichage & Boost */}
            <div className="settings-card">
                <div className="settings-card-header">⭐ Options d'Affichage & Boost</div>
                <div className="grid-3">
                    <div className="toggle-row">
                        <label>
                            <input 
                                type="checkbox" 
                                checked={config.boostCertified !== false} 
                                onChange={(e) => handleChange('boostCertified', e.target.checked)} 
                            /> 
                            Boost vendeurs certifiés
                        </label>
                    </div>
                    <div className="toggle-row">
                        <label>
                            <input 
                                type="checkbox" 
                                checked={config.showZoneBadges !== false} 
                                onChange={(e) => handleChange('showZoneBadges', e.target.checked)} 
                            /> 
                            Badges de distance (ex: 1.2 km)
                        </label>
                    </div>
                    <div className="toggle-row">
                        <label>
                            <input 
                                type="checkbox" 
                                checked={config.showSlaInfo !== false} 
                                onChange={(e) => handleChange('showSlaInfo', e.target.checked)} 
                            /> 
                            Délais de livraison estimés (2h - 4h)
                        </label>
                    </div>
                </div>
            </div>

            {/* Design & Personnalisation Visuelle */}
            <div className="settings-card">
                <div className="settings-card-header">🎨 Couleurs & Habillage Visuel</div>
                <div className="grid-3">
                    <div>
                        <label className="label-pro">Couleur Titre</label>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <input type="color" value={config.titleColor || '#0f172a'} onChange={(e) => handleChange('titleColor', e.target.value)} style={{ width: '36px', height: '36px', padding: 0, border: 'none', borderRadius: '6px', cursor: 'pointer' }} />
                            <input className="input-pro" value={config.titleColor || '#0f172a'} onChange={(e) => handleChange('titleColor', e.target.value)} />
                        </div>
                    </div>
                    <div>
                        <label className="label-pro">Couleur Sous-titre</label>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <input type="color" value={config.subtitleColor || '#475569'} onChange={(e) => handleChange('subtitleColor', e.target.value)} style={{ width: '36px', height: '36px', padding: 0, border: 'none', borderRadius: '6px', cursor: 'pointer' }} />
                            <input className="input-pro" value={config.subtitleColor || '#475569'} onChange={(e) => handleChange('subtitleColor', e.target.value)} />
                        </div>
                    </div>
                    <div>
                        <label className="label-pro">Couleur Badge</label>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <input type="color" value={config.badgeColor || '#e11d48'} onChange={(e) => handleChange('badgeColor', e.target.value)} style={{ width: '36px', height: '36px', padding: 0, border: 'none', borderRadius: '6px', cursor: 'pointer' }} />
                            <input className="input-pro" value={config.badgeColor || '#e11d48'} onChange={(e) => handleChange('badgeColor', e.target.value)} />
                        </div>
                    </div>
                </div>

                <div className="grid-2" style={{ marginTop: '1rem' }}>
                    <div>
                        <label className="label-pro">Couleur de Fond de la Section</label>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <input type="color" value={config.backgroundColor || '#ffffff'} onChange={(e) => handleChange('backgroundColor', e.target.value)} style={{ width: '36px', height: '36px', padding: 0, border: 'none', borderRadius: '6px', cursor: 'pointer' }} />
                            <input className="input-pro" value={config.backgroundColor || '#ffffff'} onChange={(e) => handleChange('backgroundColor', e.target.value)} />
                        </div>
                    </div>
                    <div>
                        <label className="label-pro">Dégradé CSS (Optionnel)</label>
                        <input className="input-pro" placeholder="linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%)" value={config.gradientBackground || ''} onChange={(e) => handleChange('gradientBackground', e.target.value)} />
                    </div>
                </div>

                <div style={{ marginTop: '1rem' }}>
                    <FileUploadField
                        label="Image de Fond de la Section"
                        value={config.bgImage || ''}
                        onChange={(url) => handleChange('bgImage', url)}
                        placeholder="Uploader une image de fond..."
                    />
                </div>

                {config.bgImage && (
                    <div style={{ marginTop: '1rem' }}>
                        <label className="label-pro">Opacité du Voile / Overlay ({config.bgImageOverlayOpacity || 40}%)</label>
                        <input 
                            type="range" 
                            min={0} 
                            max={100} 
                            value={config.bgImageOverlayOpacity !== undefined ? config.bgImageOverlayOpacity : 40} 
                            onChange={(e) => handleChange('bgImageOverlayOpacity', parseInt(e.target.value))}
                            style={{ width: '100%' }}
                        />
                    </div>
                )}
            </div>

        </div>
    );
};
