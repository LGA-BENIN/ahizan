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
                        offerStatus
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
            featuredAsset {
                id
                preview
            }
            assets {
                id
                preview
            }
        }
    }
`;

const REASSIGN_VARIANT_TO_PRODUCT = `
    mutation ReassignVariantToProduct($variantId: ID!, $targetProductId: ID!, $approveOffer: Boolean) {
        reassignVariantToProduct(variantId: $variantId, targetProductId: $targetProductId, approveOffer: $approveOffer) {
            id
            name
            sku
            product {
                id
                name
            }
        }
    }
`;

const CREATE_OFFICIAL_PRODUCT_FROM_VARIANT = `
    mutation CreateOfficialProductFromVariant(
        $variantId: ID!
        $name: String!
        $slug: String
        $shortDescription: String
        $description: String
        $officialSku: String
        $ean: String
        $collectionIds: [ID!]
        $facetValueIds: [ID!]
        $approveOffer: Boolean
    ) {
        createOfficialProductFromVariant(
            variantId: $variantId
            name: $name
            slug: $slug
            shortDescription: $shortDescription
            description: $description
            officialSku: $officialSku
            ean: $ean
            collectionIds: $collectionIds
            facetValueIds: $facetValueIds
            approveOffer: $approveOffer
        ) {
            id
            name
        }
    }
