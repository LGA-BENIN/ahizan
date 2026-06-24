import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
    Search, Filter, ShoppingBag, Truck, CheckCircle2, XCircle, 
    Clock, User, MapPin, Store, CreditCard, Receipt, Package, 
    ChevronLeft, ChevronRight, X, ChevronDown, Activity, Phone, Mail
} from 'lucide-react';

const GET_ORDERS_WITH_VENDOR = `
    query GetOrdersWithVendor($options: OrderListOptions) {
        orders(options: $options) {
            items {
                id
                code
                state
                nextStates
                totalWithTax
                subTotalWithTax
                shippingWithTax
                currencyCode
                createdAt
                updatedAt
                customer {
                    firstName
                    lastName
                    emailAddress
                    phoneNumber
                }
                shippingAddress {
                    fullName
                    street1
                    street2
                    city
                    province
                    postalCode
                    country
                    phoneNumber
                }
                billingAddress {
                    fullName
                    street1
                    street2
                    city
                    province
                    postalCode
                    country
                }
                shippingLines {
                    shippingMethod {
                        name
                    }
                    priceWithTax
                }
                lines {
                    id
                    productVariant {
                        id
                        name
                        sku
                        featuredAsset {
                            preview
                        }
                    }
                    quantity
                    linePriceWithTax
                    proratedLinePriceWithTax
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
    mutation UpdateOrderSellerStatus($orderId: ID!, $status: String!) {
        updateOrderSellerStatus(orderId: $orderId, status: $status)
    }
`;

const UPDATE_ADMIN_STATUS = `
    mutation UpdateOrderAdminStatus($orderId: ID!, $status: String!) {
        updateOrderAdminStatus(orderId: $orderId, status: $status)
    }
`;

async function fetchGraphQL(query: string, variables?: any) {
    const res = await fetch('/admin-api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ query, variables }),
    });
    const json = await res.json();
    if (json.errors) throw new Error(json.errors[0].message);
    return json.data;
}

