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

        console.log('--- Product Columns ---');
        const pRes = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'product'`);
        console.log(pRes.rows.map(r => r.column_name));

        console.log('--- Product Translation Columns ---');
        const ptRes = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'product_translation'`);
        console.log(ptRes.rows.map(r => r.column_name));

        const res = await client.query(`
            SELECT pt.slug, pt.name, p.id 
            FROM product_translation pt 
            JOIN product p ON pt."baseId" = p.id 
            WHERE pt.slug = $1
        `, ['hahahaproductokay']);
        console.log('Product search by translation slug:', res.rows);

    } catch (err) {
        console.error('DATABASE ERROR:', err);
    } finally {
        await client.end();
        console.log('Connection closed.');
    }
}

run();
