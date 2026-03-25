import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const GET_ORDER_STATUSES = `query { orderStatuses { id code label color order vendorCanSet isFinal enabled } }`;
const CREATE_ORDER_STATUS = `mutation CreateOrderStatus($input: CreateOrderStatusInput!) { createOrderStatus(input: $input) { id code label } }`;
const UPDATE_ORDER_STATUS = `mutation UpdateOrderStatus($id: ID!, $input: UpdateOrderStatusInput!) { updateOrderStatus(id: $id, input: $input) { id code label } }`;
const DELETE_ORDER_STATUS = `mutation DeleteOrderStatus($id: ID!) { deleteOrderStatus(id: $id) }`;

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

export function OrderStatusesComponent() {
    const queryClient = useQueryClient();
    const [toasts, setToasts] = useState<any[]>([]);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState({ code: '', label: '', color: '#6B7280', order: 0, vendorCanSet: false, isFinal: false, enabled: true });

    const addToast = (message: string, type: 'success' | 'error') => {
        const tid = Math.random().toString(36).substring(7);
        setToasts(prev => [...prev, { id: tid, message, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== tid)), 3000);
    };

    const { data, isLoading } = useQuery({
        queryKey: ['orderStatuses'],
        queryFn: () => fetchGraphQL(GET_ORDER_STATUSES),
    });

    const createMutation = useMutation({
        mutationFn: (input: any) => fetchGraphQL(CREATE_ORDER_STATUS, { input }),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['orderStatuses'] }); addToast('Statut créé', 'success'); resetForm(); },
        onError: (e: any) => addToast(e.message, 'error'),
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, input }: any) => fetchGraphQL(UPDATE_ORDER_STATUS, { id, input }),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['orderStatuses'] }); addToast('Statut mis à jour', 'success'); resetForm(); },
        onError: (e: any) => addToast(e.message, 'error'),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => fetchGraphQL(DELETE_ORDER_STATUS, { id }),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['orderStatuses'] }); addToast('Statut supprimé', 'success'); },
        onError: (e: any) => addToast(e.message, 'error'),
    });

    const resetForm = () => {
        setEditingId(null);
        setForm({ code: '', label: '', color: '#6B7280', order: 0, vendorCanSet: false, isFinal: false, enabled: true });
    };

    const startEdit = (s: any) => {
        setEditingId(s.id);
        setForm({ code: s.code, label: s.label, color: s.color, order: s.order, vendorCanSet: s.vendorCanSet, isFinal: s.isFinal, enabled: s.enabled });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingId) {
            updateMutation.mutate({ id: editingId, input: form });
        } else {
            createMutation.mutate(form);
        }
    };

    const statuses = data?.orderStatuses || [];

    if (isLoading) return <div style={{ padding: 24 }}>Chargement...</div>;

    return (
        <div style={{ padding: 24, maxWidth: 900 }}>
            {toasts.map(t => (
                <div key={t.id} style={{ padding: '8px 16px', marginBottom: 8, borderRadius: 4, background: t.type === 'success' ? '#dcfce7' : '#fee2e2', color: t.type === 'success' ? '#166534' : '#991b1b' }}>
                    {t.message}
                </div>
            ))}
            <h2 style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 16 }}>📋 Statuts de Commande</h2>
            <p style={{ color: '#6b7280', marginBottom: 24 }}>Gérez les statuts de commande de la marketplace. Cochez « Vendeur peut définir » pour autoriser les vendeurs à utiliser ce statut.</p>

            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24 }}>
                <thead>
                    <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                        <th style={{ textAlign: 'left', padding: 8 }}>Couleur</th>
                        <th style={{ textAlign: 'left', padding: 8 }}>Code</th>
                        <th style={{ textAlign: 'left', padding: 8 }}>Label</th>
                        <th style={{ textAlign: 'center', padding: 8 }}>Ordre</th>
                        <th style={{ textAlign: 'center', padding: 8 }}>Vendeur</th>
                        <th style={{ textAlign: 'center', padding: 8 }}>Final</th>
                        <th style={{ textAlign: 'center', padding: 8 }}>Actif</th>
                        <th style={{ textAlign: 'right', padding: 8 }}>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {statuses.map((s: any) => (
                        <tr key={s.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                            <td style={{ padding: 8 }}><span style={{ display: 'inline-block', width: 20, height: 20, borderRadius: '50%', background: s.color }} /></td>
                            <td style={{ padding: 8, fontFamily: 'monospace' }}>{s.code}</td>
                            <td style={{ padding: 8, fontWeight: 500 }}>{s.label}</td>
                            <td style={{ padding: 8, textAlign: 'center' }}>{s.order}</td>
                            <td style={{ padding: 8, textAlign: 'center' }}>{s.vendorCanSet ? '✅' : '—'}</td>
                            <td style={{ padding: 8, textAlign: 'center' }}>{s.isFinal ? '🏁' : '—'}</td>
                            <td style={{ padding: 8, textAlign: 'center' }}>{s.enabled ? '✅' : '❌'}</td>
                            <td style={{ padding: 8, textAlign: 'right' }}>
                                <button onClick={() => startEdit(s)} style={{ marginRight: 8, padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: 4, cursor: 'pointer', background: 'white' }}>Modifier</button>
                                <button onClick={() => { if (confirm('Supprimer ce statut ?')) deleteMutation.mutate(s.id); }} style={{ padding: '4px 8px', border: '1px solid #fca5a5', borderRadius: 4, cursor: 'pointer', background: '#fef2f2', color: '#b91c1c' }}>Supprimer</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <fieldset style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 16 }}>
                <legend style={{ fontWeight: 'bold', padding: '0 8px' }}>{editingId ? 'Modifier le statut' : 'Ajouter un statut'}</legend>
                <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <label style={{ display: 'block' }}>
                        <span style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Code</span>
                        <input type="text" required value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} style={{ width: '100%', padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 4 }} />
                    </label>
                    <label style={{ display: 'block' }}>
                        <span style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Label</span>
                        <input type="text" required value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} style={{ width: '100%', padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 4 }} />
                    </label>
                    <label style={{ display: 'block' }}>
                        <span style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Couleur</span>
                        <input type="color" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} style={{ width: 50, height: 32, border: '1px solid #d1d5db', borderRadius: 4 }} />
                    </label>
                    <label style={{ display: 'block' }}>
                        <span style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Ordre</span>
                        <input type="number" value={form.order} onChange={e => setForm({ ...form, order: parseInt(e.target.value) || 0 })} style={{ width: '100%', padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 4 }} />
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <input type="checkbox" checked={form.vendorCanSet} onChange={e => setForm({ ...form, vendorCanSet: e.target.checked })} />
                        <span style={{ fontSize: 13 }}>Vendeur peut définir</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <input type="checkbox" checked={form.isFinal} onChange={e => setForm({ ...form, isFinal: e.target.checked })} />
                        <span style={{ fontSize: 13 }}>État final</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <input type="checkbox" checked={form.enabled} onChange={e => setForm({ ...form, enabled: e.target.checked })} />
                        <span style={{ fontSize: 13 }}>Actif</span>
                    </label>
                    <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 8, marginTop: 8 }}>
                        <button type="submit" style={{ padding: '8px 20px', background: '#f97316', color: 'white', border: 'none', borderRadius: 6, fontWeight: 'bold', cursor: 'pointer' }}>
                            {editingId ? 'Mettre à jour' : 'Créer'}
                        </button>
                        {editingId && <button type="button" onClick={resetForm} style={{ padding: '8px 20px', border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer', background: 'white' }}>Annuler</button>}
                    </div>
                </form>
            </fieldset>
        </div>
    );
}
