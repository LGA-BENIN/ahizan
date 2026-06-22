const AUTH_TOKEN_COOKIE = process.env.VENDURE_AUTH_TOKEN_COOKIE || 'vendure-auth-token';
const COOKIE_DOMAIN = process.env.NEXT_PUBLIC_COOKIE_DOMAIN || '.ahizan.com';

export async function setAuthToken(token: string) {
    if (typeof window === 'undefined') {
        const isSecure = process.env.NODE_ENV === 'production';
        const { cookies } = await import('next/headers');
        const cookieStore = await cookies();
        cookieStore.set(AUTH_TOKEN_COOKIE, token, {
            domain: isSecure ? COOKIE_DOMAIN : undefined,
            path: '/',
            httpOnly: true,
            secure: isSecure,
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 30, // 30 days
        });
    }
}

export async function getAuthToken(): Promise<string | undefined> {
    if (typeof window === 'undefined') {
        try {
            const { cookies } = await import('next/headers');
            const cookieStore = await cookies();
            return cookieStore.get(AUTH_TOKEN_COOKIE)?.value;
        } catch {
            return undefined;
        }
    }
    return undefined;
}

export async function removeAuthToken() {
    if (typeof window === 'undefined') {
        const isSecure = process.env.NODE_ENV === 'production';
        const { cookies } = await import('next/headers');
        const cookieStore = await cookies();
        cookieStore.delete({
            name: AUTH_TOKEN_COOKIE,
            domain: isSecure ? COOKIE_DOMAIN : undefined,
            path: '/'
        });
    }
}


