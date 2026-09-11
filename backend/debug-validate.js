const { Client } = require('pg');
require('dotenv').config();

function samplesEach(sample, arrays) {
    if (sample.length !== arrays.length) {
        return false;
    }
    return arrays.every(arr => sample.some(id => arr.includes(id)));
}

async function runDebug() {
    const client = new Client({
        host: process.env.DB_HOST || '127.0.0.1',
        port: +(process.env.DB_PORT || 5432),
        user: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'vendure',
    });
    await client.connect();

    // Get product 285 option groups
    const ogs = await client.query(`
        SELECT pog."productId", pog."productOptionGroupId" as og_id, og.code as og_code
        FROM product_option_groups_product_option_group pog
        JOIN product_option_group og ON og.id = pog."productOptionGroupId"
        WHERE pog."productId" = (SELECT MAX(id) FROM product)
    `);
    console.log('Latest Product OptionGroups in DB:', ogs.rows);

    const latestProductId = ogs.rows[0]?.productId;
    if (!latestProductId) {
        console.log('No product found.');
        await client.end();
        return;
    }

    const options = await client.query(`
        SELECT po.id, po.code, po."groupId", og.code as og_code
        FROM product_option po
        JOIN product_option_group og ON og.id = po."groupId"
        WHERE po."groupId" IN (SELECT "productOptionGroupId" FROM product_option_groups_product_option_group WHERE "productId" = $1)
    `, [latestProductId]);

    console.log(`Product ${latestProductId} OptionGroups options in DB:`, options.rows);

    // Group options by groupId
    const grouped = {};
    for (const opt of options.rows) {
        if (!grouped[opt.groupId]) grouped[opt.groupId] = [];
        grouped[opt.groupId].push(String(opt.id));
    }
    console.log('Grouped option IDs:', grouped);

    const groupArrays = Object.values(grouped);

    // Test sample inputs
    const sampleIds = options.rows.slice(0, groupArrays.length).map(o => String(o.id));
    console.log('Test sampleIds:', sampleIds);
    console.log('samplesEach result:', samplesEach(sampleIds, groupArrays));

    await client.end();
}

runDebug().catch(console.error);
