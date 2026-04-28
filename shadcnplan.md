# Plan d'Implémentation — shadcn/ui pour AHIZAN

## Contexte & Objectif

Standardiser et généraliser l'utilisation de **shadcn/ui** comme système de composants UI unique pour les 3 applications du projet AHIZAN :
- **Storefront** (`/Storefront`) — Boutique client (port 3001)
- **Seller Dashboard** (`/seller`) — Backoffice vendeur (port 3002)
- **Superadmin** (`/backend` — Vendure Dashboard v3.5.2) — Admin global (port 3000)

---

## État Actuel Observé

### Ce qui est déjà en place ✅

| Application | Framework | shadcn installé | Composants UI | Tailwind |
|---|---|---|---|---|
| Storefront | Next.js 16 + React 19 | ✅ Oui (`components.json`) | 47 composants | v4 (CSS-first) |
| Seller | Next.js 16 + React 19 | ✅ Oui (`components.json`) | 47 composants | v4 (CSS-first) |
| Superadmin | Vendure Dashboard v3.5.2 + Vite | ❌ Non natif | — | Non utilisé |

Les deux apps Next.js ont donc shadcn/ui **installé mais incomplètement utilisé**.

---

### Problèmes Obsevés

#### 🔴 P1 — Bug critique : body transparent sur Storefront
**Fichier** : `Storefront/src/app/globals.css` — Ligne 120  
```css
/* ACTUEL (bug) */
body { @apply bg-transparent text-foreground; }

/* CORRECT */
body { @apply bg-background text-foreground; }
```
Le background du site est transparent au lieu d'utiliser le token shadcn `--background`. Cela peut provoquer un fond blanc cassé ou transparent selon le contexte.

---

#### 🟠 P2 — Incohérence de thème : tokens brand absents du Storefront
**Fichier** : `Storefront/src/app/globals.css`  
Le Seller possède des tokens de couleur brand qui n'existent pas dans le Storefront :

| Token | Seller | Storefront |
|---|---|---|
| `--brand-navy` | `oklch(0.2 0.05 260)` ≈ `#002f6c` | ❌ Absent |
| `--brand-red` | `oklch(0.6 0.25 25)` ≈ `#e31837` | ❌ Absent |
| `--dashboard-bg` | `oklch(0.98 0.01 260)` | ❌ Absent |

Pourtant `AhizanHome.tsx` utilise massivement les couleurs hardcodées `#002f6c` et `#e31837` en classes Tailwind inline. Ces couleurs **devraient** pointer vers les tokens CSS variables brand.

---

#### 🟠 P3 — Composants shadcn non utilisés (dead code fonctionnel)
Les composants suivants sont installés dans les deux apps mais **jamais importés** dans le code applicatif :

| Composant | Storefront | Seller | Priorité d'utilisation |
|---|---|---|---|
| `chart` | ❌ | ❌ | Revenue chart du Seller (actuellement recharts brut) |
| `table` | ❌ | ❌ | Listes produits, commandes |
| `tabs` | ❌ | ❌ | Pages settings, profil |
| `dialog` | ❌ | ❌* | Modales produits, confirmations |
| `accordion` | ❌ | ❌ | FAQ, filtres avancés |
| `badge` | ❌ | ❌ | Statut commandes, tags produits |
| `avatar` | ❌ | ❌ | Profil vendeur |
| `input` | Partiel | Partiel | Formulaires (utilise `<input>` HTML natif) |
| `calendar` | ❌ | ❌ | Filtres par date |
| `radio-group` | ❌ | ❌ | Options de tri/filtres |

> *Note : `alert-dialog` est utilisé dans `seller/products/create-form.tsx` — seul usage dashboard avancé.

---

#### 🟡 P4 — revenue-chart.tsx utilise recharts directement au lieu de shadcn/chart
**Fichier** : `seller/src/components/dashboard/revenue-chart.tsx`  
```tsx
// ACTUEL — recharts brut, sans théming shadcn
import { BarChart, Bar, XAxis, YAxis, ... } from 'recharts';

// CIBLE — wrapper shadcn avec tokens CSS auto-appliqués
import { ChartContainer, ChartTooltip } from "@/components/ui/chart"
```

