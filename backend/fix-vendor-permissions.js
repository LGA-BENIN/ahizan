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
        // Get current vendor role permissions
        const roleRes = await pool.query("SELECT id, permissions FROM role WHERE code = 'vendor'");
        if (roleRes.rows.length === 0) {
            console.log('Vendor role not found!');
            return;
        }
        
        const role = roleRes.rows[0];
        console.log('Current vendor permissions:', role.permissions);
        
        // Remove UpdateOrder and ReadOrder from the permissions string
        // These permissions conflict with Vendure's shop API auth guard for mutations like addPaymentToOrder
        const currentPerms = role.permissions.split(',');
        const permsToRemove = ['UpdateOrder', 'ReadOrder'];
        const newPerms = currentPerms.filter(p => !permsToRemove.includes(p.trim()));
        const newPermsStr = newPerms.join(',');
        
        console.log('\nNew vendor permissions:', newPermsStr);
        console.log('\nRemoved:', permsToRemove.filter(p => currentPerms.includes(p)));
        
        // Update the role
        await pool.query("UPDATE role SET permissions = $1 WHERE id = $2", [newPermsStr, role.id]);
        console.log('\n✅ Vendor role permissions updated successfully!');
        console.log('⚠️  You must restart the Vendure backend for changes to take effect.');
        
    } catch(e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

run();
