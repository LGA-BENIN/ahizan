# 🛠️ Plan d'Amélioration CMS — Cartes Produits Ultra-Denses & Onglets de Navigation

> Objectif : Permettre à la homepage AHIZAN d'atteindre le niveau de densité et d'interactivité visuelle des marketplaces comme Cdiscount/Temu, en s'appuyant sur le CMS Builder existant.

---

## 1. Carte Produit Ultra-Dense (Style Cdiscount / Temu)

### 1.1 État actuel

Le composant `ProductCard` actuel (`Storefront/src/components/commerce/product-card.tsx`) est minimal :
- Image carrée + nom du produit + prix
- Pas de badge de remise, pas de prix barré, pas de bouton panier, pas de tags d'urgence
- Le `ProductCardFragment` (`Storefront/src/lib/vendure/fragments.ts`) ne récupère que : `productId, productName, slug, productAsset, priceWithTax, currencyCode`

Le `CmsProductGrid` (`Storefront/src/components/ahizan/CmsProductGrid.tsx`) est un peu plus avancé (badge ChevronRight, prix en XOF) mais reste basique.

Le `ProductGridSettings` backend propose déjà un champ `cardStyle` (standard/compact/minimal/elevated) mais le storefront ne l'exploite pas complètement.

### 1.2 Modifications côté Storefront

#### A. Enrichir le fragment GraphQL `ProductCardFragment`

**Fichier** : `Storefront/src/lib/vendure/fragments.ts`

Ajouter les champs suivants au fragment existant :

```graphql
fragment ProductCard on SearchResult {
    productId
    productName
    slug
    productAsset {
        id
        preview
    }
    priceWithTax {
        __typename
        ... on PriceRange { min max }
        ... on SinglePrice { value }
    }
    currencyCode
    # --- NOUVEAUX CHAMPS ---
    description                # Pour résumé produit
    collectionIds              # IDs des collections (pas de slugs sur SearchResult)
    facetValueIds              # IDs des facet values (pour badges tags)
    inStock                    # Pour indicateur de stock
    # Pour le prix barré (prix original avant remise)
    # Vendure expose priceWithTax comme prix actuel.
    # Il faut comparer avec le prix de la variante par défaut sans promotion.
}
```

> ⚠️ **Note importante sur les badges** : `SearchResult` de Vendure n'expose PAS les objets facet values imbriqués (`facetValues { name code }`), seulement les IDs bruts (`facetValueIds: [ID!]`). Pour afficher les badges "Nouveau", "Promo", "Flash" dans la `DenseProductCard`, il faut :
> - **Option A (recommandée)** : Charger une map de référence `facetValueId → { name, code }` côté client au démarrage de l'app (via `cmsFacetValues` déjà disponible), puis résoudre les IDs du produit côté client
> - **Option B** : Enrichir le `SearchResult` via un custom Vendure Search Plugin qui ajoute les facet values résolues
> - **Option C** : Faire un fetch supplémentaire par produit (non recommandé pour la performance)
>
> ⚠️ **Note** : `collectionSlugs` n'existe pas sur `SearchResult` — seul `collectionIds` est disponible. Pour afficher le nom de la collection, il faudra résoudre les IDs via une query séparée ou une map côté client.
```

> ⚠️ **Note** : Le prix barré (ancien prix avant promo) nécessite un custom field `compareAtPrice` sur `ProductVariant` (voir Phase 3). Vendure ne fournit pas de champ natif pour le prix de comparaison dans `SearchResult`.

#### B. Créer une variante `DenseProductCard` (composant nouveau)

**Fichier à créer** : `Storefront/src/components/commerce/dense-product-card.tsx`

Ce composant sera utilisé par `CmsProductGrid` et `FeaturedProducts` quand `cardStyle === 'dense'`.

Caractéristiques visuelles à implémenter (inspirées Cdiscount/Temu) :

| Élément | Description | Composant shadcn/ui |
|---|---|---|
| **Badge urgence** | Tag rouge "🔥 FLASH" ou "-50%" en overlay sur l'image | `Badge` variant `destructive` |
| **Prix barré** | Ancien prix en gris barré au-dessus du prix actuel | `<span className="line-through text-muted-foreground text-xs">` |
| **Prix actuel** | Gros, gras, couleur primaire | Existant `Price` component |
| **Bouton panier flottant** | Icône panier ronde en bas à droite de l'image, visible au hover | `Button` variant `outline` size `icon` + `ShoppingCart` lucide |
| **Mini-étoiles/avis** | Petite rangée d'étoiles sous le nom (si données dispo) | `Star` lucide icons |
| **Tag "Nouveau"** | Badge vert sous l'image si facet "Nouveau" | `Badge` variant `secondary` |
| **Indicateur stock** | "Plus que 3 !" en texte rouge petit | Texte custom |
| **Image ratio** | Ratio 4:3 au lieu de 1:1 pour plus de densité | `aspect-[4/3]` |
| **Padding réduit** | Espacement très serré (p-2 au lieu de p-4) | Tailwind |

Structure JSX cible :
```tsx
<Link className="group bg-white rounded-lg border overflow-hidden hover:shadow-md">
  <div className="aspect-[4/3] relative bg-muted">
    <Image ... />
    {/* Badge urgence overlay */}
    <Badge className="absolute top-1 left-1" variant="destructive">-50%</Badge>
    {/* Bouton panier flottant */}
    <Button size="icon" variant="outline"
      className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7">
      <ShoppingCart className="h-3.5 w-3.5" />
    </Button>
  </div>
  <div className="p-2 space-y-1">
    <h3 className="text-xs font-semibold line-clamp-2">{product.productName}</h3>
    {/* Prix barré + prix actuel */}
    <div className="flex items-baseline gap-1.5">
      <span className="line-through text-[10px] text-muted-foreground">{oldPrice} FCFA</span>
      <span className="font-black text-sm text-primary">{currentPrice} FCFA</span>
    </div>
    {/* Mini badges bas */}
    <div className="flex gap-1">
      {isFlash && <Badge variant="destructive" className="text-[9px] px-1 py-0">FLASH</Badge>}
      {isNew && <Badge variant="secondary" className="text-[9px] px-1 py-0">Nouveau</Badge>}
    </div>
  </div>
