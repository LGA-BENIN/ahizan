import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
    GET_COLLECTION_FACET_MAPPINGS,
    SET_COLLECTION_ALLOWED_FACETS,
    SET_COLLECTION_ALLOWED_FACETS_BULK,
    GET_ALL_FACETS,
    GET_SELLER_DASHBOARD_CONFIG,
    UPDATE_SELLER_DASHBOARD_CONFIG,
    GET_COLLECTION_OPTION_GROUP_MAPPINGS,
    SET_COLLECTION_ALLOWED_OPTION_GROUPS,
    SET_COLLECTION_ALLOWED_OPTION_GROUPS_BULK,
    GET_ALL_OPTION_GROUPS,
} from './queries';

async function fetchGraphQL(query: string, variables?: any) {
    const res = await fetch('/admin-api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ query, variables }),
    });
    const json = await res.json();
    if (json.errors?.length) {
        console.error('[CollectionFacetMapPage] GraphQL errors:', json.errors);
        throw new Error(json.errors[0].message);
    }
    return json.data;
}

export function CollectionFacetMapPage() {
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<'optionGroups' | 'facets'>('optionGroups');
    const [saving, setSaving] = useState<string | null>(null);
    const [togglingWallet, setTogglingWallet] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedCollections, setExpandedCollections] = useState<Set<string>>(new Set());
    const [bulkSaving, setBulkSaving] = useState(false);
    const [activeCollectionId, setActiveCollectionId] = useState<string | null>(null);

    const { data: configData } = useQuery({
        queryKey: ['sellerDashboardConfig'],
        queryFn: () => fetchGraphQL(GET_SELLER_DASHBOARD_CONFIG),
    });

    const walletEnabled = configData?.sellerDashboardConfig?.walletPageEnabled ?? true;

    const toggleWallet = async () => {
        setTogglingWallet(true);
        try {
            await fetchGraphQL(UPDATE_SELLER_DASHBOARD_CONFIG, { walletPageEnabled: !walletEnabled });
            queryClient.invalidateQueries({ queryKey: ['sellerDashboardConfig'] });
        } catch (err) {
            console.error('Error toggling wallet:', err);
        } finally {
            setTogglingWallet(false);
        }
    };

    // Facet mappings query
    const { data: mappingsData, isLoading: loadingMappings } = useQuery({
        queryKey: ['collectionFacetMappings'],
        queryFn: () => fetchGraphQL(GET_COLLECTION_FACET_MAPPINGS),
    });

    const { data: facetsData, isLoading: loadingFacets } = useQuery({
        queryKey: ['allFacets'],
        queryFn: () => fetchGraphQL(GET_ALL_FACETS),
    });

    // Option group mappings query
    const { data: optionMappingsData, isLoading: loadingOptionMappings } = useQuery({
        queryKey: ['collectionOptionGroupMappings'],
        queryFn: () => fetchGraphQL(GET_COLLECTION_OPTION_GROUP_MAPPINGS),
    });

    const { data: optionGroupsData, isLoading: loadingOptionGroups } = useQuery({
        queryKey: ['allOptionGroups'],
        queryFn: () => fetchGraphQL(GET_ALL_OPTION_GROUPS),
    });

    const mappings = mappingsData?.collectionFacetMappings || [];
    const allFacets = facetsData?.allMappingFacets || [];

    const optionMappings = optionMappingsData?.collectionOptionGroupMappings || [];
    const allOptionGroups = optionGroupsData?.allMappingOptionGroups || [];

    const loading = activeTab === 'facets' 
        ? (loadingMappings || loadingFacets) 
        : (loadingOptionMappings || loadingOptionGroups);


    // Helper functions
    const findMappingById = (tree: any[], id: string): any => {
        for (const node of tree) {
            if (node.collectionId === id) return node;
            if (node.children) {
                const found = findMappingById(node.children, id);
                if (found) return found;
            }
        }
        return null;
    };

    const flattenMappings = (tree: any[]): any[] => {
        const result: any[] = [];
        for (const node of tree) {
            result.push(node);
            if (node.children) {
                result.push(...flattenMappings(node.children));
            }
        }
        return result;
    };

    const sortTree = (tree: any[]): any[] => {
        return tree
            .map((node: any) => ({
                ...node,
                children: node.children ? sortTree(node.children) : [],
            }))
            .sort((a: any, b: any) => 
                a.collectionName.localeCompare(b.collectionName, 'fr', { sensitivity: 'base' })
            );
    };

    const filterTree = (tree: any[], term: string): any[] => {
        if (!term) return tree;
        const lowerTerm = term.toLowerCase();
        return tree
            .map((node: any) => ({
                ...node,
                children: filterTree(node.children || [], term),
            }))
            .filter((node: any) => {
                const matchesSelf = node.collectionName.toLowerCase().includes(lowerTerm);
                const hasMatchingChildren = node.children && node.children.length > 0;
                return matchesSelf || hasMatchingChildren;
            });
    };

    const toggleOptionGroup = async (collectionId: string, optionGroupId: string) => {
        const mapping = findMappingById(optionMappings, collectionId);
        if (!mapping) return;

        const ownIds: string[] = (mapping.ownOptionGroupIds || []).map((id: any) => String(id));
        const groupIdStr = String(optionGroupId);

        const newOwnIds = ownIds.includes(groupIdStr)
            ? ownIds.filter((id: string) => id !== groupIdStr)
            : [...ownIds, groupIdStr];

        setSaving(collectionId);
        try {
            await fetchGraphQL(SET_COLLECTION_ALLOWED_OPTION_GROUPS, { collectionId, optionGroupIds: newOwnIds });
            queryClient.invalidateQueries({ queryKey: ['collectionOptionGroupMappings'] });
        } catch (err) {
            console.error('Error saving option group mapping:', err);
        } finally {
            setSaving(null);
        }
    };

    const toggleFacet = async (collectionId: string, facetId: string) => {
        const mapping = findMappingById(mappings, collectionId);
        if (!mapping) return;

        const ownIds: string[] = (mapping.ownFacetIds || []).map((id: any) => String(id));
        const facetIdStr = String(facetId);

        const newOwnIds = ownIds.includes(facetIdStr)
            ? ownIds.filter((id: string) => id !== facetIdStr)
            : [...ownIds, facetIdStr];

        setSaving(collectionId);
        try {
            await fetchGraphQL(SET_COLLECTION_ALLOWED_FACETS, { collectionId, facetIds: newOwnIds });
            queryClient.invalidateQueries({ queryKey: ['collectionFacetMappings'] });
        } catch (err) {
            console.error('Error saving facet mapping:', err);
        } finally {
            setSaving(null);
        }
    };

    const toggleExpand = (collectionId: string) => {
        setExpandedCollections(prev => {
            const newSet = new Set(prev);
            if (newSet.has(collectionId)) {
                newSet.delete(collectionId);
            } else {
                newSet.add(collectionId);
            }
            return newSet;
        });
    };

    const getAllDescendantIds = (mapping: any): string[] => {
        const ids: string[] = [mapping.collectionId];
        if (mapping.children && mapping.children.length > 0) {
            for (const child of mapping.children) {
                ids.push(...getAllDescendantIds(child));
            }
        }
        return ids;
    };

    const applyToSubcollections = async (collectionId: string, itemIds: string[]) => {
        const currentMappings = activeTab === 'optionGroups' ? optionMappings : mappings;
        const mapping = findMappingById(currentMappings, collectionId);
        if (!mapping) return;

        const descendantIds = getAllDescendantIds(mapping);
        setBulkSaving(true);
        try {
            if (activeTab === 'optionGroups') {
                await fetchGraphQL(SET_COLLECTION_ALLOWED_OPTION_GROUPS_BULK, { collectionIds: descendantIds, optionGroupIds: itemIds });
                queryClient.invalidateQueries({ queryKey: ['collectionOptionGroupMappings'] });
            } else {
                await fetchGraphQL(SET_COLLECTION_ALLOWED_FACETS_BULK, { collectionIds: descendantIds, facetIds: itemIds });
                queryClient.invalidateQueries({ queryKey: ['collectionFacetMappings'] });
            }
        } catch (err) {
            console.error('Error saving bulk:', err);
        } finally {
            setBulkSaving(false);
        }
    };

    const currentMappings = activeTab === 'optionGroups' ? optionMappings : mappings;
    const sortedMappings = sortTree(currentMappings);
    const filteredMappings = filterTree(sortedMappings, searchTerm);
    const flatFilteredMappings = flattenMappings(filteredMappings);

    if (loading) {
        return (
            <div style={{ padding: 32, textAlign: 'center', color: '#888' }}>
                Chargement...
            </div>
        );
    }

    return (
        <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <div>
                    <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: '#0f172a' }}>
                        Configuration du Catalogue par Collection
                    </h1>
                    <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0 0' }}>
                        Définissez avec précision les <strong>Groupes d'Options (Déclinaisons)</strong> et les <strong>Facettes</strong> autorisées pour chaque rayon.
                    </p>
                </div>
            </div>

            {/* TAB SELECTOR */}
            <div style={{ display: 'flex', gap: 10, margin: '20px 0', borderBottom: '1px solid #e2e8f0', paddingBottom: 12 }}>
                <button
                    onClick={() => { setActiveTab('optionGroups'); setActiveCollectionId(null); }}
                    style={{
                        padding: '10px 18px',
                        borderRadius: 10,
                        border: 'none',
                        background: activeTab === 'optionGroups' ? '#4f46e5' : '#f1f5f9',
                        color: activeTab === 'optionGroups' ? '#ffffff' : '#475569',
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        transition: 'all 0.2s',
                    }}
                >
                    <span>🔀</span>
                    <span>Groupes d'Options (Déclinaisons Vendeur)</span>
                </button>
                <button
                    onClick={() => { setActiveTab('facets'); setActiveCollectionId(null); }}
                    style={{
                        padding: '10px 18px',
                        borderRadius: 10,
                        border: 'none',
                        background: activeTab === 'facets' ? '#4f46e5' : '#f1f5f9',
                        color: activeTab === 'facets' ? '#ffffff' : '#475569',
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        transition: 'all 0.2s',
                    }}
                >
                    <span>🎛️</span>
                    <span>Facettes de Filtrage (Filtres Storefront)</span>
                </button>
            </div>

            {/* Banner Guide */}
            <div style={{
                background: activeTab === 'optionGroups' ? '#eef2ff' : '#f0fdf4',
                border: activeTab === 'optionGroups' ? '1px solid #c7d2fe' : '1px solid #bbf7d0',
                borderRadius: 12,
                padding: '12px 16px',
                marginBottom: 20,
                fontSize: 12,
                color: activeTab === 'optionGroups' ? '#3730a3' : '#166534',
                lineHeight: 1.5,
            }}>
                {activeTab === 'optionGroups' ? (
                    <span>
                        💡 <strong>Guide Déclinaisons :</strong> Cochez ici les caractéristiques autorisées pour les vendeurs dans ce rayon (ex: <em>Couleur & Stockage</em> pour Téléphonie, <em>Taille & Couleur</em> pour Vêtements). Les vendeurs ne verront <strong>QUE</strong> ces options lors de la création d'un produit.
                    </span>
                ) : (
                    <span>
                        💡 <strong>Guide Facettes :</strong> Cochez les critères de filtrage de recherche visibles par les acheteurs sur le Storefront pour cette catégorie.
                    </span>
                )}
            </div>

            {/* Search Bar */}
            <div style={{ marginBottom: 24 }}>
                <input
                    type="text"
                    placeholder="Rechercher une collection..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                        width: '100%',
                        padding: '12px 16px',
                        fontSize: 14,
                        border: '1px solid #e5e7eb',
                        borderRadius: 8,
                        outline: 'none',
                        background: '#fff',
                        transition: 'border-color 0.2s, box-shadow 0.2s',
                    }}
                    onFocus={(e) => {
                        e.target.style.borderColor = '#3b82f6';
                        e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                    }}
                    onBlur={(e) => {
                        e.target.style.borderColor = '#e5e7eb';
                        e.target.style.boxShadow = 'none';
                    }}
                />
                {searchTerm && (
                    <div style={{ fontSize: 12, color: '#6b7280', marginTop: 8 }}>
                        {flatFilteredMappings.length} collection{flatFilteredMappings.length !== 1 ? 's' : ''} trouvée{flatFilteredMappings.length !== 1 ? 's' : ''}
                    </div>
                )}
            </div>

            {currentMappings.length === 0 && (
                <p style={{ fontSize: 14, color: '#9ca3af', textAlign: 'center', marginTop: 40 }}>
                    Aucune collection trouvée. Créez d'abord des collections dans le catalogue.
                </p>
            )}

            {filteredMappings.length === 0 && currentMappings.length > 0 && (
                <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>
                    <p style={{ fontSize: 14, marginBottom: 8 }}>
                        Aucune collection ne correspond à votre recherche.
                    </p>
                    <button
                        onClick={() => setSearchTerm('')}
                        style={{
                            fontSize: 13,
                            color: '#3b82f6',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            textDecoration: 'underline',
                        }}
                    >
                        Effacer la recherche
                    </button>
                </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {filteredMappings.map((mapping: any) => (
                    <CollectionCard
                        key={mapping.collectionId}
                        mapping={mapping}
                        activeTab={activeTab}
                        allItems={activeTab === 'optionGroups' ? allOptionGroups : allFacets}
                        saving={saving}
                        bulkSaving={bulkSaving}
                        expandedCollections={expandedCollections}
                        level={0}
                        onToggleItem={activeTab === 'optionGroups' ? toggleOptionGroup : toggleFacet}
                        onToggleExpand={toggleExpand}
                        onApplyToSubcollections={applyToSubcollections}
                        onOpenModal={setActiveCollectionId}
                    />
                ))}
            </div>

            {/* Modal for Facets or OptionGroups */}
            {(() => {
                const activeMapping = activeCollectionId ? findMappingById(currentMappings, activeCollectionId) : null;
                if (!activeMapping) return null;

                const isOptionTab = activeTab === 'optionGroups';
                const itemsList = isOptionTab ? allOptionGroups : allFacets;

                const ownSet = new Set(
                    (isOptionTab ? activeMapping.ownOptionGroupIds : activeMapping.ownFacetIds || []).map((id: any) => String(id))
                );
                const inheritedSet = new Set(
                    (isOptionTab ? activeMapping.inheritedOptionGroupIds : activeMapping.inheritedFacetIds || []).map((id: any) => String(id))
                );

                return (
                    <div
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: 'rgba(0, 0, 0, 0.45)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 1000,
                            backdropFilter: 'blur(4px)',
                        }}
                        onClick={() => setActiveCollectionId(null)}
                    >
                        <div
                            style={{
                                backgroundColor: '#fff',
                                borderRadius: 16,
                                width: '90%',
                                maxWidth: 700,
                                maxHeight: '85vh',
                                display: 'flex',
                                flexDirection: 'column',
                                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Modal Header */}
                            <div
                                style={{
                                    padding: '20px 24px',
                                    borderBottom: '1px solid #e2e8f0',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                }}
                            >
                                <div>
                                    <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: 0 }}>
                                        {isOptionTab ? "Groupes d'Options" : "Facettes"} pour : {activeMapping.collectionName}
                                    </h3>
                                    <p style={{ fontSize: 12, color: '#64748b', margin: '4px 0 0 0' }}>
                                        {isOptionTab
                                            ? "Cochez les groupes d'options autorisés pour les vendeurs dans ce rayon."
                                            : "Cochez les facettes propres à cette collection."}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setActiveCollectionId(null)}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        fontSize: 20,
                                        fontWeight: 600,
                                        color: '#64748b',
                                        cursor: 'pointer',
                                        padding: 4,
                                    }}
                                >
                                    ✕
                                </button>
                            </div>

                            {/* Modal Body */}
                            <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
                                <div
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                                        gap: 12,
                                    }}
                                >
                                    {itemsList.map((item: any) => {
                                        const isOwn = ownSet.has(String(item.id));
                                        const isInherited = inheritedSet.has(String(item.id));
                                        const isChecked = isOwn || isInherited;
                                        const isSavingThis = saving === activeMapping.collectionId;

                                        return (
                                            <label
                                                key={item.id}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 8,
                                                    padding: '10px 12px',
                                                    borderRadius: 8,
                                                    border: isOwn
                                                        ? '2px solid #4f46e5'
                                                        : isInherited
                                                        ? '2px solid #a5b4fc'
                                                        : '1px solid #e2e8f0',
                                                    background: isOwn
                                                        ? '#eef2ff'
                                                        : isInherited
                                                        ? '#f5f7ff'
                                                        : '#fff',
                                                    cursor: isInherited ? 'default' : isSavingThis ? 'wait' : 'pointer',
                                                    opacity: isSavingThis && !isInherited ? 0.7 : 1,
                                                    transition: 'all 0.15s',
                                                    userSelect: 'none',
                                                }}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    disabled={isInherited || !!isSavingThis}
                                                    onChange={() => {
                                                        if (isOptionTab) {
                                                            toggleOptionGroup(activeMapping.collectionId, item.id);
                                                        } else {
                                                            toggleFacet(activeMapping.collectionId, item.id);
                                                        }
                                                    }}
                                                    style={{ accentColor: isInherited ? '#a5b4fc' : '#4f46e5', width: 14, height: 14 }}
                                                />
                                                <div style={{ flex: 1 }}>
                                                    <span style={{ fontSize: 12, fontWeight: 700, color: isInherited ? '#64748b' : '#0f172a' }}>
                                                        {item.name}
                                                    </span>
                                                    {isInherited && (
                                                        <span style={{ fontSize: 9, color: '#4f46e5', marginLeft: 5, fontWeight: 600 }}>
                                                            héritée
                                                        </span>
                                                    )}
                                                    {item.optionsCount !== undefined && (
                                                        <span style={{ fontSize: 10, color: '#64748b', marginLeft: 5 }}>
                                                            ({item.optionsCount} options)
                                                        </span>
                                                    )}
                                                    {item.values?.length > 0 && (
                                                        <span style={{ fontSize: 10, color: '#64748b', marginLeft: 5 }}>
                                                            ({item.values.length})
                                                        </span>
                                                    )}
                                                </div>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div
                                style={{
                                    padding: '16px 24px',
                                    borderTop: '1px solid #e2e8f0',
                                    display: 'flex',
                                    justifyContent: 'flex-end',
                                    backgroundColor: '#f8fafc',
                                    borderBottomLeftRadius: 16,
                                    borderBottomRightRadius: 16,
                                }}
                            >
                                <button
                                    onClick={() => setActiveCollectionId(null)}
                                    style={{
                                        padding: '8px 18px',
                                        backgroundColor: '#4f46e5',
                                        color: '#fff',
                                        border: 'none',
                                        borderRadius: 8,
                                        fontWeight: 700,
                                        fontSize: 13,
                                        cursor: 'pointer',
                                    }}
                                >
                                    Fermer
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
}

function CollectionCard({
    mapping,
    activeTab,
    allItems,
    saving,
    bulkSaving,
    expandedCollections,
    level,
    onToggleItem,
    onToggleExpand,
    onApplyToSubcollections,
    onOpenModal,
}: any) {
    const isOptionTab = activeTab === 'optionGroups';
    const expanded = expandedCollections.has(mapping.collectionId);
    const hasChildren = mapping.children && mapping.children.length > 0;

    const ownSet = new Set((isOptionTab ? mapping.ownOptionGroupIds : mapping.ownFacetIds || []).map((id: any) => String(id)));
    const inheritedSet = new Set((isOptionTab ? mapping.inheritedOptionGroupIds : mapping.inheritedFacetIds || []).map((id: any) => String(id)));
    const totalSet = new Set([...Array.from(ownSet), ...Array.from(inheritedSet)]);

    const isSavingThis = saving === mapping.collectionId;

    return (
        <div
            style={{
                marginLeft: level * 20,
                border: '1px solid #e2e8f0',
                borderRadius: 12,
                overflow: 'hidden',
                background: '#fff',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}
        >
            {/* Header */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 18px',
                    background: totalSet.size > 0 ? (isOptionTab ? '#f5f7ff' : '#f0fdf4') : '#fafafa',
                    borderBottom: '1px solid #e5e7eb',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {hasChildren && (
                        <button
                            onClick={() => onToggleExpand(mapping.collectionId)}
                            style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: 4,
                                color: '#6b7280',
                            }}
                        >
                            <span style={{ fontSize: 16, fontWeight: 700 }}>
                                {expanded ? '▼' : '▶'}
                            </span>
                        </button>
                    )}
                    <div
                        style={{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            background: totalSet.size > 0 ? (isOptionTab ? '#e0e7ff' : '#dcfce7') : '#f3f4f6',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 14,
                            fontWeight: 700,
                            color: totalSet.size > 0 ? (isOptionTab ? '#4338ca' : '#15803d') : '#6b7280',
                        }}
                    >
                        {mapping.collectionName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>
                            {mapping.collectionName}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                            <span
                                style={{
                                    fontSize: 10,
                                    background: totalSet.size > 0 ? (isOptionTab ? '#4f46e5' : '#16a34a') : '#e5e7eb',
                                    color: totalSet.size > 0 ? '#fff' : '#9ca3af',
                                    padding: '2px 8px',
                                    borderRadius: 99,
                                    fontWeight: 700,
                                }}
                            >
                                {totalSet.size} {isOptionTab ? "option" : "facette"}{totalSet.size !== 1 ? 's' : ''}
                            </span>
                            {inheritedSet.size > 0 && (
                                <span style={{ fontSize: 10, color: '#6b7280' }}>
                                    ({inheritedSet.size} héritée{inheritedSet.size !== 1 ? 's' : ''})
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {isSavingThis && (
                        <span style={{ fontSize: 12, color: '#4f46e5', fontWeight: 600 }}>
                            Sauvegarde...
                        </span>
                    )}
                    
                    <button
                        onClick={() => onOpenModal(mapping.collectionId)}
                        style={{
                            fontSize: 11,
                            color: '#0f172a',
                            background: '#f1f5f9',
                            border: '1px solid #cbd5e1',
                            padding: '6px 14px',
                            borderRadius: 8,
                            cursor: 'pointer',
                            fontWeight: 700,
                        }}
                    >
                        {isOptionTab ? "Configurer les Options" : "Voir les Facettes"}
                    </button>

                    {hasChildren && (
                        <button
                            onClick={() => {
                                const confirmed = window.confirm("Appliquer ces paramètres à toutes les sous-collections ?");
                                if (confirmed) {
                                    onApplyToSubcollections(mapping.collectionId, Array.from(ownSet));
                                }
                            }}
                            disabled={bulkSaving}
                            style={{
                                fontSize: 11,
                                color: '#4f46e5',
                                background: '#eef2ff',
                                border: '1px solid #c7d2fe',
                                padding: '6px 12px',
                                borderRadius: 8,
                                cursor: bulkSaving ? 'wait' : 'pointer',
                                fontWeight: 700,
                            }}
                        >
                            {bulkSaving ? 'Application...' : 'Appliquer aux sous-catégories'}
                        </button>
                    )}
                </div>
            </div>

            {/* Children */}
            {expanded && hasChildren && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '14px 14px 14px 0' }}>
                    {mapping.children.map((child: any) => (
                        <CollectionCard
                            key={child.collectionId}
                            mapping={child}
                            activeTab={activeTab}
                            allItems={allItems}
                            saving={saving}
                            bulkSaving={bulkSaving}
                            expandedCollections={expandedCollections}
                            level={level + 1}
                            onToggleItem={onToggleItem}
                            onToggleExpand={onToggleExpand}
                            onApplyToSubcollections={onApplyToSubcollections}
                            onOpenModal={onOpenModal}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
