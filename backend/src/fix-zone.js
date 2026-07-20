const { Client } = require('pg');
require('dotenv').config();

async function run() {
    console.log('Script started');
    const client = new Client({
        host: process.env.DB_HOST || '127.0.0.1',
        port: +(process.env.DB_PORT || 5432),
        user: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'vendure',
        connectionTimeoutMillis: 5000,
    });

    try {
        console.log('Connecting to DB...');
        await client.connect();
        console.log('Connected to DB');

        // 1. Add Benin (ID 2) to Global zone (ID 1)
        console.log('Inserting into zone_members_region...');
        const res = await client.query('INSERT INTO zone_members_region ("zoneId", "regionId") VALUES (1, 2) ON CONFLICT DO NOTHING');
        console.log('ZMR Insert result:', res.rowCount);

        // 2. Assign to Channel
        console.log('Checking channel assignment...');
        const zcTable = await client.query(`
            SELECT table_name FROM information_schema.tables 
            WHERE table_name = 'zone_channels_channel'
        `);
        
        if (zcTable.rows.length > 0) {
            const zcRes = await client.query('INSERT INTO zone_channels_channel ("zoneId", "channelId") VALUES (1, 1) ON CONFLICT DO NOTHING');
            console.log('ZCC Insert result:', zcRes.rowCount);
        } else {
            console.log('zone_channels_channel table not found.');
        }

        console.log('SUCCESS: Benin is now in Global zone.');

    } catch (err) {
        console.error('DATABASE ERROR:', err);
    } finally {
        await client.end();
        console.log('Connection closed.');
    }
}

run();
