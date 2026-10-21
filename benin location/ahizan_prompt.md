# Spécification Technique & Prompt d'Exécution : Modernisation du GeoEngine Ahizan (Architecture Hybride PostGIS + Google Maps)

## 1. Contexte & Problématique

La plateforme Ahizan dispose d'un plugin backend géospatial (`GeoEnginePlugin`) basé sur **PostgreSQL 16 + PostGIS**, mais le système souffre actuellement d'une rupture de cohérence entre le backend et les frontends :
1. **Base de données quasi-vide et corrompue :** La table `geo_zone` ne contient que 5 lignes avec des valeurs non conformes à l'énumération TypeORM (ex: `'QUARTIER'` au lieu de `'NEIGHBORHOOD'`) et sans géométries vectorielles réelles (`boundary` est vide ou réduit à un point).
2. **Contournement illégal et instable côté Vendeur :** L'application `seller/` effectue un `fetch` direct depuis le navigateur vers l'API publique `nominatim.openstreetmap.org/reverse`, risquant un bannissement d'IP immédiat par la fondation OSM.
3. **Données statiques codées en dur côté Client :** Le Storefront (`Storefront/src/contexts/location-context.tsx`) utilise un tableau en dur `FALLBACK_NEIGHBORHOODS` de 18 quartiers et des calculs Haversine en mémoire, court-circuitant le backend.
4. **Fichiers de référence disponibles :** Les packages officiels OCHA/INSTaD COD-AB (*Benin - Subnational Administrative Boundaries* : ADM1, ADM2, ADM3 en GeoJSON/Shapefile/Excel) ont été uploadés dans la codebase.

### Objectif architectural
Construire un **système souverain à haute vitesse et coût minimal** :
* **95 % des requêtes à 0 FCFA / < 10 ms** traitées en local par PostGIS (`ST_Contains` sur les polygones officiels).
* **5 % de requêtes résolues par relais externe contrôlé** (OSM Nominatim serveur ou Google Geocoding API via backend) avec journalisation dans `geo_resolution_log`.
* **Saisie d'adresses précises via Google Places Autocomplete** avec *Session Tokens* pour minimiser la facturation API.
* **Calcul kilométrique réaliste** via PostGIS corrigé d'un facteur de sinuosité urbaine local ($1.30$).

---

## 2. Périmètre des Fichiers Cibles

```
├── /srv/ahizan/backend/src/plugins/geo-engine/
│   ├── entities/
│   │   ├── geo-zone.entity.ts
│   │   └── geo-resolution-log.entity.ts
│   ├── service/
│   │   └── geo.service.ts
│   ├── shipping/
│   │   ├── geo-engine-shipping.calculator.ts
│   │   └── geo-engine-shipping.eligibility-checker.ts
│   ├── scripts/
│   │   ├── cleanup-geo-zones.sql
│   │   └── import-cod-benin.ts
│   └── geo-engine.plugin.ts
├── /srv/ahizan/seller/src/app/
│   ├── onboarding/onboarding-form.tsx
│   └── dashboard/settings/account-settings-form.tsx
└── /srv/ahizan/Storefront/src/
    ├── contexts/location-context.tsx
    └── lib/vendure/display-engine.ts
```

---

## 3. Plan d'Implémentation Étape par Étape

### Étape 1 : Assainissement de la Base & Ingestion des Découpages Officiels

#### A. Migration de nettoyage (`cleanup-geo-zones.sql`)
Exécuter un nettoyage contrôlé des données orphelines et corriger les incohérences d'énumérations dans `geo_zone` :

```sql
-- Nettoyage des types non standard
UPDATE geo_zone 
SET type = 'NEIGHBORHOOD' 
WHERE type = 'QUARTIER';

-- Suppression des entrées de test non rattachées et sans slug valide
DELETE FROM geo_zone 
WHERE slug IS NULL OR slug = '' OR name = 'elidja';

-- S'assurer que la colonne spatiale PostGIS est en SRID 4326 et indexée
CREATE EXTENSION IF NOT EXISTS postgis;
ALTER TABLE geo_zone 
  ALTER COLUMN boundary TYPE geometry(Geometry, 4326) 
  USING ST_SetSRID(boundary, 4326);

CREATE INDEX IF NOT EXISTS idx_geo_zone_boundary 
  ON geo_zone USING GIST (boundary);

CREATE INDEX IF NOT EXISTS idx_geo_zone_center_coords 
  ON geo_zone (center_latitude, center_longitude);
```

#### B. Script d'import massif des fichiers OCHA COD-AB (`import-cod-benin.ts`)
Créer un script exécutable en ligne de commande ou via NestJS Task pour ingérer les fichiers téléchargés :
1. **Niveau 0 / Pays :** Créer la racine Bénin (`type: 'COUNTRY'`, code: `BEN`).
2. **Niveau 1 / Départements (`ben_admbnda_adm1_...`) :**
   * Importer les **12 départements** (Atacora, Donga, Borgou, Alibori, Collines, Zou, Plateau, Ouémé, Atlantique, Littoral, Mono, Couffo).
   * Injecter le polygone GeoJSON dans `boundary` via `ST_GeomFromGeoJSON(...)`.
   * Calculer `centerLatitude` et `centerLongitude` via `ST_Centroid(boundary)`.
   * `parent` = Bénin.
