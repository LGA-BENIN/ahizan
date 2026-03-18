
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