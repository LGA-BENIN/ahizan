import subprocess

def run_sql(sql):
    res = subprocess.run(
        ["docker", "exec", "-i", "ahizan_db", "psql", "-U", "postgres", "-d", "postgres", "-t", "-A", "-F", "|||"],
        input=sql, capture_output=True, text=True, check=True
    )
    lines = [line.strip() for line in res.stdout.strip().split('\n') if line.strip()]
    return [line.split('|||') for line in lines]

def main():
    sql = """
    SELECT p.id as p_id, pt.name as p_name, pv.id as v_id, pvt.name as v_name, 
           pv."featuredAssetId" as v_asset, p."featuredAssetId" as p_asset,
           (SELECT string_agg(pot.name, ' / ') 
            FROM product_variant_options_product_option pvo 
            JOIN product_option_translation pot ON pot."baseId" = pvo."productOptionId" 
            WHERE pvo."productVariantId" = pv.id) as opts
    FROM product p
    JOIN product_translation pt ON pt."baseId" = p.id
    JOIN product_variant pv ON pv."productId" = p.id
    JOIN product_variant_translation pvt ON pvt."baseId" = pv.id
    WHERE p."deletedAt" IS NULL
      AND (pt.name ILIKE '%chiganvy%' OR pt.name ILIKE '%vlisco%' OR pt.name ILIKE '%elizabeth%' OR pt.name ILIKE '%lome%')
    ORDER BY p.id, pv.id;
    """
    rows = run_sql(sql)
    print(f"Total variants across all 50 products: {len(rows)}")
    for r in rows:
        print(f"P_ID:{r[0]} | V_ID:{r[2]} | V_Name:{r[3]} | V_Asset:{r[4]} | P_Asset:{r[5]} | Opts:{r[6]}")

if __name__ == '__main__':
    main()
