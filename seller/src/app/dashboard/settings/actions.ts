'use server';

import { revalidatePath } from 'next/cache';
import { mutate } from '@/lib/vendure/api';
import { UpdateCustomerPasswordMutation, UpdateMyVendorProfileMutation } from '@/lib/vendure/mutations';

export async function changePasswordAction(
    prevState: { error?: string; success?: boolean } | undefined,
    formData: FormData
) {
    const currentPassword = formData.get('currentPassword') as string;
    const newPassword = formData.get('newPassword') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    if (!currentPassword || !newPassword || !confirmPassword) {
        return { error: 'Tous les champs sont requis.' };
    }

    if (newPassword.length < 6) {
        return { error: 'Le nouveau mot de passe doit contenir au moins 6 caractères.' };
    }

    if (newPassword !== confirmPassword) {
        return { error: 'Les mots de passe ne correspondent pas.' };
    }

    if (currentPassword === newPassword) {
        return { error: 'Le nouveau mot de passe doit être différent de l\'ancien.' };
    }

    try {
        const result = await mutate(UpdateCustomerPasswordMutation, {
            currentPassword,
            newPassword,
        }, { useAuthToken: true });

        const updateResult = (result.data as any).updateCustomerPassword;

        if (updateResult.__typename !== 'Success') {
            return { error: updateResult.message || 'Échec de la mise à jour du mot de passe.' };
        }

        revalidatePath('/dashboard/settings');
        return { success: true };
    } catch (error: any) {
        console.error('Password change error:', error);
        return { error: 'Une erreur inattendue s\'est produite. Veuillez réessayer.' };
    }
}

import { formatPhoneE164 } from '@/lib/format-phone';

import { getMyVendorProfile } from '@/lib/vendure/actions';

export async function updateVendorProfileAction(
    prevState: { error?: string; success?: boolean } | undefined,
    formData: FormData
) {
    let name = formData.get('name') as string;
    const phoneNumber = formData.get('phoneNumber') as string;
    const description = formData.get('description') as string;
    const address = formData.get('address') as string;
    const zone = formData.get('zone') as string;
    const website = formData.get('website') as string;
    const facebook = formData.get('facebook') as string;
    const instagram = formData.get('instagram') as string;
    const deliveryInfo = formData.get('deliveryInfo') as string;
    const returnPolicy = formData.get('returnPolicy') as string;

    // If name is missing (because tab unmounted), fetch it from current profile
    if (!name) {
        const profile = await getMyVendorProfile();
        name = profile?.name;
    }

    if (!name) {
        return { error: 'Le nom est requis.' };
    }

    try {
        const result = await (mutate as any)(UpdateMyVendorProfileMutation, {
            input: {
                name,
                phoneNumber: phoneNumber ? formatPhoneE164(phoneNumber) : undefined,
                description: description || undefined,
                address: address || undefined,
                zone: zone || undefined,
                website: website || undefined,
                facebook: facebook || undefined,
                instagram: instagram || undefined,
                deliveryInfo: deliveryInfo || undefined,
                returnPolicy: returnPolicy || undefined,
            }
        }, { useAuthToken: true });

        const updateResult = (result.data as any).updateMyVendorProfile;

        if (!updateResult || updateResult.id === undefined) {
             return { error: 'Échec de la mise à jour du profil.' };
        }

        revalidatePath('/dashboard/settings');
        return { success: true };
    } catch (error: any) {
        console.error('Vendor profile update error:', error);
        return { error: 'Une erreur inattendue s\'est produite. Veuillez réessayer.' };
    }
}
