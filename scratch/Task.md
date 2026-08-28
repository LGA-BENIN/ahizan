# Suivi des Tâches — Projet Ahizan

Ce document est la liste de tâches à suivre pour le développement et l'intégration des fonctionnalités géographiques et de marchés.

## 🏁 Phase 1 — Fondations Géographiques & Marchés
- [x] **TASK-LOC-01 : Création du Modèle de Données Géographiques (Vendure)**
  - *Description :* Créer l'entité `GeographicLocation` et l'associer à l'entité `Vendor`. Ajouter les champs `latitude` et `longitude` sur le vendeur.
- [x] **TASK-LOC-02 : Seeder Référentiel Local Autonome & Marchés**
  - *Description :* Peupler de manière autonome le référentiel des localisations géographiques (villes, quartiers) et des 21 marchés détaillés dans `market.md` sans requêtes réseau externes.
- [x] **TASK-LOC-03 : Requêtes de Proximité GraphQL & Classement de Priorité**
  - *Description :* Ajouter des filtres géospatiaux à la requête `vendors` et au resolver de recherche de produits. Implémenter le tri : 1. Vendeurs résidents du marché, 2. Vendeurs géographiquement proches, 3. Vendeurs associés de diffusion.

## 🏁 Phase 2 — Écosystèmes Marchés & Quartiers
- [x] **TASK-CMS-01 : Support des Pages Marchés et Quartiers dans le CMS**
  - *Description :* Modifier le `CMSPlugin` (backend) & Next.js Storefront pour accepter les types de pages `MARKET` et `NEIGHBORHOOD`. Mettre en place un résolveur de page dynamique qui renvoie les sections du preset correspondant au marché ou quartier demandé.

## 🏁 Phase 3 — Parcours de Confiance & Gamification
- [x] **TASK-UI-01 : Détection de Position Client & Personnalisation (Storefront)**
  - *Description :* Capter la position client via l'API Geolocation HTML5 ou sélection manuelle, persister en localStorage et réorganiser l'accueil de manière dynamique en priorisant les boutiques proches.

## 📌 Phase Actuelle — Dashboard Vendeur
- [x] **TASK-SEL-01 : Assistant d'Onboarding & Carte Leaflet / OSM (Vendeur)**
  - [x] Vérification des fondations et de l'existant (API, resolvers backend, entités) (Corrigé : champs invalides dans la requête GraphQL de LocationWidget)
  - [x] Mise à jour du type `GetMyVendorFullProfileQuery` dans `queries.ts` pour inclure les nouveaux champs (`latitude`, `longitude`, `location`, `physicalMarket`, `markets`, `paymentMethod`, etc.)
  - [x] Intégration de la bibliothèque cartographique Leaflet (via CDN dynamique) dans l'onglet Localisation du formulaire de paramètres (`account-settings-form.tsx`)
  - [x] Récupération et affichage de la liste des marchés (`markets`) et des quartiers (`geographicLocations`) dans le formulaire de paramètres du vendeur
  - [x] Ajout des sélecteurs pour :
    - La position sur la carte interactive (récupération de `latitude` et `longitude`)
    - Le quartier de livraison de résidence (`locationId`)
    - Le marché physique principal de résidence (`physicalMarketId`)
    - Les marchés secondaires de diffusion des produits (`marketIds`)
  - [x] Transmission et persistance des coordonnées et marchés lors de la soumission de la mutation dans `updateVendorProfileAction`
  - [x] Validation visuelle avec jauge de progression d'onboarding à l'aide d'indicateurs dynamiques SVG / CSS haut de gamme.
  
- [x] **TASK-CHK-01 : Configuration des Modes de Paiement du Vendeur**
  - [x] Mise à jour de `GetMyVendorFullProfileQuery` pour inclure les champs de paiement (`paymentMethod`, `mobileMoneyProvider`, `mobileMoneyNumber`, `bankName`, `bankAccountNumber`)
  - [x] Création d'une nouvelle section/onglet ou intégration dans les formulaires existants pour configurer les modes de paiement dans le Dashboard Vendeur
  - [x] Forcer par défaut l'activation du paiement en espèces à la livraison (CoD)
  - [x] Ajouter les options d'activation et champs de saisie pour Mobile Money (MTN, Moov, Celtiis) et virement bancaire
  - [x] Transmission et sauvegarde de ces modes de paiement lors de la soumission du formulaire

