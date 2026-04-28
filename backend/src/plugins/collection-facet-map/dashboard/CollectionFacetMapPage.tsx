import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useApolloClient } from '@apollo/client';
import {
    GET_COLLECTION_FACET_MAPPINGS,
    SET_COLLECTION_ALLOWED_FACETS,
    GET_ALL_FACETS,
} from './queries';

export function CollectionFacetMapPage() {
    const client = useApolloClient();
    const [mappings, setMappings] = useState<any[]>([]);
    const [allFacets, setAllFacets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [mappingsRes, facetsRes] = await Promise.all([
                client.query({ query: GET_COLLECTION_FACET_MAPPINGS }),
                client.query({ query: GET_ALL_FACETS }),
            ]);
            setMappings(mappingsRes.data?.collectionFacetMappings || []);
            setAllFacets(facetsRes.data?.facets?.items || []);
        } catch (err) {
            console.error('Error fetching data:', err);
        } finally {
            setLoading(false);
        }
    };

    const toggleFacet = async (collectionId: string, facetId: string) => {
        const mapping = mappings.find((m: any) => m.collectionId === collectionId);
        if (!mapping) return;

        const currentIds = mapping.allowedFacetIds || [];
        const newIds = currentIds.includes(facetId)
            ? currentIds.filter((id: string) => id !== facetId)
            : [...currentIds, facetId];

        setSaving(collectionId);
        try {
            const res = await client.mutate({
                mutation: SET_COLLECTION_ALLOWED_FACETS,
                variables: { collectionId, facetIds: newIds },
            });
            const updated = res.data?.setCollectionAllowedFacets;
            if (updated) {
                setMappings((prev: any[]) =>
                    prev.map((m: any) => (m.collectionId === collectionId ? updated : m))
                );
            }
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
        <div style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
                Facettes autorisées par collection
            </h1>
            <p style={{ fontSize: 13, color: '#888', marginBottom: 24 }}>
                Définissez quelles facettes sont visibles pour les vendeurs lorsqu'ils ajoutent un produit dans chaque collection.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {mappings.map((mapping: any) => {
                    const isExpanded = expandedId === mapping.collectionId;
                    const isSavingThis = saving === mapping.collectionId;
                    const allowedSet = new Set(mapping.allowedFacetIds || []);

                    return (
                        <div
                            key={mapping.collectionId}
                            style={{
                                border: '1px solid #e5e7eb',
                                borderRadius: 10,
                                overflow: 'hidden',
                                background: '#fff',
                            }}
                        >
                            {/* Header */}
                            <div
                                onClick={() => setExpandedId(isExpanded ? null : mapping.collectionId)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '14px 18px',
                                    cursor: 'pointer',
                                    background: isExpanded ? '#f9fafb' : '#fff',
                                    borderBottom: isExpanded ? '1px solid #e5e7eb' : 'none',
                                    transition: 'background 0.15s',
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <span style={{ fontSize: 15, fontWeight: 600 }}>
                                        {mapping.collectionName}
                                    </span>
                                    <span
                                        style={{
                                            fontSize: 11,
                                            background: allowedSet.size > 0 ? '#dbeafe' : '#f3f4f6',
                                            color: allowedSet.size > 0 ? '#1d4ed8' : '#9ca3af',
                                            padding: '2px 8px',
                                            borderRadius: 99,
                                            fontWeight: 600,
                                        }}
                                    >
                                        {allowedSet.size} facette{allowedSet.size !== 1 ? 's' : ''}
                                    </span>
                                </div>
                                <span
                                    style={{
                                        fontSize: 12,
                                        color: '#9ca3af',
                                        transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)',
                                        transition: 'transform 0.2s',
                                    }}
                                >
                                    ▼
                                </span>
                            </div>

                            {/* Facet checkboxes */}
                            {isExpanded && (
                                <div style={{ padding: '14px 18px' }}>
                                    {allFacets.length === 0 ? (
                                        <p style={{ fontSize: 13, color: '#9ca3af' }}>
                                            Aucune facette trouvée. Créez d'abord des facettes dans le catalogue.
                                        </p>
                                    ) : (
                                        <div
                                            style={{
                                                display: 'grid',
                                                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                                                gap: 8,
                                            }}
                                        >
                                            {allFacets.map((facet: any) => {
                                                const isChecked = allowedSet.has(facet.id);
                                                return (
                                                    <label
                                                        key={facet.id}
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: 8,
                                                            padding: '8px 10px',
                                                            borderRadius: 8,
                                                            border: isChecked
                                                                ? '1px solid #3b82f6'
                                                                : '1px solid #e5e7eb',
                                                            background: isChecked ? '#eff6ff' : '#fff',
                                                            cursor: isSavingThis ? 'wait' : 'pointer',
                                                            opacity: isSavingThis ? 0.7 : 1,
                                                            transition: 'all 0.15s',
                                                        }}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={isChecked}
                                                            disabled={!!isSavingThis}
                                                            onChange={() =>
                                                                toggleFacet(mapping.collectionId, facet.id)
                                                            }
                                                            style={{ accentColor: '#3b82f6' }}
                                                        />
                                                        <span style={{ fontSize: 13, fontWeight: 500 }}>
                                                            {facet.name}
                                                        </span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    )}
                                    {isSavingThis && (
                                        <p style={{ fontSize: 12, color: '#3b82f6', marginTop: 10 }}>
                                            Sauvegarde en cours...
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {mappings.length === 0 && (
                <p style={{ fontSize: 14, color: '#9ca3af', textAlign: 'center', marginTop: 40 }}>
                    Aucune collection trouvée. Créez d'abord des collections dans le catalogue.
                </p>
            )}
        </div>
    );
}
