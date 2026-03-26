import {query} from './api';
import {GetActiveCustomerQuery, GetActiveOrderQuery} from './queries';
import {getActiveChannelCached} from './cached';
import {cache} from "react";
import {readFragment} from "@/graphql";
import {ActiveCustomerFragment} from "@/lib/vendure/fragments";
import {getAuthToken} from "@/lib/auth";


export const getActiveCustomer = cache(async () => {
    const token = await getAuthToken();
    const result = await query(GetActiveCustomerQuery, undefined, {
        token
    });
    return readFragment(ActiveCustomerFragment, result.data.activeCustomer);
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
