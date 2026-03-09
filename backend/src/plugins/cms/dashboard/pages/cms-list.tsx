import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { GET_PAGES } from '../queries';

function getAuthToken(): string | null {
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('vendure-auth-token') || key.includes('authToken') || key.includes('token'))) {
            let val = localStorage.getItem(key);
            if (val && val.startsWith('"') && val.endsWith('"')) {
                val = val.slice(1, -1);
            }
            if (val && !val.startsWith('{')) return val;
        }
    }
    return null;
}

// Helper for fetching GraphQL
async function fetchGraphQL(query: any, variables?: any) {
    const apiUrl = '/admin-api';
    const token = getAuthToken();

    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        credentials: 'include',
        body: JSON.stringify({ query: query.loc.source.body, variables }),
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text.substring(0, 200)}`);
    }

    const json = await response.json();
    if (json.errors) throw new Error(json.errors[0].message);
    return json.data;
}

export function CmsListComponent() {
    const [page, setPage] = useState(1);
    const pageSize = 10;

    const { data, isLoading, error } = useQuery({
        queryKey: ['cmsPages', page],
        queryFn: () => fetchGraphQL(GET_PAGES, {
            options: {
                take: pageSize,
                skip: (page - 1) * pageSize,
                sort: { createdAt: 'DESC' }
            }
        }),
    });

    if (isLoading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>;
    if (error) return <div style={{ padding: '20px', color: '#dc2626' }}>Error loading pages: {(error as Error).message}</div>;

    const items = data?.pages?.items || [];
    const totalItems = data?.pages?.totalItems || 0;
    const totalPages = Math.ceil(totalItems / pageSize);

    return (
        <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h1 style={{ fontSize: '24px', margin: 0 }}>CMS Pages</h1>
                <a
                    href="#/extensions/cms/cms/create"
                    style={{
                        background: '#1d4ed8',
                        color: 'white',
                        padding: '8px 16px',
                        borderRadius: '6px',
                        textDecoration: 'none',
                        fontWeight: 600
                    }}
                >
                    Create New Page
                </a>
            </div>

            <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                        <tr>
                            <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', color: '#6b7280', textTransform: 'uppercase' }}>Title</th>
                            <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', color: '#6b7280', textTransform: 'uppercase' }}>Slug</th>
                            <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', color: '#6b7280', textTransform: 'uppercase' }}>Type</th>
                            <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', color: '#6b7280', textTransform: 'uppercase' }}>Status</th>
                            <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', color: '#6b7280', textTransform: 'uppercase' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((page: any) => (
                            <tr key={page.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                                <td style={{ padding: '12px 24px', fontWeight: 500 }}>{page.title}</td>
                                <td style={{ padding: '12px 24px', fontFamily: 'monospace', color: '#6b7280' }}>{page.slug}</td>
                                <td style={{ padding: '12px 24px' }}>
                                    <span style={{ background: '#eff6ff', color: '#1d4ed8', padding: '2px 8px', borderRadius: '12px', fontSize: '12px' }}>{page.type}</span>
                                </td>
                                <td style={{ padding: '12px 24px' }}>
                                    <span style={{
                                        padding: '2px 8px',
                                        borderRadius: '12px',
                                        fontSize: '11px',
                                        fontWeight: 700,
                                        background: page.isActive ? '#dcfce7' : '#f3f4f6',
                                        color: page.isActive ? '#166534' : '#6b7280'
                                    }}>
                                        {page.isActive ? 'ACTIVE' : 'DRAFT'}
                                    </span>
                                </td>
                                <td style={{ padding: '12px 24px' }}>
                                    <a
                                        href={`#/extensions/cms/cms/${page.id}`}
                                        style={{ color: '#1d4ed8', textDecoration: 'none', fontSize: '14px', fontWeight: 500 }}
                                    >
                                        Edit
                                    </a>
                                </td>
                            </tr>
                        ))}
                        {items.length === 0 && (
                            <tr>
                                <td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>No pages found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalItems > pageSize && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginTop: '24px' }}>
                    <button
                        disabled={page === 1}
                        onClick={() => setPage(p => p - 1)}
                        style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #e5e7eb', background: page === 1 ? '#f3f4f6' : 'white', cursor: page === 1 ? 'not-allowed' : 'pointer' }}
                    >
                        Previous
                    </button>
                    <span style={{ fontSize: '14px', color: '#4b5563' }}>Page {page} of {totalPages}</span>
                    <button
                        disabled={page === totalPages}
                        onClick={() => setPage(p => p + 1)}
                        style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #e5e7eb', background: page === totalPages ? '#f3f4f6' : 'white', cursor: page === totalPages ? 'not-allowed' : 'pointer' }}
                    >
                        Next
                    </button>
                </div>
            )}
        </div>
    );
}

export default CmsListComponent;
