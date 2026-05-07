const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'ahizan',
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'admin',
});

async function checkDatabase() {
    try {
        console.log('\n📊 Database Schema Check\n');

        // 1. List all tables
        const tablesResult = await pool.query(`
            SELECT table_name FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        `);

        console.log('📋 Tables in database:\n');
        tablesResult.rows.forEach((row, i) => {
            console.log(`   ${i + 1}. ${row.table_name}`);
        });
        
        // 2. Check products
        console.log('\n\n✅ Checking PRODUCTS:\n');
        const prodCountResult = await pool.query('SELECT COUNT(*) as count FROM product');
        console.log(`   Total Products: ${prodCountResult.rows[0].count}`);
        
        // Get 5 sample products
        const sampleProds = await pool.query('SELECT id, name FROM product LIMIT 5');
        console.log('\n   Sample Products:');
        sampleProds.rows.forEach((p, i) => {
            console.log(`     ${i + 1}. ${p.name} (ID: ${p.id})`);
        });

        // 3. Check collections
        console.log('\n\n✅ Checking COLLECTIONS:\n');
        const collCountResult = await pool.query('SELECT COUNT(*) as count FROM collection');
        console.log(`   Total Collections: ${collCountResult.rows[0].count}`);
        
        // Get 5 sample collections
        const sampleColls = await pool.query('SELECT id, name, slug FROM collection LIMIT 5');
        console.log('\n   Sample Collections:');
        sampleColls.rows.forEach((c, i) => {
            console.log(`     ${i + 1}. ${c.name} (ID: ${c.id}, Slug: ${c.slug})`);
        });

        // 4. Check for relation tables
        console.log('\n\n🔗 Looking for PRODUCT-COLLECTION relations:\n');
        const relationTables = await pool.query(`
            SELECT table_name FROM information_schema.tables 
            WHERE table_schema = 'public' AND (table_name LIKE '%product%collection%' OR table_name LIKE '%collection%product%')
        `);
        
        if (relationTables.rows.length === 0) {
            console.log('   ❌ No direct relation table found');
            console.log('   Checking via product.customFields...\n');
            
            // Check product columns
            const prodCols = await pool.query(`
                SELECT column_name FROM information_schema.columns 
                WHERE table_name = 'product' ORDER BY column_name
            `);
            console.log('   Product columns:');
            prodCols.rows.forEach(col => {
                console.log(`     - ${col.column_name}`);
            });
        } else {
            console.log('   ✅ Relation tables found:');
            relationTables.rows.forEach(rt => {
                console.log(`     - ${rt.table_name}`);
            });
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Code:', error.code);
    } finally {
        await pool.end();
    }
}

checkDatabase();
