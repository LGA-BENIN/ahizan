const { Client } = require('pg');
require('dotenv').config();

async function testChannelOGs() {
    const client = new Client({
        host: process.env.DB_HOST || '127.0.0.1',
        port: +(process.env.DB_PORT || 5432),
        user: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'vendure',
    });
    await client.connect();

    const productId = 287;

    // Check option_group_channels_channel table
    const ogChannels = await client.query(`
        SELECT pogc.*, og.code
        SELECT * FROM product_option_group_channels_channel pogc
        JOIN product_option_group og ON og.id = pogc."productOptionGroupId"
        WHERE pogc."productOptionGroupId" IN (
            SELECT "productOptionGroupId" FROM product_option_groups_product_option_group WHERE "productId" = $1
        )
    `, [productId]).catch(async () => {
        return await client.query(`
            SELECT pog."productOptionGroupId", og.code
            FROM product_option_groups_product_option_group pog
            JOIN product_option_group og ON og.id = pog."productOptionGroupId"
            WHERE pog."productId" = $1
        `, [productId]);
    });

    console.log('Product 287 Attached Option Groups:', ogChannels.rows);

    // Check product_channels_channel table for product 287
    const pChannels = await client.query(`
        SELECT * FROM product_channels_channel WHERE "productId" = $1
    `, [productId]);
    console.log('Product 287 Channels:', pChannels.rows);

    await client.end();
}

testChannelOGs().catch(console.error);
