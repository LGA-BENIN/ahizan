const { Client } = require('pg');
require('dotenv').config();

async function run() {
    const client = new Client({
        host: process.env.DB_HOST || '127.0.0.1',
        port: +(process.env.DB_PORT || 5432),
        user: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'vendure',
    });

    try {
        await client.connect();
        console.log('Connected to DB');

        // 1. Insert Benin into region
        console.log('Inserting Benin into region table...');
        const regionRes = await client.query(
            'INSERT INTO region (code, type, enabled, discriminator, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING id',
            ['BJ', 'country', true, 'Country']
        );
        const regionId = regionRes.rows[0].id;
        console.log('Inserted Benin with ID:', regionId);

        // 2. Insert translations
        console.log('Inserting translations...');
        await client.query(
            'INSERT INTO region_translation ("languageCode", name, "baseId", "createdAt", "updatedAt") VALUES ($1, $2, $3, NOW(), NOW())',
            ['fr', 'Bénin', regionId]
        );
        await client.query(
            'INSERT INTO region_translation ("languageCode", name, "baseId", "createdAt", "updatedAt") VALUES ($1, $2, $3, NOW(), NOW())',
            ['en', 'Benin', regionId]
        );
        console.log('Inserted translations');

        // 3. Assign to all channels
        // Note: In Vendure v3, the table might be region_channels_channel
        const channelsRes = await client.query('SELECT id FROM channel');
        for (const channel of channelsRes.rows) {
             try {
                await client.query(
                    'INSERT INTO region_channels_channel ("regionId", "channelId") VALUES ($1, $2)',
                    [regionId, channel.id]
                );
                console.log(`Assigned to channel ${channel.id}`);
             } catch (e) {
                 console.log(`Failed to assign to channel ${channel.id} (might already exist or table name wrong):`, e.message);
             }
        }

        console.log('SUCCESS: Benin is enabled and assigned.');

    } catch (err) {
        console.error('DATABASE ERROR:', err);
    } finally {
        await client.end();
        console.log('Connection closed.');
    }
}

run();
