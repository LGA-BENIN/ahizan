import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
    Search, Filter, Eye, ChevronDown, Check, X, RefreshCw, AlertCircle, 
    Calendar, User, MapPin, Package, Phone, Mail, Clock, ShieldCheck, 
    Truck, Award, ShoppingBag, Store, ChevronRight, Activity, Download, Receipt, Trash2
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
                customFields {
                    vendor { id name }
                }
                variants {
                    id
                    price
                    sku
                }
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
    if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    const json = await res.json();
    if (json.errors) throw new Error(json.errors[0].message);
    return json.data;
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

    const take = 15;
    const skip = (page - 1) * take;

    const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
        queryKey: ['adminOrders', page],
        queryFn: () => fetchGraphQL(GET_MARKETPLACE_ORDERS, {
            options: {
                take,
                skip,
                sort: { createdAt: 'DESC' },
                filter: {
                    state: { notIn: ['AddingItems', 'ArrangingPayment'] }
                }
            }
        }),
    });

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
        mutationFn: ({ orderId }: any) => fetchGraphQL(DELETE_VENDOR_ORDER, { orderId }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['adminOrders'] });
            setSelectedOrder(null);
            alert('Commande supprimée avec succès !');
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
                <div className="po-badge">
                    {isFetching ? <Activity size={16} className="lucide-spin" style={{ display: 'inline', marginRight: '6px' }} /> : null}
                    {totalItems} Commandes Total
                </div>
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
                            <option value="confirmed">✅ Acceptée</option>
                            <option value="refused">❌ Refusée</option>
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
                                                    background: seller === 'confirmed' ? '#dcfce7' : seller === 'refused' ? '#fee2e2' : seller === 'reassigning' ? '#ede9fe' : seller === 'reassigned_to_other' ? '#f3f4f6' : '#fef3c7',
                                                    color: seller === 'confirmed' ? '#166534' : seller === 'refused' ? '#991b1b' : seller === 'reassigning' ? '#5b21b6' : seller === 'reassigned_to_other' ? '#4b5563' : '#92400e',
                                                }}>
                                                    {seller === 'confirmed' ? '✅ Acceptée' : seller === 'refused' ? '❌ Refusée' : seller === 'reassigning' ? '🔄 En réassignation' : seller === 'reassigned_to_other' ? '⏭️ Réassignée' : '⏳ En attente'}
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
                                                    <button 
                                                        className="po-btn-view"
                                                        onClick={() => setSelectedOrder(order)}
                                                    >
                                                        <Eye size={14} /> Gérer
                                                    </button>
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
                                const vId = so?.vendor?.id || 'default';
                                const soVendorStatus = vendorStatusesMap[vId]?.sellerStatus || 'pending';
                                
                                const statusMetaMap: Record<string, { label: string; color: string; bg: string; border: string }> = {
                                    confirmed: { label: 'Acceptée par le vendeur', color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0' },
                                    refused: { label: 'Refusée par le vendeur', color: '#b91c1c', bg: '#fef2f2', border: '#fecaca' },
                                    reassigning: { label: 'En réassignation', color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
                                    reassigned_to_other: { label: 'Réassignée', color: '#475569', bg: '#f1f5f9', border: '#cbd5e1' },
                                    pending: { label: 'En attente validation', color: '#b45309', bg: '#fffbeb', border: '#fde68a' }
                                };
                                const meta = statusMetaMap[soVendorStatus] || statusMetaMap.pending;
                                const isAllConfirmed = so.lines.every((l: any) => l.customFields?.sellerStatus === 'confirmed');

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

                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <span style={{ fontSize: '11px', fontWeight: 800, padding: '4px 10px', borderRadius: '8px', color: meta.color, backgroundColor: meta.bg, border: `1px solid ${meta.border}` }}>
                                                    {meta.label}
                                                </span>
                                                <span style={{ fontSize: '14px', fontWeight: 900, color: '#0f172a', marginLeft: '4px' }}>
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
                                                            padding: '5px 10px',
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
                                                        🔄 Transférer à un autre vendeur
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Items List for this vendor */}
                                        <div style={{ padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            {so.lines.map((line: any) => {
                                                const lineStatus = line.customFields?.sellerStatus || 'pending';
                                                const isConfirmed = lineStatus === 'confirmed';
                                                const isRefused = lineStatus === 'refused';
                                                const isReassigned = lineStatus === 'reassigned_to_other';
                                                const isReassigning = lineStatus === 'reassigning';

                                                return (
                                                    <div 
                                                        key={line.id} 
                                                        style={{ 
                                                            display: 'flex', 
                                                            alignItems: 'center', 
                                                            gap: '14px', 
                                                            padding: '10px 14px', 
                                                            borderRadius: '12px', 
                                                            background: isReassigned ? '#f8fafc' : '#ffffff', 
                                                            border: isRefused ? '1px solid #fecaca' : isConfirmed ? '1px solid #bbf7d0' : '1px solid #f1f5f9',
                                                            opacity: isReassigned ? 0.6 : 1
                                                        }}
                                                    >
                                                        <img 
                                                            src={line.productVariant?.featuredAsset?.preview || '/placeholder.png'} 
                                                            alt={line.productVariant?.name} 
                                                            style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#f8fafc' }}
                                                        />
                                                        
                                                        <div style={{ flex: 1, textAlign: 'left' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                                <span style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>{line.productVariant?.name}</span>
                                                                
                                                                {/* Status Badge */}
                                                                {isConfirmed && (
                                                                    <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '6px', background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0' }}>
                                                                        ✅ Accepté
                                                                    </span>
                                                                )}
                                                                {isRefused && (
                                                                    <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '6px', background: '#fee2e2', color: '#b91c1c', border: '1px solid #fecaca' }}>
                                                                        ❌ Refusé
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
                                                                {!isConfirmed && !isRefused && !isReassigning && !isReassigned && (
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
                                                            {isConfirmed ? (
                                                                <span 
                                                                    title="Cet article a été accepté par le vendeur et ne peut plus être réassigné." 
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
                                                                    🔒 Accepté
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
                                                                        backgroundColor: isRefused ? '#dc2626' : '#7c3aed',
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
                            <h4 style={{ fontSize: '12px', fontWeight: 900, margin: '0 0 14px 0', textTransform: 'uppercase', color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: '6px', letterSpacing: '0.05em' }}>
                                <Activity size={16} color="#2563eb" /> Statuts Visibles par le Client
                            </h4>
                            
                            {/* Validation Vendeur override */}
                            <div style={{ marginBottom: '14px', textAlign: 'left' }}>
                                <label style={{ fontSize: '11px', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '6px' }}>
                                    Validation Vendeur (Affiché au client)
                                </label>
                                <div className="po-select-wrapper">
                                    <select 
                                        className="po-select" 
                                        value={order.customFields?.sellerStatus || 'pending'}
                                        onChange={e => onUpdateSeller(e.target.value, undefined)}
                                        disabled={isMutating}
                                        style={{ fontWeight: 800, fontSize: '12px', background: 'white' }}
                                    >
                                        <option value="pending">⏳ En attente validation</option>
                                        <option value="confirmed">✅ Confirmée (Acceptée)</option>
                                        <option value="refused">❌ Refusée</option>
                                        <option value="reassigning">🔄 En cours de réassignation</option>
                                    </select>
                                    <ChevronDown size={15} className="po-select-icon" />
                                </div>
                            </div>

                            {/* Statut d'expédition override */}
                            <div style={{ textAlign: 'left' }}>
                                <label style={{ fontSize: '11px', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '6px' }}>
                                    Statut Expédition (Affiché au client)
                                </label>
                                <div className="po-select-wrapper">
                                    <select 
                                        className="po-select" 
                                        value={order.customFields?.adminStatus || 'pending'}
                                        onChange={e => onUpdateAdmin(e.target.value, undefined)}
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
                                        deleteOrderMutation.mutate(order.id);
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
