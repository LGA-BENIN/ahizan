'use server';

import { mutate } from '@/lib/vendure/api';
import { UpdateMyOrderStatusMutation } from '@/lib/vendure/vendor-order-mutations';

export async function updateOrderStatusAction(orderId: string, status: string) {
    try {
        const { data } = await mutate(UpdateMyOrderStatusMutation, {
            orderId,
            status,
        }, { useAuthToken: true });

        const result = (data as any).updateMyOrderStatus;

        if (result.__typename === 'OrderStateTransitionError') {
            return {
                success: false,
                error: `Impossible de passer au statut "${status}": ${result.message}`,
            };
        }

        return { success: true, order: result };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}
