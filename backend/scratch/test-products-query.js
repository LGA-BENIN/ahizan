const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: +(process.env.DB_PORT || 5432),
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'ahizan_local',
});

(async () => {
    try {
        await client.connect();
        console.log('Connected to DB');

        // Let's count products grouped by vendor ID
        const res = await client.query(`
            SELECT "customFieldsVendorid", COUNT(*) 
            FROM product 
            WHERE "deletedAt" IS NULL
            GROUP BY "customFieldsVendorid"
        `);
        console.log('--- products count by customFieldsVendorid ---');
        res.rows.forEach(row => {
            console.log(`vendorId: ${row.customFieldsVendorid} | count: ${row.count}`);
        });

        // Let's select one product translation to see what language code is used
        const res2 = await client.query(`
            SELECT * FROM product_translation LIMIT 2
        `);
        console.log('--- product translations ---');
        res2.rows.forEach(row => {
            console.log(row);
        });

        await client.end();
    } catch (e) {
        console.error('ERROR:', e.message);
        await client.end().catch(() => {});
        process.exit(1);
    }
})();
