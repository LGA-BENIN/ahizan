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

        // Get columns of product table
        const res = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'product'
        `);
        console.log('--- columns of product table ---');
        res.rows.forEach(row => {
            console.log(`${row.column_name} (${row.data_type})`);
        });

        // Also check if any products have vendor linked
        const res2 = await client.query(`
            SELECT id, name, "customFieldsVendorid" FROM product LIMIT 5
        `);
        console.log('--- sample product rows ---');
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
