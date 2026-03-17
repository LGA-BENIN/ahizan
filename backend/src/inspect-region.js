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

        const res = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'region'
        `);
        console.log('Region columns:', res.rows);

        const beninRes = await client.query(`SELECT * FROM region WHERE code = 'BJ'`);
        console.log('Benin in region table:', beninRes.rows);

        const translationsRes = await client.query(`
            SELECT rt.* 
            FROM region_translation rt 
            JOIN region r ON rt."baseId" = r.id 
            WHERE r.code = 'BJ'
        `);
        console.log('Benin translations:', translationsRes.rows);

    } catch (err) {
        console.error('DATABASE ERROR:', err);
    } finally {
        await client.end();
        console.log('Connection closed.');
    }
}

run();
