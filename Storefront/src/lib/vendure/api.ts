import type {TadaDocumentNode} from 'gql.tada';
import {print} from 'graphql';
import {getAuthToken} from '@/lib/auth';

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
    tags?: string[];
}

interface VendureResponse<T> {
    data?: T;
    errors?: Array<{ message: string; [key: string]: unknown }>;
}

/**
 * Extract the Vendure auth token from response headers
 */
function extractAuthToken(headers: Headers): string | null {
    // 1. Check for the direct auth token header
    let token = headers.get(VENDURE_AUTH_TOKEN_HEADER);

    // 2. If not found, check the set-cookie header for the auth token
    if (!token) {
        const setCookies = headers.getSetCookie?.() || [headers.get('set-cookie')].filter(Boolean);
        if (setCookies.length > 0) {
            for (const setCookie of setCookies) {
                // Looking for something like "vendure-auth-token=...;"
                const match = setCookie.match(new RegExp(`${VENDURE_AUTH_TOKEN_HEADER}=([^;]+)`, 'i'));
                if (match) {
                    token = match[1];
                    break;
                }
            }
        }
    }

    if (token) {
        console.log(`Extracted auth token from response: ${token.substring(0, 10)}...`);
    }
    return token;
}


/**
 * Execute a GraphQL query against the Vendure API
 */
export async function query<TResult, TVariables>(
    document: TadaDocumentNode<TResult, TVariables>,
    ...[variables, options]: TVariables extends Record<string, never>
        ? [variables?: TVariables, options?: VendureRequestOptions]
        : [variables: TVariables, options?: VendureRequestOptions]
): Promise<{ data: TResult; token?: string }> {
    const {
        token,
        useAuthToken,
        channelToken,
        fetch: fetchOptions,
        tags,
    } = options || {};

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(fetchOptions?.headers as Record<string, string>),
    };

    // Use the explicitly provided token, or fetch from cookies if useAuthToken is true
    let authToken = token;
    if (useAuthToken && !authToken) {
        authToken = await getAuthToken();
    }

    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
        headers[VENDURE_AUTH_TOKEN_HEADER] = authToken; // Explicitly add the token header as well
    }

    // Set the channel token header (use provided channelToken or default)
    headers[VENDURE_CHANNEL_TOKEN_HEADER] = channelToken || VENDURE_CHANNEL_TOKEN;

    console.log(`[API Query] Requesting: ${VENDURE_API_URL}`);
    console.log(`[API Query] Variables:`, JSON.stringify(variables, null, 2));
    
    // DEBUG LOG HEADERS
    try {
        const fs = require('fs');
        const documentName = (document as any)?.definitions?.[0]?.name?.value || 'Unknown';
        fs.appendFileSync('checkout-debug.log', `[API] Executing ${documentName}
AuthHeader: ${headers['Authorization'] ? 'PRESENT (' + headers['Authorization'].substring(0,15) + '...)' : 'MISSING'}
Variables: ${JSON.stringify(variables)}
\n`);
    } catch(e) {}

    const hasRevalidate = fetchOptions?.next && 'revalidate' in (fetchOptions.next as any);
    const response = await fetch(VENDURE_API_URL!, {
        ...fetchOptions,
        method: 'POST',
        headers,
        body: JSON.stringify({
            query: print(document),
            variables: variables || {},
        }),
        ...(hasRevalidate ? {} : { cache: 'no-store' as RequestCache }),
        ...(tags && {next: {tags}}),
    });

    if (!response.ok) {
        console.error(`[API Query] HTTP Error: ${response.status} ${response.statusText}`);
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result: VendureResponse<TResult> = await response.json();
    console.log(`[API Query] Result Data Keys:`, result.data ? Object.keys(result.data) : 'NULL');
    if (result.data && (result.data as any).product === null) {
        console.warn(`[API Query] PRODUCT WAS NULL for variables:`, variables);
    }

    if (result.errors) {
        console.error(`[API Query] ERRORS for variables:`, variables);
        console.error(`[API Query] ERRORS:`, JSON.stringify(result.errors, null, 2));
        throw new Error(result.errors.map((e: any) => e.message).join(', '));
    }

    if (!result.data) {
        throw new Error('No data returned from Vendure API');
    }

    const newToken = extractAuthToken(response.headers);

    return {
        data: result.data,
        ...(newToken && {token: newToken}),
    };
}

/**
 * Execute a GraphQL mutation against the Vendure API
 */
export async function mutate<TResult, TVariables>(
    document: TadaDocumentNode<TResult, TVariables>,
    ...[variables, options]: TVariables extends Record<string, never>
        ? [variables?: TVariables, options?: VendureRequestOptions]
        : [variables: TVariables, options?: VendureRequestOptions]
): Promise<{ data: TResult; token?: string }> {
    // Mutations use the same underlying implementation as queries in GraphQL
    // @ts-expect-error - Complex conditional type inference, runtime behavior is correct
    return query(document, variables, options);
}
