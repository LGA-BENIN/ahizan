import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import {
    GET_PAGE,
    UPDATE_PAGE,
    CREATE_PAGE,
    CREATE_SECTION,
    UPDATE_SECTION,
    DELETE_SECTION
} from '../queries';

// Helper for fetching GraphQL with Vendure auth token
function getAuthToken(): string | null {
    // Vendure dashboard stores the auth token in localStorage
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('vendure-auth-token') || key.includes('authToken') || key.includes('token'))) {
            const val = localStorage.getItem(key);
            if (val && !val.startsWith('{')) return val;
        }
    }
    return null;
}

async function fetchGraphQL(query: any, variables?: any) {
    const apiUrl = 'http://localhost:3000/admin-api';
    const token = getAuthToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ query: query.loc.source.body, variables }),
    });
    const json = await response.json();
    if (json.errors) throw new Error(json.errors[0].message);
    return json.data;
}

export function CmsDetailComponent() {
    const { id } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const isNew = id === 'create';

    const [formData, setFormData] = useState({
        title: '',
        slug: '',
        isActive: true,
        type: 'CUSTOM'
    });

    const [sections, setSections] = useState<any[]>([]);
    const [newSectionType, setNewSectionType] = useState('HERO');
    const [toasts, setToasts] = useState<any[]>([]);

    const addToast = (message: string, type: 'success' | 'error') => {
        const tid = Math.random().toString(36).substring(7);
        setToasts(prev => [...prev, { id: tid, message, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== tid)), 3000);
    };

    const { data, isLoading } = useQuery({
        queryKey: ['cmsPage', id],
        queryFn: () => fetchGraphQL(GET_PAGE, { id }),
        enabled: !isNew,
    });

    const createPageMutation = useMutation({
        mutationFn: (input: any) => fetchGraphQL(CREATE_PAGE, { input }),
        onSuccess: (data) => {
            addToast('Page created', 'success');
            navigate(`/extensions/cms/cms/${data.createPage.id}`);
        },
        onError: (err: any) => addToast(err.message, 'error')
    });

    const updatePageMutation = useMutation({
        mutationFn: (input: any) => fetchGraphQL(UPDATE_PAGE, { input }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cmsPage', id] });
            addToast('Page updated', 'success');
        },
        onError: (err: any) => addToast(err.message, 'error')
    });

    const createSectionMutation = useMutation({
        mutationFn: (input: any) => fetchGraphQL(CREATE_SECTION, { input }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cmsPage', id] });
            addToast('Section added', 'success');
        },
        onError: (err: any) => addToast(err.message, 'error')
    });

    const updateSectionMutation = useMutation({
        mutationFn: (input: any) => fetchGraphQL(UPDATE_SECTION, { input }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cmsPage', id] });
            addToast('Section updated', 'success');
        },
        onError: (err: any) => addToast(err.message, 'error')
    });

    const deleteSectionMutation = useMutation({
        mutationFn: (sid: string) => fetchGraphQL(DELETE_SECTION, { id: sid }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cmsPage', id] });
            addToast('Section deleted', 'success');
        },
        onError: (err: any) => addToast(err.message, 'error')
    });

    useEffect(() => {
        if (data?.page) {
            setFormData({
                title: data.page.title,
                slug: data.page.slug,
                isActive: data.page.isActive,
                type: data.page.type
            });
            const sortedSections = [...(data.page.sections || [])].sort((a, b) => a.order - b.order);
            setSections(sortedSections);
        }
    }, [data]);

    const handleSave = () => {
        if (isNew) {
            createPageMutation.mutate(formData);
        } else {
            updatePageMutation.mutate({ id, ...formData });
        }
    };

    const handleAddSection = () => {
        if (isNew) {
            addToast('Save the page first', 'error');
            return;
        }
        createSectionMutation.mutate({
            pageId: id,
            type: newSectionType,
            order: sections.length,
            isActive: true,
            dataJson: '{}'
        });
    };

    const handleUpdateSectionData = (sid: string, dataJson: string) => {
        try {
            JSON.parse(dataJson);
            updateSectionMutation.mutate({ id: sid, dataJson });
        } catch (e) {
            addToast('Invalid JSON', 'error');
        }
    };

    if (isLoading && !isNew) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>;

    return (
        <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>
            {/* Toast Container */}
            <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 2000, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {toasts.map(t => (
                    <div key={t.id} style={{ padding: '12px 24px', borderRadius: '8px', background: t.type === 'success' ? '#059669' : '#dc2626', color: 'white', fontSize: '14px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                        {t.message}
                    </div>
                ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h1 style={{ fontSize: '24px', margin: 0 }}>{isNew ? 'Create Page' : `Edit Page: ${formData.title}`}</h1>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                        onClick={() => navigate('/extensions/cms/cms')}
                        style={{ background: 'white', border: '1px solid #d1d5db', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }}
                    >
                        Back
                    </button>
                    <button
                        onClick={handleSave}
                        style={{ background: '#1d4ed8', color: 'white', border: 'none', padding: '8px 24px', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
                    >
                        {isNew ? 'Create' : 'Save'}
                    </button>
                </div>
            </div>

            <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>General Settings</h2>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#4b5563', marginBottom: '6px' }}>Title</label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#4b5563', marginBottom: '6px' }}>Slug</label>
                        <input
                            type="text"
                            value={formData.slug}
                            onChange={e => setFormData({ ...formData, slug: e.target.value })}
                            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                        />
                    </div>
                </div>
                <div style={{ marginTop: '16px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={formData.isActive}
                            onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                        />
                        <span style={{ fontSize: '14px' }}>Published (Visible on storefront)</span>
                    </label>
                </div>
            </div>

            {!isNew && (
                <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                        <h2 style={{ fontSize: '18px', margin: 0 }}>Sections</h2>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <select
                                value={newSectionType}
                                onChange={e => setNewSectionType(e.target.value)}
                                style={{ padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                            >
                                <option value="HERO">Hero Banner</option>
                                <option value="PRODUCT_LIST">Featured Products</option>
                                <option value="PROMO_BANNER">Promo Banner</option>
                                <option value="CATEGORY_GRID">Category Grid</option>
                                <option value="POPUP">Popup Modal</option>
                            </select>
                            <button
                                onClick={handleAddSection}
                                style={{ background: '#059669', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: 500, cursor: 'pointer' }}
                            >
                                Add Section
                            </button>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {sections.map(section => (
                            <div key={section.id} style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px', background: '#f9fafb' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <span style={{ fontWeight: 700, fontSize: '14px', color: '#111827' }}>{section.type}</span>
                                        <span style={{ background: '#e0e7ff', color: '#4338ca', fontSize: '11px', padding: '2px 6px', borderRadius: '4px' }}>Order: {section.order}</span>
                                    </div>
                                    <button
                                        onClick={() => { if (confirm('Delete section?')) deleteSectionMutation.mutate(section.id) }}
                                        style={{ color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px' }}
                                    >
                                        Delete
                                    </button>
                                </div>
                                <textarea
                                    defaultValue={section.dataJson || '{}'}
                                    onBlur={e => handleUpdateSectionData(section.id, e.target.value)}
                                    style={{ width: '100%', minHeight: '120px', padding: '12px', fontFamily: 'monospace', fontSize: '13px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                                    placeholder="{}"
                                />
                                <p style={{ fontSize: '11px', color: '#6b7280', marginTop: '6px' }}>Edit JSON and click outside to save automatically.</p>
                            </div>
                        ))}
                        {sections.length === 0 && (
                            <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af', border: '2px dashed #e5e7eb', borderRadius: '8px' }}>
                                No sections added yet.
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default CmsDetailComponent;
