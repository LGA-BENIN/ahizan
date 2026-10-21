import json, os, re, unicodedata

def slugify(text):
    text = unicodedata.normalize('NFD', str(text)).encode('ascii', 'ignore').decode('utf-8')
    text = re.sub(r'[^\w\s-]', '', text).strip().lower()
    return re.sub(r'[-\s]+', '-', text)

def escape_sql(val):
    if val is None:
        return 'NULL'
    val_str = str(val).replace("'", "''")
    return f"'{val_str}'"

base_dir = '/srv/ahizan/benin location/ben_admin_boundaries.geojson'
sql_lines = []

sql_lines.append("-- =====================================================")
sql_lines.append("-- Ingestion OCHA COD-AB pour Ahizan Geo Engine")
sql_lines.append("-- =====================================================")
sql_lines.append("BEGIN;")
sql_lines.append("CREATE EXTENSION IF NOT EXISTS postgis;")
sql_lines.append("UPDATE geo_zone SET type = 'NEIGHBORHOOD' WHERE type = 'QUARTIER';")
sql_lines.append("DELETE FROM geo_zone WHERE (slug IS NULL OR slug = '' OR name = 'elidja') AND id NOT IN (SELECT DISTINCT \"locationId\" FROM vendor WHERE \"locationId\" IS NOT NULL);")
sql_lines.append("CREATE INDEX IF NOT EXISTS idx_geo_zone_boundary ON geo_zone USING GIST (boundary);")

# 1. ADM0 - Bénin
with open(os.path.join(base_dir, 'ben_admin0.geojson'), encoding='utf8') as f:
    adm0 = json.load(f)
feat0 = adm0['features'][0]
geom0_str = json.dumps(feat0['geometry'])
lat0 = feat0['properties'].get('center_lat', 9.3155)
lon0 = feat0['properties'].get('center_lon', 2.2849)

sql_lines.append("\n-- 1. Country Bénin")
sql_lines.append(f"""
INSERT INTO geo_zone (name, slug, "geoId", "hierarchicalCode", code, type, status, "centerLatitude", "centerLongitude", boundary, "createdAt", "updatedAt")
VALUES ('Bénin', 'benin', 'GEO-BJ-00000000', 'BJ', 'BJ', 'COUNTRY', 'ACTIVE', {lat0}, {lon0}, ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON($geom${geom0_str}$geom$), 4326)), NOW(), NOW())
ON CONFLICT (slug) DO UPDATE
SET boundary = EXCLUDED.boundary, "centerLatitude" = EXCLUDED."centerLatitude", "centerLongitude" = EXCLUDED."centerLongitude", "updatedAt" = NOW();
""")

# 2. ADM1 - 12 Départements
with open(os.path.join(base_dir, 'ben_admin1.geojson'), encoding='utf8') as f:
    adm1 = json.load(f)

sql_lines.append("\n-- 2. 12 Départements")
for feat in adm1['features']:
    p = feat['properties']
    name = p['adm1_name']
    slug = slugify(name)
    pcode = p['adm1_pcode']
    geom_str = json.dumps(feat['geometry'])
    lat = p.get('center_lat') or 'NULL'
    lon = p.get('center_lon') or 'NULL'
    geo_id = f"GEO-{pcode}"
    h_code = f"BJ-{pcode}"

    sql_lines.append(f"""
INSERT INTO geo_zone (name, slug, "geoId", "hierarchicalCode", code, type, status, "parentId", "centerLatitude", "centerLongitude", boundary, "createdAt", "updatedAt")
VALUES (
    {escape_sql(name)}, {escape_sql(slug)}, {escape_sql(geo_id)}, {escape_sql(h_code)}, {escape_sql(pcode)},
    'DEPARTMENT', 'ACTIVE', (SELECT id FROM geo_zone WHERE slug = 'benin' LIMIT 1),
    {lat}, {lon}, ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON($geom${geom_str}$geom$), 4326)), NOW(), NOW()
)
ON CONFLICT (slug) DO UPDATE
SET boundary = EXCLUDED.boundary, "parentId" = EXCLUDED."parentId", code = EXCLUDED.code,
    "centerLatitude" = EXCLUDED."centerLatitude", "centerLongitude" = EXCLUDED."centerLongitude",
    "hierarchicalCode" = EXCLUDED."hierarchicalCode", "updatedAt" = NOW();
""")

