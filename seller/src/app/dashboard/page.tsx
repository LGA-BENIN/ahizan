import { Package, ShoppingBag, DollarSign, Activity, ArrowRight, TrendingUp, Users, Percent, Truck, AlertTriangle, Wallet } from "lucide-react";
import { query } from "@/lib/vendure/api";
import { GetMyVendorProfileQuery } from "@/lib/vendure/queries";
import { GetMyVendorProductsQuery } from "@/lib/vendure/vendor-product-mutations";
import { GetMyVendorOrdersQuery } from "@/lib/vendure/vendor-order-mutations";
import { unstable_noStore as noStore } from 'next/cache';
import { formatPrice } from "@/lib/format";
import Link from "next/link";
import { getAuthToken } from "@/lib/auth";
import { RevenueChart } from "@/components/dashboard/revenue-chart";

export default async function DashboardPage() {
    noStore();
    const token = await getAuthToken();

    // Fetch vendor profile, products, and orders in parallel
    const [{ data: vendorData }, { data: productsData }, { data: ordersData }] = await Promise.all([
        query(GetMyVendorProfileQuery, {}, { token }).catch(() => ({ data: { myVendorProfile: null } })),
        query(GetMyVendorProductsQuery, { options: { take: 50 } }, { token }).catch(() => ({ data: { myVendorProducts: { items: [], totalItems: 0 } } })),
        query(GetMyVendorOrdersQuery, { options: { take: 10, sort: { updatedAt: 'DESC' } } }, { token }).catch(() => ({ data: { myVendorOrders: { items: [], totalItems: 0 } } }))
    ]);

    const vendor = (vendorData as any)?.myVendorProfile;
    const vendorName = vendor?.name || 'Vendeur';
    const totalProducts = (productsData as any)?.myVendorProducts?.totalItems || 0;
    const rawOrders = (ordersData as any)?.myVendorOrders?.items || [];
    // N'afficher chez le vendeur que les commandes payees ou validees (exclure l'etat de brouillon de paiement)
    const recentOrders = rawOrders.filter((o: any) => o && o.state !== 'AddingItems' && o.state !== 'ArrangingPayment');
    const products = (productsData as any)?.myVendorProducts?.items || [];

    // Filter settled states for revenue calculation
    const settledStates = ['PaymentAuthorized', 'PaymentSettled', 'Shipped', 'Delivered'];
    const settledOrders = recentOrders.filter((o: any) => settledStates.includes(o.state));
    const revenue = settledOrders.reduce((acc: number, o: any) => acc + (o.totalWithTax || 0), 0);

    // Dynamic calculations for "À traiter" center
    const pendingShipmentCount = recentOrders.filter((o: any) => 
        o.customFields?.sellerStatus !== 'confirmed' && 
        o.customFields?.sellerStatus !== 'refused'
    ).length;

    const lowStockCount = products.filter((p: any) => 
        p.variants?.some((v: any) => v.stockLevel !== undefined && Number(v.stockLevel) >= 0 && Number(v.stockLevel) <= 5)
    ).length;

    // Currency code from orders or default
    const currencyCode = recentOrders[0]?.currencyCode || 'XOF';

    // Format initials for client avatar placeholder
    const getInitials = (firstName?: string, lastName?: string) => {
        const first = firstName ? firstName.charAt(0).toUpperCase() : '';
        const last = lastName ? lastName.charAt(0).toUpperCase() : '';
        return `${first}${last}` || 'CL';
    };

    // Helper for order state localization
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
            case 'Cancelled':
                return 'bg-slate-100 text-slate-700 dark:bg-slate-900/40 dark:text-slate-400';
            default:
                return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-400';
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            
            {/* Welcome Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl md:text-4xl font-serif font-black tracking-tight text-foreground">
                        Bonjour, <span className="text-primary">{vendorName}</span>.
                    </h1>
                    <p className="text-sm md:text-base text-muted-foreground font-medium mt-1">
                        Voici l'aperçu de votre activité aujourd'hui. Vos performances sont en hausse de 12%.
                    </p>
                </div>
            </div>

            {/* Stats Grid: 4 Premium Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                
                {/* Card 1: Monthly Sales */}
                <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col justify-between hover:shadow-md hover:border-primary/20 transition-all duration-300 group">
                    <div>
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2.5 bg-primary/5 text-primary rounded-xl group-hover:scale-110 transition-transform">
                                <DollarSign className="w-5 h-5" />
                            </div>
                            <span className="text-[10px] font-black text-green-600 bg-green-50 dark:bg-green-950/20 px-2.5 py-1 rounded-full flex items-center gap-1">
                                <TrendingUp className="w-3 h-3" /> +12%
                            </span>
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1">Ventes du mois</p>
                        <h3 className="text-xl md:text-2xl font-serif font-black tracking-tight group-hover:text-primary transition-colors">
                            {formatPrice(revenue, currencyCode)}
                        </h3>
                    </div>
                    <div className="mt-4 h-10 w-full flex items-end gap-1.5 opacity-90">
                        <div className="w-full h-4 bg-primary/10 rounded-t-sm group-hover:h-6 transition-all duration-500" />
                        <div className="w-full h-6 bg-primary/10 rounded-t-sm group-hover:h-8 transition-all duration-500" />
                        <div className="w-full h-10 bg-primary/20 rounded-t-sm group-hover:h-11 transition-all duration-500" />
                        <div className="w-full h-8 bg-primary/10 rounded-t-sm group-hover:h-9 transition-all duration-500" />
                        <div className="w-full h-12 bg-primary rounded-t-sm transition-all duration-500" />
                    </div>
                </div>

                {/* Card 2: Orders */}
                <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col justify-between hover:shadow-md hover:border-primary/20 transition-all duration-300 group">
                    <div>
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2.5 bg-slate-100 dark:bg-slate-800 text-secondary rounded-xl group-hover:scale-110 transition-transform">
                                <ShoppingBag className="w-5 h-5" />
                            </div>
                            <span className="text-[10px] font-black text-green-600 bg-green-50 dark:bg-green-950/20 px-2.5 py-1 rounded-full flex items-center gap-1">
                                <TrendingUp className="w-3 h-3" /> +5%
                            </span>
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1">Commandes</p>
                        <h3 className="text-xl md:text-2xl font-serif font-black tracking-tight">
                            {recentOrders.length}
                        </h3>
                    </div>
                    <div className="mt-6 text-[10px] text-muted-foreground font-semibold italic">
                        Moyenne de 4.2 commandes/jour
                    </div>
                </div>

                {/* Card 3: Visitors */}
                <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col justify-between hover:shadow-md hover:border-primary/20 transition-all duration-300 group">
                    <div>
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2.5 bg-cyan-50 text-cyan-600 dark:bg-cyan-950/10 dark:text-cyan-400 rounded-xl group-hover:scale-110 transition-transform">
                                <Users className="w-5 h-5" />
                            </div>
                            <span className="text-[10px] font-black text-green-600 bg-green-50 dark:bg-green-950/20 px-2.5 py-1 rounded-full flex items-center gap-1">
                                <TrendingUp className="w-3 h-3" /> +18%
                            </span>
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1">Visiteurs</p>
                        <h3 className="text-xl md:text-2xl font-serif font-black tracking-tight">
                            12.450
                        </h3>
                    </div>
                    <div className="mt-6 w-full bg-slate-100 dark:bg-slate-850 h-2 rounded-full overflow-hidden">
                        <div className="bg-cyan-500 w-3/4 h-full rounded-full" />
                    </div>
                </div>

                {/* Card 4: Conversion Rate */}
                <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col justify-between hover:shadow-md hover:border-primary/20 transition-all duration-300 group">
                    <div>
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2.5 bg-primary/5 text-primary rounded-xl group-hover:scale-110 transition-transform">
                                <Percent className="w-5 h-5" />
                            </div>
                            <span className="text-[10px] font-black text-muted-foreground bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full">
                                Stable
                            </span>
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1">Taux de conversion</p>
                        <h3 className="text-xl md:text-2xl font-serif font-black tracking-tight">
                            2.4%
                        </h3>
                    </div>
                    <div className="mt-6 text-[10px] text-primary font-bold hover:underline cursor-pointer flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                        Voir l'entonnoir de vente →
                    </div>
                </div>

            </div>

            {/* Bento Grid: Performance & Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Performance Chart (8 Cols) */}
                <div className="lg:col-span-8 bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h4 className="text-base md:text-lg font-serif font-black text-foreground">Performance</h4>
                            <p className="text-[10px] text-muted-foreground font-black uppercase tracking-wider mt-0.5">30 derniers jours</p>
                        </div>
                        <div className="flex gap-1.5 bg-muted/50 p-1 rounded-xl">
                            <button className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider bg-primary text-white rounded-lg shadow-sm">Revenus</button>
                            <button className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-muted-foreground hover:text-foreground rounded-lg transition-colors">Commandes</button>
                        </div>
                    </div>
                    <div className="mt-4">
                        <RevenueChart orders={recentOrders} currencyCode={currencyCode} />
                    </div>
                </div>

                {/* Intelligence & Actions Side (4 Cols) */}
                <div className="lg:col-span-4 flex flex-col gap-6">
                    
                    {/* À traiter widget */}
                    <div className="bg-card border border-border rounded-2xl p-6 shadow-sm relative overflow-hidden flex-1">
                        <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
                        <div className="flex items-center gap-2 mb-6">
                            <Activity className="w-5 h-5 text-primary" />
                            <h4 className="text-base md:text-lg font-serif font-black text-foreground">À traiter</h4>
                        </div>
                        
                        <div className="space-y-4">
                            
                            {/* Actions: Shipments */}
                            <Link href="/dashboard/orders" className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/60 border border-transparent hover:border-border/40 transition-all group">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                                        <Truck className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-foreground">
                                            {pendingShipmentCount} commande{pendingShipmentCount > 1 ? 's' : ''} à expédier
                                        </p>
                                        <p className="text-[10px] text-muted-foreground font-medium">Action requise immédiatement</p>
                                    </div>
                                </div>
                                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                            </Link>

                            {/* Actions: Low Stock */}
                            <Link href="/dashboard/products" className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/60 border border-transparent hover:border-border/40 transition-all group">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${lowStockCount > 0 ? 'bg-amber-55/10 text-amber-600' : 'bg-green-50 text-green-600 dark:bg-green-950/20'}`}>
                                        <AlertTriangle className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-foreground">
                                            {lowStockCount > 0 ? `${lowStockCount} produit${lowStockCount > 1 ? 's' : ''} bientôt en rupture` : 'Stocks entièrement à jour'}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground font-medium">
                                            {lowStockCount > 0 ? 'Opportunité de réapprovisionnement' : 'Aucun produit en rupture'}
                                        </p>
                                    </div>
                                </div>
                                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                            </Link>

                            {/* Actions: Payments/Wallet */}
                            <Link href="/dashboard/wallet" className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/60 border border-transparent hover:border-border/40 transition-all group">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-blue-55/10 text-blue-600 flex items-center justify-center">
                                        <Wallet className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-foreground">Portefeuille vendeur</p>
                                        <p className="text-[10px] text-muted-foreground font-medium">Gérer vos virements et soldes</p>
                                    </div>
                                </div>
                                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                            </Link>

                        </div>
                    </div>

                    {/* Marketplace advertising tip */}
                    <div className="bg-[#0d1c32] text-white rounded-2xl p-6 shadow-md relative overflow-hidden group flex-1 flex flex-col justify-between">
                        <div className="relative z-10 space-y-3">
                            <h5 className="font-serif font-black text-lg">Booster vos ventes</h5>
                            <p className="text-xs text-slate-300 leading-relaxed max-w-[90%]">
                                Utilisez nos nouvelles campagnes publicitaires pour toucher +20% d'audience sur les produits phares.
                            </p>
                        </div>
                        <button className="relative z-10 w-full mt-6 py-3 bg-primary text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95">
                            Découvrir
                        </button>
                        <Activity className="absolute -bottom-6 -right-6 w-32 h-32 text-white/5 rotate-12 group-hover:rotate-0 transition-transform duration-700 pointer-events-none" />
                    </div>

                </div>

            </div>

            {/* Recent Sales Table */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                <div className="p-6 border-b border-border flex justify-between items-center bg-card">
                    <div>
                        <h4 className="text-base md:text-lg font-serif font-black text-foreground">Ventes récentes</h4>
                        <p className="text-[10px] text-muted-foreground font-black uppercase tracking-wider mt-0.5">Dernières commandes enregistrées</p>
                    </div>
                    <Link href="/dashboard/orders" className="text-primary font-bold text-xs hover:underline uppercase tracking-wider">
                        Tout voir
                    </Link>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-muted/30 text-muted-foreground text-[10px] uppercase font-black tracking-wider border-b border-border">
                                <th className="px-6 py-4">Client</th>
                                <th className="px-6 py-4">ID Commande</th>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4 text-right">Montant</th>
                                <th className="px-6 py-4">Statut</th>
                                <th className="px-6 py-4 text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {recentOrders.length > 0 ? (
                                recentOrders.map((order: any) => (
                                    <tr key={order.id} className="hover:bg-muted/20 transition-colors group">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shadow-inner">
                                                    {getInitials(order.customer?.firstName, order.customer?.lastName)}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-foreground leading-none">
                                                        {order.customer?.firstName} {order.customer?.lastName}
                                                    </p>
                                                    <p className="text-[10px] text-muted-foreground mt-1">
                                                        {order.customer?.emailAddress || 'email@example.com'}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap font-mono text-xs text-muted-foreground">
                                            {order.code}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-xs text-foreground font-medium">
                                            {new Date(order.updatedAt).toLocaleDateString('fr-FR', {
                                                day: 'numeric',
                                                month: 'short',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right font-bold text-primary text-sm">
                                            {formatPrice(order.totalWithTax, order.currencyCode)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border border-transparent ${getStatusStyles(order.state, order.customFields?.sellerStatus)}`}>
                                                {getStatusLabel(order.state, order.customFields?.sellerStatus)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            <Link href={`/dashboard/orders/${order.id}`}>
                                                <button className="p-2 bg-muted/60 text-muted-foreground rounded-lg border border-transparent hover:border-border hover:bg-card hover:text-primary transition-all group-hover:scale-105">
                                                    <ArrowRight className="w-4 h-4" />
                                                </button>
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="p-16 text-center text-muted-foreground">
                                        <p className="text-sm font-medium">Aucune commande récente.</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Floating Action Button (FAB) contextuel */}
            <Link href="/dashboard/products/new">
                <button className="fixed bottom-8 right-8 w-14 h-14 bg-primary text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all group z-50">
                    <span className="material-symbols-outlined">add</span>
                    <span className="absolute right-full mr-4 px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-xl border border-slate-800">
                        Nouveau Produit
                    </span>
                </button>
            </Link>

        </div>
    );
}
