'use server';

import { mutate, getVendureApiUrl } from '@/lib/vendure/api';
import { UpdateMyOrderStatusMutation } from '@/lib/vendure/vendor-order-mutations';
import { getAuthToken } from '@/lib/auth';

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

        const res = await fetch(getVendureApiUrl(), {
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

        const res = await fetch(getVendureApiUrl(), {
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
        
        const res = await fetch(getVendureApiUrl(), {
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

export async function updateOrderLineSellerStatusAction(lineId: string, statusCode: string) {
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

        const res = await fetch(getVendureApiUrl(), {
            method: 'POST',
            headers,
            body: JSON.stringify({
                query: `mutation UpdateMyOrderLineSellerStatus($lineId: ID!, $statusCode: String!) {
                    updateMyOrderLineSellerStatus(lineId: $lineId, statusCode: $statusCode)
                }`,
                variables: { lineId, statusCode },
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

export async function fulfillVendorOrderAction(orderId: string, carrier: string, trackingCode?: string) {
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

        const res = await fetch(getVendureApiUrl(), {
            method: 'POST',
            headers,
            body: JSON.stringify({
                query: `mutation FulfillMyVendorOrder($orderId: ID!, $trackingCode: String, $carrier: String) {
                    fulfillMyVendorOrder(orderId: $orderId, trackingCode: $trackingCode, carrier: $carrier) {
                        id
                        state
                        trackingCode
                        method
                    }
                }`,
                variables: { orderId, carrier, trackingCode: trackingCode || '' },
            }),
            cache: 'no-store',
        });
        const json = await res.json();
        if (json.errors) {
            return { success: false, error: json.errors[0].message };
        }
        return { success: true, fulfillment: json.data?.fulfillMyVendorOrder };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function markOrderReadyForPickupAction(orderId: string, vendorId: string) {
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

        const res = await fetch(getVendureApiUrl(), {
            method: 'POST',
            headers,
            body: JSON.stringify({
                query: `mutation MarkReadyForPickup($orderId: ID!, $vendorId: ID!) {
                    markReadyForPickup(orderId: $orderId, vendorId: $vendorId) {
                        id
                        status
                        type
                    }
                }`,
                variables: { orderId, vendorId },
            }),
            cache: 'no-store',
        });
        const json = await res.json();
        if (json.errors) {
            return { success: false, error: json.errors[0].message };
        }
        return { success: true, mission: json.data?.markReadyForPickup };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function refuseOrderAction(orderId: string) {
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

        const res = await fetch(getVendureApiUrl(), {
            method: 'POST',
            headers,
            body: JSON.stringify({
                query: `mutation RefuseOrder($orderId: ID!) {
                    updateMyOrderSellerStatus(orderId: $orderId, statusCode: "refused")
                }`,
                variables: { orderId },
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

export async function deleteMyVendorOrderAction(orderId: string) {
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

        const res = await fetch(getVendureApiUrl(), {
            method: 'POST',
            headers,
            body: JSON.stringify({
                query: `mutation DeleteMyVendorOrder($orderId: ID!) {
                    deleteMyVendorOrder(orderId: $orderId)
                }`,
                variables: { orderId },
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
