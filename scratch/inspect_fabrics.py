import subprocess
import json

def run_sql(sql):
    res = subprocess.run(
        ["docker", "exec", "-i", "ahizan_db", "psql", "-U", "postgres", "-d", "postgres", "-t", "-A", "-F", "|||"],
        input=sql, capture_output=True, text=True, check=True
    )
    lines = [line.strip() for line in res.stdout.strip().split('\n') if line.strip()]
    return [line.split('|||') for line in lines]

def main():
    sql = """
    SELECT p.id, pt.name, p."featuredAssetId", p."customFieldsApprovalstatus",
           (SELECT COUNT(*) FROM product_variant pv WHERE pv."productId" = p.id AND pv."deletedAt" IS NULL) as v_count,
           (SELECT COUNT(*) FROM seller_offer so WHERE so."productVariantId" IN (SELECT pv.id FROM product_variant pv WHERE pv."productId" = p.id)) as o_count
    FROM product p
    JOIN product_translation pt ON pt."baseId" = p.id
    WHERE p."deletedAt" IS NULL
      AND (pt.name ILIKE '%chiganvy%' OR pt.name ILIKE '%vlisco%' OR pt.name ILIKE '%elizabeth%' OR pt.name ILIKE '%lome%')
    ORDER BY pt.name, p.id;
    """
    rows = run_sql(sql)
    print(f"Total fabric products: {len(rows)}")
    for r in rows:
        print(f"ID: {r[0]} | Name: {r[1]} | Asset: {r[2]} | Status: {r[3]} | Variants: {r[4]} | Offers: {r[5]}")

if __name__ == '__main__':
    main()
