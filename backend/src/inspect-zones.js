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

        const zones = await client.query(`SELECT * FROM zone`);
        console.log('Available zones:', zones.rows);

        const channelZones = await client.query(`
             SELECT table_name FROM information_schema.tables 
             WHERE table_name LIKE '%zone%channel%'
        `);
        console.log('Zone-Channel junction tables:', channelZones.rows);

    } catch (err) {
        console.error('DATABASE ERROR:', err);
    } finally {
        await client.end();
        console.log('Connection closed.');
    }
}

run();
