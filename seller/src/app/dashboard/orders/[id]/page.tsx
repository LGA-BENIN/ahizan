import { query } from '@/lib/vendure/api';
import { GetMyVendorOrderDetailQuery } from '@/lib/vendure/vendor-order-mutations';
import { getAuthToken } from '@/lib/auth';
import { formatPrice } from '@/lib/format';
import Link from 'next/link';
import { ArrowLeft, Package, User, MapPin, Clock } from 'lucide-react';
import OrderStatusActions from '@/components/dashboard/order-status-actions';
import { Button } from '@/components/ui/button';

export default async function VendorOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const token = await getAuthToken();

    // Fetch all orders and find the one matching the ID
    const { data } = await query(GetMyVendorOrderDetailQuery, { options: { take: 100 } }, { token }).catch((err) => {
        console.error('[VendorOrderDetailPage] Failed to fetch order details:', err);
        return { data: { myVendorOrders: { items: [], totalItems: 0 } } };
    });
    const orders = (data as any)?.myVendorOrders?.items || [];
    const order = orders.find((o: any) => o.id === id);

    if (!order) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
                <p className="text-muted-foreground font-medium">Commande introuvable.</p>
                <Link href="/dashboard/orders">
                    <Button variant="outline">Retour aux commandes</Button>
                </Link>
            </div>
        );
    }

    const getStatusColor = (state: string) => {
        switch (state) {
            case 'PaymentSettled': return 'bg-green-50 text-green-700 border-green-100 dark:bg-green-900/20 dark:text-green-400';
            case 'Shipped': return 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-900/20 dark:text-blue-400';
            case 'Delivered': return 'bg-purple-50 text-purple-700 border-purple-100 dark:bg-purple-900/20 dark:text-purple-400';
            case 'Cancelled': return 'bg-red-50 text-red-700 border-red-100 dark:bg-red-900/20 dark:text-red-400';
            default: return 'bg-muted text-muted-foreground border-border';
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
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div>
                <Link href="/dashboard/orders" className="flex items-center gap-2 text-brand-navy hover:underline mb-4 text-xs font-bold uppercase tracking-widest">
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Retour aux commandes
                </Link>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-3xl font-serif font-black tracking-tight text-foreground">Commande #{order.code}</h1>
                        <div className="flex items-center gap-3 mt-3">
                            <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-full border ${getStatusColor(order.state)}`}>
                                {getStatusLabel(order.state)}
                            </span>
                            <span className="text-[11px] text-muted-foreground font-bold flex items-center gap-1.5 uppercase">
                                <Clock className="w-3.5 h-3.5 text-brand-navy" />
                                {new Date(order.createdAt).toLocaleDateString('fr-FR', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    </div>

                    <div className="bg-muted/40 p-4 rounded-2xl border border-border">
                         <OrderStatusActions 
                            orderId={order.id} 
                            currentSellerStatus={order.customFields?.sellerStatus} 
                            currentAdminStatus={order.customFields?.adminStatus} 
                        />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Customer Info */}
                <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
                    <h2 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                        <User className="w-4 h-4 text-brand-navy" />
                        Client
                    </h2>
                    {order.customer ? (
                        <div className="space-y-3">
                            <p className="font-black text-lg text-foreground tracking-tight">
                                {order.customer.firstName} {order.customer.lastName}
                            </p>
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-muted-foreground underline decoration-brand-navy/20">{order.customer.emailAddress}</p>
                                {order.customer.phoneNumber && (
                                    <p className="text-sm font-bold text-foreground">{order.customer.phoneNumber}</p>
                                )}
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground italic">Non disponible</p>
                    )}
                </div>

                {/* Shipping Address */}
                <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
                    <h2 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-brand-navy" />
                        Livraison
                    </h2>
                    {order.shippingAddress && order.shippingAddress.streetLine1 ? (
                        <div className="space-y-1 text-sm font-medium text-foreground leading-relaxed">
                            {order.shippingAddress.fullName && (
                                <p className="font-black mb-1">{order.shippingAddress.fullName}</p>
                            )}
                            <p>{order.shippingAddress.streetLine1}</p>
                            {order.shippingAddress.streetLine2 && (
                                <p>{order.shippingAddress.streetLine2}</p>
                            )}
                            <p className="font-bold">
                                {[order.shippingAddress.city, order.shippingAddress.province, order.shippingAddress.postalCode]
                                    .filter(Boolean).join(', ')}
                            </p>
                            {order.shippingAddress.country && (
                                <p className="text-[10px] font-black uppercase text-muted-foreground mt-2">{order.shippingAddress.country}</p>
                            )}
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground italic">Non renseignée</p>
                    )}
                </div>

                {/* Order Summary */}
                <div className="bg-card rounded-2xl border border-border p-6 shadow-sm md:col-span-2 lg:col-span-1">
                    <h2 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                        <Package className="w-4 h-4 text-brand-navy" />
                        Paiement
                    </h2>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center py-2 border-b border-border/50">
                            <span className="text-xs font-bold text-muted-foreground uppercase">Sous-total</span>
                            <span className="text-sm font-bold">{formatPrice(order.subTotalWithTax)}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-border/50">
                            <span className="text-xs font-bold text-muted-foreground uppercase">Livraison</span>
                            <span className="text-sm font-bold">{formatPrice(order.shippingWithTax)}</span>
                        </div>
                        <div className="pt-2 flex justify-between items-center">
                            <span className="text-sm font-black text-brand-navy uppercase">Total</span>
                            <span className="text-2xl font-serif font-black text-brand-navy underline decoration-brand-red decoration-4 transition-all">{formatPrice(order.totalWithTax)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Line Items */}
            <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/20">
                    <h2 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">
                        Articles ({order.lines.length})
                    </h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-border">
                        <thead className="bg-muted/30">
                            <tr>
                                <th className="px-6 py-4 text-left text-[11px] font-black text-muted-foreground uppercase tracking-wider">Produit</th>
                                <th className="px-6 py-4 text-right text-[11px] font-black text-muted-foreground uppercase tracking-wider">Prix</th>
                                <th className="px-6 py-4 text-center text-[11px] font-black text-muted-foreground uppercase tracking-wider">Qté</th>
                                <th className="px-6 py-4 text-right text-[11px] font-black text-muted-foreground uppercase tracking-wider">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border bg-card">
                            {order.lines.map((line: any) => (
                                <tr key={line.id} className="group hover:bg-muted/10 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-4">
                                            {line.productVariant?.featuredAsset?.preview ? (
                                                <img
                                                    src={line.productVariant.featuredAsset.preview}
                                                    alt={line.productVariant.name}
                                                    className="w-12 h-12 rounded-xl object-cover border border-border group-hover:scale-110 transition-transform"
                                                />
                                            ) : (
                                                <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center text-muted-foreground font-black text-[10px]">
                                                    IMG
                                                </div>
                                            )}
                                            <div>
                                                <p className="text-sm font-black text-foreground group-hover:text-brand-navy transition-colors">{line.productVariant?.name}</p>
                                                {line.productVariant?.sku && (
                                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">{line.productVariant.sku}</p>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right text-sm font-bold text-foreground">
                                        {formatPrice(line.unitPriceWithTax)}
                                    </td>
                                    <td className="px-6 py-4 text-center text-sm font-black text-muted-foreground">
                                        {line.quantity}
                                    </td>
                                    <td className="px-6 py-4 text-right text-sm font-black text-brand-navy">
                                        {formatPrice(line.linePriceWithTax)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
