'use server';

import { mutate } from '@/lib/vendure/api';
import { ApplyToBecomeVendorMutation, UpdateMyVendorProfileMutation, LoginMutation } from '@/lib/vendure/mutations';
import { redirect } from 'next/navigation';
import { setAuthToken } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { formatPhoneE164 } from '@/lib/format-phone';

export async function registerVendor(prevState: any, formData: FormData) {
    // Support both 'email' and 'emailAddress' field names
    const email = (formData.get('email') || formData.get('emailAddress')) as string;
    const shopName = (formData.get('name') || formData.get('shopName')) as string;
    const phoneNumber = formData.get('phoneNumber') as string;
    const password = formData.get('password') as string;
    const firstName = formData.get('firstName') as string;
    const lastName = formData.get('lastName') as string;
    const description = (formData.get('description') || formData.get('shopDescription')) as string;
    const address = formData.get('address') as string;

    const type = (formData.get('type') || formData.get('sellerType')) as string || 'INDIVIDUAL';
    const deliveryInfo = formData.get('deliveryInfo') as string;
    const returnPolicy = formData.get('returnPolicy') as string;
    const zone = formData.get('zone') as string;

    const rccmNumber = formData.get('rccmNumber') as string;
    const rccmFile = formData.get('rccmFile') as File;
    const ifuNumber = formData.get('ifuNumber') as string;
    const ifuFile = formData.get('ifuFile') as File;
    const idCardNumber = formData.get('idCardNumber') as string;
    const idCardFile = formData.get('idCardFile') as File;

    const website = formData.get('website') as string;
    const facebook = formData.get('facebook') as string;
    const instagram = formData.get('instagram') as string;

    const logo = formData.get('logo') as File;
    const coverImage = formData.get('coverImage') as File;

    let redirectPath: string | null = null;
    let error: string | null = null;

    console.log('[registerVendor] Starting registration for:', email);

    try {
        const { data } = await mutate(ApplyToBecomeVendorMutation, {
            input: {
                name: shopName,
                firstName,
                lastName,
                email,
                phoneNumber: formatPhoneE164(phoneNumber),
                password,
                description,
                address,
                type,
                deliveryInfo,
                returnPolicy,
                zone,
                rccmNumber,
                rccmFile: (rccmFile?.size > 0 ? rccmFile : undefined) as any,
                ifuNumber,
                ifuFile: (ifuFile?.size > 0 ? ifuFile : undefined) as any,
                idCardNumber,
                idCardFile: (idCardFile?.size > 0 ? idCardFile : undefined) as any,
                website,
                facebook,
                instagram,
                logo: (logo?.size > 0 ? logo : undefined) as any,
                coverImage: (coverImage?.size > 0 ? coverImage : undefined) as any,
            },
        } as any);

        console.log('[registerVendor] Registration mutation result:', JSON.stringify(data.applyToBecomeVendor));

        if (data.applyToBecomeVendor) {
            // Auto-login after successful registration
            try {
                console.log('[registerVendor] Attempting auto-login for:', email);
                const loginResult = await mutate(LoginMutation, {
                    username: email,
                    password: password,
                }, { useAuthToken: true });

                console.log('[registerVendor] Login result - token present:', !!loginResult.token, 'data:', JSON.stringify(loginResult.data));

                // Check if login returned an error result
                const loginData = loginResult.data as any;
                if (loginData?.login?.__typename === 'CurrentUser') {
                    if (loginResult.token) {
                        await setAuthToken(loginResult.token);
                        console.log('[registerVendor] Auto-login successful, token saved for:', email);
                        redirectPath = '/pending';
                    } else {
                        console.warn('[registerVendor] Login succeeded (CurrentUser) but no token in response headers for:', email);
                        // Still redirect to pending - the login itself succeeded
                        redirectPath = '/sign-in';
                    }
                } else {
                    const errorMsg = loginData?.login?.message || 'Unknown login error';
                    console.error('[registerVendor] Login returned error:', errorMsg);
                    redirectPath = '/sign-in';
                }
            } catch (loginError: any) {
                console.error('[registerVendor] Auto-login failed after registration:', loginError.message);
                redirectPath = '/sign-in';
            }
        }
    } catch (e: any) {
        console.error('[registerVendor] Registration failed:', e);
        error = e.message || "Une erreur s'est produite lors de l'inscription.";
    }

    if (error) {
        return { message: '', error };
    }

    if (redirectPath) {
        revalidatePath('/', 'layout');
        redirect(redirectPath);
    }

    return { message: 'Inscription réussie !', error: '' };
}

// Alias for components that import registerAction
export const registerAction = registerVendor;

export async function resubmitVendor(prevState: any, formData: FormData) {
    const shopName = formData.get('name') as string;
    const phoneNumber = formData.get('phoneNumber') as string;
    const description = (formData.get('description') || formData.get('shopDescription')) as string;
    const address = formData.get('address') as string;
    const type = formData.get('type') as string;
    const deliveryInfo = formData.get('deliveryInfo') as string;
    const returnPolicy = formData.get('returnPolicy') as string;
    const zone = formData.get('zone') as string;
    const rccmNumber = formData.get('rccmNumber') as string;
    const rccmFile = formData.get('rccmFile') as File;
    const ifuNumber = formData.get('ifuNumber') as string;
    const ifuFile = formData.get('ifuFile') as File;
    const idCardNumber = formData.get('idCardNumber') as string;
    const idCardFile = formData.get('idCardFile') as File;
    const website = formData.get('website') as string;
    const facebook = formData.get('facebook') as string;
    const instagram = formData.get('instagram') as string;
    const logo = formData.get('logo') as File;
    const coverImage = formData.get('coverImage') as File;

    try {
        await mutate(UpdateMyVendorProfileMutation, {
            input: {
                name: shopName || undefined,
                phoneNumber: formatPhoneE164(phoneNumber),
                description: description || undefined,
                address: address || undefined,
                type: type || undefined,
                deliveryInfo: deliveryInfo || undefined,
                returnPolicy: returnPolicy || undefined,
                zone: zone || undefined,
                rccmNumber: rccmNumber || undefined,
                rccmFile: (rccmFile?.size > 0 ? rccmFile : undefined) as any,
                ifuNumber: ifuNumber || undefined,
                ifuFile: (ifuFile?.size > 0 ? ifuFile : undefined) as any,
                idCardNumber: idCardNumber || undefined,
                idCardFile: (idCardFile?.size > 0 ? idCardFile : undefined) as any,
                website: website || undefined,
                facebook: facebook || undefined,
                instagram: instagram || undefined,
                logo: (logo?.size > 0 ? logo : undefined) as any,
                coverImage: (coverImage?.size > 0 ? coverImage : undefined) as any,
            },
        } as any, { useAuthToken: true });
    } catch (e: any) {
        console.error('Resubmission failed:', e);
        return {
            message: '',
            error: e.message || "Une erreur s'est produite lors de la soumission.",
        };
    }

    redirect('/pending');
}
