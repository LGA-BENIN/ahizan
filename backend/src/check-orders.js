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

        // Get latest 5 incomplete orders
        const res = await client.query(`
            SELECT id, code, state, "subTotalWithTax", "shippingWithTax", "shippingAddress", "updatedAt"
            FROM "order"
            WHERE state IN ('AddingItems', 'ArrangingPayment')
            ORDER BY "updatedAt" DESC
            LIMIT 5
        `);
        
        console.log('--- LATEST INCOMPLETE ORDERS ---');
        console.table(res.rows.map(r => ({
            id: r.id,
            code: r.code,
            state: r.state,
            total: (r.subTotalWithTax || 0) + (r.shippingWithTax || 0),
            hasAddress: !!r.shippingAddress,
            updated: r.updatedAt
        })));

        if (res.rows.length > 0) {
            const orderId = res.rows[0].id;
            // Check lines
            const linesRes = await client.query(`
                SELECT count(*) FROM order_line WHERE "orderId" = $1
            `, [orderId]);
            console.log(`Order ${res.rows[0].code} has ${linesRes.rows[0].count} lines.`);

            // Check shipping methods
            const shipRes = await client.query(`
                SELECT * FROM shipping_line WHERE "orderId" = $1
            `, [orderId]);
            console.log(`Order ${res.rows[0].code} has ${shipRes.rows.length} shipping lines.`);
            if (shipRes.rows.length > 0) {
                console.table(shipRes.rows);
            }
        }

    } catch (err) {
        console.error('DATABASE ERROR:', err);
    } finally {
        await client.end();
        console.log('Connection closed.');
    }
}

run();
