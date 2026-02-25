const { Client } = require('pg');
require('dotenv').config();

async function finalFix() {
    const client = new Client({
        host: process.env.DB_HOST || '127.0.0.1',
        port: +(process.env.DB_PORT || 5432),
        user: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'ahizan',
    });

    try {
        await client.connect();
        console.log('Connected to database...');

        // 1. Find a region to use (Benin preferably)
        const resRegion = await client.query("SELECT id, code FROM region WHERE code = 'BJ' OR code = 'FR' OR code = 'US' LIMIT 1");
        let regionId = resRegion.rows[0]?.id;

        if (!regionId) {
            const resAny = await client.query("SELECT id, code FROM region LIMIT 1");
            regionId = resAny.rows[0]?.id;
        }

        if (!regionId) {
            console.log('No regions found in database. Cannot link zone members.');
        } else {
            console.log(`Using region ID ${regionId} for Global zone.`);
            // 2. Link region to Global zone (ID 1)
            const resLink = await client.query('SELECT * FROM zone_members_region WHERE "zoneId" = 1 AND "regionId" = $1', [regionId]);
            if (resLink.rows.length === 0) {
                await client.query('INSERT INTO zone_members_region ("zoneId", "regionId") VALUES (1, $1)', [regionId]);
                console.log('Linked region to Global zone.');
            } else {
                console.log('Region already linked to Global zone.');
            }
        }

        // 3. Ensure "Standard Tax" category is default
        await client.query("UPDATE tax_category SET \"isDefault\" = true WHERE name = 'Standard Tax'");
        console.log('Set Standard Tax as default category.');

        // 4. Update all existing variants to use Standard Tax if missing
        const resCat = await client.query("SELECT id FROM tax_category WHERE name = 'Standard Tax'");
        if (resCat.rows.length > 0) {
            const taxCatId = resCat.rows[0].id;
            try {
                const resUpdate = await client.query('UPDATE product_variant SET "taxCategoryId" = $1 WHERE "taxCategoryId" IS NULL', [taxCatId]);
                console.log(`Updated ${resUpdate.rowCount} product variants to Standard Tax (camelCase).`);
            } catch (e) {
                const resUpdate = await client.query('UPDATE product_variant SET tax_category_id = $1 WHERE tax_category_id IS NULL', [taxCatId]);
                console.log(`Updated ${resUpdate.rowCount} product variants to Standard Tax (snake_case).`);
            }
        }

        console.log('--- FIX APPLIED SUCCESSFULLY ---');

    } catch (err) {
        console.error('FIX ERROR:', err);
    } finally {
        await client.end();
        process.exit(0);
    }
}

finalFix();

