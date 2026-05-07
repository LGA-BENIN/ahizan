const { Client } = require('pg');
require('dotenv').config();

async function findProductCollectionTable() {
    const client = new Client({
        host: process.env.DB_HOST || '127.0.0.1',
        port: +(process.env.DB_PORT || 5432),
        user: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'ahizan',
    });

    try {
        await client.connect();
        
        // Find tables with both 'product' and 'collection' in the name
        const res = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND (table_name LIKE '%product%' OR table_name LIKE '%collection%')
            ORDER BY table_name
        `);
        console.log('Product/Collection related Tables:');
        res.rows.forEach(r => console.log('  -', r.table_name));
        
        // Also check for join tables specifically
        const joinRes = await client.query(`
            SELECT table_name, column_name 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND (column_name LIKE '%product%' OR column_name LIKE '%collection%')
            ORDER BY table_name, column_name
        `);
        console.log('\nColumns with product/collection in name:');
        joinRes.rows.forEach(r => console.log(`  - ${r.table_name}.${r.column_name}`));
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
        process.exit(0);
    }
}
findProductCollectionTable();
