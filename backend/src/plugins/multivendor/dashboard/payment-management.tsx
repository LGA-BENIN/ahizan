import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
    Package, 
    CheckCircle2, 
    Clock, 
    Eye, 
    User, 
    Store, 
    MapPin, 
    Phone, 
    Mail, 
    X, 
    AlertCircle, 
    DollarSign,
    Search,
    ShieldCheck,
    Settings,
    Percent,
    ArrowUpRight,
    TrendingUp,
    ListFilter
} from 'lucide-react';

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

async function fetchGraphQL(query: string, variables?: any) {
    const res = await fetch(getAdminApiUrl(), {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({ query, variables }),
    });
    const json = await res.json();
    if (json.errors) throw new Error(json.errors[0].message);
    return json.data;
}

const GET_DELIVERED_ORDERS = `
    query GetDeliveredOrders($options: OrderListOptions) {
        orders(options: $options) {
            items {
                id
                code
                state
                createdAt
                updatedAt
                totalWithTax
                subTotalWithTax
                shippingWithTax
                currencyCode
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
                lines {
                    id
                    quantity
                    unitPriceWithTax
                    linePriceWithTax
                    productVariant {
                        id
                        name
                        sku
                        featuredAsset {
                            preview
                        }
                    }
                }
                customFields {
                    vendor {
                        id
                        name
                        email
                        phoneNumber
                    }
                    sellerStatus
                    adminStatus
                    isVendorPaid
                    vendorStatuses
                    paymentStatus
                    commissionAmount
                    commissionRate
                }
            }
            totalItems
        }
    }
`;

const UPDATE_VENDOR_PAYMENT_STATUS = `
    mutation UpdateOrderVendorPaymentStatus($orderId: ID!, $isPaid: Boolean!, $vendorId: ID) {
        updateOrderVendorPaymentStatus(orderId: $orderId, isPaid: $isPaid, vendorId: $vendorId)
    }
`;

const GET_PLATFORM_SETTINGS = `
    query GetPlatformSettings {
        platformSettings {
            id
            defaultCommissionRate
            commissionMode
            collectionCommissionRates
        }
    }
`;

const UPDATE_PLATFORM_SETTINGS = `
    mutation UpdatePlatformSettings($input: UpdatePlatformSettingsInput!) {
        updatePlatformSettings(input: $input) {
            id
            defaultCommissionRate
            commissionMode
            collectionCommissionRates
        }
    }
`;

const GET_COLLECTIONS = `
    query GetCollections {
        collections(options: { take: 100 }) {
            items {
                id
                name
            }
        }
    }
`;

const GET_WITHDRAWALS = `
    query GetWithdrawals {
        withdrawalRequests {
            id
            createdAt
            amount
            status
            mobileMoneyNumber
            rejectionReason
            transferReference
            vendor {
                id
                name
            }
        }
    }
`;

const APPROVE_WITHDRAWAL = `
    mutation ApproveWithdrawal($id: ID!) {
        approveWithdrawalRequest(id: $id)
    }
`;

const REJECT_WITHDRAWAL = `
    mutation RejectWithdrawal($id: ID!, $reason: String) {
        rejectWithdrawalRequest(id: $id, reason: $reason)
    }
`;

const DELETE_ORDER_ADMIN = `
    mutation DeleteOrderAdmin($id: ID!) {
        deleteOrderAdmin(id: $id)
    }
`;

function formatPrice(cents: number, currencyCode = 'XOF') {
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: currencyCode,
        maximumFractionDigits: 0,
    }).format(cents);
}

