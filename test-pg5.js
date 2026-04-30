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
  const res = await client.query("SELECT * FROM collection_product_variants_product_variant");
  console.log("Collection Variants Mapping:", JSON.stringify(res.rows, null, 2));
  await client.end();
}
run().catch(console.error);
