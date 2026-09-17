'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatPrice } from '@/lib/format';
import { 
    ArrowLeft, 
    Package, 
    User, 
    MapPin, 
    Clock, 
    CheckCircle2, 
    XCircle, 
    AlertCircle, 
    Check, 
    X,
    Printer,
    Boxes,
    HelpCircle
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { updateOrderLineSellerStatusAction, updateOrderSellerStatusAction } from '@/app/dashboard/orders/actions';

interface OrderDetailClientProps {
    order: any;
}

export default function OrderDetailClient({ order }: OrderDetailClientProps) {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const lines = order.lines || [];
    const fulfillments = order.fulfillments || [];
    const isShippedOrDelivered = order.state === 'Shipped' || order.state === 'Delivered' || fulfillments.length > 0;

    // Calculate line counts and statuses for active seller lines
    const activeSellerLines = lines.filter((l: any) => (l.customFields?.sellerStatus || 'pending') !== 'reassigned_to_other');
    const pendingLines = activeSellerLines.filter((l: any) => (l.customFields?.sellerStatus || 'pending') === 'pending');
    const confirmedLines = activeSellerLines.filter((l: any) => {
        const s = l.customFields?.sellerStatus || 'pending';
        return s === 'confirmed' || s === 'approved';
    });
    const hasRejectedLines = activeSellerLines.some((l: any) => {
        const s = l.customFields?.sellerStatus || 'pending';
        return s === 'refused' || s === 'reassigning';
    });
    const hasPendingLines = pendingLines.length > 0;
    const canMarkReady = confirmedLines.length > 0 && pendingLines.length === 0;
    const isReadyForPickup = order.customFields?.sellerStatus === 'ready_for_pickup';
    
    // Validate All button is shown only if there are pending lines and NO rejected lines
    const showValidateAll = !hasRejectedLines && hasPendingLines;

    // Handle individual line status updates
    const handleUpdateLineStatus = async (lineId: string, status: 'confirmed' | 'refused') => {
        setLoading(true);
        try {
            const res = await updateOrderLineSellerStatusAction(lineId, status);
            if (res.success) {
                toast.success(status === 'confirmed' ? "Article validé et préparé." : "Article refusé (mis en réassignation).");
                router.refresh();
            } else {
                toast.error(res.error || "Erreur lors de la mise à jour.");
            }
        } catch (e: any) {
            toast.error("Erreur de communication avec le serveur.");
        } finally {
            setLoading(false);
        }
    };

    // Handle global validation of all pending lines
    const handleValidateAll = async () => {
        setLoading(true);
        try {
            const promises = pendingLines.map((l: any) => updateOrderLineSellerStatusAction(l.id, 'confirmed'));
            const results = await Promise.all(promises);
            const errors = results.filter(r => !r.success);
            
            if (errors.length > 0) {
                toast.error("Certains articles n'ont pas pu être validés.");
            } else {
                toast.success("Tous les articles ont été validés et préparés !");
            }
            router.refresh();
        } catch (e: any) {
            toast.error("Erreur lors de la validation globale.");
        } finally {
            setLoading(false);
        }
    };

    // Handle marking order package ready for Ahizan logistics pickup
    const handleMarkReadyForPickup = async () => {
        setLoading(true);
        try {
            const res = await updateOrderSellerStatusAction(order.id, 'ready_for_pickup');
            if (res.success) {
                toast.success("Colis marqué comme prêt ! Les équipes de ramassage Ahizan ont été notifiées.");
                router.refresh();
            } else {
                toast.error(res.error || "Erreur lors de la notification.");
            }
        } catch (e: any) {
            toast.error("Erreur de communication avec le serveur.");
        } finally {
            setLoading(false);
        }
    };

    const handlePrintPackingSlip = () => {
        window.print();
    };

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

    // Calculate vendor-specific subtotal from active lines
    const sellerSubTotal = lines.reduce((sum: number, l: any) => sum + (l.linePriceWithTax || (l.unitPriceWithTax * l.quantity) || 0), 0);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 print:m-0 print:p-0">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild className="rounded-full print:hidden">
                        <Link href="/dashboard/orders">
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                    </Button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-serif font-black text-brand-navy">
                                Commande #{order.code}
                            </h1>
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getStatusColor(order.state)}`}>
                                {getStatusLabel(order.state)}
                            </span>
                        </div>
                        <p className="text-xs text-muted-foreground font-bold mt-1 flex items-center gap-1.5 uppercase">
                            <Clock className="w-3.5 h-3.5 text-brand-navy" />
                            Passée le {new Date(order.createdAt).toLocaleDateString('fr-FR', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                            })}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 print:hidden">
                    <Button variant="outline" size="sm" onClick={handlePrintPackingSlip} className="font-bold gap-2">
                        <Printer className="w-4 h-4" /> Imprimer le bordereau
                    </Button>
                    {showValidateAll && !isShippedOrDelivered && (
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={handleValidateAll}
                            disabled={loading}
                            className="bg-green-600 hover:bg-green-700 text-white font-bold gap-2"
                        >
                            <Check className="w-4 h-4" /> Tout valider ({pendingLines.length})
                        </Button>
                    )}
                    {canMarkReady && !isReadyForPickup && !isShippedOrDelivered && (
                        <Button 
                            variant="default" 
                            size="sm" 
                            onClick={handleMarkReadyForPickup}
                            disabled={loading}
                            className="bg-brand-navy hover:bg-brand-navy/90 text-white font-bold gap-2"
                        >
                            <Boxes className="w-4 h-4" /> Colis prêt pour ramassage ({confirmedLines.length} article{confirmedLines.length > 1 ? 's' : ''})
                        </Button>
                    )}
                    {isReadyForPickup && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock className="w-4 h-4 animate-spin text-amber-600" /> Prêt pour ramassage
                        </span>
                    )}
                </div>
            </div>

            {/* Rejection Alert Banner if any lines are rejected/reassigning */}
            {hasRejectedLines && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 text-amber-800 print:hidden">
                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-600" />
                    <div className="text-sm">
                        <p className="font-bold">Articles en cours de réassignation</p>
                        <p className="text-xs text-amber-700 mt-0.5">
                            Certains articles de cette commande ont été refusés. Les équipes d'Ahizan les réassignent actuellement à d'autres vendeurs. Vos articles validés restent confirmés.
                        </p>
                    </div>
                </div>
            )}

            {/* Grid Layout for Customer and Payment Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Customer Info */}
                <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
                    <h2 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                        <User className="w-4 h-4 text-brand-navy" />
                        Client
                    </h2>
                    {order.customer ? (
                        <div className="space-y-1 text-sm">
                            <p className="font-black text-foreground">{order.customer.firstName} {order.customer.lastName}</p>
                            <p className="text-muted-foreground text-xs">{order.customer.emailAddress}</p>
                            {order.customer.phoneNumber && (
                                <p className="text-xs font-bold text-brand-navy mt-2">{order.customer.phoneNumber}</p>
                            )}
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground italic">Client Invité</p>
                    )}
                </div>

                {/* Shipping Address */}
                <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
                    <h2 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-brand-navy" />
                        Adresse de Livraison
                    </h2>
                    {order.shippingAddress ? (
                        <div className="space-y-1 text-sm text-muted-foreground">
                            <p className="font-bold text-foreground">{order.shippingAddress.fullName}</p>
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
                            <span className="text-xs font-bold text-muted-foreground uppercase">Sous-total (Mes articles)</span>
                            <span className="text-sm font-bold">{formatPrice(sellerSubTotal)}</span>
                        </div>
                        <div className="pt-2 flex justify-between items-center">
                            <span className="text-sm font-black text-brand-navy uppercase">Total articles</span>
                            <span className="text-2xl font-serif font-black text-brand-navy underline decoration-brand-red decoration-4 transition-all">{formatPrice(sellerSubTotal)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Line Items */}
            <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/20">
                    <h2 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">
                        Articles ({lines.length})
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
                                <th className="px-6 py-4 text-center text-[11px] font-black text-muted-foreground uppercase tracking-wider">Statut / Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border bg-card">
                            {lines.map((line: any) => {
                                const status = line.customFields?.sellerStatus || 'pending';
                                return (
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
                                            {formatPrice(status === 'reassigned_to_other' ? 0 : line.unitPriceWithTax)}
                                        </td>
                                        <td className="px-6 py-4 text-center text-sm font-black text-muted-foreground">
                                            {status === 'reassigned_to_other' ? 0 : line.quantity}
                                        </td>
                                        <td className="px-6 py-4 text-right text-sm font-black text-brand-navy">
                                            {formatPrice(status === 'reassigned_to_other' ? 0 : line.linePriceWithTax)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            {status === 'pending' ? (
                                                <div className="flex justify-center items-center gap-2">
                                                    <Button 
                                                        onClick={() => handleUpdateLineStatus(line.id, 'confirmed')}
                                                        disabled={loading}
                                                        className="bg-green-500 hover:bg-green-600 text-white rounded-lg px-3.5 py-1 text-xs font-bold flex items-center gap-1 shrink-0"
                                                    >
                                                        <Check className="w-3.5 h-3.5" />
                                                        Valider
                                                    </Button>
                                                    <Button 
                                                        onClick={() => handleUpdateLineStatus(line.id, 'refused')}
                                                        disabled={loading}
                                                        variant="destructive"
                                                        className="bg-red-500 hover:bg-red-600 text-white rounded-lg px-3.5 py-1 text-xs font-bold flex items-center gap-1 shrink-0"
                                                    >
                                                        <X className="w-3.5 h-3.5" />
                                                        Refuser
                                                    </Button>
                                                </div>
                                            ) : status === 'confirmed' || status === 'approved' ? (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 border border-green-200 text-green-700 rounded-full text-xs font-black uppercase tracking-wider">
                                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                                    Validé
                                                </span>
                                            ) : status === 'reassigning' ? (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 text-amber-700 rounded-full text-xs font-black uppercase tracking-wider">
                                                    <AlertCircle className="w-3.5 h-3.5 animate-pulse" />
                                                    En réassignation
                                                </span>
                                            ) : status === 'refused' || status === 'rejected' ? (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 border border-red-200 text-red-700 rounded-full text-xs font-black uppercase tracking-wider">
                                                    <XCircle className="w-3.5 h-3.5" />
                                                    Refusé
                                                </span>
                                            ) : status === 'reassigned_to_other' ? (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-50 border border-gray-200 text-gray-500 rounded-full text-xs font-black uppercase tracking-wider">
                                                    <XCircle className="w-3.5 h-3.5" />
                                                    Réassigné
                                                </span>
                                            ) : status === 'cancelled' || status === 'customer_cancelled' ? (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 border border-red-200 text-red-600 rounded-full text-xs font-black uppercase tracking-wider">
                                                    <XCircle className="w-3.5 h-3.5" />
                                                    Annulé
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-50 border border-gray-200 text-gray-500 rounded-full text-xs font-black uppercase tracking-wider">
                                                    <HelpCircle className="w-3.5 h-3.5" />
                                                    {status}
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
