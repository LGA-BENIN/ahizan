# AHIZAN – Système CMS de Landing Page

### Plan d’implémentation (Vendure + React)

## 1. Objectif

L’objectif est de construire un **système de landing page totalement personnalisable** pour une marketplace où le **Super Admin possède un contrôle complet sur tous les éléments affichés sur la page d’accueil des acheteurs**.

Le système doit permettre au Super Admin de :

* créer des sections de landing page
* modifier le contenu des sections
* choisir les produits, catégories ou vendeurs affichés
* réorganiser les sections
* activer ou désactiver des sections
* configurer le layout
* gérer des campagnes ou promotions

La landing page **ne doit pas être codée en dur**.

Elle doit être **entièrement dynamique et contrôlée par le backend**.

Le frontend doit **rendre la page uniquement à partir de la configuration reçue du backend**.

Technologies utilisées :

* Backend : Vendure
* Frontend : React

---

# 2. Concept du système

La landing page est composée de **sections ordonnées**.

Exemple :

```text
Landing Page
 ├── Bannière principale
 ├── Catégories
 ├── Offres flash
 ├── Produits tendances
 ├── Section Électronique
 ├── Section Mode
 ├── Mise en avant des vendeurs
 ├── Promotions
 └── Produits recommandés
```

Chaque section est stockée dans la base de données et configurée par le Super Admin.

Le frontend charge les sections dynamiquement et construit la page.

---

# 3. Architecture générale

## Backend

```text
Backend Vendure
   │
   └── Plugin CMS Landing Page
        │
        ├── Gestion des sections
        ├── Gestion des bannières
        ├── Logique de récupération des produits
        ├── Ordonnancement des sections
        └── API GraphQL
```

## Frontend

```text
Frontend React
   │
   ├── Rendu de la landing page
   ├── Composants de sections
   ├── Chargeur dynamique de sections
   └── Client API
```

---

# 4. Modèle de Section

Chaque section possède les champs suivants.

### Champs

```text
id
type
title
description
position
layout
isActive
config
createdAt
updatedAt
```

### Description

| Champ    | Description          |
| -------- | -------------------- |
| type     | type de section      |
| title    | titre de la section  |
| position | ordre d'affichage    |
| layout   | type de mise en page |
| config   | configuration JSON   |
| isActive | visible ou non       |

---

# 5. Types de sections

Le système doit supporter plusieurs types de sections.

### Section Bannière

Utilisée pour le marketing.

Exemples :

* bannière principale
* bannière promotionnelle
* bannière de campagne

---

### Section Catégories

Affiche les catégories de la marketplace.

Exemple :

* Téléphones
* Électronique
* Mode
* Maison
* Beauté

---

### Section Grille de Produits

Affiche les produits sous forme de grille.

La source des produits peut être :

* manuelle
* catégorie
* produits tendances
* meilleures ventes
* nouveaux produits
* produits d’un vendeur

---

### Section Offres Flash

Affiche des produits en promotion avec un **compteur de temps**.

---

### Section Mise en Avant des Vendeurs

Permet de promouvoir certains vendeurs.

Affiche :

* logo du vendeur
* nom du vendeur
* nombre de produits
* lien vers la boutique

---

### Section Promotion

Utilisée pour des campagnes marketing.

Exemples :

* Black Friday
* Noël
* Ramadan
* Back to School

---

# 6. Configuration des sections

Chaque section doit avoir une configuration flexible.

La configuration est stockée en **JSON**.

Exemple :

```json
{
 "source": "CATEGORY",
 "categoryId": 8,
 "limit": 12,
 "layout": "grid"
}
```

Autre exemple :

```json
{
 "source": "MANUAL",
 "products": [12, 88, 55, 93]
}
```

---

# 7. Modèle de Bannière

Les sections de type bannière doivent avoir un système de gestion.

Champs :

```text
id
sectionId
imageUrl
link
position
isActive
```

Le Super Admin doit pouvoir :

* uploader une bannière
* changer l’ordre des bannières
* ajouter un lien de redirection
* activer ou désactiver la bannière

---

# 8. Système d’attribution des produits

Les sections produits doivent supporter deux modes.

### Mode Manuel

