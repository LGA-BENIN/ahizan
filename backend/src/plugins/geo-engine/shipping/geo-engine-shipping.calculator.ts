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

            // If no explicit vendor ID on products, fetch the first vendor in database to calculate distance
            if (vendorIds.size === 0 && connection && connection.rawConnection) {
                const fallbackVendors = await connection.rawConnection.query(`SELECT id FROM vendor LIMIT 5`);
                if (fallbackVendors && fallbackVendors.length > 0) {
                    for (const fv of fallbackVendors) {
                        vendorIds.add(String(fv.id));
                    }
                }
            }

            // Calculate delivery cost for each seller using GeoEngine resolveCoordinates (Single Source of Truth)
            const currentLocation = await geoService.resolveCoordinates(ctx, lat, lng);
            let maxFee = currentLocation.deliveryZonePrice || 0;

            for (const vId of Array.from(vendorIds)) {
                try {
                    const result = await geoService.checkDeliveryEligibility(ctx, { lat, lng }, vId);
                    if (result && typeof result.fee === 'number') {
                        maxFee = Math.max(maxFee, result.fee);
                    }
                } catch (e) {
                    console.error(`[geoEngineShippingCalculator] Eligibility check failed for vendor ${vId}:`, e);
                }
            }

            let finalPrice = maxFee;
            if (geoService.getMatchingZonePrices) {
                const zonePrices = await geoService.getMatchingZonePrices(ctx, { lat, lng });
                const maxCap = zonePrices?.maxPrice ?? null;
                if (maxCap != null && maxCap > 0) {
                    finalPrice = Math.min(finalPrice, maxCap);
                }
            }

            // Enforce base price floor: delivery cost must never go below baseFee
            finalPrice = Math.max(finalPrice, baseFee);

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
