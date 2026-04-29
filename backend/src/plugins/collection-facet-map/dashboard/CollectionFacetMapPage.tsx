import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
    GET_COLLECTION_FACET_MAPPINGS,
    SET_COLLECTION_ALLOWED_FACETS,
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
        throw new Error(json.errors[0].message);
    }
    return json.data;
}

export function CollectionFacetMapPage() {
    const queryClient = useQueryClient();
    const [saving, setSaving] = useState<string | null>(null);
    const [togglingWallet, setTogglingWallet] = useState(false);

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
    const allFacets = facetsData?.facets?.items || [];
    const loading = loadingMappings || loadingFacets;

    const toggleFacet = async (collectionId: string, facetId: string) => {
        const mapping = mappings.find((m: any) => m.collectionId === collectionId);
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

            {mappings.length === 0 && (
                <p style={{ fontSize: 14, color: '#9ca3af', textAlign: 'center', marginTop: 40 }}>
                    Aucune collection trouvée. Créez d'abord des collections dans le catalogue.
                </p>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {mappings.map((mapping: any) => {
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

                    return (
                        <div
                            key={mapping.collectionId}
                            style={{
                                border: '1px solid #e5e7eb',
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
                                    padding: '16px 20px',
                                    background: totalSet.size > 0 ? '#f0f7ff' : '#fafafa',
                                    borderBottom: '1px solid #e5e7eb',
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <span style={{ fontSize: 15, fontWeight: 600, color: '#1e293b' }}>
                                        {mapping.collectionName}
                                    </span>
                                    <span
                                        style={{
                                            fontSize: 11,
                                            background: totalSet.size > 0 ? '#3b82f6' : '#e5e7eb',
                                            color: totalSet.size > 0 ? '#fff' : '#9ca3af',
                                            padding: '3px 10px',
                                            borderRadius: 99,
                                            fontWeight: 600,
                                        }}
                                    >
                                        {totalSet.size} facette{totalSet.size !== 1 ? 's' : ''}
                                        {inheritedSet.size > 0 && (
                                            <span style={{ fontWeight: 400, opacity: 0.8 }}> ({inheritedSet.size} héritée{inheritedSet.size !== 1 ? 's' : ''})</span>
                                        )}
                                    </span>
                                </div>
                                {isSavingThis && (
                                    <span style={{ fontSize: 12, color: '#3b82f6', fontWeight: 500 }}>
                                        Sauvegarde...
                                    </span>
                                )}
                            </div>

                            {/* Facet checkboxes */}
                            <div style={{ padding: '16px 20px' }}>
                                {allFacets.length === 0 ? (
                                    <p style={{ fontSize: 13, color: '#9ca3af' }}>
                                        Aucune facette trouvée. Créez d'abord des facettes dans le catalogue.
                                    </p>
                                ) : (
                                    <div
                                        style={{
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                                            gap: 8,
                                        }}
                                    >
                                        {allFacets.map((facet: any) => {
                                            const isOwn = ownSet.has(String(facet.id));
                                            const isInherited = inheritedSet.has(String(facet.id));
                                            const isChecked = isOwn || isInherited;
                                            return (
                                                <label
                                                    key={facet.id}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 10,
                                                        padding: '10px 12px',
                                                        borderRadius: 8,
                                                        border: isOwn
                                                            ? '2px solid #3b82f6'
                                                            : isInherited
                                                            ? '2px solid #93c5fd'
                                                            : '1px solid #e5e7eb',
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
                                                            toggleFacet(mapping.collectionId, facet.id)
                                                        }
                                                        style={{ accentColor: isInherited ? '#93c5fd' : '#3b82f6', width: 16, height: 16 }}
                                                    />
                                                    <div style={{ flex: 1 }}>
                                                        <span style={{ fontSize: 13, fontWeight: 600, color: isInherited ? '#6b7280' : '#1e293b' }}>
                                                            {facet.name}
                                                        </span>
                                                        {isInherited && (
                                                            <span style={{ fontSize: 10, color: '#93c5fd', marginLeft: 6, fontWeight: 500 }}>
                                                                héritée
                                                            </span>
                                                        )}
                                                        {isChecked && facet.values?.length > 0 && (
                                                            <span style={{ fontSize: 11, color: '#6b7280', marginLeft: 6 }}>
                                                                ({facet.values.length} valeur{facet.values.length !== 1 ? 's' : ''})
                                                            </span>
                                                        )}
                                                    </div>
                                                </label>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
