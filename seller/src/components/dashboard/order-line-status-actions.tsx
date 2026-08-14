'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateOrderLineSellerStatusAction } from '@/app/dashboard/orders/actions';
import { toast } from 'sonner';

interface OrderLineStatusActionsProps {
    lineId: string;
    currentSellerStatus?: string;
}

const SELLER_STATUS_LABELS: Record<string, { label: string; color: string }> = {
    'pending': { label: 'En attente', color: 'bg-yellow-500' },
    'confirmed': { label: 'Confirmé', color: 'bg-blue-500' },
    'refused': { label: 'Refusé', color: 'bg-red-500' },
    'cancelled': { label: 'Annulé', color: 'bg-gray-500' },
};

export default function OrderLineStatusActions({ lineId, currentSellerStatus }: OrderLineStatusActionsProps) {
    const [status, setStatus] = useState(currentSellerStatus || 'pending');
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    
    const sellerObj = SELLER_STATUS_LABELS[status] || SELLER_STATUS_LABELS['pending'];

    const handleStatusChange = async (newStatus: string) => {
        setLoading(true);
        try {
            const res = await updateOrderLineSellerStatusAction(lineId, newStatus);
            if (res.success) {
                const finalStatus = newStatus === 'refused' ? 'reassigning' : newStatus;
                setStatus(finalStatus);
                toast.success(`Statut de l'article mis à jour`);
                router.refresh();
            } else {
                toast.error(res.error || 'Erreur');
            }
        } catch (e: any) {
            toast.error(e.message || 'Erreur');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center gap-2">
            <span className={`px-2.5 py-1 text-[11px] font-bold rounded-full text-white ${sellerObj.color}`}>
                {sellerObj.label}
            </span>
            {status === 'pending' && (
                <div className="flex gap-1 mt-1">
                    <button 
                        onClick={() => handleStatusChange('confirmed')}
                        disabled={loading}
                        className="p-1.5 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded text-xs disabled:opacity-50"
                        title="Accepter"
                    >
                        ✓
                    </button>
                    <button 
                        onClick={() => handleStatusChange('refused')}
                        disabled={loading}
                        className="p-1.5 bg-red-100 text-red-700 hover:bg-red-200 rounded text-xs disabled:opacity-50"
                        title="Refuser"
                    >
                        ✗
                    </button>
                </div>
            )}
        </div>
    );
}
