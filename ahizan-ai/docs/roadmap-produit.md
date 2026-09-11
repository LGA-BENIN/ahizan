# ROADMAP PRODUIT — AHIZAN AI (Cockpit Super Admin)

*Date : 11 septembre 2026*
*Auteur : audit technique du dépôt `/srv/ahizan/ahizan-ai`*
*Statut : document d'arbitrage — **aucune modification de code n'a été appliquée***
 
---
 
## 0. Objet du document
 
Ce document recense, sous forme de tickets actionnables, l'ensemble des travaux
nécessaires pour amener `ahizan-ai` de son état actuel (prototype fonctionnellement
bloqué et exposé sans authentification) à un produit exploitable et commercialisable.
 
Chaque ticket comporte : le problème avec sa **preuve factuelle**, le correctif
attendu, les **critères d'acceptation vérifiables**, une estimation et le risque associé.
 
Convention de priorité :
 
| Priorité | Signification |
| :--- | :--- |
| **P0** | Bloquant. Le produit ne remplit pas sa fonction de base. |
| **P1** | Critique. Risque de sécurité, de fuite de secrets ou de données fausses. |
| **P2** | Majeur. Qualité perçue, fiabilité, expérience utilisateur. |
| **P3** | Structurant. Industrialisation, maintenabilité, observabilité. |
 
---
 
## 1. Périmètre technique actuel
 
| Composant | Technologie | Emplacement |
| :--- | :--- | :--- |
| Serveur API | Node `http` natif (sans framework), Vercel AI SDK v4 | `src/api/server.ts` |
| Passerelle LLM | Google / OpenAI / OpenRouter / endpoint personnalisé | `src/gateway/` |
| Outils agent | 6 outils GraphQL **en lecture seule** | `src/tools/` |
| Workflow métier | Analyse d'approbation produit (analyse seule) | `src/workflows/product-approval/` |
| Interface | SPA React 19 + Tailwind 4, servie par le serveur Node | `web/` |
| Déploiement | Conteneur `ahizan_ai` (`node:20-alpine`, bind-mount), publié sur `ai.ahizan.com` | `/srv/ahizan/docker-compose.yml` |
 
> **Note :** les fichiers `docs/audit.md` et `docs/contre-audit.md` ne concernent pas ce
> produit : ce sont des audits de saturation disque du VPS `vps117624`.
 
---
 
## 2. État des lieux — constats prouvés par test
 
Ces constats ont été établis par exécution réelle, non par lecture du code seule.
 
### 2.1 L'agent ne peut lire aucune donnée de la marketplace
 
Test exécuté sur l'instance en production :
 
```text
POST http://127.0.0.1:3005/api/chat
{"messages":[{"role":"user","content":"... getPendingApprovals ..."}],"model":"gemini-2.5-flash"}
 
→ HTTP 500
→ {"error":"Error executing tool getPendingApprovals: fetch failed"}
```
 
Cause : le service tourne **dans un conteneur Docker**, mais pointe sur `127.0.0.1`.
Vérification depuis l'intérieur du conteneur `ahizan_ai` :
 
| Cible testée | Résultat |
| :--- | :--- |
| `http://127.0.0.1:3000/admin-api` | `Connection refused` |
| `http://ahizan_backend:3000/admin-api` | `{"data":{"__typename":"Query"}}` |
 
### 2.2 Le modèle de langage, lui, fonctionne
 
```text
POST /api/chat {"messages":[{"role":"user","content":"dis juste OK"}]}
→ {"text":"OK","usage":{"totalTokens":1456},"finishReason":"stop"}
```
 
**Conclusion de cadrage :** la couche LLM est saine. C'est la couche d'accès aux
données Ahizan qui est entièrement rompue. Tout travail sur l'UX ou la fluidité
avant correction du point 2.1 serait cosmétique.
 
### 2.3 Le service est exposé publiquement sans authentification
 
`docker-compose.yml` publie le cockpit sur `ai.ahizan.com` via `nginx-proxy`,
alors que `src/api/server.ts` n'implémente aucun contrôle d'accès et autorise
`Access-Control-Allow-Origin: *`.
 
### 2.4 Deux processus concurrents et un PID périmé
 
| PID | Utilisateur | Démarré le |
| :--- | :--- | :--- |
| 659150 | root | 9 septembre 2026 |
| 924286 | root | 10 septembre 2026 |
| 805444 (`service.pid`) | — | **processus mort** |
 
---
 
