import { query } from '@/lib/vendure/api';
import { GetMyVendorProfileQuery } from '@/lib/vendure/queries';
import { GetMyVendorOrdersQuery } from '@/lib/vendure/vendor-order-mutations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wallet, TrendingDown, TrendingUp, AlertTriangle } from 'lucide-react';
import { formatPrice } from '@/lib/format';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { unstable_noStore as noStore } from 'next/cache';
import WalletRechargeButton from './wallet-recharge-button';

export default async function WalletPage() {
    noStore();

    const [{ data: vendorData }, { data: ordersData }] = await Promise.all([
        query(GetMyVendorProfileQuery, {}, { useAuthToken: true }).catch(() => ({ data: { myVendorProfile: null } })),
        query(GetMyVendorOrdersQuery, { options: { take: 50, sort: { updatedAt: 'DESC' } } }, { useAuthToken: true }).catch(() => ({ data: { myVendorOrders: { items: [], totalItems: 0 } } })),
    ]);

    const vendor = (vendorData as any)?.myVendorProfile;
    const orders = (ordersData as any)?.myVendorOrders?.items || [];

    const walletBalance: number = vendor?.walletBalance ?? 0;
    const commissionRate: number = vendor?.commissionRate ?? 0;
    const currencyCode = 'XOF';

    // Compute total deducted commission from completed orders
    const settledOrders = orders.filter((o: any) => ['PaymentSettled', 'Shipped', 'Delivered'].includes(o.state));
    const totalCommissionPaid = settledOrders.reduce((sum: number, o: any) => {
        return sum + Math.round((o.totalWithTax * commissionRate) / 100);
    }, 0);

    const isLowBalance = walletBalance < 5000;
    const isNegative = walletBalance < 0;

    return (
        <div className="space-y-6 max-w-3xl mx-auto">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Mon Portefeuille</h1>
                <p className="text-muted-foreground mt-1">
                    Gérez votre solde prépayé. Votre taux de commission actuel est de <strong>{commissionRate}%</strong>.
                </p>
            </div>

            {isNegative && (
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Solde négatif</AlertTitle>
                    <AlertDescription>
                        Votre portefeuille est en négatif. Veuillez recharger votre compte pour éviter que vos produits soient bloqués lors du checkout.
                    </AlertDescription>
                </Alert>
            )}

            {!isNegative && isLowBalance && (
                <Alert className="bg-yellow-50 border-yellow-200 text-yellow-900">
                    <AlertTriangle className="h-4 w-4 stroke-yellow-700" />
                    <AlertTitle>Solde faible</AlertTitle>
                    <AlertDescription>
                        Votre solde est faible. Pensez à recharger votre portefeuille pour éviter une interruption de service.
                    </AlertDescription>
                </Alert>
            )}

            <div className="grid gap-4 md:grid-cols-3">
                <Card className={isNegative ? 'border-red-300 bg-red-50' : ''}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Solde Actuel</CardTitle>
                        <Wallet className={`h-4 w-4 ${isNegative ? 'text-red-500' : 'text-muted-foreground'}`} />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${isNegative ? 'text-red-600' : 'text-green-600'}`}>
                            {formatPrice(walletBalance, currencyCode)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Prépayé sur la plateforme</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Commissions Payées</CardTitle>
                        <TrendingDown className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatPrice(totalCommissionPaid, currencyCode)}</div>
                        <p className="text-xs text-muted-foreground mt-1">Sur les commandes livrées</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Commandes Réglées</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{settledOrders.length}</div>
                        <p className="text-xs text-muted-foreground mt-1">Livraisons effectuées</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Recharger mon Portefeuille</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                        Pour recharger votre portefeuille, effectuez un virement ou un paiement Mobile Money à la plateforme Ahizan, puis notifiez-nous pour que nous crééditions votre compte.
                    </p>
                    <div className="rounded-md bg-muted p-4 text-sm space-y-1">
                        <p><strong>MTN Mobile Money :</strong> +229 XX XX XX XX</p>
                        <p><strong>Moov Money :</strong> +229 XX XX XX XX</p>
                        <p className="text-xs text-muted-foreground mt-2">Mentionnez votre nom de boutique dans le motif du paiement.</p>
                    </div>
                    <WalletRechargeButton vendorName={vendor?.name} />
                </CardContent>
            </Card>

            {orders.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Historique des Déductions</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {orders.slice(0, 10).map((order: any) => {
                                const commission = Math.round((order.totalWithTax * commissionRate) / 100);
                                return (
                                    <div key={order.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                                        <div>
                                            <p className="text-sm font-medium">{order.code}</p>
                                            <p className="text-xs text-muted-foreground">{new Date(order.createdAt).toLocaleDateString('fr-FR')}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-medium text-red-600">-{formatPrice(commission, currencyCode)}</p>
                                            <p className="text-xs text-muted-foreground">{order.state}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
