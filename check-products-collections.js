const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'backend', '.env') });

const pool = new Pool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'ahizan',
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'admin',
});

async function checkProductsAndCollections() {
    try {
        console.log('\n📦 Checking Database for Products and Collections...\n');

        // 1. Check if products exist
        const productsResult = await pool.query(`
            SELECT COUNT(*) as count FROM product
        `);
        const productCount = productsResult.rows[0].count;
        console.log(`✅ Total Products in DB: ${productCount}\n`);

        if (productCount === 0) {
            console.log('❌ No products found in database.');
            return;
        }

        // 2. Check product_collection_relation table exists
        const tableCheckResult = await pool.query(`
            SELECT table_name FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = 'product_collection_relation'
        `);

        if (tableCheckResult.rows.length === 0) {
            console.log('⚠️  product_collection_relation table does not exist (products might not be linked to collections)\n');
        }

        // 3. Check for products with collections (5 examples)
        const productsWithCollectionsResult = await pool.query(`
            SELECT 
                p.id,
                p.name,
                c.name as collection_name,
                c.id as collection_id,
                c.slug as collection_slug
            FROM product p
            LEFT JOIN product_collection_relation pcr ON p.id = pcr.productid
            LEFT JOIN collection c ON pcr.collectionid = c.id
            WHERE pcr.collectionid IS NOT NULL
            LIMIT 5
        `);

        if (productsWithCollectionsResult.rows.length === 0) {
            console.log('⚠️  No products linked to collections found.\n');
            
            // Check for products without collections
            const allProductsResult = await pool.query(`
                SELECT id, name FROM product LIMIT 5
            `);
            
            console.log('📦 Sample Products (not linked to any collection):\n');
            allProductsResult.rows.forEach((product, index) => {
                console.log(`  ${index + 1}. ${product.name} (ID: ${product.id})`);
            });
            console.log('\n');
            return;
        }

        console.log('✅ Found products linked to collections!\n');
        console.log('📋 5 Sample Products with Collections:\n');

        // Group by product
        const groupedByProduct = {};
        productsWithCollectionsResult.rows.forEach(row => {
            if (!groupedByProduct[row.id]) {
                groupedByProduct[row.id] = {
                    id: row.id,
                    name: row.name,
                    collections: []
                };
            }
            groupedByProduct[row.id].collections.push({
                id: row.collection_id,
                name: row.collection_name,
                slug: row.collection_slug
            });
        });

        Object.values(groupedByProduct).forEach((product, index) => {
            console.log(`  ${index + 1}. Product: "${product.name}" (ID: ${product.id})`);
            product.collections.forEach((coll, collIndex) => {
                console.log(`     └─ Collection: "${coll.name}" (ID: ${coll.id}, Slug: ${coll.slug})`);
            });
            console.log('');
        });

        // 4. Statistics
        const statsResult = await pool.query(`
            SELECT 
                (SELECT COUNT(*) FROM product) as total_products,
                (SELECT COUNT(DISTINCT productid) FROM product_collection_relation) as products_with_collections,
                (SELECT COUNT(DISTINCT collectionid) FROM product_collection_relation) as collections_with_products
        `);

        const stats = statsResult.rows[0];
        console.log('📊 Statistics:\n');
        console.log(`   • Total Products: ${stats.total_products}`);
        console.log(`   • Products linked to collections: ${stats.products_with_collections}`);
        console.log(`   • Collections with products: ${stats.collections_with_products}`);
        console.log(`   • Coverage: ${((stats.products_with_collections / stats.total_products) * 100).toFixed(1)}%\n`);

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        await pool.end();
    }
}

checkProductsAndCollections();
