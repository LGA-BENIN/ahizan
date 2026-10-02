-- Simulation du NOUVEAU MOTEUR DE PROXIMITÉ GÉOGRAPHIQUE PAR PALIERS (Tiering Spatial)

-- 1. CLIENT À COTONOU (lat: 6.3654, lon: 2.4183)
SELECT '==================== 📍 TOP 15 PRODUITS POUR CLIENT À COTONOU ====================' as simulation_header;
WITH distances AS (
    SELECT 
        so.id,
        SUBSTRING(pt.name FROM 1 FOR 28) as product,
        SUBSTRING(v.name FROM 1 FOR 26) as vendor,
        gz.name as zone,
        ROUND((6371 * acos(least(1.0, greatest(-1.0, cos(radians(6.3654)) * cos(radians(v.latitude)) * cos(radians(v.longitude) - radians(2.4183)) + sin(radians(6.3654)) * sin(radians(v.latitude))))))::numeric, 1) as dist_km,
        so."onPromotion" as promo,
        (
          -- PALIERS DE DISTANCE STRICTS
          CASE 
            WHEN (6371 * acos(least(1.0, greatest(-1.0, cos(radians(6.3654)) * cos(radians(v.latitude)) * cos(radians(v.longitude) - radians(2.4183)) + sin(radians(6.3654)) * sin(radians(v.latitude)))))) <= 2.5 THEN 10000 + 500
            WHEN (6371 * acos(least(1.0, greatest(-1.0, cos(radians(6.3654)) * cos(radians(v.latitude)) * cos(radians(v.longitude) - radians(2.4183)) + sin(radians(6.3654)) * sin(radians(v.latitude)))))) <= 6.0 THEN 10000 + 300
            WHEN (6371 * acos(least(1.0, greatest(-1.0, cos(radians(6.3654)) * cos(radians(v.latitude)) * cos(radians(v.longitude) - radians(2.4183)) + sin(radians(6.3654)) * sin(radians(v.latitude)))))) <= 18.0 THEN 5000 + 200
            WHEN (6371 * acos(least(1.0, greatest(-1.0, cos(radians(6.3654)) * cos(radians(v.latitude)) * cos(radians(v.longitude) - radians(2.4183)) + sin(radians(6.3654)) * sin(radians(v.latitude)))))) <= 35.0 THEN 1000 + 100
            ELSE 1000
          END
          -- SIGNAUX COMMERCIAUX INTRA-PALIER (Max 150 pts)
          + (CASE WHEN so.stock > 0 THEN 30 ELSE 0 END)
          + (CASE WHEN so."onPromotion" = true AND so."promotionalPrice" < so.price THEN 50 + LEAST(30, ROUND(((so.price - so."promotionalPrice")::numeric / so.price * 100))) ELSE 0 END)
          + (CASE WHEN v.rating >= 4.5 THEN 15 ELSE 0 END)
        ) as score
    FROM seller_offer so
    JOIN product_variant pv ON pv.id = so."productVariantId"
    JOIN product p ON p.id = pv."productId"
    JOIN product_translation pt ON pt."baseId" = p.id AND pt."languageCode" = 'fr'
    JOIN vendor v ON v.id = so."vendorId"
    LEFT JOIN geo_zone gz ON gz.id = v."locationId"
    WHERE v.email LIKE 'vendeurtestahizan%'
)
SELECT ROW_NUMBER() OVER(ORDER BY score DESC) as rank, product, vendor, zone, dist_km || ' km' as dist, promo, score
FROM distances
ORDER BY score DESC
LIMIT 15;

