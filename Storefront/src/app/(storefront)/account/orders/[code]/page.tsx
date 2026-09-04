import type {Metadata} from 'next';
import {ChevronLeft, Store} from 'lucide-react';
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

                    {/* Order Items Divided by Seller */}
                    {(() => {
                        const linesByVendorMap: { [id: string]: { vendor: any; lines: any[]; total: number } } = {};
                        (order.lines || []).forEach((line: any) => {
                            const lineVendor = line.customFields?.assignedVendor || line.productVariant?.product?.customFields?.vendor || { id: 'default', name: 'Boutique Principale' };
                            const vId = String(lineVendor?.id || 'default');
                            if (!linesByVendorMap[vId]) {
                                linesByVendorMap[vId] = { vendor: lineVendor, lines: [], total: 0 };
                            }
                            linesByVendorMap[vId].lines.push(line);
                            linesByVendorMap[vId].total += (line.linePriceWithTax || (line.listPrice * line.quantity) || 0);
                        });
                        const vendorGroups = Object.values(linesByVendorMap);

                        return (
                            <Card className="rounded-xl border shadow-sm">
                                <CardHeader className="pb-3 border-b bg-muted/20">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-base font-bold flex items-center gap-2">
                                            <span>Articles commandés</span>
                                            {vendorGroups.length > 1 && (
                                                <Badge variant="secondary" className="text-xs font-semibold">
                                                    {vendorGroups.length} vendeurs
                                                </Badge>
                                            )}
                                        </CardTitle>
                                        <span className="text-xs text-muted-foreground">
                                            {(order.lines || []).length} { (order.lines || []).length > 1 ? 'articles' : 'article' }
                                        </span>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-0 divide-y">
                                    {vendorGroups.map((group, gIdx) => {
                                        const vendorName = group.vendor?.name || 'Boutique Principale';
                                        return (
                                            <div key={group.vendor?.id || gIdx} className="p-5 space-y-4">
                                                {/* Vendor Shop Header */}
                                                <div className="flex items-center justify-between bg-muted/40 px-3.5 py-2.5 rounded-lg border border-border/50">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="p-1.5 rounded-md bg-primary/10 text-primary">
                                                            <Store className="h-4 w-4" />
                                                        </div>
                                                        <div>
                                                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Vendu par</span>
                                                            <h4 className="text-sm font-bold text-foreground leading-tight">{vendorName}</h4>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="text-xs text-muted-foreground">Sous-total vendeur</span>
                                                        <p className="text-sm font-bold text-primary">
                                                            <Price value={group.total} currencyCode={order.currencyCode} />
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Vendor Lines */}
                                                <div className="space-y-4 pl-1">
                                                    {group.lines.map((line: any) => {
                                                        const statusBadge = getLineStatus(line);
                                                        const prodName = line.productVariant?.product?.name || line.productVariant?.name || 'Produit';
                                                        const prodSlug = line.productVariant?.product?.slug || '';
                                                        const imgUrl = line.productVariant?.product?.featuredAsset?.preview || line.productVariant?.featuredAsset?.preview;
                                                        const sku = line.productVariant?.sku || 'N/A';
                                                        const isCancelled = line.customFields?.sellerStatus === 'cancelled';

                                                        return (
                                                            <div key={line.id} className={`flex gap-4 items-center ${isCancelled ? 'opacity-60 grayscale' : ''}`}>
                                                                <div className="relative h-16 w-16 rounded-lg overflow-hidden bg-muted flex-shrink-0 border">
                                                                    {imgUrl ? (
                                                                        <Image
                                                                            src={imgUrl}
                                                                            alt={prodName}
                                                                            fill
                                                                            className="object-cover"
                                                                        />
                                                                    ) : null}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center gap-2 flex-wrap">
                                                                        {prodSlug ? (
                                                                            <Link
                                                                                href={`/product/${prodSlug}`}
                                                                                className={`text-sm font-medium hover:underline line-clamp-1 ${isCancelled ? 'line-through' : ''}`}
                                                                            >
                                                                                {prodName}
                                                                            </Link>
                                                                        ) : (
                                                                            <span className={`text-sm font-medium line-clamp-1 ${isCancelled ? 'line-through' : ''}`}>{prodName}</span>
                                                                        )}
                                                                        {statusBadge && (
                                                                            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${statusBadge.color}`}>
                                                                                {statusBadge.text}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    {line.productVariant?.name && line.productVariant?.name !== prodName && (
                                                                        <p className="text-xs text-muted-foreground mt-0.5">
                                                                            {line.productVariant.name}
                                                                        </p>
                                                                    )}
                                                                    <p className="text-xs text-muted-foreground">
                                                                        SKU: {sku}
                                                                    </p>
                                                                </div>
                                                                <div className="text-right flex-shrink-0">
                                                                    <p className={`text-sm font-bold ${isCancelled ? 'line-through' : ''}`}>
                                                                        <Price value={line.linePriceWithTax || (line.listPrice * line.quantity) || 0} currencyCode={order.currencyCode}/>
                                                                    </p>
                                                                    <p className="text-xs text-muted-foreground">
                                                                        Qté : {line.quantity} × <Price value={line.unitPriceWithTax || line.listPrice || 0} currencyCode={order.currencyCode}/>
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </CardContent>
                            </Card>
                        );
                    })()}

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
                    {/* Delivery & Shipping Tracking Status & OTP Code */}
                    <Card className="border-2 border-primary/20 shadow-sm overflow-hidden">
                        <CardHeader className="bg-primary/5 pb-3">
                            <CardTitle className="text-base flex items-center justify-between">
                                <span>Suivi & Statut de livraison</span>
                                <Badge className={
                                    order.state === 'Delivered' || order.customFields?.adminStatus === 'delivered' ? 'bg-emerald-600' :
                                    order.customFields?.deliveryMissionStatus === 'OUT_FOR_DELIVERY' || order.customFields?.adminStatus === 'shipped' ? 'bg-blue-600' :
                                    order.customFields?.isConsolidated ? 'bg-purple-600' :
                                    order.state === 'Cancelled' ? 'bg-rose-600' : 'bg-amber-600'
                                }>
                                    {
                                        order.state === 'Delivered' || order.customFields?.adminStatus === 'delivered' ? 'Livrée' :
                                        order.customFields?.deliveryMissionStatus === 'OUT_FOR_DELIVERY' ? 'En cours de livraison' :
                                        order.customFields?.isConsolidated ? 'Au Hub Central Ahizan' :
                                        order.customFields?.adminStatus === 'shipped' ? 'Expédiée' :
                                        order.state === 'Cancelled' ? 'Annulée' : 'En préparation'
                                    }
                                </Badge>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-4 text-sm">
                            {/* OTP Code Box for Customer */}
                            {order.customFields?.deliveryOtp && order.state !== 'Delivered' && (
                                <div className="p-4 bg-primary/10 border-2 border-primary/30 rounded-2xl text-center space-y-2">
                                    <p className="text-xs font-black uppercase tracking-wider text-primary">Code Secret de Livraison (OTP)</p>
                                    <div className="text-3xl font-mono font-black tracking-widest text-foreground bg-card py-2 px-6 rounded-xl border border-primary/20 inline-block shadow-sm">
                                        {order.customFields.deliveryOtp}
                                    </div>
                                    <p className="text-[11px] text-muted-foreground font-medium">
                                        Communiquez ce code à 6 chiffres exclusivement au livreur lors de la remise en main propre de votre colis.
                                    </p>
                                </div>
                            )}

                            {/* Logistics Step-by-Step Breakdown */}
                            <div className="space-y-2.5 border-t border-border pt-3">
                                <div className="flex items-center gap-2 text-xs">
                                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-600 flex items-center justify-center font-bold text-[10px]">1</span>
                                    <span className="font-medium text-foreground">Commande reçue & validée par les vendeurs</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs">
                                    <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                                        order.customFields?.isConsolidated || order.state === 'Delivered' || order.customFields?.deliveryMissionStatus === 'OUT_FOR_DELIVERY'
                                            ? 'bg-emerald-500/20 text-emerald-600'
                                            : 'bg-muted text-muted-foreground'
                                    }`}>2</span>
                                    <span className={order.customFields?.isConsolidated || order.state === 'Delivered' ? 'font-medium text-foreground' : 'text-muted-foreground'}>
                                        Collecte boutique & transfert vers le Hub
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 text-xs">
                                    <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                                        order.customFields?.isConsolidated
                                            ? 'bg-purple-500/20 text-purple-600'
                                            : 'bg-muted text-muted-foreground'
                                    }`}>3</span>
                                    <span className={order.customFields?.isConsolidated ? 'font-bold text-foreground' : 'text-muted-foreground'}>
                                        Regroupement & consolidation au Hub Central Ahizan
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 text-xs">
                                    <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                                        order.state === 'Delivered'
                                            ? 'bg-emerald-500/20 text-emerald-600'
                                            : order.customFields?.deliveryMissionStatus === 'OUT_FOR_DELIVERY'
                                            ? 'bg-blue-500/20 text-blue-600 animate-pulse'
                                            : 'bg-muted text-muted-foreground'
                                    }`}>4</span>
                                    <span className={order.state === 'Delivered' || order.customFields?.deliveryMissionStatus === 'OUT_FOR_DELIVERY' ? 'font-medium text-foreground' : 'text-muted-foreground'}>
                                        {order.state === 'Delivered' ? 'Colis livré avec validation OTP ✅' : 'Livraison finale en cours avec code OTP'}
                                    </span>
                                </div>
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
