import { HeroSection } from './hero-section';
import { ProductListSection } from './product-list-section';
import { CategoryGridSection } from './category-grid-section';
import { PromoBannerSection } from './promo-banner-section';
import { PopupSection } from './popup-section';

export const sectionRegistry: Record<string, React.ComponentType<any>> = {
    HERO: HeroSection,
    PRODUCT_LIST: ProductListSection,
    CATEGORY_GRID: CategoryGridSection,
    PROMO_BANNER: PromoBannerSection,
    POPUP: PopupSection,
};
