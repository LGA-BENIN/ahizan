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
        const fs = require('fs');
        let output = '--- COLLECTIONS ---\n';
        const colls = await pool.query(`
            SELECT c.id, c."parentId", ct.name, ct.slug 
            FROM collection c
            JOIN collection_translation ct ON c.id = ct."baseId"
            WHERE ct."languageCode" = 'en'
            ORDER BY c."parentId", c.id
        `);
        for (let row of colls.rows) {
            output += `ID: ${row.id} | Parent: ${row.parentId} | Name: ${row.name} | Slug: ${row.slug}\n`;
        }

        output += '\n--- FACETS ---\n';
        const facets = await pool.query(`
            SELECT f.id, f.code, ft.name 
            FROM facet f
            JOIN facet_translation ft ON f.id = ft."baseId"
            WHERE ft."languageCode" = 'en'
            ORDER BY f.id
        `);
        for (let row of facets.rows) {
            output += `ID: ${row.id} | Code: ${row.code} | Name: ${row.name}\n`;
        }

        output += '\n--- FACET VALUES ---\n';
        const facetValues = await pool.query(`
            SELECT fv.id, fv.code, fv."facetId", fvt.name 
            FROM facet_value fv
            JOIN facet_value_translation fvt ON fv.id = fvt."baseId"
            WHERE fvt."languageCode" = 'en'
            ORDER BY fv."facetId", fv.id
        `);
        for (let row of facetValues.rows) {
            output += `ID: ${row.id} | FacetID: ${row.facetId} | Code: ${row.code} | Name: ${row.name}\n`;
        }
        
        fs.writeFileSync('db-analysis.txt', output);
        console.log('Analysis saved to db-analysis.txt');
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
analyze();
