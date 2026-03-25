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

        const res = await client.query('SELECT * FROM product WHERE slug = $1', ['hahahaproductokay']);
        console.log('Product search result:', res.rows);

        if (res.rows.length === 0) {
            console.log('Searching for any products...');
            const allRes = await client.query('SELECT name, slug FROM product LIMIT 5');
            console.table(allRes.rows);
        }

    } catch (err) {
        console.error('DATABASE ERROR:', err);
    } finally {
        await client.end();
        console.log('Connection closed.');
    }
}

run();
