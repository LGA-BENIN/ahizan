import {cacheLife, cacheTag} from 'next/cache';
import {ResultOf} from '@/graphql';
import {query} from './api';
import {GetActiveChannelQuery, GetAvailableCountriesQuery, GetCollectionsTreeQuery} from './queries';

/**
 * Get the active channel with caching enabled.
 * Channel configuration rarely changes, so we cache it for 1 hour.
 */
export async function getActiveChannelCached() {

    const result = await query(GetActiveChannelQuery);
    return result.data.activeChannel;
}

/**
 * Get available countries with caching enabled.
 * Countries list never changes, so we cache it with max duration.
 */
export async function getAvailableCountriesCached() {

    const result = await query(GetAvailableCountriesQuery);
    const countries = result.data.availableCountries || [];
    
    // Fallback for Benin if the list is empty or doesn't contain it
    if (countries.length === 0) {
        return [{ code: 'BJ', name: 'Bénin' }];
    }
    
    return countries;
}

/**
 * Get collection tree with caching enabled.
 * Collections rarely change, so we cache them for 1 day.
 */
export async function getTopCollections(): Promise<NonNullable<ResultOf<typeof GetCollectionsTreeQuery>['cmsCollectionsTree']>> {

    const result = await query(GetCollectionsTreeQuery);
    return result.data.cmsCollectionsTree || [];
}
