const { Client } = require('pg');

async function main() {
    const client = new Client({
        host: 'db',
        port: 5432,
        user: 'postgres',
        password: process.env.DB_PASSWORD || 'Fernand0@91820805',
        database: 'postgres',
    });

    await client.connect();

    console.log('--- Step 1: Query SuperAdmins ---');
    const superAdmins = await client.query(`
        SELECT DISTINCT u.id, u.identifier 
        FROM "user" u
        INNER JOIN user_roles_role urr ON urr."userId" = u.id
        INNER JOIN role r ON r.id = urr."roleId"
        WHERE r.code = '__super_admin_role__' OR r.code = 'superadmin' OR u.identifier = 'superadmin'
    `);
    console.log('SuperAdmins:', superAdmins.rows);

    console.log('\n--- Step 2: Query Vendors for Order 93 ---');
    const vendors = await client.query(`
        SELECT DISTINCT v.id as vendor_id, v.name as vendor_name, v."phoneNumber" as phone_number, v.email, v."userId" as user_id
        FROM order_line ol
        INNER JOIN product_variant pv ON ol."productVariantId" = pv.id
        INNER JOIN product p ON pv."productId" = p.id
        INNER JOIN vendor v ON p."customFieldsVendorid" = v.id
        WHERE ol."orderId" = 93 AND v.id IS NOT NULL
    `);
    console.log('Vendors for Order 93:', vendors.rows);

    console.log('\n--- Step 3: Insert Notifications for Superadmin (userId 1) and Vendor (userId 15) ---');
    
    // Insert for SuperAdmin
    for (const sa of superAdmins.rows) {
        const res = await client.query(`
            INSERT INTO notification_log 
            ("createdAt", "updatedAt", "userId", "eventType", title, body, "actionUrl", "isRead", channel, "sendSuccess")
            VALUES (NOW(), NOW(), $1, 'SYSTEM_EVENT', 'Nouvelle vente ! 🎉', 'Commande #TEST_ORDER_93 d''un montant de 1 000 FCFA enregistrée.', '/orders/93', false, 'IN_APP,PUSH', true)
            RETURNING id, "userId", title;
        `, [sa.id]);
        console.log('Inserted SuperAdmin notification:', res.rows[0]);
    }

    // Insert for Vendor
    for (const v of vendors.rows) {
        if (v.user_id) {
            const res = await client.query(`
                INSERT INTO notification_log 
                ("createdAt", "updatedAt", "userId", "eventType", title, body, "actionUrl", "isRead", channel, "sendSuccess")
                VALUES (NOW(), NOW(), $1, 'SYSTEM_EVENT', 'Nouvelle Vente !', 'Félicitations ! Vous avez reçu une nouvelle commande TEST_ORDER_93.', '/dashboard/orders', false, 'IN_APP,PUSH', true)
                RETURNING id, "userId", title;
            `, [v.user_id]);
            console.log('Inserted Vendor notification:', res.rows[0]);
        }
    }

    console.log('\n--- Step 4: Verify All Recent Notifications ---');
    const recent = await client.query(`
        SELECT id, "userId", "eventType", title, body, "isRead" 
        FROM notification_log 
        ORDER BY id DESC 
        LIMIT 5;
    `);
    console.table(recent.rows);

    await client.end();
}

main().catch(console.error);
