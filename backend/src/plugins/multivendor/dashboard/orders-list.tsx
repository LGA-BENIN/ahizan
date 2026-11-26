import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
    Search, Filter, Eye, ChevronDown, Check, X, RefreshCw, AlertCircle, 
    Calendar, User, MapPin, Package, Phone, Mail, Clock, ShieldCheck, 
    Truck, Award, ShoppingBag, Store, ChevronRight, Activity, Download, Receipt, Trash2, Plus, Minus
} from 'lucide-react';

const stateMeta: Record<string, { label: string; color: string; icon: any }> = {
    AddingItems: { label: 'Paniers en cours', color: '#6B7280', icon: ShoppingBag },
    ArrangingPayment: { label: 'Paiement en cours', color: '#F59E0B', icon: Clock },
    PaymentAuthorized: { label: 'Paiement Autorisé', color: '#3B82F6', icon: ShieldCheck },
    PaymentSettled: { label: 'Payée (Validée)', color: '#10B981', icon: Check },
    PartiallyShipped: { label: 'Partiellement Expédiée', color: '#8B5CF6', icon: Truck },
    Shipped: { label: 'Expédiée', color: '#6366F1', icon: Truck },
    Delivered: { label: 'Livrée au client', color: '#059669', icon: Award },
    Cancelled: { label: 'Annulée', color: '#EF4444', icon: X },
    Modifying: { label: 'En modification', color: '#EC4899', icon: RefreshCw },
};

const GET_MARKETPLACE_ORDERS = `
    query GetMarketplaceOrders($options: OrderListOptions) {
        orders(options: $options) {
            items {
                id
                code
                state
                active
                createdAt
                updatedAt
                totalQuantity
                subTotalWithTax
                shippingWithTax
                totalWithTax
                currencyCode
                nextStates
                customer {
                    id
                    firstName
                    lastName
                    emailAddress
                    phoneNumber
                }
                shippingAddress {
                    fullName
                    streetLine1
                    streetLine2
                    city
                    province
                    postalCode
                    country
                    phoneNumber
                }
                billingAddress {
                    fullName
                    streetLine1
                    streetLine2
                    city
                    province
                    postalCode
                    country
                }
                surcharges {
                    description
                    priceWithTax
                }
                lines {
                    id
                    quantity
                    unitPriceWithTax
                    linePriceWithTax
                    proratedLinePriceWithTax
                    productVariant {
                        id
                        name
                        sku
                        featuredAsset { preview }
                        product {
                            id
                            name
                            customFields {
                                vendor {
                                    id
                                    name
                                    email
                                }
                            }
                        }
                    }
                    customFields {
                        sellerStatus
                        assignedVendor {
                            id
                            name
                            email
                            phoneNumber
                            address
                        }
                    }
                }
                customFields {
                    vendor {
                        id
                        name
                        email
                        phoneNumber
                        address
                        zone
                    }
                    commissionAmount
                    sellerStatus
                    adminStatus
                    vendorStatuses
                }
            }
            totalItems
        }
    }
`;

const TRANSITION_STATE = `
    mutation TransitionOrderState($id: ID!, $state: String!) {
        transitionOrderToState(id: $id, state: $state) {
            __typename
            ... on Order { id state nextStates }
            ... on OrderStateTransitionError { errorCode message transitionError }
        }
    }
`;

const UPDATE_SELLER_STATUS = `
    mutation UpdateOrderSellerStatus($orderId: ID!, $status: String!, $vendorId: ID) {
        updateOrderSellerStatus(orderId: $orderId, status: $status, vendorId: $vendorId)
    }
`;

const UPDATE_ADMIN_STATUS = `
    mutation UpdateOrderAdminStatus($orderId: ID!, $status: String!, $vendorId: ID) {
        updateOrderAdminStatus(orderId: $orderId, status: $status, vendorId: $vendorId)
    }
`;

const REASSIGN_VENDOR_SUB_ORDER = `
    mutation ReassignVendorSubOrder($orderId: ID!, $oldVendorId: ID!, $newVendorId: ID!) {
        reassignVendorSubOrder(orderId: $orderId, oldVendorId: $oldVendorId, newVendorId: $newVendorId)
    }
`;

const REASSIGN_ORDER_LINE_TO_PRODUCT = `
    mutation ReassignOrderLineToProduct($orderId: ID!, $lineId: ID!, $newProductId: ID, $newProductName: String, $newPrice: Float!, $newVendorId: ID!) {
        reassignOrderLineToProduct(orderId: $orderId, lineId: $lineId, newProductId: $newProductId, newProductName: $newProductName, newPrice: $newPrice, newVendorId: $newVendorId)
    }
`;

const DELETE_VENDOR_ORDER = `
    mutation DeleteVendorOrder($orderId: ID!) {
        deleteVendorOrder(orderId: $orderId)
    }
`;

const GET_VENDORS_MINIMAL = `
    query GetVendorsMinimal {
        vendors {
            items {
                id
                name
                email
            }
        }
    }
`;

const GET_PRODUCTS_MINIMAL = `
    query GetProductsMinimal {
        adminVendorProducts(options: { take: 500 }) {
            items {
                id
                name
                featuredAsset {
                    id
                    preview
                }
                customFields {
                    vendor {
                        id
                        name
                        physicalMarket {
                            id
                            name
                        }
                    }
                }
                variants {
                    id
                    name
                    price
                    sku
                    stockOnHand
                    stockLevel
                    enabled
                    vendor {
                        id
                        name
                        physicalMarket {
                            id
                            name
                        }
                    }
                    featuredAsset {
                        id
                        preview
                    }
                    options {
                        id
                        name
                        group { id name }
                    }
                }
            }
        }
    }
`;

const CREATE_ASSISTED_ORDER = `
    mutation CreateAssistedOrder($input: CreateAssistedOrderInput!) {
        createAssistedOrder(input: $input) {
            id
            code
            state
            totalWithTax
        }
    }
`;

const SEARCH_PLATFORM_CUSTOMERS = `
    query SearchPlatformCustomers($term: String) {
        searchPlatformCustomers(term: $term) {
            id
            firstName
            lastName
            emailAddress
            phoneNumber
            addresses {
                id
                fullName
                streetLine1
                city
                province
                phoneNumber
                defaultShippingAddress
                customFields {
                    latitude
                    longitude
                }
            }
        }
    }
`;

const CALCULATE_GEOENGINE_DELIVERY_FEE = `
    query CalculateGeoEngineDeliveryFee($latitude: Float!, $longitude: Float!, $variantIds: [ID!]!) {
        calculateGeoEngineDeliveryFee(latitude: $latitude, longitude: $longitude, variantIds: $variantIds) {
            shippingFee
            distanceKm
            vendorName
            vendorCity
            clientLatitude
            clientLongitude
            eligible
        }
    }
`;

const SET_CUSTOMER_ACTIVE_LOCATION = `
    mutation SetCustomerActiveLocation($input: SetCustomerActiveLocationInput!) {
        setCustomerActiveLocation(input: $input) {
            success
            customerId
            city
            streetLine1
            latitude
            longitude
            message
        }
    }
`;

const CREATE_DRAFT_ORDER = `
    mutation CreateDraftOrder {
        createDraftOrder {
            id
            code
            state
        }
    }
`;

const SET_CUSTOMER_FOR_DRAFT = `
    mutation SetCustomerForDraftOrder($orderId: ID!, $input: CreateCustomerInput) {
        setCustomerForDraftOrder(orderId: $orderId, input: $input) {
            __typename
            ... on Order { id }
            ... on EmailAddressConflictError { message }
        }
    }
`;

const ADD_ITEM_TO_DRAFT = `
    mutation AddItemToDraftOrder($orderId: ID!, $input: AddItemToDraftOrderInput!) {
        addItemToDraftOrder(orderId: $orderId, input: $input) {
            __typename
            ... on Order { id }
            ... on InsufficientStockError { message }
            ... on NegativeQuantityError { message }
            ... on OrderModificationError { message }
        }
    }
`;

const SET_DRAFT_SHIPPING_ADDRESS = `
    mutation SetDraftShippingAddress($orderId: ID!, $input: CreateAddressInput!) {
        setDraftOrderShippingAddress(orderId: $orderId, input: $input) {
            id
        }
    }
`;

const GET_ELIGIBLE_SHIPPING_METHODS = `
    query EligibleShippingMethodsForDraft($orderId: ID!) {
        eligibleShippingMethodsForDraftOrder(orderId: $orderId) {
            id
            name
            price
            priceWithTax
        }
    }
`;

const SET_DRAFT_SHIPPING_METHOD = `
    mutation SetDraftShippingMethod($orderId: ID!, $shippingMethodId: ID!) {
        setDraftOrderShippingMethod(orderId: $orderId, shippingMethodId: $shippingMethodId) {
            __typename
            ... on Order {
                id
                state
            }
            ... on ErrorResult {
                errorCode
                message
            }
        }
    }
`;

const ADD_MANUAL_PAYMENT = `
    mutation AddManualPaymentToDraft($input: ManualPaymentInput!) {
        addManualPaymentToOrder(input: $input) {
            __typename
            ... on Order {
                id
                state
            }
            ... on ManualPaymentStateError {
                errorCode
                message
            }
        }
    }
`;

function getAdminApiUrl() {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    if (origin.includes(':5173') || origin.includes(':5174') || origin.includes(':5175') || origin.includes(':4200')) {
        return origin.replace(/:(5173|5174|5175|4200)/, ':3000') + '/admin-api';
    }
    return origin ? `${origin}/admin-api` : '/admin-api';
}

function getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };
    if (typeof window !== 'undefined') {
        const token = localStorage.getItem('vendure-auth-token') || sessionStorage.getItem('vendure-auth-token');
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
    }
    return headers;
}

async function fetchGraphQL(query: string, variables: any = {}) {
    const res = await fetch(getAdminApiUrl(), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ query, variables }),
    });
    let json: any = null;
    try {
        json = await res.json();
    } catch {}

    if (!res.ok) {
        let msg = `HTTP ${res.status}: ${res.statusText}`;
        if (json?.errors && json.errors.length) {
            msg += ` - ${json.errors.map((e: any) => e.message).join(' | ')}`;
        }
        throw new Error(msg);
    }
    if (json?.errors && json.errors.length) {
        throw new Error(json.errors[0].message);
    }
    return json?.data;
}

function formatPrice(price: number, currency: string = 'XOF') {
    const isZeroDecimal = currency === 'XOF' || currency === 'FCFA' || currency === 'CVE';
    const factor = isZeroDecimal ? 1 : 100;
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: currency === 'FCFA' ? 'XOF' : currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format((price || 0) / factor);
}

