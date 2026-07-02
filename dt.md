# Plan d'Implémentation — Ahizan : 6 tâches majeures

## Vue d'ensemble

Ce plan couvre 6 domaines de développement distincts, ordonnés du plus simple au plus complexe :
1. **Landing page Seller** — remplacement du logo Hero par Three.js (déjà présent)
2. **Sticky Header / Z-index dropdown** — correction du menu compte caché derrière le header
3. **Bouton déconnexion Onboarding** — ajout sur la page onboarding vendeur
4. **Compte unique Ahizan** — refonte du système d'inscription (4 cas)
5. **Système de notifications temps réel** — WebSocket + Web Push via EventBus
6. **Centre de gestion des notifications** — Backoffice Admin complet

---

## Tâche 1 — Landing page Seller : Three.js Hero

### Analyse
Le composant `ThreeDashboard` est **déjà importé et utilisé** dans [`seller/src/app/page.tsx`](file:///srv/ahizan/seller/src/app/page.tsx#L74). Le logo actuel uploadé est probablement dans la zone droite du Hero. Il n'y a pas de fichier logo visible dans le code — le `ThreeDashboard` est déjà en place dans la section droite du Hero (ligne 74). La tâche est donc soit déjà accomplie, soit il y a une image statique à supprimer.

**Action** : Vérifier si une image/logo statique est superposée au `ThreeDashboard` et la supprimer.

---

## Tâche 2 — Sticky Header : correction du Z-index du dropdown

### Problème
Le `DropdownMenu` de compte s'affiche derrière le sticky header car le `z-index` du header est supérieur à celui du contenu du dropdown.

### Fichiers concernés
- [`Storefront/src/components/ahizan/AhizanNavbar.tsx`](file:///srv/ahizan/Storefront/src/components/ahizan/AhizanNavbar.tsx)
- [`Storefront/src/app/globals.css`](file:///srv/ahizan/Storefront/src/app/globals.css)

### Solution
- S'assurer que le `DropdownMenuContent` utilise un `z-index` supérieur au sticky header (ex: `z-[200]`)
- Le header sticky a probablement `z-50` — le dropdown doit être `z-[9999]` ou utiliser un portal Radix (ce qui est le cas par défaut)
- Vérifier que le dropdown utilise bien `position: fixed` via Radix portal (ce qui contourne les problèmes de stacking context)
- Ajouter `sideOffset` et `align` correctement sur le `DropdownMenuContent`

---

## Tâche 3 — Bouton de déconnexion sur l'Onboarding

### Fichiers concernés
- [`seller/src/app/onboarding/page.tsx`](file:///srv/ahizan/seller/src/app/onboarding/page.tsx)
- [`seller/src/app/onboarding/onboarding-form.tsx`](file:///srv/ahizan/seller/src/app/onboarding/onboarding-form.tsx)

### Solution
Ajouter un bouton "Se déconnecter" dans le header de la page onboarding, qui appelle l'action de déconnexion existante du seller.

---

## Tâche 4 — Compte unique Ahizan (refonte inscription)

### Architecture actuelle
- [`auth/src/app/register/actions.ts`](file:///srv/ahizan/auth/src/app/register/actions.ts) — logique côté serveur
- [`auth/src/app/register/register-form.tsx`](file:///srv/ahizan/auth/src/app/register/register-form.tsx) — formulaire UI
- Backend : `VendorShopResolver` + `VendorService` pour la gestion des rôles

### 4 cas à implémenter

| Cas | Situation | Comportement |
|-----|-----------|--------------|
| 1 | Email = Client uniquement | Bloquer, demander login, ajouter rôle Vendeur |
| 2 | Email = Vendeur uniquement | Bloquer, demander login, ajouter rôle Client |
| 3 | Email = Client + Vendeur | Bloquer, rediriger vers connexion |
| 4 | Email inexistant | Inscription normale |

### Backend — Nouvelles mutations GraphQL nécessaires
Dans `vendor-shop.resolver.ts` / `api-extensions.ts` :
```graphql
# Vérifier si un email existe déjà et avec quels rôles
checkEmailRoles(email: String!): EmailRolesResult!

# Ajouter le rôle Client à un compte Vendeur existant (après auth)
addClientRoleToVendor: Boolean!

# Ajouter le rôle Vendeur à un compte Client existant (après auth)  
addVendorRoleToClient: Boolean!
```

### Frontend — Flux UX
1. L'utilisateur saisit son email
2. On appelle `checkEmailRoles` avant de soumettre
3. Selon le résultat, on affiche un message adapté et on redirige ou on procède à l'inscription

> [!IMPORTANT]
> La mutation `addVendorRoleToClient` crée un profil Vendeur sur le compte existant sans créer un nouveau compte. Elle doit conserver le mot de passe existant et ne jamais appeler `registerCustomerAccount`.

> [!WARNING]
> La mutation `checkEmailRoles` doit être **publique** (accessible sans token) pour fonctionner avant connexion.

---

## Tâche 5 — Système de notifications temps réel

### A. WebSocket (NestJS ↔ React)

#### Backend (`backend/src/plugins/notifications/`)
- Nouveau fichier : `notifications.gateway.ts` — Gateway NestJS WebSocket avec `@WebSocketGateway`
- Nouveau fichier : `notifications.entity.ts` — Entité pour stocker les notifications en base
- Nouveau fichier : `notifications.service.ts` — Service centralisé pour créer/émettre des notifications
- Modifier `ahizan-notifications.plugin.ts` — enregistrer le Gateway et le nouveau service
- Modifier `notification-event.subscriber.ts` — émettre via le `NotificationsService` au lieu de directement par SMS/Email

#### Frontend Storefront
- Nouveau hook : `Storefront/src/hooks/useNotifications.ts` — connexion WebSocket + état local
- Nouveau composant : `Storefront/src/components/ahizan/NotificationBell.tsx` — cloche avec badge
- Intégration dans `AhizanNavbar.tsx`

#### Frontend Seller
- Même hook `useNotifications.ts`
- Nouveau composant `NotificationBell.tsx`
- Intégration dans `seller/src/app/dashboard/layout.tsx`

### B. Web Push Notifications

#### Backend
- Nouveau fichier : `push-subscription.entity.ts` — stocker les souscriptions Push par utilisateur/appareil
- Nouveau fichier : `web-push.service.ts` — gestion VAPID, envoi de notifications push
- Nouvelles mutations GraphQL : `subscribeToPushNotifications`, `unsubscribeFromPushNotifications`

#### Frontend (Service Worker)
- `Storefront/src/app/sw.ts` (déjà existant) — ajouter handler `push` event
- Nouveau composant : `PushNotificationPrompt.tsx` — demande d'autorisation

### C. EventBus Vendure → Notifications automatiques

L'architecture sera :
```
VendureEvent → NotificationEventSubscriber → NotificationsService → {
  - WebSocket (en temps réel)
  - Web Push (si souscrit)
  - Email (Brevo existant)
  - Notification interne (DB)
}
```

> [!IMPORTANT]
> Le `NotificationsService` sera le seul point d'entrée pour toutes les notifications. Il consultera la configuration du backoffice pour décider quels canaux utiliser.

---

## Tâche 6 — Centre de gestion des notifications (Backoffice)

### Analyse de l'existant
- Plugin `AhizanNotificationsPlugin` déjà en place avec dashboard Brevo basique
- 1 entité : `BrevoSettings` — config email/SMS

### Architecture recommandée
**Étendre le plugin existant** (pas créer un nouveau) pour éviter la duplication. Le plugin Brevo devient le "Centre de notifications complet".

### Nouvelles entités
- `NotificationLog` — historique de toutes les notifications envoyées
- `NotificationTemplate` — templates multilingues par canal
- `NotificationConfig` — configuration par type d'événement (canaux actifs, délais, priorité)
- `PushSubscription` — souscriptions push par utilisateur

### Nouveau Dashboard UI
Nouveau menu admin **"Notifications"** avec sous-sections :
1. **Tableau de bord** — statistiques en temps réel
2. **Configuration** — activer/désactiver canaux par événement
3. **Templates** — éditeur de templates par canal/langue
4. **Campagnes** — envoi manuel ciblé
5. **Historique** — logs des envois
6. **Push** — gestion des souscriptions

> [!NOTE]
> Le dashboard Vendure utilise React + Vite. Les composants UI sont des composants React standards. L'architecture de plugin Vendure permet d'ajouter des routes/pages via `defineDashboardExtension`.

---

## Ordre d'implémentation recommandé

1. ✅ Tâche 1 (5 min — vérification + fix mineur)
2. ✅ Tâche 2 (15 min — CSS z-index)
3. ✅ Tâche 3 (10 min — bouton déconnexion)
4. 🔧 Tâche 4 (2-3h — backend + frontend inscription)
5. 🔧 Tâche 5 (4-6h — WebSocket + Push)
6. 🔧 Tâche 6 (6-8h — Centre admin complet)

---

## Questions ouvertes

> [!IMPORTANT]
> **Tâche 4 — Vérification email pré-soumission** : La vérification de l'email doit-elle se faire :
> - **(A)** Côté serveur (action Next.js) — plus sécurisé
> - **(B)** Côté client via appel GraphQL direct — plus réactif (vérification en temps réel)
>
> Je recommande **(A)** pour la cohérence avec l'architecture existante.

> [!IMPORTANT]
> **Tâche 5 — Clés VAPID pour Web Push** : Les clés VAPID doivent être générées une seule fois et stockées. Dois-je les générer et les ajouter au `.env` du backend, ou préfères-tu les stocker dans la DB (configuration admin) ?

> [!IMPORTANT]
> **Tâche 5 — WebSocket : port dédié ?** : Le WebSocket peut partager le même port que l'API REST (3000) via un path `/ws` dédié, ou utiliser un port séparé. Le partage de port est recommandé pour éviter la configuration nginx supplémentaire. Confirmes-tu cette approche ?

> [!IMPORTANT]
> **Tâche 6 — Scope du backoffice** : Veux-tu que le Centre de notifications soit implémenté en **une seule fois** (complet) ou en **phases** (d'abord la config/historique, puis les campagnes, puis la segmentation) ?

---

## Plan de vérification

### Tests manuels
- Tâche 1 : Vérifier visuellement la landing page seller
- Tâche 2 : Scroller, ouvrir le dropdown — doit rester visible
- Tâche 3 : Accéder à `/onboarding` — bouton déconnexion visible
- Tâche 4 : Tenter une inscription avec un email existant — vérifier chaque cas
- Tâche 5 : Ouvrir deux onglets — une notification doit apparaître dans les deux
- Tâche 6 : Accéder au backoffice admin — menu "Notifications" présent

### Build final
- `docker compose build && docker compose up -d` après toutes les modifications

# Tasks — Ahizan 6 tâches majeures

## Tâche 1 — Landing page Seller : Three.js Hero
- [/] Vérifier si un logo statique est superposé au ThreeDashboard
- [ ] Supprimer/remplacer par le composant Three.js

## Tâche 2 — Sticky Header : Z-index dropdown
- [ ] Corriger le z-index du DropdownMenuContent
- [ ] Vérifier le portal Radix fonctionne bien

## Tâche 3 — Bouton déconnexion Onboarding
- [ ] Ajouter le bouton dans onboarding/page.tsx
- [ ] Connecter à l'action de déconnexion existante

## Tâche 4 — Compte unique Ahizan
- [ ] Backend : mutation `checkEmailRoles`
- [ ] Backend : mutation `addClientRoleToVendor`
- [ ] Backend : mutation `addVendorRoleToClient`
- [ ] Frontend auth : logique des 4 cas
- [ ] Frontend auth : UI messages adaptés

## Tâche 5 — Système de notifications
- [ ] Backend : NotificationsGateway WebSocket
- [ ] Backend : NotificationLog entity
- [ ] Backend : NotificationsService centralisé
- [ ] Backend : PushSubscription entity + WebPushService
- [ ] Backend : mutations push GraphQL
- [ ] Backend : relier EventBus → NotificationsService
- [ ] Frontend Storefront : hook useNotifications
- [ ] Frontend Storefront : composant NotificationBell
- [ ] Frontend Storefront : Service Worker push handler
- [ ] Frontend Seller : hook + composant NotificationBell

## Tâche 6 — Centre de gestion des notifications (Backoffice)
- [ ] Nouvelles entités DB (NotificationLog, Template, Config)
- [ ] Nouveau dashboard UI avec menu "Notifications"
- [ ] Page Tableau de bord (stats)
- [ ] Page Configuration (canaux par événement)
- [ ] Page Templates (éditeur multilingue)
- [ ] Page Campagnes (envoi manuel)
- [ ] Page Historique

## Build final
- [ ] docker compose build
- [ ] docker compose up -d
