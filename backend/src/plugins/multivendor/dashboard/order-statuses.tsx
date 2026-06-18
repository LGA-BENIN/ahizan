import React, { useState } from 'react';
import { createPortal } from 'react-dom';
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

interface Toast {
    id: string;
    message: string;
    type: 'success' | 'error';
}

export function OrderStatusesComponent() {
    const queryClient = useQueryClient();
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [form, setForm] = useState({ code: '', label: '', color: '#6B7280', order: 0, vendorCanSet: false, isFinal: false, enabled: true });

    const addToast = (message: string, type: 'success' | 'error') => {
        const tid = Math.random().toString(36).substring(7);
        setToasts(prev => [...prev, { id: tid, message, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== tid)), 3000);
    };

    const { data, isLoading, error } = useQuery({
        queryKey: ['orderStatuses'],
        queryFn: () => fetchGraphQL(GET_ORDER_STATUSES),
    });

    const createMutation = useMutation({
        mutationFn: (input: any) => fetchGraphQL(CREATE_ORDER_STATUS, { input }),
        onSuccess: () => { 
            queryClient.invalidateQueries({ queryKey: ['orderStatuses'] }); 
            addToast('Statut créé avec succès!', 'success'); 
            resetForm(); 
        },
        onError: (e: any) => addToast(e.message, 'error'),
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, input }: any) => fetchGraphQL(UPDATE_ORDER_STATUS, { id, input }),
        onSuccess: () => { 
            queryClient.invalidateQueries({ queryKey: ['orderStatuses'] }); 
            addToast('Statut mis à jour avec succès!', 'success'); 
            resetForm(); 
        },
        onError: (e: any) => addToast(e.message, 'error'),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => fetchGraphQL(DELETE_ORDER_STATUS, { id }),
        onSuccess: () => { 
            queryClient.invalidateQueries({ queryKey: ['orderStatuses'] }); 
            addToast('Statut supprimé avec succès!', 'success'); 
        },
        onError: (e: any) => addToast(e.message, 'error'),
    });

    const resetForm = () => {
        setEditingId(null);
        setForm({ code: '', label: '', color: '#6B7280', order: 0, vendorCanSet: false, isFinal: false, enabled: true });
        setIsFormOpen(false);
    };

    const startEdit = (s: any) => {
        setEditingId(s.id);
        setForm({ code: s.code, label: s.label, color: s.color, order: s.order, vendorCanSet: s.vendorCanSet, isFinal: s.isFinal, enabled: s.enabled });
        setIsFormOpen(true);
    };

    const startCreate = () => {
        setEditingId(null);
        setForm({ code: '', label: '', color: '#6B7280', order: statuses.length + 1, vendorCanSet: false, isFinal: false, enabled: true });
        setIsFormOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const input = {
            code: form.code,
            label: form.label,
            color: form.color,
            order: form.order,
            vendorCanSet: form.vendorCanSet,
            isFinal: form.isFinal,
            enabled: form.enabled
        };

        if (editingId) {
            updateMutation.mutate({ id: editingId, input });
        } else {
            createMutation.mutate(input);
        }
    };

    const statuses = data?.orderStatuses || [];

    if (isLoading) return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px', color: '#4b5563', fontFamily: 'system-ui, sans-serif' }}>
            <div style={{ textAlign: 'center' }}>
                <div style={{ width: '30px', height: '30px', border: '2px solid #e5e7eb', borderTopColor: '#f97316', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
                <div>Chargement des statuts...</div>
            </div>
        </div>
    );

    return (
        <div style={{ padding: '24px', maxWidth: '1100px', margin: '0 auto', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif' }}>
            
            {/* Toast Container */}
            <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 2000, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {toasts.map(t => (
                    <div key={t.id} style={{ 
                        padding: '12px 24px', 
                        borderRadius: '8px', 
                        background: t.type === 'success' ? '#059669' : '#dc2626', 
                        color: 'white',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                        fontSize: '14px',
                        fontWeight: 500,
                        minWidth: '240px'
                    }}>
                        {t.message}
                    </div>
                ))}
            </div>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#111827', margin: 0 }}>📋 Statuts de Commande</h1>
                    <p style={{ color: '#6b7280', marginTop: '4px', fontSize: '14px' }}>
                        Gérez les statuts de commande configurables de la marketplace.
                    </p>
                </div>
                <button
                    onClick={startCreate}
                    style={{
                        padding: '10px 20px',
                        background: '#f97316',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: 600,
                        fontSize: '14px',
                        cursor: 'pointer',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                    }}
                >
                    Ajouter un statut
                </button>
            </div>

            {error && (
                <div style={{ padding: '16px', background: '#fee2e2', color: '#b91c1c', borderRadius: '8px', border: '1px solid #fca5a5', marginBottom: '24px', fontSize: '14px' }}>
                    <strong>Erreur de chargement:</strong> {(error as Error).message}
                </div>
            )}

            {/* List Container */}
            <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                        <tr>
                            <th style={{ padding: '14px 16px', fontSize: '12px', fontWeight: 600, color: '#4b5563' }}>Couleur</th>
                            <th style={{ padding: '14px 16px', fontSize: '12px', fontWeight: 600, color: '#4b5563' }}>Code</th>
                            <th style={{ padding: '14px 16px', fontSize: '12px', fontWeight: 600, color: '#4b5563' }}>Label</th>
                            <th style={{ padding: '14px 16px', fontSize: '12px', fontWeight: 600, color: '#4b5563', textAlign: 'center' }}>Ordre</th>
                            <th style={{ padding: '14px 16px', fontSize: '12px', fontWeight: 600, color: '#4b5563', textAlign: 'center' }}>Vendeur</th>
                            <th style={{ padding: '14px 16px', fontSize: '12px', fontWeight: 600, color: '#4b5563', textAlign: 'center' }}>État Final</th>
                            <th style={{ padding: '14px 16px', fontSize: '12px', fontWeight: 600, color: '#4b5563', textAlign: 'center' }}>Actif</th>
                            <th style={{ padding: '14px 16px', fontSize: '12px', fontWeight: 600, color: '#4b5563', textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {statuses.length === 0 ? (
                            <tr>
                                <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>Aucun statut configuré.</td>
                            </tr>
                        ) : (
                            statuses.map((s: any) => (
                                <tr key={s.id} style={{ borderBottom: '1px solid #e5e7eb', transition: 'background 0.1s' }} onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'} onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                                    <td style={{ padding: '14px 16px' }}>
                                        <span style={{ display: 'inline-block', width: '20px', height: '20px', borderRadius: '50%', background: s.color, border: '1px solid #d1d5db', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)' }} />
                                    </td>
                                    <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontSize: '13px', color: '#374151' }}>{s.code}</td>
                                    <td style={{ padding: '14px 16px', fontWeight: 600, fontSize: '14px', color: '#111827' }}>{s.label}</td>
                                    <td style={{ padding: '14px 16px', textAlign: 'center', fontSize: '13px', color: '#4b5563' }}>{s.order}</td>
                                    <td style={{ padding: '14px 16px', textAlign: 'center', fontSize: '14px' }}>{s.vendorCanSet ? '✅' : '—'}</td>
                                    <td style={{ padding: '14px 16px', textAlign: 'center', fontSize: '14px' }}>{s.isFinal ? '🏁' : '—'}</td>
                                    <td style={{ padding: '14px 16px', textAlign: 'center', fontSize: '14px' }}>{s.enabled ? '✅' : '❌'}</td>
                                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                                        <button 
                                            onClick={() => startEdit(s)} 
                                            style={{ marginRight: '8px', padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', background: 'white', fontWeight: 600, fontSize: '12px', color: '#374151' }}
                                        >
                                            Modifier
                                        </button>
                                        <button 
                                            onClick={() => { if (confirm('Supprimer ce statut ?')) deleteMutation.mutate(s.id); }} 
                                            style={{ padding: '6px 12px', border: 'none', borderRadius: '6px', cursor: 'pointer', background: '#fee2e2', color: '#b91c1c', fontWeight: 600, fontSize: '12px' }}
                                        >
                                            Supprimer
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal Form via Portal */}
            {isFormOpen && createPortal(
                <div 
                    style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        zIndex: 9999, backdropFilter: 'blur(4px)'
                    }}
                    onClick={resetForm}
                >
                    <div 
                        style={{
                            background: 'white', borderRadius: '16px', width: '90%', maxWidth: '600px',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', position: 'relative',
                            display: 'flex', flexDirection: 'column'
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div style={{ padding: '20px 24px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f9fafb', borderTopLeftRadius: '16px', borderTopRightRadius: '16px' }}>
                            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#111827', margin: 0 }}>
                                {editingId ? '✏️ Modifier le statut' : '➕ Ajouter un statut'}
                            </h2>
                            <button 
                                onClick={resetForm}
                                style={{ border: 'none', background: '#e5e7eb', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', color: '#4b5563' }}
                            >
                                ✕
                            </button>
                        </div>

                        {/* Form Body */}
                        <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#4b5563', marginBottom: '6px' }}>Code</label>
                                    <input 
                                        type="text" 
                                        required 
                                        value={form.code} 
                                        onChange={e => setForm({ ...form, code: e.target.value })} 
                                        style={{ padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', outline: 'none' }} 
                                    />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#4b5563', marginBottom: '6px' }}>Label</label>
                                    <input 
                                        type="text" 
                                        required 
                                        value={form.label} 
                                        onChange={e => setForm({ ...form, label: e.target.value })} 
                                        style={{ padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', outline: 'none' }} 
                                    />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#4b5563', marginBottom: '6px' }}>Couleur</label>
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                        <input 
                                            type="color" 
                                            value={form.color} 
                                            onChange={e => setForm({ ...form, color: e.target.value })} 
                                            style={{ width: '48px', height: '38px', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '2px', cursor: 'pointer' }} 
                                        />
                                        <span style={{ fontSize: '13px', color: '#4b5563', fontFamily: 'monospace' }}>{form.color}</span>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#4b5563', marginBottom: '6px' }}>Ordre d'affichage</label>
                                    <input 
                                        type="number" 
                                        value={form.order} 
                                        onChange={e => setForm({ ...form, order: parseInt(e.target.value) || 0 })} 
                                        style={{ padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', outline: 'none' }} 
                                    />
                                </div>
                            </div>

                            {/* Checkboxes Group */}
                            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', background: '#f9fafb', padding: '14px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 500, color: '#374151' }}>
                                    <input 
                                        type="checkbox" 
                                        checked={form.vendorCanSet} 
                                        onChange={e => setForm({ ...form, vendorCanSet: e.target.checked })} 
                                        style={{ width: '16px', height: '16px', cursor: 'pointer' }} 
                                    />
                                    Vendeur peut définir
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 500, color: '#374151' }}>
                                    <input 
                                        type="checkbox" 
                                        checked={form.isFinal} 
                                        onChange={e => setForm({ ...form, isFinal: e.target.checked })} 
                                        style={{ width: '16px', height: '16px', cursor: 'pointer' }} 
                                    />
                                    État final
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 500, color: '#374151' }}>
                                    <input 
                                        type="checkbox" 
                                        checked={form.enabled} 
                                        onChange={e => setForm({ ...form, enabled: e.target.checked })} 
                                        style={{ width: '16px', height: '16px', cursor: 'pointer' }} 
                                    />
                                    Actif
                                </label>
                            </div>

                            {/* Form Buttons */}
                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', borderTop: '1px solid #e5e7eb', paddingTop: '16px', marginTop: '8px' }}>
                                <button 
                                    type="button" 
                                    onClick={resetForm} 
                                    style={{ padding: '9px 18px', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', background: 'white', fontWeight: 600, fontSize: '13px', color: '#4b5563' }}
                                >
                                    Annuler
                                </button>
                                <button 
                                    type="submit" 
                                    style={{ padding: '9px 20px', background: '#f97316', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}
                                >
                                    {editingId ? 'Mettre à jour' : 'Créer'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

        </div>
    );
}
