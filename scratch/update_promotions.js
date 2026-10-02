const { Client } = require('pg');

async function main() {
    // Find db ip or connect directly
    const client = new Client({
        user: 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        host: '172.20.0.3',
        port: 5432,
        database: 'postgres'
    });

    try {
        await client.connect();
        console.log('Connected to PostgreSQL database');

        const updateRes = await client.query(`
            UPDATE seller_offer
            SET "onPromotion" = true,
                "promotionalPrice" = ROUND(price * (0.70 + ((id % 20) * 0.01)))
            WHERE id % 2 = 0 OR "vendorId" IN (64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78);
        `);
        console.log('Updated rows:', updateRes.rowCount);

        const countRes = await client.query(`
            SELECT count(*) as total, count(*) FILTER (WHERE "onPromotion" = true) as promo_count 
            FROM seller_offer;
        `);
        console.table(countRes.rows);
        await client.end();
    } catch (err) {
        console.error('DB Error:', err);
    }
}

main();
