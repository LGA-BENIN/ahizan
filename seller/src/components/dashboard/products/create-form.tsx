'use client';

import React from 'react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ImageUploader, { type UploadedAsset } from '@/components/ImageUploader';
import { createProductAction } from '@/app/dashboard/products/actions';
import { query, mutate } from '@/lib/vendure/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    CheckCircle2,
    X,
    ImageIcon,
    Tag,
    Coins,
    Loader2,
    Percent,
    AlignLeft,
    ArrowLeft,
    ArrowRight,
    Layers,
    Plus,
    Trash2,
    Check,
    AlertTriangle,
    Eye,
    Barcode,
    Search,
    Package,
    PlusCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import CategoryCheckboxTree from './category-checkbox-tree';
import { TiptapEditor } from './tiptap-editor';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface CreateProductFormProps {
    collectionTree: any[];
    onSuccess?: () => void;
    className?: string;
}

interface VariantRow {
    id: string;
    name: string;
    sku: string;
    price: number;
    stock: number;
    onPromotion: boolean;
    promotionalPrice: number;
    enabled?: boolean;
    featuredAssetId?: string | null;
}

const SEARCH_OFFICIAL_PRODUCTS_QUERY = `
  query SearchOfficialProducts($term: String, $take: Int, $skip: Int) {
    searchOfficialProducts(term: $term, take: $take, skip: $skip) {
      items {
        id
        name
        slug
        featuredAsset {
          id
          preview
        }
        variants {
          id
          name
          sku
          price
        }
      }
      totalItems
    }
  }
`;

const GET_PRODUCT_VARIANTS_DETAIL = `
  query GetProductVariantsDetail($slug: String!) {
    product(slug: $slug) {
      id
      name
      slug
      optionGroups {
        id
        code
        name
        options {
          id
          code
          name
        }
      }
      variants {
        id
        name
        sku
        price
        stockOnHand
        options {
          id
          code
          name
          group {
            id
            name
          }
        }
        assets {
          id
          preview
        }
      }
    }
  }
`;

const CREATE_OR_UPDATE_OFFER_MUTATION = `
  mutation CreateOrUpdateSellerOffer($input: CreateSellerOfferInput!) {
    createOrUpdateSellerOffer(input: $input) {
      id
      price
      stock
    }
  }
`;

const GET_GLOBAL_OPTION_GROUPS_QUERY = `
  query GetGlobalOptionGroups {
    getGlobalOptionGroups {
      id
      code
      name
      options {
        id
        code
        name
      }
    }
  }
`;

