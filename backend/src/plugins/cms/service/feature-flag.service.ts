import { Injectable } from '@nestjs/common';
import { ID } from '@vendure/core';

export interface FeatureFlagContext {
    userId?: ID;
    geoZoneId?: ID;
    userEmail?: string;
}

@Injectable()
export class FeatureFlagService {
    private flags: Record<string, { enabled: boolean; percentage: number; allowedGeoZones?: string[] }> = {
        'ems_experience_engine': { enabled: true, percentage: 100 },
        'ems_feed_assembly': { enabled: true, percentage: 100 },
        'ems_ranking_engine': { enabled: true, percentage: 100 },
        'ems_event_bus': { enabled: true, percentage: 100 },
    };

    /**
     * Évalue si une fonctionnalité est activée pour un contexte donné (Rollout progressif).
     */
    async isEnabled(flagKey: string, context?: FeatureFlagContext): Promise<boolean> {
        const flag = this.flags[flagKey];
        if (!flag) return true; // Par défaut activé si non configuré
        if (!flag.enabled) return false;

        // Validation par GeoZone
        if (flag.allowedGeoZones && flag.allowedGeoZones.length > 0 && context?.geoZoneId) {
            if (!flag.allowedGeoZones.includes(String(context.geoZoneId))) {
                return false;
            }
        }

        // Validation par Pourcentage (Hash déterministe)
        if (flag.percentage < 100) {
            const seed = String(context?.userId || context?.geoZoneId || 'anonymous');
            const score = this.hashSeed(seed) % 100;
            return score < flag.percentage;
        }

        return true;
    }

    private hashSeed(str: string): number {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = (hash << 5) - hash + str.charCodeAt(i);
            hash |= 0;
        }
        return Math.abs(hash);
    }
}
