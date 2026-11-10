BEGIN;

-- 1. Catégorie Sacs sous Mode & Habillement (parentId = 2535)
WITH ins_sacs AS (
    INSERT INTO collection ("createdAt", "updatedAt", "isRoot", "position", "isPrivate", "parentId", "inheritFilters", "filters")
    VALUES (NOW(), NOW(), false, 1, false, 2535, true, '[]')
    RETURNING id
),
ins_sacs_trans AS (
    INSERT INTO collection_translation ("createdAt", "updatedAt", "languageCode", "name", "slug", "description", "baseId")
    SELECT NOW(), NOW(), 'fr', 'Sacs & Maroquinerie', 'sacs-maroquinerie', '', id FROM ins_sacs
    UNION ALL
    SELECT NOW(), NOW(), 'en', 'Bags & Leather Goods', 'sacs-maroquinerie', '', id FROM ins_sacs
),
ins_sacs_channel AS (
    INSERT INTO collection_channels_channel ("collectionId", "channelId")
    SELECT id, 1 FROM ins_sacs
)
SELECT id FROM ins_sacs;

-- Sous-catégories Sacs Enfants et Sacs Adultes (sous Sacs & Maroquinerie)
WITH parent_sacs AS (
    SELECT c.id FROM collection c JOIN collection_translation cd ON c.id = cd."baseId" WHERE cd.slug = 'sacs-maroquinerie' LIMIT 1
),
ins_sacs_enfants AS (
    INSERT INTO collection ("createdAt", "updatedAt", "isRoot", "position", "isPrivate", "parentId", "inheritFilters", "filters")
    SELECT NOW(), NOW(), false, 1, false, id, true, '[]' FROM parent_sacs
    RETURNING id
),
ins_sacs_enfants_trans AS (
    INSERT INTO collection_translation ("createdAt", "updatedAt", "languageCode", "name", "slug", "description", "baseId")
    SELECT NOW(), NOW(), 'fr', 'Sacs Enfants', 'sacs-enfants', '', id FROM ins_sacs_enfants
    UNION ALL
    SELECT NOW(), NOW(), 'en', 'Kids Bags', 'sacs-enfants', '', id FROM ins_sacs_enfants
),
ins_sacs_enfants_chan AS (
    INSERT INTO collection_channels_channel ("collectionId", "channelId")
    SELECT id, 1 FROM ins_sacs_enfants
),
ins_sacs_adultes AS (
    INSERT INTO collection ("createdAt", "updatedAt", "isRoot", "position", "isPrivate", "parentId", "inheritFilters", "filters")
    SELECT NOW(), NOW(), false, 2, false, id, true, '[]' FROM parent_sacs
    RETURNING id
),
ins_sacs_adultes_trans AS (
    INSERT INTO collection_translation ("createdAt", "updatedAt", "languageCode", "name", "slug", "description", "baseId")
    SELECT NOW(), NOW(), 'fr', 'Sacs Adultes', 'sacs-adultes', '', id FROM ins_sacs_adultes
    UNION ALL
    SELECT NOW(), NOW(), 'en', 'Adult Bags', 'sacs-adultes', '', id FROM ins_sacs_adultes
),
ins_sacs_adultes_chan AS (
    INSERT INTO collection_channels_channel ("collectionId", "channelId")
    SELECT id, 1 FROM ins_sacs_adultes
)
SELECT 'Sacs enfants & adultes créés';


-- 2. Catégorie Jouets & Jeux sous Bébés & Enfants (parentId = 1879)
WITH ins_jouets AS (
    INSERT INTO collection ("createdAt", "updatedAt", "isRoot", "position", "isPrivate", "parentId", "inheritFilters", "filters")
    VALUES (NOW(), NOW(), false, 1, false, 1879, true, '[]')
    RETURNING id
),
ins_jouets_trans AS (
    INSERT INTO collection_translation ("createdAt", "updatedAt", "languageCode", "name", "slug", "description", "baseId")
    SELECT NOW(), NOW(), 'fr', 'Jouets & Jeux', 'jouets-jeux', '', id FROM ins_jouets
    UNION ALL
    SELECT NOW(), NOW(), 'en', 'Toys & Games', 'jouets-jeux', '', id FROM ins_jouets
),
ins_jouets_chan AS (
    INSERT INTO collection_channels_channel ("collectionId", "channelId")
    SELECT id, 1 FROM ins_jouets
)
SELECT id FROM ins_jouets;

