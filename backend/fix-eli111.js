const { Client } = require('pg');

async function fix() {
    const client = new Client({
        user: 'postgres',
        host: '127.0.0.1',
        database: 'ahizan',
        password: 'admin',
        port: 5432,
    });

    try {
        await client.connect();
        await client.query('BEGIN');

        // 1. Get Channel ID
        const channelRes = await client.query("SELECT id FROM channel WHERE code = '__default_channel__'");
        if (channelRes.rows.length === 0) throw new Error('Default channel not found');
        const channelId = channelRes.rows[0].id;
        console.log(`Default Channel ID: ${channelId}`);

        // 2. Insert Customer
        const email = 'eli111@gmail.com';
        const userId = 28;
        const now = new Date();

        const insertRes = await client.query(`
            INSERT INTO customer ("createdAt", "updatedAt", "firstName", "lastName", "emailAddress", "userId")
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id
        `, [now, now, 'Vendor', 'Fix', email, userId]);

        const customerId = insertRes.rows[0].id;
        console.log(`Created Customer ID: ${customerId}`);

        // 3. Link to Channel
        await client.query(`
            INSERT INTO customer_channels_channel ("customerId", "channelId")
            VALUES ($1, $2)
        `, [customerId, channelId]);

        console.log('Linked Customer to Channel');

        await client.query('COMMIT');
        console.log('SUCCESS');

    } catch (e) {
        await client.query('ROLLBACK');
        console.error('FAILED:', e);
    } finally {
        await client.end();
    }
}

fix();
