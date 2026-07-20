import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
    GET_COLLECTION_FACET_MAPPINGS,
    SET_COLLECTION_ALLOWED_FACETS,
    SET_COLLECTION_ALLOWED_FACETS_BULK,
    GET_ALL_FACETS,
    GET_SELLER_DASHBOARD_CONFIG,
    UPDATE_SELLER_DASHBOARD_CONFIG,
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

    const { data: mappingsData, isLoading: loadingMappings } = useQuery({
        queryKey: ['collectionFacetMappings'],
        queryFn: () => fetchGraphQL(GET_COLLECTION_FACET_MAPPINGS),
    });

    const { data: facetsData, isLoading: loadingFacets } = useQuery({
        queryKey: ['allFacets'],
        queryFn: () => fetchGraphQL(GET_ALL_FACETS),
    });

    const mappings = mappingsData?.collectionFacetMappings || [];
    const allFacets = facetsData?.allMappingFacets || [];
    const loading = loadingMappings || loadingFacets;

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

    const sortedMappings = sortTree(mappings);
    const filteredMappings = filterTree(sortedMappings, searchTerm);
    const flatFilteredMappings = flattenMappings(filteredMappings);

    const toggleFacet = async (collectionId: string, facetId: string) => {
        const mapping = findMappingById(mappings, collectionId);
        if (!mapping) return;

        const ownIds: string[] = (mapping.ownFacetIds || []).map((id: any) => String(id));
        const facetIdStr = String(facetId);

        // Only toggle own facets (not inherited ones)
        const newOwnIds = ownIds.includes(facetIdStr)
            ? ownIds.filter((id: string) => id !== facetIdStr)
            : [...ownIds, facetIdStr];

        setSaving(collectionId);
        try {
            await fetchGraphQL(SET_COLLECTION_ALLOWED_FACETS, { collectionId, facetIds: newOwnIds });
            queryClient.invalidateQueries({ queryKey: ['collectionFacetMappings'] });
        } catch (err) {
            console.error('Error saving:', err);
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

    const applyToSubcollections = async (collectionId: string, facetIds: string[]) => {
        const mapping = findMappingById(mappings, collectionId);
        if (!mapping) return;

        const descendantIds = getAllDescendantIds(mapping);
        setBulkSaving(true);
        try {
            await fetchGraphQL(SET_COLLECTION_ALLOWED_FACETS_BULK, { collectionIds: descendantIds, facetIds });
            queryClient.invalidateQueries({ queryKey: ['collectionFacetMappings'] });
        } catch (err) {
            console.error('Error saving bulk:', err);
        } finally {
            setBulkSaving(false);
        }
    };

    if (loading) {
        return (
            <div style={{ padding: 32, textAlign: 'center', color: '#888' }}>
                Chargement...
            </div>
        );
    }

    return (
        <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
                Facettes par collection
            </h1>
            <p style={{ fontSize: 13, color: '#888', marginBottom: 24 }}>
                Choisissez les facettes visibles pour les vendeurs dans chaque collection. Les sous-facettes (valeurs) seront proposées en dropdown dans le formulaire vendeur.
            </p>

            {/* Seller Dashboard Settings */}
            <div
                style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: 12,
                    padding: '16px 20px',
                    marginBottom: 24,
                    background: '#fff',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                }}
            >
                <div>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>
                        Page Portefeuille (Seller)
                    </span>
                    <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>
                        {walletEnabled
                            ? 'La page Portefeuille est visible pour les vendeurs'
                            : 'La page Portefeuille est masquée pour les vendeurs'}
                    </p>
                </div>
                <button
                    onClick={toggleWallet}
                    disabled={togglingWallet}
                    style={{
                        width: 48,
                        height: 26,
                        borderRadius: 13,
                        border: 'none',
                        background: walletEnabled ? '#3b82f6' : '#d1d5db',
                        cursor: togglingWallet ? 'wait' : 'pointer',
                        position: 'relative',
                        transition: 'background 0.2s',
                        flexShrink: 0,
                    }}
                >
                    <div
                        style={{
                            width: 20,
                            height: 20,
                            borderRadius: 10,
                            background: '#fff',
                            position: 'absolute',
                            top: 3,
                            left: walletEnabled ? 25 : 3,
                            transition: 'left 0.2s',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                        }}
                    />
                </button>
            </div>

            {/* Search Bar */}
            <div
                style={{
                    marginBottom: 24,
                }}
            >
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

            {mappings.length === 0 && (
                <p style={{ fontSize: 14, color: '#9ca3af', textAlign: 'center', marginTop: 40 }}>
                    Aucune collection trouvée. Créez d'abord des collections dans le catalogue.
                </p>
            )}

            {filteredMappings.length === 0 && mappings.length > 0 && (
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
                        allFacets={allFacets}
                        saving={saving}
                        bulkSaving={bulkSaving}
                        expandedCollections={expandedCollections}
                        level={0}
                        onToggleFacet={toggleFacet}
                        onToggleExpand={toggleExpand}
                        onApplyToSubcollections={applyToSubcollections}
                        onOpenFacetsModal={setActiveCollectionId}
                    />
                ))}
            </div>

            {/* Facets Modal */}
            {(() => {
                const activeMapping = activeCollectionId ? findMappingById(mappings, activeCollectionId) : null;
                if (!activeMapping) return null;

                return (
                    <div
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: 'rgba(0, 0, 0, 0.4)',
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
                                        Facettes pour : {activeMapping.collectionName}
                                    </h3>
                                    <p style={{ fontSize: 12, color: '#64748b', margin: '4px 0 0 0' }}>
                                        Cochez les facettes propres à cette collection. Les facettes héritées s'affichent avec une bordure bleue.
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
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
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
                                    {allFacets.map((facet: any) => {
                                        const ownSet = new Set((activeMapping.ownFacetIds || []).map((id: any) => String(id)));
                                        const inheritedSet = new Set((activeMapping.inheritedFacetIds || []).map((id: any) => String(id)));
                                        const isOwn = ownSet.has(String(facet.id));
                                        const isInherited = inheritedSet.has(String(facet.id));
                                        const isChecked = isOwn || isInherited;
                                        const isSavingThis = saving === activeMapping.collectionId;

                                        return (
                                            <label
                                                key={facet.id}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 8,
                                                    padding: '10px 12px',
                                                    borderRadius: 8,
                                                    border: isOwn
                                                        ? '2px solid #3b82f6'
                                                        : isInherited
                                                        ? '2px solid #93c5fd'
                                                        : '1px solid #e2e8f0',
                                                    background: isOwn
                                                        ? '#eff6ff'
                                                        : isInherited
                                                        ? '#f0f7ff'
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
                                                    onChange={() =>
                                                        toggleFacet(activeMapping.collectionId, facet.id)
                                                    }
                                                    style={{ accentColor: isInherited ? '#93c5fd' : '#3b82f6', width: 14, height: 14 }}
                                                />
                                                <div style={{ flex: 1 }}>
                                                    <span style={{ fontSize: 12, fontWeight: 600, color: isInherited ? '#64748b' : '#0f172a' }}>
                                                        {facet.name}
                                                    </span>
                                                    {isInherited && (
                                                        <span style={{ fontSize: 9, color: '#3b82f6', marginLeft: 5, fontWeight: 500 }}>
                                                            héritée
                                                        </span>
                                                    )}
                                                    {isChecked && facet.values?.length > 0 && (
                                                        <span style={{ fontSize: 10, color: '#64748b', marginLeft: 5 }}>
                                                            ({facet.values.length})
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
                                        padding: '8px 16px',
                                        backgroundColor: '#3b82f6',
                                        color: '#fff',
                                        border: 'none',
                                        borderRadius: 8,
                                        fontWeight: 600,
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
    allFacets,
    saving,
    bulkSaving,
    expandedCollections,
    level,
    onToggleFacet,
    onToggleExpand,
    onApplyToSubcollections,
    onOpenFacetsModal,
}: any) {
    const expanded = expandedCollections.has(mapping.collectionId);
    const isSavingThis = saving === mapping.collectionId;
    const ownSet = new Set(
        (mapping.ownFacetIds || []).map((id: any) => String(id))
    );
    const inheritedSet = new Set(
        (mapping.inheritedFacetIds || []).map((id: any) => String(id))
    );
    const totalSet = new Set(
        (mapping.allowedFacetIds || []).map((id: any) => String(id))
    );
    const hasChildren = mapping.children && mapping.children.length > 0;

    return (
        <div
            style={{
                border: '1px solid #e5e7eb',
                borderRadius: 12,
                overflow: 'hidden',
                background: '#fff',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                marginLeft: level * 20,
            }}
        >
            {/* Header */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 18px',
                    background: totalSet.size > 0 ? '#f0f7ff' : '#fafafa',
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
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
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
                            background: totalSet.size > 0 ? '#dbeafe' : '#f3f4f6',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 14,
                            fontWeight: 700,
                            color: totalSet.size > 0 ? '#1e40af' : '#6b7280',
                        }}
                    >
                        {mapping.collectionName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <span style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>
                            {mapping.collectionName}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                            <span
                                style={{
                                    fontSize: 10,
                                    background: totalSet.size > 0 ? '#3b82f6' : '#e5e7eb',
                                    color: totalSet.size > 0 ? '#fff' : '#9ca3af',
                                    padding: '2px 8px',
                                    borderRadius: 99,
                                    fontWeight: 600,
                                }}
                            >
                                {totalSet.size} facette{totalSet.size !== 1 ? 's' : ''}
                            </span>
                            {inheritedSet.size > 0 && (
                                <span style={{ fontSize: 10, color: '#6b7280' }}>
                                    ({inheritedSet.size} héritée{inheritedSet.size !== 1 ? 's' : ''})
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {isSavingThis && (
                        <span style={{ fontSize: 12, color: '#3b82f6', fontWeight: 500 }}>
                            Sauvegarde...
                        </span>
                    )}
                    
                    {/* Voir les facettes liées */}
                    <button
                        onClick={() => onOpenFacetsModal(mapping.collectionId)}
                        style={{
                            fontSize: 11,
                            color: '#1e293b',
                            background: '#f1f5f9',
                            border: '1px solid #cbd5e1',
                            padding: '6px 12px',
                            borderRadius: 6,
                            cursor: 'pointer',
                            fontWeight: 600,
                        }}
                    >
                        Voir les facettes liées
                    </button>

                    {/* Appliquer à toutes (sous-collections) */}
                    {hasChildren && (
                        <button
                            onClick={() => {
                                const confirmed = window.confirm("Êtes-vous sûr de vouloir appliquer ces modifications ?");
                                if (confirmed) {
                                    onApplyToSubcollections(mapping.collectionId, Array.from(ownSet));
                                }
                            }}
                            disabled={bulkSaving}
                            style={{
                                fontSize: 11,
                                color: '#3b82f6',
                                background: '#eff6ff',
                                border: '1px solid #bfdbfe',
                                padding: '6px 12px',
                                borderRadius: 6,
                                cursor: bulkSaving ? 'wait' : 'pointer',
                                fontWeight: 600,
                            }}
                        >
                            {bulkSaving ? 'Application...' : 'Appliquer à toutes'}
                        </button>
                    )}
                </div>
            </div>

            {/* Children */}
            {expanded && hasChildren && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>
                    {mapping.children.map((child: any) => (
                        <CollectionCard
                            key={child.collectionId}
                            mapping={child}
                            allFacets={allFacets}
                            saving={saving}
                            bulkSaving={bulkSaving}
                            expandedCollections={expandedCollections}
                            level={level + 1}
                            onToggleFacet={onToggleFacet}
                            onToggleExpand={onToggleExpand}
                            onApplyToSubcollections={onApplyToSubcollections}
                            onOpenFacetsModal={onOpenFacetsModal}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
