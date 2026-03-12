import { query } from '@/lib/vendure/api';
import { graphql } from '@/graphql';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Wallet, AlertTriangle, CheckCircle } from 'lucide-react';
import { formatPrice } from '@/lib/format';
import { unstable_noStore as noStore } from 'next/cache';
import WalletActions from './wallet-actions';

const GetAllVendorsForWalletQuery = graphql(`
    query GetAllVendorsForWallet($options: VendorListOptions) {
        vendors(options: $options) {
            items {
                id
                name
                email
                status
                walletBalance
                allowNegativeBalance
                commissionRate
            }
            totalItems
        }
    }
`);

export default async function AdminWalletsPage() {
    noStore();

    const { data } = await query(GetAllVendorsForWalletQuery, { options: { take: 100 } }, { useAuthToken: true })
        .catch(() => ({ data: { vendors: { items: [], totalItems: 0 } } }));

    const vendors = (data as any)?.vendors?.items || [];
    const approvedVendors = vendors.filter((v: any) => v.status === 'APPROVED');
    const totalBalance = approvedVendors.reduce((sum: number, v: any) => sum + (v.walletBalance || 0), 0);
    const negativeVendors = approvedVendors.filter((v: any) => (v.walletBalance || 0) < 0).length;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Gestion des Portefeuilles</h1>
                <p className="text-muted-foreground mt-1">
                    Gérez les soldes prépayés des vendeurs approuvés.
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Vendeurs actifs</CardTitle>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{approvedVendors.length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Solde Total Plateforme</CardTitle>
                        <Wallet className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatPrice(totalBalance, 'XOF')}</div>
                    </CardContent>
                </Card>
                <Card className={negativeVendors > 0 ? 'border-red-300' : ''}>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Comptes en négatif</CardTitle>
                        <AlertTriangle className={`h-4 w-4 ${negativeVendors > 0 ? 'text-red-500' : 'text-muted-foreground'}`} />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${negativeVendors > 0 ? 'text-red-600' : ''}`}>{negativeVendors}</div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {approvedVendors.map((vendor: any) => {
                    const balance = vendor.walletBalance || 0;
                    const isNegative = balance < 0;
                    const isLow = balance >= 0 && balance < 5000;

                    return (
                        <Card key={vendor.id} className={isNegative ? 'border-red-200' : ''}>
                            <CardHeader className="pb-2">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <CardTitle className="text-base">{vendor.name}</CardTitle>
                                        <p className="text-xs text-muted-foreground">{vendor.email}</p>
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        {isNegative && <Badge variant="destructive" className="text-xs">Négatif</Badge>}
                                        {isLow && <Badge className="bg-yellow-100 text-yellow-800 text-xs">Faible</Badge>}
                                        {vendor.allowNegativeBalance && <Badge variant="outline" className="text-xs">Découvert OK</Badge>}
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-1">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">Solde</span>
                                    <span className={`text-lg font-bold ${isNegative ? 'text-red-600' : 'text-green-600'}`}>
                                        {formatPrice(balance, 'XOF')}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-muted-foreground">Commission</span>
                                    <span className="text-xs font-medium">{vendor.commissionRate}%</span>
                                </div>

                                <WalletActions
                                    vendorId={vendor.id}
                                    vendorName={vendor.name}
                                    currentBalance={balance}
                                    allowNegative={vendor.allowNegativeBalance}
                                />
                            </CardContent>
                        </Card>
                    );
                })}

                {approvedVendors.length === 0 && (
                    <div className="col-span-3 text-center text-muted-foreground py-12">
                        Aucun vendeur approuvé trouvé.
                    </div>
                )}
            </div>
        </div>
    );
}
