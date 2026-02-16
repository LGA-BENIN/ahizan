import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CREATE_REGISTRATION_FIELD, UPDATE_REGISTRATION_FIELD } from './queries';

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

interface FieldDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    field: any | null; // If null, we are creating
    addToast: (msg: string, type: 'success' | 'error') => void;
}

export function FieldDetailModal({ isOpen, onClose, field, addToast }: FieldDetailModalProps) {
    const queryClient = useQueryClient();
    const isEditing = !!field;

    const [formData, setFormData] = useState({
        name: '',
        label: '',
        type: 'text',
        options: '', // string representation "val:Label, val2:Label2"
        required: false,
        order: 0,
        placeholder: '',
        description: '',
        enabled: true,
    });

    useEffect(() => {
        if (field) {
            setFormData({
                name: field.name,
                label: field.label,
                type: field.type,
                options: field.options ? field.options.map((o: any) => `${o.value}:${o.label}`).join(', ') : '',
                required: field.required,
                order: field.order,
                placeholder: field.placeholder || '',
                description: field.description || '',
                enabled: field.enabled,
            });
        } else {
            setFormData({
                name: '',
                label: '',
                type: 'text',
                options: '',
                required: false,
                order: 0,
                placeholder: '',
                description: '',
                enabled: true,
            });
        }
    }, [field, isOpen]);

    const mutation = useMutation({
        mutationFn: (input: any) => {
            if (isEditing) {
                return fetchGraphQL(UPDATE_REGISTRATION_FIELD, { input: { ...input, id: field.id } });
            } else {
                return fetchGraphQL(CREATE_REGISTRATION_FIELD, { input });
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['registrationFields'] });
            addToast(isEditing ? 'Field updated' : 'Field created', 'success');
            onClose();
        },
        onError: (err: any) => {
            addToast(err.message, 'error');
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Parse options
        let options = null;
        if (formData.type === 'select' && formData.options) {
            options = formData.options.split(',').map(s => {
                const parts = s.split(':');
                return { value: parts[0].trim(), label: parts[1] ? parts[1].trim() : parts[0].trim() };
            });
        }

        mutation.mutate({
            ...formData,
            order: Number(formData.order),
            options,
        });
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
            <div style={{ background: 'white', padding: '24px', borderRadius: '8px', maxWidth: '500px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
                <h2 style={{ marginTop: 0 }}>{isEditing ? 'Edit Field' : 'New Field'}</h2>
                <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '12px' }}>

                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600 }}>Internal Name (Key)</label>
                        <input className="input" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} placeholder="e.g. tax_id" />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600 }}>Display Label</label>
                        <input required value={formData.label} onChange={e => setFormData({ ...formData, label: e.target.value })} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} placeholder="e.g. Tax ID Number" />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600 }}>Type</label>
                            <select value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}>
                                <option value="text">Text</option>
                                <option value="number">Number</option>
                                <option value="select">Select</option>
                                <option value="boolean">Checkbox</option>
                                <option value="date">Date</option>
                                <option value="file">File</option>
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600 }}>Order</label>
                            <input type="number" value={formData.order} onChange={e => setFormData({ ...formData, order: Number(e.target.value) })} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
                        </div>
                    </div>

                    {formData.type === 'select' && (
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600 }}>Options (value:Label, ...)</label>
                            <input value={formData.options} onChange={e => setFormData({ ...formData, options: e.target.value })} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} placeholder="us:USA, ca:Canada" />
                        </div>
                    )}

                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600 }}>Placeholder</label>
                        <input value={formData.placeholder} onChange={e => setFormData({ ...formData, placeholder: e.target.value })} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600 }}>Description/Help Text</label>
                        <input value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
                    </div>

                    <div style={{ display: 'flex', gap: '16px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input type="checkbox" checked={formData.required} onChange={e => setFormData({ ...formData, required: e.target.checked })} />
                            Required
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input type="checkbox" checked={formData.enabled} onChange={e => setFormData({ ...formData, enabled: e.target.checked })} />
                            Enabled
                        </label>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
                        <button type="button" onClick={onClose} style={{ padding: '8px 16px', border: '1px solid #ddd', background: 'white', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
                        <button type="submit" style={{ padding: '8px 16px', border: 'none', background: '#3b82f6', color: 'white', borderRadius: '4px', cursor: 'pointer' }}>{mutation.isPending ? 'Saving...' : 'Save'}</button>
                    </div>

                </form>
            </div>
        </div>
    );
}
