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

        // 1. Check enabled status
        const pRes = await client.query('SELECT enabled FROM product WHERE id = $1', [productId]);
        console.log('Product enabled status:', pRes.rows[0].enabled);

        // 2. Check channel assignment
        const pcRes = await client.query('SELECT * FROM product_channels_channel WHERE "productId" = $1', [productId]);
        console.log('Product channel assignments:', pcRes.rows);

        // 3. Check for "popups" page
        const pageRes = await client.query('SELECT id, slug, "isActive" FROM page WHERE slug = $1', ['popups']);
        console.log('Popups page search result:', pageRes.rows);

        // 4. Check for "home" page
        const homeRes = await client.query('SELECT id, slug, "isActive" FROM page WHERE slug = $1', ['home']);
        console.log('Home page search result:', homeRes.rows);

    } catch (err) {
        console.error('DATABASE ERROR:', err);
    } finally {
        await client.end();
        console.log('Connection closed.');
    }
}

run();
