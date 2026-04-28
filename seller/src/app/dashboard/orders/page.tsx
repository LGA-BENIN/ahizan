import { query } from '@/lib/vendure/api';
import { GetMyVendorOrdersQuery } from '@/lib/vendure/vendor-order-mutations';
import { getAuthToken } from '@/lib/auth';
import { formatPrice } from '@/lib/format';
import Link from 'next/link';
import { Suspense } from 'react';
import OrderFilters from '@/components/dashboard/order-filters';
import OrderRowActions from '@/components/dashboard/order-row-actions';
import { ShoppingBag } from 'lucide-react';
import { cn } from '@/lib/utils';

const getSellerStatusBadge = (status?: string) => {
    const s = status || 'pending';
    switch (s) {
        case 'confirmed': 
            return <span className="px-3 py-1 text-[10px] font-bold rounded-full bg-blue-50 text-blue-700 border border-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-900/30 uppercase tracking-wider">Confirmée</span>;
        case 'refused': 
            return <span className="px-3 py-1 text-[10px] font-bold rounded-full bg-red-50 text-red-700 border border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/30 uppercase tracking-wider">Refusée</span>;
        default: 
            return <span className="px-3 py-1 text-[10px] font-bold rounded-full bg-amber-50 text-amber-700 border border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-900/30 uppercase tracking-wider">En attente</span>;
    }
};

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

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-2xl md:text-3xl font-serif font-bold tracking-tight">Mes Commandes</h1>
            </div>
            
            <Suspense fallback={<div className="h-20 bg-card animate-pulse rounded-2xl border" />}>
                <OrderFilters />
            </Suspense>

            <div className="bg-card rounded-2xl md:rounded-[2rem] border border-border overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-border">
                        <thead>
                            <tr className="bg-muted/30">
                                <th className="px-6 py-4 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Commande</th>
                                <th className="px-6 py-4 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Client</th>
                                <th className="px-6 py-4 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Total</th>
                                <th className="px-6 py-4 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-right text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border bg-card">
                            {orders.map((order: any) => (
                                <tr key={order.id} className="group hover:bg-muted/30 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{order.code}</span>
                                            <span className="text-[10px] text-muted-foreground">
                                                {new Date(order.updatedAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-foreground">
                                                {order.customer?.firstName} {order.customer?.lastName}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground">{order.customer?.emailAddress}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex flex-col text-sm">
                                            <span className="font-bold text-brand-navy">
                                                {formatPrice(order.totalWithTax, order.currencyCode)}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground">{order.lines.length} article(s)</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {getSellerStatusBadge(order.customFields?.sellerStatus)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                        <OrderRowActions 
                                            orderId={order.id} 
                                            sellerStatus={order.customFields?.sellerStatus} 
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {orders.length === 0 && (
                    <div className="flex flex-col items-center justify-center p-20 text-center space-y-4">
                        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                            <ShoppingBag className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <div className="space-y-1">
                            <p className="font-bold text-lg text-foreground">Aucune commande</p>
                            <p className="text-sm text-muted-foreground">Vous n'avez pas encore reçu de commandes.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
