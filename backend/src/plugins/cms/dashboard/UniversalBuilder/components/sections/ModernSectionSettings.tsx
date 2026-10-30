import React, { useState, useEffect } from 'react';
import { useAutoSave } from '../useAutoSave';
import { MediaUploadField } from './MediaUploadField';

interface Props {
    data: any;
    onSave: (newData: any) => void;
}

/**
 * Éditeur pour HeroStoryScroller (Story Cards Amazon 9:16)
 */
export const HeroStoryScrollerSettings = ({ data, onSave }: Props) => {
    const [config, setConfig] = useState(data || {});
    useAutoSave(config, onSave);

    const cards = config.cards || [];

    const handleCardChange = (idx: number, field: string, val: any) => {
        const next = [...cards];
        next[idx] = { ...next[idx], [field]: val };
        setConfig({ ...config, cards: next });
    };

    const addCard = () => {
        const next = [
            ...cards,
            {
                title: "Nouveau Thème",
                subtitle: "Sous-titre descriptif",
                coverImage: "",
                linkUrl: "/search",
                tag: "OFFRE",
                tagColor: "#ef4444",
                buttonText: "Explorer"
            }
        ];
        setConfig({ ...config, cards: next });
    };

    const removeCard = (idx: number) => {
        const next = [...cards];
        next.splice(idx, 1);
        setConfig({ ...config, cards: next });
    };

    return (
        <div className="stack-lg" style={{ padding: '1rem', maxHeight: 'calc(100vh - 180px)', overflowY: 'auto' }}>
            <div className="settings-card">
                <div className="settings-card-header">📱 Configuration Story Cards (Format 9:16)</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div>
                        <label className="label-pro">Titre de la section</label>
                        <input
                            className="input-pro"
                            value={config.title || ''}
                            onChange={(e) => setConfig({ ...config, title: e.target.value })}
                            placeholder="ex: Les Univers du Moment"
                        />
                    </div>
                    <div>
                        <label className="label-pro">Sous-titre</label>
                        <input
                            className="input-pro"
                            value={config.subtitle || ''}
                            onChange={(e) => setConfig({ ...config, subtitle: e.target.value })}
                            placeholder="ex: Glissez pour découvrir nos sélections"
                        />
                    </div>
                </div>
            </div>

            <div className="settings-card">
                <div className="settings-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Cartes Story ({cards.length})</span>
                    <button type="button" onClick={addCard} className="btn-pro" style={{ fontSize: '0.75rem', padding: '4px 8px' }}>
                        + Ajouter une carte
                    </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '10px' }}>
                    {cards.map((card: any, idx: number) => (
                        <div key={idx} style={{ padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid var(--builder-border)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <span style={{ fontWeight: 800, fontSize: '0.85rem' }}>Carte #{idx + 1}</span>
                                <button type="button" onClick={() => removeCard(idx)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem' }}>
                                    Supprimer
                                </button>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                <div>
                                    <label className="label-pro">Titre</label>
                                    <input className="input-pro" value={card.title || ''} onChange={(e) => handleCardChange(idx, 'title', e.target.value)} />
                                </div>
                                <div>
                                    <label className="label-pro">Sous-titre</label>
                                    <input className="input-pro" value={card.subtitle || ''} onChange={(e) => handleCardChange(idx, 'subtitle', e.target.value)} />
                                </div>
                                <div>
                                    <label className="label-pro">Lien de redirection</label>
                                    <input className="input-pro" value={card.linkUrl || ''} onChange={(e) => handleCardChange(idx, 'linkUrl', e.target.value)} />
                                </div>
                                <div>
                                    <label className="label-pro">Texte du Bouton</label>
                                    <input className="input-pro" value={card.buttonText || ''} onChange={(e) => handleCardChange(idx, 'buttonText', e.target.value)} placeholder="Explorer" />
                                </div>
                                <div>
                                    <label className="label-pro">Badge (Tag)</label>
                                    <input className="input-pro" value={card.tag || ''} onChange={(e) => handleCardChange(idx, 'tag', e.target.value)} placeholder="TENDANCE" />
                                </div>
                                <div>
                                    <label className="label-pro">Couleur du Badge</label>
                                    <input type="color" className="color-swatch" value={card.tagColor || '#ef4444'} onChange={(e) => handleCardChange(idx, 'tagColor', e.target.value)} />
                                </div>
                            </div>
                            <div style={{ marginTop: '8px' }}>
                                <MediaUploadField
                                    label="Image de couverture (Format vertical 9:16 recommandé)"
                                    value={card.coverImage}
                                    onChange={(url) => handleCardChange(idx, 'coverImage', url)}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

/**
 * Éditeur pour HeroSlimBanner (Bannière Hero / Slim & Carrousel d'Images Défilantes)
 */
export const HeroSlimBannerSettings = ({ data, onSave }: Props) => {
    const [config, setConfig] = useState(data || {});
    useAutoSave(config, onSave);

    const bannerStyle = config.bannerStyle || config.style || 'panoramic_card';
    const slides = config.slides || [];
    const imageSlides = config.imageSlides || [];

    const handleStyleChange = (newStyle: string) => {
        setConfig({
            ...config,
            bannerStyle: newStyle,
            style: newStyle
        });
    };

    // --- Handlers Style 1 (Bannière Panoramique Compacte avec Contenu Texte + Détourage) ---
    const handleSlideChange = (idx: number, field: string, val: any) => {
        const next = [...slides];
        next[idx] = { ...next[idx], [field]: val };
        setConfig({ ...config, slides: next });
    };

    const addSlide = () => {
        const next = [
            ...slides,
            {
                title: "Nouvelle Promo Spéciale",
                subtitle: "Livraison express disponible",
                bgGradient: "linear-gradient(100deg, #1e3a8a 0%, #3b82f6 100%)",
                highlightBadge: "JUSQU'À -30%",
                badgeBgColor: "#ef4444",
                productImage: "",
                ctaText: "Découvrir",
                ctaUrl: "/flash-deals"
            }
        ];
        setConfig({ ...config, slides: next });
    };

    const removeSlide = (idx: number) => {
        const next = [...slides];
        next.splice(idx, 1);
        setConfig({ ...config, slides: next });
    };

    // --- Handlers Style 2 (Carrousel d'Images Promotionnelles PC / Mobile) ---
    const handleImageSlideChange = (idx: number, field: string, val: any) => {
        const next = [...imageSlides];
        next[idx] = { ...next[idx], [field]: val };
        setConfig({ ...config, imageSlides: next });
    };

    const addImageSlide = () => {
        const next = [
            ...imageSlides,
            {
                imageUrl: "",
                mobileImageUrl: "",
                linkUrl: "/flash-deals",
                alt: "Nouvelle Bannière Promotionnelle"
            }
        ];
        setConfig({ ...config, imageSlides: next });
    };

    const removeImageSlide = (idx: number) => {
        const next = [...imageSlides];
        next.splice(idx, 1);
        setConfig({ ...config, imageSlides: next });
    };

    return (
        <div className="stack-lg" style={{ padding: '1rem', maxHeight: 'calc(100vh - 180px)', overflowY: 'auto' }}>
            {/* Style Selector Card */}
            <div className="settings-card">
                <div className="settings-card-header">🎀 Configuration de la Bannière Hero</div>
                <div style={{ marginBottom: '14px' }}>
                    <label className="label-pro" style={{ fontWeight: 800, fontSize: '0.85rem', marginBottom: '6px' }}>
                        Choisir le Style d'affichage
                    </label>
                    <select
                        className="input-pro"
                        value={bannerStyle}
                        onChange={(e) => handleStyleChange(e.target.value)}
                        style={{ fontWeight: 700, padding: '8px 12px' }}
                    >
                        <option value="panoramic_card">
                            Style 1 : Bannière Panoramique Compacte (Texte + Badge + Produit Détouré)
                        </option>
                        <option value="image_carousel">
                            Style 2 : Carrousel Grand Format d'Images Défilantes (PC & Mobile - Effet Peek)
                        </option>
                    </select>
                    <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', marginTop: '4px' }}>
                        {bannerStyle === 'image_carousel'
                            ? "Affichage carrousel d'images promotionnelles plein écran avec aperçu sur les côtés (effet peek), gestes tactiles, et support d'images séparées PC / Mobile."
                            : "Bannière compacte basse hauteur avec dégradé de couleur, titre, sous-titre, badge de remise et image produit détourée."}
                    </p>
                </div>

                <div>
                    <label className="label-pro">Vitesse de défilement automatique (ms)</label>
                    <input
                        type="number"
                        className="input-pro"
                        value={config.autoplaySpeed || 5000}
                        onChange={(e) => setConfig({ ...config, autoplaySpeed: Number(e.target.value) })}
                    />
                </div>
            </div>

            {/* STYLE 2 : Carrousel d'Images Défilantes */}
            {bannerStyle === 'image_carousel' ? (
                <div className="settings-card">
                    <div className="settings-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>🖼️ Bannières Images ({imageSlides.length})</span>
                        <button type="button" onClick={addImageSlide} className="btn-pro" style={{ fontSize: '0.75rem', padding: '4px 10px' }}>
                            + Ajouter une bannière image
                        </button>
                    </div>

                    <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', marginTop: '6px', marginBottom: '12px' }}>
                        💡 Vous pouvez téléverser une seule image pour PC et mobile, ou choisir une image spécifique pour le PC et une autre pour le mobile pour une adaptation parfaite.
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {imageSlides.map((slide: any, idx: number) => (
                            <div key={idx} style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid var(--builder-border)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                    <span style={{ fontWeight: 800, fontSize: '0.85rem' }}>Bannière #{idx + 1}</span>
                                    <button type="button" onClick={() => removeImageSlide(idx)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem' }}>
                                        Supprimer
                                    </button>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                                            <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>💻 Image PC / Grand Écran (Desktop) *</span>
                                            <span style={{ fontSize: '0.72rem', fontWeight: 800, background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                                                📐 Format Photoshop : 1920 × 420 px (ou 1280 × 280 px)
                                            </span>
                                        </div>
                                        <MediaUploadField
                                            label=""
                                            value={slide.imageUrl || slide.desktopImageUrl}
                                            onChange={(url) => handleImageSlideChange(idx, 'imageUrl', url)}
                                        />
                                    </div>

                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                                            <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>📱 Image Mobile / Smartphone (Recommandée)</span>
                                            <span style={{ fontSize: '0.72rem', fontWeight: 800, background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                                                📐 Format Photoshop : 750 × 380 px (ou 800 × 400 px)
                                            </span>
                                        </div>
                                        <MediaUploadField
                                            label=""
                                            value={slide.mobileImageUrl}
                                            onChange={(url) => handleImageSlideChange(idx, 'mobileImageUrl', url)}
                                        />
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                        <div>
                                            <label className="label-pro">Lien de redirection au clic (URL)</label>
                                            <input
                                                className="input-pro"
                                                value={slide.linkUrl || slide.ctaUrl || ''}
                                                onChange={(e) => handleImageSlideChange(idx, 'linkUrl', e.target.value)}
                                                placeholder="/flash-deals"
                                            />
                                        </div>
                                        <div>
                                            <label className="label-pro">Titre / Texte alternatif (SEO)</label>
                                            <input
                                                className="input-pro"
                                                value={slide.alt || slide.title || ''}
                                                onChange={(e) => handleImageSlideChange(idx, 'alt', e.target.value)}
                                                placeholder="Offres High-Tech"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {imageSlides.length === 0 && (
                            <div style={{ textAlign: 'center', padding: '24px 12px', color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                                Aucune bannière image configurée. Cliquez sur <strong>"+ Ajouter une bannière image"</strong> pour commencer, ou laissez vide pour voir les bannières de démonstration.
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                /* STYLE 1 : Bannière Panoramique Compacte Cdiscount */
                <div className="settings-card">
                    <div className="settings-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>Diapositives Style 1 ({slides.length})</span>
                        <button type="button" onClick={addSlide} className="btn-pro" style={{ fontSize: '0.75rem', padding: '4px 8px' }}>
                            + Ajouter un slide
                        </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '10px' }}>
                        {slides.map((slide: any, idx: number) => (
                            <div key={idx} style={{ padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid var(--builder-border)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <span style={{ fontWeight: 800, fontSize: '0.85rem' }}>Slide #{idx + 1}</span>
                                    <button type="button" onClick={() => removeSlide(idx)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem' }}>
                                        Supprimer
                                    </button>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                    <div>
                                        <label className="label-pro">Titre</label>
                                        <input className="input-pro" value={slide.title || ''} onChange={(e) => handleSlideChange(idx, 'title', e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="label-pro">Sous-titre</label>
                                        <input className="input-pro" value={slide.subtitle || ''} onChange={(e) => handleSlideChange(idx, 'subtitle', e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="label-pro">Badge Remise</label>
                                        <input className="input-pro" value={slide.highlightBadge || ''} onChange={(e) => handleSlideChange(idx, 'highlightBadge', e.target.value)} placeholder="-40%" />
                                    </div>
                                    <div>
                                        <label className="label-pro">Lien d'action (URL)</label>
                                        <input className="input-pro" value={slide.ctaUrl || ''} onChange={(e) => handleSlideChange(idx, 'ctaUrl', e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="label-pro">Dégradé / Couleur de fond (CSS)</label>
                                        <input className="input-pro" value={slide.bgGradient || ''} onChange={(e) => handleSlideChange(idx, 'bgGradient', e.target.value)} placeholder="linear-gradient(...)" />
                                    </div>
                                    <div>
                                        <label className="label-pro">Texte du bouton</label>
                                        <input className="input-pro" value={slide.ctaText || ''} onChange={(e) => handleSlideChange(idx, 'ctaText', e.target.value)} placeholder="En profiter" />
                                    </div>
                                </div>
                                <div style={{ marginTop: '8px' }}>
                                    <MediaUploadField
                                        label="Visuel Produit Détouré (PNG/WebP transparent recommandé)"
                                        value={slide.productImage}
                                        onChange={(url) => handleSlideChange(idx, 'productImage', url)}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

/**
 * Éditeur pour QuadCategoryCard / QuadGrid (Grille 2x2 Amazon)
 */
export const QuadCategoryCardSettings = ({ data, onSave }: Props) => {
    const [config, setConfig] = useState(data || {});
    useAutoSave(config, onSave);

    const cards = config.cards || [];

    const handleCardChange = (cIdx: number, field: string, val: any) => {
        const next = [...cards];
        next[cIdx] = { ...next[cIdx], [field]: val };
        setConfig({ ...config, cards: next });
    };

    const handleItemChange = (cIdx: number, iIdx: number, field: string, val: any) => {
        const next = [...cards];
        const cardItems = [...(next[cIdx].items || [])];
        cardItems[iIdx] = { ...cardItems[iIdx], [field]: val };
        next[cIdx] = { ...next[cIdx], items: cardItems };
        setConfig({ ...config, cards: next });
    };

    return (
        <div className="stack-lg" style={{ padding: '1rem', maxHeight: 'calc(100vh - 180px)', overflowY: 'auto' }}>
            <div className="settings-card">
                <div className="settings-card-header">⊞ Grille Quad-Cards 2x2 (Amazon)</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div>
                        <label className="label-pro">Titre de la section</label>
                        <input className="input-pro" value={config.title || ''} onChange={(e) => setConfig({ ...config, title: e.target.value })} placeholder="ex: Explorez nos univers" />
                    </div>
                    <div>
                        <label className="label-pro">Sous-titre</label>
                        <input className="input-pro" value={config.subtitle || ''} onChange={(e) => setConfig({ ...config, subtitle: e.target.value })} />
                    </div>
                </div>
            </div>

            {cards.map((card: any, cIdx: number) => (
                <div key={cIdx} className="settings-card" style={{ marginTop: '12px' }}>
                    <div className="settings-card-header">Quad-Box #{cIdx + 1} : {card.cardTitle || 'Sans titre'}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                        <div>
                            <label className="label-pro">Titre de la boîte</label>
                            <input className="input-pro" value={card.cardTitle || ''} onChange={(e) => handleCardChange(cIdx, 'cardTitle', e.target.value)} />
                        </div>
                        <div>
                            <label className="label-pro">Lien Global</label>
                            <input className="input-pro" value={card.targetCategoryUrl || ''} onChange={(e) => handleCardChange(cIdx, 'targetCategoryUrl', e.target.value)} />
                        </div>
                    </div>

                    <div style={{ fontSize: '0.8rem', fontWeight: 800, marginBottom: '6px' }}>4 Miniatures de la grille 2x2 :</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        {(card.items || []).slice(0, 4).map((item: any, iIdx: number) => (
                            <div key={iIdx} style={{ padding: '8px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', border: '1px solid var(--builder-border)' }}>
                                <label className="label-pro">Case #{iIdx + 1}</label>
                                <input className="input-pro" value={item.name || ''} onChange={(e) => handleItemChange(cIdx, iIdx, 'name', e.target.value)} placeholder="Nom" />
                                <input className="input-pro" value={item.targetUrl || ''} onChange={(e) => handleItemChange(cIdx, iIdx, 'targetUrl', e.target.value)} placeholder="Lien" style={{ marginTop: '4px' }} />
                                <div style={{ marginTop: '4px' }}>
                                    <MediaUploadField label="Image" value={item.imageUrl} onChange={(url) => handleItemChange(cIdx, iIdx, 'imageUrl', url)} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};

/**
 * Éditeur pour CircularCategoryNav (Ruban Avatars Ronds Cdiscount)
 */
export const CircularCategoryNavSettings = ({ data, onSave }: Props) => {
    const [config, setConfig] = useState({
        shape: 'circle',
        bgSvg: 'brand-device',
        svgScale: 110,
        svgColor: '#DF1B33',
        svgOpacity: 90,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        bgColor: '#FFFFFF',
        autoFetch: true,
        ...(data || {})
    });
    useAutoSave(config, onSave);

    return (
        <div className="stack-lg" style={{ padding: '1rem', maxHeight: 'calc(100vh - 180px)', overflowY: 'auto' }}>
            <div className="settings-card">
                <div className="settings-card-header">⭕ Ruban de Catégories Circulaires</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div>
                        <label className="label-pro">Titre de la section</label>
                        <input className="input-pro" value={config.title || ''} onChange={(e) => setConfig({ ...config, title: e.target.value })} placeholder="ex: Les Incontournables" />
                    </div>
                    <div>
                        <label className="label-pro">Sous-titre</label>
                        <input className="input-pro" value={config.subtitle || ''} onChange={(e) => setConfig({ ...config, subtitle: e.target.value })} />
                    </div>
                    <div>
                        <label className="label-pro">Alimentation automatique</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input
                                type="checkbox"
                                checked={config.autoFetch !== false}
                                onChange={(e) => setConfig({ ...config, autoFetch: e.target.checked })}
                            />
                            <span style={{ fontSize: '0.8rem' }}>Récupérer automatiquement les collections principales du catalogue</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Design & Motif SVG d'Arrière-Plan */}
            <div className="settings-card">
                <div className="settings-card-header">🎨 Motif SVG d'Arrière-Plan (Signature)</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
                    <div>
                        <label className="label-pro">Type de SVG en arrière-plan</label>
                        <select
                            className="input-pro"
                            value={config.bgSvg || 'brand-device'}
                            onChange={(e) => setConfig({ ...config, bgSvg: e.target.value })}
                        >
                            <option value="brand-device">Signature "Z" Bold Ahizan (Officiel)</option>
                            <option value="cart">Logo Panier Ahizan</option>
                            <option value="custom">Tracé SVG Personnalisé</option>
                            <option value="none">Aucun motif en arrière-plan</option>
                        </select>
                    </div>

                    {config.bgSvg === 'custom' && (
                        <div>
                            <label className="label-pro">Code SVG Personnalisé (&lt;svg&gt;...&lt;/svg&gt; ou &lt;path.../&gt;)</label>
                            <textarea
                                className="input-pro"
                                rows={4}
                                value={config.customSvg || ''}
                                onChange={(e) => setConfig({ ...config, customSvg: e.target.value })}
                                placeholder='<path d="..." fill="currentColor" />'
                                style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}
                            />
                        </div>
                    )}

                    {config.bgSvg !== 'none' && (
                        <>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                <div>
                                    <label className="label-pro">Taille / Échelle du SVG ({config.svgScale || 110}%)</label>
                                    <input
                                        type="range"
                                        min="40"
                                        max="200"
                                        value={config.svgScale || 110}
                                        onChange={(e) => setConfig({ ...config, svgScale: Number(e.target.value) })}
                                        style={{ width: '100%' }}
                                    />
                                </div>
                                <div>
                                    <label className="label-pro">Opacité du SVG ({config.svgOpacity || 90}%)</label>
                                    <input
                                        type="range"
                                        min="10"
                                        max="100"
                                        value={config.svgOpacity || 90}
                                        onChange={(e) => setConfig({ ...config, svgOpacity: Number(e.target.value) })}
                                        style={{ width: '100%' }}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="label-pro">Couleur du motif SVG</label>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <input
                                        type="color"
                                        value={config.svgColor || '#DF1B33'}
                                        onChange={(e) => setConfig({ ...config, svgColor: e.target.value })}
                                        style={{ width: '38px', height: '34px', padding: 0, border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                    />
                                    <input
                                        type="text"
                                        className="input-pro"
                                        value={config.svgColor || '#DF1B33'}
                                        onChange={(e) => setConfig({ ...config, svgColor: e.target.value })}
                                        placeholder="#DF1B33"
                                    />
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Forme, Bordures & Arrière-plan */}
            <div className="settings-card">
                <div className="settings-card-header">📐 Forme, Bordure & Arrière-Plan de l'Avatar</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
                    <div>
                        <label className="label-pro">Forme du conteneur</label>
                        <select
                            className="input-pro"
                            value={config.shape || 'circle'}
                            onChange={(e) => setConfig({ ...config, shape: e.target.value })}
                        >
                            <option value="circle">Cercle Parfait (Rond)</option>
                            <option value="rounded">Carré Arrondi (Squircle)</option>
                            <option value="square">Carré Franc (Angles droits)</option>
                        </select>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <div>
                            <label className="label-pro">Épaisseur de la bordure ({config.borderWidth ?? 1}px)</label>
                            <select
                                className="input-pro"
                                value={config.borderWidth ?? 1}
                                onChange={(e) => setConfig({ ...config, borderWidth: Number(e.target.value) })}
                            >
                                <option value={0}>0 px (Aucune bordure)</option>
                                <option value={1}>1 px (Fine / Standard)</option>
                                <option value={2}>2 px (Moyenne)</option>
                                <option value={3}>3 px (Épaisse)</option>
                            </select>
                        </div>
                        <div>
                            <label className="label-pro">Couleur de la bordure</label>
                            <input
                                type="text"
                                className="input-pro"
                                value={config.borderColor || '#E2E8F0'}
                                onChange={(e) => setConfig({ ...config, borderColor: e.target.value })}
                                placeholder="#E2E8F0"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="label-pro">Couleur de fond du badge</label>
                        <input
                            type="text"
                            className="input-pro"
                            value={config.bgColor || '#FFFFFF'}
                            onChange={(e) => setConfig({ ...config, bgColor: e.target.value })}
                            placeholder="#FFFFFF"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

/**
 * Éditeur pour TrustFooterBar (Barre de réassurance locale)
 */
export const TrustFooterBarSettings = ({ data, onSave }: Props) => {
    const [config, setConfig] = useState(data || {});
    useAutoSave(config, onSave);

    const items = config.items || [];

    const handleItemChange = (idx: number, field: string, val: any) => {
        const next = [...items];
        next[idx] = { ...next[idx], [field]: val };
        setConfig({ ...config, items: next });
    };

    return (
        <div className="stack-lg" style={{ padding: '1rem', maxHeight: 'calc(100vh - 180px)', overflowY: 'auto' }}>
            <div className="settings-card">
                <div className="settings-card-header">🛡️ Barre de Réassurance & Services Bénin</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div>
                        <label className="label-pro">Titre global (optionnel)</label>
                        <input className="input-pro" value={config.title || ''} onChange={(e) => setConfig({ ...config, title: e.target.value })} placeholder="ex: Vos garanties sur Ahizan" />
                    </div>
                    <div>
                        <label className="label-pro">Sous-titre (optionnel)</label>
                        <input className="input-pro" value={config.subtitle || ''} onChange={(e) => setConfig({ ...config, subtitle: e.target.value })} />
                    </div>
                </div>
            </div>

            <div className="settings-card">
                <div className="settings-card-header">Piliers de Réassurance ({items.length || 4})</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                    {(items.length > 0 ? items : [
                        { icon: 'Smartphone', title: 'Paiement Mobile Sécurisé', subtitle: 'MTN MoMo, Moov Money, Celtiis et Cartes' },
                        { icon: 'Truck', title: 'Livraison Locale Rapide', subtitle: 'Cotonou, Calavi, Porto-Novo et tout le Bénin' },
                        { icon: 'ShieldCheck', title: 'Garantie Authenticité', subtitle: 'Commerçants certifiés & produits vérifiés' },
                        { icon: 'Headphones', title: 'Assistance Locale 7j/7', subtitle: 'Support client WhatsApp & appel dédié' }
                    ]).map((item: any, idx: number) => (
                        <div key={idx} style={{ padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid var(--builder-border)' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 1fr', gap: '8px' }}>
                                <div>
                                    <label className="label-pro">Icône (Lucide)</label>
                                    <input className="input-pro" value={item.icon || ''} onChange={(e) => handleItemChange(idx, 'icon', e.target.value)} placeholder="ShieldCheck" />
                                </div>
                                <div>
                                    <label className="label-pro">Titre</label>
                                    <input className="input-pro" value={item.title || ''} onChange={(e) => handleItemChange(idx, 'title', e.target.value)} />
                                </div>
                                <div>
                                    <label className="label-pro">Description</label>
                                    <input className="input-pro" value={item.subtitle || ''} onChange={(e) => handleItemChange(idx, 'subtitle', e.target.value)} />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