`;

const SEARCH_OFFICIAL_PRODUCTS = `
    query SearchOfficialProducts($term: String, $take: Int) {
        searchOfficialProducts(term: $term, take: $take) {
            items {
                id
                name
                slug
                featuredAsset {
                    preview
                }
                collections {
                    id
                    name
                }
                variants {
                    id
                    name
                    sku
                }
            }
            totalItems
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
    mutation AdminReviewProduct(
        $id: ID!
        $status: String!
        $rejectionReason: String
        $convertToOfficialCatalog: Boolean
        $name: String
        $slug: String
        $shortDescription: String
        $description: String
        $officialSku: String
        $ean: String
        $collectionIds: [ID!]
        $facetValueIds: [ID!]
        $approveVendorOffer: Boolean
    ) {
        adminReviewProduct(
            id: $id
            status: $status
            rejectionReason: $rejectionReason
            convertToOfficialCatalog: $convertToOfficialCatalog
            name: $name
            slug: $slug
            shortDescription: $shortDescription
            description: $description
            officialSku: $officialSku
            ean: $ean
            collectionIds: $collectionIds
            facetValueIds: $facetValueIds
            approveVendorOffer: $approveVendorOffer
        ) {
            id
            enabled
            customFields {
                approvalStatus
                rejectionReason
            }
        }
    }
`;

const GET_FACETS = `
    query GetFacets {
        facets(options: { take: 100 }) {
            items {
                id
                name
                code
                values {
                    id
                    name
                    code
                }
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

// Helper Multi-Part File Uploader
async function uploadAssetFile(file: File): Promise<{ id: string; preview: string }> {
    const formData = new FormData();
    formData.append('operations', JSON.stringify({
        query: `mutation UploadVendorFile($file: Upload!) { uploadVendorFile(file: $file) { id preview } }`,
        variables: { file: null }
    }));
    formData.append('map', JSON.stringify({ '0': ['variables.file'] }));
    formData.append('0', file);

    const response = await fetch('/admin-api', {
        method: 'POST',
        credentials: 'include',
        body: formData,
    });
    const json = await response.json();
    if (json.errors) throw new Error(json.errors[0].message);
    return json.data.uploadVendorFile;
}

// Interactive Image Cropper Modal for Superadmin
interface AdminImageCropModalProps {
    imageSrc: string;
    file: File;
    onClose: () => void;
    onCropComplete: (file: File) => void;
    onSkip: (file: File) => void;
}

function AdminImageCropModal({ imageSrc, file, onClose, onCropComplete, onSkip }: AdminImageCropModalProps) {
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const imgRef = React.useRef<HTMLImageElement>(null);

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging) return;
        setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    };

    const handleMouseUp = () => setIsDragging(false);

    const handleApplyCrop = () => {
        const image = imgRef.current;
        if (!image) return onSkip(file);

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return onSkip(file);

        const targetSize = 800;
        canvas.width = targetSize;
        canvas.height = targetSize;

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, targetSize, targetSize);

        ctx.save();
        ctx.translate(targetSize / 2, targetSize / 2);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.scale(zoom, zoom);

        const aspect = (image.naturalWidth || 800) / (image.naturalHeight || 800);
        let drawWidth = targetSize;
        let drawHeight = targetSize;
        if (aspect > 1) {
            drawHeight = targetSize / aspect;
        } else {
            drawWidth = targetSize * aspect;
        }

        ctx.drawImage(
            image,
            -drawWidth / 2 + pan.x / zoom,
            -drawHeight / 2 + pan.y / zoom,
            drawWidth,
            drawHeight
        );
        ctx.restore();

        canvas.toBlob((blob) => {
            if (!blob) return onSkip(file);
            const croppedFile = new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() });
            onCropComplete(croppedFile);
        }, 'image/jpeg', 0.92);
    };

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <div style={{ background: '#ffffff', borderRadius: '16px', maxWidth: '520px', width: '100%', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>✂️ Rognage &amp; Cadrage de l'Image</h3>
                    <button type="button" onClick={onClose} style={{ border: 'none', background: 'transparent', fontSize: '18px', cursor: 'pointer', color: '#64748b' }}>✕</button>
                </div>

                <div style={{ padding: '20px', background: '#f1f5f9', display: 'flex', justifyContent: 'center', alignItems: 'center', userSelect: 'none' }}>
                    <div
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                        style={{ width: '320px', height: '320px', overflow: 'hidden', position: 'relative', border: '2px dashed #0284c7', borderRadius: '12px', cursor: isDragging ? 'grabbing' : 'grab', background: '#ffffff', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                    >
                        <img
                            ref={imgRef}
                            src={imageSrc}
                            alt="Crop Preview"
                            style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'contain',
                                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom}) rotate(${rotation}deg)`,
                                transition: isDragging ? 'none' : 'transform 0.1s ease-out',
                                pointerEvents: 'none'
                            }}
                        />
                    </div>
                </div>

                <div style={{ padding: '16px 20px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'grid', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', width: '60px' }}>Zoom:</span>
                        <input
                            type="range"
                            min="0.2"
                            max="5.0"
                            step="0.05"
                            value={zoom}
                            onChange={e => setZoom(parseFloat(e.target.value))}
                            style={{ flex: 1 }}
                        />
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>{Math.round(zoom * 100)}%</span>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button
                            type="button"
                            onClick={() => setRotation(r => (r - 90) % 360)}
                            style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                        >
                            🔄 -90°
                        </button>
                        <button
                            type="button"
                            onClick={() => setRotation(r => (r + 90) % 360)}
                            style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                        >
                            🔄 +90°
                        </button>
                        <button
                            type="button"
                            onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); setRotation(0); }}
                            style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                        >
                            Réinitialiser
                        </button>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginTop: '4px' }}>
                        <button
                            type="button"
                            onClick={() => onSkip(file)}
                            style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#475569', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                        >
                            Conserver sans rogner
                        </button>
                        <button
                            type="button"
                            onClick={handleApplyCrop}
                            style={{ padding: '8px 14px', borderRadius: '8px', border: 'none', background: '#2563eb', color: '#ffffff', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                        >
                            Appliquer le rognage
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export function ProductListComponent() {
    const queryClient = useQueryClient();

    // Helper formatPrice
    const formatPrice = (val?: number | null) => (val ? `${Math.round(val).toLocaleString('fr-FR')} FCFA` : '0 FCFA');

    // Active View Tab: 'official' | 'vendor_proposals' | 'pending' | 'unvalidated_variants' | 'settings'
    const [activeTab, setActiveTab] = useState<'official' | 'vendor_proposals' | 'pending' | 'unvalidated_variants' | 'settings'>('official');

    // Search, Filters & Sorting
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [selectedVendor, setSelectedVendor] = useState('all');
    const [selectedStatus, setSelectedStatus] = useState('all');
    const [sortBy, setSortBy] = useState<'created_desc' | 'created_asc' | 'name_asc' | 'name_desc' | 'price_asc' | 'price_desc' | 'variants_desc'>('created_desc');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(25);
    const [expandedProductId, setExpandedProductId] = useState<string | null>(null);

    // Modal state for Approval Review
    const [reviewProduct, setReviewProduct] = useState<MarketplaceProduct | null>(null);
    const [reviewDecision, setReviewDecision] = useState<'approved_official' | 'approved_vendor' | 'rejected'>('approved_official');
    const [rejectionReasonInput, setRejectionReasonInput] = useState('');
    const [rejectScope, setRejectScope] = useState<'all' | 'specific_offer'>('all');
    const [rejectedOfferIds, setRejectedOfferIds] = useState<string[]>([]);
    const [isSubmittingReview, setIsSubmittingReview] = useState(false);

    // Form state for creating/promoting to Official Product inside Review Modal
    const [officialTitle, setOfficialTitle] = useState('');
    const [officialSlug, setOfficialSlug] = useState('');
    const [officialShortDescription, setOfficialShortDescription] = useState('');
    const [officialDescription, setOfficialDescription] = useState('');
    const [officialSku, setOfficialSku] = useState('');
    const [officialEan, setOfficialEan] = useState('');
    const [officialCollectionIds, setOfficialCollectionIds] = useState<string[]>([]);
    const [officialFacetValueIds, setOfficialFacetValueIds] = useState<string[]>([]);
    const [approveVendorOfferCheckbox, setApproveVendorOfferCheckbox] = useState(true);

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
    const [editAssets, setEditAssets] = useState<Array<{ id: string; preview: string }>>([]);
    const [editFeaturedAssetId, setEditFeaturedAssetId] = useState<string | null>(null);
    const [isUploadingAssets, setIsUploadingAssets] = useState(false);
    const [isSavingProduct, setIsSavingProduct] = useState(false);
    const [adminCropState, setAdminCropState] = useState<{
        queue: File[];
        currentIndex: number;
        currentSrc: string;
        currentFile: File;
    } | null>(null);

    // Modal state for Regrafting a Variant to another Product ("Greffer à un autre produit")
    const [regraftModalData, setRegraftModalData] = useState<{
        variant: any;
        offer?: any;
        currentProduct: MarketplaceProduct;
    } | null>(null);
    const [regraftTab, setRegraftTab] = useState<'existing' | 'new_official'>('existing');
    const [regraftSearchTerm, setRegraftSearchTerm] = useState('');
    const [regraftSearchResults, setRegraftSearchResults] = useState<any[]>([]);
    const [isLoadingRegraftSearch, setIsLoadingRegraftSearch] = useState(false);
    const [selectedTargetProduct, setSelectedTargetProduct] = useState<any | null>(null);
    const [isSubmittingRegraft, setIsSubmittingRegraft] = useState(false);

    // Form states for creating a new official product from regraft modal
    const [regraftNewTitle, setRegraftNewTitle] = useState('');
    const [regraftNewSlug, setRegraftNewSlug] = useState('');
    const [regraftNewShortDesc, setRegraftNewShortDesc] = useState('');
    const [regraftNewDesc, setRegraftNewDesc] = useState('');
    const [regraftNewSku, setRegraftNewSku] = useState('');
    const [regraftNewEan, setRegraftNewEan] = useState('');
    const [regraftNewCollectionIds, setRegraftNewCollectionIds] = useState<string[]>([]);
    const [regraftNewFacetValueIds, setRegraftNewFacetValueIds] = useState<string[]>([]);
    const [regraftNewApproveOffer, setRegraftNewApproveOffer] = useState(true);

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

    // Fetch Facets
    const { data: facetsData } = useQuery({
        queryKey: ['facetsList'],
        queryFn: () => fetchGraphQL(GET_FACETS),
    });

    const products: MarketplaceProduct[] = productsData?.products?.items || [];
    const collections = collectionsData?.collections?.items || [];
    const facets = facetsData?.facets?.items || [];
    const vendors = vendorsData?.vendors?.items || [];
    const minPrice = globalSettingsData?.globalSettings?.customFields?.minimumMarketplacePrice ?? 0;

    // KPI Metrics calculation
    const metrics = useMemo(() => {
        const totalProducts = products.length;
        const officialCount = products.filter(p => !p.customFields?.vendor || p.customFields.vendor.name === 'Ahizan').length;
        const vendorProposalCount = products.filter(p => !!p.customFields?.vendor && p.customFields.vendor.name !== 'Ahizan').length;
        const pendingProducts = products.filter(p => {
            const approvalStatus = p.customFields?.approvalStatus || 'approved';
            const hasPendingVariants = p.variants?.some(v => (v.customFields as any)?.offerStatus === 'PENDING' || (v as any).customFieldsOfferstatus === 'PENDING');
            return approvalStatus === 'pending' || hasPendingVariants;
        }).length;
        const unvalidatedVariantsCount = products.reduce((acc, p) => {
            const pendingInProd = p.variants?.filter(v => {
                const st = (v.customFields as any)?.offerStatus || (v as any).customFieldsOfferstatus;
                return st === 'PENDING' || st === 'pending';
            }).length || 0;
            return acc + pendingInProd;
        }, 0);
        const approvedProducts = products.filter(p => (p.customFields?.approvalStatus || 'approved') === 'approved').length;
        const totalVariants = products.reduce((acc, p) => acc + (p.variants?.length || 0), 0);

        return {
            totalProducts,
            officialCount,
            vendorProposalCount,
            pendingProducts,
            unvalidatedVariantsCount,
            approvedProducts,
            totalVariants,
        };
    }, [products]);

    // Tab switcher with clean reset
    const handleTabChange = (newTab: 'official' | 'vendor_proposals' | 'pending' | 'unvalidated_variants' | 'settings') => {
        setActiveTab(newTab);
        setCurrentPage(1);
        setSelectedVendor('all');
        setSelectedStatus('all');
        setSelectedCategory('all');
        setSearchTerm('');
    };

    // Filtered Products
    const filteredProducts = useMemo(() => {
        return products.filter(p => {
            const approvalStatus = p.customFields?.approvalStatus || 'approved';
            const vendorId = p.customFields?.vendor?.id || '';
            const isVendorProposal = !!p.customFields?.vendor && p.customFields.vendor.name !== 'Ahizan';
            const hasPendingVariants = p.variants?.some(v => (v.customFields as any)?.offerStatus === 'PENDING' || (v as any).customFieldsOfferstatus === 'PENDING');
            const isPending = approvalStatus === 'pending' || hasPendingVariants;

            // Tab restriction
            if (activeTab === 'pending' && !isPending) {
                return false;
            }
            if (activeTab === 'unvalidated_variants' && !hasPendingVariants) {
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

    // Sorted Products
    const sortedProducts = useMemo(() => {
        const list = [...filteredProducts];
        list.sort((a, b) => {
            if (sortBy === 'name_asc') return a.name.localeCompare(b.name);
            if (sortBy === 'name_desc') return b.name.localeCompare(a.name);
            if (sortBy === 'price_asc') return (a.variants?.[0]?.price || 0) - (b.variants?.[0]?.price || 0);
            if (sortBy === 'price_desc') return (b.variants?.[0]?.price || 0) - (a.variants?.[0]?.price || 0);
            if (sortBy === 'variants_desc') return (b.variants?.length || 0) - (a.variants?.length || 0);
            if (sortBy === 'created_asc') return Number(a.id) - Number(b.id);
            return Number(b.id) - Number(a.id); // default created_desc
        });
        return list;
    }, [filteredProducts, sortBy]);

    // Paginated Products
    const totalPages = Math.max(1, Math.ceil(sortedProducts.length / itemsPerPage));
    const paginatedProducts = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return sortedProducts.slice(start, start + itemsPerPage);
    }, [sortedProducts, currentPage, itemsPerPage]);

    // Approval / Moderation Mutation
    const approvalMutation = useMutation({
        mutationFn: (variables: {
            id: string;
            approvalStatus: string;
            rejectionReason?: string;
            convertToOfficialCatalog?: boolean;
            name?: string;
            slug?: string;
            shortDescription?: string;
            description?: string;
            officialSku?: string;
            ean?: string;
            collectionIds?: string[];
            facetValueIds?: string[];
            approveVendorOffer?: boolean;
        }) =>
            fetchGraphQL(ADMIN_REVIEW_PRODUCT, {
                id: variables.id,
                status: variables.approvalStatus,
                rejectionReason: variables.rejectionReason || null,
                convertToOfficialCatalog: !!variables.convertToOfficialCatalog,
                name: variables.name || null,
                slug: variables.slug || null,
                shortDescription: variables.shortDescription || null,
                description: variables.description || null,
                officialSku: variables.officialSku || null,
                ean: variables.ean || null,
                collectionIds: variables.collectionIds || null,
                facetValueIds: variables.facetValueIds || null,
                approveVendorOffer: variables.approveVendorOffer !== undefined ? variables.approveVendorOffer : true,
            }),
        onSuccess: async (data: any, variables: any) => {
            queryClient.invalidateQueries({ queryKey: ['marketplaceProducts'] });
            if (variables?.id) {
                try {
                    const freshOffers = await fetchGraphQL(GET_SELLER_OFFERS_FOR_PRODUCT, { productId: variables.id });
                    if (freshOffers?.sellerOffersForProduct) {
                        setOffersMap(prev => ({ ...prev, [variables.id]: freshOffers.sellerOffersForProduct }));
                    }
                } catch (_) {}
            }
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

    const handleOpenReview = async (product: MarketplaceProduct) => {
        setReviewProduct(product);
        setReviewDecision(product.customFields?.approvalStatus === 'rejected' ? 'rejected' : 'approved_official');
        setRejectionReasonInput(product.customFields?.rejectionReason || '');
        setRejectScope('all');
        setRejectedOfferIds([]);
        setRegraftSearchTerm('');
        setSelectedTargetProduct(null);
        setIsLoadingRegraftSearch(true);

        // Pre-fill Official Product form fields from vendor submission
        setOfficialTitle(product.name || '');
        setOfficialSlug(product.slug || (product.name ? product.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : ''));
        setOfficialShortDescription(product.customFields?.shortDescription || '');
        setOfficialDescription(product.description || '');
        setOfficialSku(product.variants?.[0]?.sku || `AHZ-${product.id}`);
        setOfficialEan((product.variants?.[0]?.customFields as any)?.ean || '');
        setOfficialCollectionIds((product.collections || []).map((c: any) => c.id));
        setOfficialFacetValueIds((product.facetValues || []).map((f: any) => f.id));
        setApproveVendorOfferCheckbox(true);

        try {
            // Fetch live seller offers and official products concurrently
            const [offersData, officialProdsData] = await Promise.all([
                fetchGraphQL(GET_SELLER_OFFERS_FOR_PRODUCT, { productId: product.id }).catch(() => null),
                fetchGraphQL(SEARCH_OFFICIAL_PRODUCTS, { term: '', take: 20 }).catch(() => null)
            ]);

            if (offersData?.sellerOffersForProduct) {
                setOffersMap(prev => ({ ...prev, [product.id]: offersData.sellerOffersForProduct }));
            }

            const items = (officialProdsData?.searchOfficialProducts?.items || []).filter((p: any) => String(p.id) !== String(product.id));
            setRegraftSearchResults(items);
        } catch (err) {
            console.error('Error prefetching offers or official products:', err);
        } finally {
            setIsLoadingRegraftSearch(false);
        }
    };

    const handleReviewAndReassign = async (targetProduct: any) => {
        if (!reviewProduct || !targetProduct) return;

        setIsSubmittingReview(true);
        try {
            // Find all variant IDs to move from:
            // 1. reviewProduct.variants
            // 2. offersMap[reviewProduct.id]
            // 3. Fallback direct GraphQL fetch
            let variantIds: string[] = [];

            if (reviewProduct.variants && reviewProduct.variants.length > 0) {
                variantIds = reviewProduct.variants.map((v: any) => String(v.id)).filter(Boolean);
            }

            if (variantIds.length === 0 && offersMap[reviewProduct.id] && offersMap[reviewProduct.id].length > 0) {
                variantIds = offersMap[reviewProduct.id]
                    .map((off: any) => off.productVariant?.id)
                    .filter(Boolean)
                    .map(String);
            }

            if (variantIds.length === 0) {
                // Fallback: Fetch product with variants directly from GraphQL
                const freshProd = await fetchGraphQL(`
                    query GetProductVariantsDirect($id: ID!) {
                        product(id: $id) {
                            id
                            variants {
                                id
                            }
                        }
                    }
                `, { id: reviewProduct.id });
                if (freshProd?.product?.variants && freshProd.product.variants.length > 0) {
                    variantIds = freshProd.product.variants.map((v: any) => String(v.id)).filter(Boolean);
                }
            }

            if (variantIds.length === 0) {
                alert('Aucune déclinaison trouvée sur cette proposition.');
                setIsSubmittingReview(false);
                return;
            }

            for (const varId of variantIds) {
                await fetchGraphQL(REASSIGN_VARIANT_TO_PRODUCT, {
                    variantId: varId,
                    targetProductId: targetProduct.id,
                    approveOffer: approveVendorOfferCheckbox,
                });
            }

            // If the source proposition product is distinct from target product, clean up the empty proposition shell
            if (String(reviewProduct.id) !== String(targetProduct.id) && reviewProduct.customFields?.vendor) {
                await fetchGraphQL(DELETE_PRODUCT, { id: reviewProduct.id }).catch(() => null);
            }

            await queryClient.invalidateQueries({ queryKey: ['marketplaceProducts'] });
            alert(`Déclinaisons raccordées avec succès sur la fiche officielle "${targetProduct.name}" !`);
            setReviewProduct(null);
        } catch (err: any) {
            console.error('Error reassigning variant:', err);
            alert('Erreur lors du raccordement : ' + err.message);
        } finally {
            setIsSubmittingReview(false);
        }
    };

    const handleSubmitReview = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!reviewProduct) return;

        if (reviewDecision === 'rejected' && !rejectionReasonInput.trim()) {
            alert('Veuillez indiquer un motif de refus pour informer le vendeur.');
            return;
        }

        setIsSubmittingReview(true);
        if (reviewDecision === 'approved_official') {
            approvalMutation.mutate({
                id: reviewProduct.id,
                approvalStatus: 'approved',
                convertToOfficialCatalog: true,
                name: officialTitle.trim() || reviewProduct.name,
                slug: officialSlug.trim() || undefined,
                shortDescription: officialShortDescription.trim(),
                description: officialDescription.trim(),
                officialSku: officialSku.trim() || undefined,
                ean: officialEan.trim() || undefined,
                collectionIds: officialCollectionIds.length > 0 ? officialCollectionIds : undefined,
                facetValueIds: officialFacetValueIds.length > 0 ? officialFacetValueIds : undefined,
                approveVendorOffer: approveVendorOfferCheckbox,
                rejectionReason: '',
            });
        } else if (reviewDecision === 'rejected') {
            if (rejectScope === 'specific_offer' && rejectedOfferIds.length > 0) {
                try {
                    for (const offerId of rejectedOfferIds) {
                        await fetchGraphQL(ADMIN_REVIEW_SELLER_OFFER, {
                            id: offerId,
                            status: 'rejected',
                            rejectionReason: rejectionReasonInput,
                        });
                    }
                    await queryClient.invalidateQueries({ queryKey: ['marketplaceProducts'] });
                    const updatedOffers = await fetchGraphQL(GET_SELLER_OFFERS_FOR_PRODUCT, { productId: reviewProduct.id });
                    if (updatedOffers?.sellerOffersForProduct) {
                        setOffersMap(prev => ({ ...prev, [reviewProduct.id]: updatedOffers.sellerOffersForProduct }));
                    }
                    alert(`${rejectedOfferIds.length} offre(s) spécifique(s) rejetée(s) avec succès.`);
                    setReviewProduct(null);
                } catch (err: any) {
                    alert('Erreur lors du rejet des offres : ' + err.message);
                } finally {
                    setIsSubmittingReview(false);
                }
                return;
            }

            approvalMutation.mutate({
                id: reviewProduct.id,
                approvalStatus: 'rejected',
                convertToOfficialCatalog: false,
                rejectionReason: rejectionReasonInput,
            });
        } else {
            approvalMutation.mutate({
                id: reviewProduct.id,
                approvalStatus: 'approved',
                convertToOfficialCatalog: false,
                rejectionReason: '',
            });
        }
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

        // Initialize assets list
        const initialAssets: Array<{ id: string; preview: string }> = [];
        const seenIds: { [key: string]: boolean } = {};

        if (product.featuredAsset?.id && product.featuredAsset.preview) {
            initialAssets.push({ id: product.featuredAsset.id, preview: product.featuredAsset.preview });
            seenIds[product.featuredAsset.id] = true;
        }

        if (product.assets && product.assets.length > 0) {
            for (const a of product.assets) {
                if (a?.id && a.preview && !seenIds[a.id]) {
                    initialAssets.push({ id: a.id, preview: a.preview });
                    seenIds[a.id] = true;
                }
            }
        }

        setEditAssets(initialAssets);
        setEditFeaturedAssetId(product.featuredAsset?.id || (initialAssets[0]?.id ?? null));
    };

    const processAdminCropQueue = (files: File[]) => {
        if (!files || files.length === 0) return;
        const firstFile = files[0];
        const reader = new FileReader();
        reader.onload = () => {
            setAdminCropState({
                queue: files,
                currentIndex: 0,
                currentSrc: reader.result as string,
                currentFile: firstFile,
            });
        };
        reader.readAsDataURL(firstFile);
    };

    const handleAssetUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files: File[] = Array.prototype.slice.call(e.target.files || []);
        if (files.length === 0) return;
        processAdminCropQueue(files);
        e.target.value = '';
    };

    const handleAdminCropComplete = async (finalFile: File) => {
        if (!adminCropState) return;
        setIsUploadingAssets(true);
        try {
            const asset = await uploadAssetFile(finalFile);
            if (asset?.id) {
                setEditAssets(prev => {
                    const next = [...prev, asset];
                    if (!editFeaturedAssetId && next.length > 0) {
                        setEditFeaturedAssetId(next[0].id);
                    }
                    return next;
                });
            }
        } catch (err: any) {
            console.error('Asset upload error:', err);
            alert('Erreur lors du téléversement : ' + err.message);
        } finally {
            setIsUploadingAssets(false);
        }

        const nextIndex = adminCropState.currentIndex + 1;
        if (nextIndex < adminCropState.queue.length) {
            const nextFile = adminCropState.queue[nextIndex];
            const reader = new FileReader();
            reader.onload = () => {
                setAdminCropState({
                    queue: adminCropState.queue,
                    currentIndex: nextIndex,
                    currentSrc: reader.result as string,
                    currentFile: nextFile,
                });
            };
            reader.readAsDataURL(nextFile);
        } else {
            setAdminCropState(null);
        }
    };

    const handleSetFeaturedAsset = (assetId: string) => {
        setEditFeaturedAssetId(assetId);
    };

    const handleRemoveAsset = (assetId: string) => {
        setEditAssets(prev => {
            const filtered = prev.filter(a => a.id !== assetId);
            if (editFeaturedAssetId === assetId) {
                setEditFeaturedAssetId(filtered.length > 0 ? filtered[0].id : null);
            }
            return filtered;
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
                    featuredAssetId: editFeaturedAssetId,
                    assetIds: editAssets.map(a => a.id),
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

    // Handlers for "Greffer à un autre produit"
    const handleOpenRegraftModal = async (variant: any, currentProduct: MarketplaceProduct, offer?: any) => {
        setRegraftModalData({ variant, currentProduct, offer });
        setRegraftTab('existing');
        setSelectedTargetProduct(null);
        setRegraftSearchTerm('');
        setIsLoadingRegraftSearch(true);

        // Pre-fill creation fields for the new official product tab
        const defaultName = variant?.name || currentProduct.name || '';
        setRegraftNewTitle(defaultName);
        setRegraftNewSlug(defaultName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
        setRegraftNewShortDesc(currentProduct.customFields?.shortDescription || '');
        setRegraftNewDesc(currentProduct.description || '');
        setRegraftNewSku(variant?.sku || offer?.sku || `AHZ-${variant?.id || currentProduct.id}`);
        setRegraftNewEan((variant?.customFields as any)?.ean || '');
        setRegraftNewCollectionIds((currentProduct.collections || []).map((c: any) => c.id));
        setRegraftNewFacetValueIds(((currentProduct as any).facetValues || []).map((f: any) => f.id));
        setRegraftNewApproveOffer(true);

        try {
            const data = await fetchGraphQL(SEARCH_OFFICIAL_PRODUCTS, { term: '', take: 20 });
            const items = (data?.searchOfficialProducts?.items || []).filter((p: any) => String(p.id) !== String(currentProduct.id));
            setRegraftSearchResults(items);
        } catch (err) {
            console.error('Error searching products for regraft:', err);
        } finally {
            setIsLoadingRegraftSearch(false);
        }
    };

    const handleSearchTargetProducts = async (term: string) => {
        setRegraftSearchTerm(term);
        if (!regraftModalData) return;
        setIsLoadingRegraftSearch(true);
        try {
            const data = await fetchGraphQL(SEARCH_OFFICIAL_PRODUCTS, { term: term.trim() || undefined, take: 20 });
            const items = (data?.searchOfficialProducts?.items || []).filter((p: any) => String(p.id) !== String(regraftModalData.currentProduct.id));
            setRegraftSearchResults(items);
        } catch (err) {
            console.error('Error searching products for regraft:', err);
        } finally {
            setIsLoadingRegraftSearch(false);
        }
    };

    const handleConfirmRegraft = async () => {
        if (!regraftModalData || !selectedTargetProduct) return;
        const variantId = regraftModalData.variant?.id || regraftModalData.offer?.productVariant?.id;
        if (!variantId) {
            alert('Déclinaison introuvable');
            return;
        }

        setIsSubmittingRegraft(true);
        try {
            await fetchGraphQL(REASSIGN_VARIANT_TO_PRODUCT, {
                variantId,
                targetProductId: selectedTargetProduct.id,
            });

            // Invalidate products query
            await queryClient.invalidateQueries({ queryKey: ['marketplaceProducts'] });

            // Refresh offers for current product and target product
            if (regraftModalData.currentProduct?.id) {
                const currentData = await fetchGraphQL(GET_SELLER_OFFERS_FOR_PRODUCT, { productId: regraftModalData.currentProduct.id });
                if (currentData?.sellerOffersForProduct) {
                    setOffersMap(prev => ({ ...prev, [regraftModalData.currentProduct.id]: currentData.sellerOffersForProduct }));
                }
            }
            if (selectedTargetProduct.id) {
                const targetData = await fetchGraphQL(GET_SELLER_OFFERS_FOR_PRODUCT, { productId: selectedTargetProduct.id });
                if (targetData?.sellerOffersForProduct) {
                    setOffersMap(prev => ({ ...prev, [selectedTargetProduct.id]: targetData.sellerOffersForProduct }));
                }
            }

            alert(`Déclinaison transférée avec succès sous "${selectedTargetProduct.name}" !`);
            setRegraftModalData(null);
            setSelectedTargetProduct(null);
        } catch (err: any) {
            console.error('Error regrafting variant to product:', err);
            alert('Erreur lors du transfert : ' + err.message);
        } finally {
            setIsSubmittingRegraft(false);
        }
    };

    const handleCreateOfficialAndRegraft = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!regraftModalData) return;
        const variantId = regraftModalData.variant?.id || regraftModalData.offer?.productVariant?.id;
        if (!variantId) {
            alert('ID de déclinaison introuvable.');
            return;
        }

        if (!regraftNewTitle.trim()) {
            alert('Veuillez renseigner le nom de la nouvelle fiche officielle.');
            return;
        }

        setIsSubmittingRegraft(true);
        try {
            const data = await fetchGraphQL(CREATE_OFFICIAL_PRODUCT_FROM_VARIANT, {
                variantId,
                name: regraftNewTitle.trim(),
                slug: regraftNewSlug.trim() || undefined,
                shortDescription: regraftNewShortDesc.trim() || undefined,
                description: regraftNewDesc.trim() || undefined,
                officialSku: regraftNewSku.trim() || undefined,
                ean: regraftNewEan.trim() || undefined,
                collectionIds: regraftNewCollectionIds.length > 0 ? regraftNewCollectionIds : undefined,
                facetValueIds: regraftNewFacetValueIds.length > 0 ? regraftNewFacetValueIds : undefined,
                approveOffer: regraftNewApproveOffer,
            });

            await queryClient.invalidateQueries({ queryKey: ['marketplaceProducts'] });
            if (regraftModalData.currentProduct?.id) {
                const currentData = await fetchGraphQL(GET_SELLER_OFFERS_FOR_PRODUCT, { productId: regraftModalData.currentProduct.id });
                if (currentData?.sellerOffersForProduct) {
                    setOffersMap(prev => ({ ...prev, [regraftModalData.currentProduct.id]: currentData.sellerOffersForProduct }));
                }
            }

            alert(`Nouvelle fiche officielle "${data?.createOfficialProductFromVariant?.name || regraftNewTitle}" créée avec succès et déclinaison rattachée !`);
            setRegraftModalData(null);
        } catch (err: any) {
            console.error('Error creating official product from variant:', err);
            alert('Erreur lors de la création de la fiche : ' + err.message);
        } finally {
            setIsSubmittingRegraft(false);
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
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800, letterSpacing: '-0.02em', color: '#0f172a' }}>
                        Gestion du Catalogue &amp; Offres Vendeurs
                    </h1>
                    <p style={{ margin: '3px 0 0 0', fontSize: '13px', color: '#64748b', fontWeight: 500 }}>
                        Supervision du catalogue officiel Ahizan, modération des propositions et raccordement des offres marchands.
                    </p>
                </div>

                {/* Navigation 5 Onglets Stricts */}
                <div style={{ display: 'flex', gap: '4px', background: '#f1f5f9', padding: '4px', borderRadius: '10px', border: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
                    <button
                        onClick={() => handleTabChange('official')}
                        style={{
                            padding: '8px 16px', borderRadius: '8px', border: 'none', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                            background: activeTab === 'official' ? '#0f172a' : 'transparent',
                            color: activeTab === 'official' ? '#ffffff' : '#64748b',
                            boxShadow: activeTab === 'official' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                            transition: 'all 0.15s',
                        }}
                    >
                        Catalogue Officiel Ahizan ({metrics.officialCount})
                    </button>
                    <button
                        onClick={() => handleTabChange('vendor_proposals')}
                        style={{
                            padding: '8px 16px', borderRadius: '8px', border: 'none', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                            background: activeTab === 'vendor_proposals' ? '#0f172a' : 'transparent',
                            color: activeTab === 'vendor_proposals' ? '#ffffff' : '#64748b',
                            boxShadow: activeTab === 'vendor_proposals' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                            transition: 'all 0.15s',
                        }}
                    >
                        Propositions Vendeurs ({metrics.vendorProposalCount})
                    </button>
                    <button
                        onClick={() => handleTabChange('pending')}
                        style={{
                            padding: '8px 16px', borderRadius: '8px', border: 'none', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
                            background: activeTab === 'pending' ? '#0f172a' : 'transparent',
                            color: activeTab === 'pending' ? '#ffffff' : '#64748b',
                            boxShadow: activeTab === 'pending' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                            transition: 'all 0.15s',
                        }}
                    >
                        À valider
                        {metrics.pendingProducts > 0 && (
                            <span style={{ background: '#dc2626', color: '#ffffff', fontSize: '10px', fontWeight: 800, padding: '1px 6px', borderRadius: '8px' }}>
                                {metrics.pendingProducts}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => handleTabChange('unvalidated_variants')}
                        style={{
                            padding: '8px 16px', borderRadius: '8px', border: 'none', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
                            background: activeTab === 'unvalidated_variants' ? '#0f172a' : 'transparent',
                            color: activeTab === 'unvalidated_variants' ? '#ffffff' : '#64748b',
                            boxShadow: activeTab === 'unvalidated_variants' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                            transition: 'all 0.15s',
                        }}
                    >
                        Variants non validés
                        {metrics.unvalidatedVariantsCount > 0 && (
                            <span style={{ background: '#d97706', color: '#ffffff', fontSize: '10px', fontWeight: 800, padding: '1px 6px', borderRadius: '8px' }}>
                                {metrics.unvalidatedVariantsCount}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => handleTabChange('settings')}
                        style={{
                            padding: '8px 16px', borderRadius: '8px', border: 'none', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                            background: activeTab === 'settings' ? '#0f172a' : 'transparent',
                            color: activeTab === 'settings' ? '#ffffff' : '#64748b',
                            boxShadow: activeTab === 'settings' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                            transition: 'all 0.15s',
                        }}
                    >
                        Paramètres
                    </button>
                </div>
            </div>

            {/* ── 2. STATS OVERVIEW CARDS ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '16px 20px', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em' }}>Catalogue Officiel</div>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>{metrics.officialCount}</div>
                    <div style={{ fontSize: '11px', color: '#16a34a', fontWeight: 600, marginTop: '2px' }}>Fiches mères actives</div>
                </div>
                <div style={{ background: metrics.pendingProducts > 0 ? '#fffbeb' : '#ffffff', border: metrics.pendingProducts > 0 ? '1px solid #fde68a' : '1px solid #e2e8f0', borderRadius: '14px', padding: '16px 20px', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: metrics.pendingProducts > 0 ? '#b45309' : '#64748b', letterSpacing: '0.05em' }}>En Attente d'Examen</div>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: metrics.pendingProducts > 0 ? '#d97706' : '#0f172a', marginTop: '4px' }}>{metrics.pendingProducts}</div>
                    <div style={{ fontSize: '11px', color: '#b45309', fontWeight: 600, marginTop: '2px' }}>Articles à valider ou raccorder</div>
                </div>
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '16px 20px', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em' }}>Déclinaisons Totales</div>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>{metrics.totalVariants}</div>
                    <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, marginTop: '2px' }}>Variantes et offres actives</div>
                </div>
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '16px 20px', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em' }}>Prix Minimum Garanti</div>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>{minPrice.toLocaleString('fr-FR')} <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>FCFA</span></div>
                    <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, marginTop: '2px' }}>Seuil minimal autorisé à la vente</div>
                </div>
            </div>

            {/* ── 3. TAB CONTENT: SETTINGS TAB ── */}
            {activeTab === 'settings' && (
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                    <h2 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 12px 0', color: '#0f172a' }}>Configuration du Marché &amp; Prix Minimum</h2>
                    <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 16px 0', maxWidth: '600px' }}>
                        Définissez le montant minimal en FCFA à partir duquel un vendeur marchand peut créer une offre sur le catalogue Ahizan.
                    </p>
                    <form onSubmit={handleSaveMinPrice} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <div style={{ position: 'relative' }}>
                            <input
                                type="number"
                                min="0"
                                placeholder={minPrice.toString()}
                                value={minPriceInput !== '' ? minPriceInput : minPrice}
                                onChange={e => setMinPriceInput(e.target.value)}
                                style={{ width: '180px', padding: '10px 48px 10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', fontWeight: 700 }}
                            />
                            <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '11px', fontWeight: 700, color: '#94a3b8' }}>
                                FCFA
                            </span>
                        </div>
                        <button
                            type="submit"
                            disabled={isSavingMinPrice}
                            style={{ padding: '10px 20px', borderRadius: '8px', background: '#0f172a', color: '#ffffff', border: 'none', fontSize: '12px', fontWeight: 700, cursor: isSavingMinPrice ? 'not-allowed' : 'pointer' }}
                        >
                            {isSavingMinPrice ? 'Sauvegarde...' : 'Enregistrer le seuil'}
                        </button>
                    </form>
                </div>
            )}

            {/* ── 4. SEARCH & FILTER TOOLBAR ── */}
            {activeTab !== 'settings' && (
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '14px', marginBottom: '16px', display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                    {/* Search Input */}
                    <div style={{ flex: 1, minWidth: '220px' }}>
                        <input
                            type="text"
                            placeholder="Rechercher par nom de produit, SKU ou vendeur..."
                            value={searchTerm}
                            onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                            style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', background: '#f8fafc' }}
                        />
                    </div>

                    {/* Sort Selector */}
                    <div style={{ minWidth: '170px' }}>
                        <select
                            value={sortBy}
                            onChange={e => { setSortBy(e.target.value as any); setCurrentPage(1); }}
                            style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', fontWeight: 600, background: '#f8fafc', color: '#0f172a', cursor: 'pointer' }}
                        >
                            <option value="created_desc">Trier : Plus récents</option>
                            <option value="created_asc">Trier : Plus anciens</option>
                            <option value="name_asc">Trier : Nom (A - Z)</option>
                            <option value="name_desc">Trier : Nom (Z - A)</option>
                            <option value="price_asc">Trier : Prix croissant</option>
                            <option value="price_desc">Trier : Prix décroissant</option>
                            <option value="variants_desc">Trier : Déclinaisons</option>
                        </select>
                    </div>

                    {/* Category Filter */}
                    <div style={{ minWidth: '160px' }}>
                        <select
                            value={selectedCategory}
                            onChange={e => { setSelectedCategory(e.target.value); setCurrentPage(1); }}
                            style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', fontWeight: 600, background: '#f8fafc', color: '#334155', cursor: 'pointer' }}
                        >
                            <option value="all">Toutes les catégories</option>
                            {collections.map((c: any) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Vendor Filter */}
                    <div style={{ minWidth: '160px' }}>
                        <select
                            value={selectedVendor}
                            onChange={e => { setSelectedVendor(e.target.value); setCurrentPage(1); }}
                            style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', fontWeight: 600, background: '#f8fafc', color: '#334155', cursor: 'pointer' }}
                        >
                            <option value="all">Tous les vendeurs</option>
                            <option value="ahizan_official">Catalogue Officiel Ahizan</option>
                            {vendors.map((v: any) => (
                                <option key={v.id} value={v.id}>{v.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Status Filter */}
                    {activeTab === 'vendor_proposals' && (
                        <div style={{ minWidth: '140px' }}>
                            <select
                                value={selectedStatus}
                                onChange={e => { setSelectedStatus(e.target.value); setCurrentPage(1); }}
                                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', fontWeight: 600, background: '#f8fafc', color: '#334155', cursor: 'pointer' }}
                            >
                                <option value="all">Tous les statuts</option>
                                <option value="approved">Validé (En ligne)</option>
                                <option value="pending">En attente (Modération)</option>
                                <option value="rejected">Rejeté</option>
                            </select>
                        </div>
                    )}
                </div>
            )}

            {/* ── 5. PRODUCTS MASTER-DETAIL TABLE ── */}
            {activeTab !== 'settings' && (
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                    {isLoadingProducts ? (
                        <div style={{ padding: '50px', textAlign: 'center', color: '#64748b', fontSize: '13px', fontWeight: 600 }}>
                            Chargement des produits en cours...
                        </div>
                    ) : productsError ? (
                        <div style={{ padding: '30px', textAlign: 'center', color: '#ef4444', fontSize: '13px', fontWeight: 700 }}>
                            Erreur de chargement : {(productsError as Error).message}
                        </div>
                    ) : sortedProducts.length === 0 ? (
                        <div style={{ padding: '50px', textAlign: 'center', color: '#64748b' }}>
                            <h3 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>Aucun produit dans cette section</h3>
                            <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>Ajustez vos filtres de recherche ou sélectionnez un autre onglet.</p>
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                                <thead>
                                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        <th style={{ padding: '12px 18px', width: '36px' }}></th>
                                        <th style={{ padding: '12px 18px' }}>Produit</th>
                                        <th style={{ padding: '12px 18px' }}>Catégorie</th>
                                        <th style={{ padding: '12px 18px' }}>Vendeur Marchand</th>
                                        <th style={{ padding: '12px 18px' }}>Déclinaisons / Offres</th>
                                        <th style={{ padding: '12px 18px' }}>Statut</th>
                                        <th style={{ padding: '12px 18px', textAlign: 'right' }}>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedProducts.map((product) => {
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
                                                    <td style={{ padding: '12px 18px' }}>
                                                        <button
                                                            onClick={() => handleToggleExpandProduct(product.id)}
                                                            style={{
                                                                background: isExpanded ? '#0f172a' : '#f1f5f9',
                                                                color: isExpanded ? '#ffffff' : '#475569',
                                                                border: 'none', borderRadius: '6px', width: '24px', height: '24px',
                                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                cursor: 'pointer', fontSize: '10px', fontWeight: 800
                                                            }}
                                                            title="Afficher les déclinaisons rattachées"
                                                        >
                                                            {isExpanded ? '▼' : '▶'}
                                                        </button>
                                                    </td>

                                                    {/* Product Identity */}
                                                    <td style={{ padding: '12px 18px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                            {product.featuredAsset?.preview ? (
                                                                <img
                                                                    src={product.featuredAsset.preview}
                                                                    alt={product.name}
                                                                    style={{ width: '42px', height: '42px', borderRadius: '8px', objectFit: 'cover', border: '1px solid #e2e8f0' }}
                                                                />
                                                            ) : (
                                                                <div style={{ width: '42px', height: '42px', borderRadius: '8px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: '#64748b' }}>
                                                                    IMG
                                                                </div>
                                                            )}
                                                            <div>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                                    <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '13px' }}>{product.name}</span>
                                                                    {product.customFields?.vendor ? (
                                                                        <span style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', padding: '1px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 700 }}>
                                                                            Proposition Vendeur
                                                                        </span>
                                                                    ) : (
                                                                        <span style={{ background: '#e0e7ff', color: '#3730a3', border: '1px solid #c7d2fe', padding: '1px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 700 }}>
                                                                            Catalogue Officiel Ahizan
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
                                                    <td style={{ padding: '12px 18px' }}>
                                                        {product.collections && product.collections.length > 0 ? (
                                                            <span style={{ background: '#f1f5f9', color: '#334155', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600 }}>
                                                                {product.collections[0].name}
                                                            </span>
                                                        ) : (
                                                            <span style={{ color: '#94a3b8', fontSize: '11px' }}>Non classé</span>
                                                        )}
                                                    </td>

                                                    {/* Vendor */}
                                                    <td style={{ padding: '12px 18px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            {product.customFields?.vendor?.logo?.preview ? (
                                                                <img src={product.customFields.vendor.logo.preview} alt="" style={{ width: '20px', height: '20px', borderRadius: '50%', objectFit: 'cover' }} />
                                                            ) : null}
                                                            <span style={{ fontWeight: 600, color: product.customFields?.vendor ? '#0f172a' : '#2563eb' }}>
                                                                {vendorName}
                                                            </span>
                                                        </div>
                                                    </td>

                                                    {/* Variants Count & Base Price */}
                                                    <td style={{ padding: '12px 18px' }}>
                                                        <div>
                                                            <span style={{ fontWeight: 700, color: '#0f172a' }}>{product.variants?.length || 1} déclinaison(s)</span>
                                                            <div style={{ fontSize: '11px', color: '#16a34a', fontWeight: 700 }}>
                                                                {mainVariant?.price ? `${Math.round(mainVariant.price).toLocaleString('fr-FR')} FCFA` : 'Sur offre'}
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* Status Badge */}
                                                    <td style={{ padding: '12px 18px' }}>
                                                        {isPending ? (
                                                            <span style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                                En attente
                                                            </span>
                                                        ) : isRejected ? (
                                                            <span style={{ background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca', padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                                Rejeté
                                                            </span>
                                                        ) : (
                                                            <span style={{ background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0', padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                                Validé
                                                            </span>
                                                        )}
                                                    </td>

                                                    {/* Clean Action Column */}
                                                    <td style={{ padding: '12px 18px', textAlign: 'right' }}>
                                                        {activeTab === 'official' ? (
                                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                                                                <button
                                                                    onClick={() => handleOpenEditProduct(product)}
                                                                    style={{
                                                                        padding: '7px 14px',
                                                                        borderRadius: '8px',
                                                                        background: '#0f172a',
                                                                        color: '#ffffff',
                                                                        border: 'none',
                                                                        fontSize: '12px',
                                                                        fontWeight: 700,
                                                                        cursor: 'pointer',
                                                                    }}
                                                                >
                                                                    Modifier
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        if (confirm(`Êtes-vous sûr de vouloir supprimer définitivement le produit "${product.name}" ? Toutes les offres et déclinaisons vendeurs greffées à ce produit seront également supprimées.`)) {
                                                                            deleteMutation.mutate(product.id);
                                                                        }
                                                                    }}
                                                                    style={{
                                                                        padding: '7px 14px',
                                                                        borderRadius: '8px',
                                                                        background: '#dc2626',
                                                                        color: '#ffffff',
                                                                        border: 'none',
                                                                        fontSize: '12px',
                                                                        fontWeight: 700,
                                                                        cursor: 'pointer',
                                                                    }}
                                                                >
                                                                    Supprimer
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <button
                                                                onClick={() => handleOpenReview(product)}
                                                                style={{
                                                                    padding: '7px 14px',
                                                                    borderRadius: '8px',
                                                                    background: '#0f172a',
                                                                    color: '#ffffff',
                                                                    border: 'none',
                                                                    fontSize: '12px',
                                                                    fontWeight: 700,
                                                                    cursor: 'pointer',
                                                                }}
                                                            >
                                                                Examiner
                                                            </button>
                                                        )}
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
                                                                                const offerPrice = Math.round(offer.price);
                                                                                const promoPrice = offer.promotionalPrice ? Math.round(offer.promotionalPrice) : null;
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

                                                                                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                                                                                    {offer.status === 'approved' ? (
                                                                                                        <>
                                                                                                            <button
                                                                                                                type="button"
                                                                                                                disabled={isSavingOfferReview}
                                                                                                                onClick={() => handleReviewOffer(offer.id, product.id, 'disabled')}
                                                                                                                style={{ padding: '6px 10px', borderRadius: '6px', background: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd', fontSize: '11px', fontWeight: 800, cursor: 'pointer' }}
                                                                                                                title="Désactiver / Dévalider cette offre commerciale (masquée du Storefront)"
                                                                                                            >
                                                                                                                ⏸️ Désactiver
                                                                                                            </button>
                                                                                                            <button
                                                                                                                type="button"
                                                                                                                disabled={isSavingOfferReview}
                                                                                                                onClick={() => handleReviewOffer(offer.id, product.id, 'rejected')}
                                                                                                                style={{ padding: '6px 10px', borderRadius: '6px', background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca', fontSize: '11px', fontWeight: 800, cursor: 'pointer' }}
                                                                                                                title="Rejeter et retirer cette offre commerciale"
                                                                                                            >
                                                                                                                ❌ Rejeter
                                                                                                            </button>
                                                                                                        </>
                                                                                                    ) : (
                                                                                                        <>
                                                                                                            <button
                                                                                                                type="button"
                                                                                                                disabled={isSavingOfferReview}
                                                                                                                onClick={() => handleReviewOffer(offer.id, product.id, 'approved')}
                                                                                                                style={{ padding: '6px 10px', borderRadius: '6px', background: '#16a34a', color: '#ffffff', border: 'none', fontSize: '11px', fontWeight: 800, cursor: 'pointer' }}
                                                                                                            >
                                                                                                                ✓ Valider &amp; Activer
                                                                                                            </button>
                                                                                                            <button
                                                                                                                type="button"
                                                                                                                disabled={isSavingOfferReview}
                                                                                                                onClick={() => handleReviewOffer(offer.id, product.id, 'rejected')}
                                                                                                                style={{ padding: '6px 10px', borderRadius: '6px', background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca', fontSize: '11px', fontWeight: 800, cursor: 'pointer' }}
                                                                                                            >
                                                                                                                ❌ Rejeter
                                                                                                            </button>
                                                                                                        </>
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
                                                                                                    <button
                                                                                                        type="button"
                                                                                                        onClick={() => handleOpenRegraftModal(offer.productVariant, product, offer)}
                                                                                                        style={{ padding: '6px 10px', borderRadius: '6px', background: '#4f46e5', color: '#ffffff', border: 'none', fontSize: '11px', fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                                                                                        title="Déplacer/Greffer cette déclinaison sous un autre produit officiel Ahizan"
                                                                                                    >
                                                                                                        🔗 Greffer ailleurs
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
                                                                            <div key={v.id || vIdx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #f1f5f9', fontSize: '11px' }}>
                                                                                <div>
                                                                                    <span style={{ color: '#334155', fontWeight: 700 }}>#{vIdx + 1} {v.name || product.name}</span>
                                                                                    <span style={{ fontFamily: 'monospace', color: '#94a3b8', marginLeft: '8px' }}>SKU: {v.sku || 'N/A'}</span>
                                                                                </div>
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => handleOpenRegraftModal(v, product)}
                                                                                    style={{ padding: '4px 8px', borderRadius: '6px', background: '#eef2ff', color: '#4f46e5', border: '1px solid #c7d2fe', fontSize: '10px', fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                                                                                >
                                                                                    🔗 Raccorder ailleurs
                                                                                </button>
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

                    {/* ── PAGINATION BAR ── */}
                    {activeTab !== 'settings' && sortedProducts.length > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', flexWrap: 'wrap', gap: '12px' }}>
                            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
                                Affichage de <strong style={{ color: '#0f172a' }}>{(currentPage - 1) * itemsPerPage + 1}</strong> à <strong style={{ color: '#0f172a' }}>{Math.min(currentPage * itemsPerPage, sortedProducts.length)}</strong> sur <strong style={{ color: '#0f172a' }}>{sortedProducts.length}</strong> produits
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <select
                                    value={itemsPerPage}
                                    onChange={e => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                                    style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '11px', fontWeight: 600, background: '#ffffff', color: '#334155' }}
                                >
                                    <option value={10}>10 par page</option>
                                    <option value={25}>25 par page</option>
                                    <option value={50}>50 par page</option>
                                    <option value={100}>100 par page</option>
                                </select>

                                <button
                                    type="button"
                                    disabled={currentPage <= 1}
                                    onClick={() => setCurrentPage(1)}
                                    style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', fontSize: '11px', fontWeight: 700, cursor: currentPage <= 1 ? 'not-allowed' : 'pointer', opacity: currentPage <= 1 ? 0.4 : 1 }}
                                >
                                    « Premier
                                </button>
                                <button
                                    type="button"
                                    disabled={currentPage <= 1}
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', fontSize: '11px', fontWeight: 700, cursor: currentPage <= 1 ? 'not-allowed' : 'pointer', opacity: currentPage <= 1 ? 0.4 : 1 }}
                                >
                                    ‹ Précédent
                                </button>
                                
                                <span style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', padding: '0 4px' }}>
                                    Page {currentPage} / {totalPages}
                                </span>

                                <button
                                    type="button"
                                    disabled={currentPage >= totalPages}
                                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                    style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', fontSize: '11px', fontWeight: 700, cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer', opacity: currentPage >= totalPages ? 0.4 : 1 }}
                                >
                                    Suivant ›
                                </button>
                                <button
                                    type="button"
                                    disabled={currentPage >= totalPages}
                                    onClick={() => setCurrentPage(totalPages)}
                                    style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', fontSize: '11px', fontWeight: 700, cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer', opacity: currentPage >= totalPages ? 0.4 : 1 }}
                                >
                                    Dernier »
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ── 6. UNIFIED MODERATION & CATALOG BINDING MODAL ── */}
            {reviewProduct && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
                    <div style={{ background: '#ffffff', borderRadius: '24px', maxWidth: '750px', width: '100%', maxHeight: '92vh', overflowY: 'auto', padding: '28px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
                        {/* Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px', marginBottom: '20px' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 900, color: '#0f172a' }}>Modération &amp; Raccordement Catalogue</h3>
                                <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                                    Proposition soumise par : <strong style={{ color: '#0f172a' }}>{reviewProduct.customFields?.vendor?.name || 'Vendeur Marchand'}</strong>
                                </p>
                            </div>
                            <button onClick={() => setReviewProduct(null)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', fontSize: '15px', fontWeight: 800, color: '#64748b' }}>✕</button>
                        </div>

                        {/* Product & Vendor Summary Card */}
                        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '18px', marginBottom: '20px' }}>
                            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                                <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                                    {reviewProduct.featuredAsset?.preview && (
                                        <img src={reviewProduct.featuredAsset.preview} alt="" style={{ width: '68px', height: '68px', borderRadius: '12px', objectFit: 'cover', border: '1px solid #e2e8f0' }} />
                                    )}
                                    <div>
                                        <div style={{ fontSize: '16px', fontWeight: 900, color: '#0f172a' }}>{reviewProduct.name}</div>
                                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                                            Catégorie : <strong>{reviewProduct.collections?.[0]?.name || 'Non classé'}</strong> • {reviewProduct.variants?.length || 1} déclinaison(s)
                                        </div>
                                        {reviewProduct.customFields?.vendor && (
                                            <div style={{ fontSize: '11px', color: '#0369a1', background: '#e0f2fe', padding: '2px 8px', borderRadius: '6px', display: 'inline-block', marginTop: '4px', fontWeight: 700 }}>
                                                🏪 Boutique Marchande : {reviewProduct.customFields.vendor.name} ({reviewProduct.customFields.vendor.zone || 'Zone Nationale'})
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Global Product Status Badge */}
                                <div>
                                    {reviewProduct.customFields?.approvalStatus === 'approved' ? (
                                        <span style={{ background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 800 }}>
                                            ✓ Fiche Validée
                                        </span>
                                    ) : reviewProduct.customFields?.approvalStatus === 'rejected' ? (
                                        <span style={{ background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 800 }}>
                                            ✕ Fiche Rejetée
                                        </span>
                                    ) : (
                                        <span style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 800 }}>
                                            ⏳ En attente de Modération
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Detailed Breakdown of All Submitted Offers & Variants with Individual Actions */}
                            <div style={{ marginTop: '16px', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span>📋</span> Déclinaisons &amp; Offres Commerciales Soumises ({offersMap[reviewProduct.id]?.length || reviewProduct.variants?.length || 0}) :
                                    </div>
                                    <span style={{ fontSize: '10px', color: '#64748b' }}>Examinez le prix, stock, condition et délai de chaque offre</span>
                                </div>

                                <div style={{ display: 'grid', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                                    {(offersMap[reviewProduct.id] && offersMap[reviewProduct.id].length > 0) ? (
                                        offersMap[reviewProduct.id].map((offer: any, idx: number) => {
                                            const isApproved = offer.status === 'approved';
                                            const isRejected = offer.status === 'rejected';
                                            const isCorrection = offer.status === 'correction_requested';
                                            return (
                                                <div key={offer.id || idx} style={{ background: '#ffffff', border: isApproved ? '1px solid #bbf7d0' : isRejected ? '1px solid #fecaca' : '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                                                    <div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <strong style={{ fontSize: '13px', color: '#0f172a' }}>
                                                                {offer.productVariant?.name || `Déclinaison #${idx + 1}`}
                                                            </strong>
                                                            {offer.sku && (
                                                                <span style={{ fontSize: '10px', fontFamily: 'monospace', color: '#0284c7', background: '#f0f9ff', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                                                                    SKU: {offer.sku}
                                                                </span>
                                                            )}
                                                            <span style={{ fontSize: '10px', color: '#475569', background: '#f1f5f9', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                                                                {offer.condition === 'NEW' ? '✨ Neuf' : offer.condition || 'Neuf'}
                                                            </span>
                                                        </div>
                                                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '3px', display: 'flex', gap: '12px' }}>
                                                            <span>Vendeur : <strong style={{ color: '#0f172a' }}>{offer.vendor?.name || reviewProduct.customFields?.vendor?.name || 'Vendeur'}</strong></span>
                                                            <span>Stock : <strong style={{ color: offer.stock > 0 ? '#16a34a' : '#dc2626' }}>{offer.stock} unités</strong></span>
                                                            <span>Expédition : <strong>{offer.deliveryTimeValue ? `${offer.deliveryTimeValue} ${offer.deliveryTimeUnit || 'jours'}` : '24-48h'}</strong></span>
                                                        </div>
                                                        {offer.rejectionReason && (
                                                            <div style={{ fontSize: '10px', color: '#991b1b', background: '#fef2f2', padding: '3px 8px', borderRadius: '4px', marginTop: '4px' }}>
                                                                ⚠️ Motif : {offer.rejectionReason}
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                        <div style={{ textAlign: 'right' }}>
                                                            <div style={{ fontSize: '14px', fontWeight: 900, color: '#16a34a' }}>
                                                                {formatPrice(offer.price)}
                                                            </div>
                                                            <div style={{ marginTop: '2px' }}>
                                                                {isApproved ? (
                                                                    <span style={{ background: '#dcfce7', color: '#166534', padding: '1px 6px', borderRadius: '4px', fontSize: '9px', fontWeight: 800 }}>✓ Validée</span>
                                                                ) : isRejected ? (
                                                                    <span style={{ background: '#fee2e2', color: '#991b1b', padding: '1px 6px', borderRadius: '4px', fontSize: '9px', fontWeight: 800 }}>✕ Rejetée</span>
                                                                ) : isCorrection ? (
                                                                    <span style={{ background: '#fef3c7', color: '#92400e', padding: '1px 6px', borderRadius: '4px', fontSize: '9px', fontWeight: 800 }}>⚠️ Correction</span>
                                                                ) : (
                                                                    <span style={{ background: '#fef3c7', color: '#92400e', padding: '1px 6px', borderRadius: '4px', fontSize: '9px', fontWeight: 800 }}>⏳ En attente</span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div style={{ display: 'flex', gap: '4px' }}>
                                                            {offer.status !== 'approved' ? (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleReviewOffer(offer.id, reviewProduct.id, 'approved')}
                                                                    style={{ padding: '5px 8px', borderRadius: '6px', background: '#16a34a', color: '#ffffff', border: 'none', fontSize: '11px', fontWeight: 800, cursor: 'pointer' }}
                                                                    title="Approuver cette offre commerciale"
                                                                >
                                                                    ✓
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleReviewOffer(offer.id, reviewProduct.id, 'disabled')}
                                                                    style={{ padding: '5px 8px', borderRadius: '6px', background: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd', fontSize: '11px', fontWeight: 800, cursor: 'pointer' }}
                                                                    title="Mettre en pause / Dévalider"
                                                                >
                                                                    ⏸️
                                                                </button>
                                                            )}
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setReviewDecision('rejected');
                                                                    setRejectScope('specific_offer');
                                                                    setRejectedOfferIds([offer.id]);
                                                                }}
                                                                style={{ padding: '5px 8px', borderRadius: '6px', background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca', fontSize: '11px', fontWeight: 800, cursor: 'pointer' }}
                                                                title="Rejeter spécifiquement cette offre"
                                                            >
                                                                ✕
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        (reviewProduct.variants || []).map((v: any, idx: number) => (
                                            <div key={v.id || idx} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <strong style={{ fontSize: '13px', color: '#0f172a' }}>{v.name || `Déclinaison #${idx + 1}`}</strong>
                                                        {v.sku && <span style={{ fontSize: '10px', fontFamily: 'monospace', color: '#0284c7' }}>({v.sku})</span>}
                                                    </div>
                                                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                                                        Vendeur : <strong>{reviewProduct.customFields?.vendor?.name || 'Vendeur Marchand'}</strong> • Stock : <strong>{v.stockLevel ?? (v.stockOnHand || 0)}</strong>
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <div style={{ fontSize: '14px', fontWeight: 900, color: '#16a34a' }}>
                                                        {formatPrice(v.price)}
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setReviewDecision('rejected');
                                                            setRejectScope('specific_offer');
                                                            setRejectedOfferIds([v.id]);
                                                        }}
                                                        style={{ padding: '5px 8px', borderRadius: '6px', background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca', fontSize: '11px', fontWeight: 800, cursor: 'pointer' }}
                                                        title="Rejeter spécifiquement cette déclinaison"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Navigation Tabs for 3 Actions */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '20px', background: '#f1f5f9', padding: '6px', borderRadius: '14px' }}>
                            <button
                                type="button"
                                onClick={() => setReviewDecision('approved_vendor')}
                                style={{
                                    padding: '10px 12px', borderRadius: '10px', border: 'none', fontSize: '12px', fontWeight: 800, cursor: 'pointer',
                                    background: reviewDecision === 'approved_vendor' ? '#ffffff' : 'transparent',
                                    color: reviewDecision === 'approved_vendor' ? '#0284c7' : '#64748b',
                                    boxShadow: reviewDecision === 'approved_vendor' ? '0 2px 4px rgba(0,0,0,0.08)' : 'none',
                                    transition: 'all 0.2s',
                                }}
                            >
                                🔗 1. Relier à l'Existant
                            </button>
                            <button
                                type="button"
                                onClick={() => setReviewDecision('approved_official')}
                                style={{
                                    padding: '10px 12px', borderRadius: '10px', border: 'none', fontSize: '12px', fontWeight: 800, cursor: 'pointer',
                                    background: reviewDecision === 'approved_official' ? '#ffffff' : 'transparent',
                                    color: reviewDecision === 'approved_official' ? '#2563eb' : '#64748b',
                                    boxShadow: reviewDecision === 'approved_official' ? '0 2px 4px rgba(0,0,0,0.08)' : 'none',
                                    transition: 'all 0.2s',
                                }}
                            >
                                🏛️ 2. Créer Fiche Officielle
                            </button>
                            <button
                                type="button"
                                onClick={() => setReviewDecision('rejected')}
                                style={{
                                    padding: '10px 12px', borderRadius: '10px', border: 'none', fontSize: '12px', fontWeight: 800, cursor: 'pointer',
                                    background: reviewDecision === 'rejected' ? '#ffffff' : 'transparent',
                                    color: reviewDecision === 'rejected' ? '#dc2626' : '#64748b',
                                    boxShadow: reviewDecision === 'rejected' ? '0 2px 4px rgba(0,0,0,0.08)' : 'none',
                                    transition: 'all 0.2s',
                                }}
                            >
                                ❌ 3. Refuser / Corriger
                            </button>
                        </div>

                        {/* TAB 1: BIND TO EXISTING OFFICIAL PRODUCT */}
                        {reviewDecision === 'approved_vendor' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                <div style={{ fontSize: '12px', color: '#475569', lineHeight: '1.5' }}>
                                    Recherchez et sélectionnez la <strong>fiche produit officielle Ahizan</strong> dans le catalogue central pour y rattacher automatiquement cette déclinaison vendeur :
                                </div>
                                <input
                                    type="text"
                                    placeholder="Rechercher une fiche officielle par nom (ex: Samsung S24, iPhone...)"
                                    value={regraftSearchTerm}
                                    onChange={e => handleSearchTargetProducts(e.target.value)}
                                    style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px', fontFamily: 'inherit' }}
                                />
                                {isLoadingRegraftSearch ? (
                                    <div style={{ padding: '20px', textAlign: 'center', fontSize: '12px', color: '#64748b' }}>Recherche en cours...</div>
                                ) : (
                                    <div style={{ maxHeight: '220px', overflowY: 'auto', display: 'grid', gap: '8px', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '10px', background: '#f8fafc' }}>
                                        {regraftSearchResults.length === 0 ? (
                                            <div style={{ padding: '16px', textAlign: 'center', fontSize: '12px', color: '#64748b' }}>
                                                Aucun produit officiel correspondant trouvé. Tapez un autre mot-clé ou choisissez l'onglet <strong>"2. Créer Fiche Officielle"</strong>.
                                            </div>
                                        ) : (
                                            regraftSearchResults.map((prod: any) => {
                                                const isSelected = selectedTargetProduct?.id === prod.id;
                                                return (
                                                    <div
                                                        key={prod.id}
                                                        onClick={() => setSelectedTargetProduct(prod)}
                                                        style={{
                                                            padding: '10px 14px', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                            background: isSelected ? '#eff6ff' : '#ffffff',
                                                            border: isSelected ? '2px solid #2563eb' : '1px solid #e2e8f0',
                                                            transition: 'all 0.15s',
                                                        }}
                                                    >
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                            {prod.featuredAsset?.preview && (
                                                                <img src={prod.featuredAsset.preview} alt="" style={{ width: '36px', height: '36px', borderRadius: '6px', objectFit: 'cover' }} />
                                                            )}
                                                            <div>
                                                                <strong style={{ fontSize: '13px', color: '#0f172a' }}>{prod.name}</strong>
                                                                <div style={{ fontSize: '11px', color: '#64748b' }}>
                                                                    {prod.collections?.[0]?.name || 'Catalogue'} • {prod.variants?.length || 0} offre(s) déjà greffée(s)
                                                                </div>
                                                            </div>
                                                        </div>
                                                        {isSelected && <span style={{ fontSize: '16px', color: '#2563eb', fontWeight: 900 }}>✓</span>}
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                )}

                                {/* Offer Approval Toggle in Tab 1 */}
                                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <input
                                        type="checkbox"
                                        id="approveVendorOfferReassignToggle"
                                        checked={approveVendorOfferCheckbox}
                                        onChange={e => setApproveVendorOfferCheckbox(e.target.checked)}
                                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                    />
                                    <label htmlFor="approveVendorOfferReassignToggle" style={{ fontSize: '12px', color: '#0f172a', fontWeight: 700, cursor: 'pointer' }}>
                                        Approuver également l'offre commerciale du vendeur immédiatement (Prix : {formatPrice(reviewProduct.variants?.[0]?.price || 0)})
                                    </label>
                                </div>

                                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                                    <button
                                        type="button"
                                        onClick={() => setReviewProduct(null)}
                                        style={{ padding: '10px 18px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#ffffff', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                                    >
                                        Annuler
                                    </button>
                                    <button
                                        type="button"
                                        disabled={!selectedTargetProduct || isSubmittingReview}
                                        onClick={() => handleReviewAndReassign(selectedTargetProduct)}
                                        style={{
                                            padding: '10px 22px', borderRadius: '10px', border: 'none', fontSize: '12px', fontWeight: 800, cursor: selectedTargetProduct ? 'pointer' : 'not-allowed',
                                            background: selectedTargetProduct ? '#0284c7' : '#94a3b8',
                                            color: '#ffffff',
                                        }}
                                    >
                                        {isSubmittingReview ? 'Raccordement...' : '🔗 Raccorder à ce Produit Officiel'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* TAB 2: CREATE / PROMOTE TO OFFICIAL PRODUCT (WITH FULL EDITING & OFFER APPROVAL TOGGLE) */}
                        {reviewDecision === 'approved_official' && (
                            <form onSubmit={handleSubmitReview} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div style={{ fontSize: '12px', color: '#475569', lineHeight: '1.5' }}>
                                    Personnalisez la <strong>nouvelle fiche produit officielle Ahizan</strong>. Ce produit mère deviendra la référence unique du catalogue central et recevra la déclinaison du vendeur.
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                                            Titre Officiel Ahizan *
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={officialTitle}
                                            onChange={e => setOfficialTitle(e.target.value)}
                                            style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                                            Slug SEO Unique
                                        </label>
                                        <input
                                            type="text"
                                            value={officialSlug}
                                            onChange={e => setOfficialSlug(e.target.value)}
                                            style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                                        />
                                    </div>
                                </div>

                                {/* SKU Officiel & Code EAN-13 */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                                            SKU Officiel Central Ahizan *
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={officialSku}
                                            onChange={e => setOfficialSku(e.target.value)}
                                            placeholder="Ex: AHZ-S24U-TITANIUM"
                                            style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', fontFamily: 'monospace' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                                            Code-barres International EAN-13 (Optionnel)
                                        </label>
                                        <input
                                            type="text"
                                            value={officialEan}
                                            onChange={e => setOfficialEan(e.target.value)}
                                            placeholder="Ex: 8806091234567"
                                            style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', fontFamily: 'monospace' }}
                                        />
                                    </div>
                                </div>

                                {/* Arborescence Catégories & Sous-Catégories (Multi-sélection) */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                                        Arborescence Catégories &amp; Sous-Catégories Ahizan ({officialCollectionIds.length} sélectionnée(s)) :
                                    </label>
                                    <div style={{ maxHeight: '130px', overflowY: 'auto', display: 'flex', flexWrap: 'wrap', gap: '6px', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '10px', background: '#f8fafc' }}>
                                        {collections.map((c: any) => {
                                            const isSelected = officialCollectionIds.includes(c.id);
                                            return (
                                                <button
                                                    key={c.id}
                                                    type="button"
                                                    onClick={() => {
                                                        if (isSelected) {
                                                            setOfficialCollectionIds(officialCollectionIds.filter(id => id !== c.id));
                                                        } else {
                                                            setOfficialCollectionIds([...officialCollectionIds, c.id]);
                                                        }
                                                    }}
                                                    style={{
                                                        padding: '4px 10px',
                                                        borderRadius: '16px',
                                                        fontSize: '11px',
                                                        fontWeight: 700,
                                                        cursor: 'pointer',
                                                        border: isSelected ? '1px solid #2563eb' : '1px solid #cbd5e1',
                                                        background: isSelected ? '#2563eb' : '#ffffff',
                                                        color: isSelected ? '#ffffff' : '#475569',
                                                        transition: 'all 0.15s',
                                                    }}
                                                >
                                                    {isSelected ? '✓ ' : '+ '}{c.name}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Attributs & Facettes du Catalogue Ahizan */}
                                {facets.length > 0 && (
                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                                            Attributs &amp; Facettes du Catalogue ({officialFacetValueIds.length} sélectionné(s)) :
                                        </label>
                                        <div style={{ maxHeight: '130px', overflowY: 'auto', display: 'grid', gap: '8px', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '10px', background: '#f8fafc' }}>
                                            {facets.map((facet: any) => (
                                                <div key={facet.id}>
                                                    <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
                                                        {facet.name} :
                                                    </div>
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                                        {facet.values?.map((val: any) => {
                                                            const isSelected = officialFacetValueIds.includes(val.id);
                                                            return (
                                                                <button
                                                                    key={val.id}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        if (isSelected) {
                                                                            setOfficialFacetValueIds(officialFacetValueIds.filter(id => id !== val.id));
                                                                        } else {
                                                                            setOfficialFacetValueIds([...officialFacetValueIds, val.id]);
                                                                        }
                                                                    }}
                                                                    style={{
                                                                        padding: '4px 10px',
                                                                        borderRadius: '16px',
                                                                        fontSize: '11px',
                                                                        fontWeight: 600,
                                                                        cursor: 'pointer',
                                                                        border: isSelected ? '1px solid #0284c7' : '1px solid #cbd5e1',
                                                                        background: isSelected ? '#0284c7' : '#ffffff',
                                                                        color: isSelected ? '#ffffff' : '#475569',
                                                                        transition: 'all 0.15s',
                                                                    }}
                                                                >
                                                                    {isSelected ? '✓ ' : ''}{val.name}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                                        Petite Description (Accroche)
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Ex: Écran OLED 120Hz, 256Go, Appareil photo 50MP..."
                                        value={officialShortDescription}
                                        onChange={e => setOfficialShortDescription(e.target.value)}
                                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                                        Description Détaillée Officielle
                                    </label>
                                    <textarea
                                        rows={4}
                                        placeholder="Description complète des caractéristiques officielles du produit..."
                                        value={officialDescription}
                                        onChange={e => setOfficialDescription(e.target.value)}
                                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                                    />
                                </div>

                                {/* Offer Approval Toggle */}
                                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <input
                                        type="checkbox"
                                        id="approveVendorOfferToggle"
                                        checked={approveVendorOfferCheckbox}
                                        onChange={e => setApproveVendorOfferCheckbox(e.target.checked)}
                                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                    />
                                    <label htmlFor="approveVendorOfferToggle" style={{ fontSize: '12px', color: '#0f172a', fontWeight: 700, cursor: 'pointer' }}>
                                        Approuver également l'offre commerciale du vendeur immédiatement (Prix : {formatPrice(reviewProduct.variants?.[0]?.price || 0)})
                                    </label>
                                </div>
                                {!approveVendorOfferCheckbox && (
                                    <div style={{ fontSize: '11px', color: '#b45309', background: '#fffbeb', border: '1px solid #fef08a', padding: '10px', borderRadius: '8px' }}>
                                        ℹ️ La fiche officielle sera créée et publiée, et la déclinaison du vendeur y sera rattachée en statut <strong>En attente</strong>. Vous pourrez ensuite examiner et modérer son offre de prix séparément.
                                    </div>
                                )}

                                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                                    <button
                                        type="button"
                                        onClick={() => setReviewProduct(null)}
                                        style={{ padding: '10px 18px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#ffffff', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                                    >
                                        Annuler
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmittingReview || !officialTitle.trim()}
                                        style={{
                                            padding: '10px 24px', borderRadius: '10px', border: 'none', fontSize: '12px', fontWeight: 800, cursor: 'pointer',
                                            background: '#2563eb',
                                            color: '#ffffff',
                                        }}
                                    >
                                        {isSubmittingReview ? 'Création...' : '🏛️ Créer la Fiche Officielle & Rattacher'}
                                    </button>
                                </div>
                            </form>
                        )}

                        {/* TAB 3: REJECT WITH SCOPE & FEEDBACK */}
                        {reviewDecision === 'rejected' && (
                            <form onSubmit={handleSubmitReview} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '14px' }}>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#991b1b', marginBottom: '8px' }}>
                                        Que souhaitez-vous refuser / renvoyer en correction ?
                                    </label>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#7f1d1d', fontWeight: 700, cursor: 'pointer' }}>
                                            <input
                                                type="radio"
                                                name="rejectScope"
                                                checked={rejectScope === 'all'}
                                                onChange={() => setRejectScope('all')}
                                            />
                                            Refuser toute la proposition produit (la fiche et toutes ses déclinaisons)
                                        </label>
                                        {((offersMap[reviewProduct.id] && offersMap[reviewProduct.id].length > 0) || (reviewProduct.variants && reviewProduct.variants.length > 0)) && (
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#7f1d1d', fontWeight: 700, cursor: 'pointer' }}>
                                                <input
                                                    type="radio"
                                                    name="rejectScope"
                                                    checked={rejectScope === 'specific_offer'}
                                                    onChange={() => setRejectScope('specific_offer')}
                                                />
                                                Refuser uniquement des déclinaisons / offres spécifiques (conserver le produit)
                                            </label>
                                        )}
                                    </div>

                                    {rejectScope === 'specific_offer' && (
                                        <div style={{ marginTop: '12px', display: 'grid', gap: '6px', maxHeight: '140px', overflowY: 'auto', background: '#ffffff', padding: '8px', borderRadius: '8px', border: '1px solid #fca5a5' }}>
                                            <div style={{ fontSize: '11px', fontWeight: 700, color: '#991b1b' }}>Cochez la ou les offres / déclinaisons à refuser :</div>
                                            {(offersMap[reviewProduct.id] && offersMap[reviewProduct.id].length > 0) ? (
                                                offersMap[reviewProduct.id].map((off: any) => {
                                                    const isChecked = rejectedOfferIds.includes(off.id);
                                                    return (
                                                        <label key={off.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', padding: '6px 8px', background: isChecked ? '#fee2e2' : '#f8fafc', borderRadius: '6px', cursor: 'pointer' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isChecked}
                                                                    onChange={e => {
                                                                        if (e.target.checked) {
                                                                            setRejectedOfferIds([...rejectedOfferIds, off.id]);
                                                                        } else {
                                                                            setRejectedOfferIds(rejectedOfferIds.filter(id => id !== off.id));
                                                                        }
                                                                    }}
                                                                />
                                                                <strong>{off.productVariant?.name || 'Déclinaison'}</strong> ({off.sku || 'SKU N/A'})
                                                            </div>
                                                            <span style={{ fontWeight: 800, color: '#16a34a' }}>{formatPrice(off.price)}</span>
                                                        </label>
                                                    );
                                                })
                                            ) : (
                                                (reviewProduct.variants || []).map((v: any, idx: number) => {
                                                    const isChecked = rejectedOfferIds.includes(v.id);
                                                    return (
                                                        <label key={v.id || idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', padding: '6px 8px', background: isChecked ? '#fee2e2' : '#f8fafc', borderRadius: '6px', cursor: 'pointer' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isChecked}
                                                                    onChange={e => {
                                                                        if (e.target.checked) {
                                                                            setRejectedOfferIds([...rejectedOfferIds, v.id]);
                                                                        } else {
                                                                            setRejectedOfferIds(rejectedOfferIds.filter(id => id !== v.id));
                                                                        }
                                                                    }}
                                                                />
                                                                <strong>{v.name || `Déclinaison #${idx + 1}`}</strong> {v.sku && <span>({v.sku})</span>}
                                                            </div>
                                                            <span style={{ fontWeight: 800, color: '#16a34a' }}>{formatPrice(v.price)}</span>
                                                        </label>
                                                    );
                                                })
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <div style={{ fontSize: '12px', color: '#991b1b', lineHeight: '1.5', fontWeight: 700, marginBottom: '6px' }}>
                                        Motifs rapides de refus :
                                    </div>
                                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                        {['Photos floues / non conformes', 'Description insuffisante', 'Doublon existant au catalogue', 'Prix anormal / non conforme', 'Délai d\'expédition non réaliste', 'Produit non conforme à la charte'].map((chip) => (
                                            <button
                                                key={chip}
                                                type="button"
                                                onClick={() => setRejectionReasonInput(chip)}
                                                style={{ padding: '5px 12px', borderRadius: '14px', border: '1px solid #fca5a5', background: '#fee2e2', color: '#991b1b', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                                            >
                                                + {chip}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                                        Message d'explication détaillé pour le vendeur *
                                    </label>
                                    <textarea
                                        required
                                        rows={3}
                                        value={rejectionReasonInput}
                                        onChange={e => setRejectionReasonInput(e.target.value)}
                                        placeholder="Expliquez clairement ce que le vendeur doit corriger (photos, prix, stock, description)..."
                                        style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #fca5a5', fontSize: '12px', fontFamily: 'inherit', boxSizing: 'border-box' }}
                                    />
                                </div>

                                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                                    <button
                                        type="button"
                                        onClick={() => setReviewProduct(null)}
                                        style={{ padding: '10px 18px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#ffffff', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                                    >
                                        Annuler
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmittingReview || !rejectionReasonInput.trim() || (rejectScope === 'specific_offer' && rejectedOfferIds.length === 0)}
                                        style={{
                                            padding: '10px 24px', borderRadius: '10px', border: 'none', fontSize: '12px', fontWeight: 800, cursor: 'pointer',
                                            background: '#dc2626',
                                            color: '#ffffff',
                                        }}
                                    >
                                        {isSubmittingReview ? 'Envoi...' : rejectScope === 'specific_offer' ? `❌ Rejeter ${rejectedOfferIds.length} offre(s) sélectionnée(s)` : '❌ Confirmer le Refus de la Proposition'}
                                    </button>
                                </div>
                            </form>
                        )}
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
                            
                            {/* Visuals Management with Upload & Primary Star */}
                            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                    <div>
                                        <label style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', color: '#0f172a', display: 'block' }}>
                                            📸 Photos Officielles du Produit ({editAssets.length})
                                        </label>
                                        <span style={{ fontSize: '11px', color: '#64748b' }}>
                                            Sélectionnez l'image principale (⭐) et ajoutez de nouveaux visuels pour la fiche.
                                        </span>
                                    </div>
                                    <label style={{
                                        padding: '7px 14px',
                                        borderRadius: '8px',
                                        background: isUploadingAssets ? '#94a3b8' : '#2563eb',
                                        color: '#ffffff',
                                        fontSize: '11px',
                                        fontWeight: 800,
                                        cursor: isUploadingAssets ? 'not-allowed' : 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                    }}>
                                        <span>{isUploadingAssets ? '⏳ Téléversement...' : '➕ Ajouter des photos'}</span>
                                        <input
                                            type="file"
                                            multiple
                                            accept="image/*"
                                            disabled={isUploadingAssets}
                                            onChange={handleAssetUpload}
                                            style={{ display: 'none' }}
                                        />
                                    </label>
                                </div>

                                {editAssets.length === 0 ? (
                                    <div style={{ padding: '24px', background: '#ffffff', border: '2px dashed #cbd5e1', borderRadius: '10px', textAlign: 'center', color: '#64748b', fontSize: '12px' }}>
                                        Aucune photo attachée à ce produit. Cliquez sur "Ajouter des photos" ci-dessus.
                                    </div>
                                ) : (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '12px', marginTop: '10px' }}>
                                        {editAssets.map((asset, index) => {
                                            const isFeatured = editFeaturedAssetId === asset.id || (!editFeaturedAssetId && index === 0);
                                            return (
                                                <div
                                                    key={asset.id || index}
                                                    style={{
                                                        position: 'relative',
                                                        borderRadius: '10px',
                                                        overflow: 'hidden',
                                                        border: isFeatured ? '2px solid #2563eb' : '1px solid #cbd5e1',
                                                        background: '#ffffff',
                                                        boxShadow: isFeatured ? '0 0 0 2px rgba(37,99,235,0.2)' : 'none',
                                                    }}
                                                >
                                                    <img
                                                        src={asset.preview}
                                                        alt=""
                                                        style={{ width: '100%', height: '100px', objectFit: 'cover', display: 'block' }}
                                                    />

                                                    {/* Primary Star / Featured Badge */}
                                                    <div style={{ position: 'absolute', top: '4px', left: '4px' }}>
                                                        {isFeatured ? (
                                                            <span style={{ background: '#2563eb', color: '#ffffff', fontSize: '9px', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                                                                ⭐ Principale
                                                            </span>
                                                        ) : (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleSetFeaturedAsset(asset.id)}
                                                                style={{ background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(2px)', color: '#ffffff', border: 'none', borderRadius: '4px', padding: '2px 5px', fontSize: '10px', cursor: 'pointer' }}
                                                                title="Définir comme photo principale"
                                                            >
                                                                ☆ Choisir
                                                            </button>
                                                        )}
                                                    </div>

                                                    {/* Delete Asset Button */}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveAsset(asset.id)}
                                                        style={{
                                                            position: 'absolute',
                                                            top: '4px',
                                                            right: '4px',
                                                            background: 'rgba(220,38,38,0.85)',
                                                            color: '#ffffff',
                                                            border: 'none',
                                                            borderRadius: '50%',
                                                            width: '20px',
                                                            height: '20px',
                                                            fontSize: '11px',
                                                            fontWeight: 800,
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                        }}
                                                        title="Retirer cette photo"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
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

            {/* ── 8. MODAL: REGRAFT VARIANT TO ANOTHER PRODUCT ("Greffer à un autre produit") ── */}
            {regraftModalData && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '20px' }}>
                    <div style={{ background: '#ffffff', borderRadius: '20px', maxWidth: '720px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '24px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
                        
                        {/* Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '14px', marginBottom: '16px' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span>🔗</span> Greffer la Déclinaison à un Produit Officiel
                                </h3>
                                <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                                    Déplacez cette déclinaison (et toutes ses offres marchandes) sous une fiche officielle existante ou créez une nouvelle fiche dédiée.
                                </p>
                            </div>
                            <button onClick={() => setRegraftModalData(null)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', fontSize: '14px', fontWeight: 700 }}>✕</button>
                        </div>

                        {/* Current Source Info */}
                        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px', marginBottom: '16px' }}>
                            <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#64748b', marginBottom: '6px' }}>
                                📦 Déclinaison source à déplacer :
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
                                        {regraftModalData.variant?.name || regraftModalData.offer?.productVariant?.name || regraftModalData.currentProduct.name}
                                    </div>
                                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                                        Produit actuel : <strong>{regraftModalData.currentProduct.name}</strong> • SKU : <span style={{ fontFamily: 'monospace' }}>{regraftModalData.variant?.sku || regraftModalData.offer?.sku || 'N/A'}</span>
                                    </div>
                                </div>
                                {regraftModalData.offer?.vendor && (
                                    <span style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700 }}>
                                        Offre de : {regraftModalData.offer.vendor.name}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Navigation Tabs between Linking vs Creating */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '18px', background: '#f1f5f9', padding: '6px', borderRadius: '12px' }}>
                            <button
                                type="button"
                                onClick={() => setRegraftTab('existing')}
                                style={{
                                    padding: '10px', borderRadius: '8px', border: 'none', fontSize: '12px', fontWeight: 800, cursor: 'pointer',
                                    background: regraftTab === 'existing' ? '#ffffff' : 'transparent',
                                    color: regraftTab === 'existing' ? '#2563eb' : '#64748b',
                                    boxShadow: regraftTab === 'existing' ? '0 2px 4px rgba(0,0,0,0.06)' : 'none',
                                    transition: 'all 0.15s'
                                }}
                            >
                                🔗 1. Relier à un Produit Existant
                            </button>
                            <button
                                type="button"
                                onClick={() => setRegraftTab('new_official')}
                                style={{
                                    padding: '10px', borderRadius: '8px', border: 'none', fontSize: '12px', fontWeight: 800, cursor: 'pointer',
                                    background: regraftTab === 'new_official' ? '#ffffff' : 'transparent',
                                    color: regraftTab === 'new_official' ? '#059669' : '#64748b',
                                    boxShadow: regraftTab === 'new_official' ? '0 2px 4px rgba(0,0,0,0.06)' : 'none',
                                    transition: 'all 0.15s'
                                }}
                            >
                                🏛️ 2. Créer une Nouvelle Fiche Officielle
                            </button>
                        </div>

                        {/* TAB 1: RELIER À UN PRODUIT EXISTANT */}
                        {regraftTab === 'existing' && (
                            <div>
                                {/* Search Target Product */}
                                <div style={{ marginBottom: '16px' }}>
                                    <label style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', color: '#334155', display: 'block', marginBottom: '6px' }}>
                                        Rechercher le Nouveau Produit Cible Ahizan :
                                    </label>
                                    <input
                                        type="text"
                                        value={regraftSearchTerm}
                                        onChange={(e) => handleSearchTargetProducts(e.target.value)}
                                        placeholder="Ex: Tapez le nom du produit cible (Samsung Galaxy S24, iPhone 15...)"
                                        style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                                    />
                                </div>

                                {/* Target Product Search Results */}
                                <div style={{ maxHeight: '250px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '8px', marginBottom: '16px', background: '#fafafa' }}>
                                    {isLoadingRegraftSearch ? (
                                        <div style={{ padding: '20px', textAlign: 'center', color: '#64748b', fontSize: '12px' }}>
                                            Recherche des fiches officielles Ahizan...
                                        </div>
                                    ) : regraftSearchResults.length === 0 ? (
                                        <div style={{ padding: '20px', textAlign: 'center', color: '#64748b', fontSize: '12px' }}>
                                            Aucun autre produit officiel trouvé.
                                        </div>
                                    ) : (
                                        <div style={{ display: 'grid', gap: '6px' }}>
                                            {regraftSearchResults.map((prod) => {
                                                const isSelected = selectedTargetProduct?.id === prod.id;
                                                return (
                                                    <div
                                                        key={prod.id}
                                                        onClick={() => setSelectedTargetProduct(prod)}
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'space-between',
                                                            padding: '10px 12px',
                                                            borderRadius: '8px',
                                                            cursor: 'pointer',
                                                            background: isSelected ? '#eff6ff' : '#ffffff',
                                                            border: isSelected ? '2px solid #2563eb' : '1px solid #e2e8f0',
                                                            transition: 'all 0.15s ease',
                                                        }}
                                                    >
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                            {prod.featuredAsset?.preview ? (
                                                                <img src={prod.featuredAsset.preview} alt="" style={{ width: '36px', height: '36px', borderRadius: '6px', objectFit: 'cover' }} />
                                                            ) : (
                                                                <div style={{ width: '36px', height: '36px', borderRadius: '6px', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>📦</div>
                                                            )}
                                                            <div>
                                                                <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '13px' }}>{prod.name}</div>
                                                                <div style={{ fontSize: '11px', color: '#64748b' }}>
                                                                    ID: {prod.id} • {prod.variants?.length || 0} déclinaison(s) existante(s)
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div>
                                                            {isSelected ? (
                                                                <span style={{ background: '#2563eb', color: '#ffffff', fontSize: '11px', fontWeight: 800, padding: '3px 8px', borderRadius: '6px' }}>
                                                                    ✓ Sélectionné
                                                                </span>
                                                            ) : (
                                                                <span style={{ fontSize: '11px', color: '#64748b' }}>Choisir ➔</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                {/* Confirmation Summary & Actions */}
                                {selectedTargetProduct && (
                                    <div style={{ padding: '10px 14px', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '10px', fontSize: '12px', color: '#065f46', marginBottom: '16px' }}>
                                        <strong>Action :</strong> La déclinaison sera immédiatement déplacée sous la fiche officielle <strong>"{selectedTargetProduct.name}"</strong>.
                                    </div>
                                )}

                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                                    <button
                                        type="button"
                                        onClick={() => setRegraftModalData(null)}
                                        style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', fontSize: '12px', fontWeight: 700, cursor: 'pointer', color: '#475569' }}
                                    >
                                        Annuler
                                    </button>
                                    <button
                                        type="button"
                                        disabled={!selectedTargetProduct || isSubmittingRegraft}
                                        onClick={handleConfirmRegraft}
                                        style={{
                                            padding: '10px 20px',
                                            borderRadius: '8px',
                                            border: 'none',
                                            fontSize: '12px',
                                            fontWeight: 800,
                                            cursor: !selectedTargetProduct || isSubmittingRegraft ? 'not-allowed' : 'pointer',
                                            background: !selectedTargetProduct ? '#94a3b8' : '#2563eb',
                                            color: '#ffffff',
                                        }}
                                    >
                                        {isSubmittingRegraft ? 'Transfert en cours...' : 'Confirmer le Greffage ➔'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* TAB 2: CRÉER UNE NOUVELLE FICHE OFFICIELLE DÉDIÉE */}
                        {regraftTab === 'new_official' && (
                            <form onSubmit={handleCreateOfficialAndRegraft} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                <div style={{ fontSize: '12px', color: '#047857', background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '10px 14px', borderRadius: '10px' }}>
                                    💡 Renseignez les informations de la nouvelle fiche produit officielle Ahizan. Cette déclinaison (et son offre marchande) y sera directement greffée.
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                                            Nom Officiel du Produit (Catalogue Central) *
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={regraftNewTitle}
                                            onChange={e => {
                                                setRegraftNewTitle(e.target.value);
                                                setRegraftNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
                                            }}
                                            placeholder="Ex: Câble de charge rapide 4-en-1 65W..."
                                            style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                                            Slug URL
                                        </label>
                                        <input
                                            type="text"
                                            value={regraftNewSlug}
                                            onChange={e => setRegraftNewSlug(e.target.value)}
                                            style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', fontFamily: 'monospace' }}
                                        />
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                                            SKU Officiel Central
                                        </label>
                                        <input
                                            type="text"
                                            value={regraftNewSku}
                                            onChange={e => setRegraftNewSku(e.target.value)}
                                            placeholder="Ex: AHZ-CAB-65W"
                                            style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', fontFamily: 'monospace' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                                            Code EAN-13 (Code-barres)
                                        </label>
                                        <input
                                            type="text"
                                            value={regraftNewEan}
                                            onChange={e => setRegraftNewEan(e.target.value)}
                                            placeholder="Ex: 3700123456789"
                                            style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', fontFamily: 'monospace' }}
                                        />
                                    </div>
                                </div>

                                {/* Multi-Categories Badges */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                                        Catégories &amp; Rayons Catalogue (cliquez pour associer) :
                                    </label>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '100px', overflowY: 'auto', padding: '8px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                        {(collectionsData?.collections?.items || []).map((col: any) => {
                                            const isSelected = regraftNewCollectionIds.includes(col.id);
                                            return (
                                                <button
                                                    key={col.id}
                                                    type="button"
                                                    onClick={() => {
                                                        if (isSelected) {
                                                            setRegraftNewCollectionIds(regraftNewCollectionIds.filter(id => id !== col.id));
                                                        } else {
                                                            setRegraftNewCollectionIds([...regraftNewCollectionIds, col.id]);
                                                        }
                                                    }}
                                                    style={{
                                                        padding: '4px 10px', borderRadius: '16px', fontSize: '11px', fontWeight: 700, cursor: 'pointer',
                                                        border: isSelected ? '1px solid #059669' : '1px solid #cbd5e1',
                                                        background: isSelected ? '#059669' : '#ffffff',
                                                        color: isSelected ? '#ffffff' : '#334155',
                                                    }}
                                                >
                                                    {isSelected ? '✓ ' : '+ '}{col.name}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Multi-Facets Badges */}
                                {facetsData?.facets?.items && facetsData.facets.items.length > 0 && (
                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                                            Facettes &amp; Filtres de recherche :
                                        </label>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '100px', overflowY: 'auto', padding: '8px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                            {facetsData.facets.items.map((facet: any) =>
                                                (facet.values || []).map((fv: any) => {
                                                    const isSelected = regraftNewFacetValueIds.includes(fv.id);
                                                    return (
                                                        <button
                                                            key={fv.id}
                                                            type="button"
                                                            onClick={() => {
                                                                if (isSelected) {
                                                                    setRegraftNewFacetValueIds(regraftNewFacetValueIds.filter(id => id !== fv.id));
                                                                } else {
                                                                    setRegraftNewFacetValueIds([...regraftNewFacetValueIds, fv.id]);
                                                                }
                                                            }}
                                                            style={{
                                                                padding: '4px 10px', borderRadius: '16px', fontSize: '11px', fontWeight: 600, cursor: 'pointer',
                                                                border: isSelected ? '1px solid #0284c7' : '1px solid #e2e8f0',
                                                                background: isSelected ? '#0284c7' : '#ffffff',
                                                                color: isSelected ? '#ffffff' : '#475569',
                                                            }}
                                                        >
                                                            {facet.name}: {fv.name}
                                                        </button>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                                        Description Courte
                                    </label>
                                    <input
                                        type="text"
                                        value={regraftNewShortDesc}
                                        onChange={e => setRegraftNewShortDesc(e.target.value)}
                                        placeholder="Accroche commerciale brève..."
                                        style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                                        Description Détaillée
                                    </label>
                                    <textarea
                                        rows={3}
                                        value={regraftNewDesc}
                                        onChange={e => setRegraftNewDesc(e.target.value)}
                                        placeholder="Description complète du produit..."
                                        style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                                    />
                                </div>

                                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <input
                                        type="checkbox"
                                        id="regraftNewApproveOfferToggle"
                                        checked={regraftNewApproveOffer}
                                        onChange={e => setRegraftNewApproveOffer(e.target.checked)}
                                        style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                    />
                                    <label htmlFor="regraftNewApproveOfferToggle" style={{ fontSize: '12px', color: '#0f172a', fontWeight: 700, cursor: 'pointer' }}>
                                        Approuver et activer immédiatement l'offre commerciale du vendeur sur cette nouvelle fiche
                                    </label>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                                    <button
                                        type="button"
                                        onClick={() => setRegraftModalData(null)}
                                        style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', fontSize: '12px', fontWeight: 700, cursor: 'pointer', color: '#475569' }}
                                    >
                                        Annuler
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmittingRegraft || !regraftNewTitle.trim()}
                                        style={{
                                            padding: '10px 22px',
                                            borderRadius: '8px',
                                            border: 'none',
                                            fontSize: '12px',
                                            fontWeight: 800,
                                            cursor: isSubmittingRegraft || !regraftNewTitle.trim() ? 'not-allowed' : 'pointer',
                                            background: '#059669',
                                            color: '#ffffff',
                                        }}
                                    >
                                        {isSubmittingRegraft ? 'Création en cours...' : '🏛️ Créer la Fiche & Transférer'}
                                    </button>
                                </div>
                            </form>
                        )}

                    </div>
                </div>
            )}

            {/* Superadmin Interactive Image Cropper Modal */}
            {adminCropState && (
                <AdminImageCropModal
                    imageSrc={adminCropState.currentSrc}
                    file={adminCropState.currentFile}
                    onClose={() => setAdminCropState(null)}
                    onCropComplete={handleAdminCropComplete}
                    onSkip={handleAdminCropComplete}
                />
            )}

        </div>
    );
}
