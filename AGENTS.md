# AHIZAN Marketplace — Directives Agent IA

## Vue d'ensemble du Projet
AHIZAN est une plateforme e-commerce Marketplace multi-vendeurs basée sur **Vendure v3** (Node.js, TypeScript, PostgreSQL/SQLite, GraphQL).

Structure du projet :
- `backend/` : Serveur Vendure v3 (`@vendure/core`, `@vendure/dashboard`, `@vendure/email-plugin`, `@vendure/asset-server-plugin`), plugins personnalisés, Worker (`src/index-worker.ts`), Dashboard React/Vite.
- `seller/` : Espace d'administration dédié aux vendeurs (React/Vite/Next), interagissant avec `/admin-api` de Vendure via les tokens de channel (`vendure-token`).
- `Storefront/` : Boutique publique consommant `/shop-api` de Vendure.
- `llms.txt` & `VENDURE_GUIDELINES.md` : Index de documentation structuré officiel Vendure v3.
- `.mcp.json` : Configuration du serveur MCP officiel Vendure (`https://docs.vendure.io/mcp`).

---

## Directives et Standards Vendure Obligatoires

1. **Construire AVEC Vendure, JAMAIS en Surcouche Artificielle (RÈGLE D'OR)** :
   - Toujours prioriser, exploiter et construire **AVEC le cœur et les primitives natives de Vendure** (endpoints, services, mutations, événements, plugins, indexeurs, `ProductVariant.sku` comme référence officielle unique).
   - Ne JAMAIS inventer d'APIs ad-hoc, de tables redondantes ou d'accès direct SQL non standard lorsque Vendure fournit une API de service ou une extension GraphQL native.
   - Toujours utiliser `RequestContext` (`ctx`) dans les services et les opérations TypeORM (`this.connection.getRepository(ctx, Entity)`).
   - Utiliser `this.entityHydrator.hydrate(ctx, entity, ...)` pour le chargement des relations.
   - Utiliser `TransactionalConnection` pour toutes les mutations de données sensibles ou multi-entités.

2. **Architecture Multi-Vendeurs (Multi-Vendor)** :
   - Isolation stricte des canaux (`Channel` et `Seller`).
   - Permissions basées sur les rôles et permissions personnalisées (`Permission.SuperAdmin`, `Permission.Authenticated`, permissions vendeur spécifiques).
   - Les commandes multi-vendeurs utilisent les stratégies de partage de commande et de fulfillment de Vendure.

3. **Consultation de la Documentation** :
   - L'agent doit se référer aux pages officielles Markdown en ajoutant `.md` aux URLs de la documentation (ex: `https://docs.vendure.io/current/core/how-to/multi-vendor-marketplaces.md`).
   - L'index complet est accessible dans `llms.txt` et `VENDURE_GUIDELINES.md`.
   - Utiliser le serveur MCP `vendure-docs` (`search_docs`, `get_doc_page`) si disponible.

4. **Scaffolding et CLI** :
   - Utiliser `npx vendure add` pour la création de nouveaux plugins, services, types de champ ou tâches de job queue.
   - Les options de plugins doivent être passées lors de l'initialisation dans `vendure-config.ts` plutôt que de lire `process.env` dans les sous-modules.
