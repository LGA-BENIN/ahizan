const { Client } = require('pg');
require('dotenv').config();

async function checkTableStructure() {
    const client = new Client({
        host: process.env.DB_HOST || '127.0.0.1',
        port: +(process.env.DB_PORT || 5432),
        user: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'ahizan',
    });

    try {
        await client.connect();
        
        // Check the structure of collection_product_variants_product_variant
        const res = await client.query(`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'collection_product_variants_product_variant'
            ORDER BY ordinal_position
        `);
        console.log('Table: collection_product_variants_product_variant');
        console.log('Columns:');
        res.rows.forEach(r => console.log(`  - ${r.column_name} (${r.data_type}, nullable: ${r.is_nullable})`));
        
        // Check if there's any data
        const countRes = await client.query(`SELECT COUNT(*) as count FROM "collection_product_variants_product_variant"`);
        console.log(`\nTotal rows: ${countRes.rows[0].count}`);
        
        // Show sample data
        const sampleRes = await client.query(`SELECT * FROM "collection_product_variants_product_variant" LIMIT 5`);
        console.log('\nSample data:');
        console.log(sampleRes.rows);
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
        process.exit(0);
    }
}
checkTableStructure();
