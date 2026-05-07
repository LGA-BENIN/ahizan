# Amélioration : Architecture Draft/Habillage du CMS Builder

## Problème actuel

Le CMS Builder modifie les sections directement dans la base de données → le storefront est mis à jour immédiatement. Il n'y a aucun moyen de tester des modifications avant publication. Les habillages sont de simples snapshots sans workflow d'édition.

## Nouvelle architecture

**Principe fondamental : le storefront n'affiche PLUS jamais un état "live" indépendant. Il est TOUJOURS conditionné par un habillage appliqué.**

```
HABILLAGE ACTIF (appliqué sur la page home)
  → C'est ce que le storefront affiche
  → Un seul habillage actif à la fois
       ↑ "Publier" (push du draft vers la page home)
       │
DRAFT (habillage en cours d'édition dans le CMS)
  → Part de l'habillage actif OU d'un autre habillage
  → 1 draft actif par utilisateur (pas global)
  → Les modifications du CMS Builder vont dans le draft
  → Le mode LIVE montre le draft (pas le storefront)
  → Peut être sauvegardé, dupliqué, ou publié
```

## Workflow détaillé

### 1. Ouverture du CMS Builder (onglet Pages)

- Un **draft est créé automatiquement** à partir de l'habillage actuellement actif sur le storefront
- Si aucun habillage actif → draft créé à partir des sections actuelles de la page home
- Si un draft existe déjà pour cet utilisateur → on le reprend
- L'utilisateur commence à modifier dans le CMS → les changements vont dans le **draft** (pas dans la page home)

### 2. Mode LIVE

- L'iframe affiche `/preview?presetId=draft-xxx` → montre le **draft en cours**
- Ce n'est PAS le storefront réel, c'est l'aperçu du draft
- L'utilisateur voit ses modifications en temps réel sans impacter le site

### 3. Changer d'habillage source (dans le draft)

- L'utilisateur peut **charger un autre habillage** comme base du draft
- Exemple : "Je veux modifier l'habillage Noël" → clic sur l'habillage → le draft se recharge avec les sections de cet habillage
- Le LIVE se met à jour pour montrer le draft basé sur ce nouvel habillage
- Les modifications précédentes du draft sont remplacées (ou on propose de sauvegarder avant)

### 4. Modifier le draft section par section

- Chaque éditeur de section (Hero, ProductGrid, TabbedProductGrid, etc.) sauvegarde dans le **draft**
- Le draft est un preset avec un flag `isDraft: true`
- Les sections du draft sont stockées dans `sectionsJson` du preset draft

### 5. Actions disponibles sur le draft

| Action | Description | Confirmation |
|--------|-------------|-------------|
| **🚀 Publier** | Pousse le draft vers la page home → storefront mis à jour | "Publier cet habillage ? Il remplacera la version actuelle du site." |
| **Mettre à jour l'habillage source** | Met à jour l'habillage d'origine avec les modifications du draft (sans publier) | "Vous allez modifier définitivement cet habillage. Continuer ?" |
| **Créer un nouvel habillage** | Crée un nouvel habillage à partir du draft (snapshot) | — |
| **Dupliquer** | Clone le draft comme nouvel habillage indépendant | — |

### 6. Saisons

- Programmation automatique d'un habillage stocké
- Quand une saison s'active → l'habillage associé est **publié** (appliqué à la page home)
- Quand la saison se désactive → l'habillage précédent est restauré
- Gestion des chevauchements via un système de **priorité** (voir ci-dessous)

## Améliorations critiques

### 🔴 1. Gestion du draft par utilisateur (anti-conflits)

**Problème** : Si 2 admins ouvrent le CMS en même temps → écrasement de données, conflits silencieux, perte de travail.

**Solution** : 1 draft actif par utilisateur, pas global.

