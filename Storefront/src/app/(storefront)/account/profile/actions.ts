'use server';

import {mutate} from '@/lib/vendure/api';
import {
    UpdateCustomerPasswordMutation,
    UpdateCustomerMutation,
    RequestUpdateCustomerEmailAddressMutation,
} from '@/lib/vendure/mutations';
import {revalidatePath} from 'next/cache';

export async function updatePasswordAction(prevState: { error?: string; success?: boolean } | undefined, formData: FormData) {
    const currentPassword = formData.get('currentPassword') as string;
    const newPassword = formData.get('newPassword') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    if (!currentPassword || !newPassword || !confirmPassword) {
        return {error: 'Tous les champs sont requis'};
    }

    if (newPassword !== confirmPassword) {
        return {error: 'Les nouveaux mots de passe ne correspondent pas'};
    }

    if (currentPassword === newPassword) {
        return {error: 'Le nouveau mot de passe doit être différent du mot de passe actuel'};
    }

    try {
        const result = await mutate(UpdateCustomerPasswordMutation, {
            currentPassword,
            newPassword,
        }, {useAuthToken: true});

        const updateResult = result.data.updateCustomerPassword;

        if (updateResult.__typename !== 'Success') {
            return {error: updateResult.message};
        }

        return {success: true};
    } catch (error: unknown) {
        return {error: 'Une erreur inattendue est survenue. Veuillez réessayer.'};
    }
}

export async function updateCustomerAction(prevState: { error?: string; success?: boolean } | undefined, formData: FormData) {
    const firstName = formData.get('firstName') as string;
    const lastName = formData.get('lastName') as string;

    if (!firstName || !lastName) {
        return {error: 'Le prénom et le nom sont requis'};
    }

    try {
        const result = await mutate(UpdateCustomerMutation, {
            input: {
                firstName,
                lastName,
            },
        }, {useAuthToken: true});

        const updateResult = result.data.updateCustomer;

        if (!updateResult || !updateResult.id) {
            return {error: 'Échec de la mise à jour des informations de profil'};
        }

        revalidatePath('/account/profile');
        return {success: true};
    } catch (error: unknown) {
        return {error: 'An unexpected error occurred. Please try again.'};
    }
}

export async function requestEmailUpdateAction(prevState: { error?: string; success?: boolean } | undefined, formData: FormData) {
    const password = formData.get('password') as string;
    const newEmailAddress = formData.get('newEmailAddress') as string;

    if (!password || !newEmailAddress) {
        return {error: 'Le mot de passe et la nouvelle adresse e-mail sont requis'};
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmailAddress)) {
        return {error: 'Veuillez saisir une adresse e-mail valide'};
    }

    try {
        const result = await mutate(RequestUpdateCustomerEmailAddressMutation, {
            password,
            newEmailAddress,
        }, {useAuthToken: true});

        const updateResult = result.data.requestUpdateCustomerEmailAddress;

        if (updateResult.__typename !== 'Success') {
            return {error: updateResult.message};
        }

        return {success: true};
    } catch (error: unknown) {
        return {error: 'Une erreur inattendue est survenue. Veuillez réessayer.'};
    }
}
