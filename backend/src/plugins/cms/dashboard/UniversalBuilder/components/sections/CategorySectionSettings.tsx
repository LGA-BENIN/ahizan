import React, { useState, useEffect } from 'react';
import { FileUploadField } from './FileUploadField';
import { getBackendBaseUrl } from '../../../lib/utils';
import { useAutoSave } from '../useAutoSave';

interface CategorySectionSettingsProps {
    data: any;
    onSave: (newData: any) => void;
}

async function fetchCollectionsFromAdminApi(): Promise<any[]> {
    const apiUrl = getBackendBaseUrl() + '/admin-api';
    const query = `query { cmsCollectionsTree { id name slug featuredAsset { id preview } children { id name slug featuredAsset { id preview } } } }`;
    try {
        const res = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ query })
        });
        if (!res.ok) {
            console.error('[CategorySectionSettings] HTTP', res.status, await res.text().catch(() => ''));
            return [];
        }
        const data = await res.json();
        if (data.errors) {
            console.error('[CategorySectionSettings] GraphQL errors:', data.errors);
        }
        const tree = data.data?.cmsCollectionsTree || [];
        // Flatten tree for UI: top-level + children as a flat list with slug as key
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
        console.error('[CategorySectionSettings] Error fetching collections:', err);
        return [];
    }
}

