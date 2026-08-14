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
    mutation ReassignOrderLineToProduct($orderId: ID!, $lineId: ID!, $newProductId: ID!, $newPrice: Float!, $newVendorId: ID!) {
        reassignOrderLineToProduct(orderId: $orderId, lineId: $lineId, newProductId: $newProductId, newPrice: $newPrice, newVendorId: $newVendorId)
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
        const lineVendor = line.productVariant?.product?.customFields?.vendor || order.customFields?.vendor || { id: 'default', name: 'Boutique Principale' };
        const vId = lineVendor.id || 'default';
        if (!linesByVendorMap[vId]) {
            linesByVendorMap[vId] = { vendor: lineVendor, lines: [], total: 0 };
        }
        linesByVendorMap[vId].lines.push(line);
        linesByVendorMap[vId].total += (line.proratedLinePriceWithTax || line.linePriceWithTax || 0);
    });
    const vendorSubOrders = Object.keys(linesByVendorMap).map(k => linesByVendorMap[k]);

    const [selectedSubOrderIndex, setSelectedSubOrderIndex] = useState<number | 'all'>('all');

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
        mutationFn: ({ lineId, newProductId, newPrice, newVendorId }: any) => 
            fetchGraphQL(REASSIGN_ORDER_LINE_TO_PRODUCT, { orderId: order.id, lineId, newProductId, newPrice: Number(newPrice), newVendorId }),
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
        <div className="po-modal-overlay" onClick={onClose}>
            <div className="po-modal" onClick={e => e.stopPropagation()}>
                
                <div className="po-modal-header">
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px', flexWrap: 'wrap' }}>
                            <h2 style={{ fontSize: '24px', fontWeight: 900, margin: 0, color: '#0f172a', fontFamily: 'monospace' }}>#{order.code}</h2>
                            <span className="po-status-badge" style={{ background: `${stObj.color}15`, color: stObj.color, fontSize: '13px' }}>
                                <StateIcon size={15} /> {stObj.label}
                            </span>
                            {vendorSubOrders.length > 1 && (
                                <span className="po-status-badge" style={{ background: '#eff6ff', color: '#2563eb', fontSize: '12px', fontWeight: 800, border: '1px solid #bfdbfe' }}>
                                    {vendorSubOrders.length} Sub-commandes Vendeurs
                                </span>
                            )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#64748b', fontSize: '13px', fontWeight: 600, flexWrap: 'wrap' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={15} /> Créée le {formatDate(order.createdAt)}</span>
                            <span>•</span>
                            <span>{order.lines.length} Article(s) au total</span>
                        </div>

                        {/* Sub-Orders Navigation Tabs */}
                        {vendorSubOrders.length > 1 && (
                            <div style={{ display: 'flex', gap: '8px', marginTop: '14px', overflowX: 'auto', paddingBottom: '4px' }}>
                                <button
                                    type="button"
                                    onClick={() => setSelectedSubOrderIndex('all')}
                                    style={{
                                        padding: '6px 14px',
                                        borderRadius: '20px',
                                        fontSize: '12px',
                                        fontWeight: 800,
                                        border: selectedSubOrderIndex === 'all' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                                        background: selectedSubOrderIndex === 'all' ? '#eff6ff' : 'white',
                                        color: selectedSubOrderIndex === 'all' ? '#1d4ed8' : '#475569',
                                        cursor: 'pointer',
                                        whiteSpace: 'nowrap'
                                    }}
                                >
                                    Vue Globale (Toutes)
                                </button>
                                {vendorSubOrders.map((so, idx) => {
                                    const vId = so?.vendor?.id || 'default';
                                    const soVendorStatus = vendorStatusesMap[vId]?.sellerStatus || 'pending';
                                    const soStatusColor = soVendorStatus === 'confirmed' ? '#10b981' : soVendorStatus === 'reassigning' ? '#8b5cf6' : soVendorStatus === 'reassigned_to_other' ? '#6b7280' : soVendorStatus === 'refused' ? '#ef4444' : '#f59e0b';
                                    const soStatusLabel = soVendorStatus === 'confirmed' ? '✅' : soVendorStatus === 'reassigning' ? '🔄' : soVendorStatus === 'reassigned_to_other' ? '⏭️' : soVendorStatus === 'refused' ? '❌' : '⏳';
                                    return (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => setSelectedSubOrderIndex(idx)}
                                        style={{
                                            padding: '6px 14px',
                                            borderRadius: '20px',
                                            fontSize: '12px',
                                            fontWeight: 800,
                                            border: selectedSubOrderIndex === idx ? '2px solid #2563eb' : `1px solid ${soStatusColor}40`,
                                            background: selectedSubOrderIndex === idx ? '#eff6ff' : `${soStatusColor}10`,
                                            color: selectedSubOrderIndex === idx ? '#1d4ed8' : '#475569',
                                            cursor: 'pointer',
                                            whiteSpace: 'nowrap'
                                        }}
                                    >
                                        {soStatusLabel} {so.vendor.name}
                                    </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                    <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', padding: '8px', cursor: 'pointer', color: '#64748b', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background='#e2e8f0'} onMouseLeave={e => e.currentTarget.style.background='#f1f5f9'}>
                        <X size={20} />
                    </button>
                </div>

                <div className="po-modal-body">

                    {/* Cancellation & Reassignment Alert Banner */}
                    {(sStat === 'refused' || sStat === 'reassigning') && (
                        <div style={{ padding: '16px', background: '#fff1f2', border: '2px dashed #f43f5e', borderRadius: '12px', marginBottom: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#9f1239', fontWeight: 800, fontSize: '15px', marginBottom: '6px' }}>
                                <AlertCircle size={20} color="#e11d48" /> Sous-commande Refusée par le vendeur (En cours d'assignation)
                            </div>
                            <p style={{ fontSize: '13px', color: '#881337', margin: '0 0 12px 0' }}>
                                Le vendeur {activeSubOrderVendor ? activeSubOrderVendor.name : ''} a annulé sa partie de la commande. Veuillez réassigner la commande à un autre vendeur ou remplacer par un autre produit.
                            </p>
                            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                <button
                                    type="button"
                                    onClick={() => setReassignVendorModal(true)}
                                    style={{ padding: '8px 16px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 800, fontSize: '13px', cursor: 'pointer' }}
                                >
                                    🔄 Assigner la commande à un autre vendeur
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setReassignProductModal(true)}
                                    style={{ padding: '8px 16px', background: '#7c3aed', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 800, fontSize: '13px', cursor: 'pointer' }}
                                >
                                    📦 Assigner à un autre produit
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Reassign Vendor Modal */}
                    {reassignVendorModal && (
                        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
                            <div style={{ background: 'white', padding: '24px', borderRadius: '16px', width: '100%', maxWidth: '450px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                                <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '12px' }}>🔄 Assigner la sous-commande à un autre vendeur</h3>
                                <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>
                                    Sélectionnez le nouveau vendeur qui prendra en charge cette sous-commande.
                                </p>
                                <select 
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '16px', fontWeight: 600 }}
                                    value={targetVendorId} 
                                    onChange={e => setTargetVendorId(e.target.value)}
                                >
                                    <option value="">-- Choisir un vendeur --</option>
                                    {(vendorsData?.vendors?.items || []).map((v: any) => (
                                        <option key={v.id} value={v.id}>{v.name} ({v.email})</option>
                                    ))}
                                </select>
                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                    <button onClick={() => setReassignVendorModal(false)} style={{ padding: '8px 16px', border: '1px solid #cbd5e1', borderRadius: '8px', background: 'white', cursor: 'pointer' }}>Annuler</button>
                                    <button 
                                        disabled={!targetVendorId || reassignVendorMutation.isPending}
                                        onClick={() => reassignVendorMutation.mutate({ oldVendorId: activeSubOrderVendor?.id, newVendorId: targetVendorId })}
                                        style={{ padding: '8px 16px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
                                    >
                                        {reassignVendorMutation.isPending ? 'Assignation...' : 'Valider L\'Assignation'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Reassign Product Modal */}
                    {reassignProductModal && (
                        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
                            <div style={{ background: 'white', padding: '24px', borderRadius: '16px', width: '100%', maxWidth: '540px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', maxHeight: '90vh', overflowY: 'auto' }}>
                                <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '4px' }}>📦 Assigner la ligne à un autre produit</h3>
                                <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '16px' }}>Sélectionnez d'abord le vendeur destinataire, puis choisissez un de ses produits existants ou créez une copie.</p>

                                {/* STEP 1: Select order line */}
                                <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '12px', marginBottom: '12px', border: '1px solid #e2e8f0' }}>
                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, marginBottom: '6px', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>① Ligne de commande à remplacer</label>
                                    <select 
                                        style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 600, fontSize: '13px' }}
                                        value={targetLineId} 
                                        onChange={e => setTargetLineId(e.target.value)}
                                    >
                                        <option value="">-- Choisir la ligne --</option>
                                        {displayedLines.map((l: any) => (
                                            <option key={l.id} value={l.id}>{l.productVariant?.name} (x{l.quantity})</option>
                                        ))}
                                    </select>
                                </div>

                                {/* STEP 2: Select target vendor */}
                                <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '12px', marginBottom: '12px', border: '1px solid #e2e8f0' }}>
                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, marginBottom: '6px', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>② Vendeur Destinataire</label>
                                    <select 
                                        style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 600, fontSize: '13px' }}
                                        value={targetVendorId} 
                                        onChange={e => {
                                            setTargetVendorId(e.target.value);
                                            // Reset product selection when vendor changes
                                            setTargetProductId('');
                                            setTargetPrice('');
                                            setTargetProductName('');
                                        }}
                                    >
                                        <option value="">-- Choisir le vendeur --</option>
                                        {(vendorsData?.vendors?.items || []).map((v: any) => (
                                            <option key={v.id} value={v.id}>{v.name} ({v.email})</option>
                                        ))}
                                    </select>
                                </div>

                                {/* STEP 3: Select from vendor's existing products OR create a copy */}
                                {targetVendorId && (
                                    <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '12px', marginBottom: '12px', border: '1px solid #e2e8f0' }}>
                                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, marginBottom: '6px', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>③ Produit du Vendeur</label>
                                        {vendorFilteredProducts.length === 0 ? (
                                            <div style={{ padding: '10px', background: '#fff7ed', borderRadius: '8px', border: '1px solid #fed7aa', fontSize: '12px', color: '#92400e', fontWeight: 600 }}>
                                                ⚠️ Ce vendeur n'a aucun produit existant. Une copie du produit actuel sera créée automatiquement.
                                            </div>
                                        ) : (
                                            <select 
                                                style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 600, fontSize: '13px' }}
                                                value={targetProductId} 
                                                onChange={e => {
                                                    const pId = e.target.value;
                                                    setTargetProductId(pId);
                                                    const prod = vendorFilteredProducts.find((p: any) => p.id === pId);
                                                    if (prod?.variants?.[0]?.price != null) {
                                                        setTargetPrice(String(prod.variants[0].price));
                                                    } else {
                                                        setTargetPrice('');
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

                                        {/* If creating a copy, allow custom name */}
                                        {!targetProductId && (
                                            <div style={{ marginTop: '10px' }}>
                                                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, marginBottom: '4px', color: '#64748b' }}>Nom pour la copie (optionnel)</label>
                                                <input 
                                                    type="text" 
                                                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 600, fontSize: '13px', boxSizing: 'border-box' }}
                                                    value={targetProductName} 
                                                    onChange={e => setTargetProductName(e.target.value)} 
                                                    placeholder="Ex: T-Shirt (copie)" 
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Price */}
                                <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '12px', marginBottom: '16px', border: '1px solid #e2e8f0' }}>
                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, marginBottom: '6px', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>④ Prix Unitaire (centimes)</label>
                                    <input 
                                        type="number" 
                                        style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 600, fontSize: '13px', boxSizing: 'border-box' }}
                                        value={targetPrice} 
                                        onChange={e => setTargetPrice(e.target.value)} 
                                        placeholder="ex: 150000 (= 1 500 FCFA)" 
                                    />
                                </div>

                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                    <button
                                        onClick={() => {
                                            setReassignProductModal(false);
                                            setTargetVendorId('');
                                            setTargetProductId('');
                                            setTargetPrice('');
                                            setTargetProductName('');
                                            setTargetLineId('');
                                        }}
                                        style={{ padding: '8px 16px', border: '1px solid #cbd5e1', borderRadius: '8px', background: 'white', cursor: 'pointer', fontWeight: 600 }}
                                    >Annuler</button>
                                    <button 
                                        disabled={!targetLineId || !targetPrice || !targetVendorId || reassignProductMutation.isPending}
                                        onClick={() => reassignProductMutation.mutate({ lineId: targetLineId, newProductId: targetProductId, newProductName: targetProductName, newPrice: targetPrice, newVendorId: targetVendorId })}
                                        style={{ padding: '8px 16px', background: !targetLineId || !targetPrice || !targetVendorId ? '#94a3b8' : '#7c3aed', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: !targetLineId || !targetPrice || !targetVendorId ? 'not-allowed' : 'pointer' }}
                                    >
                                        {reassignProductMutation.isPending ? '⏳ En cours...' : '✅ Confirmer la réassignation'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {/* Status Management Bar */}
                    <div className="po-card" style={{ background: 'linear-gradient(145deg, #ffffff, #f8fafc)', border: '1px solid #e2e8f0', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                        <h3 className="po-card-title" style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                            <Activity size={18} color="#2563eb" /> 
                            Gestion des Statuts {activeSubOrderVendor ? `(Sous-commande: ${activeSubOrderVendor.name})` : '(Vue Globale)'}
                            {isMutating && <span style={{ color: '#f97316', fontSize: '13px', fontWeight: 600, marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}><Activity size={14} style={{ animation: 'spin 1s linear infinite' }} /> Mise à jour...</span>}
                        </h3>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginTop: '12px' }}>
                            {/* 1. NATIVE STATE (Vendure Workflow) */}
                            <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                <label className="po-filter-label" style={{ fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px', display: 'block' }}>① État Global (Vendure)</label>
                                <div className="po-select-wrapper">
                                    <select 
                                        className="po-select" 
                                        value={order.state}
                                        onChange={e => onTransition(e.target.value)}
                                        disabled={isMutating}
                                        style={{ fontWeight: 700, fontSize: '13px' }}
                                    >
                                        <option value={order.state}>Actuel: {stObj.label}</option>
                                        <optgroup label="États disponibles:">
                                            {order.nextStates?.map((ns: string) => (
                                                <option key={ns} value={ns}>→ {stateMeta[ns]?.label || ns}</option>
                                            ))}
                                        </optgroup>
                                    </select>
                                    <ChevronDown size={16} className="po-select-icon" />
                                </div>
                            </div>
                            
                            {/* 2. SELLER STATUS (Shown ONLY when a specific sub-order/vendor is selected, as validation belongs to each seller) */}
                            {activeSubOrderVendor ? (
                                <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                    <label className="po-filter-label" style={{ fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px', display: 'block' }}>② Validation Vendeur ({activeSubOrderVendor.name})</label>
                                    <div className="po-select-wrapper">
                                        <select 
                                            className="po-select" 
                                            value={sStat}
                                            onChange={e => onUpdateSeller(e.target.value, activeSubOrderVendor?.id)}
                                            disabled={isMutating}
                                            style={{ 
                                                fontWeight: 700, 
                                                fontSize: '13px',
                                                border: sStat === 'confirmed' ? '2px solid #10b981' : sStat === 'refused' ? '2px solid #ef4444' : sStat === 'reassigning' ? '2px solid #8b5cf6' : '2px solid #f59e0b',
                                                background: sStat === 'confirmed' ? '#f0fdf4' : sStat === 'refused' ? '#fef2f2' : sStat === 'reassigning' ? '#f5f3ff' : '#fffbeb'
                                            }}
                                        >
                                            <option value="pending">⏳ En attente validation</option>
                                            <option value="confirmed">✅ Acceptée par vendeur</option>
                                            <option value="refused">❌ Refusée par vendeur</option>
                                            <option value="reassigning">🔄 En réassignation</option>
                                            <option value="reassigned_to_other">⏭️ Réassignée à un autre</option>
                                        </select>
                                        <ChevronDown size={16} className="po-select-icon" />
                                    </div>
                                </div>
                            ) : (
                                <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>② Validation Vendeur</span>
                                    <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#475569', fontStyle: 'italic', fontWeight: 600 }}>
                                        💡 Cliquez sur un vendeur ci-dessus pour gérer sa validation d'article.
                                    </p>
                                </div>
                            )}

                            {/* 3. ADMIN STATUS (SuperAdmin Delivery Status — ALWAYS controlled by SuperAdmin) */}
                            <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                <label className="po-filter-label" style={{ fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px', display: 'block' }}>③ Statut Livraison (SuperAdmin)</label>
                                <div className="po-select-wrapper">
                                    <select 
                                        className="po-select" 
                                        value={aStat}
                                        onChange={e => onUpdateAdmin(e.target.value, activeSubOrderVendor?.id)}
                                        disabled={isMutating}
                                        style={{ fontWeight: 700, fontSize: '13px' }}
                                    >
                                        <option value="pending">⏳ En attente d'expédition</option>
                                        <option value="shipped">🚚 Expédiée (Shipped)</option>
                                        <option value="in_transit">✈️ En transit (In Transit)</option>
                                        <option value="delivered">📦 Livrée au client</option>
                                        <option value="cancelled">❌ Annulée</option>
                                    </select>
                                    <ChevronDown size={16} className="po-select-icon" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                        {/* Customer Info */}
                        <div className="po-card">
                            <h3 className="po-card-title"><User size={17} color="#2563eb" /> Client & Contact</h3>
                            {order.customer ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>{order.customer.firstName} {order.customer.lastName}</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#475569', fontSize: '13px' }}>
                                        <Mail size={15} color="#94a3b8" /> {order.customer.emailAddress}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#475569', fontSize: '13px' }}>
                                        <Phone size={15} color="#94a3b8" /> {order.customer.phoneNumber || 'Non renseigné'}
                                    </div>
                                </div>
                            ) : <p style={{ color: '#94a3b8' }}>Aucune information client.</p>}
                        </div>

                        {/* Vendor Info */}
                        <div className="po-card">
                            <h3 className="po-card-title"><Store size={17} color="#8b5cf6" /> Vendeur(s) Assigné(s)</h3>
                            {vendorSubOrders.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {vendorSubOrders.map((so, i) => (
                                        <div key={i} style={{ padding: '10px 12px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                                            <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>Sub-commande #{i + 1}: {so.vendor.name}</div>
                                            {so.vendor.email && <div style={{ fontSize: '12px', color: '#64748b' }}>{so.vendor.email}</div>}
                                            <div style={{ fontSize: '12px', color: '#2563eb', fontWeight: 700, marginTop: '4px' }}>
                                                Sous-total vendeur: {formatPrice(so.total, order.currencyCode)} ({so.lines.length} article(s))
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : <p style={{ color: '#94a3b8', fontStyle: 'italic' }}>Aucun vendeur assigné à cette commande.</p>}
                        </div>
                    </div>

                    {/* Addresses */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                        <div className="po-card">
                            <h3 className="po-card-title"><MapPin size={17} color="#10b981" /> Adresse de Livraison</h3>
                            {order.shippingAddress ? (
                                <div style={{ color: '#334155', fontSize: '13px', lineHeight: '1.6' }}>
                                    <div style={{ fontWeight: 800 }}>{order.shippingAddress.fullName}</div>
                                    <div>{order.shippingAddress.streetLine1}</div>
                                    {order.shippingAddress.streetLine2 && <div>{order.shippingAddress.streetLine2}</div>}
                                    <div>{order.shippingAddress.postalCode} {order.shippingAddress.city}</div>
                                    <div>{order.shippingAddress.province} {order.shippingAddress.country}</div>
                                    {order.shippingAddress.phoneNumber && <div style={{ marginTop: '6px', color: '#475569' }}><Phone size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }}/> {order.shippingAddress.phoneNumber}</div>}
                                </div>
                            ) : <p style={{ color: '#94a3b8' }}>—</p>}
                        </div>

                        <div className="po-card">
                            <h3 className="po-card-title"><Receipt size={17} color="#f59e0b" /> Adresse de Facturation</h3>
                            {order.billingAddress?.streetLine1 ? (
                                <div style={{ color: '#334155', fontSize: '13px', lineHeight: '1.6' }}>
                                    <div style={{ fontWeight: 800 }}>{order.billingAddress.fullName}</div>
                                    <div>{order.billingAddress.streetLine1}</div>
                                    {order.billingAddress.streetLine2 && <div>{order.billingAddress.streetLine2}</div>}
                                    <div>{order.billingAddress.postalCode} {order.billingAddress.city}</div>
                                    <div>{order.billingAddress.province} {order.billingAddress.country}</div>
                                </div>
                            ) : <p style={{ color: '#94a3b8', fontStyle: 'italic' }}>Identique à la livraison</p>}
                        </div>
                    </div>

                    {/* Order Lines & Summary */}
                    <div className="po-card">
                        <h3 className="po-card-title">
                            <Package size={17} color="#ef4444" /> 
                            Articles {selectedSubOrderIndex !== 'all' ? `de Sub-commande #${(selectedSubOrderIndex as number) + 1} (${activeSubOrderVendor?.name})` : `au total (${order.lines.length})`}
                        </h3>
                        
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            {displayedLines.map((line: any) => (
                                <div key={line.id} className="po-line-item">
                                    <img 
                                        className="po-img" 
                                        src={line.productVariant?.featuredAsset?.preview || '/placeholder.png'} 
                                        alt={line.productVariant?.name} 
                                    />
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>{line.productVariant?.name || 'Produit inconnu'}</div>
                                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '3px' }}>SKU: {line.productVariant?.sku || '—'}</div>
                                        {line.customFields?.sellerStatus && line.customFields.sellerStatus !== 'pending' && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                                                <div style={{ 
                                                    fontSize: '11px', 
                                                    fontWeight: 600, 
                                                    padding: '2px 6px', 
                                                    borderRadius: '4px', 
                                                    backgroundColor: line.customFields.sellerStatus === 'confirmed' ? '#dcfce7' : '#fee2e2',
                                                    color: line.customFields.sellerStatus === 'confirmed' ? '#166534' : '#991b1b'
                                                }}>
                                                    {line.customFields.sellerStatus === 'confirmed' ? '✓ Confirmé par vendeur' : '✗ Refusé par vendeur'}
                                                </div>
                                                {(line.customFields.sellerStatus === 'refused' || line.customFields.sellerStatus === 'reassigning') && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setTargetLineId(line.id);
                                                            setReassignProductModal(true);
                                                        }}
                                                        style={{
                                                            fontSize: '11px',
                                                            fontWeight: 700,
                                                            padding: '2px 8px',
                                                            borderRadius: '4px',
                                                            backgroundColor: '#7c3aed',
                                                            color: 'white',
                                                            border: 'none',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        🔄 Réassigner ce produit
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ textAlign: 'center', padding: '0 16px' }}>
                                        <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Qté</div>
                                        <div style={{ fontSize: '15px', fontWeight: 800, color: '#334155' }}>{line.quantity}</div>
                                    </div>
                                    <div style={{ textAlign: 'right', minWidth: '110px' }}>
                                        <div style={{ fontSize: '13px', color: '#475569' }}>{formatPrice(line.unitPriceWithTax, order.currencyCode)} l&apos;unité</div>
                                        <div style={{ fontSize: '15px', fontWeight: 900, color: '#0f172a', marginTop: '3px' }}>{formatPrice(line.linePriceWithTax, order.currencyCode)}</div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Financial Summary */}
                        <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '20px', marginTop: '20px', border: '1px solid #e2e8f0', width: '100%', maxWidth: '340px', marginLeft: 'auto' }}>
                            <div className="po-summary-row">
                                <span>Sous-total</span>
                                <span style={{ fontWeight: 700, color: '#0f172a' }}>{formatPrice(order.subTotalWithTax, order.currencyCode)}</span>
                            </div>
                            <div className="po-summary-row">
                                <span>Frais de livraison</span>
                                <span style={{ fontWeight: 700, color: '#0f172a' }}>{formatPrice(order.shippingWithTax, order.currencyCode)}</span>
                            </div>
                            {order.surcharges?.map((s: any, i: number) => (
                                <div key={i} className="po-summary-row">
                                    <span>{s.description}</span>
                                    <span style={{ fontWeight: 700, color: '#0f172a' }}>{formatPrice(s.priceWithTax, order.currencyCode)}</span>
                                </div>
                            ))}
                            {order.customFields?.commissionAmount > 0 && (
                                <div className="po-summary-row" style={{ color: '#dc2626' }}>
                                    <span>Commission Marketplace</span>
                                    <span style={{ fontWeight: 700 }}>{formatPrice(order.customFields.commissionAmount, order.currencyCode)}</span>
                                </div>
                            )}
                            <div className="po-summary-total">
                                <span>Total Payé</span>
                                <span>{formatPrice(order.totalWithTax, order.currencyCode)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export const OrdersList = OrdersListComponent;
export default OrdersListComponent;