export default function CreateProductForm({ collectionTree, onSuccess, className }: CreateProductFormProps) {
    const router = useRouter();
    const [isConfirmingCancel, setIsConfirmingCancel] = useState(false);
    const [formKey, setFormKey] = useState(0);
    const [currentStep, setCurrentStep] = useState(1);
    
    // Steps mapping
    const steps = [
        { id: 1, name: "Recherche & Greffage" },
        { id: 2, name: "Identité & Catégorie" },
        { id: 3, name: "Description & Filtres" },
        { id: 4, name: "Médias & Livraison" },
        { id: 5, name: "Déclinaisons & Options" },
        { id: 6, name: "Grille des Tarifs" },
        { id: 7, name: "Validation & Publication" }
    ];

    // Grafting state
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearchingCatalog, setIsSearchingCatalog] = useState(false);
    const [graftedProduct, setGraftedProduct] = useState<any | null>(null);

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        shortDescription: '',
        price: 0,
        stock: 5,
        sku: '',
        weight: '',
        width: '',
        height: '',
        enabled: true,
        parentCategory: '',
        category: '',
        onPromotion: false,
        promotionalPrice: 0,
        deliveryTimeValue: 2,
        deliveryTimeUnit: 'd',
        condition: 'NEW',
    });
    
    // Step 5: Option groups from backend + user selection
    const [hasMultipleVariants, setHasMultipleVariants] = useState(false);
    const [globalOptionGroups, setGlobalOptionGroups] = useState<{ id: string; code: string; name: string; options: { id: string; code: string; name: string }[] }[]>([]);
    const [loadingOptionGroups, setLoadingOptionGroups] = useState(false);
    const [selectedStandardGroups, setSelectedStandardGroups] = useState<string[]>([]);
    const [customGroups, setCustomGroups] = useState<{ id: string, name: string, values: string[] }[]>([]);
    const [groupValuesMap, setGroupValuesMap] = useState<{ [key: string]: string[] }>({});
    const [newOptionValue, setNewOptionValue] = useState<{ [key: string]: string }>({});


    // Variant rows (Step 6)
    const [variants, setVariants] = useState<VariantRow[]>([
        { id: '1', name: 'Standard', sku: '', price: 0, stock: 5, onPromotion: false, promotionalPrice: 0, enabled: true, featuredAssetId: null }
    ]);
    
    const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
    const [assets, setAssets] = useState<UploadedAsset[]>([]);
    const [featuredAssetId, setFeaturedAssetId] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isUploadingAssets, setIsUploadingAssets] = useState(false);
    const [facetValueIds, setFacetValueIds] = useState<string[]>([]);
    const [allowedFacets, setAllowedFacets] = useState<any[]>([]);
    const [loadingFacets, setLoadingFacets] = useState(false);



    // Fetch global option groups from backend on mount
    useEffect(() => {
        const fetchGroups = async () => {
            setLoadingOptionGroups(true);
            try {
                const res = await query(GET_GLOBAL_OPTION_GROUPS_QUERY, {});
                setGlobalOptionGroups(res.data?.getGlobalOptionGroups || []);
            } catch (err) {
                console.error('[CreateProductForm] Failed to fetch global option groups:', err);
            } finally {
                setLoadingOptionGroups(false);
            }
        };
        fetchGroups();
    }, []);

    // Force reset on mount to avoid stale data
    useEffect(() => {
        handleReset();
    }, []);

    const handleReset = () => {
        setSearchTerm('');
        setSearchResults([]);
        setIsSearchingCatalog(false);
        setGraftedProduct(null);
        setFormData({
            name: '',
            description: '',
            shortDescription: '',
            price: 0,
            stock: 5,
            sku: '',
            weight: '',
            width: '',
            height: '',
            enabled: true,
            parentCategory: '',
            category: '',
            onPromotion: false,
            promotionalPrice: 0,
            deliveryTimeValue: 2,
            deliveryTimeUnit: 'd',
            condition: 'NEW',
        });
        setHasMultipleVariants(false);
        setSelectedStandardGroups([]);
        setCustomGroups([]);
        setGroupValuesMap({});
        setNewOptionValue({});
        setVariants([
            { id: '1', name: 'Standard', sku: '', price: 0, stock: 5, onPromotion: false, promotionalPrice: 0, enabled: true, featuredAssetId: null }
        ]);
        setSelectedCategoryIds([]);
        setAssets([]);
        setFeaturedAssetId(null);
        setFormKey((prev: number) => prev + 1);
        setIsSubmitting(false);
        setCurrentStep(1);
    };

    const handleCategoriesChange = (ids: string[]) => {
        setSelectedCategoryIds(ids);
        setFormData((prev: any) => ({ ...prev, category: JSON.stringify(ids) }));
        setFacetValueIds([]);
        fetchAllowedFacets(ids);
    };

    // Fetch allowed facets for collection
    const fetchAllowedFacets = async (collectionIds: string[]) => {
        if (!collectionIds || collectionIds.length === 0) { setAllowedFacets([]); return; }
        setLoadingFacets(true);
        try {
            const { query: apiQuery } = await import('@/lib/vendure/api');
            const { GetCollectionAllowedFacetsQuery } = await import('@/lib/vendure/queries');
            const results = await Promise.all(
                collectionIds.map((id: string) => apiQuery(GetCollectionAllowedFacetsQuery, { collectionId: id }).catch(err => {
                    console.error('[CreateProductForm] Failed to fetch allowed facets for', id, err);
                    return { data: null };
                }))
            );
            const allFacetsMap = new Map();
            for (const res of results) {
                const mapping = (res.data as any)?.collectionAllowedFacets;
                if (mapping?.allowedFacets) {
                    for (const facet of mapping.allowedFacets) {
                        allFacetsMap.set(facet.id, facet);
                    }
                }
            }
            setAllowedFacets(Array.from(allFacetsMap.values()));
        } catch (err) {
            console.error('[CreateProductForm] Failed to fetch allowed facets:', err);
            setAllowedFacets([]);
        } finally {
            setLoadingFacets(false);
        }
    };

    // Catalog Search/Grafting handler using official Ahizan catalog query
    const handleCatalogSearch = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!searchTerm.trim()) return;

        setIsSearchingCatalog(true);
        try {
            const result = await query(SEARCH_OFFICIAL_PRODUCTS_QUERY, {
                term: searchTerm.trim(),
                take: 40
            });
            
            const items = result.data?.searchOfficialProducts?.items || [];
            
            const formatted = items.map((prod: any) => ({
                id: prod.id,
                name: prod.name,
                slug: prod.slug,
                preview: prod.featuredAsset?.preview || '',
                variants: (prod.variants || []).map((v: any) => ({
                    productVariantId: v.id,
                    name: v.name,
                    sku: v.sku,
                    price: v.price
                }))
            }));

            setSearchResults(formatted);
            if (formatted.length === 0) {
                toast.info("Aucun produit officiel Ahizan correspondant trouvé. Vous pouvez proposer une nouvelle fiche.");
            }
        } catch (err: any) {
            console.error('[CreateProduct] Catalog search failed:', err);
            toast.error('Erreur lors de la recherche: ' + err.message);
        } finally {
            setIsSearchingCatalog(false);
        }
    };

    const handleSelectGraftProduct = (prod: any) => {
        setGraftedProduct(prod);
        router.push(`/dashboard/products/affiliate?id=${prod.id}`);
    };

    // Option groups helpers
    const toggleStandardGroup = (groupName: string) => {
        setSelectedStandardGroups(prev => {
            if (prev.includes(groupName)) {
                return prev.filter(g => g !== groupName);
            } else {
                return [...prev, groupName];
            }
        });
    };

    const handleAddCustomGroup = () => {
        setCustomGroups(prev => [
            ...prev,
            { id: `custom_${Date.now()}`, name: '', values: [] }
        ]);
    };

    const handleRemoveCustomGroup = (id: string) => {
        setCustomGroups(prev => prev.filter(cg => cg.id !== id));
    };

    const handleCustomGroupNameChange = (id: string, name: string) => {
        setCustomGroups(prev => prev.map(cg => cg.id === id ? { ...cg, name } : cg));
    };

    const handleAddOptionValue = (groupKey: string) => {
        const val = newOptionValue[groupKey]?.trim();
        if (!val) return;

        setGroupValuesMap(prev => {
            const currentValues = prev[groupKey] || [];
            if (currentValues.includes(val)) {
                toast.error("Cette option existe déjà");
                return prev;
            }
            return {
                ...prev,
                [groupKey]: [...currentValues, val]
            };
        });
        setNewOptionValue(prev => ({ ...prev, [groupKey]: '' }));
    };

    const handleAddSuggestedValue = (groupKey: string, val: string) => {
        setGroupValuesMap(prev => {
            const currentValues = prev[groupKey] || [];
            if (currentValues.includes(val)) return prev;
            return {
                ...prev,
                [groupKey]: [...currentValues, val]
            };
        });
    };

    const handleRemoveOptionValue = (groupKey: string, valIndex: number) => {
        setGroupValuesMap(prev => {
            const currentValues = prev[groupKey] || [];
            return {
                ...prev,
                [groupKey]: currentValues.filter((_, idx) => idx !== valIndex)
            };
        });
    };

    // Variant generator
    const generateVariants = () => {
        // Collect all active groups
        const activeGroups: { name: string, values: string[] }[] = [];
        
        // Standard groups (keys are backend IDs — resolve display name from globalOptionGroups)
        for (const groupId of selectedStandardGroups) {
            const values = groupValuesMap[groupId] || [];
            if (values.length > 0) {
                const groupDef = globalOptionGroups.find(g => g.id === groupId);
                const groupName = groupDef?.name || groupId;
                activeGroups.push({ name: groupName, values });
            }
        }
        
        // Custom groups
        for (const cg of customGroups) {
            const values = groupValuesMap[cg.id] || [];
            if (cg.name.trim() !== '' && values.length > 0) {
                activeGroups.push({ name: cg.name, values });
            }
        }

        if (activeGroups.length === 0) {
            toast.error("Veuillez sélectionner au moins un groupe d'options avec des valeurs.");
            return;
        }

        // Cartesian product
        const cartesianProduct = (arrays: string[][]): string[][] => {
            return arrays.reduce<string[][]>((a, b) => {
                return a.flatMap(d => b.map(e => [...d, e]));
            }, [[]]);
        };

        const valuesArray = activeGroups.map(g => g.values);
        const combos = cartesianProduct(valuesArray);

        const newVariants: VariantRow[] = combos.map((combo, idx) => {
            const prodName = formData.name?.trim() || graftedProduct?.name || 'Produit';
            const name = `${prodName} ${combo.join(' ')}`;
            // Retain values if already existing
            const existing = variants.find(v => v.name === name);
            return {
                id: existing?.id || `gen_${idx}_${Date.now()}`,
                name,
                sku: existing?.sku || '',
                price: existing?.price || formData.price || 0,
                stock: existing?.stock || formData.stock || 5,
                onPromotion: existing?.onPromotion || false,
                promotionalPrice: existing?.promotionalPrice || 0,
                enabled: existing?.enabled !== false,
                featuredAssetId: existing?.featuredAssetId || null
            };
        });

        setVariants(newVariants);
        toast.success(`${newVariants.length} variantes générées.`);
        // Proceed to next step automatically
        setCurrentStep(6);
    };

    const handleVariantChange = (id: string, field: keyof VariantRow, value: any) => {
        setVariants(prev => prev.map(v => v.id === id ? { ...v, [field]: value } : v));
    };

    const handleNextStep = () => {
        if (currentStep === 1 && !graftedProduct) {
            // S'il n'y a pas de greffage, on procède à la création normale
            setCurrentStep(2);
            return;
        }
        
        // Normal step validations
        if (currentStep === 2) {
            if (!formData.name) {
                toast.error('Veuillez spécifier le nom du produit');
                return;
            }
            if (selectedCategoryIds.length === 0) {
                toast.error('Veuillez sélectionner au moins une catégorie');
                return;
            }
        }
        if (currentStep === 3) {
            if (!formData.description) {
                toast.error('Veuillez renseigner une description détaillée');
                return;
            }
        }
        if (currentStep === 4) {
            if (assets.length === 0) {
                toast.error('Veuillez ajouter au moins une photo');
                return;
            }
        }
        if (currentStep === 5 && !hasMultipleVariants) {
            // Single variant: set values and proceed
            setVariants([
                { id: '1', name: 'Standard', sku: formData.sku, price: formData.price, stock: formData.stock, onPromotion: formData.onPromotion, promotionalPrice: formData.promotionalPrice, enabled: true, featuredAssetId: null }
            ]);
            setCurrentStep(6);
            return;
        }

        setCurrentStep(prev => Math.min(prev + 1, steps.length));
    };

    const handlePrevStep = () => {
        if (graftedProduct && currentStep === 6) {
            // If grafted, back goes to Search step
            setGraftedProduct(null);
            setCurrentStep(1);
            return;
        }
        if (currentStep === 6 && !hasMultipleVariants) {
            setCurrentStep(5);
            return;
        }
        setCurrentStep(prev => Math.max(prev - 1, 1));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isUploadingAssets) {
            toast.warning('Envoi des images en cours...');
            return;
        }

        const activeVariants = hasMultipleVariants 
            ? variants.filter(v => v.enabled) 
            : variants;

        if (activeVariants.length === 0) {
            toast.error('Veuillez activer au moins une variante avec prix et stock.');
            return;
        }

        // Validate prices & stocks
        for (const v of activeVariants) {
            if (v.price <= 0) {
                toast.error(`Veuillez spécifier un prix valide pour la variante : ${v.name}`);
                return;
            }
            if (v.onPromotion && v.promotionalPrice >= v.price) {
                toast.error(`Le prix soldé doit être strictement inférieur au prix pour la variante : ${v.name}`);
                return;
            }
        }

        setIsSubmitting(true);

        try {
            if (graftedProduct) {
                // GRAFTING / AFFILIATION FLOW: submit offers for each variant
                console.log("[GRAFTING] Registering offers...");
                
                const formattedTimeUnit = (formData.deliveryTimeUnit === 'h' || formData.deliveryTimeUnit === 'HOURS') ? 'HOURS' : 'DAYS';
                const formattedCondition = (formData.condition === 'OCCASION' || formData.condition === 'USED') ? 'USED' : 'NEW';

                await Promise.all(activeVariants.map(async (v) => {
                    return mutate(CREATE_OR_UPDATE_OFFER_MUTATION, {
                        input: {
                            productVariantId: v.id, // v.id contains variant database ID
                            price: Math.round(v.price * 100), // to subunit XOF
                            stock: Number(v.stock) || 0,
                            sku: v.sku || undefined,
                            deliveryTimeValue: Number(formData.deliveryTimeValue) || 24,
                            deliveryTimeUnit: formattedTimeUnit,
                            condition: formattedCondition
                        }
                    }, { useAuthToken: true });
                }));

                toast.success('Vos offres de vente ont été associées au produit avec succès !');
                handleReset();
                router.refresh();
                router.push('/dashboard/products');
            } else {
                // BRAND NEW PRODUCT CREATION FLOW
                const data = new FormData();
                data.append('name', formData.name);
                data.append('description', formData.description);
                data.append('shortDescription', formData.shortDescription);
                data.append('price', (hasMultipleVariants ? activeVariants[0].price : formData.price).toString());
                data.append('stock', (hasMultipleVariants ? activeVariants.reduce((s, v) => s + v.stock, 0) : formData.stock).toString());
                data.append('sku', formData.sku);
                data.append('weight', formData.weight);
                data.append('width', formData.width);
                data.append('height', formData.height);
                data.append('enabled', formData.enabled ? 'true' : 'false');
                data.append('category', formData.category);
                data.append('assetIds', JSON.stringify(assets.map(a => a.id)));
                data.append('featuredAssetId', featuredAssetId || '');
                data.append('facetValueIds', JSON.stringify(facetValueIds));
                data.append('onPromotion', formData.onPromotion.toString());
                data.append('promotionalPrice', formData.promotionalPrice.toString());
                data.append('deliveryTimeValue', formData.deliveryTimeValue.toString());
                data.append('deliveryTimeUnit', formData.deliveryTimeUnit);
                data.append('condition', formData.condition);

                if (hasMultipleVariants) {
                    // Map active variants and append optional featuredAssetId
                    const variantsData = activeVariants.map(v => ({
                        name: v.name,
                        sku: v.sku || undefined,
                        price: v.price,
                        stock: v.stock,
                        onPromotion: v.onPromotion,
                        promotionalPrice: v.promotionalPrice,
                        featuredAssetId: v.featuredAssetId || undefined
                    }));
                    data.append('variants', JSON.stringify(variantsData));
                }

                const result = await createProductAction(null, data);

                if (result.success) {
                    toast.success('Fiche produit créée et soumise pour validation !');
                    handleReset();
                    router.refresh();
                    router.push('/dashboard/products');
                } else {
                    toast.error('Erreur lors de la création : ' + result.error);
                    setIsSubmitting(false);
                }
            }
        } catch (err: any) {
            console.error('Error submitting product form:', err);
            toast.error('Erreur lors de la soumission: ' + err.message);
        }
    };

    return (
        <div className={cn("max-w-6xl mx-auto space-y-8 pb-20", className)}>
            
            {/* Stepper UI Header */}
            <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <Layers className="w-5 h-5 text-primary" />
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Étape {graftedProduct ? 'G' : currentStep} sur {graftedProduct ? 'G' : steps.length}</span>
                            <h2 className="text-sm font-bold text-foreground">
                                {graftedProduct ? `Greffage sur: ${graftedProduct.name}` : steps[currentStep - 1].name}
                            </h2>
                        </div>
                    </div>
                    
                    {/* Stepper bubbles */}
                    <div className="flex items-center gap-2">
                        {steps.map(step => {
                            const isGraftStep = graftedProduct && (step.id === 1 || step.id === 6 || step.id === 7);
                            const isActive = currentStep === step.id;
                            const isDone = step.id < currentStep;
                            
                            return (
                                <div 
                                    key={step.id} 
                                    className={cn(
                                        "w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black border transition-all duration-300",
                                        isActive 
                                            ? "bg-primary text-primary-foreground border-primary scale-110 shadow-sm"
                                            : isDone
                                                ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/20"
                                                : "bg-background text-muted-foreground border-border",
                                        graftedProduct && !isGraftStep && "opacity-25"
                                    )}
                                >
                                    {isDone ? <Check className="w-3.5 h-3.5" /> : step.id}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} autoComplete="off" className="space-y-8">
                
                {/* Step 1: Recherche Catalogue & Greffage */}
                {currentStep === 1 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <div className="bg-card rounded-2xl border border-border p-6 sm:p-8 shadow-sm space-y-6">
                            <div className="max-w-xl">
                                <h3 className="text-sm font-bold text-foreground">Rechercher le produit sur Ahizan</h3>
                                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                                    Conformément à la charte d'Ahizan, si l'article est déjà répertorié dans le catalogue global, vous devez y greffer votre offre pour éviter les doublons.
                                </p>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3">
                                <div className="relative flex-1">
                                    <Barcode className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                                    <Input
                                        type="text"
                                        placeholder="Scanner un code-barres, code EAN, ou chercher un nom (ex: iPhone 7)..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-12 h-12 rounded-xl bg-muted/10 border-border focus-visible:ring-2 focus-visible:ring-primary/10 font-medium"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                handleCatalogSearch();
                                            }
                                        }}
                                    />
                                </div>
                                <Button 
                                    type="button"
                                    onClick={() => handleCatalogSearch()}
                                    disabled={isSearchingCatalog}
                                    className="h-12 px-6 rounded-xl bg-primary text-primary-foreground font-bold text-xs uppercase tracking-widest cursor-pointer"
                                >
                                    {isSearchingCatalog ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
                                    Rechercher
                                </Button>
                            </div>
                        </div>

                        {/* Search Results */}
                        {searchResults.length > 0 && (
                            <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm divide-y divide-border">
                                <div className="px-6 py-3 bg-muted/30 text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
                                    Produits trouvés ({searchResults.length})
                                </div>
                                {searchResults.map((prod) => (
                                    <div key={prod.id} className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/5 transition-all">
                                        <div className="flex items-center gap-4">
                                            <div className="w-16 h-16 rounded-xl bg-muted border border-border overflow-hidden flex-shrink-0 flex items-center justify-center">
                                                {prod.preview ? (
                                                    <img src={prod.preview} alt={prod.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <Package className="w-8 h-8 text-muted-foreground" />
                                                )}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-foreground text-sm leading-snug">{prod.name}</h4>
                                                <p className="text-xs text-muted-foreground font-medium mt-0.5">{prod.variants.length} déclinaison(s) enregistrée(s)</p>
                                                <div className="flex flex-wrap gap-1 mt-2">
                                                    {prod.variants.map((v: any, idx: number) => (
                                                        <span key={idx} className="px-2 py-0.5 bg-muted text-muted-foreground rounded text-[8px] font-mono border border-border">
                                                            {v.name}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        <Button
                                            type="button"
                                            onClick={() => handleSelectGraftProduct(prod)}
                                            className="h-10 px-5 rounded-xl bg-primary text-primary-foreground font-bold text-xs uppercase tracking-widest cursor-pointer flex items-center gap-1.5 self-center"
                                        >
                                            <PlusCircle className="w-4 h-4" />
                                            Vendre ce produit
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Pivot to brand new creation */}
                        <div className="bg-card rounded-2xl border border-border p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6">
                            <div className="max-w-md">
                                <h4 className="text-sm font-bold text-foreground">Le produit n'est pas encore sur Ahizan ?</h4>
                                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                    Si vous ne trouvez pas le produit après recherche, vous pouvez créer sa fiche descriptive et l'enregistrer dans notre catalogue global.
                                </p>
                            </div>
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() => handleNextStep()}
                                className="h-11 px-6 rounded-xl text-xs font-bold uppercase tracking-widest cursor-pointer whitespace-nowrap"
                            >
                                Créer une nouvelle fiche
                            </Button>
                        </div>
                    </div>
                )}

                {/* Step 2: Identité & Catégorisation */}
                {currentStep === 2 && !graftedProduct && (
                    <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <div className="px-6 py-4 bg-muted/30 border-b border-border flex items-center gap-2">
                            <Tag className="w-4 h-4 text-primary" />
                            <h3 className="text-xs font-black uppercase tracking-widest text-foreground">Identité & Catégorisation</h3>
                        </div>
                        <div className="p-6 sm:p-8 space-y-6">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Nom du produit *</Label>
                                <Input
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Ex: Samsung Galaxy S25 Ultra"
                                    className="h-12 rounded-xl bg-card border-border focus-visible:ring-2 focus-visible:ring-primary/10 transition-all font-semibold"
                                    autoComplete="off"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Description Courte (max. 180 caractères)</Label>
                                <Textarea
                                    rows={2}
                                    value={formData.shortDescription}
                                    maxLength={180}
                                    onChange={(e) => setFormData({ ...formData, shortDescription: e.target.value })}
                                    placeholder="Une phrase simple et vendeuse pour présenter le produit..."
                                    className="rounded-xl bg-card border-border resize-none focus-visible:ring-2 focus-visible:ring-primary/10 transition-all"
                                />
                                <div className="text-right text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
                                    {formData.shortDescription.length}/180 caractères
                                </div>
                            </div>

                            <div className="space-y-2 pt-2 border-t border-border">
                                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Catégories de classement *</Label>
                                <CategoryCheckboxTree
                                    collectionTree={collectionTree}
                                    selectedIds={selectedCategoryIds}
                                    onChange={handleCategoriesChange}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 3: Description Détaillée & Attributs */}
                {currentStep === 3 && !graftedProduct && (
                    <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <div className="px-6 py-4 bg-muted/30 border-b border-border flex items-center gap-2">
                            <AlignLeft className="w-4 h-4 text-primary" />
                            <h3 className="text-xs font-black uppercase tracking-widest text-foreground">Description & Attributs Spécifiques</h3>
                        </div>
                        <div className="p-6 sm:p-8 space-y-6">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Description Détaillée *</Label>
                                <TiptapEditor
                                    value={formData.description}
                                    onChange={(html: string) => setFormData(prev => ({ ...prev, description: html }))}
                                    placeholder="Présentez les spécifications, l'histoire et les avantages du produit..."
                                />
                            </div>

                            {selectedCategoryIds.length > 0 && (
                                <div className="pt-6 border-t border-border space-y-4">
                                    <div>
                                        <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Spécifications & Filtres</Label>
                                        <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Sélectionnez les valeurs recommandées pour l'aide à la recherche client.</p>
                                    </div>

                                    {loadingFacets ? (
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground py-2 animate-pulse">
                                            <Loader2 className="w-4 h-4 animate-spin text-primary" />
                                            <span>Récupération des filtres autorisés...</span>
                                        </div>
                                    ) : allowedFacets.length === 0 ? (
                                        <p className="text-xs text-muted-foreground py-2 italic">Aucune spécification facultative définie pour ces catégories.</p>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {allowedFacets.map((facet: any) => {
                                                const selectedFvId = facetValueIds.find((id: string) =>
                                                    facet.values?.some((fv: any) => String(fv.id) === id)
                                                );
                                                const isBadgeStyle = facet.values && facet.values.length <= 6;
                                                return (
                                                    <div key={facet.id} className="p-4 border border-border/60 rounded-xl bg-muted/5 hover:bg-muted/10 transition-colors">
                                                        <Label className="text-xs font-bold text-foreground mb-2 block">
                                                            {facet.name}
                                                        </Label>
                                                        {isBadgeStyle ? (
                                                            <div className="flex flex-wrap gap-2">
                                                                {facet.values.map((fv: any) => {
                                                                    const isSelected = selectedFvId === String(fv.id);
                                                                    return (
                                                                        <button
                                                                            key={String(fv.id)}
                                                                            type="button"
                                                                            onClick={() => {
                                                                                setFacetValueIds(prev => {
                                                                                    const without = prev.filter(id => !facet.values?.some((fv2: any) => String(fv2.id) === id));
                                                                                    return isSelected ? without : [...without, String(fv.id)];
                                                                                });
                                                                            }}
                                                                            className={cn(
                                                                                "px-3 py-1 text-xs rounded-full border transition-all cursor-pointer",
                                                                                isSelected
                                                                                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                                                                    : "bg-background text-muted-foreground border-border hover:bg-muted"
                                                                            )}
                                                                        >
                                                                            {fv.name}
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                        ) : (
                                                            <Select
                                                                value={selectedFvId || ''}
                                                                onValueChange={(val) => {
                                                                    setFacetValueIds(prev => {
                                                                        const without = prev.filter(id => !facet.values?.some((fv2: any) => String(fv2.id) === id));
                                                                        return val ? [...without, val] : without;
                                                                    });
                                                                }}
                                                            >
                                                                <SelectTrigger className="h-10 rounded-lg text-xs">
                                                                    <SelectValue placeholder="Sélectionner..." />
                                                                </SelectTrigger>
                                                                <SelectContent className="rounded-xl">
                                                                    {facet.values?.map((fv: any) => (
                                                                        <SelectItem key={String(fv.id)} value={String(fv.id)} className="text-xs">
                                                                            {fv.name}
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Step 4: Médias & Livraison */}
                {currentStep === 4 && !graftedProduct && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                        {/* Media Upload */}
                        <div className="lg:col-span-7 bg-card rounded-2xl border border-border overflow-hidden shadow-sm p-6 sm:p-8 space-y-6">
                            <div>
                                <h3 className="text-xs font-black uppercase tracking-widest text-foreground">Photos du produit *</h3>
                                <p className="text-[10px] text-muted-foreground mt-1">Ajoutez des images claires. La première image est la photo principale.</p>
                            </div>
                            
                            <ImageUploader
                                key={formKey}
                                assets={assets}
                                featuredAssetId={featuredAssetId}
                                onAssetsChange={setAssets}
                                onFeaturedChange={setFeaturedAssetId}
                                onUploadingChange={setIsUploadingAssets}
                            />
                            {isUploadingAssets && (
                                <div className="flex items-center gap-2 text-primary font-bold animate-pulse">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span className="text-[9px] uppercase tracking-widest">Upload en cours...</span>
                                </div>
                            )}
                        </div>

                        {/* Logistics & Conditions */}
                        <div className="lg:col-span-5 bg-card rounded-2xl border border-border overflow-hidden shadow-sm p-6 sm:p-8 space-y-6">
                            <div>
                                <h3 className="text-xs font-black uppercase tracking-widest text-foreground">Livraison & État</h3>
                                <p className="text-[10px] text-muted-foreground mt-1">Spécifiez les informations d'expédition par défaut.</p>
                            </div>

                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-bold text-muted-foreground uppercase">Délai estimé</Label>
                                        <Input
                                            type="number"
                                            min="1"
                                            value={formData.deliveryTimeValue}
                                            onChange={(e) => setFormData({ ...formData, deliveryTimeValue: Math.max(1, parseInt(e.target.value) || 2) })}
                                            className="h-10 rounded-xl bg-card border-border"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-bold text-muted-foreground uppercase">Unité</Label>
                                        <Select
                                            value={formData.deliveryTimeUnit}
                                            onValueChange={(val) => setFormData({ ...formData, deliveryTimeUnit: val })}
                                        >
                                            <SelectTrigger className="h-10 rounded-xl">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="d">Jours</SelectItem>
                                                <SelectItem value="h">Heures</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold text-muted-foreground uppercase">État de l'article</Label>
                                    <Select
                                        value={formData.condition}
                                        onValueChange={(val) => setFormData({ ...formData, condition: val })}
                                    >
                                        <SelectTrigger className="h-11 rounded-xl">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="NEW">Neuf</SelectItem>
                                            <SelectItem value="USED">Occasion</SelectItem>
                                            <SelectItem value="REFURBISHED">Reconditionné</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="pt-4 border-t border-border space-y-3">
                                    <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Dimensions (Optionnel)</Label>
                                    <div className="grid grid-cols-3 gap-2">
                                        <div>
                                            <Label className="text-[9px] font-bold text-muted-foreground uppercase">Poids (kg)</Label>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                placeholder="0.5"
                                                value={formData.weight}
                                                onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                                                className="h-9 rounded-lg"
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-[9px] font-bold text-muted-foreground uppercase">Largeur (cm)</Label>
                                            <Input
                                                type="number"
                                                placeholder="10"
                                                value={formData.width}
                                                onChange={(e) => setFormData({ ...formData, width: e.target.value })}
                                                className="h-9 rounded-lg"
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-[9px] font-bold text-muted-foreground uppercase">Hauteur (cm)</Label>
                                            <Input
                                                type="number"
                                                placeholder="15"
                                                value={formData.height}
                                                onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                                                className="h-9 rounded-lg"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 5: Déclinaisons & Options (Brand new creation only) */}
                {currentStep === 5 && !graftedProduct && (
                    <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm p-6 sm:p-8 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <div className="flex items-center justify-between border-b border-border pb-4">
                            <div>
                                <h3 className="text-sm font-bold text-foreground">Déclinaisons &amp; Options</h3>
                                <p className="text-xs text-muted-foreground mt-0.5">Le produit possède-t-il des caractéristiques multiples ?</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    id="hasMultipleVariants"
                                    checked={hasMultipleVariants}
                                    onChange={(e) => setHasMultipleVariants(e.target.checked)}
                                    className="w-5 h-5 rounded border-border text-primary focus:ring-primary cursor-pointer"
                                />
                                <Label htmlFor="hasMultipleVariants" className="text-xs font-black uppercase tracking-wider cursor-pointer">
                                    Oui, variantes multiples
                                </Label>
                            </div>
                        </div>

                        {hasMultipleVariants ? (
                            <div className="space-y-8">
                                {/* Step 1: Choose Option Groups from backend */}
                                <div className="space-y-3">
                                    <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Groupes d'options disponibles</Label>
                                    {loadingOptionGroups ? (
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            Chargement des groupes...
                                        </div>
                                    ) : globalOptionGroups.length === 0 ? (
                                        <p className="text-xs text-muted-foreground italic">Aucun groupe d'options défini dans le catalogue. Ajoutez un groupe personnalisé.</p>
                                    ) : (
                                        <div className="flex flex-wrap gap-2">
                                            {globalOptionGroups.map((group) => {
                                                const isSelected = selectedStandardGroups.includes(group.id);
                                                return (
                                                    <button
                                                        key={group.id}
                                                        type="button"
                                                        onClick={() => toggleStandardGroup(group.id)}
                                                        className={cn(
                                                            "px-4 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer flex items-center gap-2",
                                                            isSelected
                                                                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                                                : "bg-background text-muted-foreground border-border hover:bg-muted"
                                                        )}
                                                    >
                                                        {isSelected && <Check className="w-3.5 h-3.5" />}
                                                        {group.name}
                                                    </button>
                                                );
                                            })}

                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={handleAddCustomGroup}
                                                className="rounded-xl h-9 text-xs font-bold uppercase tracking-wider"
                                            >
                                                + Groupe Personnalisé
                                            </Button>
                                        </div>
                                    )}
                                </div>

                                {/* Step 2: Configure values for selected groups */}
                                {(selectedStandardGroups.length > 0 || customGroups.length > 0) && (
                                    <div className="space-y-6 pt-4 border-t border-border">
                                        {/* Backend option groups */}
                                        {selectedStandardGroups.map((groupId) => {
                                            const values = groupValuesMap[groupId] || [];
                                            const groupDef = globalOptionGroups.find((g) => g.id === groupId);
                                            const groupName = groupDef?.name || groupId;

                                            return (
                                                <div key={groupId} className="p-5 rounded-2xl border border-border bg-muted/5 space-y-4">
                                                    <div className="flex items-center justify-between border-b border-border/60 pb-2">
                                                        <span className="font-bold text-sm text-foreground">{groupName}</span>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => toggleStandardGroup(groupId)}
                                                            className="h-8 text-xs text-destructive hover:bg-destructive/10"
                                                        >
                                                            Désactiver
                                                        </Button>
                                                    </div>

                                                    {/* Selected Values tags */}
                                                    <div className="flex flex-wrap gap-2 min-h-[44px] p-2 bg-background border border-border rounded-xl">
                                                        {values.length === 0 ? (
                                                            <span className="text-xs text-muted-foreground italic font-medium p-1">Aucune valeur sélectionnée.</span>
                                                        ) : (
                                                            values.map((v: string, vIdx: number) => (
                                                                <div key={vIdx} className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg bg-primary/10 text-primary border border-primary/20">
                                                                    <span>{v}</span>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleRemoveOptionValue(groupId, vIdx)}
                                                                        className="text-primary hover:text-primary-dark ml-1"
                                                                    >
                                                                        <X className="w-3.5 h-3.5" />
                                                                    </button>
                                                                </div>
                                                            ))
                                                        )}
                                                    </div>

                                                    {/* Real options from backend as clickable chips */}
                                                    {groupDef && groupDef.options.length > 0 && (
                                                        <div className="space-y-1.5">
                                                            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Valeurs du catalogue (Cliquez pour ajouter)</span>
                                                            <div className="flex flex-wrap gap-1.5">
                                                                {groupDef.options.map((opt) => {
                                                                    const alreadySelected = values.includes(opt.name);
                                                                    return (
                                                                        <button
                                                                            key={opt.id}
                                                                            type="button"
                                                                            onClick={() => !alreadySelected && handleAddSuggestedValue(groupId, opt.name)}
                                                                            className={cn(
                                                                                "px-2.5 py-1 text-[11px] font-semibold border rounded-lg transition-colors",
                                                                                alreadySelected
                                                                                    ? "bg-primary/10 text-primary border-primary/30 cursor-default"
                                                                                    : "border-border hover:border-primary bg-background hover:bg-primary/5 cursor-pointer"
                                                                            )}
                                                                        >
                                                                            {alreadySelected && <Check className="w-3 h-3 inline mr-1" />}
                                                                            {opt.name}
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Custom value input */}
                                                    <div className="flex gap-2">
                                                        <Input
                                                            value={newOptionValue[groupId] || ''}
                                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewOptionValue((prev: Record<string, string>) => ({ ...prev, [groupId]: e.target.value }))}
                                                            placeholder="Ajouter une valeur personnalisée..."
                                                            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                                                                if (e.key === 'Enter') {
                                                                    e.preventDefault();
                                                                    handleAddOptionValue(groupId);
                                                                }
                                                            }}
                                                            className="h-10 rounded-lg max-w-xs"
                                                        />
                                                        <Button
                                                            type="button"
                                                            variant="secondary"
                                                            onClick={() => handleAddOptionValue(groupId)}
                                                            className="h-10 rounded-lg px-4 font-bold text-xs uppercase"
                                                        >
                                                            + Ajouter
                                                        </Button>
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        {/* Custom groups */}
                                        {customGroups.map((cg) => {
                                            const values = groupValuesMap[cg.id] || [];

                                            return (
                                                <div key={cg.id} className="p-5 rounded-2xl border border-border bg-muted/5 space-y-4 animate-in fade-in duration-200">
                                                    <div className="flex items-center justify-between border-b border-border/60 pb-2 gap-4">
                                                        <div className="flex-1 max-w-xs">
                                                            <Input
                                                                value={cg.name}
                                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleCustomGroupNameChange(cg.id, e.target.value)}
                                                                placeholder="Nom du groupe personnalisé (ex: Matière)..."
                                                                className="h-9 font-bold text-sm border-none bg-transparent hover:bg-muted/30 focus:bg-background"
                                                            />
                                                        </div>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleRemoveCustomGroup(cg.id)}
                                                            className="h-8 text-xs text-destructive hover:bg-destructive/10"
                                                        >
                                                            Supprimer
                                                        </Button>
                                                    </div>

                                                    {/* Selected Values tags */}
                                                    <div className="flex flex-wrap gap-2 min-h-[44px] p-2 bg-background border border-border rounded-xl">
                                                        {values.length === 0 ? (
                                                            <span className="text-xs text-muted-foreground italic font-medium p-1">Aucune valeur saisie.</span>
                                                        ) : (
                                                            values.map((v: string, vIdx: number) => (
                                                                <div key={vIdx} className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg bg-primary/10 text-primary border border-primary/20">
                                                                    <span>{v}</span>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleRemoveOptionValue(cg.id, vIdx)}
                                                                        className="text-primary hover:text-primary-dark ml-1"
                                                                    >
                                                                        <X className="w-3.5 h-3.5" />
                                                                    </button>
                                                                </div>
                                                            ))
                                                        )}
                                                    </div>

                                                    <div className="flex gap-2">
                                                        <Input
                                                            value={newOptionValue[cg.id] || ''}
                                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewOptionValue((prev: Record<string, string>) => ({ ...prev, [cg.id]: e.target.value }))}
                                                            placeholder="Saisir une valeur..."
                                                            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                                                                if (e.key === 'Enter') {
                                                                    e.preventDefault();
                                                                    handleAddOptionValue(cg.id);
                                                                }
                                                            }}
                                                            className="h-10 rounded-lg max-w-xs"
                                                        />
                                                        <Button
                                                            type="button"
                                                            variant="secondary"
                                                            onClick={() => handleAddOptionValue(cg.id)}
                                                            className="h-10 rounded-lg px-4 font-bold text-xs uppercase"
                                                        >
                                                            + Ajouter
                                                        </Button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                <div className="flex justify-end pt-4 border-t border-border">
                                    <Button
                                        type="button"
                                        onClick={generateVariants}
                                        className="rounded-xl h-12 bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-bold uppercase tracking-widest px-8 shadow-md"
                                    >
                                        Générer la grille des combinaisons
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="p-6 border border-border border-dashed rounded-2xl bg-muted/5 flex flex-col items-center justify-center text-center space-y-4 py-12">
                                <Tag className="w-8 h-8 text-muted-foreground" />
                                <div className="max-w-md">
                                    <h4 className="text-sm font-bold text-foreground">Fiche Produit Unique</h4>
                                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                        Ce produit ne dispose d'aucune variante (taille, couleur, stockage, etc.). Une seule offre standard sera créée.
                                    </p>
                                </div>
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => handleNextStep()}
                                    className="rounded-xl h-10 px-6 text-xs font-bold uppercase tracking-widest cursor-pointer"
                                >
                                    Suivant
                                </Button>
                            </div>
                        )}
                    </div>
                )}

                {currentStep === 6 && (
                    <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm p-6 sm:p-8 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <div>
                            <h3 className="text-sm font-bold text-foreground">
                                {hasMultipleVariants ? "Grille des Tarifs et Stocks pour vos Variantes" : "Prix & Stock du produit"}
                            </h3>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                {graftedProduct 
                                    ? `Saisissez vos offres pour les variantes disponibles de : ${graftedProduct.name}`
                                    : "Configurez l'offre commerciale pour chaque variante générée."
                                }
                            </p>
                        </div>

                        {hasMultipleVariants ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse min-w-[800px]">
                                    <thead>
                                        <tr className="border-b border-border text-[9px] font-bold text-muted-foreground uppercase tracking-widest bg-muted/30">
                                            <th className="py-3 px-4 w-[60px] text-center">Vendre</th>
                                            <th className="py-3 px-4">Déclinaison / Variante</th>
                                            {!graftedProduct && <th className="py-3 px-4 w-[160px]">Photo</th>}
                                            <th className="py-3 px-4">SKU Vendeur</th>
                                            <th className="py-3 px-4 w-[150px]">Prix (FCFA) *</th>
                                            <th className="py-3 px-4 w-[100px]">Stock *</th>
                                            <th className="py-3 px-4 w-[280px]">Promotion</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/60 text-xs">
                                        {variants.map(v => (
                                            <tr key={v.id} className={cn("transition-colors hover:bg-muted/10", !v.enabled && "opacity-40 bg-muted/5")}>
                                                <td className="py-4 px-4 text-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={v.enabled !== false}
                                                        onChange={(e) => handleVariantChange(v.id, 'enabled', e.target.checked)}
                                                        className="w-4 h-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                                                    />
                                                </td>
                                                <td className="py-4 px-4 font-semibold text-xs text-foreground">
                                                    {v.name}
                                                </td>
                                                
                                                {/* Image picker for variant (brand new creation only) */}
                                                {!graftedProduct && (
                                                    <td className="py-4 px-4">
                                                        <div className="flex items-center gap-2">
                                                            {assets.length === 0 ? (
                                                                <span className="text-[9px] text-muted-foreground italic">Aucune image</span>
                                                            ) : (
                                                                <Select
                                                                    value={v.featuredAssetId || ''}
                                                                    onValueChange={(val) => handleVariantChange(v.id, 'featuredAssetId', val || null)}
                                                                >
                                                                    <SelectTrigger className="h-9 rounded-lg text-xs w-[120px]">
                                                                        <SelectValue placeholder="Image..." />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="none">Par défaut</SelectItem>
                                                                        {assets.map(asset => (
                                                                            <SelectItem key={asset.id} value={asset.id}>
                                                                                <div className="flex items-center gap-2">
                                                                                    <img src={asset.preview} alt="Aperçu" className="w-5 h-5 object-cover rounded" />
                                                                                    <span className="text-[10px] truncate max-w-[60px]">{asset.name || 'Image'}</span>
                                                                                </div>
                                                                            </SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                            )}
                                                        </div>
                                                    </td>
                                                )}

                                                <td className="py-4 px-4">
                                                    <Input
                                                        disabled={v.enabled === false}
                                                        value={v.sku}
                                                        onChange={(e) => handleVariantChange(v.id, 'sku', e.target.value)}
                                                        placeholder={graftedProduct ? "SKU Interne" : "Auto-généré"}
                                                        className="h-9 text-xs rounded-lg font-mono"
                                                    />
                                                </td>
                                                <td className="py-4 px-4">
                                                    <Input
                                                        type="number"
                                                        disabled={v.enabled === false}
                                                        min="0"
                                                        value={v.price || ''}
                                                        onChange={(e) => handleVariantChange(v.id, 'price', Math.max(0, parseInt(e.target.value) || 0))}
                                                        className="h-9 font-bold text-xs rounded-lg"
                                                    />
                                                </td>
                                                <td className="py-4 px-4">
                                                    <Input
                                                        type="number"
                                                        disabled={v.enabled === false}
                                                        min="0"
                                                        value={v.stock || ''}
                                                        onChange={(e) => handleVariantChange(v.id, 'stock', Math.max(0, parseInt(e.target.value) || 0))}
                                                        className="h-9 font-bold text-xs rounded-lg"
                                                    />
                                                </td>
                                                <td className="py-4 px-4">
                                                    <div className="flex flex-col gap-1.5 min-w-[180px]">
                                                        <label htmlFor={`promo-${v.id}`} className="flex items-center gap-1.5 cursor-pointer">
                                                            <input
                                                                type="checkbox"
                                                                disabled={v.enabled === false}
                                                                id={`promo-${v.id}`}
                                                                checked={v.onPromotion}
                                                                onChange={(e) => handleVariantChange(v.id, 'onPromotion', e.target.checked)}
                                                                className="w-4 h-4 rounded border-border text-primary cursor-pointer"
                                                            />
                                                            <span className="text-[11px] font-semibold text-foreground">
                                                                {v.onPromotion ? "Promotion active" : "Activer promo"}
                                                            </span>
                                                        </label>
                                                        {v.onPromotion && (
                                                            <div className="flex items-center gap-1.5">
                                                                <Input
                                                                    type="number"
                                                                    disabled={v.enabled === false}
                                                                    placeholder="Prix soldé..."
                                                                    value={v.promotionalPrice || ''}
                                                                    onChange={(e) => handleVariantChange(v.id, 'promotionalPrice', Math.max(0, parseInt(e.target.value) || 0))}
                                                                    className="h-8 font-bold text-xs rounded-lg text-rose-600 border-rose-200"
                                                                />
                                                                {v.price && v.promotionalPrice && v.promotionalPrice < v.price ? (
                                                                    <span className="text-[10px] font-black text-rose-600 bg-rose-500/10 px-1.5 py-0.5 rounded shrink-0">
                                                                        -{Math.round(((v.price - v.promotionalPrice) / v.price) * 100)}%
                                                                    </span>
                                                                ) : null}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>

                                <div className="pt-3 flex justify-between items-center border-t border-border/60 mt-4">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            const newVarId = `custom_v_${Date.now()}`;
                                            setVariants(prev => [
                                                ...prev,
                                                {
                                                    id: newVarId,
                                                    name: `Déclinaison Personnalisée ${prev.length + 1}`,
                                                    sku: `SKU-CUST-${prev.length + 1}`,
                                                    price: formData.price || 1000,
                                                    stock: 5,
                                                    onPromotion: false,
                                                    promotionalPrice: 0,
                                                    enabled: true,
                                                    featuredAssetId: null
                                                }
                                            ]);
                                            setHasMultipleVariants(true);
                                            toast.success("Nouvelle variante d'offre ajoutée avec succès.");
                                        }}
                                        className="rounded-xl h-9 text-xs font-bold border-dashed border-primary/40 text-primary hover:bg-primary/5 cursor-pointer"
                                    >
                                        + Ajouter une déclinaison d'offre supplémentaire
                                    </Button>
                                    <span className="text-[11px] text-muted-foreground font-medium">
                                        {variants.filter(v => v.enabled !== false).length} variante(s) activée(s) pour la vente
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Prix (CFA) *</Label>
                                        <Input
                                            type="number"
                                            min="0"
                                            value={formData.price || ''}
                                            onChange={(e) => setFormData({ ...formData, price: Math.max(0, parseInt(e.target.value) || 0) })}
                                            className="h-12 rounded-xl bg-card border-border font-bold text-lg"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Stock initial</Label>
                                        <Input
                                            type="number"
                                            min="0"
                                            value={formData.stock || ''}
                                            onChange={(e) => setFormData({ ...formData, stock: Math.max(0, parseInt(e.target.value) || 0) })}
                                            className="h-12 rounded-xl bg-card border-border font-bold text-lg"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">SKU (Optionnel)</Label>
                                    <Input
                                        value={formData.sku}
                                        onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                                        placeholder="Auto-généré si laissé vide"
                                        className="h-11 rounded-xl font-mono text-sm"
                                    />
                                </div>

                                <div className="pt-4 border-t border-border space-y-4">
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="checkbox"
                                            id="onPromotion"
                                            checked={formData.onPromotion}
                                            onChange={(e) => setFormData({ ...formData, onPromotion: e.target.checked, promotionalPrice: e.target.checked ? formData.promotionalPrice : 0 })}
                                            className="w-5 h-5 rounded border-border text-primary cursor-pointer"
                                        />
                                        <Label htmlFor="onPromotion" className="text-xs font-bold uppercase tracking-wider text-foreground cursor-pointer">Activer une promotion</Label>
                                    </div>

                                    {formData.onPromotion && (
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Prix Soldé (CFA)</Label>
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    value={formData.promotionalPrice || ''}
                                                    onChange={(e) => setFormData({ ...formData, promotionalPrice: Math.max(0, parseInt(e.target.value) || 0) })}
                                                    className="h-12 rounded-xl bg-card border-border font-bold text-lg"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Réduction</Label>
                                                <div className="h-12 rounded-xl bg-muted/30 border border-border flex items-center px-4">
                                                    <Percent className="w-4 h-4 text-primary mr-2" />
                                                    <span className="font-bold text-lg text-primary">
                                                        {formData.price > 0 && formData.promotionalPrice > 0
                                                            ? Math.round(((formData.price - formData.promotionalPrice) / formData.price) * 100)
                                                            : 0}%
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                        
                        {/* Delivery options for Grafting flow since step 3 was skipped */}
                        {graftedProduct && (
                            <div className="grid grid-cols-2 gap-4 pt-6 border-t border-border">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold text-muted-foreground uppercase">Délai estimé de livraison</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            type="number"
                                            min="1"
                                            value={formData.deliveryTimeValue}
                                            onChange={(e) => setFormData({ ...formData, deliveryTimeValue: Math.max(1, parseInt(e.target.value) || 2) })}
                                            className="w-2/3 h-10 rounded-xl"
                                        />
                                        <Select
                                            value={formData.deliveryTimeUnit}
                                            onValueChange={(val) => setFormData({ ...formData, deliveryTimeUnit: val })}
                                        >
                                            <SelectTrigger className="w-1/3 h-10 rounded-xl">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="d">Jours</SelectItem>
                                                <SelectItem value="h">Heures</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold text-muted-foreground uppercase">État de vos articles</Label>
                                    <Select
                                        value={formData.condition}
                                        onValueChange={(val) => setFormData({ ...formData, condition: val })}
                                    >
                                        <SelectTrigger className="h-10 rounded-xl">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="NEW">Neuf</SelectItem>
                                            <SelectItem value="USED">Occasion</SelectItem>
                                            <SelectItem value="REFURBISHED">Reconditionné</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Step 7: Récapitulatif & Soumission */}
                {currentStep === 7 && (
                    <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <div className="px-6 py-4 bg-muted/30 border-b border-border flex items-center gap-2">
                            <Eye className="w-4 h-4 text-primary" />
                            <h3 className="text-xs font-black uppercase tracking-widest text-foreground">Récapitulatif de la fiche produit</h3>
                        </div>
                        <div className="p-6 sm:p-8 space-y-6">
                            
                            {/* Alert reminder */}
                            <div className="p-4 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/20 dark:text-amber-300 flex items-start gap-3">
                                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                                <div className="text-xs leading-relaxed">
                                    {graftedProduct ? (
                                        <>
                                            <strong>Greffage sur catalogue</strong>
                                            <p className="mt-1 font-medium">
                                                Vous associez vos offres commerciales à la fiche existante "{graftedProduct.name}". Vos prix et stocks seront immédiatement ajoutés sous forme de nouvelles offres de vendeur.
                                            </p>
                                        </>
                                    ) : (
                                        <>
                                            <strong>Important : Règle de greffage de catalogue Ahizan</strong>
                                            <p className="mt-1 font-medium">
                                                Cette nouvelle fiche produit sera soumise à l'équipe de validation d'Ahizan avant d'être publiée publiquement dans le catalogue de la marketplace pour éviter les doublons. Une fois approuvée, les autres vendeurs pourront également greffer leurs offres dessus.
                                            </p>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div>
                                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Nom du produit</span>
                                        <p className="text-sm font-bold text-foreground mt-0.5">{graftedProduct ? graftedProduct.name : formData.name}</p>
                                    </div>
                                    {!graftedProduct && (
                                        <>
                                            <div>
                                                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Description courte</span>
                                                <p className="text-xs text-foreground font-medium mt-0.5 leading-relaxed">{formData.shortDescription || 'Aucune description courte.'}</p>
                                            </div>
                                            <div>
                                                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Dimensions et logistique</span>
                                                <p className="text-xs text-foreground font-medium mt-0.5 font-semibold">
                                                    {formData.weight ? `Poids: ${formData.weight}kg | ` : ''}
                                                    {formData.width ? `Largeur: ${formData.width}cm | ` : ''}
                                                    {formData.height ? `Hauteur: ${formData.height}cm | ` : ''}
                                                    Délai: {formData.deliveryTimeValue}{formData.deliveryTimeUnit === 'd' ? ' jours' : ' heures'} | 
                                                    État: {formData.condition === 'NEW' ? 'Neuf' : formData.condition === 'USED' ? 'Occasion' : 'Reconditionné'}
                                                </p>
                                            </div>
                                        </>
                                    )}
                                </div>

                                <div className="space-y-4">
                                    {graftedProduct ? (
                                        <div>
                                            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Image du produit</span>
                                            <div className="mt-1.5 w-16 h-16 rounded-xl overflow-hidden border border-border">
                                                {graftedProduct.preview ? (
                                                    <img src={graftedProduct.preview} alt="Aperçu" className="w-full h-full object-cover" />
                                                ) : (
                                                    <Package className="w-8 h-8 text-muted-foreground m-auto" />
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <div>
                                            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Images ({assets.length})</span>
                                            <div className="flex flex-wrap gap-2 mt-1.5">
                                                {assets.map(asset => (
                                                    <div key={asset.id} className="relative w-14 h-14 rounded-lg overflow-hidden border border-border">
                                                        <img src={asset.preview} alt="Aperçu" className="w-full h-full object-cover" />
                                                        {featuredAssetId === asset.id && (
                                                            <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                                                                <span className="text-[7px] font-black uppercase text-primary-foreground bg-primary px-1 rounded">⭐ Principal</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Options and Variants recap */}
                            <div className="pt-6 border-t border-border">
                                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Grille des variantes à publier</span>
                                <div className="mt-3 overflow-hidden rounded-xl border border-border">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="border-b border-border bg-muted/40 text-[9px] font-bold text-muted-foreground uppercase">
                                                <th className="p-3 px-4">Variante</th>
                                                <th className="p-3 px-4">SKU Vendeur</th>
                                                <th className="p-3 px-4 text-right">Prix (FCFA)</th>
                                                <th className="p-3 px-4 text-right">Stock</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border/60 text-xs">
                                            {hasMultipleVariants ? (
                                                variants.filter(v => v.enabled).map(v => (
                                                    <tr key={v.id}>
                                                        <td className="p-3 px-4 font-bold text-foreground">{v.name}</td>
                                                        <td className="p-3 px-4 font-mono text-muted-foreground">{v.sku || 'Auto-généré'}</td>
                                                        <td className="p-3 px-4 text-right font-bold">
                                                            {v.onPromotion ? (
                                                                <div className="flex flex-col items-end">
                                                                    <span className="text-primary">{v.promotionalPrice.toLocaleString()} FCFA</span>
                                                                    <span className="text-[9px] line-through text-muted-foreground">{v.price.toLocaleString()} FCFA</span>
                                                                </div>
                                                            ) : (
                                                                <span>{v.price.toLocaleString()} FCFA</span>
                                                            )}
                                                        </td>
                                                        <td className="p-3 px-4 text-right font-bold">{v.stock}</td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td className="p-3 px-4 font-bold text-foreground">{graftedProduct ? graftedProduct.name : formData.name} (Standard)</td>
                                                    <td className="p-3 px-4 font-mono text-muted-foreground">{formData.sku || 'Auto-généré'}</td>
                                                    <td className="p-3 px-4 text-right font-bold">
                                                        {formData.onPromotion ? (
                                                            <div className="flex flex-col items-end">
                                                                <span className="text-primary">{formData.promotionalPrice.toLocaleString()} FCFA</span>
                                                                <span className="text-[9px] line-through text-muted-foreground">{formData.price.toLocaleString()} FCFA</span>
                                                            </div>
                                                        ) : (
                                                            <span>{formData.price.toLocaleString()} FCFA</span>
                                                        )}
                                                    </td>
                                                    <td className="p-3 px-4 text-right font-bold">{formData.stock}</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Submit area */}
                            <div className="pt-6 border-t border-border flex flex-col gap-3">
                                <Button
                                    type="submit"
                                    disabled={isSubmitting || isUploadingAssets}
                                    className="w-full h-12 rounded-xl bg-primary hover:bg-primary/95 text-primary-foreground font-bold text-xs uppercase tracking-widest shadow-lg shadow-primary/10 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
                                >
                                    {(isSubmitting || isUploadingAssets) ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <CheckCircle2 className="w-4 h-4" />
                                    )}
                                    {isUploadingAssets ? 'Photos en cours d\'envoi...' : isSubmitting ? 'Publication en cours...' : graftedProduct ? 'Publier mes offres de greffage' : 'Envoyer la nouvelle fiche pour validation'}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Footer Navigation Buttons */}
                <div className="flex justify-between items-center gap-4 pt-4 border-t border-border/50">
                    <Button
                        type="button"
                        variant="outline"
                        disabled={currentStep === 1 || isSubmitting}
                        onClick={handlePrevStep}
                        className="rounded-xl h-11 px-5 text-xs font-bold uppercase tracking-widest cursor-pointer flex items-center gap-2"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Précédent
                    </Button>

                    {currentStep < (graftedProduct ? 6 : steps.length) ? (
                        <Button
                            type="button"
                            onClick={handleNextStep}
                            className="rounded-xl h-11 bg-primary text-primary-foreground hover:bg-primary/95 px-6 text-xs font-bold uppercase tracking-widest flex items-center gap-2 cursor-pointer"
                        >
                            Suivant
                            <ArrowRight className="w-4 h-4" />
                        </Button>
                    ) : (
                        currentStep === (graftedProduct ? 6 : steps.length) ? (
                            <Button
                                type="button"
                                onClick={() => setCurrentStep(7)}
                                className="rounded-xl h-11 bg-primary text-primary-foreground hover:bg-primary/95 px-6 text-xs font-bold uppercase tracking-widest flex items-center gap-2 cursor-pointer animate-pulse"
                            >
                                Suivant (Récapitulatif)
                                <ArrowRight className="w-4 h-4" />
                            </Button>
                        ) : (
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => setIsConfirmingCancel(true)}
                                className="h-11 px-5 text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-destructive cursor-pointer"
                            >
                                Annuler
                            </Button>
                        )
                    )}
                </div>
            </form>

            {/* Cancel Confirmation */}
            <AlertDialog open={isConfirmingCancel} onOpenChange={setIsConfirmingCancel}>
                <AlertDialogContent className="rounded-2xl border-border shadow-2xl max-w-sm">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-xl font-bold">Abandonner ?</AlertDialogTitle>
                        <AlertDialogDescription className="text-xs leading-relaxed">
                            Toutes les modifications en cours de saisie seront perdues.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="pt-4">
                        <AlertDialogCancel className="h-10 rounded-xl font-bold text-[10px] uppercase tracking-widest cursor-pointer">Rester</AlertDialogCancel>
                        <AlertDialogAction 
                            onClick={() => {
                                setIsConfirmingCancel(false);
                                if (onSuccess) {
                                    onSuccess();
                                } else {
                                    router.push('/dashboard/products');
                                }
                            }}
                            className="h-10 rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground font-bold text-[10px] uppercase tracking-widest cursor-pointer"
                        >
                            Quitter
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
