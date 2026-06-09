import React, { useState, useEffect } from 'react';
import { Input } from '../../../ui/input';
import { Label } from '../../../ui/label';
import { Select } from '../../../ui/select';
import { useAutoSave } from '../useAutoSave';

interface DynamicProductGridSettingsProps {
    data: any;
    onSave: (newData: any) => void;
}

export const DynamicProductGridSettings = ({ data, onSave }: DynamicProductGridSettingsProps) => {
    const [config, setConfig] = useState(data);
    useAutoSave(config, onSave);

    useEffect(() => {
        const defaults = {
            columns: 3,
            columnsMobile: 2,
            productsPerPage: 12,
            showFilters: true,
            filtersPosition: 'left',
            defaultSort: 'name-asc',
            showPrice: true,
            showPromoPrice: true,
            showDiscountBadge: true,
            showStrikethroughPrice: true,
            showAddToCart: false,
            showStockIndicator: false,
            imageRatio: '1:1',
            gridGap: '24px',
            showPagination: true,
            paginationStyle: 'numbers',
            emptyStateMessage: 'Aucun produit trouvé dans cette catégorie.',
        };
        setConfig({ ...defaults, ...data });
    }, [data]);

    const handleChange = (field: string, value: any) => setConfig({ ...config, [field]: value });

    return (
        <div className="stack-lg" style={{ width: '100%', maxWidth: '860px', height: '100%', maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
            {/* Grid Layout */}
            <div className="settings-card">
                <div className="settings-card-header">📐 Disposition de la grille</div>
                <div className="grid-3">
                    <div>
                        <Label htmlFor="dpg-columns">Colonnes (desktop)</Label>
                        <Select id="dpg-columns" value={config.columns} onChange={(e) => handleChange('columns', parseInt(e.target.value))}>
                            <option value={2}>2 Colonnes</option>
                            <option value={3}>3 Colonnes</option>
                            <option value={4}>4 Colonnes</option>
                            <option value={5}>5 Colonnes</option>
                        </Select>
                    </div>
                    <div>
                        <Label htmlFor="dpg-columns-mobile">Colonnes (mobile)</Label>
                        <Select id="dpg-columns-mobile" value={config.columnsMobile} onChange={(e) => handleChange('columnsMobile', parseInt(e.target.value))}>
                            <option value={1}>1 Colonne</option>
                            <option value={2}>2 Colonnes</option>
                        </Select>
                    </div>
                    <div>
                        <Label htmlFor="dpg-per-page">Produits par page</Label>
                        <Select id="dpg-per-page" value={config.productsPerPage} onChange={(e) => handleChange('productsPerPage', parseInt(e.target.value))}>
                            <option value={8}>8</option>
                            <option value={12}>12</option>
                            <option value={24}>24</option>
                            <option value={48}>48</option>
                        </Select>
                    </div>
                </div>
                <div className="grid-2 mt-4">
                    <div>
                        <Label htmlFor="dpg-gap">Espacement</Label>
                        <Select id="dpg-gap" value={config.gridGap} onChange={(e) => handleChange('gridGap', e.target.value)}>
                            <option value="12px">Compact (12px)</option>
                            <option value="16px">Petit (16px)</option>
                            <option value="24px">Standard (24px)</option>
                            <option value="32px">Large (32px)</option>
                        </Select>
                    </div>
                    <div>
                        <Label htmlFor="dpg-image-ratio">Ratio d'image</Label>
                        <Select id="dpg-image-ratio" value={config.imageRatio} onChange={(e) => handleChange('imageRatio', e.target.value)}>
                            <option value="1:1">Carré (1:1)</option>
                            <option value="4:3">Standard (4:3)</option>
                            <option value="3:4">Portrait (3:4)</option>
                            <option value="16:9">Paysage (16:9)</option>
                        </Select>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="settings-card">
                <div className="settings-card-header">🔍 Filtres et Tri</div>
                <div className="toggle-row">
                    <label><input type="checkbox" checked={config.showFilters} onChange={(e) => handleChange('showFilters', e.target.checked)} /> Afficher la barre de filtres</label>
                </div>
                {config.showFilters && (
                    <div className="mt-4">
                        <Label htmlFor="dpg-filters-pos">Position des filtres</Label>
                        <Select id="dpg-filters-pos" value={config.filtersPosition} onChange={(e) => handleChange('filtersPosition', e.target.value)}>
                            <option value="left">Barre latérale gauche</option>
                            <option value="top">Barre supérieure</option>
                        </Select>
                    </div>
                )}
                <div className="mt-4">
                    <Label htmlFor="dpg-sort">Tri par défaut</Label>
                    <Select id="dpg-sort" value={config.defaultSort} onChange={(e) => handleChange('defaultSort', e.target.value)}>
                        <option value="name-asc">Nom (A → Z)</option>
                        <option value="name-desc">Nom (Z → A)</option>
                        <option value="price-asc">Prix croissant</option>
                        <option value="price-desc">Prix décroissant</option>
                        <option value="date-desc">Plus récents</option>
                        <option value="popular">Populaires</option>
                    </Select>
                </div>
            </div>

            {/* Card Appearance */}
            <div className="settings-card">
                <div className="settings-card-header">🎨 Style des cartes produit</div>
                <div>
                    <Label htmlFor="dpg-card-style">Style de carte</Label>
                    <Select id="dpg-card-style" value={config.cardStyle} onChange={(e) => handleChange('cardStyle', e.target.value)}>
                        <option value="standard">Standard</option>
                        <option value="compact">Compact</option>
                        <option value="minimal">Minimaliste</option>
                        <option value="elevated">Élevé (avec ombre)</option>
                        <option value="dense">Dense (Marketplace)</option>
                    </Select>
                </div>
                <div className="grid-3 mt-4">
                    <div className="toggle-row"><label><input type="checkbox" checked={config.showPrice} onChange={(e) => handleChange('showPrice', e.target.checked)} /> Afficher le prix</label></div>
                    <div className="toggle-row"><label><input type="checkbox" checked={config.showPromoPrice} onChange={(e) => handleChange('showPromoPrice', e.target.checked)} /> Prix promo</label></div>
                    <div className="toggle-row"><label><input type="checkbox" checked={config.showStrikethroughPrice} onChange={(e) => handleChange('showStrikethroughPrice', e.target.checked)} /> Prix barré</label></div>
                </div>
                <div className="grid-3 mt-2">
                    <div className="toggle-row"><label><input type="checkbox" checked={config.showDiscountBadge} onChange={(e) => handleChange('showDiscountBadge', e.target.checked)} /> Badge promo</label></div>
                    <div className="toggle-row"><label><input type="checkbox" checked={config.showAddToCart} onChange={(e) => handleChange('showAddToCart', e.target.checked)} /> Bouton panier</label></div>
                    <div className="toggle-row"><label><input type="checkbox" checked={config.showStockIndicator} onChange={(e) => handleChange('showStockIndicator', e.target.checked)} /> Indicateur stock</label></div>
                </div>
            </div>

            {/* Pagination */}
            <div className="settings-card">
                <div className="settings-card-header">📄 Pagination</div>
                <div className="toggle-row">
                    <label><input type="checkbox" checked={config.showPagination} onChange={(e) => handleChange('showPagination', e.target.checked)} /> Afficher la pagination</label>
                </div>
                {config.showPagination && (
                    <div className="mt-4">
                        <Label htmlFor="dpg-pag-style">Style de pagination</Label>
                        <Select id="dpg-pag-style" value={config.paginationStyle} onChange={(e) => handleChange('paginationStyle', e.target.value)}>
                            <option value="numbers">Numéros de page</option>
                            <option value="load-more">Bouton "Charger plus"</option>
                            <option value="infinite">Scroll infini</option>
                        </Select>
                    </div>
                )}
            </div>

            {/* Empty State */}
            <div className="settings-card">
                <div className="settings-card-header">📭 État vide</div>
                <div>
                    <Label htmlFor="dpg-empty-msg">Message quand aucun produit</Label>
                    <Input id="dpg-empty-msg" value={config.emptyStateMessage} onChange={(e) => handleChange('emptyStateMessage', e.target.value)} />
                </div>
            </div>
        </div>
    );
};
