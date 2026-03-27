import { query } from '@/lib/vendure/api';
import { GetMyVendorProfileQuery } from '@/lib/vendure/queries';
import { GetMyVendorOrdersQuery } from '@/lib/vendure/vendor-order-mutations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wallet, TrendingDown, TrendingUp, AlertTriangle, CreditCard, History } from 'lucide-react';
import { formatPrice } from '@/lib/format';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { unstable_noStore as noStore } from 'next/cache';
import WalletRechargeButton from './wallet-recharge-button';
import { getAuthToken } from '@/lib/auth';

export default async function WalletPage() {
    noStore();

    const token = await getAuthToken();

    const [{ data: vendorData }, { data: ordersData }] = await Promise.all([
        query(GetMyVendorProfileQuery, {}, { token }).catch(() => ({ data: { myVendorProfile: null } })),
        query(GetMyVendorOrdersQuery, { options: { take: 50, sort: { updatedAt: 'DESC' } } }, { token }).catch(() => ({ data: { myVendorOrders: { items: [], totalItems: 0 } } })),
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
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl md:text-4xl font-serif font-black tracking-tight text-foreground italic underline decoration-brand-red decoration-4">Mon Portefeuille</h1>
                <p className="text-muted-foreground font-medium">
                    Gestion de votre solde prépayé. Taux de commission : <span className="text-brand-navy font-black">{commissionRate}%</span>.
                </p>
            </div>

            {isNegative && (
                <Alert variant="destructive" className="rounded-2xl border-2 border-destructive bg-destructive/10 shadow-lg animate-pulse">
                    <AlertTriangle className="h-5 w-5" />
                    <AlertTitle className="font-black uppercase tracking-wider text-[10px] mb-1">Alerte Critique : Solde négatif</AlertTitle>
                    <AlertDescription className="text-xs md:text-sm font-bold">
                        Votre portefeuille est débiteur. Rechargez immédiatement pour éviter le blocage de vos produits au checkout.
                    </AlertDescription>
                </Alert>
            )}

            {!isNegative && isLowBalance && (
                <Alert className="rounded-2xl border-2 border-amber-500/50 bg-amber-500/10 shadow-md">
                    <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    <AlertTitle className="font-black uppercase tracking-wider text-[10px] mb-1 text-amber-700 dark:text-amber-300">Attention : Solde faible</AlertTitle>
                    <AlertDescription className="text-xs md:text-sm font-bold text-amber-800 dark:text-amber-200">
                        Votre solde est bientôt épuisé. Anticipez la recharge pour assurer la continuité de vos ventes.
                    </AlertDescription>
                </Alert>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card className={isNegative ? 'border-2 border-destructive bg-destructive/5 shadow-xl shadow-destructive/10 rounded-2xl md:rounded-[2rem]' : 'border border-border bg-card shadow-sm rounded-2xl md:rounded-[2rem]'}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground">Solde Actuel</CardTitle>
                        <Wallet className={`h-5 w-5 ${isNegative ? 'text-red-500' : 'text-brand-navy'}`} />
                    </CardHeader>
                    <CardContent className="pt-4">
                        <div className={`text-4xl font-serif font-black tracking-tighter ${isNegative ? 'text-red-600' : 'text-green-600'}`}>
                            {formatPrice(walletBalance, currencyCode)}
                        </div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase mt-2 tracking-widest">Fonds disponibles</p>
                    </CardContent>
                </Card>

                <Card className="border border-border bg-card shadow-sm rounded-2xl md:rounded-[2rem]">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground">Commissions</CardTitle>
                        <TrendingDown className="h-5 w-5 text-brand-red" />
                    </CardHeader>
                    <CardContent className="pt-4">
                        <div className="text-3xl font-serif font-black tracking-tighter text-brand-navy">{formatPrice(totalCommissionPaid, currencyCode)}</div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase mt-2 tracking-widest">Total prélevé</p>
                    </CardContent>
                </Card>

                <Card className="border border-border bg-card shadow-sm rounded-2xl md:rounded-[2rem] sm:col-span-2 lg:col-span-1">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground">Activité</CardTitle>
                        <TrendingUp className="h-5 w-5 text-green-500" />
                    </CardHeader>
                    <CardContent className="pt-4">
                        <div className="text-3xl font-serif font-black tracking-tighter text-foreground">{settledOrders.length}</div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase mt-2 tracking-widest">Ventes finalisées</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card className="border border-border bg-card rounded-2xl md:rounded-[2rem] shadow-sm overflow-hidden">
                    <CardHeader className="bg-muted/30 border-b border-border p-6">
                        <CardTitle className="flex items-center gap-3 text-lg font-black uppercase tracking-tight">
                            <CreditCard className="w-5 h-5 text-brand-navy" />
                            Méthode de Recharge
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-8 space-y-6">
                        <p className="text-sm font-medium leading-relaxed text-muted-foreground">
                            Effectuez un virement ou un paiement <span className="text-brand-navy font-bold">Mobile Money</span> à AHIZAN, puis cliquez sur le bouton ci-dessous pour nous notifier.
                        </p>
                        <div className="rounded-2xl border-2 border-brand-navy/10 bg-brand-navy/[0.02] p-6 space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-black uppercase text-muted-foreground">MTN Mobile Money</span>
                                <span className="font-serif font-black text-brand-navy">+229 XX XX XX XX</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-black uppercase text-muted-foreground">Moov Money</span>
                                <span className="font-serif font-black text-brand-navy">+229 XX XX XX XX</span>
                            </div>
                        </div>
                        <div className="p-4 bg-muted/30 rounded-xl border border-border">
                            <p className="text-[10px] font-bold text-center uppercase tracking-widest leading-relaxed">
                                IMPORTANT : Mentionnez impérativement le nom de votre boutique <span className="text-brand-red font-black">"{vendor?.name}"</span> dans le motif.
                            </p>
                        </div>
                        <WalletRechargeButton vendorName={vendor?.name} />
                    </CardContent>
                </Card>

                {orders.length > 0 && (
                    <Card className="border border-border bg-card rounded-2xl md:rounded-[2rem] shadow-sm overflow-hidden">
                        <CardHeader className="bg-muted/30 border-b border-border p-6">
                            <CardTitle className="flex items-center gap-3 text-lg font-black uppercase tracking-tight">
                                <History className="w-5 h-5 text-brand-navy" />
                                Historique Récent
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y divide-border">
                                {orders.slice(0, 6).map((order: any) => {
                                    const commission = Math.round((order.totalWithTax * commissionRate) / 100);
                                    return (
                                        <div key={order.id} className="flex items-center justify-between p-5 hover:bg-muted/20 transition-colors">
                                            <div className="space-y-1">
                                                <p className="text-sm font-black text-foreground">{order.code}</p>
                                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{new Date(order.createdAt || order.updatedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</p>
                                            </div>
                                            <div className="text-right space-y-1">
                                                <p className="text-sm font-black text-brand-red">-{formatPrice(commission, currencyCode)}</p>
                                                <p className="text-[10px] font-black uppercase text-brand-navy px-2 py-0.5 bg-brand-navy/5 rounded-full inline-block">{order.state === 'Delivered' ? 'Livré' : 'Payé'}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
