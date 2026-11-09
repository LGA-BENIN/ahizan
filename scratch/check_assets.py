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
    SELECT a.id, a.source, a.preview
    FROM asset a
    WHERE a.id IN (1246, 1247, 1248, 1249, 1250, 1257, 1259, 1264, 1268, 1280, 1284, 1287, 1290, 1205, 1214, 1220, 1223, 1225, 1234, 1236, 1239, 1241, 1291, 1293, 1295)
    ORDER BY a.id;
    """
    rows = run_sql(sql)
    for r in rows:
        print(f"Asset {r[0]}: source={r[1]}")

if __name__ == '__main__':
    main()
