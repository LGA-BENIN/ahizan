import React, { useState, useEffect } from 'react';
import { Label } from '../../../ui/label';
import { Select } from '../../../ui/select';
import { Input } from '../../../ui/input';
import { useAutoSave } from '../useAutoSave';

interface ProductOverviewSettingsProps {
    data: any;
    onSave: (newData: any) => void;
}

export const ProductOverviewSettings = ({ data, onSave }: ProductOverviewSettingsProps) => {
    const [config, setConfig] = useState(data);
    useAutoSave(config, onSave);

    useEffect(() => {
        const defaults = {
            layout: 'image-left',
            imageSize: 'medium',
            showBreadcrumbs: true,
            showVendor: true,
            showSku: false,
            showBadges: true,
            badgeNewDays: 14,
            showPromoPrice: true,
            showDescription: true,
            descriptionStyle: 'full',
            showVariantSelector: true,
            showQuantitySelector: true,
            addToCartStyle: 'full-width',
            addToCartText: 'Ajouter au panier',
            addToCartColor: '#dc2626',
            showWishlist: false,
            showShare: false,
            showTabs: true,
            tabsList: ['description', 'specifications'],
        };
        setConfig({ ...defaults, ...data });
    }, [data]);

    const handleChange = (field: string, value: any) => setConfig({ ...config, [field]: value });

    const toggleTab = (tab: string) => {
        const current = config.tabsList || [];
        const newTabs = current.includes(tab) ? current.filter((t: string) => t !== tab) : [...current, tab];
        handleChange('tabsList', newTabs);
    };

    return (
        <div className="stack-lg" style={{ width: "100%", height: "100%", maxHeight: "calc(100vh - 200px)", overflowY: "auto" }}>
            {/* Layout */}
            <div className="settings-card">
                <div className="settings-card-header">📐 Disposition de la fiche produit</div>
                <div className="grid-2">
                    <div>
                        <Label htmlFor="po-layout">Mise en page</Label>
                        <Select id="po-layout" value={config.layout} onChange={(e) => handleChange('layout', e.target.value)}>
                            <option value="image-left">Image à gauche</option>
                            <option value="image-top">Galerie en haut</option>
                            <option value="image-grid">Grille d'images</option>
                            <option value="sticky-image">Image fixe (sticky)</option>
                        </Select>
                    </div>
                    <div>
                        <Label htmlFor="po-img-size">Taille de l'image</Label>
                        <Select id="po-img-size" value={config.imageSize} onChange={(e) => handleChange('imageSize', e.target.value)}>
                            <option value="small">Petite (250px)</option>
                            <option value="medium">Moyenne (350px)</option>
                            <option value="large">Grande (500px)</option>
                        </Select>
                    </div>
                </div>
            </div>

            {/* Product Info */}
            <div className="settings-card">
                <div className="settings-card-header">ℹ️ Informations produit</div>
                <div className="grid-2">
                    <div className="toggle-row"><label><input type="checkbox" checked={config.showBreadcrumbs} onChange={(e) => handleChange('showBreadcrumbs', e.target.checked)} /> Fil d'Ariane</label></div>
                    <div className="toggle-row"><label><input type="checkbox" checked={config.showVendor} onChange={(e) => handleChange('showVendor', e.target.checked)} /> Vendeur / Marque</label></div>
                </div>
                <div className="grid-2 mt-2">
                    <div className="toggle-row"><label><input type="checkbox" checked={config.showSku} onChange={(e) => handleChange('showSku', e.target.checked)} /> Référence (SKU)</label></div>
                    <div className="toggle-row"><label><input type="checkbox" checked={config.showBadges} onChange={(e) => handleChange('showBadges', e.target.checked)} /> Badges (Nouveau, Promo, Stock limité)</label></div>
                </div>
                <div className="toggle-row mt-2">
                    <label><input type="checkbox" checked={config.showPromoPrice} onChange={(e) => handleChange('showPromoPrice', e.target.checked)} /> Afficher le prix promotionnel (si disponible)</label>
                </div>
                {config.showBadges && (
                    <div className="mt-4">
                        <Label htmlFor="po-badge-days">Badge "Nouveau" (nombre de jours)</Label>
                        <Input id="po-badge-days" type="number" min={1} max={90} value={config.badgeNewDays} onChange={(e) => handleChange('badgeNewDays', parseInt(e.target.value))} />
                    </div>
                )}
            </div>

            {/* Description */}
            <div className="settings-card">
                <div className="settings-card-header">📝 Description</div>
                <div className="toggle-row">
                    <label><input type="checkbox" checked={config.showDescription} onChange={(e) => handleChange('showDescription', e.target.checked)} /> Afficher la description du produit</label>
                </div>
                {config.showDescription && (
                    <div className="mt-4">
                        <Label htmlFor="po-desc-style">Style d'affichage</Label>
                        <Select id="po-desc-style" value={config.descriptionStyle} onChange={(e) => handleChange('descriptionStyle', e.target.value)}>
                            <option value="full">Texte complet</option>
                            <option value="truncated">Tronqué avec "Lire plus"</option>
                            <option value="accordion">Accordéon (section repliable)</option>
                        </Select>
                    </div>
                )}
            </div>

            {/* Add to Cart */}
            <div className="settings-card">
                <div className="settings-card-header">🛒 Bouton d'achat</div>
                <div className="grid-2">
                    <div>
                        <Label htmlFor="po-cart-style">Style du bouton</Label>
                        <Select id="po-cart-style" value={config.addToCartStyle} onChange={(e) => handleChange('addToCartStyle', e.target.value)}>
                            <option value="full-width">Pleine largeur</option>
                            <option value="compact">Compact</option>
                            <option value="floating">Flottant (mobile)</option>
                        </Select>
                    </div>
                    <div>
                        <Label htmlFor="po-cart-text">Texte du bouton</Label>
                        <Input id="po-cart-text" value={config.addToCartText} onChange={(e) => handleChange('addToCartText', e.target.value)} />
                    </div>
                </div>
                <div className="grid-2 mt-4">
                    <div>
                        <Label htmlFor="po-cart-color">Couleur du bouton</Label>
                        <div className="color-row">
                            <input type="color" className="color-swatch" value={config.addToCartColor || '#dc2626'} onChange={(e) => handleChange('addToCartColor', e.target.value)} />
                            <Input id="po-cart-color" value={config.addToCartColor} onChange={(e) => handleChange('addToCartColor', e.target.value)} />
                        </div>
                    </div>
                    <div>
                        <div className="toggle-row mt-2"><label><input type="checkbox" checked={config.showVariantSelector} onChange={(e) => handleChange('showVariantSelector', e.target.checked)} /> Sélecteur de variantes</label></div>
                        <div className="toggle-row mt-2"><label><input type="checkbox" checked={config.showQuantitySelector} onChange={(e) => handleChange('showQuantitySelector', e.target.checked)} /> Sélecteur de quantité</label></div>
                    </div>
                </div>
            </div>

            {/* Extra Actions */}
            <div className="settings-card">
                <div className="settings-card-header">⚡ Actions supplémentaires</div>
                <div className="grid-2">
                    <div className="toggle-row"><label><input type="checkbox" checked={config.showWishlist} onChange={(e) => handleChange('showWishlist', e.target.checked)} /> Bouton Liste de souhaits</label></div>
                    <div className="toggle-row"><label><input type="checkbox" checked={config.showShare} onChange={(e) => handleChange('showShare', e.target.checked)} /> Bouton Partager</label></div>
                </div>
            </div>

            {/* Tabs */}
            <div className="settings-card">
                <div className="settings-card-header">📑 Onglets en bas de fiche</div>
                <div className="toggle-row">
                    <label><input type="checkbox" checked={config.showTabs} onChange={(e) => handleChange('showTabs', e.target.checked)} /> Afficher les onglets</label>
                </div>
                {config.showTabs && (
                    <div className="mt-4">
                        <Label>Onglets à afficher</Label>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                            {[
                                { key: 'description', label: '📝 Description' },
                                { key: 'specifications', label: '📋 Caractéristiques' },
                                { key: 'shipping', label: '🚚 Livraison' },
                                { key: 'returns', label: '↩️ Retours' },
                            ].map(tab => (
                                <button
                                    key={tab.key}
                                    onClick={() => toggleTab(tab.key)}
                                    style={{
                                        padding: '6px 14px',
                                        borderRadius: '8px',
                                        border: `1px solid ${(config.tabsList || []).includes(tab.key) ? '#3b82f6' : '#d1d5db'}`,
                                        background: (config.tabsList || []).includes(tab.key) ? '#eff6ff' : '#fff',
                                        color: (config.tabsList || []).includes(tab.key) ? '#1d4ed8' : '#6b7280',
                                        fontSize: '0.75rem',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                    }}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
