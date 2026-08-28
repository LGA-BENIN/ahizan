import { Injectable } from '@nestjs/common';
import { 
    TransactionalConnection, 
    RequestContext, 
    Product, 
    FacetValue,
    FacetValueService
} from '@vendure/core';

@Injectable()
export class AiNormalizerService {
    constructor(
        private connection: TransactionalConnection,
        private facetValueService: FacetValueService
    ) {}

    /**
     * AI-normalize product metadata and compute FQS Quality Score
     */
    async normalizeProduct(ctx: RequestContext, productId: string): Promise<Product> {
        const productRepo = this.connection.getRepository(ctx, Product);
        
        const product = await productRepo.findOne({
            where: { id: productId },
            relations: ['translations', 'assets', 'facetValues', 'facetValues.facet']
        });

        if (!product) {
            throw new Error(`Product with ID ${productId} not found`);
        }

        const translation = product.translations.find((t: any) => t.languageCode === ctx.languageCode) || product.translations[0];
        const name = translation?.name || '';
        const description = translation?.description || '';

        // 1. Calculate FQS Score (Out of 100)
        let fqsScore = 0;

        // Points for Images (30 pts max)
        const imageCount = product.assets?.length || 0;
        if (imageCount >= 3) fqsScore += 30;
        else if (imageCount > 0) fqsScore += 15;

        // Points for Description (20 pts max)
        const descLength = description.replace(/<[^>]*>/g, '').trim().length;
        if (descLength > 150) fqsScore += 20;
        else if (descLength > 50) fqsScore += 10;

        // Points for Specifications (30 pts max)
        // Detect structured specs inside the description (e.g., Key-Value formats or technical keywords)
        const technicalKeywords = ['ram', 'stockage', 'storage', 'go', 'gb', 'taille', 'dimension', 'poids', 'weight', 'couleur', 'color', 'écran', 'screen', 'processeur', 'cpu'];
        let matchedKeywordsCount = 0;
        const lowerDesc = description.toLowerCase();
        
        for (const kw of technicalKeywords) {
            if (lowerDesc.includes(kw)) {
                matchedKeywordsCount++;
            }
        }

        if (matchedKeywordsCount >= 4) fqsScore += 30;
        else if (matchedKeywordsCount >= 2) fqsScore += 15;

        // Points for existing Facets (20 pts max)
        const facetCount = product.facetValues?.length || 0;
        if (facetCount >= 2) fqsScore += 20;
        else if (facetCount > 0) fqsScore += 10;

        // 2. Mock AI Feature Extraction & Auto-Categorization (Faceting)
        // We match keywords from the name/description and associate appropriate FacetValues
        const facetValueRepo = this.connection.getRepository(ctx, FacetValue);
        const allFacetValues = await facetValueRepo.find({ relations: ['translations', 'facet', 'facet.translations'] });
        const newFacetValues: FacetValue[] = [...(product.facetValues || [])];

        const lowercaseName = name.toLowerCase();
        const lowercaseDesc = description.toLowerCase();

        for (const fv of allFacetValues) {
            const fvName = (fv.translations.find((t: any) => t.languageCode === ctx.languageCode) || fv.translations[0])?.name?.toLowerCase() || '';
            const facetCode = fv.facet?.code?.toLowerCase() || '';

            // Check if brand or storage spec is mentioned in product details
            if (fvName && (lowercaseName.includes(fvName) || lowercaseDesc.includes(fvName))) {
                // Avoid duplicating the facet value
                if (!newFacetValues.some(existing => existing.id === fv.id)) {
                    newFacetValues.push(fv);
                }
            }
        }

        // Apply facet points bonus if we just auto-extracted new ones
        if (newFacetValues.length > facetCount && facetCount === 0) {
            fqsScore = Math.min(100, fqsScore + 15);
        }

        // Save facets association using Vendure service or direct assignment
        product.facetValues = newFacetValues;

        // 3. Save FQS details on product custom fields
        if (!product.customFields) {
            product.customFields = {} as any;
        }
        (product.customFields as any).fqsScore = fqsScore;
        (product.customFields as any).aiNormalized = true;

        const savedProduct = await productRepo.save(product);

        console.log(`[AiNormalizerService] Product ${productId} normalized. FQS score computed: ${fqsScore}/100.`);

        return savedProduct;
    }
}
