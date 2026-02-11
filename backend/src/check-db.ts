
import { Client } from 'pg';
import 'dotenv/config';

async function checkDb() {
    const client = new Client({
        host: process.env.DB_HOST || '127.0.0.1',
        port: +(process.env.DB_PORT || 5432),
        user: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'vendure',
    });

    try {
        await client.connect();
        console.log('Connected...');

        // Check Channel
        const resChannel = await client.query(`SELECT id, code, "defaultTaxZoneId", "defaultShippingZoneId" FROM channel`);
        console.table(resChannel.rows);

        // Check Zones
        const resZones = await client.query(`SELECT id, name, enabled FROM zone`);
        console.table(resZones.rows);

        // Check Tax Categories
        const resTaxCats = await client.query(`SELECT id, name FROM tax_category`);
        console.table(resTaxCats.rows);
        
        // Check Product Variant columns
        const resCols = await client.query(`
             SELECT column_name 
             FROM information_schema.columns 
             WHERE table_name = 'product_variant' 
             AND column_name LIKE '%tax%'
        `);
        console.log('Product Variant Tax Columns:', resCols.rows.map(r => r.column_name));

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

checkDb();
