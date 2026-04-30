const { Client } = require('pg');

/**
 * Script to synchronize Collection Filters with the allowedFacetIds 
 * from the CollectionFacetMapPlugin without modifying source code.
 */
async function run() {
  const client = new Client({
    host: '127.0.0.1',
    port: 5432,
    user: 'postgres',
    password: 'admin',
    database: 'ahizan_local',
  });

  try {
    await client.connect();
    console.log('Connected to database.');

    // 1. Fetch all collections and their allowed facets
    const res = await client.query('SELECT id, "customFieldsAllowedfacetids" FROM collection');
    const collections = res.rows;

    for (const coll of collections) {
      let allowedFacetIds = [];
      try {
        allowedFacetIds = typeof coll.customFieldsAllowedfacetids === 'string' 
          ? JSON.parse(coll.customFieldsAllowedfacetids) 
          : coll.customFieldsAllowedfacetids;
      } catch (e) {
        console.log(`Could not parse allowedFacetIds for collection ${coll.id}`);
        continue;
      }

      if (!allowedFacetIds || allowedFacetIds.length === 0) {
        console.log(`Skipping collection ${coll.id}: No allowed facets.`);
        continue;
      }

      console.log(`Processing collection ${coll.id} (Allowed Facets: ${allowedFacetIds.join(', ')})`);

      // 2. Find all FacetValue IDs for these facets
      const fvRes = await client.query(
        'SELECT id FROM facet_value WHERE "facetId" = ANY($1::int[])',
        [allowedFacetIds.map(id => parseInt(id))]
      );
      
      const facetValueIds = fvRes.rows.map(r => String(r.id));

      if (facetValueIds.length === 0) {
        console.log(`  -> No facet values found for these facets. Skipping.`);
        continue;
      }

      // 3. Construct the facet-value-filter
      const filters = [
        {
          code: 'facet-value-filter',
          args: [
            { name: 'facetValueIds', value: JSON.stringify(facetValueIds) },
            { name: 'containsAny', value: 'true' }
          ]
        }
      ];

      // 4. Update the collection filters in the DB
      await client.query(
        'UPDATE collection SET filters = $1 WHERE id = $2',
        [JSON.stringify(filters), coll.id]
      );

      console.log(`  -> Success: Added filter with ${facetValueIds.length} facet values.`);
    }

    console.log('\nAll collections processed. IMPORTANT: You MUST restart the server and trigger a re-index for changes to take effect.');

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

run().catch(console.error);
