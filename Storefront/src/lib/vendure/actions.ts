import {query} from './api';
import {GetActiveCustomerQuery, GetActiveOrderQuery} from './queries';
import {getActiveChannelCached} from './cached';
import {cache} from "react";
import {readFragment} from "@/graphql";
import {ActiveCustomerFragment} from "@/lib/vendure/fragments";
import {getAuthToken} from "@/lib/auth";


export const getActiveCustomer = cache(async () => {
    const token = await getAuthToken();
    console.log('[getActiveCustomer] COOKIE TOKEN READ IN STOREFRONT:', token ? `${token.substring(0, 15)}...` : 'NULL OR MISSING');
    if (!token) return null;
    try {
        const result = await query(GetActiveCustomerQuery, undefined, {
            token
        });
        const cust = readFragment(ActiveCustomerFragment, (result.data as any)?.activeCustomer);
        console.log('[getActiveCustomer] QUERY RESULT CUSTOMER:', cust ? cust.firstName : 'NULL RESULT FROM VENDURE');
        return cust;
    } catch (e) {
        console.error('[getActiveCustomer] Failed to fetch customer:', e);
        return null;
    }
})

export const getActiveOrder = cache(async () => {
    const token = await getAuthToken();
    try {
        const result = await query(GetActiveOrderQuery, undefined, {
            token
        });
        return result.data.activeOrder;
    } catch (e) {
        return null;
    }
})

export const getActiveChannel = getActiveChannelCached;
