import React, { useState, useEffect } from 'react';
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

// --- Global Settings Queries ---
const GET_GLOBAL_SETTINGS = `
    query GetGlobalSettings {
        globalSettings {
            customFields {
                minimumMarketplacePrice
                whatsappNumber
            }
        }
    }
`;

const UPDATE_GLOBAL_SETTINGS = `
    mutation UpdateGlobalSettings($input: UpdateGlobalSettingsInput!) {
        updateGlobalSettings(input: $input) {
            ... on GlobalSettings {
                id
                customFields {
                    minimumMarketplacePrice
                    whatsappNumber
                }
            }
            ... on ErrorResult {
                errorCode
                message
            }
        }
    }
`;

// --- Vendor Queries ---
const GET_VENDORS_LIST = `
    query GetVendorsList {
        vendors(options: { take: 100 }) {
            items {
                id
                name
            }
        }
    }
`;

const REASSIGN_PRODUCT = `
    mutation UpdateProductVendor($input: UpdateProductInput!) {
        updateProduct(input: $input) {
            id
            customFields {
                vendor {
                    id
                    name
                }
            }
        }
    }
`;

// --- Product CRUD Mutations & Queries ---
const GET_PRODUCT_DETAIL = `
    query GetProductDetail($id: ID!) {
        product(id: $id) {
            id
            name
            description
            enabled
            customFields {
                shortDescription
                vendor {
                    id
                    name
                }
            }
            assets {
                id
                preview
            }
            featuredAsset {
                id
                preview
            }
            collections {
                id
                name
            }
            variants {
                id
                price
                stockOnHand
                customFields {
                    onPromotion
                    promotionalPrice
                }
            }
        }
    }
`;

const ADMIN_CREATE_PRODUCT = `
    mutation AdminCreateProduct($input: CreateVendorProductInput!, $vendorId: ID!) {
        adminCreateProduct(input: $input, vendorId: $vendorId) {
            id
            name
        }
    }
`;

const ADMIN_UPDATE_PRODUCT = `
    mutation AdminUpdateProduct($id: ID!, $input: UpdateVendorProductInput!, $vendorId: ID) {
        adminUpdateProduct(id: $id, input: $input, vendorId: $vendorId) {
            id
            name
        }
    }
`;

const ADMIN_UPDATE_PRODUCT_VARIANT = `
    mutation AdminUpdateProductVariant($input: UpdateVendorProductVariantInput!) {
        adminUpdateProductVariant(input: $input) {
            id
        }
    }
`;

const UPDATE_PRODUCT_APPROVAL = `
    mutation UpdateProductApproval($input: UpdateProductInput!) {
        updateProduct(input: $input) {
            id
            customFields {
                approvalStatus
                rejectionReason
            }
        }
    }
`;

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

// Upload Asset via multipart
async function uploadAsset(file: File) {
    const operations = {
        query: `mutation CreateAssets($input: [CreateAssetInput!]!) {
            createAssets(input: $input) {
                ... on Asset {
                    id
                    preview
                }
            }
        }`,
        variables: {
            input: [{ file: null }]
        }
    };

    const map = {
        '0': ['variables.input.0.file']
    };

    const formData = new FormData();
    formData.append('operations', JSON.stringify(operations));
    formData.append('map', JSON.stringify(map));
    formData.append('0', file);

    const response = await fetch('/admin-api', {
        method: 'POST',
        credentials: 'include',
        body: formData
    });

    const json = await response.json();
    if (json.errors) throw new Error(json.errors[0].message);
    return json.data.createAssets[0];
}

