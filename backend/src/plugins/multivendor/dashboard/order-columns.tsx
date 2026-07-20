import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

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

export function SellerStatusColumn({ row }: { row: any }) {
    const status = row.customFields?.sellerStatus || 'pending';
    const sObj = sellerLabels[status] || sellerLabels.pending;
    return (
        <span style={{ background: sObj.color + '20', color: sObj.color, padding: '2px 8px', borderRadius: 12, fontSize: 12, fontWeight: 600 }}>
            {sObj.label}
        </span>
    );
}

export function AdminStatusColumn({ row }: { row: any }) {
    const [updating, setUpdating] = useState(false);
    const queryClient = useQueryClient();

    const status = row.customFields?.adminStatus || 'pending';
    const sellerStatus = row.customFields?.sellerStatus || 'pending';
    const aObj = adminLabels[status] || adminLabels.pending;

    const handleUpdate = async (newStatus: string) => {
        setUpdating(true);
        try {
            await fetchGraphQL(`
                mutation UpdateOrderAdminStatus($orderId: ID!, $status: String!) {
                    updateOrderAdminStatus(orderId: $orderId, status: $status)
                }
            `, { orderId: row.id, status: newStatus });
            // Invalidate queries to refresh the list
            queryClient.invalidateQueries({ queryKey: ['orders'] });
            queryClient.invalidateQueries({ queryKey: ['adminOrders'] });
        } catch (e: any) {
            alert('Erreur: ' + e.message);
        } finally {
            setUpdating(false);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ background: aObj.color + '20', color: aObj.color, padding: '2px 8px', borderRadius: 12, fontSize: 12, fontWeight: 600, alignSelf: 'flex-start' }}>
                {aObj.label}
            </span>
            
            {status !== 'delivered' && status !== 'cancelled' && (
                <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                    {status === 'pending' && sellerStatus === 'confirmed' && (
                        <button 
                            onClick={() => handleUpdate('shipped')}
                            disabled={updating}
                            style={{ fontSize: 10, padding: '2px 6px', background: '#3B82F6', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                        >
                            Expédier
                        </button>
                    )}
                    {status === 'shipped' && (
                        <button 
                            onClick={() => handleUpdate('in_transit')}
                            disabled={updating}
                            style={{ fontSize: 10, padding: '2px 6px', background: '#0EA5E9', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                        >
                            En transit
                        </button>
                    )}
                    {status === 'in_transit' && (
                        <button 
                            onClick={() => handleUpdate('delivered')}
                            disabled={updating}
                            style={{ fontSize: 10, padding: '2px 6px', background: '#10B981', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                        >
                            Livré
                        </button>
                    )}
                    <button 
                        onClick={() => handleUpdate('cancelled')}
                        disabled={updating}
                        style={{ fontSize: 10, padding: '2px 6px', background: '#EF4444', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                    >
                        Annuler
                    </button>
                </div>
            )}
            {status === 'pending' && sellerStatus === 'pending' && (
                <span style={{ fontSize: 10, color: '#9CA3AF', fontStyle: 'italic' }}>Attente vendeur</span>
            )}
        </div>
    );
}
