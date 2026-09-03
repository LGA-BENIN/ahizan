/**
 * Fix: Inherit collectionIds for all seller-grafted variants that have approved offers
 * but empty collectionIds in search_index_item.
 * Also fix productVariantName format: "Product Name (Option1 / Option2)"
 */

const { Client } = require('pg');

const c = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'Fernand0@91820805',
  database: process.env.DB_NAME || 'postgres',
});

async function main() {
  await c.connect();
  console.log('[fix] Connected to DB');

  // STEP 1: Inherit collections for ALL variants that have approved offers but empty collectionIds in sii
  const step1 = await c.query(`
    INSERT INTO collection_product_variants_product_variant ("collectionId", "productVariantId")
    SELECT DISTINCT cpv_src."collectionId", pv_tgt.id
    FROM product_variant pv_tgt
    INNER JOIN seller_offer so ON so."productVariantId" = pv_tgt.id AND so.status = 'approved'
    INNER JOIN product_variant pv_src ON pv_src."productId" = pv_tgt."productId" AND pv_src.id != pv_tgt.id
    INNER JOIN collection_product_variants_product_variant cpv_src ON cpv_src."productVariantId" = pv_src.id
    WHERE NOT EXISTS (
      SELECT 1 FROM collection_product_variants_product_variant cpv_check
      WHERE cpv_check."productVariantId" = pv_tgt.id
    )
    ON CONFLICT DO NOTHING
  `);
  console.log('[fix] Step 1 - Inherit collections for orphan variants:', step1.rowCount, 'rows inserted');

  // STEP 2: For ALL variants with empty collectionIds in sii, inherit from siblings
  const step2 = await c.query(`
    INSERT INTO collection_product_variants_product_variant ("collectionId", "productVariantId")
    SELECT DISTINCT cpv_src."collectionId", pv_tgt.id
    FROM product_variant pv_tgt
    INNER JOIN search_index_item sii ON sii."productVariantId" = pv_tgt.id AND sii."channelId" = 1
    INNER JOIN product_variant pv_src ON pv_src."productId" = pv_tgt."productId" AND pv_src.id != pv_tgt.id
    INNER JOIN collection_product_variants_product_variant cpv_src ON cpv_src."productVariantId" = pv_src.id
    WHERE (sii."collectionIds" IS NULL OR sii."collectionIds" = '')
    ON CONFLICT DO NOTHING
  `);
  console.log('[fix] Step 2 - Inherit collections for sii-empty variants:', step2.rowCount, 'rows inserted');

  // STEP 3: Update search_index_item collectionIds and collectionSlugs for ALL variants
  const step3 = await c.query(`
    UPDATE search_index_item sii
    SET
      "collectionIds" = COALESCE((
        SELECT string_agg(DISTINCT cpv."collectionId"::text, ',')
        FROM collection_product_variants_product_variant cpv
        WHERE cpv."productVariantId" = sii."productVariantId"
      ), ''),
      "collectionSlugs" = COALESCE((
        SELECT string_agg(DISTINCT ct.slug, ',')
        FROM collection_product_variants_product_variant cpv
        INNER JOIN collection_translation ct ON ct."baseId" = cpv."collectionId"
        WHERE cpv."productVariantId" = sii."productVariantId"
      ), '')
    WHERE sii."channelId" = 1
    AND (sii."collectionIds" IS NULL OR sii."collectionIds" = '' OR sii."collectionIds" NOT LIKE '%,%')
  `);
  console.log('[fix] Step 3 - Update sii collectionIds:', step3.rowCount, 'rows updated');

  // STEP 4: Update productVariantName - format: "Product Name (Option1 / Option2)" or just "Product Name"
  const step4 = await c.query(`
    UPDATE search_index_item sii
    SET "productVariantName" = COALESCE((
      SELECT
        CASE
          WHEN string_agg(ot.name::text, ' / ' ORDER BY po.id) IS NOT NULL
            AND string_agg(ot.name::text, ' / ' ORDER BY po.id) != ''
          THEN pt.name::text || ' (' || string_agg(ot.name::text, ' / ' ORDER BY po.id) || ')'
          ELSE pt.name::text
        END
      FROM product_variant pv_inner
      INNER JOIN product p_inner ON p_inner.id = pv_inner."productId"
      LEFT JOIN product_translation pt ON pt."baseId" = p_inner.id AND pt."languageCode" = sii."languageCode"
      LEFT JOIN product_variant_options_product_option pvo ON pvo."productVariantId" = pv_inner.id
      LEFT JOIN product_option po ON po.id = pvo."productOptionId"
      LEFT JOIN product_option_translation ot ON ot."baseId" = po.id AND ot."languageCode" = sii."languageCode"
      WHERE pv_inner.id = sii."productVariantId"
      GROUP BY pt.name
    ), sii."productName"::text)
    WHERE sii."channelId" = 1
    AND (sii."productVariantName" IS NULL OR sii."productVariantName" = '' OR sii."productVariantName" = sii."productName")
  `);
  console.log('[fix] Step 4 - Update productVariantName:', step4.rowCount, 'rows updated');

  // STEP 5: Full update of productVariantName for ALL items
  const step5 = await c.query(`
    UPDATE search_index_item sii
    SET "productVariantName" = COALESCE((
      SELECT
        CASE
          WHEN string_agg(ot.name::text, ' / ' ORDER BY po.id) IS NOT NULL
            AND string_agg(ot.name::text, ' / ' ORDER BY po.id) != ''
          THEN pt.name::text || ' (' || string_agg(ot.name::text, ' / ' ORDER BY po.id) || ')'
          ELSE pt.name::text
        END
      FROM product_variant pv_inner
      INNER JOIN product p_inner ON p_inner.id = pv_inner."productId"
      LEFT JOIN product_translation pt ON pt."baseId" = p_inner.id AND pt."languageCode" = sii."languageCode"
      LEFT JOIN product_variant_options_product_option pvo ON pvo."productVariantId" = pv_inner.id
      LEFT JOIN product_option po ON po.id = pvo."productOptionId"
      LEFT JOIN product_option_translation ot ON ot."baseId" = po.id AND ot."languageCode" = sii."languageCode"
      WHERE pv_inner.id = sii."productVariantId"
      GROUP BY pt.name
    ), sii."productName"::text)
    WHERE sii."channelId" = 1
  `);
  console.log('[fix] Step 5 - Full productVariantName update:', step5.rowCount, 'rows updated');

  // STEP 6: Update enabled state - only variants with p.enabled AND approved offer (or native)
  const step6 = await c.query(`
    UPDATE search_index_item sii
    SET "enabled" = (
      CASE
        WHEN EXISTS (SELECT 1 FROM seller_offer so_any WHERE so_any."productVariantId" = pv.id)
        THEN (p.enabled AND EXISTS (
          SELECT 1 FROM seller_offer so_app
          WHERE so_app."productVariantId" = pv.id AND so_app.status = 'approved'
        ))
        ELSE (p.enabled AND pv.enabled)
      END
    )
    FROM product_variant pv
    INNER JOIN product p ON p.id = pv."productId"
    WHERE sii."productVariantId" = pv.id AND sii."channelId" = 1
  `);
  console.log('[fix] Step 6 - Sync enabled state:', step6.rowCount, 'rows updated');

  // VERIFY: Show apres-apres variants
  const verify = await c.query(`
    SELECT
      pv.id, pv.sku,
      sii.enabled, sii."collectionIds", sii."productVariantName", sii.price,
      so.status, so.price as offer_price,
      v.name as vendor
    FROM product_variant pv
    INNER JOIN product p ON p.id = pv."productId"
    INNER JOIN product_translation pt ON pt."baseId" = p.id AND pt."languageCode" = 'fr'
    LEFT JOIN search_index_item sii ON sii."productVariantId" = pv.id AND sii."channelId" = 1
    LEFT JOIN seller_offer so ON so."productVariantId" = pv.id
    LEFT JOIN vendor v ON v.id = so."vendorId"
    WHERE pt.slug = 'apres-apres'
    ORDER BY pv.id, so.status
  `);
  console.log('[fix] VERIFY apres-apres:');
  verify.rows.forEach(r => console.log(JSON.stringify(r)));

  await c.end();
  console.log('[fix] Done!');
}

main().catch(e => { console.error('[fix] FATAL:', e.message); process.exit(1); });
