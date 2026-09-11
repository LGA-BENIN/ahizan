const { Client } = require('pg');
require('dotenv').config();

async function runTest() {
    console.log('=== START TERMINAL TEST ===');
    const db = new Client({
        host: process.env.DB_HOST || '127.0.0.1',
        port: +(process.env.DB_PORT || 5432),
        user: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'vendure',
    });
    await db.connect();

    // 1. Fetch seller users/vendors
    const sellerRes = await db.query(`
        SELECT u.id as "userId", u."identifier", v.id as "vendorId", v.name as "vendorName"
        FROM "user" u
        JOIN vendor v ON v."userId" = u.id
        LIMIT 5
    `);
    console.log('Vendors found in DB:', sellerRes.rows);

    if (sellerRes.rows.length === 0) {
        console.log('No vendors found to test with.');
        await db.end();
        return;
    }

    // 2. Fetch products
    const prodRes = await db.query(`
        SELECT p.id, pt.name, p."customFieldsVendorid", p."customFieldsApprovalstatus"
        FROM product p
        JOIN product_translation pt ON pt."baseId" = p.id AND pt."languageCode" = 'fr'
        WHERE p."deletedAt" IS NULL
        ORDER BY p.id DESC
        LIMIT 10
    `);
    console.log('Recent products:', prodRes.rows);

    for (const p of prodRes.rows) {
        const ogRes = await db.query(`
            SELECT og.id, og.code, ogt.name
            FROM product_option_groups_product_option_group pog
            JOIN product_option_group og ON og.id = pog."productOptionGroupId"
            LEFT JOIN product_option_group_translation ogt ON ogt."baseId" = og.id AND ogt."languageCode" = 'fr'
            WHERE pog."productId" = $1
        `, [p.id]);
        
        const vRes = await db.query(`
            SELECT pv.id, pv.sku, pvt.name
            FROM product_variant pv
            JOIN product_variant_translation pvt ON pvt."baseId" = pv.id AND pvt."languageCode" = 'fr'
            WHERE pv."productId" = $1 AND pv."deletedAt" IS NULL
        `, [p.id]);
        
        console.log(`Product ${p.id} (${p.name}): ${ogRes.rows.length} OptionGroups [${ogRes.rows.map(g => g.name || g.code).join(', ')}], ${vRes.rows.length} Variants [SKUs: ${vRes.rows.map(v => v.sku).join(', ')}]`);
    }

    await db.end();
}

runTest().catch(err => {
    console.error('Test error:', err);
});
