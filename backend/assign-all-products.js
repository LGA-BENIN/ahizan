const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'ahizan',
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'admin',
});

async function bulkAssignAllProductsToCollections() {
    try {
        console.log('\n' + '='.repeat(80));
        console.log('🚀 BULK PRODUCT-TO-COLLECTION ASSIGNMENT');
        console.log('='.repeat(80) + '\n');

        // 1. Get all products with their variants
        console.log('📥 Fetching products...\n');
        const products = await pool.query(`
            SELECT 
                p.id,
                pt.name,
                COUNT(pv.id) as variant_count
            FROM product p
            JOIN product_translation pt ON p.id = pt."baseId" AND pt."languageCode" = 'en'
            LEFT JOIN product_variant pv ON p.id = pv."productId"
            GROUP BY p.id, pt.name
            ORDER BY p.id
        `);

        console.log(`✅ Found ${products.rows.length} products with ${products.rows.reduce((sum, p) => sum + parseInt(p.variant_count), 0)} variants\n`);

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
            console.log('❌ Error: missing products or collections\n');
            return;
        }

        // 3. Build assignment plan
        console.log('📋 Assignment Strategy: Round-robin distribution\n');
        const assignmentPlan = [];
        products.rows.forEach((product, idx) => {
            const collectionIdx = idx % collections.rows.length;
            const collection = collections.rows[collectionIdx];
            assignmentPlan.push({
                productId: product.id,
                productName: product.name,
                variantCount: product.variant_count,
                collectionId: collection.id,
                collectionName: collection.name
            });
        });

        // 4. Preview
        console.log('📊 PREVIEW (First 5 & Last 5):\n');
        console.log('First 5:');
        assignmentPlan.slice(0, 5).forEach((a, i) => {
            console.log(`  ${i + 1}. "${a.productName}" (${a.variantCount} var.) → "${a.collectionName}"`);
        });
        console.log('\n  ...\n');
        console.log('Last 5:');
        assignmentPlan.slice(-5).forEach((a, i) => {
            console.log(`  ${assignmentPlan.length - 4 + i}. "${a.productName}" (${a.variantCount} var.) → "${a.collectionName}"`);
        });

        console.log('\n' + '='.repeat(80));
        console.log(`📊 Will create ${assignmentPlan.length} product-to-collection assignments`);
        console.log('='.repeat(80) + '\n');

        // 5. Execute assignments
        console.log('⚙️  EXECUTING ASSIGNMENTS...\n');

        let relationshipsCreated = 0;
        let relationshipsSkipped = 0;
        let successCount = 0;
        let errorCount = 0;
        const errors = [];

        for (let i = 0; i < assignmentPlan.length; i++) {
            const assignment = assignmentPlan[i];
            try {
                // Get product variants for this product
                const variants = await pool.query(
                    'SELECT id FROM product_variant WHERE "productId" = $1',
                    [assignment.productId]
                );

                // Assign each variant to the collection
                for (const variant of variants.rows) {
                    // Check if relationship already exists
                    const exists = await pool.query(
                        'SELECT id FROM collection_product_variants_product_variant WHERE "collectionId" = $1 AND "productVariantId" = $2',
                        [assignment.collectionId, variant.id]
                    );

                    if (exists.rows.length === 0) {
                        // Insert new relationship
                        await pool.query(
                            'INSERT INTO collection_product_variants_product_variant ("collectionId", "productVariantId") VALUES ($1, $2)',
                            [assignment.collectionId, variant.id]
                        );
                        relationshipsCreated++;
                    } else {
                        relationshipsSkipped++;
                    }
                }

                successCount++;
                if ((i + 1) % 30 === 0) {
                    process.stdout.write(`  ✓ Processed ${i + 1}/${assignmentPlan.length} products\n`);
                }
            } catch (err) {
                errorCount++;
                errors.push({
                    product: assignment.productName,
                    collection: assignment.collectionName,
                    error: err.message
                });
            }
        }

        console.log(`\n✅ Successfully processed: ${successCount} products`);
        console.log(`📊 Relationships created: ${relationshipsCreated}`);
        console.log(`⏭️  Relationships already exist: ${relationshipsSkipped}`);
        
        if (errorCount > 0) {
            console.log(`\n❌ Errors encountered: ${errorCount}\n`);
            errors.slice(0, 5).forEach(e => {
                console.log(`   • "${e.product}" → "${e.collection}": ${e.error}`);
            });
            if (errors.length > 5) {
                console.log(`   ... and ${errors.length - 5} more errors`);
            }
        }

        // 6. Verify
        console.log('\n' + '='.repeat(80));
        console.log('✔️  VERIFICATION\n');

        const stats = await pool.query(`
            SELECT 
                COUNT(*) as total_relations,
                COUNT(DISTINCT "productVariantId") as unique_variants,
                COUNT(DISTINCT "collectionId") as unique_collections
            FROM collection_product_variants_product_variant
        `);

        const s = stats.rows[0];
        console.log(`   • Total product-variant-collection relations: ${s.total_relations}`);
        console.log(`   • Unique product variants linked: ${s.unique_variants}`);
        console.log(`   • Unique collections used: ${s.unique_collections}\n`);

        // Show per-collection
        console.log('📚 Products per Collection:\n');
        const distribution = await pool.query(`
            SELECT 
                c.id,
                ct.name,
                COUNT(DISTINCT cpv."productVariantId") as variant_count
            FROM collection c
            LEFT JOIN collection_translation ct ON c.id = ct."baseId" AND ct."languageCode" = 'en'
            LEFT JOIN collection_product_variants_product_variant cpv ON c.id = cpv."collectionId"
            WHERE c."isRoot" = false
            GROUP BY c.id, ct.name
            ORDER BY c.id
        `);

        distribution.rows.forEach(row => {
            const pct = ((row.variant_count / s.unique_variants) * 100).toFixed(1);
            console.log(`   • "${row.name}": ${row.variant_count || 0} variants (${pct}%)`);
        });

        console.log('\n' + '='.repeat(80));
        console.log('✅ BULK ASSIGNMENT COMPLETE!\n');
        console.log('Next: Refresh the storefront and visit collection pages to see facet filters.\n');

    } catch (error) {
        console.error('❌ Fatal Error:', error.message);
        console.error(error.stack);
    } finally {
        await pool.end();
    }
}

bulkAssignAllProductsToCollections();
