-- 1. Ensure collection column exists
ALTER TABLE collection ADD COLUMN IF NOT EXISTS "customFieldsAllowedoptiongroupids" text;

-- 2. Remove group 54 (Volume) from Product 435
DELETE FROM product_option_groups_product_option_group WHERE "productId" = 435 AND "productOptionGroupId" = 54;

-- 3. Ensure group 40 (Couleur) and 62 (Capacité de Stockage) are linked to Product 435
INSERT INTO product_option_groups_product_option_group ("productId", "productOptionGroupId")
VALUES (435, 40), (435, 62)
ON CONFLICT DO NOTHING;

-- 4. Set Product 435 as official catalog item (no vendor lock)
UPDATE product SET "customFieldsVendorid" = NULL, "enabled" = true WHERE id = 435;

-- 5. Soft-delete corrupted test variants (2520..2525)
DELETE FROM seller_offer WHERE "productVariantId" IN (2520, 2521, 2522, 2523, 2524, 2525);
DELETE FROM collection_product_variants_product_variant WHERE "productVariantId" IN (2520, 2521, 2522, 2523, 2524, 2525);
DELETE FROM product_variant_options_product_option WHERE "productVariantId" IN (2520, 2521, 2522, 2523, 2524, 2525);
DELETE FROM product_variant_channels_channel WHERE "productVariantId" IN (2520, 2521, 2522, 2523, 2524, 2525);
DELETE FROM product_variant_price WHERE "variantId" IN (2520, 2521, 2522, 2523, 2524, 2525);
DELETE FROM product_variant_translation WHERE "baseId" IN (2520, 2521, 2522, 2523, 2524, 2525);
UPDATE product_variant SET enabled = false, "deletedAt" = NOW() WHERE id IN (2520, 2521, 2522, 2523, 2524, 2525);

-- 6. Configure Primary Variant 2532 (Noir / 256 Go)
UPDATE product_variant SET enabled = true, "deletedAt" = NULL, "customFieldsOfferstatus" = 'APPROVED', "updatedAt" = NOW() WHERE id = 2532;

DELETE FROM product_variant_options_product_option WHERE "productVariantId" = 2532;
INSERT INTO product_variant_options_product_option ("productVariantId", "productOptionId")
VALUES (2532, 128), (2532, 230)
ON CONFLICT DO NOTHING;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM product_variant_translation WHERE "baseId" = 2532 AND "languageCode" = 'fr') THEN
        UPDATE product_variant_translation SET name = 'Samsung Galaxy Z Flip 5 – Noir (Graphite) / 256 Go', "updatedAt" = NOW() WHERE "baseId" = 2532 AND "languageCode" = 'fr';
    ELSE
        INSERT INTO product_variant_translation ("baseId", "languageCode", name, "createdAt", "updatedAt")
        VALUES (2532, 'fr', 'Samsung Galaxy Z Flip 5 – Noir (Graphite) / 256 Go', NOW(), NOW());
    END IF;
END $$;

INSERT INTO product_variant_channels_channel ("productVariantId", "channelId")
VALUES (2532, 1)
ON CONFLICT DO NOTHING;

-- 7. Insert or update all 7 official sister variants
DO $$
DECLARE
    v_rec RECORD;
    new_var_id INT;
    primary_feat_id INT;
