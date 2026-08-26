import { LanguageCode, ShippingEligibilityChecker, Injector, OrderService } from '@vendure/core';
import { GeoService } from '../service/geo.service';

let geoService: GeoService | undefined;
let orderService: OrderService | undefined;

export const geoEngineShippingEligibilityChecker = new ShippingEligibilityChecker({
    code: 'geo-engine-shipping-eligibility-checker',
    description: [
        { languageCode: LanguageCode.en, value: 'Check eligibility based on GeoEngine zones and distance' },
        { languageCode: LanguageCode.fr, value: 'Vérifier l\'éligibilité selon les zones et la distance GeoEngine' },
    ],
    args: {},
    init(injector: Injector) {
        geoService = injector.get(GeoService);
        orderService = injector.get(OrderService);
    },
    check: async (ctx, order, args) => {
        if (!geoService || !orderService) return false;

        const shippingAddress = order.shippingAddress;
        const lat = shippingAddress?.customFields?.latitude;
        const lng = shippingAddress?.customFields?.longitude;

        if (lat == null || lng == null) {
            return false;
        }

        try {
            const vendorIds = new Set<string>();
            const connection = (geoService as any).connection;

            if (connection && connection.rawConnection) {
                const rawVendors = await connection.rawConnection.query(`
                    SELECT DISTINCT COALESCE(ol."customFieldsAssignedvendorid", p."customFieldsVendorid") as "vendorId"
                    FROM order_line ol
                    JOIN product_variant pv ON ol."productVariantId" = pv.id
                    JOIN product p ON pv."productId" = p.id
                    WHERE ol."orderId" = $1 AND (p."customFieldsVendorid" IS NOT NULL OR ol."customFieldsAssignedvendorid" IS NOT NULL)
                `, [order.id]);

                if (rawVendors && rawVendors.length > 0) {
                    for (const row of rawVendors) {
                        if (row.vendorId) {
                            vendorIds.add(String(row.vendorId));
                        }
                    }
                }

                const rawOrderVendor = await connection.rawConnection.query(`
                    SELECT "customFieldsVendorid" as "vendorId" FROM "order" WHERE id = $1 LIMIT 1
                `, [order.id]);
                if (rawOrderVendor && rawOrderVendor[0] && rawOrderVendor[0].vendorId) {
                    vendorIds.add(String(rawOrderVendor[0].vendorId));
                }
            }

            if (vendorIds.size === 0 && connection && connection.rawConnection) {
                const fallbackVendors = await connection.rawConnection.query(`SELECT id FROM vendor LIMIT 1`);
                if (fallbackVendors && fallbackVendors[0]) {
                    vendorIds.add(String(fallbackVendors[0].id));
                } else {
                    return false;
                }
            }

            for (const vId of Array.from(vendorIds)) {
                const result = await geoService.checkDeliveryEligibility(ctx, { lat, lng }, vId);
                if (!result.eligible) {
                    return false;
                }
            }

            return true;
        } catch (e) {
            console.error('[geoEngineShippingEligibilityChecker] Error checking eligibility:', e);
            return false;
        }
    },
});
