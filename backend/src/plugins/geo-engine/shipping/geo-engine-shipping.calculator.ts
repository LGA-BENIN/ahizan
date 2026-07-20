import { LanguageCode, ShippingCalculator, Injector, OrderService } from '@vendure/core';
import { GeoService } from '../service/geo.service';

let geoService: GeoService | undefined;
let orderService: OrderService | undefined;

export const geoEngineShippingCalculator = new ShippingCalculator({
    code: 'geo-engine-shipping-calculator',
    description: [
        { languageCode: LanguageCode.en, value: 'Dynamic GeoEngine Delivery Cost' },
        { languageCode: LanguageCode.fr, value: 'Frais de livraison dynamique GeoEngine' },
    ],
    args: {},
    init(injector: Injector) {
        geoService = injector.get(GeoService);
        orderService = injector.get(OrderService);
    },
    calculate: async (ctx, order, args) => {
        if (!geoService || !orderService) {
            return {
                price: 0,
                priceIncludesTax: false,
                taxRate: 0,
                priceWithTax: 0,
            };
        }

        let lat = order.shippingAddress?.customFields?.latitude;
        let lng = order.shippingAddress?.customFields?.longitude;

        // Try geocoding or city-level resolution if coordinates are missing
        if (lat == null || lng == null) {
            const shippingAddress = order.shippingAddress;
            const addressString = [shippingAddress?.streetLine1, shippingAddress?.city, shippingAddress?.country].filter(Boolean).join(', ');
            if (addressString && geoService.geocode) {
                try {
                    const geocoded = await geoService.geocode(ctx, addressString);
                    if (geocoded) {
                        lat = geocoded.lat;
                        lng = geocoded.lng;
                    }
                } catch (e) {
                    console.error('[geoEngineShippingCalculator] Geocode fallback failed:', e);
                }
            }
            if (lat == null || lng == null) {
                const city = (order.shippingAddress?.city || '').toLowerCase();
                if (city.includes('cotonou')) { lat = 6.3654; lng = 2.4183; }
                else if (city.includes('porto') || city.includes('novo')) { lat = 6.4969; lng = 2.6289; }
                else if (city.includes('parakou')) { lat = 9.3371; lng = 2.6303; }
                else if (city.includes('calavi') || city.includes('abomey')) { lat = 6.4485; lng = 2.3556; }
                else if (city.includes('ouidah')) { lat = 6.3631; lng = 2.0851; }
                else if (city.includes('bohicon')) { lat = 7.1783; lng = 2.0667; }
                else { lat = 6.3654; lng = 2.4183; } // Default Cotonou center
            }
        }

        // Fetch platform settings baseFee to guarantee no 0 FCFA shipping by mistake
        let baseFee = 500;
        try {
            const connection = (geoService as any).connection;
            if (connection && connection.rawConnection) {
                const settings = await connection.rawConnection.query(`SELECT "deliveryBaseFee" FROM platform_settings WHERE id = 'platform_settings' LIMIT 1`);
                if (settings && settings[0] && settings[0].deliveryBaseFee != null) {
                    baseFee = Number(settings[0].deliveryBaseFee);
                }
            }
        } catch (err) {
            // Use fallback 500
        }

        try {
            let vendorId = (order.customFields as any)?.vendor?.id || (order.customFields as any)?.vendorId;
            if (!vendorId) {
                const fullOrder = await orderService.findOne(ctx, order.id, ['customFields.vendor']);
                vendorId = (fullOrder?.customFields as any)?.vendor?.id || (fullOrder?.customFields as any)?.vendorId;
            }
            if (!vendorId) {
                try {
                    const connection = (geoService as any).connection;
                    if (connection && connection.rawConnection && order.id) {
                        const rawOrder = await connection.rawConnection.query(`SELECT "customFieldsVendorid", "customFieldsVendorId" FROM "order" WHERE id = $1 LIMIT 1`, [order.id]);
                        if (rawOrder && rawOrder[0]) {
                            vendorId = rawOrder[0].customFieldsVendorid || rawOrder[0].customFieldsVendorId;
                        }
                    }
                } catch (e) {
                    console.error('[geoEngineShippingCalculator] Raw vendor fallback failed:', e);
                }
            }
            if (!vendorId) {
                return {
                    price: baseFee,
                    priceIncludesTax: false,
                    taxRate: 0,
                    priceWithTax: baseFee,
                };
            }

            const result = await geoService.checkDeliveryEligibility(ctx, { lat, lng }, String(vendorId));
            const finalPrice = Math.max(result.fee, baseFee);
            return {
                price: finalPrice,
                priceIncludesTax: false,
                taxRate: 0,
                priceWithTax: finalPrice,
            };
        } catch (e) {
            console.error('[geoEngineShippingCalculator] Error calculating delivery cost:', e);
            return {
                price: baseFee,
                priceIncludesTax: false,
                taxRate: 0,
                priceWithTax: baseFee,
            };
        }
    },
});
