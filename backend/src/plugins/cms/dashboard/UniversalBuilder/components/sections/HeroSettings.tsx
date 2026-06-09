import React, { useState, useEffect } from 'react';
import { MediaUploadField } from './MediaUploadField';
import { useAutoSave } from '../useAutoSave';

interface HeroSettingsProps {
    data: any;
    onSave: (newData: any) => void;
}

export const HeroSettings = ({ data, onSave }: HeroSettingsProps) => {
    const [config, setConfig] = useState(data);
    useAutoSave(config, onSave);

    useEffect(() => {
        const defaults = {
            selectedTemplate: 'classic',
            showSidebar: true,
            useCarousel: false,
            slides: [],
            autoplay: true,
            autoplaySpeed: 5000,
            showArrows: true,
            showDots: true,
            arrowStyle: 'circle',
            dotStyle: 'line',
            transitionEffect: 'fade',
            overlayOpacity: 0.3,
            overlayColor: '#000000',
            contentAlignment: 'left',
            contentVerticalAlign: 'center',
            contentMaxWidth: '600px',
            classic: {
                type: 'image', bgUrl: '', videoUrl: '',
                title: 'VOTRE SHOPPING, NOTRE PASSION',
                titleFontSize: '42px', titleFontWeight: '900', titleColor: '#ffffff', titleShadow: true,
                subtitle: 'Découvrez les meilleures offres du moment.',
                subtitleFontSize: '16px', subtitleColor: '#ffffffcc',
                buttonText: 'VOIR LES OFFRES', buttonLink: '/search',
                buttonBgColor: '#e31837', buttonTextColor: '#ffffff', buttonStyle: 'filled', buttonSize: 'lg',
                secondaryButtonText: '', secondaryButtonLink: '', secondaryButtonStyle: 'outline',
                badgeText: '', badgeColor: '#f59e0b',
                height: '500px', mobileHeight: '350px',
                assistanceTitle: 'BESOIN D\'AIDE ?', assistanceDesc: 'Conseillers 24/7.', assistanceLink: '/contact', assistanceIcon: '🎧',
                whatsappTitle: 'CHAT WHATSAPP', whatsappDesc: 'Via WhatsApp.', whatsappLink: 'https://wa.me/', whatsappIcon: '💬',
                sellTitle: 'VENDRE ICI', sellDesc: 'Boutique en 5 min.', sellLink: '/register', sellIcon: '🏪',
                showServices: true,
                flashTitle: 'VENTE FLASH', flashDiscount: '-50%', flashBgType: 'color', flashBgColor: '#002f6c', flashBgUrl: '',
                showFlashCard: true
            },
            bento: {
                mainTitle: 'BENTO STYLE', mainSubtitle: 'Layout moderne.', mainButtonText: 'Découvrir', mainButtonLink: '/search',
                type: 'image', bgUrl: '',
                titleFontSize: '36px', titleColor: '#ffffff',
                height: '450px',
                showCard1: true, card1Title: 'PROMOTIONS', card1Subtitle: 'Saison Été', card1Discount: '-50%', card1Link: '/promo1', card1ButtonText: 'Voir', card1BgColor: '#f59e0b', card1BgUrl: '',
                showCard2: true, card2Title: 'NOUVEAUTÉS', card2Subtitle: 'Collection 2024', card2Discount: 'NEW', card2Link: '/promo2', card2ButtonText: 'Découvrir', card2BgColor: '#059669', card2BgUrl: '',
                flashTitle: 'OFFRE SPÉCIALE', flashDesc: '-70%', flashBgUrl: '',
                showServices: true,
                assistanceTitle: 'AIDE', assistanceDesc: '', whatsappTitle: 'CONTACT', whatsappDesc: '', sellTitle: 'VENDRE', sellDesc: ''
            },
            fullwidth: {
                title: 'FULL IMPACT', subtitle: 'Expérience immersive.', buttonText: 'EXPLORER', buttonLink: '/search',
                type: 'video', bgUrl: '', videoUrl: '',
                titleFontSize: '56px', titleColor: '#ffffff', titleFontWeight: '900',
                height: '100vh', minHeight: '600px',
                showOverlay: true, overlayGradient: 'linear-gradient(to right, rgba(0,0,0,0.7), transparent)',
                showServices: false,
                assistanceTitle: '', assistanceDesc: '', whatsappTitle: '', whatsappDesc: '', sellTitle: '', sellDesc: ''
            }
        };
        // Merge defaults, but keep existing arrays intact
        setConfig({ ...defaults, ...data, slides: data?.slides || defaults.slides });
    }, [data]);

    const handleChange = (field: string, value: any) => setConfig({ ...config, [field]: value });
    const updateNested = (tmpl: string, field: string, value: any) => setConfig({ ...config, [tmpl]: { ...config[tmpl], [field]: value } });
    
    const handleSlideChange = (index: number, field: string, value: any) => {
        const newSlides = [...(config.slides || [])];
        newSlides[index] = { ...newSlides[index], [field]: value };
        setConfig({ ...config, slides: newSlides });
    };

    const addSlide = () => {
        setConfig({ 
            ...config, 
            slides: [...(config.slides || []), { type: 'image', bgUrl: '', title: `Slide ${(config.slides?.length || 0) + 1}`, subtitle: '', buttonText: 'View', buttonLink: '#' }] 
        });
    };

    const removeSlide = (index: number) => {
        const newSlides = [...(config.slides || [])];
        newSlides.splice(index, 1);
        setConfig({ ...config, slides: newSlides });
    };

    const moveSlide = (index: number, direction: number) => {
        const newSlides = [...(config.slides || [])];
        if (index + direction < 0 || index + direction >= newSlides.length) return;
        const temp = newSlides[index];
        newSlides[index] = newSlides[index + direction];
        newSlides[index + direction] = temp;
        setConfig({ ...config, slides: newSlides });
    };

    const t = config.selectedTemplate || 'classic';
    const td = config[t] || {};

    const ColorField = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
        <div>
            <label className="label-pro">{label}</label>
            <div className="color-row">
                <input type="color" className="color-swatch" value={value || '#000000'} onChange={(e) => onChange(e.target.value)} />
                <input className="input-pro" value={value || ''} onChange={(e) => onChange(e.target.value)} />
            </div>
        </div>
    );

    return (
        <div className="stack-lg" style={{ width: '100%', maxWidth: '860px', height: '100%', maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>

            {/* ===== TEMPLATE SELECTOR ===== */}
            <div className="settings-card">
                <div className="settings-card-header">🎬 Sélection du Modèle</div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    {['classic', 'bento', 'fullwidth'].map(tmpl => (
                        <button key={tmpl} onClick={() => handleChange('selectedTemplate', tmpl)} className="btn-pro" style={{
                            flex: 1, justifyContent: 'center', textTransform: 'uppercase', fontSize: '0.75rem',
                            ...(t === tmpl ? { background: 'var(--builder-primary-light)', color: 'var(--builder-primary)', borderColor: 'var(--builder-primary-border)' } : {})
                        }}>{tmpl}</button>
                    ))}
                </div>
                <div style={{ marginTop: '1rem', borderTop: '1px solid var(--builder-border)', paddingTop: '1rem' }}>
                    <label style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                        <input type="checkbox" checked={config.showSidebar !== false} onChange={(e) => handleChange('showSidebar', e.target.checked)} /> 
                        Afficher la barre latérale des Catégories (À gauche)
                    </label>
                </div>
            </div>

            {/* ===== CAROUSEL / SLIDER OPTIONS ===== */}
            <div className="settings-card">
                <div className="settings-card-header" style={{ justifyContent: 'space-between' }}>
                    <span>🔄 Mode Slider / Carrousel</span>
                    <label style={{ fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <input type="checkbox" checked={config.useCarousel || false} onChange={(e) => handleChange('useCarousel', e.target.checked)} /> 
                        Activer le Carrousel Auto
                    </label>
                </div>
                {config.useCarousel && (
                    <>
                        <div className="grid-3" style={{ marginTop: '1rem' }}>
                            <div className="toggle-row"><label><input type="checkbox" checked={config.autoplay} onChange={(e) => handleChange('autoplay', e.target.checked)} /> Lecture Auto</label></div>
                            <div className="toggle-row"><label><input type="checkbox" checked={config.showArrows} onChange={(e) => handleChange('showArrows', e.target.checked)} /> Afficher les flèches</label></div>
                            <div className="toggle-row"><label><input type="checkbox" checked={config.showDots} onChange={(e) => handleChange('showDots', e.target.checked)} /> Afficher les points</label></div>
                        </div>
                        <div className="grid-3" style={{ marginTop: '1rem' }}>
                            <div>
                                <label className="label-pro">Vitesse (ms)</label>
                                <input type="number" className="input-pro" value={config.autoplaySpeed} onChange={(e) => handleChange('autoplaySpeed', parseInt(e.target.value))} />
                            </div>
                            <div>
                                <label className="label-pro">Effet de transition</label>
                                <select className="input-pro" value={config.transitionEffect} onChange={(e) => handleChange('transitionEffect', e.target.value)}>
                                    <option value="slide">Glissement</option>
                                    <option value="fade">Fondu</option>
                                    <option value="zoom">Zoom</option>
                                    <option value="flip">Retournement</option>
                                </select>
                            </div>
                            <div>
                                <label className="label-pro">Style de flèche</label>
                                <select className="input-pro" value={config.arrowStyle} onChange={(e) => handleChange('arrowStyle', e.target.value)}>
                                    <option value="circle">Cercle</option>
                                    <option value="square">Carré</option>
                                    <option value="minimal">Minimaliste</option>
                                </select>
                            </div>
                        </div>

                        {/* Slide Manager */}
                        <div className="divider" style={{ margin: '1.5rem 0' }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700 }}>🖼️ Diapositives du Carrousel ({config.slides?.length || 0})</h4>
                            <button className="btn-pro btn-pro-outline" onClick={addSlide} style={{ fontSize: '0.75rem', padding: '6px 12px' }}>+ Ajouter une diapositive</button>
                        </div>
                        
                        <div className="stack">
                            {config.slides?.map((slide: any, index: number) => (
                                <div key={index} style={{ padding: '1rem', border: '1px solid var(--builder-border)', borderRadius: '8px', position: 'relative', background: 'var(--builder-bg)' }}>
                                    <div style={{ position: 'absolute', top: '8px', right: '8px', display: 'flex', gap: '4px' }}>
                                        <button className="btn-pro" style={{ padding: '4px 8px' }} onClick={() => moveSlide(index, -1)}>↑</button>
                                        <button className="btn-pro" style={{ padding: '4px 8px' }} onClick={() => moveSlide(index, 1)}>↓</button>
                                        <button className="btn-pro btn-pro-danger" style={{ padding: '4px 8px' }} onClick={() => removeSlide(index)}>X</button>
                                    </div>
                                    <div style={{ fontWeight: 600, marginBottom: '1rem' }}>Slide {index + 1}</div>
                                    
                                    <MediaUploadField 
                                        label="URL Média de la diapositive (Image ou Vidéo)" 
                                        value={slide.bgUrl} 
                                        onChange={(v) => handleSlideChange(index, 'bgUrl', v)} 
                                    />
                                    
                                    <div className="grid-2" style={{ marginTop: '0.5rem' }}>
                                        <div><label className="label-pro">Titre</label><input className="input-pro" value={slide.title || ''} onChange={(e) => handleSlideChange(index, 'title', e.target.value)} /></div>
                                        <div><label className="label-pro">Sous-titre</label><input className="input-pro" value={slide.subtitle || ''} onChange={(e) => handleSlideChange(index, 'subtitle', e.target.value)} /></div>
                                    </div>
                                    <div className="grid-2" style={{ marginTop: '0.5rem' }}>
                                        <div><label className="label-pro">Texte du bouton</label><input className="input-pro" value={slide.buttonText || ''} onChange={(e) => handleSlideChange(index, 'buttonText', e.target.value)} /></div>
                                        <div><label className="label-pro">Lien du bouton</label><input className="input-pro" value={slide.buttonLink || ''} onChange={(e) => handleSlideChange(index, 'buttonLink', e.target.value)} /></div>
                                    </div>
                                </div>
                            ))}
                            {(!config.slides || config.slides.length === 0) && (
                                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--builder-text-muted)', border: '1px dashed var(--builder-border)', borderRadius: '8px' }}>
                                    Aucune diapositive ajoutée pour le moment. La configuration principale ci-dessous sera utilisée comme bannière unique si vous n'ajoutez pas de diapositives.
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* ===== MEDIA & BACKGROUND (Main Config) ===== */}
            <div className="settings-card" style={{ opacity: config.useCarousel && config.slides?.length > 0 ? 0.5 : 1 }}>
                <div className="settings-card-header">                                 🖼️ Arrière-plan principal (utilisé si le carrousel est désactivé)                 </div>                 <div className="grid-2">
                    <div>
                        <label className="label-pro">Type de média</label>
                        <select className="input-pro" value={td.type} onChange={(e) => updateNested(t, 'type', e.target.value)}>
                            <option value="text">Texte uniquement (Artistique)</option>
                            <option value="image">Image</option>
                            <option value="video">Vidéo (Boucle)</option>
                        </select>
                    </div>
                    <div>
                        <label className="label-pro">Hauteur</label>
                        <select className="input-pro" value={td.height} onChange={(e) => updateNested(t, 'height', e.target.value)}>
                            <option value="350px">Petit (350px)</option>
                            <option value="450px">Moyen (450px)</option>
                            <option value="500px">Standard (500px)</option>
                            <option value="600px">Grand (600px)</option>
                            <option value="100vh">Plein écran</option>
                        </select>
                    </div>
                </div>
                {td.type !== 'text' && (
                    <div style={{ marginTop: '1rem' }}>
                        <MediaUploadField 
                            label={td.type === 'video' ? 'URL de la vidéo d\'arrière-plan' : 'URL de l\'image d\'arrière-plan'} 
                            value={td.bgUrl || ''} 
                            onChange={(v) => updateNested(t, 'bgUrl', v)} 
                        />
                    </div>
                )}
                <div className="grid-2" style={{ marginTop: '1rem' }}>
                    <div>
                        <label className="label-pro">Opacité de superposition ({Math.round(config.overlayOpacity * 100)}%)</label>
                        <input type="range" className="range-pro" min="0" max="0.9" step="0.05" value={config.overlayOpacity} onChange={(e) => handleChange('overlayOpacity', parseFloat(e.target.value))} />
                    </div>
                    <ColorField label="Couleur de superposition" value={config.overlayColor} onChange={(v) => handleChange('overlayColor', v)} />
                </div>
            </div>

            {/* ===== TEXT CONTENT ===== */}
            <div className="settings-card" style={{ opacity: config.useCarousel && config.slides?.length > 0 ? 0.5 : 1 }}>
                <div className="settings-card-header">📝 Contenu texte principal</div>
                <div>
                    <label className="label-pro">Titre principal</label>
                    <input className="input-pro" value={td.title || td.mainTitle || ''} onChange={(e) => updateNested(t, t === 'bento' ? 'mainTitle' : 'title', e.target.value)} />
                </div>
                <div className="grid-3" style={{ marginTop: '1rem' }}>
                    <div>
                        <label className="label-pro">Taille du titre</label>
                        <select className="input-pro" value={td.titleFontSize} onChange={(e) => updateNested(t, 'titleFontSize', e.target.value)}>
                            <option value="28px">Petit (28px)</option>
                            <option value="36px">Moyen (36px)</option>
                            <option value="42px">Grand (42px)</option>
                            <option value="56px">XL (56px)</option>
                            <option value="72px">XXL (72px)</option>
                        </select>
                    </div>
                    <ColorField label="Couleur du titre" value={td.titleColor} onChange={(v) => updateNested(t, 'titleColor', v)} />
                    <div>
                        <label className="label-pro">Épaisseur du titre</label>
                        <select className="input-pro" value={td.titleFontWeight || '900'} onChange={(e) => updateNested(t, 'titleFontWeight', e.target.value)}>
                            <option value="700">Gras</option>
                            <option value="800">Très gras</option>
                            <option value="900">Noir</option>
                        </select>
                    </div>
                </div>
                <div style={{ marginTop: '1rem' }}>
                    <label className="label-pro">Sous-titre</label>
                    <textarea className="input-pro" value={td.subtitle || td.mainSubtitle || ''} onChange={(e) => updateNested(t, t === 'bento' ? 'mainSubtitle' : 'subtitle', e.target.value)} />
                </div>
                <div className="grid-2" style={{ marginTop: '1rem' }}>
                    <div>
                        <label className="label-pro">Alignement du contenu</label>
                        <select className="input-pro" value={config.contentAlignment} onChange={(e) => handleChange('contentAlignment', e.target.value)}>
                            <option value="left">Gauche</option>
                            <option value="center">Centre</option>
                            <option value="right">Droite</option>
                        </select>
                    </div>
                    <div>
                        <label className="label-pro">Largeur max du contenu</label>
                        <select className="input-pro" value={config.contentMaxWidth} onChange={(e) => handleChange('contentMaxWidth', e.target.value)}>
                            <option value="450px">Étroit (450px)</option>
                            <option value="600px">Standard (600px)</option>
                            <option value="800px">Large (800px)</option>
                            <option value="100%">Pleine largeur</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* ===== BUTTONS ===== */}
            <div className="settings-card" style={{ opacity: config.useCarousel && config.slides?.length > 0 ? 0.5 : 1 }}>
                <div className="settings-card-header">🔘 Boutons d'appel à l'action</div>
                <div className="grid-2">
                    <div>
                        <label className="label-pro">Texte du bouton principal</label>
                        <input className="input-pro" value={td.buttonText || td.mainButtonText || ''} onChange={(e) => updateNested(t, t === 'bento' ? 'mainButtonText' : 'buttonText', e.target.value)} />
                    </div>
                    <div>
                        <label className="label-pro">Lien du bouton principal</label>
                        <input className="input-pro" value={td.buttonLink || td.mainButtonLink || ''} onChange={(e) => updateNested(t, t === 'bento' ? 'mainButtonLink' : 'buttonLink', e.target.value)} />
                    </div>
                </div>
                <div className="grid-3" style={{ marginTop: '1rem' }}>
                    <ColorField label="Fond du bouton" value={td.buttonBgColor || '#e31837'} onChange={(v) => updateNested(t, 'buttonBgColor', v)} />
                    <ColorField label="Texte du bouton" value={td.buttonTextColor || '#ffffff'} onChange={(v) => updateNested(t, 'buttonTextColor', v)} />
                    <div>
                        <label className="label-pro">Style du bouton</label>
                        <select className="input-pro" value={td.buttonStyle || 'filled'} onChange={(e) => updateNested(t, 'buttonStyle', e.target.value)}>
                            <option value="filled">Rempli</option>
                            <option value="outline">Contour</option>
                            <option value="ghost">Fantôme</option>
                        </select>
                    </div>
                </div>
                <div className="divider" style={{ margin: '1rem 0' }} />
                <div className="grid-2">
                    <div>
                        <label className="label-pro">Bouton secondaire (Optionnel)</label>
                        <input className="input-pro" value={td.secondaryButtonText || ''} onChange={(e) => updateNested(t, 'secondaryButtonText', e.target.value)} placeholder="Laissez vide pour masquer" />
                    </div>
                    <div>
                        <label className="label-pro">Lien secondaire</label>
                        <input className="input-pro" value={td.secondaryButtonLink || ''} onChange={(e) => updateNested(t, 'secondaryButtonLink', e.target.value)} />
                    </div>
                </div>
            </div>
            
            {/* ===== BENTO CARDS OVERRIDE ===== */}
            {t === 'bento' && (
                <div className="settings-card">
                    <div className="settings-card-header">🍱 Mini-Cartes Bento</div>
                    <div className="grid-2">
                        {/* Card 1 */}
                        <div style={{ padding: '1rem', border: '1px solid var(--builder-border)', borderRadius: '8px', background: 'var(--builder-bg-secondary)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                <span style={{ fontWeight: 700, fontSize: '0.8rem' }}>Mini-Carte #1</span>
                                <label style={{ fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <input type="checkbox" checked={td.showCard1 !== false} onChange={(e) => updateNested(t, 'showCard1', e.target.checked)} /> Actif
                                </label>
                            </div>
                            
                            <div className="stack" style={{ opacity: td.showCard1 !== false ? 1 : 0.5, pointerEvents: td.showCard1 !== false ? 'auto' : 'none' }}>
                                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', marginBottom: '0.5rem' }}>
                                    <label style={{ fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '4px' }}><input type="checkbox" checked={td.showCard1Text !== false} onChange={(e) => updateNested(t, 'showCard1Text', e.target.checked)} /> Afficher le texte</label>
                                    <label style={{ fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '4px' }}><input type="checkbox" checked={td.showCard1Overlay !== false} onChange={(e) => updateNested(t, 'showCard1Overlay', e.target.checked)} /> Afficher le voile de couleur</label>
                                </div>
                                <div className="grid-2">
                                    <div><label className="label-pro">Badge / Remise</label><input className="input-pro" value={td.card1Discount || ''} onChange={(e) => updateNested(t, 'card1Discount', e.target.value)} placeholder="-50% OFF" /></div>
                                    <div><label className="label-pro">Texte du bouton</label><input className="input-pro" value={td.card1ButtonText || ''} onChange={(e) => updateNested(t, 'card1ButtonText', e.target.value)} placeholder="Boutique" /></div>
                                </div>
                                <div style={{ marginTop: '0.5rem' }}><label className="label-pro">Titre</label><input className="input-pro" value={td.card1Title || ''} onChange={(e) => updateNested(t, 'card1Title', e.target.value)} /></div>
                                <div style={{ marginTop: '0.5rem' }}><label className="label-pro">Sous-titre</label><input className="input-pro" value={td.card1Subtitle || ''} onChange={(e) => updateNested(t, 'card1Subtitle', e.target.value)} /></div>
                                <div style={{ marginTop: '0.5rem' }}><label className="label-pro">URL du lien</label><input className="input-pro" value={td.card1Link || ''} onChange={(e) => updateNested(t, 'card1Link', e.target.value)} /></div>
                                <div className="grid-2" style={{ marginTop: '0.5rem' }}>
                                    <ColorField label="Couleur de fond" value={td.card1BgColor || '#f59e0b'} onChange={(v) => updateNested(t, 'card1BgColor', v)} />
                                    <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '4px' }}>
                                        <MediaUploadField label="Superposition d'image" value={td.card1BgUrl || ''} onChange={(v) => updateNested(t, 'card1BgUrl', v)} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Card 2 */}
                        <div style={{ padding: '1rem', border: '1px solid var(--builder-border)', borderRadius: '8px', background: 'var(--builder-bg-secondary)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                <span style={{ fontWeight: 700, fontSize: '0.8rem' }}>Mini-Carte #2</span>
                                <label style={{ fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <input type="checkbox" checked={td.showCard2 !== false} onChange={(e) => updateNested(t, 'showCard2', e.target.checked)} /> Actif
                                </label>
                            </div>

                            <div className="stack" style={{ opacity: td.showCard2 !== false ? 1 : 0.5, pointerEvents: td.showCard2 !== false ? 'auto' : 'none' }}>
                                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', marginBottom: '0.5rem' }}>
                                    <label style={{ fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '4px' }}><input type="checkbox" checked={td.showCard2Text !== false} onChange={(e) => updateNested(t, 'showCard2Text', e.target.checked)} /> Afficher le texte</label>
                                    <label style={{ fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '4px' }}><input type="checkbox" checked={td.showCard2Overlay !== false} onChange={(e) => updateNested(t, 'showCard2Overlay', e.target.checked)} /> Afficher le voile de couleur</label>
                                </div>
                                <div className="grid-2">
                                    <div><label className="label-pro">Badge / Info</label><input className="input-pro" value={td.card2Discount || ''} onChange={(e) => updateNested(t, 'card2Discount', e.target.value)} placeholder="NOUVEAU" /></div>
                                    <div><label className="label-pro">Texte du bouton</label><input className="input-pro" value={td.card2ButtonText || ''} onChange={(e) => updateNested(t, 'card2ButtonText', e.target.value)} placeholder="Voir" /></div>
                                </div>
                                <div style={{ marginTop: '0.5rem' }}><label className="label-pro">Titre</label><input className="input-pro" value={td.card2Title || ''} onChange={(e) => updateNested(t, 'card2Title', e.target.value)} /></div>
                                <div style={{ marginTop: '0.5rem' }}><label className="label-pro">Sous-titre</label><input className="input-pro" value={td.card2Subtitle || ''} onChange={(e) => updateNested(t, 'card2Subtitle', e.target.value)} /></div>
                                <div style={{ marginTop: '0.5rem' }}><label className="label-pro">URL du lien</label><input className="input-pro" value={td.card2Link || ''} onChange={(e) => updateNested(t, 'card2Link', e.target.value)} /></div>
                                <div className="grid-2" style={{ marginTop: '0.5rem' }}>
                                    <ColorField label="Couleur de fond" value={td.card2BgColor || '#059669'} onChange={(v) => updateNested(t, 'card2BgColor', v)} />
                                    <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '4px' }}>
                                        <MediaUploadField label="Superposition d'image" value={td.card2BgUrl || ''} onChange={(v) => updateNested(t, 'card2BgUrl', v)} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ===== SERVICES SIDEBAR ===== */}
            {t === 'classic' && (
                <div className="settings-card">
                    <div className="settings-card-header" style={{ justifyContent: 'space-between' }}>
                    <span>📦 Barre latérale de services</span>
                    <label style={{ fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <input type="checkbox" checked={td.showServices !== false} onChange={(e) => updateNested(t, 'showServices', e.target.checked)} /> Visible
                    </label>
                </div>
                {td.showServices !== false && (
                    <div className="stack">
                        {[
                            { prefix: 'assistance', title: 'Service #1 (Assistance)', color: '#2563eb' },
                            { prefix: 'whatsapp', title: 'Service #2 (WhatsApp)', color: '#25d366' },
                            { prefix: 'sell', title: 'Service #3 (Sell)', color: '#f59e0b' }
                        ].map(svc => (
                            <div key={svc.prefix} style={{ padding: '1rem', border: '1px solid var(--builder-border)', borderRadius: '8px' }}>
                                <div style={{ fontWeight: 700, fontSize: '0.7rem', color: svc.color, marginBottom: '0.75rem' }}>{svc.title}</div>
                                <div className="grid-2" style={{ marginBottom: '0.5rem' }}>
                                    <div><label className="label-pro">Titre</label><input className="input-pro" value={td[`${svc.prefix}Title`] || ''} onChange={(e) => updateNested(t, `${svc.prefix}Title`, e.target.value)} /></div>
                                    <div><label className="label-pro">Lien</label><input className="input-pro" value={td[`${svc.prefix}Link`] || ''} onChange={(e) => updateNested(t, `${svc.prefix}Link`, e.target.value)} /></div>
                                </div>
                                <div className="grid-2">
                                    <div><label className="label-pro">Description</label><input className="input-pro" value={td[`${svc.prefix}Desc`] || ''} onChange={(e) => updateNested(t, `${svc.prefix}Desc`, e.target.value)} /></div>
                                    <div><label className="label-pro">Icône (Emoji)</label><input className="input-pro" value={td[`${svc.prefix}Icon`] || ''} onChange={(e) => updateNested(t, `${svc.prefix}Icon`, e.target.value)} placeholder="🎧" /></div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                </div>
            )}

            {/* ===== FLASH CARD (Classic Only) ===== */}
            {t === 'classic' && (
                <div className="settings-card">
                    <div className="settings-card-header" style={{ justifyContent: 'space-between' }}>
                        <span>⚡ Carte de Promotion Flash</span>
                        <label style={{ fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '6px' }}><input type="checkbox" checked={td.showFlashCard !== false} onChange={(e) => updateNested(t, 'showFlashCard', e.target.checked)} /> Visible</label>
                    </div>
                    <div className="grid-2">
                        <div><label className="label-pro">Titre Flash</label><input className="input-pro" value={td.flashTitle || ''} onChange={(e) => updateNested(t, 'flashTitle', e.target.value)} /></div>
                        <div><label className="label-pro">Texte de remise</label><input className="input-pro" value={td.flashDiscount || td.flashDesc || ''} onChange={(e) => updateNested(t, t === 'bento' ? 'flashDesc' : 'flashDiscount', e.target.value)} /></div>
                    </div>
                    <div className="grid-2" style={{ marginTop: '1rem' }}>
                        <div>
                            <label className="label-pro">Type de fond de carte</label>
                            <select className="input-pro" value={td.flashBgType || 'color'} onChange={(e) => updateNested(t, 'flashBgType', e.target.value)}>
                                <option value="color">Couleur unie</option>
                                <option value="image">Image</option>
                                <option value="video">Vidéo</option>
                            </select>
                        </div>
                        <ColorField label="Couleur de fond de carte" value={td.flashBgColor || '#002f6c'} onChange={(v) => updateNested(t, 'flashBgColor', v)} />
                    </div>
                    <div style={{ marginTop: '1rem' }}>
                        <MediaUploadField label={td.flashBgType === 'video' ? 'URL média vidéo Flash' : 'URL média image Flash'} value={td.flashBgUrl || ''} onChange={(v) => updateNested(t, 'flashBgUrl', v)} />
                    </div>
                </div>
            )}
        </div>
    );
};