3. **Niveau 2 / Communes (`ben_admbnda_adm2_...`) :**
   * Importer les **77 communes**.
   * Rattacher chaque commune à son département parent via le `P-Code` (ex: `BJ0101` $\rightarrow$ `BJ01`).
   * Injecter les polygones `MultiPolygon` simplifiés (`ST_Multi(ST_SimplifyPreserveTopology(ST_GeomFromGeoJSON(geom), 0.0001))`).
4. **Niveau 3 / Arrondissements (`ben_admbnda_adm3_...`) :**
   * Importer les **546 arrondissements**.
   * Rattacher chaque arrondissement à sa commune parente.
5. **Rattachement des Marchés (`market`) :**
   * Pour chacun des 31 marchés existants dans `market.md`, exécuter une requête spatiale pour assigner automatiquement son `geoZoneId` au bon arrondissement ou commune :
   ```sql
   UPDATE market m
   SET geo_zone_id = (
     SELECT gz.id FROM geo_zone gz
     WHERE gz.type IN ('NEIGHBORHOOD', 'ARRONDISSEMENT')
       AND ST_Contains(gz.boundary, ST_SetSRID(ST_Point(m.longitude, m.latitude), 4326))
     LIMIT 1
   )
   WHERE m.geo_zone_id IS NULL;
   ```

---

### Étape 2 : Refactorisation du Backend (`GeoService`)

Modifier `/srv/ahizan/backend/src/plugins/geo-engine/service/geo.service.ts` pour implémenter la résolution hiérarchique en cascade.

#### Règles de Résolution Spatiale :
1. **Priorité 1 : PostGIS Polygones (`ST_Contains`)**
   * Trouver la zone la plus fine contenant le point $(lng, lat)$.
   * *Attention PostGIS :* $X = lng$ et $Y = lat \rightarrow \text{ST\_Point}(lng, lat)$.
   * Ordre de sélection : `NEIGHBORHOOD` $\rightarrow$ `ARRONDISSEMENT` $\rightarrow$ `COMMUNE`.
2. **Priorité 2 : Marché & POI le plus proche (`ST_Distance`)**
   * Identifier si un marché physique de la table `market` se situe dans un rayon de $2\,000\text{ m}$.
3. **Priorité 3 : Relais Externe Sécurisé (Google Geocoding API côté Backend)**
   * Ne déclencher cette requête externe que si **aucune commune ou arrondissement** n'a été détecté dans un rayon de $15\text{ km}$ (zone limite frontière ou offshore).
   * Clé API stockée uniquement dans les variables d'environnement backend (`GOOGLE_MAPS_BACKEND_API_KEY`).
   * Journaliser chaque appel dans `geo_resolution_log` avec `provider = 'GOOGLE_MAPS'` ou `'NOMINATIM_SERVER'`.

```typescript
// Interface de retour standardisée GraphQL
export interface ResolvedLocationResult {
  zoneId: string;
  zoneName: string;
  zoneType: 'COUNTRY' | 'DEPARTMENT' | 'COMMUNE' | 'ARRONDISSEMENT' | 'NEIGHBORHOOD';
  departmentName?: string;
  communeName?: string;
  arrondissementName?: string;
  closestMarketId?: string;
  closestMarketName?: string;
  distanceToMarketMeters?: number;
  confidence: number;
  source: 'LOCAL_POSTGIS' | 'SERVER_GOOGLE' | 'SERVER_OSM';
}
```

---

### Étape 3 : Nettoyage et Sécurisation du Frontend Vendeur (`seller/`)

#### A. Suppression des appels directs vers OSM
Supprimer l'intégralité du code appelant `https://nominatim.openstreetmap.org/reverse` dans :
* `seller/src/app/onboarding/onboarding-form.tsx`
* `seller/src/app/dashboard/settings/account-settings-form.tsx`

#### B. Substitution par la mutation GraphQL backend
Lors du clic sur « Détecter ma position GPS » :
1. Récupérer `coords.latitude` et `coords.longitude` via l'API standard `navigator.geolocation`.
2. Appeler la requête GraphQL :
   ```graphql
   query ResolveCoordinates($lat: Float!, $lng: Float!) {
     resolveCoordinates(lat: $lat, lng: $lng) {
       zoneId
       zoneName
       zoneType
       communeName
       arrondissementName
       closestMarketId
       confidence
       source
     }
   }
   ```
3. Assigner automatiquement les valeurs :
   * `latitude` et `longitude` dans le formulaire.
   * `locationId` = `resolveCoordinates.zoneId`.
   * `physicalMarketId` = `resolveCoordinates.closestMarketId` (si détecté).

---

### Étape 4 : Refonte du Contexte de Localisation Storefront (`Storefront/`)

Dans `Storefront/src/contexts/location-context.tsx` :
1. **Suppression définitive :**
   * Retirer la constante `FALLBACK_NEIGHBORHOODS` et toute méthode calculant une distance locale par mock statique.
