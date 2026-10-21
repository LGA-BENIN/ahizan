SELECT c.id as customer_id, c."userId", count(o.id) as order_count
FROM customer c
JOIN vendor v ON v."userId" = c."userId"
LEFT JOIN "order" o ON o."customerId" = c.id
WHERE v.id NOT IN (42, 43, 56)
GROUP BY c.id, c."userId"
HAVING count(o.id) > 0;
