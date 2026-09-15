import { z } from 'zod';

export const suggestedOfficialImageSchema = z.object({
  id: z.string().describe('Identifiant unique de l\'image'),
  url: z.string().describe('URL haute résolution de l\'image'),
  previewUrl: z.string().describe('URL miniature d\'aperçu'),
  label: z.string().describe('Description du visuel (ex: Vue de face fond blanc, Vue arrière, Packshot boîte, Argent Polaire)'),
  isPrimary: z.boolean().describe('Image principale de couverture'),
  source: z.string().describe('Source de l\'image (ex: Catalogue Officiel Constructeur, Studio IA, Photo Vendeur Qualifiée)'),
  variantOptionValue: z.string().optional().describe('Valeur d\'option liée si spécifique à un coloris/déclinaison (ex: "Argent", "Noir Minuit")'),
  imageType: z.enum(['MAIN_WHITE_BG', 'BACK', 'PERSPECTIVE', 'PACKAGING', 'LIFESTYLE', 'VARIANT_COLOR', 'OTHER']).optional().describe('Angle ou type de prise de vue'),
});

export const technicalSpecSchema = z.object({
  key: z.string().describe('Nom du critère technique (ex: Taille écran, RAM, Capacité, Matière)'),
  value: z.string().describe('Valeur du critère (ex: 55 pouces, 8 Go, 128 Go, Coton 100%)'),
  facetKey: z.string().optional().describe('Code de la facette Vendure correspondante'),
});

export const optionGroupSuggestionSchema = z.object({
  name: z.string().describe('Nom du groupe d\'option (ex: Couleur, Capacité de Stockage, Taille, Pointure)'),
  values: z.array(z.string()).describe('Ensemble des valeurs possibles officielles (ex: ["Argent", "Noir Minuit", "Or Érable"])'),
});

export const variantSuggestionSchema = z.object({
  name: z.string().describe('Libellé complet de la déclinaison (ex: Samsung Galaxy S8 – Argent / 64 Go)'),
  optionValues: z.record(z.string(), z.string()).describe('Paires Clé-Valeur des options (ex: {"Couleur": "Argent", "Capacité": "64 Go"})'),
  isCurrentSellerVariant: z.boolean().describe('Vrai si cette déclinaison correspond exactement à ce que le vendeur a soumis'),
  suggestedSku: z.string().optional().describe('Code SKU unique suggéré pour Ahizan'),
  suggestedPriceFcfa: z.number().optional().describe('Prix indicatif en FCFA pour cette déclinaison'),
  colorHex: z.string().optional().describe('Code hexadécimal indicatif pour prévisualisation de couleur (ex: #c0c0c0)'),
});

export const visualOcrInsightsSchema = z.object({
  detectedBrand: z.string().optional().describe('Marque lue sur l\'emballage ou le logo'),
  detectedModel: z.string().optional().describe('Référence ou modèle exact lu'),
  readOcrText: z.string().optional().describe('Texte brut extrait par OCR sur l\'image ou le carton'),
  detectedColor: z.string().optional().describe('Couleur principale constatée'),
  detectedCondition: z.string().optional().describe('État visuel apparent (Neuf sous blister, Ouvert, Reconditionné)'),
  imageQualityRating: z.enum(['EXCELLENT', 'GOOD', 'BLURRY_OR_POOR', 'NO_IMAGE']).describe('Qualité visuelle de la photo vendeur'),
});

