# Feature Specification: Refonte UI/UX Page d'Accueil & Blocs Modulaires CMS Ahizan

**Feature Branch**: `002-homepage-ui-modernization`  
**Created**: 2026-10-16  
**Status**: In Review / Validation  
**Input**: [Spécifications UI/UX Jumia, Amazon, Cdiscount](file:///srv/ahizan/ui.md)

---

## 1. Contexte & Règle d'or : Non-régression

L'objectif est d'enrichir la page d'accueil d'Ahizan (Areezan) et le Page Builder CMS Vendure (`UniversalBuilder`) avec les motifs d'interface performants de **Jumia**, **Amazon** et **Cdiscount**, en respectant scrupuleusement la règle d'or :
- **Non-régression absolue** : Tout composant ou bloc existant (`HERO`, `FLASH_DEALS`, `CATEGORY_COLLECTION`, `TABBED_PRODUCT_GRID`, etc.) conserve sa rétro-compatibilité totale.
- **Principe d'extension douce** : Les améliorations visuelles sont intégrées soit par l'ajout de variantes visuelles (`layout`, `cardStyle`, `template`), soit par la création de nouveaux types de sections enregistrés sans casser les configurations existantes stockées en base de données.
- **Mobile-first et adaptation locale Bénin** : Optimisation des performances (images WebP/lazy loading), affichage clair des devises en FCFA (sans saut de ligne cassé), actions directes rapides au tap.

---

## 2. Audit Comparatif : Existant vs Nouveautés

| Composant Cible (ui.md) | Motif UI & Référence | Existant dans Ahizan | Statut d'Arbitrage | Stratégie Technique Retenue |
| :--- | :--- | :--- | :--- | :--- |
| **`HeroStoryScroller`** | Cartes verticales déroulantes format story (Amazon) | `HERO` (`HeroSection.tsx`) supporte `classic`, `bento`, `fullwidth`. Pas de format story vertical. | **Extension & Nouveau Bloc** | 1. Ajout de la variante `story_scroller` dans `HeroSection.tsx`.<br>2. Support en section autonome `HERO_STORY_SCROLLER` dans le registre de sections. |
| **`HeroSlimBanner`** | Bannière panoramique compacte à faible hauteur (Cdiscount) | `HeroSlider`, `PromoBanner`, `QuickLinks`. Pas de bannière ultra-compacte à dégradé + détourage produit. | **Nouveau Composant & Extension** | 1. Création de `HeroSlimBanner.tsx` avec auto-play et badges promotionnels.<br>2. Ajout du template `slim` dans `HeroSection.tsx` et type CMS `HERO_SLIM_BANNER`. |
| **`FlashSaleGrid`** | Compte à rebours Jumia, header rouge thématique, jauge stock, ajout rapide `+` | `FlashSaleSection.tsx` (`FLASH_DEALS` / `FLASH_SALE`). Chrono et barre de stock déjà présents mais style visuel à moderniser. | **Mise à jour majeure (Non-destructive)** | 1. Refonte visuelle de l'en-tête (bandeau grenat, chrono sombre centré, bouton "Voir plus >").<br>2. Jauge de rareté dynamique ("14 articles restants").<br>3. Bouton `+` d'ajout rapide direct. |
| **`QuadCategoryCard`** | Bloc 2x2 sous-catégories avec 4 visuels + labels + lien global (Amazon) | Inexistant sous ce format spécifique 2x2 multi-portails. | **Création Complète** | 1. Nouveau composant `QuadCategoryCard.tsx` + `QuadCategoryGrid.tsx`.<br>2. Nouveau type CMS `QUAD_CATEGORY_CARD` / `QUAD_GRID`.<br>3. Formulaire d'édition dans `SectionEditorFactory`. |
| **`CircularCategoryNav`** | Ruban d'avatars circulaires défilants (Cdiscount / Stories) | `CategoryCollection` / `CategoryGrid` ont des carrousels mais en cartes carrées/rectangulaires. | **Mise à jour & Composant Dédié** | 1. Ajout de `cardStyle: 'circular'` dans `CategoryGrid.tsx`.<br>2. Création de `CircularCategoryNav.tsx` et type CMS `CIRCULAR_CATEGORY_NAV`. |
| **`TabbedProductSlider`** | Carrousel produits avec onglets dynamiques et badges offres (Cdiscount) | `TabbedProductGrid.tsx` (`TABBED_PRODUCT_GRID`) gère déjà tabs + carrousel/grille. | **Mise à jour (Enrichissement)** | 1. Ajout du style d'onglets compacts `pill-cdiscount`.<br>2. Badges contextuels (`Promo`, `Bon plan`, `Meilleur prix`).<br>3. Double prix explicite et typographie FCFA soignée. |
| **`TrustFooterBar`** | Barre horizontale de réassurance & services locaux (Jumia/Cdiscount) | `FeaturesSection.tsx` existe en 3 grandes cartes verticales. Pas de barre bandeau épurée. | **Création Complète** | 1. Nouveau composant `TrustFooterBar.tsx` avec préréglages locaux (MTN Moov, livraison locale Cotonou/Calavi, service client).<br>2. Type CMS `TRUST_FOOTER_BAR`. |

---

## 3. Ergonomie des Cartes Produits : CTA & Favoris

### Analyse de l'existant :
- `MasterProductCard.tsx` intègre un bouton cœur (favoris) en haut à droite avec retour visuel immédiat et synchronisation utilisateur.
- Un bouton d'ajout au panier existe (`showQuickAddToCart`), masqué par défaut ou affiché au survol en bas à droite sur desktop.

### Décision ergonomique :
1. **Cartes standards du catalogue** :
   - Maintien du bouton favoris (cœur) en haut à droite pour ne pas surcharger l'image.
   - Ajout au panier accessible au survol (desktop) et bouton d'action contextuel non intrusif sur mobile.
2. **Cartes Ventes Flash (`FlashSaleSection`)** :
   - L'urgence et l'achat impulsif dominent.
   - Intégration du bouton `+` (pastille circulaire sombre contrastée avec pictogramme blanc) dans le coin supérieur gauche ou sur l'angle bas-droit de l'image produit, évitant tout conflit tactile avec le bouton favoris.
   - Clic sur `+` déclenche l'ajout immédiat au panier avec notification Toast personnalisée (variante et vendeur assigné).

---

## 4. Architecture Technique & Fichiers

### Côté Storefront (`Storefront/src/`) :
- `components/ahizan/HeroSection.tsx` : Ajout des templates `story_scroller` et `slim`.
- `components/cms/HeroStoryScroller.tsx` (NOUVEAU) : Composant carrousel vertical format 9:16.
- `components/cms/HeroSlimBanner.tsx` (NOUVEAU) : Bannière panoramique compacte avec gradient et badge.
- `components/ahizan/FlashSaleSection.tsx` : Amélioration du bandeau rouge Jumia, chrono centré et jauge FOMO.
- `components/cms/QuadCategoryCard.tsx` (NOUVEAU) : Bloc 2x2 miniatures avec liens individuels.
- `components/cms/CircularCategoryNav.tsx` (NOUVEAU) : Ruban d'avatars circulaires.
- `components/cms/category-grid.tsx` : Support du style `cardStyle: 'circular'`.
- `components/cms/tabbed-product-grid.tsx` : Support des badges contextuels et onglets Cdiscount.
- `components/cms/TrustFooterBar.tsx` (NOUVEAU) : Barre de réassurance locale.
- `components/commerce/master-product-card.tsx` : Support du bouton `+` rapide et badges de comparaison de prix.
- `components/cms/section-registry.tsx` : Enregistrement des nouveaux types de section.
- `components/ahizan/BodySectionRenderer.tsx` : Mapping et rendu des nouveaux types.

### Côté CMS Vendure (`backend/src/plugins/cms/`) :
- `dashboard/UniversalBuilder/components/Sidebar.tsx` : Déclaration des nouveaux types de blocs dans la palette de composants autorisés sur `home`.
- `dashboard/UniversalBuilder/components/SectionEditorFactory.tsx` : Ajout des formulaires d'édition ou configurations par défaut pour les nouveaux blocs.
- `service/cms.service.ts` : Ajout des types connus dans les templates par défaut sans casser les sections existantes.
