const { Client } = require('pg');

async function run() {
  const client = new Client({
    host: '127.0.0.1',
    port: 5432,
    user: 'postgres',
    password: 'admin',
    database: 'ahizan_local',
  });
  await client.connect();
  
  const res = await client.query(`
    SELECT c.id, c.filters, c."parentId"
    FROM collection c
  `);
  
  console.log(`Found ${res.rows.length} collections.`);
  
  for (const row of res.rows) {
    const trans = await client.query(`SELECT name, "languageCode" FROM collection_translation WHERE "baseId" = $1`, [row.id]);
    console.log(`ID: ${row.id} | Parent: ${row.parentId}`);
    console.log(`Names: ${JSON.stringify(trans.rows)}`);
    console.log(`Filters: ${JSON.stringify(row.filters)}`);
    console.log('-------------------');
  }

  const counts = await client.query(`
    SELECT "collectionId", COUNT(*) as count
    FROM collection_product_variants_product_variant
    GROUP BY "collectionId"
  `);
  console.log('\n--- PRODUCT COUNTS (Junction Table) ---');
  counts.rows.forEach(row => {
    console.log(`Collection ID: ${row.collectionId} | Variants: ${row.count}`);
  });

  await client.end();
}

run().catch(console.error);
