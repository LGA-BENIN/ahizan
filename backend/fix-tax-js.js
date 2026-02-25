const { Client } = require('pg');
require('dotenv').config();

async function fixTaxConfig() {
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

        // 1. Get Default Channel
        const resChannel = await client.query(`SELECT id FROM channel WHERE code = '__default_channel__'`);
        let channelId = resChannel.rows[0]?.id;

        if (!channelId) {
            const resAny = await client.query(`SELECT id FROM channel LIMIT 1`);
            channelId = resAny.rows[0]?.id;
        }
        console.log('Target Channel ID:', channelId);
        if (!channelId) throw new Error('No channel found');

        // 2. Create Global Zone
        let zoneId;
        const resZone = await client.query(`SELECT id FROM zone WHERE name = 'Global'`);
        if (resZone.rows.length > 0) {
            zoneId = resZone.rows[0].id;
        } else {
            console.log('Creating Global Zone...');
            const newZone = await client.query(`
                INSERT INTO zone ("createdAt", "updatedAt", "name") 
                VALUES (NOW(), NOW(), 'Global') RETURNING id
            `);
            zoneId = newZone.rows[0].id;
        }
        console.log('Zone ID:', zoneId);

        // 3. Ensure Zone has at least one region (e.g. Benin country)
        // Check if region exists (Vendure v2 uses 'region' for countries)
        const resRegion = await client.query(`SELECT id FROM region WHERE code = 'BJ'`);
        if (resRegion.rows.length > 0) {
            const regionId = resRegion.rows[0].id;
            console.log('Found Benin region. Linking to Global zone...');
            // Check if already linked
            const resLink = await client.query(`SELECT * FROM zone_members_region WHERE "zoneId" = $1 AND "regionId" = $2`, [zoneId, regionId]);
            if (resLink.rows.length === 0) {
                await client.query(`INSERT INTO zone_members_region ("zoneId", "regionId") VALUES ($1, $2)`, [zoneId, regionId]);
                console.log('Linked Benin to Global zone.');
            }
        } else {
            console.log('Benin region (BJ) not found in database.');
        }

        // 4. Update Channel Defaults
        try {
            await client.query(`UPDATE channel SET "defaultTaxZoneId" = $1, "defaultShippingZoneId" = $1 WHERE id = $2`, [zoneId, channelId]);
            console.log('Updated Channel default zones (camelCase).');
        } catch (e) {
            console.log('Failed updating channel with quoted columns, trying snake_case...');
            await client.query(`UPDATE channel SET default_tax_zone_id = $1, default_shipping_zone_id = $1 WHERE id = $2`, [zoneId, channelId]);
            console.log('Updated Channel default zones (snake_case).');
        }

        // 5. Create Tax Category
        let taxCatId;
        const resCat = await client.query(`SELECT id FROM tax_category WHERE name = 'Standard Tax'`);
        if (resCat.rows.length > 0) {
            taxCatId = resCat.rows[0].id;
        } else {
            console.log('Creating Standard Tax Category...');
            const newCat = await client.query(`
                INSERT INTO tax_category ("createdAt", "updatedAt", "name", "isDefault") 
                VALUES (NOW(), NOW(), 'Standard Tax', true) RETURNING id
            `);
            taxCatId = newCat.rows[0].id;
        }
        console.log('Tax Category ID:', taxCatId);

        // 6. Create 0% Tax Rate and LINK TO CHANNEL
        const resRate = await client.query(`SELECT id FROM tax_rate WHERE name = 'No Tax Check'`);
        let taxRateId;
        if (resRate.rows.length === 0) {
            console.log('Creating 0% Tax Rate...');
            const newRate = await client.query(`
                INSERT INTO tax_rate ("createdAt", "updatedAt", "name", "enabled", "value", "categoryId", "zoneId") 
                VALUES (NOW(), NOW(), 'No Tax Check', true, 0, $1, $2) RETURNING id
             `, [taxCatId, zoneId]);
            taxRateId = newRate.rows[0].id;
        } else {
            taxRateId = resRate.rows[0].id;
        }
        console.log('Tax Rate ID:', taxRateId);

        // LINK Tax Rate to Channel
        try {
            const resRateLink = await client.query(`
                SELECT * FROM tax_rate_channels_channel 
                WHERE "tax_rateId" = $1 AND "channelId" = $2
            `, [taxRateId, channelId]);

            if (resRateLink.rows.length === 0) {
                console.log('Linking Tax Rate to Channel...');
                await client.query(`
                    INSERT INTO tax_rate_channels_channel ("tax_rateId", "channelId") 
                    VALUES ($1, $2)
                `, [taxRateId, channelId]);
                console.log('Linked.');
            }
        } catch (e) {
            console.log('Failed linking tax rate to channel. Table tax_rate_channels_channel might not exist or have different names.');
            // Some Vendure versions use different naming or direct column if single channel (though rare)
        }

        // 7. Fix Product Variants
        console.log('Updating Product Variants...');
        try {
            const resUpdate = await client.query(`UPDATE product_variant SET "taxCategoryId" = $1 WHERE "taxCategoryId" IS NULL`, [taxCatId]);
            console.log(`Updated ${resUpdate.rowCount} variants (camelCase).`);
        } catch (e) {
            console.log('Failed updating variants camelCase, trying snake_case...');
            const resUpdate = await client.query(`UPDATE product_variant SET tax_category_id = $1 WHERE tax_category_id IS NULL`, [taxCatId]);
            console.log(`Updated ${resUpdate.rowCount} variants (snake_case).`);
        }

        console.log('FIX COMPLETED SUCCESSFULLY.');

    } catch (err) {
        console.error('ERROR:', err);
    } finally {
        await client.end();
        process.exit(0);
    }
}

fixTaxConfig();
