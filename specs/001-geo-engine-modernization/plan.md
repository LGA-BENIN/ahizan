# Implementation Plan: Modernisation du GeoEngine Ahizan (Architecture Hybride PostGIS + Relais Contrôlé)

**Branch**: `001-geo-engine-modernization` | **Date**: 2026-10-12 | **Status**: Ready
**Spec**: [spec.md](file:///srv/ahizan/specs/001-geo-engine-modernization/spec.md)
**Source**: [ahizan_prompt.md](file:///srv/ahizan/benin%20location/ahizan_prompt.md)

---

## 1. Architecture & Technical Context

### Technical Stack:
* **Database & GIS**: PostgreSQL 16 + PostGIS (`ahizan_db` docker container), SRID 4326 (WGS84), Index spatiaux GIST.
* **Backend**: NestJS, TypeORM, Vendure Plugin Architecture (`GeoEnginePlugin`), GraphQL API.
* **Datasets Officiels**: Fichiers OCHA COD-AB dans `/srv/ahizan/benin location/` (`ben_admin0.geojson`, `ben_admin1.geojson`, `ben_admin2.geojson`, `ben_adminpoints.geojson`).
* **Frontend Vendeur**: Next.js App Router (`/srv/ahizan/seller/`).
* **Storefront Client**: Next.js App Router (`/srv/ahizan/Storefront/`).

---

## 2. Phase-by-Phase Plan

```mermaid
flowchart TD
    subgraph Phase 1 [Phase 1: Assainissement & Ingestion PostGIS]
        M1[Nettoyage DB / Enums / GIST Index] --> M2[Import COD-AB: Pays, 12 Dép., 77 Communes]
        M2 --> M3[Rattachement spatial des 31 marchés existants]
    end

    subgraph Phase 2 [Phase 2: Moteur Spatial Backend GeoService]
        S1[Refactorisation resolveCoordinates en cascade] --> S2[PostGIS ST_Contains / ST_Distance]
        S2 --> S3[Relais externe serveur contrôlé & Logging]
    end

    subgraph Phase 3 [Phase 3: Assainissement Seller App]
        SE1[Suppression fetch Nominatim direct] --> SE2[Branchement sur requête GraphQL resolveCoordinates]
    end

    subgraph Phase 4 [Phase 4: Storefront & Découplage Mocks]
        SF1[Suppression FALLBACK_NEIGHBORHOODS] --> SF2[Intégration resolveCoordinates dynamique]
        SF2 --> SF3[Fallback propre par sélecteur de commune]
    end

    subgraph Phase 5 [Phase 5: Calculateur de Livraison Optimisé]
        SH1[Intégration sinuosité urbaine 1.30] --> SH2[Calcul PostGIS instantané à 0 FCFA]
    end

    Phase 1 --> Phase 2
    Phase 2 --> Phase 3
    Phase 2 --> Phase 4
    Phase 2 --> Phase 5
```

---

### Phase 1 : Assainissement de la Base & Ingestion des Découpages Officiels
1. **Migration SQL de nettoyage** :
   * Normaliser les types : `UPDATE geo_zone SET type = 'NEIGHBORHOOD' WHERE type = 'QUARTIER'`.
   * Supprimer les enregistrements corrompus sans slug ou de test (`elidja`).
   * S'assurer de l'activation de l'extension PostGIS et des index `GIST` sur `boundary`.
2. **Script d'ingestion officiel (`import-cod-benin.ts`)** :
   * Parser `ben_admin0.geojson` $\rightarrow$ Créer la racine `COUNTRY` Bénin.
   * Parser `ben_admin1.geojson` $\rightarrow$ Créer les 12 départements avec leurs polygones `MultiPolygon` simplifiés via `ST_GeomFromGeoJSON`, rattachés au Bénin.
   * Parser `ben_admin2.geojson` $\rightarrow$ Créer les 77 communes avec leurs polygones, rattachées à leur département parent via `adm1_pcode`.
   * Exécuter la mise à jour spatiale des 31 marchés de la table `market` pour assigner leur `geoZoneId` via `ST_Contains`.

### Phase 2 : Refactorisation de la Résolution Spatiale ([`GeoService`](file:///srv/ahizan/backend/src/plugins/geo-engine/service/geo.service.ts))
1. **Résolution hiérarchique en cascade** :
   * *Niveau 1 (Local PostGIS)* : Requête `ST_Contains(boundary, ST_SetSRID(ST_Point(lng, lat), 4326))` par ordre de finesse (`NEIGHBORHOOD` $\rightarrow$ `COMMUNE` $\rightarrow$ `DEPARTMENT`).
   * *Niveau 2 (Marché le plus proche)* : Requête `ST_Distance` dans un rayon de 2 000 m.
   * *Niveau 3 (Relais externe sécurisé)* : Si aucune zone n'est trouvée (zone frontière/mer), appel contrôlé côté serveur et journalisation dans `geo_resolution_log`.
2. **Exposition GraphQL unifiée** :
   * Uniformiser le retour GraphQL de `resolveCoordinates` dans `shopApiExtensions` et `adminApiExtensions`.

### Phase 3 : Assainissement de l'Espace Vendeur (`seller/`)
1. **Suppression du contournement OSM** :
   * Éliminer l'appel à `https://nominatim.openstreetmap.org/reverse` dans [onboarding-form.tsx](file:///srv/ahizan/seller/src/app/onboarding/onboarding-form.tsx) et [account-settings-form.tsx](file:///srv/ahizan/seller/src/app/dashboard/settings/account-settings-form.tsx).
2. **Raccordement GraphQL pur** :
   * Remplacer par l'appel à `resolveCoordinates(lat, lng)` du backend et préremplissage de `locationId` et `physicalMarketId`.

### Phase 4 : Découplage du Storefront (`Storefront/`)
1. **Élimination des mocks statiques** :
   * Supprimer la constante `FALLBACK_NEIGHBORHOODS` dans [location-context.tsx](file:///srv/ahizan/Storefront/src/contexts/location-context.tsx).
2. **Résolution dynamique & Sélecteur propre** :
   * Consommer les communes réelles `geoZones(type: "COMMUNE")` depuis l'API.
   * Maintenir le comportement du `display-engine.ts` par paliers de proximité spatiale.

### Phase 5 : Optimisation des Frais de Livraison
1. **Mise à jour du calculateur** ([geo-engine-shipping.calculator.ts](file:///srv/ahizan/backend/src/plugins/geo-engine/shipping/geo-engine-shipping.calculator.ts)) :
   * Appliquer la formule de distance géodésique corrigée du coefficient de sinuosité :
     $$\text{Distance}(\text{km}) = \left(\frac{\text{ST\_Distance}(P_{\text{vendor}}, P_{\text{client}})}{1000}\right) \times 1.30$$
   * Frais de livraison avec respect strict du plancher de 500 FCFA.
