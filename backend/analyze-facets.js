const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'ahizan_local',
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'admin',
});

async function analyze() {
    try {
        console.log('--- COLLECTIONS ---');
        const colls = await pool.query(`
            SELECT c.id, c."parentId", ct.name, ct.slug 
            FROM collection c
            JOIN collection_translation ct ON c.id = ct."baseId"
            WHERE ct."languageCode" = 'en' OR ct."languageCode" = 'fr'
        `);
        console.table(colls.rows);

        console.log('\n--- FACETS ---');
        const facets = await pool.query(`
            SELECT f.id, f.code, ft.name 
            FROM facet f
            JOIN facet_translation ft ON f.id = ft."baseId"
            WHERE ft."languageCode" = 'en' OR ft."languageCode" = 'fr'
        `);
        console.table(facets.rows);

        console.log('\n--- FACET VALUES ---');
        const facetValues = await pool.query(`
            SELECT fv.id, fv.code, fv."facetId", fvt.name 
            FROM facet_value fv
            JOIN facet_value_translation fvt ON fv.id = fvt."baseId"
            WHERE fvt."languageCode" = 'en' OR fvt."languageCode" = 'fr'
        `);
        console.table(facetValues.rows);

    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
analyze();
