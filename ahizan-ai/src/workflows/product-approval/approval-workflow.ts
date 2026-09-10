import { generateObject } from 'ai';
import { ToolRegistry } from '../../tools/registry';
import { RequestContext } from '../../tools/types';
import { 
  ProductApprovalAnalysis, 
  ProposedOfficialProduct, 
  DuplicateMatchInfo, 
  QualityScoreAudit,
  proposedOfficialProductSchema 
} from '../../agents/super-admin/schemas';
import { modelGateway } from '../../gateway/model-provider';

export class ProductApprovalWorkflow {
  constructor(private toolRegistry: ToolRegistry) {}

  async analyze(productId: string, context?: RequestContext): Promise<ProductApprovalAnalysis> {
    // 1. Load raw product details
    const product = await this.toolRegistry.execute('getProductDetails', { productId }, context);
    if (!product || product.error) {
      throw new Error(product?.error || `Impossible de charger le produit #${productId}`);
    }

    const rawName = product.name || '';
    const rawDesc = (product.description || '').replace(/<[^>]*>/g, '').trim();
    const assetsCount = product.assets?.length || (product.featuredAsset ? 1 : 0);
    const variantsCount = product.variants?.length || 0;
    const vendorName = product.customFields?.vendor?.name || 'Vendeur Marchand';

    // 2. Duplicate detection scan against official catalog
    const titleWords = rawName.split(/\s+/).filter((w: string) => w.length > 1);
    const brandGuess = titleWords[0] || 'Marque';
    const modelGuess = titleWords.slice(1, 4).join(' ') || rawName;

    const duplicatesResult = await this.toolRegistry.execute(
      'findPotentialDuplicates',
      { query: rawName, brand: brandGuess, excludeId: productId },
      context
    );

    const matches: any[] = duplicatesResult?.duplicates || [];
    const topMatch = matches.length > 0 ? matches[0] : null;

    const duplicateMatch: DuplicateMatchInfo = {
      found: !!topMatch && topMatch.similarityScore >= 0.5,
      confidence: topMatch ? Math.min(topMatch.similarityScore + 0.1, 0.98) : 0,
      targetProductId: topMatch?.id,
      targetProductName: topMatch?.name,
      similarityScore: topMatch?.similarityScore,
      reason: topMatch
        ? `Concordance textuelle et catalogue identifiée avec la fiche officielle #${topMatch.id} "${topMatch.name}".`
        : 'Aucun produit similaire détecté dans le catalogue officiel validé.'
    };

    // 3. Quality score engine (0 to 100)
    let score = 0;
    const missingElements: string[] = [];
    const strengths: string[] = [];

    if (rawName.length >= 10) {
      score += 20;
      strengths.push('Titre suffisamment informatif (≥ 10 caractères)');
    } else {
      missingElements.push('Titre trop court ou imprécis');
    }

    if (rawDesc.length >= 80) {
      score += 25;
      strengths.push('Description détaillée fournie');
    } else if (rawDesc.length >= 30) {
      score += 15;
      missingElements.push('Description sommaire, enrichissement recommandé');
    } else {
      missingElements.push('Description absente ou très incomplète');
    }

    if (assetsCount >= 3) {
      score += 25;
      strengths.push('Pack photo complet (≥ 3 visuels)');
    } else if (assetsCount >= 1) {
      score += 15;
      missingElements.push('Une seule photo disponible (3 recommandées)');
    } else {
      missingElements.push('Aucun visuel associé au produit');
    }

    if (variantsCount >= 1) {
      score += 15;
      strengths.push('Au moins une déclinaison/variante configurée');
    } else {
      missingElements.push('Aucune déclinaison marchande valide');
    }

    if (product.collections && product.collections.length > 0) {
      score += 15;
      strengths.push(`Catégorisation définie (${product.collections[0].name})`);
    } else {
      missingElements.push('Aucune catégorie/collection associée');
    }

    const canPublish = score >= 50;
    let ratingLabel = 'Qualité insuffisante (< 50%)';
    if (score >= 75) ratingLabel = 'Excellente qualité (≥ 75%)';
    else if (score >= 50) ratingLabel = 'Qualité acceptable pour publication (50-74%)';

    const qualityScore: QualityScoreAudit = {
      score,
      ratingLabel,
      canPublish,
      missingElements,
      strengths
    };

    // 4. Normalized official product proposal (Heuristic Baseline)
    const cleanedTitle = `${brandGuess} ${modelGuess}`.replace(/\s+/g, ' ').trim();
    const collectionName = product.collections?.[0]?.name || 'Catalogue Général';
    const collectionId = product.collections?.[0]?.id || '';

    let proposedOfficialProduct: ProposedOfficialProduct = {
      name: cleanedTitle.length > 5 ? cleanedTitle : rawName,
      brand: brandGuess,
      model: modelGuess,
      shortDescription: product.customFields?.shortDescription || `${cleanedTitle} original, vérifié et certifié pour la vente sur Ahizan Marketplace.`,
      description: rawDesc ? `<p>${rawDesc}</p>` : `<p>${cleanedTitle} disponible sur Ahizan avec garantie de conformité.</p>`,
      seoTitle: `${cleanedTitle} au meilleur prix | Ahizan Bénin`,
      seoDescription: `Achetez ${cleanedTitle} en ligne sur Ahizan. Livraison rapide à Cotonou et partout au Bénin. Paiement sécurisé.`,
      categoryName: collectionName,
      collectionId
    };

    // 4.b LLM Enrichment via generateObject (if available)
    try {
      const model = modelGateway.getModel();
      const llmResult = await generateObject({
        model,
        schema: proposedOfficialProductSchema,
        prompt: `Tu es l'expert catalogue e-commerce d'Ahizan Marketplace au Bénin.
Normalise cette soumission produit vendeur en une fiche officielle élégante, vendeuse et conforme :
- Titre vendeur : "${rawName}"
- Description brute : "${rawDesc}"
- Marque déduite : "${brandGuess}"
- Modèle déduit : "${modelGuess}"
- Catégorie : "${collectionName}"

Produis les métadonnées SEO, la description courte et la fiche officielle parfaite.`,
      });

      if (llmResult.object) {
        proposedOfficialProduct = {
          ...proposedOfficialProduct,
          ...llmResult.object,
          collectionId,
        };
      }
    } catch (e: any) {
      // Fallback seamlessly to the heuristic proposal
      console.warn('[ProductApprovalWorkflow] LLM generateObject fallback to heuristic:', e.message);
    }

    // 5. Decision recommendation & confidence
    let recommendation: 'APPROVE_OFFICIAL' | 'REGRAFT_EXISTING' | 'REQUEST_INFORMATION' | 'REJECT';
    let confidence = 0.85;
    let decisionRationale = '';

    if (duplicateMatch.found && (duplicateMatch.similarityScore || 0) >= 0.7) {
      recommendation = 'REGRAFT_EXISTING';
      confidence = 0.92;
      decisionRationale = `Ce produit correspond très probablement à la fiche officielle existante #${topMatch.id} (${topMatch.name}). Pour préserver un catalogue unique sans duplication, nous recommandons de re-greffer l'offre vendeur sur cette fiche existante.`;
    } else if (qualityScore.canPublish) {
      recommendation = 'APPROVE_OFFICIAL';
      confidence = 0.88;
      decisionRationale = `Le produit est inédit et satisfait les critères de qualité minimaux (${qualityScore.score}/100). Nous recommandons de valider la création de la fiche officielle avec les métadonnées normalisées.`;
    } else {
      recommendation = 'REQUEST_INFORMATION';
      confidence = 0.80;
      decisionRationale = `Le produit présente un score de qualité insuffisant (${qualityScore.score}/100) : ${missingElements.join(', ')}. Une demande de correction auprès du vendeur ${vendorName} est conseillée.`;
    }

    return {
      productId,
      recommendation,
      confidence,
      decisionRationale,
      duplicateMatch,
      proposedOfficialProduct,
      qualityScore,
      usedDataSources: [
        'Vendure Product Entity #' + productId,
        'Ahizan searchOfficialProducts Index',
        'Vercel AI SDK Structured Normalizer'
      ]
    };
  }
}
