import { Injectable } from '@nestjs/common';
import { ID } from '@vendure/core';

export type FeedType = 'HOME_FEED' | 'SEARCH_FEED' | 'CATEGORY_FEED' | 'SELLER_FEED' | 'CHECKOUT_RECOMMENDATION';

@Injectable()
export class FeedAssemblyEngineService {
    /**
     * Générateur de flux universel réutilisable dans tous les cas d'usage.
     */
    async assembleFeed(feedType: FeedType, context: { userId?: ID; geoZoneId?: ID; query?: string; vendorId?: ID }) {
        return {
            feedType,
            sections: [],
            context
        };
    }
}
