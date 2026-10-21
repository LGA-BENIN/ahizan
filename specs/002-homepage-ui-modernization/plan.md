# Implementation Plan: Refonte UI/UX Page d'Accueil & Blocs Modulaires CMS Ahizan

**Branch**: `002-homepage-ui-modernization`  
**Status**: COMPLETED ✅  
**Spec**: [Feature Specification](file:///srv/ahizan/specs/002-homepage-ui-modernization/spec.md)

---

## Phases d'Implémentation & Statut

### Phase 1 : Composants Storefront & Enrichissement Visuel ✅
1. **Cartes Produits (`MasterProductCard.tsx`)** :
   - [x] Prop `showQuickAddButton` / `isFlashSaleCard` (bouton `+` rapide type Jumia pour achats instantanés avec toast de confirmation).
   - [x] Positionné en bas à droite de l'image, sans conflit avec le bouton favoris (cœur en haut à droite).
   - [x] Badges contextuels Cdiscount (`Promo`, `Bon plan`, `Meilleur prix`, `Plus responsable`).
   - [x] Jauge d'urgence et de rareté FOMO ("Plus que X en stock !") + Progress bar.
   - [x] Social proof (notes étoiles `★ 4.5 (12)`).
2. **Flash Sale (`FlashSaleSection.tsx`)** :
   - [x] Refonte de l'en-tête thématique Jumia (bandeau rouge grenat, chrono sombre stylisé `07h : 46m : 59s`, bouton « Voir plus > »).
   - [x] Activation automatique du bouton `+` rapide et de la jauge FOMO sur les cartes flash.
3. **Hero & Bannières (`HeroStoryScroller.tsx`, `HeroSlimBanner.tsx`)** :
   - [x] Créé [HeroStoryScroller.tsx](file:///srv/ahizan/Storefront/src/components/cms/HeroStoryScroller.tsx) (scroll horizontal de cartes au ratio vertical 9:16).
   - [x] Créé [HeroSlimBanner.tsx](file:///srv/ahizan/Storefront/src/components/cms/HeroSlimBanner.tsx) (bannière panoramique compacte à faible hauteur, dégradé, produit détouré, badge).
   - [x] Mis à jour [HeroSection.tsx](file:///srv/ahizan/Storefront/src/components/ahizan/HeroSection.tsx) pour supporter les templates `story_scroller` et `slim`.
4. **Navigation Catégories (`CircularCategoryNav.tsx`, `QuadCategoryCard.tsx`)** :
   - [x] Créé [CircularCategoryNav.tsx](file:///srv/ahizan/Storefront/src/components/cms/CircularCategoryNav.tsx) et support `cardStyle: 'circular'` dans [category-grid.tsx](file:///srv/ahizan/Storefront/src/components/cms/category-grid.tsx).
   - [x] Créé [QuadCategoryCard.tsx](file:///srv/ahizan/Storefront/src/components/cms/QuadCategoryCard.tsx) (boîte 2x2 sous-catégories Amazon).
5. **Carrousel à Onglets (`tabbed-product-grid.tsx`)** :
   - [x] Ajouté le style d'onglets compacts `pill-cdiscount` / `cdiscount` avec défilement horizontal responsive.
6. **Réassurance (`TrustFooterBar.tsx`)** :
   - [x] Créé [TrustFooterBar.tsx](file:///srv/ahizan/Storefront/src/components/cms/TrustFooterBar.tsx) avec les 4 piliers de réassurance adaptés au Bénin (MTN Mobile Money, Moov Money, livraison Cotonou/Calavi, service client).

### Phase 2 : Enregistrement Storefront & Non-Régression ✅
- [x] Enregistré dans [section-registry.tsx](file:///srv/ahizan/Storefront/src/components/cms/section-registry.tsx) : `HERO_STORY_SCROLLER`, `HERO_SLIM_BANNER`, `QUAD_CATEGORY_CARD`, `QUAD_GRID`, `CIRCULAR_CATEGORY_NAV`, `TRUST_FOOTER_BAR`.
- [x] Mappé dans [BodySectionRenderer.tsx](file:///srv/ahizan/Storefront/src/components/ahizan/BodySectionRenderer.tsx).
- [x] Non-régression totale : toutes les sections et types existants continuent de fonctionner à l'identique.

### Phase 3 : Intégration Dashboard Vendure (CMS Page Builder) ✅
- [x] Ajouté dans [Sidebar.tsx](file:///srv/ahizan/backend/src/plugins/cms/dashboard/UniversalBuilder/components/Sidebar.tsx) (zones Impact et Corps + types autorisés `home`).
- [x] Formulaires d'édition créés dans [ModernSectionSettings.tsx](file:///srv/ahizan/backend/src/plugins/cms/dashboard/UniversalBuilder/components/sections/ModernSectionSettings.tsx) et branchés dans [SectionEditorFactory.tsx](file:///srv/ahizan/backend/src/plugins/cms/dashboard/UniversalBuilder/components/SectionEditorFactory.tsx).
- [x] Types enregistrés dans [cms.service.ts](file:///srv/ahizan/backend/src/plugins/cms/service/cms.service.ts).

### Phase 4 : Tests & Validation Compilation ✅
- [x] Compilation TypeScript Storefront : `docker exec ahizan_storefront npx tsc --noEmit` -> **Exit code 0 (Zéro erreur)**.
- [x] Compilation TypeScript Backend : `docker exec ahizan_backend npx tsc --noEmit` -> **Exit code 0 (Zéro erreur)**.
