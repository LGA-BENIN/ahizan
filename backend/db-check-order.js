const { Pool } = require('pg');

async function run() {
    const pool = new Pool({
        host: '127.0.0.1',
        port: 5432,
        user: 'postgres',
        password: 'admin',
        database: 'ahizan'
    });

    try {
        // Check vendor role permissions
        console.log('--- Vendor Role Permissions ---');
        const roleRes = await pool.query(`
            SELECT r.id, r.code, r.description
            FROM "role" r
            WHERE r.code = 'vendor'
        `);
        if (roleRes.rows.length > 0) {
            const roleId = roleRes.rows[0].id;
            console.log('Vendor Role:', JSON.stringify(roleRes.rows[0], null, 2));
            
            // Check permissions via role_permissions table or similar
            // In Vendure, permissions are stored as an array on the role entity
            const permRes = await pool.query(`
                SELECT * FROM "role" WHERE id = $1
            `, [roleId]);
            console.log('\nFull Role Record (check for permissions column):');
            const cols = Object.keys(permRes.rows[0]);
            console.log('Columns:', cols);
            console.log('Row:', JSON.stringify(permRes.rows[0], null, 2));
        }

        // Check if there's a role_channels_channel table
        console.log('\n--- Role Channel assignments ---');
        const rcRes = await pool.query(`
            SELECT rc."roleId", rc."channelId", r.code 
            FROM "role_channels_channel" rc
            JOIN "role" r ON r.id = rc."roleId"
            WHERE r.code = 'vendor'
        `);
        console.log('Channels:', JSON.stringify(rcRes.rows, null, 2));
        
        // Also check if user 60 is associated with any customer
        console.log('\n--- Customer for User 60 ---');
        const custRes = await pool.query(`
            SELECT c.id, c."firstName", c."lastName", c."emailAddress", c."userId" 
            FROM "customer" c
            WHERE c."userId" = 60
        `);
        console.log('Customer:', JSON.stringify(custRes.rows, null, 2));
        
        // Check the Order's customerId vs this customer
        console.log('\n--- Order Customer Check ---');
        const orderCustRes = await pool.query(`
            SELECT c.id, c."firstName", c."lastName", c."emailAddress", c."userId" 
            FROM "customer" c
            WHERE c.id = 45
        `);
        console.log('Order Customer (ID=45):', JSON.stringify(orderCustRes.rows, null, 2));

    } catch(e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

run();
