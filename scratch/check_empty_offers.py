import subprocess

def run_sql(sql):
    res = subprocess.run(
        ["docker", "exec", "-i", "ahizan_db", "psql", "-U", "postgres", "-d", "postgres", "-t", "-A", "-F", "|||"],
        input=sql, capture_output=True, text=True, check=True
    )
    lines = [line.strip() for line in res.stdout.strip().split('\n') if line.strip()]
    return [line.split('|||') for line in lines]

rows = run_sql("""
SELECT p.id, pt.name, pv.id, pvt.name, p."customFieldsVendorid",
       (SELECT so.id FROM seller_offer so WHERE so."productVariantId" = pv.id) as offer_id,
       (SELECT so.price FROM seller_offer so WHERE so."productVariantId" = pv.id) as offer_price
FROM product p
JOIN product_translation pt ON pt."baseId" = p.id
JOIN product_variant pv ON pv."productId" = p.id
JOIN product_variant_translation pvt ON pvt."baseId" = pv.id
WHERE p.id IN (617, 618, 619, 642);
""")
for r in rows:
    print(r)
