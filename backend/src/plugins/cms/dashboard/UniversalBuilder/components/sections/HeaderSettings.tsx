import React, { useState, useEffect } from 'react';
import { FileUploadField } from './FileUploadField';
import { useAutoSave } from '../useAutoSave';

interface HeaderSettingsProps {
    data: any;
    onSave: (newData: any) => void;
}

export const HeaderSettings = ({ data, onSave }: HeaderSettingsProps) => {
    const [config, setConfig] = useState(data);
    useAutoSave(config, onSave);

    useEffect(() => {
        const defaults = {
            siteName: 'AHIZAN',
            logoUrl: '',
            logoWidth: '120px',
            logoHeight: 'auto',
            sticky: true,
            stickyStyle: 'solid',
            headerBgColor: '#ffffff',
            headerTextColor: '#1e293b',
            headerBorderColor: '#e2e8f0',
            headerShadow: true,
            headerHeight: '64px',
            headerPadding: '0 16px',
            layoutType: 'standard',
            showSearch: true,
            searchPlaceholder: 'Rechercher un produit...',
            searchStyle: 'rounded',
            searchBgColor: '#f1f5f9',
            showCartIcon: true,
            showWishlistIcon: true,
            showAccountIcon: true,
            cartBadgeColor: '#e31837',
            showVendorLink: true,
            vendorLinkText: 'Vendez sur AHIZAN',
            vendorLinkUrl: '/register',
            vendorLinkStyle: 'button',
            menuItems: [],
            helpLinks: [],
            mobileMenuStyle: 'drawer',
            mobileBreakpoint: '768px',
            topBar: {
                enabled: true,
                text: "Livraison gratuite dès 50.000 FCFA ! 🚚",
                bgColor: '#0f172a',
                textColor: '#ffffff',
                fontSize: '12px',
                height: '36px',
                showCloseBtn: false,
                link: '',
                fontWeight: '600',
                textAlign: 'center',
                animationType: 'none',
                imageUrl: '',
                displayMode: 'text'
            },
            categoryBar: {
                enabled: false,
                bgColor: '#f8fafc',
                textColor: '#334155',
                hoverColor: '#2563eb',
                fontSize: '13px',
                fontWeight: '600',
                style: 'underline'
            }
        };
        setConfig({ ...defaults, ...data });
    }, [data]);

    const handleChange = (field: string, value: any) => setConfig({ ...config, [field]: value });
    const handleNestedChange = (parent: string, field: string, value: any) => setConfig({ ...config, [parent]: { ...config[parent], [field]: value } });

    const addItem = (field: 'menuItems' | 'helpLinks') => handleChange(field, [...(config[field] || []), { label: 'New Link', link: '/', icon: '', isHighlighted: false }]);
    const removeItem = (field: 'menuItems' | 'helpLinks', i: number) => handleChange(field, [...(config[field] || [])].filter((_, idx) => idx !== i));
    const updateItem = (field: 'menuItems' | 'helpLinks', i: number, key: string, value: any) => {
        const list = [...(config[field] || [])];
        list[i] = { ...list[i], [key]: value };
        handleChange(field, list);
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
        <div className="stack-lg" style={{ width: '100%', maxWidth: '860px' }}>

            {/* ===== BRAND IDENTITY ===== */}
            <div className="settings-card">
                <div className="settings-card-header">🏷️ Identité de la marque</div>
                <div className="grid-2">
                    <div>
                        <label className="label-pro">Nom du site</label>
                        <input className="input-pro" value={config.siteName} onChange={(e) => handleChange('siteName', e.target.value)} />
                    </div>
                    <div>
                        <FileUploadField label="Logo du site" value={config.logoUrl} onChange={(v) => handleChange('logoUrl', v)} accept="image/*,image/gif" />
                    </div>
                </div>
                <div className="grid-3" style={{ marginTop: '1rem' }}>
                    <div>
                        <label className="label-pro">Largeur du logo</label>
                        <select className="input-pro" value={config.logoWidth} onChange={(e) => handleChange('logoWidth', e.target.value)}>
                            <option value="80px">Petit (80px)</option>
                            <option value="100px">Moyen (100px)</option>
                            <option value="120px">Standard (120px)</option>
                            <option value="150px">Large (150px)</option>
                            <option value="180px">XL (180px)</option>
                        </select>
                    </div>
                    <div>
                        <label className="label-pro">Hauteur de l'en-tête</label>
                        <select className="input-pro" value={config.headerHeight} onChange={(e) => handleChange('headerHeight', e.target.value)}>
                            <option value="48px">Compact (48px)</option>
                            <option value="56px">Standard (56px)</option>
                            <option value="64px">Confortable (64px)</option>
                            <option value="72px">Grand (72px)</option>
                        </select>
                    </div>
                    <div>
                        <label className="label-pro">Style de mise en page</label>
                        <select className="input-pro" value={config.layoutType} onChange={(e) => handleChange('layoutType', e.target.value)}>
                            <option value="standard">Standard (Centre)</option>
                            <option value="minimalist">Minimaliste (Gauche)</option>
                            <option value="mega">Méga-Menu</option>
                            <option value="split">Divisé (Logo au centre)</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* ===== HEADER COLORS & STYLE ===== */}
            <div className="settings-card">
                <div className="settings-card-header">🎨 Apparence de l'en-tête</div>
                <div className="grid-3">
                    <ColorField label="Arrière-plan" value={config.headerBgColor} onChange={(v) => handleChange('headerBgColor', v)} />
                    <ColorField label="Couleur du texte" value={config.headerTextColor} onChange={(v) => handleChange('headerTextColor', v)} />
                    <ColorField label="Couleur de bordure" value={config.headerBorderColor} onChange={(v) => handleChange('headerBorderColor', v)} />
                </div>
                <div className="grid-2" style={{ marginTop: '1rem' }}>
                    <div>
                        <label className="label-pro">Comportement collant (Sticky)</label>
                        <select className="input-pro" value={config.sticky ? config.stickyStyle : 'none'} onChange={(e) => { handleChange('sticky', e.target.value !== 'none'); handleChange('stickyStyle', e.target.value); }}>
                            <option value="none">Pas de Sticky</option>
                            <option value="solid">Sticky (Plein)</option>
                            <option value="transparent-to-solid">Transparent → Plein au défilement</option>
                            <option value="shrink">Réduire au défilement</option>
                        </select>
                    </div>
                    <div className="toggle-row" style={{ paddingTop: '1.5rem' }}>
                        <label><input type="checkbox" checked={config.headerShadow} onChange={(e) => handleChange('headerShadow', e.target.checked)} /> Ombre portée sur l'en-tête</label>
                    </div>
                </div>
            </div>

            {/* ===== SEARCH BAR ===== */}
            <div className="settings-card">
                <div className="settings-card-header">🔍 Système de recherche</div>
                <div className="toggle-row">
                    <label><input type="checkbox" checked={config.showSearch} onChange={(e) => handleChange('showSearch', e.target.checked)} /> Afficher la barre de recherche</label>
                </div>
                {config.showSearch && (
                    <div className="grid-2" style={{ marginTop: '1rem' }}>
                        <div>
                            <label className="label-pro">Texte d'espace réservé</label>
                            <input className="input-pro" value={config.searchPlaceholder} onChange={(e) => handleChange('searchPlaceholder', e.target.value)} />
                        </div>
                        <div>
                            <label className="label-pro">Style de recherche</label>
                            <select className="input-pro" value={config.searchStyle} onChange={(e) => handleChange('searchStyle', e.target.value)}>
                                <option value="rounded">Arrondi (Pilule)</option>
                                <option value="square">Carré</option>
                                <option value="underline">Soulignement uniquement</option>
                                <option value="icon-only">Icône uniquement (S'agrandit au clic)</option>
                            </select>
                        </div>
                    </div>
                )}
            </div>

            {/* ===== ICON CONTROLS ===== */}
            <div className="settings-card">
                <div className="settings-card-header">🛒 Actions de l'en-tête</div>
                <div className="grid-3">
                    <div className="toggle-row"><label><input type="checkbox" checked={config.showCartIcon} onChange={(e) => handleChange('showCartIcon', e.target.checked)} /> Icône de panier</label></div>
                    <div className="toggle-row"><label><input type="checkbox" checked={config.showWishlistIcon} onChange={(e) => handleChange('showWishlistIcon', e.target.checked)} /> Icône de liste d'envies</label></div>
                    <div className="toggle-row"><label><input type="checkbox" checked={config.showAccountIcon} onChange={(e) => handleChange('showAccountIcon', e.target.checked)} /> Icône de compte</label></div>
                </div>
                <div className="grid-2" style={{ marginTop: '1rem' }}>
                    <ColorField label="Couleur du badge du panier" value={config.cartBadgeColor} onChange={(v) => handleChange('cartBadgeColor', v)} />
                    <div>
                        <label className="label-pro">Style du menu mobile</label>
                        <select className="input-pro" value={config.mobileMenuStyle} onChange={(e) => handleChange('mobileMenuStyle', e.target.value)}>
                            <option value="drawer">Slide Drawer</option>
                            <option value="fullscreen">Full Screen Overlay</option>
                            <option value="dropdown">Dropdown</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* ===== TOP BAR ===== */}
            <div className="settings-card">
                <div className="settings-card-header">📢 Barre d'annonce supérieure</div>
                <div className="toggle-row">
                    <label><input type="checkbox" checked={config.topBar?.enabled} onChange={(e) => handleNestedChange('topBar', 'enabled', e.target.checked)} /> Activer la barre supérieure</label>
                </div>
                {config.topBar?.enabled && (
                    <div className="stack" style={{ marginTop: '1rem' }}>
                        <div>
                            <label className="label-pro">Mode d'affichage</label>
                            <select className="input-pro" value={config.topBar?.displayMode || 'text'} onChange={(e) => handleNestedChange('topBar', 'displayMode', e.target.value)}>
                                <option value="text">Texte uniquement</option>
                                <option value="image">Image/GIF uniquement</option>
                                <option value="both">Texte + Image/GIF</option>
                            </select>
                        </div>
                        {(config.topBar?.displayMode === 'text' || config.topBar?.displayMode === 'both') && (
                            <div>
                                <label className="label-pro">Texte de l'annonce</label>
                                <input className="input-pro" value={config.topBar?.text} onChange={(e) => handleNestedChange('topBar', 'text', e.target.value)} />
                            </div>
                        )}
                        {(config.topBar?.displayMode === 'image' || config.topBar?.displayMode === 'both') && (
                            <div>
                                <FileUploadField label="Image/GIF de l'annonce" value={config.topBar?.imageUrl} onChange={(v) => handleNestedChange('topBar', 'imageUrl', v)} accept="image/*,image/gif" />
                            </div>
                        )}
                        <div className="grid-3">
                            <ColorField label="Arrière-plan" value={config.topBar?.bgColor} onChange={(v) => handleNestedChange('topBar', 'bgColor', v)} />
                            <ColorField label="Couleur du texte" value={config.topBar?.textColor} onChange={(v) => handleNestedChange('topBar', 'textColor', v)} />
                            <div>
                                <label className="label-pro">Taille de police</label>
                                <select className="input-pro" value={config.topBar?.fontSize} onChange={(e) => handleNestedChange('topBar', 'fontSize', e.target.value)}>
                                    <option value="11px">11px</option>
                                    <option value="12px">12px</option>
                                    <option value="13px">13px</option>
                                    <option value="14px">14px</option>
                                </select>
                            </div>
                        </div>
                        <div className="grid-2">
                            <div>
                                <label className="label-pro">URL du lien (Optionnel)</label>
                                <input className="input-pro" value={config.topBar?.link} onChange={(e) => handleNestedChange('topBar', 'link', e.target.value)} placeholder="/promotions" />
                            </div>
                            <div>
                                <label className="label-pro">Animation</label>
                                <select className="input-pro" value={config.topBar?.animationType} onChange={(e) => handleNestedChange('topBar', 'animationType', e.target.value)}>
                                    <option value="none">Statique</option>
                                    <option value="marquee">Bande défilante</option>
                                    <option value="fade">Rotation par fondu</option>
                                </select>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ===== VENDOR LINK ===== */}
            <div className="settings-card">
                <div className="settings-card-header">🏪 Lien du portail vendeur</div>
                <div className="toggle-row">
                    <label><input type="checkbox" checked={config.showVendorLink} onChange={(e) => handleChange('showVendorLink', e.target.checked)} /> Afficher le lien vendeur</label>
                </div>
                {config.showVendorLink && (
                    <div className="grid-3" style={{ marginTop: '1rem' }}>
                        <div>
                            <label className="label-pro">Texte du lien</label>
                            <input className="input-pro" value={config.vendorLinkText} onChange={(e) => handleChange('vendorLinkText', e.target.value)} />
                        </div>
                        <div>
                            <label className="label-pro">URL</label>
                            <input className="input-pro" value={config.vendorLinkUrl} onChange={(e) => handleChange('vendorLinkUrl', e.target.value)} />
                        </div>
                        <div>
                            <label className="label-pro">Style</label>
                            <select className="input-pro" value={config.vendorLinkStyle} onChange={(e) => handleChange('vendorLinkStyle', e.target.value)}>
                                <option value="text">Texte brut</option>
                                <option value="button">Bouton</option>
                                <option value="badge">Badge</option>
                            </select>
                        </div>
                    </div>
                )}
            </div>

            {/* ===== MENU ITEMS ===== */}
            <div className="settings-card">
                <div className="settings-card-header" style={{ justifyContent: 'space-between' }}>
                    <span>🔗 Menu de navigation</span>
                    <button className="btn-pro" style={{ fontSize: '0.7rem', padding: '4px 10px' }} onClick={() => addItem('menuItems')}>+ Ajouter</button>
                </div>
                <div className="stack">
                    {(config.menuItems || []).map((item: any, idx: number) => (
                        <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <input className="input-pro" style={{ flex: 1 }} value={item.label} onChange={(e) => updateItem('menuItems', idx, 'label', e.target.value)} placeholder="Libellé" />
                            <input className="input-pro" style={{ flex: 2 }} value={item.link} onChange={(e) => updateItem('menuItems', idx, 'link', e.target.value)} placeholder="/path" />
                            <label style={{ fontSize: '0.65rem', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
                                <input type="checkbox" checked={item.isHighlighted} onChange={(e) => updateItem('menuItems', idx, 'isHighlighted', e.target.checked)} /> Mis en avant
                            </label>
                            <button onClick={() => removeItem('menuItems', idx)} style={{ border: 'none', color: '#ef4444', background: 'none', cursor: 'pointer', fontWeight: 700 }}>✕</button>
                        </div>
                    ))}
                    {(!config.menuItems || config.menuItems.length === 0) && (
                        <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--builder-text-soft)', fontSize: '0.8rem', border: '1px dashed var(--builder-border)', borderRadius: '8px' }}>Aucun lien de menu pour le moment.</div>
                    )}
                </div>
            </div>

            <button className="btn-pro btn-pro-primary section-save-btn" style={{ padding: '12px', width: '100%', justifyContent: 'center', fontSize: '0.85rem' }} onClick={() => onSave(config)}>
                💾 Enregistrer la configuration de l'en-tête
            </button>
        </div>
    );
};