```
PagePreset (draft) {
  isDraft: true
  draftOwnerId: ID          → référence vers l'utilisateur propriétaire
  draftSessionId: string    → identifiant de session unique
  updatedAt: datetime       → pour détection de stale
}
```

**Règles métier** :
- Chaque admin a son propre draft
- Si un draft est inactif depuis > 24h → auto-archivé
- Optionnel : lock système → "Cette page est en cours d'édition par X" (affiché aux autres admins)

### 🟠 2. Versioning des habillages

**Problème** : Publier = écrase totalement. Impossible de revenir en arrière, dangereux en prod.

**Solution** : Historique des publications.

```
PagePreset {
  version: number           → incrémenté à chaque publication
  publishedAt: datetime     → date de dernière publication
  previousPresetId: ID      → référence vers la version précédente
}
```

**Règles métier** :
- Chaque publication crée un auto-backup (déjà existant) + incrémente la version
- L'historique est consultable : "Version 3 (publiée le 21/04/2026)"
- Possibilité de restaurer une version antérieure (= appliquer un preset archivé)

### 🟠 3. Clarification UX des actions de sauvegarde

**Problème** : "Sauvegarder dans cet habillage" est ambigu → l'utilisateur peut écraser un habillage sans comprendre.

**Solution** : Renommage + confirmation obligatoire.

| Ancien libellé | Nouveau libellé | Confirmation |
|----------------|-----------------|-------------|
| Sauvegarder dans cet habillage | **Mettre à jour l'habillage source** | "Vous allez modifier définitivement cet habillage. Continuer ?" |
| Sauvegarder comme nouvel habillage | **Créer un nouvel habillage** | — |

### 🟡 4. Système de saisons avec priorité

**Problème** : Saisons trop simplifiées. Que se passe-t-il si un admin modifie entre temps ? Si 2 saisons se chevauchent ?

**Solution** : Entité `SeasonSchedule` avec priorité.

```
SeasonSchedule {
  presetId: ID              → habillage associé
  startAt: datetime         → date de début
  endAt: datetime           → date de fin
  priority: number          → priorité (plus élevé = gagne en cas de conflit)
}
```

**Règles métier** :
- Si 2 saisons se chevauchent → celle avec la `priority` la plus haute l'emporte
- Quand une saison s'active → l'habillage associé est publié (appliqué à la page home)
- Quand la saison se désactive → fallback vers l'habillage précédent (ou l'habillage par défaut)
- L'admin peut modifier un habillage de saison → ça met à jour le preset, pas le live (sauf si saison active)

### 🟡 5. Statut sur les presets

**Problème** : Pas de distinction claire entre draft, publié, archivé.

**Solution** : Champ `status` sur PagePreset.

```
PagePreset {
  status: 'draft' | 'published' | 'archived'
}
```

**Règles métier** :
- `draft` → en cours d'édition, pas visible sur le storefront
- `published` → a été publié au moins une fois (peut être réappliqué)
- `archived` → retiré de la liste active, mais conservé pour historique
- Les presets archivés ne sont pas supprimés (versionning)
- L'interface filtre par défaut sur `published`, montre `draft` et `archived` séparément

## Changements techniques nécessaires

### Backend - Entité PagePreset (modifications)

Champs existants à conserver + nouveaux champs :

```
PagePreset {
  // Existant
  id, name, slug, description, sectionsJson, thumbnailUrl, isDefault

  // Nouveaux
  isDraft: boolean              → true si c'est un draft en cours
  draftOwnerId: ID (nullable)   → utilisateur propriétaire du draft
  draftSessionId: string        → session unique du draft
  status: 'draft' | 'published' | 'archived'
  version: number               → incrémenté à chaque publication
  publishedAt: datetime          → date de dernière publication
  previousPresetId: ID (nullable)→ version précédente
  updatedAt: datetime            → mis à jour automatiquement
}
```

### Backend - Entité Page (modifications)

