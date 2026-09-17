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
    const activeOrders = allOrders.filter((o: any) => 
        o && 
        o.state !== 'ArrangingPayment' && 
        o.state !== 'AddingItems' && 
        o.state !== 'Cancelled' && 
        o.customFields?.sellerStatus !== 'reassigned_to_other'
    );

    const totalSales = typeof stats?.netEarnings === 'number' ? stats.netEarnings : 0;
    const withdrawnAmount = typeof stats?.totalWithdrawn === 'number' ? stats.totalWithdrawn : 0;
    const availableBalance = typeof stats?.availableBalance === 'number' ? stats.availableBalance : 0;
    const pendingBalance = typeof stats?.pendingBalance === 'number' ? stats.pendingBalance : 0;

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
