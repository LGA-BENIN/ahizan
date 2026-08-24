'use client';

import { useState, useTransition, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
    Search, 
    Printer, 
    Truck, 
    ShoppingBag, 
    ChevronLeft, 
    ChevronRight, 
    Download,
    Inbox,
    User,
    MapPin,
    Package,
    Clock,
    X,
    CheckCircle2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatPrice } from '@/lib/format';
import { updateOrderSellerStatusAction } from '@/app/dashboard/orders/actions';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

interface OrdersTableProps {
    initialOrders: any[];
}

export default function OrdersTable({ initialOrders }: OrdersTableProps) {
    const [orders, setOrders] = useState(initialOrders);
    const [filterTab, setFilterTab] = useState<'all' | 'pending' | 'attente' | 'completed'>('all');
    const [isPending, startTransition] = useTransition();
    const router = useRouter();

    // Tab filtering logic matching Vendure states
    const filteredOrders = useMemo(() => {
        return orders.filter(order => {
            const sellerStatus = order.customFields?.sellerStatus || 'pending';
            
            if (filterTab === 'pending') {
                // À expédier (Payée/Prête mais non confirmée ni refusée par le vendeur)
                return sellerStatus !== 'confirmed' && sellerStatus !== 'refused';
            }
            if (filterTab === 'attente') {
                // En attente (statut de paiement de base en cours)
                return order.state === 'AddingItems' || order.state === 'ArrangingPayment';
            }
            if (filterTab === 'completed') {
                // Terminées
                return order.state === 'Delivered' || sellerStatus === 'confirmed';
            }
            return true; // Toutes
        });
    }, [orders, filterTab]);

    // Handle seller status update (Confirm Shipment)
    const handleConfirmShipment = async (orderId: string) => {
        startTransition(async () => {
            const res = await updateOrderSellerStatusAction(orderId, 'confirmed');
            if (res.success) {
                toast.success('Commande confirmée pour expédition');
                // Update local state to reflect change immediately
                setOrders(prev => prev.map(o => {
                    if (o.id === orderId) {
                        return {
                            ...o,
                            customFields: {
                                ...o.customFields,
                                sellerStatus: 'confirmed'
                            }
                        };
                    }
                    return o;
                }));
            } else {
                toast.error(res.error || "Erreur lors de la confirmation");
            }
        });
    };

    // Client-side CSV export function
    const exportToCSV = () => {
        if (filteredOrders.length === 0) {
            toast.error('Aucune donnée à exporter');
            return;
        }
        
        const headers = ['ID Commande', 'Client', 'Email', 'Date', 'Total (FCFA)', 'Devise', 'Statut Vendeur', 'Statut Général'];
        const rows = filteredOrders.map(o => [
            o.code,
            `${o.customer?.firstName || ''} ${o.customer?.lastName || ''}`,
            o.customer?.emailAddress || '',
            new Date(o.updatedAt).toLocaleDateString('fr-FR'),
            Number(o.totalWithTax || 0).toFixed(0),
            o.currencyCode || 'XOF',
            o.customFields?.sellerStatus || 'pending',
            o.state
        ]);

        const csvContent = [headers.join(','), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n');
        const blob = new Blob([UTF8BOM(), csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `commandes_ahizan_${filterTab}_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Export CSV téléchargé');
    };

    // Helper for UTF-8 BOM to support Excel french characters
    function UTF8BOM() {
        return new Uint8Array([0xEF, 0xBB, 0xBF]);
    }

    const getInitials = (firstName?: string, lastName?: string) => {
        const first = firstName ? firstName.charAt(0).toUpperCase() : '';
        const last = lastName ? lastName.charAt(0).toUpperCase() : '';
        return `${first}${last}` || 'CL';
    };

    const getStatusStyles = (state: string, sellerStatus?: string) => {
        if (sellerStatus === 'confirmed') {
            return 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400';
        }
        if (sellerStatus === 'refused') {
            return 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400';
        }
        switch (state) {
            case 'Shipped':
                return 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400';
            case 'Delivered':
                return 'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400';
            default:
                return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-400';
        }
    };

    const getStatusLabel = (state: string, sellerStatus?: string) => {
        if (sellerStatus === 'confirmed') return 'Validé';
        if (sellerStatus === 'refused') return 'Refusé';
        
        switch (state) {
            case 'PaymentSettled': return 'Payé';
            case 'Shipped': return 'Expédié';
            case 'Delivered': return 'Livré';
            case 'Cancelled': return 'Annulé';
            default: return 'En attente';
        }
    };

    return (
        <div className="w-full space-y-6">
                
                {/* Header & CSV Export */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-serif font-black tracking-tight text-foreground">Mes Ventes</h1>
                        <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mt-0.5">Suivi et gestion de vos expéditions en temps réel</p>
                    </div>
                    <Button 
                        onClick={exportToCSV}
                        className="bg-primary hover:bg-primary/90 text-white font-bold h-11 px-6 rounded-xl shadow-md flex items-center gap-2 uppercase text-[10px] tracking-widest transition-all active:scale-95 shrink-0"
                    >
                        <Download className="w-4 h-4" />
                        Exporter CSV
                    </Button>
                </div>

                {/* Filter Tabs horizontaux de Stitch */}
                <div className="flex items-center border-b border-border overflow-x-auto scrollbar-hide w-full gap-2">
                    <button 
                        onClick={() => setFilterTab('all')}
                        className={cn(
                            "px-4 py-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all whitespace-nowrap",
                            filterTab === 'all' 
                                ? "border-primary text-primary" 
                                : "border-transparent text-muted-foreground hover:text-foreground"
                        )}
                    >
                        Toutes ({orders.length})
                    </button>
                    <button 
                        onClick={() => setFilterTab('pending')}
                        className={cn(
                            "px-4 py-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all whitespace-nowrap",
                            filterTab === 'pending' 
                                ? "border-primary text-primary" 
                                : "border-transparent text-muted-foreground hover:text-foreground"
                        )}
                    >
                        À expédier ({orders.filter(o => o.customFields?.sellerStatus !== 'confirmed' && o.customFields?.sellerStatus !== 'refused').length})
                    </button>
                    <button 
                        onClick={() => setFilterTab('attente')}
                        className={cn(
                            "px-4 py-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all whitespace-nowrap",
                            filterTab === 'attente' 
                                ? "border-primary text-primary" 
                                : "border-transparent text-muted-foreground hover:text-foreground"
                        )}
                    >
                        En attente ({orders.filter(o => o.state === 'AddingItems' || o.state === 'ArrangingPayment').length})
                    </button>
                    <button 
                        onClick={() => setFilterTab('completed')}
                        className={cn(
                            "px-4 py-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all whitespace-nowrap",
                            filterTab === 'completed' 
                                ? "border-primary text-primary" 
                                : "border-transparent text-muted-foreground hover:text-foreground"
                        )}
                    >
                        Terminées ({orders.filter(o => o.state === 'Delivered' || o.customFields?.sellerStatus === 'confirmed').length})
                    </button>
                </div>

                {/* Orders Table Container */}
                <div className="bg-card border border-border rounded-[2.5rem] overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-muted/30 text-muted-foreground text-[10px] uppercase font-black tracking-wider border-b border-border">
                                    <th className="px-6 py-4">ID Commande</th>
                                    <th className="px-6 py-4">Client</th>
                                    <th className="px-6 py-4">Date</th>
                                    <th className="px-6 py-4 text-right">Montant</th>
                                    <th className="px-6 py-4">Statut</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {filteredOrders.length > 0 ? (
                                    filteredOrders.map((order: any) => {
                                        return (
                                            <tr 
                                                key={order.id} 
                                                onClick={() => router.push(`/dashboard/orders/${order.id}`)}
                                                className="cursor-pointer transition-all hover:bg-muted/20 border-l-4 border-transparent"
                                            >
                                                <td className="px-6 py-5 whitespace-nowrap font-mono text-xs text-primary font-bold">
                                                    {order.code}
                                                </td>
                                                <td className="px-6 py-5 whitespace-nowrap">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shadow-inner">
                                                            {getInitials(order.customer?.firstName, order.customer?.lastName)}
                                                        </div>
                                                        <span className="text-sm font-bold text-foreground">
                                                            {order.customer?.firstName} {order.customer?.lastName}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5 whitespace-nowrap text-xs text-muted-foreground font-medium">
                                                    {new Date(order.updatedAt).toLocaleDateString('fr-FR', {
                                                        day: 'numeric',
                                                        month: 'short',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </td>
                                                <td className="px-6 py-5 whitespace-nowrap text-right font-bold text-foreground text-sm">
                                                    {formatPrice(order.totalWithTax, order.currencyCode)}
                                                </td>
                                                <td className="px-6 py-5 whitespace-nowrap">
                                                    <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border border-transparent ${getStatusStyles(order.state, order.customFields?.sellerStatus)}`}>
                                                        {getStatusLabel(order.state, order.customFields?.sellerStatus)}
                                                    </span>
                                                    <div className="text-[10px] text-muted-foreground font-bold mt-1">
                                                        {order.lines?.filter((l: any) => l.customFields?.sellerStatus === 'confirmed').length || 0} / {order.lines?.length || 0} validés
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5 whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <button 
                                                            onClick={() => {
                                                                toast.success('Bordereau envoyé à l\'impression');
                                                                window.print();
                                                            }}
                                                            className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-lg border border-transparent hover:border-border transition-all" 
                                                            title="Imprimer le bordereau"
                                                        >
                                                            <Printer className="w-4 h-4" />
                                                        </button>
                                                        {order.customFields?.sellerStatus !== 'confirmed' && (
                                                            <button 
                                                                onClick={() => handleConfirmShipment(order.id)}
                                                                className="p-2 text-muted-foreground hover:text-green-600 hover:bg-green-50 rounded-lg border border-transparent hover:border-border transition-all"
                                                                title="Confirmer l'envoi"
                                                                disabled={isPending}
                                                            >
                                                                <Truck className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={6} className="p-16 text-center text-muted-foreground">
                                            <p className="text-sm font-medium">Aucune commande correspondante.</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    
                    {/* Pagination */}
                    <div className="px-6 py-4 bg-muted/20 border-t border-border flex justify-between items-center">
                        <p className="text-xs text-muted-foreground">
                            Affichage de <span className="font-bold text-foreground">{filteredOrders.length}</span> commandes
                        </p>
                        <div className="flex gap-2">
                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl border border-border bg-card" disabled>
                                <ChevronLeft className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl border border-border bg-card" disabled>
                                <ChevronRight className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
    );
}
