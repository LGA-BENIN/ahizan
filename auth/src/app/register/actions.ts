'use server';

import { mutate } from '@/lib/vendure/api';
import { RegisterCustomerAccountMutation, ApplyToBecomeVendorMutation, LoginMutation } from '@/lib/vendure/mutations';
import { setAuthToken } from '@/lib/auth';
import { formatPhoneE164 } from '@/lib/format-phone';
import { getUrlContext, sanitizeRedirectUrl } from '@/lib/url-utils';

export async function registerClientAction(formData: FormData) {
    const emailAddress = formData.get('emailAddress') as string;
    const password = formData.get('password') as string;
    const name = formData.get('name') as string;
    const phoneNumber = formData.get('phoneNumber') as string;
    const rawRedirectTo = formData.get('redirectTo') as string | null;
    const { storefrontUrl, useProdUrls } = await getUrlContext();
    const redirectTo = sanitizeRedirectUrl(rawRedirectTo, useProdUrls);

    if (!emailAddress || !password) {
        return { error: 'L\'adresse email et le mot de passe sont requis.' };
    }

    const cleanPhoneClient = phoneNumber ? phoneNumber.replace(/[\s\-()]/g, '') : '';
    if (!/^[0-9]{10}$/.test(cleanPhoneClient)) {
        return { error: 'Le numéro de téléphone doit comporter exactement 10 chiffres (ex: 01 XX XX XX XX).' };
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
                phoneNumber: formatPhoneE164(cleanPhoneClient),
                password,
            }
        });

        const registerResult = result.data.registerCustomerAccount;

        if (registerResult.__typename !== 'Success') {
            return { error: registerResult.message || 'Une erreur est survenue lors de l\'inscription.' };
        }

        const safeRedirect = redirectTo && !redirectTo.includes('seller') ? redirectTo : undefined;
        const verifyUrl = safeRedirect
            ? `${storefrontUrl}/verify-pending?redirectTo=${encodeURIComponent(safeRedirect)}`
            : `${storefrontUrl}/verify-pending`;

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
    const { sellerUrl } = await getUrlContext();

    if (!email || !password) {
        return { error: 'L\'adresse email et le mot de passe sont requis.' };
    }

    const cleanPhoneVendor = phoneNumber ? phoneNumber.replace(/[\s\-()]/g, '') : '';
    if (!/^[0-9]{10}$/.test(cleanPhoneVendor)) {
        return { error: 'Le numéro de téléphone doit comporter exactement 10 chiffres (ex: 01 XX XX XX XX).' };
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
                phoneNumber: formatPhoneE164(cleanPhoneVendor),
                password,
            }
        });

        const regData = registerResult.data.registerCustomerAccount;

        if (regData.__typename !== 'Success') {
            const errorMsg = regData.message || '';
            // Reconnaissance d'adresse e-mail existante (#Auth 1)
            if (errorMsg.toLowerCase().includes('conflict') || errorMsg.toLowerCase().includes('utilis') || errorMsg.toLowerCase().includes('already')) {
                return { 
                    error: 'Cette adresse e-mail est déjà reconnue sur Ahizan. Connectez-vous avec votre compte existant pour créer votre boutique.',
                    redirectUrl: `/sign-in?redirectTo=${encodeURIComponent(sellerUrl + '/onboarding')}`
                };
            }
            return { error: errorMsg || 'Une erreur est survenue lors de l\'inscription.' };
        }

        // Connexion automatique immédiate après inscription
        try {
            const loginResult = await mutate(LoginMutation, {
                username: email,
                password,
            });

            if (loginResult.data.login?.__typename === 'CurrentUser' && loginResult.token) {
                await setAuthToken(loginResult.token);
                return { success: true, redirectUrl: `${sellerUrl}/onboarding` };
            }
        } catch (loginErr) {
            console.warn('Auto-login failed after vendor registration:', loginErr);
        }

        return { success: true, redirectUrl: `${sellerUrl}/verify-pending` };
    } catch (e: any) {
        console.error('Vendor registration error:', e);
        return { error: e.message || 'Une erreur est survenue.' };
    }
}
