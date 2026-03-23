import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

const GET_ORDERS_WITH_VENDOR = `
    query GetOrdersWithVendor($options: OrderListOptions) {
        orders(options: $options) {
            items {
                id
                code
                state
                totalWithTax
                currencyCode
                createdAt
                customer {
                    firstName
                    lastName
                }
                customFields {
                    vendor {
                        id
                        name
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
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(price / 100);
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

const stateColors: Record<string, string> = {
    AddingItems: '#9CA3AF',
    ArrangingPayment: '#F59E0B',
    PaymentAuthorized: '#3B82F6',
    PaymentSettled: '#10B981',
    Shipped: '#6366F1',
    Delivered: '#8B5CF6',
    Cancelled: '#EF4444',
};

export function OrdersListComponent() {
    const [page, setPage] = useState(0);
    const take = 20;

    const { data, isLoading, refetch } = useQuery({
        queryKey: ['adminOrders', page],
        queryFn: () => fetchGraphQL(GET_ORDERS_WITH_VENDOR, {
            options: { skip: page * take, take, sort: { createdAt: 'DESC' } },
        }),
    });

    const [updating, setUpdating] = useState<string | null>(null);

    const handleUpdateStatus = async (orderId: string, status: string) => {
        setUpdating(orderId);
        try {
            await fetchGraphQL(`
                mutation UpdateOrderAdminStatus($orderId: ID!, $status: String!) {
                    updateOrderAdminStatus(orderId: $orderId, status: $status)
                }
            `, { orderId, status });
            await refetch();
        } catch (e: any) {
            alert('Erreur: ' + e.message);
        } finally {
            setUpdating(null);
        }
    };

    const orders = data?.orders?.items || [];
    const totalItems = data?.orders?.totalItems || 0;
    const totalPages = Math.ceil(totalItems / take);

    if (isLoading) return <div style={{ padding: 24 }}>Chargement des commandes...</div>;

    return (
        <div style={{ padding: 24 }}>
            <h2 style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 8 }}>📦 Commandes Marketplace</h2>
            <p style={{ color: '#6b7280', marginBottom: 24 }}>{totalItems} commande{totalItems > 1 ? 's' : ''} au total</p>

            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                    <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}>
                        <th style={{ padding: '10px 8px', fontSize: 13 }}>Code</th>
                        <th style={{ padding: '10px 8px', fontSize: 13 }}>Client</th>
                        <th style={{ padding: '10px 8px', fontSize: 13 }}>Vendeur</th>
                        <th style={{ padding: '10px 8px', fontSize: 13 }}>Statut</th>
                        <th style={{ padding: '10px 8px', fontSize: 13 }}>Statut Vendeur</th>
                        <th style={{ padding: '10px 8px', fontSize: 13 }}>Statut Livraison</th>
                        <th style={{ padding: '10px 8px', fontSize: 13, textAlign: 'right' }}>Total</th>
                        <th style={{ padding: '10px 8px', fontSize: 13, textAlign: 'right' }}>Commission</th>
                        <th style={{ padding: '10px 8px', fontSize: 13 }}>Date</th>
                    </tr>
                </thead>
                <tbody>
                    {orders.map((order: any) => {
                        const vendor = order.customFields?.vendor;
                        const commission = order.customFields?.commissionAmount;
                        const sellerStatus = order.customFields?.sellerStatus || 'pending';
                        const adminStatus = order.customFields?.adminStatus || 'pending';
                        const stateColor = stateColors[order.state] || '#9CA3AF';

                        const sellerLabels: Record<string, {label: string; color: string}> = {
                            pending: { label: 'En attente', color: '#F59E0B' },
                            confirmed: { label: 'Confirmée', color: '#3B82F6' },
                            refused: { label: 'Refusée', color: '#EF4444' },
                        };
                        const adminLabels: Record<string, {label: string; color: string}> = {
                            pending: { label: 'En attente', color: '#9CA3AF' },
                            shipped: { label: 'Expédiée', color: '#6366F1' },
                            in_transit: { label: 'En transit', color: '#0EA5E9' },
                            delivered: { label: 'Livrée', color: '#10B981' },
                            cancelled: { label: 'Annulée', color: '#EF4444' },
                        };
                        const sObj = sellerLabels[sellerStatus] || sellerLabels.pending;
                        const aObj = adminLabels[adminStatus] || adminLabels.pending;

                        return (
                            <tr key={order.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                <td style={{ padding: '10px 8px', fontFamily: 'monospace', fontWeight: 600, fontSize: 13 }}>
                                    {order.code}
                                </td>
                                <td style={{ padding: '10px 8px', fontSize: 13 }}>
                                    {order.customer ? `${order.customer.firstName} ${order.customer.lastName}` : '—'}
                                </td>
                                <td style={{ padding: '10px 8px', fontSize: 13 }}>
                                    {vendor ? (
                                        <span style={{ background: '#EFF6FF', color: '#1D4ED8', padding: '2px 8px', borderRadius: 12, fontSize: 12, fontWeight: 500 }}>
                                            {vendor.name}
                                        </span>
                                    ) : (
                                        <span style={{ color: '#9CA3AF' }}>—</span>
                                    )}
                                </td>
                                <td style={{ padding: '10px 8px' }}>
                                    <span style={{ background: stateColor + '20', color: stateColor, padding: '2px 8px', borderRadius: 12, fontSize: 12, fontWeight: 600 }}>
                                        {order.state}
                                    </span>
                                </td>
                                <td style={{ padding: '10px 8px' }}>
                                    <span style={{ background: sObj.color + '20', color: sObj.color, padding: '2px 8px', borderRadius: 12, fontSize: 12, fontWeight: 600 }}>
                                        {sObj.label}
                                    </span>
                                </td>
                                <td style={{ padding: '10px 8px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                        <span style={{ background: aObj.color + '20', color: aObj.color, padding: '2px 8px', borderRadius: 12, fontSize: 12, fontWeight: 600, alignSelf: 'flex-start' }}>
                                            {aObj.label}
                                        </span>
                                        
                                        {adminStatus !== 'delivered' && adminStatus !== 'cancelled' && (
                                            <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                                                {/* Logic for NEXT status */}
                                                {adminStatus === 'pending' && sellerStatus === 'confirmed' && (
                                                    <button 
                                                        onClick={() => handleUpdateStatus(order.id, 'shipped')}
                                                        disabled={!!updating}
                                                        style={{ fontSize: 10, padding: '2px 6px', background: '#3B82F6', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                                                    >
                                                        Expédier
                                                    </button>
                                                )}
                                                {adminStatus === 'shipped' && (
                                                    <button 
                                                        onClick={() => handleUpdateStatus(order.id, 'in_transit')}
                                                        disabled={!!updating}
                                                        style={{ fontSize: 10, padding: '2px 6px', background: '#0EA5E9', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                                                    >
                                                        En transit
                                                    </button>
                                                )}
                                                {adminStatus === 'in_transit' && (
                                                    <button 
                                                        onClick={() => handleUpdateStatus(order.id, 'delivered')}
                                                        disabled={!!updating}
                                                        style={{ fontSize: 10, padding: '2px 6px', background: '#10B981', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                                                    >
                                                        Livré
                                                    </button>
                                                )}

                                                <button 
                                                    onClick={() => handleUpdateStatus(order.id, 'cancelled')}
                                                    disabled={!!updating}
                                                    style={{ fontSize: 10, padding: '2px 6px', background: '#EF4444', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                                                >
                                                    Annuler
                                                </button>
                                            </div>
                                        )}
                                        {adminStatus === 'pending' && sellerStatus === 'pending' && (
                                            <span style={{ fontSize: 10, color: '#9CA3AF', fontStyle: 'italic' }}>En attente du vendeur</span>
                                        )}
                                    </div>
                                </td>
                                <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 600, fontSize: 13 }}>
                                    {formatPrice(order.totalWithTax, order.currencyCode)}
                                </td>
                                <td style={{ padding: '10px 8px', textAlign: 'right', fontSize: 13 }}>
                                    {commission ? (
                                        <span style={{ color: '#DC2626', fontWeight: 500 }}>
                                            {formatPrice(commission, order.currencyCode)}
                                        </span>
                                    ) : '—'}
                                </td>
                                <td style={{ padding: '10px 8px', fontSize: 12, color: '#6B7280' }}>
                                    {formatDate(order.createdAt)}
                                </td>
                            </tr>
                        );
                    })}
                    {orders.length === 0 && (
                        <tr>
                            <td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#9CA3AF' }}>
                                Aucune commande trouvée.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>

            {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 24 }}>
                    <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} style={{ padding: '6px 14px', border: '1px solid #d1d5db', borderRadius: 4, cursor: page === 0 ? 'default' : 'pointer', opacity: page === 0 ? 0.4 : 1, background: 'white' }}>
                        ← Précédent
                    </button>
                    <span style={{ padding: '6px 14px', fontSize: 13 }}>Page {page + 1} / {totalPages}</span>
                    <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} style={{ padding: '6px 14px', border: '1px solid #d1d5db', borderRadius: 4, cursor: page >= totalPages - 1 ? 'default' : 'pointer', opacity: page >= totalPages - 1 ? 0.4 : 1, background: 'white' }}>
                        Suivant →
                    </button>
                </div>
            )}
        </div>
    );
}
