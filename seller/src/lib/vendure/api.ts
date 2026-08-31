import type { TadaDocumentNode } from 'gql.tada';
import { print } from 'graphql';
import { getAuthToken } from '@/lib/auth';

const VENDURE_API_URL = process.env.VENDURE_SHOP_API_URL || process.env.NEXT_PUBLIC_VENDURE_SHOP_API_URL;
const VENDURE_CHANNEL_TOKEN = process.env.VENDURE_CHANNEL_TOKEN || process.env.NEXT_PUBLIC_VENDURE_CHANNEL_TOKEN || '__default_channel__';
const VENDURE_AUTH_TOKEN_HEADER = process.env.VENDURE_AUTH_TOKEN_HEADER || 'vendure-auth-token';
const VENDURE_CHANNEL_TOKEN_HEADER = process.env.VENDURE_CHANNEL_TOKEN_HEADER || 'vendure-token';


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
export async function query<TResult = any, TVariables = any>(
    document: TadaDocumentNode<TResult, TVariables> | any,
    variables?: TVariables | any,
    options?: VendureRequestOptions
): Promise<{ data: TResult; token?: string }> {
    if (!VENDURE_API_URL) {
        throw new Error('VENDURE_SHOP_API_URL or NEXT_PUBLIC_VENDURE_SHOP_API_URL environment variable is not set');
    }
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
    } else {
        headers[VENDURE_AUTH_TOKEN_HEADER] = ''; // Force Vendure to use Bearer token mode instead of cookies
    }

    // Set the channel token header (use provided channelToken or default)
    headers[VENDURE_CHANNEL_TOKEN_HEADER] = channelToken || VENDURE_CHANNEL_TOKEN;

    // Check for files in variables to determine if we need multipart/form-data
    const files: { file: File | Blob; variablePath: string }[] = [];

    const isFileOrBlob = (val: any): boolean => {
        if (!val || typeof val !== 'object') return false;
        if (typeof File !== 'undefined' && val instanceof File) return true;
        if (typeof Blob !== 'undefined' && val instanceof Blob) return true;
        // Duck-typing for Next.js / undici / node FormData file objects
        if (typeof val.arrayBuffer === 'function' && (val.name !== undefined || val.type !== undefined)) return true;
        return false;
    };

    const processVariables = (obj: any, path: string = 'variables'): any => {
        if (obj === null || obj === undefined) return obj;
        if (isFileOrBlob(obj)) {
            files.push({ file: obj, variablePath: path });
            return null;
        }
        if (Array.isArray(obj)) {
            return obj.map((item, index) => processVariables(item, `${path}.${index}`));
        }
        if (typeof obj === 'object') {
            const result: Record<string, any> = {};
            for (const key in obj) {
                if (Object.prototype.hasOwnProperty.call(obj, key)) {
                    result[key] = processVariables(obj[key], path ? `${path}.${key}` : key);
                }
            }
            return result;
        }
        return obj;
    };

    const processedVariables = variables ? processVariables(variables, 'variables') : variables;

    let body: any;

    if (files.length > 0) {
        const formData = new FormData();
        const operations = {
            query: typeof document === 'string' ? document : print(document),
            variables: processedVariables || {}
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
        delete headers['Content-Type']; // Let browser/fetch set boundary with multipart/form-data
    } else {
        body = JSON.stringify({
            query: typeof document === 'string' ? document : print(document),
            variables: variables || {},
        });
    }

    const controller = new AbortController();
    // 60s timeout for file uploads, 15s for normal API calls
    const timeoutMs = files.length > 0 ? 60000 : 15000;
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(VENDURE_API_URL!, {
            ...fetchOptions,
            method: 'POST',
            headers,
            body,
            cache: 'no-store', // Disable caching for all API requests to Vendure
            signal: controller.signal,
            ...(tags && { next: { tags } }),
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Fetch failed for URL: ${VENDURE_API_URL}. Request body:`, body);
            console.error(`Response: ${errorText}`);
            throw new Error(`HTTP error! status: ${response.status}. Body: ${errorText}`);
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
    } catch (e: any) {
        clearTimeout(timeoutId);
        if (e.name === 'AbortError') {
            throw new Error('Request to Vendure API timed out after 5 seconds');
        }
        throw e;
    }
}

/**
 * Execute a GraphQL mutation against the Vendure API
 */
export async function mutate<TResult = any, TVariables = any>(
    document: TadaDocumentNode<TResult, TVariables> | any,
    variables?: TVariables | any,
    options?: VendureRequestOptions
): Promise<{ data: TResult; token?: string }> {
    return query(document, variables, options);
}
