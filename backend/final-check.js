const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'ahizan',
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'admin',
});

async function checkProductsViaVariants() {
    try {
        console.log('\n📦 Products and Collections Analysis (via Product Variants)\n');
        console.log('='.repeat(70));

        // 1. Get products linked to collections via product variants
        console.log('\n✅ Finding products linked to collections via variants:\n');
        
        const query = await pool.query(`
            SELECT 
                p.id as product_id,
                pt.name as product_name,
                pv.id as variant_id,
                c.id as collection_id,
                ct.name as collection_name,
                ct.slug as collection_slug
            FROM product p
            JOIN product_translation pt ON p.id = pt."baseId" AND pt."languageCode" = 'en'
            LEFT JOIN product_variant pv ON p.id = pv."productId"
            LEFT JOIN collection_product_variants_product_variant cpv ON pv.id = cpv."productVariantId"
            LEFT JOIN collection c ON cpv."collectionId" = c.id
            LEFT JOIN collection_translation ct ON c.id = ct."baseId" AND ct."languageCode" = 'en'
            WHERE cpv."collectionId" IS NOT NULL
            LIMIT 20
        `);

        if (query.rows.length === 0) {
            console.log('❌ No products linked via product variants to collections\n');
            
            // Show products anyway
            console.log('📋 Sample Products (first 5):\n');
            const sampleProds = await pool.query(`
                SELECT 
                    p.id, 
                    pt.name,
                    (SELECT COUNT(*) FROM product_variant WHERE "productId" = p.id) as variant_count
                FROM product p
                JOIN product_translation pt ON p.id = pt."baseId"
                WHERE pt."languageCode" = 'en'
                LIMIT 5
            `);
            
            sampleProds.rows.forEach((p, i) => {
                console.log(`  ${i + 1}. "${p.name}" (Product ID: ${p.id}, Variants: ${p.variant_count})`);
            });
            
        } else {
            console.log(`✅ Found ${query.rows.length} product-variant-collection links!\n`);
            console.log('📋 Sample Products with Collections:\n');
            
            const groupedByProduct = {};
            query.rows.forEach(row => {
                const key = `${row.product_id}_${row.product_name}`;
                if (!groupedByProduct[key]) {
                    groupedByProduct[key] = {
                        product_id: row.product_id,
                        product_name: row.product_name,
                        collections: new Set()
                    };
                }
                if (row.collection_name) {
                    groupedByProduct[key].collections.add(
                        `${row.collection_name} (ID: ${row.collection_id}, Slug: ${row.collection_slug})`
                    );
                }
            });

            let count = 0;
            for (const [key, data] of Object.entries(groupedByProduct)) {
                if (count >= 5) break;
                count++;
                console.log(`  ${count}. Product: "${data.product_name}" (ID: ${data.product_id})`);
                if (data.collections.size > 0) {
                    Array.from(data.collections).forEach((coll, idx) => {
                        console.log(`     └─ Collection: ${coll}`);
                    });
                } else {
                    console.log('     └─ No collection linked');
                }
                console.log('');
            }
        }

        // 2. Show all collections
        console.log('\n📚 All Collections in Database:\n');
        const collections = await pool.query(`
            SELECT DISTINCT c.id, ct.name, ct.slug
            FROM collection c
            LEFT JOIN collection_translation ct ON c.id = ct."baseId"
            WHERE c."isRoot" = false
            ORDER BY c.id
        `);

        collections.rows.forEach((c, i) => {
            console.log(`  ${i + 1}. "${c.name}" (ID: ${c.id}, Slug: ${c.slug})`);
        });

        // 3. Statistics
        console.log('\n\n📊 Statistics:\n');
        const stats = await pool.query(`
            SELECT 
                (SELECT COUNT(*) FROM product) as total_products,
                (SELECT COUNT(*) FROM product_variant) as total_variants,
                (SELECT COUNT(DISTINCT "productVariantId") FROM collection_product_variants_product_variant) as variants_in_collections,
                (SELECT COUNT(DISTINCT "collectionId") FROM collection_product_variants_product_variant) as collections_with_variants
        `);

        const s = stats.rows[0];
        console.log(`   • Total Products: ${s.total_products}`);
        console.log(`   • Total Product Variants: ${s.total_variants}`);
        console.log(`   • Product Variants linked to collections: ${s.variants_in_collections}`);
        console.log(`   • Collections with variants: ${s.collections_with_variants}`);

        console.log('\n' + '='.repeat(70) + '\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

checkProductsViaVariants();
