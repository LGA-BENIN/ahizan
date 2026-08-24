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
    HelpCircle,
    Truck,
    Printer,
    Send
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { updateOrderLineSellerStatusAction, fulfillVendorOrderAction } from '@/app/dashboard/orders/actions';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface OrderDetailClientProps {
    order: any;
}

export default function OrderDetailClient({ order }: OrderDetailClientProps) {
    const [loading, setLoading] = useState(false);
    const [isFulfillModalOpen, setIsFulfillModalOpen] = useState(false);
    const [carrier, setCarrier] = useState('Livreur Express (Moto)');
    const [customCarrier, setCustomCarrier] = useState('');
    const [trackingCode, setTrackingCode] = useState('');
    const router = useRouter();

    const lines = order.lines || [];
    const fulfillments = order.fulfillments || [];
    const isShippedOrDelivered = order.state === 'Shipped' || order.state === 'Delivered' || fulfillments.length > 0;

    // Calculate line counts and statuses
    const pendingLines = lines.filter((l: any) => (l.customFields?.sellerStatus || 'pending') === 'pending');
    const hasRejectedLines = lines.some((l: any) => {
        const s = l.customFields?.sellerStatus || 'pending';
        return s === 'refused' || s === 'reassigning' || s === 'reassigned_to_other';
    });
    const hasPendingLines = pendingLines.length > 0;
    
    // Validate All button is shown only if there are pending lines and NO rejected/reassigned lines
    const showValidateAll = !hasRejectedLines && hasPendingLines;

    // Handle individual line status updates
    const handleUpdateLineStatus = async (lineId: string, status: 'confirmed' | 'refused') => {
        setLoading(true);
        try {
            const res = await updateOrderLineSellerStatusAction(lineId, status);
            if (res.success) {
                toast.success(status === 'confirmed' ? "Article validé." : "Article refusé (mis en réassignation).");
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
                toast.success("Tous les articles ont été validés avec succès !");
            }
            router.refresh();
        } catch (e: any) {
            toast.error("Erreur lors de la validation globale.");
        } finally {
            setLoading(false);
        }
    };

    // Handle order fulfillment / shipping
    const handleFulfillOrder = async () => {
        const finalCarrier = carrier === 'Autre' ? customCarrier.trim() : carrier;
        if (!finalCarrier) {
            toast.error("Veuillez renseigner le nom du transporteur ou du livreur.");
            return;
        }

        setLoading(true);
        try {
            const res = await fulfillVendorOrderAction(order.id, finalCarrier, trackingCode);
            if (res.success) {
                toast.success("Commande marquée comme expédiée ! Le client a été notifié.");
                setIsFulfillModalOpen(false);
                router.refresh();
            } else {
                toast.error(res.error || "Erreur lors de l'enregistrement de l'expédition.");
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

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 print:m-0 print:p-0">
            {/* Header */}
            <div>
                <Link href="/dashboard/orders" className="flex items-center gap-2 text-brand-navy hover:underline mb-4 text-xs font-bold uppercase tracking-widest print:hidden">
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

                    {/* Header Actions */}
                    <div className="flex flex-wrap items-center gap-3 print:hidden">
                        <Button 
                            onClick={handlePrintPackingSlip}
                            variant="outline"
                            className="rounded-xl font-bold uppercase text-xs tracking-wider h-11 px-4 flex items-center gap-2 border-border"
                        >
                            <Printer className="w-4 h-4" />
                            Bon de livraison
                        </Button>

                        {!isShippedOrDelivered && order.state !== 'Cancelled' && (
                            <Button 
                                onClick={() => setIsFulfillModalOpen(true)}
                                className="bg-brand-navy hover:bg-brand-navy/90 text-white rounded-xl font-bold uppercase text-xs tracking-wider h-11 px-5 flex items-center gap-2 shadow-lg shadow-brand-navy/20"
                            >
                                <Truck className="w-4 h-4" />
                                Expédier la commande
                            </Button>
                        )}

                        {showValidateAll && (
                            <Button 
                                onClick={handleValidateAll}
                                disabled={loading}
                                className="bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold uppercase text-xs tracking-wider h-11 px-5"
                            >
                                {loading ? 'Validation...' : 'Valider Tout'}
                            </Button>
                        )}
                        {!showValidateAll && hasPendingLines && (
                            <div className="flex items-center gap-1.5 text-xs text-amber-600 font-bold bg-amber-50 border border-amber-200 p-3 rounded-xl">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                <span>Action "Valider Tout" bloquée : certains articles ont été refusés</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal Expédition Fulfillment */}
            <Dialog open={isFulfillModalOpen} onOpenChange={setIsFulfillModalOpen}>
                <DialogContent className="sm:max-w-[480px] rounded-3xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-serif font-black flex items-center gap-2">
                            <Truck className="w-5 h-5 text-primary" />
                            Expédier la commande #{order.code}
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground font-medium">
                            Renseignez les détails du transporteur pour notifier automatiquement le client par SMS, Email et Notification Push.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-3">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-wider">Transporteur / Livreur</Label>
                            <Select value={carrier} onValueChange={setCarrier}>
                                <SelectTrigger className="rounded-xl h-11">
                                    <SelectValue placeholder="Sélectionner le mode de livraison" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    <SelectItem value="Livreur Express (Moto)">Livreur Express (Moto)</SelectItem>
                                    <SelectItem value="Ahizan Express">Ahizan Express</SelectItem>
                                    <SelectItem value="DHL Express">DHL Express</SelectItem>
                                    <SelectItem value="Retrait en Boutique / Main propre">Retrait en Boutique / Main propre</SelectItem>
                                    <SelectItem value="Autre">Autre transporteur...</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {carrier === 'Autre' && (
                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-wider">Nom du transporteur</Label>
                                <Input 
                                    placeholder="Ex: Chronopost, Transporteur Privé" 
                                    value={customCarrier} 
                                    onChange={(e: any) => setCustomCarrier(e.target.value)}
                                    className="rounded-xl h-11"
                                />
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-wider">N° de Suivi / Contact Livreur (optionnel)</Label>
                            <Input 
                                placeholder="Ex: +229 97 00 00 00 ou N° de colis" 
                                value={trackingCode} 
                                onChange={(e: any) => setTrackingCode(e.target.value)}
                                className="rounded-xl h-11"
                            />
                        </div>
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button 
                            variant="outline" 
                            onClick={() => setIsFulfillModalOpen(false)}
                            className="rounded-xl h-11 font-bold text-xs uppercase"
                        >
                            Annuler
                        </Button>
                        <Button 
                            onClick={handleFulfillOrder}
                            disabled={loading}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl h-11 px-6 font-bold text-xs uppercase flex items-center gap-2"
                        >
                            <Send className="w-4 h-4" />
                            {loading ? 'Expédition...' : 'Confirmer l\'expédition'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>


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
                                            ) : status === 'confirmed' ? (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 border border-green-200 text-green-700 rounded-full text-xs font-black uppercase tracking-wider">
                                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                                    Validé
                                                </span>
                                            ) : status === 'reassigning' || status === 'refused' ? (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 text-amber-700 rounded-full text-xs font-black uppercase tracking-wider">
                                                    <AlertCircle className="w-3.5 h-3.5 animate-pulse" />
                                                    En réassignation
                                                </span>
                                            ) : status === 'reassigned_to_other' ? (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-50 border border-gray-200 text-gray-500 rounded-full text-xs font-black uppercase tracking-wider">
                                                    <XCircle className="w-3.5 h-3.5" />
                                                    Réassigné
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
