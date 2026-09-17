const { DataSource } = require('typeorm');

async function run() {
    const ds = new DataSource({
        type: 'postgres',
        host: 'db',
        username: 'postgres',
        password: 'Fernand0@91820805',
        database: 'postgres',
    });
    await ds.initialize();

    const numericVendorId = 59;
    const vendorChannelId = 30;

    const lineRows = await ds.query(`
        SELECT 
            ol.id as line_id,
            ol."orderId" as order_id,
            ol."listPrice" as list_price,
            ol.quantity as quantity,
            (ol."listPrice" * ol.quantity) as line_gross,
            o."customFieldsCommissionrate" as commission_rate,
            o."customFieldsVendorstatuses" as vendor_statuses,
            o."customFieldsPaymentstatus" as global_payment_status,
            o.state as order_state
        FROM order_line ol
        INNER JOIN "order" o ON ol."orderId" = o.id
        INNER JOIN product_variant pv ON ol."productVariantId" = pv.id
        INNER JOIN product p ON pv."productId" = p.id
        WHERE o."aggregateOrderId" IS NULL
          AND (
              ol."customFieldsAssignedvendorid" = $1 
              OR (
                  ol."customFieldsAssignedvendorid" IS NULL
                  AND (p."customFieldsVendorid" = $1 OR (p."customFieldsVendorid" IS NULL AND ol."sellerChannelId" = $2))
              )
          )
          AND COALESCE(ol."customFieldsSellerstatus", 'pending') NOT IN ('refused', 'reassigned_to_other')
          AND ol.quantity > 0
          AND o.state IN ('PaymentSettled', 'PaymentAuthorized', 'Shipped', 'Delivered')
        ORDER BY o.id DESC
    `, [numericVendorId, vendorChannelId]);

    console.log("Wallet lines for vendor 59:", JSON.stringify(lineRows, null, 2));

    await ds.destroy();
}
run().catch(console.error);
