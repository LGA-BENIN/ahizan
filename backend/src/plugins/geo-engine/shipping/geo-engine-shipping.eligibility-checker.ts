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
            const fullOrder = await orderService.findOne(ctx, order.id, ['customFields.vendor']);
            const vendorId = (fullOrder?.customFields as any).vendor?.id;
            if (!vendorId) {
                return false;
            }

            const result = await geoService.checkDeliveryEligibility(ctx, { lat, lng }, String(vendorId));
            return result.eligible;
        } catch (e) {
            console.error('[geoEngineShippingEligibilityChecker] Error checking eligibility:', e);
            return false;
        }
    },
});
