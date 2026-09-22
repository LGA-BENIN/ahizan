import React, { useState, useEffect } from 'react';
import { useAutoSave } from '../useAutoSave';
import { fetchGraphQL } from '../../../lib/utils';

interface UniversalProductCollectionSettingsProps {
    data: any;
    onSave: (newData: any) => void;
}

const FETCH_COLLECTIONS = `query { cmsCollectionsTree { id name slug children { id name slug } } }`;
const FETCH_MARKETS = `query { markets { id name slug } }`;
const FETCH_GEO_ZONES = `query { geoZones { id name slug type } }`;

const defaults = {
    title: 'Sélection pour vous',
    subtitle: 'Découvrez nos offres recommandées',
    badgeText: 'Recommandation EMS',
    experienceStrategy: 'LOCAL_DISCOVERY',
    layout: 'carousel',
    columns: 4,
    limit: 8,
    textAlign: 'left',
    headerStyle: 'smart_cart',
    titleColor: '#0f172a',
    subtitleColor: '#475569',
    badgeBgColor: '#e31837',
    badgeTextColor: '#ffffff',
    cardTheme: 'default',
    // Flash Sale specific defaults
    showCountdown: false,
    countdownEnd: '',
    flashCampaignTitle: 'Vente Flash Exclusive',
    flashBadgeStyle: 'neon_timer',
    autoHideExpired: true,
    // Catalog specific defaults
    filterType: 'LATEST',
    enableTabs: false,
    categoryFilterMode: 'ALL', // 'ALL' | 'SPECIFIC'
    collectionIds: [] as string[],
    // Local Discovery specific defaults
    locationSource: 'AUTO',
    marketId: '',
    marketName: '',
    locationId: '',
    locationName: '',
    requireConfirmedLocation: false,
    mixMode: 'none',
    radiusKm: 15,
    // Personalization specific defaults
    maxItemsPerVendor: 3,
    boostCertifiedVendors: true,
    // Badges 4 coins
    topLeftBadge: 'vendor_name',
    topRightBadge: 'like_button',
    bottomLeftBadge: 'stock_status',
    bottomRightBadge: 'cart_button',
};