function formatPrice(price: number, currency: string = 'XOF') {
    const factor = 100;
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency,
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

// Global State Mapping
const stateMeta: Record<string, { label: string; color: string; icon: any }> = {
    AddingItems: { label: 'Panier', color: '#9CA3AF', icon: ShoppingBag },
    ArrangingPayment: { label: 'Paiement en cours', color: '#F59E0B', icon: CreditCard },
    PaymentAuthorized: { label: 'Paiement autorisé', color: '#3B82F6', icon: CreditCard },
    PaymentSettled: { label: 'Payé', color: '#10B981', icon: CheckCircle2 },
    PartiallyShipped: { label: 'Partiellement expédié', color: '#8B5CF6', icon: Package },
    Shipped: { label: 'Expédié', color: '#6366F1', icon: Truck },
    PartiallyDelivered: { label: 'Partiellement livré', color: '#0EA5E9', icon: Package },
    Delivered: { label: 'Livré', color: '#059669', icon: CheckCircle2 },
    Cancelled: { label: 'Annulé', color: '#EF4444', icon: XCircle },
};

// Seller Status Mapping
const sellerMeta: Record<string, { label: string; color: string }> = {
    pending: { label: '⏳ En attente', color: '#F59E0B' },
    confirmed: { label: '✅ Confirmée', color: '#3B82F6' },
    refused: { label: '❌ Refusée', color: '#EF4444' },
};

// Admin Status Mapping
const adminMeta: Record<string, { label: string; color: string }> = {
    pending: { label: 'En attente', color: '#9CA3AF' },
    shipped: { label: 'Expédiée', color: '#6366F1' },
    in_transit: { label: 'En transit', color: '#0EA5E9' },
    delivered: { label: 'Livrée', color: '#10B981' },
    cancelled: { label: 'Annulée', color: '#EF4444' },
};

export function OrdersListComponent() {
    const queryClient = useQueryClient();
    const [page, setPage] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const [stateFilter, setStateFilter] = useState('');
    const [sellerFilter, setSellerFilter] = useState('');
    const [adminFilter, setAdminFilter] = useState('');
    const [selectedOrder, setSelectedOrder] = useState<any>(null);
    const take = 20;

    const { data, isLoading, isFetching } = useQuery({
        queryKey: ['adminOrders', page],
        queryFn: () => fetchGraphQL(GET_ORDERS_WITH_VENDOR, {
            options: { skip: page * take, take, sort: { createdAt: 'DESC' } },
        }),
    });

    const refreshLocalOrder = (orderId: string, updates: any) => {
        setSelectedOrder((prev: any) => {
            if (prev && prev.id === orderId) {
                // If updating custom fields
                if (updates.customFields) {
                    return { ...prev, customFields: { ...prev.customFields, ...updates.customFields } };
                }
                // Global updates
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
        mutationFn: ({ id, status }: any) => fetchGraphQL(UPDATE_SELLER_STATUS, { orderId: id, status }),
        onSuccess: (_, vars) => refreshLocalOrder(vars.id, { customFields: { sellerStatus: vars.status } }),
    });

    const adminMutation = useMutation({
        mutationFn: ({ id, status }: any) => fetchGraphQL(UPDATE_ADMIN_STATUS, { orderId: id, status }),
        onSuccess: (_, vars) => refreshLocalOrder(vars.id, { customFields: { adminStatus: vars.status } }),
    });

    const rawOrders = data?.orders?.items || [];
    const totalItems = data?.orders?.totalItems || 0;

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
                    background: #f4f5f7;
                    min-height: 100vh;
                }
                .po-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-end;
                    margin-bottom: 24px;
                }
                .po-title { font-size: 32px; font-weight: 800; color: #111827; letter-spacing: -0.5px; margin: 0; }
                .po-subtitle { color: #6b7280; font-size: 15px; margin-top: 6px; }
                .po-badge { background: #e5e7eb; color: #374151; padding: 6px 14px; border-radius: 20px; font-size: 14px; font-weight: 600; }
                
                .po-filters {
                    background: white;
                    border-radius: 16px;
                    padding: 20px;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
                    display: flex;
                    gap: 16px;
                    margin-bottom: 24px;
                    border: 1px solid #e5e7eb;
                }
                .po-filter-group { flex: 1; min-width: 200px; }
                .po-filter-label { display: block; font-size: 13px; font-weight: 600; color: #4b5563; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
                .po-input { 
                    width: 100%; padding: 12px 16px; border-radius: 10px; border: 1px solid #d1d5db; 
                    font-size: 14px; outline: none; transition: all 0.2s; background: #f9fafb;
                }
                .po-input:focus { border-color: #f97316; box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.1); background: white; }
                
                .po-table-container {
                    background: white;
                    border-radius: 16px;
                    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05);
                    border: 1px solid #e5e7eb;
                    overflow: hidden;
                }
                .po-table { width: 100%; border-collapse: collapse; text-align: left; }
                .po-table th { padding: 16px; font-size: 13px; font-weight: 600; color: #6b7280; background: #f9fafb; border-bottom: 1px solid #e5e7eb; text-transform: uppercase; letter-spacing: 0.5px; }
                .po-table td { padding: 16px; border-bottom: 1px solid #f3f4f6; font-size: 14px; vertical-align: middle; }
                .po-tr { transition: all 0.2s; cursor: pointer; }
                .po-tr:hover { background: #f8fafc; transform: translateY(-1px); box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
                
                .po-status-badge { 
                    display: inline-flex; items-center; gap: 6px; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; 
                }
                
                .po-btn-view {
                    background: white; border: 1px solid #d1d5db; color: #374151; padding: 8px 16px; border-radius: 8px; 
                    font-weight: 600; font-size: 13px; cursor: pointer; transition: all 0.2s;
                }
                .po-btn-view:hover { background: #f9fafb; border-color: #9ca3af; }
                
                /* Modal Styles */
                .po-modal-overlay {
                    position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(17, 24, 39, 0.6); backdrop-filter: blur(8px);
                    display: flex; justify-content: flex-end; z-index: 9999; animation: fadeIn 0.3s ease;
                }
                .po-modal {
                    background: #f8fafc; width: 100%; max-width: 1000px; height: 100vh; overflow-y: auto;
                    box-shadow: -10px 0 25px rgba(0,0,0,0.1); animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                    display: flex; flexDirection: column;
                }
                .po-modal-header {
                    background: white; padding: 24px 32px; border-bottom: 1px solid #e5e7eb; position: sticky; top: 0; z-index: 10;
                    display: flex; justify-content: space-between; align-items: flex-start;
                }
                .po-modal-body { padding: 32px; flex: 1; display: flex; flex-direction: column; gap: 24px; }
                
                .po-card { background: white; border-radius: 16px; border: 1px solid #e5e7eb; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
                .po-card-title { font-size: 16px; font-weight: 700; color: #111827; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; border-bottom: 1px solid #f3f4f6; padding-bottom: 12px; }
                
                .po-select-wrapper { position: relative; }
                .po-select { 
                    width: 100%; padding: 12px 16px; border-radius: 10px; border: 1px solid #d1d5db; 
                    font-size: 14px; font-weight: 600; appearance: none; background: white; cursor: pointer; transition: all 0.2s;
                }
                .po-select:hover { border-color: #9ca3af; }
                .po-select:disabled { background: #f3f4f6; cursor: not-allowed; opacity: 0.7; }
                .po-select-icon { position: absolute; right: 16px; top: 50%; transform: translateY(-50%); pointer-events: none; color: #6b7280; }
                
                .po-line-item { display: flex; align-items: center; gap: 16px; padding: 16px 0; border-bottom: 1px solid #f3f4f6; }
                .po-line-item:last-child { border-bottom: none; }
                .po-img { width: 64px; height: 64px; border-radius: 12px; object-fit: cover; border: 1px solid #e5e7eb; background: #f9fafb; }
                
                .po-summary-row { display: flex; justify-content: space-between; padding: 10px 0; font-size: 14px; color: #4b5563; }
                .po-summary-total { display: flex; justify-content: space-between; padding: 16px 0; font-size: 18px; font-weight: 800; color: #111827; border-top: 2px dashed #e5e7eb; margin-top: 8px; }
                
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
            `}</style>

            <div className="po-header">
                <div>
                    <h1 className="po-title">Commandes Marketplace</h1>
                    <p className="po-subtitle">Gérez et suivez les commandes, validez les paiements et expéditions.</p>
                </div>
                <div className="po-badge">
                    {isFetching ? <Activity size={16} className="lucide-spin" style={{ display: 'inline', marginRight: '6px' }} /> : null}
                    {totalItems} Commandes
                </div>
            </div>

            <div className="po-filters">
                <div className="po-filter-group">
                    <label className="po-filter-label">Recherche</label>
                    <div style={{ position: 'relative' }}>
                        <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
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
                            <option value="">Tous</option>
                            <option value="pending">⏳ En attente</option>
                            <option value="confirmed">✅ Confirmé</option>
                            <option value="refused">❌ Refusé</option>
                        </select>
                        <ChevronDown size={16} className="po-select-icon" />
                    </div>
                </div>
                <div className="po-filter-group">
                    <label className="po-filter-label">Statut Livraison</label>
                    <div className="po-select-wrapper">
                        <select className="po-input" value={adminFilter} onChange={e => setAdminFilter(e.target.value)}>
                            <option value="">Tous</option>
                            <option value="pending">En attente</option>
                            <option value="shipped">Expédié</option>
                            <option value="in_transit">En transit</option>
                            <option value="delivered">Livré</option>
                            <option value="cancelled">Annulé</option>
                        </select>
                        <ChevronDown size={16} className="po-select-icon" />
                    </div>
                </div>
            </div>

            <div className="po-table-container">
                {isLoading ? (
                    <div style={{ padding: '60px', textAlign: 'center', color: '#6b7280' }}>
                        <Activity size={32} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 16px', color: '#f97316' }} />
                        <p>Chargement des commandes...</p>
                    </div>
                ) : filteredOrders.length === 0 ? (
                    <div style={{ padding: '60px', textAlign: 'center', color: '#6b7280' }}>
                        <Package size={48} style={{ margin: '0 auto 16px', opacity: 0.2 }} />
                        <p style={{ fontSize: '16px', fontWeight: 500 }}>Aucune commande trouvée.</p>
                    </div>
                ) : (
                    <table className="po-table">
                        <thead>
                            <tr>
                                <th>Code</th>
                                <th>Date</th>
                                <th>Client</th>
                                <th>Vendeur</th>
                                <th>État Global</th>
                                <th>État Vendeur</th>
                                <th>État Livraison</th>
                                <th style={{ textAlign: 'right' }}>Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredOrders.map((order: any) => {
                                const vendor = order.customFields?.vendor;
                                const seller = order.customFields?.sellerStatus || 'pending';
                                const admin = order.customFields?.adminStatus || 'pending';
                                
                                const sObj = sellerMeta[seller] || sellerMeta.pending;
                                const aObj = adminMeta[admin] || adminMeta.pending;
                                const stObj = stateMeta[order.state] || { label: order.state, color: '#9CA3AF', icon: Package };
                                const StateIcon = stObj.icon;

                                return (
                                    <tr key={order.id} className="po-tr" onClick={() => setSelectedOrder(order)}>
                                        <td style={{ fontWeight: 700, color: '#111827', fontFamily: 'monospace', fontSize: '15px' }}>{order.code}</td>
                                        <td style={{ color: '#6b7280' }}>{formatDate(order.createdAt)}</td>
                                        <td style={{ fontWeight: 600, color: '#111827' }}>
                                            {order.customer ? `${order.customer.firstName} ${order.customer.lastName}` : '—'}
                                        </td>
                                        <td>
                                            {vendor ? (
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#eff6ff', color: '#2563eb', padding: '4px 10px', borderRadius: '8px', fontSize: '13px', fontWeight: 600 }}>
                                                    <Store size={14} /> {vendor.name}
                                                </span>
                                            ) : <span style={{ color: '#9ca3af' }}>—</span>}
                                        </td>
                                        <td>
                                            <span className="po-status-badge" style={{ background: `${stObj.color}15`, color: stObj.color }}>
                                                <StateIcon size={14} /> {stObj.label}
                                            </span>
                                        </td>
                                        <td>
                                            <span className="po-status-badge" style={{ background: `${sObj.color}15`, color: sObj.color }}>
                                                {sObj.label}
                                            </span>
                                        </td>
                                        <td>
                                            <span className="po-status-badge" style={{ background: `${aObj.color}15`, color: aObj.color }}>
                                                {aObj.label}
                                            </span>
                                        </td>
                                        <td style={{ textAlign: 'right', fontWeight: 800, color: '#111827', fontSize: '15px' }}>
                                            {formatPrice(order.totalWithTax, order.currencyCode)}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginTop: '32px' }}>
                    <button className="po-btn-view" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} style={{ opacity: page === 0 ? 0.5 : 1 }}>
                        <ChevronLeft size={16} style={{ display: 'inline', verticalAlign: 'text-bottom' }} /> Précédent
                    </button>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#4b5563' }}>Page {page + 1} / {totalPages}</span>
                    <button className="po-btn-view" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} style={{ opacity: page >= totalPages - 1 ? 0.5 : 1 }}>
                        Suivant <ChevronRight size={16} style={{ display: 'inline', verticalAlign: 'text-bottom' }} />
                    </button>
                </div>
            )}

            {/* Modal */}
            {selectedOrder && createPortal(
                <OrderModal 
                    order={selectedOrder} 
                    onClose={() => setSelectedOrder(null)} 
                    onTransition={(s) => transitionMutation.mutate({ id: selectedOrder.id, state: s })}
                    onUpdateSeller={(s) => sellerMutation.mutate({ id: selectedOrder.id, status: s })}
                    onUpdateAdmin={(s) => adminMutation.mutate({ id: selectedOrder.id, status: s })}
                    isMutating={transitionMutation.isPending || sellerMutation.isPending || adminMutation.isPending}
                />,
                document.body
            )}
        </div>
    );
}

function OrderModal({ order, onClose, onTransition, onUpdateSeller, onUpdateAdmin, isMutating }: any) {
    const v = order.customFields?.vendor;
    const sStat = order.customFields?.sellerStatus || 'pending';
    const aStat = order.customFields?.adminStatus || 'pending';
    const isConfirmed = sStat === 'confirmed';
    const isRefused = sStat === 'refused';
    const stObj = stateMeta[order.state] || { label: order.state, color: '#9CA3AF', icon: Package };
    const StateIcon = stObj.icon;

    // Optional: Hide scrolling on body when modal is open
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = 'auto'; };
    }, []);

    return (
        <div className="po-modal-overlay" onClick={onClose}>
            <div className="po-modal" onClick={e => e.stopPropagation()}>
                
                <div className="po-modal-header">
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                            <h2 style={{ fontSize: '28px', fontWeight: 800, margin: 0, color: '#111827', fontFamily: 'monospace' }}>{order.code}</h2>
                            <span className="po-status-badge" style={{ background: `${stObj.color}15`, color: stObj.color, fontSize: '14px' }}>
                                <StateIcon size={16} /> {stObj.label}
                            </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', color: '#6b7280', fontSize: '14px', fontWeight: 500 }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={16} /> Créée le {formatDate(order.createdAt)}</span>
                            <span>•</span>
                            <span>{order.lines.length} Article(s)</span>
                        </div>
                    </div>
                    <button onClick={onClose} style={{ background: '#f3f4f6', border: 'none', borderRadius: '50%', padding: '10px', cursor: 'pointer', color: '#4b5563', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background='#e5e7eb'} onMouseLeave={e => e.currentTarget.style.background='#f3f4f6'}>
                        <X size={24} />
                    </button>
                </div>

                <div className="po-modal-body">
                    
                    {/* Status Management Bar */}
                    <div className="po-card" style={{ background: 'linear-gradient(145deg, #ffffff, #f8fafc)', border: '1px solid #cbd5e1' }}>
                        <h3 className="po-card-title"><Activity size={18} color="#4b5563" /> Gestion des Statuts {isMutating && <span style={{ color: '#f97316', fontSize: '13px', fontWeight: 500, marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}><Activity size={14} style={{ animation: 'spin 1s linear infinite' }} /> Mise à jour...</span>}</h3>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                            {/* 1. NATIVE STATE */}
                            <div>
                                <label className="po-filter-label" style={{ color: '#111827' }}>État Global (Vendure)</label>
                                <div className="po-select-wrapper">
                                    <select 
                                        className="po-select" 
                                        value={order.state}
                                        onChange={e => onTransition(e.target.value)}
                                        disabled={isMutating}
                                    >
                                        <option value={order.state}>Actuel: {stObj.label}</option>
                                        <optgroup label="États disponibles:">
                                            {order.nextStates?.map((ns: string) => (
                                                <option key={ns} value={ns}>→ Transition vers {stateMeta[ns]?.label || ns}</option>
                                            ))}
                                        </optgroup>
                                    </select>
                                    <ChevronDown size={16} className="po-select-icon" />
                                </div>
                            </div>
                            
                            {/* 2. SELLER STATUS */}
                            <div>
                                <label className="po-filter-label" style={{ color: '#111827' }}>Étape 1: Validation Vendeur</label>
                                <div className="po-select-wrapper">
                                    <select 
                                        className="po-select" 
                                        value={sStat}
                                        onChange={e => onUpdateSeller(e.target.value)}
                                        disabled={isMutating}
                                        style={{ border: sStat === 'pending' ? '2px solid #f59e0b' : '1px solid #d1d5db' }}
                                    >
                                        <option value="pending">⏳ En attente d'approbation</option>
                                        <option value="confirmed">✅ Acceptée / Confirmée</option>
                                        <option value="refused">❌ Refusée</option>
                                    </select>
                                    <ChevronDown size={16} className="po-select-icon" />
                                </div>
                            </div>

                            {/* 3. ADMIN STATUS */}
                            <div style={{ opacity: isConfirmed ? 1 : 0.6 }}>
                                <label className="po-filter-label" style={{ color: '#111827' }}>Étape 2: Statut de Livraison</label>
                                <div className="po-select-wrapper">
                                    <select 
                                        className="po-select" 
                                        value={aStat}
                                        onChange={e => onUpdateAdmin(e.target.value)}
                                        disabled={isMutating || !isConfirmed}
                                    >
                                        <option value="pending">En attente d'expédition</option>
                                        <option value="shipped">Expédiée (Shipped)</option>
                                        <option value="in_transit">En transit (In Transit)</option>
                                        <option value="delivered">Livrée (Delivered)</option>
                                        <option value="cancelled">Annulée (Cancelled)</option>
                                    </select>
                                    <ChevronDown size={16} className="po-select-icon" />
                                </div>
                                {!isConfirmed && <p style={{ fontSize: '12px', color: '#b91c1c', marginTop: '6px', fontWeight: 500 }}>Le vendeur doit confirmer la commande en premier.</p>}
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                        {/* Customer Info */}
                        <div className="po-card">
                            <h3 className="po-card-title"><User size={18} color="#3b82f6" /> Client & Contact</h3>
                            {order.customer ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <div style={{ fontSize: '16px', fontWeight: 700, color: '#111827' }}>{order.customer.firstName} {order.customer.lastName}</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#4b5563', fontSize: '14px' }}>
                                        <Mail size={16} color="#9ca3af" /> {order.customer.emailAddress}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#4b5563', fontSize: '14px' }}>
                                        <Phone size={16} color="#9ca3af" /> {order.customer.phoneNumber || 'Non renseigné'}
                                    </div>
                                </div>
                            ) : <p style={{ color: '#9ca3af' }}>Aucune information client.</p>}
                        </div>

                        {/* Vendor Info */}
                        <div className="po-card">
                            <h3 className="po-card-title"><Store size={18} color="#8b5cf6" /> Vendeur Assigné</h3>
                            {v ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <div style={{ fontSize: '16px', fontWeight: 700, color: '#111827' }}>{v.name}</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#4b5563', fontSize: '14px' }}>
                                        <Mail size={16} color="#9ca3af" /> {v.email || '—'}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#4b5563', fontSize: '14px' }}>
                                        <Phone size={16} color="#9ca3af" /> {v.phoneNumber || '—'}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#4b5563', fontSize: '14px' }}>
                                        <MapPin size={16} color="#9ca3af" /> {v.zone || '—'}, {v.address || '—'}
                                    </div>
                                </div>
                            ) : <p style={{ color: '#9ca3af', fontStyle: 'italic' }}>Aucun vendeur assigné à cette commande.</p>}
                        </div>

                        {/* Addresses */}
                        <div className="po-card">
                            <h3 className="po-card-title"><MapPin size={18} color="#10b981" /> Adresse de Livraison</h3>
                            {order.shippingAddress ? (
                                <div style={{ color: '#374151', fontSize: '14px', lineHeight: '1.6' }}>
                                    <div style={{ fontWeight: 600 }}>{order.shippingAddress.fullName}</div>
                                    <div>{order.shippingAddress.street1}</div>
                                    {order.shippingAddress.street2 && <div>{order.shippingAddress.street2}</div>}
                                    <div>{order.shippingAddress.postalCode} {order.shippingAddress.city}</div>
                                    <div>{order.shippingAddress.province} {order.shippingAddress.country}</div>
                                    {order.shippingAddress.phoneNumber && <div style={{ marginTop: '8px', color: '#4b5563' }}><Phone size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }}/> {order.shippingAddress.phoneNumber}</div>}
                                </div>
                            ) : <p style={{ color: '#9ca3af' }}>—</p>}
                        </div>

                        <div className="po-card">
                            <h3 className="po-card-title"><Receipt size={18} color="#f59e0b" /> Adresse de Facturation</h3>
                            {order.billingAddress?.street1 ? (
                                <div style={{ color: '#374151', fontSize: '14px', lineHeight: '1.6' }}>
                                    <div style={{ fontWeight: 600 }}>{order.billingAddress.fullName}</div>
                                    <div>{order.billingAddress.street1}</div>
                                    {order.billingAddress.street2 && <div>{order.billingAddress.street2}</div>}
                                    <div>{order.billingAddress.postalCode} {order.billingAddress.city}</div>
                                    <div>{order.billingAddress.province} {order.billingAddress.country}</div>
                                </div>
                            ) : <p style={{ color: '#9ca3af', fontStyle: 'italic' }}>Identique à la livraison</p>}
                        </div>
                    </div>

                    {/* Order Lines & Summary */}
                    <div className="po-card">
                        <h3 className="po-card-title"><Package size={18} color="#ef4444" /> Articles ({order.lines.length})</h3>
                        
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            {order.lines.map((line: any) => (
                                <div key={line.id} className="po-line-item">
                                    <img 
                                        className="po-img" 
                                        src={line.productVariant?.featuredAsset?.preview || '/placeholder.png'} 
                                        alt={line.productVariant?.name} 
                                    />
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '15px', fontWeight: 600, color: '#111827' }}>{line.productVariant?.name || 'Produit inconnu'}</div>
                                        <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>SKU: {line.productVariant?.sku || '—'}</div>
                                    </div>
                                    <div style={{ textAlign: 'center', padding: '0 24px' }}>
                                        <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase' }}>Qté</div>
                                        <div style={{ fontSize: '16px', fontWeight: 700, color: '#374151' }}>{line.quantity}</div>
                                    </div>
                                    <div style={{ textAlign: 'right', minWidth: '120px' }}>
                                        <div style={{ fontSize: '14px', color: '#4b5563' }}>{formatPrice(line.linePriceWithTax, order.currencyCode)} l'unité</div>
                                        <div style={{ fontSize: '16px', fontWeight: 800, color: '#111827', marginTop: '4px' }}>{formatPrice(line.proratedLinePriceWithTax, order.currencyCode)}</div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Financial Summary */}
                        <div style={{ background: '#f9fafb', borderRadius: '12px', padding: '24px', marginTop: '24px', border: '1px solid #e5e7eb', width: '350px', marginLeft: 'auto' }}>
                            <div className="po-summary-row">
                                <span>Sous-total</span>
                                <span style={{ fontWeight: 600, color: '#111827' }}>{formatPrice(order.subTotalWithTax, order.currencyCode)}</span>
                            </div>
                            <div className="po-summary-row">
                                <span>Frais de livraison</span>
                                <span style={{ fontWeight: 600, color: '#111827' }}>{formatPrice(order.shippingWithTax, order.currencyCode)}</span>
                            </div>
                            {order.surcharges?.map((s: any, i: number) => (
                                <div key={i} className="po-summary-row">
                                    <span>{s.description}</span>
                                    <span style={{ fontWeight: 600, color: '#111827' }}>{formatPrice(s.priceWithTax, order.currencyCode)}</span>
                                </div>
                            ))}
                            {order.customFields?.commissionAmount > 0 && (
                                <div className="po-summary-row" style={{ color: '#dc2626' }}>
                                    <span>Commission Marketplace</span>
                                    <span style={{ fontWeight: 600 }}>{formatPrice(order.customFields.commissionAmount, order.currencyCode)}</span>
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
