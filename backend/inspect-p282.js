const { Client } = require('pg');
require('dotenv').config();

async function debug() {
    const client = new Client({
        host: process.env.DB_HOST || '127.0.0.1',
        port: +(process.env.DB_PORT || 5432),
        user: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'vendure',
    });
    await client.connect();

    const variants = await client.query(`
        SELECT pv.id, pv.sku, pvt.name
        FROM product_variant pv
        JOIN product_variant_translation pvt ON pvt."baseId" = pv.id AND pvt."languageCode" = 'fr'
        WHERE pv."productId" = 282 AND pv."deletedAt" IS NULL
    `);
    console.log('Variants for Product 282:', variants.rows);

    for (const v of variants.rows) {
        const options = await client.query(`
            SELECT po.id, po.code, po."groupId", og.code as group_code
            FROM product_variant_options_product_option pvo
            JOIN product_option po ON po.id = pvo."productOptionId"
            JOIN product_option_group og ON og.id = po."groupId"
            WHERE pvo."productVariantId" = $1
        `, [v.id]);
        console.log(`Variant ${v.id} (${v.sku}) options:`, options.rows);
    }

    await dbEnd();
    async function dbEnd() { await client.end(); }
}
debug().catch(console.error);
