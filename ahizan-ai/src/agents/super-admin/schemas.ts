import { z } from 'zod';

export const proposedOfficialProductSchema = z.object({
  name: z.string().describe('Nom commercial standardisé du produit'),
  brand: z.string().describe('Marque identifiée'),
  model: z.string().describe('Modèle ou référence'),
  shortDescription: z.string().describe('Description courte optimisée'),
  description: z.string().optional().describe('Description détaillée avec mise en page HTML propre'),
  seoTitle: z.string().describe('Titre optimisé pour le référencement naturel'),
  seoDescription: z.string().describe('Meta description pour les moteurs de recherche'),
  categoryName: z.string().optional().describe('Catégorie ou rayon recommandé'),
  collectionId: z.string().optional().describe('ID de collection associé'),
});

export const duplicateMatchSchema = z.object({
  found: z.boolean().describe('Vrai si un doublon probant existe au catalogue'),
  confidence: z.number().min(0).max(1).describe('Niveau de certitude de 0 à 1'),
  targetProductId: z.string().optional().describe('ID du produit officiel cible pour re-greffage'),
  targetProductName: z.string().optional().describe('Nom du produit officiel existant'),
  similarityScore: z.number().optional().describe('Score de similarité textuelle/sémantique'),
  reason: z.string().optional().describe('Explication de la détection de doublon'),
});

export const qualityScoreAuditSchema = z.object({
  score: z.number().min(0).max(100).describe('Score global de qualité FQS de 0 à 100'),
  ratingLabel: z.string().describe('Mention qualité (Excellente, Acceptable, Insuffisante)'),
  canPublish: z.boolean().describe('Éligibilité à la publication directe'),
  missingElements: z.array(z.string()).describe('Éléments manquants ou à corriger'),
  strengths: z.array(z.string()).describe('Points forts de la fiche'),
});

export const productApprovalAnalysisSchema = z.object({
  productId: z.string().describe('ID du produit analysé'),
  recommendation: z.enum(['APPROVE_OFFICIAL', 'REGRAFT_EXISTING', 'REQUEST_INFORMATION', 'REJECT']).describe('Action recommandée'),
  confidence: z.number().min(0).max(1).describe('Indice de confiance de la recommandation'),
  decisionRationale: z.string().describe('Justification détaillée de la recommandation'),
  duplicateMatch: duplicateMatchSchema,
  proposedOfficialProduct: proposedOfficialProductSchema,
  qualityScore: qualityScoreAuditSchema,
  usedDataSources: z.array(z.string()).describe('Sources de données consultées pour l\'audit'),
});

export type ProposedOfficialProduct = z.infer<typeof proposedOfficialProductSchema>;
export type DuplicateMatchInfo = z.infer<typeof duplicateMatchSchema>;
export type QualityScoreAudit = z.infer<typeof qualityScoreAuditSchema>;
export type ProductApprovalAnalysis = z.infer<typeof productApprovalAnalysisSchema>;
