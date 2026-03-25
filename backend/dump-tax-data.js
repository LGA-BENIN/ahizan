const { Client } = require('pg');
require('dotenv').config();

async function dump() {
    const client = new Client({
        host: process.env.DB_HOST || '127.0.0.1',
        port: +(process.env.DB_PORT || 5432),
        user: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'ahizan',
    });

    try {
        await client.connect();
        const resRates = await client.query("SELECT * FROM tax_rate");
        console.log('TAX RATES:', resRates.rows);

        const resZones = await client.query("SELECT * FROM zone");
        console.log('ZONES:', resZones.rows);

        const resMembers = await client.query("SELECT * FROM zone_members_region");
        console.log('ZONE MEMBERS:', resMembers.rows);

        const resRegions = await client.query("SELECT id, code, name FROM region LIMIT 20");
        console.log('REGIONS:', resRegions.rows);

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
        process.exit(0);
    }
}
dump();