export const CategorySectionSettings = ({ data, onSave }: CategorySectionSettingsProps) => {
    const [config, setConfig] = useState(data);
    useAutoSave(config, onSave);
    const [availableCollections, setAvailableCollections] = useState<any[]>([]);
    const [collectionsLoading, setCollectionsLoading] = useState(true);
    const [collectionsError, setCollectionsError] = useState<string | null>(null);
    const [expandedCat, setExpandedCat] = useState<string | null>(null);

    useEffect(() => {
        const defaults = {
            title: 'Nos Catégories',
            subtitle: '',
            layout: 'grid',
            columnsDesktop: 6,
            columnsTablet: 3,
            columnsMobile: 2,
            cardStyle: 'standard',
            cardBorderRadius: '12px',
            cardBgColor: '#ffffff',
            cardShadow: true,
            showLabels: true,
            labelFontSize: '11px',
            labelFontWeight: '700',
            labelColor: '#334155',
            imageShape: 'rounded',
            limit: 12,
            collectionMedia: {},
            heroIcons: {},
            enabledCategories: {},
        };
        setConfig({ ...defaults, ...data });
    }, [data]);

    const loadCollections = () => {
        setCollectionsLoading(true);
        setCollectionsError(null);
        fetchCollectionsFromAdminApi().then(collections => {
            setAvailableCollections(collections);
            setCollectionsLoading(false);
            if (collections.length === 0) {
                setCollectionsError('Aucune collection retournée. Vérifiez la console du navigateur pour les erreurs.');
            }
            // Auto-enable all collections if enabledCategories has never been configured
            if (collections.length > 0) {
                setConfig(prev => {
                    const currentEnabled = prev.enabledCategories || {};
                    const hasAnyEnabled = Object.keys(currentEnabled).length > 0;
                    if (!hasAnyEnabled) {
                        const allEnabled: Record<string, boolean> = {};
                        collections.forEach((c: any) => { allEnabled[c.slug] = true; });
                        return { ...prev, enabledCategories: allEnabled };
                    }
                    return prev;
                });
            }
        }).catch(err => {
            setCollectionsLoading(false);
            setCollectionsError(String(err));
        });
    };

    useEffect(() => { loadCollections(); }, []);

    const handleChange = (f: string, v: any) => setConfig({ ...config, [f]: v });
    const handleCollectionMediaChange = (collectionSlug: string, url: string) => {
        setConfig({ ...config, collectionMedia: { ...config.collectionMedia, [collectionSlug]: url } });
    };
    const handleHeroIconChange = (collectionSlug: string, url: string) => {
        setConfig({ ...config, heroIcons: { ...config.heroIcons, [collectionSlug]: url } });
    };
    const toggleCategory = (collectionSlug: string) => {
        const current = config.enabledCategories || {};
        setConfig({ ...config, enabledCategories: { ...current, [collectionSlug]: !current[collectionSlug] } });
    };

    const enabledCount = Object.values(config.enabledCategories || {}).filter(Boolean).length;
    const totalCollections = availableCollections.length;

    const ColorField = ({ label, value, onChange }: { label: string; value: string, onChange: (v: string) => void }) => (
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

            {/* ===== SECTION HEADER ===== */}
            <div className="settings-card">
                <div className="settings-card-header">📂 Section Catégories</div>
                <div className="stack">
                    <div className="grid-2">
                        <div><label className="label-pro">Titre</label><input className="input-pro" value={config.title} onChange={(e) => handleChange('title', e.target.value)} placeholder="Nos Catégories" /></div>
                        <div><label className="label-pro">Sous-titre</label><input className="input-pro" value={config.subtitle} onChange={(e) => handleChange('subtitle', e.target.value)} placeholder="Sous-titre optionnel" /></div>
                    </div>
                    <div className="grid-3">
                        <div><label className="label-pro">Layout</label>
                            <select className="input-pro" value={config.layout} onChange={(e) => handleChange('layout', e.target.value)}>
                                <option value="grid">Grille</option><option value="carousel">Carrousel</option><option value="list">Liste</option>
                            </select>
                        </div>
                        <div><label className="label-pro">Nb max de catégories</label>
                            <input className="input-pro" type="number" min={1} max={50} value={config.limit} onChange={(e) => handleChange('limit', parseInt(e.target.value) || 12)} />
                        </div>
                        <div><label className="label-pro">Style de carte</label>
                            <select className="input-pro" value={config.cardStyle} onChange={(e) => handleChange('cardStyle', e.target.value)}>
                                <option value="standard">Standard</option><option value="minimal">Minimaliste</option><option value="bold">Gras</option><option value="elevated">Élevé</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* ===== GRID COLUMNS ===== */}
            <div className="settings-card">
                <div className="settings-card-header">📐 Disposition de la grille</div>
                <div className="stack">
                    <div className="grid-3">
                        <div><label className="label-pro">Colonnes bureau</label>
                            <select className="input-pro" value={config.columnsDesktop} onChange={(e) => handleChange('columnsDesktop', parseInt(e.target.value))}>
                                <option value={2}>2</option><option value={3}>3</option><option value={4}>4</option><option value={6}>6</option><option value={8}>8</option>
                            </select>
                        </div>
                        <div><label className="label-pro">Colonnes tablette</label>
                            <select className="input-pro" value={config.columnsTablet} onChange={(e) => handleChange('columnsTablet', parseInt(e.target.value))}>
                                <option value={2}>2</option><option value={3}>3</option><option value={4}>4</option>
                            </select>
                        </div>
                        <div><label className="label-pro">Colonnes mobile</label>
                            <select className="input-pro" value={config.columnsMobile} onChange={(e) => handleChange('columnsMobile', parseInt(e.target.value))}>
                                <option value={2}>2</option><option value={3}>3</option>
                            </select>
                        </div>
                    </div>
                    <div className="grid-3">
                        <div><label className="label-pro">Rayon de carte</label>
                            <select className="input-pro" value={config.cardBorderRadius} onChange={(e) => handleChange('cardBorderRadius', e.target.value)}>
                                <option value="0px">Anguleux</option><option value="8px">Petit</option><option value="12px">Moyen</option><option value="16px">Grand</option><option value="24px">XL</option>
                            </select>
                        </div>
                        <div><label className="label-pro">Forme d'image</label>
                            <select className="input-pro" value={config.imageShape} onChange={(e) => handleChange('imageShape', e.target.value)}>
                                <option value="rounded">Arrondi</option><option value="circle">Cercle</option><option value="square">Carré</option>
                            </select>
                        </div>
                        <div className="toggle-row"><label><input type="checkbox" checked={config.cardShadow} onChange={(e) => handleChange('cardShadow', e.target.checked)} /> Ombre de carte</label></div>
                    </div>
                    <ColorField label="Couleur de fond de carte" value={config.cardBgColor} onChange={(v) => handleChange('cardBgColor', v)} />
                </div>
            </div>

            {/* ===== LABELS ===== */}
            <div className="settings-card">
                <div className="settings-card-header" style={{ justifyContent: 'space-between' }}>
                    <span>🏷️ Libellés</span>
                    <label style={{ fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '6px' }}><input type="checkbox" checked={config.showLabels} onChange={(e) => handleChange('showLabels', e.target.checked)} /> Afficher</label>
                </div>
                {config.showLabels && (
                    <div className="stack">
                        <div className="grid-3">
                            <div><label className="label-pro">Taille de police</label>
                                <select className="input-pro" value={config.labelFontSize} onChange={(e) => handleChange('labelFontSize', e.target.value)}>
                                    <option value="10px">10px</option><option value="11px">11px</option><option value="12px">12px</option><option value="13px">13px</option><option value="14px">14px</option>
                                </select>
                            </div>
                            <div><label className="label-pro">Épaisseur de police</label>
                                <select className="input-pro" value={config.labelFontWeight} onChange={(e) => handleChange('labelFontWeight', e.target.value)}>
                                    <option value="400">Normal</option><option value="600">Semi-gras</option><option value="700">Gras</option><option value="800">Extra-gras</option><option value="900">Noir</option>
                                </select>
                            </div>
                            <ColorField label="Couleur du libellé" value={config.labelColor} onChange={(v) => handleChange('labelColor', v)} />
                        </div>
                    </div>
                )}
            </div>

            {/* ===== CATEGORY MANAGEMENT ===== */}
            <div className="settings-card">
                <div className="settings-card-header" style={{ justifyContent: 'space-between' }}>
                    <span>🗂️ Catégories ({enabledCount}/{totalCollections} actives)</span>
                    <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                            className="btn-pro"
                            style={{ padding: '2px 10px', fontSize: '0.65rem', cursor: 'pointer' }}
                            onClick={() => {
                                const allEnabled: Record<string, boolean> = {};
                                availableCollections.forEach((c: any) => { allEnabled[c.slug] = true; });
                                handleChange('enabledCategories', allEnabled);
                            }}
                        >Tout activer</button>
                        <button
                            className="btn-pro"
                            style={{ padding: '2px 10px', fontSize: '0.65rem', cursor: 'pointer' }}
                            onClick={() => handleChange('enabledCategories', {})}
                        >Tout désactiver</button>
                    </div>
                </div>
                <p style={{ fontSize: '0.7rem', color: 'var(--builder-text-muted)', marginBottom: '0.75rem', lineHeight: 1.5 }}>
                    Activez les catégories à afficher sur la boutique. Cliquez sur une catégorie pour l'étendre et télécharger des images — une pour l'affichage de la section catégories, et une pour l'icône de la barre latérale hero.
                </p>
                {collectionsLoading ? (
                    <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--builder-text-muted)', fontSize: '0.75rem' }}>
                        <div style={{ display: 'inline-block', width: '20px', height: '20px', border: '2px solid var(--builder-border)', borderTopColor: 'var(--builder-accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                        <div style={{ marginTop: '8px' }}>Chargement des catégories...</div>
                    </div>
                ) : availableCollections.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '1.5rem', fontSize: '0.75rem' }}>
                        <div style={{ color: 'var(--builder-text-muted)', marginBottom: '8px' }}>
                            Aucune catégorie trouvée.
                        </div>
                        {collectionsError && (
                            <div style={{ color: '#ef4444', fontSize: '0.65rem', marginBottom: '8px', wordBreak: 'break-word' }}>
                                {collectionsError}
                            </div>
                        )}
                        <div style={{ fontSize: '0.65rem', color: 'var(--builder-text-muted)', marginBottom: '10px' }}>
                            API: {getBackendBaseUrl()}/admin-api
                        </div>
                        <button
                            className="btn-pro"
                            style={{ padding: '4px 16px', fontSize: '0.7rem', cursor: 'pointer' }}
                            onClick={loadCollections}
                        >🔄 Réessayer</button>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        {availableCollections.map((coll: any) => {
                            const isEnabled = config.enabledCategories?.[coll.slug] === true;
                            const catImg = config.collectionMedia?.[coll.slug] || coll.featuredAsset?.preview || '';
                            const heroImg = config.heroIcons?.[coll.slug] || '';
                            const isExpanded = expandedCat === coll.slug;

                            return (
                                <div key={coll.id} style={{
                                    border: `1px solid ${isExpanded ? 'var(--builder-accent, #6366f1)' : isEnabled ? 'var(--builder-border)' : 'var(--builder-border)'}`,
                                    borderRadius: '8px',
                                    overflow: 'hidden',
                                    background: isEnabled ? (isExpanded ? 'var(--builder-accent-bg, rgba(99,102,241,0.04))' : 'var(--builder-bg)') : 'rgba(0,0,0,0.02)',
                                    opacity: isEnabled ? 1 : 0.55,
                                    transition: 'all 0.15s ease',
                                }}>
                                    {/* Category row */}
                                    <div
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '10px',
                                            padding: '8px 10px',
                                            cursor: 'pointer',
                                        }}
                                        onClick={() => setExpandedCat(isExpanded ? null : coll.slug)}
                                    >
                                        {/* Toggle */}
                                        <div
                                            onClick={(e) => { e.stopPropagation(); toggleCategory(coll.slug); }}
                                            style={{
                                                width: '32px', height: '18px', borderRadius: '9px',
                                                background: isEnabled ? 'var(--builder-accent, #6366f1)' : '#d1d5db',
                                                position: 'relative', flexShrink: 0, transition: 'background 0.2s',
                                                cursor: 'pointer',
                                            }}
                                        >
                                            <div style={{
                                                width: '14px', height: '14px', borderRadius: '50%', background: '#fff',
                                                position: 'absolute', top: '2px',
                                                left: isEnabled ? '16px' : '2px',
                                                transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                                            }} />
                                        </div>

                                        {/* Preview image */}
                                        <div style={{
                                            width: '32px', height: '32px', borderRadius: '6px',
                                            overflow: 'hidden', background: catImg ? '#000' : 'var(--builder-bg)',
                                            border: '1px solid var(--builder-border)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            flexShrink: 0,
                                        }}>
                                            {catImg ? (
                                                <img src={catImg} alt={coll.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            ) : (
                                                <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--builder-text-muted)' }}>
                                                    {coll.name?.charAt(0) || '?'}
                                                </span>
                                            )}
                                        </div>

                                        {/* Name + slug */}
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: '0.75rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {coll.name}
                                            </div>
                                            <div style={{ fontSize: '0.6rem', color: 'var(--builder-text-muted)' }}>
                                                Collection · {coll.slug}
                                            </div>
                                        </div>

                                        {/* Status badges */}
                                        <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                                            {catImg && <span style={{ fontSize: '0.55rem', padding: '1px 5px', borderRadius: '4px', background: '#dbeafe', color: '#1d4ed8', fontWeight: 700 }}>IMG</span>}
                                            {heroImg && <span style={{ fontSize: '0.55rem', padding: '1px 5px', borderRadius: '4px', background: '#fef3c7', color: '#92400e', fontWeight: 700 }}>HERO</span>}
                                        </div>

                                        {/* Expand arrow */}
                                        <div style={{
                                            flexShrink: 0, transition: 'transform 0.2s',
                                            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                            color: 'var(--builder-text-muted)', fontSize: '0.7rem',
                                        }}>▼</div>
                                    </div>

                                    {/* Expanded editor — show even if disabled so user can upload images before enabling */}
                                    {isExpanded && (
                                        <div style={{
                                            padding: '10px 12px 14px',
                                            borderTop: '1px solid var(--builder-border)',
                                            background: 'rgba(255,255,255,0.5)',
                                        }}>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                                {/* Category Section Image */}
                                                <div style={{
                                                    padding: '10px', borderRadius: '8px',
                                                    border: '1px solid var(--builder-border)',
                                                    background: 'var(--builder-bg)',
                                                }}>
                                                    <div style={{ fontSize: '0.7rem', fontWeight: 700, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        🖼️ Image de la catégorie
                                                    </div>
                                                    <p style={{ fontSize: '0.6rem', color: 'var(--builder-text-muted)', marginBottom: '8px' }}>
                                                        Affichée dans la grille de la section catégories sur la boutique
                                                    </p>
                                                    <FileUploadField
                                                        label=""
                                                        value={catImg}
                                                        onChange={(url) => handleCollectionMediaChange(coll.slug, url)}
                                                        accept="image/*,image/gif"
                                                        placeholder="Télécharger l'image de la catégorie"
                                                    />
                                                </div>

                                                {/* Hero Sidebar Icon/Image */}
                                                <div style={{
                                                    padding: '10px', borderRadius: '8px',
                                                    border: '1px solid var(--builder-border)',
                                                    background: 'var(--builder-bg)',
                                                }}>
                                                    <div style={{ fontSize: '0.7rem', fontWeight: 700, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        🦸 Icône Hero
                                                    </div>
                                                    <p style={{ fontSize: '0.6rem', color: 'var(--builder-text-muted)', marginBottom: '8px' }}>
                                                        Affichée à côté du nom de la catégorie dans la barre latérale hero
                                                    </p>
                                                    <FileUploadField
                                                        label=""
                                                        value={heroImg}
                                                        onChange={(url) => handleHeroIconChange(coll.slug, url)}
                                                        accept="image/*,image/gif"
                                                        placeholder="Télécharger l'icône/image hero"
                                                    />
                                                </div>
                                            </div>
                                        </div>
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
