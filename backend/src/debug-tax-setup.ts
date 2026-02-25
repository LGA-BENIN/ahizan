const { Client } = require('pg');
require('dotenv').config();

async function checkTaxSetup() {
    const client = new Client({
        host: process.env.DB_HOST || '127.0.0.1',
        port: +(process.env.DB_PORT || 5432),
        user: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'vendure',
    });

    try {
        await client.connect();
        console.log('--- DATABASE DIAGNOSTICS ---');

        // 1. Check Channel
        const resChannel = await client.query(`
            SELECT id, code, "defaultTaxZoneId", "defaultShippingZoneId" 
            FROM channel 
            WHERE code = '__default_channel__'
        `);
        console.log('Default Channel:', resChannel.rows[0]);

        // 2. Check Zones
        const resZones = await client.query(`SELECT id, name FROM zone`);
        console.log('Zones:', resZones.rows);

        // 3. Check Tax Categories
        const resTaxCat = await client.query(`SELECT id, name, "isDefault" FROM tax_category`);
        console.log('Tax Categories:', resTaxCat.rows);

        // 4. Check Tax Rates
        const resTaxRates = await client.query(`
            SELECT tr.id, tr.name, tr.value, tc.name as category, z.name as zone
            FROM tax_rate tr
            LEFT JOIN tax_category tc ON tr."categoryId" = tc.id
            LEFT JOIN zone z ON tr."zoneId" = z.id
        `);
        console.log('Tax Rates:', resTaxRates.rows);

        // 5. Check if some variants are missing tax categories
        const resVariants = await client.query(`
            SELECT count(*) as count 
            FROM product_variant 
            WHERE "taxCategoryId" IS NULL
        `);
        console.log('Variants missing taxCategoryId:', resVariants.rows[0].count);

    } catch (err) {
        console.error('DIAGNOSTIC ERROR:', err);
    } finally {
        await client.end();
    }
}

checkTaxSetup();
bau
