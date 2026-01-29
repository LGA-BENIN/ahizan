import React, { useState, useEffect } from 'react';

export const VendorListComponent = () => {
    const [vendors, setVendors] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Fetch vendors
        const fetchVendors = async () => {
            const token = localStorage.getItem('vendure-auth-token') || localStorage.getItem('auth-token');
            // Note: Token storage key might verify.

            const query = `
                query GetVendors {
                    vendors {
                        items {
                            id
                            name
                            status
                            phoneNumber
                            email
                        }
                        totalItems
                    }
                }
            `;

            try {
                const response = await fetch('/admin-api', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                    body: JSON.stringify({ query }),
                });
                const result = await response.json();
                if (result.data) {
                    setVendors(result.data.vendors.items);
                }
            } catch (e) {
                console.error('Error fetching vendors', e);
            } finally {
                setLoading(false);
            }
        };

        fetchVendors();
    }, []);

    return (
        <div className="page-block">
            <h1 className="text-2xl font-bold mb-4">Marketplace Vendors</h1>
            <div className="card">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {loading ? (
                                <tr><td colSpan={4} className="px-6 py-4 text-center">Loading...</td></tr>
                            ) : vendors.map(vendor => (
                                <tr key={vendor.id}>
                                    <td className="px-6 py-4 whitespace-nowrap">{vendor.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${vendor.status === 'APPROVED' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                            {vendor.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">{vendor.email}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <button className="text-indigo-600 hover:text-indigo-900 mr-2">Edit</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
