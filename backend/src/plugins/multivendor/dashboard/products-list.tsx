import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { GET_PRODUCTS, GET_COLLECTIONS } from './queries';

// --- Interfaces ---
interface Product {
    id: string;
    createdAt: string;
    name: string;
    slug: string;
    enabled: boolean;
    customFields?: {
        vendor?: {
            id: string;
            name: string;
            status: string;
            zone: string;
            logo?: { preview: string };
        };
        approvalStatus?: string;
        rejectionReason?: string;
    };
    featuredAsset?: { preview: string };
    variants: Array<{ price: number; currencyCode: string; stockLevel: string }>;
}

// --- GraphQL Fetcher ---
async function fetchGraphQL(query: string, variables?: any) {
    const response = await fetch('/admin-api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text.substring(0, 200)}`);
    }

    const json = await response.json();
    if (json.errors) throw new Error(json.errors[0].message);
    return json.data;
}

// --- CategoryManager Component ---
function CategoryManager() {
    const queryClient = useQueryClient();
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newCategorySlug, setNewCategorySlug] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { data: collectionsData, isLoading: isLoadingCollections } = useQuery({
        queryKey: ['collections'],
        queryFn: () => fetchGraphQL(GET_COLLECTIONS, {
            options: { take: 100, skip: 0 }
        })
    });

    const collections = collectionsData?.collections?.items || [];

    const createMutation = useMutation({
        mutationFn: ({ name, slug, parentId }: { name: string; slug: string; parentId?: string }) => fetchGraphQL(
            `mutation CreateCollection($input: CreateCollectionInput!) {
                createCollection(input: $input) {
                    id
                    name
                    slug
                }
            }`,
            {
                input: {
                    translations: [{ languageCode: 'fr', name, slug }],
                    filters: [{
                        code: 'variant-id-filter',
                        arguments: [{ name: 'variantIds', value: '[]' }],
                    }],
                    ...(parentId ? { parentId } : {}),
                }
            }
        ),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['collections'] });
            setNewCategoryName('');
            setNewCategorySlug('');
            setIsSubmitting(false);
            alert('Collection créée avec succès!');
        },
        onError: (error) => {
            setIsSubmitting(false);
            alert('Erreur: ' + (error as Error).message);
        }
    });

    const handleAddCategory = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCategoryName.trim()) return;
        setIsSubmitting(true);
        const slug = newCategorySlug || newCategoryName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        createMutation.mutate({ name: newCategoryName, slug });
    };

    return (
        <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e5e7eb', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#374151', marginBottom: '14px', marginTop: 0 }}>📁 Gérer les Collections (Catégories)</h2>
            
            <form onSubmit={handleAddCategory} style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                <input 
                    type="text" 
                    placeholder="Nom de la nouvelle collection..." 
                    value={newCategoryName}
                    onChange={(e) => {
                        setNewCategoryName(e.target.value);
                        if (!newCategorySlug) setNewCategorySlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
                    }}
                    disabled={isSubmitting}
                    style={{ flex: 1, padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
                />
                <button 
                    type="submit" 
                    disabled={isSubmitting || !newCategoryName.trim()}
                    style={{ 
                        padding: '9px 16px', 
                        borderRadius: '8px', 
                        background: '#f97316', 
                        color: 'white', 
                        border: 'none', 
                        cursor: isSubmitting || !newCategoryName.trim() ? 'not-allowed' : 'pointer',
                        opacity: isSubmitting ? 0.7 : 1,
                        fontSize: '14px',
                        fontWeight: 600
                    }}
                >
                    {isSubmitting ? 'Création...' : 'Créer la collection'}
                </button>
            </form>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {isLoadingCollections ? (
                    <span style={{ color: '#9ca3af', fontSize: '13px' }}>Chargement des collections...</span>
                ) : collections.length === 0 ? (
                    <span style={{ color: '#9ca3af', fontSize: '13px' }}>Aucune collection trouvée.</span>
                ) : (
                    collections.map((coll: any) => (
                        <span key={coll.id} style={{ 
                            background: '#f3f4f6', 
                            padding: '4px 12px', 
                            borderRadius: '16px', 
                            fontSize: '12px', 
                            color: '#4b5563',
                            border: '1px solid #e5e7eb',
                            fontWeight: 500
                        }}>
                            {coll.name}
                        </span>
                    ))
                )}
            </div>
        </div>
    );
}

