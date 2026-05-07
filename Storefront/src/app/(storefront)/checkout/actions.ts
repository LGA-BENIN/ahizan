'use server';

import { mutate, query } from '@/lib/vendure/api';
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
import { formatPhoneE164 } from '@/lib/format-phone';
import fs from 'fs';
import { setAuthToken, getAuthToken } from '@/lib/auth';

function log(message: string) {
    const timestamp = new Date().toISOString();
    console.log(`[CHECKOUT] [${timestamp}] ${message}`);
    try {
        fs.appendFileSync('checkout-debug.log', `[CHECKOUT] [${timestamp}] ${message}\n`);
    } catch(e) {}
}

export async function ensureAddingItems() {
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
    // Format phone number to E.164 for Brevo SMS compatibility
    const formattedAddress = {
        ...shippingAddress,
        phoneNumber: formatPhoneE164(shippingAddress.phoneNumber) || shippingAddress.phoneNumber,
    };

    log(`Setting shipping address for order. Use same for billing: ${useSameForBilling}`);
    const shippingResult = await mutate(
        SetOrderShippingAddressMutation,
        { input: formattedAddress },
        { useAuthToken: true }
    );
    log(`SetShippingAddress result: ${shippingResult.data?.setOrderShippingAddress?.__typename || 'NULL'}`);

    if (shippingResult.data.setOrderShippingAddress.__typename !== 'Order') {
        const errorResult = shippingResult.data.setOrderShippingAddress;
        log(`SetShippingAddress error: ${errorResult.errorCode} - ${errorResult.message}`);
        throw new Error(`Failed to set shipping address: ${errorResult.message}`);
    }

    if (shippingResult.token) {
        await setAuthToken(shippingResult.token);
    }

    if (useSameForBilling) {
        await mutate(
            SetOrderBillingAddressMutation,
            { input: formattedAddress },
            { useAuthToken: true }
        );
    }

    revalidatePath('/checkout');
}

export async function setShippingMethod(shippingMethodId: string) {
    await ensureAddingItems();
    log(`Setting shipping method: ${shippingMethodId}`);
    const result = await mutate(
        SetOrderShippingMethodMutation,
        { shippingMethodId: [shippingMethodId] },
        { useAuthToken: true }
    );
    log(`SetShippingMethod result: ${result.data?.setOrderShippingMethod?.__typename || 'NULL'}`);

    if (result.data.setOrderShippingMethod.__typename !== 'Order') {
        const errorResult = result.data.setOrderShippingMethod;
        log(`SetShippingMethod error: ${errorResult.errorCode} - ${errorResult.message}`);
        throw new Error(`Failed to set shipping method: ${errorResult.message}`);
    }

    if (result.token) {
        await setAuthToken(result.token);
    }

    revalidatePath('/checkout');
}

export async function createCustomerAddress(address: AddressInput) {
    const result = await mutate(
        CreateCustomerAddressMutation,
        { input: address },
        { useAuthToken: true }
    );

    if (!result.data.createCustomerAddress) {
        throw new Error('Failed to create customer address');
    }

    if (result.token) {
        await setAuthToken(result.token);
    }

    revalidatePath('/checkout');
    return result.data.createCustomerAddress;
}

export async function transitionToArrangingPayment() {
    log('Starting transitionToArrangingPayment');
    const currentToken = await getAuthToken();
    log(`Current token from cookies: ${currentToken?.substring(0, 10)}...`);
    
    try {
        const result = await mutate(
            TransitionOrderToStateMutation,
            { state: 'ArrangingPayment' },
            { useAuthToken: true, token: currentToken }
        );
        log(`Transition request result: ${JSON.stringify(result.data ? Object.keys(result.data) : 'NULL')}`);
        log(`Token in result: ${result.token?.substring(0, 10)}...`);

        if (result.data.transitionOrderToState?.__typename === 'OrderStateTransitionError') {
            const errorResult = result.data.transitionOrderToState;
            log(`Transition error: ${errorResult.errorCode} - ${errorResult.message}`);
            if (errorResult.errorCode === 'ORDER_STATE_TRANSITION_ERROR' && errorResult.fromState === 'ArrangingPayment') {
                log('Order already in ArrangingPayment state, proceeding.');
                return result.token || currentToken;
            }
            throw new Error(
                `Failed to transition order state: ${errorResult.errorCode} - ${errorResult.message}`
            );
        }

        if (result.token) {
            log('Setting new auth token in cookies');
            await setAuthToken(result.token);
        }

        revalidatePath('/checkout');
        return result.token || currentToken;
    } catch (e) {
        log(`ERROR in transitionToArrangingPayment: ${e instanceof Error ? e.message : String(e)}`);
        throw e;
    }
}

export async function placeOrder(paymentMethodCode: string) {
    log(`Starting placeOrder with method: ${paymentMethodCode}`);
    try {
        // Get the most up-to-date token from the transition step
        const activeToken = await transitionToArrangingPayment();
        log(`Active token for payment: ${activeToken?.substring(0, 10)}...`);

        // DIAGNOSTIC: Check active order state before payment
        const orderCheck = await query(
            GetActiveOrderForCheckoutQuery,
            {},
            { useAuthToken: true, token: activeToken }
        );
        log(`Order state before payment: ${orderCheck.data?.activeOrder?.state || 'NO_ACTIVE_ORDER'}`);
        if (orderCheck.data?.activeOrder) {
            log(`Order code: ${orderCheck.data.activeOrder.code}`);
        }

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
        log(`AddPayment result: ${result.data?.addPaymentToOrder?.__typename || 'NULL'}`);

        if (result.data.addPaymentToOrder.__typename !== 'Order') {
            const errorResult = result.data.addPaymentToOrder;
            log(`Place order error: ${errorResult.errorCode} - ${errorResult.message}`);
            return { success: false, error: `${errorResult.errorCode} - ${errorResult.message}` };
        }

        if (result.token) {
            log('Setting final auth token in cookies');
            await setAuthToken(result.token);
        }

        const orderCode = result.data.addPaymentToOrder.code;
        log(`Order placed successfully: ${orderCode}`);

        // Update the cart tag to immediately invalidate cached cart data
        updateTag('cart');
        updateTag('active-order');

        log('Redirecting to confirmation page');
        redirect(`/order-confirmation/${orderCode}`);
    } catch (e) {
        if (e instanceof Error && e.message.includes('NEXT_REDIRECT')) {
            log('Server redirect triggered (normal)');
            throw e;
        }
        log(`ERROR in placeOrder: ${e instanceof Error ? e.message : String(e)}`);
        throw e;
    }
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
            if (result.token) {
                await setAuthToken(result.token);
            }
            revalidatePath('/checkout');
            return { success: true };
        case 'AlreadyLoggedInError':
            if (result.token) {
                await setAuthToken(result.token);
            }
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