</Link>
```

#### C. Mettre à jour `CmsProductGrid` pour supporter `cardStyle: 'dense'`

**Fichier** : `Storefront/src/components/ahizan/CmsProductGrid.tsx`

- Ajouter l'import de `DenseProductCard`
- Dans le rendu de la grille, brancher selon `config.cardStyle` :
  ```tsx
  {config.cardStyle === 'dense' ? (
    <DenseProductCard product={p} />
  ) : (
    // ... carte actuelle
  )}
  ```
- Ajouter le support de `columns: 5` (grille 5 colonnes très dense comme Cdiscount)

#### D. Mettre à jour `FeaturedProducts` pour supporter `cardStyle: 'dense'`

**Fichier** : `Storefront/src/components/commerce/featured-products.tsx`

Même logique : quand `layout === 'grid'` et `cardStyle === 'dense'`, utiliser `DenseProductCard` au lieu du `<Link>` custom actuel.

#### E. Ajouter le support du prix barré dans le fragment de recherche

**Fichier** : `Storefront/src/lib/vendure/queries.ts` (ou fichier de queries existant)

Vérifier si la query `SearchProductsQuery` peut être étendue pour inclure :
- Les facet values du produit (pour détecter les tags "Promo", "Nouveau", "Flash")
- Le prix de la variante la moins chère vs prix "original"

Si Vendure ne fournit pas de `compareAtPrice`, alternative :
- Utiliser un custom field `compareAtPrice` sur `ProductVariant`
- Ou stocker la remise en pourcentage dans les facet values

---

### 1.3 Modifications côté Backend (CMS Builder)

#### A. Enrichir `ProductGridSettings` avec les options de carte dense

**Fichier** : `backend/src/plugins/cms/dashboard/UniversalBuilder/components/sections/ProductGridSettings.tsx`

Ajouter dans les defaults et l'UI :

```typescript
// Nouveaux champs à ajouter aux defaults :
showDiscountBadge: true,       // Badge "-50%" sur l'image
showStrikethroughPrice: true,  // Prix barré
showAddToCartButton: true,     // Bouton panier flottant
showStockIndicator: false,     // "Plus que X !"
showNewBadge: true,            // Badge "Nouveau"
imageRatio: '1:1',             // '1:1' | '4:3' | '16:9'
```

Ajouter un nouveau choix dans le select `cardStyle` :
```html
<option value="dense">Dense (Style Marketplace)</option>
```

Ajouter une section "Options Carte Dense" conditionnelle :
```tsx
{config.cardStyle === 'dense' && (
  <div className="settings-card">
    <div className="settings-card-header">🏪 Options Carte Dense</div>
    <div className="grid-3">
      <div className="toggle-row">
        <label><input type="checkbox" checked={config.showDiscountBadge} onChange={...} /> Badge de remise</label>
      </div>
      <div className="toggle-row">
        <label><input type="checkbox" checked={config.showStrikethroughPrice} onChange={...} /> Prix barré</label>
      </div>
      <div className="toggle-row">
        <label><input type="checkbox" checked={config.showAddToCartButton} onChange={...} /> Bouton panier flottant</label>
      </div>
    </div>
    <div className="grid-2" style={{ marginTop: '1rem' }}>
      <div>
        <label className="label-pro">Ratio d'image</label>
        <select className="input-pro" value={config.imageRatio} onChange={...}>
          <option value="1:1">Carré (1:1)</option>
          <option value="4:3">Standard (4:3)</option>
          <option value="16:9">Panoramique (16:9)</option>
        </select>
      </div>
      <div className="toggle-row">
        <label><input type="checkbox" checked={config.showStockIndicator} onChange={...} /> Indicateur de stock</label>
      </div>
    </div>
  </div>
)}
```

Ajouter aussi le choix `5` colonnes (pour la grille ultra-dense) :
```html
<option value={5}>5 Colonnes (Ultra-dense)</option>
```

#### B. Ajouter `compareAtPrice` comme custom field Vendure (optionnel, pour prix barré)

**Fichier** : `backend/src/plugins/cms/cms.plugin.ts` ou un fichier de config Vendure

Si on veut un vrai prix barré, ajouter un custom field sur `ProductVariant` :
```typescript
customFields: {
    ProductVariant: [
        { name: 'compareAtPrice', type: 'int', nullable: true,
          description: 'Prix de comparaison (prix barré) en centimes' },
    ],
},
```

Puis exposer ce champ dans le fragment GraphQL storefront.

---

## 2. Onglets de Navigation dans les Sections Produits

### 2.1 État actuel

- Le type de section `PRODUCT_GRID` existe dans le `section-registry.tsx` et est mappé à `FeaturedProducts`
- `FeaturedProducts` supporte un seul `filterType` (LATEST / BEST_SELLERS / COLLECTION) par instance
- `ProductGridSettings` permet de configurer une seule source de produits par section
- Il n'y a **aucun mécanisme d'onglets** dans le CMS ou le storefront

### 2.2 Modifications côté Backend (CMS Builder)

#### A. Créer un nouveau type de section `TABBED_PRODUCT_GRID` + corriger `PRODUCT_GRID` manquant

**Fichier** : `backend/src/plugins/cms/dashboard/UniversalBuilder/components/Sidebar.tsx`

> ⚠️ **Bug existant** : `PRODUCT_GRID` n'est PAS dans le `ZONE_MAP` actuel, donc les sections `PRODUCT_GRID` créées par `initializeHomePage` n'apparaissent pas dans la sidebar du builder. Et le `SectionEditorFactory` n'a pas de case pour ce type, donc l'admin tombe sur "Pas d'éditeur graphique". Or `ProductGridSettings.tsx` existe déjà !

Ajouter dans le `ZONE_MAP` (zone 'Corps') :
```typescript
{
    zone: 'Corps',
    items: [
        { type: 'FLASH_DEALS', icon: '⚡', label: 'Campagnes Flash', mode: 'multi' },
        { type: 'QUICK_LINKS', icon: '🏷️', label: 'Liens Rapides et Bannières', mode: 'multi' },
        { type: 'CATEGORIES', icon: '', label: 'Catégories', mode: 'multi' },
        { type: 'PRODUCT_GRID', icon: '�️', label: 'Grille de Produits', mode: 'multi' },           // ← BUG EXISTANT À CORRIGER
        { type: 'TABBED_PRODUCT_GRID', icon: '📑', label: 'Grille avec Onglets', mode: 'multi' },  // ← NOUVEAU
    ]
},
```

**Fichier** : `backend/src/plugins/cms/dashboard/UniversalBuilder/components/SectionEditorFactory.tsx`

Ajouter le case manquant pour `PRODUCT_GRID` :
```typescript
import { ProductGridSettings } from './sections/ProductGridSettings';

