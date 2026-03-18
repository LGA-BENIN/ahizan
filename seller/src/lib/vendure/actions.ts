'use server';

import { query } from './api';
import { GetActiveCustomerQuery, GetMyVendorProfileQuery } from './queries';
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
    const { data } = await query(GetMyVendorProfileQuery, {}, {
        token,
        useAuthToken: true
    }) as any;
    return data.myVendorProfile;
}

export const getActiveChannel = getActiveChannelCached;
