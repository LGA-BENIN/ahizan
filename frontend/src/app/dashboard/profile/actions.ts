'use server';

import { mutate } from '@/lib/vendure/api';
import { gql } from 'graphql-tag';
import { revalidatePath } from 'next/cache';

const UPDATE_MY_VENDOR_PROFILE = gql`
    mutation UpdateMyVendorProfile($input: UpdateVendorInput!) {
        updateMyVendorProfile(input: $input) {
            id
            dynamicDetails
        }
    }
`;

export async function updateProfileAction(formData: FormData) {
    const dynamicDetailsString = formData.get('dynamicDetails') as string | null;
    let dynamicDetails = {};

    if (dynamicDetailsString) {
        try {
            dynamicDetails = JSON.parse(dynamicDetailsString);
        } catch (e) {
            console.error('Failed to parse dynamic details:', e);
            return { error: 'Invalid data format' };
        }
    }

    try {
        const result = await mutate(UPDATE_MY_VENDOR_PROFILE, {
            input: {
                dynamicDetails,
            }
        }, { useAuthToken: true });

        if (result.errors) {
            return { error: result.errors[0].message };
        }

        revalidatePath('/dashboard/profile');
        return { success: true };
    } catch (error: any) {
        console.error('Profile update error:', error);
        return { error: error.message || 'Failed to update profile' };
    }
}
