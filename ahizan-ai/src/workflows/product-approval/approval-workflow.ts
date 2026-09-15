import { generateObject, generateText } from 'ai';
import { ToolRegistry } from '../../tools/registry';
import { RequestContext } from '../../tools/types';
import { 
  ProductApprovalAnalysis, 
  ProposedOfficialProduct, 
  DuplicateMatchInfo, 
  QualityScoreAudit,
  SuggestedOfficialImage,
  TechnicalSpec,
  OptionGroupSuggestion,
  VariantSuggestion,
  proposedOfficialProductSchema 
} from '../../agents/super-admin/schemas';
import { modelGateway } from '../../gateway/model-provider';
import { fetchRealProductImages } from '../../tools/products/image-sourcing';

export class ProductApprovalWorkflow {
  constructor(private toolRegistry: ToolRegistry) {}

  private resolveAssetUrl(rawUrl: string): string {
    if (!rawUrl) return '';
    if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
      return rawUrl;
    }
    const backendUrl = process.env.VENDURE_ADMIN_API_URL 
      ? process.env.VENDURE_ADMIN_API_URL.replace(/\/admin-api\/?$/, '')
      : 'http://ahizan_backend:3000';
    return `${backendUrl.replace(/\/$/, '')}/${rawUrl.replace(/^\//, '')}`;
  }

  private resolveInternalAssetUrl(rawUrl: string): string {
    if (!rawUrl) return '';
    const internalBase = process.env.VENDURE_ADMIN_API_URL 
      ? process.env.VENDURE_ADMIN_API_URL.replace(/\/admin-api\/?$/, '')
      : 'http://ahizan_backend:3000';
    
    if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
      try {
        const u = new URL(rawUrl);
        if (u.hostname.includes('ahizan.com') || u.hostname === '127.0.0.1' || u.hostname === 'localhost') {
          return `${internalBase}${u.pathname}${u.search}`;
        }
      } catch {}
      return rawUrl;
    }
    return `${internalBase.replace(/\/$/, '')}/${rawUrl.replace(/^\//, '')}`;
  }

  async analyze(
    productId: string,
    context?: RequestContext,
    options?: { forcedMode?: 'AUTO' | 'VISUAL_TRUTH' | 'SELLER_CLAIM' | 'RAW_SUBMISSION' | 'CUSTOM'; customQuery?: string }
  ): Promise<ProductApprovalAnalysis> {
    // 1. Load raw product details from Vendure
    const product = await this.toolRegistry.execute('getProductDetails', { productId }, context);
    if (!product || product.error) {
      throw new Error(product?.error || `Impossible de charger le produit #${productId}`);
    }

    const rawName = (options?.customQuery && options.customQuery.trim().length > 2) ? options.customQuery.trim() : (product.name || '').trim();
    const rawDesc = (product.description || '').replace(/<[^>]*>/g, '').trim();
    const assets: any[] = product.assets || (product.featuredAsset ? [product.featuredAsset] : []);
    const assetsCount = assets.length;
    const variantsCount = product.variants?.length || 0;
    const vendorName = product.customFields?.vendor?.name || 'Vendeur Marchand';
    const mainVariant = product.variants?.[0];
    const sellerPrice = mainVariant?.price || 0;

    // 2. Duplicate detection scan against official catalog
    const titleWords = rawName.split(/\s+/).filter((w: string) => w.length > 1);
    const brandGuess = titleWords[0] || 'Marque';
    const modelGuess = titleWords.slice(1, 4).join(' ') || rawName;

    const duplicatesResult = await this.toolRegistry.execute(
      'findPotentialDuplicates',
      { query: rawName, brand: brandGuess, excludeId: productId },
      context
    ).catch(() => ({ duplicates: [] }));

    const matches: any[] = duplicatesResult?.duplicates || [];
    const topMatch = matches.length > 0 ? matches[0] : null;

    const duplicateMatch: DuplicateMatchInfo = {
      found: !!topMatch && topMatch.similarityScore >= 0.5,
      confidence: topMatch ? Math.min(topMatch.similarityScore + 0.1, 0.98) : 0,
      targetProductId: topMatch?.id,
      targetProductName: topMatch?.name,
      similarityScore: topMatch?.similarityScore,
      reason: topMatch
        ? `Concordance catalogue identifiée avec la fiche officielle #${topMatch.id} "${topMatch.name}".`
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
      strengths.push('Au moins une déclinaison marchande valide');
    } else {
      missingElements.push('Aucune déclinaison marchande configurée');
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

    // 4. Baseline heuristic for Master Product
    const cleanedTitle = `${brandGuess} ${modelGuess}`.replace(/\s+/g, ' ').trim();
    const collectionName = product.collections?.[0]?.name || 'Catalogue Général';
    const collectionId = product.collections?.[0]?.id || '';

    // Détection basique heuristique anti-spam (ex: "laissez moi", "test", "...", vide)
    const isNonsenseText = /^(laissez\s*moi|test|azerty|asdf|produit\s*test|non|rien|\.{2,}|x{3,})$/i.test(rawName) || rawName.length < 3;

    let detectedColor = 'Standard';
    if (/noir|black|sombre/i.test(rawName)) detectedColor = 'Noir';
    else if (/or|gold|dore/i.test(rawName)) detectedColor = 'Or';
    else if (/bleu|blue/i.test(rawName)) detectedColor = 'Bleu';
    else if (/rouge|red/i.test(rawName)) detectedColor = 'Rouge';
    else if (/blanc|white/i.test(rawName)) detectedColor = 'Blanc';
    else if (/argent|silver|gris|grey/i.test(rawName)) detectedColor = 'Argent';

    const defaultDescriptionHtml = `<h3>Présentation du ${cleanedTitle}</h3>
<p>${cleanedTitle} allie design soigné, performances optimales et fiabilité certifiée. Idéal pour un usage quotidien au Bénin avec une garantie de conformité Ahizan Marketplace.</p>

<h3>Points Forts et Caractéristiques</h3>
<ul>
  <li><strong>Marque :</strong> ${brandGuess} d'origine certifiée.</li>
  <li><strong>Conception :</strong> Finition robuste et prise en main ergonomique.</li>
  <li><strong>Compatibilité & Fiabilité :</strong> Répond aux exigences de qualité strictes de la marketplace.</li>
  <li><strong>Garantie Ahizan :</strong> Service client dédié et livraison sécurisée à Cotonou et partout au Bénin.</li>
</ul>

<p><strong>Contenu du coffret :</strong> ${cleanedTitle} et accessoires de base constructeur.</p>`;

    let proposedOfficialProduct: ProposedOfficialProduct = {
      isValidSubmission: !isNonsenseText,
      rejectionCategory: isNonsenseText ? 'NONSENSE_SPAM' : 'NONE',
      rejectionSuggestedMessage: isNonsenseText
        ? `Votre proposition "${rawName}" ne correspond à aucun article commercial identifiable sur Ahizan. Merci de soumettre un titre clair et une photo authentique de votre article.`
        : undefined,
      name: cleanedTitle.length > 5 ? cleanedTitle : rawName,
      brand: brandGuess,
      model: modelGuess,
      shortDescription: product.customFields?.shortDescription || `${cleanedTitle} original certifié pour la vente sur Ahizan Marketplace.`,
      description: rawDesc && rawDesc.length > 50 ? `<p>${rawDesc}</p>\n${defaultDescriptionHtml}` : defaultDescriptionHtml,
      seoTitle: `${cleanedTitle} au meilleur prix | Ahizan Bénin`,
      seoDescription: `Achetez ${cleanedTitle} en ligne sur Ahizan. Livraison rapide à Cotonou et partout au Bénin. Paiement sécurisé et garantie retour.`,
      categoryName: collectionName,
      collectionId,
      truthScore: isNonsenseText ? 15 : 85,
      truthLevel: isNonsenseText ? 'SUSPICIOUS' : 'HIGH',
      truthRationale: isNonsenseText 
        ? 'Le texte soumis est incohérent ou assimilé à un test / spam sans correspondance commerciale.'
        : 'Proposition normalisée avec succès pour le catalogue officiel central Ahizan.',
      visualOcrInsights: {
        detectedBrand: brandGuess,
        detectedModel: modelGuess,
        detectedColor,
        imageQualityRating: assetsCount > 0 ? 'GOOD' : 'NO_IMAGE',
      },
      technicalSpecs: [
        { key: 'Marque', value: brandGuess, facetKey: 'brand' },
        { key: 'Modèle', value: modelGuess, facetKey: 'model' },
        { key: 'Authenticité', value: '100% Produit Certifié', facetKey: 'authenticity' },
        { key: 'Garantie', value: 'Garantie Ahizan Bénin', facetKey: 'warranty' },
      ],
      suggestedOfficialImages: assets.map((a: any, idx: number) => ({
        id: String(a.id || idx + 1),
        url: this.resolveAssetUrl(a.preview),
        previewUrl: this.resolveAssetUrl(a.preview),
        label: idx === 0 ? `Photo vendeur principale` : `Photo secondaire #${idx + 1}`,
        isPrimary: idx === 0,
        source: 'Photo Vendeur Certifiée',
        variantOptionValue: detectedColor !== 'Standard' ? detectedColor : undefined,
        imageType: idx === 0 ? 'MAIN_WHITE_BG' : 'BACK',
      }))
    };

    const detectedContradictions: any[] = [];
    const hypotheses: any[] = [];

    // 4.b LLM Multimodal Analysis & Structured Generation
    try {
      const model = modelGateway.getModel();

      // Préparation des visuels pour le LLM (téléchargement buffer local sécurisé pour OCR & vision)
      const imageParts: Array<{ type: 'image'; image: Buffer }> = [];
      for (const asset of assets.slice(0, 3)) {
        if (asset.preview) {
          const fullUrl = this.resolveInternalAssetUrl(asset.preview);
          if (fullUrl.startsWith('http://') || fullUrl.startsWith('https://')) {
            try {
              const imgRes = await fetch(fullUrl, { signal: AbortSignal.timeout(3500) });
              if (imgRes.ok) {
                const arrayBuf = await imgRes.arrayBuffer();
                imageParts.push({ type: 'image', image: Buffer.from(arrayBuf) });
              }
            } catch (imgErr: any) {
              console.warn('[ProductApprovalWorkflow] Failed to fetch image asset for OCR:', fullUrl, imgErr.message);
            }
          }
        }
      }

      // Récupération des collections existantes sur la plateforme
      let availableCollections: Array<{ id: string; name: string }> = [];
      try {
        availableCollections = await this.toolRegistry.execute('listCollections', { take: 200 }, context);
      } catch {}
      const collectionsSummary = availableCollections.map(c => `[ID: "${c.id}"] "${c.name}"`).join('\n');

      const promptInstructions = `Tu es l'Inspecteur Qualité & Expert Catalogue E-Commerce d'Ahizan Marketplace au Bénin.

MISSION CRITIQUE : NORMALISATION DE LA FICHE OFFICIELLE DU PRODUIT MAÎTRE (TITRE RICHE & VENDEUR, CATÉGORISATION EXACTE, DESCRIPTION HTML, SEO & SPÉCIFICATIONS TECHNIQUES).

1. OBSERVATION VISUELLE & OCR APPROFONDI :
   - Analyse méticuleusement chaque image fournie : lis tout le texte imprimé (boîtes, emballages, appareil, logos, références techniques, modèle exact, coloris, connectique).
   - Renseigne 'visualOcrInsights' avec la marque détectée, le modèle exact, le texte OCR lisible et la couleur réelle.
   - Compare la réalité visuelle observée avec le texte déclaré par le vendeur ("${rawName}").
   - Détermine 'truthScore' (0-100), 'truthLevel' ('HIGH' | 'MEDIUM' | 'LOW' | 'SUSPICIOUS') et 'truthRationale'.

2. TITRE DU PRODUIT MAÎTRE ('name') — COMPLET, VENDEUR, RICHE ET PROFESSIONNEL :
   - Rédige un titre e-commerce COMPLET, DÉTAILLÉ, PROFESSIONNEL et VENDEUR pour le catalogue central officiel Ahizan.
   - Formule d'excellence : [Type de produit précis] [Marque] [Modèle / Référence exacte] [Spécifications majeures clés / Technologie / Format / Finition].
   - Exemples de titres attendus :
     • Pour un microphone : "Microphone à Condensateur Professionnel ZGEER NW-800 Studio Cardioïde XLR Faible Bruit"
     • Pour un smartphone : "Smartphone Samsung Galaxy S8 Écran Infinity 5.8'' Super AMOLED 64Go Double SIM 4G"
     • Pour un iPhone : "Smartphone Apple iPhone 13 5G Puce A15 Bionic Écran Super Retina XDR 128Go"
     • Pour un PC : "Ordinateur Portable HP 15-dw Intel Core i5 8Go RAM 512Go SSD Windows 11"
     • Pour une TV : "Téléviseur Smart TV LG 55 pouces 4K UHD HDR webOS ThinQ AI"
     • Pour un vêtement : "Robe Longue d'Été Fleurie Style Bohème Chic Coupe Évasée Col V"
   - Le titre ne doit JAMAIS être tronqué ou réducteur. Il doit maximiser le SEO et la clarté pour l'acheteur.

3. CLASSIFICATION OBLIGATOIRE DANS LA BONNE COLLECTION ('collectionId' & 'categoryName') :
   - Sélectionne la catégorie la plus pertinente parmi la liste officielle suivante :
${collectionsSummary || '[ID: "1"] "Catalogue Général"'}
   - TU DOIS OBLIGATOIREMENT renseigner 'collectionId' avec l'ID exact entre crochets [ID: "xxx"] de la collection choisie.
   - Renseigne 'categoryName' avec le nom exact de la collection.

4. SPÉCIFICATIONS TECHNIQUES & FACETTES DE FILTRAGE ('technicalSpecs') :
   - Identifie 4 à 8 critères techniques majeurs (Marque, Modèle, Connectique, Autonomie, Matériaux, Puissance, Garantie, etc.).
   - Renseigne un 'facetKey' normalisé (ex: 'brand', 'model', 'connectivity', 'warranty', 'authenticity').

5. DESCRIPTION HTML RICHE ('description') ET DESCRIPTION COURTE ('shortDescription') :
   - Rédige une description complète, soignée et structurée en HTML propre (<h3>, <p>, <ul>, <li>, <strong>) avec présentation du produit, points forts et caractéristiques, contenu du coffret et garantie Ahizan Bénin.

DONNÉES DU PRODUIT VENDEUR :
- Titre Vendeur : "${rawName}"
- Description Vendeur : "${rawDesc}"
- Prix Proposé : ${sellerPrice} FCFA
- Catégorie Initiale : "${collectionName}" (ID: ${collectionId})
- Photos fournies : ${assetsCount}`;

      const content: Array<any> = [
        { type: 'text', text: promptInstructions },
        ...imageParts
      ];

      const llmResult = await generateObject({
        model,
        schema: proposedOfficialProductSchema,
        abortSignal: AbortSignal.timeout(45000),
        messages: [
          {
            role: 'user',
            content,
          }
        ]
      });

      if (llmResult.object) {
        const enriched = llmResult.object;
        
        proposedOfficialProduct = {
          ...proposedOfficialProduct,
          ...enriched,
          name: (enriched.name && enriched.name.trim().length >= 6) ? enriched.name.trim() : proposedOfficialProduct.name,
          categoryName: enriched.categoryName || collectionName,
          collectionId: enriched.collectionId || collectionId,
          description: enriched.description || defaultDescriptionHtml,
        };
      }
    } catch (e: any) {
      console.warn('[ProductApprovalWorkflow] LLM analysis fallback to heuristic:', e.message);
    }

    // 4.c Contradiction & Visual Anomaly Detection Engine
    const visualBrand = (proposedOfficialProduct.visualOcrInsights?.detectedBrand && proposedOfficialProduct.visualOcrInsights.detectedBrand !== 'null')
      ? proposedOfficialProduct.visualOcrInsights.detectedBrand
      : (proposedOfficialProduct.brand || brandGuess);
    const visualModel = (proposedOfficialProduct.visualOcrInsights?.detectedModel && proposedOfficialProduct.visualOcrInsights.detectedModel !== 'null')
      ? proposedOfficialProduct.visualOcrInsights.detectedModel
      : (proposedOfficialProduct.model || modelGuess);
    const visualColor = (proposedOfficialProduct.visualOcrInsights?.detectedColor && proposedOfficialProduct.visualOcrInsights.detectedColor !== 'null')
      ? proposedOfficialProduct.visualOcrInsights.detectedColor
      : detectedColor;

    const sellerBrandLower = brandGuess.toLowerCase();
    const visualBrandLower = visualBrand.toLowerCase();
    const isBrandConflict = visualBrandLower.length > 2 && sellerBrandLower.length > 2 && !visualBrandLower.includes(sellerBrandLower) && !sellerBrandLower.includes(visualBrandLower);

    if (isBrandConflict) {
      detectedContradictions.push({
        field: 'Marque & Identité',
        sellerValue: brandGuess,
        visualValue: visualBrand,
        explanation: `Le vendeur a déclaré la marque "${brandGuess}", mais le visuel inspecté correspond à "${visualBrand}".`,
        severity: 'HIGH',
      });
    }

    const sellerModelLower = modelGuess.toLowerCase();
    const visualModelLower = visualModel.toLowerCase();
    const isModelConflict = visualModelLower.length > 2 && sellerModelLower.length > 2 && !visualModelLower.includes(sellerModelLower) && !sellerModelLower.includes(visualModelLower);

    if (isModelConflict) {
      detectedContradictions.push({
        field: 'Modèle ou Référence',
        sellerValue: modelGuess,
        visualValue: visualModel,
        explanation: `Le titre soumis mentionne "${modelGuess}", or l'inspection visuelle identifie formellement "${visualBrand} ${visualModel}".`,
        severity: 'HIGH',
      });
    }

    if (detectedColor && visualColor && detectedColor.toLowerCase() !== visualColor.toLowerCase() && detectedColor !== 'Standard' && visualColor !== 'Standard') {
      detectedContradictions.push({
        field: 'Couleur',
        sellerValue: detectedColor,
        visualValue: visualColor,
        explanation: `Le titre mentionne "${detectedColor}", alors que la couleur constatée sur la photo est "${visualColor}".`,
        severity: 'MEDIUM',
      });
    }

    if (proposedOfficialProduct.truthScore < 60 && detectedContradictions.length === 0) {
      detectedContradictions.push({
        field: 'Conformité Fiche / Visuel',
        sellerValue: rawName,
        visualValue: `${visualBrand} ${visualModel}`,
        explanation: proposedOfficialProduct.truthRationale || `Décalage détecté entre les informations déclarées et l'analyse visuelle de l'article.`,
        severity: 'HIGH',
      });
    }

    // 4.d Build Images list & Source High-Definition Official Packshots
    const finalImages: SuggestedOfficialImage[] = [];
    const seenImageUrls = new Set<string>();

    // 1. Seller Images
    for (let idx = 0; idx < assets.length; idx++) {
      const a = assets[idx];
      const preview = this.resolveAssetUrl(a.preview);
      if (preview && !seenImageUrls.has(preview)) {
        seenImageUrls.add(preview);
        finalImages.push({
          id: `seller-img-${a.id || idx}`,
          url: preview,
          previewUrl: preview,
          label: idx === 0 ? `Photo vendeur principale` : `Photo secondaire #${idx + 1}`,
          isPrimary: idx === 0,
          source: 'Photo Vendeur Certifiée',
          imageType: idx === 0 ? 'MAIN_WHITE_BG' : 'BACK',
        });
      }
    }

    // 2. Search Genuine HD Official Packshots via DuckDuckGo / Bing / Wikimedia
    try {
      const searchBrand = visualBrand || proposedOfficialProduct.brand || brandGuess;
      const searchModel = visualModel || proposedOfficialProduct.model || modelGuess;
      if (searchBrand && searchBrand.length >= 2 && searchModel && searchModel.length >= 2) {
        const sourced = await fetchRealProductImages({
          brand: searchBrand,
          model: searchModel,
          colors: detectedColor && detectedColor !== 'Standard' ? [detectedColor] : [],
          maxTotal: 6,
        });

        for (const s of sourced) {
          if (!seenImageUrls.has(s.url) && !seenImageUrls.has(s.previewUrl)) {
            seenImageUrls.add(s.url);
            seenImageUrls.add(s.previewUrl);
            finalImages.push({
              id: s.id,
              url: s.url,
              previewUrl: s.previewUrl,
              label: s.title || `Packshot Officiel ${searchBrand} ${searchModel}`,
              isPrimary: finalImages.length === 0,
              source: `Catalogue Officiel (${s.source})`,
              variantOptionValue: s.variantOptionValue,
              imageType: s.imageType || 'MAIN_WHITE_BG',
            });
          }
        }
      }
    } catch (imgErr: any) {
      console.warn('[ProductApprovalWorkflow] Failed to source external packshots:', imgErr?.message);
    }

    if (finalImages.length > 0) {
      proposedOfficialProduct.suggestedOfficialImages = finalImages;
    }

    // 4.e Build Complete Hypotheses (Visual Truth, Seller Claim, Raw)
    const proposalA: ProposedOfficialProduct = {
      ...proposedOfficialProduct,
      truthScore: detectedContradictions.length > 0 ? 90 : proposedOfficialProduct.truthScore,
      truthRationale: detectedContradictions.length > 0 
        ? `Fiche officielle corrigée selon la réalité visuelle constatée (${visualBrand} ${visualModel}).`
        : proposedOfficialProduct.truthRationale,
    };

    hypotheses.push({
      id: 'VISUAL_TRUTH',
      label: `🖼️ Vérité Visuelle & IA (${proposedOfficialProduct.name})`,
      description: `Titre riche et complet normalisé par l'IA d'après l'inspection des photos.`,
      confidence: 0.90,
      product: proposalA,
    });

    const sellerClaimName = rawName.length > 5 ? rawName : `${brandGuess} ${modelGuess}`.trim();
    const proposalB: ProposedOfficialProduct = {
      ...proposedOfficialProduct,
      name: sellerClaimName,
      brand: brandGuess,
      model: modelGuess,
      shortDescription: `${sellerClaimName} original avec garantie vendeur sur Ahizan Bénin.`,
      description: rawDesc ? `<p>${rawDesc}</p>\n${defaultDescriptionHtml}` : defaultDescriptionHtml,
      seoTitle: `${sellerClaimName} au meilleur prix | Ahizan Bénin`,
      seoDescription: `Commandez votre ${sellerClaimName} en ligne sur Ahizan. Livraison rapide à Cotonou et partout au Bénin.`,
      truthScore: 80,
      truthLevel: 'MEDIUM',
      truthRationale: `Fiche officielle générée en priorisant la déclaration textuelle du vendeur.`,
    };

    hypotheses.push({
      id: 'SELLER_CLAIM',
      label: `📱 Déclaration Vendeur (${sellerClaimName.slice(0, 30)}${sellerClaimName.length > 30 ? '...' : ''})`,
      description: `Fiche officielle générée en priorisant le titre et la description déclarés par le vendeur.`,
      confidence: 0.80,
      product: proposalB,
    });

    const proposalC: ProposedOfficialProduct = {
      ...proposedOfficialProduct,
      name: rawName,
      brand: brandGuess,
      model: modelGuess,
      description: rawDesc ? `<p>${rawDesc}</p>` : defaultDescriptionHtml,
      truthScore: 70,
      truthLevel: 'MEDIUM',
      truthRationale: `Données brutes telles que soumises par le vendeur.`,
    };

    hypotheses.push({
      id: 'RAW',
      label: `📝 Données Brutes ("${rawName.slice(0, 24)}${rawName.length > 24 ? '...' : ''}")`,
      description: `Conserve les informations brutes fournies par le vendeur sans retouche.`,
      confidence: 0.70,
      product: proposalC,
    });

    const proposalsMap: Record<string, ProposedOfficialProduct> = {
      VISUAL_TRUTH: proposalA,
      SELLER_CLAIM: proposalB,
      RAW: proposalC,
    };

    // Handle forcedMode selection if requested
    if (options?.forcedMode === 'SELLER_CLAIM') {
      proposedOfficialProduct = proposalB;
    } else if ((options?.forcedMode as any) === 'RAW' || (options?.forcedMode as any) === 'RAW_SUBMISSION') {
      proposedOfficialProduct = proposalC;
    } else if (options?.forcedMode === 'VISUAL_TRUTH') {
      proposedOfficialProduct = proposalA;
    }

    // 5. Decision recommendation & confidence
    let recommendation: 'APPROVE_OFFICIAL' | 'REGRAFT_EXISTING' | 'REQUEST_INFORMATION' | 'REJECT';
    let confidence = 0.85;
    let decisionRationale = '';

    if (!proposedOfficialProduct.isValidSubmission || proposedOfficialProduct.rejectionCategory === 'NONSENSE_SPAM') {
      recommendation = 'REJECT';
      confidence = 0.98;
      decisionRationale = `Soumission classée invalide / spam (${proposedOfficialProduct.truthRationale}). Action recommandée : Rejeter avec le message automatique au vendeur.`;
    } else if (duplicateMatch.found && (duplicateMatch.similarityScore || 0) >= 0.7) {
      recommendation = 'REGRAFT_EXISTING';
      confidence = 0.92;
      decisionRationale = `Ce produit correspond à la fiche officielle existante #${topMatch.id} (${topMatch.name}). Recommandation : Re-greffer l'offre vendeur.`;
    } else if (detectedContradictions.length > 0) {
      recommendation = 'REQUEST_INFORMATION';
      confidence = 0.85;
      decisionRationale = `Des contradictions ont été détectées entre les visuels et le texte (${detectedContradictions.map(c => c.field).join(', ')}). Veuillez choisir l'hypothèse appropriée avant validation.`;
    } else if (qualityScore.canPublish && proposedOfficialProduct.truthScore >= 60) {
      recommendation = 'APPROVE_OFFICIAL';
      confidence = Math.min(0.95, Math.max(0.70, proposedOfficialProduct.truthScore / 100));
      decisionRationale = `Le produit est authentique et prêt pour le catalogue officiel (Score Qualité: ${qualityScore.score}/100, Taux de vérité: ${proposedOfficialProduct.truthScore}%).`;
    } else {
      recommendation = 'REQUEST_INFORMATION';
      confidence = 0.80;
      decisionRationale = `Le produit présente des données incomplètes ou un taux de vérité incertain (${proposedOfficialProduct.truthScore}%).`;
    }

    return {
      productId,
      recommendation,
      confidence,
      decisionRationale,
      duplicateMatch,
      proposedOfficialProduct,
      proposals: proposalsMap,
      detectedContradictions: detectedContradictions.length > 0 ? detectedContradictions : undefined,
      hypotheses: hypotheses.length > 0 ? hypotheses : undefined,
      qualityScore,
      usedDataSources: [
        'Vendure Product Entity #' + productId,
        'Ahizan searchOfficialProducts Index',
        'Google Gemini 2.5 Flash Multimodal Engine',
      ]
    };
  }

  /**
   * Régénération granulaire d'un champ de la fiche
   */
  async regenerateField(
    productId: string,
    field: 'title' | 'description' | 'seo' | 'images' | 'specs',
    currentProposal: ProposedOfficialProduct,
    context?: RequestContext
  ): Promise<Partial<ProposedOfficialProduct>> {
    const product = await this.toolRegistry.execute('getProductDetails', { productId }, context).catch(() => null);
    const rawName = product?.name || currentProposal.name;

    try {
      const model = modelGateway.getModel();

      if (field === 'title') {
        const { text } = await generateText({
          model,
          prompt: `Rédige un titre e-commerce complet, professionnel, détaillé et vendeur pour le produit officiel : "${rawName}".
Marque: ${currentProposal.brand}, Modèle: ${currentProposal.model}.
Format attendu : [Type de produit] [Marque] [Modèle / Gamme exacte] [Spécification majeure standard / Processeur / Édition / Caractéristique distinctive globale].
Exemples :
- "Smartphone Samsung Galaxy S8 Écran Infinity 5.8'' Super AMOLED Double SIM"
- "Ordinateur Portable HP 15 Intel Core i5 8Go RAM 512Go SSD Windows 11"
Important : Le titre doit être riche et valorisant sans être réduit à 2 mots, et sans couleur/taille unique.
Retourne uniquement le titre épuré sur une seule ligne.`,
        });
        return { name: text.trim().replace(/^["']|["']$/g, '') || `${currentProposal.brand} ${currentProposal.model}` };
      }

      if (field === 'description') {
        const { text } = await generateText({
          model,
          prompt: `Rédige une description e-commerce longue et complète en HTML pour la fiche officielle de "${currentProposal.name}".
Marque: ${currentProposal.brand}, Modèle: ${currentProposal.model}.
Format attendu : Balises <h3>, <p>, <ul>, <li>, <strong>.
Inclus : Présentation détaillée, points forts et caractéristiques, contenu du coffret, garantie et service client Ahizan Bénin.
Retourne uniquement le code HTML propre sans bloc markdown.`,
        });
        const cleanHtml = text.replace(/```html/g, '').replace(/```/g, '').trim();
        return {
          description: cleanHtml,
          shortDescription: `${currentProposal.name} original certifié par Ahizan Marketplace. Finition soignée, performances optimales et garantie avec livraison rapide au Bénin.`
        };
      }

      if (field === 'seo') {
        return {
          seoTitle: `Acheter ${currentProposal.name} au meilleur prix | Ahizan Bénin`,
          seoDescription: `Commandez votre ${currentProposal.name} authentique en ligne sur Ahizan. Livraison sécurisée à Cotonou, Calavi, Porto-Novo et tout le Bénin.`,
        };
      }

      if (field === 'specs') {
        return {
          technicalSpecs: [
            { key: 'Marque', value: currentProposal.brand, facetKey: 'brand' },
            { key: 'Modèle', value: currentProposal.model, facetKey: 'model' },
            { key: 'Garantie Constructeur', value: '12 Mois Certifié', facetKey: 'warranty' },
            { key: 'Disponibilité', value: 'En Stock Bénin', facetKey: 'availability' },
            { key: 'État', value: 'Neuf d\'Origine', facetKey: 'condition' }
          ]
        };
      }

      if (field === 'images') {
        const baseImages = currentProposal.suggestedOfficialImages || [];
        const seenUrls = new Set(baseImages.map(img => img.url));
        const newImages: SuggestedOfficialImage[] = [...baseImages];

        const searchBrand = currentProposal.brand || '';
        const searchModel = currentProposal.model || '';
        if (searchBrand.length >= 2 || searchModel.length >= 2) {
          const sourced = await fetchRealProductImages({
            brand: searchBrand,
            model: searchModel,
            maxTotal: 8,
          });

          for (const s of sourced) {
            if (!seenUrls.has(s.url) && !seenUrls.has(s.previewUrl)) {
              seenUrls.add(s.url);
              seenUrls.add(s.previewUrl);
              newImages.push({
                id: s.id,
                url: s.url,
                previewUrl: s.previewUrl,
                label: s.title || `Packshot HD ${searchBrand} ${searchModel}`,
                isPrimary: newImages.length === 0,
                source: `Catalogue Officiel (${s.source})`,
                variantOptionValue: s.variantOptionValue,
                imageType: s.imageType || 'MAIN_WHITE_BG',
              });
            }
          }
        }

        return {
          suggestedOfficialImages: newImages,
        };
      }

    } catch (err: any) {
      console.warn('[ProductApprovalWorkflow] regenerateField error, using fallback:', err.message);
    }

    return currentProposal;
  }
}