// --- ProductList Component ---
export function ProductListComponent() {
    const queryClient = useQueryClient();
    const [page, setPage] = useState(1);
    const pageSize = 10;
    const [searchTerm, setSearchTerm] = useState('');
    const [vendorFilter, setVendorFilter] = useState('');
    const [togglingId, setTogglingId] = useState<string | null>(null);

    // Setup Query Variables
    const queryVariables = {
        options: {
            take: pageSize,
            skip: (page - 1) * pageSize,
            sort: { createdAt: 'DESC' },
            filter: {} as any
        }
    };

    if (searchTerm) {
        queryVariables.options.filter.name = { contains: searchTerm };
    }

    const { data, isLoading, error } = useQuery({
        queryKey: ['products', page, searchTerm],
        queryFn: () => fetchGraphQL(GET_PRODUCTS, queryVariables),
    });

    // Mutation to update product validation status (approve/reject) using standard UpdateProduct mutation
    const updateProductApprovalMutation = useMutation({
        mutationFn: ({ id, enabled, approvalStatus, rejectionReason }: { id: string; enabled: boolean; approvalStatus: string; rejectionReason?: string }) => fetchGraphQL(
            `mutation UpdateProductApproval($input: UpdateProductInput!) {
                updateProduct(input: $input) {
                    id
                    enabled
                    customFields {
                        approvalStatus
                        rejectionReason
                    }
                }
            }`,
            {
                input: {
                    id,
                    enabled,
                    customFields: {
                        approvalStatus,
                        rejectionReason: rejectionReason || ""
                    }
                }
            }
        ),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
        },
        onError: (err: any) => {
            alert('Erreur: ' + err.message);
        },
        onSettled: () => {
            setTogglingId(null);
        }
    });

    const handleApprove = (product: Product) => {
        setTogglingId(product.id);
        updateProductApprovalMutation.mutate({
            id: product.id,
            enabled: true,
            approvalStatus: 'approved',
            rejectionReason: ''
        });
    };

    const handleReject = (product: Product) => {
        const reason = prompt("Motif de rejet du produit :");
        if (reason === null) return; // User cancelled the prompt
        setTogglingId(product.id);
        updateProductApprovalMutation.mutate({
            id: product.id,
            enabled: false,
            approvalStatus: 'rejected',
            rejectionReason: reason
        });
    };

    const { items = [], totalItems = 0 } = data?.products || {};
    const totalPages = Math.ceil(totalItems / pageSize);

    // Client-side filtering for vendor
    const displayItems = vendorFilter
        ? items.filter((p: Product) => p.customFields?.vendor?.name.toLowerCase().includes(vendorFilter.toLowerCase()))
        : items;

    // Helper to get price range
    const getPriceDisplay = (variants: Product['variants']) => {
        if (!variants || variants.length === 0) return 'N/A';
        const prices = variants.map(v => v.price);
        const min = Math.min(...prices);
        const max = Math.max(...prices);
        const currency = variants[0].currencyCode;
        const factor = 100;
        if (min === max) return `${(min / factor).toFixed(0)} ${currency}`;
        return `${(min / factor).toFixed(0)} - ${(max / factor).toFixed(0)} ${currency}`;
    };

    return (
        <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif' }}>

            <div style={{ marginBottom: '24px' }}>
                <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#111827', margin: 0 }}>📦 Produits Marketplace</h1>
                <p style={{ color: '#6b7280', marginTop: '4px', fontSize: '14px' }}>Visualisez, filtrez, modifiez et modérez les produits de tous les vendeurs.</p>
            </div>

            {/* Category Manager Section */}
            <CategoryManager />

            {/* Filter Bar */}
            <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e5e7eb', marginBottom: '24px', display: 'flex', gap: '16px', flexWrap: 'wrap', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <div style={{ flex: 1, minWidth: '240px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#4b5563', marginBottom: '6px' }}>Rechercher un produit</label>
                    <input
                        type="text"
                        placeholder="Nom du produit..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '14px' }}
                    />
                </div>
                <div style={{ flex: 1, minWidth: '240px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#4b5563', marginBottom: '6px' }}>Filtrer par Vendeur</label>
                    <input
                        type="text"
                        placeholder="Nom du vendeur..."
                        value={vendorFilter}
                        onChange={e => setVendorFilter(e.target.value)}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '14px' }}
                    />
                </div>
            </div>

            {isLoading && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px', color: '#4b5563' }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ width: '30px', height: '30px', border: '2px solid #e5e7eb', borderTopColor: '#f97316', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
                        <div>Chargement des produits...</div>
                    </div>
                </div>
            )}
            
            {error && (
                <div style={{ padding: '16px', background: '#fee2e2', color: '#b91c1c', borderRadius: '8px', border: '1px solid #fca5a5', marginBottom: '24px', fontSize: '14px' }}>
                    <strong>Erreur:</strong> {(error as Error).message}
                </div>
            )}

            {!isLoading && !error && (
                <>
                    <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                                <tr>
                                    <th style={{ padding: '14px 16px', fontSize: '12px', fontWeight: 600, color: '#4b5563' }}>Image</th>
                                    <th style={{ padding: '14px 16px', fontSize: '12px', fontWeight: 600, color: '#4b5563' }}>Produit</th>
                                    <th style={{ padding: '14px 16px', fontSize: '12px', fontWeight: 600, color: '#4b5563' }}>Vendeur</th>
                                    <th style={{ padding: '14px 16px', fontSize: '12px', fontWeight: 600, color: '#4b5563' }}>Prix</th>
                                    <th style={{ padding: '14px 16px', fontSize: '12px', fontWeight: 600, color: '#4b5563' }}>Statut</th>
                                    <th style={{ padding: '14px 16px', fontSize: '12px', fontWeight: 600, color: '#4b5563', textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {displayItems.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>Aucun produit trouvé.</td>
                                    </tr>
                                ) : (
                                    displayItems.map((product: Product) => (
                                        <tr key={product.id} style={{ borderBottom: '1px solid #e5e7eb', transition: 'background 0.1s' }} onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'} onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                                            <td style={{ padding: '14px 16px' }}>
                                                <div style={{ width: '48px', height: '48px', borderRadius: '8px', background: '#f3f4f6', backgroundImage: product.featuredAsset ? `url(${product.featuredAsset.preview})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center', border: '1px solid #e5e7eb' }}>
                                                    {!product.featuredAsset && <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: '20px' }}>📦</span>}
                                                </div>
                                            </td>
                                            <td style={{ padding: '14px 16px' }}>
                                                <div style={{ fontWeight: 600, color: '#111827', fontSize: '14px' }}>{product.name}</div>
                                                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>SKU: {product.slug}</div>
                                            </td>
                                            <td style={{ padding: '14px 16px' }}>
                                                {product.customFields?.vendor ? (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: '#e5e7eb', backgroundImage: product.customFields.vendor.logo ? `url(${product.customFields.vendor.logo.preview})` : undefined, backgroundSize: 'cover', border: '1px solid #e5e7eb' }}></div>
                                                        <div>
                                                            <div style={{ fontWeight: 500, color: '#374151', fontSize: '13px' }}>{product.customFields.vendor.name}</div>
                                                            <div style={{ fontSize: '11px', color: '#6b7280' }} title="Zone">{product.customFields.vendor.zone || 'Pas de zone'}</div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span style={{ color: '#9ca3af', fontStyle: 'italic', fontSize: '13px' }}>Aucun Vendeur</span>
                                                )}
                                            </td>
                                            <td style={{ padding: '14px 16px', fontWeight: 600, fontSize: '13px', color: '#111827' }}>
                                                {getPriceDisplay(product.variants)}
                                            </td>
                                            <td style={{ padding: '14px 16px' }}>
                                                {(() => {
                                                    const status = product.customFields?.approvalStatus || 'pending';
                                                    let label = 'En attente';
                                                    let bg = '#ffedd5';
                                                    let color = '#c2410c';
                                                    if (status === 'approved') {
                                                        label = 'Approuvé';
                                                        bg = '#dcfce7';
                                                        color = '#15803d';
                                                    } else if (status === 'rejected') {
                                                        label = 'Rejeté';
                                                        bg = '#fee2e2';
                                                        color = '#b91c1c';
                                                    }
                                                    return (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                            <span style={{
                                                                padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 700,
                                                                background: bg,
                                                                color: color,
                                                                display: 'inline-block',
                                                                width: 'fit-content'
                                                            }}>
                                                                {label}
                                                            </span>
                                                            {status === 'rejected' && product.customFields?.rejectionReason && (
                                                                <span style={{ fontSize: '10px', color: '#ef4444', fontStyle: 'italic', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={product.customFields.rejectionReason}>
                                                                    Motif: {product.customFields.rejectionReason}
                                                                </span>
                                                            )}
                                                        </div>
                                                    );
                                                })()}
                                            </td>
                                            <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                                                    {(() => {
                                                        const status = product.customFields?.approvalStatus || 'pending';
                                                        const isDisabled = togglingId === product.id;
                                                        if (status === 'pending' || status === 'rejected') {
                                                            return (
                                                                <>
                                                                    <button
                                                                        onClick={() => handleApprove(product)}
                                                                        disabled={isDisabled}
                                                                        style={{
                                                                            padding: '6px 12px',
                                                                            borderRadius: '6px',
                                                                            background: '#dcfce7',
                                                                            color: '#15803d',
                                                                            border: 'none',
                                                                            cursor: isDisabled ? 'not-allowed' : 'pointer',
                                                                            fontWeight: 600,
                                                                            fontSize: '12px',
                                                                            transition: 'opacity 0.1s'
                                                                        }}
                                                                    >
                                                                        {isDisabled ? '...' : 'Approuver'}
                                                                    </button>
                                                                    {status !== 'rejected' && (
                                                                        <button
                                                                            onClick={() => handleReject(product)}
                                                                            disabled={isDisabled}
                                                                            style={{
                                                                                padding: '6px 12px',
                                                                                borderRadius: '6px',
                                                                                background: '#fee2e2',
                                                                                color: '#b91c1c',
                                                                                border: 'none',
                                                                                cursor: isDisabled ? 'not-allowed' : 'pointer',
                                                                                fontWeight: 600,
                                                                                fontSize: '12px',
                                                                                transition: 'opacity 0.1s'
                                                                            }}
                                                                        >
                                                                            {isDisabled ? '...' : 'Rejeter'}
                                                                        </button>
                                                                    )}
                                                                </>
                                                            );
                                                        } else {
                                                            // status is approved
                                                            return (
                                                                <button
                                                                    onClick={() => handleReject(product)}
                                                                    disabled={isDisabled}
                                                                    style={{
                                                                        padding: '6px 12px',
                                                                        borderRadius: '6px',
                                                                        background: '#fee2e2',
                                                                        color: '#b91c1c',
                                                                        border: 'none',
                                                                        cursor: isDisabled ? 'not-allowed' : 'pointer',
                                                                        fontWeight: 600,
                                                                        fontSize: '12px',
                                                                        transition: 'opacity 0.1s'
                                                                    }}
                                                                >
                                                                    {isDisabled ? '...' : 'Désactiver / Rejeter'}
                                                                </button>
                                                            );
                                                        }
                                                    })()}
                                                    {/* Edit Link to Vendure native product editor */}
                                                    <a
                                                        href={`/admin/products/${product.id}`}
                                                        style={{
                                                            padding: '6px 12px',
                                                            borderRadius: '6px',
                                                            background: 'white',
                                                            color: '#2563eb',
                                                            border: '1px solid #d1d5db',
                                                            fontWeight: 600,
                                                            fontSize: '12px',
                                                            textDecoration: 'none',
                                                            display: 'inline-block'
                                                        }}
                                                    >
                                                        Modifier
                                                    </a>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalItems > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginTop: '24px' }}>
                            <button
                                disabled={page === 1}
                                onClick={() => setPage(p => p - 1)}
                                style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: page === 1 ? '#f3f4f6' : 'white', cursor: page === 1 ? 'not-allowed' : 'pointer', fontSize: '13px' }}
                            >
                                Précédent
                            </button>
                            <span style={{ color: '#4b5563', fontSize: '13px' }}>Page {page} sur {totalPages}</span>
                            <button
                                disabled={page === totalPages}
                                onClick={() => setPage(p => p + 1)}
                                style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: page === totalPages ? '#f3f4f6' : 'white', cursor: page === totalPages ? 'not-allowed' : 'pointer', fontSize: '13px' }}
                            >
                                Suivant
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
