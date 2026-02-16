import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { GET_REGISTRATION_FIELDS, DELETE_REGISTRATION_FIELD, UPDATE_REGISTRATION_FIELD } from './queries';

// Helper for fetching GraphQL
async function fetchGraphQL(query: any, variables?: any) {
    const apiUrl = 'http://127.0.0.1:3000/admin-api';
    const token = localStorage.getItem('vendure-auth-token');
    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : '',
        },
        credentials: 'include',
        body: JSON.stringify({ query: query.loc.source.body, variables }),
    });
    const json = await response.json();
    if (json.errors) throw new Error(json.errors[0].message);
    return json.data;
}

export function RegistrationFieldsListComponent() {
    const [toasts, setToasts] = useState<Array<{ id: string, message: string, type: 'success' | 'error' }>>([]);
    const queryClient = useQueryClient();

    const addToast = (message: string, type: 'success' | 'error') => {
        const id = Math.random().toString(36).substring(7);
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
    };

    const { data, isLoading, error } = useQuery({
        queryKey: ['registrationFields'],
        queryFn: () => fetchGraphQL(GET_REGISTRATION_FIELDS),
    });

    const toggleMutation = useMutation({
        mutationFn: (variables: { id: string, enabled: boolean }) =>
            fetchGraphQL(UPDATE_REGISTRATION_FIELD, { input: { id: variables.id, enabled: variables.enabled } }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['registrationFields'] });
            addToast('Field status updated', 'success');
        },
        onError: (err: any) => addToast(err.message, 'error')
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => fetchGraphQL(DELETE_REGISTRATION_FIELD, { id }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['registrationFields'] });
            addToast('Field deleted', 'success');
        },
        onError: (err: any) => addToast(err.message, 'error')
    });

    const fields = data?.registrationFieldsAdmin || [];

    return (
        <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>
            {/* Toast Container */}
            <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 2000, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {toasts.map(t => (
                    <div key={t.id} style={{ padding: '12px 24px', borderRadius: '8px', background: t.type === 'success' ? '#059669' : '#dc2626', color: 'white' }}>
                        {t.message}
                    </div>
                ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: '24px' }}>
                <div>
                    <h1 style={{ fontSize: '24px', margin: '0 0 8px 0' }}>Page Inscription Settings</h1>
                    <p style={{ color: '#666' }}>Manage the fields displayed on the public registration page.</p>
                </div>
            </div>

            <div style={{ background: 'white', borderRadius: '8px', border: '1px solid #e5e7eb', overflow: 'hidden', marginTop: '24px' }}>
                {isLoading ? <div style={{ padding: '24px', textAlign: 'center' }}>Loading...</div> : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                            <tr>
                                <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', color: '#6b7280', textTransform: 'uppercase' }}>Label</th>
                                <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', color: '#6b7280', textTransform: 'uppercase' }}>Type</th>
                                <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', color: '#6b7280', textTransform: 'uppercase' }}>Name (Key)</th>
                                <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', color: '#6b7280', textTransform: 'uppercase' }}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {fields.map((field: any) => (
                                <tr key={field.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                                    <td style={{ padding: '12px 24px' }}>
                                        <div style={{ fontWeight: 600 }}>{field.label}</div>
                                        <div style={{ fontSize: '12px', color: '#6b7280' }}>Order: {field.order}</div>
                                    </td>
                                    <td style={{ padding: '12px 24px' }}>
                                        <span style={{ background: '#eff6ff', color: '#1d4ed8', padding: '2px 8px', borderRadius: '12px', fontSize: '12px' }}>{field.type}</span>
                                    </td>
                                    <td style={{ padding: '12px 24px', fontFamily: 'monospace', fontSize: '12px' }}>{field.name}</td>
                                    <td style={{ padding: '12px 24px' }}>
                                        <label style={{ position: 'relative', display: 'inline-block', width: '40px', height: '24px', cursor: 'pointer' }}>
                                            <input
                                                type="checkbox"
                                                style={{ opacity: 0, width: 0, height: 0 }}
                                                checked={field.enabled}
                                                onChange={(e) => {
                                                    toggleMutation.mutate({ id: field.id, enabled: e.target.checked });
                                                }}
                                            />
                                            <span style={{
                                                position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                                                backgroundColor: field.enabled ? '#10b981' : '#ccc',
                                                transition: '.4s', borderRadius: '34px'
                                            }}></span>
                                            <span style={{
                                                position: 'absolute', content: '""', height: '16px', width: '16px', left: '4px', bottom: '4px',
                                                backgroundColor: 'white', transition: '.4s', borderRadius: '50%',
                                                transform: field.enabled ? 'translateX(16px)' : 'translateX(0)'
                                            }}></span>
                                        </label>
                                        <span style={{ marginLeft: '8px', fontSize: '12px', color: '#6b7280', verticalAlign: 'top', lineHeight: '24px' }}>
                                            {field.enabled ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {fields.length === 0 && (
                                <tr>
                                    <td colSpan={4} style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>No fields configured yet.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
