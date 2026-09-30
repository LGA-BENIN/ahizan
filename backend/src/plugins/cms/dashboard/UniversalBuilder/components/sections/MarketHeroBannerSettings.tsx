import React, { useState, useEffect } from 'react';
import { useAutoSave } from '../useAutoSave';
import { FileUploadField } from './FileUploadField';

interface SlideItem {
    id?: string;
    imageUrl: string;
    title?: string;
    subtitle?: string;
}

interface MarketHeroBannerSettingsProps {
    data: any;
    onSave: (newData: any) => void;
}

export const MarketHeroBannerSettings = ({ data, onSave }: MarketHeroBannerSettingsProps) => {
    const [config, setConfig] = useState(data);
    useAutoSave(config, onSave);

    useEffect(() => {
        const defaults = {
            bgType: 'DEFAULT_MARKET_IMAGE',
            bgImageUrl: '',
            bgColor: '#0f172a',
            bgGradient: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #047857 100%)',
            slides: [],
            autoplaySpeed: 5000,
            overlayOpacity: 45,
            height: 'medium',
            textAlign: 'left',

            title: '🌴 {{market.name}}',
            subtitle: 'Le marché officiel de {{market.location}}',
            description: '',
            welcomeText: 'Bienvenue au Cœur du Marché',

            showLocationBadge: true,
            locationBadgeText: '',
            showVendorsBadge: true,
            vendorsBadgeText: '',
            manualVendorsCount: '',
            showProductsBadge: true,
            productsBadgeText: '',
            manualProductsCount: '',
            showVerifiedBadge: true,
            verifiedBadgeText: 'Vendeurs Vérifiés & Certifiés',

            showCta: true,
            ctaText: 'Explorer le Marché',
            ctaLink: '#boutiques',
        };
        setConfig({ ...defaults, ...data });
    }, [data]);

    const handleChange = (field: string, value: any) => setConfig({ ...config, [field]: value });

    const handleAddSlide = () => {
        const newSlides = [...(config.slides || []), { id: Date.now().toString(), imageUrl: '', title: '', subtitle: '' }];
        handleChange('slides', newSlides);
    };

    const handleUpdateSlide = (index: number, field: string, val: string) => {
        const newSlides = [...(config.slides || [])];
        newSlides[index] = { ...newSlides[index], [field]: val };
        handleChange('slides', newSlides);
    };

    const handleRemoveSlide = (index: number) => {
        const newSlides = (config.slides || []).filter((_: any, i: number) => i !== index);
        handleChange('slides', newSlides);
    };

    return (
        <div className="stack-lg" style={{ width: "100%", height: "100%", maxHeight: "calc(100vh - 200px)", overflowY: "auto" }}>
            
            {/* 1. Titre & Identité */}
            <div className="settings-card">
                <div className="settings-card-header">🌴 Identité & Accroche du Marché</div>
                <div className="grid-2">
                    <div>
                        <label className="label-pro">Grand Titre (supporte {'{{market.name}}'})</label>
                        <input className="input-pro" value={config.title || ''} onChange={(e) => handleChange('title', e.target.value)} placeholder="ex: 🌴 {{market.name}} ou TOPA" />
                    </div>
                    <div>
                        <label className="label-pro">Badge d'accueil / Slogan supérieur</label>
                        <input className="input-pro" value={config.welcomeText || ''} onChange={(e) => handleChange('welcomeText', e.target.value)} placeholder="ex: Bienvenue au Cœur du Marché" />
                    </div>
                </div>
                <div style={{ marginTop: '1rem' }}>
                    <label className="label-pro">Sous-titre (supporte {'{{market.location}}'})</label>
                    <input className="input-pro" value={config.subtitle || ''} onChange={(e) => handleChange('subtitle', e.target.value)} placeholder="ex: Le marché officiel de {{market.location}}" />
                </div>
                <div style={{ marginTop: '1rem' }}>
                    <label className="label-pro">Description ou note d'ambiance</label>
                    <textarea 
                        className="input-pro" 
                        rows={2} 
                        value={config.description || ''} 
                        onChange={(e) => handleChange('description', e.target.value)} 
                        placeholder="Laissez vide pour utiliser la description par défaut du marché..." 
                    />
                </div>
            </div>

            {/* 2. Type de Fond & Carrousel d'Images */}
            <div className="settings-card">
                <div className="settings-card-header">🖼️ Arrière-plan & Carrousel Multi-Images</div>
                
                <div style={{ marginBottom: '1rem' }}>
                    <label className="label-pro">Mode d'arrière-plan</label>
                    <select className="input-pro" value={config.bgType || 'DEFAULT_MARKET_IMAGE'} onChange={(e) => handleChange('bgType', e.target.value)}>
                        <option value="DEFAULT_MARKET_IMAGE">📸 Image par défaut du marché (Automatique)</option>
                        <option value="CUSTOM_IMAGE">🖼️ Image unique personnalisée (Upload)</option>
                        <option value="SLIDESHOW">🎞️ Diaporama / Carrousel Multi-Images</option>
                        <option value="COLOR_GRADIENT">🎨 Dégradé de Couleurs / Sans photo</option>
                    </select>
                </div>

                {config.bgType === 'CUSTOM_IMAGE' && (
                    <div style={{ marginTop: '1rem' }}>
                        <FileUploadField 
                            label="Uploader l'image de fond principale" 
                            value={config.bgImageUrl || ''} 
                            onChange={(val) => handleChange('bgImageUrl', val)} 
                        />
                    </div>
                )}

                {config.bgType === 'SLIDESHOW' && (
                    <div style={{ marginTop: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                            <span className="label-pro" style={{ margin: 0 }}>Images du Carrousel ({(config.slides || []).length})</span>
                            <button type="button" onClick={handleAddSlide} className="btn-pro" style={{ padding: '4px 10px', fontSize: '0.75rem', background: '#059669', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                                + Ajouter une image
                            </button>
                        </div>

                        {(config.slides || []).length === 0 ? (
                            <p style={{ fontSize: '0.8rem', color: '#64748b', fontStyle: 'italic' }}>Aucune image ajoutée. Cliquez sur "+ Ajouter une image".</p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {(config.slides || []).map((slide: any, idx: number) => (
                                    <div key={slide.id || idx} style={{ padding: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                            <span style={{ fontWeight: 700, fontSize: '0.8rem', color: '#1e293b' }}>Slide #{idx + 1}</span>
                                            <button type="button" onClick={() => handleRemoveSlide(idx)} style={{ color: '#ef4444', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}>
                                                🗑️ Supprimer
                                            </button>
                                        </div>
                                        <FileUploadField 
                                            label={`Image Slide ${idx + 1}`} 
                                            value={slide.imageUrl || ''} 
                                            onChange={(val) => handleUpdateSlide(idx, 'imageUrl', val)} 
                                        />
                                    </div>
                                ))}
                            </div>
                        )}

                        <div style={{ marginTop: '1rem' }}>
                            <label className="label-pro">Vitesse de défilement automatique (millisecondes)</label>
                            <input type="number" className="input-pro" value={config.autoplaySpeed || 5000} onChange={(e) => handleChange('autoplaySpeed', Number(e.target.value))} />
                        </div>
                    </div>
                )}

                {config.bgType === 'COLOR_GRADIENT' && (
                    <div className="grid-2" style={{ marginTop: '1rem' }}>
                        <div>
                            <label className="label-pro">Couleur de fond de secours</label>
                            <input type="color" className="color-swatch" value={config.bgColor || '#0f172a'} onChange={(e) => handleChange('bgColor', e.target.value)} />
                        </div>
                        <div>
                            <label className="label-pro">Dégradé CSS (ex: linear-gradient(...))</label>
                            <input className="input-pro" value={config.bgGradient || ''} onChange={(e) => handleChange('bgGradient', e.target.value)} placeholder="linear-gradient(...)" />
                        </div>
                    </div>
                )}

                <div className="grid-2" style={{ marginTop: '1.25rem' }}>
                    <div>
                        <label className="label-pro">Assombrissement de l'image ({config.overlayOpacity || 45}%)</label>
                        <input 
                            type="range" 
                            min="0" 
                            max="90" 
                            value={config.overlayOpacity !== undefined ? config.overlayOpacity : 45} 
                            onChange={(e) => handleChange('overlayOpacity', Number(e.target.value))} 
                            style={{ width: '100%' }}
                        />
                    </div>
                    <div>
                        <label className="label-pro">Hauteur de la Bannière</label>
                        <select className="input-pro" value={config.height || 'medium'} onChange={(e) => handleChange('height', e.target.value)}>
                            <option value="compact">Compacte (250px)</option>
                            <option value="medium">Standard (320px - Recommandé)</option>
                            <option value="large">Grande Immersion (440px)</option>
                            <option value="full">Plein Écran (55% hauteur)</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* 3. Badges d'Identité & Compteurs */}
            <div className="settings-card">
                <div className="settings-card-header">🏷️ Badges & Compteurs Statistiques du Marché</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    
                    <div className="toggle-row">
                        <label>
                            <input 
                                type="checkbox" 
                                checked={config.showLocationBadge !== false} 
                                onChange={(e) => handleChange('showLocationBadge', e.target.checked)} 
                            /> 
                            📍 Afficher le badge de localisation (ex: Topa · Zone)
                        </label>
                    </div>

                    <div className="toggle-row">
                        <label>
                            <input 
                                type="checkbox" 
                                checked={config.showVendorsBadge !== false} 
                                onChange={(e) => handleChange('showVendorsBadge', e.target.checked)} 
                            /> 
                            🏪 Afficher le badge du nombre de boutiques
                        </label>
                    </div>

                    <div className="toggle-row">
                        <label>
                            <input 
                                type="checkbox" 
                                checked={config.showProductsBadge !== false} 
                                onChange={(e) => handleChange('showProductsBadge', e.target.checked)} 
                            /> 
                            🛍️ Afficher le badge du nombre de produits
                        </label>
                    </div>

                    <div className="toggle-row">
                        <label>
                            <input 
                                type="checkbox" 
                                checked={config.showVerifiedBadge !== false} 
                                onChange={(e) => handleChange('showVerifiedBadge', e.target.checked)} 
                            /> 
                            🛡️ Afficher le badge "Vendeurs Vérifiés & Certifiés"
                        </label>
                    </div>
                </div>
            </div>

            {/* 4. Bouton d'Action (CTA) */}
            <div className="settings-card">
                <div className="settings-card-header">🔘 Bouton d'Action (Explorer le Marché)</div>
                <div className="toggle-row" style={{ marginBottom: '1rem' }}>
                    <label>
                        <input 
                            type="checkbox" 
                            checked={config.showCta !== false} 
                            onChange={(e) => handleChange('showCta', e.target.checked)} 
                        /> 
                        Activer le bouton principal
                    </label>
                </div>

                {config.showCta !== false && (
                    <div className="grid-2">
                        <div>
                            <label className="label-pro">Texte du bouton</label>
                            <input className="input-pro" value={config.ctaText || ''} onChange={(e) => handleChange('ctaText', e.target.value)} placeholder="Explorer le Marché" />
                        </div>
                        <div>
                            <label className="label-pro">Lien / Ancre de défilement</label>
                            <input className="input-pro" value={config.ctaLink || ''} onChange={(e) => handleChange('ctaLink', e.target.value)} placeholder="#boutiques ou #catalogue" />
                        </div>
                    </div>
                )}
            </div>

        </div>
    );
};

export default MarketHeroBannerSettings;
