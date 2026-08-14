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

    console.log('--- Creating a Test Order in DB for Product 53 (Vendeur2 / userId 15) ---');

    // Insert dummy order
    const orderRes = await client.query(`
        INSERT INTO "order" 
        ("createdAt", "updatedAt", code, state, "active", "currencyCode", "channelId")
        VALUES (NOW(), NOW(), 'TEST_VENDOR2_' || FLOOR(RANDOM()*10000), 'PaymentSettled', false, 'XOF', 1)
        RETURNING id, code, state;
    `);
    const order = orderRes.rows[0];
    console.log('Created Order:', order);

    // Insert order_line for ProductVariant 48 (Product 53, Vendor 31 Vendeur2, userId 15)
    await client.query(`
        INSERT INTO order_line 
        ("createdAt", "updatedAt", "orderId", "productVariantId", quantity)
        VALUES (NOW(), NOW(), $1, 48, 1);
    `, [order.id]);

    console.log('OrderLine inserted for Order', order.id);

    console.log('\n--- Querying Vendor SQL for this Order ---');
    const vendors = await client.query(`
        SELECT DISTINCT v.id as vendor_id, v.name as vendor_name, v."phoneNumber" as phone_number, v.email, v."userId" as user_id
        FROM order_line ol
        INNER JOIN product_variant pv ON ol."productVariantId" = pv.id
        INNER JOIN product p ON pv."productId" = p.id
        INNER JOIN vendor v ON p."customFieldsVendorid" = v.id
        WHERE ol."orderId" = $1 AND v.id IS NOT NULL;
    `, [order.id]);
    console.log('Matched Vendors:', vendors.rows);

    console.log('\n--- Querying SuperAdmin SQL ---');
    const superAdmins = await client.query(`
        SELECT DISTINCT u.id, u.identifier 
        FROM "user" u
        INNER JOIN user_roles_role urr ON urr."userId" = u.id
        INNER JOIN role r ON r.id = urr."roleId"
        WHERE r.code = '__super_admin_role__' OR r.code = 'superadmin' OR u.identifier = 'superadmin';
    `);
    console.log('Matched SuperAdmins:', superAdmins.rows);

    await client.end();
}

main().catch(console.error);
