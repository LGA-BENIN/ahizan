# AHIZAN Marketplace — Règles d'Architecture et Standards Vendure v3

## 1. Principe Fondamental : "Vendure-First"
Le projet AHIZAN repose intégralement sur **Vendure v3**. Aucune logique métier de e-commerce, de multi-vendeur, de gestion des stocks, des prix, des commandes ou de sécurité ne doit réinventer la roue avec des scripts ad-hoc ou des tables SQL isolées quand Vendure propose des primitives natives.

Avant d'écrire ou modifier du code :
1. **Consulter la documentation officielle Vendure** (via `docs.vendure.io/...md` ou MCP `vendure-docs`).
2. **Utiliser les abstractions natives Vendure** :
   - `TransactionalConnection` & `RequestContext` pour toutes les opérations DB.
   - `EventBus` pour la communication asynchrone / découplée.
   - `JobQueueService` pour les tâches en arrière-plan (au lieu de timeouts ou cron externes).
   - `CustomFields` pour étendre les entités existantes sans casser le schéma TypeORM standard.
   - `Plugins` Vendure pour encapsuler de nouvelles fonctionnalités (Services, Resolvers GraphQL, Entities, Strategies).
   - `Channels` et `Roles/Permissions` pour l'isolation multi-vendeurs et la multi-boutique.

---

## 2. Multi-Vendor Marketplace (Modèle Officiel Vendure)
Vendure implémente le modèle multi-vendeur via :
- **Entité `Seller`** : Représente chaque vendeur/marchand.
- **Entité `Channel`** : Chaque vendeur a son propre `Channel` associé à son `Seller`, avec son propre slug/token de channel (`vendure-token` header).
- **Isolation des Données** : Les produits, variantes, commandes et stocks assignés au Channel d'un vendeur sont automatiquement filtrés par le `ChannelService` et les `RequestContext` channel-aware.
- **Multi-Vendor Order Processing** : Gestion des commandes multi-vendeurs avec partitionnement automatique ou fulfillment séparé par vendeur via les strategies de commande (`OrderSellerStrategy`, `ShippingLineAssignmentStrategy`).

---

## 3. Services et Couche Données Vendure
- **`RequestContext` obligatoire** : Toujours passer le `ctx: RequestContext` dans toutes les méthodes de service et appels `connection.getRepository(ctx, Entity)`.
- **Transactions** : Utiliser `this.connection.withTransaction(ctx, async ctx => { ... })` pour garantir l'atomicité.
- **Hydration d'entités** : Utiliser `EntityHydrator` (`this.entityHydrator.hydrate(ctx, entity, { relations: [...] })`) pour charger proprement les relations sans requêtes N+1.
- **Requêtes personnalisées avec pagination** : Utiliser `ListQueryBuilder` pour construire des listes paginées/filtrées/triées conformes aux standards GraphQL Vendure.

---

## 4. Extensions GraphQL & Dashboard
- **Extension du Schéma GraphQL** : Définir les types et mutations dans `schema.graphql` ou `gql` tag, puis implémenter les Resolvers avec `@Resolver()`, `@Query()`, `@Mutation()`, `@Ctx()`, et `@Args()`.
- **Permissions** : Protéger chaque mutation/query avec `@Allow(Permission.SuperAdmin)` ou une permission personnalie `@Allow(CustomPermission.VendorAccess)`.
- **Dashboard UI** : Développer les extensions Dashboard via `@vendure/dashboard` (Vite/React) en utilisant les composants de formulaire officiels, `CustomFieldControl`, et les hooks d'API GraphQL.

---

## 5. Storefront & Seller App Integration
- **Storefront (Client)** : Consomme l'API `/shop-api` avec le header de Channel par défaut ou dynamique.
- **Espace Vendeur (Seller)** : Consomme l'API `/admin-api` avec le header `vendure-token: <channel-token>` du vendeur et le token d'authentification vendeur.
- **Codegen** : Toujours exécuter ou maintenir à jour le GraphQL Codegen pour garantir un typage TypeScript strict côté frontend et backend.
