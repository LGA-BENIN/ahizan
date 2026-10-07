'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getPendingVendorOrdersAction } from '@/lib/vendure/actions';
import { formatPrice } from '@/lib/format';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingBag, ArrowRight, Clock, PackageCheck, Layers, Sparkles, X } from 'lucide-react';

interface PendingOrderSummary {
    id: string;
    code: string;
    createdAt: string;
    currencyCode: string;
    totalWithTax: number;
    itemCount: number;
    itemsSummary: string[];
}

export function PendingOrdersWakeupModal() {
    const [orders, setOrders] = useState<PendingOrderSummary[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    useEffect(() => {
        let isMounted = true;

        const checkPendingOrders = async () => {
            try {
                const pendingOrders = await getPendingVendorOrdersAction();
                if (!isMounted || !pendingOrders || pendingOrders.length === 0) return;

                // Create unique signature from pending order IDs
                const currentSignature = pendingOrders
                    .map((o: PendingOrderSummary) => o.id)
                    .sort()
                    .join(',');

                // Check if already dismissed in current session
                const dismissedSignature = sessionStorage.getItem('ahizan_dismissed_pending_orders');
                if (dismissedSignature === currentSignature) {
                    return;
                }

                setOrders(pendingOrders);
                // Slight delay for smooth appearance after page render
                setTimeout(() => {
                    if (isMounted) setIsOpen(true);
                }, 600);
            } catch (err) {
                console.error('[PendingOrdersWakeupModal] Error checking orders:', err);
            }
        };

        checkPendingOrders();

        return () => {
            isMounted = false;
        };
    }, []);

    const handleDismiss = () => {
        const currentSignature = orders.map((o) => o.id).sort().join(',');
        sessionStorage.setItem('ahizan_dismissed_pending_orders', currentSignature);
        setIsOpen(false);
    };

    const handleOpenSingleOrder = (orderId: string) => {
        handleDismiss();
        router.push(`/dashboard/orders/${orderId}`);
    };

    const handleOpenOrderList = () => {
        handleDismiss();
        router.push('/dashboard/orders');
    };

    if (orders.length === 0) return null;

    const isSingle = orders.length === 1;
    const singleOrder = orders[0];
    const totalAccumulated = orders.reduce((sum, o) => sum + (o.totalWithTax || 0), 0);

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleDismiss(); }}>
            <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden border-border/80 shadow-2xl bg-card">
                {/* Header Gradient Banner */}
                <div className="relative bg-gradient-to-br from-primary/15 via-primary/5 to-background p-6 border-b border-border/60">
                    <div className="flex items-center gap-3">
                        <div className="relative flex items-center justify-center w-12 h-12 rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25 shrink-0">
                            {isSingle ? (
                                <ShoppingBag className="w-6 h-6 animate-pulse" />
                            ) : (
                                <Layers className="w-6 h-6 animate-pulse" />
                            )}
                            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-card"></span>
                            </span>
                        </div>
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="text-xs font-semibold px-2 py-0.5 bg-primary/10 text-primary border-primary/20">
                                    {isSingle ? 'Action requise' : `${orders.length} nouvelles commandes`}
                                </Badge>
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Clock className="w-3 h-3" /> En attente
                                </span>
                            </div>
                            <DialogTitle className="text-lg font-bold tracking-tight">
                                {isSingle ? 'Nouvelle commande reçue !' : 'Commandes en attente de traitement'}
                            </DialogTitle>
                        </div>
                    </div>
                </div>

                {/* Body Content */}
                <div className="p-6 space-y-5">
                    {isSingle ? (
                        /* Single Order View */
                        <div className="space-y-4">
                            <div className="rounded-xl p-4 bg-muted/40 border border-border/60 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium text-muted-foreground">Numéro de commande</span>
                                    <span className="font-mono text-sm font-bold text-foreground">#{singleOrder.code}</span>
                                </div>
                                <div className="flex items-center justify-between border-t border-border/40 pt-2">
                                    <span className="text-xs font-medium text-muted-foreground">Montant total</span>
                                    <span className="text-base font-bold text-primary">
                                        {formatPrice(singleOrder.totalWithTax, singleOrder.currencyCode)}
                                    </span>
                                </div>
                                {singleOrder.itemsSummary && singleOrder.itemsSummary.length > 0 && (
                                    <div className="border-t border-border/40 pt-2">
                                        <span className="text-xs font-medium text-muted-foreground block mb-1.5">
                                            Articles ({singleOrder.itemCount}) :
                                        </span>
                                        <div className="flex flex-wrap gap-1.5">
                                            {singleOrder.itemsSummary.map((item, idx) => (
                                                <span
                                                    key={idx}
                                                    className="inline-block text-xs bg-background/80 px-2 py-1 rounded-md border border-border/60 text-foreground truncate max-w-[260px]"
                                                >
                                                    {item}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <p className="text-xs text-muted-foreground leading-relaxed">
                                Le client a validé son paiement. Veuillez vérifier vos stocks et confirmer la préparation du colis.
                            </p>
                        </div>
                    ) : (
                        /* Multiple Orders View */
                        <div className="space-y-4">
                            <div className="rounded-xl p-4 bg-muted/40 border border-border/60 flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground">Montant total cumulé</p>
                                    <p className="text-lg font-bold text-primary">
                                        {formatPrice(totalAccumulated, orders[0]?.currencyCode || 'XOF')}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-medium text-muted-foreground">Commandes à valider</p>
                                    <Badge variant="default" className="text-sm font-bold px-3 py-0.5">
                                        {orders.length}
                                    </Badge>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                    Aperçu des commandes :
                                </span>
                                <div className="max-h-[160px] overflow-y-auto space-y-1.5 pr-1">
                                    {orders.slice(0, 5).map((ord) => (
                                        <div
                                            key={ord.id}
                                            className="flex items-center justify-between p-2.5 rounded-lg bg-muted/25 hover:bg-muted/50 transition-colors border border-border/40 text-xs"
                                        >
                                            <span className="font-mono font-semibold">#{ord.code}</span>
                                            <span className="text-muted-foreground">{ord.itemCount} article(s)</span>
                                            <span className="font-bold text-foreground">
                                                {formatPrice(ord.totalWithTax, ord.currencyCode)}
                                            </span>
                                        </div>
                                    ))}
                                    {orders.length > 5 && (
                                        <p className="text-center text-xs text-muted-foreground py-1">
                                            + {orders.length - 5} autre(s) commande(s)
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
                        {isSingle ? (
                            <Button
                                className="w-full gap-2 shadow-md shadow-primary/20 font-semibold"
                                onClick={() => handleOpenSingleOrder(singleOrder.id)}
                            >
                                <span>Ouvrir et traiter la commande</span>
                                <ArrowRight className="w-4 h-4" />
                            </Button>
                        ) : (
                            <Button
                                className="w-full gap-2 shadow-md shadow-primary/20 font-semibold"
                                onClick={handleOpenOrderList}
                            >
                                <span>Voir toutes les commandes ({orders.length})</span>
                                <ArrowRight className="w-4 h-4" />
                            </Button>
                        )}
                        <Button
                            variant="ghost"
                            className="w-full sm:w-auto text-muted-foreground hover:text-foreground"
                            onClick={handleDismiss}
                        >
                            Traiter plus tard
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
