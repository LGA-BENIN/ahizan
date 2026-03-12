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

        // 1. Fix the shipping method price
        console.log('Updating shipping method price to 0...');
        const res = await client.query(`
            UPDATE shipping_method 
            SET calculator = '{"code":"global-fixed-shipping","args":[{"name":"price","value":"0"}]}'
            WHERE id = 1
        `);
        console.log('Update result:', res.rowCount);

        // 2. Clear caches if needed (Vendure usually detects DB changes if not using heavy external caching, 
        // but here we just need the backend to pick it up on next request).
        
        console.log('SUCCESS: Shipping method price fixed.');

    } catch (err) {
        console.error('DATABASE ERROR:', err);
    } finally {
        await client.end();
        console.log('Connection closed.');
    }
}

run();
