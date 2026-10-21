# Feature Specification: Modernisation du GeoEngine Ahizan (Architecture Hybride PostGIS + Relais Contrôlé)

**Feature Branch**: `001-geo-engine-modernization`
**Created**: 2026-10-12
**Status**: Ready for Implementation
**Input**: [Spécification Technique & Prompt d'Exécution : Modernisation du GeoEngine Ahizan](file:///srv/ahizan/benin%20location/ahizan_prompt.md)

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Détection et Résolution Instantanée de la Localisation Client (Priority: P1)

En tant qu'acheteur sur le Storefront Ahizan, lorsque j'ouvre la plateforme et autorise la géolocalisation de mon navigateur, le système doit déterminer immédiatement mon quartier, arrondissement et commune avec un taux de réussite local maximal, sans dépendre d'une liste statique en mémoire ni ralentir le chargement.

**Why this priority**: C'est le cœur de l'expérience utilisateur et de l'hyper-proximité de la marketplace. Permet de classer instantanément les produits et vendeurs les plus proches (Dantokpa, Cadjèhoun, Calavi, etc.).

**Independent Test**:
Effectuer une requête de résolution avec des coordonnées GPS représentatives de Cotonou (ex: $6.3571, 2.4012$ pour Cadjèhoun) : le système doit renvoyer instantanément l'arrondissement, la commune et le marché le plus proche en $< 15\text{ ms}$ avec la source locale `LOCAL_POSTGIS`.

**Acceptance Scenarios**:
1. **Given** un acheteur autorisant le GPS à Cotonou, **When** le Storefront sollicite la résolution, **Then** la commune, l'arrondissement et le marché de rattachement sont résolus depuis la base PostGIS locale sans appel externe.
2. **Given** un acheteur refusant le GPS ou hors couverture GPS, **When** la page se charge, **Then** le Storefront affiche un sélecteur dynamique basé sur les communes réelles de la base de données (par défaut Cotonou) et stocke ce choix proprement dans le stockage local.

---

### User Story 2 - Détection Sécurisée de la Position Vendeur sans Dépendance Externe Frontend (Priority: P1)

En tant que vendeur s'inscrivant ou modifiant ses paramètres dans le dashboard `seller/`, lorsque je clique sur « Détecter ma position », le navigateur doit transmettre mes coordonnées GPS au backend d'Ahizan via GraphQL au lieu de contacter directement des APIs tierces (OSM Nominatim) depuis mon navigateur.

**Why this priority**: Élimine le risque critique de bannissement d'IP par la fondation OpenStreetMap, supprime les latences et garantit l'alignement strict entre la position du vendeur et les zones administratives de la plateforme.

**Independent Test**:
Inspecter l'onglet Réseau du navigateur lors de la détection de position vendeur : 0 requête vers `nominatim.openstreetmap.org`, 1 requête GraphQL `resolveCoordinates` vers le backend Vendure, et assignation automatique de `locationId` et `physicalMarketId`.

**Acceptance Scenarios**:
1. **Given** un vendeur sur le formulaire d'onboarding ou paramètres de compte, **When** il clique sur « Détecter ma position GPS », **Then** les coordonnées sont envoyées au backend Vendure et le quartier/arrondissement/marché correspondant est automatiquement prérempli.

---

### User Story 3 - Calcul Transparent et Réaliste des Frais de Livraison (Priority: P2)

En tant qu'acheteur ajoutant des articles au panier, je veux voir une estimation précise et réaliste des frais de livraison pour chaque vendeur sans déclencher d'appels payants externes ni subir de tarifs aberrants.

**Why this priority**: Crucial pour la conversion au checkout et la rentabilité des livraisons à Cotonou, Calavi et Porto-Novo.

**Independent Test**:
Simuler une commande avec un vendeur situé à Akpakpa et un client à Fidjrossè : les frais sont calculés par PostGIS en appliquant le coefficient de sinuosité urbaine béninois ($1.30$) avec le plancher minimum de $500\text{ FCFA}$.

**Acceptance Scenarios**:
1. **Given** un panier multi-vendeurs, **When** le client consulte son panier, **Then** les frais sont calculés à 100 % en local par PostGIS via $\text{Distance}(\text{km}) \times 1.30 \times \text{TarifKm} + \text{BaseFee}$.

---

### User Story 4 - Ingestion Complète des Découpages Officiels du Bénin (Priority: P1)

En tant qu'administrateur de la plateforme, je veux que la base de données contienne l'ensemble de la hiérarchie officielle du Bénin (12 départements, 77 communes, arrondissements et marchés physiques rattachés) avec des polygones vectoriels PostGIS valides et indexés.

**Why this priority**: Sans ces données officielles, aucune résolution spatiale fine ni calcul d'éligibilité précis n'est possible.

**Independent Test**:
Vérifier en base de données que `geo_zone` contient 12 départements, 77 communes, les arrondissements, et que les 31 marchés physiques sont automatiquement rattachés à leur zone administrative par inclusion spatiale.

**Acceptance Scenarios**:
1. **Given** les fichiers sources officiels OCHA/INSTaD dans `/srv/ahizan/benin location`, **When** le script d'ingestion s'exécute, **Then** la table `geo_zone` est peuplée avec des polygones valides (`ST_IsValid = true`) et tous les marchés de `market` ont leur `geoZoneId` renseigné.

---

### Edge Cases

- **Coordonnées en zone frontalière ou en mer (lagune / océan Atlantique) :**
  Si `ST_Contains` ne trouve aucun polygone, basculer sur `ST_Distance` pour trouver la commune côtière la plus proche dans un rayon de 15 km avant tout relais externe.
- **Micro-coupure ou timeout du GPS navigateur :**
  Le Storefront et le Seller Dashboard doivent afficher un message non bloquant invitant à sélectionner la commune dans la liste déroulante officielle.
- **Vendeur situé hors d'un marché physique :**
  Le champ `physicalMarketId` reste nul, mais son `locationId` (arrondissement/commune) est strictement assigné.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Le système DOIT assainir la table `geo_zone` en supprimant les doublons corrompus et en normalisant l'énumération (`NEIGHBORHOOD` au lieu de `QUARTIER`).
- **FR-002**: Le système DOIT ingérer les données officielles OCHA COD-AB (Bénin ADM0, 12 départements ADM1, 77 communes ADM2) avec leurs géométries `SRID 4326` et index spatiaux `GIST`.
- **FR-003**: Le système DOIT rattacher automatiquement les 31 marchés existants de la table `market` à leurs zones géographiques respectives via requête spatiale `ST_Contains`.
- **FR-004**: Le backend DOIT exposer une méthode unifiée `resolveCoordinates(lat, lng)` dans `GeoService` et la requête GraphQL correspondante, capable de résoudre $> 95\%$ des requêtes en local sous $15\text{ ms}$.
- **FR-005**: Le backend DOIT journaliser tout relais externe dans `geo_resolution_log` avec niveau de confiance et provider.
- **FR-006**: L'application `seller/` NE DOIT PLUS effectuer aucun appel direct vers `nominatim.openstreetmap.org`.
- **FR-007**: Le Storefront (`Storefront/`) DOIT retirer le mock codé en dur `FALLBACK_NEIGHBORHOODS` et consommer dynamiquement les données du Geo Engine.
- **FR-008**: Le calculateur de livraison `geoEngineShippingCalculator` DOIT calculer les distances via PostGIS corrigées du coefficient de sinuosité local ($1.30$) avec plancher de $500\text{ FCFA}$.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100 % des départements (12) et communes (77) officiels du Bénin sont présents dans `geo_zone` avec géométries polygonales valides.
- **SC-002**: Temps de réponse de `resolveCoordinates` $< 15\text{ ms}$ pour les requêtes locales PostGIS.
- **SC-003**: 0 requête HTTP sortante vers l'API publique Nominatim depuis les navigateurs clients ou vendeurs.
- **SC-004**: 100 % des calculs de frais de livraison du panier sont résolus en base de données à coût d'API tiers de 0 FCFA.
- **SC-005**: Le Storefront classe correctement les produits par proximité même sans autorisation GPS en se basant sur la commune sélectionnée.
