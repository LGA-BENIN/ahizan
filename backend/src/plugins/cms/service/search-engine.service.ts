import { Injectable } from '@nestjs/common';

@Injectable()
export class SearchEngineService {
    private localSynonyms: Record<string, string[]> = {
        'tchigan': ['gari', 'cassava', 'farinette'],
        'wax': ['pagne', 'tissu', 'textile'],
        'ananas': ['fruit', 'pain de sucre', 'allada'],
    };

    /**
     * Recherche textuelle et sémantique avec synonymes locaux béninois.
     */
    async search(queryText: string, options?: { geoZoneId?: string }) {
        const normalized = queryText.toLowerCase().trim();
        const expandedTerms = [normalized, ...(this.localSynonyms[normalized] || [])];

        return {
            query: queryText,
            expandedTerms,
            items: []
        };
    }
}
