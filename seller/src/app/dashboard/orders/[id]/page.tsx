import { query } from '@/lib/vendure/api';
import { GetMyVendorOrderQuery } from '@/lib/vendure/vendor-order-mutations';
import { getAuthToken } from '@/lib/auth';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import OrderDetailClient from '@/components/dashboard/order-detail-client';

export default async function VendorOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const token = await getAuthToken();

    const { data } = await query(GetMyVendorOrderQuery, { id }, { token }).catch((err) => {
        console.error('[VendorOrderDetailPage] Failed to fetch order details:', err);
        return { data: { myVendorOrder: null } };
    });
    const order = (data as any)?.myVendorOrder;

    if (!order) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
                <p className="text-muted-foreground font-medium">Commande introuvable.</p>
                <Link href="/dashboard/orders">
                    <Button variant="outline">Retour aux commandes</Button>
                </Link>
            </div>
        );
    }

    return <OrderDetailClient order={order} />;
}