---

#### 🟡 P5 — Storefront utilise encore des couleurs hardcodées en HTML inline
**Fichier** : `Storefront/src/components/ahizan/AhizanHome.tsx` (903 lignes)
Des centaines d'occurrences de couleurs codées en dur : `bg-[#002f6c]`, `text-[#e31837]`, `border-[#e31837]/20`, etc. Ces couleurs identiques aux tokens brand du Seller devraient être centralisées.

---

#### 🟡 P6 — Les formulaires n'utilisent pas `<Input>` shadcn
Dans les deux apps, les formulaires utilisent `<input>` HTML natif au lieu du composant `<Input>` shadcn qui respecte le design system. L'`<Input>` shadcn est uniquement référencé via `sidebar.tsx` (usage interne au composant).

---

#### 🟢 P7 — dashboard-layout.tsx du Seller n'importe aucun composant shadcn
`seller/src/components/dashboard/dashboard-layout.tsx` (13 656 octets) implémente le layout du dashboard vendeur sans utiliser les composants shadcn disponibles (sidebar, sheet, etc.), alors que `sidebar.tsx` shadcn est déjà installé.

---

#### ⚠️ P8 — Superadmin Vendure : pas de shadcn natif
Le backend utilise `@vendure/dashboard` v3.5.2 dont le système d'extension UI est basé sur un SDK propriétaire (`vendureDashboardPlugin` via Vite). Shadow/shadcn ne peut pas remplacer l'UI native Vendure. En revanche, pour les **extensions custom** que vous développez, shadcn peut être utilisé.

---

## Plan d'Implémentation

### Phase 1 — Corrections urgentes (Bugs & Cohérence de thème)

#### Action 1.1 — Corriger le fond transparent du Storefront
**Fichier** : `Storefront/src/app/globals.css` — Ligne 120

```css
/* AVANT */
body { @apply bg-transparent text-foreground; }

/* APRÈS */
body { @apply bg-background text-foreground; }
```

---

#### Action 1.2 — Ajouter les tokens brand au Storefront + au `@theme inline`
**Fichier** : `Storefront/src/app/globals.css`

Ajouter dans `@theme inline {}` :
```css
--color-brand-navy: var(--brand-navy);
--color-brand-red: var(--brand-red);
```

Ajouter dans `:root {}` :
```css
--brand-navy: oklch(0.2 0.05 260);   /* #002f6c */
--brand-red: oklch(0.6 0.25 25);     /* #e31837 */
```

Ajouter dans `.dark {}` :
```css
--brand-navy: oklch(0.8 0.05 260);
--brand-red: oklch(0.7 0.15 25);
```

**But** : Permettre l'utilisation de `text-brand-navy`, `bg-brand-red` dans tout le Storefront sans hardcoder les hex.

---

#### Action 1.3 — Vérifier/aligner le `--primary` des deux apps
Les deux apps ont `--primary: oklch(0.208 0.042 265.755)` (bleu neutre shadcn par défaut). Décision à prendre :

