const { Client } = require('pg');

const client = new Client({
  host: '127.0.0.1',
  port: 5432,
  user: 'postgres',
  password: 'admin',
  database: 'ahizan_local',
});

async function run() {
  await client.connect();
  
  // 1. Clear filters from all collections (reset to empty)
  await client.query(`UPDATE collection SET filters = '[]'`);
  console.log("Reset all collection filters to []");

  // 2. Clear the junction table
  await client.query(`DELETE FROM collection_product_variants_product_variant`);
  console.log("Cleared collection_product_variants_product_variant table");

  // 3. Trigger a full reindex (optional but good)
  // Actually, we should just let the user re-assign them via the portal.
  
  await client.end();
}
run().catch(console.error);
