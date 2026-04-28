-- ============================================================
-- SQL Script to Populate Products for Vendors (PostgreSQL)
-- Run this in pgAdmin or psql query tool
-- ============================================================

DO $$
DECLARE
    v_vendor_id INT;
    v_product_id INT;
    v_variant_id INT;
    v_channel_id INT;
BEGIN
    -- 1. Get the Default Channel ID (usually 1)
    SELECT id INTO v_channel_id FROM channel WHERE code = '__default_channel__';
    IF v_channel_id IS NULL THEN
        SELECT id INTO v_channel_id FROM channel LIMIT 1;
    END IF;

    -- ============================================================
    -- 1. Fresh Market Cotonou
    -- ============================================================
    SELECT id INTO v_vendor_id FROM vendor WHERE name = 'Fresh Market Cotonou';
    IF v_vendor_id IS NOT NULL THEN
        
        -- Product 1: Tomates
        INSERT INTO product ("createdAt", "updatedAt", "enabled", "deletedAt", "customFieldsVendorId")
        VALUES (NOW(), NOW(), true, NULL, v_vendor_id) RETURNING id INTO v_product_id;

        INSERT INTO product_translation ("createdAt", "updatedAt", "languageCode", "name", "slug", "description", "productId")
        VALUES (NOW(), NOW(), 'en', 'Tomates Fraîches (1kg)', 'tomates-fraiches-1kg', 'Tomates locales bien rouges et juteuses du marché.', v_product_id);

        INSERT INTO product_channel ("productId", "channelId") VALUES (v_product_id, v_channel_id);

        INSERT INTO product_variant ("createdAt", "updatedAt", "productId", "sku", "price", "currencyCode", "stockLevel", "enabled", "listPrice")
        VALUES (NOW(), NOW(), v_product_id, 'TOM-001', 1500, 'XOF', 100, true, 1500) RETURNING id INTO v_variant_id;
        
        INSERT INTO product_variant_translation ("createdAt", "updatedAt", "languageCode", "name", "productVariantId")
        VALUES (NOW(), NOW(), 'en', 'Tomates Fraîches (1kg)', v_variant_id);
        
        INSERT INTO product_variant_price ("createdAt", "updatedAt", "price", "channelId", "variantId")
        VALUES (NOW(), NOW(), 1500, v_channel_id, v_variant_id);


        -- Product 2: Ananas
        INSERT INTO product ("createdAt", "updatedAt", "enabled", "deletedAt", "customFieldsVendorId")
        VALUES (NOW(), NOW(), true, NULL, v_vendor_id) RETURNING id INTO v_product_id;

        INSERT INTO product_translation ("createdAt", "updatedAt", "languageCode", "name", "slug", "description", "productId")
        VALUES (NOW(), NOW(), 'en', 'Ananas Pain de Sucre', 'ananas-pain-de-sucre', 'Ananas très sucré variété pain de sucre.', v_product_id);

        INSERT INTO product_channel ("productId", "channelId") VALUES (v_product_id, v_channel_id);

        INSERT INTO product_variant ("createdAt", "updatedAt", "productId", "sku", "price", "currencyCode", "stockLevel", "enabled", "listPrice")
        VALUES (NOW(), NOW(), v_product_id, 'ANA-002', 500, 'XOF', 50, true, 500) RETURNING id INTO v_variant_id;
        
        INSERT INTO product_variant_translation ("createdAt", "updatedAt", "languageCode", "name", "productVariantId")
        VALUES (NOW(), NOW(), 'en', 'Ananas Pain de Sucre', v_variant_id);

        INSERT INTO product_variant_price ("createdAt", "updatedAt", "price", "channelId", "variantId")
        VALUES (NOW(), NOW(), 500, v_channel_id, v_variant_id);

    END IF;

    -- ============================================================
    -- 2. Tech Zone Benin
    -- ============================================================
    SELECT id INTO v_vendor_id FROM vendor WHERE name = 'Tech Zone Benin';
    IF v_vendor_id IS NOT NULL THEN
        
        -- Product 1: iPhone
        INSERT INTO product ("createdAt", "updatedAt", "enabled", "deletedAt", "customFieldsVendorId")
        VALUES (NOW(), NOW(), true, NULL, v_vendor_id) RETURNING id INTO v_product_id;

        INSERT INTO product_translation ("createdAt", "updatedAt", "languageCode", "name", "slug", "description", "productId")
        VALUES (NOW(), NOW(), 'en', 'iPhone 13 128GB', 'iphone-13-128gb', 'Smartphone Apple neuf avec garantie.', v_product_id);

        INSERT INTO product_channel ("productId", "channelId") VALUES (v_product_id, v_channel_id);

        INSERT INTO product_variant ("createdAt", "updatedAt", "productId", "sku", "price", "currencyCode", "stockLevel", "enabled", "listPrice")
        VALUES (NOW(), NOW(), v_product_id, 'IPH-13-128', 450000, 'XOF', 10, true, 450000) RETURNING id INTO v_variant_id;
        
        INSERT INTO product_variant_translation ("createdAt", "updatedAt", "languageCode", "name", "productVariantId")
        VALUES (NOW(), NOW(), 'en', 'iPhone 13 128GB', v_variant_id);

        INSERT INTO product_variant_price ("createdAt", "updatedAt", "price", "channelId", "variantId")
        VALUES (NOW(), NOW(), 450000, v_channel_id, v_variant_id);

        -- Product 2: Samsung
        INSERT INTO product ("createdAt", "updatedAt", "enabled", "deletedAt", "customFieldsVendorId")
        VALUES (NOW(), NOW(), true, NULL, v_vendor_id) RETURNING id INTO v_product_id;

        INSERT INTO product_translation ("createdAt", "updatedAt", "languageCode", "name", "slug", "description", "productId")
        VALUES (NOW(), NOW(), 'en', 'Samsung Galaxy S21', 'samsung-galaxy-s21', 'Samsung Galaxy S21 ultra performant.', v_product_id);

        INSERT INTO product_channel ("productId", "channelId") VALUES (v_product_id, v_channel_id);

        INSERT INTO product_variant ("createdAt", "updatedAt", "productId", "sku", "price", "currencyCode", "stockLevel", "enabled", "listPrice")
        VALUES (NOW(), NOW(), v_product_id, 'SAM-S21', 350000, 'XOF', 15, true, 350000) RETURNING id INTO v_variant_id;
        
        INSERT INTO product_variant_translation ("createdAt", "updatedAt", "languageCode", "name", "productVariantId")
        VALUES (NOW(), NOW(), 'en', 'Samsung Galaxy S21', v_variant_id);

        INSERT INTO product_variant_price ("createdAt", "updatedAt", "price", "channelId", "variantId")
        VALUES (NOW(), NOW(), 350000, v_channel_id, v_variant_id);

    END IF;

    -- ============================================================
    -- 3. Mode Élégance
    -- ============================================================
    SELECT id INTO v_vendor_id FROM vendor WHERE name = 'Mode Élégance';
    IF v_vendor_id IS NOT NULL THEN
        
        -- Product 1: Robe
        INSERT INTO product ("createdAt", "updatedAt", "enabled", "deletedAt", "customFieldsVendorId")
        VALUES (NOW(), NOW(), true, NULL, v_vendor_id) RETURNING id INTO v_product_id;

        INSERT INTO product_translation ("createdAt", "updatedAt", "languageCode", "name", "slug", "description", "productId")
        VALUES (NOW(), NOW(), 'en', 'Robe en Pagne Wax', 'robe-en-pagne-wax', 'Robe sur mesure en tissu Wax original.', v_product_id);

        INSERT INTO product_channel ("productId", "channelId") VALUES (v_product_id, v_channel_id);

        INSERT INTO product_variant ("createdAt", "updatedAt", "productId", "sku", "price", "currencyCode", "stockLevel", "enabled", "listPrice")
        VALUES (NOW(), NOW(), v_product_id, 'ROB-WAX-01', 12000, 'XOF', 5, true, 12000) RETURNING id INTO v_variant_id;
        
        INSERT INTO product_variant_translation ("createdAt", "updatedAt", "languageCode", "name", "productVariantId")
        VALUES (NOW(), NOW(), 'en', 'Robe en Pagne Wax', v_variant_id);

        INSERT INTO product_variant_price ("createdAt", "updatedAt", "price", "channelId", "variantId")
        VALUES (NOW(), NOW(), 12000, v_channel_id, v_variant_id);

    END IF;

    -- ============================================================
    -- 4. Electro Discount
    -- ============================================================
    SELECT id INTO v_vendor_id FROM vendor WHERE name = 'Electro Discount';
    IF v_vendor_id IS NOT NULL THEN
        
        INSERT INTO product ("createdAt", "updatedAt", "enabled", "deletedAt", "customFieldsVendorId")
        VALUES (NOW(), NOW(), true, NULL, v_vendor_id) RETURNING id INTO v_product_id;

        INSERT INTO product_translation ("createdAt", "updatedAt", "languageCode", "name", "slug", "description", "productId")
        VALUES (NOW(), NOW(), 'en', 'Mixeur Moulinex', 'mixeur-moulinex', 'Mixeur blender puissant pour cuisine.', v_product_id);

        INSERT INTO product_channel ("productId", "channelId") VALUES (v_product_id, v_channel_id);

        INSERT INTO product_variant ("createdAt", "updatedAt", "productId", "sku", "price", "currencyCode", "stockLevel", "enabled", "listPrice")
        VALUES (NOW(), NOW(), v_product_id, 'MIX-001', 25000, 'XOF', 20, true, 25000) RETURNING id INTO v_variant_id;
        
        INSERT INTO product_variant_translation ("createdAt", "updatedAt", "languageCode", "name", "productVariantId")
        VALUES (NOW(), NOW(), 'en', 'Mixeur Moulinex', v_variant_id);

        INSERT INTO product_variant_price ("createdAt", "updatedAt", "price", "channelId", "variantId")
        VALUES (NOW(), NOW(), 25000, v_channel_id, v_variant_id);

    END IF;

    -- ============================================================
    -- 5. Le Petit Boulanger
    -- ============================================================
    SELECT id INTO v_vendor_id FROM vendor WHERE name = 'Le Petit Boulanger';
    IF v_vendor_id IS NOT NULL THEN
        
        INSERT INTO product ("createdAt", "updatedAt", "enabled", "deletedAt", "customFieldsVendorId")
        VALUES (NOW(), NOW(), true, NULL, v_vendor_id) RETURNING id INTO v_product_id;

        INSERT INTO product_translation ("createdAt", "updatedAt", "languageCode", "name", "slug", "description", "productId")
        VALUES (NOW(), NOW(), 'en', 'Baguette Croustillante', 'baguette-croustillante', 'Pain baguette frais du matin.', v_product_id);

        INSERT INTO product_channel ("productId", "channelId") VALUES (v_product_id, v_channel_id);

        INSERT INTO product_variant ("createdAt", "updatedAt", "productId", "sku", "price", "currencyCode", "stockLevel", "enabled", "listPrice")
        VALUES (NOW(), NOW(), v_product_id, 'PAIN-01', 150, 'XOF', 100, true, 150) RETURNING id INTO v_variant_id;
        
        INSERT INTO product_variant_translation ("createdAt", "updatedAt", "languageCode", "name", "productVariantId")
        VALUES (NOW(), NOW(), 'en', 'Baguette Croustillante', v_variant_id);

        INSERT INTO product_variant_price ("createdAt", "updatedAt", "price", "channelId", "variantId")
        VALUES (NOW(), NOW(), 150, v_channel_id, v_variant_id);

    END IF;

END $$;
