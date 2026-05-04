const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'ahizan',
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'admin',
});

async function checkVariants() {
    try {
        console.log('\nChecking products and variants...\n');

        const result = await pool.query(`
            SELECT 
                p.id,
                pt.name,
                COUNT(pv.id) as variant_count
            FROM product p
            JOIN product_translation pt ON p.id = pt."baseId" AND pt."languageCode" = 'en'
            LEFT JOIN product_variant pv ON p.id = pv."productId"
            GROUP BY p.id, pt.name
            ORDER BY variant_count DESC
        `);

        // Group by variant count
        const byCount = {};
        result.rows.forEach(row => {
            if (!byCount[row.variant_count]) {
                byCount[row.variant_count] = [];
            }
            byCount[row.variant_count].push(row);
        });

        console.log('Distribution of products by variant count:\n');
        Object.keys(byCount).sort((a, b) => parseInt(a) - parseInt(b)).forEach(count => {
            console.log(`  ${count} variant(s): ${byCount[count].length} products`);
        });

        console.log('\n\nProducts with NO variants (first 10):\n');
        if (byCount[0] && byCount[0].length > 0) {
            byCount[0].slice(0, 10).forEach((p, i) => {
                console.log(`  ${i + 1}. "${p.name}" (ID: ${p.id})`);
            });
        }

        console.log('\n\nProducts WITH variants (first 10):\n');
        if (byCount[1] && byCount[1].length > 0) {
            byCount[1].slice(0, 10).forEach((p, i) => {
                console.log(`  ${i + 1}. "${p.name}" (ID: ${p.id}, Variants: ${p.variant_count})`);
            });
        }

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await pool.end();
    }
}

checkVariants();
