import React, { useState, useEffect } from 'react';
import { FileUploadField } from './FileUploadField';
import { fetchGraphQL } from '../../../lib/utils';
import { useAutoSave } from '../useAutoSave';

interface FlashSettingsProps {
    data: any;
    onSave: (newData: any) => void;
}

export const FlashSettings = ({ data, onSave }: FlashSettingsProps) => {
    const [config, setConfig] = useState(data);
    useAutoSave(config, onSave);
    const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);

    useEffect(() => {
        const defaults = {
            flashVersions: [{
                id: 'v1', name: 'Default Campaign', isActive: true, isSimpleMode: false,
                title: 'VENTES FLASH DU JOUR', subtitle: 'Offres à durée limitée !',
                selectionType: 'FILTER',
                filterCriteria: { minPrice: 0, maxPrice: 0, minDiscount: 20, take: 10, onlyInStock: true, collectionIds: [] },
                manualProductIds: [],
                bgColor: '#e31837', accentColor: '#ffffff', textColor: '#ffffff',
                bgImageUrl: '', bgType: 'color',
                startTime: new Date().toISOString(),
                endTime: new Date(Date.now() + 86400000).toISOString(),
                isUnlimited: false,
                titleFontSize: '24px', titleFontWeight: '900',
                showCountdown: true, countdownStyle: 'boxes',
                cardStyle: 'standard', showBadge: true, badgeText: 'FLASH',
                discountPercentage: 20,
                height: 'auto', padding: '32px', borderRadius: '0px',
                animation: 'none',
                displayLayout: 'horizontal_scroll',
                showPromotionalPrice: false,
                icon: 'Zap',
                applyFakePromotion: false,
                unconfirmedLocationBehavior: 'show_message_with_fallback'
            }]
        };
        const d = { ...defaults, ...data };
        setConfig(d);
        if (!selectedVersionId && d.flashVersions.length > 0) setSelectedVersionId(d.flashVersions[0].id);
    }, [data]);

    const versions = config.flashVersions || [];
    const sv = versions.find((v: any) => v.id === selectedVersionId) || versions[0];

    const updateVersion = (id: string, fields: any) => setConfig({ ...config, flashVersions: versions.map((v: any) => v.id === id ? { ...v, ...fields } : v) });
    const addVersion = () => {
        const newId = `v${Date.now()}`;
        setConfig({ ...config, flashVersions: [...versions, { ...(versions[0] || {}), id: newId, name: `Campaign ${versions.length + 1}`, isActive: false }] });
        setSelectedVersionId(newId);
    };
    const removeVersion = (id: string) => {
        const nv = versions.filter((v: any) => v.id !== id);
        setConfig({ ...config, flashVersions: nv });
        if (nv.length > 0) setSelectedVersionId(nv[0].id);
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

    if (!sv) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
                <button className="btn-pro" onClick={addVersion}>Initialiser la campagne Flash</button>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', gap: '1.5rem', width: '100%', height: '100%', maxHeight: 'calc(100vh - 200px)' }}>
            {/* Editor */}
            <div className="stack-lg" style={{ flex: 1, overflowY: 'auto', maxHeight: '100%' }}>
                <div className="settings-card">
                    <div className="settings-card-header" style={{ justifyContent: 'space-between' }}>
                        <span>⚡ {sv.name}</span>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <label style={{ fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <input type="checkbox" checked={sv.isActive} onChange={(e) => updateVersion(sv.id, { isActive: e.target.checked })} /> En direct
                            </label>
                        </div>
                    </div>
                    <div className="grid-3">
                        <div><label className="label-pro">Nom de la campagne</label><input className="input-pro" value={sv.name} onChange={(e) => updateVersion(sv.id, { name: e.target.value })} /></div>
                        <div><label className="label-pro">Apparence</label>
                            <select className="input-pro" value={sv.headerStyle === 'smart_cart' || (!sv.headerStyle && !sv.isSimpleMode) ? 'smart_cart' : (sv.isSimpleMode ? 'simple' : 'full')} onChange={(e) => {
                                const val = e.target.value;
                                if (val === 'smart_cart') {
                                    updateVersion(sv.id, { isSimpleMode: false, headerStyle: 'smart_cart' });
                                } else if (val === 'simple') {
                                    updateVersion(sv.id, { isSimpleMode: true, headerStyle: 'simple' });
                                } else {
                                    updateVersion(sv.id, { isSimpleMode: false, headerStyle: 'styled' });
                                }
                            }}>
                                <option value="full">1. Riche (Bannière colorée & Média)</option>
                                <option value="simple">2. Minimaliste (Texte uniquement)</option>
                                <option value="smart_cart">3. Panier Smart (Badge au-dessus + Titre avec Panier 🛍️ + Ligne sous-jacente)</option>
                            </select>
                        </div>
                        <div><label className="label-pro">Disposition des produits</label>
                            <select className="input-pro" value={sv.displayLayout || 'horizontal_scroll'} onChange={(e) => updateVersion(sv.id, { displayLayout: e.target.value })}>
                                <option value="horizontal_scroll">Défilement horizontal (Scroll)</option>
                                <option value="vertical_grid">Grille verticale (Vers le bas)</option>
                            </select>
                        </div>
                    </div>
                    <div className="grid-3" style={{ marginTop: '1rem' }}>
                        <div><label className="label-pro">Titre</label><input className="input-pro" value={sv.title} onChange={(e) => updateVersion(sv.id, { title: e.target.value })} /></div>
                        <div><label className="label-pro">Sous-titre</label><input className="input-pro" value={sv.subtitle} onChange={(e) => updateVersion(sv.id, { subtitle: e.target.value })} /></div>
                        <div><label className="label-pro">Emoji du Titre / Bannière (ex: 🛍️, ⚡, 🔥)</label><input className="input-pro" placeholder="ex: 🛍️ ou ⚡" value={sv.icon || ''} onChange={(e) => updateVersion(sv.id, { icon: e.target.value })} /></div>
                    </div>
                    {(sv.headerStyle === 'smart_cart' || (!sv.headerStyle && !sv.isSimpleMode)) && (
                        <div style={{ marginTop: '1rem', padding: '12px', background: 'rgba(227, 24, 55, 0.05)', borderRadius: '8px', border: '1px solid rgba(227, 24, 55, 0.2)' }}>
                            <label className="label-pro" style={{ color: '#e31837', fontWeight: 'bold' }}>
                                ✨ Texte de la petite carte au-dessus (Badge Option 3)
                            </label>
                            <input 
                                className="input-pro" 
                                style={{ marginTop: '6px' }}
                                placeholder="ex: ✨ VENTES FLASH SPÉCIALES / 📍 OFFRES DE QUARTIER" 
                                value={sv.badgeText || ''} 
                                onChange={(e) => updateVersion(sv.id, { badgeText: e.target.value })} 
                            />
                        </div>
                    )}
                </div>

                {/* Timing */}
                <div className="settings-card">
                    <div className="settings-card-header">⏰ Planification</div>
                    <div className="grid-2">
                        <div><label className="label-pro">Heure de début</label><input type="datetime-local" className="input-pro" value={sv.startTime ? new Date(sv.startTime).toISOString().slice(0, 16) : ''} onChange={(e) => updateVersion(sv.id, { startTime: new Date(e.target.value).toISOString() })} /></div>
                        <div className="toggle-row"><label><input type="checkbox" checked={sv.isUnlimited} onChange={(e) => updateVersion(sv.id, { isUnlimited: e.target.checked })} /> Durée illimitée (pas de fin)</label></div>
                    </div>
                    {!sv.isUnlimited && (
                        <div style={{ marginTop: '1rem' }}>
                            <label className="label-pro">Heure de fin (Compte à rebours)</label>
                            <input type="datetime-local" className="input-pro" value={sv.endTime ? new Date(sv.endTime).toISOString().slice(0, 16) : ''} onChange={(e) => updateVersion(sv.id, { endTime: new Date(e.target.value).toISOString() })} />
                        </div>
                    )}
                    {!sv.isUnlimited && (
                        <div className="grid-2" style={{ marginTop: '1rem' }}>
                            <div className="toggle-row"><label><input type="checkbox" checked={sv.showCountdown} onChange={(e) => updateVersion(sv.id, { showCountdown: e.target.checked })} /> Afficher le compte à rebours</label></div>
                            <div>
                                <label className="label-pro">Style de compte à rebours</label>
                                <select className="input-pro" value={sv.countdownStyle} onChange={(e) => updateVersion(sv.id, { countdownStyle: e.target.value })}>
                                    <option value="boxes">Boîtes pivotantes</option>
                                    <option value="inline">Texte en ligne</option>
                                    <option value="circular">Progression circulaire</option>
                                </select>
                            </div>
                        </div>
                    )}
                </div>

                {/* Product Selection */}
                <div className="settings-card">
                    <div className="settings-card-header" style={{ justifyContent: 'space-between' }}>
                        <span>📦 Sélection de produits</span>
                        <select className="input-pro" style={{ width: 'auto', padding: '4px 10px', fontSize: '0.75rem' }} value={sv.selectionType} onChange={(e) => updateVersion(sv.id, { selectionType: e.target.value })}>
                            <option value="MANUAL">📍 Par Sélection de produit (Recherche)</option>
                            <option value="FILTER">⚡ Par Collection / Filtre intelligent</option>
                            <option value="LOCAL_NEIGHBORHOOD">🏘️ Produits reliés au Quartier de l'utilisateur</option>
                            <option value="LOCAL_MARKET">🏪 Produits reliés au Marché le plus proche</option>
                        </select>
                    </div>
                    {(sv.selectionType === 'LOCAL_NEIGHBORHOOD' || sv.selectionType === 'LOCAL_MARKET') && (
                        <div className="stack" style={{ marginTop: '16px', padding: '12px', background: 'rgba(227, 24, 55, 0.05)', borderRadius: '8px', border: '1px dashed rgba(227, 24, 55, 0.3)' }}>
                            <label className="label-pro" style={{ color: '#e31837', fontWeight: 'bold' }}>
                                📍 Que voir si l'utilisateur n'a pas sélectionné sa position ?
                            </label>
                            <select 
                                className="input-pro" 
                                value={sv.unconfirmedLocationBehavior || 'show_message_with_fallback'} 
                                onChange={(e) => updateVersion(sv.id, { unconfirmedLocationBehavior: e.target.value })}
                            >
                                <option value="show_message_with_fallback">Option 1 : Afficher les Ventes Flash avec un message ("Veuillez choisir votre position...")</option>
                                <option value="hide_completely">Option 2 : Ne pas faire apparaître la section du tout</option>
                            </select>
                        </div>
                    )}
                    <div className="stack" style={{ marginTop: '1rem' }}>
                        <div className="grid-2">
                            <div>
                                <label className="label-pro">Largeur des cartes (ex: 240px, auto)</label>
                                <input className="input-pro" placeholder="auto ou ex: 260px" value={sv.cardWidth || ''} onChange={(e) => updateVersion(sv.id, { cardWidth: e.target.value })} />
                            </div>
                            <div>
                                <label className="label-pro">Hauteur des cartes (ex: 380px, auto)</label>
                                <input className="input-pro" placeholder="auto ou ex: 400px" value={sv.cardHeight || ''} onChange={(e) => updateVersion(sv.id, { cardHeight: e.target.value })} />
                            </div>
                        </div>
                        <div className="grid-2" style={{ marginTop: '0.5rem' }}>
                            <div className="toggle-row">
                                <label><input type="checkbox" checked={sv.showCartIcon || false} onChange={(e) => updateVersion(sv.id, { showCartIcon: e.target.checked })} /> Afficher l'icône Panier 🛒 sur chaque produit (Ajout direct au panier)</label>
                            </div>
                            <div className="toggle-row">
                                <label><input type="checkbox" checked={sv.showPromotionalPrice || false} onChange={(e) => updateVersion(sv.id, { showPromotionalPrice: e.target.checked })} /> Afficher le prix barré promotionnel</label>
                            </div>
                        </div>
                    </div>
                    {sv.selectionType === 'FILTER' || sv.selectionType === 'LOCAL_NEIGHBORHOOD' || sv.selectionType === 'LOCAL_MARKET' ? (
                        <div className="stack">
                            <div className="grid-2">
                                <div><label className="label-pro">Remise min (%)</label><input type="number" className="input-pro" value={sv.filterCriteria?.minDiscount} onChange={(e) => updateVersion(sv.id, { filterCriteria: { ...sv.filterCriteria, minDiscount: parseInt(e.target.value) } })} /></div>
                                <div><label className="label-pro">Nb max d'articles</label><input type="number" className="input-pro" value={sv.filterCriteria?.take} onChange={(e) => updateVersion(sv.id, { filterCriteria: { ...sv.filterCriteria, take: parseInt(e.target.value) } })} /></div>
                                <div><label className="label-pro">Prix min (XOF)</label><input type="number" className="input-pro" value={sv.filterCriteria?.minPrice} onChange={(e) => updateVersion(sv.id, { filterCriteria: { ...sv.filterCriteria, minPrice: parseInt(e.target.value) } })} /></div>
                                <div><label className="label-pro">Prix max (XOF)</label><input type="number" className="input-pro" value={sv.filterCriteria?.maxPrice} onChange={(e) => updateVersion(sv.id, { filterCriteria: { ...sv.filterCriteria, maxPrice: parseInt(e.target.value) } })} /></div>
                            </div>
                            <div className="grid-2">
                                <div className="toggle-row"><label><input type="checkbox" checked={sv.filterCriteria?.onlyInStock} onChange={(e) => updateVersion(sv.id, { filterCriteria: { ...sv.filterCriteria, onlyInStock: e.target.checked } })} /> En stock uniquement</label></div>
                            </div>
                            {sv.selectionType === 'FILTER' && (
                                <CollectionSelector selectedIds={sv.filterCriteria?.collectionIds || []} onSelectionChange={(ids) => updateVersion(sv.id, { filterCriteria: { ...sv.filterCriteria, collectionIds: ids } })} />
                            )}
                        </div>
                    ) : (
                        <div className="stack">
                            <ProductSearchModal selectedIds={sv.manualProductIds || []} onSelectionChange={(ids) => updateVersion(sv.id, { manualProductIds: ids })} />
                        </div>
                    )}
                </div>

                {/* Visual Style */}
                <div className="settings-card">
                    <div className="settings-card-header">🎨 Style visuel</div>
                    <div className="grid-3">
                        <ColorField label="Arrière-plan" value={sv.bgColor} onChange={(v) => updateVersion(sv.id, { bgColor: v })} />
                        <ColorField label="Accent (Minuteur)" value={sv.accentColor} onChange={(v) => updateVersion(sv.id, { accentColor: v })} />
                        <ColorField label="Couleur du texte" value={sv.textColor} onChange={(v) => updateVersion(sv.id, { textColor: v })} />
                    </div>
                    <div className="grid-2" style={{ marginTop: '1rem' }}>
                        <div><label className="label-pro">Type de fond</label>
                            <select className="input-pro" value={sv.bgType} onChange={(e) => updateVersion(sv.id, { bgType: e.target.value })}>
                                <option value="color">Uni</option><option value="gradient">Dégradé</option><option value="image">Image</option>
                            </select>
                        </div>
                        <div><label className="label-pro">Rayon de section</label>
                            <select className="input-pro" value={sv.borderRadius} onChange={(e) => updateVersion(sv.id, { borderRadius: e.target.value })}>
                                <option value="0px">Aucun</option><option value="12px">Moyen</option><option value="24px">Grand</option>
                            </select>
                        </div>
                    </div>
                    {sv.bgType === 'image' && (
                        <div style={{ marginTop: '1rem' }}><FileUploadField label="Image d'arrière-plan" value={sv.bgImageUrl} onChange={(v) => updateVersion(sv.id, { bgImageUrl: v })} accept="image/*,image/gif" /></div>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- Product Search Modal for MANUAL selection ---
function ProductSearchModal({ selectedIds, onSelectionChange }: { selectedIds: string[], onSelectionChange: (ids: string[]) => void }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const searchProducts = async (term: string) => {
        if (!term || term.length < 2) { setSearchResults([]); return; }
        setLoading(true);
        try {
            // Utiliser shop-api pour éviter les erreurs d'autorisation FORBIDDEN sur admin-api
            const origin = window.location.origin.includes(':5173') || window.location.origin.includes(':5174') || window.location.origin.includes(':4200')
                ? window.location.origin.replace(/:(5173|5174|4200)/, ':3000')
                : window.location.origin;
            const shopApiUrl = `${origin}/shop-api`;
            
            const res = await fetch(shopApiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: `query SearchProducts($input: SearchInput!) {
                        search(input: $input) {
                            items {
                                productId productName slug
                                productAsset { id preview }
                                priceWithTax { ... on SinglePrice { value } ... on PriceRange { min } }
                            }
                        }
                    }`,
                    variables: { input: { term, groupByProduct: true, take: 20 } }
                })
            });
            const result = await res.json();
            let items = result.data?.search?.items || [];
            
            // Si la recherche par index retourne 0 résultat, fallback sur la requête products
            if (items.length === 0) {
                const resProducts = await fetch(shopApiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        query: `query GetProducts($term: String!) {
                            products(options: { filter: { name: { contains: $term } }, take: 20 }) {
                                items {
                                    id name slug
                                    featuredAsset { id preview }
                                    variants { priceWithTax }
                                }
                            }
                        }`,
                        variables: { term }
                    })
                });
                const prodResult = await resProducts.json();
                const prodItems = prodResult.data?.products?.items || [];
                items = prodItems.map((p: any) => ({
                    productId: p.id,
                    productName: p.name,
                    slug: p.slug,
                    productAsset: p.featuredAsset,
                    priceWithTax: { __typename: 'SinglePrice', value: p.variants?.[0]?.priceWithTax || 0 }
                }));
            }
            
            setSearchResults(items);
        } catch (err) {
            console.error('Product search failed:', err);
        } finally {
            setLoading(false);
        }
    };

    const toggleProduct = (id: string) => {
        const newIds = selectedIds.includes(id)
            ? selectedIds.filter((sid: string) => sid !== id)
            : [...selectedIds, id];
        onSelectionChange(newIds);
    };

    useEffect(() => {
        const handler = setTimeout(() => {
            searchProducts(searchTerm);
        }, 500);
        return () => clearTimeout(handler);
    }, [searchTerm]);

    return (
        <div className="stack">
            <div>
                <label className="label-pro">Rechercher des produits à ajouter</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <input className="input-pro" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Tappez le nom du produit..." style={{ flex: 1 }} />
                </div>
            </div>
            {/* Selected Products */}
            {selectedIds.length > 0 && (
                <div>
                    <label className="label-pro">Sélectionné ({selectedIds.length} produits)</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {selectedIds.map((id: string) => (
                            <span key={id} style={{ padding: '4px 10px', background: 'var(--builder-primary-light)', border: '1px solid var(--builder-primary-border)', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                {id.substring(0, 8)}...
                                <button onClick={() => toggleProduct(id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontWeight: 700, fontSize: '0.65rem' }}>✕</button>
                            </span>
                        ))}
                    </div>
                </div>
            )}
            {/* Search Results */}
            {searchResults.length > 0 && (
                <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--builder-border)', borderRadius: '8px' }}>
                    {searchResults.map((p: any) => {
                        const isSelected = selectedIds.includes(p.productId);
                        return (
                            <div key={p.productId} onClick={() => toggleProduct(p.productId)} style={{
                                padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px',
                                background: isSelected ? 'var(--builder-primary-light)' : '#fff',
                                borderBottom: '1px solid var(--builder-border)',
                                fontSize: '0.75rem'
                            }}>
                                {p.productAsset && <img src={p.productAsset.preview} alt="" style={{ width: '32px', height: '32px', objectFit: 'cover', borderRadius: '4px' }} />}
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 600 }}>{p.productName}</div>
                                    <div style={{ fontSize: '0.65rem', color: 'var(--builder-text-muted)' }}>ID: {p.productId}</div>
                                </div>
                                {isSelected && <span style={{ color: 'var(--builder-primary)', fontWeight: 700 }}>✓</span>}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// --- Collection Selector for FILTER mode ---
function CollectionSelector({ selectedIds, onSelectionChange }: { selectedIds: string[], onSelectionChange: (ids: string[]) => void }) {
    const [collectionTree, setCollectionTree] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchCollections = async () => {
            try {
                const data = await fetchGraphQL(`query GetCmsCollectionsTree { cmsCollectionsTree { id name slug children { id name slug } } }`);
                setCollectionTree(data?.cmsCollectionsTree || []);
            } catch (err: any) {
                console.error('Failed to fetch collections:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchCollections();
    }, []);

    const toggleCollection = (id: string, children: any[] = []) => {
        let newIds = [...selectedIds];
        const isSelected = selectedIds.includes(id);

        if (isSelected) {
            // Remove parent and all children
            const idsToRemove = [id, ...children.map(c => c.id)];
            newIds = newIds.filter((sid: string) => !idsToRemove.includes(sid));
        } else {
            // Add parent and all children
            const idsToAdd = [id, ...children.map(c => c.id)];
            idsToAdd.forEach(addId => {
                if (!newIds.includes(addId)) newIds.push(addId);
            });
        }
        onSelectionChange(newIds);
    };

    if (loading) return <div style={{ fontSize: '0.75rem', color: 'var(--builder-text-soft)' }}>Chargement des collections...</div>;
    if (error) return <div style={{ fontSize: '0.75rem', color: '#ef4444' }}>Erreur lors du chargement des collections : {error}</div>;
    if (collectionTree.length === 0) return <div style={{ fontSize: '0.75rem', color: 'var(--builder-text-soft)' }}>Aucune collection trouvée. Créez des collections dans l'administration Vendure d'abord.</div>;

    const filteredTree = searchTerm.trim() === '' 
        ? collectionTree 
        : collectionTree.map(node => {
            const term = searchTerm.toLowerCase();
            const matchesParent = node.name.toLowerCase().includes(term);
            const filteredChildren = (node.children || []).filter((c: any) => c.name.toLowerCase().includes(term));
            
            if (matchesParent || filteredChildren.length > 0) {
                return { ...node, children: matchesParent ? node.children : filteredChildren };
            }
            return null;
        }).filter(Boolean);

    return (
        <div>
            <label className="label-pro">Filtrer par Collection</label>
            <input 
                className="input-pro" 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                placeholder="Rechercher une collection..." 
                style={{ width: '100%', marginBottom: '1rem' }} 
            />
            <div style={{ maxHeight: '250px', overflowY: 'auto', paddingRight: '8px' }}>
                {filteredTree.length === 0 ? (
                    <div style={{ fontSize: '0.75rem', color: 'var(--builder-text-soft)', padding: '1rem 0' }}>Aucune collection correspondante.</div>
                ) : (
                    filteredTree.map((node: any) => (
                <div key={node.id} style={{ marginBottom: '8px' }}>
                    <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--builder-text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>{node.name}</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        <button
                            onClick={() => toggleCollection(node.id, node.children || [])}
                            style={{
                                padding: '4px 10px',
                                borderRadius: '6px',
                                border: `1px solid ${selectedIds.includes(node.id) ? 'var(--builder-primary)' : 'var(--builder-border)'}`,
                                background: selectedIds.includes(node.id) ? 'var(--builder-primary-light)' : '#fff',
                                color: selectedIds.includes(node.id) ? 'var(--builder-primary)' : 'var(--builder-text)',
                                fontSize: '0.7rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.15s'
                            }}
                        >
                            {node.name}
                        </button>
                        {node.children && node.children.map((child: any) => (
                            <button
                                key={child.id}
                                onClick={() => toggleCollection(child.id)}
                                style={{
                                    padding: '4px 10px',
                                    borderRadius: '6px',
                                    border: `1px solid ${selectedIds.includes(child.id) ? 'var(--builder-primary)' : 'var(--builder-border)'}`,
                                    background: selectedIds.includes(child.id) ? 'var(--builder-primary-light)' : '#fff',
                                    color: selectedIds.includes(child.id) ? 'var(--builder-primary)' : 'var(--builder-text)',
                                    fontSize: '0.7rem',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    transition: 'all 0.15s'
                                }}
                            >
                                {child.name}
                            </button>
                        ))}
                    </div>
                </div>
            )))}
            </div>
        </div>
    );
}
