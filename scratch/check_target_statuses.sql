-- Check all offers for the 3 vendors including status
SELECT 
    v.id as vendor_id,
    v.name as vendor_name,
    so.status as offer_status,
    count(so.id) as offer_count
FROM vendor v
JOIN seller_offer so ON so."vendorId" = v.id
WHERE v.id IN (42, 43, 56)
GROUP BY v.id, v.name, so.status;

-- Check all products created by the 3 vendors including approval status
SELECT 
    v.id as vendor_id,
    v.name as vendor_name,
    p."customFieldsApprovalstatus" as approval_status,
    p."deletedAt" IS NOT NULL as is_soft_deleted,
    count(p.id) as product_count
FROM vendor v
JOIN product p ON p."customFieldsVendorid" = v.id
WHERE v.id IN (42, 43, 56)
GROUP BY v.id, v.name, p."customFieldsApprovalstatus", (p."deletedAt" IS NOT NULL);
