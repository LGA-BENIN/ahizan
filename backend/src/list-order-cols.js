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
        const res = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'order'
            ORDER BY column_name
        `);
        console.log('All Order columns:', res.rows.map(r => r.column_name));

    } catch (err) {
        console.error('DATABASE ERROR:', err);
    } finally {
        await client.end();
    }
}

run();
