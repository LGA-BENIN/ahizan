const { Client } = require('pg');

console.log('=== Fixing Collection Custom Fields ===\n');

const client = new Client({
    host: '127.0.0.1',
    port: 5432,
    user: 'postgres',
    password: '',
    database: 'vendure',
});

async function run() {
    try {
        console.log('Connecting to PostgreSQL...');
        await client.connect();
        console.log('✓ Connected\n');

        // Check current state
        console.log('Checking collection_custom_fields...');
        const check = await client.query('SELECT COUNT(*) as count FROM collection_custom_fields');
        console.log(`Total rows: ${check.rows[0].count}\n`);

        // Fix by setting all allowedFacetIds to NULL
        console.log('Setting all allowedFacetIds to NULL...');
        const result = await client.query('UPDATE collection_custom_fields SET "allowedFacetIds" = NULL');
        console.log(`✓ Updated ${result.rowCount} rows\n`);

        // Verify
        const verify = await client.query('SELECT * FROM collection_custom_fields LIMIT 5');
        console.log('Verification:');
        verify.rows.forEach(row => {
            console.log(`  ID: ${row.id}, allowedFacetIds: ${row.allowedfacetids}`);
        });

        // Check collections count
        const collCount = await client.query('SELECT COUNT(*) as count FROM collection');
        console.log(`\nTotal collections: ${collCount.rows[0].count}`);

        await client.end();
        console.log('\n✅ Fix completed. Please restart the Vendure server.');
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        await client.end().catch(() => {});
        process.exit(1);
    }
}

run();
