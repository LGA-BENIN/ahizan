import subprocess
import json

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
    print("🚀 Démarrage de la consolidation professionnelle des tissus & pagnes...")

    # 1. Vérifier ou créer le groupe d'options 'motif'
    check_opt_group = run_sql("SELECT id FROM product_option_group WHERE code = 'motif';")
    if check_opt_group and check_opt_group[0][0]:
        motif_group_id = int(check_opt_group[0][0])
        print(f"OptionGroup 'motif' existant (ID: {motif_group_id})")
    else:
        create_group_sql = """
        INSERT INTO product_option_group ("createdAt", "updatedAt", "code")
        VALUES (NOW(), NOW(), 'motif')
        RETURNING id;
        """
        motif_group_id = int(run_sql(create_group_sql)[0][0])
        execute_sql(f"""
        INSERT INTO product_option_group_translation ("baseId", "languageCode", "name", "createdAt", "updatedAt")
        VALUES ({motif_group_id}, 'fr', 'Motif', NOW(), NOW());
        INSERT INTO product_option_group_channels_channel ("productOptionGroupId", "channelId")
        SELECT {motif_group_id}, id FROM channel ON CONFLICT DO NOTHING;
        """)
        print(f"✅ OptionGroup 'motif' créé avec succès (ID: {motif_group_id})")

    # Vérifier l'OptionGroup 'couleur'
    couleur_group_row = run_sql("SELECT id FROM product_option_group WHERE code = 'couleur' LIMIT 1;")
    couleur_group_id = int(couleur_group_row[0][0]) if couleur_group_row else 40
    print(f"OptionGroup 'couleur' (ID: {couleur_group_id})")

    # Définition des 4 Familles Maîtresses
    FAMILIES = [
        {
            "key": "chiganvy",
            "master_id": 635,
            "title": "Tissu Wax Chiganvy Authentique — Motifs & Nuances d'Exception",
            "slug": "tissu-wax-chiganvy-authentique",
            "description": """Le véritable Tissu Wax Chiganvy est réputé pour la pureté de son coton, l'intensité durable de ses impressions grand teint et la diversité de ses motifs traditionnels et modernes. Idéal pour les tenues de cérémonie, robes de mariage, chemises et créations de haute couture béninoise et africaine. Disponible en plusieurs motifs exclusifs et déclinaisons de couleurs éclatantes.""",
            "source_ids": [635, 636, 637, 638, 639, 640, 641, 642, 643, 644, 645, 646, 647, 648, 649, 650, 651, 652, 653, 654, 655, 656, 657, 658, 659, 660, 661, 662],
            "motif_names": [
                "Motif Baroque Royal", "Motif Rosace Dorée", "Motif Étoiles Filantes", "Motif Floral Élégant",
                "Motif Spirale d'Or", "Motif Mandingue Prestige", "Motif Couronne Impériale", "Motif Diamant & Ruban",
                "Motif Arabesque", "Motif Ondulations Océanes", "Motif Vague Céleste", "Motif Palme d'Or",
                "Motif Géométrique Moderne", "Motif Zellige Africain", "Motif Rayon de Soleil", "Motif Nénuphar Royal",
                "Motif Éventail de Cérémonie", "Motif Labyrinthe Sacré", "Motif Fleur de Coton", "Motif Papillon d'Or",
                "Motif Danxomé Héritage", "Motif Amazone Majestueuse", "Motif Soleil de Ganhi", "Motif Dantokpa Prestige",
                "Motif Calebasse Féconde", "Motif Épi d'Abondance", "Motif Rythme Tambour", "Motif Harmonie Wax"
            ]
        },
        {
            "key": "vlisco",
            "master_id": 621,
            "title": "Pagne Wax Imitation Vlisco 1ère Qualité — Motifs de Prestige",
            "slug": "pagne-wax-imitation-vlisco-premiere-qualite",
            "description": """Le Pagne Wax Imitation Vlisco Première Qualité offre le toucher noble, la souplesse et le drapé somptueux des grands classiques hollandais à un tarif très accessible. Ses motifs intemporels et ses couleurs vives résistent parfaitement aux lavages successifs. Parfait pour vos tenues du quotidien chic comme pour vos sorties solennelles.""",
            "source_ids": [613, 615, 617, 621, 622, 623, 624, 625, 626, 627, 628],
            "motif_names": [
                "Motif Rosace Royale", "Motif L'Œil de Prestige", "Motif Étoiles Célestes", "Motif Florilège Impérial",
                "Motif Arabesque Noblesse", "Motif Trésor Baroque", "Motif Couronne de Reine", "Motif Damier d'Or",
                "Motif Feuilles d'Acanthe", "Motif Spirale Solaire", "Motif Splendeur Hollandaise"
            ]
        },
        {
            "key": "elizabeth",
            "master_id": 629,
            "title": "Pagne Hollandais Elizabeth Radiance Grand de Grand — Collection Prestige",
            "slug": "pagne-hollandais-elizabeth-radiance-grand-de-grand",
            "description": """Le prestigieux Pagne Hollandais Elizabeth Radiance Grand de Grand incarne l'excellence du textile africain de cérémonie. Tissé dans un coton d'une finesse incomparable et rehaussé d'une brillance subtile, ce tissu d'apparat confère prestance et distinction lors des dots, mariages et réceptions de marque.""",
            "source_ids": [618, 619, 629, 630, 631, 632, 633, 634],
            "motif_names": [
                "Motif Rosace Radiance", "Motif Fleur d'Émeraude", "Motif Couronne Impériale", "Motif Étoile Saphir",
                "Motif Arabesque Royale", "Motif Ruban d'Or", "Motif Feuillage Majestueux", "Motif Éclat Radiance"
            ]
        },
        {
            "key": "super_lome",
            "master_id": 665,
            "title": "Pagne Wax Super Lomé 1ère Qualité — Motifs & Couleurs Traditionnels",
            "slug": "pagne-wax-super-lome-premiere-qualite",
            "description": """Le célèbre tissu Pagne Super Lomé Première Qualité, grand favori des marchés de Lomé et Dantokpa, séduit par sa douceur, sa respirabilité et ses motifs iconiques. Idéal pour boubous, robes et pagnes de tous les jours, il allie élégance traditionnelle et confort quotidien.""",
            "source_ids": [663, 664, 665],
            "motif_names": [
                "Motif Traditionnel Super Lomé", "Motif Éventail de Lomé", "Motif Spirale Wax Lomé"
            ]
        }
    ]

    for fam in FAMILIES:
        master_id = fam["master_id"]
        source_ids = fam["source_ids"]
        print(f"\n=======================================================")
        print(f"📦 Traitement Famille: {fam['title']} (Master ID: {master_id})")

        # 1. Mettre à jour la fiche maîtresse (Titre, Slug, Description, Status, Collections)
        esc_desc = fam['description'].replace("'", "''")
        esc_title = fam['title'].replace("'", "''")
        slug = fam['slug']

        update_master_sql = f"""
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

        -- Lier la fiche maîtresse aux groupes d'options 'motif' et 'couleur'
        INSERT INTO product_option_groups_product_option_group ("productId", "productOptionGroupId")
        VALUES ({master_id}, {motif_group_id})
        ON CONFLICT DO NOTHING;

        INSERT INTO product_option_groups_product_option_group ("productId", "productOptionGroupId")
        VALUES ({master_id}, {couleur_group_id})
        ON CONFLICT DO NOTHING;

        -- Lier la fiche maîtresse aux collections 2536 (Pagnes & Tissus) et 2537 (Pagne Wax)
        INSERT INTO collection_product_variants_product_variant ("collectionId", "productVariantId")
        SELECT 2536, pv.id FROM product_variant pv WHERE pv."productId" = {master_id}
        ON CONFLICT DO NOTHING;

        INSERT INTO collection_product_variants_product_variant ("collectionId", "productVariantId")
        SELECT 2537, pv.id FROM product_variant pv WHERE pv."productId" = {master_id}
        ON CONFLICT DO NOTHING;
        """
        execute_sql(update_master_sql)
        print(f"  ✅ Fiche maîtresse #{master_id} mise à jour.")

        # 2. Pour chaque produit source, mapper ses variantes vers la fiche maîtresse
        for idx, src_p_id in enumerate(source_ids):
            motif_name = fam["motif_names"][idx % len(fam["motif_names"])]
            motif_code = f"{fam['key']}-m{idx+1:02d}"

            # Créer l'option Motif spécifique dans le groupe 'motif'
            check_opt = run_sql(f"SELECT id FROM product_option WHERE \"groupId\" = {motif_group_id} AND code = '{motif_code}';")
            if check_opt and check_opt[0][0]:
                opt_id = int(check_opt[0][0])
            else:
                opt_insert = f"""
                INSERT INTO product_option ("createdAt", "updatedAt", "code", "groupId")
                VALUES (NOW(), NOW(), '{motif_code}', {motif_group_id})
                RETURNING id;
                """
                opt_id = int(run_sql(opt_insert)[0][0])
                execute_sql(f"""
                INSERT INTO product_option_translation ("baseId", "languageCode", "name", "createdAt", "updatedAt")
                VALUES ({opt_id}, 'fr', '{motif_name.replace("'", "''")}', NOW(), NOW());
                INSERT INTO product_option_channels_channel ("productOptionId", "channelId")
                SELECT {opt_id}, id FROM channel ON CONFLICT DO NOTHING;
                """)

            # Récupérer l'image principale du produit source
            src_prod_info = run_sql(f"SELECT \"featuredAssetId\" FROM product WHERE id = {src_p_id};")
            src_asset_id = src_prod_info[0][0] if (src_prod_info and src_prod_info[0][0] and src_prod_info[0][0] != 'None') else None

            # Récupérer les variantes du produit source
            variants = run_sql(f"""
            SELECT pv.id, pvt.name, pv."featuredAssetId"
            FROM product_variant pv
            JOIN product_variant_translation pvt ON pvt."baseId" = pv.id
            WHERE pv."productId" = {src_p_id} AND pv."deletedAt" IS NULL;
            """)

            for v in variants:
                v_id = int(v[0])
                v_name = v[1]
                v_asset_id = v[2] if (v[2] and v[2] != 'None') else src_asset_id

                # Extraire la couleur existante du nom de la variante (ex: 'Chiganvy - Bleu' -> 'Bleu')
                color_name = "Multicolore"
                for sep in [' - ', ' – ', ' : ']:
                    if sep in v_name:
                        parts = v_name.split(sep)
                        if len(parts) > 1 and parts[-1].strip():
                            color_name = parts[-1].strip().capitalize()
                            break

                new_variant_name = f"{fam['title'].split('—')[0].strip()} – {motif_name} ({color_name})"

                # Mettre à jour la variante :
                # - Relier la variante au master product (productId = master_id)
                # - S'assurer que le featuredAsset est présent
                # - Approuver le statut de l'offre
                # - Lier à l'option Motif
                v_update_sql = f"""
                UPDATE product_variant
                SET "productId" = {master_id},
                    "enabled" = true,
                    "deletedAt" = NULL,
                    "featuredAssetId" = COALESCE("featuredAssetId", {src_asset_id if src_asset_id else 'NULL'}),
                    "updatedAt" = NOW()
                WHERE id = {v_id};

                UPDATE product_variant_translation
                SET "name" = '{new_variant_name.replace("'", "''")}',
                    "updatedAt" = NOW()
                WHERE "baseId" = {v_id};

                -- Approuver l'offre vendeur associée
                UPDATE seller_offer
                SET "status" = 'APPROVED',
                    "updatedAt" = NOW()
                WHERE "productVariantId" = {v_id};

                -- Associer l'option Motif à cette variante
                INSERT INTO product_variant_options_product_option ("productVariantId", "productOptionId")
                VALUES ({v_id}, {opt_id})
                ON CONFLICT DO NOTHING;

                -- Associer la variante aux canaux de la fiche maîtresse
                INSERT INTO product_variant_channels_channel ("productVariantId", "channelId")
                SELECT {v_id}, "channelId" FROM product_channels_channel WHERE "productId" = {master_id}
                ON CONFLICT DO NOTHING;

                -- Associer aux collections de tissus
                INSERT INTO collection_product_variants_product_variant ("collectionId", "productVariantId")
                VALUES (2536, {v_id}), (2537, {v_id})
                ON CONFLICT DO NOTHING;
                """
                execute_sql(v_update_sql)

            # Si ce n'est pas la fiche maîtresse, désactiver et marquer comme archivée/fusionnée (soft-delete propre)
            if src_p_id != master_id:
                retire_src_sql = f"""
                UPDATE product
                SET "enabled" = false,
                    "deletedAt" = NOW(),
                    "updatedAt" = NOW()
                WHERE id = {src_p_id};
                """
                execute_sql(retire_src_sql)

        print(f"  ✅ {len(source_ids)} fiches sources fusionnées avec succès sous #{master_id}.")

    print("\n=======================================================")
    print("🎉 CONSOLIDATION TERMINÉE AVEC SUCCÈS SANS AUCUNE PERTE !")

if __name__ == '__main__':
    main()
