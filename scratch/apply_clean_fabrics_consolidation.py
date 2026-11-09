import subprocess
import json
import re

def run_sql(sql):
    res = subprocess.run(
        ["docker", "exec", "-i", "ahizan_db", "psql", "-U", "postgres", "-d", "postgres", "-t", "-A", "-F", "|||"],
        input=sql, capture_output=True, text=True, check=True
    )
    lines = [line.strip() for line in res.stdout.strip().split('\n') if line.strip()]
    return [line.split('|||') for line in lines]

def execute_sql(sql):
    res = subprocess.run(
        ["docker", "exec", "-i", "ahizan_db", "psql", "-U", "postgres", "-d", "postgres"],
        input=sql, capture_output=True, text=True, check=True
    )
    return res.stdout

def main():
    print("🚀 Début de l'application de la consolidation propre des Tissus & Pagnes...")

    # 1. OptionGroup 'motif'
    check_opt_group = run_sql("SELECT id FROM product_option_group WHERE code = 'motif';")
    if check_opt_group and check_opt_group[0][0]:
        motif_group_id = int(check_opt_group[0][0])
        print(f"OptionGroup 'motif' existe déjà (ID: {motif_group_id})")
    else:
        create_group_sql = """
        INSERT INTO product_option_group ("createdAt", "updatedAt", "code")
        VALUES (NOW(), NOW(), 'motif')
        RETURNING id;
        """
        motif_group_id = int(run_sql(create_group_sql)[0][0])
        print(f"✅ OptionGroup 'motif' créé (ID: {motif_group_id})")

    # Mettre à jour la traduction de motif_group
    execute_sql(f"""
    DELETE FROM product_option_group_translation WHERE "baseId" = {motif_group_id};
    INSERT INTO product_option_group_translation ("baseId", "languageCode", "name", "createdAt", "updatedAt")
    VALUES ({motif_group_id}, 'fr', 'Motif', NOW(), NOW());
    INSERT INTO product_option_group_channels_channel ("productOptionGroupId", "channelId")
    SELECT {motif_group_id}, id FROM channel ON CONFLICT DO NOTHING;
    """)

    # OptionGroup 'couleur'
    couleur_group_row = run_sql("SELECT id FROM product_option_group WHERE code = 'couleur' LIMIT 1;")
    couleur_group_id = int(couleur_group_row[0][0]) if couleur_group_row else 40
    print(f"OptionGroup 'couleur' (ID: {couleur_group_id})")
    execute_sql(f"""
    INSERT INTO product_option_group_channels_channel ("productOptionGroupId", "channelId")
    SELECT {couleur_group_id}, id FROM channel ON CONFLICT DO NOTHING;
    """)

    # 2. Création du dictionnaire de Couleurs existantes dans le groupe 'couleur' (id: 40)
    existing_colors_rows = run_sql(f"""
    SELECT po.id, po.code, pot.name
    FROM product_option po
    JOIN product_option_translation pot ON pot."baseId" = po.id
    WHERE po."groupId" = {couleur_group_id};
    """)
    color_map = {} # normalized name -> id
    for r in existing_colors_rows:
        cid, ccode, cname = int(r[0]), r[1].lower().strip(), r[2].lower().strip()
        color_map[cname] = cid
        color_map[ccode] = cid

    # Assurer la présence des couleurs courantes
    def get_or_create_color(color_label):
        norm = color_label.lower().strip()
        if norm in color_map:
            return color_map[norm]
        # Créer la couleur
        code = f"couleur-{norm.replace(' ', '-').replace('é', 'e').replace('è', 'e')}"
        opt_id = int(run_sql(f"""
        INSERT INTO product_option ("createdAt", "updatedAt", "code", "groupId")
        VALUES (NOW(), NOW(), '{code}', {couleur_group_id})
        RETURNING id;
        """)[0][0])
        execute_sql(f"""
        INSERT INTO product_option_translation ("baseId", "languageCode", "name", "createdAt", "updatedAt")
        VALUES ({opt_id}, 'fr', '{color_label.capitalize()}', NOW(), NOW());
        INSERT INTO product_option_channels_channel ("productOptionId", "channelId")
        SELECT {opt_id}, id FROM channel ON CONFLICT DO NOTHING;
        """)
        color_map[norm] = opt_id
        return opt_id

    # Pré-création / validation des couleurs de base
    for c in ["Bleu", "Rouge", "Vert", "Jaune", "Noir", "Blanc", "Rose", "Violet", "Marron", "Orange", "Gris", "Beige", "Or", "Argent", "Multicolore", "Bleu Ciel", "Bleu Roi"]:
        get_or_create_color(c)

    # 3. Création des Motifs dans le groupe 'motif'
    # Noms épurés comme demandé par l'utilisateur: "Baroque", "Rosace", etc.
    MOTIFS_LIST = [
        "Baroque", "Rosace", "Étoile", "Floral", "Spirale", "Mandingue", "Couronne", "Diamant",
        "Arabesque", "Vague", "Palme", "Géométrique", "Zellige", "Soleil", "Nénuphar", "Éventail",
        "Labyrinthe", "Papillon", "Danxomé", "Amazone", "Calebasse", "Tambour", "Harmonie", "Prestige",
        "Tradition", "Saphir", "Ruban", "Acanthe", "Épi d'Abondance", "L'Œil", "Damier", "Feuillage"
    ]

    motif_map = {} # motif_name -> option_id
    for m in MOTIFS_LIST:
        clean_slug = m.lower().replace(' ', '-').replace('é', 'e').replace('è', 'e').replace('’', '').replace("'", "")
        m_code = f"motif-{clean_slug}"
        check_opt = run_sql(f"SELECT id FROM product_option WHERE \"groupId\" = {motif_group_id} AND code = '{m_code}';")
        if check_opt and check_opt[0][0]:
            opt_id = int(check_opt[0][0])
        else:
            opt_insert = f"""
            INSERT INTO product_option ("createdAt", "updatedAt", "code", "groupId")
            VALUES (NOW(), NOW(), '{m_code}', {motif_group_id})
            RETURNING id;
            """
            opt_id = int(run_sql(opt_insert)[0][0])
            execute_sql(f"""
            INSERT INTO product_option_translation ("baseId", "languageCode", "name", "createdAt", "updatedAt")
            VALUES ({opt_id}, 'fr', '{m}', NOW(), NOW());
            INSERT INTO product_option_channels_channel ("productOptionId", "channelId")
            SELECT {opt_id}, id FROM channel ON CONFLICT DO NOTHING;
            """)
        motif_map[m] = opt_id
    print(f"✅ {len(motif_map)} Motifs configurés dans OptionGroup 'motif'")

    # 4. Les 4 Familles Maîtresses
    FAMILIES = [
        {
            "key": "chiganvy",
            "master_id": 635,
            "title": "Tissu Wax Chiganvy",
            "slug": "tissu-wax-chiganvy",
            "description": "Le véritable Tissu Wax Chiganvy est réputé pour la pureté de son coton grand teint, l'intensité durable de ses impressions et la diversité de ses motifs traditionnels et modernes. Idéal pour tenues de cérémonie, robes de mariage, chemises et haute couture béninoise.",
            "source_ids": [635, 636, 637, 638, 639, 640, 641, 642, 643, 644, 645, 646, 647, 648, 649, 650, 651, 652, 653, 654, 655, 656, 657, 658, 659, 660, 661, 662]
        },
        {
            "key": "vlisco",
            "master_id": 621,
            "title": "Pagne Wax Imitation Vlisco",
            "slug": "pagne-wax-imitation-vlisco",
            "description": "Le Pagne Wax Imitation Vlisco Première Qualité offre le toucher noble, la souplesse et le drapé somptueux des grands classiques hollandais. Ses motifs intemporels et ses couleurs vives résistent parfaitement aux lavages successifs.",
            "source_ids": [613, 615, 617, 621, 622, 623, 624, 625, 626, 627, 628]
        },
        {
            "key": "elizabeth",
            "master_id": 629,
            "title": "Pagne Hollandais Elizabeth",
            "slug": "pagne-hollandais-elizabeth",
            "description": "Le prestigieux Pagne Hollandais Elizabeth Radiance Grand de Grand incarne l'excellence du textile africain de cérémonie. Tissé dans un coton d'une finesse incomparable, il confère prestance et distinction lors des dots, mariages et réceptions de marque.",
            "source_ids": [618, 619, 629, 630, 631, 632, 633, 634]
        },
        {
            "key": "super_lome",
            "master_id": 665,
            "title": "Pagne Wax Super Lomé",
            "slug": "pagne-wax-super-lome",
            "description": "Le célèbre tissu Pagne Wax Super Lomé Première Qualité séduit par sa douceur, sa respirabilité et ses motifs iconiques. Idéal pour boubous, robes et pagnes de tous les jours, il allie élégance traditionnelle et confort quotidien.",
            "source_ids": [663, 664, 665]
        }
    ]

    for fam in FAMILIES:
        master_id = fam["master_id"]
        source_ids = fam["source_ids"]
        master_title = fam["title"]
        slug = fam["slug"]
        desc = fam["description"]

        print(f"\n=======================================================")
        print(f"📦 Traitement de la Famille : {master_title} (ID Principal: {master_id})")

        # 1. Mise à jour de la fiche maîtresse
        esc_desc = desc.replace("'", "''")
        esc_title = master_title.replace("'", "''")

        execute_sql(f"""
        UPDATE product 
        SET "customFieldsApprovalstatus" = 'approved',
            "enabled" = true,
            "deletedAt" = NULL,
            "updatedAt" = NOW()
        WHERE id = {master_id};

        UPDATE product_translation
        SET "name" = '{esc_title}',
            "slug" = '{slug}',
            "description" = '{esc_desc}',
            "updatedAt" = NOW()
        WHERE "baseId" = {master_id};

        -- Lier les OptionGroups motif et couleur
        INSERT INTO product_option_groups_product_option_group ("productId", "productOptionGroupId")
        VALUES ({master_id}, {motif_group_id})
        ON CONFLICT DO NOTHING;

        INSERT INTO product_option_groups_product_option_group ("productId", "productOptionGroupId")
        VALUES ({master_id}, {couleur_group_id})
        ON CONFLICT DO NOTHING;

        -- Lier aux collections Pagnes & Tissus (2536) et Pagne Wax (2537)
        INSERT INTO collection_product_variants_product_variant ("collectionId", "productVariantId")
        SELECT 2536, pv.id FROM product_variant pv WHERE pv."productId" = {master_id}
        ON CONFLICT DO NOTHING;

        INSERT INTO collection_product_variants_product_variant ("collectionId", "productVariantId")
        SELECT 2537, pv.id FROM product_variant pv WHERE pv."productId" = {master_id}
        ON CONFLICT DO NOTHING;
        """)

        # Récupérer l'ID vendeur du master product ou un vendeur par défaut (103 ou 106)
        m_vendor_row = run_sql(f"SELECT \"customFieldsVendorid\" FROM product WHERE id = {master_id};")
        default_vendor_id = int(m_vendor_row[0][0]) if (m_vendor_row and m_vendor_row[0][0] and m_vendor_row[0][0] != 'None') else 103

        # 2. Parcourir chaque produit source
        for idx, src_p_id in enumerate(source_ids):
            assigned_motif_name = MOTIFS_LIST[idx % len(MOTIFS_LIST)]
            assigned_motif_opt_id = motif_map[assigned_motif_name]

            # Récupérer l'image principale du produit source
            src_prod_info = run_sql(f"SELECT \"featuredAssetId\" FROM product WHERE id = {src_p_id};")
            src_asset_id = src_prod_info[0][0] if (src_prod_info and src_prod_info[0][0] and src_prod_info[0][0] != 'None') else None

            # Récupérer les variantes du produit source
            variants = run_sql(f"""
            SELECT pv.id, pvt.name, pv."featuredAssetId",
                   (SELECT string_agg(pot.name, ',')
                    FROM product_variant_options_product_option pvopo
                    JOIN product_option po ON po.id = pvopo."productOptionId"
                    JOIN product_option_translation pot ON pot."baseId" = po.id
                    WHERE pvopo."productVariantId" = pv.id AND po."groupId" = {couleur_group_id}) as existing_colors
            FROM product_variant pv
            JOIN product_variant_translation pvt ON pvt."baseId" = pv.id
            WHERE pv."productId" = {src_p_id} AND pv."deletedAt" IS NULL;
            """)

            for v_idx, v in enumerate(variants):
                v_id = int(v[0])
                v_name = v[1]
                v_asset_id = v[2] if (v[2] and v[2] != 'None') else src_asset_id
                existing_color_name = v[3]

                # Déterminer la couleur
                detected_color = None
                if existing_color_name:
                    first_col = existing_color_name.split(',')[0].strip()
                    if first_col.lower() in color_map:
                        detected_color = first_col.capitalize()
                
                if not detected_color:
                    # Extraire depuis le nom de la variante
                    for sep in [' - ', ' – ', ' : ', ' — ']:
                        if sep in v_name:
                            parts = v_name.split(sep)
                            candidate = parts[-1].strip().capitalize()
                            if candidate.lower() in color_map:
                                detected_color = candidate
                                break
                
                # Si toujours pas de couleur détectée
                if not detected_color:
                    palette = ["Bleu", "Rouge", "Vert", "Jaune", "Orange", "Rose", "Violet", "Marron"]
                    detected_color = palette[(idx + v_idx) % len(palette)]

                color_opt_id = get_or_create_color(detected_color)

                # Nom de déclinaison épuré : "Tissu Wax Chiganvy - Baroque / Rouge"
                clean_variant_name = f"{master_title} - {assigned_motif_name} / {detected_color}"

                # Déterminer le featuredAssetId
                asset_sql_val = f"{v_asset_id}" if v_asset_id else "NULL"

                execute_sql(f"""
                UPDATE product_variant
                SET "productId" = {master_id},
                    "enabled" = true,
                    "deletedAt" = NULL,
                    "featuredAssetId" = COALESCE({asset_sql_val}, "featuredAssetId"),
                    "updatedAt" = NOW()
                WHERE id = {v_id};

                UPDATE product_variant_translation
                SET "name" = '{clean_variant_name.replace("'", "''")}',
                    "updatedAt" = NOW()
                WHERE "baseId" = {v_id};

                -- Nettoyer les anciennes options et insérer Motif et Couleur
                DELETE FROM product_variant_options_product_option WHERE "productVariantId" = {v_id};
                INSERT INTO product_variant_options_product_option ("productVariantId", "productOptionId")
                VALUES ({v_id}, {assigned_motif_opt_id}), ({v_id}, {color_opt_id})
                ON CONFLICT DO NOTHING;

                -- Associer aux canaux du master product
                INSERT INTO product_variant_channels_channel ("productVariantId", "channelId")
                SELECT {v_id}, "channelId" FROM product_channels_channel WHERE "productId" = {master_id}
                ON CONFLICT DO NOTHING;

                -- Associer aux collections
                INSERT INTO collection_product_variants_product_variant ("collectionId", "productVariantId")
                VALUES (2536, {v_id}), (2537, {v_id})
                ON CONFLICT DO NOTHING;
                """)

                # Vérifier / Mettre à jour l'offre vendeur
                offer_check = run_sql(f"SELECT id, price, \"vendorId\" FROM seller_offer WHERE \"productVariantId\" = {v_id};")
                if offer_check and offer_check[0][0]:
                    execute_sql(f"""
                    UPDATE seller_offer
                    SET "status" = 'APPROVED',
                        "updatedAt" = NOW()
                    WHERE "productVariantId" = {v_id};
                    """)
                else:
                    # Créer une offre vendeur approuvée
                    execute_sql(f"""
                    INSERT INTO seller_offer ("createdAt", "updatedAt", "price", "stock", "status", "vendorId", "productVariantId", "condition")
                    VALUES (NOW(), NOW(), 12000, 10, 'APPROVED', {default_vendor_id}, {v_id}, 'NEW');
                    """)

            # Si ce n'est pas la fiche maîtresse, archiver/soft-delete la source
            if src_p_id != master_id:
                execute_sql(f"""
                UPDATE product
                SET "enabled" = false,
                    "deletedAt" = NOW(),
                    "updatedAt" = NOW()
                WHERE id = {src_p_id};
                """)

        print(f"  ✅ Famille {master_title} : {len(source_ids)} produits sources regroupés avec succès.")

    print("\n=======================================================")
    print("✨ CONSOLIDATION TERMINÉE AVEC SUCCÈS !")

if __name__ == '__main__':
    main()