> [!IMPORTANT]
> Voulez-vous que `--primary` reste le bleu shadcn ou le remplacer par `--brand-navy` (#002f6c) pour que les boutons principaux soient automatiquement dans la couleur brand Ahizan ? Ce choix affecte tous les `<Button>` shadcn actuels et futurs.

**Option A** — Garder le primary shadcn neutre, utiliser `variant="brand"` custom  
**Option B** — Remplacer `--primary` par la valeur navy : `oklch(0.2 0.05 260)`  
**Option B est recommandée** pour une cohérence parfaite avec la charte graphique Ahizan.

---

### Phase 2 — Intégration shadcn dans le Seller Dashboard

#### Action 2.1 — Migrer revenue-chart.tsx vers shadcn/chart
**Fichier** : `seller/src/components/dashboard/revenue-chart.tsx`

Remplacer l'usage direct de `recharts` par le wrapper `ChartContainer` de shadcn qui applique automatiquement les tokens CSS et la configuration d'accessibilité.

```tsx
// Pattern cible
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts"

const chartConfig = {
  revenue: { label: "Revenu", color: "var(--color-brand-navy)" },
}

return (
  <ChartContainer config={chartConfig} className="h-[200px]">
    <BarChart data={chartData}>
      <CartesianGrid vertical={false} />
      <XAxis dataKey="date" />
      <ChartTooltip content={<ChartTooltipContent />} />
      <Bar dataKey="revenue" fill="var(--color-revenue)" radius={4} />
    </BarChart>
  </ChartContainer>
)
```

---

#### Action 2.2 — Migrer les tableaux produits/commandes vers shadcn/table
**Fichiers concernés** :
- `seller/src/components/dashboard/products/` (ProductListTable)
- `seller/src/app/dashboard/orders/` (liste commandes)

Remplacer les `<div>` custom avec `divide-y` par :
```tsx
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
```

---

#### Action 2.3 — Migrer les badges de statut commandes vers shadcn/badge
**Fichier** : `seller/src/app/dashboard/page.tsx` et pages orders

Remplacer :
```tsx
<span className="text-[9px] font-bold uppercase text-brand-navy bg-brand-navy/5 px-2 py-0.5 rounded-full">{order.state}</span>
```
Par :
```tsx
import { Badge } from "@/components/ui/badge"
<Badge variant="outline">{order.state}</Badge>
```
Créer des variantes custom (`variant="paid"`, `variant="pending"`, etc.) dans `badge.tsx`.

---

#### Action 2.4 — Migrer les stats cards vers shadcn/card
**Fichier** : `seller/src/app/dashboard/page.tsx`

Remplacer les `<div className="bg-card border border-border p-8 rounded-2xl">` custom par :
```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

<Card>
  <CardHeader><CardTitle>{stat.name}</CardTitle></CardHeader>
  <CardContent>{stat.value}</CardContent>
</Card>
```

---

#### Action 2.5 — Migrer les formulaires vers shadcn/input + shadcn/form
**Fichiers** : tous les formulaires dans `seller/src/app/register/`, `seller/src/app/dashboard/settings/`

Remplacer les `<input className="...">` natifs par :
```tsx
import { Input } from "@/components/ui/input"
import { Form, FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form"
```

---

### Phase 3 — Intégration shadcn dans le Storefront

#### Action 3.1 — Migrer AhizanHome.tsx vers les tokens brand
**Fichier** : `Storefront/src/components/ahizan/AhizanHome.tsx`

Remplacer les couleurs hardcodées par les classes Tailwind avec tokens :
- `text-[#002f6c]` → `text-brand-navy`
- `bg-[#002f6c]` → `bg-brand-navy`
- `text-[#e31837]` → `text-brand-red`
- `bg-[#e31837]` → `bg-brand-red`
- `border-[#e31837]` → `border-brand-red`

> [!NOTE]
> AhizanHome.tsx fait 903 lignes. Cette migration doit être faite fichier par fichier, pas en une seule fois. Commencer par les sections Hero et Flash avant les sections secondaires.

---

#### Action 3.2 — Utiliser shadcn/button dans les CTAs du Storefront
Remplacer les `<button className="...bg-[#e31837]...">` par :
```tsx
import { Button } from "@/components/ui/button"
<Button variant="brand">Voir les offres</Button>
```
Ajouter un `variant="brand"` dans `Storefront/src/components/ui/button.tsx`.

---

#### Action 3.3 — Migrer les formulaires Storefront vers shadcn
**Fichiers** : `sign-in/page.tsx`, `register/page.tsx`, `forgot-password/`, `reset-password/`

Standardiser avec `<Input>`, `<Form>`, `<Label>` shadcn au lieu des `<input>` HTML natifs.

---

#### Action 3.4 — Utiliser shadcn/skeleton uniformément
Déjà partiellement utilisé dans `sign-in` et `register`. Étendre aux pages produits, collections, etc. pour uniformiser l'état de chargement.

---

### Phase 4 — Superadmin Vendure Dashboard

> [!IMPORTANT]
> Le `@vendure/dashboard` v3.5.2 ne peut pas être remplacé par shadcn. Il s'agit d'un dashboard React propriétaire géré par Vendure. Vous pouvez uniquement créer des **extensions UI custom** (nouvelles pages, routes, widgets) qui utilisent shadcn.

#### Action 4.1 — Créer un dossier d'extensions UI avec shadcn
**Dossier** : `backend/src/plugins/multivendor/dashboard-extensions/`

Pour chaque extension custom (ex: gestion vendeurs, stats, modération), créer des composants React avec shadcn/ui en installant les dépendances nécessaires côté backend :
```
@radix-ui/react-* (déjà dans backend ?)
tailwindcss (à configurer pour Vite)
```

#### Action 4.2 — Vérifier la compatibilité Vite + Tailwind côté backend
Le `vite.config.mts` du backend ne configure pas Tailwind. Pour pouvoir utiliser shadcn dans les extensions custom, il faudra :
1. Ajouter `@vitejs/plugin-react` ou vérifier si Vendure Dashboard l'inclut déjà
2. Configurer PostCSS + Tailwind v4 côté Vite
3. Tester un premier composant shadcn simple dans une extension

---

## Résumé des Actions par Priorité

| # | Action | Fichier(s) | Effort | Impact |
|---|---|---|---|---|
| 1.1 | Fix body transparent | `Storefront/globals.css` | 2 min | 🔴 Critique |
| 1.2 | Tokens brand Storefront | `Storefront/globals.css` | 10 min | 🟠 Important |
| 1.3 | Aligner --primary sur brand-navy | Les 2 globals.css | 5 min | 🟠 Important |
| 2.1 | revenue-chart → shadcn/chart | `seller/revenue-chart.tsx` | 1h | 🟡 Moyen |
| 2.2 | Tables → shadcn/table | `seller/dashboard/*` | 2h | 🟡 Moyen |
| 2.3 | Badges statut → shadcn/badge | `seller/dashboard/*` | 30 min | 🟡 Moyen |
| 2.4 | Stats cards → shadcn/card | `seller/dashboard/page.tsx` | 30 min | 🟡 Moyen |
| 2.5 | Formulaires → shadcn/form + input | `seller/register/*, settings/*` | 3h | 🟡 Moyen |
| 3.1 | Couleurs AhizanHome → tokens | `Storefront/AhizanHome.tsx` | 2h | 🟡 Moyen |
| 3.2 | Button CTA → shadcn + variant brand | `Storefront/AhizanHome.tsx` | 1h | 🟡 Moyen |
| 3.3 | Formulaires Storefront → shadcn | `Storefront/sign-in, register/*` | 1h | 🟢 Faible |
| 4.1 | Extensions Vendure avec shadcn | `backend/src/plugins/*/dashboard-extensions/` | 4h | 🟢 Faible |

---

## Questions Ouvertes

> [!IMPORTANT]
> **Q1 — Couleur `--primary`** : Voulez-vous que le `--primary` shadcn devienne automatiquement le bleu navy Ahizan (#002f6c) ? Cela change l'apparence de tous les `<Button>` actuels et futurs.

> [!IMPORTANT]  
> **Q2 — Superadmin** : Voulez-vous développer des extensions custom shadcn pour le Vendure Dashboard (gestion vendeurs, stats avancées...) ou rester sur les pages natives Vendure ?

> [!NOTE]
> **Q3 — Ordre des phases** : Préférez-vous commencer par corriger le Storefront (client final) ou par enrichir le Seller Dashboard (backoffice) ?
