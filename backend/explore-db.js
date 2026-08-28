const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'ahizan',
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'admin',
});

async function exploreDatabase() {
    try {
        console.log('\n📊 Exploring Database Structure\n');

        // List all tables
        const result = await pool.query(`
            SELECT table_name FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        `);

        console.log('✅ All tables in database:\n');
        result.rows.forEach(row => console.log(`  - ${row.table_name}`));

        // Check specific tables
        const tables = ['product', 'collection', 'product_collection_relation', 'product_translation', 'collection_translation'];
        
        console.log('\n\n📋 Detailed Table Schemas:\n');
        
        for (const tableName of tables) {
            try {
                const checkTable = await pool.query(`
                    SELECT COUNT(*) FROM information_schema.tables 
                    WHERE table_schema = 'public' AND table_name = $1
                `, [tableName]);
                
                if (checkTable.rows[0].count === 0) {
                    console.log(`❌ Table '${tableName}' not found\n`);
                    continue;
                }
                
                console.log(`✅ Table: ${tableName}`);
                
                const columns = await pool.query(`
                    SELECT column_name, data_type FROM information_schema.columns 
                    WHERE table_name = $1 ORDER BY ordinal_position
                `, [tableName]);
                
                columns.rows.forEach(col => {
                    console.log(`     - ${col.column_name} (${col.data_type})`);
                });
                
                const rowCount = await pool.query(`SELECT COUNT(*) as cnt FROM ${tableName}`);
                console.log(`   Rows: ${rowCount.rows[0].cnt}\n`);
            } catch (e) {
                console.log(`❌ Error querying ${tableName}: ${e.message}\n`);
            }
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

exploreDatabase();
