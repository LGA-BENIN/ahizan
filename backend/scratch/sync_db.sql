-- 1. Ensure all products and variants are assigned to Default Channel 1
INSERT INTO product_channels_channel ("productId", "channelId")
SELECT p.id, 1 FROM product p WHERE p."deletedAt" IS NULL
ON CONFLICT DO NOTHING;

INSERT INTO product_variant_channels_channel ("productVariantId", "channelId")
SELECT pv.id, 1 FROM product_variant pv WHERE pv."deletedAt" IS NULL
ON CONFLICT DO NOTHING;

-- 2. Inherit collections from sibling variants (all variants of a product share the product collections)
INSERT INTO collection_product_variants_product_variant ("collectionId", "productVariantId")
SELECT DISTINCT cpv_src."collectionId", pv_tgt.id
FROM product_variant pv_tgt
INNER JOIN product_variant pv_src ON pv_src."productId" = pv_tgt."productId" AND pv_src.id != pv_tgt.id
INNER JOIN collection_product_variants_product_variant cpv_src ON cpv_src."productVariantId" = pv_src.id
ON CONFLICT DO NOTHING;

-- 2b. Auto-populate missing/empty names in product_variant_translation
UPDATE product_variant_translation pvt
SET name = COALESCE(
    (
        SELECT CASE
            WHEN string_agg(ot.name::text, ' - ' ORDER BY po.id) IS NOT NULL AND string_agg(ot.name::text, ' - ' ORDER BY po.id) != ''
            THEN pt.name || ' - ' || string_agg(ot.name::text, ' - ' ORDER BY po.id)
            ELSE pt.name
        END
        FROM product_variant_options_product_option pvo
        INNER JOIN product_option po ON po.id = pvo."productOptionId"
        LEFT JOIN product_option_translation ot ON ot."baseId" = po.id AND ot."languageCode" = 'fr'
        WHERE pvo."productVariantId" = pv.id
    ),
    pt.name,
    'Variante'
),
"updatedAt" = NOW()
FROM product_variant pv
INNER JOIN product p ON p.id = pv."productId"
LEFT JOIN product_translation pt ON pt."baseId" = p.id AND pt."languageCode" = 'fr'
WHERE pvt."baseId" = pv.id AND (pvt.name IS NULL OR pvt.name = '' OR pvt.name = 'Variante');

-- 2c. Insert missing translations for variants without translation record
INSERT INTO product_variant_translation ("baseId", "languageCode", "name", "createdAt", "updatedAt")
SELECT 
    pv.id,
    'fr',
    COALESCE(
        (
            SELECT CASE
                WHEN string_agg(ot.name::text, ' - ' ORDER BY po.id) IS NOT NULL AND string_agg(ot.name::text, ' - ' ORDER BY po.id) != ''
                THEN pt.name || ' - ' || string_agg(ot.name::text, ' - ' ORDER BY po.id)
                ELSE pt.name
            END
            FROM product_variant_options_product_option pvo
            INNER JOIN product_option po ON po.id = pvo."productOptionId"
            LEFT JOIN product_option_translation ot ON ot."baseId" = po.id AND ot."languageCode" = 'fr'
            WHERE pvo."productVariantId" = pv.id
        ),
        pt.name,
        'Variante'
    ),
    NOW(),
    NOW()
FROM product_variant pv
INNER JOIN product p ON p.id = pv."productId"
LEFT JOIN product_translation pt ON pt."baseId" = p.id AND pt."languageCode" = 'fr'
WHERE pv."deletedAt" IS NULL 
  AND NOT EXISTS (SELECT 1 FROM product_variant_translation pvt WHERE pvt."baseId" = pv.id AND pvt."languageCode" = 'fr');

-- 3. Sync product_variant enabled state
UPDATE product_variant pv_sync
SET enabled = (
    CASE
        WHEN EXISTS (
            SELECT 1 FROM seller_offer so_any 
            WHERE so_any."productVariantId" = pv_sync.id
        )
        THEN (p_sync.enabled AND EXISTS (
            SELECT 1 FROM seller_offer so 
            WHERE so."productVariantId" = pv_sync.id AND so.status = 'approved'
        ))
        ELSE (p_sync.enabled AND pv_sync.enabled)
    END
),
"customFieldsOfferstatus" = COALESCE(
    (
        SELECT CASE WHEN so_b.status = 'approved' THEN 'APPROVED' WHEN so_b.status = 'rejected' THEN 'REJECTED' ELSE 'PENDING' END
        FROM seller_offer so_b
        WHERE so_b."productVariantId" = pv_sync.id
        ORDER BY CASE WHEN so_b.status = 'approved' THEN 1 WHEN so_b.status = 'pending' THEN 2 ELSE 3 END
        LIMIT 1
    ),
    'APPROVED'
),
"updatedAt" = NOW()
FROM product p_sync
WHERE pv_sync."productId" = p_sync.id;

