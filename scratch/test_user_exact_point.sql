-- SIMULATION EXACTE POUR LE POINT : 6.387298, 2.457211 (Akpakpa Dodomè / Cotonou Est)

WITH distances AS (
    SELECT 
        so.id,
        SUBSTRING(pt.name FROM 1 FOR 26) as product,
        SUBSTRING(v.name FROM 1 FOR 26) as vendor,
        gz.name as zone,
        ROUND((6371 * acos(least(1.0, greatest(-1.0, cos(radians(6.387298)) * cos(radians(v.latitude)) * cos(radians(v.longitude) - radians(2.457211)) + sin(radians(6.387298)) * sin(radians(v.latitude))))))::numeric, 2) as dist_km,
        so."onPromotion" as promo,
        (
          -- PALIERS DE DISTANCE STRICTS
          CASE 
            WHEN (6371 * acos(least(1.0, greatest(-1.0, cos(radians(6.387298)) * cos(radians(v.latitude)) * cos(radians(v.longitude) - radians(2.457211)) + sin(radians(6.387298)) * sin(radians(v.latitude)))))) <= 2.5 THEN 10000 + 500
            WHEN (6371 * acos(least(1.0, greatest(-1.0, cos(radians(6.387298)) * cos(radians(v.latitude)) * cos(radians(v.longitude) - radians(2.457211)) + sin(radians(6.387298)) * sin(radians(v.latitude)))))) <= 6.0 THEN 10000 + 300
            WHEN (6371 * acos(least(1.0, greatest(-1.0, cos(radians(6.387298)) * cos(radians(v.latitude)) * cos(radians(v.longitude) - radians(2.457211)) + sin(radians(6.387298)) * sin(radians(v.latitude)))))) <= 8.0 THEN 10000 + 100
            WHEN (6371 * acos(least(1.0, greatest(-1.0, cos(radians(6.387298)) * cos(radians(v.latitude)) * cos(radians(v.longitude) - radians(2.457211)) + sin(radians(6.387298)) * sin(radians(v.latitude)))))) <= 18.0 THEN 5000 + 200
            WHEN (6371 * acos(least(1.0, greatest(-1.0, cos(radians(6.387298)) * cos(radians(v.latitude)) * cos(radians(v.longitude) - radians(2.457211)) + sin(radians(6.387298)) * sin(radians(v.latitude)))))) <= 35.0 THEN 1000 + 100
            ELSE 1000
          END
          -- SIGNAUX COMMERCIAUX INTRA-PALIER
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
      AND p."deletedAt" IS NULL
      AND pv."deletedAt" IS NULL
      AND p.enabled = true
      AND pv.enabled = true
)
SELECT ROW_NUMBER() OVER(ORDER BY score DESC) as rank, product, vendor, zone, dist_km || ' km' as dist, promo, score
FROM distances
ORDER BY score DESC
LIMIT 20;
