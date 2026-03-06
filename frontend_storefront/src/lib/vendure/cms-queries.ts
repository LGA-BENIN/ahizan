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

// Spécifique Types for Section Data (to be used in React Components)
export interface HeroData {
    title?: string;
    subtitle?: string;
    ctaText?: string;
    ctaLink?: string;
    backgroundImage?: string;
}

export interface ProductListData {
    collectionSlug?: string;
    title?: string;
    take?: number;
}

export interface PromoBannerData {
    title: string;
    description?: string;
    backgroundColor?: string;
    ctaText?: string;
    ctaLink?: string;
}

export interface CategoryData {
    name: string;
    slug: string;
    imageUrl?: string;
}

export interface CategoryGridData {
    title?: string;
    categories: CategoryData[];
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

        const pageResponse = result.data.page;

        if (!pageResponse) {
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
