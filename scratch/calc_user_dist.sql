SELECT 
    v.id,
    v.name as vendor_name,
    v.email,
    gz.name as zone_name,
    pm.name as market_name,
    v.latitude,
    v.longitude,
    ROUND((6371 * acos(least(1.0, greatest(-1.0, cos(radians(6.387298)) * cos(radians(v.latitude)) * cos(radians(v.longitude) - radians(2.457211)) + sin(radians(6.387298)) * sin(radians(v.latitude))))))::numeric, 2) as distance_km
FROM vendor v
LEFT JOIN geo_zone gz ON gz.id = v."locationId"
LEFT JOIN market pm ON pm.id = v."physicalMarketId"
WHERE v.email LIKE 'vendeurtestahizan%'
ORDER BY distance_km ASC;