// Dans le switch/case :
case 'PRODUCT_GRID':
    return withCodePanel(<ProductGridSettings data={data} onSave={handleSave} />);

case 'TABBED_PRODUCT_GRID':
    return withCodePanel(<TabbedProductGridSettings data={data} onSave={handleSave} />);
```

#### B. Créer l'éditeur visuel `TabbedProductGridSettings`

**Fichier à créer** : `backend/src/plugins/cms/dashboard/UniversalBuilder/components/sections/TabbedProductGridSettings.tsx`

Structure du `dataJson` pour cette section :
```json
{
  "title": "Nos Produits",
  "layout": "grid",
  "columns": 5,
  "cardStyle": "dense",
  "tabs": [
    {
      "id": "tab-1",
      "label": "Meilleures Ventes",
      "icon": "🔥",
      "filterType": "BEST_SELLERS",
      "collectionSlug": "",
      "facetValueIds": [],
      "take": 10
    },
    {
      "id": "tab-2",
      "label": "Nouveautés",
      "icon": "✨",
      "filterType": "LATEST",
      "collectionSlug": "",
      "facetValueIds": [],
      "take": 10
    },
    {
      "id": "tab-3",
      "label": "Promotions",
      "icon": "🏷️",
      "filterType": "COLLECTION",
      "collectionSlug": "promotions",
      "facetValueIds": [],
      "take": 10
    }
  ],
  "defaultTabIndex": 0,
  "tabStyle": "pill",       // 'pill' | 'underline' | 'boxed'
  "tabColor": "#0f172a",
  "tabActiveColor": "#e31837"
}
```

L'éditeur visuel doit permettre :
- D'ajouter/supprimer/réordonner des onglets
- Pour chaque onglet : configurer le label, l'icône, la source de produits (identique à ProductGridSettings)
- De choisir le style visuel des onglets (pill, underline, boxed)
- De choisir le style de carte (standard, dense, etc.)
- De configurer le nombre de colonnes

#### C. Enregistrer les types dans `SectionEditorFactory`

*(Déjà couvert dans la section A ci-dessus — les deux cases `PRODUCT_GRID` et `TABBED_PRODUCT_GRID` sont à ajouter ensemble)*

### 2.3 Modifications côté Storefront

#### A. Créer le composant `TabbedProductGrid`

**Fichier à créer** : `Storefront/src/components/cms/tabbed-product-grid.tsx`

```tsx
"use client";

