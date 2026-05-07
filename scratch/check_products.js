const { Client } = require('pg');

async function run() {
  const client = new Client({
    host: '127.0.0.1', port: 5432, user: 'postgres', password: 'admin', database: 'ahizan_local',
  });
  await client.connect();
  
  const products = await client.query(`
    SELECT p.id, pt.name, p."enabled"
    FROM product p 
    JOIN product_translation pt ON p.id = pt."baseId"
  `);
  console.log('--- PRODUCTS ---');
  console.log(JSON.stringify(products.rows, null, 2));

  // Check custom fields for vendor
  const vendorProducts = await client.query(`
    SELECT "id", "customFieldsVendorid"
    FROM product
  `);
  console.log('\n--- VENDOR PRODUCTS (Custom Fields) ---');
  console.log(JSON.stringify(vendorProducts.rows, null, 2));

  await client.end();
}

run().catch(console.error);
