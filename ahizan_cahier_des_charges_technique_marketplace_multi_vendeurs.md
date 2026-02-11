# AHIZAN – Cahier des charges technique

## 1. Vision & objectif
AHIZAN est une **marketplace multi‑vendeurs** orientée **commerce local**, dont l’objectif est de connecter acheteurs et vendeurs autour d’une plateforme fiable, évolutive et contrôlée techniquement.

Le projet vise une approche **progressive (Amazon‑like)** : démarrer avec un **MVP solide**, puis évoluer par itérations maîtrisées.

Principes clés :
- Backend **headless** et extensible
- Contrôle total de la logique métier
- Évolutivité long terme (scalabilité fonctionnelle et technique)

---

## 2. Périmètre technique global

- **Backend e‑commerce** : Vendure
- **Admin plateforme** : Admin UI Vendure (React)
- **Storefront** : Next.js (headless)
- **Base de données** : PostgreSQL / MySQL
- **Architecture** : API GraphQL + plugins

---

## 3. Modélisation métier AHIZAN (socle)

### 3.1 Acteurs principaux

#### Acheteur (Buyer)
- Basé sur l’entité **Customer** native de Vendure
- Capacités :
  - navigation catalogue
  - passage de commande
  - paiement
  - interaction avec les vendeurs
- Aucune modification structurelle en V1

---

#### Vendeur (Seller) – Entité clé

Vendure ne fournit pas de vendeur natif.

Le vendeur AHIZAN est une **entité métier indépendante**.

Caractéristiques :
- entité légale ou informelle
- propriétaire de produits
- récepteur de commandes
- bénéficiaire de paiements (après commission)

Statut technique : **Custom Entity**

Attributs principaux :
- identité vendeur
- statut (pending / approved / suspended)
- zone géographique
- méthodes de livraison
- moyens de paiement
- notation (rating)
- commission personnalisée (optionnelle)

---

#### Administrateur AHIZAN

Rôle : supervision globale de la marketplace.

Responsabilités :
- validation et suspension des vendeurs
- gestion des commissions
- gestion des litiges
- visibilité globale des commandes

Implémentation :
- Admin Vendure + permissions personnalisées

---

### 3.2 Produits

Principe fondamental :
> Un produit appartient toujours à un vendeur.

Implémentation :
- Entité **Product** Vendure
- Lien obligatoire avec un **Seller** (relation ou champ personnalisé)

Aucun produit global sans propriétaire.

---

### 3.3 Commandes

En V1 :
- **1 commande = 1 vendeur**

Raisons :
- simplicité
- robustesse
- rapidité de mise en production

Évolution future :
- split automatique multi‑vendeurs (post‑MVP)

---

### 3.4 Commission

Modèle financier :
- l’acheteur paie 100 % du montant
- AHIZAN prélève une commission
- le vendeur reçoit le solde

Types de commissions :
- globale
- par vendeur
- par catégorie (évolution future)

Moment du calcul :
- à la confirmation du paiement

---

### 3.5 Logistique

V1 (MVP) :
- livraison gérée par le vendeur
- AHIZAN coordonne et trace les statuts

Évolution future :
- intégration de partenaires logistiques
- livraison mutualisée

---

## 4. Stratégie multi‑vendeur

### 4.1 Choix architectural

Option retenue :

**Custom Seller Entity + Channel unique**

Justification :
- simplicité de gestion
- meilleure flexibilité
- évolution progressive possible
- réduction de la complexité initiale

Les Channels Vendure ne sont pas utilisés pour représenter les vendeurs en V1.

---

## 5. MVP Marketplace

### 5.1 Objectif du MVP

- lancer rapidement
- valider l’usage réel
- éviter une complexité prématurée

Le MVP n’est pas Amazon.
Le MVP est une marketplace locale fonctionnelle.

---

### 5.2 Fonctionnalités incluses (V1)

#### Côté vendeur
- inscription vendeur
- validation par admin
- création et gestion de produits
- consultation de ses commandes
- mise à jour des statuts de commande

---

#### Côté acheteur
- consultation du catalogue
- recherche de produits
- passage de commande
- paiement
- contact vendeur

---

#### Côté admin
- validation / suspension des vendeurs
- définition des commissions
- consultation globale des commandes

---

### 5.3 Fonctionnalités exclues du MVP

- split de commandes multi‑vendeurs
- chat temps réel
- système d’avis avancé
- wallet interne
- multi‑pays / multi‑devise avancé

---

## 6. Roadmap technique (backend‑first)

### Phase 1 – Fondation
- création de l’entité Seller
- relation Seller ↔ Product
- système de permissions vendeur
- API GraphQL vendeur

---

### Phase 2 – Marketplace Core
- commandes liées à un vendeur
- calcul automatique des commissions
- events métier (OrderPlaced, PaymentSettled)
- dashboard vendeur basique

---

### Phase 3 – Paiement & livraison
- intégration paiement local
- gestion livraison vendeur
- statuts de commande personnalisés

---

### Phase 4 – Scalabilité
- split de commandes multi‑vendeurs
- système de notation
- notifications
- analytics & reporting

---

## 7. Principe de développement

- backend en priorité
- logique métier centralisée
- extensions via plugins Vendure
- évolutions incrémentales

---

## 8. Conclusion

Ce cahier des charges sert de **référence unique** pour le développement de AHIZAN.

Il définit :
- le modèle métier
- les limites du MVP
- la stratégie d’évolution

Toute fonctionnalité future doit respecter ce socle et s’inscrire dans la roadmap définie.

