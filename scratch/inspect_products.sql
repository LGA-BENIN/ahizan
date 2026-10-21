-- 1. Vendors to preserve: 42, 43, 56
-- Let's check all products that have ANY offer or creation link to 42, 43, 56:
SELECT count(DISTINCT p.id) as preserved_products_count
FROM product p
WHERE p.id IN (
    SELECT pv."productId" 
    FROM seller_offer so 
    JOIN product_variant pv ON so."productVariantId" = pv.id 
    WHERE so."vendorId" IN (42, 43, 56)
)
OR p."customFieldsVendorid" IN (42, 43, 56);

-- 2. Products to delete (those that have NO offer from 42, 43, 56 AND were NOT created by 42, 43, 56):
SELECT count(DISTINCT p.id) as products_to_delete_count
FROM product p
WHERE p.id NOT IN (
    SELECT pv."productId" 
    FROM seller_offer so 
    JOIN product_variant pv ON so."productVariantId" = pv.id 
    WHERE so."vendorId" IN (42, 43, 56)
)
AND (p."customFieldsVendorid" IS NULL OR p."customFieldsVendorid" NOT IN (42, 43, 56));

-- 3. Check if there are variants to delete under products to delete:
SELECT count(pv.id) as variants_to_delete_count
FROM product_variant pv
WHERE pv."productId" NOT IN (
    SELECT p.id
    FROM product p
    WHERE p.id IN (
        SELECT pv2."productId" 
        FROM seller_offer so 
        JOIN product_variant pv2 ON so."productVariantId" = pv2.id 
        WHERE so."vendorId" IN (42, 43, 56)
    )
    OR p."customFieldsVendorid" IN (42, 43, 56)
);

-- 4. Check seller offers to delete:
SELECT count(*) as offers_to_delete_count
FROM seller_offer
WHERE "vendorId" NOT IN (42, 43, 56);

-- 5. Check seller offers to preserve:
SELECT count(*) as offers_to_preserve_count
FROM seller_offer
WHERE "vendorId" IN (42, 43, 56);
