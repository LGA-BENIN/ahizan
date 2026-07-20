const AUTH_TOKEN_COOKIE = process.env.VENDURE_AUTH_TOKEN_COOKIE || 'vendure-auth-token';
const COOKIE_DOMAIN = process.env.NEXT_PUBLIC_COOKIE_DOMAIN || '.ahizan.com';

export async function setAuthToken(token: string) {
    const isSecure = process.env.NODE_ENV === 'production';
    console.log(`Setting auth token cookie: ${AUTH_TOKEN_COOKIE}=${token.substring(0, 10)}... (secure: ${isSecure})`);

    if (typeof window === 'undefined') {
        const { cookies } = await import('next/headers');
        const cookieStore = await cookies();
        cookieStore.set({
            name: AUTH_TOKEN_COOKIE,
            value: token,
            httpOnly: true,
            secure: isSecure,
            sameSite: 'lax',
            path: '/',
            domain: isSecure ? COOKIE_DOMAIN : undefined,
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
    const isSecure = process.env.NODE_ENV === 'production';
    console.log(`Removing auth token cookie: ${AUTH_TOKEN_COOKIE}`);
    if (typeof window === 'undefined') {
        const { cookies } = await import('next/headers');
        const cookieStore = await cookies();
        cookieStore.delete({
            name: AUTH_TOKEN_COOKIE,
            domain: isSecure ? COOKIE_DOMAIN : undefined,
            path: '/'
        });
    }
}


