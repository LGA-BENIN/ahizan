/**
 * In-memory & Persistent localStorage client cache with Stale-While-Revalidate
 * and request deduplicator for Vendure GraphQL requests.
 * Speeds up mobile 3G browsing and eliminates cold loading waterfalls.
 */

interface CacheEntry<T> {
    data: T;
    timestamp: number;
}

const memoryCache = new Map<string, CacheEntry<any>>();
const inFlightRequests = new Map<string, Promise<any>>();

// Default fresh TTL: 5 minutes (300,000 ms)
const DEFAULT_TTL_MS = 5 * 60 * 1000;
// Maximum stale allowed for instant display: 24 hours (86,400,000 ms)
const MAX_STALE_MS = 24 * 60 * 60 * 1000;

function getStorageKey(rawKey: string): string {
    let hash = 5381;
    for (let i = 0; i < rawKey.length; i++) {
        hash = ((hash << 5) + hash) + rawKey.charCodeAt(i);
        hash |= 0;
    }
    return `ahz_q_${Math.abs(hash)}`;
}

function getFromStorage<T>(key: string): { data: T; timestamp: number } | null {
    if (typeof window === 'undefined') return null;
    try {
        const item = localStorage.getItem(getStorageKey(key)) || sessionStorage.getItem(getStorageKey(key));
        if (!item) return null;
        const parsed = JSON.parse(item);
        if (parsed && parsed.timestamp && parsed.data !== undefined) {
            return parsed;
        }
    } catch {}
    return null;
}

function saveToStorage<T>(key: string, data: T): void {
    if (typeof window === 'undefined') return;
    try {
        const payload = JSON.stringify({
            data,
            timestamp: Date.now()
        });
        localStorage.setItem(getStorageKey(key), payload);
    } catch (e) {
        // If localStorage is full, fallback to sessionStorage
        try {
            sessionStorage.setItem(getStorageKey(key), JSON.stringify({ data, timestamp: Date.now() }));
        } catch {}
    }
}

async function executeFetch<T>(apiUrl: string, query: string, variables?: Record<string, any>, key?: string): Promise<T> {
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
        if (json.data && key) {
            memoryCache.set(key, { data: json.data, timestamp: Date.now() });
            saveToStorage(key, json.data);
        }
        return json.data;
    } finally {
        if (key) inFlightRequests.delete(key);
    }
}

function triggerBackgroundRevalidation(apiUrl: string, query: string, variables?: Record<string, any>, key?: string) {
    if (!key || inFlightRequests.has(key)) return;
    const req = executeFetch(apiUrl, query, variables, key).catch(() => null);
    inFlightRequests.set(key, req);
}

export async function fetchWithClientCache<T = any>(
    apiUrl: string,
    query: string,
    variables?: Record<string, any>,
    ttlMs: number = DEFAULT_TTL_MS
): Promise<T> {
    const key = `${apiUrl}:${query.replace(/\s+/g, ' ').trim()}:${JSON.stringify(variables || {})}`;
    const now = Date.now();

    // 1. Check in-memory fresh cache
    const mem = memoryCache.get(key);
    if (mem && (now - mem.timestamp < ttlMs)) {
        return mem.data;
    }

    // 2. Check persistent storage with Stale-While-Revalidate
    const stored = getFromStorage<T>(key);
    if (stored) {
        const age = now - stored.timestamp;
        memoryCache.set(key, stored);

        if (age < ttlMs) {
            // Fresh: return immediately
            return stored.data;
        } else if (age < MAX_STALE_MS) {
            // Stale: return immediately for 0ms rendering, refresh in background
            triggerBackgroundRevalidation(apiUrl, query, variables, key);
            return stored.data;
        }
    }

    // 3. Request deduplication: if identical query is currently in-flight, return the existing Promise
    if (inFlightRequests.has(key)) {
        return inFlightRequests.get(key) as Promise<T>;
    }

    // 4. Execute fetch and store in cache
    const requestPromise = executeFetch<T>(apiUrl, query, variables, key);
    inFlightRequests.set(key, requestPromise);
    return requestPromise;
}

export function clearClientCache() {
    memoryCache.clear();
    inFlightRequests.clear();
    if (typeof window !== 'undefined') {
        try {
            const keysToRemove: string[] = [];
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (k && k.startsWith('ahz_q_')) keysToRemove.push(k);
            }
            keysToRemove.forEach(k => localStorage.removeItem(k));
        } catch {}
    }
}
