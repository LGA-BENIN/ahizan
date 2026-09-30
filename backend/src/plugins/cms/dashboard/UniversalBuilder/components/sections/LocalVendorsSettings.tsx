import React, { useState, useEffect } from 'react';
import { useAutoSave } from '../useAutoSave';
import { FileUploadField } from './FileUploadField';

interface LocalVendorsSettingsProps {
    data: any;
    onSave: (newData: any) => void;
}

export const LocalVendorsSettings = ({ data, onSave }: LocalVendorsSettingsProps) => {
    const [config, setConfig] = useState(data);
    useAutoSave(config, onSave);

    useEffect(() => {
        const defaults = {
            title: 'Soutenez les boutiques locales du Bénin',
            subtitle: 'Découvrez des boutiques de confiance, près de chez vous. Mode, artisanat, beauté, maison, électronique et bien plus encore.',
            badgeText: 'Nos boutiques',
            layoutStyle: 'split-ice-blue', // 'split-ice-blue' | 'grid' | 'carousel'
            columns: 4,
            take: 8,
            viewAllText: 'Voir toutes les boutiques',
            pillar1Text: 'Boutiques vérifiées',
            pillar2Text: 'Proches de vous',
            pillar3Text: 'Produits locaux et authentiques',
            showPillars: true,
            containerBgColor: '#F0F7FF',
            titleColor: '#0B1E3B',
            subtitleColor: '#475569',
            badgeBgColor: '#0B1E3B',
            badgeTextColor: '#ffffff',
            cardBgColor: '#ffffff',
            cardBorderColor: '#e2e8f0',
            cardTextColor: '#0f172a',
        };
        setConfig({ ...defaults, ...data });
    }, [data]);

    const handleChange = (field: string, value: any) => setConfig((prev: any) => ({ ...prev, [field]: value }));

    const insertToken = (field: string, token: string) => {
        const currentVal = config[field] || '';
        handleChange(field, `${currentVal} ${token}`.trim());
    };

    return (
        <div className="stack-lg" style={{ width: "100%", height: "100%", maxHeight: "calc(100vh - 200px)", overflowY: "auto", paddingBottom: "2rem" }}>
            
            {/* Dynamic Tokens Guide */}
            <div className="settings-card" style={{ borderLeft: '4px solid #0B1E3B', background: '#f0f7ff' }}>
                <div className="settings-card-header" style={{ color: '#0B1E3B', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    💡 Variables Dynamiques de Géolocalisation
                </div>
                <p style={{ fontSize: '12px', color: '#1e3a8a', margin: '4px 0 10px 0' }}>
                    Utilisez ces balises dans le titre ou sous-titre pour personnaliser le message selon la position du client :
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    <button type="button" onClick={() => insertToken('title', '{{position}}')} className="badge-token" style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #bfdbfe', background: '#ffffff', color: '#0B1E3B', fontSize: '11px', cursor: 'pointer', fontWeight: 600 }}>
                        + {"{{position}}"} (ex: Cotonou)
                    </button>
                    <button type="button" onClick={() => insertToken('title', '{{quartier}}')} className="badge-token" style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #bfdbfe', background: '#ffffff', color: '#0B1E3B', fontSize: '11px', cursor: 'pointer', fontWeight: 600 }}>
                        + {"{{quartier}}"} (ex: Cadjèhoun)
                    </button>
                    <button type="button" onClick={() => insertToken('subtitle', '{{distance}}')} className="badge-token" style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #bfdbfe', background: '#ffffff', color: '#0B1E3B', fontSize: '11px', cursor: 'pointer', fontWeight: 600 }}>
                        + {"{{distance}}"} (ex: à 1.2 km)
                    </button>
                </div>
            </div>

            {/* Disposition & Format */}
            <div className="settings-card">
                <div className="settings-card-header">📐 Format & Disposition de la Section</div>
                <div className="grid-2">
                    <div>
                        <label className="label-pro">Style Visuel de la Section</label>
                        <select 
                            className="input-pro" 
                            value={config.layoutStyle || 'split-ice-blue'} 
                            onChange={(e) => handleChange('layoutStyle', e.target.value)}
                        >
                            <option value="split-ice-blue">⭐ Style Capture (Encadré Bleu Glacé + Piliers à Gauche + Cartes à Droite)</option>
                            <option value="grid">Grille Classique (En-tête Haut + Cartes en Grille)</option>
                            <option value="carousel">Carrousel Défilant Horizontal</option>
                        </select>
                    </div>
                    <div>
                        <label className="label-pro">Nombre max de boutiques à afficher</label>
                        <input 
                            className="input-pro" 
                            type="number" 
                            min={2} 
                            max={50} 
                            value={config.take || 8} 
                            onChange={(e) => handleChange('take', parseInt(e.target.value))} 
                        />
                    </div>
                </div>
            </div>

            {/* Textes & Titres */}
            <div className="settings-card">
                <div className="settings-card-header">✍️ Textes & En-tête</div>
                <div className="grid-2">
                    <div>
                        <label className="label-pro">Titre de la section</label>
                        <input className="input-pro" value={config.title || ''} onChange={(e) => handleChange('title', e.target.value)} />
                    </div>
                    <div>
                        <label className="label-pro">Badge supérieur</label>
                        <input className="input-pro" value={config.badgeText || ''} onChange={(e) => handleChange('badgeText', e.target.value)} />
                    </div>
                </div>
                <div style={{ marginTop: '1rem' }}>
                    <label className="label-pro">Sous-titre / Description</label>
                    <textarea 
                        className="input-pro" 
                        rows={2} 
                        value={config.subtitle || ''} 
                        onChange={(e) => handleChange('subtitle', e.target.value)} 
                    />
                </div>
                <div style={{ marginTop: '1rem' }}>
                    <label className="label-pro">Texte du bouton CTA</label>
                    <input className="input-pro" value={config.viewAllText || ''} onChange={(e) => handleChange('viewAllText', e.target.value)} />
                </div>
            </div>

            {/* 3 Piliers de Réassurance (Style Capture) */}
            <div className="settings-card" style={{ borderLeft: '4px solid #3b82f6', background: '#f8fafc' }}>
                <div className="settings-card-header" style={{ color: '#1e40af' }}>
                    🛡️ Les 3 Piliers de Réassurance (Affichés à gauche)
                </div>
                <div className="stack" style={{ marginTop: '8px' }}>
                    <div className="toggle-row">
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600 }}>
                            <input 
                                type="checkbox" 
                                checked={config.showPillars !== false} 
                                onChange={(e) => handleChange('showPillars', e.target.checked)} 
                            /> 
                            Afficher les 3 piliers de réassurance
                        </label>
                    </div>

                    {config.showPillars !== false && (
                        <div className="grid-3" style={{ marginTop: '8px' }}>
                            <div>
                                <label className="label-pro">Pilier 1 (Sécurité)</label>
                                <input className="input-pro" value={config.pillar1Text || 'Boutiques vérifiées'} onChange={(e) => handleChange('pillar1Text', e.target.value)} />
                            </div>
                            <div>
                                <label className="label-pro">Pilier 2 (Proximité)</label>
                                <input className="input-pro" value={config.pillar2Text || 'Proches de vous'} onChange={(e) => handleChange('pillar2Text', e.target.value)} />
                            </div>
                            <div>
                                <label className="label-pro">Pilier 3 (Authenticité)</label>
                                <input className="input-pro" value={config.pillar3Text || 'Produits locaux et authentiques'} onChange={(e) => handleChange('pillar3Text', e.target.value)} />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* 🎬 Animations & Défilement */}
            <div className="settings-card">
                <div className="settings-card-header">🎬 Animations & Défilement Dynamique</div>
                <div className="grid-3">
                    <div>
                        <label className="label-pro">Animation d'apparition</label>
                        <select className="input-pro" value={config.animationType || 'fade-in'} onChange={(e) => handleChange('animationType', e.target.value)}>
                            <option value="none">Aucune</option>
                            <option value="fade-in">Fondu (Fade In)</option>
                            <option value="slide-up">Glissement vers le haut (Slide Up)</option>
                            <option value="zoom-in">Zoom In progressif</option>
                        </select>
                    </div>
                    <div>
                        <label className="label-pro">Effet au survol (Hover)</label>
                        <select className="input-pro" value={config.hoverEffect || 'lift'} onChange={(e) => handleChange('hoverEffect', e.target.value)}>
                            <option value="none">Aucun</option>
                            <option value="lift">Élévation & Ombre (Lift)</option>
                            <option value="zoom">Zoom doux (Scale)</option>
                            <option value="glow">Lueur / Glow</option>
                        </select>
                    </div>
                    <div>
                        <label className="label-pro">Défilement auto (Carrousel)</label>
                        <select className="input-pro" value={config.autoplaySpeed || '0'} onChange={(e) => handleChange('autoplaySpeed', e.target.value)}>
                            <option value="0">Désactivé (Manuel)</option>
                            <option value="3000">Rapide (3 secondes)</option>
                            <option value="5000">Normal (5 secondes)</option>
                            <option value="8000">Lent (8 secondes)</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Couleurs & Habillage */}
            <div className="settings-card">
                <div className="settings-card-header">🎨 Couleurs & Styles</div>
                <div className="grid-3">
                    <div>
                        <label className="label-pro">Couleur Titre</label>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <input type="color" value={config.titleColor || '#0B1E3B'} onChange={(e) => handleChange('titleColor', e.target.value)} style={{ width: '36px', height: '36px', padding: 0, border: 'none', borderRadius: '6px', cursor: 'pointer' }} />
                            <input className="input-pro" value={config.titleColor || '#0B1E3B'} onChange={(e) => handleChange('titleColor', e.target.value)} />
                        </div>
                    </div>
                    <div>
                        <label className="label-pro">Couleur Fond Encadré</label>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <input type="color" value={config.containerBgColor || '#F0F7FF'} onChange={(e) => handleChange('containerBgColor', e.target.value)} style={{ width: '36px', height: '36px', padding: 0, border: 'none', borderRadius: '6px', cursor: 'pointer' }} />
                            <input className="input-pro" value={config.containerBgColor || '#F0F7FF'} onChange={(e) => handleChange('containerBgColor', e.target.value)} />
                        </div>
                    </div>
                    <div>
                        <label className="label-pro">Couleur Fond Badge</label>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <input type="color" value={config.badgeBgColor || '#0B1E3B'} onChange={(e) => handleChange('badgeBgColor', e.target.value)} style={{ width: '36px', height: '36px', padding: 0, border: 'none', borderRadius: '6px', cursor: 'pointer' }} />
                            <input className="input-pro" value={config.badgeBgColor || '#0B1E3B'} onChange={(e) => handleChange('badgeBgColor', e.target.value)} />
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
};
