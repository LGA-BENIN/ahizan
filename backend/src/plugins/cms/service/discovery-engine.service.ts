import { Injectable } from '@nestjs/common';
import { ID } from '@vendure/core';

export interface DiscoveryCandidate {
    productId: ID;
    sourceStrategy: string;
    rawScore: number;
}

@Injectable()
export class DiscoveryEngineService {
    /**
     * Sélectionne les candidats produits selon la stratégie demandée.
     */
    async fetchCandidates(strategyName: string, context: { geoZoneId?: ID; userId?: ID }): Promise<DiscoveryCandidate[]> {
        // En Phase 4, implémente les stratégies: LocalDiscoveryStrategy, NewUserColdStartStrategy, ReturningUserStrategy, TrendingStrategy
        return [];
    }
}
