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
  const res = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name='collection_product_variants_product_variant'");
  console.log("Columns collection_product_variants_product_variant:", res.rows.map(r => r.column_name));
  
  const res2 = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name='product_facet_values_facet_value'");
  console.log("Columns product_facet_values_facet_value:", res2.rows.map(r => r.column_name));
  
  await client.end();
}
run().catch(console.error);
