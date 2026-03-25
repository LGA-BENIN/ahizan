import { query } from '@/lib/vendure/api';
import { GetMyVendorOrdersQuery } from '@/lib/vendure/vendor-order-mutations';
import { getAuthToken } from '@/lib/auth';
import { formatPrice } from '@/lib/format';
import Link from 'next/link';
import { Suspense } from 'react';
import { OrderFilters } from '@/components/dashboard/order-filters';
import { OrderRowActions } from '@/components/dashboard/order-row-actions';

export default async function VendorOrdersPage({ searchParams }: { searchParams?: Promise<{ state?: string; sort?: string }> }) {
    const token = await getAuthToken();
    const params = searchParams ? await searchParams : {};

    const sortField = params.sort?.split('_')[0] || 'updatedAt';
    const sortDir = params.sort?.split('_')[1] || 'DESC';
    const sortObj: any = { [sortField]: sortDir };

    const filterObj: any = {};
    if (params.state) {
        filterObj.state = { eq: params.state };
    }

    const { data } = await query(GetMyVendorOrdersQuery, {
        options: { take: 50, sort: sortObj, ...(Object.keys(filterObj).length > 0 ? { filter: filterObj } : {}) }
    }, { token });
    const orders = (data as any).myVendorOrders?.items || [];

    const getStatusColor = (state: string) => {
        switch (state) {
            case 'PaymentSettled': return 'bg-green-100 text-green-800';
            case 'Shipped': return 'bg-blue-100 text-blue-800';
            case 'Delivered': return 'bg-purple-100 text-purple-800';
            case 'Cancelled': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusLabel = (state: string) => {
        switch (state) {
            case 'PaymentSettled': return 'Payé';
            case 'PaymentAuthorized': return 'Autorisé';
            case 'Shipped': return 'Expédié';
            case 'Delivered': return 'Livré';
            case 'Cancelled': return 'Annulé';
            case 'AddingItems': return 'En cours';
            case 'ArrangingPayment': return 'Paiement en attente';
            default: return state;
        }
    };

    const getSellerStatusBadge = (status?: string) => {
        const s = status || 'pending';
        switch (s) {
            case 'confirmed': return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">Confirmée</span>;
            case 'refused': return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">Refusée</span>;
            default: return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">En attente</span>;
        }
    };

    const getAdminStatusBadge = (status?: string) => {
        const s = status || 'pending';
        switch (s) {
            case 'shipped': return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-indigo-100 text-indigo-800">Expédiée</span>;
            case 'in_transit': return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">En transit</span>;
            case 'delivered': return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Livrée</span>;
            case 'cancelled': return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">Annulée</span>;
            default: return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">En attente</span>;
        }
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Mes Commandes</h1>
            </div>

            <Suspense fallback={null}>
                <OrderFilters />
            </Suspense>

            <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut Vendeur</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut Livraison</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {orders.map((order: any) => (
                            <tr key={order.id}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-gray-900">{order.code}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-gray-500">
                                        {new Date(order.updatedAt).toLocaleDateString()}
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-gray-900">
                                        {order.customer?.firstName} {order.customer?.lastName}
                                    </div>
                                    <div className="text-sm text-gray-500">{order.customer?.emailAddress}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-gray-900">
                                        {formatPrice(order.totalWithTax, order.currencyCode)}
                                    </div>
                                    <div className="text-xs text-gray-500">{order.lines.length} article(s)</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    {getSellerStatusBadge(order.customFields?.sellerStatus)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    {getAdminStatusBadge(order.customFields?.adminStatus)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                    <OrderRowActions 
                                        orderId={order.id} 
                                        sellerStatus={order.customFields?.sellerStatus} 
                                    />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {orders.length === 0 && (
                    <div className="p-10 text-center text-gray-500">
                        Vous n&apos;avez pas encore de commandes.
                    </div>
                )}
            </div>
        </div>
    );
}