## 3. Phase 0 — Débloquer le produit
 
**Objectif :** l'agent répond à des questions réelles sur le catalogue et les ventes.
**Estimation totale : 1 jour.** **Aucune dépendance.**
 
---
 
### P0-1 — Corriger l'URL de l'API Admin Vendure
 
* **Problème.** `.env` déclare `VENDURE_ADMIN_API_URL=http://127.0.0.1:3000/admin-api`.
  Depuis le conteneur `ahizan_ai`, cette adresse est sa propre boucle locale : connexion refusée.
* **Preuve.** Section 2.1.
* **Correctif.** `VENDURE_ADMIN_API_URL=http://ahizan_backend:3000/admin-api`
  (alias déclaré dans `docker-compose.yml`, réseau `internal`, comme le font déjà
  les services `storefront`, `seller` et `auth`).
* **Critères d'acceptation.**
  1. `POST /api/chat` avec une question sur les fiches en attente retourne `HTTP 200`.
  2. La réponse contient un `toolCall` `getPendingApprovals` avec un résultat non vide.
  3. Aucune occurrence de `fetch failed` dans les logs du conteneur.
* **Estimation.** 15 min. **Risque.** Nul.
 
---
 
### P0-2 — Aligner les identifiants Super Admin et supprimer le repli codé en dur
 
* **Problème.** `.env` définit `VENDURE_ADMIN_USERNAME` / `VENDURE_ADMIN_PASSWORD`,
  mais le client lit `SUPERADMIN_USERNAME` / `SUPERADMIN_PASSWORD` et retombe
  silencieusement sur `'superadmin'` / `'superadmin'`.
* **Preuve.** `src/tools/ahizan-client.ts`, lignes 16-17.
* **Correctif.** Lire les noms réellement présents dans `.env` ; **échouer au
  démarrage** avec un message explicite si les identifiants sont absents, au lieu
  de deviner. Supprimer toute valeur d'identifiant en dur du code source.
* **Critères d'acceptation.**
  1. Avec des identifiants valides, `ensureAdminToken()` retourne un token.
  2. Sans identifiants, le service refuse de démarrer avec un message nommant la
     variable manquante.
  3. `grep -r "superadmin" src/` ne retourne plus aucun mot de passe.
* **Estimation.** 30 min. **Risque.** Faible. Révélera un éventuel second problème
  d'authentification masqué jusqu'ici par l'échec réseau de P0-1.
 
---
 
### P0-3 — Assainir le catalogue de modèles et le modèle actif
 
* **Problème.** Le modèle actif est `gemini-3.8-flash`, un identifiant **inexistant**
  saisi via le formulaire « modèle personnalisé ». Le catalogue contient d'autres
  identifiants fictifs : `gemma-4-31b-it`, `gemma-4-26b-a4b-it`, `google/gemma-4-31b`,
  `anthropic/claude-3.7-sonnet`.
* **Preuve.** `config/ai-settings.json` ligne 218 et lignes 47-127 ;
  `src/gateway/config-store.ts` (`PRESET_MODELS_CATALOG`).
* **Correctif.** Repositionner `activeModel` sur `gemini-2.5-flash`, retirer du
  catalogue tout identifiant non vérifié. Validation du modèle à la sauvegarde
  (appel réel au provider) plutôt qu'acceptation aveugle.
* **Critères d'acceptation.**
  1. Chaque modèle listé par `GET /api/models` répond à un test de connectivité.
  2. L'ajout d'un identifiant inexistant est **refusé** avec l'erreur du provider.
  3. Aucun modèle marqué `available: true` sans vérification effective.
* **Estimation.** 2 h. **Risque.** Faible.
 
---
 
### P0-4 — Injecter la configuration dans le conteneur
 
* **Problème.** Le service `ai` du `docker-compose.yml` ne déclare **ni `env_file`
  ni `environment`**, contrairement à tous les autres services. Le fonctionnement
  ne repose que sur un parseur `.env` maison.
* **Preuve.** `docker exec ahizan_ai env` ne retourne aucune variable Vendure ni LLM ;
  `docker-compose.yml` lignes 136-151 ; contournement dans `src/index.ts` lignes 6-23.
* **Correctif.** Ajouter `env_file: ./ahizan-ai/.env` au service `ai`. Conserver le
  parseur maison uniquement comme repli pour le développement hors Docker.
* **Critères d'acceptation.**
  1. `docker exec ahizan_ai env | grep VENDURE_ADMIN_API_URL` retourne la valeur.
  2. Le service fonctionne même si `/app/.env` est absent du bind-mount.