function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export function OrdersListComponent() {
    const queryClient = useQueryClient();
    const [page, setPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const [stateFilter, setStateFilter] = useState('');
    const [sellerFilter, setSellerFilter] = useState('');
    const [adminFilter, setAdminFilter] = useState('');
    const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
    const [orderViewTab, setOrderViewTab] = useState<'confirmed' | 'abandoned'>('confirmed');
    interface OrderCartItem {
        productId: string;
        productName: string;
        variantId: string;
        variantName: string;
        optionLabel: string;
        price: number;
        sku?: string;
        preview?: string;
        vendorId?: string;
        vendorName?: string;
        marketName?: string;
        availableStock?: number;
        quantity: number;
    }

    const [isCreateOrderModalOpen, setIsCreateOrderModalOpen] = useState(false);
    const [createOrderSearch, setCreateOrderSearch] = useState('');
    const [createOrderCart, setCreateOrderCart] = useState<OrderCartItem[]>([]);
    const [createOrderCustomer, setCreateOrderCustomer] = useState<{
        customerId?: string;
        firstName: string;
        lastName: string;
        phone: string;
        email?: string;
        city: string;
        neighborhood: string;
        latitude?: number;
        longitude?: number;
        isSubmitting: boolean;
    }>({
        firstName: '',
        lastName: '',
        phone: '',
        city: 'Cotonou',
        neighborhood: '',
        latitude: 6.3722,
        longitude: 2.4251,
        isSubmitting: false,
    });
    const [customerSearchTerm, setCustomerSearchTerm] = useState('');
    const [customerSearchResults, setCustomerSearchResults] = useState<any[]>([]);
    const [isLoadingCustomerSearch, setIsLoadingCustomerSearch] = useState(false);
    const [selectedCustomerAccount, setSelectedCustomerAccount] = useState<any | null>(null);
    const [customerInputMode, setCustomerInputMode] = useState<'search' | 'manual'>('search');
    const [shippingFeePreview, setShippingFeePreview] = useState<{
        shippingFee: number;
        distanceKm: number;
        vendorName?: string;
        vendorCity?: string;
        loading: boolean;
        error?: string;
    } | null>(null);
    const [osmSearchQuery, setOsmSearchQuery] = useState('');
    const [osmSearchResults, setOsmSearchResults] = useState<any[]>([]);
    const [isSearchingOsm, setIsSearchingOsm] = useState(false);

    // Live GeoEngine shipping fee calculation preview
    useEffect(() => {
        if (!isCreateOrderModalOpen || createOrderCart.length === 0) {
            setShippingFeePreview(null);
            return;
        }

        const lat = createOrderCustomer.latitude != null ? Number(createOrderCustomer.latitude) : 6.3722;
        const lng = createOrderCustomer.longitude != null ? Number(createOrderCustomer.longitude) : 2.4251;
        const variantIds = createOrderCart.map(item => item.variantId);

        let cancelled = false;
        setShippingFeePreview(prev => prev ? { ...prev, loading: true } : { shippingFee: 500, distanceKm: 0, loading: true });

        const timer = setTimeout(async () => {
            try {
                const res = await fetchGraphQL(CALCULATE_GEOENGINE_DELIVERY_FEE, {
                    latitude: lat,
                    longitude: lng,
                    variantIds,
                });
                if (!cancelled && res?.calculateGeoEngineDeliveryFee) {
                    setShippingFeePreview({
                        shippingFee: res.calculateGeoEngineDeliveryFee.shippingFee,
                        distanceKm: res.calculateGeoEngineDeliveryFee.distanceKm,
                        vendorName: res.calculateGeoEngineDeliveryFee.vendorName,
                        vendorCity: res.calculateGeoEngineDeliveryFee.vendorCity,
                        loading: false,
                    });
                }
            } catch (err: any) {
                if (!cancelled) {
                    setShippingFeePreview(prev => prev ? { ...prev, loading: false, error: err.message } : null);
                }
            }
        }, 250);

        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [
        isCreateOrderModalOpen, 
        createOrderCart.map(i => `${i.variantId}:${i.quantity}`).join(','), 
        createOrderCustomer.latitude, 
        createOrderCustomer.longitude
    ]);

    const take = 15;
    const skip = (page - 1) * take;

    const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
        queryKey: ['adminOrders', page, orderViewTab],
        queryFn: () => fetchGraphQL(GET_MARKETPLACE_ORDERS, {
            options: {
                take,
                skip,
                sort: { createdAt: 'DESC' },
                filter: orderViewTab === 'confirmed'
                    ? { state: { notIn: ['AddingItems', 'ArrangingPayment'] } }
                    : { state: { in: ['AddingItems', 'ArrangingPayment'] } }
            }
        }),
    });

    const { data: productsMinData } = useQuery({
        queryKey: ['adminProductsMinimal'],
        queryFn: () => fetchGraphQL(GET_PRODUCTS_MINIMAL),
        enabled: isCreateOrderModalOpen,
    });
    const availableProducts = productsMinData?.adminVendorProducts?.items || [];

    const refreshLocalOrder = (orderId: string, updates: any) => {
        setSelectedOrder((prev: any) => {
            if (prev && prev.id === orderId) {
                return { ...prev, ...updates };
            }
            return prev;
        });
        queryClient.invalidateQueries({ queryKey: ['adminOrders'] });
    };

    const transitionMutation = useMutation({
        mutationFn: ({ id, state }: any) => fetchGraphQL(TRANSITION_STATE, { id, state }),
        onSuccess: (res, variables) => {
            if (res.transitionOrderToState.__typename === 'OrderStateTransitionError') {
                alert(`Erreur: ${res.transitionOrderToState.message}`);
            } else {
                refreshLocalOrder(variables.id, { 
                    state: res.transitionOrderToState.state, 
                    nextStates: res.transitionOrderToState.nextStates 
                });
            }
        },
    });

    const sellerMutation = useMutation({
        mutationFn: ({ id, status, vendorId }: any) => fetchGraphQL(UPDATE_SELLER_STATUS, { orderId: id, status, vendorId }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['adminOrders'] }),
    });

    const adminMutation = useMutation({
        mutationFn: ({ id, status, vendorId }: any) => fetchGraphQL(UPDATE_ADMIN_STATUS, { orderId: id, status, vendorId }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['adminOrders'] }),
    });

    const deleteOrderMutation = useMutation({
        mutationFn: (param: any) => {
            const orderId = typeof param === 'string' ? param : (param?.orderId || param?.id);
            return fetchGraphQL(DELETE_VENDOR_ORDER, { orderId });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['adminOrders'] });
            setSelectedOrder(null);
            alert('Commande supprimée avec succès !');
        },
        onError: (err: any) => {
            alert('❌ Erreur lors de la suppression : ' + (err?.message || 'Erreur inconnue'));
        }
    });

    const rawOrders = data?.orders?.items || [];
    const totalItems = data?.orders?.totalItems || 0;

    useEffect(() => {
        if (selectedOrder && rawOrders.length > 0) {
            const updated = rawOrders.find((o: any) => o.id === selectedOrder.id);
            if (updated) {
                setSelectedOrder(updated);
            }
        }
    }, [data, selectedOrder?.id]);

    const filteredOrders = rawOrders.filter((order: any) => {
        const vendor = order.customFields?.vendor?.name || '';
        const client = order.customer ? `${order.customer.firstName} ${order.customer.lastName}` : '';
        const matchesSearch = 
            order.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
            client.toLowerCase().includes(searchTerm.toLowerCase()) ||
            vendor.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesState = !stateFilter || order.state === stateFilter;
        const matchesSeller = !sellerFilter || (order.customFields?.sellerStatus || 'pending') === sellerFilter;
        const matchesAdmin = !adminFilter || (order.customFields?.adminStatus || 'pending') === adminFilter;

        return matchesSearch && matchesState && matchesSeller && matchesAdmin;
    });

    const totalPages = Math.ceil(totalItems / take);

    return (
        <div className="premium-orders-container">
            <style>{`
                .premium-orders-container {
                    padding: 24px;
                    max-width: 1500px;
                    margin: 0 auto;
                    font-family: 'Inter', system-ui, -apple-system, sans-serif;
                    background: #f8fafc;
                    min-height: 100vh;
                }
                .po-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-end;
                    margin-bottom: 24px;
                }
                .po-title { font-size: 30px; font-weight: 900; color: #0f172a; letter-spacing: -0.5px; margin: 0; }
                .po-subtitle { color: #64748b; font-size: 14px; margin-top: 4px; font-weight: 500; }
                .po-badge { background: #e2e8f0; color: #334155; padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: 700; }
                
                .po-filters {
                    background: white;
                    border-radius: 16px;
                    padding: 20px;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
                    display: flex;
                    gap: 16px;
                    margin-bottom: 24px;
                    border: 1px solid #e2e8f0;
                    flex-wrap: wrap;
                }
                .po-filter-group { flex: 1; min-width: 200px; }
                .po-filter-label { display: block; font-size: 12px; font-weight: 700; color: #475569; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px; }
                .po-input { 
                    width: 100%; padding: 11px 14px; border-radius: 10px; border: 1px solid #cbd5e1; 
                    font-size: 14px; outline: none; transition: all 0.2s; background: #f8fafc;
                }
                .po-input:focus { border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1); background: white; }
                
                .po-table-container {
                    background: white;
                    border-radius: 16px;
                    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05);
                    border: 1px solid #e2e8f0;
                    overflow: hidden;
                }
                .po-table { width: 100%; border-collapse: collapse; text-align: left; }
                .po-table th { padding: 16px; font-size: 12px; font-weight: 800; color: #64748b; background: #f8fafc; border-bottom: 1px solid #e2e8f0; text-transform: uppercase; letter-spacing: 0.5px; }
                .po-table td { padding: 16px; border-bottom: 1px solid #f1f5f9; font-size: 14px; vertical-align: middle; }
                .po-tr { transition: all 0.2s; cursor: pointer; }
                .po-tr:hover { background: #f8fafc; }
                
                .po-status-badge { 
                    display: inline-flex; align-items: center; gap: 6px; padding: 5px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; 
                }
                
                .po-btn-view {
                    background: #f8fafc; border: 1px solid #cbd5e1; color: #1e293b; padding: 8px 16px; border-radius: 10px; 
                    font-weight: 700; font-size: 12px; cursor: pointer; transition: all 0.2s; display: inline-flex; align-items: center; gap: 6px;
                }
                .po-btn-view:hover { background: #2563eb; color: white; border-color: #2563eb; }
                
                /* Centered Responsive Modal Styles */
                .po-modal-overlay {
                    position: fixed; top: 0; left: 0; right: 0; bottom: 0; 
                    background: rgba(15, 23, 42, 0.75); backdrop-filter: blur(10px);
                    display: flex; align-items: center; justify-content: center; 
                    padding: 16px; z-index: 9999; animation: fadeIn 0.25s ease;
                }
                .po-modal {
                    background: #ffffff; width: 100%; max-width: 920px; 
                    max-height: 90vh; border-radius: 24px;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); 
                    animation: zoomIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
                    display: flex; flex-direction: column; overflow: hidden;
                    border: 1px solid #e2e8f0;
                }
                .po-modal-header {
                    background: white; padding: 20px 28px; border-bottom: 1px solid #e2e8f0; 
                    display: flex; justify-content: space-between; align-items: flex-start; shrink-0;
                }
                .po-modal-body { padding: 24px 28px; flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 20px; }
                
                .po-card { background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.03); }
                .po-card-title { font-size: 15px; font-weight: 800; color: #0f172a; margin-bottom: 14px; display: flex; align-items: center; gap: 8px; border-bottom: 1px solid #f1f5f9; padding-bottom: 10px; }
                
                .po-select-wrapper { position: relative; }
                .po-select { 
                    width: 100%; padding: 11px 14px; border-radius: 10px; border: 1px solid #cbd5e1; 
                    font-size: 13px; font-weight: 700; appearance: none; background: white; cursor: pointer; transition: all 0.2s;
                }
                .po-select:hover { border-color: #94a3b8; }
                .po-select:disabled { background: #f1f5f9; cursor: not-allowed; opacity: 0.7; }
                .po-select-icon { position: absolute; right: 14px; top: 50%; transform: translateY(-50%); pointer-events: none; color: #64748b; }
                
                .po-line-item { display: flex; align-items: center; gap: 16px; padding: 14px 0; border-bottom: 1px solid #f1f5f9; }
                .po-line-item:last-child { border-bottom: none; }
                .po-img { width: 56px; height: 56px; border-radius: 12px; object-fit: cover; border: 1px solid #e2e8f0; background: #f8fafc; }
                
                .po-summary-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 13px; color: #475569; }
                .po-summary-total { display: flex; justify-content: space-between; padding: 14px 0; font-size: 16px; font-weight: 900; color: #0f172a; border-top: 2px dashed #e2e8f0; margin-top: 6px; }
                
                @media (max-width: 768px) {
                    .po-modal-overlay { padding: 8px; }
                    .po-modal { max-height: 95vh; border-radius: 16px; }
                    .po-modal-header { padding: 16px; }
                    .po-modal-body { padding: 16px; gap: 16px; }
                }

                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes zoomIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
            `}</style>

            <div className="po-header">
                <div>
                    <h1 className="po-title">Commandes Marketplace</h1>
                    <p className="po-subtitle">Gérez et suivez les commandes, validez les paiements et expéditions.</p>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <button
                        onClick={() => setIsCreateOrderModalOpen(true)}
                        style={{
                            background: '#2563eb',
                            color: 'white',
                            border: 'none',
                            borderRadius: '12px',
                            padding: '10px 18px',
                            fontWeight: 700,
                            fontSize: '13px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2)',
                        }}
                    >
                        <span>➕ Nouvelle Commande Assistée</span>
                    </button>
                    <div className="po-badge">
                        {isFetching ? <Activity size={16} className="lucide-spin" style={{ display: 'inline', marginRight: '6px' }} /> : null}
                        {totalItems} {orderViewTab === 'confirmed' ? 'Commandes' : 'Paniers'}
                    </div>
                </div>
            </div>

            {/* TAB SELECTOR: CONFIRMED VS ABANDONED CARTS */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                <button
                    onClick={() => { setOrderViewTab('confirmed'); setPage(1); }}
                    style={{
                        padding: '10px 20px',
                        borderRadius: '12px',
                        fontWeight: 700,
                        fontSize: '13px',
                        border: 'none',
                        cursor: 'pointer',
                        background: orderViewTab === 'confirmed' ? '#0B1E3B' : '#ffffff',
                        color: orderViewTab === 'confirmed' ? '#ffffff' : '#64748b',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                    }}
                >
                    <Package size={16} />
                    <span>Commandes Validées</span>
                </button>
                <button
                    onClick={() => { setOrderViewTab('abandoned'); setPage(1); }}
                    style={{
                        padding: '10px 20px',
                        borderRadius: '12px',
                        fontWeight: 700,
                        fontSize: '13px',
                        border: 'none',
                        cursor: 'pointer',
                        background: orderViewTab === 'abandoned' ? '#ea580c' : '#ffffff',
                        color: orderViewTab === 'abandoned' ? '#ffffff' : '#64748b',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                    }}
                >
                    <ShoppingBag size={16} />
                    <span>Paniers en cours & Abandonnés</span>
                </button>
            </div>

            <div className="po-filters">
                <div className="po-filter-group">
                    <label className="po-filter-label">Recherche</label>
                    <div style={{ position: 'relative' }}>
                        <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                        <input
                            className="po-input"
                            style={{ paddingLeft: '40px' }}
                            placeholder="Code, Client, Vendeur..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
                <div className="po-filter-group">
                    <label className="po-filter-label">Statut Global (Vendure)</label>
                    <div className="po-select-wrapper">
                        <select className="po-input" value={stateFilter} onChange={e => setStateFilter(e.target.value)}>
                            <option value="">Tous les statuts</option>
                            {Object.entries(stateMeta).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                        </select>
                        <ChevronDown size={16} className="po-select-icon" />
                    </div>
                </div>
                <div className="po-filter-group">
                    <label className="po-filter-label">Statut Vendeur</label>
                    <div className="po-select-wrapper">
                        <select className="po-input" value={sellerFilter} onChange={e => setSellerFilter(e.target.value)}>
                            <option value="">Tous les vendeurs</option>
                            <option value="pending">⏳ En attente</option>
                            <option value="confirmed">✅ Approuvée</option>
                            <option value="refused">❌ Rejetée</option>
                            <option value="reassigning">🔄 En réassignation</option>
                            <option value="reassigned_to_other">⏭️ Réassignée</option>
                        </select>
                        <ChevronDown size={16} className="po-select-icon" />
                    </div>
                </div>
                <div className="po-filter-group">
                    <label className="po-filter-label">Statut Livraison (Admin)</label>
                    <div className="po-select-wrapper">
                        <select className="po-input" value={adminFilter} onChange={e => setAdminFilter(e.target.value)}>
                            <option value="">Toutes les livraisons</option>
                            <option value="pending">⏳ En attente</option>
                            <option value="shipped">🚚 Expédiée</option>
                            <option value="in_transit">✈️ En transit</option>
                            <option value="delivered">📦 Livrée</option>
                            <option value="cancelled">❌ Annulée</option>
                        </select>
                        <ChevronDown size={16} className="po-select-icon" />
                    </div>
                </div>
            </div>

            {isLoading ? (
                <div style={{ padding: '60px', textAlign: 'center', background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                    <Activity size={32} style={{ animation: 'spin 1s linear infinite', color: '#2563eb', margin: '0 auto 16px' }} />
                    <p style={{ color: '#64748b', fontWeight: 600 }}>Chargement des commandes marketplace...</p>
                </div>
            ) : isError ? (
                <div style={{ padding: '40px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '16px', color: '#991b1b' }}>
                    <p style={{ fontWeight: 700, margin: '0 0 8px' }}>Erreur de chargement</p>
                    <p style={{ fontSize: '14px', margin: 0 }}>{(error as any)?.message || 'Impossible de récupérer les commandes.'}</p>
                </div>
            ) : (
                <div className="po-table-container">
                    <table className="po-table">
                        <thead>
                            <tr>
                                <th>Code</th>
                                <th>Client</th>
                                <th>Date</th>
                                <th>Statut Global</th>
                                <th>Statut Vendeur</th>
                                <th>Livraison (Admin)</th>
                                <th style={{ textAlign: 'right' }}>Total</th>
                                <th style={{ textAlign: 'center' }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredOrders.length > 0 ? (
                                filteredOrders.map((order: any) => {
                                    const stObj = stateMeta[order.state] || { label: order.state, color: '#9CA3AF', icon: Package };
                                    const StateIcon = stObj.icon;
                                    const seller = order.customFields?.sellerStatus || 'pending';
                                    const admin = order.customFields?.adminStatus || 'pending';

                                    return (
                                        <tr key={order.id} className="po-tr" onClick={() => setSelectedOrder(order)}>
                                            <td style={{ fontFamily: 'monospace', fontWeight: 800, color: '#2563eb' }}>
                                                {order.code}
                                            </td>
                                            <td>
                                                {order.customer ? (
                                                    <div>
                                                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{order.customer.firstName} {order.customer.lastName}</div>
                                                        <div style={{ fontSize: '12px', color: '#64748b' }}>{order.customer.emailAddress}</div>
                                                    </div>
                                                ) : <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Invité</span>}
                                            </td>
                                            <td style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>
                                                {formatDate(order.createdAt)}
                                            </td>
                                            <td>
                                                <span className="po-status-badge" style={{ background: `${stObj.color}15`, color: stObj.color }}>
                                                    <StateIcon size={14} /> {stObj.label}
                                                </span>
                                            </td>
                                            <td>
                                                <span className="po-status-badge" style={{
                                                    background: seller === 'confirmed' || seller === 'approved' ? '#dcfce7' : seller === 'refused' || seller === 'rejected' ? '#fee2e2' : seller === 'reassigning' ? '#ede9fe' : seller === 'reassigned_to_other' ? '#f3f4f6' : '#fef3c7',
                                                    color: seller === 'confirmed' || seller === 'approved' ? '#166534' : seller === 'refused' || seller === 'rejected' ? '#991b1b' : seller === 'reassigning' ? '#5b21b6' : seller === 'reassigned_to_other' ? '#4b5563' : '#92400e',
                                                }}>
                                                    {seller === 'confirmed' || seller === 'approved' ? '✅ Approuvée' : seller === 'refused' || seller === 'rejected' ? '❌ Rejetée' : seller === 'reassigning' ? '🔄 En réassignation' : seller === 'reassigned_to_other' ? '⏭️ Réassignée' : '⏳ En attente'}
                                                </span>
                                            </td>
                                            <td>
                                                <span className="po-status-badge" style={{
                                                    background: admin === 'delivered' ? '#dcfce7' : admin === 'shipped' || admin === 'in_transit' ? '#e0f2fe' : admin === 'cancelled' ? '#fee2e2' : '#f1f5f9',
                                                    color: admin === 'delivered' ? '#166534' : admin === 'shipped' || admin === 'in_transit' ? '#0369a1' : admin === 'cancelled' ? '#991b1b' : '#475569',
                                                }}>
                                                    {admin === 'delivered' ? '📦 Livrée' : admin === 'shipped' ? '🚚 Expédiée' : admin === 'in_transit' ? '✈️ In Transit' : admin === 'cancelled' ? '❌ Annulée' : '⏳ Attente'}
                                                </span>
                                            </td>
                                            <td style={{ textAlign: 'right', fontWeight: 800, color: '#0f172a' }}>
                                                {formatPrice(order.totalWithTax, order.currencyCode)}
                                            </td>
                                            <td style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                                                <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                                    {orderViewTab === 'abandoned' ? (
                                                        <button
                                                            style={{
                                                                padding: '6px 12px',
                                                                background: '#22c55e',
                                                                color: 'white',
                                                                border: 'none',
                                                                borderRadius: '8px',
                                                                cursor: 'pointer',
                                                                fontWeight: 700,
                                                                fontSize: '12px',
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: '6px',
                                                            }}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                const phone = order.customer?.phoneNumber || order.shippingAddress?.phoneNumber || '';
                                                                const clientName = order.customer?.firstName || 'cher client';
                                                                const cleanPhone = phone.replace(/[^0-9]/g, '');
                                                                const msg = `Bonjour ${clientName}, vos articles vous attendent sur Ahizan ! Finalisez votre commande en 1 clic ici : https://ahizan.com/cart`;
                                                                if (cleanPhone) {
                                                                    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
                                                                } else {
                                                                    alert('Aucun numéro de téléphone disponible pour ce client.');
                                                                }
                                                            }}
                                                        >
                                                            <span>📲 Relancer WhatsApp</span>
                                                        </button>
                                                    ) : (
                                                        <button 
                                                            className="po-btn-view"
                                                            onClick={() => setSelectedOrder(order)}
                                                        >
                                                            <Eye size={14} /> Gérer
                                                        </button>
                                                    )}
                                                    <button 
                                                        style={{ padding: '6px 10px', background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: '6px', cursor: 'pointer', fontWeight: 700, fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                                        onClick={(e) => {
                                                            if (confirm(`Êtes-vous sûr de vouloir supprimer définitivement la commande #${order.code} ?`)) {
                                                                deleteOrderMutation.mutate({ orderId: order.id });
                                                            }
                                                        }}
                                                    >
                                                        <Trash2 size={13} /> Supprimer
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={8} style={{ textAlign: 'center', padding: '48px', color: '#64748b' }}>
                                        Aucune commande ne correspond à ces critères.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>

                    {/* Pagination Footer */}
                    {totalPages > 1 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
                            <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>
                                Page {page} sur {totalPages} ({totalItems} au total)
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    disabled={page === 1}
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: page === 1 ? '#f1f5f9' : 'white', cursor: page === 1 ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: '13px' }}
                                >
                                    Précédent
                                </button>
                                <button
                                    disabled={page >= totalPages}
                                    onClick={() => setPage(p => p + 1)}
                                    style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: page >= totalPages ? '#f1f5f9' : 'white', cursor: page >= totalPages ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: '13px' }}
                                >
                                    Suivant
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Modal de détail commande */}
            {selectedOrder && (
                <OrderModal 
                    order={selectedOrder} 
                    onClose={() => setSelectedOrder(null)} 
                    onTransition={(state: string) => transitionMutation.mutate({ id: selectedOrder.id, state })}
                    onUpdateSeller={(status: string, vendorId?: string) => sellerMutation.mutate({ id: selectedOrder.id, status, vendorId })}
                    onUpdateAdmin={(status: string, vendorId?: string) => adminMutation.mutate({ id: selectedOrder.id, status, vendorId })}
                    isMutating={transitionMutation.isPending || sellerMutation.isPending || adminMutation.isPending}
                />
            )}

            {/* MODAL: NOUVELLE COMMANDE ASSISTÉE (ORDER ON BEHALF / WHATSAPP & TÉLÉPHONE) */}
            {isCreateOrderModalOpen && (() => {
                const getImgUrl = (preview?: string) => {
                    if (!preview) return '';
                    if (preview.startsWith('http')) return preview;
                    return `https://api.ahizan.com/assets/${preview.replace(/^\/+/, '')}`;
                };

                const activeSellableProducts = availableProducts.filter((p: any) => {
                    const validVariants = (p.variants || []).filter((v: any) => v.enabled !== false && v.stockLevel !== 'OUT_OF_STOCK');
                    return validVariants.length > 0;
                });

                const filteredProductsForOrder = (!createOrderSearch.trim())
                    ? activeSellableProducts.slice(0, 50)
                    : activeSellableProducts.filter((p: any) => {
                        const term = createOrderSearch.toLowerCase().trim();
                        const matchName = (p.name || '').toLowerCase().includes(term);
                        const matchVendor = (p.customFields?.vendor?.name || '').toLowerCase().includes(term);
                        const matchVariants = (p.variants || []).some((v: any) => 
                            (v.name || '').toLowerCase().includes(term) ||
                            (v.sku || '').toLowerCase().includes(term) ||
                            (v.options || []).some((o: any) => (o.name || '').toLowerCase().includes(term))
                        );
                        return matchName || matchVendor || matchVariants;
                    });

                const addToCart = (product: any, variant: any) => {
                    const optionLabel = (variant.options && variant.options.length > 0)
                        ? variant.options.map((o: any) => o.name).join(' • ')
                        : (variant.name && variant.name !== product.name ? variant.name : '');

                    const availableStock = (variant.stockOnHand !== undefined && variant.stockOnHand !== null)
                        ? Number(variant.stockOnHand)
                        : (variant.stockLevel === 'OUT_OF_STOCK' ? 0 : 999);

                    if (availableStock <= 0 || variant.stockLevel === 'OUT_OF_STOCK') {
                        alert(`⛔ Impossible d'ajouter : "${product.name} (${optionLabel || 'Standard'})" est en rupture de stock.`);
                        return;
                    }

                    const resolvedVendor = variant.vendor || product.customFields?.vendor;
                    const vendorName = resolvedVendor?.name || 'Vendeur Marketplace';
                    const marketName = resolvedVendor?.physicalMarket?.name;
                    const vendorId = resolvedVendor?.id;

                    const existing = createOrderCart.find(i => i.variantId === variant.id);
                    if (existing) {
                        if (existing.quantity + 1 > availableStock) {
                            alert(`⚠️ Stock maximum atteint pour "${product.name}" (${availableStock} disponible(s) chez ce vendeur).`);
                            return;
                        }
                        setCreateOrderCart(prev => prev.map(item => 
                            item.variantId === variant.id ? { ...item, quantity: item.quantity + 1 } : item
                        ));
                    } else {
                        setCreateOrderCart(prev => [
                            ...prev,
                            {
                                productId: product.id,
                                productName: product.name,
                                variantId: variant.id,
                                variantName: variant.name,
                                optionLabel,
                                price: variant.price || 0,
                                sku: variant.sku,
                                preview: variant.featuredAsset?.preview || product.featuredAsset?.preview,
                                vendorId,
                                vendorName,
                                marketName,
                                availableStock,
                                quantity: 1,
                            }
                        ]);
                    }
                };

                const updateCartQty = (variantId: string, delta: number) => {
                    setCreateOrderCart(prev => prev.map(item => {
                        if (item.variantId === variantId) {
                            const nextQty = item.quantity + delta;
                            if (delta > 0 && item.availableStock && nextQty > item.availableStock) {
                                alert(`⚠️ Stock maximum atteint (${item.availableStock} disponible(s)).`);
                                return item;
                            }
                            return nextQty > 0 ? { ...item, quantity: nextQty } : null;
                        }
                        return item;
                    }).filter(Boolean) as OrderCartItem[]);
                };

                const removeFromCart = (variantId: string) => {
                    setCreateOrderCart(prev => prev.filter(item => item.variantId !== variantId));
                };

                const totalCartPrice = createOrderCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

                const CITY_COORDINATES: Record<string, { lat: number; lng: number; province: string }> = {
                    'Cotonou': { lat: 6.3722, lng: 2.4251, province: 'Littoral' },
                    'Abomey-Calavi': { lat: 6.5217, lng: 2.3252, province: 'Atlantique' },
                    'Porto-Novo': { lat: 6.4840, lng: 2.6202, province: 'Ouémé' },
                    'Parakou': { lat: 9.3371, lng: 2.6303, province: 'Borgou' },
                    'Ouidah': { lat: 6.3631, lng: 2.0851, province: 'Atlantique' },
                    'Bohicon': { lat: 7.1783, lng: 2.0667, province: 'Zou' },
                    'Sèmè-Kpodji': { lat: 6.3833, lng: 2.6167, province: 'Ouémé' },
                };

                const handleCreateOrderSubmit = async () => {
                    if (!createOrderCustomer.firstName.trim() || !createOrderCustomer.phone.trim()) {
                        alert('Veuillez renseigner au moins le prénom et le numéro WhatsApp / Téléphone du client.');
                        return;
                    }
                    if (createOrderCart.length === 0) {
                        alert('Veuillez ajouter au moins un produit au panier avant de valider la commande.');
                        return;
                    }

                    setCreateOrderCustomer(prev => ({ ...prev, isSubmitting: true }));
                    try {
                        const city = createOrderCustomer.city || 'Cotonou';
                        const coords = CITY_COORDINATES[city] || CITY_COORDINATES['Cotonou'];
                        const lat = createOrderCustomer.latitude ?? coords.lat;
                        const lng = createOrderCustomer.longitude ?? coords.lng;

                        const input = {
                            customer: {
                                customerId: createOrderCustomer.customerId || undefined,
                                firstName: createOrderCustomer.firstName.trim(),
                                lastName: (createOrderCustomer.lastName || createOrderCustomer.firstName).trim(),
                                phoneNumber: createOrderCustomer.phone.trim(),
                                emailAddress: createOrderCustomer.email?.trim() || undefined,
                                city,
                                neighborhood: createOrderCustomer.neighborhood || city,
                                province: coords.province,
                                latitude: lat,
                                longitude: lng,
                            },
                            items: createOrderCart.map(item => ({
                                productVariantId: item.variantId,
                                quantity: Number(item.quantity) || 1,
                                vendorId: item.vendorId || undefined,
                                sellerOfferId: item.sellerOfferId || undefined,
                            })),
                            notes: 'Commande assistée (WhatsApp / Téléphone) - Enregistrée via administration',
                        };

                        const res = await fetchGraphQL(CREATE_ASSISTED_ORDER, { input });
                        const order = res?.createAssistedOrder;
                        if (!order?.id) {
                            throw new Error(res?.errors?.[0]?.message || "Impossible de créer et finaliser la commande assistée.");
                        }

                        alert(`🎉 Commande #${order.code} créée et confirmée avec succès !\nStatut: Payée / Confirmée\nFrais de livraison et articles calculés par GeoEngine.\nLes vendeurs ont reçu la commande.`);
                        setIsCreateOrderModalOpen(false);
                        setCreateOrderCart([]);
                        setSelectedCustomerAccount(null);
                        setCustomerSearchTerm('');
                        setCustomerSearchResults([]);
                        setCreateOrderCustomer({
                            customerId: undefined,
                            firstName: '',
                            lastName: '',
                            phone: '',
                            email: '',
                            city: 'Cotonou',
                            neighborhood: '',
                            latitude: undefined,
                            longitude: undefined,
                            isSubmitting: false,
                        });
                        queryClient.invalidateQueries({ queryKey: ['adminOrders'] });
                    } catch (err: any) {
                        alert(`Erreur: ${err.message || err}`);
                    } finally {
                        setCreateOrderCustomer(prev => ({ ...prev, isSubmitting: false }));
                    }
                };

                return (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '16px' }}>
                        <div style={{ background: '#f8fafc', borderRadius: '24px', maxWidth: '1100px', width: '100%', maxHeight: '92vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.35)', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                            
                            {/* Modal Header */}
                            <div style={{ padding: '20px 24px', background: 'white', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h3 style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span>🛍️</span> Nouvelle Commande Assistée (WhatsApp / Téléphone)
                                    </h3>
                                    <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0 0' }}>
                                        Sélectionnez les articles, choisissez les déclinaisons (taille, couleur...) et ajoutez les quantités demandées par le client.
                                    </p>
                                </div>
                                <button 
                                    onClick={() => setIsCreateOrderModalOpen(false)} 
                                    style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Modal Body: Split Screen */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', flex: 1, overflow: 'hidden', minHeight: 0 }}>
                                
                                {/* LEFT COLUMN: CATALOG SEARCH & DECLINATIONS */}
                                <div style={{ borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', background: '#f8fafc', overflow: 'hidden' }}>
                                    
                                    {/* Search input */}
                                    <div style={{ padding: '16px', background: 'white', borderBottom: '1px solid #e2e8f0' }}>
                                        <div style={{ position: 'relative' }}>
                                            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                            <input 
                                                type="text"
                                                placeholder="🔍 Rechercher un produit, une référence, déclinaison ou vendeur..."
                                                value={createOrderSearch}
                                                onChange={e => setCreateOrderSearch(e.target.value)}
                                                style={{ width: '100%', padding: '11px 12px 11px 38px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: 600, outline: 'none', background: '#f8fafc', boxSizing: 'border-box' }}
                                            />
                                            {createOrderSearch && (
                                                <button 
                                                    onClick={() => setCreateOrderSearch('')} 
                                                    style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
                                                >
                                                    <X size={15} />
                                                </button>
                                            )}
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                                            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
                                                {filteredProductsForOrder.length} produit(s) disponible(s)
                                            </span>
                                        </div>
                                    </div>

                                    {/* Products scroll list */}
                                    <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                        {filteredProductsForOrder.length === 0 ? (
                                            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8', fontSize: '13px' }}>
                                                Aucun produit trouvé pour "{createOrderSearch}".
                                            </div>
                                        ) : (
                                            filteredProductsForOrder.map((product: any) => {
                                                const productImg = getImgUrl(product.featuredAsset?.preview);
                                                const variants = (product.variants || []).filter((v: any) => v.enabled !== false);

                                                return (
                                                    <div 
                                                        key={product.id}
                                                        style={{ background: 'white', borderRadius: '16px', padding: '14px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}
                                                    >
                                                        {/* Product info banner */}
                                                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '10px' }}>
                                                            {productImg ? (
                                                                <img 
                                                                    src={productImg} 
                                                                    alt={product.name} 
                                                                    style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '10px', border: '1px solid #e2e8f0', flexShrink: 0 }} 
                                                                />
                                                            ) : (
                                                                <div style={{ width: '48px', height: '48px', borderRadius: '10px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', flexShrink: 0 }}>
                                                                    <Package size={22} />
                                                                </div>
                                                            )}
                                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                                <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                                    {product.name}
                                                                </div>
                                                                {(() => {
                                                                    const pVendor = product.customFields?.vendor || variants[0]?.vendor;
                                                                    const pVendorName = pVendor?.name || 'Vendeur Marketplace';
                                                                    const pMarketName = pVendor?.physicalMarket?.name;
                                                                    return (
                                                                        <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', gap: '8px', alignItems: 'center', marginTop: '2px', flexWrap: 'wrap' }}>
                                                                            <span style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '2px 8px', borderRadius: '6px', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                                🏪 {pVendorName} {pMarketName ? <span style={{ color: '#2563eb', fontWeight: 800 }}>({pMarketName})</span> : null}
                                                                            </span>
                                                                            <span>• {variants.length} déclinaison(s)</span>
                                                                        </div>
                                                                    );
                                                                })()}
                                                            </div>
                                                        </div>

                                                        {/* Variants / Declinations List */}
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', background: '#f8fafc', borderRadius: '12px', padding: '8px', border: '1px solid #f1f5f9' }}>
                                                            {variants.map((v: any) => {
                                                                const vImg = getImgUrl(v.featuredAsset?.preview) || productImg;
                                                                const optionLabel = (v.options && v.options.length > 0)
                                                                    ? v.options.map((o: any) => o.name).join(' • ')
                                                                    : (v.name && v.name !== product.name ? v.name : 'Standard');
                                                                
                                                                const cartQty = createOrderCart.find(i => i.variantId === v.id)?.quantity || 0;
                                                                const pVendor = product.customFields?.vendor || variants[0]?.vendor;
                                                                const vVendor = v.vendor || pVendor;
                                                                const vVendorName = vVendor?.name;
                                                                
                                                                const stock = (v.stockOnHand !== undefined && v.stockOnHand !== null)
                                                                    ? Number(v.stockOnHand)
                                                                    : (v.stockLevel === 'OUT_OF_STOCK' ? 0 : 999);
                                                                const isOutOfStock = stock <= 0 || v.stockLevel === 'OUT_OF_STOCK';
                                                                const isLowStock = !isOutOfStock && stock <= 5;

                                                                return (
                                                                    <div 
                                                                        key={v.id}
                                                                        style={{ 
                                                                            display: 'flex', 
                                                                            alignItems: 'center', 
                                                                            justifyContent: 'space-between', 
                                                                            padding: '8px 12px', 
                                                                            borderRadius: '10px', 
                                                                            background: isOutOfStock ? '#f8fafc' : 'white', 
                                                                            border: cartQty > 0 ? '1.5px solid #2563eb' : (isOutOfStock ? '1px dashed #cbd5e1' : '1px solid #e2e8f0'), 
                                                                            gap: '10px',
                                                                            opacity: isOutOfStock ? 0.75 : 1
                                                                        }}
                                                                    >
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                                                                            {vImg ? (
                                                                                <img src={vImg} alt="" style={{ width: '32px', height: '32px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #e2e8f0' }} />
                                                                            ) : null}
                                                                            <div style={{ minWidth: 0 }}>
                                                                                <div style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                                                                    <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '1px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 800 }}>
                                                                                        {optionLabel}
                                                                                    </span>
                                                                                    {isOutOfStock ? (
                                                                                        <span style={{ background: '#fee2e2', color: '#b91c1c', border: '1px solid #fecaca', padding: '1px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 800 }}>
                                                                                            🔴 Stock épuisé
                                                                                        </span>
                                                                                    ) : isLowStock ? (
                                                                                        <span style={{ background: '#ffedd5', color: '#c2410c', border: '1px solid #fed7aa', padding: '1px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 800 }}>
                                                                                            🟠 Stock limité ({stock} restant{stock > 1 ? 's' : ''})
                                                                                        </span>
                                                                                    ) : (
                                                                                        <span style={{ background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0', padding: '1px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 800 }}>
                                                                                            🟢 En stock ({stock})
                                                                                        </span>
                                                                                    )}
                                                                                    {vVendorName && vVendorName !== pVendor?.name && (
                                                                                        <span style={{ background: '#f1f5f9', color: '#475569', padding: '1px 5px', borderRadius: '4px', fontSize: '10px', fontWeight: 700 }}>
                                                                                            🏪 {vVendorName}
                                                                                        </span>
                                                                                    )}
                                                                                    {v.sku ? <span style={{ fontSize: '10px', color: '#94a3b8' }}>({v.sku})</span> : null}
                                                                                </div>
                                                                            </div>
                                                                        </div>

                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                                                                            <span style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a' }}>
                                                                                {formatPrice(v.price, 'XOF')}
                                                                            </span>
                                                                            <button 
                                                                                disabled={isOutOfStock}
                                                                                onClick={() => !isOutOfStock && addToCart(product, v)}
                                                                                style={{ 
                                                                                    padding: '6px 12px', 
                                                                                    borderRadius: '8px', 
                                                                                    border: 'none', 
                                                                                    background: isOutOfStock ? '#e2e8f0' : (cartQty > 0 ? '#10b981' : '#2563eb'), 
                                                                                    color: isOutOfStock ? '#94a3b8' : 'white', 
                                                                                    fontSize: '11px', 
                                                                                    fontWeight: 800, 
                                                                                    cursor: isOutOfStock ? 'not-allowed' : 'pointer',
                                                                                    display: 'flex',
                                                                                    alignItems: 'center',
                                                                                    gap: '4px',
                                                                                    transition: 'all 0.2s'
                                                                                }}
                                                                            >
                                                                                {isOutOfStock ? (
                                                                                    'Épuisé'
                                                                                ) : cartQty > 0 ? (
                                                                                    `Ajouté (${cartQty})`
                                                                                ) : (
                                                                                    <>
                                                                                        <Plus size={12} />
                                                                                        Ajouter
                                                                                    </>
                                                                                )}
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>

                                {/* RIGHT COLUMN: CUSTOMER DETAILS & ORDER CART */}
                                <div style={{ display: 'flex', flexDirection: 'column', background: 'white', overflow: 'hidden' }}>
                                    
                                    {/* Customer Form */}
                                    <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', background: '#ffffff' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                            <div style={{ fontSize: '12px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                👤 Compte & Coordonnées Client
                                            </div>
                                            <div style={{ display: 'flex', gap: '6px' }}>
                                                <button
                                                    type="button"
                                                    onClick={() => setCustomerInputMode('search')}
                                                    style={{
                                                        padding: '4px 10px',
                                                        borderRadius: '6px',
                                                        fontSize: '11px',
                                                        fontWeight: 700,
                                                        border: customerInputMode === 'search' ? '1px solid #2563eb' : '1px solid #cbd5e1',
                                                        background: customerInputMode === 'search' ? '#eff6ff' : 'white',
                                                        color: customerInputMode === 'search' ? '#1d4ed8' : '#64748b',
                                                        cursor: 'pointer',
                                                    }}
                                                >
                                                    🔍 Compte existant
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setCustomerInputMode('manual');
                                                        setSelectedCustomerAccount(null);
                                                        setCreateOrderCustomer(prev => ({ ...prev, customerId: undefined }));
                                                    }}
                                                    style={{
                                                        padding: '4px 10px',
                                                        borderRadius: '6px',
                                                        fontSize: '11px',
                                                        fontWeight: 700,
                                                        border: customerInputMode === 'manual' ? '1px solid #2563eb' : '1px solid #cbd5e1',
                                                        background: customerInputMode === 'manual' ? '#eff6ff' : 'white',
                                                        color: customerInputMode === 'manual' ? '#1d4ed8' : '#64748b',
                                                        cursor: 'pointer',
                                                    }}
                                                >
                                                    ✍️ Nouveau client
                                                </button>
                                            </div>
                                        </div>

                                        {/* Customer Search / Selection Box */}
                                        {customerInputMode === 'search' && (
                                            <div style={{ marginBottom: '12px', position: 'relative' }}>
                                                {selectedCustomerAccount ? (
                                                    <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '10px', padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <div>
                                                            <div style={{ fontSize: '12px', fontWeight: 800, color: '#166534', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                <span>✅</span>
                                                                <span>{selectedCustomerAccount.firstName} {selectedCustomerAccount.lastName}</span>
                                                                <span style={{ fontSize: '10px', color: '#15803d', fontWeight: 600 }}>(Compte #{selectedCustomerAccount.id})</span>
                                                            </div>
                                                            <div style={{ fontSize: '11px', color: '#166534', marginTop: '2px' }}>
                                                                📧 {selectedCustomerAccount.emailAddress} {selectedCustomerAccount.phoneNumber ? `• 📞 ${selectedCustomerAccount.phoneNumber}` : ''}
                                                            </div>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setSelectedCustomerAccount(null);
                                                                setCreateOrderCustomer(prev => ({ ...prev, customerId: undefined }));
                                                            }}
                                                            style={{ background: '#fee2e2', border: 'none', borderRadius: '6px', color: '#dc2626', fontSize: '11px', fontWeight: 700, padding: '4px 8px', cursor: 'pointer' }}
                                                        >
                                                            Changer
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div>
                                                        <div style={{ position: 'relative' }}>
                                                            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                                            <input
                                                                type="text"
                                                                placeholder="Rechercher par email, téléphone ou nom du client..."
                                                                value={customerSearchTerm}
                                                                onChange={async (e) => {
                                                                    const val = e.target.value;
                                                                    setCustomerSearchTerm(val);
                                                                    if (val.trim().length >= 2) {
                                                                        setIsLoadingCustomerSearch(true);
                                                                        try {
                                                                            const res = await fetchGraphQL(SEARCH_PLATFORM_CUSTOMERS, { term: val.trim() });
                                                                            setCustomerSearchResults(res?.searchPlatformCustomers || []);
                                                                        } catch (err) {
                                                                            console.error(err);
                                                                        } finally {
                                                                            setIsLoadingCustomerSearch(false);
                                                                        }
                                                                    } else {
                                                                        setCustomerSearchResults([]);
                                                                    }
                                                                }}
                                                                style={{ width: '100%', padding: '8px 10px 8px 32px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', fontWeight: 600, boxSizing: 'border-box' }}
                                                            />
                                                            {isLoadingCustomerSearch && (
                                                                <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '11px', color: '#64748b' }}>
                                                                    ⏳
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* Autocomplete Dropdown */}
                                                        {customerSearchResults.length > 0 && (
                                                            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', borderRadius: '10px', border: '1px solid #cbd5e1', boxShadow: '0 10px 25px rgba(0,0,0,0.15)', zIndex: 100, maxHeight: '200px', overflowY: 'auto', marginTop: '4px' }}>
                                                                 {customerSearchResults.map((cust: any) => (
                                                                    <div
                                                                        key={cust.id}
                                                                        onClick={() => {
                                                                            setSelectedCustomerAccount(cust);
                                                                            const validAddrs = (cust.addresses || []).filter((a: any) => 
                                                                                a.city && a.customFields?.latitude != null && a.customFields?.longitude != null
                                                                            );
                                                                            const activeAddr = validAddrs.find((a: any) => a.defaultShippingAddress) || validAddrs[0];

                                                                            if (activeAddr) {
                                                                                setCreateOrderCustomer(prev => ({
                                                                                    ...prev,
                                                                                    customerId: cust.id,
                                                                                    firstName: cust.firstName || '',
                                                                                    lastName: cust.lastName || '',
                                                                                    phone: cust.phoneNumber || prev.phone,
                                                                                    email: cust.emailAddress || '',
                                                                                    city: activeAddr.city,
                                                                                    neighborhood: activeAddr.streetLine1 || '',
                                                                                    latitude: Number(activeAddr.customFields.latitude),
                                                                                    longitude: Number(activeAddr.customFields.longitude),
                                                                                }));
                                                                            } else {
                                                                                const defaultCoords = CITY_COORDINATES['Cotonou'];
                                                                                setCreateOrderCustomer(prev => ({
                                                                                    ...prev,
                                                                                    customerId: cust.id,
                                                                                    firstName: cust.firstName || '',
                                                                                    lastName: cust.lastName || '',
                                                                                    phone: cust.phoneNumber || prev.phone,
                                                                                    email: cust.emailAddress || '',
                                                                                    city: 'Cotonou',
                                                                                    neighborhood: '',
                                                                                    latitude: defaultCoords.lat,
                                                                                    longitude: defaultCoords.lng,
                                                                                }));
                                                                            }
                                                                            setCustomerSearchResults([]);
                                                                        }}
                                                                        style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', transition: 'background 0.1s' }}
                                                                        onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                                                                        onMouseLeave={e => (e.currentTarget.style.background = 'white')}
                                                                    >
                                                                        <div style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a' }}>
                                                                            {cust.firstName} {cust.lastName}
                                                                        </div>
                                                                        <div style={{ fontSize: '11px', color: '#64748b' }}>
                                                                            📧 {cust.emailAddress} {cust.phoneNumber ? `• 📞 ${cust.phoneNumber}` : ''}
                                                                            {cust.addresses?.length > 0 ? ` • 🏠 ${cust.addresses.length} adresse(s)` : ''}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Customer platform location status indicator */}
                                                {selectedCustomerAccount && (() => {
                                                    const validAddrs = (selectedCustomerAccount.addresses || []).filter((a: any) => 
                                                        a.city && a.customFields?.latitude != null && a.customFields?.longitude != null
                                                    );
                                                    const hasConfirmedLocation = validAddrs.length > 0;

                                                    return (
                                                        <div style={{ marginTop: '8px' }}>
                                                            {hasConfirmedLocation ? (
                                                                <div style={{ background: '#f0fdf4', border: '1.5px solid #22c55e', borderRadius: '10px', padding: '10px 12px' }}>
                                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                            <span style={{ fontSize: '18px' }}>📍</span>
                                                                            <div>
                                                                                <div style={{ fontSize: '11px', fontWeight: 800, color: '#15803d' }}>
                                                                                    Localisation enregistrée sur la plateforme
                                                                                </div>
                                                                                <div style={{ fontSize: '12px', fontWeight: 900, color: '#0f172a' }}>
                                                                                    {createOrderCustomer.city} {createOrderCustomer.neighborhood ? `— ${createOrderCustomer.neighborhood}` : ''}
                                                                                </div>
                                                                                {createOrderCustomer.latitude && createOrderCustomer.longitude && (
                                                                                    <div style={{ fontSize: '10px', color: '#16a34a', marginTop: '1px' }}>
                                                                                        GPS : ({createOrderCustomer.latitude.toFixed(4)}, {createOrderCustomer.longitude.toFixed(4)})
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                        <span style={{ background: '#dcfce7', color: '#166534', border: '1px solid #86efac', padding: '2px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 800 }}>
                                                                            Vérifiée
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div style={{ background: '#fffbeb', border: '1.5px solid #f59e0b', borderRadius: '10px', padding: '10px 12px' }}>
                                                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                                                                        <span style={{ fontSize: '18px', lineHeight: 1 }}>⚠️</span>
                                                                        <div>
                                                                            <div style={{ fontSize: '11px', fontWeight: 900, color: '#b45309' }}>
                                                                                Le client n'a pas encore choisi sa localisation sur la plateforme !
                                                                            </div>
                                                                            <div style={{ fontSize: '10.5px', color: '#92400e', marginTop: '2px', lineHeight: '1.3' }}>
                                                                                Ce client n'a pas encore défini sa ville ou son adresse sur le site. Veuillez sélectionner sa ville et préciser son quartier ci-dessous afin que GeoEngine calcule les frais de livraison exacts.
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Multiple saved addresses selector */}
                                                            {selectedCustomerAccount.addresses && selectedCustomerAccount.addresses.length > 1 && (
                                                                <div style={{ marginTop: '8px' }}>
                                                                    <label style={{ display: 'block', fontSize: '10px', fontWeight: 800, color: '#0369a1', textTransform: 'uppercase', marginBottom: '3px' }}>
                                                                        📍 Choisir parmi ses adresses ({selectedCustomerAccount.addresses.length}) :
                                                                    </label>
                                                                    <select
                                                                        onChange={e => {
                                                                            const chosen = selectedCustomerAccount.addresses.find((a: any) => String(a.id) === e.target.value);
                                                                            if (chosen) {
                                                                                const cCity = chosen.city || createOrderCustomer.city;
                                                                                const coords = CITY_COORDINATES[cCity] || CITY_COORDINATES['Cotonou'];
                                                                                const lat = chosen.customFields?.latitude != null ? Number(chosen.customFields.latitude) : coords.lat;
                                                                                const lng = chosen.customFields?.longitude != null ? Number(chosen.customFields.longitude) : coords.lng;
                                                                                setCreateOrderCustomer(prev => ({
                                                                                    ...prev,
                                                                                    city: cCity,
                                                                                    neighborhood: chosen.streetLine1 || prev.neighborhood,
                                                                                    latitude: lat,
                                                                                    longitude: lng,
                                                                                }));
                                                                            }
                                                                        }}
                                                                        style={{ width: '100%', padding: '7px 10px', borderRadius: '8px', border: '1px solid #7dd3fc', background: '#f0f9ff', fontSize: '11px', fontWeight: 700, color: '#0369a1', boxSizing: 'border-box' }}
                                                                    >
                                                                        {selectedCustomerAccount.addresses.map((a: any) => (
                                                                            <option key={a.id} value={a.id}>
                                                                                {a.city} {a.streetLine1 ? `- ${a.streetLine1}` : ''} {a.defaultShippingAddress ? '(Défaut)' : ''}
                                                                            </option>
                                                                        ))}
                                                                    </select>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        )}

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748b', marginBottom: '3px' }}>Prénom *</label>
                                                <input 
                                                    type="text" 
                                                    placeholder="ex: Brice" 
                                                    value={createOrderCustomer.firstName}
                                                    onChange={e => setCreateOrderCustomer({ ...createOrderCustomer, firstName: e.target.value })}
                                                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', fontWeight: 600, boxSizing: 'border-box' }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748b', marginBottom: '3px' }}>Nom</label>
                                                <input 
                                                    type="text" 
                                                    placeholder="ex: Dossou" 
                                                    value={createOrderCustomer.lastName}
                                                    onChange={e => setCreateOrderCustomer({ ...createOrderCustomer, lastName: e.target.value })}
                                                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', fontWeight: 600, boxSizing: 'border-box' }}
                                                />
                                            </div>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748b', marginBottom: '3px' }}>Téléphone WhatsApp *</label>
                                                <input 
                                                    type="text" 
                                                    placeholder="ex: +229 97 00 00 00" 
                                                    value={createOrderCustomer.phone}
                                                    onChange={e => setCreateOrderCustomer({ ...createOrderCustomer, phone: e.target.value })}
                                                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', fontWeight: 600, boxSizing: 'border-box' }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748b', marginBottom: '3px' }}>Email (optionnel)</label>
                                                <input 
                                                    type="email" 
                                                    placeholder="client@gmail.com" 
                                                    value={createOrderCustomer.email || ''}
                                                    onChange={e => setCreateOrderCustomer({ ...createOrderCustomer, email: e.target.value })}
                                                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', fontWeight: 600, boxSizing: 'border-box' }}
                                                />
                                            </div>
                                        </div>

                                        {/* LOCATION & GPS COORDINATES SECTION */}
                                        <div style={{ marginTop: '6px', background: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                                <span style={{ fontSize: '11px', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                    📍 Localisation exacte & Coordonnées GPS
                                                </span>
                                                <span style={{ fontSize: '10px', color: '#0369a1', fontWeight: 700 }}>
                                                    {createOrderCustomer.latitude && createOrderCustomer.longitude 
                                                        ? `GPS : ${createOrderCustomer.latitude.toFixed(5)}, ${createOrderCustomer.longitude.toFixed(5)}`
                                                        : 'Coordonnées par défaut'}
                                                </span>
                                            </div>

                                            {/* OpenStreetMap Search Bar */}
                                            <div style={{ marginBottom: '8px', position: 'relative' }}>
                                                <div style={{ position: 'relative' }}>
                                                    <Search size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                                    <input 
                                                        type="text"
                                                        placeholder="🔍 Rechercher un quartier ou repère au Bénin (ex: Haie Vive, Akpakpa...)"
                                                        value={osmSearchQuery}
                                                        onChange={async (e) => {
                                                            const val = e.target.value;
                                                            setOsmSearchQuery(val);
                                                            if (val.trim().length >= 3) {
                                                                setIsSearchingOsm(true);
                                                                try {
                                                                    const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(val.trim())}&countrycodes=bj&format=json&limit=5`, {
                                                                        headers: { 'Accept': 'application/json' }
                                                                    });
                                                                    if (res.ok) {
                                                                        const data = await res.json();
                                                                        setOsmSearchResults(data || []);
                                                                    }
                                                                } catch (err) {
                                                                    console.error(err);
                                                                } finally {
                                                                    setIsSearchingOsm(false);
                                                                }
                                                            } else {
                                                                setOsmSearchResults([]);
                                                            }
                                                        }}
                                                        style={{ width: '100%', padding: '7px 10px 7px 30px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '11px', fontWeight: 600, boxSizing: 'border-box' }}
                                                    />
                                                    {isSearchingOsm && (
                                                        <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '11px', color: '#64748b' }}>
                                                            ⏳
                                                        </span>
                                                    )}
                                                </div>

                                                {osmSearchResults.length > 0 && (
                                                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', borderRadius: '8px', border: '1px solid #cbd5e1', boxShadow: '0 8px 20px rgba(0,0,0,0.12)', zIndex: 110, maxHeight: '160px', overflowY: 'auto', marginTop: '4px' }}>
                                                        {osmSearchResults.map((place: any, idx: number) => {
                                                            const placeName = place.display_name.split(',')[0];
                                                            return (
                                                                <div
                                                                    key={idx}
                                                                    onClick={() => {
                                                                        const lat = parseFloat(place.lat);
                                                                        const lon = parseFloat(place.lon);
                                                                        const parts = place.display_name.split(',').map((s: string) => s.trim());
                                                                        const cityGuess = parts.find((p: string) => ['Cotonou', 'Abomey-Calavi', 'Porto-Novo', 'Parakou', 'Ouidah', 'Bohicon', 'Sèmè-Kpodji'].includes(p)) || createOrderCustomer.city || 'Cotonou';
                                                                        setCreateOrderCustomer(prev => ({
                                                                            ...prev,
                                                                            city: cityGuess,
                                                                            neighborhood: placeName,
                                                                            latitude: lat,
                                                                            longitude: lon,
                                                                        }));
                                                                        setOsmSearchResults([]);
                                                                        setOsmSearchQuery('');
                                                                    }}
                                                                    style={{ padding: '6px 10px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', fontSize: '11px' }}
                                                                    onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                                                                    onMouseLeave={e => (e.currentTarget.style.background = 'white')}
                                                                >
                                                                    <div style={{ fontWeight: 700, color: '#0f172a' }}>{placeName}</div>
                                                                    <div style={{ fontSize: '10px', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                                        {place.display_name} • ({parseFloat(place.lat).toFixed(4)}, {parseFloat(place.lon).toFixed(4)})
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>

                                            {/* City and Neighborhood Inputs */}
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748b', marginBottom: '3px' }}>Ville / Commune</label>
                                                    <select 
                                                        value={createOrderCustomer.city}
                                                        onChange={e => {
                                                            const c = e.target.value;
                                                            const coords = CITY_COORDINATES[c] || CITY_COORDINATES['Cotonou'];
                                                            setCreateOrderCustomer(prev => ({
                                                                ...prev,
                                                                city: c,
                                                                latitude: coords.lat,
                                                                longitude: coords.lng,
                                                            }));
                                                        }}
                                                        style={{ width: '100%', padding: '7px 8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', fontWeight: 600, background: 'white', boxSizing: 'border-box' }}
                                                    >
                                                        <option value="Cotonou">Cotonou</option>
                                                        <option value="Abomey-Calavi">Abomey-Calavi</option>
                                                        <option value="Porto-Novo">Porto-Novo</option>
                                                        <option value="Parakou">Parakou</option>
                                                        <option value="Ouidah">Ouidah</option>
                                                        <option value="Bohicon">Bohicon</option>
                                                        <option value="Sèmè-Kpodji">Sèmè-Kpodji</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748b', marginBottom: '3px' }}>Quartier / Repère</label>
                                                    <input 
                                                        type="text" 
                                                        placeholder="ex: Haie Vive, en face..." 
                                                        value={createOrderCustomer.neighborhood}
                                                        onChange={e => setCreateOrderCustomer({ ...createOrderCustomer, neighborhood: e.target.value })}
                                                        style={{ width: '100%', padding: '7px 8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', fontWeight: 600, boxSizing: 'border-box' }}
                                                    />
                                                </div>
                                            </div>

                                            {/* Numeric Latitude & Longitude Inputs */}
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 800, color: '#0369a1', marginBottom: '2px' }}>
                                                        🌐 Latitude GPS (ex: 6.372200)
                                                    </label>
                                                    <input 
                                                        type="number"
                                                        step="0.000001"
                                                        placeholder="6.372200"
                                                        value={createOrderCustomer.latitude ?? ''}
                                                        onChange={e => {
                                                            const val = e.target.value ? parseFloat(e.target.value) : undefined;
                                                            setCreateOrderCustomer(prev => ({ ...prev, latitude: val }));
                                                        }}
                                                        style={{ width: '100%', padding: '6px 8px', borderRadius: '8px', border: '1px solid #7dd3fc', background: '#f0f9ff', fontSize: '12px', fontWeight: 700, color: '#0369a1', boxSizing: 'border-box' }}
                                                    />
                                                </div>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 800, color: '#0369a1', marginBottom: '2px' }}>
                                                        🌐 Longitude GPS (ex: 2.425100)
                                                    </label>
                                                    <input 
                                                        type="number"
                                                        step="0.000001"
                                                        placeholder="2.425100"
                                                        value={createOrderCustomer.longitude ?? ''}
                                                        onChange={e => {
                                                            const val = e.target.value ? parseFloat(e.target.value) : undefined;
                                                            setCreateOrderCustomer(prev => ({ ...prev, longitude: val }));
                                                        }}
                                                        style={{ width: '100%', padding: '6px 8px', borderRadius: '8px', border: '1px solid #7dd3fc', background: '#f0f9ff', fontSize: '12px', fontWeight: 700, color: '#0369a1', boxSizing: 'border-box' }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Cart Items List */}
                                    <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '10px', background: '#f8fafc' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: '12px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                🛒 Panier ({createOrderCart.reduce((sum, i) => sum + i.quantity, 0)} articles)
                                            </span>
                                            {createOrderCart.length > 0 && (
                                                <button 
                                                    onClick={() => setCreateOrderCart([])} 
                                                    style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                                                >
                                                    Vider le panier
                                                </button>
                                            )}
                                        </div>

                                        {createOrderCart.length === 0 ? (
                                            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8', fontSize: '13px', border: '2px dashed #cbd5e1', borderRadius: '16px', background: 'white' }}>
                                                <span>👈 Cliquez sur « Ajouter » sur les produits à gauche pour composer la commande.</span>
                                            </div>
                                        ) : (
                                            createOrderCart.map((item) => {
                                                const itemImg = getImgUrl(item.preview);
                                                return (
                                                    <div 
                                                        key={item.variantId}
                                                        style={{ background: 'white', borderRadius: '12px', padding: '12px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}
                                                    >
                                                        {itemImg ? (
                                                            <img src={itemImg} alt="" style={{ width: '42px', height: '42px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #e2e8f0', flexShrink: 0 }} />
                                                        ) : (
                                                            <div style={{ width: '42px', height: '42px', borderRadius: '8px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', flexShrink: 0 }}>
                                                                <Package size={18} />
                                                            </div>
                                                        )}
                                                        <div style={{ flex: 1, minWidth: 0 }}>
                                                            <div style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                                {item.productName}
                                                            </div>
                                                            <div style={{ display: 'flex', gap: '4px', alignItems: 'center', marginTop: '2px', flexWrap: 'wrap' }}>
                                                                {item.optionLabel ? (
                                                                    <span style={{ display: 'inline-block', background: '#e0f2fe', color: '#0369a1', padding: '1px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 700 }}>
                                                                        {item.optionLabel}
                                                                    </span>
                                                                ) : null}
                                                                {item.vendorName ? (
                                                                    <span style={{ display: 'inline-block', background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', padding: '1px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 800 }}>
                                                                        🏪 {item.vendorName} {item.marketName ? `(${item.marketName})` : ''}
                                                                    </span>
                                                                ) : null}
                                                            </div>
                                                            <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', marginTop: '2px' }}>
                                                                {formatPrice(item.price, 'XOF')}
                                                            </div>
                                                        </div>

                                                        {/* Quantity stepper */}
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f8fafc', padding: '3px 6px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                                            <button 
                                                                onClick={() => updateCartQty(item.variantId, -1)}
                                                                style={{ width: '22px', height: '22px', borderRadius: '6px', border: 'none', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569' }}
                                                            >
                                                                <Minus size={12} />
                                                            </button>
                                                            <span style={{ fontSize: '12px', fontWeight: 800, minWidth: '18px', textAlign: 'center' }}>
                                                                {item.quantity}
                                                            </span>
                                                            <button 
                                                                onClick={() => updateCartQty(item.variantId, 1)}
                                                                style={{ width: '22px', height: '22px', borderRadius: '6px', border: 'none', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569' }}
                                                            >
                                                                <Plus size={12} />
                                                            </button>
                                                        </div>

                                                        {/* Line Total & Remove */}
                                                        <div style={{ textAlign: 'right', minWidth: '70px' }}>
                                                            <div style={{ fontSize: '12px', fontWeight: 900, color: '#0f172a' }}>
                                                                {formatPrice(item.price * item.quantity, 'XOF')}
                                                            </div>
                                                            <button 
                                                                onClick={() => removeFromCart(item.variantId)}
                                                                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '2px', marginTop: '2px' }}
                                                            >
                                                                <Trash2 size={13} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>

                                    {/* Cart Footer: Total & Submit */}
                                    <div style={{ padding: '16px 20px', background: 'white', borderTop: '1px solid #e2e8f0' }}>
                                        {/* Subtotal */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
                                            <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>Sous-total articles :</span>
                                            <span style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                                                {formatPrice(totalCartPrice, 'XOF')}
                                            </span>
                                        </div>

                                        {/* GeoEngine Dynamic Delivery Fee */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span style={{ fontSize: '12px', fontWeight: 700, color: '#0369a1', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <span>🚚</span> Frais de livraison (GeoEngine) :
                                                </span>
                                                {shippingFeePreview && (
                                                    <span style={{ fontSize: '10.5px', color: '#64748b', marginTop: '1px' }}>
                                                        {shippingFeePreview.distanceKm} km depuis {shippingFeePreview.vendorName || 'Boutique'} ({shippingFeePreview.vendorCity || 'Cotonou'})
                                                    </span>
                                                )}
                                            </div>
                                            <span style={{ fontSize: '14px', fontWeight: 800, color: shippingFeePreview?.loading ? '#94a3b8' : '#0369a1' }}>
                                                {shippingFeePreview?.loading 
                                                    ? '⏳ Calcul...' 
                                                    : formatPrice(shippingFeePreview?.shippingFee ?? 500, 'XOF')}
                                            </span>
                                        </div>

                                        {/* Total General TTC */}
                                        <div style={{ borderTop: '2px dashed #e2e8f0', paddingTop: '10px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                            <div>
                                                <div style={{ fontSize: '14px', fontWeight: 900, color: '#0f172a' }}>Total Général TTC :</div>
                                                <div style={{ fontSize: '10px', color: '#16a34a', fontWeight: 700 }}>Paiement à la livraison (Cash on Delivery)</div>
                                            </div>
                                            <span style={{ fontSize: '20px', fontWeight: 900, color: '#16a34a' }}>
                                                {formatPrice(totalCartPrice + (shippingFeePreview?.shippingFee ?? 500), 'XOF')}
                                            </span>
                                        </div>

                                        <div style={{ display: 'flex', gap: '10px' }}>
                                            <button 
                                                onClick={() => setIsCreateOrderModalOpen(false)}
                                                style={{ flex: 1, padding: '11px', borderRadius: '10px', border: '1px solid #cbd5e1', background: 'white', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}
                                            >
                                                Annuler
                                            </button>
                                            <button 
                                                disabled={createOrderCustomer.isSubmitting || createOrderCart.length === 0}
                                                onClick={handleCreateOrderSubmit}
                                                style={{ 
                                                    flex: 2, 
                                                    padding: '11px', 
                                                    borderRadius: '10px', 
                                                    border: 'none', 
                                                    background: createOrderCart.length === 0 ? '#94a3b8' : '#2563eb', 
                                                    color: 'white', 
                                                    fontWeight: 800, 
                                                    fontSize: '13px', 
                                                    cursor: createOrderCart.length === 0 || createOrderCustomer.isSubmitting ? 'not-allowed' : 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '8px',
                                                    boxShadow: '0 4px 12px rgba(37,99,235,0.25)'
                                                }}
                                            >
                                                {createOrderCustomer.isSubmitting ? (
                                                    <>⏳ Finalisation de la commande...</>
                                                ) : (
                                                    <>✅ Valider la Commande ({formatPrice(totalCartPrice + (shippingFeePreview?.shippingFee ?? 500), 'XOF')})</>
                                                )}
                                            </button>
                                        </div>
                                    </div>

                                </div>

                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
}

function OrderModal({ order, onClose, onTransition, onUpdateSeller, onUpdateAdmin, isMutating }: any) {
    const stObj = stateMeta[order.state] || { label: order.state, color: '#9CA3AF', icon: Package };
    const StateIcon = stObj.icon;

    // Optional: Hide scrolling on body when modal is open
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = 'auto'; };
    }, []);

    // Group order lines by vendor for sub-orders breakdown
    const linesByVendorMap: { [id: string]: { vendor: any; lines: any[]; total: number } } = {};
    (order.lines || []).forEach((line: any) => {
        const lineVendor = line.customFields?.assignedVendor || line.productVariant?.product?.customFields?.vendor || order.customFields?.vendor || { id: 'default', name: 'Boutique Principale' };
        const vId = lineVendor.id || 'default';
        if (!linesByVendorMap[vId]) {
            linesByVendorMap[vId] = { vendor: lineVendor, lines: [], total: 0 };
        }
        linesByVendorMap[vId].lines.push(line);
        linesByVendorMap[vId].total += (line.proratedLinePriceWithTax || line.linePriceWithTax || 0);
    });
    const vendorSubOrders = Object.keys(linesByVendorMap).map(k => linesByVendorMap[k]);

    const [selectedSubOrderIndex, setSelectedSubOrderIndex] = useState<number | 'all'>(
        vendorSubOrders.length > 0 ? 0 : 'all'
    );

    // Vendor Statuses Map
    const vendorStatusesMap = useMemo(() => {
        try {
            return order.customFields?.vendorStatuses ? JSON.parse(order.customFields.vendorStatuses) : {};
        } catch (e) {
            return {};
        }
    }, [order.customFields?.vendorStatuses]);

    // Current targeted sub-order vendor
    const activeSubOrderVendor = selectedSubOrderIndex === 'all' 
        ? null 
        : vendorSubOrders[selectedSubOrderIndex]?.vendor;

    const sStat = (activeSubOrderVendor && activeSubOrderVendor.id)
        ? (vendorStatusesMap[activeSubOrderVendor.id]?.sellerStatus || 'pending')
        : (order.customFields?.sellerStatus || 'pending');

    const aStat = (activeSubOrderVendor && activeSubOrderVendor.id)
        ? (vendorStatusesMap[activeSubOrderVendor.id]?.adminStatus || 'pending')
        : (order.customFields?.adminStatus || 'pending');

    const isConfirmed = sStat === 'confirmed';

    // Filter displayed lines according to selected sub-order
    const displayedLines = selectedSubOrderIndex === 'all'
        ? order.lines
        : (vendorSubOrders[selectedSubOrderIndex]?.lines || []);

    const [reassignVendorModal, setReassignVendorModal] = useState(false);
    const [reassignProductModal, setReassignProductModal] = useState(false);
    const [targetVendorId, setTargetVendorId] = useState('');
    const [vendorSearchTerm, setVendorSearchTerm] = useState('');
    const [targetProductId, setTargetProductId] = useState('');
    const [targetProductName, setTargetProductName] = useState('');
    const [targetPrice, setTargetPrice] = useState('');
    const [targetLineId, setTargetLineId] = useState('');
    const queryClient = useQueryClient();

    const { data: vendorsData } = useQuery({
        queryKey: ['minimalVendors'],
        queryFn: () => fetchGraphQL(GET_VENDORS_MINIMAL),
        enabled: reassignVendorModal || reassignProductModal
    });

    const { data: productsData } = useQuery({
        queryKey: ['minimalProducts'],
        queryFn: () => fetchGraphQL(GET_PRODUCTS_MINIMAL),
        enabled: reassignProductModal,
        staleTime: 30000,
    });

    // Filter vendors by search term
    const filteredVendors = React.useMemo(() => {
        const items = vendorsData?.vendors?.items || [];
        if (!vendorSearchTerm.trim()) return items;
        const term = vendorSearchTerm.toLowerCase();
        return items.filter((v: any) => 
            (v.name && v.name.toLowerCase().includes(term)) ||
            (v.email && v.email.toLowerCase().includes(term))
        );
    }, [vendorsData?.vendors?.items, vendorSearchTerm]);

    // Filter products for the currently selected target vendor
    const vendorFilteredProducts = React.useMemo(() => {
        if (!targetVendorId || !productsData?.adminVendorProducts?.items) return [];
        return (productsData.adminVendorProducts.items as any[]).filter(
            (p: any) => p.customFields?.vendor?.id?.toString() === targetVendorId.toString()
        );
    }, [targetVendorId, productsData]);

    const reassignVendorMutation = useMutation({
        mutationFn: ({ oldVendorId, newVendorId }: any) => 
            fetchGraphQL(REASSIGN_VENDOR_SUB_ORDER, { orderId: order.id, oldVendorId, newVendorId }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['adminOrders'] });
            setReassignVendorModal(false);
            alert('✅ Sous-commande réassignée avec succès au nouveau vendeur !');
            onClose();
        },
        onError: (err: any) => {
            alert('❌ Erreur lors de la réassignation : ' + (err?.message || 'Erreur inconnue'));
        }
    });

    const reassignProductMutation = useMutation({
        mutationFn: ({ lineId, newProductId, newProductName, newPrice, newVendorId }: any) => 
            fetchGraphQL(REASSIGN_ORDER_LINE_TO_PRODUCT, { 
                orderId: order.id, 
                lineId, 
                newProductId: newProductId || undefined, 
                newProductName: newProductName || undefined, 
                newPrice: Number(newPrice), 
                newVendorId 
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['adminOrders'] });
            setReassignProductModal(false);
            alert('✅ Produit réassigné avec succès !');
            onClose();
        },
        onError: (err: any) => {
            alert('❌ Erreur lors de la réassignation produit : ' + (err?.message || 'Erreur inconnue'));
        }
    });

    const deleteOrderMutation = useMutation({
        mutationFn: (param: any) => {
            const orderId = typeof param === 'string' ? param : (param?.orderId || param?.id);
            return fetchGraphQL(DELETE_VENDOR_ORDER, { orderId });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['adminOrders'] });
            alert('Commande supprimée avec succès !');
            onClose();
        },
        onError: (err: any) => {
            alert('❌ Erreur lors de la suppression : ' + (err?.message || 'Erreur inconnue'));
        }
    });

    return (
        <div className="po-modal-overlay" onClick={onClose} style={{ backdropFilter: 'blur(6px)', background: 'rgba(15, 23, 42, 0.65)' }}>
            <div className="po-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '1150px', width: '95vw', maxHeight: '92vh', borderRadius: '20px', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', border: '1px solid #cbd5e1' }}>
                
                {/* ── HEADER ── */}
                <div style={{ background: '#ffffff', padding: '20px 28px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                            <h2 style={{ fontSize: '24px', fontWeight: 900, margin: 0, color: '#0f172a', letterSpacing: '-0.02em' }}>
                                Commande <span style={{ color: '#2563eb', fontFamily: 'monospace' }}>#{order.code}</span>
                            </h2>
                            <span className="po-status-badge" style={{ background: `${stObj.color}18`, color: stObj.color, fontSize: '12px', fontWeight: 800, padding: '4px 10px', borderRadius: '8px' }}>
                                <StateIcon size={14} /> {stObj.label}
                            </span>
                            {vendorSubOrders.length > 1 ? (
                                <span style={{ background: '#eff6ff', color: '#1d4ed8', fontSize: '11px', fontWeight: 800, padding: '4px 10px', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                                    📦 {vendorSubOrders.length} Sous-Commandes Vendeurs
                                </span>
                            ) : (
                                <span style={{ background: '#f8fafc', color: '#475569', fontSize: '11px', fontWeight: 800, padding: '4px 10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                    👤 1 Vendeur unique
                                </span>
                            )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#64748b', fontSize: '12px', fontWeight: 600, marginTop: '6px' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Clock size={14} /> Passée le {formatDate(order.createdAt)}
                            </span>
                            <span>•</span>
                            <span>{order.lines.length} Article(s)</span>
                            <span>•</span>
                            <span>Client: <strong>{order.customer ? `${order.customer.firstName} ${order.customer.lastName}` : 'Client Invité'}</strong></span>
                        </div>
                    </div>
                    
                    <button 
                        onClick={onClose} 
                        style={{ background: '#f1f5f9', border: 'none', borderRadius: '12px', width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#475569', transition: 'all 0.2s' }} 
                        onMouseEnter={e => e.currentTarget.style.background='#e2e8f0'} 
                        onMouseLeave={e => e.currentTarget.style.background='#f1f5f9'}
                        title="Fermer la fenêtre"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* ── TOP KPI STRIP ── */}
                <div style={{ background: '#f8fafc', padding: '14px 28px', borderBottom: '1px solid #e2e8f0', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                    <div style={{ background: 'white', padding: '10px 14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '10px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Total Payé Client</div>
                        <div style={{ fontSize: '16px', fontWeight: 900, color: '#0f172a', marginTop: '2px' }}>{formatPrice(order.totalWithTax, order.currencyCode)}</div>
                    </div>
                    <div style={{ background: 'white', padding: '10px 14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '10px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Téléphone Client</div>
                        <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Phone size={13} color="#2563eb" /> {order.customer?.phoneNumber || order.shippingAddress?.phoneNumber || 'Non renseigné'}
                        </div>
                    </div>
                    <div style={{ background: 'white', padding: '10px 14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '10px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Ville Livraison</div>
                        <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <MapPin size={13} color="#16a34a" /> {order.shippingAddress?.city ? `${order.shippingAddress.city}, ${order.shippingAddress.province || ''}` : 'Non spécifiée'}
                        </div>
                    </div>
                    <div style={{ background: 'white', padding: '10px 14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '10px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Statut Expédition Client</div>
                        <div style={{ fontSize: '12px', fontWeight: 800, color: '#2563eb', marginTop: '2px' }}>
                            {order.customFields?.adminStatus === 'delivered' ? '🎉 Colis Livré' :
                             order.customFields?.adminStatus === 'shipped' ? '🚚 Expédiée' :
                             order.customFields?.adminStatus === 'in_transit' ? '✈️ En transit' :
                             order.customFields?.adminStatus === 'cancelled' ? '❌ Annulée' : '⏳ Préparation'}
                        </div>
                    </div>
                </div>

                {/* ── MODAL BODY (SCROLLABLE) ── */}
                <div className="po-modal-body" style={{ display: 'flex', gap: '24px', padding: '24px 28px', overflowY: 'auto', flex: 1 }}>
                    
                    {/* LEFT COLUMN: Sub-orders per Vendor (68%) */}
                    <div style={{ flex: '2', minWidth: '400px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ fontSize: '14px', fontWeight: 900, margin: 0, textTransform: 'uppercase', color: '#334155', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Store size={18} color="#2563eb" />
                                Détail des Sous-Commandes par Vendeur ({vendorSubOrders.length})
                            </h3>
                        </div>

                        {/* LIST OF VENDORS & THEIR ITEMS */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {vendorSubOrders.map((so, vIdx) => {
                                const vId = String(so?.vendor?.id || 'default');
                                
                                // Directly evaluate line statuses for real-time accuracy
                                const isAllConfirmed = so.lines.length > 0 && so.lines.every((l: any) => {
                                    const st = l.customFields?.sellerStatus || 'pending';
                                    return st === 'confirmed' || st === 'approved';
                                });
                                const hasAnyRefused = so.lines.some((l: any) => {
                                    const st = l.customFields?.sellerStatus || 'pending';
                                    return st === 'refused' || st === 'reassigning';
                                });
                                const isAllReassigned = so.lines.length > 0 && so.lines.every((l: any) => {
                                    const st = l.customFields?.sellerStatus || 'pending';
                                    return st === 'reassigned_to_other';
                                });

                                let soVendorStatus = vendorStatusesMap[vId]?.sellerStatus || vendorStatusesMap[String(vId)]?.sellerStatus;
                                if (!soVendorStatus || soVendorStatus === 'pending') {
                                    if (isAllConfirmed) soVendorStatus = 'confirmed';
                                    else if (hasAnyRefused) soVendorStatus = 'reassigning';
                                    else if (isAllReassigned) soVendorStatus = 'reassigned_to_other';
                                    else soVendorStatus = order.customFields?.sellerStatus || 'pending';
                                } else if (isAllConfirmed) {
                                    soVendorStatus = 'confirmed';
                                }
                                
                                const statusMetaMap: Record<string, { label: string; color: string; bg: string; border: string }> = {
                                    ready_for_pickup: { label: '📦 Colis prêt pour ramassage', color: '#047857', bg: '#ecfdf5', border: '#a7f3d0' },
                                    confirmed: { label: '✅ Approuvé par le vendeur', color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0' },
                                    approved: { label: '✅ Approuvé par le vendeur', color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0' },
                                    refused: { label: '❌ Rejeté par le vendeur', color: '#b91c1c', bg: '#fef2f2', border: '#fecaca' },
                                    rejected: { label: '❌ Rejeté par le vendeur', color: '#b91c1c', bg: '#fef2f2', border: '#fecaca' },
                                    reassigning: { label: '🔄 En réassignation', color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
                                    reassigned_to_other: { label: '⏭️ Réassigné', color: '#475569', bg: '#f1f5f9', border: '#cbd5e1' },
                                    pending: { label: '⏳ En attente de validation', color: '#b45309', bg: '#fffbeb', border: '#fde68a' }
                                };
                                const meta = statusMetaMap[soVendorStatus] || statusMetaMap.pending;

                                return (
                                    <div 
                                        key={vIdx} 
                                        style={{ 
                                            background: '#ffffff', 
                                            borderRadius: '16px', 
                                            border: '1px solid #e2e8f0', 
                                            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                                            overflow: 'hidden' 
                                        }}
                                    >
                                        {/* Vendor Sub-Order Header */}
                                        <div style={{ background: '#f8fafc', padding: '14px 18px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '14px', border: '1px solid #bfdbfe' }}>
                                                    🏪
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: '15px', fontWeight: 900, color: '#0f172a' }}>{so.vendor.name}</div>
                                                    <div style={{ fontSize: '11px', color: '#64748b' }}>
                                                        {so.vendor.email || 'Pas de courriel'} {so.vendor.phoneNumber ? `• Tel: ${so.vendor.phoneNumber}` : ''}
                                                    </div>
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                {/* Per-vendor Seller Status Selector */}
                                                <select
                                                    value={soVendorStatus}
                                                    onChange={e => onUpdateSeller(e.target.value, so.vendor.id)}
                                                    disabled={isMutating}
                                                    style={{
                                                        padding: '4px 8px',
                                                        fontSize: '11px',
                                                        fontWeight: 800,
                                                        borderRadius: '8px',
                                                        border: `1px solid ${meta.border}`,
                                                        color: meta.color,
                                                        background: meta.bg,
                                                        cursor: isMutating ? 'wait' : 'pointer'
                                                    }}
                                                    title="Modifier le statut de validation de ce vendeur"
                                                >
                                                    <option value="pending">⏳ En attente</option>
                                                    <option value="confirmed">✅ Confirmé</option>
                                                    <option value="ready_for_pickup">📦 Prêt ramassage</option>
                                                    <option value="refused">❌ Refusé</option>
                                                    <option value="reassigning">🔄 En réassignation</option>
                                                </select>

                                                {/* Per-vendor Admin/Shipping Status Selector */}
                                                <select
                                                    value={vendorStatusesMap[vId]?.adminStatus || 'pending'}
                                                    onChange={e => onUpdateAdmin(e.target.value, so.vendor.id)}
                                                    disabled={isMutating}
                                                    style={{
                                                        padding: '4px 8px',
                                                        fontSize: '11px',
                                                        fontWeight: 800,
                                                        borderRadius: '8px',
                                                        border: '1px solid #cbd5e1',
                                                        color: '#1e293b',
                                                        background: 'white',
                                                        cursor: isMutating ? 'wait' : 'pointer'
                                                    }}
                                                    title="Modifier le statut d'expédition de ce vendeur"
                                                >
                                                    <option value="pending">⏳ Préparation</option>
                                                    <option value="in_transit">✈️ En transit</option>
                                                    <option value="shipped">🚚 Expédiée</option>
                                                    <option value="delivered">📦 Livré</option>
                                                </select>

                                                <span style={{ fontSize: '13px', fontWeight: 900, color: '#0f172a', marginLeft: '4px' }}>
                                                    {formatPrice(so.total, order.currencyCode)}
                                                </span>

                                                {/* Transfer entire sub-order button */}
                                                {!isAllConfirmed && soVendorStatus !== 'reassigned_to_other' && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedSubOrderIndex(vIdx);
                                                            setTargetVendorId('');
                                                            setReassignVendorModal(true);
                                                        }}
                                                        style={{
                                                            padding: '4px 8px',
                                                            background: '#f1f5f9',
                                                            color: '#334155',
                                                            border: '1px solid #cbd5e1',
                                                            borderRadius: '8px',
                                                            fontWeight: 800,
                                                            fontSize: '11px',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '4px'
                                                        }}
                                                        title="Transférer tous les articles de ce vendeur à un autre vendeur"
                                                    >
                                                        🔄 Transférer
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Items List for this vendor */}
                                        <div style={{ padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            {so.lines.map((line: any) => {
                                                const lineStatus = line.customFields?.sellerStatus || 'pending';
                                                const isCancelled = lineStatus === 'cancelled' || line.quantity === 0;
                                                const isConfirmed = !isCancelled && (lineStatus === 'confirmed' || lineStatus === 'approved');
                                                const isRefused = !isCancelled && (lineStatus === 'refused' || lineStatus === 'rejected');
                                                const isReassigned = !isCancelled && lineStatus === 'reassigned_to_other';
                                                const isReassigning = !isCancelled && lineStatus === 'reassigning';
                                                const isPending = !isCancelled && !isConfirmed && !isRefused && !isReassigned && !isReassigning;

                                                return (
                                                    <div 
                                                        key={line.id} 
                                                        style={{ 
                                                            display: 'flex', 
                                                            alignItems: 'center', 
                                                            gap: '14px', 
                                                            padding: '10px 14px', 
                                                            borderRadius: '12px', 
                                                            background: isCancelled ? '#fff1f2' : isReassigned ? '#f8fafc' : '#ffffff', 
                                                            border: isCancelled ? '1px solid #fecdd3' : isRefused ? '1px solid #fecaca' : isConfirmed ? '1px solid #bbf7d0' : '1px solid #f1f5f9',
                                                            opacity: (isReassigned || isCancelled) ? 0.6 : 1
                                                        }}
                                                    >
                                                        <img 
                                                            src={line.productVariant?.featuredAsset?.preview || '/placeholder.png'} 
                                                            alt={line.productVariant?.name} 
                                                            style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#f8fafc' }}
                                                        />
                                                        
                                                        <div style={{ flex: 1, textAlign: 'left' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                                <span style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', textDecoration: isCancelled ? 'line-through' : 'none' }}>{line.productVariant?.name}</span>
                                                                
                                                                {/* Status Badge */}
                                                                {isCancelled && (
                                                                    <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '6px', background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca' }}>
                                                                        🚫 Annulé par le client
                                                                    </span>
                                                                )}
                                                                {isConfirmed && (
                                                                    <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '6px', background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0' }}>
                                                                        ✅ Approuvé
                                                                    </span>
                                                                )}
                                                                {isRefused && (
                                                                    <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '6px', background: '#fee2e2', color: '#b91c1c', border: '1px solid #fecaca' }}>
                                                                        ❌ Rejeté
                                                                    </span>
                                                                )}
                                                                {isReassigning && (
                                                                    <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '6px', background: '#f5f3ff', color: '#7c3aed', border: '1px solid #ddd6fe' }}>
                                                                        🔄 En réassignation
                                                                    </span>
                                                                )}
                                                                {isReassigned && (
                                                                    <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '6px', background: '#f1f5f9', color: '#64748b', border: '1px solid #cbd5e1' }}>
                                                                        ⏭️ Réassigné
                                                                    </span>
                                                                )}
                                                                {isPending && (
                                                                    <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '6px', background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a' }}>
                                                                        ⏳ En attente
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '3px' }}>
                                                                SKU: <strong style={{ color: '#475569' }}>{line.productVariant?.sku || '—'}</strong> • Prix unitaire: {formatPrice(line.unitPriceWithTax || line.listPrice || 0, order.currencyCode)}
                                                            </div>
                                                        </div>

                                                        <div style={{ textAlign: 'center', minWidth: '45px' }}>
                                                            <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontWeight: 800 }}>Qté</div>
                                                            <div style={{ fontSize: '14px', fontWeight: 900, color: '#0f172a' }}>{line.quantity}</div>
                                                        </div>

                                                        <div style={{ textAlign: 'right', minWidth: '95px' }}>
                                                            <div style={{ fontSize: '13px', fontWeight: 900, color: '#0f172a' }}>{formatPrice(line.linePriceWithTax, order.currencyCode)}</div>
                                                        </div>

                                                        {/* Reassign Action logic strictly complying with user rule */}
                                                        <div style={{ minWidth: '150px', textAlign: 'right' }}>
                                                            {isCancelled ? (
                                                                <span style={{ fontSize: '11px', fontWeight: 800, color: '#991b1b', background: '#fee2e2', padding: '4px 8px', borderRadius: '6px', border: '1px solid #fecaca', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                                    🚫 Non réassignable
                                                                </span>
                                                            ) : isConfirmed ? (
                                                                <span 
                                                                    title="Cet article a été approuvé par le vendeur." 
                                                                    style={{ 
                                                                        fontSize: '11px', 
                                                                        fontWeight: 800, 
                                                                        color: '#16a34a', 
                                                                        background: '#dcfce7', 
                                                                        padding: '4px 8px', 
                                                                        borderRadius: '6px',
                                                                        border: '1px solid #bbf7d0',
                                                                        display: 'inline-flex',
                                                                        alignItems: 'center',
                                                                        gap: '4px'
                                                                    }}
                                                                >
                                                                    🔒 Approuvé
                                                                </span>
                                                            ) : isReassigned ? (
                                                                <span style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8' }}>
                                                                    Déjà transféré
                                                                </span>
                                                            ) : (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setTargetLineId(line.id);
                                                                        setTargetVendorId('');
                                                                        setTargetProductId('');
                                                                        setTargetPrice(String(line.unitPriceWithTax || line.listPrice || 0));
                                                                        setTargetProductName('');
                                                                        setReassignProductModal(true);
                                                                    }}
                                                                    style={{
                                                                        fontSize: '11px',
                                                                        fontWeight: 800,
                                                                        padding: '6px 12px',
                                                                        borderRadius: '8px',
                                                                        backgroundColor: isRefused ? '#dc2626' : isPending ? '#d97706' : '#7c3aed',
                                                                        color: 'white',
                                                                        border: 'none',
                                                                        cursor: 'pointer',
                                                                        display: 'inline-flex',
                                                                        alignItems: 'center',
                                                                        gap: '4px',
                                                                        transition: 'opacity 0.2s'
                                                                    }}
                                                                    onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
                                                                    onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                                                                >
                                                                    🔄 Réassigner cet article
                                                                </button>
                                                            )}
                                                        </div>

                                                    </div>
                                                );
                                            })}
                                        </div>

                                    </div>
                                );
                            })}
                        </div>

                    </div>

                    {/* RIGHT COLUMN: Client Visibility overrides, Customer Info & Totals (32%) */}
                    <div style={{ flex: '1', minWidth: '290px', display: 'flex', flexDirection: 'column', gap: '20px', borderLeft: '1px solid #e2e8f0', paddingLeft: '24px' }}>
                        
                        {/* 1. CLIENT VISIBILITY OVERRIDES */}
                        <div style={{ background: '#f8fafc', padding: '18px', borderRadius: '16px', border: '1px solid #cbd5e1' }}>
                            <h4 style={{ fontSize: '12px', fontWeight: 900, margin: '0 0 8px 0', textTransform: 'uppercase', color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: '6px', letterSpacing: '0.05em' }}>
                                <Activity size={16} color="#2563eb" /> Statuts Visibles par le Client
                            </h4>
                            <p style={{ fontSize: '11px', color: '#64748b', margin: '0 0 12px 0', lineHeight: '1.4' }}>
                                Synchronisé en direct sur l'espace client du Storefront par boutique.
                            </p>

                            {/* Multi-vendor targeted selector */}
                            {vendorSubOrders.length > 1 && (
                                <div style={{ marginBottom: '14px', textAlign: 'left' }}>
                                    <label style={{ fontSize: '11px', fontWeight: 800, color: '#1e293b', display: 'block', marginBottom: '5px' }}>
                                        Boutique ciblée ({vendorSubOrders.length} vendeurs)
                                    </label>
                                    <div className="po-select-wrapper">
                                        <select
                                            className="po-select"
                                            value={selectedSubOrderIndex === 'all' ? 0 : selectedSubOrderIndex}
                                            onChange={e => setSelectedSubOrderIndex(Number(e.target.value))}
                                            style={{ fontWeight: 800, fontSize: '12px', background: 'white', border: '1.5px solid #2563eb' }}
                                        >
                                            {vendorSubOrders.map((so, idx) => (
                                                <option key={idx} value={idx}>🏪 {so.vendor.name}</option>
                                            ))}
                                        </select>
                                        <ChevronDown size={15} className="po-select-icon" />
                                    </div>
                                </div>
                            )}
                            
                            {/* Validation Vendeur override */}
                            <div style={{ marginBottom: '14px', textAlign: 'left' }}>
                                <label style={{ fontSize: '11px', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '6px' }}>
                                    Validation Vendeur {activeSubOrderVendor?.name ? `(${activeSubOrderVendor.name})` : ''}
                                </label>
                                <div className="po-select-wrapper">
                                    <select 
                                        className="po-select" 
                                        value={sStat}
                                        onChange={e => onUpdateSeller(e.target.value, activeSubOrderVendor?.id)}
                                        disabled={isMutating}
                                        style={{ fontWeight: 800, fontSize: '12px', background: 'white' }}
                                    >
                                        <option value="pending">⏳ En attente validation</option>
                                        <option value="confirmed">✅ Confirmée (Acceptée)</option>
                                        <option value="ready_for_pickup">📦 Prêt pour ramassage</option>
                                        <option value="refused">❌ Refusée</option>
                                        <option value="reassigning">🔄 En cours de réassignation</option>
                                    </select>
                                    <ChevronDown size={15} className="po-select-icon" />
                                </div>
                            </div>

                            {/* Statut d'expédition override */}
                            <div style={{ textAlign: 'left' }}>
                                <label style={{ fontSize: '11px', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '6px' }}>
                                    Statut Expédition {activeSubOrderVendor?.name ? `(${activeSubOrderVendor.name})` : ''}
                                </label>
                                <div className="po-select-wrapper">
                                    <select 
                                        className="po-select" 
                                        value={aStat}
                                        onChange={e => onUpdateAdmin(e.target.value, activeSubOrderVendor?.id)}
                                        disabled={isMutating}
                                        style={{ fontWeight: 800, fontSize: '12px', background: 'white' }}
                                    >
                                        <option value="pending">⏳ Préparation du colis</option>
                                        <option value="in_transit">✈️ En transit</option>
                                        <option value="shipped">🚚 Expédiée</option>
                                        <option value="delivered">📦 Colis Livré</option>
                                        <option value="cancelled">❌ Annulée</option>
                                    </select>
                                    <ChevronDown size={15} className="po-select-icon" />
                                </div>
                            </div>
                        </div>

                        {/* 2. CUSTOMER CONTACT */}
                        <div style={{ background: '#ffffff', padding: '16px', borderRadius: '14px', border: '1px solid #e2e8f0', textAlign: 'left' }}>
                            <h4 style={{ fontSize: '12px', fontWeight: 800, margin: '0 0 10px 0', textTransform: 'uppercase', color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <User size={15} color="#64748b" /> Coordonnées Client
                            </h4>
                            {order.customer ? (
                                <div style={{ fontSize: '12px', color: '#334155', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '13px' }}>{order.customer.firstName} {order.customer.lastName}</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Mail size={13} color="#94a3b8" /> {order.customer.emailAddress}</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Phone size={13} color="#94a3b8" /> {order.customer.phoneNumber || '—'}</div>
                                </div>
                            ) : <p style={{ color: '#94a3b8', fontSize: '12px', margin: 0 }}>Aucune info client.</p>}
                        </div>

                        {/* 3. SHIPPING ADDRESS */}
                        <div style={{ background: '#ffffff', padding: '16px', borderRadius: '14px', border: '1px solid #e2e8f0', textAlign: 'left' }}>
                            <h4 style={{ fontSize: '12px', fontWeight: 800, margin: '0 0 10px 0', textTransform: 'uppercase', color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <MapPin size={15} color="#64748b" /> Adresse de Livraison
                            </h4>
                            {order.shippingAddress ? (
                                <div style={{ color: '#334155', fontSize: '12px', lineHeight: '1.5' }}>
                                    <div style={{ fontWeight: 800 }}>{order.shippingAddress.fullName}</div>
                                    <div>{order.shippingAddress.streetLine1}</div>
                                    {order.shippingAddress.streetLine2 && <div>{order.shippingAddress.streetLine2}</div>}
                                    <div>{order.shippingAddress.city}, {order.shippingAddress.province}</div>
                                    {order.shippingAddress.phoneNumber && <div style={{ marginTop: '4px', fontWeight: 700, color: '#2563eb' }}><Phone size={11} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }}/> {order.shippingAddress.phoneNumber}</div>}
                                </div>
                            ) : <p style={{ color: '#94a3b8', fontSize: '12px', margin: 0 }}>Aucune adresse.</p>}
                        </div>

                        {/* 4. FINANCIAL SUMMARY */}
                        <div style={{ background: '#f8fafc', borderRadius: '16px', padding: '18px', border: '1px solid #cbd5e1' }}>
                            <div style={{ fontSize: '12px', fontWeight: 800, color: '#334155', marginBottom: '12px', textTransform: 'uppercase' }}>
                                Récapitulatif Financier
                            </div>
                            <div style={{ fontSize: '12px', display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: '#64748b' }}>
                                <span>Sous-total articles</span>
                                <span style={{ fontWeight: 700, color: '#0f172a' }}>{formatPrice(order.subTotalWithTax, order.currencyCode)}</span>
                            </div>
                            <div style={{ fontSize: '12px', display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: '#64748b' }}>
                                <span>Frais de livraison</span>
                                <span style={{ fontWeight: 700, color: '#0f172a' }}>{formatPrice(order.shippingWithTax, order.currencyCode)}</span>
                            </div>
                            {order.customFields?.commissionAmount > 0 && (
                                <div style={{ fontSize: '12px', display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: '#dc2626' }}>
                                    <span>Commissions</span>
                                    <span style={{ fontWeight: 700 }}>{formatPrice(order.customFields.commissionAmount, order.currencyCode)}</span>
                                </div>
                            )}
                            <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: '10px', marginTop: '10px', display: 'flex', justifyContent: 'space-between', fontSize: '15px', fontWeight: 900, color: '#0f172a' }}>
                                <span>Total Payé TTC</span>
                                <span style={{ color: '#2563eb' }}>{formatPrice(order.totalWithTax, order.currencyCode)}</span>
                            </div>
                        </div>

                        {/* Danger zone: Delete order */}
                        <div style={{ textAlign: 'center', marginTop: 'auto' }}>
                            <button
                                type="button"
                                onClick={() => {
                                    if (confirm(`Êtes-vous sûr de vouloir supprimer définitivement la commande #${order.code} et ses sous-commandes ?`)) {
                                        deleteOrderMutation.mutate({ orderId: order.id });
                                    }
                                }}
                                style={{
                                    width: '100%',
                                    padding: '8px 14px',
                                    background: '#fff1f2',
                                    color: '#b91c1c',
                                    border: '1px solid #fecaca',
                                    borderRadius: '10px',
                                    fontWeight: 800,
                                    fontSize: '11px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px'
                                }}
                            >
                                <Trash2 size={13} /> Supprimer cette commande
                            </button>
                        </div>

                    </div>
                </div>

                {/* ── REASSIGN VENDOR MODAL ── */}
                {reassignVendorModal && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
                        <div style={{ background: 'white', padding: '24px', borderRadius: '18px', width: '100%', maxWidth: '480px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: 900, marginBottom: '8px', textAlign: 'left', color: '#0f172a' }}>
                                🔄 Transférer la sous-commande
                            </h3>
                            <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '16px', textAlign: 'left' }}>
                                Recherchez et sélectionnez le nouveau vendeur qui prendra en charge tous les articles de cette sous-commande.
                            </p>

                            {/* Search input */}
                            <div style={{ position: 'relative', marginBottom: '12px' }}>
                                <input 
                                    type="text" 
                                    placeholder="🔍 Rechercher un vendeur (nom, email)..." 
                                    value={vendorSearchTerm}
                                    onChange={e => setVendorSearchTerm(e.target.value)}
                                    style={{ 
                                        width: '100%', 
                                        padding: '10px 14px 10px 34px', 
                                        borderRadius: '10px', 
                                        border: '1px solid #cbd5e1', 
                                        fontSize: '13px', 
                                        fontWeight: 600,
                                        boxSizing: 'border-box'
                                    }}
                                />
                                <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                {vendorSearchTerm && (
                                    <button 
                                        type="button" 
                                        onClick={() => setVendorSearchTerm('')}
                                        style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                            </div>

                            {/* Vendor list */}
                            <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '6px', background: '#f8fafc', marginBottom: '20px' }}>
                                {filteredVendors.length === 0 ? (
                                    <div style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>
                                        Aucun vendeur trouvé pour "{vendorSearchTerm}"
                                    </div>
                                ) : (
                                    filteredVendors.map((v: any) => {
                                        const isSelected = String(targetVendorId) === String(v.id);
                                        return (
                                            <div 
                                                key={v.id}
                                                onClick={() => setTargetVendorId(v.id)}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    padding: '8px 12px',
                                                    borderRadius: '8px',
                                                    cursor: 'pointer',
                                                    background: isSelected ? '#eff6ff' : '#ffffff',
                                                    border: isSelected ? '1px solid #3b82f6' : '1px solid #e2e8f0',
                                                    transition: 'all 0.15s'
                                                }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: isSelected ? '#2563eb' : '#e2e8f0', color: isSelected ? 'white' : '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800 }}>
                                                        {v.name ? v.name.slice(0, 2).toUpperCase() : 'VD'}
                                                    </div>
                                                    <div>
                                                        <div style={{ fontSize: '13px', fontWeight: 800, color: isSelected ? '#1d4ed8' : '#0f172a' }}>{v.name}</div>
                                                        <div style={{ fontSize: '11px', color: '#64748b' }}>{v.email}</div>
                                                    </div>
                                                </div>
                                                {isSelected && (
                                                    <span style={{ background: '#2563eb', color: 'white', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>
                                                        ✓
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                                <button 
                                    onClick={() => {
                                        setReassignVendorModal(false);
                                        setVendorSearchTerm('');
                                        setTargetVendorId('');
                                    }} 
                                    style={{ padding: '8px 16px', border: '1px solid #cbd5e1', borderRadius: '8px', background: 'white', cursor: 'pointer', fontWeight: 700, fontSize: '12px' }}
                                >
                                    Annuler
                                </button>
                                <button 
                                    disabled={!targetVendorId || reassignVendorMutation.isPending}
                                    onClick={() => {
                                        const currentVendor = vendorSubOrders[selectedSubOrderIndex as number]?.vendor;
                                        reassignVendorMutation.mutate({ oldVendorId: currentVendor?.id, newVendorId: targetVendorId });
                                    }}
                                    style={{ padding: '8px 16px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 800, fontSize: '12px', cursor: !targetVendorId ? 'not-allowed' : 'pointer' }}
                                >
                                    {reassignVendorMutation.isPending ? 'Transfert...' : 'Valider le Transfert'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── REASSIGN PRODUCT MODAL ── */}
                {reassignProductModal && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
                        <div style={{ background: 'white', padding: '24px', borderRadius: '18px', width: '100%', maxWidth: '540px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: 900, marginBottom: '4px', textAlign: 'left', color: '#0f172a' }}>
                                📦 Réassigner cet article
                            </h3>
                            <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '16px', textAlign: 'left' }}>
                                Recherchez et choisissez le vendeur destinataire. Vous pouvez lier un de ses produits existants ou générer automatiquement une copie.
                            </p>

                            {/* Destination Vendor with Search */}
                            <div style={{ background: '#f8fafc', borderRadius: '14px', padding: '14px', marginBottom: '12px', border: '1px solid #e2e8f0', textAlign: 'left' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <label style={{ fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        ① Nouveau Vendeur Destinataire ({filteredVendors.length})
                                    </label>
                                    {targetVendorId && (
                                        <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '3px' }}>
                                            <Check size={12} /> Sélectionné
                                        </span>
                                    )}
                                </div>

                                {/* Search input */}
                                <div style={{ position: 'relative', marginBottom: '8px' }}>
                                    <input 
                                        type="text" 
                                        placeholder="🔍 Rechercher un vendeur (nom, email)..." 
                                        value={vendorSearchTerm}
                                        onChange={e => setVendorSearchTerm(e.target.value)}
                                        style={{ 
                                            width: '100%', 
                                            padding: '8px 12px 8px 30px', 
                                            borderRadius: '8px', 
                                            border: '1px solid #cbd5e1', 
                                            fontSize: '12px', 
                                            fontWeight: 600,
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                    <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                    {vendorSearchTerm && (
                                        <button 
                                            type="button" 
                                            onClick={() => setVendorSearchTerm('')}
                                            style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
                                        >
                                            <X size={14} />
                                        </button>
                                    )}
                                </div>

                                {/* Scrollable list of selectable vendors */}
                                <div style={{ maxHeight: '150px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '5px', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '6px', background: 'white' }}>
                                    {filteredVendors.length === 0 ? (
                                        <div style={{ padding: '10px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>
                                            Aucun vendeur trouvé pour "{vendorSearchTerm}"
                                        </div>
                                    ) : (
                                        filteredVendors.map((v: any) => {
                                            const isSelected = String(targetVendorId) === String(v.id);
                                            return (
                                                <div 
                                                    key={v.id}
                                                    onClick={() => {
                                                        setTargetVendorId(v.id);
                                                        setTargetProductId('');
                                                    }}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        padding: '6px 10px',
                                                        borderRadius: '6px',
                                                        cursor: 'pointer',
                                                        background: isSelected ? '#eff6ff' : '#ffffff',
                                                        border: isSelected ? '1px solid #3b82f6' : '1px solid #f1f5f9',
                                                        transition: 'all 0.15s'
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <div style={{ width: '26px', height: '26px', borderRadius: '6px', background: isSelected ? '#2563eb' : '#e2e8f0', color: isSelected ? 'white' : '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 800 }}>
                                                            {v.name ? v.name.slice(0, 2).toUpperCase() : 'VD'}
                                                        </div>
                                                        <div>
                                                            <div style={{ fontSize: '12px', fontWeight: 800, color: isSelected ? '#1d4ed8' : '#0f172a' }}>{v.name}</div>
                                                            <div style={{ fontSize: '10px', color: '#64748b' }}>{v.email}</div>
                                                        </div>
                                                    </div>
                                                    {isSelected && (
                                                        <span style={{ background: '#2563eb', color: 'white', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px' }}>
                                                            ✓
                                                        </span>
                                                    )}
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>

                            {/* Destination Product */}
                            {targetVendorId && (
                                <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '14px', marginBottom: '12px', border: '1px solid #e2e8f0', textAlign: 'left' }}>
                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, marginBottom: '6px', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        ② Produit Associé
                                    </label>
                                    {vendorFilteredProducts.length === 0 ? (
                                        <div style={{ padding: '10px', background: '#fff7ed', borderRadius: '8px', border: '1px solid #fed7aa', fontSize: '12px', color: '#92400e', fontWeight: 600 }}>
                                            ⚠️ Ce vendeur n'a pas encore de produit équivalent. Une copie du produit actuel sera créée automatiquement pour son catalogue.
                                        </div>
                                    ) : (
                                        <select 
                                            style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 700, fontSize: '13px', background: 'white' }}
                                            value={targetProductId} 
                                            onChange={e => {
                                                const pId = e.target.value;
                                                setTargetProductId(pId);
                                                const prod = vendorFilteredProducts.find((p: any) => p.id === pId);
                                                if (prod?.variants?.[0]?.price != null) {
                                                    setTargetPrice(String(prod.variants[0].price));
                                                }
                                            }}
                                        >
                                            <option value="">-- Créer une copie du produit actuel --</option>
                                            {vendorFilteredProducts.map((p: any) => (
                                                <option key={p.id} value={p.id}>
                                                    {p.name} {p.variants?.[0]?.sku ? `(SKU: ${p.variants[0].sku})` : ''}
                                                </option>
                                            ))}
                                        </select>
                                    )}

                                    {!targetProductId && (
                                        <div style={{ marginTop: '10px' }}>
                                            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '4px', color: '#64748b' }}>Nom pour la copie du produit (optionnel)</label>
                                            <input 
                                                type="text" 
                                                style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 600, fontSize: '13px', boxSizing: 'border-box' }}
                                                value={targetProductName} 
                                                onChange={e => setTargetProductName(e.target.value)} 
                                                placeholder="Ex: T-Shirt (copie vendeur)" 
                                            />
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Unit Price */}
                            <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '14px', marginBottom: '16px', border: '1px solid #e2e8f0', textAlign: 'left' }}>
                                <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, marginBottom: '6px', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    ③ Prix Unitaire (centimes ou FCFA)
                                </label>
                                <input 
                                    type="number" 
                                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 700, fontSize: '13px', boxSizing: 'border-box' }}
                                    value={targetPrice} 
                                    onChange={e => setTargetPrice(e.target.value)} 
                                    placeholder="ex: 150000 (= 1 500 FCFA)" 
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                                <button
                                    onClick={() => {
                                        setReassignProductModal(false);
                                        setVendorSearchTerm('');
                                        setTargetVendorId('');
                                        setTargetProductId('');
                                        setTargetPrice('');
                                        setTargetProductName('');
                                        setTargetLineId('');
                                    }}
                                    style={{ padding: '8px 16px', border: '1px solid #cbd5e1', borderRadius: '8px', background: 'white', cursor: 'pointer', fontWeight: 700, fontSize: '12px' }}
                                >
                                    Annuler
                                </button>
                                <button 
                                    disabled={!targetLineId || !targetPrice || !targetVendorId || reassignProductMutation.isPending}
                                    onClick={() => reassignProductMutation.mutate({ lineId: targetLineId, newProductId: targetProductId, newProductName: targetProductName, newPrice: targetPrice, newVendorId: targetVendorId })}
                                    style={{ padding: '8px 18px', background: !targetLineId || !targetPrice || !targetVendorId ? '#94a3b8' : '#7c3aed', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 800, fontSize: '12px', cursor: !targetLineId || !targetPrice || !targetVendorId ? 'not-allowed' : 'pointer' }}
                                >
                                    {reassignProductMutation.isPending ? '⏳ Réassignation...' : '✅ Valider la Réassignation'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}



            </div>
        </div>
    );
}

export const OrdersList = OrdersListComponent;
export default OrdersListComponent;
