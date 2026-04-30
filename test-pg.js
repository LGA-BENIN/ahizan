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
  const res = await client.query("SELECT tablename FROM pg_tables WHERE schemaname='public'");
  const tables = res.rows.map(r => r.tablename);
  console.log("Tables:", tables.filter(t => t.includes('collection') || t.includes('facet') || t.includes('product')));
  await client.end();
}
run().catch(console.error);
