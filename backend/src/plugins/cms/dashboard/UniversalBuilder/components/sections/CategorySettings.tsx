import React, { useState, useEffect } from 'react';
import { FileUploadField } from './FileUploadField';
import { useAutoSave } from '../useAutoSave';

interface CategorySettingsProps {
    data: any;
    onSave: (newData: any) => void;
}

import { fetchGraphQL } from '../../../lib/utils';

async function fetchCollectionsFromAdminApi() {
    try {
        const data = await fetchGraphQL(`query { cmsCollectionsTree { id name slug featuredAsset { id preview } children { id name slug featuredAsset { id preview } } } }`);
        const tree = data?.cmsCollectionsTree || [];
        // Flatten tree for UI
        const flat: any[] = [];
        const flatten = (nodes: any[]) => {
            for (const node of nodes) {
                flat.push(node);
                if (node.children && node.children.length > 0) {
                    flatten(node.children);
                }
            }
        };
        flatten(tree);
        return flat;
    } catch (err) {
        console.error('Error fetching collections:', err);
        return [];
    }
}

export const CategorySettings = ({ data, onSave }: CategorySettingsProps) => {
    const [config, setConfig] = useState(data);
    useAutoSave(config, onSave);
    const [availableCollections, setAvailableCollections] = useState<any[]>([]);
    const [collectionsLoading, setCollectionsLoading] = useState(true);

    useEffect(() => {
        const defaults = {
            showBanner: true, bannerStyle: 'glass', bannerOverlay: 0.3, bannerHeight: '200px',
            bannerBgColor: '#0f172a', bannerTextColor: '#ffffff',
            sidebarPosition: 'left', sidebarWidth: '250px', sidebarBgColor: '#ffffff',
            sidebarBorderColor: '#e2e8f0', sidebarStyle: 'card',
            columnsDesktop: 4, columnsMobile: 2, columnsTablet: 3,
            productsPerPage: 24, productsPerRow: 4,
            cardStyle: 'standard', cardBorderRadius: '12px', cardShadow: true,
            showQuickView: true, showWishlist: true, showCompare: false,
            showBreadcrumbs: true, showProductCount: true, showViewToggle: true,
            filterStyle: 'accordion', filterPosition: 'sidebar',
            showPriceFilter: true, showColorFilter: true, showSizeFilter: false,
            defaultSort: 'newest', showSortDropdown: true,
            descriptionPosition: 'top', showSubcategories: true,
            gridGap: '16px', gridPadding: '16px',
            paginationStyle: 'numbered', loadMoreText: 'Voir plus',
            emptyStateText: 'Aucun produit trouvé dans cette catégorie.',
            emptyStateIcon: '📦',
            collectionMedia: {}
        };
        setConfig({ ...defaults, ...data });
    }, [data]);

    useEffect(() => {
        setCollectionsLoading(true);
        fetchCollectionsFromAdminApi().then(collections => {
            setAvailableCollections(collections);
            setCollectionsLoading(false);
        });
    }, []);

    const handleChange = (f: string, v: any) => setConfig({ ...config, [f]: v });
    const handleCollectionMediaChange = (collectionSlug: string, url: string) => {
        setConfig({ ...config, collectionMedia: { ...config.collectionMedia, [collectionSlug]: url } });
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

            <div className="settings-card">
                <div className="settings-card-header">🖼️ Bannière de catégorie</div>
                <div className="toggle-row"><label><input type="checkbox" checked={config.showBanner} onChange={(e) => handleChange('showBanner', e.target.checked)} /> Afficher la bannière de collection</label></div>
                {config.showBanner && (
                    <div className="stack" style={{ marginTop: '1rem' }}>
                        <div className="grid-3">
                            <div><label className="label-pro">Banner Style</label>
                                <select className="input-pro" value={config.bannerStyle} onChange={(e) => handleChange('bannerStyle', e.target.value)}>
                                <option value="glass">Glassmorphism</option><option value="minimal">Minimaliste</option><option value="full">Plein Héro</option><option value="gradient">Dégradé</option>
                                </select>
                            </div>
                            <ColorField label="Couleur de fond" value={config.bannerBgColor} onChange={(v) => handleChange('bannerBgColor', v)} />
                            <ColorField label="Couleur du texte" value={config.bannerTextColor} onChange={(v) => handleChange('bannerTextColor', v)} />
                        </div>
                        <div className="grid-2">
                            <div>
                                <label className="label-pro">Superposition ({Math.round(config.bannerOverlay * 100)}%)</label>
                                <input type="range" className="range-pro" min="0" max="0.9" step="0.05" value={config.bannerOverlay} onChange={(e) => handleChange('bannerOverlay', parseFloat(e.target.value))} />
                            </div>
                            <div><label className="label-pro">Height</label>
                                <select className="input-pro" value={config.bannerHeight} onChange={(e) => handleChange('bannerHeight', e.target.value)}>
                                    <option value="120px">Mince</option><option value="200px">Standard</option><option value="300px">Haute</option><option value="400px">Héro</option>
                                </select>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="settings-card">
                <div className="settings-card-header">📐 Disposition de la grille</div>
                <div className="grid-3">
                    <div><label className="label-pro">Cols Bureau</label>
                        <select className="input-pro" value={config.columnsDesktop} onChange={(e) => handleChange('columnsDesktop', parseInt(e.target.value))}>
                            <option value={2}>2</option><option value={3}>3</option><option value={4}>4</option><option value={5}>5</option><option value={6}>6</option>
                        </select>
                    </div>
                    <div><label className="label-pro">Cols Tablette</label>
                        <select className="input-pro" value={config.columnsTablet} onChange={(e) => handleChange('columnsTablet', parseInt(e.target.value))}>
                            <option value={2}>2</option><option value={3}>3</option><option value={4}>4</option>
                        </select>
                    </div>
                    <div><label className="label-pro">Cols Mobile</label>
                        <select className="input-pro" value={config.columnsMobile} onChange={(e) => handleChange('columnsMobile', parseInt(e.target.value))}>
                            <option value={1}>1</option><option value={2}>2</option><option value={3}>3</option>
                        </select>
                    </div>
                </div>
                <div className="grid-3" style={{ marginTop: '1rem' }}>
                    <div><label className="label-pro">Espacement</label>
                        <select className="input-pro" value={config.gridGap} onChange={(e) => handleChange('gridGap', e.target.value)}>
                            <option value="8px">Tight</option><option value="12px">Compact</option><option value="16px">Standard</option><option value="24px">Spacious</option>
                        </select>
                    </div>
                    <div><label className="label-pro">Produits par page</label><input type="number" className="input-pro" value={config.productsPerPage} onChange={(e) => handleChange('productsPerPage', parseInt(e.target.value))} /></div>
                    <div><label className="label-pro">Card Style</label>
                        <select className="input-pro" value={config.cardStyle} onChange={(e) => handleChange('cardStyle', e.target.value)}>
                                <option value="standard">Standard</option><option value="minimal">Minimaliste</option><option value="overlay">Superposition</option><option value="horizontal">Horizontal</option>
                        </select>
                    </div>
                </div>
                <div className="grid-3" style={{ marginTop: '1rem' }}>
                    <div><label className="label-pro">Card Radius</label>
                        <select className="input-pro" value={config.cardBorderRadius} onChange={(e) => handleChange('cardBorderRadius', e.target.value)}>
                            <option value="0px">Sharp</option><option value="8px">Small</option><option value="12px">Medium</option><option value="16px">Large</option>
                        </select>
                    </div>
                    <div className="toggle-row"><label><input type="checkbox" checked={config.cardShadow} onChange={(e) => handleChange('cardShadow', e.target.checked)} /> Ombre de carte</label></div>
                    <div className="toggle-row"><label><input type="checkbox" checked={config.showViewToggle} onChange={(e) => handleChange('showViewToggle', e.target.checked)} /> Alterner Grille/Liste</label></div>
                </div>
            </div>

            <div className="settings-card">
                <div className="settings-card-header">🔍 Barre latérale et filtres</div>
                <div className="grid-3">
                    <div><label className="label-pro">Position barre latérale</label>
                        <select className="input-pro" value={config.sidebarPosition} onChange={(e) => handleChange('sidebarPosition', e.target.value)}>
                            <option value="left">Left</option><option value="right">Right</option><option value="none">Hidden</option>
                        </select>
                    </div>
                    <div><label className="label-pro">Style de filtre</label>
                        <select className="input-pro" value={config.filterStyle} onChange={(e) => handleChange('filterStyle', e.target.value)}>
                            <option value="accordion">Accordion</option><option value="list">Open List</option><option value="horizontal">Horizontal Bar</option>
                        </select>
                    </div>
                    <div><label className="label-pro">Tri par défaut</label>
                        <select className="input-pro" value={config.defaultSort} onChange={(e) => handleChange('defaultSort', e.target.value)}>
                            <option value="newest">Newest</option><option value="price-asc">Price ↑</option><option value="price-desc">Price ↓</option><option value="popular">Popular</option>
                        </select>
                    </div>
                </div>
                <div className="grid-3" style={{ marginTop: '1rem' }}>
                    <div className="toggle-row"><label><input type="checkbox" checked={config.showPriceFilter} onChange={(e) => handleChange('showPriceFilter', e.target.checked)} /> Filtre de prix</label></div>
                    <div className="toggle-row"><label><input type="checkbox" checked={config.showColorFilter} onChange={(e) => handleChange('showColorFilter', e.target.checked)} /> Filtre de couleur</label></div>
                    <div className="toggle-row"><label><input type="checkbox" checked={config.showSizeFilter} onChange={(e) => handleChange('showSizeFilter', e.target.checked)} /> Filtre de taille</label></div>
                </div>
            </div>

            <div className="settings-card">
                <div className="settings-card-header">🧩 Fonctions des fiches produits</div>
                <div className="grid-3">
                    <div className="toggle-row"><label><input type="checkbox" checked={config.showQuickView} onChange={(e) => handleChange('showQuickView', e.target.checked)} /> Aperçu rapide</label></div>
                    <div className="toggle-row"><label><input type="checkbox" checked={config.showWishlist} onChange={(e) => handleChange('showWishlist', e.target.checked)} /> Bouton Liste de souhaits</label></div>
                    <div className="toggle-row"><label><input type="checkbox" checked={config.showCompare} onChange={(e) => handleChange('showCompare', e.target.checked)} /> Comparer</label></div>
                </div>
                <div className="grid-3" style={{ marginTop: '1rem' }}>
                    <div className="toggle-row"><label><input type="checkbox" checked={config.showBreadcrumbs} onChange={(e) => handleChange('showBreadcrumbs', e.target.checked)} /> Fil d'Ariane</label></div>
                    <div className="toggle-row"><label><input type="checkbox" checked={config.showProductCount} onChange={(e) => handleChange('showProductCount', e.target.checked)} /> Nombre de produits</label></div>
                    <div className="toggle-row"><label><input type="checkbox" checked={config.showSubcategories} onChange={(e) => handleChange('showSubcategories', e.target.checked)} /> Sous-catégories</label></div>
                </div>
                <div className="grid-2" style={{ marginTop: '1rem' }}>
                    <div><label className="label-pro">Style de pagination</label>
                        <select className="input-pro" value={config.paginationStyle} onChange={(e) => handleChange('paginationStyle', e.target.value)}>
                            <option value="numbered">Numbered Pages</option><option value="loadmore">Load More Button</option><option value="infinite">Infinite Scroll</option>
                        </select>
                    </div>
                    <div><label className="label-pro">Position de la description</label>
                        <select className="input-pro" value={config.descriptionPosition} onChange={(e) => handleChange('descriptionPosition', e.target.value)}>
                            <option value="top">Above Grid (SEO)</option><option value="bottom">Below Grid</option><option value="banner">In Banner</option><option value="none">Hidden</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="settings-card">
                <div className="settings-card-header">🖼️ Images des catégories</div>
                <p style={{ fontSize: '0.7rem', color: 'var(--builder-text-muted)', marginBottom: '0.75rem' }}>
                    Téléchargez une image pour chaque catégorie. Ces images apparaissent dans la grille des catégories sur la boutique.
                </p>
                {collectionsLoading ? (
                    <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--builder-text-muted)', fontSize: '0.75rem' }}>
                        Chargement des catégories...
                    </div>
                ) : availableCollections.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--builder-text-muted)', fontSize: '0.75rem' }}>
                        Aucune collection trouvée. Créez des collections dans l'administration Vendure d'abord.
                    </div>
                ) : (
                    <div className="stack" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                        {availableCollections.map((coll: any) => {
                            const currentImg = config.collectionMedia?.[coll.slug] || coll.featuredAsset?.preview || '';
                            return (
                                <div key={coll.id} style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '10px', 
                                    padding: '8px',
                                    borderBottom: '1px solid var(--builder-border)',
                                }}>
                                    <div style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '8px',
                                        overflow: 'hidden',
                                        background: currentImg ? '#000' : 'var(--builder-bg)',
                                        border: '1px solid var(--builder-border)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0,
                                    }}>
                                        {currentImg ? (
                                            <img src={currentImg} alt={coll.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--builder-text-muted)' }}>
                                                {coll.name?.charAt(0) || '?'}
                                            </span>
                                        )}
                                    </div>
                                    <div style={{ flex: '0 0 120px', minWidth: 0 }}>
                                        <div style={{ fontSize: '0.75rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {coll.name}
                                        </div>
                                        <div style={{ fontSize: '0.6rem', color: 'var(--builder-text-muted)' }}>
                                            Collection · {coll.slug}
                                        </div>
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <FileUploadField
                                            label=""
                                            value={currentImg}
                                            onChange={(url) => handleCollectionMediaChange(coll.slug, url)}
                                            accept="image/*,image/gif"
                                            placeholder="Aucune image"
                                        />
                                    </div>
                                    {currentImg && (
                                        <button
                                            onClick={() => handleCollectionMediaChange(coll.slug, '')}
                                            style={{
                                                background: 'none',
                                                border: '1px solid #ef4444',
                                                borderRadius: '4px',
                                                color: '#ef4444',
                                                fontSize: '0.6rem',
                                                padding: '2px 6px',
                                                cursor: 'pointer',
                                                flexShrink: 0,
                                            }}
                                        >✕</button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};
