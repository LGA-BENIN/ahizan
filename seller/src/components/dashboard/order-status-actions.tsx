'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { updateOrderStatusAction, updateOrderCustomStatusAction, fetchVendorOrderStatuses } from '@/app/dashboard/orders/actions';

const STATE_TRANSITIONS: Record<string, { label: string; next: string; color: string }[]> = {
    'PaymentAuthorized': [
        { label: 'Marquer comme Expédié', next: 'Shipped', color: 'bg-blue-600 hover:bg-blue-700' },
    ],
    'PaymentSettled': [
        { label: 'Marquer comme Expédié', next: 'Shipped', color: 'bg-blue-600 hover:bg-blue-700' },
    ],
    'Shipped': [
        { label: 'Marquer comme Livré', next: 'Delivered', color: 'bg-green-600 hover:bg-green-700' },
    ],
};

interface OrderStatusActionsProps {
    orderId: string;
    currentState: string;
    currentCustomStatus?: string;
}

export default function OrderStatusActions({ orderId, currentState, currentCustomStatus }: OrderStatusActionsProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showConfirm, setShowConfirm] = useState<string | null>(null);
    const [customStatuses, setCustomStatuses] = useState<any[]>([]);
    const [selectedCustomStatus, setSelectedCustomStatus] = useState(currentCustomStatus || '');
    const router = useRouter();

    useEffect(() => {
        fetchVendorOrderStatuses().then(setCustomStatuses);
    }, []);

    const transitions = STATE_TRANSITIONS[currentState];

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

    const handleCustomStatusChange = async (statusCode: string) => {
        setLoading(true);
        setError(null);
        try {
            const result = await updateOrderCustomStatusAction(orderId, statusCode);
            if (!result.success) {
                setError(result.error || 'Une erreur est survenue');
            } else {
                setSelectedCustomStatus(statusCode);
                router.refresh();
            }
        } catch (e: any) {
            setError(e.message || 'Une erreur est survenue');
        } finally {
            setLoading(false);
        }
    };

    const currentCustomStatusObj = customStatuses.find(s => s.code === (selectedCustomStatus || currentCustomStatus));

    return (
        <div className="mt-4 space-y-4">
            {error && (
                <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    {error}
                </div>
            )}

            {/* Vendure native state transitions */}
            {transitions && transitions.length > 0 && (
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
            )}

            {/* Custom marketplace status dropdown */}
            {customStatuses.length > 0 && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border">
                    <span className="text-sm font-medium text-gray-700">Statut suivi :</span>
                    {currentCustomStatusObj && (
                        <span
                            className="px-2 py-0.5 text-xs font-semibold rounded-full text-white"
                            style={{ backgroundColor: currentCustomStatusObj.color }}
                        >
                            {currentCustomStatusObj.label}
                        </span>
                    )}
                    <select
                        value={selectedCustomStatus || currentCustomStatus || ''}
                        onChange={(e) => handleCustomStatusChange(e.target.value)}
                        disabled={loading}
                        className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white disabled:opacity-50"
                    >
                        <option value="">-- Changer le statut --</option>
                        {customStatuses.map((s: any) => (
                            <option key={s.id} value={s.code}>
                                {s.label}
                            </option>
                        ))}
                    </select>
                </div>
            )}
        </div>
    );
}