-- 2. CLIENT À PORTO-NOVO (lat: 6.5120, lon: 2.6150)
SELECT '==================== 📍 TOP 15 PRODUITS POUR CLIENT À PORTO-NOVO ====================' as simulation_header;
WITH distances AS (
    SELECT 
        so.id,
        SUBSTRING(pt.name FROM 1 FOR 28) as product,
        SUBSTRING(v.name FROM 1 FOR 26) as vendor,
        gz.name as zone,
        ROUND((6371 * acos(least(1.0, greatest(-1.0, cos(radians(6.5120)) * cos(radians(v.latitude)) * cos(radians(v.longitude) - radians(2.6150)) + sin(radians(6.5120)) * sin(radians(v.latitude))))))::numeric, 1) as dist_km,
        so."onPromotion" as promo,
        (
          CASE 
            WHEN (6371 * acos(least(1.0, greatest(-1.0, cos(radians(6.5120)) * cos(radians(v.latitude)) * cos(radians(v.longitude) - radians(2.6150)) + sin(radians(6.5120)) * sin(radians(v.latitude)))))) <= 2.5 THEN 10000 + 500
            WHEN (6371 * acos(least(1.0, greatest(-1.0, cos(radians(6.5120)) * cos(radians(v.latitude)) * cos(radians(v.longitude) - radians(2.6150)) + sin(radians(6.5120)) * sin(radians(v.latitude)))))) <= 6.0 THEN 10000 + 300
            WHEN (6371 * acos(least(1.0, greatest(-1.0, cos(radians(6.5120)) * cos(radians(v.latitude)) * cos(radians(v.longitude) - radians(2.6150)) + sin(radians(6.5120)) * sin(radians(v.latitude)))))) <= 18.0 THEN 5000 + 200
            WHEN (6371 * acos(least(1.0, greatest(-1.0, cos(radians(6.5120)) * cos(radians(v.latitude)) * cos(radians(v.longitude) - radians(2.6150)) + sin(radians(6.5120)) * sin(radians(v.latitude)))))) <= 35.0 THEN 1000 + 100
            ELSE 1000
          END
          + (CASE WHEN so.stock > 0 THEN 30 ELSE 0 END)
          + (CASE WHEN so."onPromotion" = true AND so."promotionalPrice" < so.price THEN 50 + LEAST(30, ROUND(((so.price - so."promotionalPrice")::numeric / so.price * 100))) ELSE 0 END)
          + (CASE WHEN v.rating >= 4.5 THEN 15 ELSE 0 END)
        ) as score
    FROM seller_offer so
    JOIN product_variant pv ON pv.id = so."productVariantId"
    JOIN product p ON p.id = pv."productId"
    JOIN product_translation pt ON pt."baseId" = p.id AND pt."languageCode" = 'fr'
    JOIN vendor v ON v.id = so."vendorId"
    LEFT JOIN geo_zone gz ON gz.id = v."locationId"
    WHERE v.email LIKE 'vendeurtestahizan%'
)
SELECT ROW_NUMBER() OVER(ORDER BY score DESC) as rank, product, vendor, zone, dist_km || ' km' as dist, promo, score
FROM distances
ORDER BY score DESC
LIMIT 15;

-- 3. CLIENT À ABOMEY-CALAVI (lat: 6.4520, lon: 2.3550)
SELECT '==================== 📍 TOP 15 PRODUITS POUR CLIENT À ABOMEY-CALAVI ====================' as simulation_header;
WITH distances AS (
    SELECT 
        so.id,
        SUBSTRING(pt.name FROM 1 FOR 28) as product,
        SUBSTRING(v.name FROM 1 FOR 26) as vendor,
        gz.name as zone,
        ROUND((6371 * acos(least(1.0, greatest(-1.0, cos(radians(6.4520)) * cos(radians(v.latitude)) * cos(radians(v.longitude) - radians(2.3550)) + sin(radians(6.4520)) * sin(radians(v.latitude))))))::numeric, 1) as dist_km,
        so."onPromotion" as promo,
        (
          CASE 
            WHEN (6371 * acos(least(1.0, greatest(-1.0, cos(radians(6.4520)) * cos(radians(v.latitude)) * cos(radians(v.longitude) - radians(2.3550)) + sin(radians(6.4520)) * sin(radians(v.latitude)))))) <= 2.5 THEN 10000 + 500
            WHEN (6371 * acos(least(1.0, greatest(-1.0, cos(radians(6.4520)) * cos(radians(v.latitude)) * cos(radians(v.longitude) - radians(2.3550)) + sin(radians(6.4520)) * sin(radians(v.latitude)))))) <= 6.0 THEN 10000 + 300
            WHEN (6371 * acos(least(1.0, greatest(-1.0, cos(radians(6.4520)) * cos(radians(v.latitude)) * cos(radians(v.longitude) - radians(2.3550)) + sin(radians(6.4520)) * sin(radians(v.latitude)))))) <= 18.0 THEN 5000 + 200
            WHEN (6371 * acos(least(1.0, greatest(-1.0, cos(radians(6.4520)) * cos(radians(v.latitude)) * cos(radians(v.longitude) - radians(2.3550)) + sin(radians(6.4520)) * sin(radians(v.latitude)))))) <= 35.0 THEN 1000 + 100
            ELSE 1000
          END
          + (CASE WHEN so.stock > 0 THEN 30 ELSE 0 END)
          + (CASE WHEN so."onPromotion" = true AND so."promotionalPrice" < so.price THEN 50 + LEAST(30, ROUND(((so.price - so."promotionalPrice")::numeric / so.price * 100))) ELSE 0 END)
          + (CASE WHEN v.rating >= 4.5 THEN 15 ELSE 0 END)
        ) as score
    FROM seller_offer so
    JOIN product_variant pv ON pv.id = so."productVariantId"
    JOIN product p ON p.id = pv."productId"
    JOIN product_translation pt ON pt."baseId" = p.id AND pt."languageCode" = 'fr'
    JOIN vendor v ON v.id = so."vendorId"
    LEFT JOIN geo_zone gz ON gz.id = v."locationId"
    WHERE v.email LIKE 'vendeurtestahizan%'
)
SELECT ROW_NUMBER() OVER(ORDER BY score DESC) as rank, product, vendor, zone, dist_km || ' km' as dist, promo, score
FROM distances
ORDER BY score DESC
LIMIT 15;