-- 4. Full UPSERT of search_index_item for Default Channel 1
INSERT INTO search_index_item ("languageCode", "enabled", "productName", "productVariantName", "description", "slug", "sku", "facetIds", "facetValueIds", "collectionIds", "collectionSlugs", "channelIds", "productPreview", "productPreviewFocalPoint", "productVariantPreview", "productVariantPreviewFocalPoint", "inStock", "productInStock", "productVariantId", "channelId", "productId", "productAssetId", "productVariantAssetId", "price", "priceWithTax")
SELECT DISTINCT ON (pv.id)
    'fr',
    (CASE WHEN EXISTS (SELECT 1 FROM seller_offer so_any WHERE so_any."productVariantId" = pv.id) THEN (p.enabled AND EXISTS (SELECT 1 FROM seller_offer so_app WHERE so_app."productVariantId" = pv.id AND so_app.status = 'approved')) ELSE (p.enabled AND pv.enabled) END),
    COALESCE(pt.name, 'Produit'),
    COALESCE(
        pvt.name,
        (
            SELECT CASE
                WHEN string_agg(ot_init.name::text, ' - ' ORDER BY po_init.id) IS NOT NULL
                  AND string_agg(ot_init.name::text, ' - ' ORDER BY po_init.id) != ''
                THEN (SELECT pt_n.name FROM product_translation pt_n WHERE pt_n."baseId" = p.id AND pt_n."languageCode" = 'fr' LIMIT 1)::text
                     || ' - ' || string_agg(ot_init.name::text, ' - ' ORDER BY po_init.id)
                ELSE (SELECT pt_n.name FROM product_translation pt_n WHERE pt_n."baseId" = p.id AND pt_n."languageCode" = 'fr' LIMIT 1)::text
            END
            FROM product_variant_options_product_option pvo_init
            INNER JOIN product_option po_init ON po_init.id = pvo_init."productOptionId"
            LEFT JOIN product_option_translation ot_init ON ot_init."baseId" = po_init.id AND ot_init."languageCode" = 'fr'
            WHERE pvo_init."productVariantId" = pv.id
        ),
        pt.name,
        'Variante'
    ),
    COALESCE(pt.description, ''),
    COALESCE(pt.slug, 'produit'),
    COALESCE(pv.sku, ''),
    '',
    '',
    COALESCE((SELECT string_agg(DISTINCT cpv."collectionId"::text, ',') FROM collection_product_variants_product_variant cpv WHERE cpv."productVariantId" = pv.id), ''),
    COALESCE((SELECT string_agg(DISTINCT ct.slug, ',') FROM collection_product_variants_product_variant cpv INNER JOIN collection_translation ct ON ct."baseId" = cpv."collectionId" WHERE cpv."productVariantId" = pv.id), ''),
    '1',
    COALESCE(pa.preview, ''),
    NULL,
    COALESCE(pva.preview, pa.preview, ''),
    NULL,
    true,
    true,
    pv.id,
    1,
    p.id,
    p."featuredAssetId",
    pv."featuredAssetId",
    COALESCE((SELECT MIN(so_app.price) FROM seller_offer so_app WHERE so_app."productVariantId" = pv.id AND so_app.status = 'approved'), pvp.price, 0),
    COALESCE((SELECT MIN(so_app.price) FROM seller_offer so_app WHERE so_app."productVariantId" = pv.id AND so_app.status = 'approved'), pvp.price, 0)
FROM product_variant pv
INNER JOIN product p ON p.id = pv."productId"
LEFT JOIN product_translation pt ON pt."baseId" = p.id AND pt."languageCode" = 'fr'
LEFT JOIN product_variant_translation pvt ON pvt."baseId" = pv.id AND pvt."languageCode" = 'fr'
LEFT JOIN product_variant_price pvp ON pvp."variantId" = pv.id
LEFT JOIN asset pa ON pa.id = p."featuredAssetId"
LEFT JOIN asset pva ON pva.id = pv."featuredAssetId"
WHERE pv."deletedAt" IS NULL AND p."deletedAt" IS NULL
ORDER BY pv.id
ON CONFLICT ("channelId", "languageCode", "productVariantId") DO UPDATE
SET "enabled" = EXCLUDED."enabled",
    "collectionIds" = EXCLUDED."collectionIds",
    "collectionSlugs" = EXCLUDED."collectionSlugs",
    "productName" = EXCLUDED."productName",
    "productVariantName" = EXCLUDED."productVariantName",
    "slug" = EXCLUDED."slug",
    "productPreview" = EXCLUDED."productPreview",
    "productVariantPreview" = EXCLUDED."productVariantPreview",
    "price" = EXCLUDED."price",
    "priceWithTax" = EXCLUDED."priceWithTax";