# 3. ADM2 - 77 Communes
with open(os.path.join(base_dir, 'ben_admin2.geojson'), encoding='utf8') as f:
    adm2 = json.load(f)

sql_lines.append("\n-- 3. 77 Communes")
for feat in adm2['features']:
    p = feat['properties']
    name = p['adm2_name']
    slug = slugify(name)
    pcode = p['adm2_pcode']
    dept_pcode = p['adm1_pcode']
    geom_str = json.dumps(feat['geometry'])
    lat = p.get('center_lat') or 'NULL'
    lon = p.get('center_lon') or 'NULL'
    geo_id = f"GEO-{pcode}"
    h_code = f"BJ-{dept_pcode}-{pcode}"

    safe_name = name.replace("'", "''")
    sql_lines.append(f"""
-- Commune: {safe_name}
DO $commune$
DECLARE
    dept_id INT;
    commune_id INT;
BEGIN
    SELECT id INTO dept_id FROM geo_zone WHERE code = '{dept_pcode}' AND type = 'DEPARTMENT' LIMIT 1;
    SELECT id INTO commune_id FROM geo_zone WHERE (slug = '{slug}' OR name ILIKE '{safe_name}') AND type = 'COMMUNE' LIMIT 1;

    IF commune_id IS NOT NULL THEN
        UPDATE geo_zone
        SET name = '{safe_name}', slug = '{slug}', code = '{pcode}', "parentId" = dept_id,
            "centerLatitude" = {lat}, "centerLongitude" = {lon},
            boundary = ST_Multi(ST_SimplifyPreserveTopology(ST_SetSRID(ST_GeomFromGeoJSON($geom${geom_str}$geom$), 4326), 0.0001)),
            "hierarchicalCode" = '{h_code}', "geoId" = COALESCE("geoId", '{geo_id}'),
            status = 'ACTIVE', "updatedAt" = NOW()
        WHERE id = commune_id;
    ELSE
        INSERT INTO geo_zone (name, slug, "geoId", "hierarchicalCode", code, type, status, "parentId", "centerLatitude", "centerLongitude", boundary, "createdAt", "updatedAt")
        VALUES (
            '{safe_name}', '{slug}', '{geo_id}', '{h_code}', '{pcode}',
            'COMMUNE', 'ACTIVE', dept_id, {lat}, {lon},
            ST_Multi(ST_SimplifyPreserveTopology(ST_SetSRID(ST_GeomFromGeoJSON($geom${geom_str}$geom$), 4326), 0.0001)), NOW(), NOW()
        );
    END IF;
END $commune$;
""")

# 4. Spatially Relink Markets to Communes
sql_lines.append("\n-- 4. Rattachement Spatial des Marchés Physiques")
sql_lines.append("""
UPDATE market m
SET "geoZoneId" = sub.zone_id
FROM (
    SELECT m2.id as market_id, gz.id as zone_id
    FROM market m2
    JOIN geo_zone gz ON gz.type = 'COMMUNE'
      AND gz.boundary IS NOT NULL
      AND ST_Contains(gz.boundary, ST_SetSRID(ST_Point(m2."centerLongitude", m2."centerLatitude"), 4326))
) sub
WHERE m.id = sub.market_id;
""")

sql_lines.append("COMMIT;")

output_file = '/srv/ahizan/backend/import_geo.sql'
with open(output_file, 'w', encoding='utf-8') as out:
    out.write('\n'.join(sql_lines))

print(f"✅ Generated SQL script at {output_file} with {len(sql_lines)} lines.")
