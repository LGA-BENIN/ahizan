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
  const collRows = await client.query("SELECT filters FROM collection WHERE id = 2");
  if (collRows.rowCount > 0) {
      let filters = collRows.rows[0].filters || [];
      if (typeof filters === 'string') filters = JSON.parse(filters);
      
      let variantFilter = filters.find(f => f.code === 'variant-id-filter');
      let vIds = [];
      if (!variantFilter) {
          variantFilter = { 
              code: 'variant-id-filter', 
              args: [
                  { name: 'variantIds', value: '[]' },
                  { name: 'combineWithAnd', value: 'false' }
              ] 
          };
          filters.push(variantFilter);
      } else {
          // If it was my broken object format
          if (!Array.isArray(variantFilter.args)) {
              let oldVids = variantFilter.args.variantIds || '[]';
              variantFilter.args = [
                  { name: 'variantIds', value: oldVids },
                  { name: 'combineWithAnd', value: 'false' }
              ];
          }
          let arg = variantFilter.args.find(a => a.name === 'variantIds');
          if (arg) {
              vIds = JSON.parse(arg.value || '[]');
          } else {
              variantFilter.args.push({ name: 'variantIds', value: '[]' });
          }
      }
      
      // Let's add variants 1 to 14 to collection 2
      for (let i = 1; i <= 14; i++) {
          if (!vIds.includes(i.toString())) vIds.push(i.toString());
      }
      
      let arg = variantFilter.args.find(a => a.name === 'variantIds');
      arg.value = JSON.stringify(vIds);
      
      await client.query("UPDATE collection SET filters = $1 WHERE id = 2", [JSON.stringify(filters)]);
      console.log("Updated collection 2 filters:", JSON.stringify(filters));
  }
  await client.end();
}
run().catch(console.error);