export const proposedOfficialProductSchema = z.object({
  isValidSubmission: z.boolean().describe('false si c\'est du spam, un test ou du texte absurde comme "laissez moi"'),
  rejectionCategory: z.enum(['NONE', 'NONSENSE_SPAM', 'POOR_IMAGE', 'PROHIBITED', 'INSUFFICIENT_DATA']).describe('Catégorie d\'anomalie si invalide'),
  rejectionSuggestedMessage: z.string().optional().describe('Message prêt à être envoyé au vendeur si rejet'),
  
  // Fiche Produit Maître Universel (Zéro duplication, titre riche et vendeur)
  name: z.string().describe("Titre commercial e-commerce complet, professionnel et vendeur (ex: \"Smartphone Samsung Galaxy S8 Écran Infinity 5.8 pouces Super AMOLED\", \"Ordinateur Portable HP 15 Intel Core i5 8Go RAM 512Go SSD\", \"Robe Longue Fleurie Bohème Chic\"). Inclure type de produit + marque + modèle/gamme + spécifications techniques distinctives standards, sans restreindre à une couleur/taille unique."),
  brand: z.string().describe('Marque identifiée avec certitude (ex: "Samsung", "Apple", "Nike")'),
  model: z.string().describe('Modèle ou référence officielle complète (ex: "Galaxy S8", "iPhone 13 Pro Max", "Air Max 90")'),
  shortDescription: z.string().describe('Description courte vendeuse (phrase d\'accroche marketing percutante)'),
  description: z.string().optional().describe('Description détaillée avec mise en page HTML propre, structurée et riche (<h3>, <p>, <ul>, <li>, <strong>)'),
  seoTitle: z.string().describe('Titre SEO optimisé pour les moteurs de recherche et acheteurs au Bénin (50-70 caractères)'),
  seoDescription: z.string().describe('Meta description SEO attractive incitant au clic (120-160 caractères)'),
  categoryName: z.string().optional().describe('Nom exact de la catégorie / collection officielle sélectionnée'),
  collectionId: z.string().optional().describe('ID exact de la collection officielle choisie dans la liste fournie'),

  // Vision & Vérité
  visualOcrInsights: visualOcrInsightsSchema.optional(),
  truthScore: z.number().min(0).max(100).describe('Taux de Vérité et concordance réelle IA entre photo et produit (0-100)'),
  truthLevel: z.enum(['HIGH', 'MEDIUM', 'LOW', 'SUSPICIOUS']).describe('Niveau de confiance de la vérité'),
  truthRationale: z.string().describe('Explication détaillée du taux de vérité calculé par l\'IA'),

  // Matrice Exhaustive de Variantes & Groupes d'Options Réels
  optionGroups: z.array(optionGroupSuggestionSchema).optional().describe('Groupes d\'options réels exhaustifs (ex: Couleur, Capacité de Stockage, Taille/Pointure) avec toutes les valeurs officielles constructeur'),
  variantsMatrix: z.array(variantSuggestionSchema).optional().describe('Matrice complète et exhaustive de toutes les déclinaisons officielles existant réellement dans le monde pour ce produit (combinaisons couleur x stockage ou taille x couleur), avec isCurrentSellerVariant: true pour l\'offre soumise et isCurrentSellerVariant: false pour toutes les autres déclinaisons officielles sœurs à pré-créer'),

  // Spécifications & Images
  technicalSpecs: z.array(technicalSpecSchema).optional().describe('Attributs et caractéristiques techniques clés structurés'),
  suggestedOfficialImages: z.array(suggestedOfficialImageSchema).describe('Sélection de visuels officiels HD recommandés'),
});

export const detectedContradictionSchema = z.object({
  field: z.string().describe('Champ ou aspect en conflit (ex: Marque, Modèle, Couleur, Capacité, Catégorie)'),
  sellerClaim: z.string().describe('Ce que le vendeur a déclaré dans son texte'),
  visualEvidence: z.string().describe('Ce que la photo ou l\'OCR révèle concrètement'),
  explanation: z.string().describe('Explication claire de l\'incohérence pour le modérateur'),
  severity: z.enum(['CRITICAL', 'WARNING']).describe('Niveau d\'impact du conflit'),
});

export const hypothesisProposalSchema = z.object({
  id: z.string().describe('Identifiant de l\'hypothèse (ex: "VISUAL_TRUTH", "SELLER_CLAIM", "RAW_SUBMISSION", "CUSTOM")'),
  label: z.string().describe('Libellé court pour l\'UI (ex: "🖼️ Vérité Visuelle (Nokia 3310)", "📱 Déclaration Vendeur (Apple iPhone 13)")'),
  description: z.string().describe('Courte explication du parti-pris de cette hypothèse'),
  proposal: proposedOfficialProductSchema,
});

export const duplicateMatchSchema = z.object({
  found: z.boolean().describe('Vrai si un doublon probant existe au catalogue officiel'),
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
  proposals: z.record(z.string(), proposedOfficialProductSchema).optional().describe('Map des propositions par id d\'hypothèse (VISUAL_TRUTH, SELLER_CLAIM, RAW)'),
  detectedContradictions: z.array(detectedContradictionSchema).optional().describe('Liste des incohérences détectées entre le texte vendeur et les visuels'),
  hypotheses: z.array(hypothesisProposalSchema).optional().describe('Fiches complètes alternatives pré-générées selon différentes hypothèses'),
  qualityScore: qualityScoreAuditSchema,
  usedDataSources: z.array(z.string()).describe('Sources de données consultées pour l\'audit'),
});

export type SuggestedOfficialImage = z.infer<typeof suggestedOfficialImageSchema>;
export type TechnicalSpec = z.infer<typeof technicalSpecSchema>;
export type OptionGroupSuggestion = z.infer<typeof optionGroupSuggestionSchema>;
export type VariantSuggestion = z.infer<typeof variantSuggestionSchema>;
export type VisualOcrInsights = z.infer<typeof visualOcrInsightsSchema>;
export type ProposedOfficialProduct = z.infer<typeof proposedOfficialProductSchema>;
export type DetectedContradiction = z.infer<typeof detectedContradictionSchema>;
export type HypothesisProposal = z.infer<typeof hypothesisProposalSchema>;
export type DuplicateMatchInfo = z.infer<typeof duplicateMatchSchema>;
export type QualityScoreAudit = z.infer<typeof qualityScoreAuditSchema>;
export type ProductApprovalAnalysis = z.infer<typeof productApprovalAnalysisSchema>;
