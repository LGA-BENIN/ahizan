'use server';

import { mutate } from '@/lib/vendure/api';
import { UpdateMyVendorProfileMutation } from '@/lib/vendure/mutations';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function updateVendorProfile(prevState: any, formData: FormData) {
    const rawData = Object.fromEntries(formData.entries());

    // Extract file (Carte CIP) if present and upload it first
    // Note: File upload needs a separate strategy with Vendure (usually REST or specific mutation)
    // For MVP, we might need to skip actual file upload or implement a robust upload handler.
    // Assuming we have an upload handler `uploadFile` that returns an ID.

    let carteCipId = undefined;
    // const carteCipFile = formData.get('carteCip') as File;
    // if (carteCipFile && carteCipFile.size > 0) {
    //      carteCipId = await uploadFile(carteCipFile);
    // }

    const input: any = {
        name: rawData.name as string,
        description: rawData.description as string,
        phoneNumber: rawData.phoneNumber as string,
        address: rawData.address as string,
        zone: rawData.zone as string,
        type: rawData.type as string,
        sex: rawData.sex as string,
    };

    if (rawData.type === 'ENTERPRISE') {
        input.rccm = rawData.rccm as string;
        input.ifu = rawData.ifu as string;
        input.raisonSociale = rawData.raisonSociale as string;
        input.siegeAddress = rawData.siegeAddress as string;
        if (carteCipId) {
            input.carteCipId = carteCipId;
        }
    }

    try {
        const result = await mutate(UpdateMyVendorProfileMutation, {
            input
        });

        if (result.data.updateMyVendorProfile) {
            revalidatePath('/dashboard');
            return { success: true };
        } else {
            return { error: 'Failed to update profile' };
        }
    } catch (e: any) {
        return { error: e.message || 'An unexpected error occurred' };
    }
}
