'use server';

import { mutate } from '@/lib/vendure/api';
import { UpdateMyOrderStatusMutation } from '@/lib/vendure/vendor-order-mutations';
import { getAuthToken } from '@/lib/auth';

const VENDURE_API_URL = process.env.VENDURE_SHOP_API_URL || process.env.NEXT_PUBLIC_VENDURE_SHOP_API_URL;
const VENDURE_CHANNEL_TOKEN = process.env.VENDURE_CHANNEL_TOKEN || process.env.NEXT_PUBLIC_VENDURE_CHANNEL_TOKEN || '__default_channel__';
const VENDURE_AUTH_TOKEN_HEADER = process.env.VENDURE_AUTH_TOKEN_HEADER || 'vendure-auth-token';
const VENDURE_CHANNEL_TOKEN_HEADER = process.env.VENDURE_CHANNEL_TOKEN_HEADER || 'vendure-token';

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

export async function updateOrderSellerStatusAction(orderId: string, statusCode: string) {
    try {
        const token = await getAuthToken();
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            [VENDURE_CHANNEL_TOKEN_HEADER]: VENDURE_CHANNEL_TOKEN,
        };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
            headers[VENDURE_AUTH_TOKEN_HEADER] = token;
        }

        const res = await fetch(VENDURE_API_URL!, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                query: `mutation UpdateMyOrderSellerStatus($orderId: ID!, $statusCode: String!) {
                    updateMyOrderSellerStatus(orderId: $orderId, statusCode: $statusCode)
                }`,
                variables: { orderId, statusCode },
            }),
            cache: 'no-store',
        });
        const json = await res.json();
        if (json.errors) {
            return { success: false, error: json.errors[0].message };
        }
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function fetchVendorOrderStatuses(): Promise<any[]> {
    try {
        const token = await getAuthToken();
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            [VENDURE_CHANNEL_TOKEN_HEADER]: VENDURE_CHANNEL_TOKEN,
        };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
            headers[VENDURE_AUTH_TOKEN_HEADER] = token;
        }

        const res = await fetch(VENDURE_API_URL!, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                query: `query { vendorOrderStatuses { id code label color order vendorCanSet isFinal enabled } }`,
            }),
            cache: 'no-store',
        });
        const json = await res.json();
        return json.data?.vendorOrderStatuses || [];
    } catch {
        return [];
    }
}

export async function fetchAllOrderStatuses(): Promise<any[]> {
    try {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            [VENDURE_CHANNEL_TOKEN_HEADER]: VENDURE_CHANNEL_TOKEN,
        };
        
        const res = await fetch(VENDURE_API_URL!, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                query: `query { orderStatuses { id code label color order vendorCanSet isFinal enabled } }`,
            }),
            cache: 'no-store',
        });
        const json = await res.json();
        return json.data?.orderStatuses || [];
    } catch {
        return [];
    }
}
