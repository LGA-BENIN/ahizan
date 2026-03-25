const { Client } = require('pg');

async function fixAll() {
    const client = new Client({
        user: 'postgres',
        host: '127.0.0.1',
        database: 'ahizan',
        password: 'admin',
        port: 5432,
    });

    try {
        await client.connect();

        // 1. Get Default Channel
        const channelRes = await client.query("SELECT id FROM channel WHERE code = '__default_channel__'");
        if (channelRes.rows.length === 0) throw new Error('Default channel not found');
        const channelId = channelRes.rows[0].id;

        // 2. Find Users with Administrator but NO Customer
        const res = await client.query(`
            SELECT u.id, u.identifier
            FROM "user" u
            JOIN "administrator" a ON a."userId" = u.id
            LEFT JOIN "customer" c ON c."userId" = u.id
            WHERE c.id IS NULL
        `);

        console.log(`Found ${res.rows.length} users needing repair.`);

        for (const user of res.rows) {
            console.log(`Fixing user: ${user.identifier} (ID: ${user.id})`);
            try {
                await client.query('BEGIN');

                const now = new Date();
                const insertRes = await client.query(`
                    INSERT INTO customer ("createdAt", "updatedAt", "firstName", "lastName", "emailAddress", "userId")
                    VALUES ($1, $2, $3, $4, $5, $6)
                    RETURNING id
                `, [now, now, 'Vendor', 'Repaired', user.identifier, user.id]);

                const customerId = insertRes.rows[0].id;

                await client.query(`
                    INSERT INTO customer_channels_channel ("customerId", "channelId")
                    VALUES ($1, $2)
                `, [customerId, channelId]);

                await client.query('COMMIT');
                console.log(`  -> Fixed! Customer ID: ${customerId}`);
            } catch (err) {
                await client.query('ROLLBACK');
                console.error(`  -> Failed to fix ${user.identifier}:`, err);
            }
        }

    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}

fixAll();
