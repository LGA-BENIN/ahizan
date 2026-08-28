import { Injectable } from '@nestjs/common';
import { ID } from '@vendure/core';

export interface ExperienceContext {
    geoZoneCode?: string;
    marketId?: ID;
    userId?: ID;
    currentTime?: string; // Format HH:mm
    userSegment?: 'NEW_USER' | 'RETURNING_BUYER' | 'VENDOR';
}

@Injectable()
export class ExperienceEngineService {
    /**
     * Évalue les règles contextuelles définies sur une section CMS.
     * Exemple de rulesJson: { "geoZones": ["COTONOU"], "timeRange": { "start": "18:00", "end": "22:00" } }
     */
    evaluateRules(rulesJson: string | null | undefined, context: ExperienceContext): boolean {
        if (!rulesJson || rulesJson.trim() === '') return true;

        try {
            const rules = JSON.parse(rulesJson);

            // 1. Filtrage par GeoZone
            if (rules.geoZones && Array.isArray(rules.geoZones) && rules.geoZones.length > 0) {
                if (!context.geoZoneCode || !rules.geoZones.includes(context.geoZoneCode)) {
                    return false;
                }
            }

            // 2. Filtrage par plage horaire
            if (rules.timeRange?.start && rules.timeRange?.end) {
                const now = context.currentTime || new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                if (now < rules.timeRange.start || now > rules.timeRange.end) {
                    return false;
                }
            }

            // 3. Filtrage par segment client
            if (rules.userSegment && rules.userSegment !== 'ALL') {
                if (context.userSegment && context.userSegment !== rules.userSegment) {
                    return false;
                }
            }

            return true;
        } catch (err) {
            console.error('[ExperienceEngineService] Error parsing rulesJson:', err);
            return true;
        }
    }
}
