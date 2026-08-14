import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const GET_DELIVERY_ZONES = `query { 
    deliveryZones { 
        id name price maxPrice type centerLatitude centerLongitude radiusMeters isActive geoZone { id name } 
    } 
    geoZones { id name type }
}`;
const CREATE_DELIVERY_ZONE = `mutation CreateDeliveryZone($input: CreateDeliveryZoneInput!) { createDeliveryZone(input: $input) { id name } }`;
const UPDATE_DELIVERY_ZONE = `mutation UpdateDeliveryZone($id: ID!, $input: UpdateDeliveryZoneInput!) { updateDeliveryZone(id: $id, input: $input) { id name } }`;
const DELETE_DELIVERY_ZONE = `mutation DeleteDeliveryZone($id: ID!) { deleteDeliveryZone(id: $id) { result } }`;

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
    const [form, setForm] = useState({ 
        name: '', 
        price: 0, 
        maxPrice: 0,
        type: 'RADIUS',
        centerLatitude: '',
        centerLongitude: '',
        radiusMeters: 5000,
        geoZoneId: '',
        isActive: true 
    });

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

    const resetForm = () => { 
        setEditingId(null); 
        setForm({ 
            name: '', 
            price: 0, 
            maxPrice: 0,
            type: 'RADIUS',
            centerLatitude: '',
            centerLongitude: '',
            radiusMeters: 5000,
            geoZoneId: '',
            isActive: true 
        }); 
    };

    const startEdit = (z: any) => { 
        setEditingId(z.id); 
        setForm({ 
            name: z.name || '', 
            price: z.price || 0, 
            maxPrice: z.maxPrice || 0,
            type: z.type || 'RADIUS',
            centerLatitude: z.centerLatitude != null ? String(z.centerLatitude) : '',
            centerLongitude: z.centerLongitude != null ? String(z.centerLongitude) : '',
            radiusMeters: z.radiusMeters || 5000,
            geoZoneId: z.geoZone?.id || '',
            isActive: z.isActive !== false 
        }); 
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const payload: any = {
            name: form.name,
            price: Number(form.price) || 0,
            maxPrice: form.maxPrice ? Number(form.maxPrice) : null,
            type: form.type,
            centerLatitude: form.centerLatitude ? parseFloat(form.centerLatitude) : null,
            centerLongitude: form.centerLongitude ? parseFloat(form.centerLongitude) : null,
            radiusMeters: form.radiusMeters ? parseInt(String(form.radiusMeters)) : null,
            geoZoneId: form.geoZoneId || null,
            isActive: form.isActive
        };

        if (editingId) {
            updateMutation.mutate({ id: editingId, input: payload });
        } else {
            createMutation.mutate(payload);
        }
    };

    const zones = data?.deliveryZones || [];
    const geoZones = data?.geoZones || [];
    const formatPrice = (price: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(price);

    if (isLoading) return <div style={{ padding: 24 }}>Chargement...</div>;

    return (
        <div style={{ padding: 24, maxWidth: 950 }}>
            {toasts.map(t => (
                <div key={t.id} style={{ padding: '8px 16px', marginBottom: 8, borderRadius: 4, background: t.type === 'success' ? '#dcfce7' : '#fee2e2', color: t.type === 'success' ? '#166534' : '#991b1b' }}>
                    {t.message}
                </div>
            ))}
            <h2 style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 16 }}>🚚 Zones de Livraison & Prix Max Région</h2>
            <p style={{ color: '#6b7280', marginBottom: 24 }}>Définissez les zones géographiques avec leurs tarifs et le **Prix Max par Région / Rayon** pour éviter les prix de livraison abusifs.</p>

            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24 }}>
                <thead>
                    <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                        <th style={{ textAlign: 'left', padding: 8 }}>Nom</th>
                        <th style={{ textAlign: 'left', padding: 8 }}>Zone / Coordonnées</th>
                        <th style={{ textAlign: 'right', padding: 8 }}>Tarif Fixe</th>
                        <th style={{ textAlign: 'right', padding: 8 }}>Prix Max (Plafond)</th>
                        <th style={{ textAlign: 'center', padding: 8 }}>Actif</th>
                        <th style={{ textAlign: 'right', padding: 8 }}>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {zones.map((z: any) => (
                        <tr key={z.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                            <td style={{ padding: 8, fontWeight: 500 }}>{z.name}</td>
                            <td style={{ padding: 8, fontSize: 13 }}>
                                {z.geoZone ? (
                                    <span style={{ color: '#2563eb', fontWeight: 500 }}>📍 {z.geoZone.name}</span>
                                ) : z.centerLatitude && z.centerLongitude ? (
                                    <span>🌐 Lat: {z.centerLatitude}, Lng: {z.centerLongitude} ({z.radiusMeters ? z.radiusMeters / 1000 + ' km' : ''})</span>
                                ) : (
                                    <span style={{ color: '#9ca3af' }}>Globale</span>
                                )}
                            </td>
                            <td style={{ padding: 8, textAlign: 'right', fontWeight: 600 }}>{formatPrice(z.price)}</td>
                            <td style={{ padding: 8, textAlign: 'right', fontWeight: 700, color: z.maxPrice ? '#d97706' : '#9ca3af' }}>
                                {z.maxPrice ? formatPrice(z.maxPrice) : 'Aucun (Sans limite)'}
                            </td>
                            <td style={{ padding: 8, textAlign: 'center' }}>{z.isActive !== false ? '✅' : '❌'}</td>
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
                <legend style={{ fontWeight: 'bold', padding: '0 8px' }}>{editingId ? 'Modifier la zone' : 'Ajouter une zone de livraison / Prix Max'}</legend>
                <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <label style={{ display: 'block', gridColumn: '1 / -1' }}>
                        <span style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Nom de la Zone</span>
                        <input type="text" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="ex: Zone Littoral - Plafond Cotonou" style={{ width: '100%', padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 4 }} />
                    </label>

                    <label style={{ display: 'block' }}>
                        <span style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Plafond - Prix Max pour Région (FCFA)</span>
                        <input type="number" min="0" value={form.maxPrice} onChange={e => setForm({ ...form, maxPrice: parseInt(e.target.value) || 0 })} placeholder="ex: 2000" style={{ width: '100%', padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 4, fontWeight: 'bold', color: '#b45309' }} />
                        <span style={{ fontSize: 11, color: '#6b7280' }}>Définit le tarif maximal que la livraison ne dépassera jamais dans cette zone.</span>
                    </label>

                    <label style={{ display: 'block' }}>
                        <span style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Tarif Fixe spécifique Vendeur (FCFA)</span>
                        <input type="number" min="0" value={form.price} onChange={e => setForm({ ...form, price: parseInt(e.target.value) || 0 })} style={{ width: '100%', padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 4 }} />
                        <span style={{ fontSize: 11, color: '#9ca3af' }}>0 si calcul automatique par distance</span>
                    </label>

                    <label style={{ display: 'block' }}>
                        <span style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Zone Administrative (Optionnel)</span>
                        <select value={form.geoZoneId} onChange={e => setForm({ ...form, geoZoneId: e.target.value })} style={{ width: '100%', padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 4 }}>
                            <option value="">-- Choisir une GeoZone --</option>
                            {geoZones.map((gz: any) => (
                                <option key={gz.id} value={gz.id}>{gz.name} ({gz.type})</option>
                            ))}
                        </select>
                    </label>

                    <label style={{ display: 'block' }}>
                        <span style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Rayon de couverture (mètres)</span>
                        <input type="number" min="100" step="500" value={form.radiusMeters} onChange={e => setForm({ ...form, radiusMeters: parseInt(e.target.value) || 5000 })} style={{ width: '100%', padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 4 }} />
                        <span style={{ fontSize: 11, color: '#9ca3af' }}>ex: 5000 = 5 km</span>
                    </label>

                    <label style={{ display: 'block' }}>
                        <span style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Latitude du Centre (Optionnel)</span>
                        <input type="number" step="any" value={form.centerLatitude} onChange={e => setForm({ ...form, centerLatitude: e.target.value })} placeholder="ex: 6.3654" style={{ width: '100%', padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 4 }} />
                    </label>

                    <label style={{ display: 'block' }}>
                        <span style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Longitude du Centre (Optionnel)</span>
                        <input type="number" step="any" value={form.centerLongitude} onChange={e => setForm({ ...form, centerLongitude: e.target.value })} placeholder="ex: 2.4183" style={{ width: '100%', padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 4 }} />
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, gridColumn: '1 / -1' }}>
                        <input type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} />
                        <span style={{ fontSize: 13, fontWeight: 500 }}>Zone Actives</span>
                    </label>

                    <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 8, marginTop: 8 }}>
                        <button type="submit" style={{ padding: '8px 20px', background: '#f97316', color: 'white', border: 'none', borderRadius: 6, fontWeight: 'bold', cursor: 'pointer' }}>
                            {editingId ? 'Mettre à jour' : 'Créer Zone / Plafond'}
                        </button>
                        {editingId && <button type="button" onClick={resetForm} style={{ padding: '8px 20px', border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer', background: 'white' }}>Annuler</button>}
                    </div>
                </form>
            </fieldset>
        </div>
    );
}
