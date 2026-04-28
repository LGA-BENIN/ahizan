const { Client } = require('pg');

async function check() {
    const client = new Client({
        host: '127.0.0.1',
        port: 5432,
        user: 'postgres',
        password: 'admin',
        database: 'ahizan',
    });

    try {
        console.log('Connecting to database...');
        await client.connect();
        console.log('Connected!');

        const resChannel = await client.query('SELECT id, code, "defaultTaxZoneId" FROM channel');
        console.log('Channels:', resChannel.rows);

        const resZones = await client.query('SELECT id, name FROM zone');
        console.log('Zones:', resZones.rows);

        const resRates = await client.query('SELECT name, value, "categoryId", "zoneId" FROM tax_rate');
        console.log('Tax Rates:', resRates.rows);

    } catch (e) {
        console.error('ERROR:', e.message);
    } finally {
        await client.end();
    }
}
check();
bau
