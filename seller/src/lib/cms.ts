import { graphql } from '@/graphql';
import { query } from '@/lib/vendure/api';

export const PageQuery = graphql(`
  query GetPage($slug: String!) {
    page(slug: $slug) {
      id
      title
      type
      sections {
        id
        type
        order
        dataJson
        isActive
      }
    }
  }
`);

export async function getPage(slug: string) {
  const { data } = await query(PageQuery, { slug }, {
    fetch: { next: { revalidate: 3600, tags: [`page:${slug}`] } }
  });
  return data.page;
}
