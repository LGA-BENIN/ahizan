'use server';

import { mutate } from '@/lib/vendure/api';
import { graphql } from '@/graphql';

const ContinueOrderWithoutReassigningMutation = graphql(`
    mutation ContinueOrderWithoutReassigning($orderId: ID!, $lineId: ID) {
        continueOrderWithoutReassigning(orderId: $orderId, lineId: $lineId)
    }
`);

const CancelCustomerOrderMutation = graphql(`
    mutation CancelCustomerOrder($orderId: ID!) {
        cancelCustomerOrder(orderId: $orderId)
    }
`);

export async function continueOrderWithoutReassigningAction(orderId: string, lineId?: string) {
    try {
        const { data } = await mutate(ContinueOrderWithoutReassigningMutation, { orderId, lineId }, { useAuthToken: true });
        return { success: true, result: (data as any)?.continueOrderWithoutReassigning };
    } catch (e: any) {
        return { success: false, error: e.message || 'Échec de la mise à jour.' };
    }
}

export async function cancelCustomerOrderAction(orderId: string) {
    try {
        const { data } = await mutate(CancelCustomerOrderMutation, { orderId }, { useAuthToken: true });
        return { success: true, result: (data as any)?.cancelCustomerOrder };
    } catch (e: any) {
        return { success: false, error: e.message || 'Échec de l\'annulation.' };
    }
}
