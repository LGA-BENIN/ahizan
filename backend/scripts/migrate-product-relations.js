const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

async function runMigration() {
    console.log('=== Starting DB Migration: Product Vendor Relations to SellerOffer ===');
    
    const client = new Client({
        host: process.env.DB_HOST || '127.0.0.1',
        port: parseInt(process.env.DB_PORT || '5432'),
        user: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'postgres',
    });

    try {
        await client.connect();
        console.log('Connected to database successfully.');

        // 1. Verify that seller_offer table exists
        const tableCheck = await client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'seller_offer'
            );
        `);
        
        if (!tableCheck.rows[0].exists) {
            console.error('ERROR: Table "seller_offer" does not exist yet. Please restart the backend server so TypeORM synchronizes and creates it first.');
            process.exit(1);
        }

        // 2. Fetch all products that have customFieldsVendorid set
        console.log('Fetching products with vendor relations...');
        const productsRes = await client.query(`
            SELECT id, "customFieldsVendorid" as "vendorId"
            FROM product
            WHERE "customFieldsVendorid" IS NOT NULL AND "deletedAt" IS NULL
        `);
        
        console.log(`Found ${productsRes.rows.length} products to migrate.`);

        let offerCount = 0;

        for (const product of productsRes.rows) {
            const productId = product.id;
            const vendorId = product.vendorId;

            // Fetch variants for this product
            const variantsRes = await client.query(`
                SELECT id, sku 
                FROM product_variant 
                WHERE "productId" = $1 AND "deletedAt" IS NULL
            `, [productId]);

            for (const variant of variantsRes.rows) {
                const variantId = variant.id;
                const sku = variant.sku;

                // Fetch price for this variant (from product_variant_price)
                const priceRes = await client.query(`
                    SELECT price 
                    FROM product_variant_price 
                    WHERE "variantId" = $1 
                    ORDER BY "createdAt" DESC 
                    LIMIT 1
                `, [variantId]);

                const price = priceRes.rows[0]?.price || 0;

                // Fetch stock for this variant (from stock_level)
                const stockRes = await client.query(`
                    SELECT COALESCE(SUM("stockOnHand"), 0) as stock 
                    FROM stock_level 
                    WHERE "productVariantId" = $1
                `, [variantId]);

                const stock = parseInt(stockRes.rows[0]?.stock || '0');

                // Insert into seller_offer
                await client.query(`
                    INSERT INTO seller_offer (
                        "createdAt", 
                        "updatedAt", 
                        "price", 
                        "stock", 
                        "sku", 
                        "deliveryTimeValue", 
                        "deliveryTimeUnit", 
                        "condition", 
                        "vendorId", 
                        "productVariantId"
                    )
                    VALUES (NOW(), NOW(), $1, $2, $3, 2, 'DAYS', 'NEW', $4, $5)
                    ON CONFLICT ("vendorId", "productVariantId") DO NOTHING
                `, [price, stock, sku, vendorId, variantId]);

                offerCount++;
            }
        }

        console.log(`Successfully migrated ${offerCount} variants into seller_offer.`);
        
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await client.end();
        console.log('Database connection closed.');
    }
}

runMigration();
