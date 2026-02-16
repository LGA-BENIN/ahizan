import { HeroSection } from './hero-section';
import { ProductListSection } from './product-list-section';
import { CategoryGridSection } from './category-grid-section';

export const sectionRegistry: Record<string, React.ComponentType<any>> = {
    HERO: HeroSection,
    PRODUCT_LIST: ProductListSection,
    CATEGORY_GRID: CategoryGridSection,
    // Add more section types here as needed
};
