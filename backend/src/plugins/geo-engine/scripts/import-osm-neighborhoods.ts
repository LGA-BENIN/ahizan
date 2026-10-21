import fs from 'fs';
import path from 'path';
import { Pool, PoolClient } from 'pg';

interface GeoFeature {
    type: string;
    properties: {
        id?: string;
        name?: string | null;
        name_fr?: string | null;
        name_en?: string | null;
        place?: string | null;
        landuse?: string | null;
        population?: number | null;
        adm1_name?: string | null;
        adm2_name?: string | null;
        [key: string]: any;
    };
    geometry: {
        type: string;
        coordinates: any;
    };
}

interface ParentZone {
    id: number;
    name: string;
    type: string;
    hierarchicalCode?: string;
    code?: string;
}

function slugify(text: string): string {
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

function normalizeName(name: string): string {
    return name.trim().replace(/\s+/g, ' ');
}

function findGeoJsonPath(): string {
    const candidates = [
        process.env.GEOJSON_PATH,
        '/tmp/populated_places.geojson',
        '/srv/ahizan/benin location/Quartier/hotosm_ben_populated_places_osm_geojson/populated_places.geojson',
        path.resolve(process.cwd(), '../benin location/Quartier/hotosm_ben_populated_places_osm_geojson/populated_places.geojson'),
        path.resolve(process.cwd(), 'benin location/Quartier/hotosm_ben_populated_places_osm_geojson/populated_places.geojson'),
        path.resolve(__dirname, '../../../../../benin location/Quartier/hotosm_ben_populated_places_osm_geojson/populated_places.geojson'),
    ].filter(Boolean) as string[];

    for (const p of candidates) {
        if (fs.existsSync(p)) {
            return p;
        }
    }
    throw new Error(`Fichier populated_places.geojson non trouvé parmi les chemins explorés : \n${candidates.join('\n')}`);
}

function computeCentroid(geometry: any): { lat: number; lng: number } | null {
    if (geometry.type === 'Point') {
        const [lng, lat] = geometry.coordinates;
        return { lat, lng };
    }

    if (geometry.type === 'Polygon') {
        const ring = geometry.coordinates[0];
        if (!ring || ring.length === 0) return null;
        let sumLng = 0;
        let sumLat = 0;
        for (const pt of ring) {
            sumLng += pt[0];
            sumLat += pt[1];
        }
        return {
            lng: sumLng / ring.length,
            lat: sumLat / ring.length,
        };
    }

    if (geometry.type === 'MultiPolygon') {
        let totalPts = 0;
        let sumLng = 0;
        let sumLat = 0;
        for (const poly of geometry.coordinates) {
            const ring = poly[0];
            if (!ring) continue;
            for (const pt of ring) {
                sumLng += pt[0];
                sumLat += pt[1];
                totalPts++;
            }
        }
        if (totalPts === 0) return null;
        return {
            lng: sumLng / totalPts,
            lat: sumLat / totalPts,
        };
    }

    return null;
}

export async function importOsmNeighborhoods() {
    const startTime = Date.now();
    console.log('======================================================================');
    console.log('🌍 Démarrage de l\'ingestion des Quartiers & Lieux-dits OSM (Bénin)');
    console.log('======================================================================');

    const geoJsonFile = findGeoJsonPath();
    console.log(`📁 Fichier source détecté : ${geoJsonFile}`);

    // Configuration de la connexion PostgreSQL
    const pool = new Pool({
        host: process.env.DB_HOST || (fs.existsSync('/.dockerenv') ? 'db' : '127.0.0.1'),
        port: +(process.env.DB_PORT || 5432),
        user: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD || 'Fernand0@91820805',
        database: process.env.DB_NAME || 'postgres',
        max: 5,
        idleTimeoutMillis: 30000,
    });

    const client: PoolClient = await pool.connect();
    console.log('🔌 Connecté à PostGIS avec succès.');

    const unmatchedLogPath = path.resolve(process.cwd(), 'unmatched-places.log');
    fs.writeFileSync(unmatchedLogPath, `# Lieux non rattachés géographiquement (${new Date().toISOString()})\n`, 'utf8');

    try {
        // 1. Précharger l'état existant pour dédoublonner
        console.log('📊 Chargement des zones existantes en mémoire...');
        const existingZonesRes = await client.query(`
            SELECT id, name, slug, "geoId", type, "parentId" 
            FROM geo_zone
        `);

        const existingSlugs = new Set<string>();
        const existingParentAndName = new Set<string>();
        let maxGeoIdSeq = 0;

        for (const row of existingZonesRes.rows) {
            if (row.slug) existingSlugs.add(row.slug.toLowerCase());
            if (row.parentId && row.name) {
                existingParentAndName.add(`${row.parentId}:${row.name.trim().toLowerCase()}`);
            }
            if (row.geoId && typeof row.geoId === 'string') {
                const match = row.geoId.match(/GEO-BJ-N-(\d+)/);
                if (match) {
                    const num = parseInt(match[1], 10);
                    if (num > maxGeoIdSeq) maxGeoIdSeq = num;
                }
            }
        }

        console.log(`ℹ️ Zones en base : ${existingZonesRes.rows.length} | Slugs enregistrés : ${existingSlugs.size}`);
        console.log(`ℹ️ Dernier numéro geoId de quartier détecté : ${maxGeoIdSeq}`);

        // 2. Lecture et parsing du GeoJSON
        console.log('📖 Lecture et désérialisation du GeoJSON...');
        const rawContent = fs.readFileSync(geoJsonFile, 'utf8');
        const geojson = JSON.parse(rawContent);
        const features: GeoFeature[] = geojson.features || [];
        const totalFeaturesRead = features.length;
        console.log(`✅ ${totalFeaturesRead} entités lues depuis le fichier GeoJSON.`);

        // 3. Filtrage des entités éligibles
        console.log('🔍 Filtrage des entités (critères de lieu et coordonnées Bénin)...');
        const allowedPlaces = new Set(['suburb', 'neighbourhood', 'quarter', 'village', 'hamlet', 'town', 'city', 'islet', 'isolated_dwelling']);

        interface Candidate {
            feature: GeoFeature;
            cleanName: string;
            lat: number;
            lng: number;
        }

        const candidates: Candidate[] = [];
        let ignoredFilterCount = 0;

        for (const feat of features) {
            const props = feat.properties || {};
            const rawName = props.name || props.name_fr || props.name_en;

            if (!rawName || !rawName.trim()) {
                ignoredFilterCount++;
                continue;
            }

            const cleanName = normalizeName(rawName);
            const place = (props.place || '').toLowerCase();
            const landuse = (props.landuse || '').toLowerCase();

            const isAllowedPlace = allowedPlaces.has(place) || landuse === 'residential';
            if (!isAllowedPlace) {
                ignoredFilterCount++;
                continue;
            }

            const centroid = computeCentroid(feat.geometry);
            if (!centroid) {
                ignoredFilterCount++;
                continue;
            }

            // Bounding box Bénin : Lat 6.2 à 12.5, Lng 0.7 à 3.9
            if (centroid.lat < 6.2 || centroid.lat > 12.5 || centroid.lng < 0.7 || centroid.lng > 3.9) {
                ignoredFilterCount++;
                continue;
            }

            candidates.push({
                feature: feat,
                cleanName,
                lat: centroid.lat,
                lng: centroid.lng,
            });
        }

        console.log(`🎯 ${candidates.length} entités éligibles retenues (${ignoredFilterCount} ignorées par filtrage).`);

        // 4. Traitement par Chunks et Résolution Spatiale
        const CHUNK_SIZE = 250;
        let insertedArrondissement = 0;
        let insertedCommune = 0;
        let duplicateCount = 0;
        let unmatchedCount = 0;
        let processedCount = 0;

        for (let i = 0; i < candidates.length; i += CHUNK_SIZE) {
            const chunk = candidates.slice(i, i + CHUNK_SIZE);

            // Construction de la requête spatiale PostGIS groupée
            // Détermine pour chaque point du chunk le parent (Arrondissement en priorité, sinon Commune)
            const valuesParts: string[] = [];
            for (let idx = 0; idx < chunk.length; idx++) {
                const c = chunk[idx];
                valuesParts.push(`(${idx}, ${c.lng}, ${c.lat})`);
            }

            const spatialQuery = `
                SELECT pts.idx, gz.id, gz.name, gz.type, gz."hierarchicalCode", gz.code
                FROM (VALUES ${valuesParts.join(', ')}) AS pts(idx, lng, lat)
                LEFT JOIN LATERAL (
                    SELECT id, name, type, "hierarchicalCode", code
                    FROM geo_zone
                    WHERE type IN ('ARRONDISSEMENT', 'COMMUNE')
                      AND ST_Contains(boundary, ST_SetSRID(ST_Point(pts.lng, pts.lat), 4326))
                    ORDER BY CASE WHEN type = 'ARRONDISSEMENT' THEN 1 ELSE 2 END
                    LIMIT 1
                ) gz ON true;
            `;

            const spatialRes = await client.query(spatialQuery);
            const parentMap = new Map<number, ParentZone | null>();
            for (const r of spatialRes.rows) {
                if (r.id) {
                    parentMap.set(r.idx, {
                        id: r.id,
                        name: r.name,
                        type: r.type,
                        hierarchicalCode: r.hierarchicalCode,
                        code: r.code,
                    });
                } else {
                    parentMap.set(r.idx, null);
                }
            }

            // Préparation des insertions dans le chunk
            await client.query('BEGIN');

            for (let idx = 0; idx < chunk.length; idx++) {
                const c = chunk[idx];
                const parent = parentMap.get(idx);

                if (!parent) {
                    // Cas 3 : Non rattaché géographiquement
                    unmatchedCount++;
                    fs.appendFileSync(
                        unmatchedLogPath,
                        `ID: ${c.feature.properties.id || 'N/A'} | Nom: ${c.cleanName} | Coord: (${c.lng}, ${c.lat})\n`,
                        'utf8'
                    );
                    continue;
                }

                // Dédoublonnage : même nom insensible à la casse sous le même parentId
                const dedupKey = `${parent.id}:${c.cleanName.toLowerCase()}`;
                if (existingParentAndName.has(dedupKey)) {
                    duplicateCount++;
                    continue;
                }
                existingParentAndName.add(dedupKey);

                // Génération du Slug unique
                const baseSlug = slugify(`${c.cleanName}-${parent.name}`);
                let finalSlug = baseSlug;
                let slugCounter = 2;
                while (existingSlugs.has(finalSlug.toLowerCase())) {
                    finalSlug = `${baseSlug}-${slugCounter}`;
                    slugCounter++;
                }
                existingSlugs.add(finalSlug.toLowerCase());

                // Génération du geoId séquentiel
                maxGeoIdSeq++;
                const geoId = `GEO-BJ-N-${String(maxGeoIdSeq).padStart(6, '0')}`;
                const hierarchicalCode = `${parent.hierarchicalCode || parent.code || 'BJ'}-${finalSlug}`;

                // Définition de la requête d'insertion PostGIS
                let insertSql: string;
                let insertValues: any[];

                if (c.feature.geometry.type === 'Point') {
                    insertSql = `
                        INSERT INTO geo_zone (
                            name, slug, "geoId", "hierarchicalCode", type, status,
                            "centerLatitude", "centerLongitude", boundary, "parentId",
                            "createdAt", "updatedAt"
                        ) VALUES (
                            $1, $2, $3, $4, 'NEIGHBORHOOD', 'ACTIVE',
                            $5, $6, ST_SetSRID(ST_Point($7::float8, $8::float8), 4326), $9,
                            NOW(), NOW()
                        )
                        ON CONFLICT DO NOTHING;
                    `;
                    insertValues = [
                        c.cleanName,
                        finalSlug,
                        geoId,
                        hierarchicalCode,
                        c.lat,
                        c.lng,
                        c.lng,
                        c.lat,
                        parent.id,
                    ];
                } else {
                    insertSql = `
                        INSERT INTO geo_zone (
                            name, slug, "geoId", "hierarchicalCode", type, status,
                            "centerLatitude", "centerLongitude", boundary, "parentId",
                            "createdAt", "updatedAt"
                        ) VALUES (
                            $1, $2, $3, $4, 'NEIGHBORHOOD', 'ACTIVE',
                            $5, $6, ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON($7::text), 4326)), $8,
                            NOW(), NOW()
                        )
                        ON CONFLICT DO NOTHING;
                    `;
                    insertValues = [
                        c.cleanName,
                        finalSlug,
                        geoId,
                        hierarchicalCode,
                        c.lat,
                        c.lng,
                        JSON.stringify(c.feature.geometry),
                        parent.id,
                    ];
                }

                await client.query(insertSql, insertValues);

                if (parent.type === 'ARRONDISSEMENT') {
                    insertedArrondissement++;
                } else {
                    insertedCommune++;
                }
            }

            await client.query('COMMIT');
            processedCount += chunk.length;

            if (processedCount % 1000 === 0 || processedCount >= candidates.length) {
                const percent = ((processedCount / candidates.length) * 100).toFixed(1);
                console.log(`[Jalon] Traité : ${processedCount}/${candidates.length} (${percent}%) | Insérés: Arrondissements: ${insertedArrondissement}, Communes: ${insertedCommune} | Doublons: ${duplicateCount} | Non rattachés: ${unmatchedCount}`);
            }
        }

        const durationSeconds = ((Date.now() - startTime) / 1000).toFixed(1);

        console.log('\n======================================================================');
        console.log('🎉 BILAN D\'INGESTION DES QUARTIERS ET LIEUX-DITS (HOT OSM / POPULATED PLACES)');
        console.log('======================================================================');
        console.log(`• Nombre total d'entités lues dans le fichier OSM         : ${totalFeaturesRead}`);
        console.log(`• Nombre d'entités filtrées éligibles                     : ${candidates.length}`);
        console.log(`• Nombre de quartiers insérés rattachés à ARRONDISSEMENT  : ${insertedArrondissement}`);
        console.log(`• Nombre de quartiers insérés rattachés à COMMUNE         : ${insertedCommune}`);
        console.log(`• Total des nouveaux quartiers enregistrés en base        : ${insertedArrondissement + insertedCommune}`);
        console.log(`• Nombre d'entités ignorées / doublons évités             : ${duplicateCount + ignoredFilterCount}`);
        console.log(`• Nombre d'entités non rattachées (hors limites)          : ${unmatchedCount} (journalisées dans unmatched-places.log)`);
        console.log(`• Temps total d'exécution                                 : ${durationSeconds} secondes`);
        console.log('======================================================================\n');

    } catch (err) {
        await client.query('ROLLBACK').catch(() => {});
        console.error('❌ Erreur critique durant l\'ingestion des quartiers :', err);
        throw err;
    } finally {
        client.release();
        await pool.end();
    }
}

if (require.main === module) {
    importOsmNeighborhoods()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}
