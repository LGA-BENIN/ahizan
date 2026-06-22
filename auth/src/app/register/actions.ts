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
    const shopName = formData.get('shopName') as string;
    const description = formData.get('shopDescription') as string;
    const address = formData.get('shopAddress') as string;
    const sellerType = formData.get('sellerType') as string || 'ONLINE';

    // Entreprise
    const rccmNumber = formData.get('rccmNumber') as string;
    const rccmFile = formData.get('rccmFile') as File;
    const ifuNumber = formData.get('ifuNumber') as string;
    const ifuFile = formData.get('ifuFile') as File;
    const idCardNumber = formData.get('idCardNumber') as string;
    const idCardFile = formData.get('idCardFile') as File;

    // Champs dynamiques
    const dynamicDetailsStr = formData.get('dynamicDetails') as string;
    const dynamicDetails = dynamicDetailsStr ? JSON.parse(dynamicDetailsStr) : {};

    if (!email || !password || !shopName) {
        return { error: 'L\'email, le mot de passe et le nom de la boutique sont requis.' };
    }

    const nameParts = name ? name.trim().split(/\s+/) : [];
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    try {
        const input: any = {
            name: shopName,
            firstName,
            lastName,
            email,
            phoneNumber: formatPhoneE164(phoneNumber),
            password,
            description,
            address,
            type: sellerType,
            customFields: {
                // Si le plugin de page d'inscription requiert de mapper des customFields
                ...dynamicDetails
            }
        };

        if (sellerType === 'ENTERPRISE') {
            input.rccmNumber = rccmNumber;
            if (rccmFile && rccmFile.size > 0) input.rccmFile = rccmFile;
            input.ifuNumber = ifuNumber;
            if (ifuFile && ifuFile.size > 0) input.ifuFile = ifuFile;
            input.idCardNumber = idCardNumber;
            if (idCardFile && idCardFile.size > 0) input.idCardFile = idCardFile;
        }

        const result = await mutate(ApplyToBecomeVendorMutation, { input });

        if (!result.data.applyToBecomeVendor) {
            return { error: 'Une erreur est survenue lors de la création de la demande vendeur.' };
        }

        // Auto-login
        try {
            const loginResult = await mutate(LoginMutation, {
                username: email,
                password,
            });

            if (loginResult.data.login?.__typename === 'CurrentUser' && loginResult.token) {
                await setAuthToken(loginResult.token);
                return { success: true, redirectUrl: `${SELLER_URL}/pending` };
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

export async function applyForVendorConnectedAction(formData: FormData) {
    const token = await getAuthToken();
    if (!token) {
        return { error: 'Vous devez être connecté pour soumettre cette demande.' };
    }

    const shopName = formData.get('shopName') as string;
    const description = formData.get('shopDescription') as string;
    const address = formData.get('shopAddress') as string;
    const sellerType = formData.get('sellerType') as string || 'ONLINE';

    // Entreprise
    const rccmNumber = formData.get('rccmNumber') as string;
    const rccmFile = formData.get('rccmFile') as File;
    const ifuNumber = formData.get('ifuNumber') as string;
    const ifuFile = formData.get('ifuFile') as File;
    const idCardNumber = formData.get('idCardNumber') as string;
    const idCardFile = formData.get('idCardFile') as File;

    // Champs dynamiques
    const dynamicDetailsStr = formData.get('dynamicDetails') as string;
    const dynamicDetails = dynamicDetailsStr ? JSON.parse(dynamicDetailsStr) : {};

    if (!shopName) {
        return { error: 'Le nom de la boutique est requis.' };
    }

    try {
        const input: any = {
            name: shopName,
            description,
            address,
            type: sellerType,
            dynamicDetails: {
                ...dynamicDetails
            }
        };

        if (sellerType === 'ENTERPRISE') {
            input.rccmNumber = rccmNumber;
            if (rccmFile && rccmFile.size > 0) input.rccmFile = rccmFile;
            input.ifuNumber = ifuNumber;
            if (ifuFile && ifuFile.size > 0) input.ifuFile = ifuFile;
            input.idCardNumber = idCardNumber;
            if (idCardFile && idCardFile.size > 0) input.idCardFile = idCardFile;
        }

        const result = await mutate(ApplyToBecomeVendorMutation, { input }, { token });

        if (!result.data.applyToBecomeVendor) {
            return { error: 'Une erreur est survenue lors de la création de la demande vendeur.' };
        }

        return { success: true, redirectUrl: `${SELLER_URL}/pending` };
    } catch (e: any) {
        console.error('Connected vendor application error:', e);
        return { error: e.message || 'Une erreur est survenue.' };
    }
}
