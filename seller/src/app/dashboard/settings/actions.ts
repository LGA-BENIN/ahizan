'use server';

import { mutate } from '@/lib/vendure/api';
import { UpdateCustomerPasswordMutation } from '@/lib/vendure/mutations';

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

        return { success: true };
    } catch (error: any) {
        console.error('Password change error:', error);
        return { error: 'Une erreur inattendue s\'est produite. Veuillez réessayer.' };
    }
}
