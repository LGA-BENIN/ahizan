import { graphql } from 'gql.tada';
import { query } from './api';

export const GetPageBySlugQuery = graphql(`
  query GetPageBySlug($slug: String!) {
    page(slug: $slug) {
      id
      slug
      title
      type
      isActive
      sections {
        id
        type
        title
        description
        layout
        order
        isActive
        dataJson
      }
    }
  }
`);

export interface CmsSection {
    id: string;
    type: string;
    title: string;
    description: string;
    layout: string;
    order: number;
    isActive: boolean;
    data?: any; // Parsed dataJson
}

export interface CmsPage {
    id: string;
    slug: string;
    title: string;
    type: string;
    isActive: boolean;
    sections: CmsSection[];
}

export interface ThemeSettingsData {
    primaryColor?: string;
    secondaryColor?: string;
    backgroundColor?: string;
    fontFamily?: string;
    borderRadius?: string;
    layoutMode?: 'boxed' | 'full';
    backgroundType?: 'color' | 'image' | 'video';
    backgroundImageUrl?: string;
    backgroundVideoUrl?: string;
}

export interface TopBarData {
    text?: string;
    backgroundColor?: string;
    textColor?: string;
    showSocials?: boolean;
    adMediaType?: 'image' | 'video';
    adMediaUrl?: string;
    adLink?: string;
}

export interface HeaderColumn {
    type: 'text' | 'image';
    content?: string;
    imageUrl?: string;
    link?: string;
}

export interface HeaderConfData {
    siteName?: string;
    logoUrl?: string;
    sticky?: boolean;
    layoutType?: 'standard' | 'columns';
    columnCount?: number;
    columnsData?: HeaderColumn[];
    menuItems?: Array<{ label: string; link: string }>;
}

export interface FooterConfData {
    about?: string;
    facebook?: string;
    whatsapp?: string;
    links?: Array<{ label: string; link: string }>;
}

export interface HeroData {
    title?: string;
    subtitle?: string;
    ctaText?: string;
    ctaLink?: string;
    backgroundImage?: string;
    textAlign?: string;
    overlayColor?: string;
    height?: string;
}

export interface ProductListData {
    collectionSlug?: string;
    title?: string;
    filterType?: 'LATEST' | 'BEST_SELLERS' | 'COLLECTION';
    take?: number;
    layout?: 'grid' | 'carousel';
}

export interface PromoBannerData {
    title: string;
    subtitle?: string;
    imageUrl?: string;
    link?: string;
    ctaText?: string;
    backgroundColor?: string;
}

export interface CategoryData {
    name: string;
    slug: string;
    imageUrl?: string;
}

export interface CategoryGridData {
    title?: string;
    categories: CategoryData[];
    layout?: 'grid' | 'carousel';
}

export interface PopupData {
    title: string;
    content: string;
    ctaText?: string;
    ctaLink?: string;
}

/**
 * Récupère le contenu d'une page configurée dans le CMS Vendure, et parse automatiquement
 * les dataJson de chaque section pour faciliter leur rendu par les composants React.
 */
export async function getPageContent(slug: string): Promise<CmsPage | null> {
    try {
        const result = await query(GetPageBySlugQuery, { slug }) as any;
        console.log(`[getPageContent] Raw API result for slug "${slug}":`, result);

        const pageResponse = result?.data?.page;
        console.log(`[getPageContent] extracted pageResponse:`, pageResponse);

        if (!pageResponse) {
            console.warn(`[getPageContent] NOT FOUND: Slug "${slug}" returned no page.`);
            return null;
        }

        const sections: CmsSection[] = pageResponse.sections
            ? pageResponse.sections.map((section: any) => {
                let parsedData = {};
                if (section.dataJson) {
                    try {
                        parsedData = JSON.parse(section.dataJson);
                    } catch (e) {
                        console.error(`Failed to parse CMS section dataJson for section ${section.id}:`, e);
                    }
                }

                return {
                    id: section.id,
                    type: section.type,
                    title: section.title,
                    description: section.description,
                    layout: section.layout,
                    order: section.order,
                    isActive: section.isActive,
                    data: parsedData
                };
            })
            : [];

        return {
            id: pageResponse.id,
            slug: pageResponse.slug,
            title: pageResponse.title,
            type: pageResponse.type,
            isActive: pageResponse.isActive,
            sections
        };
    } catch (error) {
        console.error(`Error fetching CMS page '${slug}':`, error);
        return null; // On fail, return null to fallback to static default content
    }
}
