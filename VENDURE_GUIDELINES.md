# Pack Documentation & Architecture Vendure pour AHIZAN

Ce document organise la documentation officielle Vendure v3 en 3 niveaux de priorité pour guider les agents IA et développeurs sur le projet **AHIZAN Marketplace**.

---

## Niveau 1 — Indispensable & Cœur de Plateforme (Core Foundations)
*Ces sections définissent la logique de base du catalogue, des commandes, des clients et de l'extensibilité backend.*

| Domaine | Sujet / Composant | URL Markdown Directe |
| :--- | :--- | :--- |
| **Architecture** | Installation & Configuration | `https://docs.vendure.io/current/core/getting-started/installation.md` |
| | Core Concepts Overview | `https://docs.vendure.io/current/core/core-concepts.md` |
| | Introduction GraphQL | `https://docs.vendure.io/current/core/getting-started/graphql-intro.md` |
| **Catalogue** | Products & Variants | `https://docs.vendure.io/current/core/core-concepts/products.md` |
| | Facets & Filters | `https://docs.vendure.io/current/core/core-concepts/facets-filters.md` |
| | Collections | `https://docs.vendure.io/current/core/core-concepts/collections.md` |
| | Pricing & Currency | `https://docs.vendure.io/current/core/core-concepts/pricing.md` |
| **Ventes & Clients** | Orders & OrderLines | `https://docs.vendure.io/current/core/core-concepts/orders.md` |
| | Cart & Checkout Flow | `https://docs.vendure.io/current/core/core-concepts/cart.md` |
| | Customers & User Management | `https://docs.vendure.io/current/core/core-concepts/customers.md` |
| | Payment | `https://docs.vendure.io/current/core/core-concepts/payment.md` |
| | Shipping & Fulfillment | `https://docs.vendure.io/current/core/core-concepts/shipping.md` |
| | Inventory & Stock Control | `https://docs.vendure.io/current/core/core-concepts/stock-control.md` |
| **Isolation & Sécurité** | Channels (Multi-tenant) | `https://docs.vendure.io/current/core/core-concepts/channels.md` |
| | Roles & Permissions | `https://docs.vendure.io/current/core/core-concepts/roles.md` |
| | Authentication | `https://docs.vendure.io/current/core/core-concepts/auth.md` |
| **Extensibilité Core** | Developer Guide Overview | `https://docs.vendure.io/current/core/developer-guide/overview.md` |
| | Plugins Architecture | `https://docs.vendure.io/current/core/developer-guide/plugins.md` |
| | Custom Fields | `https://docs.vendure.io/current/core/developer-guide/custom-fields.md` |
| | Events & EventBus | `https://docs.vendure.io/current/core/developer-guide/events.md` |
| | Job Queue & Background Workers | `https://docs.vendure.io/current/core/developer-guide/worker-job-queue.md` |

---

## Niveau 2 — Indispensable pour l'Architecture Marketplace AHIZAN
*Ces guides couvrent les particularités multi-vendeurs, l'administration vendeur, le storefront et l'accès avancé aux données.*

