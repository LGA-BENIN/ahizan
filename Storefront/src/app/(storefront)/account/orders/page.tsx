import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getActiveCustomer } from '@/lib/vendure/actions';
import { query } from '@/lib/vendure/api';
import { GetCustomerOrdersQuery } from '@/lib/vendure/queries';
import { OrdersTable } from './orders-table';

export const metadata: Metadata = {
    title: 'Mes Commandes',
};

const ITEMS_PER_PAGE = 10;

export default async function OrdersPage(props: any) {
    // Verify authentication server-side before fetching
    const customer = await getActiveCustomer();
    if (!customer) {
        return redirect('/sign-in');
    }

    const searchParams = await props.searchParams;
    const pageParam = searchParams?.page;
    const currentPage = parseInt(Array.isArray(pageParam) ? pageParam[0] : pageParam || '1', 10);
    const skip = (currentPage - 1) * ITEMS_PER_PAGE;

    let orders: any[] = [];
    let totalItems = 0;

    try {
        const res = await query(
            GetCustomerOrdersQuery,
            {
                options: {
                    take: ITEMS_PER_PAGE,
                    skip,
                    filter: {
                        state: {
                            notEq: 'AddingItems',
                        },
                        type: {
                            notEq: 'Seller',
                        },
                    },
                },
            },
            { useAuthToken: true }
        );
        orders = res?.data?.activeCustomer?.orders?.items || [];
        totalItems = res?.data?.activeCustomer?.orders?.totalItems || 0;
    } catch (e) {
        console.error('Error fetching customer orders:', e);
    }

    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

    return (
        <div>
            <h1 className="text-3xl font-bold mb-6">Mes Commandes</h1>
            <OrdersTable
                orders={orders}
                totalPages={totalPages}
                currentPage={currentPage}
            />
        </div>
    );
}
