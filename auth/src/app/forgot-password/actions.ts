'use server';

import { mutate } from '@/lib/vendure/api';
import { RequestPasswordResetMutation } from '@/lib/vendure/mutations';

export async function requestPasswordResetAction(formData: FormData) {
    const email = formData.get('email') as string;

    if (!email) {
        return { error: 'L\'adresse email est requise.' };
    }

    try {
        const result = await mutate(RequestPasswordResetMutation, {
            emailAddress: email,
        });

        const resetData = result.data?.requestPasswordReset;

        if (resetData?.__typename !== 'Success') {
            console.warn('Password reset request warning:', resetData?.message);
        }

        return { success: true };
    } catch (e: any) {
        console.error('Password reset request error:', e);
        return { error: e.message || 'Une erreur est survenue lors de la demande.' };
    }
}
