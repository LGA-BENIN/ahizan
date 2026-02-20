import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { GET_VENDOR_DETAIL, UPDATE_VENDOR, UPDATE_VENDOR_STATUS } from './queries';

// GraphQL fetcher for admin API
async function fetchGraphQL(query: any, variables?: any) {
    const apiUrl = 'http://localhost:3000/admin-api';
    console.log('[VendorDetail] Fetching from:', apiUrl);
    console.log('[VendorDetail] Current location:', window.location.href);

    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
            query: query.loc.source.body,
            variables,
        }),
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text.substring(0, 200)}`);
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        throw new Error(`Expected JSON but got ${contentType}: ${text.substring(0, 200)}`);
    }

    const json = await response.json();
    if (json.errors) {
        throw new Error(json.errors[0].message);
    }
    return json.data;
}

export function VendorDetailComponent() {
    // Get vendor ID from URL pathname
    // URL format: /admin/extensions/vendors/:id
    const [vendorId, setVendorId] = useState(() => {
        const pathname = window.location.pathname;
        console.log('[VendorDetail] Current pathname:', pathname);
        const parts = pathname.split('/');
        const id = parts[parts.length - 1];
        console.log('[VendorDetail] Extracted ID:', id);
        return id;
    });

    const queryClient = useQueryClient();

    // Listen for URL changes
    useEffect(() => {
        const handleLocationChange = () => {
            const pathname = window.location.pathname;
            console.log('[VendorDetail] Pathname changed:', pathname);
            const parts = pathname.split('/');
            const id = parts[parts.length - 1];
            console.log('[VendorDetail] New ID:', id);
            setVendorId(id);
        };

        // Listen for popstate (back/forward navigation)
        window.addEventListener('popstate', handleLocationChange);

        return () => window.removeEventListener('popstate', handleLocationChange);
    }, []);

    const { data, isLoading, error } = useQuery({
        queryKey: ['vendor', vendorId],
        queryFn: () => {
            console.log('[VendorDetail] Fetching vendor with ID:', vendorId);
            return fetchGraphQL(GET_VENDOR_DETAIL, { id: vendorId });
        },
        enabled: !!vendorId && vendorId !== 'vendors', // Don't fetch if ID is invalid
    });

    const updateVendorMutation = useMutation({
        mutationFn: (input: any) => fetchGraphQL(UPDATE_VENDOR, { id: vendorId, input }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['vendor', vendorId] });
        },
    });

    const updateStatusMutation = useMutation({
        mutationFn: (status: string) => fetchGraphQL(UPDATE_VENDOR_STATUS, { id, status }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['vendor', id] });
        },
    });

    const [formState, setFormState] = useState({
        description: '',
        zone: '',
        deliveryInfo: '',
        returnPolicy: '',
        commissionRate: 0,
        rating: 0,
        ratingCount: 0,
        logoId: null,
        coverImageId: null,
    });

    useEffect(() => {
        if (data?.vendor) {
            const v = data.vendor;
            setFormState({
                description: v.description || '',
                zone: v.zone || '',
                deliveryInfo: v.deliveryInfo || '',
                returnPolicy: v.returnPolicy || '',
                commissionRate: v.commissionRate || 0,
                rating: v.rating || 0,
                ratingCount: v.ratingCount || 0,
                logoId: v.logo?.id || null,
                coverImageId: v.coverImage?.id || null,
            });
        }
    }, [data]);

    if (isLoading) return <div>Loading...</div>;
    if (error) return <div>Error: {(error as Error).message}</div>;

    const vendor = data.vendor;

    const handleSave = async () => {
        try {
            await updateVendorMutation.mutateAsync({
                description: formState.description,
                zone: formState.zone,
                deliveryInfo: formState.deliveryInfo,
                returnPolicy: formState.returnPolicy,
                commissionRate: parseFloat(formState.commissionRate.toString()),
                rating: parseFloat(formState.rating).toString(),
                ratingCount: parseInt(formState.ratingCount.toString()),
            });
            alert('Saved successfully');
        } catch (e) {
            alert('Error saving: ' + (e as Error).message);
        }
    };

    const handleApprove = async () => {
        await updateStatusMutation.mutateAsync('APPROVED');
    };

    return (
        <div className="page-block">
            <div className="page-header is-flex is-justify-content-space-between is-align-items-center mb-4">
                <div>
                    <h1 className="title is-3 is-marginless">{vendor.name}</h1>
                    <span className={`tag ${vendor.status === 'APPROVED' ? 'is-success' : 'is-warning'} mt - 2`}>
                        {vendor.status}
                    </span>
                </div>
                <div className="buttons">
                    {vendor.status === 'PENDING' && (
                        <button
                            className={`button is - success ${updateStatusMutation.isPending ? 'is-loading' : ''} `}
                            onClick={handleApprove}
                        >
                            Approve Vendor
                        </button>
                    )}
                    <button
                        className={`button is - primary ${updateVendorMutation.isPending ? 'is-loading' : ''} `}
                        onClick={handleSave}
                    >
                        Save Changes
                    </button>
                </div>
            </div>

            <div className="columns">
                <div className="column is-8">
                    <div className="card">
                        <header className="card-header">
                            <p className="card-header-title">Public Profile</p>
                        </header>
                        <div className="card-content">
                            <div className="field">
                                <label className="label">Zone / Location</label>
                                <div className="control">
                                    <input
                                        className="input"
                                        type="text"
                                        value={formState.zone}
                                        onChange={e => setFormState({ ...formState, zone: e.target.value })}
                                    />
                                </div>
                                <p className="help">e.g. "Cotonou - Akpakpa"</p>
                            </div>

                            <div className="field">
                                <label className="label">Description</label>
                                <div className="control">
                                    <textarea
                                        className="textarea"
                                        rows={4}
                                        value={formState.description}
                                        onChange={e => setFormState({ ...formState, description: e.target.value })}
                                    ></textarea>
                                </div>
                            </div>

                            <div className="columns">
                                <div className="column">
                                    <div className="field">
                                        <label className="label">Commission Rate (%)</label>
                                        <input
                                            className="input"
                                            type="number"
                                            step="0.1"
                                            value={formState.commissionRate}
                                            onChange={e => setFormState({ ...formState, commissionRate: e.target.value as any })}
                                        />
                                    </div>
                                </div>
                                <div className="column">
                                    <div className="field">
                                        <label className="label">Rating (0-5)</label>
                                        <input
                                            className="input"
                                            type="number"
                                            step="0.1"
                                            value={formState.rating}
                                            onChange={e => setFormState({ ...formState, rating: e.target.value as any })}
                                        />
                                    </div>
                                </div>
                                <div className="column">
                                    <div className="field">
                                        <label className="label">Review Count</label>
                                        <input
                                            className="input"
                                            type="number"
                                            value={formState.ratingCount}
                                            onChange={e => setFormState({ ...formState, ratingCount: e.target.value as any })}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="card mt-4">
                        <header className="card-header">
                            <p className="card-header-title">Policies</p>
                        </header>
                        <div className="card-content">
                            <div className="field">
                                <label className="label">Delivery Info</label>
                                <textarea
                                    className="textarea"
                                    rows={2}
                                    value={formState.deliveryInfo}
                                    onChange={e => setFormState({ ...formState, deliveryInfo: e.target.value })}
                                ></textarea>
                            </div>
                            <div className="field">
                                <label className="label">Return Policy</label>
                                <textarea
                                    className="textarea"
                                    rows={2}
                                    value={formState.returnPolicy}
                                    onChange={e => setFormState({ ...formState, returnPolicy: e.target.value })}
                                ></textarea>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="column is-4">
                    <div className="card">
                        <header className="card-header">
                            <p className="card-header-title">Contact Info</p>
                        </header>
                        <div className="card-content">
                            <p><strong>Email:</strong> {vendor.email}</p>
                            <p><strong>Phone:</strong> {vendor.phoneNumber || '-'}</p>
                            <p><strong>Address:</strong> {vendor.address || '-'}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
