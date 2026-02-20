import { query } from '@/lib/vendure/api';
import { GetMyVendorOrderDetailQuery } from '@/lib/vendure/vendor-order-mutations';
import { getAuthToken } from '@/lib/auth';
import { formatPrice } from '@/lib/format';
import Link from 'next/link';
import { ArrowLeft, Package, User, MapPin, Clock } from 'lucide-react';
import OrderStatusActions from '@/components/dashboard/order-status-actions';

export default async function VendorOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const token = await getAuthToken();

    // Fetch all orders and find the one matching the ID
    const { data } = await query(GetMyVendorOrderDetailQuery, { options: { take: 100 } }, { token });
    const orders = (data as any).myVendorOrders?.items || [];
    const order = orders.find((o: any) => o.id === id);

    if (!order) {
        return (
            <div className="p-6">
                <Link href="/dashboard/orders" className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 mb-6">
                    <ArrowLeft className="w-4 h-4" />
                    Retour aux commandes
                </Link>
                <div className="bg-white rounded-lg shadow p-10 text-center">
                    <p className="text-gray-500 text-lg">Commande introuvable.</p>
                </div>
            </div>
        );
    }

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
            case 'Shipped': return 'Expédié';
            case 'Delivered': return 'Livré';
            case 'Cancelled': return 'Annulé';
            case 'AddingItems': return 'En cours';
            case 'ArrangingPayment': return 'Paiement en attente';
            default: return state;
        }
    };

    return (
        <div className="p-6 max-w-5xl">
            {/* Header */}
            <div className="mb-6">
                <Link href="/dashboard/orders" className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 mb-4 text-sm">
                    <ArrowLeft className="w-4 h-4" />
                    Retour aux commandes
                </Link>
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Commande #{order.code}</h1>
                        <div className="flex items-center gap-3 mt-2">
                            <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.state)}`}>
                                {getStatusLabel(order.state)}
                            </span>
                            <span className="text-sm text-gray-500 flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" />
                                {new Date(order.createdAt).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Order Status Actions */}
                <OrderStatusActions orderId={order.id} currentState={order.state} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Customer Info */}
                <div className="bg-white rounded-lg shadow p-5">
                    <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Client
                    </h2>
                    {order.customer ? (
                        <div className="space-y-2 text-sm">
                            <p className="font-medium text-gray-900">
                                {order.customer.firstName} {order.customer.lastName}
                            </p>
                            <p className="text-gray-600">{order.customer.emailAddress}</p>
                            {order.customer.phoneNumber && (
                                <p className="text-gray-600">{order.customer.phoneNumber}</p>
                            )}
                        </div>
                    ) : (
                        <p className="text-sm text-gray-400">Non disponible</p>
                    )}
                </div>

                {/* Shipping Address */}
                <div className="bg-white rounded-lg shadow p-5">
                    <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        Adresse de livraison
                    </h2>
                    {order.shippingAddress && order.shippingAddress.streetLine1 ? (
                        <div className="space-y-1 text-sm">
                            {order.shippingAddress.fullName && (
                                <p className="font-medium text-gray-900">{order.shippingAddress.fullName}</p>
                            )}
                            <p className="text-gray-600">{order.shippingAddress.streetLine1}</p>
                            {order.shippingAddress.streetLine2 && (
                                <p className="text-gray-600">{order.shippingAddress.streetLine2}</p>
                            )}
                            <p className="text-gray-600">
                                {[order.shippingAddress.city, order.shippingAddress.province, order.shippingAddress.postalCode]
                                    .filter(Boolean).join(', ')}
                            </p>
                            {order.shippingAddress.country && (
                                <p className="text-gray-600">{order.shippingAddress.country}</p>
                            )}
                            {order.shippingAddress.phoneNumber && (
                                <p className="text-gray-600">Tél: {order.shippingAddress.phoneNumber}</p>
                            )}
                        </div>
                    ) : (
                        <p className="text-sm text-gray-400">Non renseignée</p>
                    )}
                </div>

                {/* Order Summary */}
                <div className="bg-white rounded-lg shadow p-5">
                    <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <Package className="w-4 h-4" />
                        Résumé
                    </h2>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-600">Sous-total</span>
                            <span className="text-gray-900">{formatPrice(order.subTotalWithTax)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">Livraison</span>
                            <span className="text-gray-900">{formatPrice(order.shippingWithTax)}</span>
                        </div>
                        <div className="border-t pt-2 flex justify-between font-semibold">
                            <span className="text-gray-900">Total</span>
                            <span className="text-gray-900">{formatPrice(order.totalWithTax)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Line Items */}
            <div className="mt-6 bg-white rounded-lg shadow overflow-hidden">
                <div className="px-5 py-4 border-b">
                    <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
                        Articles ({order.lines.length})
                    </h2>
                </div>
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Produit</th>
                            <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Prix unitaire</th>
                            <th className="px-5 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Quantité</th>
                            <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {order.lines.map((line: any) => (
                            <tr key={line.id}>
                                <td className="px-5 py-4">
                                    <div className="flex items-center gap-3">
                                        {line.productVariant?.featuredAsset?.preview ? (
                                            <img
                                                src={line.productVariant.featuredAsset.preview}
                                                alt={line.productVariant.name}
                                                className="w-10 h-10 rounded object-cover"
                                            />
                                        ) : (
                                            <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center text-gray-400 text-xs">
                                                ?
                                            </div>
                                        )}
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">{line.productVariant?.name}</p>
                                            {line.productVariant?.sku && (
                                                <p className="text-xs text-gray-500">SKU: {line.productVariant.sku}</p>
                                            )}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-5 py-4 text-right text-sm text-gray-900">
                                    {formatPrice(line.unitPriceWithTax)}
                                </td>
                                <td className="px-5 py-4 text-center text-sm text-gray-900">
                                    {line.quantity}
                                </td>
                                <td className="px-5 py-4 text-right text-sm font-medium text-gray-900">
                                    {formatPrice(line.linePriceWithTax)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
