import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { GET_COLLECTIONS } from './queries';

// --- Interfaces ---
export interface SellerOfferItem {
    id: string;
    createdAt?: string;
    price: number;
    stock: number;
    sku?: string;
    onPromotion?: boolean;
    promotionalPrice?: number;
    deliveryTimeValue?: number;
    deliveryTimeUnit?: string;
    condition?: string;
    status?: string;
    rejectionReason?: string;
    vendor?: {
        id: string;
        name: string;
        status?: string;
        logo?: { preview: string };
    };
    productVariant?: {
        id: string;
        name?: string;
        sku?: string;
    };
}

export interface VariantItem {
    id: string;
    name?: string;
    sku?: string;
    price: number;
    priceWithTax?: number;
    currencyCode?: string;
    stockOnHand?: number;
    stockLevel?: string;
    customFields?: {
        onPromotion?: boolean;
        promotionalPrice?: number;
        compareAtPrice?: number;
    };
    options?: Array<{
        id: string;
        code: string;
        name?: string;
        group?: { name: string };
    }>;
    sellerOffers?: SellerOfferItem[];
}

export interface MarketplaceProduct {
    id: string;
    createdAt: string;
    updatedAt?: string;
    name: string;
    slug: string;
    enabled: boolean;
    description?: string;
    featuredAsset?: { id?: string; preview: string };
    assets?: Array<{ id: string; preview: string }>;
    collections?: Array<{ id: string; name: string; slug?: string }>;
    customFields?: {
        vendor?: {
            id: string;
            name: string;
            status: string;
            zone?: string;
            logo?: { preview: string };
        };
        approvalStatus?: string;
        rejectionReason?: string;
        shortDescription?: string;
    };
    variants: VariantItem[];
    optionGroups?: Array<{
        id: string;
        name: string;
        code: string;
        options: Array<{ id: string; name: string; code: string }>;
    }>;
}

// --- GraphQL Queries & Mutations ---
const GET_MARKETPLACE_PRODUCTS = `
    query GetMarketplaceProducts($options: ProductListOptions) {
        products(options: $options) {
            items {
                id
                createdAt
                updatedAt
                name
                slug
                enabled
                description
                featuredAsset {
                    id
                    preview
                }
                assets {
                    id
                    preview
                }
                collections {
                    id
                    name
                    slug
                }
                optionGroups {
                    id
                    name
                    code
                    options {
                        id
                        name
                        code
                    }
                }
                customFields {
                    vendor {
                        id
                        name
                        status
                        zone
                        logo {
                            preview
                        }
                    }
                    approvalStatus
                    rejectionReason
                    shortDescription
                }
                variants {
                    id
                    sku
                    price
                    currencyCode
                    stockLevel
                    customFields {
                        onPromotion
                        promotionalPrice
                        compareAtPrice
                    }
                }
            }
            totalItems
        }
    }
`;

const GET_VENDORS_LIST = `
    query GetVendorsList {
        vendors(options: { take: 200 }) {
            items {
                id
                name
                status
                logo {
                    preview
                }
            }
        }
    }
`;

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
        }
    }
`;

const UPDATE_PRODUCT_APPROVAL = `
    mutation UpdateProductApproval($input: UpdateProductInput!) {
        updateProduct(input: $input) {
            id
            enabled
            customFields {
                approvalStatus
                rejectionReason
            }
        }
    }
`;

const DELETE_PRODUCT = `
    mutation DeleteProduct($id: ID!) {
        deleteProduct(id: $id) {
            result
            message
        }
    }
`;

const ADMIN_UPDATE_PRODUCT = `
    mutation AdminUpdateProduct($id: ID!, $input: UpdateVendorProductInput!) {
        adminUpdateProduct(id: $id, input: $input) {
            id
            name
            slug
            enabled
        }
    }
`;

const GET_SELLER_OFFERS_FOR_PRODUCT = `
    query GetSellerOffersForProduct($productId: ID!) {
        sellerOffersForProduct(productId: $productId) {
            id
            price
            stock
            sku
            deliveryTimeValue
            deliveryTimeUnit
            condition
            onPromotion
            promotionalPrice
            featuredAssetId
            status
            rejectionReason
            vendor {
                id
                name
                logo {
                    preview
                }
            }
            productVariant {
                id
                name
                sku
            }
        }
    }
`;

const ADMIN_REVIEW_SELLER_OFFER = `
    mutation AdminReviewSellerOffer($id: ID!, $status: String!, $rejectionReason: String) {
        adminReviewSellerOffer(id: $id, status: $status, rejectionReason: $rejectionReason) {
            id
            status
            rejectionReason
        }
    }
`;

const ADMIN_REVIEW_PRODUCT = `
    mutation AdminReviewProduct($id: ID!, $status: String!, $rejectionReason: String, $convertToOfficialCatalog: Boolean) {
        adminReviewProduct(id: $id, status: $status, rejectionReason: $rejectionReason, convertToOfficialCatalog: $convertToOfficialCatalog) {
            id
            enabled
            customFields {
                approvalStatus
                rejectionReason
            }
        }
    }
