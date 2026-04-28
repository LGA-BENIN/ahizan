const { Client } = require('pg');
require('dotenv').config();

async function seed() {
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

        // 1. Seed Benin Region
        console.log('Checking regions...');
        const resRegion = await client.query("SELECT id FROM region WHERE code = 'BJ'");
        let regionId;
        if (resRegion.rows.length === 0) {
            console.log('Creating Benin region...');
            // Need to know columns. Assuming createdAt, updatedAt, code, type, enabled
            // Based on Vendure 2.0 Region entity
            const resNewRegion = await client.query(`
                INSERT INTO region ("createdAt", "updatedAt", "code", "type", "enabled")
                VALUES (NOW(), NOW(), 'BJ', 'country', true) RETURNING id
            `);
            regionId = resNewRegion.rows[0].id;

            // Also need translation for name?
            const resTrans = await client.query("SELECT * FROM information_schema.tables WHERE table_name = 'region_translation'");
            if (resTrans.rows.length > 0) {
                await client.query(`
                    INSERT INTO region_translation ("createdAt", "updatedAt", "languageCode", "name", "baseId")
                    VALUES (NOW(), NOW(), 'en', 'Benin', $1)
                `, [regionId]);
            }
        } else {
            regionId = resRegion.rows[0].id;
        }
        console.log('Region ID:', regionId);

        // 2. Ensure Global Zone exists
        const resZone = await client.query("SELECT id FROM zone WHERE name = 'Global'");
        let zoneId;
        if (resZone.rows.length === 0) {
            const resNewZone = await client.query("INSERT INTO zone (\"createdAt\", \"updatedAt\", \"name\") VALUES (NOW(), NOW(), 'Global') RETURNING id");
            zoneId = resNewZone.rows[0].id;
        } else {
            zoneId = resZone.rows[0].id;
        }
        console.log('Zone ID:', zoneId);

        // 3. Link Region to Zone
        const resLink = await client.query('SELECT * FROM zone_members_region WHERE "zoneId" = $1 AND "regionId" = $2', [zoneId, regionId]);
        if (resLink.rows.length === 0) {
            await client.query('INSERT INTO zone_members_region ("zoneId", "regionId") VALUES ($1, $2)', [zoneId, regionId]);
            console.log('Linked region to Global zone.');
        }

        // 4. Update Default Channel
        const resChan = await client.query("SELECT id FROM channel WHERE code = '__default_channel__' OR code = 'default-channel' LIMIT 1");
        if (resChan.rows.length > 0) {
            const channelId = resChan.rows[0].id;
            await client.query('UPDATE channel SET "defaultTaxZoneId" = $1, "defaultShippingZoneId" = $1 WHERE id = $2', [zoneId, channelId]);
            console.log('Updated channel default zones.');
        }

        // 5. Standard Tax Category
        const resCat = await client.query("SELECT id FROM tax_category WHERE name = 'Standard Tax'");
        let catId;
        if (resCat.rows.length === 0) {
            const resNewCat = await client.query("INSERT INTO tax_category (\"createdAt\", \"updatedAt\", \"name\", \"isDefault\") VALUES (NOW(), NOW(), 'Standard Tax', true) RETURNING id");
            catId = resNewCat.rows[0].id;
        } else {
            catId = resCat.rows[0].id;
            await client.query("UPDATE tax_category SET \"isDefault\" = true WHERE id = $1", [catId]);
        }
        console.log('Tax Category ID:', catId);

        // 6. 0% Tax Rate
        const resRate = await client.query("SELECT id FROM tax_rate WHERE name = 'No Tax Check'");
        if (resRate.rows.length === 0) {
            await client.query("INSERT INTO tax_rate (\"createdAt\", \"updatedAt\", \"name\", \"enabled\", \"value\", \"categoryId\", \"zoneId\") VALUES (NOW(), NOW(), 'No Tax Check', true, 0, $1, $2)", [catId, zoneId]);
            console.log('Created 0% tax rate.');
        }

        console.log('SEEDING COMPLETED.');

    } catch (err) {
        console.error('SEEDING ERROR:', err);
    } finally {
        await client.end();
        process.exit(0);
    }
}
seed();

