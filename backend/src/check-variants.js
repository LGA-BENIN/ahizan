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

        const productId = 54;

        // 1. Check variants
        const vRes = await client.query('SELECT id, enabled FROM product_variant WHERE "productId" = $1', [productId]);
        console.log('Product variants:', vRes.rows);

        // 2. Check variant channel assignments
        const vcRes = await client.query('SELECT * FROM product_variant_channels_channel WHERE "productVariantId" IN (SELECT id FROM product_variant WHERE "productId" = $1)', [productId]);
        console.log('Product variant channel assignments:', vcRes.rows);

    } catch (err) {
        console.error('DATABASE ERROR:', err);
    } finally {
        await client.end();
        console.log('Connection closed.');
    }
}

run();