`;

// Helper GraphQL Fetcher
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

export function ProductListComponent() {
    const queryClient = useQueryClient();

    // Active View Tab: 'all' | 'official' | 'vendor_proposals' | 'pending' | 'settings'
    const [activeTab, setActiveTab] = useState<'all' | 'official' | 'vendor_proposals' | 'pending' | 'settings'>('all');

    // Search and Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [selectedVendor, setSelectedVendor] = useState('all');
    const [selectedStatus, setSelectedStatus] = useState('all');
    const [expandedProductId, setExpandedProductId] = useState<string | null>(null);

    // Modal state for Approval Review
    const [reviewProduct, setReviewProduct] = useState<MarketplaceProduct | null>(null);
    const [reviewDecision, setReviewDecision] = useState<'approved_official' | 'approved_vendor' | 'rejected'>('approved_official');
    const [rejectionReasonInput, setRejectionReasonInput] = useState('');
    const [isSubmittingReview, setIsSubmittingReview] = useState(false);

    // Modal state for Editing Ahizan Product
    const [editingProduct, setEditingProduct] = useState<MarketplaceProduct | null>(null);
    const [editFormData, setEditFormData] = useState<{
        name: string;
        slug: string;
        description: string;
        shortDescription: string;
        collectionIds: string[];
        enabled: boolean;
    }>({
        name: '',
        slug: '',
        description: '',
        shortDescription: '',
        collectionIds: [],
        enabled: true,
    });
    const [isSavingProduct, setIsSavingProduct] = useState(false);

    // Seller Offers state & handlers
    const [offersMap, setOffersMap] = useState<Record<string, any[]>>({});
    const [loadingOffersProductId, setLoadingOffersProductId] = useState<string | null>(null);
    const [commentingOfferId, setCommentingOfferId] = useState<string | null>(null);
    const [offerCommentInput, setOfferCommentInput] = useState('');
    const [isSavingOfferReview, setIsSavingOfferReview] = useState(false);

    const handleToggleExpandProduct = async (productId: string) => {
        if (expandedProductId === productId) {
            setExpandedProductId(null);
        } else {
            setExpandedProductId(productId);
            if (!offersMap[productId]) {
                setLoadingOffersProductId(productId);
                try {
                    const data = await fetchGraphQL(GET_SELLER_OFFERS_FOR_PRODUCT, { productId });
                    if (data?.sellerOffersForProduct) {
                        setOffersMap(prev => ({ ...prev, [productId]: data.sellerOffersForProduct }));
                    }
                } catch (err) {
                    console.error('Failed to load seller offers:', err);
                } finally {
                    setLoadingOffersProductId(null);
                }
            }
        }
    };

    const handleReviewOffer = async (offerId: string, productId: string, status: string, rejectionReason?: string) => {
        setIsSavingOfferReview(true);
        try {
            await fetchGraphQL(ADMIN_REVIEW_SELLER_OFFER, {
                id: offerId,
                status,
                rejectionReason: rejectionReason || undefined,
            });
            const data = await fetchGraphQL(GET_SELLER_OFFERS_FOR_PRODUCT, { productId });
            if (data?.sellerOffersForProduct) {
                setOffersMap(prev => ({ ...prev, [productId]: data.sellerOffersForProduct }));
            }
            setCommentingOfferId(null);
            setOfferCommentInput('');
            alert(status === 'approved' ? 'Offre approuvée avec succès !' : 'Remarque envoyée au vendeur avec succès !');
        } catch (err: any) {
            alert('Erreur: ' + err.message);
        } finally {
            setIsSavingOfferReview(false);
        }
    };

    // Fetch Products
    const { data: productsData, isLoading: isLoadingProducts, error: productsError } = useQuery({
        queryKey: ['marketplaceProducts'],
        queryFn: () => fetchGraphQL(GET_MARKETPLACE_PRODUCTS, { options: { take: 500, sort: { createdAt: 'DESC' } } }),
    });

    // Fetch Collections
    const { data: collectionsData } = useQuery({
        queryKey: ['collections'],
        queryFn: () => fetchGraphQL(GET_COLLECTIONS, { options: { take: 200 } }),
    });

    // Fetch Vendors
    const { data: vendorsData } = useQuery({
        queryKey: ['vendorsList'],
        queryFn: () => fetchGraphQL(GET_VENDORS_LIST),
    });

    // Fetch Global Settings
    const { data: globalSettingsData } = useQuery({
        queryKey: ['globalSettings'],
        queryFn: () => fetchGraphQL(GET_GLOBAL_SETTINGS),
    });

    const products: MarketplaceProduct[] = productsData?.products?.items || [];
    const collections = collectionsData?.collections?.items || [];
    const vendors = vendorsData?.vendors?.items || [];
    const minPrice = globalSettingsData?.globalSettings?.customFields?.minimumMarketplacePrice ?? 0;

    // KPI Metrics calculation
    const metrics = useMemo(() => {
        const totalProducts = products.length;
        const officialCount = products.filter(p => !p.customFields?.vendor || p.customFields.vendor.name === 'Ahizan').length;
        const vendorProposalCount = products.filter(p => !!p.customFields?.vendor && p.customFields.vendor.name !== 'Ahizan').length;
        const pendingProducts = products.filter(p => (p.customFields?.approvalStatus || 'approved') === 'pending').length;
        const approvedProducts = products.filter(p => (p.customFields?.approvalStatus || 'approved') === 'approved').length;
        const totalVariants = products.reduce((acc, p) => acc + (p.variants?.length || 0), 0);

        return {
            totalProducts,
            officialCount,
            vendorProposalCount,
            pendingProducts,
            approvedProducts,
            totalVariants,
        };
    }, [products]);

    // Filtered Products
    const filteredProducts = useMemo(() => {
        return products.filter(p => {
            const approvalStatus = p.customFields?.approvalStatus || 'approved';
            const vendorId = p.customFields?.vendor?.id || '';
            const isVendorProposal = !!p.customFields?.vendor && p.customFields.vendor.name !== 'Ahizan';

            // Tab restriction
            if (activeTab === 'pending' && approvalStatus !== 'pending') {
                return false;
            }
            if (activeTab === 'official' && isVendorProposal) {
                return false;
            }
            if (activeTab === 'vendor_proposals' && !isVendorProposal) {
                return false;
            }

            // Search query filter
            if (searchTerm.trim()) {
                const term = searchTerm.toLowerCase();
                const matchName = p.name.toLowerCase().includes(term);
                const matchSku = p.variants?.some(v => v.sku?.toLowerCase().includes(term));
                const matchVendor = p.customFields?.vendor?.name?.toLowerCase().includes(term);
                if (!matchName && !matchSku && !matchVendor) return false;
            }

            // Category filter
            if (selectedCategory !== 'all') {
                const hasCategory = p.collections?.some(c => c.id === selectedCategory || c.name === selectedCategory);
                if (!hasCategory) return false;
            }

            // Vendor filter
            if (selectedVendor !== 'all') {
                if (selectedVendor === 'ahizan_official') {
                    if (vendorId) return false;
                } else if (vendorId !== selectedVendor) {
                    return false;
                }
            }

            // Status filter
            if (selectedStatus !== 'all' && approvalStatus !== selectedStatus) {
                return false;
            }

            return true;
        });
    }, [products, activeTab, searchTerm, selectedCategory, selectedVendor, selectedStatus]);

    // Approval / Moderation Mutation
    const approvalMutation = useMutation({
        mutationFn: ({ id, approvalStatus, rejectionReason, convertToOfficialCatalog }: { id: string; approvalStatus: string; rejectionReason?: string; convertToOfficialCatalog?: boolean }) =>
            fetchGraphQL(ADMIN_REVIEW_PRODUCT, {
                id,
                status: approvalStatus,
                rejectionReason: rejectionReason || null,
                convertToOfficialCatalog: !!convertToOfficialCatalog,
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['marketplaceProducts'] });
            setReviewProduct(null);
            setIsSubmittingReview(false);
        },
        onError: (err: any) => {
            alert('Erreur lors de la modération: ' + err.message);
            setIsSubmittingReview(false);
        },
    });

    // Delete Product Mutation
    const deleteMutation = useMutation({
        mutationFn: (id: string) => fetchGraphQL(DELETE_PRODUCT, { id }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['marketplaceProducts'] });
        },
        onError: (err: any) => {
            alert('Erreur lors de la suppression: ' + err.message);
        },
    });

    // Quick Action Handlers
    const handleQuickApprove = (product: MarketplaceProduct) => {
        if (confirm(`Adopter et publier "${product.name}" au catalogue officiel Ahizan (greffage automatique de l'offre vendeur) ?`)) {
            approvalMutation.mutate({
                id: product.id,
                approvalStatus: 'approved',
                convertToOfficialCatalog: true,
                rejectionReason: '',
            });
        }
    };

    const handleOpenReview = (product: MarketplaceProduct) => {
        setReviewProduct(product);
        setReviewDecision(product.customFields?.approvalStatus === 'rejected' ? 'rejected' : 'approved_official');
        setRejectionReasonInput(product.customFields?.rejectionReason || '');
    };

    const handleSubmitReview = (e: React.FormEvent) => {
        e.preventDefault();
        if (!reviewProduct) return;

        if (reviewDecision === 'rejected' && !rejectionReasonInput.trim()) {
            alert('Veuillez indiquer un motif de refus pour informer le vendeur.');
            return;
        }

        setIsSubmittingReview(true);
        approvalMutation.mutate({
            id: reviewProduct.id,
            approvalStatus: reviewDecision === 'rejected' ? 'rejected' : 'approved',
            convertToOfficialCatalog: reviewDecision === 'approved_official',
            rejectionReason: reviewDecision === 'rejected' ? rejectionReasonInput : '',
        });
    };

    const handleDeleteProduct = (product: MarketplaceProduct) => {
        if (confirm(`Êtes-vous sûr de vouloir supprimer définitivement "${product.name}" ? Cette action est irréversible.`)) {
            deleteMutation.mutate(product.id);
        }
    };

    const handleOpenEditProduct = (product: MarketplaceProduct) => {
        setEditingProduct(product);
        setEditFormData({
            name: product.name || '',
            slug: product.slug || '',
            description: product.description || '',
            shortDescription: product.customFields?.shortDescription || '',
            collectionIds: (product.collections || []).map(c => c.id),
            enabled: product.enabled !== false,
        });
    };

    const handleSaveProductEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingProduct) return;
        setIsSavingProduct(true);
        try {
            await fetchGraphQL(ADMIN_UPDATE_PRODUCT, {
                id: editingProduct.id,
                input: {
                    name: editFormData.name,
                    slug: editFormData.slug,
                    description: editFormData.description,
                    shortDescription: editFormData.shortDescription,
                    collectionIds: editFormData.collectionIds,
                    enabled: editFormData.enabled,
                }
            });
            await queryClient.invalidateQueries({ queryKey: ['marketplaceProducts'] });
            setEditingProduct(null);
            alert('Fiche produit Ahizan mise à jour avec succès !');
        } catch (err: any) {
            console.error('Error updating Ahizan product:', err);
            alert('Erreur lors de la modification : ' + err.message);
        } finally {
            setIsSavingProduct(false);
        }
    };

    // Minimum Price Setting Mutation
    const [minPriceInput, setMinPriceInput] = useState<string>('');
    const [isSavingMinPrice, setIsSavingMinPrice] = useState(false);

    const minPriceMutation = useMutation({
        mutationFn: (price: number) => fetchGraphQL(UPDATE_GLOBAL_SETTINGS, {
            input: {
                customFields: {
                    minimumMarketplacePrice: price,
                },
            },
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['globalSettings'] });
            setIsSavingMinPrice(false);
            alert('Prix minimum marketplace mis à jour avec succès !');
        },
        onError: (err: any) => {
            setIsSavingMinPrice(false);
            alert('Erreur: ' + err.message);
        },
    });

    const handleSaveMinPrice = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSavingMinPrice(true);
        minPriceMutation.mutate(Number(minPriceInput || minPrice));
    };

    return (
        <div style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', color: '#0f172a', padding: '24px', maxWidth: '1600px', margin: '0 auto' }}>
            
            {/* ── 1. HEADER & ACTIONS ── */}
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', marginBottom: '24px' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ background: '#0f172a', color: '#ffffff', width: '38px', height: '38px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 900 }}>
                            🛍️
                        </div>
                        <div>
                            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 900, letterSpacing: '-0.02em', color: '#0f172a' }}>
                                Produits Marketplace &amp; Offres
                            </h1>
                            <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: '#64748b', fontWeight: 500 }}>
                                Gestion centralisée du catalogue Ahizan, des déclinaisons et des offres marchands greffées.
                            </p>
                        </div>
                    </div>
                </div>

                {/* View Tabs */}
                <div style={{ display: 'flex', gap: '6px', background: '#f1f5f9', padding: '4px', borderRadius: '12px', border: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
                    <button
                        onClick={() => setActiveTab('all')}
                        style={{
                            padding: '8px 14px', borderRadius: '8px', border: 'none', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                            background: activeTab === 'all' ? '#ffffff' : 'transparent',
                            color: activeTab === 'all' ? '#0f172a' : '#64748b',
                            boxShadow: activeTab === 'all' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                            transition: 'all 0.2s',
                        }}
                    >
                        📦 Tous ({metrics.totalProducts})
                    </button>
                    <button
                        onClick={() => setActiveTab('official')}
                        style={{
                            padding: '8px 14px', borderRadius: '8px', border: 'none', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                            background: activeTab === 'official' ? '#ffffff' : 'transparent',
                            color: activeTab === 'official' ? '#2563eb' : '#64748b',
                            boxShadow: activeTab === 'official' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                            transition: 'all 0.2s',
                        }}
                    >
                        🏛️ Catalogue Officiel Ahizan ({metrics.officialCount})
                    </button>
                    <button
                        onClick={() => setActiveTab('vendor_proposals')}
                        style={{
                            padding: '8px 14px', borderRadius: '8px', border: 'none', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                            background: activeTab === 'vendor_proposals' ? '#ffffff' : 'transparent',
                            color: activeTab === 'vendor_proposals' ? '#d97706' : '#64748b',
                            boxShadow: activeTab === 'vendor_proposals' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                            transition: 'all 0.2s',
                        }}
                    >
                        🏪 Propositions Vendeurs ({metrics.vendorProposalCount})
                    </button>
                    <button
                        onClick={() => setActiveTab('pending')}
                        style={{
                            padding: '8px 14px', borderRadius: '8px', border: 'none', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
                            background: activeTab === 'pending' ? '#ffffff' : 'transparent',
                            color: activeTab === 'pending' ? '#dc2626' : '#64748b',
                            boxShadow: activeTab === 'pending' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                            transition: 'all 0.2s',
                        }}
                    >
                        ⏳ À valider
                        {metrics.pendingProducts > 0 && (
                            <span style={{ background: '#dc2626', color: '#ffffff', fontSize: '10px', fontWeight: 900, padding: '1px 6px', borderRadius: '10px' }}>
                                {metrics.pendingProducts}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('settings')}
                        style={{
                            padding: '8px 14px', borderRadius: '8px', border: 'none', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                            background: activeTab === 'settings' ? '#ffffff' : 'transparent',
                            color: activeTab === 'settings' ? '#0f172a' : '#64748b',
                            boxShadow: activeTab === 'settings' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                            transition: 'all 0.2s',
                        }}
                    >
                        ⚙️ Paramètres
                    </button>
                </div>
            </div>

            {/* ── 2. KPI SUMMARY CARDS ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '16px 20px', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                    <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em' }}>Catalogue Ahizan</div>
                    <div style={{ fontSize: '26px', fontWeight: 900, color: '#0f172a', marginTop: '4px' }}>{metrics.totalProducts}</div>
                    <div style={{ fontSize: '11px', color: '#16a34a', fontWeight: 700, marginTop: '2px' }}>{metrics.approvedProducts} produits en ligne</div>
                </div>
                <div style={{ background: metrics.pendingProducts > 0 ? '#fffbeb' : '#ffffff', border: metrics.pendingProducts > 0 ? '1px solid #fde68a' : '1px solid #e2e8f0', borderRadius: '16px', padding: '16px 20px', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                    <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: metrics.pendingProducts > 0 ? '#b45309' : '#64748b', letterSpacing: '0.05em' }}>En Attente d'Approbation</div>
                    <div style={{ fontSize: '26px', fontWeight: 900, color: metrics.pendingProducts > 0 ? '#d97706' : '#0f172a', marginTop: '4px' }}>{metrics.pendingProducts}</div>
                    <div style={{ fontSize: '11px', color: '#b45309', fontWeight: 700, marginTop: '2px' }}>Nouveaux articles soumis par les vendeurs</div>
                </div>
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '16px 20px', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                    <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em' }}>Déclinaisons &amp; Combinaisons</div>
                    <div style={{ fontSize: '26px', fontWeight: 900, color: '#0f172a', marginTop: '4px' }}>{metrics.totalVariants}</div>
                    <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, marginTop: '2px' }}>Variantes actives créées sur la plateforme</div>
                </div>
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '16px 20px', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                    <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em' }}>Prix Minimum Garanti</div>
                    <div style={{ fontSize: '26px', fontWeight: 900, color: '#0f172a', marginTop: '4px' }}>{minPrice.toLocaleString('fr-FR')} <span style={{ fontSize: '14px', fontWeight: 700, color: '#64748b' }}>FCFA</span></div>
                    <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, marginTop: '2px' }}>Seuil minimal autorisé à la vente</div>
                </div>
            </div>

            {/* ── 3. TAB CONTENT: SETTINGS TAB ── */}
            {activeTab === 'settings' && (
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '28px', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 16px 0' }}>Configuration du Marché &amp; Prix Minimum</h2>
                    <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 20px 0', maxWidth: '600px' }}>
                        Définissez le montant minimal en FCFA auquel un vendeur peut créer une offre sur le catalogue Ahizan.
                    </p>
                    <form onSubmit={handleSaveMinPrice} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <div style={{ position: 'relative' }}>
                            <input
                                type="number"
                                min="0"
                                placeholder={minPrice.toString()}
                                value={minPriceInput !== '' ? minPriceInput : minPrice}
                                onChange={e => setMinPriceInput(e.target.value)}
                                style={{ width: '180px', padding: '10px 48px 10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '14px', fontWeight: 700 }}
                            />
                            <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '11px', fontWeight: 800, color: '#94a3b8' }}>
                                FCFA
                            </span>
                        </div>
                        <button
                            type="submit"
                            disabled={isSavingMinPrice}
                            style={{ padding: '10px 20px', borderRadius: '10px', background: '#0f172a', color: '#ffffff', border: 'none', fontSize: '13px', fontWeight: 700, cursor: isSavingMinPrice ? 'not-allowed' : 'pointer' }}
                        >
                            {isSavingMinPrice ? 'Sauvegarde...' : 'Enregistrer le seuil'}
                        </button>
                    </form>
                </div>
            )}

            {/* ── 4. SEARCH & FILTER TOOLBAR ── */}
            {activeTab !== 'settings' && (
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '18px', padding: '16px', marginBottom: '20px', display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                    {/* Search Input */}
                    <div style={{ flex: 1, minWidth: '260px' }}>
                        <input
                            type="text"
                            placeholder="Rechercher par nom de produit, SKU ou vendeur..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#f8fafc' }}
                        />
                    </div>

                    {/* Category Filter */}
                    <div style={{ minWidth: '180px' }}>
                        <select
                            value={selectedCategory}
                            onChange={e => setSelectedCategory(e.target.value)}
                            style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '12px', fontWeight: 700, background: '#f8fafc', color: '#334155', cursor: 'pointer' }}
                        >
                            <option value="all">Toutes les catégories</option>
                            {collections.map((c: any) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Vendor Filter */}
                    <div style={{ minWidth: '180px' }}>
                        <select
                            value={selectedVendor}
                            onChange={e => setSelectedVendor(e.target.value)}
                            style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '12px', fontWeight: 700, background: '#f8fafc', color: '#334155', cursor: 'pointer' }}
                        >
                            <option value="all">Tous les vendeurs</option>
                            <option value="ahizan_official">Catalogue Officiel Ahizan</option>
                            {vendors.map((v: any) => (
                                <option key={v.id} value={v.id}>{v.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Status Filter */}
                    {activeTab === 'all' && (
                        <div style={{ minWidth: '150px' }}>
                            <select
                                value={selectedStatus}
                                onChange={e => setSelectedStatus(e.target.value)}
                                style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '12px', fontWeight: 700, background: '#f8fafc', color: '#334155', cursor: 'pointer' }}
                            >
                                <option value="all">Tous les statuts</option>
                                <option value="approved">En ligne (Validé)</option>
                                <option value="pending">En attente (Modération)</option>
                                <option value="rejected">Rejeté</option>
                            </select>
                        </div>
                    )}

                    {/* Reset Button */}
                    {(searchTerm || selectedCategory !== 'all' || selectedVendor !== 'all' || selectedStatus !== 'all') && (
                        <button
                            onClick={() => {
                                setSearchTerm('');
                                setSelectedCategory('all');
                                setSelectedVendor('all');
                                setSelectedStatus('all');
                            }}
                            style={{ padding: '10px 14px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#f1f5f9', fontSize: '12px', fontWeight: 700, color: '#64748b', cursor: 'pointer' }}
                        >
                            Réinitialiser
                        </button>
                    )}
                </div>
            )}

            {/* ── 5. PRODUCTS MASTER-DETAIL TABLE ── */}
            {activeTab !== 'settings' && (
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                    {isLoadingProducts ? (
                        <div style={{ padding: '60px', textAlign: 'center', color: '#64748b', fontWeight: 600 }}>
                            Chargement du catalogue marketplace...
                        </div>
                    ) : productsError ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: '#ef4444', fontWeight: 700 }}>
                            Erreur de chargement: {(productsError as Error).message}
                        </div>
                    ) : filteredProducts.length === 0 ? (
                        <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
                            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔍</div>
                            <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>Aucun produit correspondant</h3>
                            <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>Ajustez vos critères de recherche ou vos filtres.</p>
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                                <thead>
                                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        <th style={{ padding: '14px 20px', width: '40px' }}></th>
                                        <th style={{ padding: '14px 20px' }}>Produit &amp; Fiche Centrale</th>
                                        <th style={{ padding: '14px 20px' }}>Catégorie</th>
                                        <th style={{ padding: '14px 20px' }}>Vendeur Demandeur</th>
                                        <th style={{ padding: '14px 20px' }}>Déclinaisons</th>
                                        <th style={{ padding: '14px 20px' }}>Statut Modération</th>
                                        <th style={{ padding: '14px 20px', textAlign: 'right' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredProducts.map((product) => {
                                        const isExpanded = expandedProductId === product.id;
                                        const approvalStatus = product.customFields?.approvalStatus || 'approved';
                                        const isPending = approvalStatus === 'pending';
                                        const isRejected = approvalStatus === 'rejected';
                                        const vendorName = product.customFields?.vendor?.name || 'Catalogue Ahizan';
                                        const mainVariant = product.variants?.[0];

                                        return (
                                            <React.Fragment key={product.id}>
                                                <tr
                                                    style={{
                                                        borderBottom: isExpanded ? 'none' : '1px solid #f1f5f9',
                                                        background: isExpanded ? '#f8fafc' : '#ffffff',
                                                        transition: 'background 0.15s',
                                                    }}
                                                >
                                                    {/* Expand Toggle */}
                                                    <td style={{ padding: '14px 20px' }}>
                                                        <button
                                                            onClick={() => handleToggleExpandProduct(product.id)}
                                                            style={{
                                                                background: isExpanded ? '#0f172a' : '#f1f5f9',
                                                                color: isExpanded ? '#ffffff' : '#475569',
                                                                border: 'none', borderRadius: '6px', width: '24px', height: '24px',
                                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                cursor: 'pointer', fontSize: '11px', fontWeight: 800
                                                            }}
                                                            title="Voir les variantes et offres"
                                                        >
                                                            {isExpanded ? '▼' : '▶'}
                                                        </button>
                                                    </td>

                                                    {/* Product Identity */}
                                                    <td style={{ padding: '14px 20px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                            {product.featuredAsset?.preview ? (
                                                                <img
                                                                    src={product.featuredAsset.preview}
                                                                    alt={product.name}
                                                                    style={{ width: '44px', height: '44px', borderRadius: '8px', objectFit: 'cover', border: '1px solid #e2e8f0' }}
                                                                />
                                                            ) : (
                                                                <div style={{ width: '44px', height: '44px', borderRadius: '8px', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
                                                                    📦
                                                                </div>
                                                            )}
                                                            <div>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                                    <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '14px' }}>{product.name}</span>
                                                                    {product.customFields?.vendor ? (
                                                                        <span style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', padding: '1px 7px', borderRadius: '6px', fontSize: '10px', fontWeight: 800 }}>
                                                                            🏪 Proposition Vendeur
                                                                        </span>
                                                                    ) : (
                                                                        <span style={{ background: '#e0e7ff', color: '#3730a3', border: '1px solid #c7d2fe', padding: '1px 7px', borderRadius: '6px', fontSize: '10px', fontWeight: 800 }}>
                                                                            🏛️ Catalogue Officiel Ahizan
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <div style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace', marginTop: '2px' }}>
                                                                    ID: #{product.id} • SKU: {mainVariant?.sku || 'N/A'} • /{product.slug}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* Category */}
                                                    <td style={{ padding: '14px 20px' }}>
                                                        {product.collections && product.collections.length > 0 ? (
                                                            <span style={{ background: '#f1f5f9', color: '#334155', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700 }}>
                                                                {product.collections[0].name}
                                                            </span>
                                                        ) : (
                                                            <span style={{ color: '#94a3b8', fontSize: '11px' }}>Non classé</span>
                                                        )}
                                                    </td>

                                                    {/* Vendor Proposer */}
                                                    <td style={{ padding: '14px 20px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            {product.customFields?.vendor?.logo?.preview ? (
                                                                <img src={product.customFields.vendor.logo.preview} alt="" style={{ width: '22px', height: '22px', borderRadius: '50%', objectFit: 'cover' }} />
                                                            ) : (
                                                                <span style={{ fontSize: '14px' }}>🏪</span>
                                                            )}
                                                            <span style={{ fontWeight: 700, color: product.customFields?.vendor ? '#0f172a' : '#2563eb' }}>
                                                                {vendorName}
                                                            </span>
                                                        </div>
                                                    </td>

                                                    {/* Variants Count & Base Price */}
                                                    <td style={{ padding: '14px 20px' }}>
                                                        <div>
                                                            <span style={{ fontWeight: 800, color: '#0f172a' }}>{product.variants?.length || 1} déclinaison(s)</span>
                                                            <div style={{ fontSize: '12px', color: '#16a34a', fontWeight: 800 }}>
                                                                {mainVariant?.price ? `${(mainVariant.price / 100).toLocaleString('fr-FR')} FCFA` : 'Prix sur offre'}
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* Moderation Status */}
                                                    <td style={{ padding: '14px 20px' }}>
                                                        {isPending ? (
                                                            <span style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                                ⏳ En attente validation
                                                            </span>
                                                        ) : isRejected ? (
                                                            <span style={{ background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                                ✕ Rejeté
                                                            </span>
                                                        ) : (
                                                            <span style={{ background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                                ✓ En ligne (Validé)
                                                            </span>
                                                        )}
                                                    </td>

                                                    {/* Actions */}
                                                    <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                                                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap' }}>
                                                            {product.customFields?.vendor && (
                                                                <button
                                                                    onClick={() => handleQuickApprove(product)}
                                                                    style={{ padding: '6px 12px', borderRadius: '8px', background: '#0284c7', color: '#ffffff', border: 'none', fontSize: '11px', fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                                                    title="Adopter cette proposition pour en faire une fiche officielle Ahizan (greffe automatique de l'offre vendeur)"
                                                                >
                                                                    🏛️ Rendre Officiel Ahizan
                                                                </button>
                                                            )}

                                                            <button
                                                                onClick={() => handleOpenEditProduct(product)}
                                                                style={{ padding: '6px 12px', borderRadius: '8px', background: '#2563eb', color: '#ffffff', border: 'none', fontSize: '11px', fontWeight: 800, cursor: 'pointer' }}
                                                                title="Modifier les informations officielles de la fiche produit Ahizan"
                                                            >
                                                                ✏️ Éditer Fiche Ahizan
                                                            </button>

                                                            {isPending && (
                                                                <button
                                                                    onClick={() => handleQuickApprove(product)}
                                                                    style={{ padding: '6px 12px', borderRadius: '8px', background: '#16a34a', color: '#ffffff', border: 'none', fontSize: '11px', fontWeight: 800, cursor: 'pointer' }}
                                                                    title="Approuver directement"
                                                                >
                                                                    ✓ Approuver
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() => handleOpenReview(product)}
                                                                style={{ padding: '6px 12px', borderRadius: '8px', background: '#0f172a', color: '#ffffff', border: 'none', fontSize: '11px', fontWeight: 800, cursor: 'pointer' }}
                                                            >
                                                                Modérer
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteProduct(product)}
                                                                style={{ padding: '6px 10px', borderRadius: '8px', background: '#fee2e2', color: '#dc2626', border: 'none', fontSize: '11px', fontWeight: 800, cursor: 'pointer' }}
                                                                title="Supprimer le produit"
                                                            >
                                                                🗑️
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>

                                                {/* ── EXPANDED DETAILS: SELLER OFFERS & VARIANTS MATRIX ── */}
                                                {isExpanded && (
                                                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                                        <td colSpan={7} style={{ padding: '0 20px 20px 20px' }}>
                                                            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '16px', marginTop: '4px', display: 'grid', gap: '16px' }}>
                                                                
                                                                {/* 1. SELLER OFFERS BREAKDOWN WITH MODERATION & COMMENTS */}
                                                                <div>
                                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                                                        <div style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                            <span>🏪</span> Offres des Vendeurs Greffées sur ce Produit ({offersMap[product.id]?.length || 0})
                                                                        </div>
                                                                        <span style={{ fontSize: '11px', color: '#64748b' }}>
                                                                            Consultez les détails des offres, validez-les ou envoyez des remarques de correction aux vendeurs.
                                                                        </span>
                                                                    </div>

                                                                    {loadingOffersProductId === product.id ? (
                                                                        <div style={{ padding: '20px', textAlign: 'center', color: '#64748b', fontSize: '12px' }}>
                                                                            Chargement des offres vendeurs...
                                                                        </div>
                                                                    ) : !offersMap[product.id] || offersMap[product.id].length === 0 ? (
                                                                        <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1', textAlign: 'center', color: '#64748b', fontSize: '12px' }}>
                                                                            Aucun vendeur ne s'est encore greffé sur ce produit.
                                                                        </div>
                                                                    ) : (
                                                                        <div style={{ display: 'grid', gap: '10px' }}>
                                                                            {offersMap[product.id].map((offer: any) => {
                                                                                const offerPrice = Math.round(offer.price / 100);
                                                                                const promoPrice = offer.promotionalPrice ? Math.round(offer.promotionalPrice / 100) : null;
                                                                                const isCommenting = commentingOfferId === offer.id;
                                                                                const isCorrectionRequested = offer.status === 'correction_requested';
                                                                                const isRejectedOffer = offer.status === 'rejected';

                                                                                return (
                                                                                    <div 
                                                                                        key={offer.id}
                                                                                        style={{
                                                                                            padding: '14px',
                                                                                            background: isCorrectionRequested ? '#fffbeb' : '#f8fafc',
                                                                                            borderRadius: '10px',
                                                                                            border: isCorrectionRequested ? '1px solid #fcd34d' : '1px solid #e2e8f0',
                                                                                            fontSize: '12px',
                                                                                            display: 'grid',
                                                                                            gap: '10px'
                                                                                        }}
                                                                                    >
                                                                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                                                                                            {/* Vendor Identity & Variant */}
                                                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                                                                {offer.vendor?.logo?.preview ? (
                                                                                                    <img src={offer.vendor.logo.preview} alt="" style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }} />
                                                                                                ) : (
                                                                                                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px' }}>🏪</div>
                                                                                                )}
                                                                                                <div>
                                                                                                    <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '13px' }}>
                                                                                                        {offer.vendor?.name || 'Vendeur Marchand'}
                                                                                                        <span style={{ fontWeight: 600, color: '#64748b', fontSize: '11px', marginLeft: '6px' }}>
                                                                                                            • {offer.productVariant?.name || 'Déclinaison'}
                                                                                                        </span>
                                                                                                    </div>
                                                                                                    <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', gap: '8px', marginTop: '2px' }}>
                                                                                                        <span>SKU: <strong style={{ color: '#334155' }}>{offer.sku || offer.productVariant?.sku || 'N/A'}</strong></span>
                                                                                                        <span>Stock: <strong style={{ color: offer.stock > 0 ? '#16a34a' : '#dc2626' }}>{offer.stock} unité(s)</strong></span>
                                                                                                        <span>Livraison: <strong style={{ color: '#334155' }}>{offer.deliveryTimeValue} {offer.deliveryTimeUnit === 'HOURS' ? 'Heures' : 'Jours'}</strong></span>
                                                                                                        <span>État: <strong style={{ color: '#334155' }}>{offer.condition === 'NEW' ? 'Neuf' : 'Occasion'}</strong></span>
                                                                                                    </div>
                                                                                                </div>
                                                                                            </div>

                                                                                            {/* Price & Moderation Actions */}
                                                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                                                                                <div style={{ textAlign: 'right' }}>
                                                                                                    {promoPrice ? (
                                                                                                        <div>
                                                                                                            <span style={{ fontWeight: 900, color: '#dc2626', fontSize: '14px' }}>{promoPrice.toLocaleString('fr-FR')} FCFA</span>
                                                                                                            <span style={{ textDecoration: 'line-through', color: '#94a3b8', fontSize: '10px', marginLeft: '6px' }}>{offerPrice.toLocaleString('fr-FR')} FCFA</span>
                                                                                                        </div>
                                                                                                    ) : (
                                                                                                        <span style={{ fontWeight: 900, color: '#0f172a', fontSize: '14px' }}>{offerPrice.toLocaleString('fr-FR')} FCFA</span>
                                                                                                    )}
                                                                                                    <div>
                                                                                                        {isCorrectionRequested ? (
                                                                                                            <span style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', padding: '1px 6px', borderRadius: '4px', fontSize: '9px', fontWeight: 800 }}>
                                                                                                                ⚠️ Correction demandée
                                                                                                            </span>
                                                                                                        ) : isRejectedOffer ? (
                                                                                                            <span style={{ background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca', padding: '1px 6px', borderRadius: '4px', fontSize: '9px', fontWeight: 800 }}>
                                                                                                                ✕ Rejetée
                                                                                                            </span>
                                                                                                        ) : (
                                                                                                            <span style={{ background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0', padding: '1px 6px', borderRadius: '4px', fontSize: '9px', fontWeight: 800 }}>
                                                                                                                ✓ En ligne
                                                                                                            </span>
                                                                                                        )}
                                                                                                    </div>
                                                                                                </div>

                                                                                                <div style={{ display: 'flex', gap: '6px' }}>
                                                                                                    {offer.status !== 'approved' && (
                                                                                                        <button
                                                                                                            type="button"
                                                                                                            disabled={isSavingOfferReview}
                                                                                                            onClick={() => handleReviewOffer(offer.id, product.id, 'approved')}
                                                                                                            style={{ padding: '6px 10px', borderRadius: '6px', background: '#16a34a', color: '#ffffff', border: 'none', fontSize: '11px', fontWeight: 800, cursor: 'pointer' }}
                                                                                                        >
                                                                                                            ✓ Valider
                                                                                                        </button>
                                                                                                    )}
                                                                                                    <button
                                                                                                        type="button"
                                                                                                        onClick={() => {
                                                                                                            setCommentingOfferId(isCommenting ? null : offer.id);
                                                                                                            setOfferCommentInput(offer.rejectionReason || '');
                                                                                                        }}
                                                                                                        style={{ padding: '6px 10px', borderRadius: '6px', background: '#0f172a', color: '#ffffff', border: 'none', fontSize: '11px', fontWeight: 800, cursor: 'pointer' }}
                                                                                                    >
                                                                                                        💬 Commenter
                                                                                                    </button>
                                                                                                </div>
                                                                                            </div>
                                                                                        </div>

                                                                                        {/* Rejection Reason / Existing Comment */}
                                                                                        {offer.rejectionReason && !isCommenting && (
                                                                                            <div style={{ padding: '8px 12px', background: '#fffbeb', border: '1px solid #fef08a', borderRadius: '6px', fontSize: '11px', color: '#92400e' }}>
                                                                                                <strong>Remarque envoyée au vendeur :</strong> {offer.rejectionReason}
                                                                                            </div>
                                                                                        )}

                                                                                        {/* Inline Comment Box */}
                                                                                        {isCommenting && (
                                                                                            <div style={{ padding: '10px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', display: 'grid', gap: '8px' }}>
                                                                                                <label style={{ fontSize: '11px', fontWeight: 700, color: '#334155' }}>
                                                                                                    Remarque / Correction demandée au vendeur :
                                                                                                </label>
                                                                                                <textarea
                                                                                                    rows={2}
                                                                                                    value={offerCommentInput}
                                                                                                    onChange={(e) => setOfferCommentInput(e.target.value)}
                                                                                                    placeholder="Ex: Merci d'ajuster le prix ou de fournir une photo plus claire pour cette déclinaison..."
                                                                                                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }}
                                                                                                />
                                                                                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                                                                                                    <button
                                                                                                        type="button"
                                                                                                        onClick={() => setCommentingOfferId(null)}
                                                                                                        style={{ padding: '5px 10px', borderRadius: '6px', background: '#f1f5f9', color: '#475569', border: 'none', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                                                                                                    >
                                                                                                        Annuler
                                                                                                    </button>
                                                                                                    <button
                                                                                                        type="button"
                                                                                                        disabled={isSavingOfferReview || !offerCommentInput.trim()}
                                                                                                        onClick={() => handleReviewOffer(offer.id, product.id, 'correction_requested', offerCommentInput)}
                                                                                                        style={{ padding: '5px 12px', borderRadius: '6px', background: '#f59e0b', color: '#ffffff', border: 'none', fontSize: '11px', fontWeight: 800, cursor: 'pointer' }}
                                                                                                    >
                                                                                                        Envoyer les corrections au vendeur ➔
                                                                                                    </button>
                                                                                                </div>
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {/* 2. BASE VARIANTS OVERVIEW */}
                                                                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                                                                    <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#64748b', marginBottom: '6px' }}>
                                                                        🧬 Déclinaisons de la Fiche Centrale Ahizan ({product.variants?.length || 0})
                                                                    </div>
                                                                    <div style={{ display: 'grid', gap: '6px' }}>
                                                                        {product.variants?.map((v, vIdx) => (
                                                                            <div key={v.id || vIdx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 12px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #f1f5f9', fontSize: '11px' }}>
                                                                                <span style={{ color: '#334155', fontWeight: 700 }}>#{vIdx + 1} {v.name || product.name}</span>
                                                                                <span style={{ fontFamily: 'monospace', color: '#94a3b8' }}>SKU: {v.sku || 'N/A'}</span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>

                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* ── 6. MODERATION & APPROVAL MODAL ── */}
            {reviewProduct && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
                    <div style={{ background: '#ffffff', borderRadius: '20px', maxWidth: '650px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '14px', marginBottom: '16px' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>Modération &amp; Approbation Fiche Produit</h3>
                                <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>Fiche soumise par : <strong>{reviewProduct.customFields?.vendor?.name || 'Vendeur Marchand'}</strong></p>
                            </div>
                            <button onClick={() => setReviewProduct(null)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', fontSize: '14px', fontWeight: 700 }}>✕</button>
                        </div>

                        {/* Product Summary Details */}
                        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px', marginBottom: '16px' }}>
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                {reviewProduct.featuredAsset?.preview && (
                                    <img src={reviewProduct.featuredAsset.preview} alt="" style={{ width: '56px', height: '56px', borderRadius: '8px', objectFit: 'cover' }} />
                                )}
                                <div>
                                    <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>{reviewProduct.name}</div>
                                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                                        Catégorie : {reviewProduct.collections?.[0]?.name || 'Non classé'} • {reviewProduct.variants?.length || 1} déclinaison(s)
                                    </div>
                                </div>
                            </div>
                            {reviewProduct.description && (
                                <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #e2e8f0', fontSize: '12px', color: '#475569', maxHeight: '100px', overflowY: 'auto' }}>
                                    {reviewProduct.description.replace(/<[^>]*>/g, '').substring(0, 300)}...
                                </div>
                            )}
                        </div>

                        {/* Decision Form */}
                        <form onSubmit={handleSubmitReview} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', color: '#334155', display: 'block', marginBottom: '8px' }}>
                                    Décision Superadmin :
                                </label>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <button
                                        type="button"
                                        onClick={() => setReviewDecision('approved_official')}
                                        style={{
                                            padding: '12px 14px', borderRadius: '10px', fontSize: '13px', fontWeight: 800, cursor: 'pointer', textAlign: 'left',
                                            background: reviewDecision === 'approved_official' ? '#eff6ff' : '#f8fafc',
                                            color: reviewDecision === 'approved_official' ? '#1d4ed8' : '#475569',
                                            border: reviewDecision === 'approved_official' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                                        }}
                                    >
                                        🏛️ <strong>Adopter comme Fiche Officielle Ahizan</strong>
                                        <div style={{ fontSize: '11px', fontWeight: 500, opacity: 0.85, marginTop: '2px' }}>
                                            Le produit intègre le catalogue officiel Ahizan et l'offre du vendeur y est automatiquement greffée.
                                        </div>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setReviewDecision('approved_vendor')}
                                        style={{
                                            padding: '12px 14px', borderRadius: '10px', fontSize: '13px', fontWeight: 800, cursor: 'pointer', textAlign: 'left',
                                            background: reviewDecision === 'approved_vendor' ? '#fef3c7' : '#f8fafc',
                                            color: reviewDecision === 'approved_vendor' ? '#92400e' : '#475569',
                                            border: reviewDecision === 'approved_vendor' ? '2px solid #f59e0b' : '1px solid #cbd5e1',
                                        }}
                                    >
                                        🏪 <strong>Valider comme Proposition Vendeur Simple</strong>
                                        <div style={{ fontSize: '11px', fontWeight: 500, opacity: 0.85, marginTop: '2px' }}>
                                            Le produit reste attribué exclusivement à ce vendeur marchand.
                                        </div>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setReviewDecision('rejected')}
                                        style={{
                                            padding: '12px 14px', borderRadius: '10px', fontSize: '13px', fontWeight: 800, cursor: 'pointer', textAlign: 'left',
                                            background: reviewDecision === 'rejected' ? '#fee2e2' : '#f8fafc',
                                            color: reviewDecision === 'rejected' ? '#991b1b' : '#475569',
                                            border: reviewDecision === 'rejected' ? '2px solid #dc2626' : '1px solid #cbd5e1',
                                        }}
                                    >
                                        ✕ <strong>Rejeter la fiche</strong>
                                        <div style={{ fontSize: '11px', fontWeight: 500, opacity: 0.85, marginTop: '2px' }}>
                                            Refuser la proposition et notifier le motif de rejet au vendeur.
                                        </div>
                                    </button>
                                </div>
                            </div>

                            {reviewDecision === 'rejected' && (
                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', color: '#991b1b', display: 'block', marginBottom: '6px' }}>
                                        Motif du refus pour le vendeur * :
                                    </label>
                                    <textarea
                                        required
                                        rows={3}
                                        value={rejectionReasonInput}
                                        onChange={e => setRejectionReasonInput(e.target.value)}
                                        placeholder="Ex: Photos non conformes, description insuffisante ou produit déjà existant au catalogue..."
                                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #fca5a5', fontSize: '12px', fontFamily: 'inherit' }}
                                    />
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                                <button
                                    type="button"
                                    onClick={() => setReviewProduct(null)}
                                    style={{ padding: '10px 18px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmittingReview}
                                    style={{
                                        padding: '10px 22px', borderRadius: '8px', border: 'none', fontSize: '12px', fontWeight: 800, cursor: 'pointer',
                                        background: reviewDecision === 'approved' ? '#16a34a' : '#dc2626',
                                        color: '#ffffff',
                                    }}
                                >
                                    {isSubmittingReview ? 'Enregistrement...' : reviewDecision === 'approved' ? 'Confirmer la validation' : 'Confirmer le rejet'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── 7. MODAL: EDIT AHIZAN OFFICIAL PRODUCT INFO ── */}
            {editingProduct && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
                    <div style={{ background: '#ffffff', borderRadius: '20px', maxWidth: '750px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '28px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
                        
                        {/* Modal Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px', marginBottom: '20px' }}>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                    <span style={{ background: '#eff6ff', color: '#2563eb', fontSize: '11px', fontWeight: 800, padding: '3px 8px', borderRadius: '6px', textTransform: 'uppercase' }}>
                                        Catalogue Central Ahizan
                                    </span>
                                    <span style={{ fontSize: '12px', color: '#94a3b8', fontFamily: 'monospace' }}>
                                        ID: {editingProduct.id}
                                    </span>
                                </div>
                                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                                    Édition Fiche Produit Ahizan
                                </h3>
                                <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                                    Cette fiche constitue la référence officielle partagée par tous les vendeurs affiliés.
                                </p>
                            </div>
                            <button onClick={() => setEditingProduct(null)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', fontSize: '14px', fontWeight: 700, color: '#64748b' }}>✕</button>
                        </div>

                        {/* Notice for Price / Stock */}
                        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px 16px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ fontSize: '20px' }}>💡</span>
                            <p style={{ margin: 0, fontSize: '12px', color: '#475569', lineHeight: '1.4' }}>
                                <strong>Règle d'architecture :</strong> Les prix, stocks et remises ne sont pas fixés sur la fiche générale, mais sont librement définis par chaque vendeur dans ses <strong>offres greffées</strong>.
                            </p>
                        </div>

                        <form onSubmit={handleSaveProductEdit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                            
                            {/* Visuals Preview */}
                            <div>
                                <label style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#334155', display: 'block', marginBottom: '8px' }}>
                                    Visuels Officiels du Catalogue :
                                </label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                                    {editingProduct.featuredAsset?.preview ? (
                                        <div style={{ position: 'relative' }}>
                                            <img
                                                src={editingProduct.featuredAsset.preview}
                                                alt={editingProduct.name}
                                                style={{ width: '70px', height: '70px', borderRadius: '10px', objectFit: 'cover', border: '2px solid #2563eb' }}
                                            />
                                            <span style={{ position: 'absolute', bottom: '2px', left: '2px', right: '2px', background: 'rgba(37,99,235,0.9)', color: '#ffffff', fontSize: '8px', fontWeight: 800, textAlign: 'center', borderRadius: '4px', padding: '1px 0' }}>
                                                Principale
                                            </span>
                                        </div>
                                    ) : (
                                        <div style={{ width: '70px', height: '70px', borderRadius: '10px', background: '#f1f5f9', border: '1px dashed #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: '#94a3b8' }}>
                                            Sans image
                                        </div>
                                    )}

                                    {editingProduct.assets && editingProduct.assets.filter(a => a.preview !== editingProduct.featuredAsset?.preview).map((asset, aIdx) => (
                                        <img
                                            key={asset.id || aIdx}
                                            src={asset.preview}
                                            alt={`Galerie ${aIdx + 1}`}
                                            style={{ width: '70px', height: '70px', borderRadius: '10px', objectFit: 'cover', border: '1px solid #cbd5e1' }}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* Nom du Produit */}
                            <div>
                                <label style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#334155', display: 'block', marginBottom: '6px' }}>
                                    Nom officiel du produit * :
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={editFormData.name}
                                    onChange={e => setEditFormData({ ...editFormData, name: e.target.value })}
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '14px', fontWeight: 700 }}
                                />
                            </div>

                            {/* Slug URL */}
                            <div>
                                <label style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#334155', display: 'block', marginBottom: '6px' }}>
                                    Slug URL :
                                </label>
                                <input
                                    type="text"
                                    value={editFormData.slug}
                                    onChange={e => setEditFormData({ ...editFormData, slug: e.target.value })}
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px', fontFamily: 'monospace' }}
                                />
                            </div>

                            {/* Catégories / Collections */}
                            <div>
                                <label style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#334155', display: 'block', marginBottom: '6px' }}>
                                    Catégories / Collections Ahizan :
                                </label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', maxHeight: '130px', overflowY: 'auto', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '10px', background: '#fafafa' }}>
                                    {collections.map((c: any) => {
                                        const isSelected = editFormData.collectionIds.includes(c.id);
                                        return (
                                            <button
                                                key={c.id}
                                                type="button"
                                                onClick={() => {
                                                    const updated = isSelected 
                                                        ? editFormData.collectionIds.filter(id => id !== c.id)
                                                        : [...editFormData.collectionIds, c.id];
                                                    setEditFormData({ ...editFormData, collectionIds: updated });
                                                }}
                                                style={{
                                                    padding: '6px 12px',
                                                    borderRadius: '8px',
                                                    fontSize: '12px',
                                                    fontWeight: isSelected ? 800 : 500,
                                                    border: isSelected ? '1px solid #2563eb' : '1px solid #cbd5e1',
                                                    background: isSelected ? '#eff6ff' : '#ffffff',
                                                    color: isSelected ? '#2563eb' : '#475569',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                }}
                                            >
                                                <span>{isSelected ? '✓' : '+'}</span>
                                                <span>{c.name}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Option Groups Summary */}
                            {editingProduct.optionGroups && editingProduct.optionGroups.length > 0 && (
                                <div>
                                    <label style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#334155', display: 'block', marginBottom: '6px' }}>
                                        Groupes d'options disponibles pour ce produit :
                                    </label>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        {editingProduct.optionGroups.map((og) => (
                                            <div key={og.id} style={{ padding: '8px 12px', borderRadius: '8px', background: '#f1f5f9', border: '1px solid #e2e8f0', fontSize: '12px' }}>
                                                <strong style={{ color: '#0f172a' }}>{og.name} :</strong>{' '}
                                                <span style={{ color: '#64748b' }}>
                                                    {(og.options || []).map(o => o.name).join(', ') || 'Aucune option'}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Description Courte */}
                            <div>
                                <label style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#334155', display: 'block', marginBottom: '6px' }}>
                                    Description Courte (Accroche) :
                                </label>
                                <textarea
                                    rows={2}
                                    value={editFormData.shortDescription}
                                    onChange={e => setEditFormData({ ...editFormData, shortDescription: e.target.value })}
                                    style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                                />
                            </div>

                            {/* Description Détaillée */}
                            <div>
                                <label style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#334155', display: 'block', marginBottom: '6px' }}>
                                    Description Détaillée &amp; Fiche Technique :
                                </label>
                                <textarea
                                    rows={4}
                                    value={editFormData.description}
                                    onChange={e => setEditFormData({ ...editFormData, description: e.target.value })}
                                    style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                                />
                            </div>

                            {/* Switch En ligne */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                                <input
                                    type="checkbox"
                                    id="prod-enabled"
                                    checked={editFormData.enabled}
                                    onChange={e => setEditFormData({ ...editFormData, enabled: e.target.checked })}
                                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                />
                                <div>
                                    <label htmlFor="prod-enabled" style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', cursor: 'pointer', display: 'block' }}>
                                        Produit Actif / En ligne sur la Marketplace Ahizan
                                    </label>
                                    <span style={{ fontSize: '11px', color: '#64748b' }}>
                                        Si désactivé, le produit et toutes ses offres affiliées ne seront plus visibles aux acheteurs.
                                    </span>
                                </div>
                            </div>

                            {/* Form Actions */}
                            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', borderTop: '1px solid #e2e8f0', paddingTop: '16px', marginTop: '4px' }}>
                                <button
                                    type="button"
                                    onClick={() => setEditingProduct(null)}
                                    style={{ padding: '10px 18px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', fontSize: '12px', fontWeight: 700, cursor: 'pointer', color: '#475569' }}
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSavingProduct}
                                    style={{
                                        padding: '10px 22px', borderRadius: '8px', border: 'none', fontSize: '12px', fontWeight: 800, cursor: 'pointer',
                                        background: '#2563eb', color: '#ffffff',
                                    }}
                                >
                                    {isSavingProduct ? 'Enregistrement...' : 'Enregistrer la fiche Ahizan'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
}
