const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'ahizan_local',
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'admin',
});

async function checkVisibility() {
    try {
        console.log('--- CHECKING COLLECTION VISIBILITY ---');
        // Check for soft deletes


        // Check channel assignments for collections
        const collChannels = await pool.query(`
            SELECT c.id, ct.name, count(cc."channelId") as channel_count
            FROM collection c
            LEFT JOIN collection_translation ct ON c.id = ct."baseId" AND ct."languageCode" = 'en'
            LEFT JOIN collection_channels_channel cc ON c.id = cc."collectionId"
            GROUP BY c.id, ct.name
            ORDER BY channel_count ASC
        `);
        console.log('Collections and their channel counts (0 means it won\'t show up in any channel):');
        console.table(collChannels.rows.filter(r => r.channel_count === '0'));

        console.log('\n--- CHECKING FACET VISIBILITY ---');
        // Check for soft deletes


        // Check channel assignments for facets
        const facetChannels = await pool.query(`
            SELECT f.id, f.code, ft.name, count(fc."channelId") as channel_count
            FROM facet f
            LEFT JOIN facet_translation ft ON f.id = ft."baseId" AND ft."languageCode" = 'en'
            LEFT JOIN facet_channels_channel fc ON f.id = fc."facetId"
            GROUP BY f.id, f.code, ft.name
            ORDER BY channel_count ASC
        `);
        console.log('Facets and their channel counts (0 means it won\'t show up in any channel):');
        console.table(facetChannels.rows);

        // Let's also find which 4 facets DO show up
        console.log('\nFacets that are assigned to channels:');
        console.table(facetChannels.rows.filter(r => r.channel_count > 0));

    } catch (e) {
        console.error(e.message);
    } finally {
        await pool.end();
    }
}
checkVisibility();
