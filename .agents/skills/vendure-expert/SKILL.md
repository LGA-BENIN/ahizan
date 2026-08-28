---
name: vendure-expert
description: Standards, architecture et références officielles Vendure v3 pour le développement backend, storefront et seller dans le marketplace AHIZAN.
---

# Skill : Vendure v3 Expert & Guidelines

Ce skill permet à l'agent d'agir en expert certifié Vendure v3 pour toute tâche sur le marketplace AHIZAN.

## Sources de Documentation Officielles

Les pages de documentation Vendure sont consultables directement en Markdown via l'URL en ajoutant `.md` ou via le serveur MCP `vendure-docs`.

### 1. Niveau 1 — Fondations et Cœur Vendure (Indispensable)
- **Architecture & Démarrage** :
  - Installation & Setup : `https://docs.vendure.io/current/core/getting-started/installation.md`
  - Introduction GraphQL : `https://docs.vendure.io/current/core/getting-started/graphql-intro.md`
  - Concepts Clés : `https://docs.vendure.io/current/core/core-concepts.md`
- **Produits, Variantes & Catalogue** :
  - Products : `https://docs.vendure.io/current/core/core-concepts/products.md`
  - Facets & Filters : `https://docs.vendure.io/current/core/core-concepts/facets-filters.md`
  - Collections : `https://docs.vendure.io/current/core/core-concepts/collections.md`
  - Pricing & Currency : `https://docs.vendure.io/current/core/core-concepts/pricing.md` / `money.md`
- **Commandes, Clients & Paiements** :
  - Orders & OrderLines : `https://docs.vendure.io/current/core/core-concepts/orders.md`
  - Cart & Checkout : `https://docs.vendure.io/current/core/core-concepts/cart.md`
  - Customers : `https://docs.vendure.io/current/core/core-concepts/customers.md`
  - Payment : `https://docs.vendure.io/current/core/core-concepts/payment.md`
  - Shipping & Fulfillment : `https://docs.vendure.io/current/core/core-concepts/shipping.md` / `fulfillment.md`
  - Inventory & Stock : `https://docs.vendure.io/current/core/core-concepts/stock-control.md`
- **Multi-Tenant / Channels / Auth** :
  - Channels : `https://docs.vendure.io/current/core/core-concepts/channels.md`
  - Roles & Permissions : `https://docs.vendure.io/current/core/core-concepts/roles.md` / `permissions.md`
  - Auth : `https://docs.vendure.io/current/core/core-concepts/auth.md`
- **Développement Core & Plugins** :
  - Overview : `https://docs.vendure.io/current/core/developer-guide/overview.md`
  - Plugins : `https://docs.vendure.io/current/core/developer-guide/plugins.md`
  - Custom Fields : `https://docs.vendure.io/current/core/developer-guide/custom-fields.md`
  - Events & EventBus : `https://docs.vendure.io/current/core/developer-guide/events.md`
  - Job Queue : `https://docs.vendure.io/current/core/developer-guide/worker-job-queue.md`

### 2. Niveau 2 — Architecture Marketplace Multi-Vendeurs & Extensions
- **Multi-Vendor Marketplaces** : `https://docs.vendure.io/current/core/how-to/multi-vendor-marketplaces.md`
- **Extension GraphQL API** : `https://docs.vendure.io/current/core/developer-guide/extend-graphql-api.md`
- **Database Entities & Transactions** : `https://docs.vendure.io/current/core/developer-guide/database-entity.md`
- **Channel Aware Entities** : `https://docs.vendure.io/current/core/developer-guide/channel-aware.md`
- **Translatable Entities** : `https://docs.vendure.io/current/core/developer-guide/translatable.md`
- **Custom Strategies** : `https://docs.vendure.io/current/core/developer-guide/custom-strategies-in-plugins.md`
- **Importing Data** : `https://docs.vendure.io/current/core/developer-guide/importing-data.md`
- **Assets & Storage (S3)** : `https://docs.vendure.io/current/core/how-to/s3-asset-storage.md`
- **Admin Dashboard (Vite/React)** :
  - Getting Started : `https://docs.vendure.io/current/core/extending-the-dashboard/getting-started.md`
  - Creating Pages (List & Detail) : `https://docs.vendure.io/current/core/extending-the-dashboard/creating-pages.md`
  - Customizing Forms : `https://docs.vendure.io/current/core/extending-the-dashboard/custom-form-components.md`
  - Custom Providers & Data Fetching : `https://docs.vendure.io/current/core/extending-the-dashboard/data-fetching.md`
- **Storefront Integration** :
  - Connect API & Codegen : `https://docs.vendure.io/current/core/storefront/connect-api.md` / `codegen.md`
  - Product Listing & Detail : `https://docs.vendure.io/current/core/storefront/listing-products.md` / `product-detail.md`
  - Active Order & Checkout : `https://docs.vendure.io/current/core/storefront/active-order.md` / `checkout-flow.md`

### 3. Niveau 3 — Référence APIs & Stratégies
- **TypeScript API Reference** : `https://docs.vendure.io/current/core/reference/typescript-api.md`
- **Entities Reference** : `https://docs.vendure.io/current/core/reference/typescript-api/entities.md`
- **Data Access & TransactionalConnection** : `https://docs.vendure.io/current/core/reference/typescript-api/data-access.md`

---

## Bonnes Pratiques de Code Vendure

1. **Scaffolding avec le CLI Vendure** :
   ```bash
   npx vendure add -p NomDuPlugin
   npx vendure add -s NomDuService --selected-plugin NomDuPlugin
   ```
2. **Gestion de Configuration des Plugins** :
   Ne jamais lire `process.env` directement dans les services de plugin. Définir des options dans `src/vendure-config.ts` et les injecter via `PluginInitOptions`.
3. **RequestContext & Multi-Tenancy** :
   Toujours propager `ctx: RequestContext` pour respecter les permissions de canal et de vendeur.
4. **Transactions** :
   Toutes les écritures complexes doivent être entourées d'une transaction via `TransactionalConnection`.