// Helper to structure collections in tree
const buildCollectionTree = (collections: any[]) => {
    const map = new Map<string, any>();
    collections.forEach(c => {
        map.set(c.id, { ...c, children: [] });
    });

    const rootNodes: any[] = [];
    collections.forEach(c => {
        const node = map.get(c.id);
        if (c.parent && c.parent.name !== '__root_collection__' && map.has(c.parent.id)) {
            map.get(c.parent.id).children.push(node);
        } else {
            rootNodes.push(node);
        }
    });
    return rootNodes;
};

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

    const handleCreateCategory = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCategoryName || !newCategorySlug) return;
        setIsSubmitting(true);
        createMutation.mutate({ name: newCategoryName, slug: newCategorySlug });
    };

    return (
        <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
            <h3 style={{ marginTop: 0, fontSize: '16px', color: '#1e293b', marginBottom: '12px' }}>📂 Ajouter une nouvelle catégorie</h3>
            <form onSubmit={handleCreateCategory} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <input
                    type="text"
                    placeholder="Nom de la catégorie (ex: Légumes)"
                    value={newCategoryName}
                    onChange={e => {
                        setNewCategoryName(e.target.value);
                        setNewCategorySlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
                    }}
                    style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', flex: 1, minWidth: '200px' }}
                />
                <input
                    type="text"
                    placeholder="Slug URL (ex: legumes)"
                    value={newCategorySlug}
                    onChange={e => setNewCategorySlug(e.target.value)}
                    style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', flex: 1, minWidth: '200px' }}
                />
                <button
                    type="submit"
                    disabled={isSubmitting}
                    style={{ padding: '8px 16px', borderRadius: '6px', background: '#2563eb', color: 'white', border: 'none', fontWeight: 'bold', cursor: isSubmitting ? 'not-allowed' : 'pointer' }}
                >
                    {isSubmitting ? 'En cours...' : 'Ajouter'}
                </button>
            </form>
        </div>
    );
}

// --- MinimalPriceManager Component ---
function MinimalPriceManager() {
    const queryClient = useQueryClient();
    const [minPrice, setMinPrice] = useState<string>('');
    const [isUpdating, setIsUpdating] = useState(false);

    const { data: globalSettingsData } = useQuery({
        queryKey: ['globalSettings'],
        queryFn: () => fetchGraphQL(GET_GLOBAL_SETTINGS)
    });

    const currentMinPrice = globalSettingsData?.globalSettings?.customFields?.minimumMarketplacePrice ?? 0;

    useEffect(() => {
        if (currentMinPrice !== undefined) {
            setMinPrice(currentMinPrice.toString());
        }
    }, [currentMinPrice]);

    const updateMutation = useMutation({
        mutationFn: (price: number) => fetchGraphQL(UPDATE_GLOBAL_SETTINGS, {
            input: {
                customFields: {
                    minimumMarketplacePrice: price
                }
            }
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['globalSettings'] });
            setIsUpdating(false);
            alert('Prix minimum mis à jour avec succès!');
        },
        onError: (err: any) => {
            setIsUpdating(false);
            alert(err.message || 'Erreur lors de la mise à jour');
        }
    });

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        setIsUpdating(true);
        updateMutation.mutate(Number(minPrice));
    };

    return (
        <div style={{ background: '#fef3c7', padding: '20px', borderRadius: '12px', border: '1px solid #fde68a', marginBottom: '24px' }}>
            <h3 style={{ marginTop: 0, fontSize: '16px', color: '#92400e', marginBottom: '8px' }}>💰 Configuration du prix minimum du marché</h3>
            <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#b45309' }}>Configure le montant minimal en FCFA auquel un vendeur peut lister un produit sur le marketplace.</p>
            <form onSubmit={handleSave} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div style={{ position: 'relative' }}>
                    <input
                        type="number"
                        min="0"
                        value={minPrice}
                        onChange={e => setMinPrice(e.target.value)}
                        style={{ padding: '8px 32px 8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '150px' }}
                    />
                    <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '12px', fontWeight: 'bold' }}>FCFA</span>
                </div>
                <button
                    type="submit"
                    disabled={isUpdating}
                    style={{ padding: '8px 16px', borderRadius: '6px', background: '#d97706', color: 'white', border: 'none', fontWeight: 'bold', cursor: isUpdating ? 'not-allowed' : 'pointer' }}
                >
                    {isUpdating ? 'Sauvegarde...' : 'Mettre à jour'}
                </button>
            </form>
        </div>
    );
}

