'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateOrderStatusAction } from '@/app/dashboard/orders/actions';

const STATE_TRANSITIONS: Record<string, { label: string; next: string; color: string }[]> = {
    'PaymentSettled': [
        { label: 'Marquer comme Expédié', next: 'Shipped', color: 'bg-blue-600 hover:bg-blue-700' },
    ],
    'Shipped': [
        { label: 'Marquer comme Livré', next: 'Delivered', color: 'bg-green-600 hover:bg-green-700' },
    ],
};

export default function OrderStatusActions({ orderId, currentState }: { orderId: string; currentState: string }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showConfirm, setShowConfirm] = useState<string | null>(null);
    const router = useRouter();

    const transitions = STATE_TRANSITIONS[currentState];

    if (!transitions || transitions.length === 0) {
        return null;
    }

    const handleTransition = async (nextState: string) => {
        setLoading(true);
        setError(null);
        try {
            const result = await updateOrderStatusAction(orderId, nextState);
            if (!result.success) {
                setError(result.error || 'Une erreur est survenue');
            } else {
                router.refresh();
            }
        } catch (e: any) {
            setError(e.message || 'Une erreur est survenue');
        } finally {
            setLoading(false);
            setShowConfirm(null);
        }
    };

    return (
        <div className="mt-4">
            {error && (
                <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    {error}
                </div>
            )}
            <div className="flex gap-3">
                {transitions.map((t) => (
                    <div key={t.next}>
                        {showConfirm === t.next ? (
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-600">Confirmer ?</span>
                                <button
                                    onClick={() => handleTransition(t.next)}
                                    disabled={loading}
                                    className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50"
                                >
                                    {loading ? 'En cours...' : 'Oui'}
                                </button>
                                <button
                                    onClick={() => setShowConfirm(null)}
                                    disabled={loading}
                                    className="px-4 py-2 bg-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-400 disabled:opacity-50"
                                >
                                    Non
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => setShowConfirm(t.next)}
                                className={`px-4 py-2 text-white text-sm rounded-lg ${t.color} transition-colors`}
                            >
                                {t.label}
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
