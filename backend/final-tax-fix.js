const { Client } = require('pg');
require('dotenv').config();

async function fix() {
    const client = new Client({
        host: process.env.DB_HOST || '127.0.0.1',
        port: +(process.env.DB_PORT || 5432),
        user: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'ahizan',
    });

    try {
        await client.connect();
        console.log('CONNECTED');

        // 1. Diagnose TaxRate
        const resTaxRate = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'tax_rate'");
        console.log('TaxRate Columns:', resTaxRate.rows.map(r => r.column_name).join(', '));

        // 2. Diagnose Channel
        const resChannelCols = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'channel'");
        console.log('Channel Columns:', resChannelCols.rows.map(r => r.column_name).join(', '));

        // 3. Get Default Channel and Zone
        const resChan = await client.query("SELECT id, code FROM channel WHERE code = '__default_channel__' OR code = 'default-channel' LIMIT 1");
        const channel = resChan.rows[0];
        console.log('Channel:', channel);

        let zoneId;
        const resZone = await client.query("SELECT id FROM zone WHERE name = 'Global'");
        if (resZone.rows.length > 0) zoneId = resZone.rows[0].id;
        else {
            const resNewZone = await client.query("INSERT INTO zone (\"createdAt\", \"updatedAt\", \"name\") VALUES (NOW(), NOW(), 'Global') RETURNING id");
            zoneId = resNewZone.rows[0].id;
        }
        console.log('Zone ID:', zoneId);

        // 4. Link Channel to Zone if columns exist
        const hasTaxZoneCol = resChannelCols.rows.some(r => r.column_name === 'defaultTaxZoneId' || r.column_name === 'default_tax_zone_id');
        if (hasTaxZoneCol) {
            const colName = resChannelCols.rows.some(r => r.column_name === 'defaultTaxZoneId') ? '"defaultTaxZoneId"' : 'default_tax_zone_id';
            await client.query(`UPDATE channel SET ${colName} = $1 WHERE id = $2`, [zoneId, channel.id]);
            console.log('Updated channel default tax zone.');
        }

        // 5. Standard Tax Category
        let taxCatId;
        const resCat = await client.query("SELECT id FROM tax_category WHERE name = 'Standard Tax'");
        if (resCat.rows.length > 0) taxCatId = resCat.rows[0].id;
        else {
            const resNewCat = await client.query("INSERT INTO tax_category (\"createdAt\", \"updatedAt\", \"name\", \"isDefault\") VALUES (NOW(), NOW(), 'Standard Tax', true) RETURNING id");
            taxCatId = resNewCat.rows[0].id;
        }
        console.log('Tax Category ID:', taxCatId);

        // 6. Tax Rate
        let taxRateId;
        const resRate = await client.query("SELECT id FROM tax_rate WHERE name = 'No Tax Check'");
        if (resRate.rows.length > 0) taxRateId = resRate.rows[0].id;
        else {
            const resNewRate = await client.query("INSERT INTO tax_rate (\"createdAt\", \"updatedAt\", \"name\", \"enabled\", \"value\", \"categoryId\", \"zoneId\") VALUES (NOW(), NOW(), 'No Tax Check', true, 0, $1, $2) RETURNING id", [taxCatId, zoneId]);
            taxRateId = resNewRate.rows[0].id;
        }
        console.log('Tax Rate ID:', taxRateId);

        // 7. Find join table for TaxRate and Channel
        const resTabs = await client.query("SELECT table_name FROM information_schema.tables WHERE table_name LIKE 'tax_rate_channels%'");
        if (resTabs.rows.length > 0) {
            const joinTable = resTabs.rows[0].table_name;
            console.log('Found Join Table:', joinTable);
            // Search column names of join table
            const resCols = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name = '${joinTable}'`);
            const taxRateCol = resCols.rows.some(r => r.column_name === 'taxRateId') ? 'taxRateId' : resCols.rows.find(r => r.column_name.includes('tax_rate'))?.column_name;
            const channelCol = resCols.rows.some(r => r.column_name === 'channelId') ? 'channelId' : resCols.rows.find(r => r.column_name.includes('channel'))?.column_name;

            if (taxRateCol && channelCol) {
                const resExists = await client.query(`SELECT * FROM ${joinTable} WHERE "${taxRateCol}" = $1 AND "${channelCol}" = $2`, [taxRateId, channel.id]);
                if (resExists.rows.length === 0) {
                    await client.query(`INSERT INTO ${joinTable} ("${taxRateCol}", "${channelCol}") VALUES ($1, $2)`, [taxRateId, channel.id]);
                    console.log('Linked TaxRate to Channel.');
                }
            }
        } else {
            console.log('No Join Table found for TaxRate and Channel.');
        }

    } catch (e) {
        console.error('ERROR:', e);
    } finally {
        await client.end();
        process.exit(0);
    }
}
fix();

