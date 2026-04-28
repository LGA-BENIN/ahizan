const { Client } = require('pg');
require('dotenv').config();

async function run() {
    const client = new Client({
        host: process.env.DB_HOST || '127.0.0.1',
        port: +(process.env.DB_PORT || 5432),
        user: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'vendure',
    });

    try {
        await client.connect();
        console.log('Connected to DB');

        const res = await client.query(`
            SELECT id, code, state, "subTotal", "subTotalWithTax", "shipping", "shippingWithTax", "taxZoneId"
            FROM "order" 
            ORDER BY "updatedAt" DESC LIMIT 10
        `);
        console.log('Recent orders values:');
        console.table(res.rows);

        const lines = await client.query(`
            SELECT id, "orderId", "unitPrice", "unitPriceWithTax"
            FROM order_line 
            WHERE "orderId" IN (SELECT id FROM "order" ORDER BY "updatedAt" DESC LIMIT 10)
        `);
        console.log('Order lines values:');
        console.table(lines.rows);

    } catch (err) {
        console.error('DATABASE ERROR:', err);
    } finally {
        await client.end();
        console.log('Connection closed.');
    }
}

run();
