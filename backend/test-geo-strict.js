const { bootstrap } = require('@vendure/core');
const path = require('path');

async function verifyStrictGeo() {
    try {
        const { config } = require('./dist/vendure-config.js');
        const app = await bootstrap(config);
        const geoService = app.get('GeoService');
        const connection = app.get('TransactionalConnection');
        const { RequestContext, Channel } = require('@vendure/core');
        
        // Create a dummy RequestContext
        const channel = await connection.getRepository(Channel).findOne({ where: { code: '__default_channel__' } });
        const ctx = new RequestContext({
            channel,
            apiType: 'admin',
            isAuthorized: true,
            authorizedAsOwnerOnly: false,
        });

        console.log('--- Testing CheckDeliveryEligibility (with Cotonou center customer) ---');
        // Let's test with a nonexistent vendor or missing coordinates to verify fallback and minimum base fee
        const result1 = await geoService.checkDeliveryEligibility(ctx, { lat: 6.3654, lng: 2.4183 }, '99999');
        console.log('Result for non-existent vendor id 99999 (should fallback to baseFee):', result1);

        await app.close();
        process.exit(0);
    } catch (err) {
        console.error('Test error:', err);
        process.exit(1);
    }
}

verifyStrictGeo();
