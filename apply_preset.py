import json
import subprocess
import sys

def main():
    preset_id = sys.argv[1] if len(sys.argv) > 1 else '1618'
    print(f"Applying preset {preset_id} to 'home' page (id: 1)...")

    # 1. Fetch preset sectionsJson
    res = subprocess.run(
        ["docker", "exec", "-i", "ahizan_db", "psql", "-U", "postgres", "-d", "postgres", "-t", "-A", "-c", 
         f"SELECT \"sectionsJson\" FROM page_preset WHERE id = {preset_id};"],
        capture_output=True, text=True, check=True
    )
    sections_json = res.stdout.strip()
    if not sections_json:
        print(f"Error: Preset {preset_id} not found")
        sys.exit(1)

    sections = json.loads(sections_json)

    # 2. Backup current page sections into auto-backup preset
    print("Creating auto-backup of current home page...")
    backup_sql = f"""
    INSERT INTO page_preset (
        "createdAt", "updatedAt", "name", "description", "sectionsJson",
        "isBuiltIn", "isDefault", "isDraft", "status", "version",
        "publishedAt", "isBackup", "historyPointer"
    ) 
    SELECT NOW(), NOW(), 'auto-backup-' || EXTRACT(EPOCH FROM NOW())::bigint, 
           'Sauvegarde avant activation preset ' || '{preset_id}',
           json_agg(json_build_object(
               'type', type, 'title', title, 'description', description,
               'layout', layout, 'order', "order", 'isActive', "isActive",
               'pageSlug', 'home', 'dataJson', "dataJson"
           ))::text,
           false, false, false, 'published', 1, NOW(), true, -1
    FROM page_section WHERE "pageId" = 1;
    """
    subprocess.run(["docker", "exec", "-i", "ahizan_db", "psql", "-U", "postgres", "-d", "postgres", "-c", backup_sql], check=True)

    # 3. Clear existing home sections
    print("Clearing active sections for home page...")
    subprocess.run(["docker", "exec", "-i", "ahizan_db", "psql", "-U", "postgres", "-d", "postgres", "-c", 
                    "DELETE FROM page_section WHERE \"pageId\" = 1;"], check=True)

    # 4. Insert new sections
    print(f"Inserting {len(sections)} sections from preset {preset_id} into home page...")
    for s in sections:
        sec_type = s.get('type', 'CUSTOM')
        title = (s.get('title') or '').replace("'", "''")
        desc = (s.get('description') or '').replace("'", "''")
        layout = (s.get('layout') or 'grid').replace("'", "''")
        order = s.get('order', 0)
        is_active = 'true' if s.get('isActive') != False else 'false'
        data_json = s.get('dataJson', {})
        if isinstance(data_json, dict):
            data_str = json.dumps(data_json).replace("'", "''")
        else:
            data_str = str(data_json).replace("'", "''")

        insert_sec_sql = f"""
        INSERT INTO page_section (
            "createdAt", "updatedAt", "pageId", "type", "title",
            "description", "layout", "order", "isActive", "dataJson"
        ) VALUES (
            NOW(), NOW(), 1, '{sec_type}', '{title}',
            '{desc}', '{layout}', {order}, {is_active}, '{data_str}'
        );
        """
        subprocess.run(["docker", "exec", "-i", "ahizan_db", "psql", "-U", "postgres", "-d", "postgres", "-c", insert_sec_sql], check=True)

    # 5. Set preset as default in page_preset
    subprocess.run(["docker", "exec", "-i", "ahizan_db", "psql", "-U", "postgres", "-d", "postgres", "-c", 
                    f"UPDATE page_preset SET \"isDefault\" = false; UPDATE page_preset SET \"isDefault\" = true WHERE id = {preset_id};"], check=True)

    print(f"\n✅ Preset {preset_id} activé avec succès sur la page d'accueil d'Areezan !")

if __name__ == '__main__':
    main()
