import { getAuthToken } from '@/lib/auth';

const VENDURE_API_URL = process.env.VENDURE_SHOP_API_URL || process.env.NEXT_PUBLIC_VENDURE_SHOP_API_URL;
const VENDURE_CHANNEL_TOKEN = process.env.VENDURE_CHANNEL_TOKEN || process.env.NEXT_PUBLIC_VENDURE_CHANNEL_TOKEN || '__default_channel__';
const VENDURE_AUTH_TOKEN_HEADER = process.env.VENDURE_AUTH_TOKEN_HEADER || 'vendure-auth-token';
const VENDURE_CHANNEL_TOKEN_HEADER = process.env.VENDURE_CHANNEL_TOKEN_HEADER || 'vendure-token';

if (!VENDURE_API_URL) {
    throw new Error('VENDURE_SHOP_API_URL or NEXT_PUBLIC_VENDURE_SHOP_API_URL environment variable is not set');
}

interface VendureRequestOptions {
    token?: string;
    useAuthToken?: boolean;
    channelToken?: string;
    fetch?: RequestInit;
}

interface VendureResponse<T> {
    data?: T;
    errors?: Array<{ message: string; [key: string]: unknown }>;
}

function extractAuthToken(headers: Headers): string | null {
    let token = headers.get(VENDURE_AUTH_TOKEN_HEADER);
    if (!token) {
        const setCookies = headers.getSetCookie?.() || [headers.get('set-cookie')].filter(Boolean);
        if (setCookies.length > 0) {
            for (const setCookie of setCookies) {
                const match = setCookie.match(new RegExp(`${VENDURE_AUTH_TOKEN_HEADER}=([^;]+)`, 'i'));
                if (match) {
                    token = match[1];
                    break;
                }
            }
        }
    }
    return token;
}

export async function query<TResult = any>(
    document: string,
    variables?: any,
    options?: VendureRequestOptions
): Promise<{ data: TResult; token?: string }> {
    const {
        token,
        useAuthToken,
        channelToken,
        fetch: fetchOptions,
    } = options || {};

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(fetchOptions?.headers as Record<string, string>),
    };

    let authToken = token;
    if (useAuthToken && !authToken) {
        authToken = await getAuthToken();
    }

    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
        headers[VENDURE_AUTH_TOKEN_HEADER] = authToken;
    } else {
        headers[VENDURE_AUTH_TOKEN_HEADER] = '';
    }

    headers[VENDURE_CHANNEL_TOKEN_HEADER] = channelToken || VENDURE_CHANNEL_TOKEN;

    // Check for files in variables to determine if we need multipart/form-data
    const files: { file: any; variablePath: string }[] = [];

    const extractFiles = (obj: any, path: string = 'variables') => {
        if (!obj) return;
        if (typeof obj === 'object') {
            for (const key in obj) {
                const value = obj[key];
                const newPath = path ? `${path}.${key}` : key;
                if (typeof window === 'undefined' && typeof File !== 'undefined' && value instanceof File) {
                    files.push({ file: value, variablePath: newPath });
                } else if (value && typeof value.name === 'string' && typeof value.size === 'number' && typeof value.type === 'string') {
                    // Fallback to match File on server-side if instanceof fails
                    files.push({ file: value, variablePath: newPath });
                } else if (typeof value === 'object' && value !== null) {
                    extractFiles(value, newPath);
                }
            }
        }
    };

    if (variables) {
        extractFiles(variables);
    }

    let body: any;

    if (files.length > 0) {
        const formData = new FormData();
        const operations = {
            query: document,
            variables: variables || {}
        };

        formData.append('operations', JSON.stringify(operations));

        const map: Record<string, string[]> = {};
        files.forEach((f, index) => {
            map[index.toString()] = [f.variablePath];
        });
        formData.append('map', JSON.stringify(map));

        files.forEach((f, index) => {
            formData.append(index.toString(), f.file);
        });

        body = formData;
        delete headers['Content-Type']; // Let the browser or fetch set the boundary
    } else {
        body = JSON.stringify({
            query: document,
            variables: variables || {},
        });
    }

    const response = await fetch(VENDURE_API_URL!, {
        ...fetchOptions,
        method: 'POST',
        headers,
        body,
        cache: 'no-store',
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result: VendureResponse<TResult> = await response.json();

    if (result.errors) {
        throw new Error(result.errors.map(e => e.message).join(', '));
    }

    if (!result.data) {
        throw new Error('No data returned from Vendure API');
    }

    const newToken = extractAuthToken(response.headers);

    return {
        data: result.data,
        ...(newToken && { token: newToken }),
    };
}

export async function mutate<TResult = any>(
    document: string,
    variables?: any,
    options?: VendureRequestOptions
): Promise<{ data: TResult; token?: string }> {
    return query(document, variables, options);
}
