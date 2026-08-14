import { Injectable } from '@nestjs/common';
import { ID } from '@vendure/core';

export interface MerchandisingRule {
    boostFactor?: number;
    isSponsored?: boolean;
    certifiedVendorOnly?: boolean;
    maxItemsPerVendor?: number;
}

@Injectable()
export class MerchandisingEngineService {
    /**
     * Applique les règles commerciales (produits sponsorisés, boosts vendeurs, quotas par marché).
     */
    async applyMerchandisingRules(rankedProducts: any[], context: { marketId?: ID; geoZoneId?: ID }, rules?: MerchandisingRule) {
        if (!rankedProducts || rankedProducts.length === 0) return [];

        const maxPerVendor = rules?.maxItemsPerVendor || 3;
        const vendorCounts: Record<string, number> = {};

        // 1. Appliquer les quotas de visibilité par vendeur pour diversifier le catalogue
        const diversified = rankedProducts.filter(item => {
            const vendorId = String(item.vendorId || item.vendor?.id || 'default');
            const currentCount = vendorCounts[vendorId] || 0;
            if (currentCount >= maxPerVendor) {
                return false;
            }
            vendorCounts[vendorId] = currentCount + 1;
            return true;
        });

        // 2. Traitement des boosts pour vendeurs certifiés ou produits sponsorisés
        if (rules?.boostFactor) {
            diversified.forEach(item => {
                if (item.score) {
                    item.score = item.score * (rules.boostFactor || 1.1);
                }
            });
        }

        return diversified;
    }
}
