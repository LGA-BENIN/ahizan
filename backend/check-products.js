const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'ahizan',
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'admin',
});

async function checkProductsWithCollections() {
    try {
        console.log('\n📦 Products and Collections Analysis\n');
        console.log('='.repeat(70));

        // 1. Count products
        const prodCount = await pool.query('SELECT COUNT(*) as cnt FROM product');
        console.log(`\n✅ Total Products: ${prodCount.rows[0].cnt}`);

        // 2. Count collections
        const collCount = await pool.query('SELECT COUNT(*) as cnt FROM collection');
        console.log(`✅ Total Collections: ${collCount.rows[0].cnt}`);

        // 3. Find products that have collections via product_collection_relation
        console.log('\n\n🔗 Checking product-collection relationships:\n');
        
        // Try to find products linked to collections
        const relationQuery = await pool.query(`
            SELECT p.id, pt.name, c.id as coll_id, ct.name as coll_name, ct.slug as coll_slug
            FROM product p
            JOIN product_translation pt ON p.id = pt."baseId"
            LEFT JOIN collection c ON p.id = c.id
            LEFT JOIN collection_translation ct ON c.id = ct."baseId"
            WHERE pt."languageCode" = 'en' OR pt."languageCode" = 'fr'
            LIMIT 10
        `);

        if (relationQuery.rows.length === 0) {
            console.log('⚠️  No products with collections found via direct join\n');
            console.log('Trying alternative approach...\n');
            
            // Try finding via collection_product_variants table
            const altQuery = await pool.query(`
                SELECT DISTINCT p.id, pt.name 
                FROM product p
                JOIN product_translation pt ON p.id = pt."baseId"
                WHERE pt."languageCode" IN ('en', 'fr')
                LIMIT 5
            `);

            console.log('📋 Sample Products (first 5):\n');
            altQuery.rows.forEach((p, i) => {
                console.log(`  ${i + 1}. "${p.name}" (Product ID: ${p.id})`);
            });
        } else {
            console.log('✅ Found products with collections!\n');
            console.log('📋 Sample Products with Collections:\n');
            relationQuery.rows.forEach((row, i) => {
                console.log(`  ${i + 1}. Product: "${row.name}" (ID: ${row.id})`);
                if (row.coll_id) {
                    console.log(`     └─ Collection: "${row.coll_name}" (ID: ${row.coll_id}, Slug: ${row.coll_slug})`);
                } else {
                    console.log('     └─ No collection linked');
                }
            });
        }

        // 4. Check collection_product_variants table
        console.log('\n\n🔍 Checking collection_product_variants_product_variant table:\n');
        const collProdVar = await pool.query(`
            SELECT COUNT(*) as cnt FROM collection_product_variants_product_variant
        `);
        console.log(`   Rows: ${collProdVar.rows[0].cnt}`);

        if (collProdVar.rows[0].cnt > 0) {
            const samples = await pool.query(`
                SELECT * FROM collection_product_variants_product_variant LIMIT 3
            `);
            console.log('\n   Columns:', Object.keys(samples.rows[0]));
            console.log('\n   Sample data:');
            samples.rows.forEach(row => {
                console.log(`     - Collection ID: ${row.collectionid}, Product Variant ID: ${row.productvariantid}`);
            });
        }

        // 5. Get actual collections
        console.log('\n\n📚 Sample Collections:\n');
        const collections = await pool.query(`
            SELECT DISTINCT c.id, ct.name, ct.slug
            FROM collection c
            JOIN collection_translation ct ON c.id = ct."baseId"
            WHERE ct."languageCode" IN ('en', 'fr') AND c."isRoot" = false
            LIMIT 5
        `);

        collections.rows.forEach((c, i) => {
            console.log(`  ${i + 1}. "${c.name}" (ID: ${c.id}, Slug: ${c.slug})`);
        });

        console.log('\n' + '='.repeat(70) + '\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Details:', error);
    } finally {
        await pool.end();
    }
}

checkProductsWithCollections();
