import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { GET_PRODUCTS } from './queries';

// --- Interfaces ---
interface Product {
    id: string;
    createdAt: string;
    name: string;
    slug: string;
    enabled: boolean;
    customFields?: {
        vendor?: {
            id: string;
            name: string;
            status: string;
            zone: string;
            logo?: { preview: string };
        };
    };
    featuredAsset?: { preview: string };
    variants: Array<{ price: number; currencyCode: string; stockLevel: string }>;
}

// --- GraphQL Fetcher ---
async function fetchGraphQL(query: any, variables?: any) {
    const apiUrl = 'http://localhost:3000/admin-api';
    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

// --- ProductList Component ---
export function ProductListComponent() {
    const [page, setPage] = useState(1);
    const pageSize = 10;
    const [searchTerm, setSearchTerm] = useState('');
    const [vendorFilter, setVendorFilter] = useState('');

    // Setup Query Variables
    const queryVariables = {
        options: {
            take: pageSize,
            skip: (page - 1) * pageSize,
            sort: { createdAt: 'DESC' },
            filter: {} as any
        }
    };

    if (searchTerm) {
        queryVariables.options.filter.name = { contains: searchTerm };
    }

    // Note: Filtering by relation (customFields.vendor.name) might not be directly supported 
    // by standard ProductListFilter without extra backend config. 
    // For now we fetch and client-side filter if needed, or just display.
    // Ideally we'd add `vendorId` filter to ProductListFilter in backend.

    const { data, isLoading, error } = useQuery({
        queryKey: ['products', page, searchTerm],
        queryFn: () => fetchGraphQL(GET_PRODUCTS, queryVariables),
    });

    const { items = [], totalItems = 0 } = data?.publicProducts || {};
    const totalPages = Math.ceil(totalItems / pageSize);

    // Client-side filtering for vendor if standard API doesn't support deep filter yet
    // (Optimization: Move to backend filter later)
    const displayItems = vendorFilter
        ? items.filter((p: Product) => p.customFields?.vendor?.name.toLowerCase().includes(vendorFilter.toLowerCase()))
        : items;

    // Helper to get price range
    const getPriceDisplay = (variants: Product['variants']) => {
        if (!variants || variants.length === 0) return 'N/A';
        const prices = variants.map(v => v.price);
        const min = Math.min(...prices);
        const max = Math.max(...prices);
        const currency = variants[0].currencyCode;
        if (min === max) return `${(min / 100).toFixed(2)} ${currency}`;
        return `${(min / 100).toFixed(2)} - ${(max / 100).toFixed(2)} ${currency}`;
    };

    const getStockLevel = (variants: Product['variants']) => {
        if (!variants || variants.length === 0) return 0;
        // Summing purely numeric stock levels would require exact connection logic, 
        // but 'stockLevel' is often a string ('IN_STOCK', 'OUT_OF_STOCK') or number depending on config.
        // Assuming it returns a number or string. Let's just count variants for now or show first.
        return variants.reduce((acc, v) => acc + (Number(v.stockLevel) || 0), 0);
    };

    return (
        <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>

            <div style={{ marginBottom: '24px' }}>
                <h1 style={{ fontSize: '28px', color: '#1f2937', marginBottom: '8px' }}>Global Products</h1>
                <p style={{ color: '#6b7280' }}>View and manage products from all vendors.</p>
            </div>

            {/* Filter Bar */}
            <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e5e7eb', marginBottom: '24px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '200px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Search Product</label>
                    <input
                        type="text"
                        placeholder="Product name..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                    />
                </div>
                <div style={{ flex: 1, minWidth: '200px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Filter by Vendor</label>
                    <input
                        type="text"
                        placeholder="Vendor name..."
                        value={vendorFilter}
                        onChange={e => setVendorFilter(e.target.value)}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                    />
                </div>
            </div>

            {isLoading && <div style={{ textAlign: 'center', padding: '40px' }}>Loading products...</div>}
            {error && <div style={{ padding: '20px', background: '#fee2e2', color: '#b91c1c', borderRadius: '8px' }}>Error: {(error as Error).message}</div>}

            {!isLoading && !error && (
                <>
                    <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                                <tr>
                                    <th style={{ padding: '16px', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Image</th>
                                    <th style={{ padding: '16px', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Product Name</th>
                                    <th style={{ padding: '16px', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Vendor</th>
                                    <th style={{ padding: '16px', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Price</th>
                                    <th style={{ padding: '16px', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {displayItems.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>No products found.</td>
                                    </tr>
                                ) : (
                                    displayItems.map((product: Product) => (
                                        <tr key={product.id} style={{ borderBottom: '1px solid #e5e7eb', transition: 'background 0.1s' }} onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'} onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                                            <td style={{ padding: '16px' }}>
                                                <div style={{ width: '48px', height: '48px', borderRadius: '8px', background: '#f3f4f6', backgroundImage: product.featuredAsset ? `url(${product.featuredAsset.preview})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center', border: '1px solid #e5e7eb' }}>
                                                    {!product.featuredAsset && <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: '20px' }}>📦</span>}
                                                </div>
                                            </td>
                                            <td style={{ padding: '16px' }}>
                                                <div style={{ fontWeight: 600, color: '#111827' }}>{product.name}</div>
                                                <div style={{ fontSize: '12px', color: '#6b7280' }}>SKU: {product.slug}</div>
                                            </td>
                                            <td style={{ padding: '16px' }}>
                                                {product.customFields?.vendor ? (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#e5e7eb', backgroundImage: product.customFields.vendor.logo ? `url(${product.customFields.vendor.logo.preview})` : undefined, backgroundSize: 'cover' }}></div>
                                                        <div>
                                                            <div style={{ fontWeight: 500, color: '#374151', fontSize: '14px' }}>{product.customFields.vendor.name}</div>
                                                            <div style={{ fontSize: '11px', color: '#6b7280' }} title="Zone">{product.customFields.vendor.zone}</div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>No Vendor</span>
                                                )}
                                            </td>
                                            <td style={{ padding: '16px', fontWeight: 500 }}>
                                                {getPriceDisplay(product.variants)}
                                            </td>
                                            <td style={{ padding: '16px' }}>
                                                <span style={{
                                                    padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600,
                                                    background: product.enabled ? '#dcfce7' : '#f3f4f6',
                                                    color: product.enabled ? '#166534' : '#6b7280'
                                                }}>
                                                    {product.enabled ? 'Active' : 'Draft'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalItems > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginTop: '24px' }}>
                            <button
                                disabled={page === 1}
                                onClick={() => setPage(p => p - 1)}
                                style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #e5e7eb', background: page === 1 ? '#f3f4f6' : 'white', cursor: page === 1 ? 'not-allowed' : 'pointer' }}
                            >
                                Previous
                            </button>
                            <span style={{ color: '#4b5563' }}>Page {page} of {totalPages}</span>
                            <button
                                disabled={page === totalPages}
                                onClick={() => setPage(p => p + 1)}
                                style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #e5e7eb', background: page === totalPages ? '#f3f4f6' : 'white', cursor: page === totalPages ? 'not-allowed' : 'pointer' }}
                            >
                                Next
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
