const { Client } = require('pg');

async function run() {
  const client = new Client({
    host: '127.0.0.1', port: 5432, user: 'postgres', password: 'admin', database: 'ahizan_local',
  });
  await client.connect();
  
  const facets = await client.query(`
    SELECT f.id, ft.name 
    FROM facet f 
    JOIN facet_translation ft ON f.id = ft."baseId"
  `);
  console.log('--- FACETS ---');
  console.log(JSON.stringify(facets.rows, null, 2));

  const facetValues = await client.query(`
    SELECT fv.id, fvt.name, fv."facetId" 
    FROM facet_value fv 
    JOIN facet_value_translation fvt ON fv.id = fvt."baseId"
  `);
  console.log('\n--- FACET VALUES ---');
  console.log(JSON.stringify(facetValues.rows, null, 2));

  // Check product-facet assignments
  const productFacets = await client.query(`
    SELECT "productVariantId", "facetValueId"
    FROM product_variant_facet_values_facet_value
  `);
  console.log('\n--- PRODUCT-FACET ASSIGNMENTS ---');
  console.log(JSON.stringify(productFacets.rows, null, 2));

  await client.end();
}

run().catch(console.error);
