const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'ahizan',
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'admin',
});

async function check() {
    try {
        console.log("Checking links between products and collections...");
        const res = await pool.query(`
            SELECT p.id as product_id, pt.name as product_name, c.id as collection_id, ct.name as collection_name
            FROM product p
            JOIN product_translation pt ON p.id = pt."baseId"
            JOIN product_variant pv ON p.id = pv."productId"
            JOIN collection_product_variants_product_variant cpv ON pv.id = cpv."productVariantId"
            JOIN collection c ON cpv."collectionId" = c.id
            JOIN collection_translation ct ON c.id = ct."baseId"
            WHERE pt."languageCode" = 'fr' AND ct."languageCode" = 'fr'
            LIMIT 10
        `);
        console.log("Sample Linked Products:", res.rows);

        const count = await pool.query(`
            SELECT count(distinct p.id) as linked_products
            FROM product p
            JOIN product_variant pv ON p.id = pv."productId"
            JOIN collection_product_variants_product_variant cpv ON pv.id = cpv."productVariantId"
        `);
        
        const total = await pool.query(`SELECT count(*) as total FROM product`);
        
        console.log(`Total products: ${total.rows[0].total}`);
        console.log(`Products linked to a collection: ${count.rows[0].linked_products}`);
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}

check();