import { useState, useEffect } from "react";
import { DenseProductCard } from "@/components/commerce/dense-product-card";
import { Badge } from "@/components/ui/badge";

interface TabConfig {
    id: string;
    label: string;
    icon?: string;
    filterType: string;
    collectionSlug?: string;
    facetValueIds?: string[];
    take: number;
}

interface TabbedProductGridProps {
    title?: string;
    layout?: string;
    columns?: number;
    cardStyle?: string;
    tabs: TabConfig[];
    defaultTabIndex?: number;
    tabStyle?: 'pill' | 'underline' | 'boxed';
    tabColor?: string;
    tabActiveColor?: string;
}

export function TabbedProductGrid(props: TabbedProductGridProps) {
    const [activeTab, setActiveTab] = useState(props.defaultTabIndex || 0);
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const currentTab = props.tabs?.[activeTab];

    useEffect(() => {
        if (!currentTab) return;
        // Fetch products based on currentTab.filterType / collectionSlug / facetValueIds
        // (Même logique que CmsProductGrid mais paramétrée par l'onglet actif)
    }, [activeTab, currentTab]);

    return (
        <section className="container mx-auto px-4 py-8">
            {props.title && <h2 className="text-2xl font-black mb-6">{props.title}</h2>}

            {/* Onglets */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                {props.tabs.map((tab, idx) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(idx)}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all
                            ${idx === activeTab
                                ? 'bg-primary text-white shadow-md'
                                : 'bg-muted text-muted-foreground hover:bg-muted/80'
                            }`}
                    >
                        {tab.icon && <span>{tab.icon}</span>}
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Grille de produits */}
            <div className={`grid gap-3 ${
                props.columns === 5 ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-5' :
                props.columns === 6 ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-6' :
                'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
            }`}>
                {loading ? (
                    // Skeletons
                ) : products.map(p => (
                    props.cardStyle === 'dense'
                        ? <DenseProductCard key={p.productId} product={p} />
                        : <ProductCard key={p.productId} product={p} />
                ))}
            </div>
        </section>
    );
}
```

#### B. Enregistrer dans le `section-registry`

**Fichier** : `Storefront/src/components/cms/section-registry.tsx`

```typescript
import { TabbedProductGrid } from '@/components/cms/tabbed-product-grid';

// Ajouter dans sectionRegistry :
'TABBED_PRODUCT_GRID': TabbedProductGrid,
```

#### C. Ajouter le case dans `BodySectionRenderer`

**Fichier** : `Storefront/src/components/ahizan/BodySectionRenderer.tsx`

```typescript
case 'TABBED_PRODUCT_GRID': {
    if (!config.tabs || config.tabs.length === 0) return null;
    return (
        <section className={`${wrapper} mt-8 md:mt-10`}>
            <TabbedProductGrid {...config} />
        </section>
    );
}
```

---

## 3. Récapitulatif des Fichiers à Modifier / Créer

### 🆕 Fichiers à CRÉER

| Fichier | Côté | Description |
|---|---|---|
| `Storefront/src/components/commerce/dense-product-card.tsx` | Storefront | Carte produit ultra-dense style marketplace |
| `Storefront/src/components/cms/tabbed-product-grid.tsx` | Storefront | Section produits avec onglets de navigation |
| `backend/src/plugins/cms/dashboard/UniversalBuilder/components/sections/TabbedProductGridSettings.tsx` | Backend | Éditeur visuel pour la section onglets |

### ✏️ Fichiers à MODIFIER

| Fichier | Côté | Modification |
|---|---|---|
| `Storefront/src/lib/vendure/fragments.ts` | Storefront | Ajouter `facetValueIds`, `collectionIds`, `description`, `inStock` au `ProductCardFragment` |
| `Storefront/src/components/ahizan/CmsProductGrid.tsx` | Storefront | Brancher `DenseProductCard` quand `cardStyle === 'dense'`, ajouter colonne 5 |
| `Storefront/src/components/commerce/featured-products.tsx` | Storefront | Brancher `DenseProductCard` quand `cardStyle === 'dense'` |
| `Storefront/src/components/cms/section-registry.tsx` | Storefront | Ajouter `'TABBED_PRODUCT_GRID': TabbedProductGrid` |
| `Storefront/src/components/ahizan/BodySectionRenderer.tsx` | Storefront | Ajouter case `TABBED_PRODUCT_GRID` |
| `backend/.../Sidebar.tsx` | Backend | Ajouter `PRODUCT_GRID` (bug existant) + `TABBED_PRODUCT_GRID` dans `ZONE_MAP` |
| `backend/.../SectionEditorFactory.tsx` | Backend | Ajouter case `PRODUCT_GRID` (bug existant) + case `TABBED_PRODUCT_GRID` |
| `backend/.../ProductGridSettings.tsx` | Backend | Ajouter `cardStyle: 'dense'`, options carte dense, colonne 5 |

### 🔧 Optionnel (Prix barré réel)

| Fichier | Côté | Modification |
|---|---|---|
| Config Vendure (customFields) | Backend | Ajouter `compareAtPrice` sur `ProductVariant` |
| `Storefront/src/lib/vendure/fragments.ts` | Storefront | Ajouter `compareAtPrice` au fragment si custom field créé |

---

## 4. Ordre d'Implémentation Recommandé

1. **Phase 1 — DenseProductCard** (Storefront uniquement)
   - Créer `dense-product-card.tsx`
   - Mettre à jour `CmsProductGrid.tsx` pour le brancher
   - Mettre à jour `ProductGridSettings.tsx` pour ajouter l'option "dense"
   - → Résultat immédiat : cartes produits denses disponibles via le CMS

2. **Phase 2 — Onglets Produits** (Backend + Storefront)
   - Créer `TabbedProductGridSettings.tsx` côté backend
   - Ajouter `TABBED_PRODUCT_GRID` dans Sidebar + SectionEditorFactory
   - Créer `tabbed-product-grid.tsx` côté storefront
   - Enregistrer dans section-registry + BodySectionRenderer
   - → Résultat : sections avec onglets configurables depuis le CMS

3. **Phase 3 — Prix barré** (Backend custom field)
   - Ajouter `compareAtPrice` custom field sur ProductVariant
   - Mettre à jour le fragment GraphQL
   - Mettre à jour `DenseProductCard` pour afficher le prix barré
   - → Résultat : prix barrés réels basés sur les données produit

---

## 5. Système d'Habillage (Presets enrichis + Saisons automatisées)

### 5.1 Concept

Un **Habillage** est un thème visuel complet du site : toutes les sections CMS + les couleurs globales + le logo + les bannières. On peut en créer plusieurs (Par défaut, Noël, Pâques, Soldes...), les prévisualiser avant application, les appliquer manuellement en 1 clic, ou les programmer pour activation/désactivation automatique selon des dates.

### 5.2 État actuel vs Ce qu'on veut

| Élément existant | Fait | Manque |
|---|---|---|
| `PagePreset` | Stocke un snapshot de sections | ❌ Pas les overrides globaux (logo, couleurs thème) |
| `SiteSeason` | Dates + activation + lien preset | ❌ Le preset lié n'est JAMAIS appliqué automatiquement |
| `configJson` sur Season | Prévu pour overrides visuels | ❌ Jamais consommé par le storefront |
| `findOneBySlug()` | Résout `noel-home` si saison active | ❌ Trop complexe — oblige à créer des pages séparées |
| SeasonManager UI | Interface basique pour saisons | ❌ Pas de preview, pas de lien presets |
| Permissions | `@Allow(Permission.Public)` | ❌ Pas de contrôle d'accès |

### 5.3 Modifications côté Backend

#### A. Enrichir l'entité `PagePreset`

**Fichier** : `backend/src/plugins/cms/entities/page-preset.entity.ts`

```typescript
// Champ à ajouter :
@Column({ default: false })
isDefault: boolean;           // Habillage par défaut (non supprimable)
```

> Note : Le champ `isBuiltIn` existe déjà. On peut l'utiliser pour `isDefault` ou le renommer.

> ⚠️ **Pas besoin de `themeOverridesJson`** : Les overrides visuels (couleurs, logo, favicon) sont déjà naturellement gérés par les sections `THEME_SETTINGS` et `HEADER_CONF` qui font partie du `sectionsJson` du preset. Quand on applique un preset, ces sections sont recrées avec leurs configurations. Ajouter un champ séparé créerait une duplication et des incohérences.

#### B. Auto-backup avant application

**Fichier** : `backend/src/plugins/cms/service/cms.service.ts`

Modifier `applyPreset` pour sauvegarder automatiquement l'état actuel avant d'écraser :

```typescript
async applyPreset(ctx, presetId, pageId) {
    // 0. Charger le preset (OBLIGATOIRE — manquant dans la version précédente du plan)
    const preset = await this.connection.getEntityOrThrow(ctx, PagePreset, presetId);

    // 1. AUTO-BACKUP : sauvegarder l'état actuel AVANT d'écraser
    const currentPage = await this.findOne(ctx, pageId);
    if (currentPage && currentPage.sections?.length > 0) {
        await this.savePageAsPreset(ctx, pageId,
            `auto-backup-${Date.now()}`, 'Sauvegarde automatique avant changement d\'habillage');
    }

    // 2. Appliquer le preset (logique existante)
    await this.clearPageSections(ctx, pageId);
    const sections = JSON.parse(preset.sectionsJson);
    for (const sectionData of sections) {
        await this.createSection(ctx, {
            pageId,
            type: sectionData.type,
            title: sectionData.title || '',
            description: sectionData.description || '',
            layout: sectionData.layout || 'grid',
            order: sectionData.order || 0,
            isActive: sectionData.isActive !== false,
            dataJson: typeof sectionData.dataJson === 'string' ? sectionData.dataJson : JSON.stringify(sectionData.dataJson || {}),
        });
    }

    // Note : Pas besoin de themeOverridesJson séparé — les sections THEME_SETTINGS
    // et HEADER_CONF du preset contiennent déjà les couleurs, logo, etc.

    return this.findOne(ctx, pageId);
}
```

#### C. Validation du contenu des presets

**Fichier** : `backend/src/plugins/cms/service/cms.service.ts`

Ajouter une validation dans `createPreset` et `updatePreset` :

```typescript
private validatePresetData(input: any): void {
    // sectionsJson doit être un tableau JSON valide
    if (input.sectionsJson) {
        let parsed;
        try { parsed = JSON.parse(input.sectionsJson); } catch { throw new Error('sectionsJson invalide'); }
        if (!Array.isArray(parsed)) throw new Error('sectionsJson doit être un tableau');
        // Chaque section doit avoir un type valide
        const validTypes = ['THEME_SETTINGS','HEADER_CONF','HERO','FLASH_DEALS','QUICK_LINKS',
            'CATEGORIES','CATEGORY_GRID','PRODUCT_GRID','FOOTER_CONF','FEATURES','MODALS',
            'CUSTOM','BLOG_POSTS','TESTIMONIALS','NEWSLETTER','CTA_VENDOR'];
        for (const s of parsed) {
            if (!s.type || !validTypes.includes(s.type)) throw new Error(`Type de section invalide: ${s.type}`);
        }
    }
    // Taille max : 2MB
    if (input.sectionsJson && input.sectionsJson.length > 2 * 1024 * 1024) {
        throw new Error('Preset trop volumineux (max 2MB)');
    }
}
```

#### D. Protection de l'habillage par défaut

**Fichier** : `backend/src/plugins/cms/service/cms.service.ts`

```typescript
async deletePreset(ctx, id) {
    const preset = await this.connection.getEntityOrThrow(ctx, PagePreset, id);
    if (preset.isDefault) throw new Error('Impossible de supprimer l\'habillage par défaut');
    await this.connection.getRepository(ctx, PagePreset).remove(preset);
    return { result: 'DELETED' as any };
}
```

#### E. Permissions correctes

**Fichier** : `backend/src/plugins/cms/api/cms.resolver.ts`

Remplacer tous les `@Allow(Permission.Public)` sur les mutations preset par :
```typescript
@Allow(Permission.SuperAdmin)  // ou un custom permission CmsManagement
```

#### F. Auto-activation/désactivation des saisons (via Cron Job)

**Fichier** : `backend/src/plugins/cms/service/cms.service.ts`

> ⚠️ **NE PAS appeler `checkSeasonState` à chaque requête shop** — cela créerait un goulot d'étranglement (2+ requêtes SQL + potentiellement N mutations par visiteur). Utiliser un cron job à la place.

Ajouter une méthode de vérification appelée par un **cron job** toutes les 5 minutes :

```typescript
// Cache mémoire pour éviter les vérifications inutiles
private lastSeasonCheck: number = 0;
private readonly SEASON_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes

async checkSeasonState(ctx: RequestContext): Promise<void> {
    // Vérifier le cache — ne pas re-vérifier si moins de 5 min se sont écoulées
    const now = Date.now();
    if (now - this.lastSeasonCheck < this.SEASON_CHECK_INTERVAL) return;
    this.lastSeasonCheck = now;

    // 1. Désactiver les saisons expirées
    const activeSeasons = await this.connection.getRepository(ctx, SiteSeason)
        .find({ where: { isActive: true }, relations: ['preset'] });

    for (const season of activeSeasons) {
        if (season.endDate && new Date(season.endDate) < new Date()) {
            season.isActive = false;
            await this.connection.getRepository(ctx, SiteSeason).save(season);

            // Réappliquer l'habillage par défaut sur la page home
            const defaultPreset = await this.connection.getRepository(ctx, PagePreset)
                .findOne({ where: { isDefault: true } });
            if (defaultPreset) {
                const homePage = await this.connection.getRepository(ctx, Page)
                    .findOne({ where: { slug: 'home' } });
                if (homePage) await this.applyPreset(ctx, defaultPreset.id, homePage.id);
            }
        }
    }

    // 2. Activer les saisons dont la date de début est atteinte
    const inactiveSeasons = await this.connection.getRepository(ctx, SiteSeason)
        .find({ where: { isActive: false }, relations: ['preset'] });

    for (const season of inactiveSeasons) {
        if (season.startDate && new Date(season.startDate) <= now
            && (!season.endDate || new Date(season.endDate) >= now)) {
            season.isActive = true;
            await this.connection.getRepository(ctx, SiteSeason).save(season);

            // Appliquer l'habillage de la saison
            if (season.preset) {
                const homePage = await this.connection.getRepository(ctx, Page)
                    .findOne({ where: { slug: 'home' } });
                if (homePage) await this.applyPreset(ctx, season.preset.id, homePage.id);
            }
        }
    }
}
```

**Enregistrer le cron job dans le plugin** :

**Fichier** : `backend/src/plugins/cms/cms.plugin.ts`

```typescript
import { JobQueueService } from '@vendure/core';

// Dans la méthode onBootstrap du plugin :
async onBootstrap(injector) {
    const jobQueueService = injector.get(JobQueueService);
    // Vérifier les saisons toutes les 5 minutes
    setInterval(async () => {
        const ctx = RequestContext.create();
        await this.cmsService.checkSeasonState(ctx);
    }, 5 * 60 * 1000);
}
```

> Alternative : Utiliser le `JobQueue` de Vendure pour un job récurrent, ou un simple `setInterval` au bootstrap du plugin.

> ⚠️ Simplification : Avec ce système, on n'a PLUS BESOIN de la logique de slug `noel-home`. L'habillage est appliqué DIRECTEMENT sur la page `home`. Quand la saison finit, l'habillage par défaut est réappliqué sur `home`. Le storefront charge toujours `home` — c'est le contenu qui change.

#### G. Endpoint de preview

**Fichier** : `backend/src/plugins/cms/api/api-extensions.ts`

Ajouter dans l'**Admin API** (pas le shop API — pour éviter d'exposer les presets non publiés au public) :
```graphql
extend type Query {
    previewPreset(presetId: ID!): Page
}
```

> ⚠️ **Sécurité** : Ne PAS mettre `previewPreset` dans le Shop API avec `@Allow(Permission.Public)`. Cela exposerait tous les presets (y compris non publiés) à n'importe quel visiteur. Le mettre dans l'Admin API avec `@Allow(Permission.SuperAdmin)`.

**Fichier** : `backend/src/plugins/cms/api/cms.resolver.ts` (AdminResolver)

```typescript
@Query()
@Allow(Permission.SuperAdmin)
async previewPreset(@Ctx() ctx: RequestContext, @Args() args: { presetId: ID }): Promise<Page | null> {
    // Retourne une "page virtuelle" construite à partir du preset
    // sans modifier la page réelle
    const preset = await this.connection.getEntityOrThrow(ctx, PagePreset, args.presetId);
    const homePage = await this.cmsService.findOneBySlug(ctx, 'home');

    // Construire une page temporaire avec les sections du preset
    const sections = JSON.parse(preset.sectionsJson).map((s: any) => ({
        ...s,
        id: `preview-${s.type}-${s.order}`,
        dataJson: typeof s.dataJson === 'string' ? s.dataJson : JSON.stringify(s.dataJson || {})
    }));

    return {
        ...homePage,
        sections,
    } as Page;
}
```

> Note : Le preview côté storefront (`/preview?habillage=X`) appellera l'Admin API (avec les credentials de session de l'admin) plutôt que le Shop API.

### 5.4 Modifications côté Storefront

#### A. Route de prévisualisation

**Fichier à créer** : `Storefront/src/app/preview/page.tsx`

```tsx
// Page accessible uniquement via le back-office
// URL: /preview?habillage=PRESET_ID
// Affiche le storefront avec les sections du preset sélectionné
// + bandeau "MODE PRÉVISUALISATION" en haut
```

Cette page :
1. Récupère le `presetId` depuis `searchParams`
2. Appelle `previewPreset(presetId)` via GraphQL
3. Rend exactement comme `AhizanHome` mais avec les sections du preset
4. Affiche un bandeau fixe en haut : "👁️ PRÉVISUALISATION — Habillage Noël — [Appliquer] [Fermer]"

#### B. Simplifier `findOneBySlug` — retirer la logique de slug saisonnier

**Fichier** : `backend/src/plugins/cms/service/cms.service.ts`

Puisque l'habillage est maintenant appliqué DIRECTEMENT sur la page `home`, la logique de résolution de slug `noel-home` n'est plus nécessaire. Simplifier :

```typescript
async findOneBySlug(ctx, slug) {
    // Plus besoin de chercher noel-home — l'habillage est sur home directement
    return this.connection.getRepository(ctx, Page).findOne({
        where: { slug, isActive: true },
        relations: ['sections'],
    });
}
```

### 5.5 Modifications côté Dashboard (UI)

#### A. Ajouter un 3ème onglet "Habillages"

**Fichier** : `backend/src/plugins/cms/dashboard/UniversalBuilder/UniversalBuilder.tsx`

```tsx
const [activeTab, setActiveTab] = useState<'PAGES' | 'SEASONS' | 'HABILLAGES'>('PAGES');

// Ajouter le bouton d'onglet :
<button onClick={() => setActiveTab('HABILLAGES')} ...>
    Habillages
</button>

// Ajouter le contenu :
{activeTab === 'HABILLAGES' && <HabillageManager />}
```

#### B. Créer le composant `HabillageManager`

**Fichier à créer** : `backend/src/plugins/cms/dashboard/views/HabillageManager.tsx`

Interface avec :

1. **Grille d'habillages** — Cartes avec thumbnail, nom, statut (Actif/Planifié/Inactif)
2. **Bouton "💾 Sauvegarder l'actuel"** — Crée un habillage depuis la page home actuelle
3. **Bouton "+ Nouvel habillage"** — Crée un habillage vide ou duplique un existant
4. **Sur chaque carte** :
   - 👁️ **Prévisualiser** → Ouvre `/preview?habillage=X` dans un nouvel onglet
   - ✅ **Appliquer maintenant** → Applique l'habillage (avec confirmation + auto-backup)
   - 📅 **Programmer** → Popup dates → crée une Season liée
   - ✏️ **Modifier** → Ouvre l'éditeur de sections du preset (comme l'éditeur de page)
   - 🗑️ **Supprimer** (sauf si `isDefault`)

5. **Formulaire de création** :
   - Nom de l'habillage
   - Description
   - Thumbnail (upload d'image)
   - Sections : copie de la page actuelle ou sélection d'un preset existant comme base

#### C. Ajouter les queries GraphQL dans queries.ts

**Fichier** : `backend/src/plugins/cms/dashboard/queries.ts`

```graphql
# Query LÉGÈRE — pour la liste des habillages (sans sectionsJson qui peut faire des centaines de KB)
query GetPresetsLight { 
    pagePresets { 
        id 
        name 
        description 
        thumbnail 
        isDefault 
        isBuiltIn 
        createdAt 
        updatedAt 
    } 
}

# Query COMPLÈTE — pour charger un preset spécifique (avant application ou édition)
query GetPresetDetail($id: ID!) {
    pagePresets {
        id
        name
        sectionsJson
    }
}

mutation SavePageAsPreset($pageId: ID!, $name: String!, $description: String) { savePageAsPreset(pageId: $pageId, name: $name, description: $description) { id name } }

mutation ApplyPreset($presetId: ID!, $pageId: ID!) { applyPreset(presetId: $presetId, pageId: $pageId) { id slug } }

mutation DeletePreset($id: ID!) { deletePreset(id: $id) { result } }

mutation UpdatePreset($input: UpdatePresetInput!) { updatePreset(input: $input) { id name } }
```

> ⚠️ **Performance** : Ne JAMAIS récupérer `sectionsJson` pour tous les presets d'un coup. Chaque preset peut contenir des centaines de KB de JSON. Charger la liste légère d'abord, puis le détail complet uniquement quand l'utilisateur ouvre/modifie/applique un preset spécifique.

### 5.6 Récapitulatif des Fichiers — Section Habillage

#### 🆕 Fichiers à CRÉER

| Fichier | Côté | Description |
|---|---|---|
| `Storefront/src/app/preview/page.tsx` | Storefront | Page de prévisualisation d'un habillage |
| `backend/src/plugins/cms/dashboard/views/HabillageManager.tsx` | Backend | UI de gestion des habillages |

#### ✏️ Fichiers à MODIFIER

| Fichier | Côté | Modification |
|---|---|---|
| `backend/.../entities/page-preset.entity.ts` | Backend | Ajouter `isDefault` (pas besoin de `themeOverridesJson` — redondant avec sections THEME_SETTINGS/HEADER_CONF) |
| `backend/.../service/cms.service.ts` | Backend | Auto-backup, validation, protection isDefault, `checkSeasonState` (cron job + cache TTL), simplifier `findOneBySlug` |
| `backend/.../api/cms.resolver.ts` | Backend | Permissions correctes, `previewPreset` query (Admin API + SuperAdmin), cron job `checkSeasonState` |
| `backend/.../api/api-extensions.ts` | Backend | Ajouter query `previewPreset` dans Admin API (pas Shop API) |
| `backend/.../dashboard/queries.ts` | Backend | Ajouter queries/mutations preset (query légère + complète séparées) |
| `backend/.../UniversalBuilder.tsx` | Backend | Ajouter onglet "Habillages" |

---

## 6. Estimation d'Effort (Mise à jour)

| Phase | Complexité | Temps estimé |
|---|---|---|
| Phase 1 — DenseProductCard | Moyenne | ~3-4h |
| Phase 2 — Onglets Produits | Moyenne-Haute | ~5-6h |
| Phase 3 — Prix barré custom field | Simple | ~1-2h |
| Phase 4 — Système d'Habillage (Backend) | Haute | ~8-10h |
| Phase 5 — Système d'Habillage (UI Dashboard) | Haute | ~6-8h |
| Phase 6 — Système d'Habillage (Storefront Preview) | Moyenne | ~3-4h |
| **Total** | | **~26-34h** |

### Ordre de priorité recommandé

1. **Phase 4** (Habillage Backend) — Fondation critique, rend le système de presets production-ready
2. **Phase 5** (Habillage UI) — Rend la fonctionnalité utilisable par des non-techniques
3. **Phase 1** (DenseProductCard) — Amélioration visuelle immédiate
4. **Phase 6** (Preview Storefront) — Complète l'expérience habillage
5. **Phase 2** (Onglets Produits) — Enrichissement CMS
6. **Phase 3** (Prix barré) — Nice-to-have
