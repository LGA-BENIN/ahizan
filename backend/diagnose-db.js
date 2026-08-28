const { Client } = require('pg');

console.log('=== Database Connection Test ===\n');

const configs = [
    { host: '127.0.0.1', port: 5432, user: 'postgres', password: '', database: 'vendure', name: 'Default' },
    { host: 'localhost', port: 5432, user: 'postgres', password: '', database: 'vendure', name: 'Localhost' },
    { host: '127.0.0.1', port: 5432, user: 'postgres', password: 'postgres', database: 'vendure', name: 'With password' },
];

async function testConfig(config) {
    const client = new Client(config);
    try {
        console.log(`Testing ${config.name}...`);
        await client.connect();
        console.log(`  ✓ Connected successfully`);
        
        const result = await client.query('SELECT NOW()');
        console.log(`  ✓ Server time: ${result.rows[0].now}`);
        
        const tables = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            LIMIT 5
        `);
        console.log(`  ✓ Sample tables: ${tables.rows.map(r => r.table_name).join(', ')}`);
        
        await client.end();
        return true;
    } catch (error) {
        console.log(`  ✗ Failed: ${error.message}`);
        await client.end().catch(() => {});
        return false;
    }
}

async function run() {
    for (const config of configs) {
        const success = await testConfig(config);
        if (success) {
            console.log(`\n✅ Working config found: ${config.name}`);
            console.log(`   Host: ${config.host}`);
            console.log(`   Port: ${config.port}`);
            console.log(`   User: ${config.user}`);
            console.log(`   Database: ${config.database}`);
            process.exit(0);
        }
    }
    
    console.log('\n❌ No working configuration found');
    console.log('Please check:');
    console.log('  1. Is PostgreSQL running?');
    console.log('  2. What are the correct connection details?');
    console.log('  3. Is the database "vendure" created?');
    process.exit(1);
}

run();
