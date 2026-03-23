import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, ShoppingBag, DollarSign, TrendingUp, AlertCircle } from "lucide-react";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { query } from "@/lib/vendure/api";
import { GetMyVendorProfileQuery } from "@/lib/vendure/queries";
import { GetMyVendorProductsQuery } from "@/lib/vendure/vendor-product-mutations";
import { GetMyVendorOrdersQuery } from "@/lib/vendure/vendor-order-mutations";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { unstable_noStore as noStore } from 'next/cache';
import { formatPrice } from "@/lib/format";
import Link from "next/link";
import { getAuthToken } from "@/lib/auth";

export default async function DashboardPage() {
    noStore();

    const token = await getAuthToken();

    const [{ data: vendorData }, { data: productsData }, { data: ordersData }] = await Promise.all([
        query(GetMyVendorProfileQuery, {}, { token }).catch(() => ({ data: { myVendorProfile: null } })),
        query(GetMyVendorProductsQuery, { options: { take: 100 } }, { token }).catch(() => ({ data: { myVendorProducts: { items: [], totalItems: 0 } } })),
        query(GetMyVendorOrdersQuery, { options: { take: 50, sort: { updatedAt: 'DESC' } } }, { token }).catch(() => ({ data: { myVendorOrders: { items: [], totalItems: 0 } } }))
    ]);

    const vendor = (vendorData as any)?.myVendorProfile;
    const products = (productsData as any)?.myVendorProducts?.items || [];
    const orders = (ordersData as any)?.myVendorOrders?.items || [];
    const totalProducts = (productsData as any)?.myVendorProducts?.totalItems || 0;
    const totalOrdersCount = (ordersData as any)?.myVendorOrders?.totalItems || 0;

    // Calculate total revenue from settled orders
    const settledOrders = orders.filter((o: any) => ['PaymentAuthorized', 'PaymentSettled', 'Shipped', 'Delivered'].includes(o.state));
    const totalRevenue = settledOrders.reduce((sum: number, order: any) => sum + order.totalWithTax, 0);
    const currencyCode = orders[0]?.currencyCode || 'XOF';

    const isPending = vendor?.status === 'PENDING';

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Tableau de bord</h1>

            {isPending && (
                <Alert variant="default" className="bg-yellow-50 border-yellow-200 text-yellow-800">
                    <AlertCircle className="h-4 w-4 stroke-yellow-800" />
                    <AlertTitle>Compte en attente de validation</AlertTitle>
                    <AlertDescription>
                        Votre compte vendeur est en cours de vérification. Vous serez notifié une fois qu'il sera approuvé.
                        Certaines fonctionnalités peuvent être limitées en attendant.
                    </AlertDescription>
                </Alert>
            )}

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Revenu total</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatPrice(totalRevenue, currencyCode)}</div>
                        <p className="text-xs text-muted-foreground">Commandes réglées</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Commandes</CardTitle>
                        <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalOrdersCount}</div>
                        <p className="text-xs text-muted-foreground">Total des commandes</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Produits</CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalProducts}</div>
                        <p className="text-xs text-muted-foreground">Produits actifs au catalogue</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Statut</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold capitalize">{vendor?.status?.toLowerCase() || 'Offline'}</div>
                        <p className="text-xs text-muted-foreground">Statut actuel du compte</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>Revenus (30 jours)</CardTitle>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <RevenueChart orders={orders} currencyCode={currencyCode} />
                    </CardContent>
                </Card>
                <Card className="col-span-3">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Commandes récentes</CardTitle>
                        <Link href="/dashboard/orders" className="text-xs text-orange-600 hover:underline">Voir tout</Link>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {orders.slice(0, 5).map((order: any) => (
                                <div key={order.id} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium leading-none">{order.code}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {order.customer?.firstName} {order.customer?.lastName}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-medium">{formatPrice(order.totalWithTax, order.currencyCode)}</p>
                                        <p className={`text-[10px] font-semibold ${order.state === 'PaymentSettled' ? 'text-green-600' : 'text-gray-500'}`}>
                                            {order.state}
                                        </p>
                                    </div>
                                </div>
                            ))}
                            {orders.length === 0 && (
                                <div className="text-sm text-center text-muted-foreground py-8">
                                    Aucune commande récente
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
