'use server';

import { query } from './api';
import { getAuthToken } from "@/lib/auth";

export async function syncCustomerActiveLocationAction(loc: any) {
    if (!loc) return null;
    const token = await getAuthToken();
    if (!token) return null;
    try {
        const mutation = `
            mutation SetCustomerActiveLocation($input: SetCustomerActiveLocationInput!) {
                setCustomerActiveLocation(input: $input) {
                    success
                    customerId
                    city
                    streetLine1
                    latitude
                    longitude
                }
            }
        `;
        const input = {
            city: loc.commune || loc.name || 'Cotonou',
            neighborhood: loc.neighborhood || (loc.type === 'NEIGHBORHOOD' ? loc.name : undefined),
            province: loc.department,
            latitude: Number(loc.latitude),
            longitude: Number(loc.longitude),
            locationName: loc.name,
            locationType: loc.type,
            marketId: loc.marketId ? String(loc.marketId) : undefined,
        };
        const result = await query(mutation, { input }, { token });
        return (result.data as any)?.setCustomerActiveLocation;
    } catch (e) {
        return null;
    }
}
