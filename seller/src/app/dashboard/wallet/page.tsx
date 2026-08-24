import { query } from '@/lib/vendure/api';
import { GetMyVendorFullProfileQuery } from '@/lib/vendure/queries';
import { GetMyVendorOrdersQuery, GetMyVendorWalletStatsQuery } from '@/lib/vendure/vendor-order-mutations';
import { getMyWithdrawals } from '@/lib/vendure/actions';
import { unstable_noStore as noStore } from 'next/cache';
import { getAuthToken } from '@/lib/auth';
import WalletClientContent from './wallet-client-content';

export default async function WalletPage() {
    noStore();

    const token = await getAuthToken();

    const [{ data: vendorData }, { data: statsData }, { data: ordersData }, withdrawals] = await Promise.all([
        query(GetMyVendorFullProfileQuery, {}, { token }).catch(() => ({ data: { myVendorProfile: null } })),
        query(GetMyVendorWalletStatsQuery, {}, { token }).catch(() => ({ data: { myVendorWalletStats: null } })),
        query(GetMyVendorOrdersQuery, { options: { take: 50 } }, { token }).catch(() => ({ data: { myVendorOrders: { items: [], totalItems: 0 } } })),
        getMyWithdrawals().catch(() => [])
    ]);

    const vendor = (vendorData as any)?.myVendorProfile;
    const stats = (statsData as any)?.myVendorWalletStats;
    const allOrders = (ordersData as any)?.myVendorOrders?.items || [];
    const activeOrders = allOrders.filter((o: any) => o.customFields?.sellerStatus !== 'reassigned_to_other');

    const totalSales = stats?.netEarnings !== undefined ? stats.netEarnings : activeOrders.reduce((sum: number, o: any) => {
        if (o.state === 'Cancelled') return sum;
        const total = o.totalWithTax || 0;
        const commission = o.customFields?.commissionAmount || 0;
        return sum + (total - commission);
    }, 0);

    const withdrawnAmount = stats?.totalWithdrawn !== undefined ? stats.totalWithdrawn : withdrawals
        .filter((w: any) => w.status === 'APPROVED')
        .reduce((sum: number, w: any) => sum + w.amount, 0);

    const availableBalance = stats?.availableBalance !== undefined ? stats.availableBalance : 0;
    const pendingBalance = stats?.pendingBalance !== undefined ? stats.pendingBalance : 0;

    return (
        <WalletClientContent
            vendor={vendor}
            totalSales={totalSales}
            availableBalance={availableBalance}
            pendingBalance={pendingBalance}
            withdrawnAmount={withdrawnAmount}
            withdrawals={withdrawals}
            orders={activeOrders}
        />
    );
}
