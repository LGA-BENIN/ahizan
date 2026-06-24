import { query } from '@/lib/vendure/api';
import { GetMyVendorOrderDetailQuery } from '@/lib/vendure/vendor-order-mutations';
import { getAuthToken } from '@/lib/auth';
import { Suspense } from 'react';
import OrdersTable from '@/components/dashboard/orders-table';

export default async function VendorOrdersPage({ searchParams }: { searchParams?: Promise<{ state?: string; sort?: string }> }) {
    const token = await getAuthToken();
    const params = searchParams ? await searchParams : {};

    // Get sorting parameters
    const sortField = params.sort?.split('_')[0] || 'updatedAt';
    const sortDir = params.sort?.split('_')[1] || 'DESC';
    const sortObj: any = { [sortField]: sortDir };

    // Get filter state parameter
    const filterObj: any = {};
    if (params.state) {
        filterObj.state = { eq: params.state };
    }

    // Fetch orders with detailed lines and shipping addresses for the sidebar preview
    const { data } = await query(GetMyVendorOrderDetailQuery, {
        options: { 
            take: 50, 
            sort: sortObj, 
            ...(Object.keys(filterObj).length > 0 ? { filter: filterObj } : {}) 
        }
    }, { token }).catch((err) => {
        console.error('[VendorOrdersPage] Failed to fetch orders:', err);
        return { data: { myVendorOrders: { items: [], totalItems: 0 } } };
    });
    
    const rawOrders = (data as any)?.myVendorOrders?.items || [];
    // N'afficher chez le vendeur que les commandes payees ou validees (exclure l'etat de brouillon de paiement)
    const orders = rawOrders.filter((o: any) => o && o.state !== 'AddingItems' && o.state !== 'ArrangingPayment');

    return (
        <div className="w-full">
            <Suspense fallback={
                <div className="space-y-6 animate-pulse">
                    <div className="h-10 bg-muted/60 rounded-xl w-48" />
                    <div className="h-11 bg-muted/40 rounded-xl w-full" />
                    <div className="h-[400px] bg-muted/30 rounded-[2.5rem] w-full" />
                </div>
            }>
                <OrdersTable initialOrders={orders} />
            </Suspense>
        </div>
    );
}