L’administrateur sélectionne les produits.

Exemples :

* produits vedettes
* top deals

---

### Mode Automatique

Produits sélectionnés automatiquement selon :

* catégorie
* meilleures ventes
* nouveaux produits
* produits tendances
* produits d’un vendeur

---

# 9. Ordre des sections

Le Super Admin doit pouvoir **réorganiser les sections**.

Exemple :

```text
1 Bannière principale
2 Catégories
3 Offres flash
4 Électronique
5 Mode
```

La colonne **position** contrôle l’ordre d’affichage.

Un système **drag & drop** est recommandé.

---

# 10. Pages du Dashboard Admin

Le dashboard doit inclure un **gestionnaire de landing page**.

### Menu

```text
Gestion du contenu
   └── Landing Page Builder
```

---

# 11. Page Landing Page Builder

Cette page affiche toutes les sections.

Exemple :

```text
Sections

1  Bannière principale
2  Catégories
3  Offres flash
4  Électronique
5  Mode
```

Actions possibles :

* créer une section
* modifier une section
* supprimer une section
* activer / désactiver
* réorganiser
* prévisualiser

---

# 12. Page Création de Section

Champs du formulaire :

```text
Type de section
Titre
Description
Layout
Source des produits
Catégorie
Nombre de produits
Visibilité
Position
```

---

# 13. Page Gestion des Bannières

Fonctions :

* uploader une image
* ajouter un lien
* définir l’ordre
* activer ou désactiver

Plusieurs bannières peuvent être utilisées pour un **carousel**.

---

# 14. Interface de Sélection des Produits

Si la source est **manuelle**, l’administrateur doit pouvoir :

* rechercher un produit
* sélectionner des produits
* organiser leur ordre
* supprimer un produit

---

# 15. Gestion des Vendeurs Mis en Avant

L’administrateur sélectionne les vendeurs à afficher.

Affichage :

* logo vendeur
* nom vendeur
* nombre de produits
* bouton visiter boutique

---

# 16. API GraphQL

Le frontend doit récupérer la landing page via une requête.

Exemple :

```graphql
homepageSections {
  id
  type
  title
  position
  layout
  config
  banners
  products
  vendors
}
```

Le backend résout les produits selon la configuration.

---

# 17. Rendu de la Landing Page (Frontend)

Le frontend doit être **entièrement dynamique**.

Logique :

1. récupérer les sections
2. trier par position
3. rendre les composants correspondants

---

# 18. Composants React

Structure recommandée :

```text
components/homepage

BannerSection
CategorySection
ProductGridSection
FlashDealsSection
VendorShowcaseSection
PromotionSection
```

---

# 19. Rendu Dynamique

Exemple de logique :

```text
si section.type == banner
→ BannerSection

si section.type == product_grid
→ ProductGridSection

si section.type == categories
→ CategorySection
```

---

# 20. Carte Produit

Chaque produit affiche :

* image
* nom
* prix
* réduction
* note
* bouton ajouter au panier

---

# 21. Section Catégories

Affiche :

* image catégorie
* nom catégorie
* nombre de produits

---

# 22. Section Vendeurs

Affiche :

* logo vendeur
* nom vendeur
* nombre de produits
* bouton voir boutique

---

# 23. Performance

Optimisations recommandées :

* cache API
* lazy loading
* optimisation des images
* pagination

---

# 24. Sécurité

Seul le **Super Admin** peut modifier la landing page.

Les autres rôles n’ont pas accès.

---

# 25. Fonctionnalités futures

Le système doit pouvoir supporter :

* personnalisation de la homepage
* promotions payantes des vendeurs
* planification de campagnes
* analytics de performance des sections

---

# 26. Résultat attendu

Le système final doit permettre au Super Admin de **contrôler totalement la landing page sans toucher au code**.

Le Super Admin doit pouvoir :

* créer des sections
* supprimer des sections
* modifier des sections
* réorganiser les sections
* choisir les produits
* gérer les bannières
* mettre en avant des vendeurs
* lancer des promotions

La landing page du frontend doit se mettre à jour automatiquement selon la configuration du backend.

Le système doit fonctionner comme un **builder de homepage similaire aux marketplaces modernes**.

---