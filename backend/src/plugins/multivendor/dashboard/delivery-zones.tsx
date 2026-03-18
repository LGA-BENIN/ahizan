import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const GET_DELIVERY_ZONES = `query { deliveryZones { id name code price enabled order } }`;
const CREATE_DELIVERY_ZONE = `mutation CreateDeliveryZone($input: CreateDeliveryZoneInput!) { createDeliveryZone(input: $input) { id name code } }`;
const UPDATE_DELIVERY_ZONE = `mutation UpdateDeliveryZone($id: ID!, $input: UpdateDeliveryZoneInput!) { updateDeliveryZone(id: $id, input: $input) { id name code } }`;
const DELETE_DELIVERY_ZONE = `mutation DeleteDeliveryZone($id: ID!) { deleteDeliveryZone(id: $id) }`;

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

export function DeliveryZonesComponent() {
    const queryClient = useQueryClient();
    const [toasts, setToasts] = useState<any[]>([]);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState({ name: '', code: '', price: 0, enabled: true, order: 0 });

    const addToast = (message: string, type: 'success' | 'error') => {
        const tid = Math.random().toString(36).substring(7);
        setToasts(prev => [...prev, { id: tid, message, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== tid)), 3000);
    };

    const { data, isLoading } = useQuery({
        queryKey: ['deliveryZones'],
        queryFn: () => fetchGraphQL(GET_DELIVERY_ZONES),
    });

    const createMutation = useMutation({
        mutationFn: (input: any) => fetchGraphQL(CREATE_DELIVERY_ZONE, { input }),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['deliveryZones'] }); addToast('Zone créée', 'success'); resetForm(); },
        onError: (e: any) => addToast(e.message, 'error'),
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, input }: any) => fetchGraphQL(UPDATE_DELIVERY_ZONE, { id, input }),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['deliveryZones'] }); addToast('Zone mise à jour', 'success'); resetForm(); },
        onError: (e: any) => addToast(e.message, 'error'),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => fetchGraphQL(DELETE_DELIVERY_ZONE, { id }),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['deliveryZones'] }); addToast('Zone supprimée', 'success'); },
        onError: (e: any) => addToast(e.message, 'error'),
    });

    const resetForm = () => { setEditingId(null); setForm({ name: '', code: '', price: 0, enabled: true, order: 0 }); };
    const startEdit = (z: any) => { setEditingId(z.id); setForm({ name: z.name, code: z.code, price: z.price, enabled: z.enabled, order: z.order }); };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingId) {
            updateMutation.mutate({ id: editingId, input: form });
        } else {
            createMutation.mutate(form);
        }
    };

    const zones = data?.deliveryZones || [];
    const formatPrice = (price: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(price / 100);

    if (isLoading) return <div style={{ padding: 24 }}>Chargement...</div>;

    return (
        <div style={{ padding: 24, maxWidth: 900 }}>
            {toasts.map(t => (
                <div key={t.id} style={{ padding: '8px 16px', marginBottom: 8, borderRadius: 4, background: t.type === 'success' ? '#dcfce7' : '#fee2e2', color: t.type === 'success' ? '#166534' : '#991b1b' }}>
                    {t.message}
                </div>
            ))}
            <h2 style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 16 }}>🚚 Zones de Livraison</h2>
            <p style={{ color: '#6b7280', marginBottom: 24 }}>Définissez les zones géographiques avec leurs tarifs de livraison. Les prix sont en centimes (ex: 100000 = 1 000 FCFA).</p>

            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24 }}>
                <thead>
                    <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                        <th style={{ textAlign: 'left', padding: 8 }}>Nom</th>
                        <th style={{ textAlign: 'left', padding: 8 }}>Code</th>
                        <th style={{ textAlign: 'right', padding: 8 }}>Tarif</th>
                        <th style={{ textAlign: 'center', padding: 8 }}>Ordre</th>
                        <th style={{ textAlign: 'center', padding: 8 }}>Actif</th>
                        <th style={{ textAlign: 'right', padding: 8 }}>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {zones.map((z: any) => (
                        <tr key={z.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                            <td style={{ padding: 8, fontWeight: 500 }}>{z.name}</td>
                            <td style={{ padding: 8, fontFamily: 'monospace' }}>{z.code}</td>
                            <td style={{ padding: 8, textAlign: 'right', fontWeight: 600 }}>{formatPrice(z.price)}</td>
                            <td style={{ padding: 8, textAlign: 'center' }}>{z.order}</td>
                            <td style={{ padding: 8, textAlign: 'center' }}>{z.enabled ? '✅' : '❌'}</td>
                            <td style={{ padding: 8, textAlign: 'right' }}>
                                <button onClick={() => startEdit(z)} style={{ marginRight: 8, padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: 4, cursor: 'pointer', background: 'white' }}>Modifier</button>
                                <button onClick={() => { if (confirm('Supprimer cette zone ?')) deleteMutation.mutate(z.id); }} style={{ padding: '4px 8px', border: '1px solid #fca5a5', borderRadius: 4, cursor: 'pointer', background: '#fef2f2', color: '#b91c1c' }}>Supprimer</button>
                            </td>
                        </tr>
                    ))}
                    {zones.length === 0 && (
                        <tr><td colSpan={6} style={{ padding: 24, textAlign: 'center', color: '#9ca3af' }}>Aucune zone de livraison. Créez-en une ci-dessous.</td></tr>
                    )}
                </tbody>
            </table>

            <fieldset style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 16 }}>
                <legend style={{ fontWeight: 'bold', padding: '0 8px' }}>{editingId ? 'Modifier la zone' : 'Ajouter une zone'}</legend>
                <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <label style={{ display: 'block' }}>
                        <span style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Nom</span>
                        <input type="text" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="ex: Cotonou Centre" style={{ width: '100%', padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 4 }} />
                    </label>
                    <label style={{ display: 'block' }}>
                        <span style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Code</span>
                        <input type="text" required value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="ex: cotonou-centre" style={{ width: '100%', padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 4 }} />
                    </label>
                    <label style={{ display: 'block' }}>
                        <span style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Tarif (centimes)</span>
                        <input type="number" min="0" value={form.price} onChange={e => setForm({ ...form, price: parseInt(e.target.value) || 0 })} style={{ width: '100%', padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 4 }} />
                        <span style={{ fontSize: 11, color: '#9ca3af' }}>100000 = 1 000 FCFA</span>
                    </label>
                    <label style={{ display: 'block' }}>
                        <span style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Ordre</span>
                        <input type="number" value={form.order} onChange={e => setForm({ ...form, order: parseInt(e.target.value) || 0 })} style={{ width: '100%', padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 4 }} />
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
