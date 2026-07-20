import React from 'react';
import { HeroSection } from '@/components/layout/hero-section';
import { FeaturedProducts } from '@/components/commerce/featured-products';
import { PromoBanner } from '@/components/cms/promo-banner';
import { CategoryGrid } from '@/components/cms/category-grid';
import { FlashDealsSection } from '@/components/cms/flash-deals-section';
import { VendorShowcaseSection } from '@/components/cms/vendor-showcase-section';
import { FeaturesSection } from '@/components/cms/features-section';
import { BlogPostsSection } from '@/components/cms/blog-posts-section';
import { FlexGrid } from '@/components/cms/flex-grid';
import { HeroSlider } from '@/components/cms/hero-slider';
import { SearchBarSection } from '@/components/cms/search-bar-section';
import { PromoGridSection } from '@/components/cms/promo-grid-section';
import { RecentlyViewedSection } from '@/components/cms/recently-viewed-section';
import { CtaVendorSection } from '@/components/cms/cta-vendor-section';
import { NewsletterSection } from '@/components/cms/newsletter-section';
import { TestimonialsSection } from '@/components/cms/testimonials-section';
import { TabbedProductGrid } from '@/components/cms/tabbed-product-grid';

/**
 * Le registre fait correspondre un "type" de section provenant du CMS Backend Vendure
 * à un composant React du Frontend.
 *
 * Pour ajouter un nouveau type de section :
 * 1. Créer le composant dans /components/cms/
 * 2. L'importer ici
 * 3. Ajouter l'entrée dans le registre ci-dessous
 * 4. Ajouter le template par défaut dans le backend (SECTION_TEMPLATES du landing-page-builder)
 */
export const sectionRegistry: Record<string, React.ComponentType<any>> = {
    'HERO': HeroSection,
    'HERO_SLIDER': HeroSlider,
    'PRODUCT_GRID': FeaturedProducts,
    'PROMO_BANNER': PromoBanner,
    'PROMO_GRID': PromoGridSection,
    'CATEGORY_GRID': CategoryGrid,
    'CATEGORIES': CategoryGrid,
    'FLASH_DEALS': FlashDealsSection,
    'VENDOR_SHOWCASE': VendorShowcaseSection,
    'FEATURES': FeaturesSection,
    'BLOG_POSTS': BlogPostsSection,
    'FLEX_GRID': FlexGrid,
    'SEARCH_BAR': SearchBarSection,
    'RECENTLY_VIEWED': RecentlyViewedSection,
    'CTA_VENDOR': CtaVendorSection,
    'NEWSLETTER': NewsletterSection,
    'TESTIMONIALS': TestimonialsSection,
    'TABBED_PRODUCT_GRID': TabbedProductGrid,
};

export function getSectionComponent(type: string): React.ComponentType<any> | null {
    return sectionRegistry[type] || null;
}
