import React, { useState, useEffect } from 'react';
import { FileUploadField } from './FileUploadField';
import { useAutoSave } from '../useAutoSave';

interface PromoSettingsProps {
    data: any;
    onSave: (newData: any) => void;
}

const makeDefaultBanner = (index: number) => ({
    id: `banner-${Date.now()}-${index}`,
    name: `Banner ${index + 1}`,
    isActive: true,
    title: 'LA GRANDE BRADERIE AHIZAN',
    subtitle: "Remises jusqu'à -80% !",
    ctaText: 'PROFITER MAINTENANT',
    ctaLink: '/search',
    bgType: 'color',
    bgColor: '#e31837',
    bgGradient: 'linear-gradient(135deg, #e31837, #b91c1c)',
    bgImageUrl: '',
    bgVideoUrl: '',
    textColor: '#ffffff',
    height: '120px',
    borderRadius: '0px',
    fontSize: '24px',
    fontWeight: '900',
    ctaBgColor: '#ffffff',
    ctaTextColor: '#e31837',
    ctaRadius: '8px',
    showBadge: true,
    badgeText: 'PROMO',
    badgeColor: '#f59e0b',
    animation: 'none',
    padding: '24px 32px',
});

export const PromoSettings = ({ data, onSave }: PromoSettingsProps) => {
    const [config, setConfig] = useState(data);
    useAutoSave(config, onSave);
    const [expandedBanner, setExpandedBanner] = useState<string | null>(null);

    useEffect(() => {
        const defaults = {
            showPromoBanners: true,
            promoBanners: [makeDefaultBanner(0)],
        };
        // Migrate old single promoBanner to promoBanners array
        const merged = { ...defaults, ...data };
        if (data.promoBanner && !data.promoBanners) {
            merged.promoBanners = [{ ...data.promoBanner, id: 'banner-migrated', name: 'Braderie', isActive: true }];
            delete merged.promoBanner;
        }
        if (!merged.promoBanners || merged.promoBanners.length === 0) {
            merged.promoBanners = [makeDefaultBanner(0)];
        }
        setConfig(merged);
        if (merged.promoBanners.length > 0) setExpandedBanner(merged.promoBanners[0].id);
    }, [data]);

    const handleChange = (f: string, v: any) => setConfig({ ...config, [f]: v });

    const addBanner = () => {
        const newBanner = makeDefaultBanner(config.promoBanners?.length || 0);
        const updated = [...(config.promoBanners || []), newBanner];
        setConfig({ ...config, promoBanners: updated });
        setExpandedBanner(newBanner.id);
    };

    const removeBanner = (id: string) => {
        const updated = (config.promoBanners || []).filter((b: any) => b.id !== id);
        setConfig({ ...config, promoBanners: updated });
        if (expandedBanner === id && updated.length > 0) setExpandedBanner(updated[0].id);
    };

    const updateBanner = (id: string, fields: any) => {
        const updated = (config.promoBanners || []).map((b: any) => b.id === id ? { ...b, ...fields } : b);
        setConfig({ ...config, promoBanners: updated });
    };

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

            {/* ===== PROMOTIONAL BANNERS (MULTI) ===== */}
            <div className="settings-card">
                <div className="settings-card-header" style={{ justifyContent: 'space-between' }}>
                    <span>⚡ Bannières promotionnelles</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <label style={{ fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '6px' }}><input type="checkbox" checked={config.showPromoBanners} onChange={(e) => handleChange('showPromoBanners', e.target.checked)} /> Visible</label>
                        <button className="btn-pro" style={{ padding: '2px 10px', fontSize: '0.7rem', cursor: 'pointer' }} onClick={addBanner}>+ Ajouter une bannière</button>
                    </div>
                </div>
                {config.showPromoBanners && (
                    <div className="stack">
                        {/* Banner tabs */}
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '8px' }}>
                            {(config.promoBanners || []).map((banner: any) => (
                                <div key={banner.id} style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                                    <button
                                        onClick={() => setExpandedBanner(banner.id)}
                                        style={{
                                            padding: '4px 10px',
                                            fontSize: '0.7rem',
                                            fontWeight: expandedBanner === banner.id ? 800 : 500,
                                            borderRadius: '6px',
                                            border: expandedBanner === banner.id ? '1.5px solid var(--builder-accent)' : '1px solid var(--builder-border)',
                                            background: expandedBanner === banner.id ? 'var(--builder-accent-bg, rgba(99,102,241,0.1))' : 'transparent',
                                            color: expandedBanner === banner.id ? 'var(--builder-accent, #6366f1)' : 'var(--builder-text)',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        {banner.name || banner.title?.slice(0, 20) || 'Banner'}
                                    </button>
                                    {(config.promoBanners || []).length > 1 && (
                                        <button
                                            onClick={() => removeBanner(banner.id)}
                                            style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.65rem', cursor: 'pointer', padding: '0 2px' }}
                                        >✕</button>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Expanded banner editor */}
                        {(() => {
                            const banner = (config.promoBanners || []).find((b: any) => b.id === expandedBanner);
                            if (!banner) return <div style={{ color: 'var(--builder-text-muted)', fontSize: '0.75rem', textAlign: 'center', padding: '1rem' }}>Sélectionnez une bannière pour la modifier</div>;
                            const ub = (f: string, v: any) => updateBanner(banner.id, { [f]: v });
                            return (
                                <div className="stack" style={{ border: '1px solid var(--builder-border)', borderRadius: '8px', padding: '12px', background: 'var(--builder-bg)' }}>
                                    <div className="grid-3">
                                        <div><label className="label-pro">Nom de la bannière</label><input className="input-pro" value={banner.name} onChange={(e) => ub('name', e.target.value)} /></div>
                                        <div><label className="label-pro">Titre</label><input className="input-pro" value={banner.title} onChange={(e) => ub('title', e.target.value)} /></div>
                                        <div><label className="label-pro">Sous-titre</label><input className="input-pro" value={banner.subtitle} onChange={(e) => ub('subtitle', e.target.value)} /></div>
                                    </div>
                                    <div className="grid-3">
                                        <div><label className="label-pro">Texte CTA</label><input className="input-pro" value={banner.ctaText} onChange={(e) => ub('ctaText', e.target.value)} /></div>
                                        <div><label className="label-pro">Lien CTA</label><input className="input-pro" value={banner.ctaLink} onChange={(e) => ub('ctaLink', e.target.value)} /></div>
                                        <div><label className="label-pro">Rayon CTA</label>
                                            <select className="input-pro" value={banner.ctaRadius} onChange={(e) => ub('ctaRadius', e.target.value)}>
                                                <option value="0px">Anguleux</option><option value="8px">Arrondi</option><option value="9999px">Pilule</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="grid-3">
                                        <ColorField label="Fond de bannière" value={banner.bgColor} onChange={(v) => ub('bgColor', v)} />
                                        <ColorField label="Couleur texte" value={banner.textColor} onChange={(v) => ub('textColor', v)} />
                                        <ColorField label="Fond bouton CTA" value={banner.ctaBgColor} onChange={(v) => ub('ctaBgColor', v)} />
                                    </div>
                                    <div className="grid-3">
                                        <div><label className="label-pro">Type de fond</label>
                                            <select className="input-pro" value={banner.bgType} onChange={(e) => ub('bgType', e.target.value)}>
                                                <option value="color">Uni</option><option value="gradient">Dégradé</option><option value="image">Image</option><option value="video">Vidéo</option>
                                            </select>
                                        </div>
                                        <div><label className="label-pro">Taille titre</label>
                                            <select className="input-pro" value={banner.fontSize} onChange={(e) => ub('fontSize', e.target.value)}>
                                                <option value="18px">Petit</option><option value="24px">Moyen</option><option value="32px">Grand</option><option value="42px">XL</option>
                                            </select>
                                        </div>
                                        <div><label className="label-pro">Hauteur</label>
                                            <select className="input-pro" value={banner.height} onChange={(e) => ub('height', e.target.value)}>
                                                <option value="80px">Mince</option><option value="120px">Standard</option><option value="180px">Haute</option><option value="240px">Héro</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="grid-3">
                                        <div className="toggle-row"><label><input type="checkbox" checked={banner.showBadge} onChange={(e) => ub('showBadge', e.target.checked)} /> Afficher badge</label></div>
                                        <div><label className="label-pro">Texte du badge</label><input className="input-pro" value={banner.badgeText} onChange={(e) => ub('badgeText', e.target.value)} /></div>
                                        <ColorField label="Couleur badge" value={banner.badgeColor} onChange={(v) => ub('badgeColor', v)} />
                                    </div>
                                    {banner.bgType === 'image' && (
                                        <FileUploadField label="Image de bannière" value={banner.bgImageUrl} onChange={(v) => ub('bgImageUrl', v)} accept="image/*,image/gif" />
                                    )}
                                    {banner.bgType === 'video' && (
                                        <FileUploadField label="Vidéo de bannière" value={banner.bgVideoUrl} onChange={(v) => ub('bgVideoUrl', v)} accept="video/mp4,video/webm" />
                                    )}
                                    <div className="grid-2">
                                        <div><label className="label-pro">Animation</label>
                                            <select className="input-pro" value={banner.animation} onChange={(e) => ub('animation', e.target.value)}>
                                                <option value="none">Aucune</option><option value="pulse">Pulsation</option><option value="shimmer">Scintillement</option><option value="bounce">Rebond</option>
                                            </select>
                                        </div>
                                        <div><label className="label-pro">Rayon bordure</label>
                                            <select className="input-pro" value={banner.borderRadius} onChange={(e) => ub('borderRadius', e.target.value)}>
                                                <option value="0px">Aucun</option><option value="8px">Petit</option><option value="16px">Moyen</option><option value="24px">Grand</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="toggle-row"><label><input type="checkbox" checked={banner.isActive} onChange={(e) => ub('isActive', e.target.checked)} /> Active</label></div>
                                </div>
                            );
                        })()}
                    </div>
                )}
            </div>
        </div>
    );
};
