import { bootstrap } from '@vendure/core';
import { VendureConfig } from '@vendure/core';
import { config } from './vendure-config';
import { GeoService } from './plugins/geo-engine/service/geo.service';
import { RequestContext } from '@vendure/core';

async function run() {
    const testConfig = {
        ...config,
        apiOptions: {
            ...(config as any).apiOptions,
            port: 3999,
        },
    };
    const app = await bootstrap(testConfig as VendureConfig);
    const geoService = app.get(GeoService);

    // Create RequestContext
    const ctx = new RequestContext({
        channel: await app.get(require('@vendure/core').ChannelService).getDefaultChannel(),
        apiType: 'admin',
        isAuthorized: true,
        authorizedAsOwnerOnly: false,
    });

    console.log('\n--- 1. TESTING GEOTEXT SEARCH (NOMINATIM CLIENT) ---');
    try {
        const coords = await geoService.geocode(ctx, 'Fidjrosse, Cotonou');
        console.log('Geocoding result for "Fidjrosse, Cotonou":', coords);
        if (coords.lat !== 6.3654 && coords.lng !== 2.4183) {
            console.log('✅ Real Nominatim geocoding working!');
        } else {
            console.log('⚠️ Fell back to default coords, check network or query.');
        }
    } catch (e) {
        console.error('❌ Geocoding failed:', e);
    }

    console.log('\n--- 2. TESTING ADMINISTRATIVE HIERARCHY ---');
    try {
        const zones = await geoService.reverseGeocode(ctx, 6.3654, 2.4183);
        console.log(`Found ${zones.length} administrative zones containing coordinate (6.3654, 2.4183)`);
        for (const zone of zones) {
            console.log(` - Zone ID ${zone.id}: [${zone.type}] ${zone.name} (status: ${zone.status})`);
        }
        if (zones.length > 0) {
            console.log('✅ Reverse geocoding containment check working!');
        }
    } catch (e) {
        console.error('❌ Reverse geocoding failed:', e);
    }

    console.log('\n--- 3. TESTING DISTANCE CALCULATION ---');
    try {
        const p1 = { lat: 6.3654, lng: 2.4183 }; // Cotonou
        const p2 = { lat: 6.4969, lng: 2.6288 }; // Porto-Novo
        const dist = await geoService.calculateDistance(ctx, p1, p2);
        console.log(`Distance between Cotonou and Porto-Novo: ${(dist / 1000).toFixed(2)} km`);
        if (dist > 20000 && dist < 40000) {
            console.log('✅ Geodesic distance calculation is accurate!');
        } else {
            console.log('❌ Distance calculation is incorrect.');
        }
    } catch (e) {
        console.error('❌ Distance calculation failed:', e);
    }

    console.log('\n--- 4. TESTING DELIVERY ELIGIBILITY ---');
    try {
        const clientGpsLocal = { lat: 6.3654, lng: 2.4183 };
        const clientGpsFar = { lat: 6.4969, lng: 2.6288 };
        
        const local = await geoService.checkDeliveryEligibility(ctx, clientGpsLocal, '24');
        const far = await geoService.checkDeliveryEligibility(ctx, clientGpsFar, '24');
        
        console.log('Local delivery eligibility (same spot):', local);
        console.log('Far delivery eligibility (Porto-Novo):', far);
        
        if ((local.fee === 500 || local.fee === 1000) && far.fee === 3245) {
            console.log('✅ Dynamic kilometric delivery fee calculator and flat-rate zones are highly accurate!');
        } else {
            console.log(`❌ Dynamic fee calculation mismatch. Local: ${local.fee}, Far: ${far.fee}`);
        }
    } catch (e) {
        console.error('❌ Delivery eligibility test failed:', e);
    }

    console.log('\nGeoEngine tests finished.');
    await app.close();
    process.exit(0);
}

run().catch(err => {
    console.error(err);
    process.exit(1);
});
