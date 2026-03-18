'use server';

import { mutate, query } from '@/lib/vendure/api';
import { LoginMutation, LogoutMutation } from '@/lib/vendure/mutations';
import { removeAuthToken, setAuthToken } from '@/lib/auth';
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { GetMyVendorProfileQuery } from '@/lib/vendure/queries';

export async function loginAction(prevState: { error?: string } | undefined, formData: FormData) {
    const username = formData.get('username') as string;
    const password = formData.get('password') as string;
    const redirectTo = formData.get('redirectTo') as string | null;

    let result: any;
    try {
        result = await mutate(LoginMutation, {
            username,
            password,
        }, { useAuthToken: true });
    } catch (e: any) {
        console.error('Login mutation threw:', e);
        return { error: 'Unable to connect to the server. Please try again.' };
    }

    const loginResult = result.data.login;
    console.log('Login result type:', loginResult.__typename);

    if (loginResult.__typename !== 'CurrentUser') {
        console.log('Login failed with result:', JSON.stringify(loginResult));
        if (loginResult.__typename === 'NotVerifiedError') {
            return { error: 'Please verify your email address before signing in.' };
        }
        return { error: 'Invalid email or password.' };
    }

    // Store the token in a cookie if returned
    let authToken: string | undefined;
    if (result.token) {
        console.log('Login mutation success, received token:', result.token.substring(0, 10));
        authToken = result.token;
        await setAuthToken(result.token);
    } else {
        console.warn('Login mutation success, but NO token received!');
    }

    revalidatePath('/', 'layout');

    // If a specific redirect was requested (e.g. from a protected page), honour it
    if (redirectTo?.startsWith('/') && !redirectTo.startsWith('//')) {
        return { success: true, redirectTo };
    }

    // Otherwise, check vendor status and redirect to the right page
    try {
        const profileResult = await query(GetMyVendorProfileQuery, {}, { token: authToken, useAuthToken: !authToken });
        const status = profileResult.data.myVendorProfile?.status;

        if (status === 'PENDING') {
            return { success: true, redirectTo: '/pending' };
        } else if (status === 'REJECTED') {
            return { success: true, redirectTo: '/rejected' };
        }
    } catch (e) {
        console.warn('Could not fetch vendor status after login, defaulting to /dashboard', e);
    }

    return { success: true, redirectTo: '/dashboard' };
}

export async function logoutAction() {
    try {
        await mutate(LogoutMutation);
    } catch (e) {
        console.warn('Logout mutation failed:', e);
    }
    await removeAuthToken();
    redirect('/');
}
