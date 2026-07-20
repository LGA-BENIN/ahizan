import { graphql } from '@/graphql';
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
    pageSlug?: string;
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

export async function getPageContent(slug: string): Promise<CmsPage | null> {
    try {
        const result = await query(
            GetPageBySlugQuery, 
            { slug },
            { fetch: { cache: 'no-store' } }
        ) as any;

        const pageResponse = result?.data?.page;

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
                    pageSlug: pageResponse.slug,
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
        console.error(`[getPageContent] Error fetching page slug "${slug}":`, error);
        return null;
    }
}
