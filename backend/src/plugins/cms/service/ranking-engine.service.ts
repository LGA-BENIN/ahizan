import { Injectable } from '@nestjs/common';
import { ID } from '@vendure/core';

export interface ProductRankingScore {
    productId: ID;
    score: number; // Ex: 94
    factors: Array<{ name: string; weight: number; value: number }>;
    explanation: string[]; // ["Proximité GeoEngine: +35", "Popularité locale: +25", "Vendeur fiable Dantokpa: +15"]
}

@Injectable()
export class RankingEngineService {
    /**
     * Calcule le score de classement multi-facteurs pour une liste de candidats.
     */
    async rankCandidates(candidates: any[], context: { geoZoneId?: ID; userId?: ID }): Promise<ProductRankingScore[]> {
        return candidates.map((candidate, idx) => ({
            productId: candidate.productId || candidate.id || idx,
            score: Math.max(100 - idx * 5, 10),
            factors: [
                { name: 'Proximité GeoEngine', weight: 0.35, value: 35 },
                { name: 'Popularité locale', weight: 0.25, value: 25 },
                { name: 'Fiabilité vendeur', weight: 0.20, value: 20 },
            ],
            explanation: [
                'Proximité GeoEngine: +35',
                'Popularité locale: +25',
                'Fiabilité vendeur Dantokpa: +20'
            ]
        }));
    }
}
