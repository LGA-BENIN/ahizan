const fs = require('fs');
const { Client } = require('pg');

const output = [];

function log(msg) {
    console.log(msg);
    output.push(msg);
}

const configs = [
    { host: '127.0.0.1', port: 5432, user: 'postgres', password: '', database: 'vendure' },
    { host: '127.0.0.1', port: 6543, user: 'postgres', password: '', database: 'vendure' },
    { host: '127.0.0.1', port: 5432, user: 'postgres', password: 'admin', database: 'vendure' },
    { host: '127.0.0.1', port: 6543, user: 'postgres', password: 'admin', database: 'vendure' },
];

async function tryConnectAndFix() {
    for (const config of configs) {
        try {
            log(`Trying: host=${config.host}, port=${config.port}, password='${config.password}'`);
            const client = new Client(config);
            await client.connect();
            log('✓ Connected successfully!\n');
            
            // Check collection_custom_fields
            log('=== Checking collection_custom_fields ===');
            const checkResult = await client.query('SELECT COUNT(*) as count FROM collection_custom_fields');
            log(`Total custom field rows: ${checkResult.rows[0].count}`);
            
            if (checkResult.rows[0].count > 0) {
                const data = await client.query('SELECT * FROM collection_custom_fields');
                log('\nCurrent data:');
                data.rows.forEach(row => {
                    log(`  ID: ${row.id}, allowedFacetIds: ${JSON.stringify(row.allowedfacetids)}`);
                });
                
                // Fix by setting to NULL
                log('\nSetting all allowedFacetIds to NULL...');
                const result = await client.query('UPDATE collection_custom_fields SET "allowedFacetIds" = NULL');
                log(`✓ Updated ${result.rowCount} rows`);
                
                // Verify
                const verify = await client.query('SELECT * FROM collection_custom_fields LIMIT 3');
                log('\nAfter fix:');
                verify.rows.forEach(row => {
                    log(`  ID: ${row.id}, allowedFacetIds: ${row.allowedfacetids}`);
                });
            } else {
                log('No custom fields found');
            }
            
            // Check collections
            log('\n=== Checking collection table ===');
            const collCount = await client.query('SELECT COUNT(*) as count FROM collection');
            log(`Total collections: ${collCount.rows[0].count}`);
            
            // Check for NULL dates
            const badDates = await client.query(`
                SELECT id, "createdAt", "updatedAt" 
                FROM collection 
                WHERE "createdAt" IS NULL OR "updatedAt" IS NULL
            `);
            
            if (badDates.rows.length > 0) {
                log(`\nFound ${badDates.rows.length} collections with NULL dates`);
                const now = new Date().toISOString();
                const fixResult = await client.query(`
                    UPDATE collection 
                    SET "createdAt" = COALESCE("createdAt", $1), 
                        "updatedAt" = COALESCE("updatedAt", $1)
                    WHERE "createdAt" IS NULL OR "updatedAt" IS NULL
                `, [now]);
                log(`✓ Fixed ${fixResult.rowCount} collections with NULL dates`);
            }
            
            await client.end();
            log('\n✅ Fix completed successfully!');
            
            // Write output to file
            fs.writeFileSync('fix-result.txt', output.join('\n'), 'utf8');
            log('Output saved to fix-result.txt');
            
            process.exit(0);
        } catch (error) {
            log(`✗ Failed: ${error.message}\n`);
        }
    }
    
    log('❌ All connection attempts failed');
    fs.writeFileSync('fix-result.txt', output.join('\n'), 'utf8');
    log('Output saved to fix-result.txt');
    process.exit(1);
}

tryConnectAndFix();
