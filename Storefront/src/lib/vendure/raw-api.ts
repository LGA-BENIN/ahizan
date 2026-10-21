import { getAuthToken } from '@/lib/auth';
import { getShopApiUrl } from './api-utils';

const VENDURE_CHANNEL_TOKEN = process.env.VENDURE_CHANNEL_TOKEN || process.env.NEXT_PUBLIC_VENDURE_CHANNEL_TOKEN || '__default_channel__';
const VENDURE_AUTH_TOKEN_HEADER = process.env.VENDURE_AUTH_TOKEN_HEADER || 'vendure-auth-token';
const VENDURE_CHANNEL_TOKEN_HEADER = process.env.VENDURE_CHANNEL_TOKEN_HEADER || 'vendure-token';

interface RawQueryOptions {
    useAuthToken?: boolean;
    variables?: Record<string, any>;
    cache?: RequestCache;
    revalidate?: number | false;
    tags?: string[];
}

/**
 * Execute a raw (untyped) GraphQL query against the Vendure Shop API.
 * Accepts a plain string query (no gql tag needed).
 * Used for custom plugin queries (vendor, platformSettings, etc.)
 */
export async function rawQuery(queryString: string, options?: RawQueryOptions): Promise<any> {
    const apiUrl = process.env.VENDURE_SHOP_API_URL || process.env.NEXT_PUBLIC_VENDURE_SHOP_API_URL || getShopApiUrl();
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        [VENDURE_CHANNEL_TOKEN_HEADER]: VENDURE_CHANNEL_TOKEN,
    };

    if (options?.useAuthToken) {
        const token = await getAuthToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
            headers[VENDURE_AUTH_TOKEN_HEADER] = token;
        }
    }

    const fetchConfig: RequestInit = {
        method: 'POST',
        headers,
        body: JSON.stringify({
            query: queryString,
            variables: options?.variables || {},
        }),
    };

    if (options?.useAuthToken || options?.cache === 'no-store' || options?.revalidate === false) {
        fetchConfig.cache = 'no-store';
    } else {
        const revalidateVal = typeof options?.revalidate === 'number' ? options.revalidate : 60;
        (fetchConfig as any).next = {
            revalidate: revalidateVal,
            ...(options?.tags && { tags: options.tags }),
        };
    }

    const response = await fetch(apiUrl, fetchConfig);

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    if (result.errors) {
        console.error('[rawQuery] Errors:', result.errors);
        throw new Error(result.errors.map((e: any) => e.message).join(', '));
    }

    return result.data;
}
