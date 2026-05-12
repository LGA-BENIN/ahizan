import {cacheLife, cacheTag} from 'next/cache';
import {query} from './api';
import {GetActiveChannelQuery, GetAvailableCountriesQuery, GetCollectionsTreeQuery} from './queries';

/**
 * Get the active channel with caching enabled.
 * Channel configuration rarely changes, so we cache it for 1 hour.
 */
export async function getActiveChannelCached() {
    'use cache';
    cacheLife('hours');

    try {
        const result = await query(GetActiveChannelQuery);
        return result.data.activeChannel as any;
    } catch (e) {
        console.warn('[getActiveChannelCached] Backend unavailable, returning default channel');
        return { id: 'default', code: 'default-channel', currencyCode: 'XOF' };
    }
}

/**
 * Get available countries with caching enabled.
 * Countries list never changes, so we cache it with max duration.
 */
export async function getAvailableCountriesCached() {
    'use cache';
    cacheLife('max');
    cacheTag('countries');

    try {
        const result = await query(GetAvailableCountriesQuery);
        const countries = (result.data.availableCountries as any[]) || [];
        
        // Fallback for Benin if the list is empty or doesn't contain it
        if (countries.length === 0) {
            return [{ id: 'BJ', code: 'BJ', name: 'Bénin' }];
        }
        
        return countries;
    } catch (e) {
        console.warn('[getAvailableCountriesCached] Backend unavailable, returning default country');
        return [{ id: 'BJ', code: 'BJ', name: 'Bénin' }];
    }
}

/**
 * Get collection tree with caching enabled.
 * Collections rarely change, so we cache them for 1 day.
 */
export async function getTopCollections(): Promise<any[]> {
    'use cache';
    cacheLife('days');
    cacheTag('collections');

    try {
        const result = await query(GetCollectionsTreeQuery);
        return (result.data.cmsCollectionsTree as any[]) || [];
    } catch (e) {
        console.warn('[getTopCollections] Backend unavailable, returning empty collections');
        return [];
    }
}