```
Page {
  // Existant
  id, slug, title, sections...

  // Nouveau
  activePresetId: ID (nullable) → référence vers l'habillage actuellement actif
}
```

### Backend - Entité SeasonSchedule (nouvelle)

```
SeasonSchedule {
  id: ID
  presetId: ID                  → habillage associé
  name: string                  → nom de la saison
  startAt: datetime
  endAt: datetime
  priority: number              → priorité en cas de chevauchement
  isActive: boolean             → calculé automatiquement par le cron
}
```

### Backend - Nouvelles mutations et queries

1. `createDraftFromPreset(presetId)` → clone un preset comme draft pour l'utilisateur courant
2. `createDraftFromCurrentPage(pageId)` → snapshot de la page actuelle comme draft
3. `getActiveDraft` → récupère le draft en cours pour l'utilisateur courant
4. `updateDraftSection(draftId, sectionData)` → met à jour une section dans le draft
5. `publishDraft(draftId, pageId)` → applique le draft à la page home + versioning
6. `createPresetFromDraft(draftId, name)` → sauvegarde le draft comme nouvel habillage
7. `updatePresetFromDraft(draftId, presetId)` → met à jour un habillage existant depuis le draft
8. `restorePresetVersion(presetId, version)` → restaure une version antérieure
9. `archivePreset(presetId)` → archive un habillage

### Frontend Dashboard (UniversalBuilder)

1. À l'ouverture du CMS Builder → appeler `createDraftFromCurrentPage` ou récupérer le draft existant
2. Les éditeurs de section sauvegardent dans le **draft** (pas dans la page)
3. `LivePreview` → affiche `/preview?presetId=draftId` au lieu du storefront
4. Ajouter un bouton **"🚀 Publier"** dans la Toolbar
5. Ajouter un sélecteur d'habillage source dans la Toolbar (pour charger un autre habillage dans le draft)
6. Onglet Habillages → "Ouvrir dans l'éditeur" charge l'habillage comme draft
7. Confirmations obligatoires pour "Mettre à jour l'habillage source"
8. Indicateur de lock si un autre admin édite

### Storefront

1. La page home continue de lire ses sections depuis la DB normalement
2. La page `/preview` existe déjà et peut afficher un preset par ID
3. Aucun changement nécessaire côté storefront

## Ordre d'implémentation

### Phase 1 : Backend - Entités et migrations
- Ajouter `isDraft`, `draftOwnerId`, `draftSessionId`, `status`, `version`, `publishedAt`, `previousPresetId`, `updatedAt` sur PagePreset
- Ajouter `activePresetId` sur Page
- Créer l'entité SeasonSchedule
- Générer la migration

### Phase 2 : Backend - Mutations draft
- `createDraftFromPreset`, `createDraftFromCurrentPage`, `getActiveDraft`
- `updateDraftSection` pour modifier les sections dans le draft
- Logique de conversion section → sectionsJson et inversement

### Phase 3 : Backend - Publication et versioning
- `publishDraft` avec auto-backup + incrémentation version
- `createPresetFromDraft`, `updatePresetFromDraft`
- `restorePresetVersion`, `archivePreset`

### Phase 4 : Dashboard - Draft workflow
- Auto-création du draft à l'ouverture (par utilisateur)
- Rediriger les sauvegardes des éditeurs vers le draft
- Bouton Publier dans la Toolbar
- Confirmations UX pour les actions destructives

### Phase 5 : Dashboard - Live Preview du draft
- Modifier LivePreview pour afficher le draft
- Sélecteur d'habillage source dans la Toolbar

### Phase 6 : Dashboard - Habillages intégration
- "Ouvrir dans l'éditeur" depuis l'onglet Habillages
- Créer / Dupliquer un habillage depuis le draft
- Indicateur de lock multi-utilisateurs

### Phase 7 : Saisons avec priorité
- Remplacer la logique actuelle par SeasonSchedule
- Cron job avec gestion des priorités et fallback
