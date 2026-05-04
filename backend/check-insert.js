const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'ahizan',
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'admin',
});

async function checkTableStructure() {
    try {
        console.log('\nTable structure: collection_product_variants_product_variant\n');

        const columns = await pool.query(`
            SELECT column_name, data_type FROM information_schema.columns 
            WHERE table_name = 'collection_product_variants_product_variant' 
            ORDER BY ordinal_position
        `);

        console.log('Columns:');
        columns.rows.forEach(col => {
            console.log(`  - ${col.column_name} (${col.data_type})`);
        });

        // Try a simple insert
        console.log('\nTesting insert...');
        try {
            await pool.query(
                'INSERT INTO collection_product_variants_product_variant ("collectionId", "productVariantId") VALUES ($1, $2)',
                [1, 1]
            );
            console.log('✅ Insert succeeded');
        } catch (e) {
            console.log('❌ Insert failed:', e.message);
        }

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await pool.end();
    }
}

checkTableStructure();
