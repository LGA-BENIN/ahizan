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
    if (!token) return null;
    try {
        const result = await query(GetActiveCustomerQuery, undefined, {
            token
        });
        return readFragment(ActiveCustomerFragment, (result.data as any)?.activeCustomer);
    } catch (e) {
        console.error('[getActiveCustomer] Failed to fetch active customer:', e);
        return null;
    }
})

export const getMyVendorProfile = async () => {
    const token = await getAuthToken();
    if (!token) {
        return null;
    }
    try {
        const [{ data }, { data: customerData }] = await Promise.all([
            query(GetMyVendorFullProfileQuery, {}, {
                token,
                useAuthToken: true
            }) as Promise<any>,
            query(GetActiveCustomerQuery, {}, { token }).catch(() => ({ data: { activeCustomer: null } })) as Promise<any>
        ]);

        const profile = data?.myVendorProfile;
        if (profile && customerData?.activeCustomer) {
            profile.customer = customerData.activeCustomer;
        }
        return profile;
    } catch (error) {
        console.error('[getMyVendorProfile] Failed to fetch vendor profile:', error);
        return null;
    }
}

export const getActiveChannel = getActiveChannelCached;
