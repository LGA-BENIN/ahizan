import { Client } from 'pg';
import 'dotenv/config';

async function checkColumns() {
    const client = new Client({
        host: process.env.DB_HOST || '127.0.0.1',
        port: +(process.env.DB_PORT || 5432),
        user: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'vendure',
    });

    try {
        await client.connect();

        const res = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'product_variant';
        `);

        console.log('Columns in product_variant:');
        console.log(res.rows.map(r => r.column_name));

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

checkColumns();
