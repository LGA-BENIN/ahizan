const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

function slugify(text) {
    return text
        .toString()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
}

async function run() {
    console.log('🚀 Starting OCHA COD-AB Benin Geolocation Ingestion...');

    const client = new Client({
        host: process.env.DB_HOST || '127.0.0.1',
        port: +(process.env.DB_PORT || 5432),
        user: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD || 'Fernand0@91820805',
        database: process.env.DB_NAME || 'postgres',
    });

    await client.connect();
    console.log('🔌 Connected to PostgreSQL Database.');

    // 1. Assainissement SQL & Indexation PostGIS
    console.log('🧹 Step 1: Cleaning up corrupted zones & verifying PostGIS...');
    await client.query(`CREATE EXTENSION IF NOT EXISTS postgis;`);
    await client.query(`UPDATE geo_zone SET type = 'NEIGHBORHOOD' WHERE type = 'QUARTIER';`);
    await client.query(`DELETE FROM geo_zone WHERE (slug IS NULL OR slug = '' OR name = 'elidja') AND id NOT IN (SELECT DISTINCT "locationId" FROM vendor WHERE "locationId" IS NOT NULL);`);
    
    // Assurer l'index spatial GIST
    await client.query(`CREATE INDEX IF NOT EXISTS idx_geo_zone_boundary ON geo_zone USING GIST (boundary);`);

    const basePath = path.join(__dirname, '../../../../benin location/ben_admin_boundaries.geojson');

    // 2. Ingestion Pays (ADM0)
    console.log('🇧🇯 Step 2: Ingesting Level 0 (Country - Bénin)...');
    const adm0Raw = JSON.parse(fs.readFileSync(path.join(basePath, 'ben_admin0.geojson'), 'utf8'));
    const countryFeat = adm0Raw.features[0];
    const countryGeom = JSON.stringify(countryFeat.geometry);
    const countryProps = countryFeat.properties;

    let countryRes = await client.query(`SELECT id FROM geo_zone WHERE type = 'COUNTRY' LIMIT 1;`);
    let countryId;
    if (countryRes.rows.length === 0) {
        const ins = await client.query(`
            INSERT INTO geo_zone (name, slug, "geoId", "hierarchicalCode", code, type, status, "centerLatitude", "centerLongitude", boundary, "createdAt", "updatedAt")
            VALUES ($1, $2, $3, $4, $5, 'COUNTRY', 'ACTIVE', $6, $7, ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON($8), 4326)), NOW(), NOW())
            RETURNING id;
        `, [
            'Bénin',
            'benin',
            'GEO-BJ-00000000',
            'BJ',
            'BJ',
            countryProps.center_lat || 9.3155,
            countryProps.center_lon || 2.2849,
            countryGeom
        ]);
        countryId = ins.rows[0].id;
        console.log(`✅ Created Country: Bénin (ID: ${countryId})`);
    } else {
        countryId = countryRes.rows[0].id;
        await client.query(`
            UPDATE geo_zone
            SET boundary = ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON($1), 4326)),
                "centerLatitude" = $2, "centerLongitude" = $3, "updatedAt" = NOW()
            WHERE id = $4;
        `, [countryGeom, countryProps.center_lat, countryProps.center_lon, countryId]);
        console.log(`ℹ️ Updated Country: Bénin (ID: ${countryId})`);
    }

    // 3. Ingestion Départements (ADM1)
    console.log('🏛️ Step 3: Ingesting Level 1 (12 Départements)...');
    const adm1Raw = JSON.parse(fs.readFileSync(path.join(basePath, 'ben_admin1.geojson'), 'utf8'));
    const deptMap = new Map(); // pcode -> id

    for (const feat of adm1Raw.features) {
        const p = feat.properties;
        const name = p.adm1_name;
        const slug = slugify(name);
        const pcode = p.adm1_pcode;
        const geom = JSON.stringify(feat.geometry);

        const existing = await client.query(`SELECT id FROM geo_zone WHERE slug = $1 AND type = 'DEPARTMENT';`, [slug]);
        let deptId;
        if (existing.rows.length > 0) {
            deptId = existing.rows[0].id;
            await client.query(`
                UPDATE geo_zone
                SET name = $1, code = $2, "parentId" = $3, "centerLatitude" = $4, "centerLongitude" = $5,
                    boundary = ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON($6), 4326)),
                    "hierarchicalCode" = $7, "updatedAt" = NOW()
                WHERE id = $8;
            `, [name, pcode, countryId, p.center_lat, p.center_lon, geom, `BJ-${pcode}`, deptId]);
            console.log(`  ℹ️ Updated Département: ${name} (${pcode})`);
        } else {
            const ins = await client.query(`
                INSERT INTO geo_zone (name, slug, "geoId", "hierarchicalCode", code, type, status, "parentId", "centerLatitude", "centerLongitude", boundary, "createdAt", "updatedAt")
                VALUES ($1, $2, $3, $4, $5, 'DEPARTMENT', 'ACTIVE', $6, $7, $8, ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON($9), 4326)), NOW(), NOW())
                RETURNING id;
            `, [
                name,
                slug,
                `GEO-${pcode}`,
                `BJ-${pcode}`,
                pcode,
                countryId,
                p.center_lat,
                p.center_lon,
                geom
            ]);
            deptId = ins.rows[0].id;
            console.log(`  ✅ Created Département: ${name} (${pcode})`);
        }
        deptMap.set(pcode, deptId);
    }

    // 4. Ingestion Communes (ADM2)
    console.log('🏙️ Step 4: Ingesting Level 2 (77 Communes)...');
    const adm2Raw = JSON.parse(fs.readFileSync(path.join(basePath, 'ben_admin2.geojson'), 'utf8'));
    let communeCount = 0;

    for (const feat of adm2Raw.features) {
        const p = feat.properties;
        const name = p.adm2_name;
        const slug = slugify(name);
        const pcode = p.adm2_pcode;
        const deptPcode = p.adm1_pcode;
        const parentDeptId = deptMap.get(deptPcode) || countryId;
        const geom = JSON.stringify(feat.geometry);

        // Vérifier si la commune existe déjà (par slug ou nom pour préserver les IDs 18, 2, 3)
        const existing = await client.query(`SELECT id FROM geo_zone WHERE (slug = $1 OR name ILIKE $2) AND type = 'COMMUNE';`, [slug, name]);
        let communeId;

        if (existing.rows.length > 0) {
            communeId = existing.rows[0].id;
            await client.query(`
                UPDATE geo_zone
                SET name = $1, slug = $2, code = $3, "parentId" = $4, "centerLatitude" = $5, "centerLongitude" = $6,
                    boundary = ST_Multi(ST_SimplifyPreserveTopology(ST_SetSRID(ST_GeomFromGeoJSON($7), 4326), 0.0001)),
                    "hierarchicalCode" = $8, "geoId" = COALESCE("geoId", $9), status = 'ACTIVE', "updatedAt" = NOW()
                WHERE id = $10;
            `, [
                name,
                slug,
                pcode,
                parentDeptId,
                p.center_lat,
                p.center_lon,
                geom,
                `BJ-${deptPcode}-${pcode}`,
                `GEO-${pcode}`,
                communeId
            ]);
            console.log(`  ℹ️ Updated Commune: ${name} (ID: ${communeId} | ${pcode})`);
        } else {
            const ins = await client.query(`
                INSERT INTO geo_zone (name, slug, "geoId", "hierarchicalCode", code, type, status, "parentId", "centerLatitude", "centerLongitude", boundary, "createdAt", "updatedAt")
                VALUES ($1, $2, $3, $4, $5, 'COMMUNE', 'ACTIVE', $6, $7, $8, ST_Multi(ST_SimplifyPreserveTopology(ST_SetSRID(ST_GeomFromGeoJSON($9), 4326), 0.0001)), NOW(), NOW())
                RETURNING id;
            `, [
                name,
                slug,
                `GEO-${pcode}`,
                `BJ-${deptPcode}-${pcode}`,
                pcode,
                parentDeptId,
                p.center_lat,
                p.center_lon,
                geom
            ]);
            communeId = ins.rows[0].id;
            console.log(`  ✅ Created Commune: ${name} (ID: ${communeId} | ${pcode})`);
        }
        communeCount++;
    }

    // 5. Rattachement Spatial des Marchés Physiques
    console.log('🛒 Step 5: Spatially linking all 31 Markets to Communes...');
    const linkRes = await client.query(`
        UPDATE market m
        SET "geoZoneId" = sub.zone_id
        FROM (
            SELECT m2.id as market_id, gz.id as zone_id, gz.name as zone_name
            FROM market m2
            JOIN geo_zone gz ON gz.type = 'COMMUNE'
              AND gz.boundary IS NOT NULL
              AND ST_Contains(gz.boundary, ST_SetSRID(ST_Point(m2."centerLongitude", m2."centerLatitude"), 4326))
        ) sub
        WHERE m.id = sub.market_id
        RETURNING m.id, m.name, sub.zone_name;
    `);
    console.log(`✅ Successfully linked ${linkRes.rows.length} markets to their containing Commune!`);
    for (const r of linkRes.rows) {
        console.log(`   - Market "${r.name}" -> ${r.zone_name}`);
    }

    // 6. Test de Performance Spatial PostGIS
    console.log('⚡ Step 6: Testing PostGIS Point-In-Polygon query for Cadjèhoun (lat: 6.3620, lng: 2.4000)...');
    const start = Date.now();
    const testQuery = await client.query(`
        SELECT gz.id, gz.name, gz.type, gz."hierarchicalCode"
        FROM geo_zone gz
        WHERE gz.status = 'ACTIVE'
          AND gz.boundary IS NOT NULL
          AND ST_Contains(gz.boundary, ST_SetSRID(ST_Point($1, $2), 4326))
        ORDER BY CASE gz.type
            WHEN 'NEIGHBORHOOD' THEN 1
            WHEN 'COMMUNE' THEN 2
            WHEN 'DEPARTMENT' THEN 3
            WHEN 'COUNTRY' THEN 4
            ELSE 5 END ASC;
    `, [2.4000, 6.3620]);
    const duration = Date.now() - start;
    console.log(`⏱️ Query executed in ${duration}ms! Matching zones:`);
    for (const z of testQuery.rows) {
        console.log(`   - [${z.type}] ${z.name} (${z.hierarchicalCode})`);
    }

    // 7. Statistiques Finales
    const stats = await client.query(`SELECT type, count(*) FROM geo_zone GROUP BY type ORDER BY count DESC;`);
    console.log('\n📊 Final GeoZone distribution in Database:');
    console.table(stats.rows);

    await client.end();
    console.log('🎉 Ingestion complete!');
}

run().catch(err => {
    console.error('❌ Ingestion failed:', err);
    process.exit(1);
});
