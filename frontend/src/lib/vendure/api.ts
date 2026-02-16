import type { TadaDocumentNode } from 'gql.tada';
import { print } from 'graphql';
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
    tags?: string[];
}

interface VendureResponse<T> {
    data?: T;
    errors?: Array<{ message: string;[key: string]: unknown }>;
}

/**
 * Extract the Vendure auth token from response headers
 */
function extractAuthToken(headers: Headers): string | null {
    const token = headers.get(VENDURE_AUTH_TOKEN_HEADER);
    if (token) {
        console.log(`Extracted auth token from response header: ${token.substring(0, 10)}...`);
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
    }

    // Set the channel token header (use provided channelToken or default)
    headers[VENDURE_CHANNEL_TOKEN_HEADER] = channelToken || VENDURE_CHANNEL_TOKEN;

    // Check for files in variables to determine if we need multipart/form-data
    const files: { file: File, variablePath: string }[] = [];

    const extractFiles = (obj: any, path: string = 'variables') => {
        if (!obj) return;
        if (typeof obj === 'object') {
            for (const key in obj) {
                const value = obj[key];
                const newPath = path ? `${path}.${key}` : key;
                if (value instanceof File) {
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
            query: print(document),
            variables: variables || {}
        };

        // We need to nullify the file fields in the operations object strictly for the map to work correctly
        // But for simplicity, we keep variables as is, server should handle it.
        // However, standard spec says null.
        // Let's rely on map.

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
        delete headers['Content-Type']; // Let browser set boundary
    } else {
        body = JSON.stringify({
            query: print(document),
            variables: variables || {},
        });
    }

    const response = await fetch(VENDURE_API_URL!, {
        ...fetchOptions,
        method: 'POST',
        headers,
        body: files.length > 0 ? body : JSON.stringify({
            query: print(document),
            variables: variables || {},
        }),
        ...(tags && { next: { tags } }),
    });

    if (!response.ok) {
        console.error(`Fetch failed for URL: ${VENDURE_API_URL}`);
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