// --- Create & Edit Product Modal ---
function CreateEditProductModal({ isOpen, productId, onClose, vendors }: { isOpen: boolean; productId: string | null; onClose: () => void; vendors: any[] }) {
    const queryClient = useQueryClient();
    const isEdit = !!productId;

    const [form, setForm] = useState({
        name: '',
        description: '',
        shortDescription: '',
        price: 0,
        stock: 10,
        onPromotion: false,
        promotionalPrice: 0,
        vendorId: '',
        collectionIds: [] as string[],
        assetIds: [] as string[],
        featuredAssetId: ''
    });

    const [assets, setAssets] = useState<any[]>([]);
    const [uploading, setUploading] = useState(false);

    // Fetch collections
    const { data: collectionsData } = useQuery({
        queryKey: ['collections'],
        queryFn: () => fetchGraphQL(GET_COLLECTIONS, { options: { take: 100, skip: 0 } }),
        enabled: isOpen
    });

    const collections = collectionsData?.collections?.items || [];
    const collectionTree = buildCollectionTree(collections);

    // Fetch product details if editing
    const { data: productDetail, isLoading: isLoadingProduct } = useQuery({
        queryKey: ['productDetail', productId],
        queryFn: () => fetchGraphQL(GET_PRODUCT_DETAIL, { id: productId }),
        enabled: isEdit && isOpen
    });

    const [variantId, setVariantId] = useState<string | null>(null);

    useEffect(() => {
        if (productDetail?.product) {
            const p = productDetail.product;
            const mainVariant = p.variants?.[0];
            setVariantId(mainVariant?.id || null);

            setForm({
                name: p.name || '',
                description: p.description || '',
                shortDescription: p.customFields?.shortDescription || '',
                price: mainVariant?.price || 0,
                stock: mainVariant?.stockOnHand || 0,
                onPromotion: mainVariant?.customFields?.onPromotion || false,
                promotionalPrice: mainVariant?.customFields?.promotionalPrice || 0,
                vendorId: p.customFields?.vendor?.id || '',
                collectionIds: p.collections?.map((c: any) => c.id) || [],
                assetIds: p.assets?.map((a: any) => a.id) || [],
                featuredAssetId: p.featuredAsset?.id || ''
            });
            setAssets(p.assets || []);
        } else if (!isEdit && isOpen) {
            setForm({
                name: '',
                description: '',
                shortDescription: '',
                price: 0,
                stock: 10,
                onPromotion: false,
                promotionalPrice: 0,
                vendorId: vendors[0]?.id || '',
                collectionIds: [],
                assetIds: [],
                featuredAssetId: ''
            });
            setAssets([]);
            setVariantId(null);
        }
    }, [productDetail, productId, isOpen, isEdit, vendors]);

    const mutationSubmit = useMutation({
        mutationFn: async (variables: any) => {
            if (isEdit) {
                // 1. Update product base info
                await fetchGraphQL(ADMIN_UPDATE_PRODUCT, {
                    id: productId,
                    input: {
                        name: variables.name,
                        description: variables.description,
                        shortDescription: variables.shortDescription,
                        collectionIds: variables.collectionIds,
                        assetIds: variables.assetIds,
                        featuredAssetId: variables.featuredAssetId
                    },
                    vendorId: variables.vendorId
                });

                // 2. Update variant price & stock
                if (variantId) {
                    await fetchGraphQL(ADMIN_UPDATE_PRODUCT_VARIANT, {
                        input: {
                            id: variantId,
                            price: variables.price,
                            stock: variables.stock,
                            onPromotion: variables.onPromotion,
                            promotionalPrice: variables.promotionalPrice
                        }
                    });
                }
            } else {
                // Create product
                await fetchGraphQL(ADMIN_CREATE_PRODUCT, {
                    input: {
                        name: variables.name,
                        description: variables.description,
                        shortDescription: variables.shortDescription,
                        price: variables.price,
                        stock: variables.stock,
                        collectionIds: variables.collectionIds,
                        assetIds: variables.assetIds,
                        featuredAssetId: variables.featuredAssetId,
                        onPromotion: variables.onPromotion,
                        promotionalPrice: variables.promotionalPrice
                    },
                    vendorId: variables.vendorId
                });
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
            alert(isEdit ? 'Produit mis à jour avec succès !' : 'Nouveau produit créé avec succès !');
            onClose();
        },
        onError: (err: any) => {
            alert(err.message || 'Une erreur est survenue lors de l\'enregistrement');
        }
    });

    if (!isOpen) return null;

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        setUploading(true);
        try {
            const files = Array.from(e.target.files);
            const uploadedAssets = [];
            for (const file of files) {
                const asset = await uploadAsset(file);
                uploadedAssets.push(asset);
            }

            const newAssetIds = [...form.assetIds, ...uploadedAssets.map(a => a.id)];
            setAssets(prev => [...prev, ...uploadedAssets]);
            setForm(prev => ({
                ...prev,
                assetIds: newAssetIds,
                featuredAssetId: prev.featuredAssetId || uploadedAssets[0]?.id || ''
            }));
        } catch (err: any) {
            alert('Erreur d\'upload : ' + err.message);
        } finally {
            setUploading(false);
        }
    };

    const handleToggleCollection = (id: string) => {
        setForm(prev => {
            const next = prev.collectionIds.includes(id)
                ? prev.collectionIds.filter(x => x !== id)
                : [...prev.collectionIds, id];
            return { ...prev, collectionIds: next };
        });
    };

    const renderTreeNodes = (nodes: any[], depth = 0) => {
        return nodes.map((node: any) => (
            <div key={node.id} style={{ marginLeft: `${depth * 20}px`, marginY: '4px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                    <input
                        type="checkbox"
                        checked={form.collectionIds.includes(node.id)}
                        onChange={() => handleToggleCollection(node.id)}
                    />
                    <span>{node.name}</span>
                </label>
                {node.children && node.children.length > 0 && renderTreeNodes(node.children, depth + 1)}
            </div>
        ));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        mutationSubmit.mutate(form);
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, backdropFilter: 'blur(4px)'
        }} onClick={onClose}>
            <div style={{
                background: 'white', borderRadius: '16px', width: '90%', maxWidth: '750px', maxHeight: '90vh',
                overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', position: 'relative',
                padding: '24px'
            }} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e5e7eb', paddingBottom: '12px', marginBottom: '16px' }}>
                    <h3 style={{ margin: 0 }}>{isEdit ? 'Modifier le Produit' : 'Créer un Produit'}</h3>
                    <button onClick={onClose} style={{ border: 'none', background: '#f3f4f6', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer' }}>✕</button>
                </div>

                {isLoadingProduct && isEdit ? <div style={{ padding: '20px', textAlign: 'center' }}>Chargement...</div> : (
                    <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '16px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <label style={{ display: 'block' }}>
                                <strong style={{ fontSize: '13px' }}>Nom du produit *</strong>
                                <input required type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', marginTop: '4px' }} />
                            </label>
                            <label style={{ display: 'block' }}>
                                <strong style={{ fontSize: '13px' }}>Vendeur Propriétaire *</strong>
                                <select required value={form.vendorId} onChange={e => setForm({ ...form, vendorId: e.target.value })} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', marginTop: '4px', background: 'white' }}>
                                    <option value="">Sélectionner un vendeur...</option>
                                    {vendors.map(v => (
                                        <option key={v.id} value={v.id}>{v.name}</option>
                                    ))}
                                </select>
                            </label>
                        </div>

                        <label style={{ display: 'block' }}>
                            <strong style={{ fontSize: '13px' }}>Description courte (ex: mini-phrase accrocheuse)</strong>
                            <input type="text" value={form.shortDescription} onChange={e => setForm({ ...form, shortDescription: e.target.value })} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', marginTop: '4px' }} />
                        </label>

                        <label style={{ display: 'block' }}>
                            <strong style={{ fontSize: '13px' }}>Description détaillée *</strong>
                            <textarea required rows={4} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', marginTop: '4px', fontFamily: 'inherit' }} />
                        </label>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <label style={{ display: 'block' }}>
                                <strong style={{ fontSize: '13px' }}>Prix de vente (FCFA) *</strong>
                                <input required type="number" min="0" value={form.price} onChange={e => setForm({ ...form, price: Number(e.target.value) })} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', marginTop: '4px' }} />
                            </label>
                            <label style={{ display: 'block' }}>
                                <strong style={{ fontSize: '13px' }}>Quantité en Stock *</strong>
                                <input required type="number" min="0" value={form.stock} onChange={e => setForm({ ...form, stock: Number(e.target.value) })} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', marginTop: '4px' }} />
                            </label>
                        </div>

                        <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                <input type="checkbox" checked={form.onPromotion} onChange={e => setForm({ ...form, onPromotion: e.target.checked })} />
                                <strong style={{ fontSize: '13px' }}>Ce produit est en promotion</strong>
                            </label>
                            {form.onPromotion && (
                                <label style={{ display: 'block', marginTop: '12px' }}>
                                    <strong style={{ fontSize: '13px' }}>Prix promotionnel (FCFA) *</strong>
                                    <input required type="number" min="0" value={form.promotionalPrice} onChange={e => setForm({ ...form, promotionalPrice: Number(e.target.value) })} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', marginTop: '4px' }} />
                                </label>
                            )}
                        </div>

                        {/* Image Uploads */}
                        <div>
                            <strong style={{ fontSize: '13px', display: 'block', marginBottom: '6px' }}>Images du produit</strong>
                            <input type="file" multiple accept="image/*" onChange={handleFileUpload} style={{ marginBottom: '12px' }} />
                            {uploading && <div style={{ fontSize: '12px', color: '#2563eb' }}>Téléversement en cours...</div>}
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                                {assets.map((asset: any) => (
                                    <div key={asset.id} style={{ position: 'relative', border: form.featuredAssetId === asset.id ? '2px solid #2563eb' : '1px solid #cbd5e1', borderRadius: '6px', padding: '4px' }}>
                                        <img src={asset.preview} alt="preview" style={{ width: '60px', height: '60px', borderRadius: '4px', objectFit: 'cover' }} />
                                        <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                                            <button type="button" onClick={() => setForm(prev => ({ ...prev, featuredAssetId: asset.id }))} style={{ fontSize: '9px', padding: '2px', background: form.featuredAssetId === asset.id ? '#2563eb' : '#f3f4f6', color: form.featuredAssetId === asset.id ? 'white' : 'black', border: 'none', borderRadius: '3px', cursor: 'pointer' }}>★</button>
                                            <button type="button" onClick={() => {
                                                setAssets(prev => prev.filter(x => x.id !== asset.id));
                                                setForm(prev => {
                                                    const nextIds = prev.assetIds.filter(id => id !== asset.id);
                                                    return {
                                                        ...prev,
                                                        assetIds: nextIds,
                                                        featuredAssetId: prev.featuredAssetId === asset.id ? nextIds[0] || '' : prev.featuredAssetId
                                                    };
                                                });
                                            }} style={{ fontSize: '9px', padding: '2px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' }}>✕</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Collection Category Tree */}
                        <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '16px' }}>
                            <strong style={{ fontSize: '13px', display: 'block', marginBottom: '8px' }}>Catégories / Collections de Destination</strong>
                            <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #cbd5e1', padding: '12px', borderRadius: '6px' }}>
                                {collectionTree.length > 0 ? renderTreeNodes(collectionTree) : <div style={{ fontStyle: 'italic', fontSize: '13px', color: '#64748b' }}>Aucune collection trouvée.</div>}
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', borderTop: '1px solid #e5e7eb', paddingTop: '16px', marginTop: '8px' }}>
                            <button type="button" onClick={onClose} style={{ padding: '10px 20px', borderRadius: '6px', border: '1px solid #cbd5e1', background: 'white', cursor: 'pointer' }}>Annuler</button>
                            <button type="submit" disabled={mutationSubmit.isPending} style={{ padding: '10px 20px', borderRadius: '6px', border: 'none', background: '#2563eb', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>
                                {mutationSubmit.isPending ? 'Enregistrement...' : 'Enregistrer'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}

// --- Main List Component ---
export function ProductListComponent() {
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedVendorId, setSelectedVendorId] = useState('');
    const [approvalStatus, setApprovalStatus] = useState('');
    const [page, setPage] = useState(1);
    const pageSize = 10;

    const [togglingId, setTogglingId] = useState<string | null>(null);
    const [reassigningProductId, setReassigningProductId] = useState<string | null>(null);
    const [selectedNewVendorId, setSelectedNewVendorId] = useState('');

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingProductId, setEditingProductId] = useState<string | null>(null);

    // Queries
    const { data: vendorsData } = useQuery({
        queryKey: ['vendorsList'],
        queryFn: () => fetchGraphQL(GET_VENDORS_LIST)
    });
    const vendorsList = vendorsData?.vendors?.items || [];

    const queryVariables = {
        options: {
            take: pageSize,
            skip: (page - 1) * pageSize,
            sort: { createdAt: 'DESC' },
            filter: {} as any
        }
    };

    if (searchTerm) queryVariables.options.filter.name = { contains: searchTerm };
    if (selectedVendorId) queryVariables.options.filter.vendorId = { eq: selectedVendorId };
    if (approvalStatus) queryVariables.options.filter.approvalStatus = { eq: approvalStatus };

    const { data: productsData, isLoading, error } = useQuery({
        queryKey: ['products', page, searchTerm, selectedVendorId, approvalStatus],
        queryFn: () => fetchGraphQL(GET_PRODUCTS, queryVariables)
    });

    const { items: products = [], totalItems = 0 } = productsData?.products || {};
    const totalPages = Math.ceil(totalItems / pageSize);

    // Mutations
    const approveMutation = useMutation({
        mutationFn: (variables: { id: string; enabled: boolean; approvalStatus: string; rejectionReason: string }) =>
            fetchGraphQL(UPDATE_PRODUCT_APPROVAL, {
                input: {
                    id: variables.id,
                    enabled: variables.enabled,
                    customFields: {
                        approvalStatus: variables.approvalStatus,
                        rejectionReason: variables.rejectionReason
                    }
                }
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
            setTogglingId(null);
        },
        onError: (err: any) => {
            alert(err.message || 'Erreur lors de la modération');
            setTogglingId(null);
        }
    });

    const reassignProductMutation = useMutation({
        mutationFn: ({ productId, vendorId }: { productId: string; vendorId: string }) =>
            fetchGraphQL(REASSIGN_PRODUCT, {
                input: {
                    id: productId,
                    customFields: {
                        vendor: vendorId ? { id: vendorId } : null
                    }
                }
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
            setReassigningProductId(null);
            setSelectedNewVendorId('');
            alert('Produit réassigné avec succès!');
        },
        onError: (err: any) => {
            alert(err.message || 'Erreur lors de la réassignation');
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => fetchGraphQL(
            `mutation DeleteProduct($id: ID!) {
                deleteProduct(id: $id) {
                    result
                    message
                }
            }`,
            { id }
        ),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
            alert('Produit supprimé définitivement.');
            setTogglingId(null);
        },
        onError: (err: any) => {
            alert(err.message || 'Erreur de suppression');
            setTogglingId(null);
        }
    });

    const handleApprove = (product: Product) => {
        setTogglingId(product.id);
        approveMutation.mutate({
            id: product.id,
            enabled: true,
            approvalStatus: 'approved',
            rejectionReason: ''
        });
    };

    const handleReject = (product: Product) => {
        const reason = prompt('Saisir le motif du refus / désactivation du produit :');
        if (reason === null) return;
        setTogglingId(product.id);
        approveMutation.mutate({
            id: product.id,
            enabled: false,
            approvalStatus: 'rejected',
            rejectionReason: reason
        });
    };

    const handleReassign = () => {
        if (!reassigningProductId) return;
        reassignProductMutation.mutate({
            productId: reassigningProductId,
            vendorId: selectedNewVendorId
        });
    };

    const handleDelete = (product: Product) => {
        if (!confirm(`Êtes-vous sûr de vouloir supprimer définitivement le produit "${product.name}" ? Cette action est irréversible.`)) return;
        setTogglingId(product.id);
        deleteMutation.mutate(product.id);
    };

    const renderPriceRange = (product: Product) => {
        if (!product.variants || product.variants.length === 0) return 'N/A';
        const prices = product.variants.map(v => v.price);
        const min = Math.min(...prices);
        const max = Math.max(...prices);
        const currency = product.variants[0].currencyCode === 'USD' ? '$' : 'FCFA';

        const hasAnyPromo = (product.variants as any).some((v: any) => v.customFields?.onPromotion && v.customFields?.promotionalPrice);
        if (min === max) {
            return <strong style={{ color: hasAnyPromo ? '#059669' : '#0f172a' }}>{min.toFixed(0)} {currency}</strong>;
        }
        return <strong style={{ color: hasAnyPromo ? '#059669' : '#0f172a' }}>{min.toFixed(0)} - {max.toFixed(0)} {currency}</strong>;
    };

    return (
        <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif' }}>
            <CreateEditProductModal 
                isOpen={isCreateOpen || !!editingProductId} 
                productId={editingProductId} 
                onClose={() => { setIsCreateOpen(false); setEditingProductId(null); }} 
                vendors={vendorsList}
            />

            <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#111827', margin: 0 }}>📦 Produits Marketplace</h1>
                    <p style={{ color: '#6b7280', marginTop: '4px', fontSize: '14px' }}>Visualisez, filtrez, modifiez et modérez les produits de tous les vendeurs.</p>
                </div>
                <button 
                    onClick={() => setIsCreateOpen(true)}
                    style={{ background: '#2563eb', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}
                >
                    + Créer un Produit
                </button>
            </div>

            {/* Minimal Price Manager */}
            <MinimalPriceManager />

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
                        onChange={e => {
                            setSearchTerm(e.target.value);
                            setPage(1);
                        }}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '14px' }}
                    />
                </div>
                <div style={{ flex: 1, minWidth: '200px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#4b5563', marginBottom: '6px' }}>Filtrer par Vendeur</label>
                    <select
                        value={selectedVendorId}
                        onChange={e => {
                            setSelectedVendorId(e.target.value);
                            setPage(1);
                        }}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '14px', background: 'white' }}
                    >
                        <option value="">Tous les vendeurs</option>
                        {vendorsList.map((v: any) => (
                            <option key={v.id} value={v.id}>{v.name}</option>
                        ))}
                    </select>
                </div>
                <div style={{ flex: 1, minWidth: '200px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#4b5563', marginBottom: '6px' }}>Statut de validation</label>
                    <select
                        value={approvalStatus}
                        onChange={e => {
                            setApprovalStatus(e.target.value);
                            setPage(1);
                        }}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '14px', background: 'white' }}
                    >
                        <option value="">Tous les statuts</option>
                        <option value="pending">En attente (Non modérés)</option>
                        <option value="approved">Approuvés (Publiés)</option>
                        <option value="rejected">Refusés (Rejetés)</option>
                    </select>
                </div>
            </div>

            {/* Table layout */}
            {isLoading ? <div style={{ textAlign: 'center', padding: '40px' }}>Chargement...</div> : error ? <div style={{ color: 'red' }}>Erreur: {(error as Error).message}</div> : (
                <>
                    <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                            <thead>
                                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e5e7eb', color: '#4b5563', fontWeight: 600 }}>
                                    <th style={{ padding: '14px 16px' }}>Produit</th>
                                    <th style={{ padding: '14px 16px' }}>Vendeur</th>
                                    <th style={{ padding: '14px 16px' }}>Prix</th>
                                    <th style={{ padding: '14px 16px' }}>Stock / Promo</th>
                                    <th style={{ padding: '14px 16px' }}>Statut de Modération</th>
                                    <th style={{ padding: '14px 16px', textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {products.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} style={{ padding: '30px', textAlign: 'center', color: '#6b7280', fontStyle: 'italic' }}>Aucun produit trouvé</td>
                                    </tr>
                                ) : (
                                    products.map((product: Product) => (
                                        <tr key={product.id} style={{ borderBottom: '1px solid #f3f4f6', transition: 'background-color 0.1s' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f9fafb'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                                            <td style={{ padding: '14px 16px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <div style={{ width: '48px', height: '48px', borderRadius: '8px', background: '#eee', backgroundImage: product.featuredAsset ? `url(${product.featuredAsset.preview})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center', flexShrink: 0 }} />
                                                    <div>
                                                        <div style={{ fontWeight: 600, color: '#111827' }}>{product.name}</div>
                                                        <div style={{ fontSize: '12px', color: '#9ca3af', fontFamily: 'monospace', marginTop: '2px' }}>ID: {product.id}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ padding: '14px 16px' }}>
                                                {product.customFields?.vendor ? (
                                                    <div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                            <span style={{ fontWeight: 500, color: '#374151' }}>{product.customFields.vendor.name}</span>
                                                            <span style={{ 
                                                                fontSize: '10px', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold',
                                                                background: product.customFields.vendor.status === 'APPROVED' ? '#dcfce7' : product.customFields.vendor.status === 'PENDING' ? '#fef9c3' : '#fee2e2',
                                                                color: product.customFields.vendor.status === 'APPROVED' ? '#166534' : product.customFields.vendor.status === 'PENDING' ? '#854d0e' : '#991b1b'
                                                            }}>
                                                                {product.customFields.vendor.status === 'APPROVED' ? 'Approuvé' : product.customFields.vendor.status === 'PENDING' ? 'En attente' : 'Suspendu'}
                                                            </span>
                                                        </div>
                                                        <div style={{ fontSize: '12px', color: '#6b7280' }}>Zone: {product.customFields.vendor.zone || 'N/A'}</div>
                                                    </div>
                                                ) : (
                                                    <span style={{ color: '#9ca3af', fontStyle: 'italic', fontSize: '13px' }}>Aucun vendeur</span>
                                                )}
                                            </td>
                                            <td style={{ padding: '14px 16px' }}>
                                                {renderPriceRange(product)}
                                            </td>
                                            <td style={{ padding: '14px 16px' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                    <div>Stock: <strong>{product.variants?.[0]?.stockLevel || '0'}</strong></div>
                                                    {(() => {
                                                        const isPromo = (product.variants as any)?.[0]?.customFields?.onPromotion;
                                                        const promoPrice = (product.variants as any)?.[0]?.customFields?.promotionalPrice;
                                                        if (isPromo && promoPrice) {
                                                            return (
                                                                <span style={{ fontSize: '11px', background: '#d1fae5', color: '#065f46', padding: '2px 6px', borderRadius: '4px', width: 'fit-content', fontWeight: 'bold' }}>
                                                                    Promo: {promoPrice.toLocaleString()} FCFA
                                                                </span>
                                                            );
                                                        }
                                                        return null;
                                                    })()}
                                                </div>
                                            </td>
                                            <td style={{ padding: '14px 16px' }}>
                                                {(() => {
                                                    const status = product.customFields?.approvalStatus || 'pending';
                                                    let bg = '#fee2e2';
                                                    let fg = '#991b1b';
                                                    let label = 'Refusé / Désactivé';
                                                    if (status === 'pending') {
                                                        bg = '#fef9c3';
                                                        fg = '#854d0e';
                                                        label = 'En attente';
                                                    } else if (status === 'approved') {
                                                        bg = '#dcfce7';
                                                        fg = '#166534';
                                                        label = 'Approuvé / En ligne';
                                                    }
                                                    return (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                            <span style={{
                                                                background: bg,
                                                                color: fg,
                                                                fontSize: '12px',
                                                                fontWeight: 700,
                                                                padding: '4px 10px',
                                                                borderRadius: '9999px',
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
                                                    {/* Bouton de réassignation */}
                                                    <button
                                                        onClick={() => setReassigningProductId(product.id)}
                                                        disabled={togglingId === product.id}
                                                        style={{
                                                            padding: '6px 12px',
                                                            borderRadius: '6px',
                                                            background: '#f3f4f6',
                                                            color: '#4b5563',
                                                            border: '1px solid #d1d5db',
                                                            fontWeight: 600,
                                                            fontSize: '12px',
                                                            cursor: togglingId === product.id ? 'not-allowed' : 'pointer'
                                                        }}
                                                    >
                                                        Réassigner
                                                    </button>
                                                    {/* Custom Edit Overlay */}
                                                    <button
                                                        onClick={() => setEditingProductId(product.id)}
                                                        disabled={togglingId === product.id}
                                                        style={{
                                                            padding: '6px 12px',
                                                            borderRadius: '6px',
                                                            background: 'white',
                                                            color: '#2563eb',
                                                            border: '1px solid #cbd5e1',
                                                            fontWeight: 600,
                                                            fontSize: '12px',
                                                            cursor: togglingId === product.id ? 'not-allowed' : 'pointer'
                                                        }}
                                                    >
                                                        Modifier
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(product)}
                                                        disabled={togglingId === product.id}
                                                        style={{
                                                            padding: '6px 12px',
                                                            borderRadius: '6px',
                                                            background: '#ef4444',
                                                            color: 'white',
                                                            border: 'none',
                                                            cursor: togglingId === product.id ? 'not-allowed' : 'pointer',
                                                            fontWeight: 600,
                                                            fontSize: '12px',
                                                            transition: 'opacity 0.1s'
                                                        }}
                                                        title="Supprimer définitivement le produit"
                                                    >
                                                        {togglingId === product.id ? '...' : 'Supprimer'}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Modal de réassignation */}
                    {reassigningProductId && (
                        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                            <div style={{ background: 'white', padding: '24px', borderRadius: '12px', width: '400px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                                <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '18px', fontWeight: 600 }}>Réassigner ce produit</h3>
                                <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '16px' }}>Sélectionnez un nouveau vendeur pour ce produit. L'ancien vendeur perdra le contrôle de ce produit.</p>
                                <select 
                                    value={selectedNewVendorId} 
                                    onChange={(e) => setSelectedNewVendorId(e.target.value)}
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '16px', fontSize: '14px' }}
                                >
                                    <option value="">-- Aucun Vendeur (Retirer) --</option>
                                    {vendorsList.map((v: any) => (
                                        <option key={v.id} value={v.id}>{v.name}</option>
                                    ))}
                                </select>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                                    <button 
                                        onClick={() => { setReassigningProductId(null); setSelectedNewVendorId(''); }}
                                        style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #e5e7eb', background: 'white', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}
                                    >
                                        Annuler
                                    </button>
                                    <button 
                                        onClick={handleReassign}
                                        disabled={reassignProductMutation.isPending}
                                        style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#3b82f6', color: 'white', cursor: reassignProductMutation.isPending ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: '13px' }}
                                    >
                                        {reassignProductMutation.isPending ? 'En cours...' : 'Confirmer'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

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