* **Estimation.** 30 min. **Risque.** Faible.
 
---
 
### P0-5 — Unifier la gestion du cycle de vie du processus
 
* **Problème.** Deux processus Node concurrents tournent en root, un `service.pid`
  périmé pointe sur un processus mort, et les scripts `start.sh` / `stop.sh`
  entrent en conflit avec la politique `restart: unless-stopped` de Docker.
* **Preuve.** Section 2.4.
* **Correctif.** Docker devient l'unique gestionnaire du cycle de vie. Suppression
  de `start.sh`, `stop.sh` et `service.pid`. Arrêt des processus orphelins.
* **Critères d'acceptation.**
  1. Un seul processus Node sert le port 3005.
  2. `docker compose restart ai` suffit à redémarrer le service.
  3. Plus aucun fichier de PID dans le dépôt.
* **Estimation.** 1 h. **Risque.** Moyen — à exécuter sur une fenêtre de maintenance.
 
---
 
### P0-6 — Ne plus interrompre la conversation sur une erreur d'outil
 
* **Problème.** Une erreur d'outil remonte en `HTTP 500` et détruit le tour de
  conversation ; en mode streaming, aucun `onError` n'est fourni à `streamText`,
  donc le flux se termine **sans message** et l'utilisateur voit une bulle vide.
