
const { Client } = require('pg');
import 'dotenv/config';

async function checkColumns() {
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
        const res = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'zone'
        `);
        console.log('Zone Columns:', res.rows.map((r: any) => r.column_name));
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}
checkColumns();
