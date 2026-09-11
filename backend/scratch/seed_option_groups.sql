DO $$
DECLARE
    v_taille_id INT;
    v_couleur_id INT;
    v_pointure_id INT;
    v_capacite_id INT;
    v_volume_id INT;
    v_poids_id INT;
    v_matiere_id INT;
BEGIN
    -- 1. Taille
    SELECT id INTO v_taille_id FROM product_option_group WHERE code = 'taille';
    IF v_taille_id IS NULL THEN
        INSERT INTO product_option_group (code, "createdAt", "updatedAt") VALUES ('taille', NOW(), NOW()) RETURNING id INTO v_taille_id;
        INSERT INTO product_option_group_translation ("languageCode", name, "baseId", "createdAt", "updatedAt") VALUES ('fr', 'Taille', v_taille_id, NOW(), NOW());
    END IF;

    -- 2. Couleur
    SELECT id INTO v_couleur_id FROM product_option_group WHERE code = 'couleur';
    IF v_couleur_id IS NULL THEN
        INSERT INTO product_option_group (code, "createdAt", "updatedAt") VALUES ('couleur', NOW(), NOW()) RETURNING id INTO v_couleur_id;
        INSERT INTO product_option_group_translation ("languageCode", name, "baseId", "createdAt", "updatedAt") VALUES ('fr', 'Couleur', v_couleur_id, NOW(), NOW());
    END IF;

    -- 3. Pointure
    SELECT id INTO v_pointure_id FROM product_option_group WHERE code = 'pointure';
    IF v_pointure_id IS NULL THEN
        INSERT INTO product_option_group (code, "createdAt", "updatedAt") VALUES ('pointure', NOW(), NOW()) RETURNING id INTO v_pointure_id;
        INSERT INTO product_option_group_translation ("languageCode", name, "baseId", "createdAt", "updatedAt") VALUES ('fr', 'Pointure', v_pointure_id, NOW(), NOW());
    END IF;

    -- 4. Capacité
    SELECT id INTO v_capacite_id FROM product_option_group WHERE code = 'capacite';
    IF v_capacite_id IS NULL THEN
        INSERT INTO product_option_group (code, "createdAt", "updatedAt") VALUES ('capacite', NOW(), NOW()) RETURNING id INTO v_capacite_id;
        INSERT INTO product_option_group_translation ("languageCode", name, "baseId", "createdAt", "updatedAt") VALUES ('fr', 'Capacité / Stockage', v_capacite_id, NOW(), NOW());
    END IF;

    -- 5. Volume
    SELECT id INTO v_volume_id FROM product_option_group WHERE code = 'volume';
    IF v_volume_id IS NULL THEN
        INSERT INTO product_option_group (code, "createdAt", "updatedAt") VALUES ('volume', NOW(), NOW()) RETURNING id INTO v_volume_id;
        INSERT INTO product_option_group_translation ("languageCode", name, "baseId", "createdAt", "updatedAt") VALUES ('fr', 'Volume', v_volume_id, NOW(), NOW());
    END IF;

    -- 6. Poids
    SELECT id INTO v_poids_id FROM product_option_group WHERE code = 'poids';
    IF v_poids_id IS NULL THEN
        INSERT INTO product_option_group (code, "createdAt", "updatedAt") VALUES ('poids', NOW(), NOW()) RETURNING id INTO v_poids_id;
        INSERT INTO product_option_group_translation ("languageCode", name, "baseId", "createdAt", "updatedAt") VALUES ('fr', 'Poids', v_poids_id, NOW(), NOW());
    END IF;

    -- 7. Matière
    SELECT id INTO v_matiere_id FROM product_option_group WHERE code = 'matiere';
    IF v_matiere_id IS NULL THEN
        INSERT INTO product_option_group (code, "createdAt", "updatedAt") VALUES ('matiere', NOW(), NOW()) RETURNING id INTO v_matiere_id;
        INSERT INTO product_option_group_translation ("languageCode", name, "baseId", "createdAt", "updatedAt") VALUES ('fr', 'Matière', v_matiere_id, NOW(), NOW());
    END IF;

    -- Assign all option groups to Channel 1 and all vendor channels
    INSERT INTO product_option_group_channels_channel ("productOptionGroupId", "channelId")
    SELECT og.id, c.id
    FROM product_option_group og
    CROSS JOIN channel c
    WHERE og.id IN (v_taille_id, v_couleur_id, v_pointure_id, v_capacite_id, v_volume_id, v_poids_id, v_matiere_id)
    ON CONFLICT DO NOTHING;

END $$;
