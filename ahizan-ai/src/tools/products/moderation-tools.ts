import { tool } from 'ai';
import { z } from 'zod';
import { AhizanClient } from '../ahizan-client';
import { RequestContext } from '../types';

/**
 * Outils d'ÉCRITURE sur le catalogue (P3-1, voir docs/roadmap-produit.md).
 * Contrairement aux outils de lecture de `product-tools.ts`, ceux-ci modifient
 * réellement l'état de la marketplace : ils sont marqués `needsApproval: true`,
 * ce qui oblige l'AI SDK à suspendre l'exécution et à demander une confirmation
 * explicite de l'administrateur humain dans l'interface avant tout appel réel à
 * Vendure. Aucune mutation n'est donc jamais exécutée sur la seule initiative du
 * modèle de langage.
 */
export function createModerationTools(client: AhizanClient, getContext?: () => RequestContext | undefined) {
  // Sans secret d'approbation configuré, on ne propose pas du tout l'outil au modèle :
  // mieux vaut une IA qui ne sait pas agir qu'une IA qui agit sans garde-fou vérifiable.
  if (!process.env.AHIZAN_AI_TOOL_APPROVAL_SECRET) {
    return {};
  }

  const reviewProductSubmission = tool({
    description:
      "Approuve ou rejette définitivement la fiche produit soumise par un vendeur. " +
      "Action IRRÉVERSIBLE sur la marketplace : ne l'appeler qu'après avoir analysé le produit " +
      "(getProductDetails / findPotentialDuplicates) et présenté une recommandation claire à l'administrateur.",
    inputSchema: z.object({
      productId: z.string().describe('ID du produit Ahizan à traiter'),
      decision: z.enum(['approved', 'rejected']).describe('Décision : "approved" (valider en fiche officielle) ou "rejected" (rejeter)'),
      rejectionReason: z.string().optional().describe('Motif du rejet, requis si decision = "rejected"'),
      convertToOfficialCatalog: z
        .boolean()
        .optional()
        .describe('Si true (défaut quand approuvé), détache le produit du vendeur pour en faire une fiche officielle du catalogue central'),
    }),
    needsApproval: true,
    execute: async ({ productId, decision, rejectionReason, convertToOfficialCatalog }) => {
      const context = getContext?.();
      const result = await client.reviewProduct(
        { productId, status: decision, rejectionReason, convertToOfficialCatalog },
        context?.authToken
      );
      return {
        productId,
        decision,
        appliedBy: context?.userId || 'inconnu',
        appliedAt: new Date().toISOString(),
        product: result,
      };
    },
  });

  return { reviewProductSubmission };
}
