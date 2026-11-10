BEGIN;

-- 1. Catégorie Principale "Sports & Loisirs" (sous la racine root parentId = 1)
WITH ins_sports AS (
    INSERT INTO collection ("createdAt", "updatedAt", "isRoot", "position", "isPrivate", "parentId", "inheritFilters", "filters")
    VALUES (NOW(), NOW(), false, 9, false, 1, true, '[]')
    RETURNING id
),
ins_sports_trans AS (
    INSERT INTO collection_translation ("createdAt", "updatedAt", "languageCode", "name", "slug", "description", "baseId")
    SELECT NOW(), NOW(), 'fr', 'Sports & Loisirs', 'sports-loisirs', 'Articles de sport, équipements de fitness, vêtements et accessoires sportifs', id FROM ins_sports
    UNION ALL
    SELECT NOW(), NOW(), 'en', 'Sports & Outdoors', 'sports-loisirs', 'Sports equipment, fitness gear, athletic wear and accessories', id FROM ins_sports
),
ins_sports_chan AS (
    INSERT INTO collection_channels_channel ("collectionId", "channelId")
    SELECT id, 1 FROM ins_sports
)
SELECT id AS sports_parent_id FROM ins_sports;

-- 2. Sous-catégories sous "Sports & Loisirs"
WITH parent_sports AS (
    SELECT c.id FROM collection c JOIN collection_translation cd ON c.id = cd."baseId" WHERE cd.slug = 'sports-loisirs' LIMIT 1
),
-- A. Fitness & Musculation
ins_fitness AS (
    INSERT INTO collection ("createdAt", "updatedAt", "isRoot", "position", "isPrivate", "parentId", "inheritFilters", "filters")
    SELECT NOW(), NOW(), false, 1, false, id, true, '[]' FROM parent_sports
    RETURNING id
),
ins_fitness_trans AS (
    INSERT INTO collection_translation ("createdAt", "updatedAt", "languageCode", "name", "slug", "description", "baseId")
    SELECT NOW(), NOW(), 'fr', 'Fitness & Musculation', 'fitness-musculation', 'Haltères, tapis de yoga, cordes à sauter, élastiques, appareils', id FROM ins_fitness
    UNION ALL
    SELECT NOW(), NOW(), 'en', 'Fitness & Bodybuilding', 'fitness-musculation', 'Dumbbells, yoga mats, jump ropes, resistance bands, workout gear', id FROM ins_fitness
),
ins_fitness_chan AS (
    INSERT INTO collection_channels_channel ("collectionId", "channelId")
    SELECT id, 1 FROM ins_fitness
),

-- B. Sports Collectifs & Ballons
ins_collectifs AS (
    INSERT INTO collection ("createdAt", "updatedAt", "isRoot", "position", "isPrivate", "parentId", "inheritFilters", "filters")
    SELECT NOW(), NOW(), false, 2, false, id, true, '[]' FROM parent_sports
    RETURNING id
),
ins_collectifs_trans AS (
    INSERT INTO collection_translation ("createdAt", "updatedAt", "languageCode", "name", "slug", "description", "baseId")
    SELECT NOW(), NOW(), 'fr', 'Sports Collectifs & Ballons', 'sports-collectifs-ballons', 'Football, basketball, volleyball, ballons et équipements', id FROM ins_collectifs
    UNION ALL
    SELECT NOW(), NOW(), 'en', 'Team Sports & Balls', 'sports-collectifs-ballons', 'Soccer, basketball, volleyball, balls and equipment', id FROM ins_collectifs
),
ins_collectifs_chan AS (
    INSERT INTO collection_channels_channel ("collectionId", "channelId")
    SELECT id, 1 FROM ins_collectifs
),

-- C. Vêtements & Chaussures de Sport
ins_vetements AS (
    INSERT INTO collection ("createdAt", "updatedAt", "isRoot", "position", "isPrivate", "parentId", "inheritFilters", "filters")
    SELECT NOW(), NOW(), false, 3, false, id, true, '[]' FROM parent_sports
    RETURNING id
),
ins_vetements_trans AS (
    INSERT INTO collection_translation ("createdAt", "updatedAt", "languageCode", "name", "slug", "description", "baseId")
    SELECT NOW(), NOW(), 'fr', 'Vêtements & Chaussures de Sport', 'vetements-chaussures-sport', 'Maillots, shorts, leggings, baskets de sport, running', id FROM ins_vetements
    UNION ALL
    SELECT NOW(), NOW(), 'en', 'Sportswear & Athletic Shoes', 'vetements-chaussures-sport', 'Jerseys, shorts, running shoes, gym wear', id FROM ins_vetements
),
ins_vetements_chan AS (
    INSERT INTO collection_channels_channel ("collectionId", "channelId")
    SELECT id, 1 FROM ins_vetements
),

