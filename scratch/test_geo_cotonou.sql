WITH distances AS (
    SELECT 
        so.id,
        SUBSTRING(pt.name FROM 1 FOR 28) as product,
        SUBSTRING(v.name FROM 1 FOR 26) as vendor,
        gz.name as zone,
        ROUND((6371 * acos(least(1.0, greatest(-1.0, cos(radians(6.3654)) * cos(radians(v.latitude)) * cos(radians(v.longitude) - radians(2.4183)) + sin(radians(6.3654)) * sin(radians(v.latitude))))))::numeric, 1) as dist_cotonou_km,
        so."onPromotion" as promo,
        100 
         + (CASE WHEN so.stock > 0 THEN 25 ELSE 0 END)
         + (CASE WHEN so."onPromotion" = true AND so."promotionalPrice" < so.price THEN 50 + LEAST(30, ROUND(((so.price - so."promotionalPrice")::numeric / so.price * 100))) ELSE 0 END)
         + (CASE 
              WHEN (6371 * acos(least(1.0, greatest(-1.0, cos(radians(6.3654)) * cos(radians(v.latitude)) * cos(radians(v.longitude) - radians(2.4183)) + sin(radians(6.3654)) * sin(radians(v.latitude)))))) <= 3 THEN 60
              WHEN (6371 * acos(least(1.0, greatest(-1.0, cos(radians(6.3654)) * cos(radians(v.latitude)) * cos(radians(v.longitude) - radians(2.4183)) + sin(radians(6.3654)) * sin(radians(v.latitude)))))) <= 8 THEN 45
              WHEN (6371 * acos(least(1.0, greatest(-1.0, cos(radians(6.3654)) * cos(radians(v.latitude)) * cos(radians(v.longitude) - radians(2.4183)) + sin(radians(6.3654)) * sin(radians(v.latitude)))))) <= 18 THEN 30
              WHEN (6371 * acos(least(1.0, greatest(-1.0, cos(radians(6.3654)) * cos(radians(v.latitude)) * cos(radians(v.longitude) - radians(2.4183)) + sin(radians(6.3654)) * sin(radians(v.latitude)))))) <= 35 THEN 15
              ELSE -10 END)
         + (CASE WHEN v.rating >= 4.5 THEN 15 ELSE 0 END)
        as score
    FROM seller_offer so
    JOIN product_variant pv ON pv.id = so."productVariantId"
    JOIN product p ON p.id = pv."productId"
    JOIN product_translation pt ON pt."baseId" = p.id AND pt."languageCode" = 'fr'
    JOIN vendor v ON v.id = so."vendorId"
    LEFT JOIN geo_zone gz ON gz.id = v."locationId"
    WHERE v.email LIKE 'vendeurtestahizan%'
)
SELECT ROW_NUMBER() OVER(ORDER BY score DESC) as rank, product, vendor, zone, dist_cotonou_km || ' km' as dist, promo, score
FROM distances
ORDER BY score DESC
LIMIT 25;
