import { Package, ShoppingBag, DollarSign, Activity, ArrowRight } from "lucide-react";
import { query } from "@/lib/vendure/api";
import { GetMyVendorProfileQuery } from "@/lib/vendure/queries";
import { GetMyVendorProductsQuery } from "@/lib/vendure/vendor-product-mutations";
import { GetMyVendorOrdersQuery } from "@/lib/vendure/vendor-order-mutations";
import { unstable_noStore as noStore } from 'next/cache';
import { formatPrice } from "@/lib/format";
import Link from "next/link";
import { getAuthToken } from "@/lib/auth";

export default async function DashboardPage() {
    noStore();
    const token = await getAuthToken();

    const [{ data: vendorData }, { data: productsData }, { data: ordersData }] = await Promise.all([
        query(GetMyVendorProfileQuery, {}, { token }).catch(() => ({ data: { myVendorProfile: null } })),
        query(GetMyVendorProductsQuery, { options: { take: 1 } }, { token }).catch(() => ({ data: { myVendorProducts: { items: [], totalItems: 0 } } })),
        query(GetMyVendorOrdersQuery, { options: { take: 10, sort: { updatedAt: 'DESC' } } }, { token }).catch(() => ({ data: { myVendorOrders: { items: [], totalItems: 0 } } }))
    ]);

    const vendor = (vendorData as any)?.myVendorProfile;
    const totalProducts = (productsData as any)?.myVendorProducts?.totalItems || 0;
    const recentOrders = (ordersData as any)?.myVendorOrders?.items || [];
    const vendorName = vendor?.name || 'Vendeur';

    // Simple revenue calculation (sum of recent orders for demo)
    const revenue = recentOrders.reduce((acc: number, o: any) => acc + (o.totalWithTax || 0), 0);

    const stats = [
        { name: 'Ventes du mois', value: formatPrice(revenue, 'XOF'), icon: DollarSign, color: 'text-brand-navy' },
        { name: 'Commandes', value: recentOrders.length.toString(), icon: ShoppingBag, color: 'text-brand-navy' },
        { name: 'Produits', value: totalProducts.toString(), icon: Package, color: 'text-brand-navy' },
    ];

    return (
        <div className="space-y-12">
            {/* Header: Minimalist */}
            <div className="space-y-2">
                <h1 className="text-3xl font-black tracking-tight text-foreground">Bonjour, {vendorName}</h1>
                <p className="text-muted-foreground font-medium">Voici l&apos;aperçu de votre activité sur AHIZAN.</p>
            </div>

            {/* Stats: Super Clean Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {stats.map((stat) => (
                    <div key={stat.name} className="bg-card border border-border p-8 rounded-2xl shadow-sm hover:border-brand-navy/20 transition-colors">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="p-3 bg-muted rounded-xl text-brand-navy">
                                <stat.icon className="w-5 h-5" />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{stat.name}</span>
                        </div>
                        <p className="text-3xl font-black tracking-tight">{stat.value}</p>
                    </div>
                ))}
            </div>

            {/* Recent Table: No flourishes */}
            <div className="space-y-6">
                <div className="flex justify-between items-center bg-muted/40 p-4 px-6 rounded-2xl border border-border">
                    <h2 className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                         <Activity className="w-4 h-4 text-brand-navy" />
                         Ventes Récentes
                    </h2>
                    <Link href="/dashboard/orders" className="text-[10px] font-bold text-brand-navy hover:underline">
                        Tout voir
                    </Link>
                </div>

                <div className="bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border">
                    {recentOrders.length > 0 ? (
                        recentOrders.map((order: any) => (
                            <div key={order.id} className="p-6 flex items-center justify-between hover:bg-muted/10 transition-colors group">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center font-bold text-muted-foreground text-[10px]">
                                        #{order.code.slice(-4)}
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm">{order.code}</p>
                                        <p className="text-[10px] text-muted-foreground font-medium">{new Date(order.updatedAt).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-6">
                                    <div className="text-right">
                                        <p className="font-black text-sm">{formatPrice(order.totalWithTax, order.currencyCode)}</p>
                                        <span className="text-[9px] font-bold uppercase text-brand-navy bg-brand-navy/5 px-2 py-0.5 rounded-full inline-block mt-1">
                                            {order.state}
                                        </span>
                                    </div>
                                    <Link href={`/dashboard/orders/${order.id}`}>
                                        <div className="p-2 rounded-lg bg-muted text-muted-foreground group-hover:bg-brand-navy group-hover:text-white transition-all">
                                            <ArrowRight className="w-4 h-4" />
                                        </div>
                                    </Link>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="p-16 text-center text-muted-foreground">
                            <p className="text-sm font-medium">Aucune commande récente.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