-- Sous-catégories Jouets (Vélos & Véhicules, Pianos, Jeux de société)
WITH parent_jouets AS (
    SELECT c.id FROM collection c JOIN collection_translation cd ON c.id = cd."baseId" WHERE cd.slug = 'jouets-jeux' LIMIT 1
),
-- A. Vélos & Véhicules
ins_velos_vehicules AS (
    INSERT INTO collection ("createdAt", "updatedAt", "isRoot", "position", "isPrivate", "parentId", "inheritFilters", "filters")
    SELECT NOW(), NOW(), false, 1, false, id, true, '[]' FROM parent_jouets
    RETURNING id
),
ins_velos_vehicules_trans AS (
    INSERT INTO collection_translation ("createdAt", "updatedAt", "languageCode", "name", "slug", "description", "baseId")
    SELECT NOW(), NOW(), 'fr', 'Vélos & Véhicules Enfants', 'velos-vehicules-enfants', '', id FROM ins_velos_vehicules
    UNION ALL
    SELECT NOW(), NOW(), 'en', 'Kids Bikes & Vehicles', 'velos-vehicules-enfants', '', id FROM ins_velos_vehicules
),
ins_velos_vehicules_chan AS (
    INSERT INTO collection_channels_channel ("collectionId", "channelId")
    SELECT id, 1 FROM ins_velos_vehicules
),
-- B. Pianos & Musique
ins_pianos AS (
    INSERT INTO collection ("createdAt", "updatedAt", "isRoot", "position", "isPrivate", "parentId", "inheritFilters", "filters")
    SELECT NOW(), NOW(), false, 2, false, id, true, '[]' FROM parent_jouets
    RETURNING id
),
ins_pianos_trans AS (
    INSERT INTO collection_translation ("createdAt", "updatedAt", "languageCode", "name", "slug", "description", "baseId")
    SELECT NOW(), NOW(), 'fr', 'Pianos & Instruments Enfants', 'pianos-instruments-enfants', '', id FROM ins_pianos
    UNION ALL
    SELECT NOW(), NOW(), 'en', 'Kids Pianos & Musical Instruments', 'pianos-instruments-enfants', '', id FROM ins_pianos
),
ins_pianos_chan AS (
    INSERT INTO collection_channels_channel ("collectionId", "channelId")
    SELECT id, 1 FROM ins_pianos
),
-- C. Jeux de société & d'éveil
ins_jeux AS (
    INSERT INTO collection ("createdAt", "updatedAt", "isRoot", "position", "isPrivate", "parentId", "inheritFilters", "filters")
    SELECT NOW(), NOW(), false, 3, false, id, true, '[]' FROM parent_jouets
    RETURNING id
),
ins_jeux_trans AS (
    INSERT INTO collection_translation ("createdAt", "updatedAt", "languageCode", "name", "slug", "description", "baseId")
    SELECT NOW(), NOW(), 'fr', 'Jeux de Société & Éducatifs', 'jeux-societe-educatifs', '', id FROM ins_jeux
    UNION ALL
    SELECT NOW(), NOW(), 'en', 'Board Games & Educational Toys', 'jeux-societe-educatifs', '', id FROM ins_jeux
),
ins_jeux_chan AS (
    INSERT INTO collection_channels_channel ("collectionId", "channelId")
    SELECT id, 1 FROM ins_jeux
)
SELECT 'Sous-catégories Jouets créées';

-- Sous-sous-catégories sous Vélos & Véhicules Enfants (Vélos/Tricycles, Voitures/Porteurs, Voitures Télécommandées)
WITH parent_velos AS (
    SELECT c.id FROM collection c JOIN collection_translation cd ON c.id = cd."baseId" WHERE cd.slug = 'velos-vehicules-enfants' LIMIT 1
),
ins_sub_velos AS (
    INSERT INTO collection ("createdAt", "updatedAt", "isRoot", "position", "isPrivate", "parentId", "inheritFilters", "filters")
    SELECT NOW(), NOW(), false, 1, false, id, true, '[]' FROM parent_velos
    RETURNING id
),
ins_sub_velos_trans AS (
    INSERT INTO collection_translation ("createdAt", "updatedAt", "languageCode", "name", "slug", "description", "baseId")
    SELECT NOW(), NOW(), 'fr', 'Vélos & Tricycles', 'velos-tricycles-enfants', '', id FROM ins_sub_velos
    UNION ALL
    SELECT NOW(), NOW(), 'en', 'Bikes & Tricycles', 'velos-tricycles-enfants', '', id FROM ins_sub_velos
),
ins_sub_velos_chan AS (
    INSERT INTO collection_channels_channel ("collectionId", "channelId")
    SELECT id, 1 FROM ins_sub_velos
),
ins_sub_voitures AS (
    INSERT INTO collection ("createdAt", "updatedAt", "isRoot", "position", "isPrivate", "parentId", "inheritFilters", "filters")
    SELECT NOW(), NOW(), false, 2, false, id, true, '[]' FROM parent_velos
    RETURNING id
),
ins_sub_voitures_trans AS (
    INSERT INTO collection_translation ("createdAt", "updatedAt", "languageCode", "name", "slug", "description", "baseId")
    SELECT NOW(), NOW(), 'fr', 'Voitures & Porteurs', 'voitures-porteurs-enfants', '', id FROM ins_sub_voitures
    UNION ALL
    SELECT NOW(), NOW(), 'en', 'Ride-on Cars', 'voitures-porteurs-enfants', '', id FROM ins_sub_voitures
),
ins_sub_voitures_chan AS (
    INSERT INTO collection_channels_channel ("collectionId", "channelId")
    SELECT id, 1 FROM ins_sub_voitures
),
ins_sub_rc AS (
    INSERT INTO collection ("createdAt", "updatedAt", "isRoot", "position", "isPrivate", "parentId", "inheritFilters", "filters")
    SELECT NOW(), NOW(), false, 3, false, id, true, '[]' FROM parent_velos
    RETURNING id
),
ins_sub_rc_trans AS (
    INSERT INTO collection_translation ("createdAt", "updatedAt", "languageCode", "name", "slug", "description", "baseId")
    SELECT NOW(), NOW(), 'fr', 'Voitures Télécommandées', 'voitures-telecommandees', '', id FROM ins_sub_rc
    UNION ALL
    SELECT NOW(), NOW(), 'en', 'Remote Control Cars', 'voitures-telecommandees', '', id FROM ins_sub_rc
),
ins_sub_rc_chan AS (
    INSERT INTO collection_channels_channel ("collectionId", "channelId")
    SELECT id, 1 FROM ins_sub_rc
)
SELECT 'Vélos, voitures et télécommandées créés';


