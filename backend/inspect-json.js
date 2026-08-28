require('dotenv').config();
const { Client } = require('pg');

const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: +(process.env.DB_PORT || 5432),
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'ahizan_local',
});

(async () => {
    try {
        await client.connect();
        console.log('Connected to', process.env.DB_NAME);

        // Find every simple-json column that could be corrupted on the collection entity
        const rows = await client.query(`
            SELECT id, "allowedFacetIds",
                   length("allowedFacetIds") AS len,
                   ("allowedFacetIds" = '') AS is_empty,
                   ("allowedFacetIds" IS NULL) AS is_null
            FROM collection_custom_fields
            ORDER BY id
        `);
        console.log('\n=== collection_custom_fields.allowedFacetIds ===');
        rows.rows.forEach(r => {
            console.log(`id=${r.id} | is_null=${r.is_null} | is_empty=${r.is_empty} | len=${r.len} | raw=${JSON.stringify(r.allowedfacetids)}`);
        });

        // Count corrupted (empty string = the killer for simple-json)
        const bad = await client.query(`
            SELECT COUNT(*) c FROM collection_custom_fields
            WHERE "allowedFacetIds" = ''
        `);
        console.log(`\nCorrupted (empty-string) rows: ${bad.rows[0].c}`);

        await client.end();
    } catch (e) {
        console.error('ERROR:', e.message);
        await client.end().catch(() => {});
        process.exit(1);
    }
})();
