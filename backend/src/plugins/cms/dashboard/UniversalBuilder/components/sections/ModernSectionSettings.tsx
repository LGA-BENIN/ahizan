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
 * Éditeur pour HeroSlimBanner (Bannière Panoramique Slim Cdiscount)
 */
export const HeroSlimBannerSettings = ({ data, onSave }: Props) => {
    const [config, setConfig] = useState(data || {});
    useAutoSave(config, onSave);

    const slides = config.slides || [];

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

    return (
        <div className="stack-lg" style={{ padding: '1rem', maxHeight: 'calc(100vh - 180px)', overflowY: 'auto' }}>
            <div className="settings-card">
                <div className="settings-card-header">🎀 Bannière Panoramique Slim (Cdiscount)</div>
                <div>
                    <label className="label-pro">Vitesse de défilement automatique (ms)</label>
                    <input
                        type="number"
                        className="input-pro"
                        value={config.autoplaySpeed || 6000}
                        onChange={(e) => setConfig({ ...config, autoplaySpeed: Number(e.target.value) })}
                    />
                </div>
            </div>

            <div className="settings-card">
                <div className="settings-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Diapositives ({slides.length})</span>
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
    const [config, setConfig] = useState(data || {});
    useAutoSave(config, onSave);

    return (
        <div className="stack-lg" style={{ padding: '1rem', maxHeight: 'calc(100vh - 180px)', overflowY: 'auto' }}>
            <div className="settings-card">
                <div className="settings-card-header">⭕ Ruban de Catégories Circulaires (Cdiscount)</div>
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
