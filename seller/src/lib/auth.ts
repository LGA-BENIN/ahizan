const AUTH_TOKEN_COOKIE = process.env.VENDURE_AUTH_TOKEN_COOKIE || 'vendure-auth-token';

export async function setAuthToken(token: string) {
    const isSecure = process.env.NODE_ENV === 'production';
    // const isSecure = false; // FORCE FALSE FOR DEBUGGING IF NEEDED
    console.log(`Setting auth token cookie: ${AUTH_TOKEN_COOKIE}=${token.substring(0, 10)}... (secure: ${isSecure})`);

    if (typeof window === 'undefined') {
        const { cookies } = await import('next/headers');
        const cookieStore = await cookies();
        cookieStore.set({
            name: AUTH_TOKEN_COOKIE,
            value: token,
            httpOnly: true,
            secure: false, // Force false for localhost debugging
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 60 * 24 * 30, // 30 days
        });
    }
}

export async function getAuthToken(): Promise<string | undefined> {
    if (typeof window === 'undefined') {
        const { cookies } = await import('next/headers');
        const cookieStore = await cookies();
        console.log('getAuthToken: Reading cookies from store...');
        const token = cookieStore.get(AUTH_TOKEN_COOKIE)?.value;
        console.log(`Getting auth token cookie: ${AUTH_TOKEN_COOKIE}=${token ? token.substring(0, 10) + '...' : 'undefined'}`);
        return token;
    }
    return undefined;
}

export async function removeAuthToken() {
    console.log(`Removing auth token cookie: ${AUTH_TOKEN_COOKIE}`);
    if (typeof window === 'undefined') {
        const { cookies } = await import('next/headers');
        const cookieStore = await cookies();
        cookieStore.delete(AUTH_TOKEN_COOKIE);
    }
}
