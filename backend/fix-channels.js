const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'ahizan_local',
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'admin',
});

async function fixChannels() {
    try {
        await pool.query('BEGIN');

        console.log('--- FIXING FACET CHANNELS ---');
        // Find facets without a channel
        const unassignedFacets = await pool.query(`
            SELECT f.id 
            FROM facet f
            LEFT JOIN facet_channels_channel fc ON f.id = fc."facetId"
            WHERE fc."channelId" IS NULL
        `);
        
        console.log(`Found ${unassignedFacets.rowCount} facets without a channel.`);
        
        let facetInserts = 0;
        for (const row of unassignedFacets.rows) {
            await pool.query(`
                INSERT INTO facet_channels_channel ("facetId", "channelId")
                VALUES ($1, 1)
                ON CONFLICT DO NOTHING
            `, [row.id]);
            facetInserts++;
        }
        console.log(`Assigned ${facetInserts} facets to the default channel.`);

        console.log('\n--- FIXING COLLECTION CHANNELS ---');
        // Find collections without a channel
        const unassignedCollections = await pool.query(`
            SELECT c.id 
            FROM collection c
            LEFT JOIN collection_channels_channel cc ON c.id = cc."collectionId"
            WHERE cc."channelId" IS NULL
        `);
        
        console.log(`Found ${unassignedCollections.rowCount} collections without a channel.`);
        
        let collectionInserts = 0;
        for (const row of unassignedCollections.rows) {
            await pool.query(`
                INSERT INTO collection_channels_channel ("collectionId", "channelId")
                VALUES ($1, 1)
                ON CONFLICT DO NOTHING
            `, [row.id]);
            collectionInserts++;
        }
        console.log(`Assigned ${collectionInserts} collections to the default channel.`);

        console.log('\n--- FIXING FACET VALUE CHANNELS ---');
        // Facet values also need channel assignments in Vendure
        const unassignedFacetValues = await pool.query(`
            SELECT fv.id 
            FROM facet_value fv
            LEFT JOIN facet_value_channels_channel fvc ON fv.id = fvc."facetValueId"
            WHERE fvc."channelId" IS NULL
        `);
        
        console.log(`Found ${unassignedFacetValues.rowCount} facet values without a channel.`);
        
        let facetValueInserts = 0;
        for (const row of unassignedFacetValues.rows) {
            await pool.query(`
                INSERT INTO facet_value_channels_channel ("facetValueId", "channelId")
                VALUES ($1, 1)
                ON CONFLICT DO NOTHING
            `, [row.id]);
            facetValueInserts++;
        }
        console.log(`Assigned ${facetValueInserts} facet values to the default channel.`);

        await pool.query('COMMIT');
        console.log('\n✅ Successfully fixed channel visibility for all items!');

    } catch (e) {
        await pool.query('ROLLBACK');
        console.error('❌ Error during fix:', e.message);
    } finally {
        await pool.end();
    }
}

fixChannels();
