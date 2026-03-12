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

        // 1. Check Benin's zone membership
        const membership = await client.query(`
            SELECT zm.*, z.name as zone_name 
            FROM zone_members_region zm
            JOIN zone z ON zm."zoneId" = z.id
            WHERE zm."regionId" = 2
        `);
        console.log('Benin zone membership:', membership.rows);

        // 2. Check all regions in Global zone
        const globalMembers = await client.query(`
            SELECT COUNT(*) FROM zone_members_region WHERE "zoneId" = 1
        `);
        console.log('Global zone member count:', globalMembers.rows[0].count);

        // 3. Check tax rates
        const taxRates = await client.query(`SELECT * FROM tax_rate`);
        console.log('Tax rates:', taxRates.rows);

    } catch (err) {
        console.error('DATABASE ERROR:', err);
    } finally {
        await client.end();
        console.log('Connection closed.');
    }
}

run();
