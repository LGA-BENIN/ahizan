# AHIZAN – Cahier des charges Frontend (MVP)

## 1. Principe fondamental

Le frontend MVP n’est **pas une vitrine marketing**.

Il s’agit d’une **interface minimale**, conçue pour :
- valider le modèle métier
- prouver que la marketplace fonctionne réellement
- servir de base solide à l’évolution future

> Amazon V1 n’était pas beau. Il fonctionnait.

---

## 2. Périmètre frontend global

Après le MVP backend, AHIZAN repose sur **trois interfaces frontend distinctes** :

1. **Storefront Acheteur**
2. **Dashboard Vendeur**
3. **Backoffice Admin**

Vendure fournit nativement le **Backoffice Admin**.
Les deux autres doivent être développés sur mesure.

---

## 3. Backoffice Admin (V1)

### 3.1 Principe

Le Backoffice Admin est basé sur l’**Admin UI Vendure**.

Aucun backoffice personnalisé n’est développé en V1.
L’Admin UI est **étendue**, jamais remplacée.

---

### 3.2 Fonctionnalités Admin V1

- gestion des produits
- gestion globale des commandes
- validation / suspension des vendeurs
- définition des commissions

---

### 3.3 Contraintes

- extensions via modules Vendure Admin
- respect strict des permissions
- aucune logique métier côté UI

---

## 4. MVP Frontend Acheteur (Storefront)

### 4.1 Objectif

Permettre à un acheteur de :
- découvrir des produits
- acheter simplement chez un vendeur

Aucun objectif marketing ou esthétique en V1.

---

### 4.2 Pages obligatoires (V1)

#### Accueil
- liste des produits
- recherche simple
- filtres basiques

---

#### Page produit
- informations produit
- prix
- informations vendeur (nom, zone)
- bouton d’ajout au panier

---

#### Panier
- produits d’un seul vendeur
- total commande
- action de validation

---

#### Checkout
- informations de livraison
- paiement
- confirmation de commande

---

#### Commandes client
- historique des commandes
- statut
- moyen de contact vendeur

---

### 4.3 Fonctionnalités exclues (V1)

- recommandations produits
- wishlist
- avis avancés
- animations complexes

---

### 4.4 Règles frontend acheteur

- aucune logique métier côté frontend
- toutes les règles viennent du backend
- le frontend orchestre uniquement l’UI

---

## 5. MVP Frontend Vendeur (Dashboard vendeur)

### 5.1 Objectif

Permettre à un vendeur non technique de :
- gérer ses produits
- traiter ses commandes
- maintenir son profil

---

### 5.2 Pages obligatoires (V1)

#### Tableau de bord
- statistiques simples (commandes, revenus)
- statut vendeur

---

#### Gestion des produits
- création de produits
- modification de produits
- gestion du stock
- définition des prix

---

#### Gestion des commandes
- liste des commandes vendeur
- consultation des détails
- mise à jour des statuts

---

#### Profil vendeur
- informations légales
- zone géographique
- moyens de paiement

---

### 5.3 Contraintes de sécurité

- un vendeur ne voit que ses produits
- un vendeur ne voit que ses commandes
- aucune règle de filtrage côté frontend

Toutes les restrictions sont appliquées **côté backend**.

---

## 6. Architecture frontend

### 6.1 Stack recommandée

- Next.js (App Router)
- client GraphQL (Apollo ou urql)
- authentification basée sur Vendure
- monorepo (optionnel)

---

### 6.2 Flux de données

Frontend (Next.js)
→ API GraphQL Vendure
→ Services & plugins
→ Base de données

Aucun accès direct à la base de données.

---

## 7. Roadmap frontend

### Phase F1 – Storefront acheteur
- connexion au storefront Vendure existant
- adaptation UX locale
- checkout fonctionnel et stable

---

### Phase F2 – Dashboard vendeur
- authentification vendeur
- dashboard vendeur minimal
- intégration des permissions backend

---

### Phase F3 – Extensions futures
- statistiques avancées
- outils métier spécifiques
- évolutions UX/UI

---

## 8. Bonnes pratiques

- priorité à la lisibilité UX
- simplicité avant esthétique
- aucune logique métier côté frontend
- respect strict des permissions backend

---

## 9. Conclusion

Ce cahier des charges frontend définit :
- les interfaces nécessaires au MVP
- les limites fonctionnelles volontaires
- la trajectoire d’évolution

Il sert de référence pour tout développement frontend AHIZAN, en cohérence avec le backend marketplace.