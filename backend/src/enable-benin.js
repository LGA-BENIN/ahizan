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
        console.log('Connecting to DB...');
        await client.connect();
        console.log('Connected to DB');

        const res = await client.query('SELECT * FROM country WHERE code = $1', ['BJ']);
        console.log('Benin search result count:', res.rows.length);

        let countryId;
        if (res.rows.length === 0) {
            console.log('Benin code not found, inserting...');
            const insertRes = await client.query(
                'INSERT INTO country (code, name, enabled, "createdAt", "updatedAt") VALUES ($1, $2, $3, NOW(), NOW()) RETURNING id',
                ['BJ', 'Benin', true]
            );
            countryId = insertRes.rows[0].id;
            console.log('Inserted Benin with ID:', countryId);
        } else {
            countryId = res.rows[0].id;
            if (!res.rows[0].enabled) {
                console.log('Benin found but disabled, enabling...');
                await client.query('UPDATE country SET enabled = true WHERE id = $1', [countryId]);
                console.log('Enabled Benin');
            } else {
                console.log('Benin is already enabled');
            }
        }

        const channelsRes = await client.query('SELECT id FROM channel');
        for (const channel of channelsRes.rows) {
            const assignmentRes = await client.query(
                'SELECT * FROM channel_countries_country WHERE "channelId" = $1 AND "countryId" = $2',
                [channel.id, countryId]
            );

            if (assignmentRes.rows.length === 0) {
                console.log(`Assigning Benin to channel ${channel.id}...`);
                await client.query(
                    'INSERT INTO channel_countries_country ("channelId", "countryId") VALUES ($1, $2)',
                    [channel.id, countryId]
                );
                console.log(`Assigned to channel ${channel.id}`);
            } else {
                console.log(`Benin already assigned to channel ${channel.id}`);
            }
        }

        console.log('SUCCESS: Benin is enabled and assigned to all channels.');
    } catch (err) {
        console.error('DATABASE ERROR:', err);
    } finally {
        await client.end();
        console.log('Connection closed.');
    }
}

run();
