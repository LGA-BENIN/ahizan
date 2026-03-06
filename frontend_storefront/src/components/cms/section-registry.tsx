import React from 'react';
import { HeroSection } from '@/components/layout/hero-section';
import { FeaturedProducts } from '@/components/commerce/featured-products';
// We will create these shortly
import { PromoBanner } from '@/components/cms/promo-banner';
import { CategoryGrid } from '@/components/cms/category-grid';

/**
 * Le registre fait correspondre un "type" de section provenant du CMS Backend Vendure
 * à un composant React du Frontend.
 */
export const sectionRegistry: Record<string, React.ComponentType<any>> = {
    // Les clés doivent correspondre aux valeurs du backend (ex: dans CmsPlugin)
    'HERO': HeroSection,
    'PRODUCT_LIST': FeaturedProducts,
    'PROMO_BANNER': PromoBanner,
    'CATEGORY_GRID': CategoryGrid,

    // Le type POPUP sera probablement géré par un PopupManager à part, 
    // pas affiché dans le flux classique de la page.
};

export function getSectionComponent(type: string): React.ComponentType<any> | null {
    return sectionRegistry[type] || null;
}
