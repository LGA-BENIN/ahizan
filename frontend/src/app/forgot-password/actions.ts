'use server';

import { mutate } from '@/lib/vendure/api';
import { RequestPasswordResetMutation, VerifyPasswordResetCodeMutation } from '@/lib/vendure/mutations';

export async function requestPasswordResetAction(prevState: { error?: string; success?: boolean } | undefined, formData: FormData) {
    const emailAddress = formData.get('emailAddress') as string;

    if (!emailAddress) {
        return { error: 'Email address is required' };
    }

    try {
        const result = await mutate(RequestPasswordResetMutation, {
            emailAddress,
        });

        const resetResult = result.data.requestPasswordReset;

        if (resetResult?.__typename !== 'Success') {
            return { error: resetResult?.message || 'Failed to request password reset' };
        }

        return { success: true };
    } catch (error: unknown) {
        return { error: 'An unexpected error occurred. Please try again.' };
    }
}

export async function verifyPasswordResetCodeAction(email: string, code: string) {
    if (!email || !code) {
        return { error: 'Email and code are required' };
    }

    try {
        const result = await mutate(VerifyPasswordResetCodeMutation, {
            email,
            code,
        });

        if (result.data.verifyPasswordResetCode) {
            return { success: true };
        } else {
            return { error: 'Code incorrect ou expiré' };
        }
    } catch (error: any) {
        return { error: 'Une erreur est survenue lors de la vérification' };
    }
}
