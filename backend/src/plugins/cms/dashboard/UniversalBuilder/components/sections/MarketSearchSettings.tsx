import React, { useState, useEffect } from 'react';
import { useAutoSave } from '../useAutoSave';

interface MarketSearchSettingsProps {
    data: any;
    onSave: (newData: any) => void;
}

export const MarketSearchSettings = ({ data, onSave }: MarketSearchSettingsProps) => {
    const [config, setConfig] = useState(data);
    const [newTag, setNewTag] = useState('');
    useAutoSave(config, onSave);

    useEffect(() => {
        const defaults = {
            title: '',
            subtitle: '',
            placeholder: 'Rechercher un produit au {{market.name}}...',
            backgroundColor: 'transparent',
            bgGradient: '',
            accentColor: '#0B1E3B',
            searchStyle: 'floating-pill', // 'floating-pill' | 'modern-card' | 'glass'
            showQuickTags: true,
            quickTags: [
                "Tomates & Légumes", 
                "Tissu Wax & Mode", 
                "Gari & Vivriers", 
                "Poissons & Viandes", 
                "Épices & Condiments",
                "Maroquinerie"
            ],
            showVendorMatches: true,
            maxSuggestions: 8,
        };
        setConfig({ ...defaults, ...data });
    }, [data]);

    const handleChange = (field: string, value: any) => setConfig((prev: any) => ({ ...prev, [field]: value }));

    const handleAddTag = () => {
        if (!newTag.trim()) return;
        const current = Array.isArray(config.quickTags) ? [...config.quickTags] : [];
        current.push(newTag.trim());
        handleChange('quickTags', current);
        setNewTag('');
    };

    const handleRemoveTag = (index: number) => {
        const current = Array.isArray(config.quickTags) ? [...config.quickTags] : [];
        current.splice(index, 1);
        handleChange('quickTags', current);
    };

    const tags: string[] = Array.isArray(config.quickTags) ? config.quickTags : [];

    return (
        <div className="stack-lg" style={{ width: "100%", height: "100%", maxHeight: "calc(100vh - 200px)", overflowY: "auto", paddingBottom: "2rem" }}>
            
            {/* Guide Info */}
            <div className="settings-card" style={{ borderLeft: '4px solid #0B1E3B', background: '#f0f7ff' }}>
                <div className="settings-card-header" style={{ color: '#0B1E3B' }}>
                    🔍 Recherche Dédiée aux Produits du Marché
                </div>
                <p style={{ fontSize: '12px', color: '#1e3a8a', margin: '4px 0 0 0', lineHeight: 1.5 }}>
                    Cette barre de recherche est <b>strictement verrouillée sur le marché actif</b>. Les résultats de saisie automatique et de filtrage n'affichent que les produits et boutiques installés dans ce marché.
                </p>
            </div>

            {/* Placeholder & Textes */}
            <div className="settings-card">
                <div className="settings-card-header">✍️ Textes & Placeholder</div>
                <div className="stack">
                    <div>
                        <label className="label-pro">Texte d'invite (Placeholder dans la barre)</label>
                        <input 
                            className="input-pro" 
                            value={config.placeholder || ''} 
                            onChange={(e) => handleChange('placeholder', e.target.value)} 
                            placeholder="ex: Rechercher un produit au {{market.name}}..."
                        />
                        <span style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', display: 'block' }}>
                            Astuce : Utilisez <code>{"{{market.name}}"}</code> pour injecter automatiquement le nom du marché.
                        </span>
                    </div>

                    <div className="grid-2" style={{ marginTop: '0.5rem' }}>
                        <div>
                            <label className="label-pro">Titre supérieur (Optionnel)</label>
                            <input 
                                className="input-pro" 
                                value={config.title || ''} 
                                onChange={(e) => handleChange('title', e.target.value)} 
                                placeholder="ex: Que cherchez-vous au marché ?"
                            />
                        </div>
                        <div>
                            <label className="label-pro">Sous-titre (Optionnel)</label>
                            <input 
                                className="input-pro" 
                                value={config.subtitle || ''} 
                                onChange={(e) => handleChange('subtitle', e.target.value)} 
                                placeholder="ex: Trouvez immédiatement vos articles auprès des commerçants"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Style & Apparence */}
            <div className="settings-card">
                <div className="settings-card-header">🎨 Style & Apparence de la Barre</div>
                <div className="grid-2">
                    <div>
                        <label className="label-pro">Style Visuel de la Barre</label>
                        <select 
                            className="input-pro" 
                            value={config.searchStyle || 'floating-pill'} 
                            onChange={(e) => handleChange('searchStyle', e.target.value)}
                        >
                            <option value="floating-pill">💊 Pilule Flottante avec Ombre Moderne</option>
                            <option value="glass">✨ Effet Glassmorphism (Verre Dépoli)</option>
                            <option value="modern-card">📐 Carte Rectangulaire Moderne</option>
                        </select>
                    </div>

                    <div>
                        <label className="label-pro">Nombre max de suggestions affichées</label>
                        <input 
                            className="input-pro" 
                            type="number" 
                            min={3} 
                            max={20} 
                            value={config.maxSuggestions || 8} 
                            onChange={(e) => handleChange('maxSuggestions', parseInt(e.target.value, 10))}
                        />
                    </div>
                </div>

                <div className="grid-2" style={{ marginTop: '1rem' }}>
                    <div>
                        <label className="label-pro">Couleur d'accentuation (Focus / Bouton)</label>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <input 
                                type="color" 
                                value={config.accentColor || '#0B1E3B'} 
                                onChange={(e) => handleChange('accentColor', e.target.value)} 
                                style={{ width: '36px', height: '36px', padding: 0, border: 'none', borderRadius: '6px', cursor: 'pointer' }} 
                            />
                            <input className="input-pro" value={config.accentColor || '#0B1E3B'} onChange={(e) => handleChange('accentColor', e.target.value)} />
                        </div>
                    </div>

                    <div>
                        <label className="label-pro">Couleur de fond de la section</label>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <input 
                                type="color" 
                                value={config.backgroundColor === 'transparent' ? '#ffffff' : (config.backgroundColor || '#ffffff')} 
                                onChange={(e) => handleChange('backgroundColor', e.target.value)} 
                                style={{ width: '36px', height: '36px', padding: 0, border: 'none', borderRadius: '6px', cursor: 'pointer' }} 
                            />
                            <input className="input-pro" value={config.backgroundColor || 'transparent'} onChange={(e) => handleChange('backgroundColor', e.target.value)} />
                        </div>
                    </div>
                </div>

                <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                        <input 
                            type="checkbox" 
                            checked={config.showVendorMatches !== false} 
                            onChange={(e) => handleChange('showVendorMatches', e.target.checked)} 
                        />
                        <span style={{ fontWeight: 600 }}>Afficher les boutiques correspondantes dans les résultats de recherche</span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                        <input 
                            type="checkbox" 
                            checked={config.showQuickTags !== false} 
                            onChange={(e) => handleChange('showQuickTags', e.target.checked)} 
                        />
                        <span style={{ fontWeight: 600 }}>Afficher les tags / suggestions rapides sous la barre de recherche</span>
                    </label>
                </div>
            </div>

            {/* Gestion des Tags Rapides */}
            {config.showQuickTags !== false && (
                <div className="settings-card">
                    <div className="settings-card-header">🏷️ Tags de Recherche Rapide (Rayons & Mots-clés)</div>
                    <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 10px 0' }}>
                        Les visiteurs peuvent cliquer sur ces suggestions pour filtrer instantanément les articles du marché :
                    </p>

                    <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                        <input 
                            className="input-pro" 
                            placeholder="Ajouter un tag (ex: Poissons fumés, Huile de palme...)" 
                            value={newTag} 
                            onChange={(e) => setNewTag(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); } }}
                        />
                        <button 
                            type="button" 
                            onClick={handleAddTag} 
                            style={{ padding: '8px 16px', background: '#0B1E3B', color: '#ffffff', borderRadius: '8px', border: 'none', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}
                        >
                            Ajouter
                        </button>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {tags.map((tag, idx) => (
                            <span 
                                key={idx} 
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, color: '#334155' }}
                            >
                                <span>{tag}</span>
                                <button 
                                    type="button" 
                                    onClick={() => handleRemoveTag(idx)} 
                                    style={{ border: 'none', background: 'transparent', color: '#ef4444', fontWeight: 'bold', cursor: 'pointer', padding: 0 }}
                                >
                                    ✕
                                </button>
                            </span>
                        ))}
                    </div>
                </div>
            )}

        </div>
    );
};

export default MarketSearchSettings;