| Domaine | Sujet / Composant | URL Markdown Directe |
| :--- | :--- | :--- |
| **Marketplace Multi-Vendeurs** | Multi-vendor Marketplaces Guide | `https://docs.vendure.io/current/core/how-to/multi-vendor-marketplaces.md` |
| **Extension API** | Extend GraphQL API | `https://docs.vendure.io/current/core/developer-guide/extend-graphql-api.md` |
| | Custom Strategies in Plugins | `https://docs.vendure.io/current/core/developer-guide/custom-strategies-in-plugins.md` |
| **Persistance & TypeORM** | Database Entity | `https://docs.vendure.io/current/core/developer-guide/database-entity.md` |
| | Channel Aware Entities | `https://docs.vendure.io/current/core/developer-guide/channel-aware.md` |
| | Translatable Entities | `https://docs.vendure.io/current/core/developer-guide/translatable.md` |
| | Has Custom Fields | `https://docs.vendure.io/current/core/developer-guide/has-custom-fields.md` |
| | Database Subscribers | `https://docs.vendure.io/current/core/developer-guide/db-subscribers.md` |
| **Assets & Données** | S3 Asset Storage | `https://docs.vendure.io/current/core/how-to/s3-asset-storage.md` |
| | Importing Data | `https://docs.vendure.io/current/core/developer-guide/importing-data.md` |
| | Uploading Files | `https://docs.vendure.io/current/core/developer-guide/uploading-files.md` |
| **Dashboard & UI Admin** | Extending Dashboard Overview | `https://docs.vendure.io/current/core/extending-the-dashboard/extending-overview.md` |
| | Creating Pages (List / Detail) | `https://docs.vendure.io/current/core/extending-the-dashboard/creating-pages.md` |
| | Customizing Forms & Selectors | `https://docs.vendure.io/current/core/extending-the-dashboard/custom-form-components.md` |
| | Data Fetching & Providers | `https://docs.vendure.io/current/core/extending-the-dashboard/data-fetching.md` |
| **Storefront** | Connect API | `https://docs.vendure.io/current/core/storefront/connect-api.md` |
| | Storefront Codegen | `https://docs.vendure.io/current/core/storefront/codegen.md` |
| | Listing Products & Detail | `https://docs.vendure.io/current/core/storefront/listing-products.md` |
| | Active Order & Checkout Flow | `https://docs.vendure.io/current/core/storefront/checkout-flow.md` |

---

## Niveau 3 — Références Techniques Approfondies (API & Entities)
*À consulter pour les spécifications exactes des classes, types, services et méthodes.*

| Type | Ressource | URL Markdown Directe |
| :--- | :--- | :--- |
| **TypeScript API** | TypeScript API Overview | `https://docs.vendure.io/current/core/reference/typescript-api.md` |
| **Data Access** | Data Access & TransactionalConnection | `https://docs.vendure.io/current/core/reference/typescript-api/data-access.md` |
| | EntityHydrator | `https://docs.vendure.io/current/core/reference/typescript-api/data-access/entity-hydrator.md` |
| | ListQueryBuilder | `https://docs.vendure.io/current/core/reference/typescript-api/data-access/list-query-builder.md` |
| **Entities Core** | Product & ProductVariant | `https://docs.vendure.io/current/core/reference/typescript-api/entities/product.md` |
| | Seller | `https://docs.vendure.io/current/core/reference/typescript-api/entities/seller.md` |
| | Channel | `https://docs.vendure.io/current/core/reference/typescript-api/entities/channel.md` |
| | Order & OrderLine | `https://docs.vendure.io/current/core/reference/typescript-api/entities/order.md` |
| | Customer | `https://docs.vendure.io/current/core/reference/typescript-api/entities/customer.md` |
| | Asset | `https://docs.vendure.io/current/core/reference/typescript-api/entities/asset.md` |
| | Facet & FacetValue | `https://docs.vendure.io/current/core/reference/typescript-api/entities/facet.md` |
| | Collection | `https://docs.vendure.io/current/core/reference/typescript-api/entities/collection.md` |
| **Config & Strategies** | VendureConfig Reference | `https://docs.vendure.io/current/core/reference/typescript-api/configuration/vendure-config.md` |
| | Custom Strategies in Plugins | `https://docs.vendure.io/current/core/reference/typescript-api/configurable-operation-def.md` |
| **Events & Errors** | EventBus & Event Types | `https://docs.vendure.io/current/core/reference/typescript-api/events.md` |
| | Error Types & ErrorHandlerStrategy | `https://docs.vendure.io/current/core/reference/typescript-api/errors.md` |

---

## Serveur MCP Officiel Vendure
Le serveur MCP Vendure est configuré dans [.mcp.json](file:///srv/ahizan/.mcp.json) :
- **URL** : `https://docs.vendure.io/mcp`
- **Outils disponibles** :
  - `search_docs` : Recherche sémantique/plein texte dans l'ensemble de la documentation Vendure.
  - `get_doc_page` : Récupération du markdown complet d'une page spécifique.
