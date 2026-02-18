import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { GET_VENDORS, GET_VENDOR_DETAIL, UPDATE_VENDOR_STATUS, UPDATE_VENDOR } from './queries';

// --- Types & Interfaces ---
interface Toast {
    id: string;
    message: string;
    type: 'success' | 'error' | 'info';
}

interface VendorFilterState {
    searchTerm: string;
    status: string;
    zone: string;
    type: string;
    minRating: number | '';
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

// --- Toast Component ---
function ToastContainer({ toasts, removeToast }: { toasts: Toast[], removeToast: (id: string) => void }) {
    return (
        <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 2000, display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {toasts.map((toast) => (
                <div key={toast.id} onClick={() => removeToast(toast.id)} style={{
                    padding: '12px 24px',
                    borderRadius: '8px',
                    background: toast.type === 'success' ? '#059669' : toast.type === 'error' ? '#dc2626' : '#2563eb',
                    color: 'white',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                    cursor: 'pointer',
                    animation: 'slideUp 0.3s ease-out',
                    minWidth: '250px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <span>{toast.message}</span>
                    <span style={{ fontSize: '12px', opacity: 0.8 }}>✕</span>
                </div>
            ))}
            <style>{`@keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
        </div>
    );
}

// --- Vendor Detail Modal ---
function VendorDetailModal({ isOpen, onClose, vendorId, addToast }: { isOpen: boolean; onClose: () => void; vendorId: string | null; addToast: (msg: string, type: 'success' | 'error') => void }) {
    const queryClient = useQueryClient();
    const [commissionRate, setCommissionRate] = useState<string>('');

    const { data, isLoading } = useQuery({
        queryKey: ['vendor', vendorId],
        queryFn: () => fetchGraphQL(GET_VENDOR_DETAIL, { id: vendorId }),
        enabled: !!vendorId && isOpen,
    });

    useEffect(() => {
        if (data?.vendor?.commissionRate !== undefined) {
            setCommissionRate(data.vendor.commissionRate.toString());
        }
    }, [data]);

    const updateStatusMutation = useMutation({
        mutationFn: ({ status, reason }: { status: string; reason?: string }) =>
            fetchGraphQL(UPDATE_VENDOR_STATUS, { id: vendorId, status, reason }),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['vendor', vendorId] });
            queryClient.invalidateQueries({ queryKey: ['vendors'] });
            addToast(`Vendor status updated to ${variables.status}`, 'success');
        },
        onError: () => addToast('Failed to update status', 'error')
    });

    const updateVendorMutation = useMutation({
        mutationFn: (input: any) => fetchGraphQL(UPDATE_VENDOR, { id: vendorId, input }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['vendor', vendorId] });
            addToast('Commission rate saved successfully', 'success');
        },
        onError: () => addToast('Failed to save commission', 'error')
    });

    if (!isOpen) return null;

    const vendor = data?.vendor;

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, backdropFilter: 'blur(4px)'
        }} onClick={onClose}>
            <div style={{
                background: 'white', borderRadius: '16px', width: '90%', maxWidth: '800px', maxHeight: '90vh',
                overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', position: 'relative'
            }} onClick={e => e.stopPropagation()}>
                {isLoading ? <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div> : vendor ? (
                    <>
                        <div style={{ padding: '24px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'white' }}>
                            <h2 style={{ margin: 0 }}>Vendor Details</h2>
                            <button onClick={onClose} style={{ border: 'none', background: '#f3f4f6', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer' }}>✕</button>
                        </div>
                        <div style={{ padding: '32px' }}>
                            <div style={{ display: 'flex', gap: '24px', marginBottom: '24px' }}>
                                <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#eee', backgroundImage: vendor.logo ? `url(${vendor.logo.preview})` : undefined, backgroundSize: 'cover' }}></div>
                                <div>
                                    <h1 style={{ margin: '0 0 8px 0' }}>{vendor.name}</h1>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <span style={{ background: vendor.status === 'APPROVED' ? '#d1fae5' : '#fef3c7', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>{vendor.status}</span>
                                        <span style={{ background: '#e0e7ff', padding: '2px 8px', borderRadius: '4px', fontSize: '12px' }}>{vendor.zone || 'No Zone'}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Superadmin Controls */}
                            <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
                                <h3 style={{ marginTop: 0, fontSize: '16px' }}>🛡️ Superadmin Controls</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', marginBottom: '8px', color: '#64748b' }}>Action</label>
                                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                            {vendor.status === 'PENDING' && (
                                                <>
                                                    <button onClick={() => updateStatusMutation.mutate({ status: 'APPROVED' })} style={{ background: '#22c55e', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}>Approve</button>
                                                    <button onClick={() => {
                                                        const reason = prompt("Enter rejection reason:");
                                                        if (reason) updateStatusMutation.mutate({ status: 'REJECTED', reason });
                                                    }} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}>Reject</button>
                                                </>
                                            )}
                                            {vendor.status === 'APPROVED' && <button onClick={() => updateStatusMutation.mutate({ status: 'SUSPENDED' })} style={{ background: '#f59e0b', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}>Suspend</button>}
                                            {vendor.status === 'SUSPENDED' && <button onClick={() => updateStatusMutation.mutate({ status: 'APPROVED' })} style={{ background: '#22c55e', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}>Reactivate</button>}
                                            {vendor.status === 'REJECTED' && (
                                                <button onClick={() => updateStatusMutation.mutate({ status: 'PENDING' })} style={{ background: '#eab308', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}>Re-evaluate</button>
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '12px', marginBottom: '8px', color: '#64748b' }}>Commission (%)</label>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <input type="number" value={commissionRate} onChange={e => setCommissionRate(e.target.value)} style={{ padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', width: '80px' }} />
                                            <button onClick={() => {
                                                const rate = parseFloat(commissionRate);
                                                if (isNaN(rate) || rate < 0 || rate > 100) return addToast('Invalid percentage', 'error');
                                                updateVendorMutation.mutate({ commissionRate: rate });
                                            }} style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}>Save</button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div><strong>Email:</strong> {vendor.email}</div>
                                <div><strong>Phone:</strong> {vendor.phoneNumber}</div>
                                <div><strong>Address:</strong> {vendor.address}</div>
                                <div><strong>Joined:</strong> {new Date(vendor.createdAt).toLocaleDateString()}</div>
                            </div>
                        </div>
                    </>
                ) : null}
            </div>
        </div>
    );
}

// --- Main List Component ---
export function VendorListComponent() {
    const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const pageSize = 10;
    const [toasts, setToasts] = useState<Toast[]>([]);

    // Filters
    const [filters, setFilters] = useState<VendorFilterState>({
        searchTerm: '',
        status: '',
        zone: '',
        type: '',
        minRating: ''
    });

    const addToast = (message: string, type: 'success' | 'error' | 'info') => {
        const id = Math.random().toString(36).substring(7);
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
    };

    // Construct GraphQL variables dynamically
    const queryVariables = {
        options: {
            take: pageSize,
            skip: (page - 1) * pageSize,
            sort: { createdAt: 'DESC' },
            filter: {} as any
        }
    };

    if (filters.status) queryVariables.options.filter.status = { eq: filters.status };
    if (filters.zone) queryVariables.options.filter.zone = { contains: filters.zone };
    if (filters.type) queryVariables.options.filter.type = { eq: filters.type };
    if (filters.minRating !== '') queryVariables.options.filter.rating = { gte: Number(filters.minRating) };

    // Search logic (multi-field not natively supported by single contains, so we prioritize name, but if we had a dedicated search input we'd use it)
    // For now, we'll map searchTerm to Name Contains. To support email/phone, we'd need OR logic in backend or multiple inputs. 
    // The user requested "search email or phone". Vendre's StringOperators usually imply AND.
    // Solution: If searchTerm looks like email/phone, filter that. Otherwise filter name.
    if (filters.searchTerm) {
        if (filters.searchTerm.includes('@')) {
            queryVariables.options.filter.email = { contains: filters.searchTerm };
        } else if (filters.searchTerm.match(/^[0-9\+\-\s]+$/)) {
            queryVariables.options.filter.phoneNumber = { contains: filters.searchTerm };
        } else {
            queryVariables.options.filter.name = { contains: filters.searchTerm };
        }
    }

    const { data, isLoading, error } = useQuery({
        queryKey: ['vendors', page, filters],
        queryFn: () => fetchGraphQL(GET_VENDORS, queryVariables),
    });

    const { items = [], totalItems = 0 } = data?.vendors || {};
    const totalPages = Math.ceil(totalItems / pageSize);

    return (
        <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>
            <ToastContainer toasts={toasts} removeToast={(id) => setToasts(prev => prev.filter(t => t.id !== id))} />
            <VendorDetailModal isOpen={!!selectedVendorId} vendorId={selectedVendorId} onClose={() => setSelectedVendorId(null)} addToast={addToast} />

            <div style={{ marginBottom: '24px' }}>
                <h1 style={{ fontSize: '28px', color: '#1f2937', marginBottom: '8px' }}>Vendor Management</h1>
                <p style={{ color: '#6b7280' }}>Manage vendors, validations, and commissions.</p>
            </div>

            {/* Filter Bar */}
            <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e5e7eb', marginBottom: '24px', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'end' }}>
                <div style={{ flex: '1 1 300px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Search (Name, Email, Phone)</label>
                    <input
                        type="text"
                        placeholder="Search vendors..."
                        value={filters.searchTerm}
                        onChange={e => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                    />
                </div>
                <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Status</label>
                    <select
                        value={filters.status}
                        onChange={e => setFilters(prev => ({ ...prev, status: e.target.value }))}
                        style={{ padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db', minWidth: '140px' }}
                    >
                        <option value="">All Statuses</option>
                        <option value="PENDING">Pending</option>
                        <option value="APPROVED">Approved</option>
                        <option value="SUSPENDED">Suspended</option>
                    </select>
                </div>
                <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Type</label>
                    <select
                        value={filters.type}
                        onChange={e => setFilters(prev => ({ ...prev, type: e.target.value }))}
                        style={{ padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db', minWidth: '140px' }}
                    >
                        <option value="">All Types</option>
                        <option value="INDIVIDUAL">Individual</option>
                        <option value="BUSINESS">Business</option>
                    </select>
                </div>
                <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Zone</label>
                    <input
                        type="text"
                        placeholder="Filter by zone"
                        value={filters.zone}
                        onChange={e => setFilters(prev => ({ ...prev, zone: e.target.value }))}
                        style={{ padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                    />
                </div>
                <div>
                    <button
                        onClick={() => setFilters({ searchTerm: '', status: '', zone: '', type: '', minRating: '' })}
                        style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #d1d5db', background: 'white', color: '#666', cursor: 'pointer' }}
                    >
                        Reset
                    </button>
                </div>
            </div>

            {/* Loading State */}
            {isLoading && <div style={{ textAlign: 'center', padding: '40px' }}>Loading vendors...</div>}

            {/* Error State */}
            {error && <div style={{ padding: '20px', background: '#fee2e2', color: '#b91c1c', borderRadius: '8px' }}>Error: {(error as Error).message}</div>}

            {/* Vendor Grid */}
            {!isLoading && !error && (
                <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px', marginBottom: '24px' }}>
                        {items.length > 0 ? items.map((vendor: any) => (
                            <div key={vendor.id} onClick={() => setSelectedVendorId(vendor.id)} style={{
                                background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '24px', cursor: 'pointer', transition: 'box-shadow 0.2s', position: 'relative'
                            }}
                                onMouseEnter={e => e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0,0,0,0.1)'}
                                onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                                    <h3 style={{ margin: 0, fontSize: '18px', color: '#111827' }}>{vendor.name}</h3>
                                    <span style={{
                                        fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', textTransform: 'uppercase',
                                        background: vendor.status === 'APPROVED' ? '#dcfce7' : vendor.status === 'PENDING' ? '#fef9c3' : '#fee2e2',
                                        color: vendor.status === 'APPROVED' ? '#166534' : vendor.status === 'PENDING' ? '#854d0e' : '#991b1b'
                                    }}>{vendor.status}</span>
                                </div>
                                <div style={{ fontSize: '14px', color: '#6b7280', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <div>📍 {vendor.zone || 'No Zone'}</div>
                                    <div>⭐ {vendor.rating} Rating</div>
                                    <div>📅 Joined {new Date(vendor.createdAt).toLocaleDateString()}</div>
                                </div>
                            </div>
                        )) : (
                            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: '#9ca3af' }}>No vendors found matching your filters.</div>
                        )}
                    </div>

                    {/* Pagination */}
                    {totalItems > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px' }}>
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
