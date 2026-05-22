import React, { useState, useEffect } from 'react';
import { FileUploadField } from './FileUploadField';
import { useAutoSave } from '../useAutoSave';

interface ThemeSettingsProps {
    data: any;
    onSave: (newData: any) => void;
}

export const ThemeSettings = ({ data, onSave }: ThemeSettingsProps) => {
    const [config, setConfig] = useState(data);
    useAutoSave(config, onSave);

    useEffect(() => {
        const defaults = {
            primaryColor: '#0f172a',
            secondaryColor: '#f59e0b',
            accentColor: '#e31837',
            successColor: '#059669',
            warningColor: '#d97706',
            dangerColor: '#dc2626',
            backgroundColor: '#ffffff',
            surfaceColor: '#f8fafc',
            textColor: '#1e293b',
            textMutedColor: '#64748b',
            borderColor: '#e2e8f0',
            fontFamily: 'Inter, sans-serif',
            headingFontFamily: 'Inter, sans-serif',
            baseFontSize: '16px',
            headingFontWeight: '800',
            bodyLineHeight: '1.6',
            borderRadius: '8px',
            buttonRadius: '8px',
            cardRadius: '12px',
            inputRadius: '8px',
            layoutMode: 'boxed',
            maxWidth: '1280px',
            sectionSpacing: '48px',
            containerPadding: '16px',
            backgroundType: 'color',
            backgroundImageUrl: '',
            backgroundVideoUrl: '',
            backgroundOverlay: 0,
            backgroundFixed: false,
            backgroundBlur: 0,
            buttonStyle: 'filled',
            buttonSize: 'md',
            buttonTextTransform: 'uppercase',
            shadowIntensity: 'medium',
            animationSpeed: 'normal',
            enableAnimations: true,
            enableHoverEffects: true,
            enableSmoothScroll: true,
            preloader: { type: 'default', url: '', bgColor: '#ffffff', duration: 2 },
            scrollToTop: { enabled: true, style: 'circle', color: '#0f172a' },
            favicon: ''
        };
        setConfig({ ...defaults, ...data });
    }, [data]);

    const handleChange = (field: string, value: any) => {
        setConfig({ ...config, [field]: value });
    };

    const handleNestedChange = (parent: string, field: string, value: any) => {
        setConfig({ ...config, [parent]: { ...config[parent], [field]: value } });
    };

    const ColorField = ({ label, field }: { label: string; field: string }) => (
        <div>
            <label className="label-pro">{label}</label>
            <div className="color-row">
                <input type="color" className="color-swatch" value={config[field] || '#000000'} onChange={(e) => handleChange(field, e.target.value)} />
                <input className="input-pro" value={config[field] || ''} onChange={(e) => handleChange(field, e.target.value)} />
            </div>
        </div>
    );

    return (
        <div className="stack-lg" style={{ width: '100%', maxWidth: '860px' }}>

            {/* ===== COLOR PALETTE ===== */}
            <div className="settings-card">
                <div className="settings-card-header">🎨 Palette de couleurs</div>
                <div className="grid-2" style={{ marginBottom: '1rem' }}>
                    <ColorField label="Couleur primaire" field="primaryColor" />
                    <ColorField label="Couleur secondaire" field="secondaryColor" />
                </div>
                <div className="grid-3">
                    <ColorField label="Accent / Appel à l'action" field="accentColor" />
                    <ColorField label="Succès" field="successColor" />
                    <ColorField label="Danger / Promotion" field="dangerColor" />
                </div>
                <div className="divider" style={{ margin: '1rem 0' }} />
                <div className="grid-3">
                    <ColorField label="Arrière-plan" field="backgroundColor" />
                    <ColorField label="Surface / Carte" field="surfaceColor" />
                    <ColorField label="Bordure" field="borderColor" />
                </div>
                <div className="divider" style={{ margin: '1rem 0' }} />
                <div className="grid-2">
                    <ColorField label="Texte principal" field="textColor" />
                    <ColorField label="Texte estompé" field="textMutedColor" />
                </div>
            </div>

            {/* ===== TYPOGRAPHY ===== */}
            <div className="settings-card">
                <div className="settings-card-header">🔤 Typographie</div>
                <div className="grid-2">
                    <div>
                        <label className="label-pro">Police du corps</label>
                        <select className="input-pro" value={config.fontFamily} onChange={(e) => handleChange('fontFamily', e.target.value)}>
                            <option value="Inter, sans-serif">Inter (Moderne)</option>
                            <option value="'Roboto', sans-serif">Roboto (Clair)</option>
                            <option value="'Outfit', sans-serif">Outfit (Premium)</option>
                            <option value="'Poppins', sans-serif">Poppins (Amical)</option>
                            <option value="'DM Sans', sans-serif">DM Sans (Contemporain)</option>
                            <option value="'Plus Jakarta Sans', sans-serif">Jakarta Sans (Élégant)</option>
                            <option value="system-ui">Défaut système</option>
                        </select>
                    </div>
                    <div>
                        <label className="label-pro">Police des titres</label>
                        <select className="input-pro" value={config.headingFontFamily} onChange={(e) => handleChange('headingFontFamily', e.target.value)}>
                            <option value="Inter, sans-serif">Identique au corps</option>
                            <option value="'Playfair Display', serif">Playfair Display (Luxe)</option>
                            <option value="'Space Grotesk', sans-serif">Space Grotesk (Tech)</option>
                            <option value="'Clash Display', sans-serif">Clash Display (Gras)</option>
                        </select>
                    </div>
                </div>
                <div className="grid-3" style={{ marginTop: '1rem' }}>
                    <div>
                        <label className="label-pro">Taille de police de base</label>
                        <select className="input-pro" value={config.baseFontSize} onChange={(e) => handleChange('baseFontSize', e.target.value)}>
                            <option value="14px">14px (Compact)</option>
                            <option value="15px">15px (Serré)</option>
                            <option value="16px">16px (Standard)</option>
                            <option value="17px">17px (Détendu)</option>
                            <option value="18px">18px (Grand)</option>
                        </select>
                    </div>
                    <div>
                        <label className="label-pro">Épaisseur des titres</label>
                        <select className="input-pro" value={config.headingFontWeight} onChange={(e) => handleChange('headingFontWeight', e.target.value)}>
                            <option value="600">Semi-gras (600)</option>
                            <option value="700">Gras (700)</option>
                            <option value="800">Extra-gras (800)</option>
                            <option value="900">Noir (900)</option>
                        </select>
                    </div>
                    <div>
                        <label className="label-pro">Hauteur de ligne</label>
                        <select className="input-pro" value={config.bodyLineHeight} onChange={(e) => handleChange('bodyLineHeight', e.target.value)}>
                            <option value="1.4">Serré (1.4)</option>
                            <option value="1.5">Normal (1.5)</option>
                            <option value="1.6">Détendu (1.6)</option>
                            <option value="1.8">Spacieux (1.8)</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* ===== BORDER RADIUS / SHAPES ===== */}
            <div className="settings-card">
                <div className="settings-card-header">◻️ Formes et Coins</div>
                <div className="grid-2">
                    <div>
                        <label className="label-pro">Rayon de bordure global</label>
                        <select className="input-pro" value={config.borderRadius} onChange={(e) => handleChange('borderRadius', e.target.value)}>
                            <option value="0px">Anguleux (0px)</option>
                            <option value="4px">Subtil (4px)</option>
                            <option value="8px">Standard (8px)</option>
                            <option value="12px">Arrondi (12px)</option>
                            <option value="16px">Lisse (16px)</option>
                            <option value="9999px">Pilule (Complet)</option>
                        </select>
                    </div>
                    <div>
                        <label className="label-pro">Rayon des boutons</label>
                        <select className="input-pro" value={config.buttonRadius} onChange={(e) => handleChange('buttonRadius', e.target.value)}>
                            <option value="0px">Carré</option>
                            <option value="4px">Subtil</option>
                            <option value="8px">Standard</option>
                            <option value="9999px">Pilule</option>
                        </select>
                    </div>
                </div>
                <div className="grid-2" style={{ marginTop: '1rem' }}>
                    <div>
                        <label className="label-pro">Rayon des cartes</label>
                        <select className="input-pro" value={config.cardRadius} onChange={(e) => handleChange('cardRadius', e.target.value)}>
                            <option value="0px">Anguleux</option>
                            <option value="8px">Petit</option>
                            <option value="12px">Moyen</option>
                            <option value="16px">Grand</option>
                            <option value="24px">Très grand</option>
                        </select>
                    </div>
                    <div>
                        <label className="label-pro">Intensité de l'ombre</label>
                        <select className="input-pro" value={config.shadowIntensity} onChange={(e) => handleChange('shadowIntensity', e.target.value)}>
                            <option value="none">Aucune (Plat)</option>
                            <option value="subtle">Subtile</option>
                            <option value="medium">Moyenne</option>
                            <option value="strong">Forte</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* ===== LAYOUT & SPACING ===== */}
            <div className="settings-card">
                <div className="settings-card-header">📐 Mise en page et Espacement</div>
                <div className="grid-2">
                    <div>
                        <label className="label-pro">Mode de mise en page</label>
                        <select className="input-pro" value={config.layoutMode} onChange={(e) => handleChange('layoutMode', e.target.value)}>
                            <option value="boxed">Encadré (Centré)</option>
                            <option value="full">Pleine largeur (Bord à bord)</option>
                            <option value="wide">Large (1440px)</option>
                        </select>
                    </div>
                    <div>
                        <label className="label-pro">Largeur maximale du contenu</label>
                        <select className="input-pro" value={config.maxWidth} onChange={(e) => handleChange('maxWidth', e.target.value)}>
                            <option value="1024px">1024px (Étroit)</option>
                            <option value="1152px">1152px (Compact)</option>
                            <option value="1280px">1280px (Standard)</option>
                            <option value="1440px">1440px (Large)</option>
                            <option value="1600px">1600px (Ultra-large)</option>
                        </select>
                    </div>
                </div>
                <div className="grid-2" style={{ marginTop: '1rem' }}>
                    <div>
                        <label className="label-pro">Espacement des sections</label>
                        <select className="input-pro" value={config.sectionSpacing} onChange={(e) => handleChange('sectionSpacing', e.target.value)}>
                            <option value="24px">Serré (24px)</option>
                            <option value="32px">Compact (32px)</option>
                            <option value="48px">Standard (48px)</option>
                            <option value="64px">Spacieux (64px)</option>
                            <option value="80px">Ultra-spacieux (80px)</option>
                        </select>
                    </div>
                    <div>
                        <label className="label-pro">Marges internes (Padding)</label>
                        <select className="input-pro" value={config.containerPadding} onChange={(e) => handleChange('containerPadding', e.target.value)}>
                            <option value="12px">Serré (12px)</option>
                            <option value="16px">Standard (16px)</option>
                            <option value="24px">Détendu (24px)</option>
                            <option value="32px">Large (32px)</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* ===== BUTTONS ===== */}
            <div className="settings-card">
                <div className="settings-card-header">🔘 Style des boutons</div>
                <div className="grid-3">
                    <div>
                        <label className="label-pro">Style de bouton</label>
                        <select className="input-pro" value={config.buttonStyle} onChange={(e) => handleChange('buttonStyle', e.target.value)}>
                            <option value="filled">Rempli (Plein)</option>
                            <option value="outline">Contour</option>
                            <option value="ghost">Fantôme (Transparent)</option>
                            <option value="gradient">Dégradé</option>
                        </select>
                    </div>
                    <div>
                        <label className="label-pro">Taille de bouton</label>
                        <select className="input-pro" value={config.buttonSize} onChange={(e) => handleChange('buttonSize', e.target.value)}>
                            <option value="sm">Petit</option>
                            <option value="md">Moyen</option>
                            <option value="lg">Grand</option>
                            <option value="xl">Très grand</option>
                        </select>
                    </div>
                    <div>
                        <label className="label-pro">Transformation du texte</label>
                        <select className="input-pro" value={config.buttonTextTransform} onChange={(e) => handleChange('buttonTextTransform', e.target.value)}>
                            <option value="none">Normal</option>
                            <option value="uppercase">MAJUSCULES</option>
                            <option value="capitalize">Première lettre majuscule</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* ===== SITE BACKGROUND ===== */}
            <div className="settings-card">
                <div className="settings-card-header">🖼️ Arrière-plan du site</div>
                <div>
                    <label className="label-pro">Type d'arrière-plan</label>
                    <select className="input-pro" value={config.backgroundType} onChange={(e) => handleChange('backgroundType', e.target.value)}>
                        <option value="color">Couleur unie</option>
                        <option value="gradient">Dégradé</option>
                        <option value="image">Image</option>
                        <option value="video">Vidéo d'ambiance</option>
                        <option value="pattern">Motif / Texture</option>
                    </select>
                </div>
                {config.backgroundType === 'color' && (
                    <div style={{ marginTop: '1rem' }}>
                        <ColorField label="Couleur d'arrière-plan" field="backgroundColor" />
                    </div>
                )}
                {(config.backgroundType === 'image' || config.backgroundType === 'video' || config.backgroundType === 'pattern') && (
                    <div className="stack" style={{ marginTop: '1rem' }}>
                        {config.backgroundType === 'video' ? (
                            <FileUploadField label="Vidéo d'arrière-plan" value={config.backgroundVideoUrl} onChange={(v) => handleChange('backgroundVideoUrl', v)} accept="video/mp4,video/webm" />
                        ) : (
                            <FileUploadField label="Image d'arrière-plan" value={config.backgroundImageUrl} onChange={(v) => handleChange('backgroundImageUrl', v)} accept="image/*,image/gif" />
                        )}
                        <div className="grid-2">
                            <div>
                                <label className="label-pro">Opacité de superposition ({Math.round(config.backgroundOverlay * 100)}%)</label>
                                <input type="range" className="range-pro" min="0" max="0.9" step="0.05" value={config.backgroundOverlay} onChange={(e) => handleChange('backgroundOverlay', parseFloat(e.target.value))} />
                            </div>
                            <div>
                                <label className="label-pro">Flou ({config.backgroundBlur}px)</label>
                                <input type="range" className="range-pro" min="0" max="20" step="1" value={config.backgroundBlur} onChange={(e) => handleChange('backgroundBlur', parseInt(e.target.value))} />
                            </div>
                        </div>
                        <div className="toggle-row">
                            <label><input type="checkbox" checked={config.backgroundFixed} onChange={(e) => handleChange('backgroundFixed', e.target.checked)} /> Arrière-plan fixe / Parallaxe</label>
                        </div>
                    </div>
                )}
            </div>

            {/* ===== ANIMATIONS & EFFECTS ===== */}
            <div className="settings-card">
                <div className="settings-card-header">✨ Animations et Effets</div>
                <div className="grid-2">
                    <div>
                        <label className="label-pro">Vitesse d'animation</label>
                        <select className="input-pro" value={config.animationSpeed} onChange={(e) => handleChange('animationSpeed', e.target.value)}>
                            <option value="none">Désactivé</option>
                            <option value="fast">Rapide (150ms)</option>
                            <option value="normal">Normale (300ms)</option>
                            <option value="slow">Lente (500ms)</option>
                        </select>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', justifyContent: 'center' }}>
                        <div className="toggle-row"><label><input type="checkbox" checked={config.enableAnimations} onChange={(e) => handleChange('enableAnimations', e.target.checked)} /> Activer les animations au défilement</label></div>
                        <div className="toggle-row"><label><input type="checkbox" checked={config.enableHoverEffects} onChange={(e) => handleChange('enableHoverEffects', e.target.checked)} /> Activer les effets au survol</label></div>
                        <div className="toggle-row"><label><input type="checkbox" checked={config.enableSmoothScroll} onChange={(e) => handleChange('enableSmoothScroll', e.target.checked)} /> Défilement fluide</label></div>
                    </div>
                </div>
            </div>

            {/* ===== PRELOADER ===== */}
            <div className="settings-card">
                <div className="settings-card-header">⏳ Préchargeur du site</div>
                <div className="grid-2">
                    <div>
                        <label className="label-pro">Type de préchargeur</label>
                        <select className="input-pro" value={config.preloader?.type} onChange={(e) => handleNestedChange('preloader', 'type', e.target.value)}>
                            <option value="default">✨ Défaut Ahizan</option>
                            <option value="image">📷 Image personnalisée / GIF</option>
                            <option value="video">🎥 Intro Vidéo</option>
                            <option value="none">🚫 Aucun</option>
                        </select>
                    </div>
                    <div>
                        <label className="label-pro">Fond du préchargeur</label>
                        <div className="color-row">
                            <input type="color" className="color-swatch" value={config.preloader?.bgColor || '#ffffff'} onChange={(e) => handleNestedChange('preloader', 'bgColor', e.target.value)} />
                            <input className="input-pro" value={config.preloader?.bgColor || '#ffffff'} onChange={(e) => handleNestedChange('preloader', 'bgColor', e.target.value)} />
                        </div>
                    </div>
                </div>
                {config.preloader?.type !== 'none' && config.preloader?.type !== 'default' && (
                    <div style={{ marginTop: '1rem' }}>
                        <label className="label-pro">URL du média</label>
                        <input className="input-pro" value={config.preloader?.url} onChange={(e) => handleNestedChange('preloader', 'url', e.target.value)} placeholder="https://..." />
                    </div>
                )}
                <div style={{ marginTop: '1rem' }}>
                    <label className="label-pro">Durée (secondes) : {config.preloader?.duration || 2}s</label>
                    <input type="range" className="range-pro" min="1" max="8" step="0.5" value={config.preloader?.duration || 2} onChange={(e) => handleNestedChange('preloader', 'duration', parseFloat(e.target.value))} />
                </div>
            </div>

            {/* ===== EXTRAS ===== */}
            <div className="settings-card">
                <div className="settings-card-header">🔧 Fonctionnalités supplémentaires</div>
                <div className="grid-2">
                    <div>
                        <label className="label-pro">Bouton retour en haut</label>
                        <select className="input-pro" value={config.scrollToTop?.style || 'circle'} onChange={(e) => handleNestedChange('scrollToTop', 'style', e.target.value)}>
                            <option value="circle">Cercle (Par défaut)</option>
                            <option value="square">Carré</option>
                            <option value="pill">Pilule (Texte)</option>
                            <option value="none">Désactivé</option>
                        </select>
                    </div>
                    <div>
                        <label className="label-pro">URL du Favicon</label>
                        <input className="input-pro" value={config.favicon} onChange={(e) => handleChange('favicon', e.target.value)} placeholder="/favicon.ico" />
                    </div>
                </div>
            </div>

            <button className="btn-pro btn-pro-primary section-save-btn" style={{ padding: '12px', width: '100%', justifyContent: 'center', fontSize: '0.85rem' }} onClick={() => onSave(config)}>
                💾 Enregistrer tous les paramètres du thème
            </button>
        </div>
    );
};
