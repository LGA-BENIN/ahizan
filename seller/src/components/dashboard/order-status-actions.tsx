'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateOrderSellerStatusAction } from '@/app/dashboard/orders/actions';

interface OrderStatusActionsProps {
    orderId: string;
    currentSellerStatus?: string;
    currentAdminStatus?: string;
}

const SELLER_STATUS_LABELS: Record<string, { label: string; color: string }> = {
    'pending': { label: 'En attente', color: 'bg-yellow-500' },
    'confirmed': { label: 'Confirmée', color: 'bg-blue-500' },
    'refused': { label: 'Refusée', color: 'bg-red-500' },
};

const ADMIN_STATUS_LABELS: Record<string, { label: string; color: string }> = {
    'pending': { label: 'En attente', color: 'bg-gray-400' },
    'shipped': { label: 'Expédiée', color: 'bg-indigo-500' },
    'in_transit': { label: 'En transit', color: 'bg-blue-400' },
    'delivered': { label: 'Livrée', color: 'bg-emerald-500' },
    'cancelled': { label: 'Annulée', color: 'bg-red-600' },
};

export default function OrderStatusActions({ orderId, currentSellerStatus, currentAdminStatus }: OrderStatusActionsProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    const sellerStatus = currentSellerStatus || 'pending';
    const adminStatus = currentAdminStatus || 'pending';

    const handleSellerStatusChange = async (statusCode: string) => {
        setLoading(true);
        setError(null);
        try {
            const result = await updateOrderSellerStatusAction(orderId, statusCode);
            if (!result.success) {
                setError(result.error || 'Une erreur est survenue');
            } else {
                router.refresh();
            }
        } catch (e: any) {
            setError(e.message || 'Une erreur est survenue');
        } finally {
            setLoading(false);
        }
    };

    const sellerObj = SELLER_STATUS_LABELS[sellerStatus] || SELLER_STATUS_LABELS['pending'];
    const adminObj = ADMIN_STATUS_LABELS[adminStatus] || ADMIN_STATUS_LABELS['pending'];

    return (
        <div className="mt-4 space-y-4">
            {error && (
                <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    {error}
                </div>
            )}

            <div className="flex flex-col gap-3 p-4 bg-gray-50 rounded-lg border">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-700">Votre Statut :</span>
                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full text-white ${sellerObj.color}`}>
                            {sellerObj.label}
                        </span>
                    </div>

                    <div className="flex items-center gap-2 border-l pl-4">
                        <span className="text-sm font-medium text-gray-700">Statut Livraison (Admin) :</span>
                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full text-white ${adminObj.color}`}>
                            {adminObj.label}
                        </span>
                    </div>
                </div>
                
                {/* Actions strictly limited to Seller confirming/refusing */}
                {sellerStatus === 'pending' && (
                    <div className="flex gap-3 mt-4">
                        <button
                            onClick={() => handleSellerStatusChange('confirmed')}
                            disabled={loading}
                            className="px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
                        >
                            {loading ? 'En cours...' : 'Confirmer la commande'}
                        </button>
                        <button
                            onClick={() => handleSellerStatusChange('refused')}
                            disabled={loading}
                            className="px-5 py-2.5 bg-red-100 text-red-700 text-sm font-medium rounded-lg hover:bg-red-200 hover:text-red-800 disabled:opacity-50 transition-colors"
                        >
                            {loading ? 'En cours...' : 'Refuser la commande'}
                        </button>
                    </div>
                )}

                {sellerStatus === 'confirmed' && (
                    <div className="mt-4 text-sm text-gray-600 italic bg-blue-50/50 p-3 rounded-md border border-blue-100">
                        Vous avez confirmé cette commande. Veuillez préparer la marchandise pour l'expédition.
                    </div>
                )}

                {sellerStatus === 'refused' && (
                    <div className="mt-4 text-sm text-gray-600 italic bg-red-50/50 p-3 rounded-md border border-red-100">
                        Vous avez refusé cette commande.
                    </div>
                )}
            </div>
        </div>
    );
}