* **Preuve.** `src/api/server.ts` lignes 246-256 (aucun `onError`) et 325-328
  (le `catch` global transforme toute erreur d'outil en 500) ; test de la section 2.1.
* **Correctif.** Retourner l'échec **comme résultat d'outil** (le modèle peut alors
  l'expliquer ou réessayer) et fournir un `onError` qui émet une part d'erreur
  exploitable par le client.
* **Critères d'acceptation.**
  1. Backend Vendure volontairement coupé : la conversation retourne `HTTP 200`
     et un message explicatif en langage naturel.
  2. Aucun `HTTP 500` déclenché par une défaillance d'outil.
  3. L'interface affiche un message d'erreur lisible, jamais une bulle vide.
* **Estimation.** 3 h. **Risque.** Faible.
 
---
 
## 4. Phase 1 — Sécuriser (prérequis de commercialisation)
 
**Objectif :** le cockpit n'est accessible qu'aux administrateurs authentifiés et ne
laisse fuiter aucun secret.
**Estimation totale : 3 jours.** **Dépend de la Phase 0.**
 
---
 
### P1-1 — Authentifier les requêtes contre Vendure
 
* **Problème.** Aucun contrôle d'accès. Le rôle est de surcroît **présumé** :
  `role: body.context?.role || 'SUPER_ADMIN'`, c'est-à-dire que le client déclare
  lui-même ses privilèges.
* **Preuve.** `src/api/server.ts` ligne 108 ; absence totale de middleware d'auth.
* **Correctif.** Middleware vérifiant le token Vendure Admin (requête `me`) avant
  tout traitement. Le rôle et les permissions sont **dérivés de la réponse du
  backend**, jamais du corps de requête. Rejet en `401` sinon.
* **Critères d'acceptation.**
  1. Requête sans token → `401`.
  2. Requête avec token invalide ou expiré → `401`.
  3. Un utilisateur non Super Admin ne peut pas atteindre les routes d'administration.
  4. Le champ `role` du corps de requête n'a plus aucun effet sur les privilèges.
* **Estimation.** 1 j. **Risque.** Moyen — modifie le contrat d'API du frontend.
 
---
 
### P1-2 — Protéger les routes de configuration
 
* **Problème.** `POST /api/settings/models` permet à **n'importe quel visiteur** de
  réécrire la configuration et les clés API ; `GET` expose la configuration.
* **Preuve.** `src/api/server.ts` lignes 169-215, sans aucune vérification ;
  service publié sur `ai.ahizan.com` (`docker-compose.yml` ligne 147).
* **Correctif.** Restreindre `/api/settings/*` au rôle Super Admin vérifié (P1-1).
  Restreindre le CORS aux domaines Ahizan au lieu de `*`.
* **Critères d'acceptation.**
  1. Appel anonyme depuis Internet → `401`.
  2. Requête cross-origin depuis un domaine non autorisé → bloquée.
  3. Toute modification de configuration est journalisée (auteur, date, champs).
* **Estimation.** 4 h. **Risque.** Faible.
 
---
 
### P1-3 — Mettre les clés API au secret
 
* **Problème.** Les clés sont stockées **en clair** dans `config/ai-settings.json`.
  Ce dossier est **non suivi par git** (`?? ahizan-ai/config/`), donc exposé à un
  commit accidentel de secrets. Le fichier appartient à `root` alors que le dépôt
  appartient à `fernando`.
* **Preuve.** `src/gateway/config-store.ts` lignes 387-392 ; `git status` ;
  `ls -la config/`.
* **Correctif.** Les clés proviennent de variables d'environnement ou d'un secret
  chiffré ; le fichier de configuration ne contient plus que des préférences non
  sensibles. Ajout explicite de `config/` au `.gitignore`. Rotation des clés
  actuellement présentes sur disque.
* **Critères d'acceptation.**
  1. Aucune clé API en clair dans le système de fichiers du dépôt.
  2. `git check-ignore config/ai-settings.json` confirme l'exclusion.
  3. L'API ne renvoie jamais qu'une version masquée des clés.
  4. Les clés antérieures ont été révoquées côté providers.
* **Estimation.** 1 j. **Risque.** Moyen — nécessite une rotation coordonnée.
 
---
 
### P1-4 — Quotas, délais et plafonds
 
* **Problème.** Aucun rate-limit, aucun timeout, aucun plafond de tokens. Un
  service public adossé à des clés LLM payantes est une facture ouverte.
* **Preuve.** Absence de toute logique correspondante dans `src/api/server.ts`.
* **Correctif.** Rate-limit par utilisateur authentifié, timeout de requête,
  plafond de tokens par tour et budget mensuel par utilisateur.
* **Critères d'acceptation.**
  1. Au-delà du seuil, retour `429` avec un délai de réessai.
  2. Une génération anormalement longue est interrompue proprement.
  3. La consommation est attribuée à un utilisateur identifié.
* **Estimation.** 1 j. **Risque.** Faible.
 
---
 
### P1-5 — Rotation des journaux Docker
 
* **Problème.** Aucun `/etc/docker/daemon.json`, donc aucune politique de rotation.
  Un conteneur voisin (`ahizan_storefront`) a déjà produit **479 Mo** de journal.
* **Preuve.** `docs/audit.md` sections 5 et 16 — recommandation formulée le
  10 septembre 2026, **toujours non appliquée**.
* **Correctif.** Politique `json-file` avec `max-size: 50m` et `max-file: 3`.
* **Critères d'acceptation.**
  1. `docker info` reflète les options de journalisation.
  2. Aucun journal de conteneur ne dépasse 150 Mo.
* **Estimation.** 1 h. **Risque.** Faible — requiert un redémarrage du démon Docker.
 
---
 
## 5. Phase 2 — Fiabiliser la conversation
 
**Objectif :** un fil de discussion fluide, continu et cohérent sur plusieurs tours.
**Estimation totale : 1 semaine.** **Dépend de la Phase 0.**
 
---
 
### P2-1 — Adopter `useChat` au lieu du parseur de flux maison
 
* **Problème.** Le frontend décode **à la main** les préfixes `0:`, `9:`, `a:`, `b:`
  du protocole de flux de l'AI SDK. Les parts d'erreur (`3:`) sont ignorées, donc un
  incident se traduit par un arrêt silencieux du flux. `@ai-sdk/react` est **installé
  mais jamais utilisé**. Les versions sont par ailleurs désalignées : `ai` v4 côté
  serveur, `ai` v6 et `@ai-sdk/react` v3 côté web.
* **Preuve.** `web/src/App.tsx` lignes 243-274 ; `web/package.json` lignes 13-15 ;
  `src/api/server.ts` ligne 256 (`pipeDataStreamToResponse`, API v4).
* **Correctif.** Aligner les versions de `ai` entre serveur et client, puis remplacer
  le parseur manuel par `useChat` (`@ai-sdk/react`, déjà installé mais inutilisé).
  Le hook gère nativement le streaming token par token, les tool-calls, le
  `reasoning`, la gestion d'erreur, le retry et un `stop()` qui préserve le texte
  déjà reçu.
* **Critères d'acceptation.**
  1. Une erreur d'outil ou de provider en cours de streaming s'affiche à l'utilisateur
     au lieu de couper le flux en silence.
  2. `Stop` conserve le texte déjà généré dans l'historique.
  3. Les tool-calls s'affichent avec leur état (`call` → `result`) sans passer par
     un `JSON.stringify` brut.
  4. Plus aucune occurrence du parseur de préfixes (`0:`, `9:`, `a:`, `b:`) dans
     `web/src/App.tsx`.
* **Estimation.** 2 j. **Risque.** Moyen — réécrit la couche de rendu du chat.

---

### P2-2 — Conserver l'historique structuré entre les tours

* **Problème.** Chaque message est aplati en chaîne de caractères avant d'être
  renvoyé au modèle, y compris les `tool-call` et `tool-result` :
  ```ts
  const cleanMessages = messages.map((m: any) => ({
    role: m.role,
    content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content || ''),
  }));
  ```
  Le modèle perd la structure de ses propres appels d'outils au tour suivant et
  re-déclenche les mêmes outils ou hallucine leur résultat.
* **Preuve.** `src/api/server.ts` lignes 233-236.
* **Correctif.** Transmettre les messages au format `CoreMessage` structuré attendu
  par l'AI SDK (parts `text`, `tool-call`, `tool-result`), sans sérialisation
  intermédiaire.
* **Critères d'acceptation.**
  1. Une conversation de 4 tours avec 2 appels d'outils ne redéclenche jamais un
     outil déjà résolu pour la même information.
  2. Les messages envoyés au provider contiennent des parts typées, pas des
     chaînes JSON dans `content`.
* **Estimation.** 4 h. **Risque.** Faible — dépend de P2-1 pour être testé de bout en bout.

---

### P2-3 — Catalogue de modèles dynamique

* **Problème.** Le catalogue de modèles est codé en dur (`PRESET_MODELS_CATALOG`)
  et marque un modèle `available: true` dès qu'une clé provider existe, sans
  vérifier que le modèle existe réellement ni qu'il supporte le function calling.
* **Preuve.** `src/gateway/config-store.ts` ; incident P0-3 (modèle `gemini-3.8-flash`
  inexistant sélectionné comme actif).
* **Correctif.** Interroger dynamiquement `/v1/models` (OpenAI, OpenRouter) et
  l'API Google pour construire le catalogue, avec un badge de capacités (outils ✓,
  vision ✓, raisonnement ✓). Désactiver dans l'UI les modèles sans function calling
  pour les conversations qui utilisent des outils (ex. Gemma).
* **Critères d'acceptation.**
  1. Le catalogue affiché correspond aux modèles réellement accessibles avec les
     clés configurées.
  2. Un modèle sans function calling est visuellement marqué comme incompatible
     avec les outils Super Admin.
  3. Le rafraîchissement du catalogue ne bloque pas l'envoi d'un message (mise en
     cache, invalidation explicite).
* **Estimation.** 1,5 j. **Risque.** Moyen — dépend des quotas/latence des API de listing des providers.

---

### P2-4 — Mettre en cache le rafraîchissement des clients providers

* **Problème.** `refreshClients()` relit le fichier de configuration et recrée les
  4 clients SDK (Google, OpenAI, OpenRouter, personnalisé) à **chaque requête**
  de chat, même quand rien n'a changé.
* **Preuve.** `src/gateway/model-provider.ts` lignes 25-75, appelé à chaque
  requête ligne 95.
* **Correctif.** Mettre les clients en cache en mémoire, invalidés uniquement à
  la sauvegarde des paramètres (`POST /api/settings/models`) ou au démarrage.
* **Critères d'acceptation.**
  1. Le fichier de configuration n'est relu du disque qu'après une modification
     effective des paramètres.
  2. Le temps de traitement d'une requête de chat ne dépend plus du nombre de
     providers configurés.
* **Estimation.** 3 h. **Risque.** Faible.

---

## 6. Phase 3 — Valeur métier

**Objectif :** l'agent peut agir sur la marketplace, pas seulement la décrire.
**Estimation totale : 2 semaines.** **Dépend des Phases 0 et 1.**

---

### P3-1 — Outils d'écriture avec validation humaine (human-in-the-loop)

* **Problème.** Les 6 outils existants sont **tous en lecture**. Le prompt système
  annonce des actions (« Valider en fiche officielle », « Re-greffer sur #X ») et
  le workflow d'approbation calcule une recommandation, mais **aucune mutation
  n'est exécutable**. L'agent ne peut jamais accomplir la tâche qu'il propose.
* **Preuve.** `src/agents/super-admin/system-prompt.ts` ; `src/tools/registry.ts`
  (aucun outil de mutation enregistré) ; `src/workflows/product-approval/approval-workflow.ts`
  (analyse seule, pas d'exécution).
* **Correctif.** Ajouter des outils `approveProduct`, `rejectProduct(reason)`,
  `regraftOffer(targetProductId)`, `updateProductContent(fields)`, chacun
  déclenchant côté UI une carte de confirmation explicite avant exécution
  (pattern AI SDK « tool approval »/« human in the loop »).
* **Critères d'acceptation.**
  1. Aucune mutation n'est exécutée sans confirmation explicite de l'administrateur
     dans l'UI.
  2. Chaque action confirmée produit une entrée d'audit (auteur, action, cible, date).
  3. Une action refusée par l'administrateur n'a aucun effet côté Vendure.
* **Estimation.** 1 semaine. **Risque.** Élevé — surface d'action directe sur les
  données de production, nécessite tests d'intégration soignés.

---

### P3-2 — Outils d'agrégation côté Vendure au lieu de calculs JS non bornés

* **Problème.** `getPendingApprovals` ignore son paramètre `take` (valeur fixe
  `take: 100`, filtrage en JS) ; `getSalesStatistics` charge 1000 commandes pour
  sommer en JS et **compte les commandes annulées dans le chiffre d'affaires** ;
  `getTopVendors` charge 100 vendeurs pour n'en afficher que 10.
* **Preuve.** `src/tools/products/product-tools.ts` ligne 212 ;
  `src/tools/analytics/analytics-tools.ts` lignes 36-43.
* **Correctif.** Exposer côté Vendure (plugin GraphQL dédié) des requêtes
  agrégées : CA net (hors commandes annulées), panier moyen, top vendeurs,
  fiches en attente avec pagination réelle — calcul en base, pas en mémoire Node.
* **Critères d'acceptation.**
  1. `getSalesStatistics` exclut explicitement les commandes annulées/remboursées
     du chiffre d'affaires retourné.
  2. `getPendingApprovals` respecte le paramètre `take` demandé par l'agent.
  3. Aucun outil ne charge plus de résultats que nécessaire pour répondre à la question.
* **Estimation.** 4 j. **Risque.** Moyen — nécessite un plugin Vendure côté backend
  (voir directives `AGENTS.md` : utiliser les primitives natives Vendure,
  `RequestContext`, `TransactionalConnection`).

---

### P3-3 — Traitement par lot des fiches en attente

* **Problème.** Le flux d'approbation traite une fiche à la fois ; à l'échelle
  réelle d'une file de modération, ce n'est pas exploitable.
* **Preuve.** `src/workflows/product-approval/approval-workflow.ts` (une fiche
  par appel), absence de toute notion de file ou de lot dans les outils.
* **Correctif.** Permettre à l'agent de traiter un lot de fiches en une seule
  conversation (liste, filtrage, décision groupée avec confirmation unique côté UI).
* **Critères d'acceptation.**
  1. Un administrateur peut faire traiter 20 fiches en attente en une seule
     interaction, avec un récapitulatif avant validation.
  2. Le temps de traitement d'un lot de 20 fiches est mesurablement inférieur à
     20 traitements unitaires.
* **Estimation.** 3 j. **Risque.** Moyen — dépend de P3-1.

---

### P3-4 — Suivi des coûts et des tokens par utilisateur

* **Problème.** Le type `TokenUsage` existe déjà dans le code mais n'est jamais
  utilisé. Aucune visibilité sur le coût réel d'utilisation du cockpit.
* **Preuve.** `src/gateway/types.ts` lignes 34-39 (type défini, jamais consommé).
* **Correctif.** Enregistrer `usage` à chaque réponse (déjà disponible via l'AI
  SDK), l'attribuer à l'utilisateur authentifié (dépend de P1-1), exposer un
  tableau de bord de consommation par utilisateur/modèle avec budget mensuel
  configurable.
* **Critères d'acceptation.**
  1. Chaque tour de conversation incrémente un compteur de tokens par utilisateur.
  2. Un budget mensuel dépassé bloque ou avertit avant la génération suivante.
  3. Un rapport de consommation par modèle est consultable par un Super Admin.
* **Estimation.** 3 j. **Risque.** Faible.

---

## 7. Phase 4 — UI/UX

**Objectif :** une interface honnête, lisible et agréable, alignée sur la promesse
d'un cockpit professionnel.
**Estimation totale : 1 semaine.** **Dépend de la Phase 2 pour le rendu des erreurs et outils.**

---

### P4-1 — États explicites (vide, erreur, chargement)

* **Problème.** Une erreur d'outil s'affiche aujourd'hui comme `❌ Erreur : HTTP 500`,
  sans contexte ni action de récupération proposée à l'administrateur final.
* **Preuve.** Comportement observé en section 2.1 avant correctif ; absence de
  composants d'état dans `web/src/App.tsx`.
* **Correctif.** Composants dédiés pour les états vide/erreur/chargement, avec
  message en langage naturel et action de reprise (« Réessayer », « Vérifier la
  connexion à la marketplace »).
* **Critères d'acceptation.**
  1. Aucun message d'erreur brut (code HTTP, stack trace) n'est visible côté utilisateur final.
  2. Chaque état d'erreur propose une action concrète.
* **Estimation.** 2 j. **Risque.** Faible.

---

### P4-2 — Indicateur de santé réel

* **Problème.** Le voyant vert « Passerelle connectée » est codé en dur, sans
  rapport avec l'état réel du service.
* **Preuve.** `web/src/App.tsx` ligne 432.
* **Correctif.** Brancher l'indicateur sur `GET /api/health`, avec code couleur
  reflétant la disponibilité réelle du backend Vendure et du provider LLM actif.
* **Critères d'acceptation.**
  1. Le backend Vendure étant volontairement coupé, l'indicateur passe au rouge
     dans la minute.
  2. L'indicateur ne dépend d'aucune valeur codée en dur.
* **Estimation.** 4 h. **Risque.** Faible.

---

### P4-3 — Rendu riche des résultats d'outils

* **Problème.** Les résultats d'outils s'affichent en JSON brut ou via
  `toolData.result || toolData`, sans mise en forme.
* **Preuve.** `web/src/App.tsx`, rendu des tool-calls.
* **Correctif.** Composants dédiés par type de résultat : tableaux pour les
  listes, cartes produit avec image pour les fiches, badges de statut, blocs KPI
  pour les statistiques.
* **Critères d'acceptation.**
  1. Aucun JSON brut n'est affiché à l'utilisateur final pour un résultat d'outil connu.
  2. Chaque type d'outil dispose d'un rendu dédié et testé visuellement.
* **Estimation.** 3 j. **Risque.** Faible.

---

### P4-4 — Markdown streamé et actions sur les messages

* **Problème.** Pas de rendu Markdown (tableaux, blocs de code), pas de copie de
  message, pas de régénération, pas d'édition du dernier prompt.
* **Preuve.** Absence de ces fonctionnalités dans `web/src/App.tsx`.
* **Correctif.** Rendu Markdown streamé, bouton de copie, régénération de la
  dernière réponse, édition du dernier message utilisateur avec nouvel envoi.
* **Critères d'acceptation.**
  1. Un tableau ou un bloc de code renvoyé par le modèle s'affiche correctement formaté.
  2. Chaque message assistant dispose d'une action de copie fonctionnelle.
* **Estimation.** 2 j. **Risque.** Faible.

---

### P4-5 — Accessibilité et mobile

* **Problème.** Pas de focus trap sur la modale de paramètres, attributs `aria-*`
  absents, navigation clavier non vérifiée.
* **Preuve.** `web/src/components/SettingsModal.tsx`.
* **Correctif.** Focus trap, attributs ARIA appropriés, navigation clavier complète,
  vérification responsive sur mobile.
* **Critères d'acceptation.**
  1. La modale de paramètres est entièrement navigable au clavier, focus piégé
     tant qu'elle est ouverte.
  2. Un audit Lighthouse accessibilité ne relève plus d'erreur bloquante.
* **Estimation.** 2 j. **Risque.** Faible.

---

### P4-6 — Suppression du code et de l'UI morts

* **Problème.** Une implémentation parallèle complète n'est jamais appelée par le
  serveur : `src/gateway/gateway.ts`, `src/gateway/providers/*` (3 fichiers),
  `src/engine/react-engine.ts`, `src/agents/super-admin/super-admin.agent.ts`,
  `sdk/`, et l'ancienne UI vanilla dans `public/` (28 Ko).
* **Preuve.** Aucune référence à ces fichiers depuis `src/index.ts` ou `src/api/server.ts`
  (vérifié par recherche croisée des imports).
* **Correctif.** Suppression après confirmation qu'aucun script de build ou de
  déploiement ne les référence.
* **Critères d'acceptation.**
  1. Le service démarre et fonctionne identiquement après suppression.
  2. Réduction mesurable de la taille du dépôt et de la surface de code à maintenir.
* **Estimation.** 1 j. **Risque.** Faible — vérification par grep avant suppression.

---

## 8. Phase 5 — Industrialisation

**Objectif :** un déploiement reproductible, testé et observable.
**Estimation totale : 1 semaine.** **Peut démarrer en parallèle des autres phases.**

---

### P5-1 — Dockerfile de production

* **Problème.** Aucun `Dockerfile` : le service tourne en bind-mount sur une image
  `node:20-alpine` générique, avec un `dist/` compilé manuellement sur l'hôte.
* **Preuve.** `docker-compose.yml`, service `ai` (image générique, `command: node dist/index.js`).
* **Correctif.** `Dockerfile` multi-stage (build TypeScript + build Vite du frontend,
  runtime minimal non-root), `healthcheck` sur `/api/health`, `depends_on` explicite
  vers le service Vendure.
* **Critères d'acceptation.**
  1. `docker compose build ai` produit une image autonome, sans dépendance à un
     `dist/` pré-compilé sur l'hôte.
  2. Le conteneur s'exécute avec un utilisateur non-root.
  3. `docker compose up` échoue proprement si le backend Vendure n'est pas prêt.
* **Estimation.** 2 j. **Risque.** Moyen — change le mode de déploiement actuel.

---

### P5-2 — Tests automatisés

* **Problème.** Aucun test dans le dépôt, à aucun niveau.
* **Preuve.** Recherche de `*.test.ts` dans le dépôt : aucun résultat.
* **Correctif.** Tests unitaires sur les outils (client GraphQL mocké), tests
  d'intégration sur les routes de l'API, tests e2e (Playwright) sur le parcours
  chat + approbation de produit.
* **Critères d'acceptation.**
  1. Chaque outil dispose d'au moins un test couvrant le cas nominal et un cas d'échec.
  2. Le parcours critique (question → appel d'outil → réponse) est couvert par un test e2e.
* **Estimation.** 3 j. **Risque.** Faible.

---

### P5-3 — Intégration continue

* **Problème.** Aucun pipeline CI.
* **Preuve.** Absence de `.github/workflows` pour ce projet.
* **Correctif.** Pipeline GitHub Actions : lint, vérification de types, tests,
  build de l'image Docker, à chaque pull request.
* **Critères d'acceptation.**
  1. Une pull request avec une erreur de type ou un test en échec ne peut pas être fusionnée.
* **Estimation.** 1 j. **Risque.** Faible.

---

### P5-4 — Observabilité

* **Problème.** Logs non structurés, aucune trace des appels d'outils, aucune
  alerte sur les taux d'échec.
* **Preuve.** Utilisation de `console.log`/`console.error` bruts dans `src/api/server.ts`.
* **Correctif.** Logs structurés (JSON), traçage des appels d'outils (nom, durée,
  succès/échec), alerte au-delà d'un taux d'échec seuil sur une fenêtre glissante.
* **Critères d'acceptation.**
  1. Chaque appel d'outil produit une entrée de log structurée exploitable.
  2. Un taux d'échec anormal déclenche une alerte visible par l'équipe.
* **Estimation.** 2 j. **Risque.** Faible.

---

## 9. Ordre recommandé et dépendances

```
Phase 0 (1 j)   ─────────────▶ bloquant, aucune dépendance
Phase 1 (3 j)   ─────────────▶ dépend de Phase 0
Phase 2 (1 sem) ─────────────▶ dépend de Phase 0
Phase 3 (2 sem) ─────────────▶ dépend de Phase 0 + Phase 1
Phase 4 (1 sem) ─────────────▶ dépend de Phase 2 (rendu erreurs/outils)
Phase 5 (1 sem) ─────────────▶ parallélisable avec toutes les phases
```

**Phase 0 est non négociable et tient dans la journée** — sans elle, l'agent ne peut
littéralement rien lire dans la marketplace, et tout travail sur la fluidité ou
l'UX resterait cosmétique.

**Phase 1 est le verrou de commercialisation** — en l'état, `ai.ahizan.com` laisse
n'importe quel visiteur écrire la configuration et consommer le quota des clés API.
Aucune vente ou mise en production visible publiquement ne devrait avoir lieu avant
sa clôture.

Phases 2 à 5 peuvent être planifiées dans l'ordre ci-dessus ou reséquencées selon les
priorités business, sans risque technique bloquant une fois les Phases 0 et 1 closes.

---

*Fin du document.*