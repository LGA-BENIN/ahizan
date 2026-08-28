const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'ahizan_local',
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'admin',
});

async function check() {
    try {
        const facets = await pool.query(`SELECT count(*) FROM facet`);
        const facetTrans = await pool.query(`SELECT count(*) FROM facet_translation`);
        console.log(`Facets: ${facets.rows[0].count}, Facet Translations: ${facetTrans.rows[0].count}`);

        const facetValues = await pool.query(`SELECT count(*) FROM facet_value`);
        const facetValueTrans = await pool.query(`SELECT count(*) FROM facet_value_translation`);
        console.log(`Facet Values: ${facetValues.rows[0].count}, Facet Value Translations: ${facetValueTrans.rows[0].count}`);

        const collections = await pool.query(`SELECT count(*) FROM collection`);
        const collectionTrans = await pool.query(`SELECT count(*) FROM collection_translation`);
        console.log(`Collections: ${collections.rows[0].count}, Collection Translations: ${collectionTrans.rows[0].count}`);

    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
check();
