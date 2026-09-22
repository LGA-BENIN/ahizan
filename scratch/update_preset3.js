const { Client } = require("pg");
const client = new Client({ connectionString: "postgresql://postgres:Fernand0%4091820805@127.0.0.1:5432/postgres" });

async function update() {
  await client.connect();
  const res = await client.query('SELECT "sectionsJson" FROM page_preset WHERE id = 3');
  const sections = JSON.parse(res.rows[0].sectionsJson);
  
  sections.forEach((s) => {
    if (s.type === 'PRODUCT_COLLECTION' || s.config?.experienceStrategy === 'LOCAL_DISCOVERY') {
      s.config = s.config || {};
      s.config.radiusKm = 15;
      s.config.requireConfirmedLocation = false;
      s.config.locationSource = 'AUTO';
      s.config.marketId = '';
      s.config.locationId = '';
    }
  });

  await client.query('UPDATE page_preset SET "sectionsJson" = $1 WHERE id = 3', [JSON.stringify(sections)]);
  console.log("Preset 3 successfully updated with radiusKm: 15 and requireConfirmedLocation: false");
  await client.end();
}

update().catch(console.error);
