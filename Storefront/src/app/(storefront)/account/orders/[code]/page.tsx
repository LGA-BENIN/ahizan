import type {Metadata} from 'next';
import {ChevronLeft} from 'lucide-react';
import {query} from '@/lib/vendure/api';
import {GetOrderDetailQuery} from '@/lib/vendure/queries';
import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Separator} from '@/components/ui/separator';
import Image from 'next/image';
import {getActiveCustomer} from "@/lib/vendure/actions";
import {notFound, redirect} from "next/navigation";
import {Price} from '@/components/commerce/price';
import {OrderStatusBadge} from '@/components/commerce/order-status-badge';
import {formatDate} from '@/lib/format';
import { OrderSubOrdersTracking } from './OrderSubOrdersTracking';
import Link from "next/link";

type OrderDetailPageProps = any;

export async function generateMetadata({params}: OrderDetailPageProps): Promise<Metadata> {
    const {code} = await params;
    return {
        title: `Commande ${code}`,
    };
}

export default async function OrderDetailPage(props: any) {
    const params = await props.params;
    const {code} = params;
    const activeCustomer = await getActiveCustomer();

    const {data} = await query(
        GetOrderDetailQuery,
        {code},
        {useAuthToken: true, fetch: {}}
    );

    if (!data?.orderByCode) {
        return redirect('/account/orders');
    }

    if (data.orderByCode.customer?.id !== activeCustomer?.id) {
        return notFound();
    }

    const order = data.orderByCode;

    let vMap: any = {};
    const vsStr = order.customFields?.vendorStatuses || order.customFields?.vendorstatuses;
    if (vsStr) {
        try { vMap = typeof vsStr === 'string' ? JSON.parse(vsStr) : vsStr; } catch(e) {}
    }

    const getLineStatus = (line: any) => {
        const vStatus = line.customFields?.sellerStatus || 'pending';
        if (vStatus === 'cancelled') return { text: '❌ Annulé par le client', color: 'bg-rose-100 text-rose-800 border-rose-200' };
        if (vStatus === 'confirmed') return { text: '✅ Confirmé par le vendeur', color: 'bg-green-100 text-green-800 border-green-200' };
        if (vStatus === 'refused' || vStatus === 'reassigning') return { text: '⏳ En cours de réassignation', color: 'bg-amber-100 text-amber-800 border-amber-200' };
        if (vStatus === 'reassigned_to_other') return { text: '❌ Annulé (Réassigné)', color: 'bg-red-100 text-red-800 border-red-200' };
        return { text: '⏳ En attente de confirmation', color: 'bg-blue-100 text-blue-800 border-blue-200' };
    };

    return (
        <div>
            <div className="mb-6">
                <Button variant="ghost" size="sm" asChild className="mb-4">
                    <Link href="/account/orders">
                        <ChevronLeft className="h-4 w-4 mr-2"/>
                        Retour aux commandes
                    </Link>
                </Button>
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">Commande {order.code}</h1>
                        <p className="text-muted-foreground mt-1">
                            Passée le {formatDate(order.createdAt, 'long')}
                        </p>
                    </div>
                    <OrderStatusBadge state={order.state}/>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Order Items and Totals */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Multi-Vendor Sub-Orders Tracking & Cancellation Acceptance */}
                    <OrderSubOrdersTracking order={order} />

                    {/* Order Items */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Articles commandés</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {(order.lines || []).map((line: any) => {
                                    const statusBadge = getLineStatus(line);
                                    const prodName = line.productVariant?.product?.name || line.productVariant?.name || 'Produit';
                                    const prodSlug = line.productVariant?.product?.slug || '';
                                    const imgUrl = line.productVariant?.product?.featuredAsset?.preview || line.productVariant?.featuredAsset?.preview;
                                    const sku = line.productVariant?.sku || 'N/A';

                                    const isCancelled = line.customFields?.sellerStatus === 'cancelled';

                                    return (
                                    <div key={line.id} className={`flex gap-4 ${isCancelled ? 'opacity-60 grayscale' : ''}`}>
                                        <div
                                            className="relative h-20 w-20 rounded-md overflow-hidden bg-gray-100 flex-shrink-0">
                                            {imgUrl ? (
                                                <Image
                                                    src={imgUrl}
                                                    alt={prodName}
                                                    fill
                                                    className="object-cover"
                                                />
                                            ) : null}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                {prodSlug ? (
                                                    <Link
                                                        href={`/product/${prodSlug}`}
                                                        className={`font-medium hover:underline ${isCancelled ? 'line-through' : ''}`}
                                                    >
                                                        {prodName}
                                                    </Link>
                                                ) : (
                                                    <span className={`font-medium ${isCancelled ? 'line-through' : ''}`}>{prodName}</span>
                                                )}
                                                {statusBadge && (
                                                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${statusBadge.color}`}>
                                                        {statusBadge.text}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                {line.productVariant?.name || prodName}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                SKU: {sku}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className={`font-medium ${isCancelled ? 'line-through' : ''}`}>
                                                <Price value={line.linePriceWithTax || (line.listPrice * line.quantity) || 0} currencyCode={order.currencyCode}/>
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                Qté : {line.quantity} × <Price value={line.unitPriceWithTax || line.listPrice || 0}
                                                                              currencyCode={order.currencyCode}/>
                                            </p>
                                        </div>
                                    </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Order Totals */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Récapitulatif de la commande</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Sous-total</span>
                                    <span><Price value={order.subTotalWithTax}
                                                 currencyCode={order.currencyCode}/></span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Livraison</span>
                                    <span><Price value={order.shippingWithTax}
                                                 currencyCode={order.currencyCode}/></span>
                                </div>
                                {order.discounts.length > 0 && (
                                    <>
                                        {order.discounts.map((discount: any, idx: any) => (
                                            <div key={idx} className="flex justify-between text-sm">
                                                <span className="text-muted-foreground">
                                                    {discount.description}
                                                </span>
                                                <span className="text-green-600">
                                                    -<Price value={discount.amountWithTax}
                                                            currencyCode={order.currencyCode}/>
                                                </span>
                                            </div>
                                        ))}
                                    </>
                                )}
                                <Separator className="my-2"/>
                                <div className="flex justify-between font-bold text-lg">
                                    <span>Total</span>
                                    <span><Price value={order.totalWithTax} currencyCode={order.currencyCode}/></span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column - Shipping, Billing, Payment */}
                <div className="space-y-6">
                    {/* Delivery & Shipping Tracking Status */}
                    <Card className="border-2 border-primary/20 shadow-sm overflow-hidden">
                        <CardHeader className="bg-primary/5 pb-3">
                            <CardTitle className="text-base flex items-center justify-between">
                                <span>Suivi & Statut de livraison</span>
                                <Badge className={
                                    order.customFields?.adminStatus === 'delivered' ? 'bg-emerald-600' :
                                    order.customFields?.adminStatus === 'shipped' || order.customFields?.adminStatus === 'in_transit' ? 'bg-blue-600' :
                                    order.customFields?.adminStatus === 'cancelled' ? 'bg-rose-600' : 'bg-amber-600'
                                }>
                                    {
                                        order.customFields?.adminStatus === 'delivered' ? 'Livrée' :
                                        order.customFields?.adminStatus === 'shipped' ? 'Expédiée' :
                                        order.customFields?.adminStatus === 'in_transit' ? 'En transit' :
                                        order.customFields?.adminStatus === 'cancelled' ? 'Annulée' : 'En attente d\'expédition'
                                    }
                                </Badge>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-3 text-sm">
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-muted-foreground font-medium">Validation Vendeur :</span>
                                <span className="font-bold text-foreground">
                                    {
                                        order.customFields?.sellerStatus === 'confirmed' ? '✅ Confirmée' :
                                        order.customFields?.sellerStatus === 'refused' ? '❌ Refusée' : '⏳ En attente'
                                    }
                                </span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-muted-foreground font-medium">Statut d'expédition :</span>
                                <span className="font-bold text-foreground">
                                    {
                                        order.customFields?.adminStatus === 'delivered' ? '📦 Colis Livré' :
                                        order.customFields?.adminStatus === 'shipped' ? '🚚 Expédiée' :
                                        order.customFields?.adminStatus === 'in_transit' ? '✈️ En transit' :
                                        order.customFields?.adminStatus === 'cancelled' ? '❌ Annulée' : '⏳ Préparation du colis'
                                    }
                                </span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Shipping Address */}
                    {order.shippingAddress && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Adresse de livraison</CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm">
                                <p className="font-medium">{order.shippingAddress.fullName}</p>
                                {order.shippingAddress.company && (
                                    <p>{order.shippingAddress.company}</p>
                                )}
                                <p>{order.shippingAddress.streetLine1}</p>
                                {order.shippingAddress.streetLine2 && (
                                    <p>{order.shippingAddress.streetLine2}</p>
                                )}
                                <p>
                                    {order.shippingAddress.city}, {order.shippingAddress.province}{' '}
                                    {order.shippingAddress.postalCode}
                                </p>
                                <p>{order.shippingAddress.country}</p>
                                {order.shippingAddress.phoneNumber && (
                                    <p className="mt-2">{order.shippingAddress.phoneNumber}</p>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* Billing Address */}
                    {order.billingAddress && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Adresse de facturation</CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm">
                                <p className="font-medium">{order.billingAddress.fullName}</p>
                                {order.billingAddress.company && (
                                    <p>{order.billingAddress.company}</p>
                                )}
                                <p>{order.billingAddress.streetLine1}</p>
                                {order.billingAddress.streetLine2 && (
                                    <p>{order.billingAddress.streetLine2}</p>
                                )}
                                <p>
                                    {order.billingAddress.city}, {order.billingAddress.province}{' '}
                                    {order.billingAddress.postalCode}
                                </p>
                                <p>{order.billingAddress.country}</p>
                                {order.billingAddress.phoneNumber && (
                                    <p className="mt-2">{order.billingAddress.phoneNumber}</p>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* Payment Information */}
                    {order.payments && order.payments.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Paiement</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {order.payments.map((payment: any) => (
                                    <div key={payment.id} className="space-y-1 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Méthode</span>
                                            <span className="font-medium">{payment.method}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Montant</span>
                                            <span><Price value={payment.amount}
                                                         currencyCode={order.currencyCode}/></span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Statut</span>
                                            <Badge variant="secondary" className="text-xs">
                                                {payment.state}
                                            </Badge>
                                        </div>
                                        {payment.transactionId && (
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">ID de transaction</span>
                                                <span className="font-mono text-xs">
                                                    {payment.transactionId}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    )}

                    {/* Shipping Method */}
                    {order.shippingLines && order.shippingLines.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Méthode de livraison</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {order.shippingLines.map((line: any, idx: any) => (
                                    <div key={idx} className="space-y-1 text-sm">
                                        <p className="font-medium">{line.shippingMethod.name}</p>
                                        {line.shippingMethod.description && (
                                            <p className="text-muted-foreground">
                                                {line.shippingMethod.description.replace(/<[^>]*>/g, '').trim()}
                                            </p>
                                        )}
                                        <p className="font-medium">
                                            <Price value={line.priceWithTax} currencyCode={order.currencyCode}/>
                                        </p>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