export const UniversalProductCollectionSettings = ({ data, onSave }: UniversalProductCollectionSettingsProps) => {
    const [config, setConfig] = useState<any>(() => ({ ...defaults, ...data }));
    const [collections, setCollections] = useState<any[]>([]);
    const [markets, setMarkets] = useState<any[]>([]);
    const [geoZones, setGeoZones] = useState<any[]>([]);
    const [categorySearch, setCategorySearch] = useState('');

    useAutoSave(config, onSave);

    // Fetch collections list
    useEffect(() => {
        fetchGraphQL(FETCH_COLLECTIONS)
            .then((res: any) => {
                const tree = res?.cmsCollectionsTree || [];
                const flat: any[] = [];
                const flatten = (nodes: any[]) => {
                    for (const node of nodes) {
                        flat.push({ id: String(node.id), name: node.name, slug: node.slug });
                        if (node.children && node.children.length > 0) {
                            flatten(node.children);
                        }
                    }
                };
                flatten(tree);
                setCollections(flat);
            })
            .catch(err => console.error('[UniversalProductCollectionSettings] Failed to fetch collections:', err));

        // Fetch markets and geoZones
        fetchGraphQL(FETCH_MARKETS)
            .then(res => setMarkets(res?.markets || []))
            .catch(err => console.error('[UniversalProductCollectionSettings] Failed to fetch markets:', err));

        fetchGraphQL(FETCH_GEO_ZONES)
            .then(res => setGeoZones(res?.geoZones || []))
            .catch(err => console.error('[UniversalProductCollectionSettings] Failed to fetch geoZones:', err));
    }, []);

    const handleChange = (field: string, value: any) => {
        setConfig((prev: any) => ({ ...prev, [field]: value }));
    };

    const toggleCollectionId = (id: string) => {
        const currentIds: string[] = Array.isArray(config.collectionIds) ? config.collectionIds.map(String) : [];
        const isSelected = currentIds.includes(String(id));
        const updated = isSelected 
            ? currentIds.filter(item => item !== String(id))
            : [...currentIds, String(id)];
        handleChange('collectionIds', updated);
    };

    const ColorField = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
        <div>
            <label className="label-pro mb-1 block font-semibold text-slate-700">{label}</label>
            <div className="flex items-center gap-2">
                <input 
                    type="color" 
                    className="w-8 h-8 rounded border p-0 cursor-pointer shadow-sm" 
                    value={value || '#000000'} 
                    onChange={(e) => onChange(e.target.value)} 
                />
                <input 
                    type="text" 
                    className="w-full p-1.5 border rounded text-xs font-mono bg-white" 
                    value={value || ''} 
                    onChange={(e) => onChange(e.target.value)} 
                />
            </div>
        </div>
    );

    const strategy = config.experienceStrategy || 'LOCAL_DISCOVERY';
    const categoryFilterMode = config.categoryFilterMode || (config.collectionIds?.length > 0 ? 'SPECIFIC' : 'ALL');
    const selectedCollectionIds: string[] = Array.isArray(config.collectionIds) ? config.collectionIds.map(String) : [];

    const filteredCollections = collections.filter(c => 
        !categorySearch || 
        c.name.toLowerCase().includes(categorySearch.toLowerCase()) || 
        c.slug.toLowerCase().includes(categorySearch.toLowerCase())
    );

    return (
        <div className="space-y-4 p-4 text-xs max-h-[80vh] overflow-y-auto font-sans">
            <div className="flex items-center justify-between border-b pb-2">
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    <span className="text-base">🎯</span> Collection de Produits EMS
                </h3>
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                    Moteur Intelligent
                </span>
            </div>

            {/* 1. SELECTION DE LA STRATEGIE METIER */}
            <div className="p-3 border rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 space-y-2">
                <label className="block font-bold text-blue-950 text-xs uppercase tracking-wide">
                    1. Type d'Affichage & Stratégie Métier
                </label>
                <select
                    value={strategy}
                    onChange={(e) => handleChange('experienceStrategy', e.target.value)}
                    className="w-full p-2 border rounded-md text-xs bg-white font-bold text-slate-800 shadow-sm border-blue-300 focus:ring-2 focus:ring-blue-400 focus:outline-none"
                >
                    <option value="LOCAL_DISCOVERY">📍 Découverte Locale (Produits à proximité du client / GeoEngine)</option>
                    <option value="CATALOG">📦 Catalogue Standard (Sélection par rayons & catégories)</option>
                    <option value="FLASH_SALE">⚡ Ventes Flash (Offres limitées avec compte à rebours chrono)</option>
                    <option value="TRENDING">🔥 Tendances & Populaires (Meilleures ventes locales)</option>
                    <option value="HOME_FEED">🚀 Flux Personnalisé (Recommandations par affinité client)</option>
                </select>
                <p className="text-[11px] text-blue-800 leading-relaxed">
                    {strategy === 'LOCAL_DISCOVERY' && "📍 Affiche uniquement les produits des boutiques situées dans la zone ou à proximité du client (avec séparation stricte des villes)."}
                    {strategy === 'CATALOG' && "📦 Affiche les produits du catalogue général selon les catégories sélectionnées et le critère de tri."}
                    {strategy === 'FLASH_SALE' && "⚡ Met en avant les promotions temporaires avec un compte à rebours actif et badge dynamique."}
                    {strategy === 'TRENDING' && "🔥 Affiche les produits les plus commandés et consultés dans la région du visiteur."}
                    {strategy === 'HOME_FEED' && "🚀 Calcule dynamiquement les recommandations selon les catégories préférées du client."}
                </p>
            </div>

            {/* 2. CIBLAGE GEOGRAPHIQUE (SI LOCAL DISCOVERY OU SI SOUHAITÉ) */}
            {strategy === 'LOCAL_DISCOVERY' && (
                <div className="p-3 border rounded-lg bg-sky-50 border-sky-300 space-y-3">
                    <div className="flex items-center justify-between border-b border-sky-200 pb-1.5">
                        <h4 className="font-bold text-sky-950 flex items-center gap-1.5 uppercase text-[11px] tracking-wide">
                            <span>📍</span> 2. Périmètre Géographique & Rayon
                        </h4>
                        <span className="text-[10px] text-sky-800 font-medium">PostGIS GeoEngine</span>
                    </div>

                    {/* Mode de ciblage */}
                    <div>
                        <label className="block font-semibold mb-1 text-slate-800">Mode de Détection de la Position</label>
                        <select
                            value={config.locationSource || 'AUTO'}
                            onChange={(e) => {
                                const val = e.target.value;
                                handleChange('locationSource', val);
                                if (val === 'AUTO') {
                                    handleChange('marketId', '');
                                    handleChange('marketName', '');
                                    handleChange('locationId', '');
                                    handleChange('locationName', '');
                                }
                            }}
                            className="w-full p-2 border rounded text-xs bg-white font-semibold text-slate-800 shadow-sm"
                        >
                            <option value="AUTO">🌐 Auto GPS (Position dynamique détectée chez le client)</option>
                            <option value="FIXED_MARKET">🏪 Marché Physique Fixe (ex: Dantokpa, Ganhi, Missèbo...)</option>
                            <option value="FIXED_LOCATION">📍 Ville / Quartier Fixe (ex: Cotonou, Porto-Novo, Cadjèhoun...)</option>
                        </select>
                    </div>

                    {/* Marché Fixe */}
                    {config.locationSource === 'FIXED_MARKET' && (
                        <div>
                            <label className="block font-semibold mb-1 text-slate-800">Marché Cible</label>
                            <select
                                value={config.marketId || ''}
                                onChange={(e) => {
                                    const mId = e.target.value;
                                    const mObj = markets.find((m: any) => String(m.id) === String(mId));
                                    handleChange('marketId', mId);
                                    handleChange('marketName', mObj?.name || '');
                                    handleChange('locationId', '');
                                    handleChange('locationName', '');
                                }}
                                className="w-full p-2 border rounded text-xs bg-white font-medium text-slate-800"
                            >
                                <option value="">-- Choisir un marché physique --</option>
                                {markets.map((m: any) => (
                                    <option key={m.id} value={m.id}>{m.name} ({m.slug})</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Zone Fixe */}
                    {config.locationSource === 'FIXED_LOCATION' && (
                        <div>
                            <label className="block font-semibold mb-1 text-slate-800">Ville / Quartier Cible</label>
                            <select
                                value={config.locationId || ''}
                                onChange={(e) => {
                                    const locId = e.target.value;
                                    const locObj = geoZones.find((z: any) => String(z.id) === String(locId));
                                    handleChange('locationId', locId);
                                    handleChange('locationName', locObj?.name || '');
                                    handleChange('marketId', '');
                                    handleChange('marketName', '');
                                }}
                                className="w-full p-2 border rounded text-xs bg-white font-medium text-slate-800"
                            >
                                <option value="">-- Choisir un quartier ou une ville --</option>
                                {geoZones.map((z: any) => (
                                    <option key={z.id} value={z.id}>{z.name} ({z.type})</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Rayon GPS & Fallback */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                        <div>
                            <label className="block font-semibold mb-1 text-slate-800">
                                Rayon Max GPS (km)
                            </label>
                            <input
                                type="number"
                                value={config.radiusKm !== undefined && config.radiusKm !== null ? config.radiusKm : 15}
                                onChange={(e) => {
                                    const val = e.target.value === '' ? '' : parseInt(e.target.value, 10);
                                    handleChange('radiusKm', isNaN(val as number) ? '' : val);
                                }}
                                min={1}
                                max={100}
                                placeholder="15 (par défaut)"
                                className="w-full p-1.5 border rounded text-xs bg-white font-medium"
                            />
                            <p className="text-[10px] text-slate-500 mt-0.5">
                                {config.radiusKm ? `${config.radiusKm} km autour du client` : '15 km par défaut si vide'}
                            </p>
                        </div>
                        <div>
                            <label className="block font-semibold mb-1 text-slate-800">
                                Comportement si Zone Vide
                            </label>
                            <select
                                value={config.mixMode || 'none'}
                                onChange={(e) => handleChange('mixMode', e.target.value)}
                                className="w-full p-1.5 border rounded text-xs bg-white font-medium"
                            >
                                <option value="none">Strict (Ne rien afficher si 0 vendeur)</option>
                                <option value="hybrid">Hybride (Combler avec d'autres vendeurs)</option>
                                <option value="fallback">Repli (Catalogue général si aucun vendeur)</option>
                            </select>
                            <p className="text-[10px] text-slate-500 mt-0.5">
                                {config.mixMode === 'none' ? 'Garantit 0 mélange de villes' : 'Affiche du contenu de secours'}
                            </p>
                        </div>
                    </div>

                    <div className="pt-1">
                        <label className="flex items-center gap-2 font-medium text-slate-800 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={config.requireConfirmedLocation === true}
                                onChange={(e) => handleChange('requireConfirmedLocation', e.target.checked)}
                                className="rounded text-sky-600"
                            />
                            <span>Masquer la section si le client n'a pas encore choisi sa ville/zone</span>
                        </label>
                    </div>
                </div>
            )}

            {/* 3. FILTRAGE DIRECT PAR RAYONS / CATEGORIES */}
            <div className="p-3 border rounded-lg bg-white shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b pb-1.5">
                    <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wide flex items-center gap-1.5">
                        <span>🏷️</span> 3. Filtrage par Catégories / Rayons
                    </h4>
                    {selectedCollectionIds.length > 0 && (
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded-full font-bold">
                            {selectedCollectionIds.length} sélectionnée{selectedCollectionIds.length > 1 ? 's' : ''}
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-4 pt-1">
                    <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-slate-800">
                        <input
                            type="radio"
                            name="categoryFilterMode"
                            value="ALL"
                            checked={categoryFilterMode === 'ALL'}
                            onChange={() => {
                                handleChange('categoryFilterMode', 'ALL');
                                handleChange('collectionIds', []);
                            }}
                            className="text-blue-600"
                        />
                        <span>Tous les rayons (Catalogue complet)</span>
                    </label>

                    <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-slate-800">
                        <input
                            type="radio"
                            name="categoryFilterMode"
                            value="SPECIFIC"
                            checked={categoryFilterMode === 'SPECIFIC'}
                            onChange={() => handleChange('categoryFilterMode', 'SPECIFIC')}
                            className="text-blue-600"
                        />
                        <span>Filtrer par rayons spécifiques</span>
                    </label>
                </div>

                {categoryFilterMode === 'SPECIFIC' && (
                    <div className="space-y-2 pt-2 border-t">
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={categorySearch}
                                onChange={(e) => setCategorySearch(e.target.value)}
                                placeholder="🔍 Rechercher un rayon (ex: Épicerie, Mode, Boissons...)"
                                className="w-full p-2 border rounded-md text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-400 focus:outline-none"
                            />
                            {selectedCollectionIds.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => handleChange('collectionIds', [])}
                                    className="px-2 py-1.5 text-[11px] text-red-600 hover:bg-red-50 rounded border border-red-200 whitespace-nowrap font-medium"
                                >
                                    Tout effacer
                                </button>
                            )}
                        </div>

                        {/* Selected tags */}
                        {selectedCollectionIds.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 p-2 bg-emerald-50/60 border border-emerald-200 rounded-md">
                                {selectedCollectionIds.map(id => {
                                    const col = collections.find(c => String(c.id) === String(id));
                                    return (
                                        <span 
                                            key={id} 
                                            className="inline-flex items-center gap-1.5 px-2 py-1 bg-white border border-emerald-300 text-emerald-800 rounded text-[11px] font-semibold shadow-xs"
                                        >
                                            <span>✓ {col?.name || `Rayon #${id}`}</span>
                                            <button 
                                                type="button" 
                                                onClick={() => toggleCollectionId(id)} 
                                                className="text-red-500 hover:text-red-700 font-bold ml-1 text-xs"
                                            >
                                                ✕
                                            </button>
                                        </span>
                                    );
                                })}
                            </div>
                        )}

                        {/* List of categories */}
                        <div className="max-h-48 overflow-y-auto border rounded-md p-2 bg-slate-50 space-y-1">
                            {filteredCollections.length === 0 ? (
                                <p className="text-slate-400 text-center py-3 italic">Aucune catégorie trouvée</p>
                            ) : (
                                filteredCollections.map(col => {
                                    const isChecked = selectedCollectionIds.includes(String(col.id));
                                    return (
                                        <label 
                                            key={col.id} 
                                            className={`flex items-center gap-2 p-1.5 rounded cursor-pointer transition text-xs ${
                                                isChecked ? 'bg-emerald-100 font-bold text-emerald-900' : 'hover:bg-slate-200/70 text-slate-700'
                                            }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={() => toggleCollectionId(col.id)}
                                                className="rounded text-emerald-600 focus:ring-emerald-500"
                                            />
                                            <span className="flex-1">{col.name}</span>
                                            <span className="text-[10px] text-slate-400 font-mono">/{col.slug}</span>
                                        </label>
                                    );
                                })
                            )}
                        </div>
                    </div>
                )}

                {/* Additional criteria for Catalog mode */}
                {strategy === 'CATALOG' && (
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                        <div>
                            <label className="block font-semibold mb-1 text-slate-800">Ordre de Tri</label>
                            <select
                                value={config.filterType || 'LATEST'}
                                onChange={(e) => handleChange('filterType', e.target.value)}
                                className="w-full p-1.5 border rounded text-xs bg-white"
                            >
                                <option value="LATEST">Dernières Nouveautés</option>
                                <option value="BEST_SELLERS">Meilleures Ventes</option>
                                <option value="FEATURED">Produits en Vedette</option>
                            </select>
                        </div>
                        <div className="flex items-center pt-4">
                            <label className="flex items-center gap-2 font-semibold text-slate-800 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={config.enableTabs || false}
                                    onChange={(e) => handleChange('enableTabs', e.target.checked)}
                                    className="rounded text-blue-600"
                                />
                                Onglets séparés par catégorie
                            </label>
                        </div>
                    </div>
                )}
            </div>

            {/* REGLAGES VENTES FLASH (SI ACTIF) */}
            {strategy === 'FLASH_SALE' && (
                <div className="p-3 border rounded-lg bg-amber-50 border-amber-300 space-y-3">
                    <h4 className="font-bold text-amber-950 flex items-center gap-1.5 border-b border-amber-200 pb-1.5 uppercase text-[11px] tracking-wide">
                        <span>⚡</span> Réglages Ventes Flash & Compte à Rebours
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="block font-semibold mb-1 text-slate-800">Date/Heure de Fin du Chrono</label>
                            <input
                                type="datetime-local"
                                value={config.countdownEnd || ''}
                                onChange={(e) => handleChange('countdownEnd', e.target.value)}
                                className="w-full p-1.5 border rounded text-xs bg-white"
                            />
                        </div>
                        <div>
                            <label className="block font-semibold mb-1 text-slate-800">Titre de la Campagne Flash</label>
                            <input
                                type="text"
                                value={config.flashCampaignTitle || ''}
                                onChange={(e) => handleChange('flashCampaignTitle', e.target.value)}
                                className="w-full p-1.5 border rounded text-xs bg-white"
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* 4. TITRE, TEXTES & EN-TÊTE */}
            <div className="p-3 border rounded-lg bg-white shadow-sm space-y-3">
                <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wide border-b pb-1.5">
                    ✍️ 4. Titre & Textes d'En-tête
                </h4>
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className="block font-semibold mb-1">Titre Principal</label>
                        <input
                            type="text"
                            value={config.title || ''}
                            onChange={(e) => handleChange('title', e.target.value)}
                            placeholder="ex: Les pépites de votre quartier"
                            className="w-full p-1.5 border rounded text-xs"
                        />
                    </div>
                    <div>
                        <label className="block font-semibold mb-1">Texte du Badge</label>
                        <input
                            type="text"
                            value={config.badgeText || ''}
                            onChange={(e) => handleChange('badgeText', e.target.value)}
                            placeholder="ex: Proximité Express"
                            className="w-full p-1.5 border rounded text-xs"
                        />
                    </div>
                </div>

                <div>
                    <label className="block font-semibold mb-1">Sous-titre explicatif</label>
                    <input
                        type="text"
                        value={config.subtitle || ''}
                        onChange={(e) => handleChange('subtitle', e.target.value)}
                        placeholder="ex: Commandez auprès des vendeurs les plus proches de chez vous"
                        className="w-full p-1.5 border rounded text-xs"
                    />
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className="block font-semibold mb-1">Alignement</label>
                        <select
                            value={config.textAlign || 'left'}
                            onChange={(e) => handleChange('textAlign', e.target.value)}
                            className="w-full p-1.5 border rounded text-xs bg-white"
                        >
                            <option value="left">Gauche</option>
                            <option value="center">Centré</option>
                            <option value="right">Droite</option>
                        </select>
                    </div>
                    <div>
                        <label className="block font-semibold mb-1">Style d'En-tête</label>
                        <select
                            value={config.headerStyle || 'smart_cart'}
                            onChange={(e) => handleChange('headerStyle', e.target.value)}
                            className="w-full p-1.5 border rounded text-xs bg-white"
                        >
                            <option value="smart_cart">Smart Cart (Badge au-dessus + Ligne moderne)</option>
                            <option value="standard">Standard (Texte simple épuré)</option>
                            <option value="bordered">Encadré (Carte avec bordure)</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 border-t">
                    <ColorField label="Couleur Titre" value={config.titleColor} onChange={(v) => handleChange('titleColor', v)} />
                    <ColorField label="Couleur Sous-Titre" value={config.subtitleColor} onChange={(v) => handleChange('subtitleColor', v)} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <ColorField label="Fond du Badge" value={config.badgeBgColor} onChange={(v) => handleChange('badgeBgColor', v)} />
                    <ColorField label="Texte du Badge" value={config.badgeTextColor} onChange={(v) => handleChange('badgeTextColor', v)} />
                </div>
            </div>

            {/* 5. DISPOSITION & THEME VISUEL */}
            <div className="p-3 border rounded-lg bg-white shadow-sm space-y-3">
                <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wide border-b pb-1.5">
                    📐 5. Disposition & Thème de Carte
                </h4>
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className="block font-semibold mb-1">Format de Rendu</label>
                        <select
                            value={config.layout || 'carousel'}
                            onChange={(e) => handleChange('layout', e.target.value)}
                            className="w-full p-1.5 border rounded text-xs bg-white"
                        >
                            <option value="carousel">Carrousel Horizontal Défilant</option>
                            <option value="grid-4">Grille 4 Colonnes</option>
                            <option value="grid-3">Grille Large 3 Colonnes</option>
                            <option value="compact">Mini-Cartes (6 Colonnes)</option>
                            <option value="list-split">Liste Horizontale Divisée</option>
                        </select>
                    </div>
                    <div>
                        <label className="block font-semibold mb-1">Thème Visuel de Carte</label>
                        <select
                            value={config.cardTheme || 'default'}
                            onChange={(e) => handleChange('cardTheme', e.target.value)}
                            className="w-full p-1.5 border rounded text-xs bg-white"
                        >
                            <option value="default">Standard Modern (Ombré doux)</option>
                            <option value="flat">Minimaliste Plat (Flat Design)</option>
                            <option value="glassmorphism">Glassmorphism (Verre Dépoli)</option>
                            <option value="neon">Néon Premium (Glow Rouge/Noir)</option>
                            <option value="bold-border">Bordure Épaisse Moderne</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className="block font-semibold mb-1">Nombre Max de Produits</label>
                        <input
                            type="number"
                            value={config.limit || 8}
                            onChange={(e) => handleChange('limit', parseInt(e.target.value, 10))}
                            min={1}
                            max={50}
                            className="w-full p-1.5 border rounded text-xs"
                        />
                    </div>
                    <div>
                        <label className="block font-semibold mb-1">Max Produits par Marchand</label>
                        <input
                            type="number"
                            value={config.maxItemsPerVendor || 3}
                            onChange={(e) => handleChange('maxItemsPerVendor', parseInt(e.target.value, 10))}
                            min={1}
                            max={10}
                            className="w-full p-1.5 border rounded text-xs"
                        />
                    </div>
                </div>
            </div>

            {/* 6. BADGES DES 4 COINS DE CARTE */}
            <div className="p-3 border rounded-lg bg-white shadow-sm space-y-3">
                <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wide border-b pb-1.5">
                    🏷️ 6. Badges des 4 Coins de la Carte Produit
                </h4>
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className="block font-semibold mb-1 text-slate-700">Haut Gauche ↖️</label>
                        <select
                            value={config.topLeftBadge || 'vendor_name'}
                            onChange={(e) => handleChange('topLeftBadge', e.target.value)}
                            className="w-full p-1.5 border rounded text-xs bg-white"
                        >
                            <option value="none">Aucun</option>
                            <option value="vendor_name">Nom du Vendeur</option>
                            <option value="market_badge">Badge Marché (ex: Dantokpa)</option>
                            <option value="promo_percent">Pourcentage Réduction</option>
                        </select>
                    </div>
                    <div>
                        <label className="block font-semibold mb-1 text-slate-700">Haut Droite ↗️</label>
                        <select
                            value={config.topRightBadge || 'like_button'}
                            onChange={(e) => handleChange('topRightBadge', e.target.value)}
                            className="w-full p-1.5 border rounded text-xs bg-white"
                        >
                            <option value="none">Aucun</option>
                            <option value="like_button">Bouton Favoris (Coeur)</option>
                            <option value="location_distance">Distance GPS / Zone</option>
                            <option value="market_icon">Icône Marché</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className="block font-semibold mb-1 text-slate-700">Bas Gauche ↙️</label>
                        <select
                            value={config.bottomLeftBadge || 'stock_status'}
                            onChange={(e) => handleChange('bottomLeftBadge', e.target.value)}
                            className="w-full p-1.5 border rounded text-xs bg-white"
                        >
                            <option value="none">Aucun</option>
                            <option value="stock_status">Statut Stock (En stock / Rupture)</option>
                            <option value="market_name_short">Nom court du marché</option>
                            <option value="delivery_time">Temps estimé de livraison</option>
                        </select>
                    </div>
                    <div>
                        <label className="block font-semibold mb-1 text-slate-700">Bas Droite ↘️</label>
                        <select
                            value={config.bottomRightBadge || 'cart_button'}
                            onChange={(e) => handleChange('bottomRightBadge', e.target.value)}
                            className="w-full p-1.5 border rounded text-xs bg-white"
                        >
                            <option value="none">Aucun</option>
                            <option value="cart_button">Bouton Ajouter au Panier</option>
                            <option value="market_badge">Badge Marché</option>
                        </select>
                    </div>
                </div>
            </div>
        </div>
    );
};
