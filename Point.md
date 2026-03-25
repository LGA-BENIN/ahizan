Je vais d'abord lire le cahier des charges, puis explorer la base de code existante pour faire une comparaison détaillée.

Je vais explorer en profondeur la structure du projet pour comparer avec le cahier des charges.







Je continue l'exploration approfondie du backend et des frontends.




Continuons l'exploration pour couvrir les autres aspects critiques.



















Voici mon analyse comparative détaillée entre le cahier des charges technique et l'état actuel de la base de code.

---

# Analyse Comparative : Cahier des Charges vs. Implémentation Existante

---

## Phase 1 – Fondation (Estimée à ~90% ✅)

### 1.1 Entité Seller (Custom Entity) — ✅ 95%

**Implémenté :**
- [Vendor](cci:2://file:///e:/TRAVAUX/LGA/2026/AHIZAN/ahizan/backend/src/plugins/multivendor/entities/vendor.entity.ts:10:0-121:1) entity dans `@/backend/src/plugins/multivendor/entities/vendor.entity.ts` avec tous les attributs du cahier des charges :
  - **Identité vendeur** : `name`, `email`, `phoneNumber`, `address`, `description`
  - **Statut** : `PENDING / APPROVED / REJECTED / SUSPENDED` ✅
  - **Zone géographique** : `zone` ✅
  - **Livraison** : `deliveryInfo` ✅
  - **Notation** : `rating`, `ratingCount` ✅
  - **Commission personnalisée** : `commissionRate` ✅
  - **Type vendeur** : `INDIVIDUAL / ONLINE / SHOP / ENTERPRISE` ✅
  - **Documents légaux** : `rccmNumber`, `ifuNumber`, `idCardNumber` + fichiers ✅
  - **Réseaux sociaux** : `website`, `facebook`, `instagram` ✅
  - **Wallet** : `walletBalance`, `allowNegativeBalance` ✅ (bonus, hors MVP)

**Manquant :**
- Pas de champ explicite pour les **méthodes de paiement du vendeur** (moyens de réception de paiements après commission)

### 1.2 Relation Seller ↔ Product — ✅ 100%

- Custom field `vendor` de type `relation` ajouté sur `Product` dans [multivendor.plugin.ts](cci:7://file:///e:/TRAVAUX/LGA/2026/AHIZAN/ahizan/backend/src/plugins/multivendor/multivendor.plugin.ts:0:0-0:0) (ligne 65-72)
- Requête [findAllProductsForVendor](cci:1://file:///e:/TRAVAUX/LGA/2026/AHIZAN/ahizan/backend/src/plugins/multivendor/service/vendor.service.ts:84:4-95:5) qui filtre par `customFieldsVendorid` ✅
- Règle : aucun produit global sans propriétaire respectée via l'architecture

### 1.3 Système de permissions vendeur — ✅ 95%

- Rôle `vendor` créé automatiquement au bootstrap avec permissions granulaires :
  - `ReadCatalog`, `CreateCatalog`, `UpdateCatalog`, `DeleteCatalog` ✅
  - `ReadOrder`, `UpdateOrder` ✅
  - `ReadAsset`, `CreateAsset` ✅
  - Custom permission [Vendor](cci:2://file:///e:/TRAVAUX/LGA/2026/AHIZAN/ahizan/backend/src/plugins/multivendor/entities/vendor.entity.ts:10:0-121:1) ✅
- Attribution automatique du rôle à l'approbation ✅

**Manquant :**
- Pas de restriction fine empêchant un vendeur de voir/modifier les produits d'un autre vendeur au niveau permissions Vendure natives (la logique est dans les resolvers custom, ce qui est acceptable)

### 1.4 API GraphQL vendeur — ✅ 95%

**Shop API :**
- `vendor(id)`, `vendors(options)` ✅
- `myVendorProfile`, `myVendorOrders`, `myVendorProducts`, `myVendorProduct` ✅
- `applyToBecomeVendor`, `updateMyVendorProfile` ✅
- `createMyProduct`, `updateMyProduct`, `updateMyProductVariant`, `deleteMyProduct` ✅
- `updateMyOrderStatus` ✅

**Admin API :**
- `updateVendorStatus`, `createVendor`, `updateVendor` ✅
- Wallet management : `creditVendorWallet`, `debitVendorWallet`, `setVendorAllowNegativeBalance` ✅

---

## Phase 2 – Marketplace Core (Estimée à ~80% ✅)

### 2.1 Commandes liées à un vendeur — ✅ 90%

- Custom field `vendor` sur `Order` ✅
- Custom field `commissionAmount` sur `Order` ✅
- **Règle 1 commande = 1 vendeur** implémentée dans [vendor-event.subscriber.ts](cci:7://file:///e:/TRAVAUX/LGA/2026/AHIZAN/ahizan/backend/src/plugins/multivendor/service/vendor-event.subscriber.ts:0:0-0:0) :
  - Vérification à chaque ajout de ligne (`OrderLineEvent`) ✅
  - Suppression automatique si le produit est d'un autre vendeur ✅
  - Attribution auto du vendeur à la commande ✅

### 2.2 Calcul automatique des commissions — ✅ 85%

- Commission calculée sur `PaymentSettled` via [calculateCommission()](cci:1://file:///e:/TRAVAUX/LGA/2026/AHIZAN/ahizan/backend/src/plugins/multivendor/service/vendor-event.subscriber.ts:50:4-68:5) ✅
- Formule : `Math.round((total * vendorEntity.commissionRate) / 100)` ✅
- Remboursement commission si annulation ([refundCommissionToWallet](cci:1://file:///e:/TRAVAUX/LGA/2026/AHIZAN/ahizan/backend/src/plugins/multivendor/service/vendor-event.subscriber.ts:95:4-114:5)) ✅
- La déduction wallet sur `ArrangingPayment` est **commentée** (désactivée) ⚠️

**Manquant :**
- Commission **globale** (taux par défaut plateforme) — actuellement uniquement par vendeur
- Interface admin pour définir/modifier la commission globale

### 2.3 Events métier — ✅ 80%

- `OrderStateTransitionEvent` → calcul commission sur `PaymentSettled` ✅
- `OrderStateTransitionEvent` → remboursement sur `Cancelled` ✅
- `OrderLineEvent` → validation vendeur unique ✅
- `VendorEvent` émis sur création/mise à jour/changement de statut ✅

**Manquant :**
- Pas de dashboard analytique avancé sur les événements

### 2.4 Dashboard vendeur basique — ✅ 85%

Implémenté dans [seller/src/app/dashboard/](cci:9://file:///e:/TRAVAUX/LGA/2026/AHIZAN/ahizan/seller/src/app/dashboard:0:0-0:0) :
- **Page principale** avec KPIs : revenu total, nb commandes, nb produits, statut ✅
- **Liste commandes** + détail commande ✅
- **Gestion produits** : liste, création, édition, suppression ✅
- **Profil vendeur** : consultation et édition ✅
- **Paramètres** : changement de mot de passe ✅
- **Wallet** : page de consultation du solde ✅
- **Onboarding** : formulaire post-inscription ✅

**Manquant :**
- Graphique de visualisation (placeholder "Chart visualization coming soon")
- Filtres avancés sur les commandes

---

## Phase 3 – Paiement & Livraison (Estimée à ~55% ⚠️)

### 3.1 Intégration paiement local — ⚠️ 40%

**Implémenté :**
- Handler `cash-on-delivery` (Paiement à la livraison) ✅
- Processus de checkout complet (4 étapes) dans le storefront : Contact → Adresse → Livraison → Paiement ✅

**Manquant :**
- **Aucun paiement mobile money** (MTN, Moov, etc.) — critique pour le Bénin
- **Aucune intégration passerelle de paiement en ligne** (FedaPay, Kkiapay, etc.)
- Le seul moyen de paiement est "Cash on Delivery"

### 3.2 Gestion livraison vendeur — ⚠️ 60%

**Implémenté :**
- Shipping calculator global fixe (`globalFixedShippingCalculator`) ✅
- Champ `deliveryInfo` sur le vendeur ✅
- Mise à jour statut commande par le vendeur (`updateMyOrderStatus`) ✅

**Manquant :**
- Pas de **suivi de livraison** en temps réel
- Pas de gestion des **zones de livraison** avec tarifs différenciés
- Pas d'intégration avec des partenaires logistiques

### 3.3 Statuts de commande personnalisés — ⚠️ 60%

**Implémenté :**
- Transition d'état via `TransitionOrderToStateMutation` ✅
- Le vendeur peut mettre à jour le statut via `updateMyOrderStatus` ✅

**Manquant :**
- Pas de **statuts personnalisés** (ex : "En préparation", "Expédié", "En cours de livraison", "Livré")
- Utilise les statuts natifs Vendure uniquement

---

## Phase côté Acheteur / Storefront (Estimée à ~75% ✅)

### Consultation du catalogue — ✅ 90%
- Page d'accueil avec CMS dynamique ✅
- Collections et navigation ✅
- Grille produits, carrousel ✅
- Pages produit détaillées avec variantes, options, prix, stock ✅

### Recherche de produits — ✅ 85%
- Page [/search](cci:9://file:///e:/TRAVAUX/LGA/2026/AHIZAN/ahizan/seller/src/app/search:0:0-0:0) avec résultats et filtres ✅
- Filtres par facettes ✅
- Tri des résultats ✅

### Passage de commande — ✅ 80%
- Panier ([/cart](cci:9://file:///e:/TRAVAUX/LGA/2026/AHIZAN/ahizan/seller/src/app/cart:0:0-0:0)) ✅
- Checkout en 4 étapes ✅
- Page de confirmation de commande ✅

### Paiement — ⚠️ 35%
- Seul "Cash on Delivery" disponible ⚠️
- Pas de paiement en ligne (mobile money, carte bancaire)

### Contact vendeur — ❌ 10%
- Pas de système de messagerie/contact vendeur depuis le storefront
- L'info vendeur est liée au produit mais pas de page vendeur publique avec moyen de contact

### Compte acheteur — ✅ 80%
- Inscription / Connexion ✅
- Vérification email ✅
- Réinitialisation mot de passe (avec code court) ✅
- Profil client ✅
- Historique commandes ✅
- Gestion adresses ✅

---

## Phase côté Vendeur (Estimée à ~80% ✅)

### Inscription vendeur — ✅ 90%
- Formulaire dynamique via `PageInscriptionPlugin` ✅
- Upload de documents (RCCM, IFU, carte d'identité) ✅
- Création automatique User + Administrator + Customer ✅
- Champs dynamiques configurables depuis l'admin ✅

### Validation par admin — ✅ 90%
- Dashboard admin Vendure avec liste vendeurs ✅
- Changement de statut (PENDING → APPROVED/REJECTED/SUSPENDED) ✅
- Raison de rejet ✅
- Attribution automatique du rôle à l'approbation ✅

### Création et gestion de produits — ✅ 85%
- CRUD complet (créer, lire, modifier, supprimer) ✅
- Upload images/assets ✅
- Gestion variantes et prix ✅
- Gestion stock ✅
- Facettes/catégories ✅

### Consultation de ses commandes — ✅ 80%
- Liste avec pagination ✅
- Détail commande ✅

### Mise à jour des statuts de commande — ✅ 70%
- Mutation `updateMyOrderStatus` disponible ✅
- Mais pas de workflow de statuts personnalisés (Shipped, Delivered, etc.)

---

## Phase Admin Plateforme (Estimée à ~75% ✅)

### Validation / suspension des vendeurs — ✅ 90%
- Interface admin dans le Dashboard Vendure ✅
- Actions : Approve, Reject (avec raison), Suspend ✅
- Liste vendeurs avec filtres ✅

### Définition des commissions — ⚠️ 55%
- Commission par vendeur dans l'édition vendeur ✅
- **Pas de commission globale** paramétrable ❌
- **Pas de commission par catégorie** (prévu futur)

### Consultation globale des commandes — ⚠️ 60%
- Via l'admin Vendure natif ✅
- Mais pas de vue spécifique "marketplace" avec vendeur associé, commission, etc.

---

## Intégration Brevo (Email & SMS) (Estimée à ~80% ✅)

### Configuration SMTP Email — ✅ 85%
- `EmailPlugin` configuré avec `DynamicEmailSender` ✅
- Templates email configurables ✅
- Variables globales (fromAddress, URLs) ✅

### SMS Brevo — ✅ 80%
- `BrevoSmsService` avec envoi SMS transactionnel ✅
- Entity `BrevoSettings` pour configuration dynamique en DB ✅
- Dashboard admin pour gérer les paramètres Brevo ✅

### Mapping événements — ✅ 80%
- Commande confirmée (acheteur) → Email/SMS ✅
- Commande annulée (acheteur) → SMS ✅
- Nouvelle vente (vendeur) → Email/SMS ✅
- Fulfillment (expédition) → Notification ✅
- Stock bas (vendeur) → Notification ✅
- Paiement échoué → Notification ✅
- Inscription vendeur → Notification ✅
- Réinitialisation mot de passe → Email/SMS ✅

---

## Plugins additionnels (hors cahier des charges initial)

| Plugin | Description | Statut |
|--------|-------------|--------|
| **CMSPlugin** | Pages dynamiques, sections, page d'accueil CMS | ✅ Bonus |
| **PageInscriptionPlugin** | Champs d'inscription dynamiques configurables | ✅ Bonus |
| **TaxEnforcementPlugin** | Gestion fiscale/TVA | ✅ Bonus |

---

# Résumé par Pourcentage

| Domaine | Avancement | Détail |
|---------|-----------|--------|
| **Phase 1 – Fondation** | **~90%** | Entity Seller, relation Product, permissions, API GraphQL |
| **Phase 2 – Marketplace Core** | **~80%** | Commandes liées, commissions, events, dashboard vendeur |
| **Phase 3 – Paiement & Livraison** | **~55%** | Seul Cash on Delivery, pas de mobile money |
| **Storefront Acheteur** | **~75%** | Catalogue, recherche, checkout OK — paiement & contact vendeur manquants |
| **Dashboard Vendeur** | **~80%** | CRUD produits, commandes, profil, wallet |
| **Admin Plateforme** | **~75%** | Validation vendeurs OK — commission globale manquante |
| **Intégration Brevo** | **~80%** | Email + SMS bien avancés |

### **Estimation globale MVP : ~75%**

---

# Ce qui reste pour un MVP totalement fonctionnel

## Priorité CRITIQUE (bloquant pour un lancement)

1. **Paiement mobile money** — Intégrer au minimum un provider (FedaPay, Kkiapay, ou similaire) pour accepter MTN/Moov Money. Sans ça, la marketplace ne peut pas fonctionner au Bénin.

2. **Page vendeur publique** — L'acheteur doit pouvoir voir les infos du vendeur (nom, zone, notation, contact) depuis la page produit ou une page dédiée `/vendor/[id]`.

3. **Contact vendeur** — Au minimum un lien WhatsApp ou un formulaire de contact basique pour que l'acheteur puisse contacter le vendeur.

4. **Commission globale** — Un taux par défaut paramétrable dans l'admin pour les vendeurs sans commission personnalisée.

## Priorité HAUTE (important pour une bonne UX)

5. **Statuts de commande personnalisés** — Ajouter des états "Expédié", "En cours de livraison", "Livré" pour le suivi.

6. **Vue commandes admin enrichie** — Afficher le vendeur associé, la commission calculée, dans la vue admin des commandes.

7. **Zones de livraison** — Tarification de livraison par zone géographique au lieu d'un tarif fixe global.

8. **Notifications acheteur** — Email de bienvenue à l'inscription acheteur.

## Priorité MOYENNE (améliorations)

9. **Graphiques dashboard vendeur** — Remplacer le placeholder "Chart visualization coming soon".

10. **Moyens de réception paiement vendeur** — Permettre au vendeur de renseigner ses coordonnées Mobile Money pour recevoir sa part.

11. **Filtres avancés** — Sur les commandes vendeur et admin.

12. **Internationalisation** — L'interface est en mix anglais/français, uniformiser en français.

---
---

# AUDIT DES VALEURS CODÉES EN DUR (à rendre dynamiques / configurables)

## Backend

| Fichier | Valeur codée en dur | Impact | Solution SaaS |
|---------|---------------------|--------|---------------|
| `vendure-config.ts:115` | `'https://www.my-shop.com/assets/'` | URL des assets en production | Utiliser `process.env.ASSET_URL_PREFIX` (déjà partiellement fait en dev) |
| `vendure-config.ts:71` | `requireVerification: false` | Vérification email désactivée globalement | Devrait être configurable depuis le backoffice (on/off) |
| `vendure-config.ts:73` | `verificationTokenDuration: '15m'` | Durée du token de vérification | Configurable depuis BrevoSettings ou un nouveau PlatformSettings |
| `vendure-config.ts:62-65` | URLs CORS en dur (localhost) | Bloquant en production | Utiliser `process.env.CORS_ORIGINS` (liste séparée par virgules) |
| `vendor.service.ts:133` | `no-email-${timestamp}@ahizan.com` | Email placeholder pour vendeurs sans email | Utiliser un domaine configurable depuis PlatformSettings |
| `notification-event.subscriber.ts:92` | `Ahizan: Votre commande ${order.code} a été annulée...` | Message SMS codé en dur pour annulation | Devrait utiliser le template configurable de `channelsConfig.OrderCancelled` (comme les autres events) |
| `notification-event.subscriber.ts:50-52` | Templates par défaut de PasswordReset | Messages initiaux codés en dur | OK comme defaults, mais s'assurer qu'ils sont modifiables (déjà le cas via channelsConfig) |
| `dynamic-email-sender.ts:16-19` | Fallback SMTP `smtp-relay.brevo.com:587` | Config SMTP par défaut | OK comme fallback, la DB prend priorité |
| `dynamic-email-sender.ts:22,66-67` | `'Ahizan'`, `'noreply@ahizan.com'` | Nom/email expéditeur en dur | Devrait lire depuis PlatformSettings ou BrevoSettings (partiellement fait) |
| `brevo-sms.service.ts:114-115` | `'AHIZAN'`, `'noreply@ahizan.com'` | Même problème que ci-dessus | Idem |
| `brevo-settings.entity.ts:24` | `default: '+229'` | Indicatif téléphonique Bénin en dur | OK comme default DB, modifiable via admin |
| `cash-on-delivery.handler.ts:11` | `Math.random().toString(36)` comme transactionId | ID transaction factice | Acceptable pour COD, mais à documenter |

## Storefront (frontend acheteur)

| Fichier | Valeur codée en dur | Impact | Solution SaaS |
|---------|---------------------|--------|---------------|
| `lib/format.ts:8` | `currency: 'USD'` | **CRITIQUE** — Affiche les prix en USD au lieu de XOF/FCFA | Doit utiliser le `currencyCode` de l'order/channel Vendure |
| `components/commerce/price.tsx:8` | `currencyCode = 'USD'` | Default USD dans le composant Price | Changer default en `'XOF'` ou mieux, lire depuis le channel |
| `checkout/steps/delivery-step.tsx:80` | `currency: 'USD'` | Prix livraison en USD | Utiliser `currencyCode` du channel |
| `lib/metadata.ts:3` | `'Vendure Store'` comme SITE_NAME | Nom du site par défaut | Changer en `'Ahizan'` et/ou lire depuis env |
| `checkout/actions.ts:21-32` | Écriture dans fichier log local Windows | Problème en production (ENOENT) | Supprimer l'écriture fichier, garder uniquement console.log |
| Tous les textes UI | Mix anglais/français dans toute l'interface | UX incohérente | Passer tout en français |

## Seller Dashboard (frontend vendeur)

| Fichier | Valeur codée en dur | Impact | Solution SaaS |
|---------|---------------------|--------|---------------|
| `lib/format.ts:6` | `currency: 'XOF'` par défaut | OK pour le Bénin ✅ | Déjà correct |
| `dashboard/page.tsx:32` | `currencyCode = orders[0]?.currencyCode \|\| 'XOF'` | OK ✅ | Fallback correct |
| Textes UI divers | Mix anglais/français | UX incohérente | Passer tout en français |

## Paramètres qui DOIVENT être configurables depuis le backoffice (pas encore implémentés)

1. **Commission globale par défaut** — Taux appliqué quand un vendeur n'a pas de `commissionRate` personnalisé
2. **Affichage contacts vendeur** — Toggle on/off pour afficher phone/email/WhatsApp du vendeur sur le storefront
3. **Statuts de commande** — Liste de statuts personnalisés que le superadmin peut créer/modifier/supprimer
4. **Statuts assignables aux vendeurs** — Quels statuts un vendeur a le droit de gérer
5. **Devise par défaut** — Devise du channel (déjà dans Vendure nativement, mais pas exploitée côté frontend)
6. **Nom de la plateforme** — Pour les emails, SMS, et metadata
7. **Zones de livraison** — Tarifs par zone géographique

---
---

# PLAN D'IMPLÉMENTATION MVP 100% — AHIZAN SaaS

> **Principe directeur** : Tout est un **plugin Vendure** ou une extension d'un plugin existant. Aucune logique métier dans `vendure-config.ts`. Chaque paramètre configurable est stocké en DB avec une interface admin.

---

## ÉTAPE 0 — Entité PlatformSettings (Socle SaaS)
**Priorité** : CRITIQUE — Prérequis pour toutes les autres étapes
**Durée estimée** : 1 session

### Objectif
Créer une entité `PlatformSettings` (singleton en DB, comme `BrevoSettings`) qui centralise tous les paramètres configurables de la plateforme.

### Implémentation
**Fichier** : `backend/src/plugins/multivendor/entities/platform-settings.entity.ts`

Champs :
- `id` : clé fixe `'platform_settings'`
- `platformName` : string (default: `'Ahizan'`)
- `defaultCommissionRate` : float (default: `10` = 10%)
- `showVendorContact` : boolean (default: `false`) — Active/désactive l'affichage des contacts vendeurs
- `vendorContactFields` : simple-json — Quels champs afficher (`phone`, `email`, `whatsapp`, `facebook`, `instagram`)
- `defaultCurrencyCode` : string (default: `'XOF'`)
- `defaultPhonePrefix` : string (default: `'+229'`)
- `emailVerificationRequired` : boolean (default: `false`)
- `vendorAutoApproval` : boolean (default: `false`) — Approbation automatique des vendeurs

**API GraphQL** :
- Query `platformSettings` (admin + shop) — lecture des paramètres publics
- Mutation `updatePlatformSettings` (admin only) — mise à jour

**Dashboard Admin** :
- Page "Paramètres Plateforme" dans le backoffice Vendure (composant React)

---

## ÉTAPE 1 — Commission Globale
**Priorité** : CRITIQUE
**Durée estimée** : 1 session
**Dépend de** : Étape 0

### Objectif
Quand un vendeur n'a pas de `commissionRate` personnalisé (= 0), utiliser le `defaultCommissionRate` de `PlatformSettings`.

### Implémentation
**Modifier** : `backend/src/plugins/multivendor/service/vendor-event.subscriber.ts`

Dans `calculateCommission()` :
```
const rate = vendorEntity.commissionRate > 0 
  ? vendorEntity.commissionRate 
  : platformSettings.defaultCommissionRate;
```

**Dashboard Admin** : Déjà inclus dans l'Étape 0 (champ `defaultCommissionRate` dans la page Paramètres Plateforme).

---

## ÉTAPE 2 — Page Vendeur Publique + Contact Vendeur Configurable
**Priorité** : CRITIQUE
**Durée estimée** : 2 sessions
**Dépend de** : Étape 0

### Objectif
- L'acheteur peut voir les infos du vendeur depuis la page produit et via `/vendor/[id]`
- Le superadmin contrôle quels contacts sont visibles via `PlatformSettings`

### Implémentation

#### 2.1 — Backend : Query `vendor(id)` publique
Déjà existante dans `shopApiExtensions` ✅. Il faut juste s'assurer que la query renvoie les champs contacts conditionnellement selon `PlatformSettings.showVendorContact`.

**Modifier** : `backend/src/plugins/multivendor/api/vendor-shop.resolver.ts`
- Ajouter un `@ResolveField()` qui masque les champs contact si `showVendorContact === false`
- Ou créer une query dédiée `publicVendorProfile(id)` qui filtre les champs

#### 2.2 — Storefront : Composant VendorBadge sur la page produit
**Créer** : `Storefront/src/components/commerce/vendor-badge.tsx`
- Affiche : nom, zone, rating (étoiles), lien vers la page vendeur
- Affiché sur la page produit `/product/[slug]`

#### 2.3 — Storefront : Page `/vendor/[id]`
**Créer** : `Storefront/src/app/vendor/[id]/page.tsx`
- Nom, description, logo, cover image
- Zone géographique
- Rating (étoiles + nombre d'avis)
- Contacts (conditionnel selon `PlatformSettings`) : téléphone, email, WhatsApp, réseaux sociaux
- Liste des produits du vendeur

---

## ÉTAPE 3 — Statuts de Commande Personnalisés (SaaS)
**Priorité** : HAUTE
**Durée estimée** : 2-3 sessions
**Dépend de** : Étape 0

### Objectif
Le superadmin crée des statuts de commande depuis le backoffice. Il assigne quels statuts les vendeurs peuvent utiliser.

### Implémentation

#### 3.1 — Entité OrderStatus
**Créer** : `backend/src/plugins/multivendor/entities/order-status.entity.ts`

Champs :
- `id` : auto
- `code` : string unique (ex: `'preparing'`, `'shipped'`, `'in_transit'`, `'delivered'`)
- `label` : string (ex: `'En préparation'`, `'Expédié'`, `'En cours de livraison'`, `'Livré'`)
- `color` : string (ex: `'#FFA500'`, `'#0000FF'`)
- `order` : int (ordre d'affichage)
- `vendorCanSet` : boolean — Le vendeur peut-il utiliser ce statut ?
- `isFinal` : boolean — Est-ce un état final ?
- `enabled` : boolean

#### 3.2 — API GraphQL
- Query `orderStatuses` (admin + shop)
- Query `vendorOrderStatuses` (shop — filtrées par `vendorCanSet = true`)
- Mutation `createOrderStatus`, `updateOrderStatus`, `deleteOrderStatus` (admin only)

#### 3.3 — Custom field sur Order
- Ajouter un custom field `customStatus` (string) sur `Order` pour stocker le statut marketplace (indépendant du state machine Vendure natif)

#### 3.4 — Dashboard Admin
- Page "Statuts de Commande" dans le backoffice
- CRUD des statuts avec drag & drop pour l'ordre
- Toggle `vendorCanSet`

#### 3.5 — Seller Dashboard
- Modifier `seller/src/app/dashboard/orders/[id]/page.tsx`
- Le vendeur voit un dropdown avec les statuts autorisés
- Appel à `updateMyOrderCustomStatus(orderId, statusCode)`

#### 3.6 — Storefront Acheteur
- Afficher le `customStatus` avec son label et sa couleur dans l'historique de commande

> **Important** : On ne touche PAS au state machine natif de Vendure. On ajoute un champ `customStatus` parallèle pour le suivi marketplace. Le state machine Vendure continue à gérer le flux financier (AddingItems → ArrangingPayment → PaymentSettled, etc.)

---

## ÉTAPE 4 — Vue Commandes Admin Enrichie
**Priorité** : HAUTE
**Durée estimée** : 1 session

### Objectif
Dans le backoffice Vendure, afficher le vendeur associé et la commission calculée dans la liste des commandes.

### Implémentation
**Modifier** : `backend/src/plugins/multivendor/dashboard/`
- Créer un nouveau composant `orders-list.tsx` dans le dashboard multivendor
- Afficher une colonne "Vendeur" et une colonne "Commission" 
- Utiliser les custom fields `vendor` et `commissionAmount` de l'entité Order
- Enregistrer cette page dans `index.ts` du dashboard multivendor

---

## ÉTAPE 5 — Zones de Livraison Dynamiques
**Priorité** : HAUTE
**Durée estimée** : 2 sessions
**Dépend de** : Étape 0

### Objectif
Le superadmin définit des zones de livraison avec des tarifs depuis le backoffice. Le vendeur peut indiquer quelles zones il couvre.

### Implémentation

#### 5.1 — Entité DeliveryZone
**Créer** : `backend/src/plugins/multivendor/entities/delivery-zone.entity.ts`

Champs :
- `id` : auto
- `name` : string (ex: `'Cotonou Centre'`, `'Abomey-Calavi'`)
- `code` : string unique
- `price` : int (en centimes, ex: 100000 = 1000 FCFA)
- `enabled` : boolean
- `order` : int

#### 5.2 — API GraphQL
- Query `deliveryZones` (admin + shop)
- Mutations CRUD (admin only)

#### 5.3 — Shipping Calculator
- Créer `zone-based-shipping.calculator.ts` qui lit la zone sélectionnée et applique le tarif correspondant
- Le remplacer ou l'ajouter en complément de `globalFixedShippingCalculator`

#### 5.4 — Checkout Storefront
- Modifier le `delivery-step.tsx` pour afficher les zones disponibles avec leur tarif

#### 5.5 — Dashboard Admin
- Page "Zones de Livraison" dans le backoffice

---

## ÉTAPE 6 — Notification Bienvenue Acheteur
**Priorité** : HAUTE
**Durée estimée** : 0.5 session

### Objectif
Email de bienvenue envoyé à l'inscription de l'acheteur.

### Implémentation
**Modifier** : `backend/src/plugins/notifications/notification-event.subscriber.ts`
- S'abonner à `AccountRegistrationEvent`
- Ajouter un event `BuyerRegistration` dans `channelsConfig` de BrevoSettings
- Envoyer l'email/SMS de bienvenue avec le template configurable

---

## ÉTAPE 7 — Moyens de Réception Paiement Vendeur
**Priorité** : MOYENNE
**Durée estimée** : 1 session

### Objectif
Le vendeur renseigne ses coordonnées Mobile Money pour recevoir sa part après commission.

### Implémentation

#### 7.1 — Entité Vendor : Nouveaux champs
**Modifier** : `vendor.entity.ts` — Ajouter :
- `paymentMethod` : string (enum: `'MOBILE_MONEY'`, `'BANK_TRANSFER'`, `'CASH'`)
- `mobileMoneyProvider` : string (ex: `'MTN'`, `'MOOV'`, `'CELTIIS'`)
- `mobileMoneyNumber` : string
- `bankName` : string (nullable)
- `bankAccountNumber` : string (nullable)

#### 7.2 — API + Dashboard Vendeur
- Étendre `UpdateVendorInput` avec ces champs
- Ajouter une section "Moyens de paiement" dans `seller/src/app/dashboard/profile/`

---

## ÉTAPE 8 — Graphiques Dashboard Vendeur
**Priorité** : MOYENNE
**Durée estimée** : 1 session

### Objectif
Remplacer le placeholder "Chart visualization coming soon" par de vrais graphiques.

### Implémentation
- Installer `recharts` dans le projet `seller`
- Créer un composant `revenue-chart.tsx` dans `seller/src/components/dashboard/`
- Graphique en barres : revenus par semaine/mois (basé sur les commandes settled)
- Graphique en ligne : nombre de commandes sur les 30 derniers jours

---

## ÉTAPE 9 — Filtres Avancés Commandes
**Priorité** : MOYENNE
**Durée estimée** : 1 session

### Objectif
Filtrer les commandes par statut, date, montant.

### Implémentation
- **Seller Dashboard** : Modifier `seller/src/app/dashboard/orders/page.tsx`
  - Ajouter filtres par statut (dropdown), date (date picker), tri
- **Admin Dashboard** : Les filtres sont dans la vue enrichie de l'Étape 4

---

## ÉTAPE 10 — Internationalisation FR complète
**Priorité** : MOYENNE
**Durée estimée** : 1-2 sessions

### Objectif
Uniformiser toute l'interface en français.

### Implémentation

#### 10.1 — Storefront
- **CRITIQUE** : Changer `currency: 'USD'` → `'XOF'` partout (3 fichiers identifiés)
- Traduire tous les textes statiques en français
- Fichiers principaux à modifier :
  - `lib/format.ts` : changer currency default
  - `components/commerce/price.tsx` : changer default
  - `checkout/steps/delivery-step.tsx` : changer currency
  - `lib/metadata.ts` : SITE_NAME = 'Ahizan'
  - Tous les textes UI : "Add to cart" → "Ajouter au panier", "Search" → "Rechercher", etc.

#### 10.2 — Seller Dashboard
- Traduire les textes restants en anglais
- "Dashboard" → "Tableau de bord", "Orders" → "Commandes", etc.

---

## ÉTAPE 11 — Nettoyage & Corrections Techniques
**Priorité** : HAUTE (à faire en parallèle)
**Durée estimée** : 0.5 session

### Corrections à appliquer :
1. **Supprimer le log fichier** dans `Storefront/src/app/checkout/actions.ts:21-32` — garder uniquement `console.log`
2. **Corriger le message SMS d'annulation** codé en dur dans `notification-event.subscriber.ts:92` — utiliser `channelsConfig.OrderCancelled` comme les autres events
3. **Ajouter `assetUrlPrefix`** depuis `process.env.ASSET_URL_PREFIX` dans `vendure-config.ts`
4. **Ajouter `CORS_ORIGINS`** depuis `process.env.CORS_ORIGINS` dans `vendure-config.ts`

---

## ORDRE D'EXÉCUTION RECOMMANDÉ

```
Phase A — Socle SaaS (Sessions 1-2)
├── Étape 0  : PlatformSettings (prérequis)
├── Étape 1  : Commission globale
└── Étape 11 : Nettoyage technique

Phase B — Fonctionnalités CRITIQUES (Sessions 3-5)
├── Étape 2  : Page vendeur + contact configurable
├── Étape 3  : Statuts de commande personnalisés
└── Étape 6  : Notification bienvenue acheteur

Phase C — UX Améliorée (Sessions 6-8)
├── Étape 4  : Vue commandes admin enrichie
├── Étape 5  : Zones de livraison dynamiques
└── Étape 10 : Internationalisation FR

Phase D — Finitions (Sessions 9-10)
├── Étape 7  : Moyens de réception paiement vendeur
├── Étape 8  : Graphiques dashboard vendeur
└── Étape 9  : Filtres avancés commandes
```

---

## PRINCIPES ARCHITECTURAUX À RESPECTER

1. **Tout dans des plugins Vendure** — Jamais de logique métier dans `vendure-config.ts`
2. **Entités séparées** — Chaque nouvelle entité est dans son propre fichier dans `entities/`
3. **API via extensions GraphQL** — Utiliser `adminApiExtensions` et `shopApiExtensions`
4. **Dashboard via le système de plugins Vendure** — Utiliser `dashboard: './dashboard'` dans le plugin
5. **Pas de valeurs codées en dur** — Tout paramètre modifiable va dans `PlatformSettings` ou `BrevoSettings`
6. **Events Vendure** — Utiliser `EventBus` pour la communication inter-modules
7. **Migrations** — Avec `synchronize: true` les nouvelles entités sont auto-créées, mais en production il faudra des migrations TypeORM
8. **Pas de modification des entités core Vendure** — Uniquement des custom fields et des entités custom