-- D. Cyclisme & Vélos
ins_cyclisme AS (
    INSERT INTO collection ("createdAt", "updatedAt", "isRoot", "position", "isPrivate", "parentId", "inheritFilters", "filters")
    SELECT NOW(), NOW(), false, 4, false, id, true, '[]' FROM parent_sports
    RETURNING id
),
ins_cyclisme_trans AS (
    INSERT INTO collection_translation ("createdAt", "updatedAt", "languageCode", "name", "slug", "description", "baseId")
    SELECT NOW(), NOW(), 'fr', 'Cyclisme & Vélos', 'cyclisme-velos', 'VTT, vélos adultes, casques, antivols, accessoires vélo', id FROM ins_cyclisme
    UNION ALL
    SELECT NOW(), NOW(), 'en', 'Cycling & Bikes', 'cyclisme-velos', 'Mountain bikes, road bikes, helmets, bike accessories', id FROM ins_cyclisme
),
ins_cyclisme_chan AS (
    INSERT INTO collection_channels_channel ("collectionId", "channelId")
    SELECT id, 1 FROM ins_cyclisme
),

-- E. Accessoires de Sport & Plein Air
ins_accessoires AS (
    INSERT INTO collection ("createdAt", "updatedAt", "isRoot", "position", "isPrivate", "parentId", "inheritFilters", "filters")
    SELECT NOW(), NOW(), false, 5, false, id, true, '[]' FROM parent_sports
    RETURNING id
),
ins_accessoires_trans AS (
    INSERT INTO collection_translation ("createdAt", "updatedAt", "languageCode", "name", "slug", "description", "baseId")
    SELECT NOW(), NOW(), 'fr', 'Accessoires de Sport & Plein Air', 'accessoires-sport-plein-air', 'Gourdes, sacs de sport, brassards, montres connectées, serviettes', id FROM ins_accessoires
    UNION ALL
    SELECT NOW(), NOW(), 'en', 'Sports & Outdoor Accessories', 'accessoires-sport-plein-air', 'Water bottles, gym bags, sports watches, armbands', id FROM ins_accessoires
),
ins_accessoires_chan AS (
    INSERT INTO collection_channels_channel ("collectionId", "channelId")
    SELECT id, 1 FROM ins_accessoires
),

-- F. Sports de Combat & Raquettes
ins_combat AS (
    INSERT INTO collection ("createdAt", "updatedAt", "isRoot", "position", "isPrivate", "parentId", "inheritFilters", "filters")
    SELECT NOW(), NOW(), false, 6, false, id, true, '[]' FROM parent_sports
    RETURNING id
),
ins_combat_trans AS (
    INSERT INTO collection_translation ("createdAt", "updatedAt", "languageCode", "name", "slug", "description", "baseId")
    SELECT NOW(), NOW(), 'fr', 'Sports de Combat & Raquettes', 'sports-combat-raquettes', 'Gants de boxe, bandages, raquettes de tennis, badminton', id FROM ins_combat
    UNION ALL
    SELECT NOW(), NOW(), 'en', 'Combat Sports & Rackets', 'sports-combat-raquettes', 'Boxing gloves, wraps, tennis & badminton rackets', id FROM ins_combat
),
ins_combat_chan AS (
    INSERT INTO collection_channels_channel ("collectionId", "channelId")
    SELECT id, 1 FROM ins_combat
)
SELECT 'Sous-catégories Sports créées';

-- 3. Mise à jour automatique de collection_closure pour toutes les collections (anciennes 2562-2574 et nouvelles)
-- Insère les self-joins (id, id) manquants
INSERT INTO collection_closure (id_ancestor, id_descendant)
SELECT c.id, c.id
FROM collection c
WHERE NOT EXISTS (
    SELECT 1 FROM collection_closure cc WHERE cc.id_ancestor = c.id AND cc.id_descendant = c.id
);

-- Répète l'héritage des ancêtres jusqu'à ce que tout soit résolu
INSERT INTO collection_closure (id_ancestor, id_descendant)
WITH RECURSIVE cat_tree AS (
    SELECT c.id AS descendant, c."parentId" AS ancestor
    FROM collection c
    WHERE c."parentId" IS NOT NULL
    
    UNION ALL
    
    SELECT ct.descendant, c."parentId"
    FROM cat_tree ct
    JOIN collection c ON c.id = ct.ancestor
    WHERE c."parentId" IS NOT NULL
)
SELECT DISTINCT ancestor, descendant
FROM cat_tree
WHERE ancestor IS NOT NULL
ON CONFLICT DO NOTHING;

COMMIT;
