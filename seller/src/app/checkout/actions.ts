'use server';

import { mutate, query } from '@/lib/vendure/api';
import { setAuthToken, getAuthToken } from '@/lib/auth';
import {
    SetOrderShippingAddressMutation,
    SetOrderBillingAddressMutation,
    SetOrderShippingMethodMutation,
    AddPaymentToOrderMutation,
    CreateCustomerAddressMutation,
    TransitionOrderToStateMutation,
    SetCustomerForOrderMutation,
} from '@/lib/vendure/mutations';
import { GetActiveOrderForCheckoutQuery } from '@/lib/vendure/queries';
import { revalidatePath, updateTag } from 'next/cache';
import { redirect } from "next/navigation";
import fs from 'fs';

const LOG_FILE = 'C:/Users/elidja/AppData/Local/Temp/checkout_debug.log';

function log(message: string) {
    const timestamp = new Date().toISOString();
    fs.appendFileSync(LOG_FILE, `[${timestamp}] ${message}\n`);
}

async function ensureAddingItems() {
    log('Ensuring order is in AddingItems state');
    const orderCheck = await query(GetActiveOrderForCheckoutQuery, {}, { useAuthToken: true });
    const currentState = orderCheck.data?.activeOrder?.state;
    log(`Current order state: ${currentState}`);
    
    if (currentState === 'ArrangingPayment') {
        log('Transitioning back to AddingItems to allow modification');
        await mutate(
            TransitionOrderToStateMutation,
            { state: 'AddingItems' },
            { useAuthToken: true }
        );
    }
}

interface AddressInput {
    fullName: string;
    streetLine1: string;
    streetLine2?: string;
    city: string;
    province: string;
    postalCode: string;
    countryCode: string;
    phoneNumber: string;
    company?: string;
}

export async function setShippingAddress(
    shippingAddress: AddressInput,
    useSameForBilling: boolean
) {
    await ensureAddingItems();
    log(`Setting shipping address for order. Use same for billing: ${useSameForBilling}`);
    const shippingResult = await mutate(
        SetOrderShippingAddressMutation,
        {input: shippingAddress},
        {useAuthToken: true}
    );

    if (shippingResult.data.setOrderShippingAddress.__typename !== 'Order') {
        throw new Error('Failed to set shipping address');
    }

    if (useSameForBilling) {
        const billingResult = await mutate(
            SetOrderBillingAddressMutation,
            {input: shippingAddress},
            {useAuthToken: true}
        );
        if (billingResult.headers) {
            const token = billingResult.headers.get('vendure-auth-token');
            if (token) await setAuthToken(token);
        }
    } else {
        if (shippingResult.headers) {
            const token = shippingResult.headers.get('vendure-auth-token');
            if (token) await setAuthToken(token);
        }
    }

    revalidatePath('/checkout');
}

export async function setShippingMethod(shippingMethodId: string) {
    await ensureAddingItems();
    log(`Setting shipping method: ${shippingMethodId}`);
    const result = await mutate(
        SetOrderShippingMethodMutation,
        {shippingMethodId: [shippingMethodId]},
        {useAuthToken: true}
    );

    if (result.data.setOrderShippingMethod.__typename !== 'Order') {
        throw new Error('Failed to set shipping method');
    }

    if (result.headers) {
        const token = result.headers.get('vendure-auth-token');
        if (token) await setAuthToken(token);
    }

    revalidatePath('/checkout');
}

export async function createCustomerAddress(address: AddressInput) {
    const result = await mutate(
        CreateCustomerAddressMutation,
        {input: address},
        {useAuthToken: true}
    );

    if (!result.data.createCustomerAddress) {
        throw new Error('Failed to create customer address');
    }

    revalidatePath('/checkout');
    return result.data.createCustomerAddress;
}

export async function transitionToArrangingPayment() {
    const currentToken = await getAuthToken();
    const result = await mutate(
        TransitionOrderToStateMutation,
        {state: 'ArrangingPayment'},
        {useAuthToken: true, token: currentToken}
    );

    if (result.data.transitionOrderToState?.__typename === 'OrderStateTransitionError') {
        const errorResult = result.data.transitionOrderToState;
        if (errorResult.errorCode === 'ORDER_STATE_TRANSITION_ERROR' && errorResult.message.includes('to "ArrangingPayment"')) {
            // Already in state, return current or new token
            return result.token || currentToken;
        }
        throw new Error(
            `Failed to transition order state: ${errorResult.errorCode} - ${errorResult.message}`
        );
    }

    if (result.token) {
        await setAuthToken(result.token);
    }

    revalidatePath('/checkout');
    return result.token || currentToken;
}

export async function placeOrder(paymentMethodCode: string) {
    // Get the most up-to-date token from the transition step
    const activeToken = await transitionToArrangingPayment();

    // Add payment to the order (cash-on-delivery requires no special metadata)
    const result = await mutate(
        AddPaymentToOrderMutation,
        {
            input: {
                method: paymentMethodCode,
                metadata: {},
            },
        },
        {
            useAuthToken: true,
            token: activeToken // Ensure we use the exact same session token
        }
    );

    if (result.data.addPaymentToOrder.__typename !== 'Order') {
        const errorResult = result.data.addPaymentToOrder;
        throw new Error(
            `Failed to place order: ${errorResult.errorCode} - ${errorResult.message}`
        );
    }

    if (result.token) {
        await setAuthToken(result.token);
    }
    const orderCode = result.data.addPaymentToOrder.code;

    // Update the cart tag to immediately invalidate cached cart data
    updateTag('cart');
    updateTag('active-order');

    redirect(`/order-confirmation/${orderCode}`);
}

interface GuestCustomerInput {
    emailAddress: string;
    firstName: string;
    lastName: string;
    phoneNumber?: string;
}

export type SetCustomerForOrderResult =
    | { success: true }
    | { success: false; errorCode: 'EMAIL_CONFLICT'; message: string }
    | { success: false; errorCode: 'GUEST_CHECKOUT_DISABLED'; message: string }
    | { success: false; errorCode: 'NO_ACTIVE_ORDER'; message: string }
    | { success: false; errorCode: 'UNKNOWN'; message: string };

export async function setCustomerForOrder(
    input: GuestCustomerInput
): Promise<SetCustomerForOrderResult> {
    const result = await mutate(
        SetCustomerForOrderMutation,
        { input },
        { useAuthToken: true }
    );

    const response = result.data.setCustomerForOrder;

    switch (response.__typename) {
        case 'Order':
            if (result.headers) {
                const token = result.headers.get('vendure-auth-token');
                if (token) await setAuthToken(token);
            }
            revalidatePath('/checkout');
            return { success: true };
        case 'AlreadyLoggedInError':
            return { success: true };
        case 'EmailAddressConflictError':
            return { success: false, errorCode: 'EMAIL_CONFLICT', message: response.message };
        case 'GuestCheckoutError':
            return { success: false, errorCode: 'GUEST_CHECKOUT_DISABLED', message: response.message };
        case 'NoActiveOrderError':
            return { success: false, errorCode: 'NO_ACTIVE_ORDER', message: response.message };
        default:
            return { success: false, errorCode: 'UNKNOWN', message: 'Unknown error' };
    }
}
