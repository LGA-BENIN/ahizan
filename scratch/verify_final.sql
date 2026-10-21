-- 1. Vendors
SELECT id, name, status, "channelId", "sellerId", "userId" FROM vendor ORDER BY id;

-- 2. Seller Offers count & statuses
SELECT v.name, count(so.id) as offers_count, array_agg(DISTINCT so.status) as offer_statuses
FROM vendor v
LEFT JOIN seller_offer so ON so."vendorId" = v.id
GROUP BY v.name;

-- 3. Created products count & approval statuses (including pending products!)
SELECT v.name, count(p.id) as created_products_count, array_agg(DISTINCT p."customFieldsApprovalstatus") as approval_statuses
FROM vendor v
LEFT JOIN product p ON p."customFieldsVendorid" = v.id
GROUP BY v.name;

-- 4. Total products in platform
SELECT 
    count(*) as total_products,
    count(*) FILTER (WHERE "deletedAt" IS NULL) as active_products,
    count(*) FILTER (WHERE "deletedAt" IS NOT NULL) as soft_deleted_products
FROM product;

-- 5. Total variants
SELECT count(*) as total_variants FROM product_variant;

-- 6. Total channels
SELECT id, code, token FROM channel ORDER BY id;

-- 7. Total sellers
SELECT id, name FROM seller ORDER BY id;

-- 8. Option Groups check (should be intact)
SELECT count(*) as total_option_groups FROM product_option_group;

-- 9. Product Options check (should be intact)
SELECT count(*) as total_product_options FROM product_option;

-- 10. Collections check (should be intact)
SELECT count(*) as total_collections FROM collection;

-- 11. Facets check (should be intact)
SELECT count(*) as total_facets FROM facet;
