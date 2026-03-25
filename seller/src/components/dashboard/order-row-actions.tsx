'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateOrderSellerStatusAction } from '@/app/dashboard/orders/actions';
import Link from 'next/link';

interface OrderRowActionsProps {
    orderId: string;
    sellerStatus?: string;
}

export function OrderRowActions({ orderId, sellerStatus }: OrderRowActionsProps) {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleAction = async (status: string) => {
        setLoading(true);
        try {
            const result = await updateOrderSellerStatusAction(orderId, status);
            if (result.success) {
                router.refresh();
            } else {
                alert(result.error || 'Une erreur est survenue');
            }
        } catch (e: any) {
            alert(e.message || 'Une erreur est survenue');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center gap-3">
            {sellerStatus === 'pending' && (
                <div className="flex gap-2">
                    <button
                        onClick={() => handleAction('confirmed')}
                        disabled={loading}
                        className="px-2 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                        {loading ? '...' : 'Confirmer'}
                    </button>
                    <button
                        onClick={() => handleAction('refused')}
                        disabled={loading}
                        className="px-2 py-1 bg-red-600 text-white text-xs font-medium rounded hover:bg-red-700 disabled:opacity-50 transition-colors"
                    >
                        {loading ? '...' : 'Refuser'}
                    </button>
                </div>
            )}
            <Link 
                href={`/dashboard/orders/${orderId}`} 
                className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
            >
                Détails
            </Link>
        </div>
    );
}