2. **Initialisation et Fallback Propre :**
   * À l'initialisation, si l'internaute accepte la géolocalisation : appeler `resolveCoordinates(lat, lng)`.
   * Si l'internaute **refuse** la géolocalisation ou est hors zone :
     * Interroger l'API pour récupérer la liste des communes enregistrées : `geoZones(type: COMMUNE)`.
     * Présenter un sélecteur de commune (par défaut : *Cotonou*).
     * Stocker dans le `localStorage` (`ahizan_client_location`) :
       ```json
       {
         "zoneId": "id-cotonou",
         "name": "Cotonou",
         "type": "COMMUNE",
         "lat": 6.3654,
         "lng": 2.4183,
         "isApproximate": true
       }
       ```
3. **Moteur d'Affichage (`display-engine.ts`) :**
   * Conserver la logique par paliers de proximité spatiale :
     $$\text{Palier 1 (Marché)} \rightarrow \text{Palier 2 (Arrondissement)} \rightarrow \text{Palier 3 (Commune)} \rightarrow \text{Palier 4 (Global)}$$

---

### Étape 5 : Optimisation des Frais de Livraison (Shipping Calculator)

Dans `geo-engine-shipping.calculator.ts` :
* Éviter les appels systématiques à l'API payante Google Distance Matrix pour la simple consultation du panier.
* Remplacer la distance euclidienne pure par la distance géodésique PostGIS multipliée par le coefficient de sinuosité urbaine béninois :
  $$\text{DistanceEstimee}(\text{km}) = \left(\frac{\text{ST\_Distance}(P_{\text{vendor}}, P_{\text{client}})}{1000}\right) \times 1.30$$
* Formule tarifaire appliquée :
  $$\text{FraisLivraison} = \max\left(\text{BaseFee}, \text{BaseFee} + \text{DistanceEstimee} \times \text{TarifKm}\right)$$
* Seul le checkout final, en cas de commande de fret lourd ou de transport express spécifique, peut solliciter l'API Routes de Google si le paramètre vendeur l'exige.

---

### Étape 6 : Saisie Assistée par Autocomplétion Google Places (Frontend)

Pour les champs de recherche d'adresse textuelle libre (ex: barre de recherche d'adresse du client ou sélection de point de repère vendeur) :
1. Intégrer Google Places Autocomplete en utilisant impérativement un **`sessionToken`** :
   ```typescript
   // Cycle de vie de la session :
   // 1. Instanciation du token à la première frappe au clavier :
   const sessionToken = new google.maps.places.AutocompleteSessionToken();
   
   // 2. Requête d'autocomplétion restreinte au Bénin :
   const service = new google.maps.places.AutocompleteService();
   service.getPlacePredictions({
     input: queryText,
     sessionToken: sessionToken,
     componentRestrictions: { country: 'bj' },
   }, callback);
   
   // 3. Récupération des coordonnées finales (ferme la session de facturation) :
   placesService.getDetails({
     placeId: selectedPlaceId,
     fields: ['geometry.location', 'place_id'],
     sessionToken: sessionToken
   }, (place) => {
     const lat = place.geometry.location.lat();
     const lng = place.geometry.location.lng();
     // Transmettre immédiatement ces coordonnées au GeoEngine backend
     geoService.resolveCoordinates(lat, lng);
   });
   ```
2. **Ne stocker en base que `lat`, `lng` et le `place_id`.** La détermination du quartier et des frais de livraison est immédiatement confiée à votre PostGIS local.

---

## 4. Critères d'Acceptation & Validation (Definition of Done)

1. [ ] **Intégrité de la base de données :**
   * La table `geo_zone` contient 12 départements, 77 communes et au moins 546 arrondissements avec des polygones PostGIS valides (`ST_IsValid(boundary) = true`).
   * Aucun type `'QUARTIER'` n'existe en base ; tous utilisent l'énumération officielle `NEIGHBORHOOD`.
2. [ ] **Performance du Backend :**
   * Une requête `resolveCoordinates` pour un point situé à Cadjèhoun ($6.3571, 2.4012$) répond en moins de **15 millisecondes** avec la source `'LOCAL_POSTGIS'`.
   * L'API Google Geocoding backend n'est appelée qu'en cas d'échec total de la base locale.
3. [ ] **Frontend Vendeur Assaini :**
   * Aucune requête HTTP vers `nominatim.openstreetmap.org` n'apparaît dans l'onglet Réseau des DevTools lors de la détection de position du vendeur.
4. [ ] **Storefront Découplé du Code Dur :**
   * `FALLBACK_NEIGHBORHOODS` est complètement supprimé.
   * L'application continue de fonctionner et de classer les produits même en désactivant le GPS, en se rabattant sur la commune sélectionnée.
5. [ ] **Contrôle des Coûts :**
   * L'autocomplétion Google Places utilise des *Session Tokens* prouvés par inspection réseau.
   * L'estimation de livraison panier s'exécute à 100 % en base de données sans requêtes externes.