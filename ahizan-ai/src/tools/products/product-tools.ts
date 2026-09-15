import { tool } from 'ai';
import { z } from 'zod';
import { AhizanClient } from '../ahizan-client';
import { RequestContext } from '../types';

export function createProductTools(client: AhizanClient, getContext?: () => RequestContext | undefined) {
  const getProductDetails = tool({
    description: 'Récupère toutes les informations détaillées d\'un produit (nom, description, vendeur, variantes, prix, score FQS, statut d\'approbation).',
    inputSchema: z.object({
      productId: z.string().describe('ID unique du produit dans Ahizan (ex: "421")'),
    }),
    execute: async ({ productId }) => {
      const context = getContext?.();
      const query = `
        query GetProductDetail($id: ID!) {
          product(id: $id) {
            id
            createdAt
            name
            slug
            description
            enabled
            featuredAsset { id preview }
            assets { id preview }
            customFields {
              approvalStatus
              rejectionReason
              shortDescription
              vendor {
                id
                name
                status
              }
            }
            variants {
              id
              name
              sku
              price
              stockOnHand
              customFields {
                onPromotion
                promotionalPrice
                compareAtPrice
                offerStatus
              }
            }
            collections {
              id
              name
            }
          }
        }
      `;

      const data = await client.query(query, { id: productId }, context?.authToken);
      if (!data?.product) {
        throw new Error(`Produit #${productId} introuvable.`);
      }

      return data.product;
    },
  });

  const searchOfficialCatalog = tool({
    description: 'Recherche des fiches produits officielles déjà validées dans le catalogue central Ahizan.',
    inputSchema: z.object({
      term: z.string().optional().describe('Terme de recherche (nom du produit, marque, mot-clé, etc.)'),
      take: z.number().optional().describe('Nombre maximum de résultats (défaut 10)'),
    }),
    execute: async ({ term = '', take = 10 }) => {
      const context = getContext?.();
      const query = `
        query SearchOfficial($term: String, $take: Int) {
          searchOfficialProducts(term: $term, take: $take) {
            totalItems
            items {
              id
              name
              slug
              description
              featuredAsset { id preview }
              collections { id name }
              variants {
                id
                sku
                price
                stockOnHand
              }
            }
          }
        }
      `;

      try {
        const data = await client.query(query, { term, take }, context?.authToken);
        return data?.searchOfficialProducts || { totalItems: 0, items: [] };
      } catch {
        return { totalItems: 0, items: [] };
      }
    },
  });

  const listCollections = tool({
    description: 'Liste les collections et catégories de catalogue disponibles sur Ahizan Marketplace pour catégoriser un produit.',
    inputSchema: z.object({
      take: z.number().optional().describe('Nombre maximum de collections à retourner (défaut 100)'),
    }),
    execute: async ({ take = 100 }) => {
      const context = getContext?.();
      const query = `
        query GetCollectionsList($take: Int) {
          collections(options: { take: $take }) {
            items {
              id
              name
              slug
              parent { id name }
            }
          }
        }
      `;
      try {
        const data = await client.query(query, { take }, context?.authToken);
        return data?.collections?.items || [];
      } catch {
        return [];
      }
    },
  });

  const findPotentialDuplicates = tool({
    description: 'Analyse et détecte les doublons potentiels dans le catalogue officiel pour un produit donné.',
    inputSchema: z.object({
      query: z.string().describe('Nom ou mots-clés du produit à comparer'),
      brand: z.string().optional().describe('Marque supposée du produit'),
      excludeId: z.string().optional().describe('ID du produit courant à exclure de la recherche'),
    }),
    execute: async ({ query, brand, excludeId }) => {
      const context = getContext?.();
      const terms = query.split(/\s+/).filter(w => w.length > 2);
      const searchTerms = [query, ...(brand ? [brand] : []), ...terms.slice(0, 3)];

      const candidateMap = new Map<string, any>();

      for (const term of searchTerms) {
        if (!term || term.length < 3) continue;

        try {
          const gql = `
            query SearchOfficial($term: String) {
              searchOfficialProducts(term: $term, take: 5) {
                items {
                  id
                  name
                  slug
                  description
                  variants { id sku price }
                  collections { id name }
                }
              }
            }
          `;
          const data = await client.query(gql, { term }, context?.authToken);
          for (const item of (data?.searchOfficialProducts?.items || [])) {
            if (excludeId && String(item.id) === String(excludeId)) continue;
            if (!candidateMap.has(item.id)) {
              candidateMap.set(item.id, item);
            }
          }
        } catch {
          // ignore individual search failures
        }
      }

      const inputTokens = new Set(query.toLowerCase().replace(/[^a-z0-9]+/g, ' ').split(' ').filter(Boolean));
      const scoredMatches = Array.from(candidateMap.values()).map(candidate => {
        const candidateTokens = candidate.name.toLowerCase().replace(/[^a-z0-9]+/g, ' ').split(' ').filter(Boolean);
        let matchedCount = 0;
        for (const token of candidateTokens) {
          if (inputTokens.has(token)) matchedCount++;
        }
        const similarityScore = inputTokens.size > 0 ? (matchedCount / Math.max(inputTokens.size, candidateTokens.length)) : 0;

        return {
          id: candidate.id,
          name: candidate.name,
          slug: candidate.slug,
          similarityScore: Math.round(similarityScore * 100) / 100,
          variantsCount: candidate.variants?.length || 0,
          collections: candidate.collections?.map((c: any) => c.name) || [],
          reason: similarityScore > 0.5 ? 'Forte concordance textuelle et thématique' : 'Mots-clés partiellement partagés'
        };
      }).sort((a, b) => b.similarityScore - a.similarityScore);

      return {
        searchedQuery: query,
        foundMatchesCount: scoredMatches.length,
        duplicates: scoredMatches
      };
    },
  });

  const getPendingApprovals = tool({
    description: 'Récupère la liste des produits vendeurs actuellement en attente d\'approbation par le Super Admin.',
    inputSchema: z.object({
      take: z.number().optional().describe('Nombre maximum d\'articles à retourner (défaut 20)'),
    }),
    execute: async ({ take = 20 }) => {
      const context = getContext?.();
      const query = `
        query GetPendingProducts($take: Int) {
          products(options: { take: $take, sort: { createdAt: DESC } }) {
            totalItems
            items {
              id
              createdAt
              name
              enabled
              customFields {
                approvalStatus
                vendor {
                  id
                  name
                }
              }
              variants {
                id
                sku
                price
              }
            }
          }
        }
      `;

      const data = await client.query(query, { take: 100 }, context?.authToken);
      const allItems = data?.products?.items || [];
      const pendingItems = allItems.filter((p: any) => p.customFields?.approvalStatus === 'pending');

      return {
        pendingCount: pendingItems.length,
        items: pendingItems.slice(0, take)
      };
    },
  });

  return {
    getProductDetails,
    searchOfficialCatalog,
    findPotentialDuplicates,
    getPendingApprovals,
  };
}
