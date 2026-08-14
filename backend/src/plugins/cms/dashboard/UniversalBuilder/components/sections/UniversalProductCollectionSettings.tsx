import React, { useState, useEffect } from 'react';
import { useAutoSave } from '../useAutoSave';
import { fetchGraphQL } from '../../../lib/utils';

interface UniversalProductCollectionSettingsProps {
    data: any;
    onSave: (newData: any) => void;
}

const FETCH_COLLECTIONS = `query { cmsCollectionsTree { id name slug children { id name slug } } }`;

export const UniversalProductCollectionSettings = ({ data, onSave }: UniversalProductCollectionSettingsProps) => {
    const [config, setConfig] = useState<any>({});
    const [collections, setCollections] = useState<any[]>([]);

    useEffect(() => {
        const defaults = {
            title: 'Sélection pour vous',
            subtitle: 'Découvrez nos offres recommandées',
            badgeText: 'Recommandation EMS',
            experienceStrategy: 'CATALOG',
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
            mixCollectionId: '',
            filterType: 'LATEST',
            enableTabs: false,
            // Local Discovery specific defaults
            requireConfirmedLocation: true,
            mixMode: 'none',
            radiusKm: 10,
            // Personalization specific defaults
            maxItemsPerVendor: 3,
            boostCertifiedVendors: true,
            // Badges 4 coins
            topLeftBadge: 'vendor_name',
            topRightBadge: 'like_button',
            bottomLeftBadge: 'stock_status',
            bottomRightBadge: 'cart_button',
        };
        setConfig({ ...defaults, ...data });
    }, [data]);

    useAutoSave(config, onSave);

    // Fetch collections list for CATALOG strategy selector
    useEffect(() => {
        fetchGraphQL(FETCH_COLLECTIONS)
            .then((res: any) => {
                const tree = res?.cmsCollectionsTree || [];
                const flat: any[] = [];
                const flatten = (nodes: any[]) => {
                    for (const node of nodes) {
                        flat.push({ id: node.id, name: node.name, slug: node.slug });
                        if (node.children && node.children.length > 0) {
                            flatten(node.children);
                        }
                    }
                };
                flatten(tree);
                setCollections(flat);
            })
            .catch(err => console.error('[UniversalProductCollectionSettings] Failed to fetch collections:', err));
    }, []);

    const handleChange = (field: string, value: any) => {
        const updated = { ...config, [field]: value };
        setConfig(updated);
        onSave(updated);
    };

    const ColorField = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
        <div>
            <label className="label-pro mb-1 block font-semibold">{label}</label>
            <div className="flex items-center gap-2">
                <input type="color" className="w-8 h-8 rounded border p-0 cursor-pointer" value={value || '#000000'} onChange={(e) => onChange(e.target.value)} />
                <input type="text" className="w-full p-1.5 border rounded text-xs" value={value || ''} onChange={(e) => onChange(e.target.value)} />
            </div>
        </div>
    );

    const strategy = config.experienceStrategy || 'CATALOG';

    return (
        <div className="space-y-4 p-4 text-xs max-h-[75vh] overflow-y-auto">
            <h3 className="font-bold text-sm text-slate-800 border-b pb-2 flex items-center gap-2">
                <span>🎯</span> Collection de Produits EMS (Unifiée & Contexte Réactif)
            </h3>

            {/* 1. SELECTION DE LA STRATÉGIE EMS */}
            <div className="p-3 border rounded bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 space-y-2">
                <label className="block font-bold text-blue-900 text-sm">🧠 Stratégie d'Expérience Metier (Moteur EMS)</label>
                <select
                    value={strategy}
                    onChange={(e) => handleChange('experienceStrategy', e.target.value)}
                    className="w-full p-2.5 border rounded text-xs bg-white font-bold text-slate-800 shadow-sm"
                >
                    <option value="CATALOG">📦 Catalog Standard (Collection / Filtres de catégories)</option>
                    <option value="LOCAL_DISCOVERY">📍 Local Discovery (Produits à proximité GeoEngine)</option>
                    <option value="FLASH_SALE">⚡ Flash Sale (Ventes Flash avec Chrono)</option>
                    <option value="HOME_FEED">🚀 Home Feed (Flux Intelligent par Affinité Client)</option>
                    <option value="TRENDING">🔥 Trending (Tendances & Meilleures Ventes de la ville)</option>
                </select>
                <p className="text-[11px] text-blue-700 italic">
                    {strategy === 'FLASH_SALE' && "⚡ Mode Ventes Flash : Affiche les offres temporaires avec compte à rebours chrono et badge promo."}
                    {strategy === 'CATALOG' && "📦 Mode Catalogue : Affiche les produits d'une collection ou catégorie spécifique avec filtres."}
                    {strategy === 'LOCAL_DISCOVERY' && "📍 Mode Proximité : Sélectionne uniquement les produits des marchands de la zone/ville active du client."}
                    {strategy === 'HOME_FEED' && "🚀 Mode Flux Personnalisé : Recommande dynamiquement les produits selon les affinités du client."}
                    {strategy === 'TRENDING' && "🔥 Mode Tendances : Classe les meilleures ventes et produits populaires calculés par le Ranking Engine."}
                </p>
            </div>

            {/* 1.5. MODE DE SELECTION DU CONTENU (Mode 1 / Mode 2 / Mode 3) */}
            <div className="p-3 border rounded bg-slate-100 border-slate-300 space-y-4">
                <h4 className="font-bold text-slate-800 flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
                    <span>🎛️</span> Méthode de Sélection du Contenu (EMS)
                </h4>
                <div>
                    <label className="block font-semibold mb-1 text-slate-800">Source / Mode de Sélection</label>
                    <select
                        value={config.selectionMode || 'COLLECTIONS'}
                        onChange={(e) => handleChange('selectionMode', e.target.value)}
                        className="w-full p-2 border rounded text-xs bg-white font-semibold text-slate-800"
                    >
                        <option value="COLLECTIONS">📂 Mode 1 : Collections (Sélection de catégories)</option>
                        <option value="PRODUCTS">📌 Mode 2 : Sélection de produits (Manuelle + Moteur EMS)</option>
                        <option value="HYBRID">🔀 Mode 3 : Mode Hybride (Collections + Produits spécifiques)</option>
                        <option value="AUTOMATIC">🤖 Mode 4 : Laisser au moteur (Automatique & Intelligent)</option>
                    </select>
                </div>

                {/* MODE 1 : COLLECTIONS */}
                {(config.selectionMode === 'COLLECTIONS' || !config.selectionMode) && (
                    <div className="space-y-3 bg-white p-2.5 rounded-lg border border-slate-200">
                        {/* Step 1: Search & Pick Collections */}
                        <div>
                            <label className="block font-semibold mb-1 text-slate-700">1. Rechercher et ajouter des collections</label>
                            <CollectionSelector
                                selectedIds={config.collectionIds || []}
                                onSelectionChange={(ids) => handleChange('collectionIds', ids)}
                            />
                        </div>

                        {/* Step 2: Select Target Collection from the picked ones */}
                        {config.collectionIds && config.collectionIds.length > 0 && (
                            <div>
                                <label className="block font-semibold mb-1 text-slate-700">2. Sélectionner la collection active</label>
                                <select
                                    value={config.mixCollectionId || ''}
                                    onChange={(e) => handleChange('mixCollectionId', e.target.value)}
                                    className="w-full p-2 border rounded text-xs bg-white font-medium"
                                >
                                    <option value="">-- Choisir une collection --</option>
                                    {collections
                                        .filter(c => config.collectionIds.includes(String(c.id)))
                                        .map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))
                                    }
                                </select>
                            </div>
                        )}

                        {/* Step 3: Choose Display Type */}
                        {config.mixCollectionId && (
                            <div>
                                <label className="block font-semibold mb-1 text-slate-700">3. Rendu de la Collection</label>
                                <select
                                    value={config.collectionDisplayType || 'ALL'}
                                    onChange={(e) => handleChange('collectionDisplayType', e.target.value)}
                                    className="w-full p-2 border rounded text-xs bg-white font-medium"
                                >
                                    <option value="ALL">Afficher tous les produits de la collection</option>
                                    <option value="PRODUCTS">Sélectionner uniquement certains produits</option>
                                </select>
                            </div>
                        )}

                        {/* Step 4: Search Products of this collection */}
                        {config.mixCollectionId && config.collectionDisplayType === 'PRODUCTS' && (
                            <div>
                                <label className="block font-semibold mb-1 text-slate-700">4. Sélectionner les produits de la collection</label>
                                <ProductSearchModal
                                    selectedIds={config.manualProductIds || []}
                                    onSelectionChange={(ids) => handleChange('manualProductIds', ids)}
                                    collectionId={config.mixCollectionId}
                                />
                            </div>
                        )}
                    </div>
                )}

                {/* MODE 2 : SELECTION DE PRODUITS */}
                {config.selectionMode === 'PRODUCTS' && (
                    <div className="space-y-3 bg-white p-2.5 rounded-lg border border-slate-200">
                        <ProductSearchModal
                            selectedIds={config.manualProductIds || []}
                            onSelectionChange={(ids) => handleChange('manualProductIds', ids)}
                        />
                    </div>
                )}

                {/* MODE 3 : HYBRIDE */}
                {config.selectionMode === 'HYBRID' && (
                    <div className="space-y-3 bg-white p-2.5 rounded-lg border border-slate-200">
                        <div>
                            <label className="block font-semibold mb-1 text-slate-700">Collections cibles</label>
                            <CollectionSelector
                                selectedIds={config.collectionIds || []}
                                onSelectionChange={(ids) => handleChange('collectionIds', ids)}
                            />
                        </div>
                        <div>
                            <label className="block font-semibold mb-1 text-slate-700">Produits spécifiques à inclure</label>
                            <ProductSearchModal
                                selectedIds={config.manualProductIds || []}
                                onSelectionChange={(ids) => handleChange('manualProductIds', ids)}
                            />
                        </div>
                    </div>
                )}

                {strategy === 'CATALOG' && (
                    <div className="border-t border-slate-200 pt-3 mt-1 grid grid-cols-2 gap-2">
                        <div>
                            <label className="block font-semibold mb-1 text-slate-800">Ordre de Filtrage des Produits</label>
                            <select
                                value={config.filterType || 'LATEST'}
                                onChange={(e) => handleChange('filterType', e.target.value)}
                                className="w-full p-1.5 border rounded text-xs bg-white"
                            >
                                <option value="LATEST">Dernières Nouveautés</option>
                                <option value="BEST_SELLERS">Meilleures Ventes</option>
                                <option value="COLLECTION">Ordre Personnalisé de la Collection</option>
                                <option value="FEATURED">Produits en Vedette</option>
                            </select>
                        </div>
                        <div className="flex items-center pt-4">
                            <label className="flex items-center gap-2 font-semibold text-slate-800 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={config.enableTabs || false}
                                    onChange={(e) => handleChange('enableTabs', e.target.checked)}
                                />
                                Activer le découpage en Onglets de Catégories
                            </label>
                        </div>
                    </div>
                )}
            </div>

            {/* 2. PANNEAU DE CONFIGURATION DYNAMIQUE SELON LA STRATÉGIE SELECTIONNÉE */}
            {strategy === 'FLASH_SALE' && (
                <div className="p-3 border rounded bg-amber-50 border-amber-300 space-y-3">
                    <h4 className="font-bold text-amber-900 flex items-center gap-1.5 border-b border-amber-200 pb-1.5">
                        <span>⚡</span> Réglages Spécifiques Ventes Flash & Compte à Rebours
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="block font-semibold mb-1 text-slate-800">Date et Heure de Fin du Chrono</label>
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
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="block font-semibold mb-1 text-slate-800">Style du Badge Chrono</label>
                            <select
                                value={config.flashBadgeStyle || 'neon_timer'}
                                onChange={(e) => handleChange('flashBadgeStyle', e.target.value)}
                                className="w-full p-1.5 border rounded text-xs bg-white"
                            >
                                <option value="neon_timer">Néon Rouge Lumineux (Compte à Rebours)</option>
                                <option value="standard">Standard Chrono Minimaliste</option>
                                <option value="pill_gold">Pilule Dorée Premium</option>
                            </select>
                        </div>
                        <div className="flex items-center pt-4">
                            <label className="flex items-center gap-2 font-semibold text-slate-800 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={config.autoHideExpired !== false}
                                    onChange={(e) => handleChange('autoHideExpired', e.target.checked)}
                                />
                                Masquer la section à la fin du chrono
                            </label>
                        </div>
                    </div>
                </div>
            )}



            {strategy === 'LOCAL_DISCOVERY' && (
                <div className="p-3 border rounded bg-sky-50 border-sky-300 space-y-3">
                    <h4 className="font-bold text-sky-900 flex items-center gap-1.5 border-b border-sky-200 pb-1.5">
                        <span>📍</span> Réglages Spécifiques Proximité GeoEngine & Marchés
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="block font-semibold mb-1 text-slate-800">Rayon de Recherche GPS (km)</label>
                            <input
                                type="number"
                                value={config.radiusKm || 10}
                                onChange={(e) => handleChange('radiusKm', parseInt(e.target.value))}
                                min={1}
                                max={100}
                                className="w-full p-1.5 border rounded text-xs bg-white"
                            />
                        </div>
                        <div>
                            <label className="block font-semibold mb-1 text-slate-800">Mode de Comblement (Si zone vide)</label>
                            <select
                                value={config.mixMode || 'none'}
                                onChange={(e) => handleChange('mixMode', e.target.value)}
                                className="w-full p-1.5 border rounded text-xs bg-white"
                            >
                                <option value="none">Strict (Uniquement les vendeurs de la zone)</option>
                                <option value="hybrid">Hybride (Combler avec le reste du catalogue)</option>
                                <option value="fallback">Repli (Afficher catalogue global si zone vide)</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex items-center pt-2">
                        <label className="flex items-center gap-2 font-semibold text-slate-800 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={config.requireConfirmedLocation !== false}
                                onChange={(e) => handleChange('requireConfirmedLocation', e.target.checked)}
                            />
                            Masquer la section si le client n'a pas confirmé sa zone/ville
                        </label>
                    </div>
                </div>
            )}

            {(strategy === 'HOME_FEED' || strategy === 'TRENDING') && (
                <div className="p-3 border rounded bg-purple-50 border-purple-300 space-y-3">
                    <h4 className="font-bold text-purple-900 flex items-center gap-1.5 border-b border-purple-200 pb-1.5">
                        <span>🚀</span> Réglages Spécifiques Feed Personnalisé & Ranking Engine
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="block font-semibold mb-1 text-slate-800">Quota Max de Produits par Marchand</label>
                            <input
                                type="number"
                                value={config.maxItemsPerVendor || 3}
                                onChange={(e) => handleChange('maxItemsPerVendor', parseInt(e.target.value))}
                                min={1}
                                max={10}
                                className="w-full p-1.5 border rounded text-xs bg-white"
                            />
                        </div>
                        <div className="flex items-center pt-4">
                            <label className="flex items-center gap-2 font-semibold text-slate-800 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={config.boostCertifiedVendors !== false}
                                    onChange={(e) => handleChange('boostCertifiedVendors', e.target.checked)}
                                />
                                Booster la visibilité des Vendeurs Certifiés (Dantokpa/Ganhi)
                            </label>
                        </div>
                    </div>
                </div>
            )}

            {/* 3. TITRE ET EN-TÊTE (COMMUNS A TOUTES LES STRATÉGIES) */}
            <div className="p-3 border rounded bg-white space-y-3">
                <h4 className="font-bold text-slate-700">✍️ Titre & Textes d'En-tête</h4>
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className="block font-semibold mb-1">Titre de la section</label>
                        <input
                            type="text"
                            value={config.title || ''}
                            onChange={(e) => handleChange('title', e.target.value)}
                            className="w-full p-1.5 border rounded text-xs"
                        />
                    </div>
                    <div>
                        <label className="block font-semibold mb-1">Texte du badge</label>
                        <input
                            type="text"
                            value={config.badgeText || ''}
                            onChange={(e) => handleChange('badgeText', e.target.value)}
                            className="w-full p-1.5 border rounded text-xs"
                        />
                    </div>
                </div>

                <div>
                    <label className="block font-semibold mb-1">Sous-titre explicatif</label>
                    <textarea
                        value={config.subtitle || ''}
                        onChange={(e) => handleChange('subtitle', e.target.value)}
                        rows={2}
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
                            <option value="standard">Standard (Texte simple)</option>
                            <option value="bordered">Encadré (Carte avec bordure)</option>
                            <option value="smart_cart">Smart Cart (Badge au-dessus + Ligne séparatrice)</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                    <ColorField label="Couleur Titre" value={config.titleColor} onChange={(v) => handleChange('titleColor', v)} />
                    <ColorField label="Couleur Sous-Titre" value={config.subtitleColor} onChange={(v) => handleChange('subtitleColor', v)} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <ColorField label="Fond du Badge" value={config.badgeBgColor} onChange={(v) => handleChange('badgeBgColor', v)} />
                    <ColorField label="Texte du Badge" value={config.badgeTextColor} onChange={(v) => handleChange('badgeTextColor', v)} />
                </div>
            </div>

            {/* 4. DISPOSITION ET THÈME VISUEL */}
            <div className="p-3 border rounded bg-white space-y-3">
                <h4 className="font-bold text-slate-700">📐 Disposition & Thème de Carte</h4>
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className="block font-semibold mb-1">Format de Rendu</label>
                        <select
                            value={config.layout || 'carousel'}
                            onChange={(e) => handleChange('layout', e.target.value)}
                            className="w-full p-1.5 border rounded text-xs bg-white"
                        >
                            <option value="carousel">Carrousel Défilant Horizontal</option>
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
                            <option value="default">Standard Modern</option>
                            <option value="flat">Minimaliste Plat (Flat Design)</option>
                            <option value="glassmorphism">Glassmorphism (Verre Dépoli)</option>
                            <option value="neon">Néon Premium (Glow Rouge/Noir)</option>
                            <option value="bold-border">Rétro Bordure Épaisse</option>
                            <option value="gradient-bg">Dégradé de Fond</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className="block font-semibold mb-1">Nombre Max de Produits</label>
                        <input
                            type="number"
                            value={config.limit || 8}
                            onChange={(e) => handleChange('limit', parseInt(e.target.value))}
                            min={1}
                            max={50}
                            className="w-full p-1.5 border rounded text-xs"
                        />
                    </div>
                </div>
            </div>

            {/* 5. BADGES DES 4 COINS DE LA CARTE */}
            <div className="p-3 border rounded bg-white space-y-3">
                <h4 className="font-bold text-slate-700">🏷️ Badges Personnalisés (4 Coins de Carte)</h4>
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className="block font-semibold mb-1">Haut Gauche ↖️</label>
                        <select
                            value={config.topLeftBadge || 'vendor_name'}
                            onChange={(e) => handleChange('topLeftBadge', e.target.value)}
                            className="w-full p-1.5 border rounded text-xs bg-white"
                        >
                            <option value="none">Aucun</option>
                            <option value="vendor_name">Nom du Vendeur</option>
                            <option value="market_badge">Badge Marché (Dantokpa/Ganhi)</option>
                            <option value="promo_percent">Pourcentage Réduction</option>
                        </select>
                    </div>
                    <div>
                        <label className="block font-semibold mb-1">Haut Droite ↗️</label>
                        <select
                            value={config.topRightBadge || 'like_button'}
                            onChange={(e) => handleChange('topRightBadge', e.target.value)}
                            className="w-full p-1.5 border rounded text-xs bg-white"
                        >
                            <option value="none">Aucun</option>
                            <option value="like_button">Bouton Favoris (J'aime)</option>
                            <option value="location_distance">Distance / Zone</option>
                            <option value="market_icon">Icône Marché</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className="block font-semibold mb-1">Bas Gauche ↙️</label>
                        <select
                            value={config.bottomLeftBadge || 'stock_status'}
                            onChange={(e) => handleChange('bottomLeftBadge', e.target.value)}
                            className="w-full p-1.5 border rounded text-xs bg-white"
                        >
                            <option value="none">Aucun</option>
                            <option value="stock_status">Statut Stock (Disponible/Rupture)</option>
                            <option value="market_name_short">Nom court du marché</option>
                            <option value="delivery_time">Temps de livraison estimé</option>
                        </select>
                    </div>
                    <div>
                        <label className="block font-semibold mb-1">Bas Droite ↘️</label>
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

// --- Product Search Modal helper ---
function ProductSearchModal({ selectedIds, onSelectionChange, collectionId }: { selectedIds: string[], onSelectionChange: (ids: string[]) => void, collectionId?: string }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const searchProducts = async (term: string) => {
        if (!term || term.length < 2) { setSearchResults([]); return; }
        setLoading(true);
        try {
            const origin = window.location.origin.includes(':5173') || window.location.origin.includes(':5174') || window.location.origin.includes(':4200')
                ? window.location.origin.replace(/:(5173|5174|4200)/, ':3000')
                : window.location.origin;
            const shopApiUrl = `${origin}/shop-api`;
            
            const input: any = { term, groupByProduct: true, take: 20 };
            if (collectionId) {
                input.collectionId = collectionId;
            }

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
                    variables: { input }
                })
            });
            const result = await res.json();
            let items = result.data?.search?.items || [];
            
            if (items.length === 0 && !collectionId) {
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
    }, [searchTerm, collectionId]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
            <div>
                <input 
                    style={{ width: '100%', padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.75rem' }} 
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)} 
                    placeholder="Rechercher des produits..." 
                />
            </div>
            {selectedIds.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {selectedIds.map((id: string) => (
                        <span key={id} style={{ padding: '2px 8px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '4px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                            ID: {id}
                            <button onClick={() => toggleProduct(id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontWeight: 'bold' }}>✕</button>
                        </span>
                    ))}
                </div>
            )}
            {searchResults.length > 0 && (
                <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '6px', background: '#fff' }}>
                    {searchResults.map((p: any) => {
                        const isSelected = selectedIds.includes(p.productId);
                        return (
                            <div key={p.productId} onClick={() => toggleProduct(p.productId)} style={{
                                padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
                                background: isSelected ? '#f1f5f9' : '#fff',
                                borderBottom: '1px solid #f1f5f9',
                                fontSize: '0.75rem'
                            }}>
                                {p.productAsset && <img src={p.productAsset.preview} alt="" style={{ width: '28px', height: '28px', objectFit: 'cover', borderRadius: '4px' }} />}
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 600 }}>{p.productName}</div>
                                </div>
                                {isSelected && <span style={{ color: '#2563eb', fontWeight: 'bold' }}>✓</span>}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// --- Collection Selector helper ---
function CollectionSelector({ selectedIds, onSelectionChange }: { selectedIds: string[], onSelectionChange: (ids: string[]) => void }) {
    const [collectionTree, setCollectionTree] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchGraphQL(`query { cmsCollectionsTree { id name slug children { id name slug } } }`)
            .then(data => setCollectionTree(data?.cmsCollectionsTree || []))
            .catch(err => console.error('Failed to fetch collections:', err));
    }, []);

    const toggleCollection = (id: string, children: any[] = []) => {
        let newIds = [...selectedIds];
        const isSelected = selectedIds.includes(id);

        if (isSelected) {
            const idsToRemove = [id, ...children.map(c => c.id)];
            newIds = newIds.filter((sid: string) => !idsToRemove.includes(sid));
        } else {
            const idsToAdd = [id, ...children.map(c => c.id)];
            idsToAdd.forEach(addId => {
                if (!newIds.includes(addId)) newIds.push(addId);
            });
        }
        onSelectionChange(newIds);
    };

    const flatCollections: any[] = [];
    const flatten = (nodes: any[]) => {
        for (const n of nodes) {
            flatCollections.push(n);
            if (n.children && n.children.length > 0) flatten(n.children);
        }
    };
    flatten(collectionTree);

    const filtered = flatCollections.filter(c => 
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        c.slug.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
            <input 
                style={{ width: '100%', padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.75rem' }} 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                placeholder="Rechercher des collections..." 
            />
            {selectedIds.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {selectedIds.map(id => {
                        const col = flatCollections.find(c => String(c.id) === String(id));
                        return (
                            <span key={id} style={{ padding: '2px 8px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '4px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                                {col?.name || `Collection #${id}`}
                                <button onClick={() => toggleCollection(id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontWeight: 'bold' }}>✕</button>
                            </span>
                        );
                    })}
                </div>
            )}
            {filtered.length > 0 && searchTerm.length > 0 && (
                <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '6px', background: '#fff' }}>
                    {filtered.map(c => {
                        const isSelected = selectedIds.includes(String(c.id));
                        return (
                            <div key={c.id} onClick={() => toggleCollection(String(c.id), c.children)} style={{
                                padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
                                background: isSelected ? '#f0fdf4' : '#fff',
                                borderBottom: '1px solid #f1f5f9',
                                fontSize: '0.75rem'
                            }}>
                                <div style={{ flex: 1 }}>{c.name} ({c.slug})</div>
                                {isSelected && <span style={{ color: '#16a34a', fontWeight: 'bold' }}>✓</span>}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
