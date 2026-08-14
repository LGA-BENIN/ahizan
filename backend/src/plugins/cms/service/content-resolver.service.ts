import { Injectable } from '@nestjs/common';
import { ID } from '@vendure/core';

export interface ResolvedProductCollection {
    experienceStrategy: string;
    title: string;
    items: any[];
    totalItems: number;
}

@Injectable()
export class ContentResolverService {
    /**
     * Traduit une intention d'expérience déclarative (experienceStrategy) en contenu résolu.
     */
    async resolveExperienceStrategy(strategy: string, config: any): Promise<ResolvedProductCollection> {
        // En Phase 3/4, déléguera aux moteurs Discovery & Feed Assembly
        return {
            experienceStrategy: strategy || 'CATALOG',
            title: config.title || 'Sélection pour vous',
            items: [],
            totalItems: 0
        };
    }
}
