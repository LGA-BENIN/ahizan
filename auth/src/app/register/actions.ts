'use server';

import { mutate } from '@/lib/vendure/api';
import { RegisterCustomerAccountMutation, ApplyToBecomeVendorMutation, LoginMutation } from '@/lib/vendure/mutations';
import { setAuthToken } from '@/lib/auth';
import { formatPhoneE164 } from '@/lib/format-phone';

const STOREFRONT_URL = process.env.STOREFRONT_URL || 'http://localhost:3001';
const SELLER_URL = process.env.SELLER_URL || 'http://localhost:3002';

export async function registerClientAction(formData: FormData) {
    const emailAddress = formData.get('emailAddress') as string;
    const password = formData.get('password') as string;
    const name = formData.get('name') as string;
    const phoneNumber = formData.get('phoneNumber') as string;
    const redirectTo = formData.get('redirectTo') as string | null;

    if (!emailAddress || !password) {
        return { error: 'L\'adresse email et le mot de passe sont requis.' };
    }

    // Séparer prénom et nom à partir du nom complet
    const nameParts = name ? name.trim().split(/\s+/) : [];
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    try {
        const result = await mutate(RegisterCustomerAccountMutation, {
            input: {
                emailAddress,
                firstName,
                lastName,
                phoneNumber: formatPhoneE164(phoneNumber),
                password,
            }
        });

        const registerResult = result.data.registerCustomerAccount;

        if (registerResult.__typename !== 'Success') {
            return { error: registerResult.message || 'Une erreur est survenue lors de l\'inscription.' };
        }

        const verifyUrl = redirectTo
            ? `${STOREFRONT_URL}/verify-pending?redirectTo=${encodeURIComponent(redirectTo)}`
            : `${STOREFRONT_URL}/verify-pending`;

        return { success: true, redirectUrl: verifyUrl };
    } catch (e: any) {
        console.error('Client registration error:', e);
        return { error: e.message || 'Une erreur est survenue.' };
    }
}

export async function registerVendorAction(formData: FormData) {
    const email = formData.get('emailAddress') as string;
    const password = formData.get('password') as string;
    const name = formData.get('name') as string;
    const phoneNumber = formData.get('phoneNumber') as string;

    if (!email || !password) {
        return { error: 'L\'adresse email et le mot de passe sont requis.' };
    }

    const nameParts = name ? name.trim().split(/\s+/) : [];
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    try {
        // Enregistrer d'abord le compte client de base
        const registerResult = await mutate(RegisterCustomerAccountMutation, {
            input: {
                emailAddress: email,
                firstName,
                lastName,
                phoneNumber: formatPhoneE164(phoneNumber),
                password,
            }
        });

        const regData = registerResult.data.registerCustomerAccount;

        if (regData.__typename !== 'Success') {
            return { error: regData.message || 'Une erreur est survenue lors de l\'inscription.' };
        }

        // Connexion automatique immédiate après inscription
        try {
            const loginResult = await mutate(LoginMutation, {
                username: email,
                password,
            });

            if (loginResult.data.login?.__typename === 'CurrentUser' && loginResult.token) {
                await setAuthToken(loginResult.token);
                // Rediriger vers la page d'onboarding sur la plateforme vendeur
                return { success: true, redirectUrl: `${SELLER_URL}/onboarding` };
            }
        } catch (loginErr) {
            console.warn('Auto-login failed after vendor registration:', loginErr);
        }

        return { success: true, redirectUrl: '/sign-in' };
    } catch (e: any) {
        console.error('Vendor registration error:', e);
        return { error: e.message || 'Une erreur est survenue.' };
    }
}
