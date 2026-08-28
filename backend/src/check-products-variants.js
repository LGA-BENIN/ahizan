const { Client } = require('pg');
require('dotenv').config();

async function run() {
    const client = new Client({
        host: process.env.DB_HOST || '127.0.0.1',
        port: +(process.env.DB_PORT || 5432),
        user: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'vendure',
    });

    try {
        await client.connect();
        console.log('Connected to DB');

        // Count Products
        const prodCount = await client.query('SELECT COUNT(*) FROM product');
        console.log('Total Products:', prodCount.rows[0].count);

        // Count Variants
        const varCount = await client.query('SELECT COUNT(*) FROM product_variant');
        console.log('Total Product Variants:', varCount.rows[0].count);

        // Products without variants
        const noVarProds = await client.query(`
            SELECT p.id, pt.name 
            FROM product p
            LEFT JOIN product_translation pt ON pt."baseId" = p.id
            LEFT JOIN product_variant pv ON pv."productId" = p.id
            WHERE pv.id IS NULL
        `);
        console.log('Products without variants:', noVarProds.rows);

        // Check channel assignments for products
        const prodChannel = await client.query('SELECT COUNT(*) FROM product_channels_channel');
        console.log('Total Product-Channel mappings:', prodChannel.rows[0].count);

        // Check channel assignments for variants
        const varChannel = await client.query('SELECT COUNT(*) FROM product_variant_channels_channel');
        console.log('Total Variant-Channel mappings:', varChannel.rows[0].count);

        // Check details of products and variants
        const details = await client.query(`
            SELECT p.id as prod_id, pt.name as prod_name, pv.id as var_id, pv.sku as var_sku
            FROM product p
            LEFT JOIN product_translation pt ON pt."baseId" = p.id AND pt."languageCode" = 'fr'
            LEFT JOIN product_variant pv ON pv."productId" = p.id
            LIMIT 10
        `);
        console.log('Sample Products & Variants:');
        console.table(details.rows);

    } catch (err) {
        console.error('DATABASE ERROR:', err);
    } finally {
        await client.end();
        console.log('Connection closed.');
    }
}

run();
