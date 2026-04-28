'use server';

import { query } from './api';
import { GetActiveCustomerQuery, GetMyVendorProfileQuery, GetMyVendorFullProfileQuery } from './queries';
import { getActiveChannelCached } from './cached';
import { cache } from "react";
import { readFragment } from "@/graphql";
import { ActiveCustomerFragment } from "@/lib/vendure/fragments";
import { getAuthToken } from "@/lib/auth";


export const getActiveCustomer = cache(async () => {
    const token = await getAuthToken();
    const result = await query(GetActiveCustomerQuery, undefined, {
        token
    });
    return readFragment(ActiveCustomerFragment, result.data.activeCustomer);
})

export const getMyVendorProfile = async () => {
    const token = await getAuthToken();
    const [{ data }, { data: customerData }] = await Promise.all([
        query(GetMyVendorFullProfileQuery, {}, {
            token,
            useAuthToken: true
        }) as Promise<any>,
        query(GetActiveCustomerQuery, {}, { token }).catch(() => ({ data: { activeCustomer: null } })) as Promise<any>
    ]);

    const profile = data.myVendorProfile;
    if (profile && customerData.activeCustomer) {
        profile.customer = customerData.activeCustomer;
    }
    return profile;
}

export const getActiveChannel = getActiveChannelCached;
