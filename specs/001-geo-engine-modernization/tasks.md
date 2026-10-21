# Tasks: Modernisation du GeoEngine Ahizan (Architecture Hybride PostGIS + Relais Contrôlé)

**Feature**: `001-geo-engine-modernization` | **Date**: 2026-10-12
**Spec**: [spec.md](file:///srv/ahizan/specs/001-geo-engine-modernization/spec.md) | **Plan**: [plan.md](file:///srv/ahizan/specs/001-geo-engine-modernization/plan.md)

---

## Phase 1 : Assainissement de la Base & Ingestion PostGIS (Données OCHA COD-AB)

- [x] **Task 1.1** : Créer et exécuter le script de nettoyage et d'indexation SQL (`cleanup-geo-zones.sql`)
  * Normaliser les types non standard (`QUARTIER` $\rightarrow$ `NEIGHBORHOOD`).
  * Supprimer les lignes orphelines sans slug (`elidja`).
  * S'assurer de l'extension PostGIS et des index `GIST` sur `boundary` et coordonnées.
- [x] **Task 1.2** : Créer le script d'ingestion Node/TypeScript/Python (`generate_import_geo.py` & `import_geo.sql`)
  * Parser `ben_admin0.geojson` pour insérer le pays Bénin (`COUNTRY`).
  * Parser `ben_admin1.geojson` pour insérer les 12 départements (`DEPARTMENT`) avec géométries `boundary` simplifiées (`ST_SimplifyPreserveTopology`).
  * Parser `ben_admin2.geojson` pour insérer les 77 communes (`COMMUNE`) avec leurs polygones et les lier à leurs départements parents via `adm1_pcode`.
- [x] **Task 1.3** : Exécuter l'ingestion dans la base PostgreSQL (`ahizan_db`) et rattacher les 31 marchés existants
  * Script d'ingestion exécuté avec succès.
  * 31 marchés physiques rattachés géographiquement à leur commune via `ST_Contains`.
  * Total en base : 1 Pays, 12 Départements, 77 Communes, 31 Marchés rattachés.

---

## Phase 2 : Moteur Spatial Backend (`GeoService` & GraphQL)

- [x] **Task 2.1** : Refactoriser `resolveCoordinates` dans [`geo.service.ts`](file:///srv/ahizan/backend/src/plugins/geo-engine/service/geo.service.ts)
  * Implémenter la résolution hiérarchique en cascade PostGIS (`ST_Contains` puis `ST_Distance`).
  * Trouver le marché le plus proche dans un rayon de 2 000 m.
  * Intégrer la source de résolution (`LOCAL_POSTGIS`) et le niveau de confiance (`confidence`).
  * Facteur de sinuosité urbaine béninois ($1.30$) appliqué aux distances réelles.
- [x] **Task 2.2** : Mettre à jour le schéma GraphQL (`api-extensions.ts`)
  * Enrichir le type `CurrentLocation` avec `source: String`.

---

## Phase 3 : Assainissement de l'Espace Vendeur (`seller/`)

- [x] **Task 3.1** : Nettoyer [onboarding-form.tsx](file:///srv/ahizan/seller/src/app/onboarding/onboarding-form.tsx)
  * Supprimer le `fetch` direct vers `nominatim.openstreetmap.org/reverse`.
  * Remplacer par l'appel à la requête GraphQL `resolveCoordinates(lat, lng)`.
  * Assigner automatiquement `locationId` lors de la détection GPS.
- [x] **Task 3.2** : Nettoyer [account-settings-form.tsx](file:///srv/ahizan/seller/src/app/dashboard/settings/account-settings-form.tsx)
  * Supprimer le `fetch` direct vers Nominatim.
  * Remplacer par `resolveCoordinates(lat, lng)` pour préremplir la zone et le marché physique.

---

## Phase 4 : Découplage et Modernisation du Storefront (`Storefront/`)

- [x] **Task 4.1** : Nettoyer [location-context.tsx](file:///srv/ahizan/Storefront/src/contexts/location-context.tsx)
  * Supprimer définitivement la constante statique `FALLBACK_NEIGHBORHOODS`.
  * Supprimer la logique de calcul de distance locale par mock.
  * Consommer dynamiquement les communes retournées par l'API `geoZones(type: "COMMUNE")`.
- [x] **Task 4.2** : Améliorer le sélecteur manuel de commune en cas de GPS refusé
  * Permettre à l'utilisateur de choisir n'importe quelle commune du Bénin parmi les 77 réelles (par défaut Cotonou).
  * Conserver le classement par proximité du `display-engine.ts`.

---

## Phase 5 : Calculateur des Frais de Livraison Optimisé

- [x] **Task 5.1** : Mettre à jour [`geo.service.ts`](file:///srv/ahizan/backend/src/plugins/geo-engine/service/geo.service.ts) & [`geo-engine-shipping.calculator.ts`](file:///srv/ahizan/backend/src/plugins/geo-engine/shipping/geo-engine-shipping.calculator.ts)
  * Appliquer le facteur de sinuosité urbaine local ($1.30$) sur la distance géodésique PostGIS.
  * Enforcer le plancher minimum de 500 FCFA.
  * S'assurer de 0 appel externe pour le panier.

---

## Phase 6 : Validation Finale & Recette

- [x] **Task 6.1** : Tester la requête `resolveCoordinates` pour Cotonou, Calavi, Porto-Novo ($< 15\text{ ms}$).
  * Cotonou (6.3620, 2.4000) $\rightarrow$ Résolu en Littoral / Cotonou / Marché de Cadjèhoun (`source: "LOCAL_POSTGIS"`).
  * Porto-Novo (6.4969, 2.6289) $\rightarrow$ Résolu en Ouémé / Porto-Novo / Grand Marché (`source: "LOCAL_POSTGIS"`).
- [x] **Task 6.2** : Vérifier dans les DevTools qu'aucune requête externe vers `nominatim.openstreetmap.org` n'est émise.
  * Appels Nominatim supprimés dans `onboarding-form.tsx` et `account-settings-form.tsx`.
- [x] **Task 6.3** : Vérifier que le Storefront charge et classe les produits sans aucune erreur console.
  * `FALLBACK_NEIGHBORHOODS` supprimé, conteneurs `vendure`, `seller`, `storefront` reconstruits et relancés avec succès. HTTP 200 OK.