function formatDate(dateStr: string) {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

export function PaymentManagementComponent() {
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<'orders' | 'withdrawals' | 'commission' | 'benefits'>('orders');
    const [orderFilter, setOrderFilter] = useState<'ALL' | 'PENDING' | 'RETIRABLE' | 'PAID'>('ALL');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedOrder, setSelectedOrder] = useState<any>(null);
    const [confirmModalOrder, setConfirmModalOrder] = useState<any>(null);
    const [orderToDelete, setOrderToDelete] = useState<any>(null);
    const [toasts, setToasts] = useState<any[]>([]);

    // Commission State
    const [commissionMode, setCommissionMode] = useState<'GENERAL' | 'COLLECTION' | 'BOTH'>('GENERAL');
    const [generalRate, setGeneralRate] = useState<number>(10);
    const [collectionRates, setCollectionRates] = useState<Record<string, number>>({});

    // Reject Withdrawal Modal State
    const [rejectingWithdrawalId, setRejectingWithdrawalId] = useState<string | null>(null);
    const [rejectionReason, setRejectionReason] = useState('');

    const addToast = (message: string, type: 'success' | 'error') => {
        const tid = Math.random().toString(36).substring(7);
        setToasts(prev => [...prev, { id: tid, message, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== tid)), 3500);
    };

    // Queries
    const { data: ordersData, isLoading: isOrdersLoading } = useQuery({
        queryKey: ['deliveredOrdersForPayment'],
        queryFn: () => fetchGraphQL(GET_DELIVERED_ORDERS, { options: { take: 100 } }),
    });

    const { data: settingsData } = useQuery({
        queryKey: ['platformCommissionSettings'],
        queryFn: () => fetchGraphQL(GET_PLATFORM_SETTINGS),
    });

    const { data: collectionsData } = useQuery({
        queryKey: ['collectionsForCommission'],
        queryFn: () => fetchGraphQL(GET_COLLECTIONS),
    });

    const { data: withdrawalsData, isLoading: isWithdrawalsLoading } = useQuery({
        queryKey: ['withdrawalRequestsList'],
        queryFn: () => fetchGraphQL(GET_WITHDRAWALS),
    });

    // Load Settings into states
    useEffect(() => {
        if (settingsData?.platformSettings) {
            const settings = settingsData.platformSettings;
            setCommissionMode(settings.commissionMode || 'GENERAL');
            setGeneralRate(settings.defaultCommissionRate || 0);
            try {
                const rates = settings.collectionCommissionRates;
                setCollectionRates(typeof rates === 'string' ? JSON.parse(rates) : rates || {});
            } catch (e) {
                setCollectionRates({});
            }
        }
    }, [settingsData]);

    // Mutations
    const orderPaymentMutation = useMutation({
        mutationFn: ({ orderId, isPaid, vendorId }: { orderId: string; isPaid: boolean; vendorId?: string }) =>
            fetchGraphQL(UPDATE_VENDOR_PAYMENT_STATUS, { orderId, isPaid, vendorId }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['deliveredOrdersForPayment'] });
            setConfirmModalOrder(null);
            addToast('Statut de paiement de la commande mis à jour', 'success');
        },
        onError: (err: any) => addToast(err.message, 'error')
    });

    const settingsMutation = useMutation({
        mutationFn: (input: any) => fetchGraphQL(UPDATE_PLATFORM_SETTINGS, { input }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['platformCommissionSettings'] });
            addToast('Stratégie de commission enregistrée', 'success');
        },
        onError: (err: any) => addToast(err.message, 'error')
    });

    const approveWithdrawalMutation = useMutation({
        mutationFn: (id: string) => fetchGraphQL(APPROVE_WITHDRAWAL, { id }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['withdrawalRequestsList'] });
            queryClient.invalidateQueries({ queryKey: ['deliveredOrdersForPayment'] });
            addToast('Demande de retrait approuvée avec succès', 'success');
        },
        onError: (err: any) => addToast(err.message, 'error')
    });

    const rejectWithdrawalMutation = useMutation({
        mutationFn: ({ id, reason }: { id: string; reason: string }) => fetchGraphQL(REJECT_WITHDRAWAL, { id, reason }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['withdrawalRequestsList'] });
            setRejectingWithdrawalId(null);
            setRejectionReason('');
            addToast('Demande de retrait rejetée', 'success');
        },
        onError: (err: any) => addToast(err.message, 'error')
    });

    const deleteOrderMutation = useMutation({
        mutationFn: (id: string) => fetchGraphQL(DELETE_ORDER_ADMIN, { id }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['deliveredOrdersForPayment'] });
            setOrderToDelete(null);
            addToast('Commande supprimée avec succès', 'success');
        },
        onError: (err: any) => addToast(err.message, 'error')
    });

    // Orders Filter and Search
    const allOrders = ordersData?.orders?.items || [];
    const deliveredOrders = useMemo(() => {
        return allOrders.filter((order: any) => {
            const adminStatus = order.customFields?.adminStatus || 'pending';
            return adminStatus === 'delivered' || order.state === 'Delivered';
        });
    }, [allOrders]);

    const filteredOrders = useMemo(() => {
        return deliveredOrders.filter((order: any) => {
            const status = order.customFields?.paymentStatus || 'PENDING';
            if (orderFilter !== 'ALL' && status !== orderFilter) return false;

            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                return (
                    order.code?.toLowerCase().includes(term) ||
                    `${order.customer?.firstName} ${order.customer?.lastName}`.toLowerCase().includes(term)
                );
            }
            return true;
        });
    }, [deliveredOrders, orderFilter, searchTerm]);

    // Profit statistic calculation (Sum of commissions of all delivered orders)
    const platformProfit = useMemo(() => {
        return allOrders.reduce((sum: number, o: any) => sum + (o.customFields?.commissionAmount || 0), 0);
    }, [allOrders]);

    const handleSaveSettings = () => {
        settingsMutation.mutate({
            commissionMode,
            defaultCommissionRate: generalRate,
            collectionCommissionRates: collectionRates
        });
    };

    return (
        <div style={{ padding: '30px', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#0f172a', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
            {/* Toast Notifications */}
            <div style={{ position: 'fixed', top: '24px', right: '24px', zIndex: 1100, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {toasts.map(t => (
                    <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 20px', borderRadius: '10px', background: t.type === 'success' ? '#10b981' : '#ef4444', color: 'white', fontWeight: 600, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
                        {t.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                        {t.message}
                    </div>
                ))}
            </div>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '20px', marginBottom: '32px', flexWrap: 'wrap' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
                        <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                            <DollarSign size={24} />
                        </div>
                        <div>
                            <h1 style={{ fontSize: '26px', fontWeight: 900, margin: 0, letterSpacing: '-0.02em', color: '#1e293b' }}>Gestion de Paiement</h1>
                            <p style={{ fontSize: '13px', color: '#64748b', margin: '2px 0 0' }}>Administration des commissions, règlements vendeurs et demandes de retraits.</p>
                        </div>
                    </div>
                </div>

                {/* Profit Metrics Box */}
                <div style={{ background: 'white', padding: '16px 24px', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                    <div style={{ background: '#dcfce7', color: '#15803d', padding: '12px', borderRadius: '12px' }}>
                        <TrendingUp size={24} />
                    </div>
                    <div>
                        <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Bénéfices Plateforme (Somme Comm.)</div>
                        <div style={{ fontSize: '20px', fontWeight: 900, color: '#16a34a', marginTop: '2px' }}>{formatPrice(platformProfit)}</div>
                    </div>
                </div>
            </div>

            {/* Tab Navigation */}
            <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', gap: '8px', marginBottom: '28px' }}>
                <button
                    onClick={() => setActiveTab('orders')}
                    style={{
                        padding: '12px 20px',
                        fontWeight: 700,
                        fontSize: '14px',
                        border: 'none',
                        borderBottom: activeTab === 'orders' ? '3px solid #2563eb' : '3px solid transparent',
                        background: 'transparent',
                        color: activeTab === 'orders' ? '#2563eb' : '#64748b',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        transition: 'all 0.2s'
                    }}
                >
                    <Package size={16} /> Commandes Livrées
                </button>
                <button
                    onClick={() => setActiveTab('withdrawals')}
                    style={{
                        padding: '12px 20px',
                        fontWeight: 700,
                        fontSize: '14px',
                        border: 'none',
                        borderBottom: activeTab === 'withdrawals' ? '3px solid #2563eb' : '3px solid transparent',
                        background: 'transparent',
                        color: activeTab === 'withdrawals' ? '#2563eb' : '#64748b',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        transition: 'all 0.2s'
                    }}
                >
                    <ArrowUpRight size={16} /> Demandes de Retrait
                    {withdrawalsData?.withdrawalRequests?.filter((w: any) => w.status === 'PENDING').length > 0 && (
                        <span style={{ fontSize: '10px', background: '#f59e0b', color: 'white', padding: '2px 6px', borderRadius: '10px', fontWeight: 900 }}>
                            {withdrawalsData.withdrawalRequests.filter((w: any) => w.status === 'PENDING').length}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('benefits')}
                    style={{
                        padding: '12px 20px',
                        fontWeight: 700,
                        fontSize: '14px',
                        border: 'none',
                        borderBottom: activeTab === 'benefits' ? '3px solid #2563eb' : '3px solid transparent',
                        background: 'transparent',
                        color: activeTab === 'benefits' ? '#2563eb' : '#64748b',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        transition: 'all 0.2s'
                    }}
                >
                    <TrendingUp size={16} /> Bénéfices Plateforme
                </button>
                <button
                    onClick={() => setActiveTab('commission')}
                    style={{
                        padding: '12px 20px',
                        fontWeight: 700,
                        fontSize: '14px',
                        border: 'none',
                        borderBottom: activeTab === 'commission' ? '3px solid #2563eb' : '3px solid transparent',
                        background: 'transparent',
                        color: activeTab === 'commission' ? '#2563eb' : '#64748b',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        transition: 'all 0.2s'
                    }}
                >
                    <Percent size={16} /> Stratégie de Commission
                </button>
            </div>

            {/* TAB CONTENT: ORDERS */}
            {activeTab === 'orders' && (
                <div>
                    {/* Order Filter Bar */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                                onClick={() => setOrderFilter('ALL')}
                                style={{
                                    padding: '8px 16px',
                                    borderRadius: '20px',
                                    fontSize: '13px',
                                    fontWeight: 700,
                                    border: orderFilter === 'ALL' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                                    background: orderFilter === 'ALL' ? '#eff6ff' : 'white',
                                    color: orderFilter === 'ALL' ? '#1d4ed8' : '#475569',
                                    cursor: 'pointer'
                                }}
                            >
                                Toutes ({deliveredOrders.length})
                            </button>
                            <button
                                onClick={() => setOrderFilter('PENDING')}
                                style={{
                                    padding: '8px 16px',
                                    borderRadius: '20px',
                                    fontSize: '13px',
                                    fontWeight: 700,
                                    border: orderFilter === 'PENDING' ? '2px solid #ef4444' : '1px solid #cbd5e1',
                                    background: orderFilter === 'PENDING' ? '#fef2f2' : 'white',
                                    color: orderFilter === 'PENDING' ? '#dc2626' : '#475569',
                                    cursor: 'pointer'
                                }}
                            >
                                ⏳ En attente de validation ({deliveredOrders.filter((o: any) => (o.customFields?.paymentStatus || 'PENDING') === 'PENDING').length})
                            </button>
                            <button
                                onClick={() => setOrderFilter('RETIRABLE')}
                                style={{
                                    padding: '8px 16px',
                                    borderRadius: '20px',
                                    fontSize: '13px',
                                    fontWeight: 700,
                                    border: orderFilter === 'RETIRABLE' ? '2px solid #f59e0b' : '1px solid #cbd5e1',
                                    background: orderFilter === 'RETIRABLE' ? '#fef3c7' : 'white',
                                    color: orderFilter === 'RETIRABLE' ? '#d97706' : '#475569',
                                    cursor: 'pointer'
                                }}
                            >
                                🔓 Paiement retirable ({deliveredOrders.filter((o: any) => o.customFields?.paymentStatus === 'RETIRABLE').length})
                            </button>
                            <button
                                onClick={() => setOrderFilter('PAID')}
                                style={{
                                    padding: '8px 16px',
                                    borderRadius: '20px',
                                    fontSize: '13px',
                                    fontWeight: 700,
                                    border: orderFilter === 'PAID' ? '2px solid #10b981' : '1px solid #cbd5e1',
                                    background: orderFilter === 'PAID' ? '#dcfce7' : 'white',
                                    color: orderFilter === 'PAID' ? '#15803d' : '#475569',
                                    cursor: 'pointer'
                                }}
                            >
                                ✅ Commande déjà payée ({deliveredOrders.filter((o: any) => o.customFields?.paymentStatus === 'PAID').length})
                            </button>
                        </div>

                        <div style={{ position: 'relative', width: '280px' }}>
                            <input
                                type="text"
                                placeholder="Rechercher code, client..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '8px 14px 8px 36px',
                                    borderRadius: '10px',
                                    border: '1px solid #cbd5e1',
                                    fontSize: '13px',
                                    outline: 'none'
                                }}
                            />
                            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                        </div>
                    </div>

                    {/* Table */}
                    {isOrdersLoading ? (
                        <div style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>Chargement des commandes livrées...</div>
                    ) : (
                        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead>
                                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '12px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                                        <th style={{ padding: '14px 16px' }}>Code</th>
                                        <th style={{ padding: '14px 16px' }}>Client</th>
                                        <th style={{ padding: '14px 16px' }}>Vendeur</th>
                                        <th style={{ padding: '14px 16px' }}>Total Commande</th>
                                        <th style={{ padding: '14px 16px' }}>Commission Prélevée</th>
                                        <th style={{ padding: '14px 16px' }}>Net Vendeur</th>
                                        <th style={{ padding: '14px 16px' }}>Statut</th>
                                        <th style={{ padding: '14px 16px', textAlign: 'right' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredOrders.length > 0 ? (
                                        filteredOrders.map((order: any) => {
                                            const status = order.customFields?.paymentStatus || 'PENDING';
                                            const total = order.totalWithTax || 0;
                                            const commission = order.customFields?.commissionAmount || 0;
                                            const net = total - commission;

                                            return (
                                                <tr key={order.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                    <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontWeight: 800, color: '#2563eb' }}>
                                                        #{order.code}
                                                    </td>
                                                    <td style={{ padding: '14px 16px' }}>
                                                        {order.customer ? (
                                                            <div>
                                                                <div style={{ fontWeight: 700, fontSize: '13px' }}>{order.customer.firstName} {order.customer.lastName}</div>
                                                                <div style={{ fontSize: '11px', color: '#64748b' }}>{order.customer.emailAddress}</div>
                                                            </div>
                                                        ) : <span style={{ color: '#94a3b8' }}>Client invité</span>}
                                                    </td>
                                                    <td style={{ padding: '14px 16px', fontWeight: 600, fontSize: '13px' }}>
                                                        {order.customFields?.vendor?.name || 'Inconnu'}
                                                    </td>
                                                    <td style={{ padding: '14px 16px', fontWeight: 700, fontSize: '13px' }}>
                                                        {formatPrice(total, order.currencyCode)}
                                                    </td>
                                                    <td style={{ padding: '14px 16px', color: '#dc2626', fontWeight: 700, fontSize: '13px' }}>
                                                        {formatPrice(commission, order.currencyCode)}
                                                        <span style={{ fontSize: '10px', color: '#94a3b8', marginLeft: '4px', fontWeight: 500 }}>
                                                            ({order.customFields?.commissionRate || 0}%)
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '14px 16px', color: '#16a34a', fontWeight: 800, fontSize: '13px' }}>
                                                        {formatPrice(net, order.currencyCode)}
                                                    </td>
                                                    <td style={{ padding: '14px 16px' }}>
                                                        <span style={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '6px',
                                                            padding: '4px 10px',
                                                            borderRadius: '12px',
                                                            fontSize: '12px',
                                                            fontWeight: 700,
                                                            background: status === 'PAID' ? '#dcfce7' : status === 'RETIRABLE' ? '#fef3c7' : '#fee2e2',
                                                            color: status === 'PAID' ? '#15803d' : status === 'RETIRABLE' ? '#b45309' : '#b91c1c'
                                                        }}>
                                                            {status === 'PAID' ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                                                            {status === 'PAID' ? 'Déjà Payée' : status === 'RETIRABLE' ? 'Retirable' : 'Attente validation'}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                                            <button
                                                                onClick={() => setSelectedOrder(order)}
                                                                style={{
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    gap: '6px',
                                                                    padding: '6px 12px',
                                                                    borderRadius: '8px',
                                                                    border: '1px solid #cbd5e1',
                                                                    background: 'white',
                                                                    color: '#334155',
                                                                    fontSize: '12px',
                                                                    fontWeight: 700,
                                                                    cursor: 'pointer'
                                                                }}
                                                            >
                                                                <Eye size={14} /> Voir infos
                                                            </button>

                                                            <button
                                                                onClick={() => setOrderToDelete(order)}
                                                                style={{
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    gap: '6px',
                                                                    padding: '6px 12px',
                                                                    borderRadius: '8px',
                                                                    border: '1px solid #fee2e2',
                                                                    background: '#fee2e2',
                                                                    color: '#dc2626',
                                                                    fontSize: '12px',
                                                                    fontWeight: 700,
                                                                    cursor: 'pointer'
                                                                }}
                                                            >
                                                                🗑️ Supprimer
                                                            </button>
                                                            
                                                            {status === 'PENDING' && (
                                                                <button
                                                                    onClick={() => setConfirmModalOrder(order)}
                                                                    style={{
                                                                        display: 'inline-flex',
                                                                        alignItems: 'center',
                                                                        gap: '6px',
                                                                        padding: '6px 14px',
                                                                        borderRadius: '8px',
                                                                        border: 'none',
                                                                        background: '#eab308',
                                                                        color: 'black',
                                                                        fontSize: '12px',
                                                                        fontWeight: 800,
                                                                        cursor: 'pointer'
                                                                    }}
                                                                >
                                                                    🔓 Argent libérer
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan={8} style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>
                                                Aucune commande livrée ne correspond à ces critères.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* TAB CONTENT: WITHDRAWAL REQUESTS */}
            {activeTab === 'withdrawals' && (
                <div>
                    {isWithdrawalsLoading ? (
                        <div style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>Chargement des demandes de retrait...</div>
                    ) : (
                        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead>
                                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '12px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                                        <th style={{ padding: '14px 16px' }}>Date de demande</th>
                                        <th style={{ padding: '14px 16px' }}>Vendeur</th>
                                        <th style={{ padding: '14px 16px' }}>Montant demandé</th>
                                        <th style={{ padding: '14px 16px' }}>Mobile Money</th>
                                        <th style={{ padding: '14px 16px' }}>Statut</th>
                                        <th style={{ padding: '14px 16px', textAlign: 'right' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {withdrawalsData?.withdrawalRequests?.length > 0 ? (
                                        withdrawalsData.withdrawalRequests.map((withdrawal: any) => {
                                            const status = withdrawal.status;

                                            return (
                                                <tr key={withdrawal.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                    <td style={{ padding: '14px 16px', fontSize: '13px', color: '#475569' }}>
                                                        {formatDate(withdrawal.createdAt)}
                                                    </td>
                                                    <td style={{ padding: '14px 16px', fontWeight: 700, fontSize: '13px' }}>
                                                        {withdrawal.vendor?.name || 'Vendeur inconnu'}
                                                    </td>
                                                    <td style={{ padding: '14px 16px', fontWeight: 800, fontSize: '14px', color: '#1e293b' }}>
                                                        {formatPrice(withdrawal.amount)}
                                                    </td>
                                                    <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontSize: '13px' }}>
                                                        {withdrawal.mobileMoneyNumber || 'Non renseigné'}
                                                    </td>
                                                    <td style={{ padding: '14px 16px' }}>
                                                        <span style={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '6px',
                                                            padding: '4px 10px',
                                                            borderRadius: '12px',
                                                            fontSize: '12px',
                                                            fontWeight: 700,
                                                            background: status === 'APPROVED' ? '#dcfce7' : status === 'REJECTED' ? '#fee2e2' : '#fef3c7',
                                                            color: status === 'APPROVED' ? '#15803d' : status === 'REJECTED' ? '#b91c1c' : '#b45309'
                                                        }}>
                                                            {status === 'APPROVED' ? 'Validé' : status === 'REJECTED' ? 'Rejeté' : 'En attente'}
                                                        </span>
                                                        {withdrawal.rejectionReason && (
                                                            <div style={{ fontSize: '11px', color: '#dc2626', marginTop: '4px' }}>
                                                                Motif : {withdrawal.rejectionReason}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                                                        {status === 'PENDING' && (
                                                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                                                <button
                                                                    onClick={() => {
                                                                        if (confirm('Approuver cette demande de retrait ? Le solde disponible des commandes associées sera mis à jour en "Déjà payé".')) {
                                                                            approveWithdrawalMutation.mutate(withdrawal.id);
                                                                        }
                                                                    }}
                                                                    disabled={approveWithdrawalMutation.isPending}
                                                                    style={{
                                                                        padding: '6px 12px',
                                                                        borderRadius: '8px',
                                                                        border: 'none',
                                                                        background: '#16a34a',
                                                                        color: 'white',
                                                                        fontSize: '12px',
                                                                        fontWeight: 800,
                                                                        cursor: 'pointer'
                                                                    }}
                                                                >
                                                                    Valider
                                                                </button>
                                                                <button
                                                                    onClick={() => setRejectingWithdrawalId(withdrawal.id)}
                                                                    style={{
                                                                        padding: '6px 12px',
                                                                        borderRadius: '8px',
                                                                        border: 'none',
                                                                        background: '#ef4444',
                                                                        color: 'white',
                                                                        fontSize: '12px',
                                                                        fontWeight: 800,
                                                                        cursor: 'pointer'
                                                                    }}
                                                                >
                                                                    Rejeter
                                                                </button>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan={6} style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>
                                                Aucune demande de retrait enregistrée.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* TAB CONTENT: BENEFITS LIST */}
            {activeTab === 'benefits' && (
                <div>
                    <h3 style={{ margin: '0 0 20px', fontSize: '18px', fontWeight: 800 }}>💰 Détail des Bénéfices (Commissions perçues)</h3>
                    <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '12px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                                    <th style={{ padding: '14px 16px' }}>Code Commande</th>
                                    <th style={{ padding: '14px 16px' }}>Date</th>
                                    <th style={{ padding: '14px 16px' }}>Vendeur</th>
                                    <th style={{ padding: '14px 16px' }}>Total Commande</th>
                                    <th style={{ padding: '14px 16px' }}>Taux (%)</th>
                                    <th style={{ padding: '14px 16px' }}>Bénéfice (Commission)</th>
                                    <th style={{ padding: '14px 16px' }}>Statut Règlement</th>
                                </tr>
                            </thead>
                            <tbody>
                                {deliveredOrders.length > 0 ? (
                                    deliveredOrders.map((order: any) => {
                                        const commission = order.customFields?.commissionAmount || 0;
                                        const status = order.customFields?.paymentStatus || 'PENDING';
                                        return (
                                            <tr key={order.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontWeight: 800, color: '#2563eb' }}>
                                                    #{order.code}
                                                </td>
                                                <td style={{ padding: '14px 16px', fontSize: '13px', color: '#475569' }}>
                                                    {formatDate(order.createdAt)}
                                                </td>
                                                <td style={{ padding: '14px 16px', fontWeight: 600, fontSize: '13px' }}>
                                                    {order.customFields?.vendor?.name || 'Inconnu'}
                                                </td>
                                                <td style={{ padding: '14px 16px', fontWeight: 700 }}>
                                                    {formatPrice(order.totalWithTax, order.currencyCode)}
                                                </td>
                                                <td style={{ padding: '14px 16px', color: '#64748b' }}>
                                                    {order.customFields?.commissionRate || 0}%
                                                </td>
                                                <td style={{ padding: '14px 16px', color: '#16a34a', fontWeight: 900 }}>
                                                    {formatPrice(commission, order.currencyCode)}
                                                </td>
                                                <td style={{ padding: '14px 16px' }}>
                                                    <span style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                        padding: '2px 8px',
                                                        borderRadius: '10px',
                                                        fontSize: '11px',
                                                        fontWeight: 700,
                                                        background: status === 'PAID' ? '#dcfce7' : status === 'RETIRABLE' ? '#f3e8ff' : '#fee2e2',
                                                        color: status === 'PAID' ? '#15803d' : status === 'RETIRABLE' ? '#6b21a8' : '#b91c1c'
                                                    }}>
                                                        {status === 'PAID' ? 'Perçu (Régler)' : status === 'RETIRABLE' ? 'Retirable (Libéré)' : 'Non Perçu (Attente)'}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={7} style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>
                                            Aucune commande disponible.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB CONTENT: COMMISSION STRATEGY */}
            {activeTab === 'commission' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px', maxWidth: '800px' }}>
                    <div style={{ background: 'white', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                        <h3 style={{ margin: '0 0 20px', fontSize: '18px', fontWeight: 800 }}>⚙️ Stratégie de Commission Générale</h3>
                        
                        <div style={{ display: 'grid', gap: '20px', marginBottom: '24px' }}>
                            <div>
                                <label style={{ display: 'block', fontWeight: 700, fontSize: '13px', color: '#475569', marginBottom: '6px' }}>Mode de Commission</label>
                                <select 
                                    value={commissionMode} 
                                    onChange={e => setCommissionMode(e.target.value as any)}
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
                                >
                                    <option value="GENERAL">Taux Général Unique (Tout le catalogue)</option>
                                    <option value="COLLECTION">Par Collection de Produits uniquement</option>
                                    <option value="BOTH">Hybride : Par collection si configurée, sinon Taux Général</option>
                                </select>
                            </div>

                            {(commissionMode === 'GENERAL' || commissionMode === 'BOTH') && (
                                <div>
                                    <label style={{ display: 'block', fontWeight: 700, fontSize: '13px', color: '#475569', marginBottom: '6px' }}>Taux de Commission Général (%)</label>
                                    <input 
                                        type="number" 
                                        min="0" 
                                        max="100" 
                                        value={generalRate} 
                                        onChange={e => setGeneralRate(parseFloat(e.target.value) || 0)}
                                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Collections configuration rates list */}
                        {(commissionMode === 'COLLECTION' || commissionMode === 'BOTH') && (
                            <div style={{ marginTop: '24px', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
                                <h4 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: 800, color: '#334155' }}>Commission Spécifique par Collection</h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {collectionsData?.collections?.items?.map((col: any) => (
                                        <div key={col.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                            <span style={{ fontSize: '13px', fontWeight: 600 }}>{col.name}</span>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <input 
                                                    type="number" 
                                                    placeholder="Défaut (0%)"
                                                    min="0" 
                                                    max="100" 
                                                    value={collectionRates[col.id] !== undefined ? collectionRates[col.id] : ''} 
                                                    onChange={e => {
                                                        const val = e.target.value === '' ? undefined : parseFloat(e.target.value);
                                                        setCollectionRates(prev => {
                                                            const copy = { ...prev };
                                                            if (val === undefined) {
                                                                delete copy[col.id];
                                                            } else {
                                                                copy[col.id] = val;
                                                            }
                                                            return copy;
                                                        });
                                                    }}
                                                    style={{ width: '80px', padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', textAlign: 'center' }}
                                                />
                                                <span style={{ fontSize: '13px', color: '#64748b' }}>%</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <button 
                            onClick={handleSaveSettings}
                            disabled={settingsMutation.isPending}
                            style={{ 
                                marginTop: '28px', 
                                padding: '10px 24px', 
                                background: '#2563eb', 
                                color: 'white', 
                                border: 'none', 
                                borderRadius: '8px', 
                                fontWeight: 800, 
                                cursor: 'pointer',
                                fontSize: '14px',
                                opacity: settingsMutation.isPending ? 0.7 : 1
                            }}
                        >
                            {settingsMutation.isPending ? 'Enregistrement...' : 'Enregistrer la stratégie'}
                        </button>
                    </div>
                </div>
            )}

            {/* CONFIRM PAYOUT MUTATION MODAL */}
            {confirmModalOrder && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
                    <div style={{ background: 'white', borderRadius: '16px', maxWidth: '480px', width: '100%', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', color: '#f59e0b' }}>
                            <ShieldCheck size={28} />
                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>Libérer l'argent</h3>
                        </div>
                        <p style={{ fontSize: '14px', color: '#475569', lineHeight: 1.5, marginBottom: '24px' }}>
                            Êtes-vous sûr de vouloir libérer le paiement pour la commande <strong>#{confirmModalOrder.code}</strong> ? 
                            Cela rendra le montant net retirable par le vendeur.
                            <br />
                            <span style={{ fontSize: '12px', color: '#64748b', marginTop: '8px', display: 'block' }}>
                                Total Net Vendeur : <strong>{formatPrice((confirmModalOrder.totalWithTax || 0) - (confirmModalOrder.customFields?.commissionAmount || 0), confirmModalOrder.currencyCode)}</strong>
                            </span>
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                            <button
                                onClick={() => setConfirmModalOrder(null)}
                                disabled={orderPaymentMutation.isPending}
                                style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', color: '#475569', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}
                            >
                                Annuler
                            </button>
                            <button
                                onClick={() => orderPaymentMutation.mutate({ orderId: confirmModalOrder.id, isPaid: true })}
                                disabled={orderPaymentMutation.isPending}
                                style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: '#f59e0b', color: 'black', fontWeight: 800, fontSize: '13px', cursor: 'pointer' }}
                            >
                                {orderPaymentMutation.isPending ? 'Action...' : 'Oui, libérer les fonds'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* CONFIRM ORDER DELETION MODAL */}
            {orderToDelete && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
                    <div style={{ background: 'white', borderRadius: '16px', maxWidth: '480px', width: '100%', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', color: '#dc2626' }}>
                            <AlertCircle size={28} />
                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>Confirmer la suppression</h3>
                        </div>
                        <p style={{ fontSize: '14px', color: '#475569', lineHeight: 1.5, marginBottom: '24px' }}>
                            Êtes-vous sûr de vouloir supprimer définitivement la commande <strong>#{orderToDelete.code}</strong> ?
                            <br /><br />
                            <span style={{ color: '#dc2626', fontWeight: 700 }}>Attention : cette action est irréversible et supprimera toutes les lignes, transactions et historiques associés à cette commande.</span>
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                            <button
                                onClick={() => setOrderToDelete(null)}
                                disabled={deleteOrderMutation.isPending}
                                style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', color: '#475569', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}
                            >
                                Annuler
                            </button>
                            <button
                                onClick={() => deleteOrderMutation.mutate(orderToDelete.id)}
                                disabled={deleteOrderMutation.isPending}
                                style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: '#dc2626', color: 'white', fontWeight: 800, fontSize: '13px', cursor: 'pointer' }}
                            >
                                {deleteOrderMutation.isPending ? 'Suppression...' : 'Oui, supprimer'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* REJECT WITHDRAWAL REASON MODAL */}
            {rejectingWithdrawalId && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
                    <div style={{ background: 'white', borderRadius: '16px', maxWidth: '480px', width: '100%', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', color: '#ef4444' }}>
                            <AlertCircle size={28} />
                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>Rejeter la demande de retrait</h3>
                        </div>
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>Raison du rejet (Optionnel)</label>
                            <textarea 
                                rows={3}
                                placeholder="Indiquez le motif du rejet (ex: Informations de Mobile Money incorrectes...)"
                                value={rejectionReason}
                                onChange={e => setRejectionReason(e.target.value)}
                                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', resize: 'vertical', outline: 'none' }}
                            />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                            <button
                                onClick={() => {
                                    setRejectingWithdrawalId(null);
                                    setRejectionReason('');
                                }}
                                style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', color: '#475569', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}
                            >
                                Annuler
                            </button>
                            <button
                                onClick={() => rejectWithdrawalMutation.mutate({ id: rejectingWithdrawalId, reason: rejectionReason })}
                                disabled={rejectWithdrawalMutation.isPending}
                                style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: '#ef4444', color: 'white', fontWeight: 800, fontSize: '13px', cursor: 'pointer' }}
                            >
                                {rejectWithdrawalMutation.isPending ? 'Action...' : 'Confirmer le rejet'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* DETAIL MODAL */}
            {selectedOrder && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
                    <div style={{ background: 'white', borderRadius: '20px', maxWidth: '700px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '24px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px', marginBottom: '20px' }}>
                            <div>
                                <h2 style={{ fontSize: '20px', fontWeight: 900, margin: 0, fontFamily: 'monospace' }}>Détails Commande #{selectedOrder.code}</h2>
                                <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0' }}>Livrée le {formatDate(selectedOrder.updatedAt)}</p>
                            </div>
                            <button onClick={() => setSelectedOrder(null)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', padding: '6px', cursor: 'pointer' }}>
                                <X size={18} />
                            </button>
                        </div>

                        {/* Order lines */}
                        <div style={{ marginBottom: '20px' }}>
                            <h4 style={{ fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', color: '#64748b', marginBottom: '10px' }}>Articles commandés</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {selectedOrder.lines?.map((line: any) => (
                                    <div key={line.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                        <div>
                                            <div style={{ fontWeight: 700, fontSize: '13px' }}>{line.productVariant?.name}</div>
                                            <div style={{ fontSize: '11px', color: '#64748b' }}>Quantité: {line.quantity} × {formatPrice(line.linePriceWithTax / line.quantity, selectedOrder.currencyCode)}</div>
                                        </div>
                                        <div style={{ fontWeight: 800, fontSize: '13px' }}>
                                            {formatPrice(line.linePriceWithTax, selectedOrder.currencyCode)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Customer & Delivery Info */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                            <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                <h4 style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', color: '#64748b', margin: '0 0 6px' }}>Client</h4>
                                <div style={{ fontWeight: 700, fontSize: '13px' }}>{selectedOrder.customer?.firstName} {selectedOrder.customer?.lastName}</div>
                                <div style={{ fontSize: '12px', color: '#64748b' }}>{selectedOrder.customer?.emailAddress}</div>
                                <div style={{ fontSize: '12px', color: '#64748b' }}>{selectedOrder.customer?.phoneNumber || 'Pas de numéro'}</div>
                            </div>
                            <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                <h4 style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', color: '#64748b', margin: '0 0 6px' }}>Vendeur</h4>
                                <div style={{ fontWeight: 700, fontSize: '13px' }}>{selectedOrder.customFields?.vendor?.name || 'Inconnu'}</div>
                                <div style={{ fontSize: '12px', color: '#64748b' }}>{selectedOrder.customFields?.vendor?.email}</div>
                                <div style={{ fontSize: '12px', color: '#64748b' }}>{selectedOrder.customFields?.vendor?.phoneNumber || 'Pas de numéro'}</div>
                            </div>
                        </div>

                        {/* Financial breakdown */}
                        <div style={{ padding: '16px', background: '#f1f5f9', borderRadius: '12px', marginBottom: '24px', display: 'grid', gap: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                <span>Total Commande :</span>
                                <span style={{ fontWeight: 700 }}>{formatPrice(selectedOrder.totalWithTax, selectedOrder.currencyCode)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#dc2626' }}>
                                <span>Commission Plateforme ({selectedOrder.customFields?.commissionRate || 0}%) :</span>
                                <span style={{ fontWeight: 700 }}>- {formatPrice(selectedOrder.customFields?.commissionAmount || 0, selectedOrder.currencyCode)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#16a34a', borderTop: '1px dashed #cbd5e1', paddingTop: '8px', fontWeight: 900 }}>
                                <span>Part Net Vendeur :</span>
                                <span>{formatPrice((selectedOrder.totalWithTax || 0) - (selectedOrder.customFields?.commissionAmount || 0), selectedOrder.currencyCode)}</span>
                            </div>
                        </div>

                        {/* Modal Footer Actions */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                            {(selectedOrder.customFields?.paymentStatus || 'PENDING') === 'PENDING' && (
                                <button
                                    onClick={() => {
                                        setConfirmModalOrder(selectedOrder);
                                        setSelectedOrder(null);
                                    }}
                                    style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#f59e0b', color: 'black', fontWeight: 800, fontSize: '13px', cursor: 'pointer' }}
                                >
                                    🔓 Argent libérer
                                </button>
                            )}
                            <button onClick={() => setSelectedOrder(null)} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>
                                Fermer
                            </button>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
}
