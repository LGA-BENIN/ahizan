import {cookies, headers} from 'next/headers';

const AUTH_TOKEN_COOKIE = process.env.VENDURE_AUTH_TOKEN_COOKIE || 'vendure-auth-token';
const DEFAULT_COOKIE_DOMAIN = process.env.NEXT_PUBLIC_COOKIE_DOMAIN || '.ahizan.com';

async function getCookieOptions() {
    let domain: string | undefined = undefined;
    let isSecure = false;
    try {
        const headerList = await headers();
        const host = headerList.get('host') || headerList.get('x-forwarded-host') || '';
        const proto = headerList.get('x-forwarded-proto') || '';
        
        if (host.includes('ahizan.com')) {
            domain = DEFAULT_COOKIE_DOMAIN;
        }
        isSecure = proto === 'https' || (process.env.NODE_ENV === 'production' && host.includes('ahizan.com'));
    } catch {
        domain = undefined;
        isSecure = false;
    }
    return { domain, isSecure };
}

export async function setAuthToken(token: string) {
    const { domain, isSecure } = await getCookieOptions();
    const cookieStore = await cookies();
    cookieStore.set(AUTH_TOKEN_COOKIE, token, {
        domain,
        path: '/',
        httpOnly: true,
        secure: isSecure,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30, // 30 days
    });
}

export async function getAuthToken(): Promise<string | undefined> {
    try {
        const cookieStore = await cookies();
        return cookieStore.get(AUTH_TOKEN_COOKIE)?.value;
    } catch {
        return undefined;
    }
}

export async function removeAuthToken() {
    const { domain } = await getCookieOptions();
    const cookieStore = await cookies();
    cookieStore.delete({
        name: AUTH_TOKEN_COOKIE,
        domain,
        path: '/'
    });
}


