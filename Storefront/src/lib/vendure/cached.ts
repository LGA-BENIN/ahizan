import {ResultOf} from '@/graphql';
import {query} from './api';
import {GetActiveChannelQuery, GetAvailableCountriesQuery, GetCollectionsTreeQuery} from './queries';

// Simple in-memory cache with TTL to avoid hammering the backend on every page hit
interface CacheEntry<T> {
    data: T;
    timestamp: number;
}

const memoryCache = new Map<string, CacheEntry<any>>();

async function withMemoryCache<T>(key: string, ttlMs: number, fetcher: () => Promise<T>): Promise<T> {
    const cached = memoryCache.get(key);
    const now = Date.now();
    if (cached && (now - cached.timestamp < ttlMs)) {
        return cached.data;
    }
    const freshData = await fetcher();
    memoryCache.set(key, { data: freshData, timestamp: now });
    return freshData;
}

/**
 * Get the active channel with caching enabled (TTL 5 minutes).
 */
export async function getActiveChannelCached() {
    return withMemoryCache('active_channel', 5 * 60 * 1000, async () => {
        const result = await query(GetActiveChannelQuery);
        return result.data.activeChannel;
    });
}

/**
 * Get available countries with caching enabled (TTL 1 hour).
 */
export async function getAvailableCountriesCached() {
    return withMemoryCache('available_countries', 60 * 60 * 1000, async () => {
        const result = await query(GetAvailableCountriesQuery);
        const countries = result.data.availableCountries || [];
        if (countries.length === 0) {
            return [{ code: 'BJ', name: 'Bénin' }];
        }
        return countries;
    });
}

/**
 * Get collection tree with caching enabled (TTL 60 seconds).
 * Eliminates redundant recursive collection queries on every page hit.
 */
export async function getTopCollections(): Promise<NonNullable<ResultOf<typeof GetCollectionsTreeQuery>['cmsCollectionsTree']>> {
    return withMemoryCache('top_collections_tree', 60 * 1000, async () => {
        const result = await query(GetCollectionsTreeQuery);
        return result.data.cmsCollectionsTree || [];
    });
}
