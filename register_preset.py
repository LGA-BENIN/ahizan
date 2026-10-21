import json
import subprocess
import sys

def main():
    layout_path = '/srv/ahizan/specs/002-homepage-ui-modernization/homepage_layout.json'
    with open(layout_path, 'r', encoding='utf-8') as f:
        layout_data = json.load(f)
    
    sections_json_str = json.dumps(layout_data)
    # Escape single quotes for SQL string literal
    escaped_json = sections_json_str.replace("'", "''")

    preset_name = 'homepage_v2_marketplace_master'
    description = 'Habillage V2 Ahizan Marketplace Master (Jumia + Amazon + Cdiscount) - 10 sections dynamiques'

    sql_check = f"SELECT id, name FROM page_preset WHERE name = '{preset_name}';"
    res = subprocess.run(
        ["docker", "exec", "-i", "ahizan_db", "psql", "-U", "postgres", "-d", "postgres", "-t", "-A", "-c", sql_check],
        capture_output=True, text=True, check=True
    )
    existing_id = res.stdout.strip().split('|')[0] if res.stdout.strip() else None

    if existing_id:
        print(f"Updating existing preset '{preset_name}' (ID: {existing_id})")
        sql_update = f"""
        UPDATE page_preset 
        SET "sectionsJson" = '{escaped_json}', 
            "description" = '{description}', 
            "updatedAt" = NOW(), 
            "status" = 'published'
        WHERE id = {existing_id};
        """
        subprocess.run(
            ["docker", "exec", "-i", "ahizan_db", "psql", "-U", "postgres", "-d", "postgres"],
            input=sql_update, capture_output=True, text=True, check=True
        )
        preset_id = existing_id
    else:
        print(f"Creating new preset '{preset_name}'")
        sql_insert = f"""
        INSERT INTO page_preset (
            "createdAt", "updatedAt", "name", "description", "sectionsJson",
            "isBuiltIn", "isDefault", "isDraft", "status", "version",
            "publishedAt", "isBackup", "historyPointer"
        ) VALUES (
            NOW(), NOW(), '{preset_name}', '{description}', '{escaped_json}',
            false, false, false, 'published', 1,
            NOW(), false, -1
        ) RETURNING id;
        """
        res_insert = subprocess.run(
            ["docker", "exec", "-i", "ahizan_db", "psql", "-U", "postgres", "-d", "postgres", "-t", "-A"],
            input=sql_insert, capture_output=True, text=True, check=True
        )
        preset_id = res_insert.stdout.strip()

    print(f"\n=======================================================")
    print(f"✅ PRESET ENREGISTRÉ AVEC SUCCÈS DANS LA BASE DE DONNÉES !")
    print(f"ID Habillage / Preset : {preset_id}")
    print(f"Nom : {preset_name}")
    print(f"URL de Prévisualisation Storefront : http://localhost:3001/preview?presetId={preset_id}")
    print(f"URL Directe Accueil avec Habillage : http://localhost:3001/?presetId={preset_id}")
    print(f"=======================================================\n")

if __name__ == '__main__':
    main()
