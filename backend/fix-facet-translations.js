const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'ahizan_local',
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'admin',
});

async function fix() {
    try {
        await pool.query('BEGIN');
        
        // Find facet values that don't have any translation
        const missing = await pool.query(`
            SELECT fv.id, fv.code 
            FROM facet_value fv
            LEFT JOIN facet_value_translation fvt ON fv.id = fvt."baseId"
            WHERE fvt.id IS NULL
        `);
        
        console.log(`Found ${missing.rowCount} facet values missing translations.`);
        
        let inserted = 0;
        for (const row of missing.rows) {
            // Insert English
            await pool.query(`
                INSERT INTO facet_value_translation ("createdAt", "updatedAt", "languageCode", name, "baseId")
                VALUES (CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'en', $1, $2)
            `, [row.code, row.id]);
            
            // Insert French
            await pool.query(`
                INSERT INTO facet_value_translation ("createdAt", "updatedAt", "languageCode", name, "baseId")
                VALUES (CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'fr', $1, $2)
            `, [row.code, row.id]);
            
            inserted += 2;
        }
        
        await pool.query('COMMIT');
        console.log(`Fixed! Inserted ${inserted} missing translations.`);
        
    } catch (e) {
        await pool.query('ROLLBACK');
        console.error(e);
    } finally {
        await pool.end();
    }
}
fix();
