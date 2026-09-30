INSERT INTO page_section ("createdAt", "updatedAt", "type", "title", "description", "layout", "order", "isActive", "dataJson", "pageId")
VALUES
(
  NOW(), NOW(), 'MARKET_INFO', '🌴 {{market.name}}', 'Identité officielle et carte interactive', 'default', 1, true,
  '{"name":"{{market.name}}","slug":"{{market.slug}}","description":"{{market.description}}","image":"{{market.image}}","icon":"{{market.icon}}","latitude":"{{market.latitude}}","longitude":"{{market.longitude}}","radius":"{{market.radius}}","showProducts":false}',
  2
),
(
  NOW(), NOW(), 'CATEGORIES', '🚶 Les Allées de {{market.name}}', 'Explorez les rayons et univers du marché', 'grid', 2, true,
  '{"title":"🚶 Les Allées de {{market.name}}","subtitle":"Que recherchez-vous aujourd''hui dans le marché ?","style":"pills","columns":6}',
  2
),
(
  NOW(), NOW(), 'LOCAL_VENDORS', '🏪 Les Boutiques de {{market.name}}', 'Commerçants et artisans installés au marché {{market.name}}', 'carousel', 3, true,
  '{"title":"🏪 Les Boutiques de {{market.name}}","subtitle":"Achetez directement auprès des vendeurs résidents vérifiés","layoutStyle":"carousel","take":12,"locationSource":"FIXED_MARKET"}',
  2
),
(
  NOW(), NOW(), 'LOCAL_PRODUCTS', '🛍️ En ce moment à {{market.name}}', 'Articles disponibles chez les vendeurs de ce marché', 'grid', 4, true,
  '{"title":"🛍️ En ce moment à {{market.name}}","subtitle":"Produits disponibles immédiatement avec livraison express","experienceStrategy":"LOCAL_DISCOVERY","selectionMode":"AUTOMATIC","layout":"grid-4","limit":8,"locationSource":"FIXED_MARKET"}',
  2
),
(
  NOW(), NOW(), 'TABBED_PRODUCT_GRID', '🔥 Ça bouge à {{market.name}}', 'Nouveautés, meilleures ventes et promos du marché', 'tabs', 5, true,
  '{"title":"🔥 Ça bouge à {{market.name}}","subtitle":"Les meilleures affaires et nouveautés de {{market.name}}","tabs":[{"id":"trending","label":"Populaires","filterType":"TRENDING"},{"id":"latest","label":"Nouveautés","filterType":"LATEST"},{"id":"promos","label":"Bonnes Affaires","filterType":"FLASH_DEALS"}],"limit":8,"columns":4}',
  2
),
(
  NOW(), NOW(), 'LOCAL_CASCADE_ENGINE', '🛍️ Tout le Marché de {{market.name}}', 'Grand catalogue complet avec filtres', 'full', 6, true,
  '{"title":"🛍️ Tout le Marché de {{market.name}}","subtitle":"Filtrez par catégorie, prix et boutiques de {{market.name}}","showFilters":true,"pageSize":24}',
  2
);
