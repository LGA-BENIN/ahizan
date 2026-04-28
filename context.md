# 📘 Document d’Architecture Technique – Ahizan Marketplace (Phase 1)

## 1. Objectif du document

Ce document décrit **l’architecture technique complète** de la plateforme **Ahizan**, marketplace béninoise évolutive, afin de :

* Guider la **configuration du serveur (VPS)**
* Faciliter l’**installation et le déploiement de Vendure**
* Structurer l’utilisation de **Supabase PostgreSQL**
* Mettre en place un **storage local performant (200 Go)**
* Exposer correctement :

  * l’API Vendure → `api.ahizan.com`
  * le panel superadmin Vendure → `administrator.ahizan.com`
* Fournir un socle clair permettant à un **LLM** d’assister efficacement :

  * le développement des plugins Vendure
  * le développement du storefront Next.js

---

## 2. Vue d’ensemble de l’architecture

### Stack validé (Phase 1 – MVP Bénin)

* **Backend** : Vendure (NestJS, GraphQL)
* **Base de données** : Supabase PostgreSQL (cloud managé)
* **Stockage fichiers** : VPS local (200 Go)
* **Serveur fichiers** : NGINX
* **Frontend** : Next.js (storefront + dashboards)
* **Infrastructure** : VPS M + Docker + Git

---

## 3. Principes architecturaux clés

### 3.1 Séparation stricte des responsabilités

* Vendure = **cerveau métier e-commerce**
* Supabase = **hébergement PostgreSQL uniquement**
* VPS = **exécution applicative + stockage fichiers**
* NGINX = **reverse proxy + serveur statique**
* Frontend = **consommateur d’API GraphQL Vendure**

Aucune logique métier critique n’est externalisée hors de Vendure.

---

### 3.2 Philosophie MVP évolutif

* Architecture pensée pour **démarrer petit**
* Évolutive vers :

  * multi-pays
  * CDN
  * micro-services
  * IA (recherche intelligente, recommandations)

Aucune décision bloquante à long terme.

---

## 4. Infrastructure serveur (VPS)

### 4.1 Rôle du VPS

Le VPS héberge :

* Conteneurs Docker :

  * Vendure API
  * Vendure Admin UI
  * Frontend Next.js
* Stockage fichiers (images, documents)
* NGINX (reverse proxy)

### 4.2 Organisation recommandée du serveur

```
/srv/ahizan/
├── docker/
│   ├── vendure/
│   ├── frontend/
│   └── nginx/
├── storage/
│   ├── products/
│   ├── vendors/
│   ├── banners/
│   ├── documents/
│   └── temp/
├── logs/
└── backups/
```

---

## 5. Base de données – Supabase PostgreSQL

### 5.1 Rôle de Supabase

Supabase est utilisé **uniquement comme PostgreSQL managé** :

* Vendure se connecte directement à la base
* Vendure gère entièrement le schéma
* Supabase fournit :

  * disponibilité
  * sauvegardes
  * sécurité

❌ Supabase Auth n’est PAS utilisé pour Vendure.

---

### 5.2 Connexion Vendure → Supabase

Vendure est configuré avec :

* host Supabase
* port PostgreSQL
* database name
* user
* password

La migration future vers un PostgreSQL local ou AWS RDS est possible sans refonte.

---

## 6. Backend – Vendure

### 6.1 Rôle de Vendure

Vendure est le **cœur e-commerce** :

* Produits
* Commandes
* Paiements
* Utilisateurs
* Permissions
* Multi-vendeurs (via channels)
* Plugins métier

---

### 6.2 Installation logique de Vendure

Vendure est déployé en mode headless :

* API GraphQL publique
* Admin UI séparée

### Sous-domaines :

* **API** : `https://api.ahizan.com`
* **Admin** : `https://administrator.ahizan.com`

---

### 6.3 Panel superadmin

Le panel Vendure Admin :

* Accessible uniquement aux admins
* Protégé par authentification Vendure
* Permet :

  * gestion produits
  * gestion vendeurs
  * gestion commandes
  * gestion plugins

---

## 7. Stockage fichiers – VPS local

### 7.1 Principe

* Les fichiers sont stockés sur le disque du VPS
* Vendure enregistre uniquement les **URLs**
* NGINX sert les fichiers publiquement

---

### 7.2 Types de fichiers stockés

* Images produits
* Logos vendeurs
* Bannières publicitaires
* Documents administratifs

Les fichiers sensibles peuvent être stockés hors accès public.

---

### 7.3 Exposition via NGINX

* Sous-domaine recommandé : `media.ahizan.com`
* Mapping :

```
media.ahizan.com → /srv/ahizan/storage/
```

NGINX gère :

* cache
* headers
* performance

---

## 8. Frontend – Next.js

### 8.1 Rôle du frontend

Le frontend consomme l’API Vendure pour :

* Storefront client
* Dashboard vendeur
* Interfaces partenaires (plus tard)

---

### 8.2 Séparation frontend / backend

* Aucun rendu côté Vendure
* Next.js est totalement indépendant
* Communication uniquement via GraphQL

---

## 9. Docker & Déploiement

### 9.1 Pourquoi Docker

* Isolation des services
* Reproductibilité
* Facilité de déploiement
* Scalabilité future

---

### 9.2 Services Docker prévus

* vendure-api
* vendure-admin
* nextjs-frontend
* nginx

---

## 10. Sécurité & bonnes pratiques

* HTTPS obligatoire
* Séparation des rôles
* Validation stricte des uploads
* Logs centralisés
* Backups réguliers PostgreSQL

---

## 11. Développement futur

Cette architecture permet d’ajouter :

* Plugins Vendure personnalisés :

  * abonnements vendeurs
  * publicité interne
  * livraison locale
* Recherche intelligente
* IA de recommandation
* Déploiement multi-pays

---

## 12. Conclusion

Cette architecture fournit à Ahizan :

* Un socle technique **robuste**
* Une **liberté totale de personnalisation**
* Un **coût maîtrisé**
* Une **évolutivité long terme**

Elle est parfaitement adaptée à un développement solo assisté par l’IA, avec un lancement local au Bénin et une montée en puissance progressive.

---

📌 Ce document peut être utilisé comme **référence principale** pour toute assistance LLM lors de la configuration serveur, du déploiement Vendure et du développement applicatif.
