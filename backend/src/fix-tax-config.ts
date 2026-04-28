
const { Client } = require('pg');
import 'dotenv/config';

async function fixTaxConfig() {
    // @ts-ignore
    const client = new Client({
        host: process.env.DB_HOST || '127.0.0.1',
        port: +(process.env.DB_PORT || 5432),
        user: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'vendure',
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

        // 2. Create Global Zone (No enabled column)
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

        // 3. Update Channel Defaults
        // Based on typical Vendure setup + recent findings
        // We will try standard camelCase with quotes first which is common for TypeORM with preserve casing
        try {
            await client.query(`UPDATE channel SET "defaultTaxZoneId" = $1, "defaultShippingZoneId" = $1 WHERE id = $2`, [zoneId, channelId]);
        } catch (e) {
            console.log('Failed updating channel with quoted columns, trying snake_case...');
            await client.query(`UPDATE channel SET default_tax_zone_id = $1, default_shipping_zone_id = $1 WHERE id = $2`, [zoneId, channelId]);
        }
        console.log('Updated Channel default zones.');

        // 4. Create Tax Category
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

        // 5. Create 0% Tax Rate
        const resRate = await client.query(`SELECT id FROM tax_rate WHERE name = 'No Tax Check'`);
        if (resRate.rows.length === 0) {
            console.log('Creating 0% Tax Rate...');
            await client.query(`
                INSERT INTO tax_rate ("createdAt", "updatedAt", "name", "enabled", "value", "categoryId", "zoneId") 
                VALUES (NOW(), NOW(), 'No Tax Check', true, 0, $1, $2)
             `, [taxCatId, zoneId]);
        }
        console.log('Tax Rate ensured.');

        // 6. Fix Product Variants
        // We found "taxCategoryId" in column list.
        console.log('Updating Product Variants...');
        const resUpdate = await client.query(`UPDATE product_variant SET "taxCategoryId" = $1 WHERE "taxCategoryId" IS NULL`, [taxCatId]);
        console.log(`Updated ${resUpdate.rowCount} variants.`);

    } catch (err) {
        console.error('ERROR:', err);
    } finally {
        await client.end();
    }
}

fixTaxConfig();
