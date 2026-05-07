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

        // 1. Get all valid collection IDs
        const collectionsResult = await pool.query(`
            SELECT c.id, ct.name
            FROM collection c
            LEFT JOIN collection_translation ct ON c.id = ct."baseId" AND ct."languageCode" = 'en'
            WHERE c."isRoot" = false
            ORDER BY c.id
        `);

        const collections = collectionsResult.rows;
        console.log(`✅ Found ${collections.length} collections\n`);

        if (collections.length === 0) {
            console.log('❌ Error: no collections found\n');
            return;
        }

        // 2. Get all product variants (these must exist)
        const variantsResult = await pool.query(`
            SELECT DISTINCT pv.id, p.id as product_id, pt.name
            FROM product_variant pv
            JOIN product p ON pv."productId" = p.id
            JOIN product_translation pt ON p.id = pt."baseId" AND pt."languageCode" = 'en'
            ORDER BY pv.id
        `);

        const variants = variantsResult.rows;
        console.log(`✅ Found ${variants.length} product variants\n`);

        if (variants.length === 0) {
            console.log('❌ Error: no variants found\n');
            return;
        }

        // 3. Build assignment plan (round-robin)
        console.log('📋 Assignment Strategy: Round-robin distribution\n');
        const assignmentPlan = variants.map((variant, idx) => {
            const collectionIdx = idx % collections.length;
            const collection = collections[collectionIdx];
            return {
                variantId: variant.id,
                productId: variant.product_id,
                productName: variant.name,
                collectionId: collection.id,
                collectionName: collection.name
            };
        });

        // 4. Preview
        console.log('📊 PREVIEW:\n');
        console.log('First 5 assignments:');
        assignmentPlan.slice(0, 5).forEach((a, i) => {
            console.log(`  ${i + 1}. Variant ${a.variantId} ("${a.productName}") → "${a.collectionName}"`);
        });
        console.log(`\n  ... (${assignmentPlan.length - 10} more) ...\n`);
        console.log('Last 5 assignments:');
        assignmentPlan.slice(-5).forEach((a, i) => {
            console.log(`  ${assignmentPlan.length - 4 + i}. Variant ${a.variantId} ("${a.productName}") → "${a.collectionName}"`);
        });

        console.log('\n' + '='.repeat(80));
        console.log(`📊 Will create ${assignmentPlan.length} product-variant-to-collection assignments`);
        console.log('='.repeat(80) + '\n');

        // 5. Execute
        console.log('⚙️  EXECUTING ASSIGNMENTS...\n');

        let success = 0;
        let skipped = 0;
        let errors = 0;
        const errorLog = [];

        for (let i = 0; i < assignmentPlan.length; i++) {
            const assignment = assignmentPlan[i];
            try {
                // Check if already exists (SELECT 1 since table has no id column)
                const check = await pool.query(
                    'SELECT 1 FROM collection_product_variants_product_variant WHERE "collectionId" = $1 AND "productVariantId" = $2',
                    [assignment.collectionId, assignment.variantId]
                );

                if (check.rows.length === 0) {
                    // Insert
                    await pool.query(
                        'INSERT INTO collection_product_variants_product_variant ("collectionId", "productVariantId") VALUES ($1, $2)',
                        [assignment.collectionId, assignment.variantId]
                    );
                    success++;
                } else {
                    skipped++;
                }

                if ((i + 1) % 50 === 0) {
                    console.log(`  ✓ Processed ${i + 1}/${assignmentPlan.length}...`);
                }
            } catch (err) {
                errors++;
                errorLog.push({
                    variant: assignment.variantId,
                    product: assignment.productName,
                    collection: assignment.collectionName,
                    error: err.message.substring(0, 80)
                });
            }
        }

        console.log(`\n✅ Completed!\n`);
        console.log(`   • New relationships created: ${success}`);
        console.log(`   • Already existing (skipped): ${skipped}`);
        if (errors > 0) {
            console.log(`   • Errors: ${errors}\n`);
            errorLog.slice(0, 5).forEach(e => {
                console.log(`     - Variant ${e.variant} ("${e.product}") → "${e.collection}"`);
                console.log(`       Error: ${e.error}`);
            });
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

        // Per-collection breakdown
        console.log('📚 Distribution per Collection:\n');
        const distribution = await pool.query(`
            SELECT 
                c.id,
                ct.name,
                COUNT(cpv."productVariantId") as variant_count
            FROM collection c
            LEFT JOIN collection_translation ct ON c.id = ct."baseId" AND ct."languageCode" = 'en'
            LEFT JOIN collection_product_variants_product_variant cpv ON c.id = cpv."collectionId"
            WHERE c."isRoot" = false
            GROUP BY c.id, ct.name
            ORDER BY c.id
        `);

        distribution.rows.forEach(row => {
            const count = row.variant_count || 0;
            const pct = s.unique_variants > 0 ? ((count / s.unique_variants) * 100).toFixed(1) : 0;
            console.log(`   • "${row.name}": ${count} variants (${pct}%)`);
        });

        console.log('\n' + '='.repeat(80));
        console.log('✅ ASSIGNMENT COMPLETE!\n');
        console.log('All products are now linked to collections.');
        console.log('Facet filters will be available on the storefront collection pages.\n');

    } catch (error) {
        console.error('❌ Fatal Error:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        await pool.end();
    }
}

bulkAssignAllProductsToCollections();
