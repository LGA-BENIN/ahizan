const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'ahizan',
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'admin',
});

async function bulkAssignProductsToCollections() {
    try {
        console.log('\n' + '='.repeat(80));
        console.log('🚀 BULK PRODUCT-COLLECTION ASSIGNMENT');
        console.log('='.repeat(80) + '\n');

        // 1. Get all products and their variants
        console.log('📥 Fetching products and variants...\n');
        const products = await pool.query(`
            SELECT DISTINCT p.id, pt.name
            FROM product p
            JOIN product_translation pt ON p.id = pt."baseId" AND pt."languageCode" = 'en'
            ORDER BY p.id
        `);

        console.log(`✅ Found ${products.rows.length} products\n`);

        // 2. Get all collections
        const collections = await pool.query(`
            SELECT c.id, ct.name, ct.slug
            FROM collection c
            LEFT JOIN collection_translation ct ON c.id = ct."baseId" AND ct."languageCode" = 'en'
            WHERE c."isRoot" = false
            ORDER BY c.id
        `);

        console.log(`✅ Found ${collections.rows.length} collections\n`);

        if (products.rows.length === 0 || collections.rows.length === 0) {
            console.log('❌ Cannot proceed: missing products or collections\n');
            return;
        }

        // 3. Strategy: Distribute products evenly across collections
        console.log('📋 ASSIGNMENT STRATEGY:\n');
        console.log('   • Distribute products evenly across collections');
        console.log('   • Each product assigned to at least 1 collection');
        console.log('   • Products distributed sequentially\n');

        const assignmentPlan = [];
        products.rows.forEach((product, idx) => {
            // Assign each product to a collection (round-robin)
            const collectionIdx = idx % collections.rows.length;
            const collection = collections.rows[collectionIdx];
            assignmentPlan.push({
                productId: product.id,
                productName: product.name,
                collectionId: collection.id,
                collectionName: collection.name,
                collectionSlug: collection.slug
            });
        });

        // Show preview (first 10 and last 10)
        console.log('📊 PREVIEW OF ASSIGNMENTS:\n');
        console.log('First 10 assignments:');
        assignmentPlan.slice(0, 10).forEach((a, i) => {
            console.log(`  ${i + 1}. "${a.productName}" → "${a.collectionName}"`);
        });

        console.log('\n  ... (160 more assignments) ...\n');

        console.log('Last 10 assignments:');
        assignmentPlan.slice(-10).forEach((a, i) => {
            console.log(`  ${assignmentPlan.length - 9 + i}. "${a.productName}" → "${a.collectionName}"`);
        });

        console.log('\n' + '='.repeat(80));
        console.log(`✅ Total assignments to create: ${assignmentPlan.length}`);
        console.log('='.repeat(80) + '\n');

        // 4. Execute assignments
        console.log('⚙️  EXECUTING ASSIGNMENTS...\n');

        let successCount = 0;
        let errorCount = 0;
        const errors = [];

        for (const assignment of assignmentPlan) {
            try {
                // Get product variants for this product
                const variants = await pool.query(
                    'SELECT id FROM product_variant WHERE "productId" = $1',
                    [assignment.productId]
                );

                // Assign each variant to the collection
                for (const variant of variants.rows) {
                    // Check if already exists
                    const exists = await pool.query(
                        'SELECT id FROM collection_product_variants_product_variant WHERE "collectionId" = $1 AND "productVariantId" = $2',
                        [assignment.collectionId, variant.id]
                    );

                    if (exists.rows.length === 0) {
                        await pool.query(
                            'INSERT INTO collection_product_variants_product_variant ("collectionId", "productVariantId") VALUES ($1, $2)',
                            [assignment.collectionId, variant.id]
                        );
                    }
                }

                successCount++;
            } catch (err) {
                errorCount++;
                errors.push({
                    product: assignment.productName,
                    collection: assignment.collectionName,
                    error: err.message
                });
            }
        }

        console.log(`\n✅ Successfully assigned: ${successCount} products`);
        if (errorCount > 0) {
            console.log(`❌ Errors encountered: ${errorCount}\n`);
            errors.forEach(e => {
                console.log(`   • "${e.product}" → "${e.collection}": ${e.error}`);
            });
        }

        // 5. Verify assignments
        console.log('\n' + '='.repeat(80));
        console.log('✔️  VERIFICATION\n');

        const stats = await pool.query(`
            SELECT 
                (SELECT COUNT(DISTINCT "productVariantId") FROM collection_product_variants_product_variant) as variants_linked,
                (SELECT COUNT(DISTINCT "collectionId") FROM collection_product_variants_product_variant) as collections_used,
                COUNT(*) as total_relations
            FROM collection_product_variants_product_variant
        `);

        const s = stats.rows[0];
        console.log(`   • Product Variants linked: ${s.variants_linked}`);
        console.log(`   • Collections used: ${s.collections_used}`);
        console.log(`   • Total product-collection relations: ${s.total_relations}\n`);

        // Show distribution per collection
        console.log('📊 DISTRIBUTION PER COLLECTION:\n');
        const distribution = await pool.query(`
            SELECT 
                c.id,
                ct.name,
                COUNT(DISTINCT cpv."productVariantId") as variant_count
            FROM collection c
            LEFT JOIN collection_translation ct ON c.id = ct."baseId"
            LEFT JOIN collection_product_variants_product_variant cpv ON c.id = cpv."collectionId"
            WHERE c."isRoot" = false
            GROUP BY c.id, ct.name
            ORDER BY c.id
        `);

        distribution.rows.forEach(row => {
            console.log(`   • "${row.name}": ${row.variant_count || 0} variants`);
        });

        console.log('\n' + '='.repeat(80));
        console.log('✅ BULK ASSIGNMENT COMPLETE!\n');

    } catch (error) {
        console.error('❌ Fatal Error:', error.message);
        console.error(error);
    } finally {
        await pool.end();
    }
}

bulkAssignProductsToCollections();