BEGIN
    SELECT "featuredAssetId" INTO primary_feat_id FROM product WHERE id = 435;

    -- Array of sister variants: (sku, name, color_opt_id, cap_opt_id, price)
    FOR v_rec IN 
        SELECT * FROM (VALUES
            ('SAMSUNG_ZFLIP5_LAV_256_BENIN', 'Samsung Galaxy Z Flip 5 – Lavande / 256 Go', 163, 230, 550000),
            ('SAMSUNG_ZFLIP5_CRM_256_BENIN', 'Samsung Galaxy Z Flip 5 – Crème / 256 Go', 186, 230, 550000),
            ('SAMSUNG_ZFLIP5_MNT_256_BENIN', 'Samsung Galaxy Z Flip 5 – Menthe / 256 Go', 229, 230, 550000),
            ('SAMSUNG_ZFLIP5_BLK_512_BENIN', 'Samsung Galaxy Z Flip 5 – Noir (Graphite) / 512 Go', 128, 231, 650000),
            ('SAMSUNG_ZFLIP5_LAV_512_BENIN', 'Samsung Galaxy Z Flip 5 – Lavande / 512 Go', 163, 231, 650000),
            ('SAMSUNG_ZFLIP5_CRM_512_BENIN', 'Samsung Galaxy Z Flip 5 – Crème / 512 Go', 186, 231, 650000),
            ('SAMSUNG_ZFLIP5_MNT_512_BENIN', 'Samsung Galaxy Z Flip 5 – Menthe / 512 Go', 229, 231, 650000)
        ) AS t(sku, name, color_id, cap_id, price)
    LOOP
        -- Check if variant exists by SKU
        SELECT id INTO new_var_id FROM product_variant WHERE sku = v_rec.sku AND "productId" = 435;

        IF new_var_id IS NULL THEN
            INSERT INTO product_variant ("productId", sku, enabled, "taxCategoryId", "customFieldsOfferstatus", "trackInventory", "featuredAssetId", "createdAt", "updatedAt")
            VALUES (435, v_rec.sku, true, 1, 'APPROVED', 'INHERIT', primary_feat_id, NOW(), NOW())
            RETURNING id INTO new_var_id;
        ELSE
            UPDATE product_variant SET enabled = true, "deletedAt" = NULL, "customFieldsOfferstatus" = 'APPROVED', "featuredAssetId" = primary_feat_id, "updatedAt" = NOW() WHERE id = new_var_id;
        END IF;

        -- Translation
        IF EXISTS (SELECT 1 FROM product_variant_translation WHERE "baseId" = new_var_id AND "languageCode" = 'fr') THEN
            UPDATE product_variant_translation SET name = v_rec.name, "updatedAt" = NOW() WHERE "baseId" = new_var_id AND "languageCode" = 'fr';
        ELSE
            INSERT INTO product_variant_translation ("baseId", "languageCode", name, "createdAt", "updatedAt")
            VALUES (new_var_id, 'fr', v_rec.name, NOW(), NOW());
        END IF;

        -- Options
        DELETE FROM product_variant_options_product_option WHERE "productVariantId" = new_var_id;
        INSERT INTO product_variant_options_product_option ("productVariantId", "productOptionId")
        VALUES (new_var_id, v_rec.color_id), (new_var_id, v_rec.cap_id)
        ON CONFLICT DO NOTHING;

        -- Channel 1
        INSERT INTO product_variant_channels_channel ("productVariantId", "channelId")
        VALUES (new_var_id, 1)
        ON CONFLICT DO NOTHING;

        -- Price
        DELETE FROM product_variant_price WHERE "variantId" = new_var_id;
        INSERT INTO product_variant_price ("variantId", "channelId", "currencyCode", price, "createdAt", "updatedAt")
        VALUES (new_var_id, 1, 'XOF', v_rec.price, NOW(), NOW());

        -- Stock
        DELETE FROM stock_level WHERE "productVariantId" = new_var_id;
        INSERT INTO stock_level ("productVariantId", "stockLocationId", "stockOnHand", "stockAllocated", "createdAt", "updatedAt")
        VALUES (new_var_id, 1, 10, 0, NOW(), NOW());

        -- Collections inherit from primary variant
        INSERT INTO collection_product_variants_product_variant ("collectionId", "productVariantId")
        SELECT DISTINCT "collectionId", new_var_id FROM collection_product_variants_product_variant WHERE "productVariantId" = 2532
        ON CONFLICT DO NOTHING;
    END LOOP;
END $$;
