/**
 * In-memory client cache and request deduplicator for Vendure GraphQL requests.
 * Speeds up client-side rendering and makes back-and-forth navigation instantaneous.
 */

interface CacheEntry<T> {
    data: T;
    timestamp: number;
}

const memoryCache = new Map<string, CacheEntry<any>>();
const inFlightRequests = new Map<string, Promise<any>>();

// Default TTL: 3 minutes (180,000 ms)
const DEFAULT_TTL_MS = 3 * 60 * 1000;

function getStorageKey(rawKey: string): string {
    // Generate a short, safe key
    let hash = 0;
    for (let i = 0; i < rawKey.length; i++) {
        hash = ((hash << 5) - hash) + rawKey.charCodeAt(i);
        hash |= 0;
    }
    return `ahz_q_${hash}`;
}

function getFromSessionStorage<T>(key: string, ttlMs: number): T | null {
    if (typeof window === 'undefined') return null;
    try {
        const item = sessionStorage.getItem(getStorageKey(key));
        if (!item) return null;
        const parsed = JSON.parse(item);
        if (Date.now() - parsed.timestamp < ttlMs) {
            return parsed.data;
        }
        sessionStorage.removeItem(getStorageKey(key));
    } catch {}
    return null;
}

function saveToSessionStorage<T>(key: string, data: T): void {
    if (typeof window === 'undefined') return;
    try {
        sessionStorage.setItem(getStorageKey(key), JSON.stringify({
            data,
            timestamp: Date.now()
        }));
    } catch {}
}

export async function fetchWithClientCache<T = any>(
    apiUrl: string,
    query: string,
    variables?: Record<string, any>,
    ttlMs: number = DEFAULT_TTL_MS
): Promise<T> {
    const key = `${apiUrl}:${query.replace(/\s+/g, ' ').trim()}:${JSON.stringify(variables || {})}`;
    const now = Date.now();

    // 1. Check in-memory cache
    const cached = memoryCache.get(key);
    if (cached && now - cached.timestamp < ttlMs) {
        return cached.data;
    }

    // 2. Check session storage cache
    const sessionData = getFromSessionStorage<T>(key, ttlMs);
    if (sessionData) {
        memoryCache.set(key, { data: sessionData, timestamp: now });
        return sessionData;
    }

    // 3. Request deduplication: if identical query is currently in-flight, return the existing Promise
    if (inFlightRequests.has(key)) {
        return inFlightRequests.get(key) as Promise<T>;
    }

    // 4. Execute fetch and store in cache
    const requestPromise = (async () => {
        try {
            const res = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query, variables }),
            });

            if (!res.ok) {
                throw new Error(`GraphQL fetch failed with status ${res.status}`);
            }

            const json = await res.json();
            if (json.data) {
                memoryCache.set(key, {
                    data: json.data,
                    timestamp: Date.now(),
                });
                saveToSessionStorage(key, json.data);
            }
            return json.data;
        } finally {
            inFlightRequests.delete(key);
        }
    })();

    inFlightRequests.set(key, requestPromise);
    return requestPromise;
}

export function clearClientCache() {
    memoryCache.clear();
    inFlightRequests.clear();
}
