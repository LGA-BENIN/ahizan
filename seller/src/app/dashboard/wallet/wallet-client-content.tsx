'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatPrice } from '@/lib/format';
import { 
    Wallet, 
    TrendingUp, 
    Clock, 
    CheckCircle2, 
    ArrowUpRight, 
    ShieldAlert, 
    X, 
    PhoneCall,
    Settings,
    History,
    FileText
} from 'lucide-react';
import { toast } from 'sonner';
import { requestVendorWithdrawal } from '@/lib/vendure/actions';

interface WalletClientContentProps {
    vendor: any;
    totalSales: number;
    availableBalance: number;
    pendingBalance: number;
    withdrawnAmount: number;
    withdrawals: any[];
    orders: any[];
}

export default function WalletClientContent({
    vendor,
    totalSales,
    availableBalance,
    pendingBalance,
    withdrawnAmount,
    withdrawals,
    orders,
}: WalletClientContentProps) {
    const router = useRouter();
    const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
    const [isMissingPhoneModalOpen, setIsMissingPhoneModalOpen] = useState(false);
    const [withdrawAmount, setWithdrawAmount] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<any>(null);

    const currencyCode = 'XOF';
    
    // Check if seller has filled their mobile money phone number
    const paymentPhone = vendor?.mobileMoneyNumber;
    const hasPaymentPhone = Boolean(paymentPhone && String(paymentPhone).trim().length >= 4);

    const handleWithdrawClick = () => {
        if (!hasPaymentPhone) {
            setIsMissingPhoneModalOpen(true);
        } else {
            setIsWithdrawModalOpen(true);
        }
    };

    const handleConfirmWithdraw = async (e: React.FormEvent) => {
        e.preventDefault();
        const amt = Number(withdrawAmount);
        if (!amt || amt <= 0) {
            toast.error('Veuillez saisir un montant valide');
            return;
        }
        if (amt > availableBalance) {
            toast.error('Le montant demandé dépasse votre solde disponible');
            return;
        }

        setIsSubmitting(true);
        try {
            const success = await requestVendorWithdrawal(amt);
            if (success) {
                toast.success('Demande de retrait transmise avec succès au SuperAdmin');
                setIsWithdrawModalOpen(false);
                setWithdrawAmount('');
                router.refresh();
            } else {
                toast.error('Erreur lors du traitement de la demande de retrait');
            }
        } catch (err: any) {
            toast.error(err.message || 'Erreur lors de la demande de retrait');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
            
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl md:text-4xl font-serif font-black tracking-tight text-foreground italic underline decoration-emerald-600 decoration-4">
                        Mon Portefeuille & Ventes
                    </h1>
                    <p className="text-muted-foreground font-medium text-sm mt-1">
                        Suivi de vos ventes, solde retirable et gestion de vos demandes de retrait.
                    </p>
                </div>
                
                <Button 
                    onClick={handleWithdrawClick}
                    className="h-12 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black flex items-center gap-2 shadow-lg shadow-emerald-600/20 active:scale-95 transition-all"
                >
                    <ArrowUpRight className="w-5 h-5" />
                    Retirer de l'argent
                </Button>
            </div>

            {/* Stat Cards Row */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
                
                {/* 1. Total Ventes Platforme */}
                <Card className="border border-border bg-card shadow-sm rounded-2xl md:rounded-[1.5rem] overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-muted/20">
                        <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                            Ventes Totales Nettes
                        </CardTitle>
                        <TrendingUp className="h-5 w-5 text-blue-600" />
                    </CardHeader>
                    <CardContent className="pt-4">
                        <div className="text-2xl font-serif font-black tracking-tighter text-foreground">
                            {formatPrice(totalSales, currencyCode)}
                        </div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase mt-2 tracking-widest">
                            Hors commissions prélévées
                        </p>
                    </CardContent>
                </Card>

                {/* 2. Solde Disponible (Retirable) */}
                <Card className="border-2 border-emerald-500/30 bg-emerald-500/5 shadow-md rounded-2xl md:rounded-[1.5rem] overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-400">
                            Solde Disponible
                        </CardTitle>
                        <Wallet className="h-5 w-5 text-emerald-600" />
                    </CardHeader>
                    <CardContent className="pt-4">
                        <div className="text-2xl font-serif font-black tracking-tighter text-emerald-600">
                            {formatPrice(availableBalance, currencyCode)}
                        </div>
                        <p className="text-[10px] font-bold text-emerald-700/70 uppercase mt-2 tracking-widest">
                            Retirable immédiatement
                        </p>
                    </CardContent>
                </Card>

                {/* 3. Solde En Attente */}
                <Card className="border border-amber-500/30 bg-amber-500/5 shadow-sm rounded-2xl md:rounded-[1.5rem] overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs font-black uppercase tracking-widest text-amber-700 dark:text-amber-400">
                            Solde en attente Admin
                        </CardTitle>
                        <Clock className="h-5 w-5 text-amber-600" />
                    </CardHeader>
                    <CardContent className="pt-4">
                        <div className="text-2xl font-serif font-black tracking-tighter text-amber-600">
                            {formatPrice(pendingBalance, currencyCode)}
                        </div>
                        <p className="text-[10px] font-bold text-amber-700/70 uppercase mt-2 tracking-widest">
                            Attente de libération
                        </p>
                    </CardContent>
                </Card>

                {/* 4. Retraits Déjà Effectués */}
                <Card className="border border-purple-500/30 bg-purple-500/5 shadow-sm rounded-2xl md:rounded-[1.5rem] overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs font-black uppercase tracking-widest text-purple-700 dark:text-purple-400">
                            Retraits effectués
                        </CardTitle>
                        <CheckCircle2 className="h-5 w-5 text-purple-600" />
                    </CardHeader>
                    <CardContent className="pt-4">
                        <div className="text-2xl font-serif font-black tracking-tighter text-purple-600">
                            {formatPrice(withdrawnAmount, currencyCode)}
                        </div>
                        <p className="text-[10px] font-bold text-purple-700/70 uppercase mt-2 tracking-widest">
                            Retraits validés reçus
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Left Column: Commandes à suivre (2 cols) */}
                <div className="lg:col-span-2 space-y-6">
                    <Card className="border border-border bg-card rounded-2xl md:rounded-[2rem] shadow-sm overflow-hidden">
                        <CardHeader className="bg-muted/30 border-b border-border p-6">
                            <CardTitle className="flex items-center gap-3 text-lg font-black uppercase tracking-tight">
                                <Clock className="w-5 h-5 text-primary" />
                                Commandes & Statuts de Paiement
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            {orders.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs">
                                        <thead>
                                            <tr className="bg-muted/50 border-b border-border text-muted-foreground uppercase font-black tracking-wider">
                                                <th className="p-4">Commande</th>
                                                <th className="p-4">Date</th>
                                                <th className="p-4 text-right">Total Commande</th>
                                                <th className="p-4 text-right">Part Vendeur Net</th>
                                                <th className="p-4 text-center">Statut Paiement</th>
                                                <th className="p-4 text-center">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                            {orders.map((o: any) => {
                                                const status = o.customFields?.paymentStatus || 'PENDING';
                                                const total = o.totalWithTax || 0;
                                                const commission = o.customFields?.commissionAmount || 0;
                                                const net = total - commission;

                                                return (
                                                    <tr key={o.id} className="hover:bg-muted/20 transition-colors">
                                                        <td className="p-4 font-mono font-bold text-primary">#{o.code}</td>
                                                        <td className="p-4 text-muted-foreground">
                                                            {new Date(o.createdAt || o.updatedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                                                        </td>
                                                        <td className="p-4 text-right text-muted-foreground font-medium">
                                                            {formatPrice(total, currencyCode)}
                                                        </td>
                                                        <td className="p-4 text-right font-black text-foreground">
                                                            {formatPrice(net, currencyCode)}
                                                        </td>
                                                        <td className="p-4 text-center">
                                                            {status === 'PAID' ? (
                                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-500/15 text-emerald-700">
                                                                    <CheckCircle2 className="w-3 h-3" /> Transféré / Payé
                                                                </span>
                                                            ) : status === 'RETIRABLE' ? (
                                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-purple-500/15 text-purple-700">
                                                                    <Wallet className="w-3 h-3" /> Solde Retirable
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-amber-500/15 text-amber-700">
                                                                    <Clock className="w-3 h-3" /> En validation
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="p-4 text-center">
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => setSelectedOrder(o)}
                                                                className="h-7 px-3 text-[10px] rounded-lg font-bold flex items-center gap-1 mx-auto"
                                                            >
                                                                <FileText className="w-3.5 h-3.5" />
                                                                Détails
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="p-8 text-center text-muted-foreground text-sm">
                                    Aucune commande enregistrée pour le moment.
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Withdrawal History */}
                <div className="space-y-6">
                    <Card className="border border-border bg-card rounded-2xl md:rounded-[2rem] shadow-sm overflow-hidden">
                        <CardHeader className="bg-muted/30 border-b border-border p-6">
                            <CardTitle className="flex items-center gap-3 text-lg font-black uppercase tracking-tight">
                                <History className="w-5 h-5 text-primary" />
                                Historique des Retraits
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            {withdrawals.length > 0 ? (
                                <div className="divide-y divide-border">
                                    {withdrawals.map((w: any) => (
                                        <div key={w.id} className="p-4 flex items-center justify-between hover:bg-muted/20 transition-colors">
                                            <div>
                                                <p className="text-sm font-black text-foreground">{formatPrice(w.amount, currencyCode)}</p>
                                                <p className="text-[10px] font-bold text-muted-foreground">Momo: {w.mobileMoneyNumber}</p>
                                                <span style={{ fontSize: '10px' }} className="text-muted-foreground">{new Date(w.createdAt).toLocaleDateString('fr-FR')}</span>
                                            </div>
                                            <div>
                                                <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase ${
                                                    w.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-600' : w.status === 'REJECTED' ? 'bg-red-500/10 text-red-600' : 'bg-amber-500/10 text-amber-600'
                                                }`}>
                                                    {w.status === 'APPROVED' ? 'Validé' : w.status === 'REJECTED' ? 'Rejeté' : 'En cours'}
                                                </span>
                                                {w.rejectionReason && (
                                                    <p className="text-[9px] text-red-500 mt-1 max-w-[120px] text-right truncate" title={w.rejectionReason}>
                                                        {w.rejectionReason}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-8 text-center text-muted-foreground text-xs font-bold">
                                    Aucun historique de retrait pour l'instant.
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Modal Alert: Missing Payment Phone Number */}
            {isMissingPhoneModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-card border border-border rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-4 text-amber-600">
                            <div className="p-3 bg-amber-500/15 rounded-2xl">
                                <ShieldAlert className="w-8 h-8" />
                            </div>
                            <div>
                                <h3 className="text-lg font-serif font-black text-foreground">Numéro de Paiement Manquant</h3>
                                <p className="text-xs text-muted-foreground font-medium mt-0.5">Champ requis pour le retrait</p>
                            </div>
                        </div>

                        <p className="text-sm text-muted-foreground leading-relaxed">
                            Veuillez d'abord renseigner votre <strong className="text-foreground">numéro de téléphone de paiement (Mobile Money MTN/Moov/Celtiis)</strong> dans les paramètres de votre compte avant d'effectuer une demande de retrait.
                        </p>

                        <div className="flex items-center gap-3 pt-2">
                            <Button 
                                type="button" 
                                variant="outline" 
                                onClick={() => setIsMissingPhoneModalOpen(false)}
                                className="flex-1 h-11 rounded-xl font-bold border-2"
                            >
                                Plus tard
                            </Button>
                            <Button 
                                type="button" 
                                onClick={() => {
                                    setIsMissingPhoneModalOpen(false);
                                    router.push('/dashboard/settings');
                                }}
                                className="flex-1 h-11 rounded-xl bg-primary hover:bg-primary/90 text-white font-black flex items-center justify-center gap-2"
                            >
                                <Settings className="w-4 h-4" />
                                Renseigner
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Submit Withdrawal Request */}
            {isWithdrawModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-card border border-border rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between border-b border-border pb-4">
                            <h3 className="text-lg font-serif font-black text-foreground">Demande de Retrait</h3>
                            <button onClick={() => setIsWithdrawModalOpen(false)} className="p-1 text-muted-foreground hover:text-foreground">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleConfirmWithdraw} className="space-y-5">
                            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs">
                                <span className="text-muted-foreground font-medium">Solde disponible : </span>
                                <strong className="text-emerald-600 font-serif text-sm font-black block mt-1">{formatPrice(availableBalance, currencyCode)}</strong>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-black uppercase tracking-wider">Montant à retirer (FCFA)</Label>
                                <Input
                                    type="number"
                                    placeholder="Ex: 25000"
                                    value={withdrawAmount}
                                    onChange={e => setWithdrawAmount(e.target.value)}
                                    max={availableBalance}
                                    min={100}
                                    required
                                    className="h-12 rounded-xl"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-black uppercase tracking-wider">Numéro Mobile Money destinataire</Label>
                                <div className="h-12 px-4 rounded-xl bg-muted/40 border border-border flex items-center text-sm font-mono font-bold text-foreground">
                                    <PhoneCall className="w-4 h-4 text-muted-foreground mr-2" />
                                    {paymentPhone}
                                </div>
                            </div>

                            <div className="flex items-center gap-3 pt-2">
                                <Button 
                                    type="button" 
                                    variant="outline" 
                                    onClick={() => setIsWithdrawModalOpen(false)}
                                    className="flex-1 h-12 rounded-xl font-bold border-2"
                                >
                                    Annuler
                                </Button>
                                <Button 
                                    type="submit" 
                                    disabled={isSubmitting}
                                    className="flex-1 h-12 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black shadow-lg shadow-emerald-600/20"
                                >
                                    {isSubmitting ? 'Traitement...' : 'Confirmer Retrait'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Order Details & Financial Share Breakdown */}
            {selectedOrder && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-card border border-border rounded-3xl p-6 md:p-8 max-w-2xl w-full shadow-2xl space-y-6 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between border-b border-border pb-4">
                            <div>
                                <h3 className="text-lg font-serif font-black text-foreground">Détails Commande #{selectedOrder.code}</h3>
                                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mt-1">
                                    Reçu le {new Date(selectedOrder.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                                </p>
                            </div>
                            <button onClick={() => setSelectedOrder(null)} className="p-1 text-muted-foreground hover:text-foreground">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Customer Information */}
                        <div className="space-y-2">
                            <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground">Informations Client</h4>
                            <div className="p-4 rounded-2xl bg-muted/30 border border-border space-y-1 text-xs">
                                <p className="font-bold text-foreground">{selectedOrder.customer?.firstName} {selectedOrder.customer?.lastName}</p>
                                <p className="text-muted-foreground">{selectedOrder.customer?.emailAddress}</p>
                                <p className="text-muted-foreground">{selectedOrder.customer?.phoneNumber || 'Aucun numéro'}</p>
                            </div>
                        </div>

                        {/* Order Items */}
                        <div className="space-y-3">
                            <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground">Articles concernés</h4>
                            <div className="space-y-2">
                                {selectedOrder.lines?.filter((line: any) => {
                                    const lineVendorId = line.productVariant?.product?.customFields?.vendor?.id || 
                                                         line.productVariant?.product?.vendorId;
                                    return String(lineVendorId) === String(vendor?.id);
                                }).map((line: any) => (
                                    <div key={line.id} className="flex justify-between items-center p-3 bg-muted/10 border border-border rounded-xl text-xs">
                                        <div>
                                            <p className="font-bold text-foreground">{line.productVariant?.name}</p>
                                            <p className="text-muted-foreground">Quantité: {line.quantity}</p>
                                        </div>
                                        <p className="font-black text-foreground">{formatPrice(line.linePriceWithTax, currencyCode)}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Commission Breakdown */}
                        <div className="space-y-3">
                            <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground">Répartition Financière</h4>
                            <div className="p-5 rounded-2xl bg-muted/40 border border-border space-y-3 text-xs">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Total Articles :</span>
                                    <span className="font-bold text-foreground">{formatPrice(selectedOrder.totalWithTax, currencyCode)}</span>
                                </div>
                                <div className="flex justify-between text-red-600 font-bold">
                                    <span>Commission Marketplace ({selectedOrder.customFields?.commissionRate || 0}%) :</span>
                                    <span>- {formatPrice(selectedOrder.customFields?.commissionAmount || 0, currencyCode)}</span>
                                </div>
                                <div className="flex justify-between text-emerald-600 font-extrabold text-sm border-t border-dashed border-border pt-3">
                                    <span>Votre part nette :</span>
                                    <span className="text-base font-serif font-black">{formatPrice(selectedOrder.totalWithTax - (selectedOrder.customFields?.commissionAmount || 0), currencyCode)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="flex justify-end pt-2">
                            <Button 
                                onClick={() => setSelectedOrder(null)}
                                className="h-11 rounded-xl bg-primary text-white font-black px-6"
                            >
                                Fermer
                            </Button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
