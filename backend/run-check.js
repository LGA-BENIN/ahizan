const Database = require('better-sqlite3');
const fs = require('fs');

console.log('=== Database Check ===\n');

// Check if SQLite exists
if (fs.existsSync('vendure.sqlite')) {
    console.log('✓ SQLite database file exists');
    const db = new Database('vendure.sqlite', { readonly: true });
    
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
    console.log(`Tables: ${tables.map(t => t.name).join(', ')}\n`);
    
    if (tables.some(t => t.name === 'collection')) {
        const count = db.prepare('SELECT COUNT(*) as count FROM collection').get();
        console.log(`Collections: ${count.count}`);
        
        if (count.count > 0) {
            const sample = db.prepare('SELECT id, "isVisible", "isPrivate" FROM collection LIMIT 5').all();
            console.log('Sample:', JSON.stringify(sample, null, 2));
            
            const transCount = db.prepare('SELECT COUNT(*) as count FROM collection_translation').get();
            console.log(`Translations: ${transCount.count}`);
            
            if (transCount.count > 0) {
                const trans = db.prepare('SELECT "collectionId", name, slug FROM collection_translation LIMIT 5').all();
                console.log('Sample translations:', JSON.stringify(trans, null, 2));
            }
        }
    }
    
    db.close();
} else {
    console.log('✗ SQLite database file not found');
}

console.log('\n=== Check Complete ===');
