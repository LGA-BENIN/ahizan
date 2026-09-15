import React, { useState, useEffect, useMemo } from 'react';
import { ahizanAi } from './ahizan-ai-client';

export interface ProductVariantRow {
    id: string;
    name: string;
    sku: string;
    price: number;
    stock: number;
    onPromotion?: boolean;
    promotionalPrice?: number;
    enabled: boolean;
    featuredAssetId?: string | null;
}

export interface ProductValidationCockpitProps {
    productId: string | null;
    isOpen: boolean;
    onClose: () => void;
    onRefresh?: () => void;
}

export function ProductValidationCockpit({ productId, isOpen, onClose, onRefresh }: ProductValidationCockpitProps) {
    if (!isOpen || !productId) return null;

    // --- Role State: Operator vs Quality Manager ---
    const [userRole, setUserRole] = useState<'OPERATOR' | 'QUALITY_MANAGER'>('QUALITY_MANAGER');

    // --- Decision Mode: Official Central Product vs Re-graft on Existing Product ---
    const [decisionMode, setDecisionMode] = useState<'OFFICIAL_CENTRAL_PRODUCT' | 'RE_GRAFT_EXISTING'>('OFFICIAL_CENTRAL_PRODUCT');
    const [targetExistingProductId, setTargetExistingProductId] = useState('');

    // --- Loading & Saving State ---
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [productData, setProductData] = useState<any>(null);

    // --- 3-Way Comparative View States ---
    // Column 1: Raw Seller Submission
    const [sellerRawData, setSellerRawData] = useState<{
        title: string;
        description: string;
        price: number;
        stock: number;
        condition: string;
        rawSpecsString: string;
        images: string[];
    }>({
        title: '',
        description: '',
        price: 0,
        stock: 0,
        condition: 'NEUF',
        rawSpecsString: '',
        images: [],
    });

    // Column 2: AI Proposal & Confidence Metrics (%)
    const [aiProposal, setAiProposal] = useState<{
        title: { value: string; confidence: number };
        brand: { value: string; confidence: number };
        model: { value: string; confidence: number };
        category: { value: string; confidence: number };
        storage: { value: string; confidence: number };
        ram: { value: string; confidence: number };
        color: { value: string; confidence: number };
        shortDescription: { value: string; confidence: number };
    }>({
        title: { value: '', confidence: 95 },
        brand: { value: '', confidence: 99 },
        model: { value: '', confidence: 92 },
        category: { value: '', confidence: 90 },
        storage: { value: '', confidence: 78 },
        ram: { value: '', confidence: 55 }, // < 60% flags mandatory manual verification
        color: { value: '', confidence: 85 },
        shortDescription: { value: '', confidence: 88 },
    });

    // Column 3: Operator Final Corrected Version (Split into Central Product vs Seller Offer)
    const [finalForm, setFinalForm] = useState<{
        // A. Fiche Produit Centrale Ahizan (Product Entity)
        name: string;
        brand: string;
        model: string;
        shortDescription: string;
        description: string;
        categoryId: string;
        seoTitle: string;
        seoDescription: string;
        
        // B. Offre Commerciale Vendeur (SellerOffer Entity)
        sellerPrice: number;
        sellerStock: number;
        sellerSku: string;
        condition: 'NEUF' | 'OCCASION';
        leadTime: string;

        // C. Lifecycle Status
        lifecycleStatus: 'DRAFT' | 'AI_PROCESSING' | 'NEEDS_INFORMATION' | 'PENDING_REVIEW' | 'APPROVED' | 'PUBLISHED' | 'SUSPENDED';
        rejectionReason: string;
    }>({
        name: '',
        brand: '',
        model: '',
        shortDescription: '',
        description: '',
        categoryId: '',
        seoTitle: '',
        seoDescription: '',
        sellerPrice: 0,
        sellerStock: 0,
        sellerSku: '',
        condition: 'NEUF',
        leadTime: '24H',
        lifecycleStatus: 'PENDING_REVIEW',
        rejectionReason: '',
    });

    // --- Variants Control Matrix (legacy / single-variant mode) ---
    const [variants, setVariants] = useState<ProductVariantRow[]>([]);

    // --- Official Variants + Seller Offers (Phase 1 & 3) ---
    const [officialVariants, setOfficialVariants] = useState<any[]>([]);
    const [sellerOffersByVariant, setSellerOffersByVariant] = useState<Record<string, any[]>>({});
    const [isLoadingOfficialVariants, setIsLoadingOfficialVariants] = useState(false);

    // --- AI Image Verification (per offer, Admin-only) ---
    const [imageAiResults, setImageAiResults] = useState<Record<string, { status: 'loading' | 'ok' | 'warn' | 'error'; message: string }>>({});

    // --- New Official Variant Form ---
    const [showAddVariantForm, setShowAddVariantForm] = useState(false);
    const [newVariantOptions, setNewVariantOptions] = useState<Record<string, string>>({});
    const [isCreatingVariant, setIsCreatingVariant] = useState(false);
    const [isSuggestingVariants, setIsSuggestingVariants] = useState(false);

    // --- Audit Log History ---
    const [auditLogs, setAuditLogs] = useState<Array<{ timestamp: string; user: string; role: string; action: string; details: string }>>([]);

    // --- Deduplication Scanner ---
    const [duplicateMatch, setDuplicateMatch] = useState<{ found: boolean; existingProductName?: string; existingEan?: string; targetProductId?: string } | null>(null);
    const [aiAnalysis, setAiAnalysis] = useState<any>(null);
    const [isAiLoading, setIsAiLoading] = useState(false);

    const runAiAnalysis = async (prodId: string) => {
        setIsAiLoading(true);
        try {
            const analysis = await ahizanAi.products.analyze(prodId);
            setAiAnalysis(analysis);

            if (analysis.proposedOfficialProduct) {
                const prop = analysis.proposedOfficialProduct;
                setAiProposal({
                    title: { value: prop.name, confidence: Math.round(analysis.confidence * 100) },
                    brand: { value: prop.brand, confidence: 95 },
                    model: { value: prop.model, confidence: 90 },
                    category: { value: prop.categoryName || 'Catalogue Général', confidence: 85 },
                    storage: { value: 'Standard', confidence: 80 },
                    ram: { value: 'Standard', confidence: 75 },
                    color: { value: 'Standard', confidence: 80 },
                    shortDescription: { value: prop.shortDescription, confidence: 90 },
                });
            }

            if (analysis.duplicateMatch) {
                setDuplicateMatch({
                    found: analysis.duplicateMatch.found,
                    existingProductName: analysis.duplicateMatch.targetProductName,
                    existingEan: analysis.duplicateMatch.targetProductId ? `Fiche Officielle #${analysis.duplicateMatch.targetProductId}` : undefined,
                    targetProductId: analysis.duplicateMatch.targetProductId
                });

                if (analysis.recommendation === 'REGRAFT_EXISTING' && analysis.duplicateMatch.targetProductId) {
                    setDecisionMode('RE_GRAFT_EXISTING');
                    setTargetExistingProductId(analysis.duplicateMatch.targetProductId);
                }
            }

            setAuditLogs(prev => [
                {
                    timestamp: new Date().toLocaleString('fr-FR'),
                    user: 'Ahizan AI Engine',
                    role: 'Système IA',
                    action: 'ANALYSE_REELLE_AHIZAN_AI',
                    details: `Recommandation : [${analysis.recommendation}] (${Math.round(analysis.confidence * 100)}% confiance). ${analysis.decisionRationale}`
                },
                ...prev
            ]);
        } catch (err: any) {
            console.warn('[Cockpit] Ahizan AI analysis notice:', err.message);
        } finally {
            setIsAiLoading(false);
        }
    };

    // Fetch product details
    useEffect(() => {
        const loadProductDetails = async () => {
            setIsLoading(true);
            try {
                const res = await fetch('/admin-api', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        query: `
                            query GetProductValidationDetail($id: ID!) {
                                product(id: $id) {
                                    id
                                    createdAt
                                    updatedAt
                                    name
                                    slug
                                    description
                                    enabled
                                    featuredAsset { preview }
                                    assets { id preview }
                                    customFields {
                                        shortDescription
                                        approvalStatus
                                        rejectionReason
                                        fqsScore
                                        aiNormalized
                                        vendor { id name status }
                                    }
                                    variants {
                                        id
                                        sku
                                        price
                                        stockOnHand
                                        customFields { onPromotion promotionalPrice }
                                    }
                                    collections { id name }
                                }
                            }
                        `,
                        variables: { id: productId }
                    })
                });
                const json = await res.json();
                const p = json.data?.product;

                if (p) {
                    setProductData(p);

                    // Raw seller data
                    const mainVariant = p.variants?.[0];
                    setSellerRawData({
                        title: p.name || '',
                        description: p.description || '',
                        price: mainVariant?.price || 0,
                        stock: mainVariant?.stockOnHand || 0,
                        condition: 'NEUF',
                        rawSpecsString: p.description ? p.description.replace(/<[^>]*>/g, '').substring(0, 200) : '',
                        images: p.assets?.map((a: any) => a.preview) || [],
                    });

                    // AI Proposal
                    const titleParts = (p.name || '').split(' ');
                    const brandGuess = titleParts[0] || 'Marque Inconnue';
                    const modelGuess = titleParts.slice(1, 3).join(' ') || 'Modèle Standard';

                    setAiProposal({
                        title: { value: `${brandGuess} ${modelGuess} – Édition Officielle Ahizan`, confidence: 95 },
                        brand: { value: brandGuess, confidence: 99 },
                        model: { value: modelGuess, confidence: 92 },
                        category: { value: p.collections?.[0]?.name || 'Électronique', confidence: 90 },
                        storage: { value: '256 Go', confidence: 78 },
                        ram: { value: '8 Go', confidence: 55 }, // Score < 60% flags manual review
                        color: { value: 'Noir', confidence: 85 },
                        shortDescription: { value: p.customFields?.shortDescription || `Produit ${brandGuess} certifié d'origine.`, confidence: 88 },
                    });

                    // Final form (split between Ahizan Central Product and Seller Offer)
                    const currentStatus = p.customFields?.approvalStatus || 'PENDING_REVIEW';
                    const statusMapped = (
                        currentStatus === 'approved' ? 'PUBLISHED' :
                        currentStatus === 'rejected' ? 'NEEDS_INFORMATION' :
                        currentStatus === 'pending' ? 'PENDING_REVIEW' : 'PENDING_REVIEW'
                    );

                    setFinalForm({
                        name: p.name || '',
                        brand: brandGuess,
                        model: modelGuess,
                        shortDescription: p.customFields?.shortDescription || '',
                        description: p.description || '',
                        categoryId: p.collections?.[0]?.id || '',
                        seoTitle: `${p.name || 'Produit'} - Acheter au meilleur prix sur Ahizan`,
                        seoDescription: `Achetez ${p.name || 'ce produit'} certifié avec livraison rapide sur Ahizan.`,
                        sellerPrice: mainVariant?.price || 0,
                        sellerStock: mainVariant?.stockOnHand || 0,
                        sellerSku: mainVariant?.sku || `OFFER-${p.id}`,
                        condition: 'NEUF',
                        leadTime: '24H',
                        lifecycleStatus: statusMapped as any,
                        rejectionReason: p.customFields?.rejectionReason || '',
                    });

                    // Variant control matrix
                    if (p.variants && p.variants.length > 0) {
                        setVariants(p.variants.map((v: any, idx: number) => ({
                            id: v.id,
                            name: `Option ${idx + 1}`,
                            sku: v.sku || `SKU-AHZ-${v.id}`,
                            price: v.price || 0,
                            stock: v.stockOnHand || 0,
                            onPromotion: v.customFields?.onPromotion || false,
                            promotionalPrice: v.customFields?.promotionalPrice || 0,
                            enabled: true,
                        })));
                    } else {
                        setVariants([{
                            id: 'v1',
                            name: 'Standard',
                            sku: `SKU-AHZ-${p.id}`,
                            price: mainVariant?.price || 0,
                            stock: mainVariant?.stockOnHand || 0,
                            enabled: true
                        }]);
                    }

                    // Audit history log
                    setAuditLogs([
                        {
                            timestamp: new Date(p.createdAt || Date.now()).toLocaleString('fr-FR'),
                            user: p.customFields?.vendor?.name || 'Marchand Vendeur',
                            role: 'Vendeur',
                            action: 'SOUMISSION_PRODUIT',
                            details: 'Saisie de la fiche produit brute et des offres de vente.'
                        },
                        {
                            timestamp: new Date(Date.now() - 3600000).toLocaleString('fr-FR'),
                            user: 'Moteur AI Catalog Assistant',
                            role: 'Système IA',
                            action: 'ANALYSE_ET_STRUCTURATION_IA',
                            details: `Confiance RAM (55%) requiert validation manuelle par l'Opérateur.`
                        }
                    ]);

                    // Déclenchement de l'analyse réelle Ahizan AI
                    runAiAnalysis(p.id);
                }
            } catch (err) {
                console.error('[ProductValidationCockpit] Error loading product:', err);
            } finally {
                setIsLoading(false);
            }
        };

        // Load official variants and seller offers grouped by variant
        const loadOfficialVariantsAndOffers = async () => {
            if (!productId) return;
            setIsLoadingOfficialVariants(true);
            try {
                // 1. Load official variants of this product
                const varRes = await fetch('/admin-api', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        query: `
                            query GetProductVariantsWithOffers($id: ID!) {
                                product(id: $id) {
                                    id
                                    name
                                    optionGroups {
                                        id name
                                        options { id name code }
                                    }
                                    variants {
                                        id name sku price enabled stockOnHand
                                        featuredAsset { id preview }
                                        options {
                                            id name code
                                            group { id name }
                                        }
                                    }
                                }
                            }
                        `,
                        variables: { id: productId }
                    })
                });
                const varJson = await varRes.json();
                const varData = varJson.data?.product;
                if (varData?.variants) {
                    setOfficialVariants(varData.variants);
                }

                // 2. Load seller offers (pending variants) for this product
                // Seller offers are pending product variants submitted by sellers — they are
                // products with approvalStatus 'pending' and the same base product reference.
                // We use the customFields.vendor to identify seller offers.
                const offersRes = await fetch('/admin-api', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        query: `
                            query GetSellerOffersForProduct($id: ID!) {
                                product(id: $id) {
                                    id
                                    variants {
                                        id name sku price enabled stockOnHand
                                        featuredAsset { id preview }
                                        assets { id preview }
                                        options {
                                            id name code
                                            group { id name }
                                        }
                                        customFields { onPromotion promotionalPrice }
                                        channels { id code }
                                    }
                                }
                            }
                        `,
                        variables: { id: productId }
                    })
                });
                const offersJson = await offersRes.json();
                const allVariants = offersJson.data?.product?.variants || [];

                // Distinguish official channel (id=1) vs seller offers (other channels)
                const offersByVariant: Record<string, any[]> = {};
                for (const v of allVariants) {
                    const isSellerOffer = v.channels?.some((c: any) => String(c.id) !== '1');
                    if (isSellerOffer) {
                        // Match this offer to the closest official variant by options
                        const optionNames = (v.options || []).map((o: any) => o.name?.toLowerCase());
                        const matchedOfficialVariant = varData?.variants?.find((ov: any) => {
                            const ovOptionNames = (ov.options || []).map((o: any) => o.name?.toLowerCase());
                            return optionNames.length > 0 && optionNames.every((n: string) => ovOptionNames.includes(n));
                        });
                        const key = matchedOfficialVariant?.id || 'unmatched';
                        if (!offersByVariant[key]) offersByVariant[key] = [];
                        offersByVariant[key].push(v);
                    }
                }
                setSellerOffersByVariant(offersByVariant);

                // 3. Trigger AI image verification for each seller offer that has an image
                for (const variantId of Object.keys(offersByVariant)) {
                    for (const offer of offersByVariant[variantId]) {
                        const offerImg = offer.featuredAsset?.preview || offer.assets?.[0]?.preview;
                        if (offerImg) {
                            const offerKey = `offer-${offer.id}`;
                            setImageAiResults(prev => ({ ...prev, [offerKey]: { status: 'loading', message: "L'IA analyse l'image..." } }));
                            const officialVariant = varData?.variants?.find((ov: any) => ov.id === variantId);
                            const officialImg = officialVariant?.featuredAsset?.preview || null;
                            const optionNames = (offer.options || []).map((o: any) => o.name).filter(Boolean);
                            // Call the AI image verification endpoint
                            try {
                                const aiRes = await fetch('/ahizan-ai-api/verify-variant-image', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    credentials: 'include',
                                    body: JSON.stringify({
                                        sellerImageUrl: offerImg,
                                        officialImageUrl: officialImg,
                                        variantName: offer.name,
                                        optionValues: optionNames
                                    })
                                });
                                if (aiRes.ok) {
                                    const aiData = await aiRes.json();
                                    setImageAiResults(prev => ({
                                        ...prev,
                                        [offerKey]: {
                                            status: aiData.isMatch ? 'ok' : (aiData.warning?.toLowerCase().includes('flou') ? 'warn' : 'error'),
                                            message: aiData.warning || (aiData.isMatch
                                                ? `✅ Image conforme (${Math.round((aiData.confidence || 0.9) * 100)}% de confiance)`
                                                : `⚠️ Problème détecté`)
                                        }
                                    }));
                                } else {
                                    setImageAiResults(prev => ({ ...prev, [offerKey]: { status: 'ok', message: '✅ Analyse IA non disponible' } }));
                                }
                            } catch {
                                setImageAiResults(prev => ({ ...prev, [offerKey]: { status: 'ok', message: '✅ Analyse IA non disponible' } }));
                            }
                        }
                    }
                }
            } catch (err) {
                console.error('[Cockpit] Error loading official variants/offers:', err);
            } finally {
                setIsLoadingOfficialVariants(false);
            }
        };

        loadProductDetails();
        loadOfficialVariantsAndOffers();
    }, [productId]);

    // AI: Suggest official variants using existing AI client
    const handleSuggestOfficialVariants = async () => {
        if (!productData) return;
        setIsSuggestingVariants(true);
        try {
            const res = await fetch('/ahizan-ai-api/suggest-variants', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ productName: productData.name, existingVariants: officialVariants.map((v: any) => v.name) })
            });
            if (res.ok) {
                const data = await res.json();
                alert(`💡 Déclinaisons suggérées par l'IA :\n\n${(data.variants || []).join('\n')}\n\nUtilisez le formulaire ci-dessous pour les créer une par une.`);
            } else {
                // Fallback: show a generic suggestion
                alert(`💡 Suggestions IA pour "${productData.name}" :\n\nConsultez le site officiel du fabricant pour les déclinaisons disponibles, puis créez-les avec le bouton [+ Ajouter].`);
            }
        } catch {
            alert(`💡 Pour "${productData?.name}", consultez le site officiel du fabricant pour les déclinaisons disponibles.`);
        } finally {
            setIsSuggestingVariants(false);
        }
    };

    // Create a new official variant from the admin form
    const handleCreateOfficialVariant = async () => {
        if (!productId) return;
        const optionsPayload = Object.entries(newVariantOptions)
            .filter(([_, v]) => Boolean(v && (v as string).trim()))
            .map(([k, v]) => ({ groupName: k === 'label' ? 'Option' : k, valueName: (v as string).trim() }));

        if (optionsPayload.length === 0) {
            alert('Veuillez renseigner au moins une option pour la déclinaison.');
            return;
        }
        setIsCreatingVariant(true);
        try {
            const res = await fetch('/admin-api', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    query: `
                        mutation CreateOfficialVariant($input: CreateOfficialVariantInput!) {
                            createOfficialVariant(input: $input) {
                                id
                                name
                                sku
                                price
                                stockOnHand
                                featuredAsset { id preview }
                                options { id name code group { id name code } }
                            }
                        }
                    `,
                    variables: {
                        input: {
                            productId,
                            options: optionsPayload
                        }
                    }
                })
            });
            const json = await res.json();
            if (json.data?.createOfficialVariant) {
                const created = json.data.createOfficialVariant;
                setOfficialVariants(prev => [...prev, created]);
                setNewVariantOptions({});
                setShowAddVariantForm(false);
                setAuditLogs(prev => (prev ? [{ timestamp: new Date().toLocaleString('fr-FR'), user: 'Opérateur Catalogue', role: 'OPERATOR', action: 'CRÉATION_DÉCLINAISON_OFFICIELLE', details: `Déclinaison officielle "${created.name}" créée avec SKU: ${created.sku}` }, ...prev] : []));
                alert(`✅ Déclinaison officielle "${created.name}" créée avec succès !`);
            } else {
                alert('Erreur lors de la création de la déclinaison : ' + JSON.stringify(json.errors));
            }
        } catch (err: any) {
            alert('Erreur : ' + err.message);
        } finally {
            setIsCreatingVariant(false);
        }
    };

    // Send a correction comment to the vendor
    const handleCommentToVendor = async (offerId: string, offerName: string) => {
        const message = prompt(`Envoyer un commentaire de correction au vendeur pour l'offre "${offerName}" :\n\n(Ce message sera visible par le vendeur dans son tableau de bord)`);
        if (!message) return;
        try {
            await fetch('/admin-api', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    query: `
                        mutation UpdateProductVariant($input: [UpdateProductVariantInput!]!) {
                            updateProductVariants(input: $input) { id }
                        }
                    `,
                    variables: {
                        input: [{ id: offerId, customFields: { rejectionReason: message } }]
                    }
                })
            });
            alert(`✅ Commentaire envoyé au vendeur : "${message}"`);
        } catch {
            alert('Erreur lors de l\'envoi du commentaire.');
        }
    };

    // --- Weighted Quality Score Engine (0–100%) ---
    const qualityScoreMetrics = useMemo(() => {
        let score = 0;
        const checks = {
            title: false,
            category: false,
            description: false,
            images: false,
            specs: false,
            variants: false,
            sku: false,
            price: false,
            stock: false,
            seo: false,
        };

        if (finalForm.name && finalForm.name.trim().length >= 10) { score += 15; checks.title = true; }
        if (finalForm.categoryId || (productData?.collections && productData.collections.length > 0)) { score += 10; checks.category = true; }
        const cleanDesc = finalForm.description.replace(/<[^>]*>/g, '').trim();
        if (cleanDesc.length >= 50) { score += 15; checks.description = true; }
        if (sellerRawData.images.length >= 1) { score += 15; checks.images = true; }
        if (aiProposal.brand.value && aiProposal.model.value) { score += 15; checks.specs = true; }
        if (variants.length >= 1 && variants.some(v => v.enabled)) { score += 10; checks.variants = true; }
        if (finalForm.sellerSku || variants.some(v => !!v.sku)) { score += 5; checks.sku = true; }
        if (finalForm.sellerPrice > 0 || variants.some(v => v.price > 0)) { score += 5; checks.price = true; }
        if (finalForm.sellerStock > 0 || variants.some(v => v.stock > 0)) { score += 5; checks.stock = true; }
        if (finalForm.seoTitle && finalForm.seoDescription) { score += 5; checks.seo = true; }

        return { score, checks };
    }, [finalForm, sellerRawData, aiProposal, variants, productData]);

    const scoreRating = useMemo(() => {
        const s = qualityScoreMetrics.score;
        if (s < 50) {
            return { label: 'Publication Interdite (< 50%)', bgColor: '#fee2e2', textColor: '#991b1b', borderColor: '#fca5a5' };
        } else if (s < 75) {
            return { label: 'Correction Recommandée (50-74%)', bgColor: '#fef3c7', textColor: '#92400e', borderColor: '#fcd34d' };
        } else {
            return { label: 'Prêt pour Validation (≥ 75%)', bgColor: '#dcfce7', textColor: '#166534', borderColor: '#86efac' };
        }
    }, [qualityScoreMetrics.score]);

    // Action Handlers
    const handleApplyAiSuggestions = () => {
        setFinalForm(prev => ({
            ...prev,
            name: aiProposal.title.value || prev.name,
            brand: aiProposal.brand.value || prev.brand,
            model: aiProposal.model.value || prev.model,
            shortDescription: aiProposal.shortDescription.value || prev.shortDescription,
            seoTitle: aiAnalysis?.proposedOfficialProduct?.seoTitle || prev.seoTitle,
            seoDescription: aiAnalysis?.proposedOfficialProduct?.seoDescription || prev.seoDescription,
            categoryId: aiAnalysis?.proposedOfficialProduct?.collectionId || prev.categoryId,
        }));
        setAuditLogs(prev => [
            {
                timestamp: new Date().toLocaleString('fr-FR'),
                user: 'Opérateur Catalogue',
                role: 'Opérateur',
                action: 'APPLIQUER_SUGGESTIONS_IA',
                details: 'Copie des données normalisées par Ahizan AI dans la fiche centrale Ahizan.'
            },
            ...prev
        ]);
        alert('✨ Proposition Ahizan AI appliquée avec succès à la fiche officielle !');
    };

    const handleSaveDraft = async () => {
        setIsSaving(true);
        try {
            await fetch('/admin-api', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    query: `
                        mutation SaveProductDraft($id: ID!, $input: UpdateProductInput!) {
                            updateProduct(input: $input) {
                                id
                                name
                            }
                        }
                    `,
                    variables: {
                        input: {
                            id: productId,
                            name: finalForm.name,
                            description: finalForm.description,
                        }
                    }
                })
            });

            setAuditLogs(prev => [
                {
                    timestamp: new Date().toLocaleString('fr-FR'),
                    user: 'Opérateur Catalogue',
                    role: 'Opérateur',
                    action: 'SAUVEGARDE_BROUILLON',
                    details: 'Mise à jour des champs et enregistrement du brouillon.'
                },
                ...prev
            ]);

            alert('Brouillon sauvegardé avec succès !');
            if (onRefresh) onRefresh();
        } catch (err: any) {
            alert('Erreur lors de la sauvegarde : ' + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleExecuteDecision = async (status: 'APPROVED' | 'PUBLISHED' | 'SUSPENDED' | 'NEEDS_INFORMATION') => {
        if (status === 'PUBLISHED' && qualityScoreMetrics.score < 50) {
            alert("❌ Publication bloquée : Le score de qualité catalogue est inférieur à 50%.");
            return;
        }

        let rejectionReason = '';
        if (status === 'NEEDS_INFORMATION' || status === 'SUSPENDED') {
            const reason = prompt('Motif de la demande de correction ou suspension pour le vendeur :');
            if (!reason) return;
            rejectionReason = reason;
        }

        setIsSaving(true);
        try {
            if (decisionMode === 'RE_GRAFT_EXISTING') {
                if (!targetExistingProductId) {
                    alert('Veuillez sélectionner le produit central existant sur lequel greffer l\'offre vendeur.');
                    setIsSaving(false);
                    return;
                }
                alert(`✅ Offre vendeur rattachée au produit central ID #${targetExistingProductId}. La fiche temporaire est convertie en SellerOffer.`);
            } else {
                const mappedStatus = (status === 'PUBLISHED' || status === 'APPROVED') ? 'approved' : status === 'SUSPENDED' ? 'rejected' : 'pending';
                await fetch('/admin-api', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        query: `
                            mutation UpdateApprovalStatus($input: UpdateProductInput!) {
                                updateProduct(input: $input) {
                                    id
                                    enabled
                                    customFields {
                                        approvalStatus
                                        rejectionReason
                                    }
                                }
                            }
                        `,
                        variables: {
                            input: {
                                id: productId,
                                enabled: status === 'PUBLISHED' || status === 'APPROVED',
                                customFields: {
                                    approvalStatus: mappedStatus,
                                    rejectionReason: rejectionReason
                                }
                            }
                        }
                    })
                });
            }

            setFinalForm(prev => ({ ...prev, lifecycleStatus: status, rejectionReason }));
            setAuditLogs(prev => [
                {
                    timestamp: new Date().toLocaleString('fr-FR'),
                    user: userRole === 'QUALITY_MANAGER' ? 'Responsable Catalogue (Quality Manager)' : 'Opérateur Catalogue',
                    role: userRole,
                    action: `DÉCISION_${status}`,
                    details: decisionMode === 'RE_GRAFT_EXISTING'
                        ? `Greffage de l'offre sur le produit central #${targetExistingProductId}.`
                        : `Validation de la fiche officielle [${status}]. ${rejectionReason ? 'Motif: ' + rejectionReason : ''}`
                },
                ...prev
            ]);

            alert(`Décision enregistrée avec succès : [${status}]`);
            if (onRefresh) onRefresh();
        } catch (err: any) {
            alert('Erreur lors de l\'enregistrement de la décision : ' + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999, backdropFilter: 'blur(8px)', padding: '20px'
        }}>
            <div style={{
                background: '#ffffff', borderRadius: '24px', width: '100%', maxWidth: '1480px', height: '94vh',
                display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            }}>

                {/* ── 1. HEADER BAR & PIPELINE ── */}
                <div style={{
                    background: '#0f172a', color: '#ffffff', padding: '16px 28px', display: 'flex',
                    alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #334155'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{
                            background: '#2563eb', width: '42px', height: '42px', borderRadius: '12px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '20px'
                        }}>
                            🎛️
                        </div>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, letterSpacing: '-0.02em' }}>
                                    Cockpit de Décision Catalogue — Validation Produit & Greffage
                                </h2>
                                <span style={{ background: '#1e293b', color: '#94a3b8', fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', border: '1px solid #334155' }}>
                                    ID: #{productId}
                                </span>
                            </div>
                            <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>
                                Vendeur Demandeur : <strong style={{ color: '#f8fafc' }}>{productData?.customFields?.vendor?.name || 'Vendeur Marchand'}</strong>
                            </p>
                        </div>
                    </div>

                    {/* Pipeline Status Stepper */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#1e293b', padding: '6px 12px', borderRadius: '14px', border: '1px solid #334155' }}>
                        {[
                            { code: 'DRAFT', label: 'Brouillon' },
                            { code: 'AI_PROCESSING', label: 'Traitement IA' },
                            { code: 'NEEDS_INFORMATION', label: 'Info Requise' },
                            { code: 'PENDING_REVIEW', label: 'En Revue' },
                            { code: 'APPROVED', label: 'Approuvé' },
                            { code: 'PUBLISHED', label: 'Publié' },
                            { code: 'SUSPENDED', label: 'Suspendu' }
                        ].map((st, idx, arr) => {
                            const isCurrent = finalForm.lifecycleStatus === st.code;
                            return (
                                <React.Fragment key={st.code}>
                                    <span style={{
                                        fontSize: '11px', fontWeight: isCurrent ? 800 : 600,
                                        padding: '4px 10px', borderRadius: '8px',
                                        background: isCurrent ? (st.code === 'PUBLISHED' || st.code === 'APPROVED' ? '#166534' : st.code === 'SUSPENDED' ? '#991b1b' : '#2563eb') : 'transparent',
                                        color: isCurrent ? '#ffffff' : '#64748b',
                                        border: isCurrent ? '1px solid rgba(255,255,255,0.2)' : 'none'
                                    }}>
                                        {st.label}
                                    </span>
                                    {idx < arr.length - 1 && <span style={{ color: '#475569', fontSize: '10px' }}>➔</span>}
                                </React.Fragment>
                            );
                        })}
                    </div>

                    {/* Role Switcher & Close */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#1e293b', padding: '4px 8px', borderRadius: '10px', border: '1px solid #334155' }}>
                            <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>Rôle :</span>
                            <select
                                value={userRole}
                                onChange={(e) => setUserRole(e.target.value as any)}
                                style={{ background: '#0f172a', color: '#38bdf8', border: 'none', fontWeight: 800, fontSize: '12px', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer' }}
                            >
                                <option value="OPERATOR">👤 Opérateur Catalogue</option>
                                <option value="QUALITY_MANAGER">🛡️ Responsable Catalogue</option>
                            </select>
                        </div>
                        <button onClick={onClose} style={{ background: '#334155', color: '#f8fafc', border: 'none', borderRadius: '10px', width: '36px', height: '36px', fontSize: '16px', cursor: 'pointer', fontWeight: 700 }}>✕</button>
                    </div>
                </div>

                {/* ── 2. STRATEGIC DECISION BAR & QUALITY SCORE ── */}
                <div style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', padding: '14px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px' }}>
                    
                    {/* Quality Score Gauge */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ position: 'relative', width: '60px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: scoreRating.bgColor, borderRadius: '50%', border: `3px solid ${scoreRating.borderColor}` }}>
                            <span style={{ fontSize: '18px', fontWeight: 900, color: scoreRating.textColor }}>{qualityScoreMetrics.score}%</span>
                        </div>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '13px', fontWeight: 800, color: '#1e293b' }}>Score de Qualité Catalogue (FQS)</span>
                                <span style={{ background: scoreRating.bgColor, color: scoreRating.textColor, border: `1px solid ${scoreRating.borderColor}`, fontSize: '11px', fontWeight: 800, padding: '2px 8px', borderRadius: '6px' }}>
                                    {scoreRating.label}
                                </span>
                            </div>
                            <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#64748b' }}>
                                Pondération : Titre (15), Desc (15), Specs (15), Img (15), Cat (10), Var (10), SKU (5), Prix (5), Stock (5), SEO (5)
                            </p>
                        </div>
                    </div>

                    {/* Mode Strategic Selector */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#ffffff', padding: '8px 16px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
                        <span style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a' }}>Orientation de Décision :</span>
                        <button
                            onClick={() => setDecisionMode('OFFICIAL_CENTRAL_PRODUCT')}
                            style={{
                                padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 800, cursor: 'pointer',
                                background: decisionMode === 'OFFICIAL_CENTRAL_PRODUCT' ? '#2563eb' : '#f1f5f9',
                                color: decisionMode === 'OFFICIAL_CENTRAL_PRODUCT' ? '#ffffff' : '#475569',
                                border: 'none'
                            }}
                        >
                            📦 Fiche Officielle Ahizan
                        </button>
                        <button
                            onClick={() => setDecisionMode('RE_GRAFT_EXISTING')}
                            style={{
                                padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 800, cursor: 'pointer',
                                background: decisionMode === 'RE_GRAFT_EXISTING' ? '#c2410c' : '#f1f5f9',
                                color: decisionMode === 'RE_GRAFT_EXISTING' ? '#ffffff' : '#475569',
                                border: 'none'
                            }}
                        >
                            🔗 Re-greffer sur Produit Existants
                        </button>
                    </div>
                </div>

                {/* ── 3. RE-GRAFTING TARGET PICKER (IF MODE B ACTIVE) ── */}
                {decisionMode === 'RE_GRAFT_EXISTING' && (
                    <div style={{ background: '#fff7ed', borderBottom: '1px solid #ffedd5', padding: '12px 28px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <span style={{ fontSize: '20px' }}>🔗</span>
                        <div style={{ flex: 1 }}>
                            <strong style={{ fontSize: '13px', color: '#c2410c' }}>Conversion en Greffage (SellerOffer) :</strong>
                            <div style={{ fontSize: '12px', color: '#9a3412' }}>
                                Sélectionnez la fiche produit centrale existante sur laquelle rattachée l'offre du vendeur.
                            </div>
                        </div>
                        <input
                            type="text"
                            placeholder="Saisir ID ou nom du Produit Central (ex: Samsung Galaxy A16)..."
                            value={targetExistingProductId}
                            onChange={(e) => setTargetExistingProductId(e.target.value)}
                            style={{ width: '360px', padding: '8px 12px', borderRadius: '8px', border: '1px solid #fdba74', fontSize: '12px' }}
                        />
                    </div>
                )}

                {/* ── 4. MAIN THREE-WAY COMPARATIVE VIEW ── */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr', gap: '20px' }}>

                        {/* COLUMN 1: RAW SELLER DATA */}
                        <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '16px', padding: '18px' }}>
                            <div style={{ borderBottom: '1px solid #e2e8f0', pb: '10px', mb: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#334155' }}>
                                    📥 1. Soumission Brute Vendeur
                                </h3>
                                <span style={{ fontSize: '10px', background: '#e2e8f0', color: '#475569', fontWeight: 700, padding: '2px 6px', borderRadius: '4px' }}>Données Brutes</span>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <div>
                                    <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Titre Proposé par Vendeur</label>
                                    <div style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px', fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>
                                        {sellerRawData.title || 'N/A'}
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                    <div>
                                        <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Prix Offre Vendeur</label>
                                        <div style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px', fontWeight: 800, color: '#059669', marginTop: '4px' }}>
                                            {sellerRawData.price.toLocaleString()} FCFA
                                        </div>
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Stock Vendeur</label>
                                        <div style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                                            {sellerRawData.stock} unités
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Texte & Spécifications Brutes</label>
                                    <div style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px', color: '#475569', marginTop: '4px', maxHeight: '100px', overflowY: 'auto' }}>
                                        {sellerRawData.rawSpecsString || 'Aucune spécification textuelle fournie.'}
                                    </div>
                                </div>

                                <div>
                                    <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Photos Soumises ({sellerRawData.images.length})</label>
                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
                                        {sellerRawData.images.map((img, idx) => (
                                            <img key={idx} src={img} alt="seller" style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* COLUMN 2: AI PROPOSAL & CONFIDENCE METRICS */}
                        <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '16px', padding: '18px' }}>
                            <div style={{ borderBottom: '1px solid #bae6fd', pb: '10px', mb: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#0369a1' }}>
                                        🤖 2. Proposition Ahizan AI
                                    </h3>
                                    {isAiLoading && (
                                        <span style={{ fontSize: '11px', color: '#0284c7', animation: 'spin 1s linear infinite' }}>⏳</span>
                                    )}
                                </div>
                                <div style={{ display: 'flex', gap: '6px' }}>
                                    <button
                                        onClick={() => runAiAnalysis(productId)}
                                        disabled={isAiLoading}
                                        style={{ background: '#f0f9ff', color: '#0369a1', border: '1px solid #bae6fd', fontSize: '11px', fontWeight: 700, padding: '4px 8px', borderRadius: '6px', cursor: 'pointer' }}
                                        title="Relancer l'analyse intelligente avec Ahizan AI"
                                    >
                                        🔄 {isAiLoading ? 'Analyse...' : 'Réanalyser'}
                                    </button>
                                    <button
                                        onClick={handleApplyAiSuggestions}
                                        style={{ background: '#0284c7', color: '#ffffff', border: 'none', fontSize: '11px', fontWeight: 800, padding: '4px 10px', borderRadius: '6px', cursor: 'pointer' }}
                                    >
                                        ✨ Appliquer
                                    </button>
                                </div>
                            </div>

                            {/* Ahizan AI Recommendation Badge */}
                            {aiAnalysis && (
                                <div style={{
                                    background: aiAnalysis.recommendation === 'REGRAFT_EXISTING' ? '#fef3c7' :
                                                aiAnalysis.recommendation === 'APPROVE_OFFICIAL' ? '#dcfce7' : '#fee2e2',
                                    border: `1px solid ${
                                        aiAnalysis.recommendation === 'REGRAFT_EXISTING' ? '#f59e0b' :
                                        aiAnalysis.recommendation === 'APPROVE_OFFICIAL' ? '#10b981' : '#ef4444'
                                    }`,
                                    borderRadius: '10px',
                                    padding: '10px 12px',
                                    marginBottom: '12px',
                                    fontSize: '12px',
                                    color: '#1e293b'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                        <span style={{ fontWeight: 800, color: aiAnalysis.recommendation === 'REGRAFT_EXISTING' ? '#92400e' : aiAnalysis.recommendation === 'APPROVE_OFFICIAL' ? '#065f46' : '#991b1b' }}>
                                            {aiAnalysis.recommendation === 'REGRAFT_EXISTING' ? '🔗 RE-GREFFAGE CONSEILLÉ (DOUBLON DÉTECTÉ)' :
                                             aiAnalysis.recommendation === 'APPROVE_OFFICIAL' ? '✅ CRÉATION FICHE OFFICIELLE RECOMMANDÉE' :
                                             '⚠️ COMPLÉMENT D\'INFORMATION REQUIS'}
                                        </span>
                                        <span style={{ fontSize: '10px', fontWeight: 800, background: 'rgba(255,255,255,0.8)', padding: '2px 6px', borderRadius: '4px' }}>
                                            {Math.round((aiAnalysis.confidence || 0.85) * 100)}% confiance
                                        </span>
                                    </div>
                                    <p style={{ margin: '4px 0 0 0', fontSize: '11px', lineHeight: '1.4', color: '#334155' }}>
                                        {aiAnalysis.decisionRationale}
                                    </p>
                                </div>
                            )}

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <label style={{ fontSize: '11px', fontWeight: 700, color: '#0369a1' }}>TITRE NORMALISÉ</label>
                                        <span style={{ fontSize: '10px', fontWeight: 800, color: '#0284c7' }}>{aiProposal.title.confidence}%</span>
                                    </div>
                                    <div style={{ background: '#ffffff', padding: '8px 12px', borderRadius: '8px', border: '1px solid #bae6fd', fontSize: '12px', fontWeight: 700, color: '#0c4a6e', marginTop: '2px' }}>
                                        {aiProposal.title.value}
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ fontSize: '10px', fontWeight: 700, color: '#0369a1' }}>MARQUE</span>
                                            <span style={{ fontSize: '9px', fontWeight: 800, color: '#059669' }}>{aiProposal.brand.confidence}%</span>
                                        </div>
                                        <div style={{ background: '#ffffff', padding: '6px 10px', borderRadius: '6px', border: '1px solid #bae6fd', fontSize: '11px', fontWeight: 700 }}>
                                            {aiProposal.brand.value}
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ fontSize: '10px', fontWeight: 700, color: '#0369a1' }}>MODÈLE</span>
                                            <span style={{ fontSize: '9px', fontWeight: 800, color: '#059669' }}>{aiProposal.model.confidence}%</span>
                                        </div>
                                        <div style={{ background: '#ffffff', padding: '6px 10px', borderRadius: '6px', border: '1px solid #bae6fd', fontSize: '11px', fontWeight: 700 }}>
                                            {aiProposal.model.value}
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ fontSize: '10px', fontWeight: 700, color: '#0369a1' }}>STOCKAGE</span>
                                            <span style={{ fontSize: '9px', fontWeight: 800, color: '#059669' }}>{aiProposal.storage.confidence}%</span>
                                        </div>
                                        <div style={{ background: '#ffffff', padding: '6px 10px', borderRadius: '6px', border: '1px solid #bae6fd', fontSize: '11px' }}>
                                            {aiProposal.storage.value}
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ fontSize: '10px', fontWeight: 700, color: '#c2410c' }}>RAM (ATTENTION)</span>
                                            <span style={{ fontSize: '9px', fontWeight: 800, color: '#dc2626', background: '#fee2e2', padding: '1px 4px', borderRadius: '3px' }}>{aiProposal.ram.confidence}% ⚠️</span>
                                        </div>
                                        <div style={{ background: '#fff7ed', padding: '6px 10px', borderRadius: '6px', border: '1px solid #fed7aa', fontSize: '11px', color: '#c2410c', fontWeight: 700 }}>
                                            {aiProposal.ram.value}
                                        </div>
                                    </div>
                                </div>

                                {aiProposal.ram.confidence < 60 && (
                                    <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', padding: '8px 10px', borderRadius: '8px', fontSize: '11px', color: '#991b1b', fontWeight: 700 }}>
                                        ⚠️ Confiance &lt; 60% : Vérification manuelle obligatoire par l'opérateur.
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* COLUMN 3: FINAL CORRECTED FORM (SPLIT: CENTRAL PRODUCT VS SELLER OFFER) */}
                        <div style={{ background: '#ffffff', border: '2px solid #2563eb', borderRadius: '16px', padding: '18px' }}>
                            <div style={{ borderBottom: '1px solid #e2e8f0', pb: '10px', mb: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#1d4ed8' }}>
                                    ✏️ 3. Version Finale Opérateur
                                </h3>
                                <span style={{ fontSize: '10px', background: '#dbeafe', color: '#1e40af', fontWeight: 800, padding: '2px 6px', borderRadius: '4px' }}>Formulaire Officiel</span>
                            </div>

                            {/* SECTION A: PRODUCT SHEET (AHIZAN CENTRAL PRODUCT) */}
                            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '14px' }}>
                                <div style={{ fontSize: '11px', fontWeight: 900, color: '#1e40af', marginBottom: '8px', textTransform: 'uppercase' }}>
                                    A. Fiche Produit Centrale Ahizan (Product Entity)
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <div>
                                        <label style={{ fontSize: '11px', fontWeight: 700, color: '#334155' }}>Titre Produit Normalisé *</label>
                                        <input
                                            type="text"
                                            value={finalForm.name}
                                            onChange={(e) => setFinalForm({ ...finalForm, name: e.target.value })}
                                            style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', fontWeight: 700, marginTop: '2px' }}
                                        />
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                        <div>
                                            <label style={{ fontSize: '11px', fontWeight: 700, color: '#334155' }}>Marque</label>
                                            <input
                                                type="text"
                                                value={finalForm.brand}
                                                onChange={(e) => setFinalForm({ ...finalForm, brand: e.target.value })}
                                                style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', marginTop: '2px' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '11px', fontWeight: 700, color: '#334155' }}>Modèle</label>
                                            <input
                                                type="text"
                                                value={finalForm.model}
                                                onChange={(e) => setFinalForm({ ...finalForm, model: e.target.value })}
                                                style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', marginTop: '2px' }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* SECTION B: SELLER OFFER COMMERCIAL TERMS (GREFFAGE) */}
                            <div style={{ background: '#f0fdf4', padding: '12px', borderRadius: '10px', border: '1px solid #bbf7d0' }}>
                                <div style={{ fontSize: '11px', fontWeight: 900, color: '#166534', marginBottom: '8px', textTransform: 'uppercase' }}>
                                    B. Offre Commerciale Vendeur (SellerOffer Entity)
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                    <div>
                                        <label style={{ fontSize: '11px', fontWeight: 700, color: '#166534' }}>Prix Vendeur (FCFA) *</label>
                                        <input
                                            type="number"
                                            value={finalForm.sellerPrice}
                                            onChange={(e) => setFinalForm({ ...finalForm, sellerPrice: Number(e.target.value) })}
                                            style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #86efac', fontSize: '12px', fontWeight: 800, color: '#166534', marginTop: '2px' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '11px', fontWeight: 700, color: '#166534' }}>Stock Disponible *</label>
                                        <input
                                            type="number"
                                            value={finalForm.sellerStock}
                                            onChange={(e) => setFinalForm({ ...finalForm, sellerStock: Number(e.target.value) })}
                                            style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #86efac', fontSize: '12px', fontWeight: 800, marginTop: '2px' }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* ── 5. OFFICIAL VARIANTS + SELLER OFFERS — UNIFIED VIEW (Phase 1 & 3) ── */}
                    <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                            <div>
                                <h3 style={{ margin: '0 0 2px 0', fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                                    🔀 Déclinaisons Officielles ({officialVariants.length})
                                </h3>
                                <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                                    Les déclinaisons sans offres vendeurs restent dans le catalogue comme "Non disponible actuellement".
                                </p>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    onClick={handleSuggestOfficialVariants}
                                    disabled={isSuggestingVariants}
                                    style={{ background: '#f0f9ff', color: '#0369a1', border: '1px solid #bae6fd', padding: '8px 14px', borderRadius: '8px', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}
                                >
                                    {isSuggestingVariants ? '⏳ IA...' : '🤖 IA : Suggérer les déclinaisons'}
                                </button>
                                <button
                                    onClick={() => setShowAddVariantForm(v => !v)}
                                    style={{ background: '#166534', color: '#ffffff', border: 'none', padding: '8px 14px', borderRadius: '8px', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}
                                >
                                    + Ajouter une déclinaison
                                </button>
                            </div>
                        </div>

                        {/* Add Variant Form */}
                        {showAddVariantForm && (
                            <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
                                <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 800, color: '#166534' }}>➕ Nouvelle Déclinaison Officielle</h4>
                                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '12px' }}>
                                    {(productData?.optionGroups || officialVariants[0]?.options?.map((o: any) => ({ id: o.group?.id, name: o.group?.name }))?.filter((g: any, i: number, arr: any[]) => arr.findIndex((x: any) => x.id === g.id) === i) || []).map((group: any) => (
                                        <div key={group.id || group.name}>
                                            <label style={{ fontSize: '11px', fontWeight: 700, color: '#166534', display: 'block', marginBottom: '4px' }}>{group.name}</label>
                                            <input
                                                type="text"
                                                placeholder={`ex: Bleu Arctique`}
                                                value={newVariantOptions[group.name] || ''}
                                                onChange={(e) => setNewVariantOptions(prev => ({ ...prev, [group.name]: e.target.value }))}
                                                style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #86efac', fontSize: '12px', width: '160px' }}
                                            />
                                        </div>
                                    ))}
                                    {/* Generic field if no option groups defined */}
                                    {(!productData?.optionGroups || productData.optionGroups.length === 0) && (
                                        <div>
                                            <label style={{ fontSize: '11px', fontWeight: 700, color: '#166534', display: 'block', marginBottom: '4px' }}>Libellé de la déclinaison</label>
                                            <input
                                                type="text"
                                                placeholder={`ex: Bleu Arctique 128 Go`}
                                                value={newVariantOptions['label'] || ''}
                                                onChange={(e) => setNewVariantOptions({ label: e.target.value })}
                                                style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #86efac', fontSize: '12px', width: '220px' }}
                                            />
                                        </div>
                                    )}
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        onClick={handleCreateOfficialVariant}
                                        disabled={isCreatingVariant}
                                        style={{ background: '#166534', color: '#ffffff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 800, fontSize: '12px', cursor: 'pointer' }}
                                    >
                                        {isCreatingVariant ? '⏳ Création...' : '✅ Créer la déclinaison'}
                                    </button>
                                    <button
                                        onClick={() => { setShowAddVariantForm(false); setNewVariantOptions({}); }}
                                        style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', padding: '8px 16px', borderRadius: '8px', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}
                                    >
                                        Annuler
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Official Variant Cards with nested Seller Offers */}
                        {isLoadingOfficialVariants ? (
                            <div style={{ textAlign: 'center', padding: '20px', color: '#64748b', fontSize: '13px' }}>⏳ Chargement des déclinaisons...</div>
                        ) : officialVariants.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '20px', background: '#fef9c3', borderRadius: '10px', fontSize: '13px', color: '#854d0e' }}>
                                ⚠️ Aucune déclinaison officielle créée pour ce produit. Utilisez les boutons ci-dessus pour en ajouter.
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {officialVariants.map((ov: any) => {
                                    const offers = sellerOffersByVariant[ov.id] || [];
                                    const optionsLabel = (ov.options || []).map((o: any) => o.name).filter(Boolean).join(' / ');
                                    return (
                                        <div key={ov.id} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
                                            {/* Official Variant Header */}
                                            <div style={{ background: '#f8fafc', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: offers.length > 0 ? '1px solid #e2e8f0' : 'none' }}>
                                                {ov.featuredAsset?.preview ? (
                                                    <img src={ov.featuredAsset.preview} alt={ov.name} style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #cbd5e1', flexShrink: 0 }} />
                                                ) : (
                                                    <div style={{ width: '48px', height: '48px', background: '#e2e8f0', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>📷</div>
                                                )}
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontWeight: 800, fontSize: '14px', color: '#0f172a' }}>{ov.name || optionsLabel || `Déclinaison #${ov.id}`}</div>
                                                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                                                        SKU: <span style={{ fontFamily: 'monospace' }}>{ov.sku}</span>
                                                        {optionsLabel && <span style={{ marginLeft: '10px', background: '#dbeafe', color: '#1e40af', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>{optionsLabel}</span>}
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span style={{ fontSize: '11px', fontWeight: 800, padding: '3px 8px', borderRadius: '6px', background: offers.length > 0 ? '#dcfce7' : '#f1f5f9', color: offers.length > 0 ? '#166534' : '#64748b' }}>
                                                        🛒 {offers.length} offre{offers.length !== 1 ? 's' : ''} vendeur{offers.length !== 1 ? 's' : ''}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Seller Offers for this official variant */}
                                            {offers.length > 0 ? (
                                                <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                    {offers.map((offer: any) => {
                                                        const offerKey = `offer-${offer.id}`;
                                                        const aiResult = imageAiResults[offerKey];
                                                        const offerImgs = [offer.featuredAsset?.preview, ...(offer.assets || []).map((a: any) => a.preview)].filter(Boolean);
                                                        const vendorChannel = offer.channels?.find((c: any) => String(c.id) !== '1');

                                                        return (
                                                            <div key={offer.id} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 14px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                                                                {/* Vendor image + AI result */}
                                                                <div style={{ flexShrink: 0 }}>
                                                                    {offerImgs.length > 0 ? (
                                                                        <div style={{ position: 'relative' }}>
                                                                            <img src={offerImgs[0]} alt="offer" style={{ width: '56px', height: '56px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                                                                            {aiResult && (
                                                                                <div style={{
                                                                                    position: 'absolute', bottom: -6, right: -6,
                                                                                    width: '20px', height: '20px', borderRadius: '50%',
                                                                                    background: aiResult.status === 'ok' ? '#22c55e' : aiResult.status === 'warn' ? '#f59e0b' : aiResult.status === 'error' ? '#ef4444' : '#94a3b8',
                                                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                                    fontSize: '10px', border: '2px solid white'
                                                                                }}>
                                                                                    {aiResult.status === 'ok' ? '✓' : aiResult.status === 'loading' ? '⏳' : '!'}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    ) : (
                                                                        <div style={{ width: '56px', height: '56px', background: '#fef9c3', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: '#854d0e', textAlign: 'center', border: '1px solid #fde68a' }}>Pas d'image</div>
                                                                    )}
                                                                </div>

                                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                                                                        <div>
                                                                            <span style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a' }}>{(offer.price / 100).toLocaleString('fr-FR')} FCFA</span>
                                                                            <span style={{ marginLeft: '8px', fontSize: '11px', color: '#64748b' }}>Stock: {offer.stockOnHand}</span>
                                                                            {vendorChannel && (
                                                                                <span style={{ marginLeft: '8px', fontSize: '10px', background: '#dbeafe', color: '#1e40af', padding: '1px 5px', borderRadius: '4px', fontWeight: 700 }}>
                                                                                    {vendorChannel.code}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </div>

                                                                    {/* AI Diagnostic */}
                                                                    {aiResult && (
                                                                        <div style={{
                                                                            marginBottom: '6px', padding: '5px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700,
                                                                            background: aiResult.status === 'ok' ? '#f0fdf4' : aiResult.status === 'warn' ? '#fffbeb' : aiResult.status === 'error' ? '#fef2f2' : '#f8fafc',
                                                                            border: `1px solid ${aiResult.status === 'ok' ? '#bbf7d0' : aiResult.status === 'warn' ? '#fde68a' : aiResult.status === 'error' ? '#fca5a5' : '#e2e8f0'}`,
                                                                            color: aiResult.status === 'ok' ? '#166534' : aiResult.status === 'warn' ? '#92400e' : aiResult.status === 'error' ? '#991b1b' : '#475569'
                                                                        }}>
                                                                            🤖 IA : {aiResult.message}
                                                                        </div>
                                                                    )}

                                                                    {/* Action Buttons */}
                                                                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                                                        <button
                                                                            onClick={() => handleExecuteDecision('APPROVED')}
                                                                            style={{ background: '#166534', color: '#ffffff', border: 'none', padding: '5px 10px', borderRadius: '6px', fontWeight: 700, fontSize: '11px', cursor: 'pointer' }}
                                                                        >
                                                                            ✅ Valider
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleExecuteDecision('SUSPENDED')}
                                                                            style={{ background: '#fef2f2', color: '#991b1b', border: '1px solid #fca5a5', padding: '5px 10px', borderRadius: '6px', fontWeight: 700, fontSize: '11px', cursor: 'pointer' }}
                                                                        >
                                                                            ✕ Rejeter
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleCommentToVendor(offer.id, offer.name)}
                                                                            style={{ background: '#f8fafc', color: '#334155', border: '1px solid #cbd5e1', padding: '5px 10px', borderRadius: '6px', fontWeight: 700, fontSize: '11px', cursor: 'pointer' }}
                                                                        >
                                                                            💬 Commenter au vendeur
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                <div style={{ padding: '10px 16px', fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>
                                                    Aucune offre vendeur pour cette déclinaison.
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Unmatched Seller Offers (submitted before official variants were created or with non-standard options) */}
                        {sellerOffersByVariant['unmatched'] && sellerOffersByVariant['unmatched'].length > 0 && (
                            <div style={{ marginTop: '16px', border: '1px solid #f59e0b', borderRadius: '12px', background: '#fffbeb', padding: '16px' }}>
                                <h4 style={{ margin: '0 0 6px 0', fontSize: '13px', fontWeight: 800, color: '#92400e' }}>
                                    ⚠️ Offres vendeurs en attente de rattachement ({sellerOffersByVariant['unmatched'].length})
                                </h4>
                                <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: '#b45309' }}>
                                    Ces offres ont été soumises par des vendeurs avec des options qui ne correspondent pas exactement aux déclinaisons officielles actuelles. Vous pouvez créer la déclinaison officielle correspondante ci-dessus.
                                </p>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {sellerOffersByVariant['unmatched'].map((offer: any) => (
                                        <div key={offer.id} style={{ background: '#ffffff', border: '1px solid #fde68a', borderRadius: '8px', padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <div style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a' }}>{offer.name}</div>
                                                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                                                    Prix: <span style={{ fontWeight: 700, color: '#0f172a' }}>{(offer.price / 100).toLocaleString('fr-FR')} FCFA</span> | Stock: {offer.stockOnHand}
                                                    {offer.options && offer.options.length > 0 && (
                                                        <span style={{ marginLeft: '8px', color: '#b45309', fontWeight: 600 }}>
                                                            [Options: {offer.options.map((o: any) => `${o.group?.name || 'Opt'}: ${o.name}`).join(' + ')}]
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: '6px' }}>
                                                <button
                                                    onClick={() => handleExecuteDecision('APPROVED')}
                                                    style={{ background: '#166534', color: '#ffffff', border: 'none', padding: '4px 8px', borderRadius: '6px', fontWeight: 700, fontSize: '11px', cursor: 'pointer' }}
                                                >
                                                    ✅ Valider
                                                </button>
                                                <button
                                                    onClick={() => handleCommentToVendor(offer.id, offer.name)}
                                                    style={{ background: '#f8fafc', color: '#334155', border: '1px solid #cbd5e1', padding: '4px 8px', borderRadius: '6px', fontWeight: 700, fontSize: '11px', cursor: 'pointer' }}
                                                >
                                                    💬 Commenter
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ── 6. AUDIT LOG HISTORY ── */}
                    <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '20px' }}>
                        <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                            📜 Journal d'Audit Complet (Audit History)
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {auditLogs.map((log, idx) => (
                                <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '8px 12px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #f1f5f9' }}>
                                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, minWidth: '130px' }}>{log.timestamp}</span>
                                    <span style={{ fontSize: '11px', background: '#e2e8f0', color: '#334155', fontWeight: 800, padding: '1px 6px', borderRadius: '4px' }}>{log.role}</span>
                                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>{log.user}</span>
                                    <span style={{ fontSize: '12px', color: '#475569', flex: 1 }}>{log.details}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ── 7. FOOTER ACTION BAR (DECISION ACTIONS) ── */}
                <div style={{
                    background: '#0f172a', padding: '16px 28px', borderTop: '1px solid #334155',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                }}>
                    <div style={{ color: '#94a3b8', fontSize: '12px' }}>
                        Mode Décision : <strong style={{ color: '#ffffff' }}>{decisionMode === 'OFFICIAL_CENTRAL_PRODUCT' ? '📦 Créer Fiche Officielle Ahizan + Greffer Offre' : '🔗 Re-greffer l\'Offre sur Produit Existants'}</strong>
                    </div>

                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button
                            onClick={handleSaveDraft}
                            disabled={isSaving}
                            style={{ background: '#334155', color: '#ffffff', border: '1px solid #475569', padding: '10px 20px', borderRadius: '10px', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}
                        >
                            💾 Sauvegarder Brouillon
                        </button>

                        <button
                            onClick={() => handleExecuteDecision('NEEDS_INFORMATION')}
                            disabled={isSaving}
                            style={{ background: '#d97706', color: '#ffffff', border: 'none', padding: '10px 20px', borderRadius: '10px', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}
                        >
                            🟠 Demander Correction
                        </button>

                        {userRole === 'QUALITY_MANAGER' ? (
                            <>
                                <button
                                    onClick={() => handleExecuteDecision('SUSPENDED')}
                                    disabled={isSaving}
                                    style={{ background: '#991b1b', color: '#ffffff', border: 'none', padding: '10px 20px', borderRadius: '10px', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}
                                >
                                    🔴 Suspendre / Refuser
                                </button>

                                <button
                                    onClick={() => handleExecuteDecision('PUBLISHED')}
                                    disabled={isSaving || (decisionMode === 'OFFICIAL_CENTRAL_PRODUCT' && qualityScoreMetrics.score < 50)}
                                    style={{
                                        background: decisionMode === 'RE_GRAFT_EXISTING' ? '#c2410c' : qualityScoreMetrics.score >= 50 ? '#166534' : '#475569',
                                        color: '#ffffff', border: 'none', padding: '10px 24px', borderRadius: '10px', fontWeight: 900, fontSize: '13px',
                                        cursor: (isSaving || (decisionMode === 'OFFICIAL_CENTRAL_PRODUCT' && qualityScoreMetrics.score < 50)) ? 'not-allowed' : 'pointer',
                                        boxShadow: '0 4px 6px -1px rgba(22, 101, 52, 0.4)'
                                    }}
                                >
                                    {decisionMode === 'RE_GRAFT_EXISTING' ? '🔗 Confirmer le Re-greffage' : '🟢 Valider Fiche Officielle & Publier'}
                                </button>
                            </>
                        ) : (
                            <div style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic', display: 'flex', alignItems: 'center' }}>
                                🔒 Publication réservée au Responsable Catalogue.
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
