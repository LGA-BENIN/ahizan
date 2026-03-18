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
                    customStatus
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

    const { data, isLoading } = useQuery({
        queryKey: ['adminOrders', page],
        queryFn: () => fetchGraphQL(GET_ORDERS_WITH_VENDOR, {
            options: { skip: page * take, take, sort: { createdAt: 'DESC' } },
        }),
    });

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
                        <th style={{ padding: '10px 8px', fontSize: 13 }}>Suivi</th>
                        <th style={{ padding: '10px 8px', fontSize: 13, textAlign: 'right' }}>Total</th>
                        <th style={{ padding: '10px 8px', fontSize: 13, textAlign: 'right' }}>Commission</th>
                        <th style={{ padding: '10px 8px', fontSize: 13 }}>Date</th>
                    </tr>
                </thead>
                <tbody>
                    {orders.map((order: any) => {
                        const vendor = order.customFields?.vendor;
                        const commission = order.customFields?.commissionAmount;
                        const customStatus = order.customFields?.customStatus;
                        const stateColor = stateColors[order.state] || '#9CA3AF';

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
                                <td style={{ padding: '10px 8px', fontSize: 12 }}>
                                    {customStatus || '—'}
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
