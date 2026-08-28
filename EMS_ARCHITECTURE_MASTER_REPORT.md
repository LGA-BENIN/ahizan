# 🏛️ RAPPORT MAÎTRE D'ARCHITECTURE TECHNIQUE : EXPERIENCE MANAGEMENT SYSTEM (EMS) - AHIZAN

---

## 📋 Table des Matières
1. [Vision Globale & Philosophie d'Architecture](#1-vision-globale--philosophie-darchitecture)
2. [Consolidation en 2 Composants Maîtres Unifiés](#2-consolidation-en-2-composants-maîtres-unifiés)
3. [Les 5 Stratégies d'Expérience Métier (EMS Strategies)](#3-les-5-stratégies-dexpérience-métier-ems-strategies)
4. [Éditeur Dashboard Contextuel & Intégration GeoEngine PostGIS](#4-éditeur-dashboard-contextuel--intégration-geoengine-postgis)
5. [Architecture Multi-Pages & Dynamic Context Resolution](#5-architecture-multi-pages--dynamic-context-resolution)
6. [Évaluation des Règles & Hydratation Client/Serveur](#6-évaluation-des-règles--hydratation-clientserveur)
7. [Analyse de Performance, Résilience & Roadmap 10 Ans](#7-analyse-de-performance-résilience--roadmap-10-ans)

---

## 1. Vision Globale & Philosophie d'Architecture

L'architecture **Ahizan EMS** marque la transition définitive d'un CMS e-commerce classique (pages statiques et grilles manuelles) vers une **Plateforme d'Orchestration d'Expérience Entreprise** (inspirée des architectures d'Amazon, Shopify Plus et Netflix).

### 🎯 Objectifs Majeurs Atteints :
* **Découplage Total** : La disposition visuelle (UI/Theme) est entièrement séparée de l'intention stratégique métier (Strategy).
* **Consolidation** : Suppression du fouillis d'anciennes sections spécifiques au profit de 2 composants maîtres unifiés.
* **Réactivité Contextuelle** : Chaque section évalue en temps réel la géolocalisation PostGIS, l'heure locale, et le segment du client.

---

## 2. Consolidation en 2 Composants Maîtres Unifiés

Au lieu de maintenir 10 à 15 composants visuels hétérogènes (FlashDeals, LocalProducts, ProductGrid, CategoryGrid, QuickLinks, etc.), l'EMS Ahizan s'appuie désormais sur **2 Composants Maîtres Unifiés** qui englobent et remplacent 100% des besoins.

```
                   ┌────────────────────────────────────────────────────────┐
                   │               PAGE EXPERIENCE RESOLVER                 │
                   │           query pageExperience(slug, context)          │
                   └───────────────────────────┬────────────────────────────┘
                                               │
                       ┌───────────────────────┴───────────────────────┐
                       ▼                                               ▼
     ┌───────────────────────────────────┐           ┌───────────────────────────────────┐
     │   UniversalProductCollection.tsx   │           │       CategoryCollection.tsx      │
     │      (Composant Produit Maître)   │           │     (Composant Catégorie Maître)  │
     └─────────────────┬─────────────────┘           └─────────────────┬─────────────────┘
                       │                                               │
   ┌───────────────────┼───────────────────┐               ┌───────────┴───────────┐
   ▼                   ▼                   ▼               ▼                       ▼
FlashSaleSection  LocalProducts   TabbedProductGrid   CategoryGrid          InlineCategory
(Chrono & Promo) (GeoEngine GPS) (Catalog & Filtres) (Grille Catégories)  (Carrousel Défilant)
```

### 📦 Composant 1 : `UniversalProductCollection.tsx` (Produits EMS)
Ce composant gère l'intégralité de la présentation des produits sur toute la plateforme :
- **Intègre** : `FLASH_SALE` (Chrono + Ventes Flash), `LOCAL_DISCOVERY` (Recommandations géolocalisées), `CATALOG` (Collections/Onglets), `HOME_FEED` (Flux personnalisé) et `TRENDING` (Tendances).
- **Options Visuelles** : 5 Formats de rendu (Carrousel horizontal, Grilles 3/4/6 colonnes, Liste divisée), 6 Thèmes de carte (Standard, Flat, Glassmorphism, Néon Premium, Bold Border, Gradient) et badging 4 coins.

### 🏷️ Composant 2 : `CategoryCollection.tsx` (Catégories EMS)
Ce composant gère la découverte et la navigation par catégories et marchés :
- **Intègre** : Grilles de catégories, carrousels défilants de raccourcis (`QuickLinks`), et collections thématiques.
- **Options Visuelles** : Grilles réactives (mobile/desktop), carrousels à défilement doux, badges personnalisés par marché.

---

## 3. Les 5 Stratégies d'Expérience Métier (EMS Strategies)

Chaque section produit `UniversalProductCollection` est pilotée par une **Stratégie d'Expérience Métier** choisie dans le Dashboard Admin :

| Stratégie EMS | Fonctionnement Métier | Moteur Sous-Jacent |
| :--- | :--- | :--- |
| **`LOCAL_DISCOVERY`** | N'affiche **que** les produits des vendeurs situés dans la GeoZone ou la ville active du client (Cotonou, Calavi, Porto-Novo, etc.). | `GeoEngineService` (PostGIS spatial queries) |
| **`FLASH_SALE`** | Affiche les offres promotionnelles avec compte à rebours chrono ⏱️ et masquage automatique à l'expiration. | `FlashSaleEngineService` |
| **`HOME_FEED`** | Génère un flux sur-mesure combinant les catégories consultées et l'historique du profil client. | `FeedAssemblyEngineService` + `UserProfileEngine` |
| **`CATALOG`** | Cible une collection/catégorie spécifique avec tri par nouveautés, meilleures ventes ou onglets. | `CatalogEngineService` |
| **`TRENDING`** | Classe les produits les plus populaires et les mieux notés de la ville ou du pays. | `RankingEngineService` (`ProductRankingScore`) |

---

## 4. Éditeur Dashboard Contextuel & Intégration GeoEngine PostGIS

Le Dashboard Admin Builder (`UniversalBuilder`) a été enrichi pour offrir une expérience d'édition intuitive et 100% sécurisée :

### 1. Formulaire Contextuel Dynamique (`UniversalProductCollectionSettings.tsx`)
Lorsque l'administrateur change la stratégie dans le menu déroulant :
- **Si `FLASH_SALE`** ➔ Le panneau ambré apparaît avec : Date/Heure de Fin du Chrono, Titre de Campagne, Style du Badge Néon, et Option Masquage Automatique.
- **Si `CATALOG`** ➔ Le panneau émeraude apparaît avec : Sélecteur de Collection (chargé en direct de la BDD), Type de filtrage, et Option Onglets.
- **Si `LOCAL_DISCOVERY`** ➔ Le panneau bleu azur apparaît avec : Rayon GPS (km), Mode de comblement (Hybride/Repli), et Option Localisation requise.
- **Si `HOME_FEED` / `TRENDING`** ➔ Le panneau violet apparaît avec : Quota max par vendeur et Boost Vendeurs Certifiés.

### 2. Sélecteur Strict de GeoZones (`RuleConditionEditor.tsx`)
- **100% Réel BDD** : Exécute la query GraphQL `query { geoZones { name slug type } markets { name slug } }` pour afficher uniquement les 39 entités réelles de PostGIS (Cotonou, Calavi, Porto-Novo, Marché Dantokpa, Marché Ganhi, etc.).
- **Aucune saisie libre invalide** : Suppression du champ texte libre.
- **Bouton `✕` de suppression** : Chaque badge sélectionné possède un bouton de suppression direct.

---

## 5. Architecture Multi-Pages & Dynamic Context Resolution

L'EMS ne se limite pas à la page d'accueil ! Il orchestre l'ensemble des pages de la plateforme grâce au resolver GraphQL `pageExperience(slug, context)` :

```graphql
query GetPageExperience($slug: String!, $context: JSON) {
  pageExperience(slug: $slug, context: $context) {
    slug
    title
    evaluatedCount
    sections {
      id
      type
      title
      rulesJson
      data
    }
  }
}
```

### 📄 Couverture Multi-Pages :
1. **Page d'Accueil (`slug: "home"`)** : Orchestration globale (Héro, Ventes Flash, Recommandations locales, Catégories, Feed).
2. **Page Marchés (`slug: "markets"`)** : Affichage dynamique des sections restreintes aux marchés sélectionnés (ex: Dantokpa, Ganhi, Ouando).
3. **Pages Catégories & Recherche (`slug: "search"` / `slug: "category"`)** : Filtres par facettes et sous-collections.
4. **Événements Saisonniers (`slug: "black-friday"`, `"rentree-scolaire"`)** : Presets de pages thématiques gérés par le `SiteSeasonEngine`.

---

## 6. Évaluation des Règles & Hydratation Client/Serveur

Pour garantir que les sections restreintes à une zone ne s'affichent jamais par erreur :

### 1. Évaluation Côté Backend (`ExperienceEngineService.ts`)
- Le backend filtre les sections lors de la requête `pageExperience(slug, context)`.
- Si `rulesJson` spécifie `geoZones: ["CALAVI"]` et que le contexte est `COTONOU`, la section n'est pas renvoyée.

### 2. Hydratation Réactive Côté Client (`BodySectionRenderer.tsx`)
- Sur le Storefront Next.js, `BodySectionRenderer.tsx` écoute le contexte `useLocation()`.
- L'algorithme de normalisation universel `normalizeGeoStr` compare la localisation sélectionnée par l'utilisateur (ex: `"Abomey-Calavi - Centre"`) avec les règles de la section.
- **Résultat** : Si l'utilisateur change de ville dans le header, les sections adaptées s'affichent ou se masquent **instantanément** sans rechargement de page.

---

## 7. Analyse de Performance, Résilience & Roadmap 10 Ans

### 🚀 Performances & Optimisations
- **Événements Non-Bloquants** : L'Event Bus analytique enregistre les clics et impressions de manière asynchrone sans ralentir l'affichage de la page.
- **Normalisation Sémantique** : `normalizeGeoStr` évite les regex complexes et élimine les dépendances à des chaînes de caractères codées en dur.
- **Intégrité des GIFs** : Le processeur d'assets préserve les GIF animés pour les bannières promotionnelles.

### 🔮 Roadmap & Evolutions Recommandées (10 Ans)
1. **Cache Redis L2 pour `pageExperience`** : Invalider le cache uniquement lors de la publication d'un preset CMS.
2. **Module A/B Testing EMS** : Évaluer automatiquement le taux de conversion de deux versions d'une section.
3. **Moteur ML de Recommandation Produit** : Connecter le `FeedAssemblyEngine` à des modèles de recommandation prédictive.

---
*Rapport d'architecture généré le 26 Juillet 2026 pour la plateforme AHIZAN E-Commerce.*
