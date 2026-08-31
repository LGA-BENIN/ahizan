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

        // Fetch all active channel IDs
        const channelsRes = await client.query('SELECT id FROM channel');
        const channelIds = channelsRes.rows.map(r => r.id);
        console.log('Active channels in database:', channelIds);

        // 1. Delete all existing join tables and configurations
        await client.query('DELETE FROM product_option_group_channels_channel');
        await client.query('DELETE FROM product_option_channels_channel');
        await client.query('DELETE FROM product_option_groups_product_option_group');
        await client.query('DELETE FROM product_variant_options_product_option');

        // 2. Delete translations
        await client.query('DELETE FROM product_option_translation');
        await client.query('DELETE FROM product_option_group_translation');

        // 3. Delete groups and options
        await client.query('DELETE FROM product_option');
        await client.query('DELETE FROM product_option_group');

        console.log('Cleared existing option tables.');

        // 4. Create Option Group: Couleur
        const couleurGroupRes = await client.query(`
            INSERT INTO product_option_group ("createdAt", "updatedAt", code)
            VALUES (CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'couleur')
            RETURNING id
        `);
        const couleurGroupId = couleurGroupRes.rows[0].id;

        await client.query(`
            INSERT INTO product_option_group_translation ("createdAt", "updatedAt", "languageCode", name, "baseId")
            VALUES (CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'fr', 'Couleur', $1),
                   (CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'en', 'Color', $1)
        `, [couleurGroupId]);

        // Assign Couleur Group to all channels
        for (const channelId of channelIds) {
            await client.query(`
                INSERT INTO product_option_group_channels_channel ("productOptionGroupId", "channelId")
                VALUES ($1, $2)
            `, [couleurGroupId, channelId]);
        }

        // Clean options for Couleur
        const colors = [
            { name: 'Bleu', code: 'bleu' },
            { name: 'Rouge', code: 'rouge' },
            { name: 'Vert', code: 'vert' },
            { name: 'Jaune', code: 'jaune' },
            { name: 'Noir', code: 'noir' },
            { name: 'Blanc', code: 'blanc' },
            { name: 'Rose', code: 'rose' },
        ];

        for (const color of colors) {
            const optRes = await client.query(`
                INSERT INTO product_option ("createdAt", "updatedAt", code, "groupId")
                VALUES (CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, $1, $2)
                RETURNING id
            `, [color.code, couleurGroupId]);
            const optId = optRes.rows[0].id;

            await client.query(`
                INSERT INTO product_option_translation ("createdAt", "updatedAt", "languageCode", name, "baseId")
                VALUES (CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'fr', $1, $2),
                       (CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'en', $1, $2)
            `, [color.name, optId]);

            // Assign Option to all channels
            for (const channelId of channelIds) {
                await client.query(`
                    INSERT INTO product_option_channels_channel ("productOptionId", "channelId")
                    VALUES ($1, $2)
                `, [optId, channelId]);
            }
        }

        // 5. Create Option Group: Taille
        const tailleGroupRes = await client.query(`
            INSERT INTO product_option_group ("createdAt", "updatedAt", code)
            VALUES (CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'taille')
            RETURNING id
        `);
        const tailleGroupId = tailleGroupRes.rows[0].id;

        await client.query(`
            INSERT INTO product_option_group_translation ("createdAt", "updatedAt", "languageCode", name, "baseId")
            VALUES (CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'fr', 'Taille', $1),
                   (CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'en', 'Size', $1)
        `, [tailleGroupId]);

        // Assign Taille Group to all channels
        for (const channelId of channelIds) {
            await client.query(`
                INSERT INTO product_option_group_channels_channel ("productOptionGroupId", "channelId")
                VALUES ($1, $2)
            `, [tailleGroupId, channelId]);
        }

        // Clean options for Taille
        const sizes = [
            { name: 'XS', code: 'xs' },
            { name: 'S', code: 's' },
            { name: 'M', code: 'm' },
            { name: 'L', code: 'l' },
            { name: 'XL', code: 'xl' },
            { name: 'XXL', code: 'xxl' },
        ];

        for (const size of sizes) {
            const optRes = await client.query(`
                INSERT INTO product_option ("createdAt", "updatedAt", code, "groupId")
                VALUES (CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, $1, $2)
                RETURNING id
            `, [size.code, tailleGroupId]);
            const optId = optRes.rows[0].id;

            await client.query(`
                INSERT INTO product_option_translation ("createdAt", "updatedAt", "languageCode", name, "baseId")
                VALUES (CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'fr', $1, $2),
                       (CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'en', $1, $2)
            `, [size.name, optId]);

            // Assign Option to all channels
            for (const channelId of channelIds) {
                await client.query(`
                    INSERT INTO product_option_channels_channel ("productOptionId", "channelId")
                    VALUES ($1, $2)
                `, [optId, channelId]);
            }
        }

        console.log('Successfully recreated clean and channel-assigned Couleur and Taille option groups and options!');

    } catch (err) {
        console.error('DATABASE ERROR:', err);
    } finally {
        await client.end();
        console.log('Connection closed.');
    }
}

run();
