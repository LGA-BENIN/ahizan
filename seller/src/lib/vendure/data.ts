import { query } from './api';
import { GetMyVendorProfileQuery } from './queries';

export async function getMyVendorProfile() {
    try {
        const { data } = await query(GetMyVendorProfileQuery, {}, { useAuthToken: true });
        return data.myVendorProfile;
    } catch (e) {
        console.error('Failed to fetch vendor profile:', e);
        return null;
    }
}
