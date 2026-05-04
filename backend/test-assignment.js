const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'ahizan',
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'admin',
});

async function test() {
    try {
        console.log('Starting bulk assignment...\n');

        // Get products
        const products = await pool.query(`
            SELECT p.id FROM product p LIMIT 5
        `);
        console.log(`Found ${products.rows.length} product rows`);

        // Get collections
        const collections = await pool.query(`
            SELECT c.id FROM collection c WHERE c."isRoot" = false
        `);
        console.log(`Found ${collections.rows.length} collections`);

        // Get one product's variants
        if (products.rows.length > 0) {
            const variants = await pool.query(
                'SELECT id FROM product_variant WHERE "productId" = $1',
                [products.rows[0].id]
            );
            console.log(`Product ${products.rows[0].id} has ${variants.rows.length} variants`);

            // Try to insert one relationship
            if (variants.rows.length > 0 && collections.rows.length > 0) {
                await pool.query(
                    'INSERT INTO collection_product_variants_product_variant ("collectionId", "productVariantId") VALUES ($1, $2) ON CONFLICT DO NOTHING',
                    [collections.rows[0].id, variants.rows[0].id]
                );
                console.log('Inserted test relationship');
            }
        }

        console.log('\nTest complete!');
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await pool.end();
    }
}

test();
