import subprocess

def run_sql(sql):
    res = subprocess.run(
        ["docker", "exec", "-i", "ahizan_db", "psql", "-U", "postgres", "-d", "postgres", "-t", "-A", "-F", "|||"],
        input=sql, capture_output=True, text=True, check=True
    )
    lines = [line.strip() for line in res.stdout.strip().split('\n') if line.strip()]
    return [line.split('|||') for line in lines]

print("=== 1. PRODUITS ACTIFS TISSUS & PAGNES ===")
products = run_sql("""
SELECT p.id, pt.name, pt.slug, p."customFieldsApprovalstatus",
       (SELECT COUNT(*) FROM product_variant pv WHERE pv."productId" = p.id AND pv."deletedAt" IS NULL) as v_count,
       (SELECT COUNT(*) FROM seller_offer so WHERE so."productVariantId" IN (SELECT pv.id FROM product_variant pv WHERE pv."productId" = p.id) AND so.status = 'APPROVED') as o_count
FROM product p
JOIN product_translation pt ON pt."baseId" = p.id
WHERE p."deletedAt" IS NULL
  AND (pt.name ILIKE '%chiganvy%' OR pt.name ILIKE '%vlisco%' OR pt.name ILIKE '%elizabeth%' OR pt.name ILIKE '%lome%')
ORDER BY p.id;
""")
for p in products:
    print(f"Produit #{p[0]}: {p[1]} (Slug: {p[2]}) | Statut: {p[3]} | Variantes: {p[4]} | Offres Approuvées: {p[5]}")

print("\n=== 2. GROUPES D'OPTIONS ASSOCIÉS AU MASTER #635 ===")
groups = run_sql("""
SELECT pog.id, pog.code, pogt.name
FROM product_option_groups_product_option_group pogpog
JOIN product_option_group pog ON pog.id = pogpog."productOptionGroupId"
JOIN product_option_group_translation pogt ON pogt."baseId" = pog.id
WHERE pogpog."productId" = 635;
""")
for g in groups:
    print(f"OptionGroup #{g[0]} (code: {g[1]}) -> Nom: {g[2]}")

print("\n=== 3. ÉCHANTILLON DE VARIANTES SOUS #635 (Tissu Wax Chiganvy) ===")
sample_vars = run_sql("""
SELECT pv.id, pvt.name, pv."featuredAssetId",
       (SELECT string_agg(pogt.name || ': ' || pot.name, ' | ')
        FROM product_variant_options_product_option pvopo
        JOIN product_option po ON po.id = pvopo."productOptionId"
        JOIN product_option_translation pot ON pot."baseId" = po.id
        JOIN product_option_group pog ON pog.id = po."groupId"
        JOIN product_option_group_translation pogt ON pogt."baseId" = pog.id
        WHERE pvopo."productVariantId" = pv.id) as options_str,
       (SELECT so.price FROM seller_offer so WHERE so."productVariantId" = pv.id LIMIT 1) as price,
       (SELECT so.status FROM seller_offer so WHERE so."productVariantId" = pv.id LIMIT 1) as offer_status
FROM product_variant pv
JOIN product_variant_translation pvt ON pvt."baseId" = pv.id
WHERE pv."productId" = 635 AND pv."deletedAt" IS NULL
ORDER BY pv.id
LIMIT 10;
""")
for v in sample_vars:
    print(f"Var #{v[0]} | Nom: {v[1]} | Asset: {v[2]} | Options: {v[3]} | Prix: {v[4]} | Statut: {v[5]}")
