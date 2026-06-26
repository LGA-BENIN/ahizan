'use server';

import { mutate, query } from '@/lib/vendure/api';
import { LoginMutation } from '@/lib/vendure/mutations';
import { GetMyVendorProfileQuery } from '@/lib/vendure/queries';
import { setAuthToken, removeAuthToken } from '@/lib/auth';
import { getUrlContext, sanitizeRedirectUrl } from '@/lib/url-utils';

export async function purgeCookieAction() {
    await removeAuthToken();
}

export async function loginAction(formData: FormData) {
    const username = formData.get('identifier') as string;
    const password = formData.get('password') as string;
    const redirectTo = formData.get('redirectTo') as string | null;

    try {
        // 1. Authentification auprès de Vendure
        const result = await mutate(LoginMutation, { username, password });
        const loginResult = result.data.login;

        if (!loginResult || loginResult.__typename !== 'CurrentUser') {
            const errorResult = loginResult as any;
            return { error: errorResult?.message || 'Identifiants invalides.' };
        }

        // 2. Écriture du cookie partagé sur .ahizan.com
        if (result.token) {
            await setAuthToken(result.token);
        }

        // 3. Détermination de la redirection
        let redirectUrl = '';
        const { storefrontUrl, sellerUrl, useProdUrls } = await getUrlContext();

        let vendor = null;
        try {
            const profileResult = await query(GetMyVendorProfileQuery, {}, { token: result.token });
            vendor = profileResult.data?.myVendorProfile;
        } catch (err) {
            console.warn('Could not verify vendor profile during loginAction:', err);
        }

        if (vendor) {
            if (vendor.status === 'PENDING') {
                redirectUrl = `${sellerUrl}/pending`;
            } else if (vendor.status === 'REJECTED') {
                redirectUrl = `${sellerUrl}/rejected`;
            } else {
                // Compte vendeur existant -> Page de choix de compte
                redirectUrl = '/select-role';
            }
        } else {
            // Uniquement un compte acheteur -> Storefront
            if (redirectTo && redirectTo.startsWith('http') && !redirectTo.includes('seller')) {
                redirectUrl = sanitizeRedirectUrl(redirectTo, useProdUrls) || redirectTo;
            } else {
                redirectUrl = storefrontUrl;
            }
        }

        return { success: true, redirectUrl };
    } catch (e: any) {
        console.error('Login action error:', e);
        return { error: e.message || 'Une erreur est survenue lors de la connexion.' };
    }
}