-- 3. Équipements de Foyer & Ventilateurs sous Maison & Bureau (1875) -> Petit Electroménager (1887)
WITH ins_foyer AS (
    INSERT INTO collection ("createdAt", "updatedAt", "isRoot", "position", "isPrivate", "parentId", "inheritFilters", "filters")
    VALUES (NOW(), NOW(), false, 1, false, 1887, true, '[]')
    RETURNING id
),
ins_foyer_trans AS (
    INSERT INTO collection_translation ("createdAt", "updatedAt", "languageCode", "name", "slug", "description", "baseId")
    SELECT NOW(), NOW(), 'fr', 'Équipements de Foyer', 'equipements-de-foyer', '', id FROM ins_foyer
    UNION ALL
    SELECT NOW(), NOW(), 'en', 'Household Equipment', 'equipements-de-foyer', '', id FROM ins_foyer
),
ins_foyer_chan AS (
    INSERT INTO collection_channels_channel ("collectionId", "channelId")
    SELECT id, 1 FROM ins_foyer
),
ins_ventilo AS (
    INSERT INTO collection ("createdAt", "updatedAt", "isRoot", "position", "isPrivate", "parentId", "inheritFilters", "filters")
    VALUES (NOW(), NOW(), false, 2, false, 1887, true, '[]')
    RETURNING id
),
ins_ventilo_trans AS (
    INSERT INTO collection_translation ("createdAt", "updatedAt", "languageCode", "name", "slug", "description", "baseId")
    SELECT NOW(), NOW(), 'fr', 'Ventilateurs & Brasseurs d''air', 'ventilateurs-brasseurs-air', '', id FROM ins_ventilo
    UNION ALL
    SELECT NOW(), NOW(), 'en', 'Fans & Air Circulators', 'ventilateurs-brasseurs-air', '', id FROM ins_ventilo
),
ins_ventilo_chan AS (
    INSERT INTO collection_channels_channel ("collectionId", "channelId")
    SELECT id, 1 FROM ins_ventilo
)
SELECT 'Équipements de Foyer & Ventilateurs créés';


-- 4. Accessoires de Fête & Événements sous Maison & Bureau (1875)
WITH ins_fete AS (
    INSERT INTO collection ("createdAt", "updatedAt", "isRoot", "position", "isPrivate", "parentId", "inheritFilters", "filters")
    VALUES (NOW(), NOW(), false, 7, false, 1875, true, '[]')
    RETURNING id
),
ins_fete_trans AS (
    INSERT INTO collection_translation ("createdAt", "updatedAt", "languageCode", "name", "slug", "description", "baseId")
    SELECT NOW(), NOW(), 'fr', 'Accessoires de Fête & Décoration', 'accessoires-de-fete-decoration', '', id FROM ins_fete
    UNION ALL
    SELECT NOW(), NOW(), 'en', 'Party Accessories & Decoration', 'accessoires-de-fete-decoration', '', id FROM ins_fete
),
ins_fete_chan AS (
    INSERT INTO collection_channels_channel ("collectionId", "channelId")
    SELECT id, 1 FROM ins_fete
)
SELECT 'Accessoires de fête créés';

COMMIT;
