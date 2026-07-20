import { getAuthToken } from '@/lib/auth';

const VENDURE_API_URL = process.env.VENDURE_SHOP_API_URL || process.env.NEXT_PUBLIC_VENDURE_SHOP_API_URL;
const VENDURE_CHANNEL_TOKEN = process.env.VENDURE_CHANNEL_TOKEN || process.env.NEXT_PUBLIC_VENDURE_CHANNEL_TOKEN || '__default_channel__';
const VENDURE_AUTH_TOKEN_HEADER = process.env.VENDURE_AUTH_TOKEN_HEADER || 'vendure-auth-token';
const VENDURE_CHANNEL_TOKEN_HEADER = process.env.VENDURE_CHANNEL_TOKEN_HEADER || 'vendure-token';

interface RawQueryOptions {
    useAuthToken?: boolean;
    variables?: Record<string, any>;
}

/**
 * Execute a raw (untyped) GraphQL query against the Vendure Shop API.
 * Accepts a plain string query (no gql tag needed).
 * Used for custom plugin queries (vendor, platformSettings, etc.)
 */
export async function rawQuery(queryString: string, options?: RawQueryOptions): Promise<any> {
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

    const response = await fetch(VENDURE_API_URL!, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            query: queryString,
            variables: options?.variables || {},
        }),
        cache: 'no-store',
    });

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
