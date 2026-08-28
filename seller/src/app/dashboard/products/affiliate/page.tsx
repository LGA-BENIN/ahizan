'use client';

import React, { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { query, mutate } from '@/lib/vendure/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { uploadFileAction, tagProductWithVariantOffersAction } from '@/app/dashboard/products/actions';
import { priceToSubunit } from '@/lib/format';
import {
    ArrowLeft,
    Search,
    Loader2,
    Package,
    PlusCircle,
    CheckCircle2,
    Tag,
    ChevronRight,
    Sparkles,
    Check,
    X,
    Trash2,
    Layers,
    Percent,
    Coins,
    SlidersHorizontal,
    Eye,
    Plus,
    Camera,
    UploadCloud,
    ImageIcon,
    AlertTriangle
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

// Search official validated catalog products
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

// Get product details with option groups and variants
const GET_PRODUCT_DETAIL_QUERY = `
  query GetProductDetail($id: ID!) {
    product(id: $id) {
      id
      name
      slug
      description
      featuredAsset {
        id
        preview
      }
      assets {
        id
        preview
      }
      collections {
        id
        name
      }
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
        options {
          id
          code
          name
          group {
            name
          }
        }
      }
    }
  }
`;

// Global platform option groups
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

// Tag product with variant offers mutation
const TAG_PRODUCT_WITH_VARIANT_OFFERS_MUTATION = `
  mutation TagProductWithVariantOffers($input: TagProductWithVariantOffersInput!) {
    tagProductWithVariantOffers(input: $input) {
      id
      price
      stock
      sku
      onPromotion
      promotionalPrice
      status
    }
  }
`;

interface OptionGroupDef {
    id: string;
    code: string;
    name: string;
    options: { id: string; code: string; name: string }[];
}

interface GeneratedVariantRow {
    id: string;
    key: string;
    enabled: boolean;
    name: string;
    optionValues: { groupName: string; optName: string }[];
    price: number;
    stock: number;
    sku: string;
    onPromotion: boolean;
    promotionalPrice: number;
    featuredAssetId?: string;
    assetPreview?: string;
    deliveryTimeValue: number;
    deliveryTimeUnit: string;
    condition: string;
}

interface AffiliateProductPageProps {
    initialSelectedProduct?: any;
    onBack?: () => void;
}

function AffiliateProductPageContent({ initialSelectedProduct, onBack }: AffiliateProductPageProps = {}) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const productIdFromQuery = searchParams?.get('id') || searchParams?.get('productId');

    // Step state: 1: Search & Select | 2: Option Groups & Combinations Config | 3: Grid Offers Configuration
    const [step, setStep] = useState<1 | 2 | 3>(1);

    // Step 1 State: Search
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedProductSummary, setSelectedProductSummary] = useState<any | null>(null);

    // Step 2 State: Product Detailed Specs & Option Groups
    const [productDetails, setProductDetails] = useState<any | null>(null);
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);
    const [globalOptionGroups, setGlobalOptionGroups] = useState<OptionGroupDef[]>([]);
    const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
    const [groupValuesMap, setGroupValuesMap] = useState<{ [groupId: string]: string[] }>({});
    const [newCustomValueInput, setNewCustomValueInput] = useState<{ [groupId: string]: string }>({});
    const [customGroups, setCustomGroups] = useState<{ id: string; name: string; values: string[] }[]>([]);

    // Step 3 State: Generated Variants Matrix
    const [generatedVariants, setGeneratedVariants] = useState<GeneratedVariantRow[]>([]);
    const [isSubmittingOffers, setIsSubmittingOffers] = useState(false);
    const [uploadingVariantKey, setUploadingVariantKey] = useState<string | null>(null);

    // Global defaults for fast fill
    const [bulkPrice, setBulkPrice] = useState<string>('');
    const [bulkStock, setBulkStock] = useState<string>('5');
    const [bulkCondition, setBulkCondition] = useState<string>('NEW');

    // Fetch Global Option Groups
    useEffect(() => {
        const fetchGlobalGroups = async () => {
            try {
                const res = await query(GET_GLOBAL_OPTION_GROUPS_QUERY, {});
                if (res.data?.getGlobalOptionGroups) {
                    setGlobalOptionGroups(res.data.getGlobalOptionGroups);
                }
            } catch (err) {
                console.error('[AffiliatePage] Failed to fetch global option groups:', err);
            }
        };
        fetchGlobalGroups();
    }, []);

    // Step 1 Search Handler
    const handleSearch = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!searchTerm.trim()) return;

        setIsSearching(true);
        try {
            const result = await query(SEARCH_OFFICIAL_PRODUCTS_QUERY, {
                term: searchTerm.trim(),
                take: 40
            });
            const items = result.data?.searchOfficialProducts?.items || [];
            setSearchResults(items.map((prod: any) => ({
                id: prod.id,
                name: prod.name,
                slug: prod.slug,
                preview: prod.featuredAsset?.preview || '',
                variants: prod.variants || []
            })));
            if (items.length === 0) {
                toast.info("Aucun produit officiel correspondant trouvé.");
            }
        } catch (err: any) {
            console.error('[AffiliatePage] Search failed:', err);
            toast.error('Erreur lors de la recherche: ' + err.message);
        } finally {
            setIsSearching(false);
        }
    };

    // Step 1 -> Step 2: Select Product
    const handleSelectProduct = useCallback(async (productSummary: any) => {
        if (!productSummary || !productSummary.id) return;
        setSelectedProductSummary(productSummary);
        setIsLoadingDetails(true);
        setStep(2);

        try {
            const res = await query(GET_PRODUCT_DETAIL_QUERY, { id: productSummary.id });
            const prod = res.data?.product;
            setProductDetails(prod || productSummary);

            // Pre-select any option groups already defined on this product
            const existingGroups: string[] = [];
            const initialValuesMap: { [key: string]: string[] } = {};

            if (prod?.optionGroups) {
                for (const og of prod.optionGroups) {
                    const key = String(og.id);
                    existingGroups.push(key);
                    initialValuesMap[key] = (og.options || []).map((o: any) => o.name || o.code);
                }
            }

            setSelectedGroupIds(existingGroups);
            setGroupValuesMap(initialValuesMap);
        } catch (err) {
            console.error('[AffiliatePage] Failed to fetch product details:', err);
            setProductDetails(productSummary);
        } finally {
            setIsLoadingDetails(false);
        }
    }, []);

    // Auto-select initial product if provided via URL query or props
    useEffect(() => {
        if (productIdFromQuery) {
            handleSelectProduct({ id: productIdFromQuery });
        } else if (initialSelectedProduct && initialSelectedProduct.id) {
            handleSelectProduct(initialSelectedProduct);
        }
    }, [productIdFromQuery, initialSelectedProduct, handleSelectProduct]);

    // Computed display option groups (combines global platform groups + product-specific groups)
    const displayOptionGroups = useMemo(() => {
        const map = new Map<string, OptionGroupDef>();
        for (const g of globalOptionGroups) {
            map.set(String(g.id), g);
        }
        if (productDetails?.optionGroups) {
            for (const og of productDetails.optionGroups) {
                if (!map.has(String(og.id))) {
                    map.set(String(og.id), {
                        id: String(og.id),
                        code: og.code,
                        name: og.name,
                        options: og.options || []
                    });
                }
            }
        }
        return Array.from(map.values());
    }, [globalOptionGroups, productDetails]);

    // Step 2 Option Groups Selection & Value Handlers
    const toggleOptionGroup = (groupId: string) => {
        setSelectedGroupIds(prev => {
            if (prev.includes(groupId)) {
                return prev.filter(id => id !== groupId);
            } else {
                return [...prev, groupId];
            }
        });
    };

    const handleAddValueToGroup = (groupId: string, valToAdd?: string) => {
        const val = (valToAdd || newCustomValueInput[groupId] || '').trim();
        if (!val) return;

        setGroupValuesMap(prev => {
            const current = prev[groupId] || [];
            if (current.includes(val)) return prev;
            return { ...prev, [groupId]: [...current, val] };
        });

        setNewCustomValueInput(prev => ({ ...prev, [groupId]: '' }));
    };

    const handleRemoveValueFromGroup = (groupId: string, valToRemove: string) => {
        setGroupValuesMap(prev => {
            const current = prev[groupId] || [];
            return { ...prev, [groupId]: current.filter(v => v !== valToRemove) };
        });
    };

    const handleAddCustomGroup = () => {
        const newId = `custom_${Date.now()}`;
        setCustomGroups(prev => [...prev, { id: newId, name: '', values: [] }]);
    };

    const handleRemoveCustomGroup = (id: string) => {
        setCustomGroups(prev => prev.filter(g => g.id !== id));
        setGroupValuesMap(prev => {
            const copy = { ...prev };
            delete copy[id];
            return copy;
        });
    };

    // Step 2 -> Step 3: Generate Combinations
    const handleGenerateCombinations = () => {
        // Gather all selected groups that have at least one value
        const activeGroups: { id: string; name: string; values: string[] }[] = [];

        // 1. Standard / Global / Product Option Groups
        for (const gId of selectedGroupIds) {
            const vals = groupValuesMap[gId] || [];
            if (vals.length > 0) {
                // Find group name
                const fromGlobal = globalOptionGroups.find(g => g.id === gId || g.code === gId);
                const fromProd = productDetails?.optionGroups?.find((g: any) => g.id === gId || g.code === gId);
                const groupName = fromGlobal?.name || fromProd?.name || gId;
                activeGroups.push({ id: gId, name: groupName, values: vals });
            }
        }

        // 2. Custom groups
        for (const cg of customGroups) {
            const vals = groupValuesMap[cg.id] || [];
            if (cg.name.trim() && vals.length > 0) {
                activeGroups.push({ id: cg.id, name: cg.name.trim(), values: vals });
            }
        }

        // If no option groups, generate 1 single standard variant offer
        if (activeGroups.length === 0) {
            const singleRow: GeneratedVariantRow = {
                id: productDetails?.variants?.[0]?.id || `var_${Date.now()}`,
                key: 'single',
                enabled: true,
                name: productDetails?.name || 'Standard',
                optionValues: [],
                price: bulkPrice ? Number(bulkPrice) : 10000,
                stock: bulkStock ? Number(bulkStock) : 5,
                sku: `OFFER-${productDetails?.id || Date.now()}`,
                onPromotion: false,
                promotionalPrice: 0,
                featuredAssetId: productDetails?.featuredAsset?.id,
                assetPreview: productDetails?.featuredAsset?.preview,
                deliveryTimeValue: 2,
                deliveryTimeUnit: 'd',
                condition: bulkCondition || 'NEW',
            };
            setGeneratedVariants([singleRow]);
            setStep(3);
            toast.info('Offre standard créée (aucune déclinaison sélectionnée).');
            return;
        }

        // Compute Cartesian Product of option values
        const cartesian = (arrays: string[][]): string[][] => {
            return arrays.reduce((acc, curr) => {
                return acc.flatMap(a => curr.map(c => [...a, c]));
            }, [[]] as string[][]);
        };

        const groupArrays = activeGroups.map(g => g.values);
        const combinations = cartesian(groupArrays);

        const rows: GeneratedVariantRow[] = combinations.map((combo, idx) => {
            const optionPairs = combo.map((val, gIdx) => ({
                groupName: activeGroups[gIdx].name,
                optName: val,
            }));

            const comboName = `${productDetails?.name || 'Produit'} ${combo.join(' ')}`;
            const comboKey = combo.join('-');

            return {
                id: `combo_${idx}_${Date.now()}`,
                key: comboKey,
                enabled: true,
                name: comboName,
                optionValues: optionPairs,
                price: bulkPrice ? Number(bulkPrice) : 10000,
                stock: bulkStock ? Number(bulkStock) : 5,
                sku: `OFFER-${idx + 1}`,
                onPromotion: false,
                promotionalPrice: 0,
                featuredAssetId: productDetails?.featuredAsset?.id,
                assetPreview: productDetails?.featuredAsset?.preview,
                deliveryTimeValue: 2,
                deliveryTimeUnit: 'd',
                condition: bulkCondition || 'NEW',
            };
        });

        setGeneratedVariants(rows);
        setStep(3);
        toast.success(`${rows.length} combinaison(s) générée(s) avec succès !`);
    };

    // Bulk Apply Values to All Active Combinations
    const handleApplyBulkSettings = () => {
        if (!bulkPrice && !bulkStock) return;

        setGeneratedVariants(prev => prev.map(v => ({
            ...v,
            price: bulkPrice ? Number(bulkPrice) : v.price,
            stock: bulkStock ? Number(bulkStock) : v.stock,
            condition: bulkCondition || v.condition,
        })));
        toast.success('Paramètres appliqués à toutes les variantes.');
    };

    // Update single variant row field
    const handleUpdateVariantRow = (key: string, field: keyof GeneratedVariantRow, value: any) => {
        setGeneratedVariants(prev => prev.map(row => row.key === key ? { ...row, [field]: value } : row));
    };

    // Upload custom image for a variant
    const handleUploadVariantImage = async (key: string, file: File) => {
        if (!file) return;
        setUploadingVariantKey(key);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const res = await uploadFileAction(formData);
            if (res.success && res.asset) {
                setGeneratedVariants(prev => prev.map(row => row.key === key ? {
                    ...row,
                    featuredAssetId: res.asset.id,
                    assetPreview: res.asset.preview
                } : row));
                toast.success('Photo de la déclinaison mise à jour !');
            } else {
                toast.error('Erreur upload: ' + (res.error || 'Impossible d’envoyer le fichier'));
            }
        } catch (err: any) {
            console.error('Error uploading variant image:', err);
            toast.error('Erreur lors de l\'envoi de l\'image');
        } finally {
            setUploadingVariantKey(null);
        }
    };

    // Step 3: Submit Offers Bundle
    const handleSubmitAllOffers = async (e: React.FormEvent) => {
        e.preventDefault();

        const activeRows = generatedVariants.filter(v => v.enabled);
        if (activeRows.length === 0) {
            toast.error('Veuillez activer au moins une combinaison pour votre offre.');
            return;
        }

        // Validate prices
        for (const row of activeRows) {
            if (!row.price || row.price <= 0) {
                toast.error(`Prix invalide pour la variante: ${row.name}`);
                return;
            }
            if (row.onPromotion && (!row.promotionalPrice || row.promotionalPrice >= row.price)) {
                toast.error(`Le prix promotionnel doit être inférieur au prix normal pour: ${row.name}`);
                return;
            }
        }

        setIsSubmittingOffers(true);
        try {
            // Prepare option groups payload
            const groupsToCreate = selectedGroupIds.map(gId => {
                const globalGroup = globalOptionGroups.find(g => String(g.id) === String(gId) || g.code === gId);
                const prodGroup = productDetails?.optionGroups?.find((g: any) => String(g.id) === String(gId) || g.code === gId);
                const gName = globalGroup?.name || prodGroup?.name || gId;
                const vals = groupValuesMap[gId] || [];
                return {
                    name: gName,
                    code: globalGroup?.code || prodGroup?.code || gName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                    options: vals.map(v => ({ name: v, code: v.toLowerCase().replace(/[^a-z0-9]+/g, '-') })),
                };
            }).filter(g => g.options.length > 0);

            // Add custom groups
            for (const cg of customGroups) {
                if (cg.name.trim() && (groupValuesMap[cg.id] || []).length > 0) {
                    groupsToCreate.push({
                        name: cg.name.trim(),
                        code: cg.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                        options: (groupValuesMap[cg.id] || []).map(v => ({ name: v, code: v.toLowerCase().replace(/[^a-z0-9]+/g, '-') })),
                    });
                }
            }

            // Prepare offers payload
            const offersPayload = activeRows.map(row => ({
                name: row.name,
                optionNames: row.optionValues.map(o => o.optName),
                optionCodes: row.optionValues.map(o => o.optName.toLowerCase().replace(/[^a-z0-9]+/g, '-')),
                sku: row.sku || undefined,
                price: priceToSubunit(row.price),
                stock: row.stock,
                onPromotion: row.onPromotion,
                promotionalPrice: row.onPromotion ? priceToSubunit(row.promotionalPrice) : undefined,
                featuredAssetId: row.featuredAssetId || undefined,
                deliveryTimeValue: row.deliveryTimeValue || 2,
                deliveryTimeUnit: (row.deliveryTimeUnit === 'HOURS' || row.deliveryTimeUnit === 'h') ? 'HOURS' : 'DAYS',
                condition: row.condition || 'NEW',
            }));

            const result = await tagProductWithVariantOffersAction({
                productId: productDetails.id,
                optionGroups: groupsToCreate.length > 0 ? groupsToCreate : undefined,
                offers: offersPayload,
            });

            if (!result.success) {
                throw new Error(result.error || 'Erreur lors du greffage des offres');
            }

            toast.success(`Vos ${offersPayload.length} offre(s) ont été greffées au produit avec succès !`);
            router.push('/dashboard/products');
            router.refresh();
        } catch (err: any) {
            console.error('[AffiliatePage] Submission failed:', err);
            toast.error('Erreur lors de la soumission de vos offres: ' + err.message);
        } finally {
            setIsSubmittingOffers(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-24 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/products" className="p-2.5 rounded-xl border border-border bg-card hover:bg-muted text-muted-foreground transition-all cursor-pointer">
                        <ArrowLeft className="w-4 h-4" />
                    </Link>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-serif font-black tracking-tight text-foreground">
                            S'affilier à un Produit (Greffage d'Offres)
                        </h1>
                        <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest mt-0.5">
                            Sélectionnez un article du catalogue Ahizan, configurez vos déclinaisons et publiez vos offres commerciales.
                        </p>
                    </div>
                </div>

                {/* Step Indicators */}
                <div className="flex items-center gap-2 bg-muted/40 p-1.5 rounded-2xl border border-border">
                    <span className={cn("px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all", step === 1 ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground")}>
                        1. Recherche
                    </span>
                    <span className="text-muted-foreground/40 text-xs">➔</span>
                    <span className={cn("px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all", step === 2 ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground")}>
                        2. Déclinaisons &amp; Options
                    </span>
                    <span className="text-muted-foreground/40 text-xs">➔</span>
                    <span className={cn("px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all", step === 3 ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground")}>
                        3. Grille des Tarifs
                    </span>
                </div>
            </div>

            {/* ── STEP 1: CATALOG SEARCH & PRODUCT SELECTION ── */}
            {step === 1 && (
                <div className="bg-card p-6 sm:p-8 rounded-3xl border border-border shadow-sm space-y-6 animate-in slide-in-from-bottom-4 duration-300">
                    <div>
                        <h2 className="text-lg font-black text-foreground">Rechercher le produit à vendre</h2>
                        <p className="text-xs text-muted-foreground mt-0.5">Saisissez le nom du modèle, la marque ou la référence dans le catalogue marketplace.</p>
                    </div>

                    <form onSubmit={handleSearch} className="flex gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                            <Input
                                type="text"
                                placeholder="Ex: iPhone 15 Pro, T-shirt Coton, Robe Africaine, Samsung Galaxy..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="pl-12 h-13 rounded-2xl bg-muted/20 border-border focus-visible:ring-2 focus-visible:ring-primary/20 text-sm font-semibold"
                            />
                        </div>
                        <Button
                            type="submit"
                            disabled={isSearching}
                            className="h-13 px-8 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs uppercase tracking-widest transition-all cursor-pointer shadow-md"
                        >
                            {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Rechercher'}
                        </Button>
                    </form>

                    {/* Results List */}
                    {isSearching ? (
                        <div className="flex flex-col items-center justify-center py-16 space-y-3 text-muted-foreground">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            <p className="text-xs font-bold uppercase tracking-widest">Recherche dans le catalogue Ahizan...</p>
                        </div>
                    ) : searchResults.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                            {searchResults.map(prod => (
                                <div
                                    key={prod.id}
                                    className="p-4 rounded-2xl border border-border bg-card hover:border-primary/50 hover:shadow-md transition-all flex items-center justify-between gap-4 group"
                                >
                                    <div className="flex items-center gap-3.5 min-w-0">
                                        <div className="w-16 h-16 rounded-xl bg-muted/50 border border-border overflow-hidden flex-shrink-0 flex items-center justify-center">
                                            {prod.preview ? (
                                                <img src={prod.preview} alt={prod.name} className="object-cover w-full h-full group-hover:scale-105 transition-transform" />
                                            ) : (
                                                <Package className="w-6 h-6 text-muted-foreground" />
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="font-bold text-foreground text-sm truncate" title={prod.name}>
                                                {prod.name}
                                            </h3>
                                            <p className="text-xs text-muted-foreground font-medium mt-0.5">
                                                {prod.variants?.length || 1} déclinaison(s) répertoriée(s)
                                            </p>
                                        </div>
                                    </div>
                                    <Button
                                        onClick={() => handleSelectProduct(prod)}
                                        className="h-10 px-5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs shrink-0 cursor-pointer shadow-sm"
                                    >
                                        Choisir
                                    </Button>
                                </div>
                            ))}
                        </div>
                    ) : null}
                </div>
            )}

            {/* ── STEP 2: OPTION GROUPS & VARIANT COMBINATIONS CONFIGURATOR ── */}
            {step === 2 && (
                isLoadingDetails ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-card rounded-3xl border border-border space-y-4">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                            Chargement des spécifications et options du produit...
                        </p>
                    </div>
                ) : (
                <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300">
                    {/* Chosen Product Summary Card */}
                    <div className="bg-card p-5 rounded-2xl border border-border flex items-center justify-between gap-4 shadow-sm">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-xl bg-muted/50 border border-border overflow-hidden flex-shrink-0 flex items-center justify-center">
                                {productDetails?.featuredAsset?.preview || selectedProductSummary?.preview ? (
                                    <img src={productDetails?.featuredAsset?.preview || selectedProductSummary?.preview} alt="" className="object-cover w-full h-full" />
                                ) : (
                                    <Package className="w-6 h-6 text-muted-foreground" />
                                )}
                            </div>
                            <div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-primary">Produit Central Sélectionné</span>
                                <h2 className="text-base font-bold text-foreground">{productDetails?.name || selectedProductSummary?.name}</h2>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Catégorie : {productDetails?.collections?.[0]?.name || 'Catalogue Ahizan'}
                                </p>
                            </div>
                        </div>
                        <Button
                            variant="outline"
                            onClick={() => setStep(1)}
                            className="rounded-xl text-xs font-bold cursor-pointer"
                        >
                            Changer de produit
                        </Button>
                    </div>

                    {/* Option Groups Selector */}
                    <div className="bg-card p-6 sm:p-8 rounded-3xl border border-border shadow-sm space-y-6">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-border pb-4">
                            <div>
                                <h3 className="text-base font-black text-foreground flex items-center gap-2">
                                    <SlidersHorizontal className="w-5 h-5 text-primary" />
                                    Groupes d'options &amp; Attributs de déclinaison
                                </h3>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Cochez les groupes d'options (ex: Couleur, Taille) et sélectionnez ou ajoutez les valeurs que vous possédez en stock.
                                </p>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleAddCustomGroup}
                                className="rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1.5"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                Ajouter un groupe personnalisé
                            </Button>
                        </div>

                        {/* Available Platform Option Groups */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {displayOptionGroups.map(group => {
                                const isSelected = selectedGroupIds.includes(group.id) || selectedGroupIds.includes(group.code);
                                const selectedValues = groupValuesMap[group.id] || groupValuesMap[group.code] || [];

                                return (
                                    <div
                                        key={group.id}
                                        className={cn(
                                            "p-5 rounded-2xl border transition-all space-y-4",
                                            isSelected ? "border-primary bg-primary/5 shadow-sm" : "border-border bg-muted/10 hover:border-border/80"
                                        )}
                                    >
                                        <div className="flex items-center justify-between">
                                            <label className="flex items-center gap-3 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => toggleOptionGroup(group.id)}
                                                    className="w-4 h-4 rounded text-primary focus:ring-primary/20 cursor-pointer"
                                                />
                                                <span className="font-bold text-sm text-foreground">{group.name}</span>
                                            </label>
                                            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                                                {selectedValues.length} valeur(s)
                                            </span>
                                        </div>

                                        {/* Value Pills & Custom Adder (if group selected) */}
                                        {isSelected && (
                                            <div className="space-y-3 pt-2 border-t border-border/50 animate-in fade-in duration-200">
                                                <div className="flex flex-wrap gap-1.5">
                                                    {group.options?.map(opt => {
                                                        const isValueChecked = selectedValues.includes(opt.name);
                                                        return (
                                                            <button
                                                                key={opt.id}
                                                                type="button"
                                                                onClick={() => isValueChecked ? handleRemoveValueFromGroup(group.id, opt.name) : handleAddValueToGroup(group.id, opt.name)}
                                                                className={cn(
                                                                    "px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1",
                                                                    isValueChecked
                                                                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                                                        : "bg-card text-muted-foreground border-border hover:bg-muted"
                                                                )}
                                                            >
                                                                {opt.name}
                                                                {isValueChecked && <Check className="w-3 h-3 ml-0.5" />}
                                                            </button>
                                                        );
                                                    })}
                                                </div>

                                                {/* Add New Custom Value */}
                                                <div className="flex gap-2">
                                                    <Input
                                                        type="text"
                                                        placeholder={`Ajouter une valeur (ex: Jaune, 42)...`}
                                                        value={newCustomValueInput[group.id] || ''}
                                                        onChange={e => setNewCustomValueInput({ ...newCustomValueInput, [group.id]: e.target.value })}
                                                        onKeyDown={e => {
                                                            if (e.key === 'Enter') {
                                                                e.preventDefault();
                                                                handleAddValueToGroup(group.id);
                                                            }
                                                        }}
                                                        className="h-9 rounded-xl text-xs bg-card"
                                                    />
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        onClick={() => handleAddValueToGroup(group.id)}
                                                        className="h-9 px-3 rounded-xl text-xs font-bold cursor-pointer"
                                                    >
                                                        Ajouter
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Custom Option Groups Added by Seller */}
                        {customGroups.length > 0 && (
                            <div className="space-y-4 pt-4 border-t border-border">
                                <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Groupes Personnalisés</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {customGroups.map(cg => {
                                        const vals = groupValuesMap[cg.id] || [];
                                        return (
                                            <div key={cg.id} className="p-5 rounded-2xl border border-primary/40 bg-card space-y-4 shadow-sm">
                                                <div className="flex items-center justify-between gap-2">
                                                    <Input
                                                        type="text"
                                                        placeholder="Nom du groupe (ex: Matière, Capacité)..."
                                                        value={cg.name}
                                                        onChange={e => {
                                                            const newName = e.target.value;
                                                            setCustomGroups(prev => prev.map(g => g.id === cg.id ? { ...g, name: newName } : g));
                                                        }}
                                                        className="h-9 rounded-xl font-bold text-sm bg-muted/20"
                                                    />
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleRemoveCustomGroup(cg.id)}
                                                        className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>

                                                <div className="flex flex-wrap gap-1.5">
                                                    {vals.map(v => (
                                                        <span key={v} className="px-3 py-1 rounded-xl text-xs font-semibold bg-primary/10 text-primary border border-primary/20 flex items-center gap-1">
                                                            {v}
                                                            <button type="button" onClick={() => handleRemoveValueFromGroup(cg.id, v)} className="hover:text-red-600">
                                                                <X className="w-3 h-3" />
                                                            </button>
                                                        </span>
                                                    ))}
                                                </div>

                                                <div className="flex gap-2">
                                                    <Input
                                                        type="text"
                                                        placeholder="Ajouter une valeur..."
                                                        value={newCustomValueInput[cg.id] || ''}
                                                        onChange={e => setNewCustomValueInput({ ...newCustomValueInput, [cg.id]: e.target.value })}
                                                        onKeyDown={e => {
                                                            if (e.key === 'Enter') {
                                                                e.preventDefault();
                                                                handleAddValueToGroup(cg.id);
                                                            }
                                                        }}
                                                        className="h-9 rounded-xl text-xs bg-card"
                                                    />
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        onClick={() => handleAddValueToGroup(cg.id)}
                                                        className="h-9 px-3 rounded-xl text-xs font-bold cursor-pointer"
                                                    >
                                                        +
                                                    </Button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Action: Generate Variants */}
                        <div className="pt-6 border-t border-border flex justify-end">
                            <Button
                                onClick={handleGenerateCombinations}
                                className="h-12 px-8 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs uppercase tracking-widest shadow-lg shadow-primary/20 flex items-center gap-2 cursor-pointer transition-all active:scale-95"
                            >
                                <Sparkles className="w-4 h-4" />
                                Générer les combinaisons (Variantes)
                            </Button>
                        </div>
                    </div>
                </div>
                )
            )}

            {/* ── STEP 3: INTERACTIVE COMBINATIONS & OFFERS GRID ── */}
            {step === 3 && (
                <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300">
                    {/* Quick Configuration Toolbar */}
                    <div className="bg-card p-6 rounded-3xl border border-border shadow-sm space-y-4">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div>
                                <h3 className="text-base font-black text-foreground">Remplissage Rapide des Tarifs &amp; Stocks</h3>
                                <p className="text-xs text-muted-foreground mt-0.5">Appliquez un prix et une quantité par défaut à toutes les combinaisons actives.</p>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setStep(2)}
                                className="rounded-xl text-xs font-bold cursor-pointer"
                            >
                                Modifier les options
                            </Button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2">
                            <div>
                                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Prix Vendeur (FCFA)</Label>
                                <Input
                                    type="number"
                                    min="1"
                                    placeholder="Ex: 15000"
                                    value={bulkPrice}
                                    onChange={e => setBulkPrice(e.target.value)}
                                    className="h-11 rounded-xl mt-1 font-bold"
                                />
                            </div>
                            <div>
                                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Stock Disponible</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    placeholder="Ex: 5"
                                    value={bulkStock}
                                    onChange={e => setBulkStock(e.target.value)}
                                    className="h-11 rounded-xl mt-1 font-bold"
                                />
                            </div>
                            <div>
                                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">État de l'Article</Label>
                                <Select value={bulkCondition} onValueChange={setBulkCondition}>
                                    <SelectTrigger className="h-11 rounded-xl mt-1 font-bold">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="NEW">Neuf</SelectItem>
                                        <SelectItem value="USED">Occasion</SelectItem>
                                        <SelectItem value="REFURBISHED">Reconditionné</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex items-end">
                                <Button
                                    type="button"
                                    onClick={handleApplyBulkSettings}
                                    className="w-full h-11 rounded-xl bg-secondary text-secondary-foreground font-bold text-xs uppercase tracking-wider cursor-pointer"
                                >
                                    Appliquer à tous
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Generated Variants Grid Form */}
                    <form onSubmit={handleSubmitAllOffers} className="space-y-4">
                        <div className="grid grid-cols-1 gap-4">
                            {generatedVariants.map((row, idx) => (
                                <div
                                    key={row.key}
                                    className={cn(
                                        "p-5 rounded-3xl border transition-all space-y-4 shadow-sm",
                                        row.enabled ? "bg-card border-border hover:border-primary/40" : "bg-muted/20 border-border/50 opacity-60"
                                    )}
                                >
                                    {/* Admin Correction Notice if available */}
                                    {row.rejectionReason && (
                                        <div className="bg-amber-500/15 border border-amber-500/30 text-amber-900 dark:text-amber-200 p-3.5 rounded-2xl flex items-start gap-2.5 text-xs font-medium animate-in fade-in">
                                            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                                            <div className="space-y-0.5">
                                                <span className="font-bold uppercase tracking-wider text-[10px] text-amber-700 dark:text-amber-400 block">
                                                    Demande de correction de l'administrateur :
                                                </span>
                                                <p className="text-xs leading-relaxed">{row.rejectionReason}</p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Row Top Bar: Toggle, Title, Options Pills */}
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                        <div className="flex items-center gap-3">
                                            <Switch
                                                checked={row.enabled}
                                                onCheckedChange={checked => handleUpdateVariantRow(row.key, 'enabled', checked)}
                                            />
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-black text-sm text-foreground">
                                                        #{idx + 1} • {row.name}
                                                    </span>
                                                    {!row.enabled && (
                                                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                                                            Désactivé
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex flex-wrap gap-1.5 mt-1">
                                                    {row.optionValues.map(ov => (
                                                        <span key={ov.groupName} className="text-[10px] font-bold bg-primary/10 text-primary px-2.5 py-0.5 rounded-lg border border-primary/20">
                                                            {ov.groupName}: <strong>{ov.optName}</strong>
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Row Fields (when enabled) */}
                                    {row.enabled && (
                                        <div className="space-y-4 pt-3 border-t border-border/60">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                                                {/* Custom Photo for this variant */}
                                                <div className="flex flex-col justify-between">
                                                    <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">
                                                        Photo Variante
                                                    </Label>
                                                    <div className="flex items-center gap-2">
                                                        <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-muted border border-border shrink-0 flex items-center justify-center">
                                                            {row.assetPreview ? (
                                                                <img src={row.assetPreview} alt={row.name} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <ImageIcon className="w-4 h-4 text-muted-foreground" />
                                                            )}
                                                            {uploadingVariantKey === row.key && (
                                                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                                                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <label className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg bg-muted/60 hover:bg-muted text-[10px] font-bold text-foreground border border-border/80 cursor-pointer transition-colors">
                                                            <Camera className="w-3 h-3 text-primary" />
                                                            <span>{row.featuredAssetId ? 'Changer' : 'Ajouter'}</span>
                                                            <input
                                                                type="file"
                                                                accept="image/*"
                                                                className="hidden"
                                                                disabled={uploadingVariantKey === row.key}
                                                                onChange={e => {
                                                                    const f = e.target.files?.[0];
                                                                    if (f) handleUploadVariantImage(row.key, f);
                                                                }}
                                                            />
                                                        </label>
                                                    </div>
                                                </div>

                                                {/* Price */}
                                                <div>
                                                    <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                                        Prix Normal (FCFA) *
                                                    </Label>
                                                    <Input
                                                        type="number"
                                                        min="1"
                                                        required
                                                        value={row.price || ''}
                                                        onChange={e => handleUpdateVariantRow(row.key, 'price', Number(e.target.value))}
                                                        className="h-10 rounded-xl font-black text-sm bg-muted/10 mt-1"
                                                        placeholder="15000"
                                                    />
                                                </div>

                                                {/* Stock */}
                                                <div>
                                                    <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                                        Stock *
                                                    </Label>
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        required
                                                        value={row.stock}
                                                        onChange={e => handleUpdateVariantRow(row.key, 'stock', Number(e.target.value))}
                                                        className="h-10 rounded-xl font-bold text-sm bg-muted/10 mt-1"
                                                    />
                                                </div>

                                                {/* SKU */}
                                                <div>
                                                    <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                                        SKU Vendeur
                                                    </Label>
                                                    <Input
                                                        type="text"
                                                        value={row.sku}
                                                        onChange={e => handleUpdateVariantRow(row.key, 'sku', e.target.value)}
                                                        className="h-10 rounded-xl font-mono text-xs bg-muted/10 mt-1"
                                                        placeholder="SKU-OFFER"
                                                    />
                                                </div>
                                            </div>

                                            {/* Condition & Prominent Promotion System */}
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                                                {/* Condition */}
                                                <div>
                                                    <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                                        État du Produit
                                                    </Label>
                                                    <Select
                                                        value={row.condition}
                                                        onValueChange={val => handleUpdateVariantRow(row.key, 'condition', val)}
                                                    >
                                                        <SelectTrigger className="h-11 rounded-xl font-bold text-xs mt-1">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="NEW">Neuf</SelectItem>
                                                            <SelectItem value="USED">Occasion</SelectItem>
                                                            <SelectItem value="REFURBISHED">Reconditionné</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                {/* Prominent Promotion Activation Box */}
                                                <div className={cn(
                                                    "col-span-1 md:col-span-2 p-3.5 rounded-2xl border transition-all flex flex-col justify-between gap-2.5",
                                                    row.onPromotion 
                                                        ? "bg-rose-500/5 border-rose-500/30 shadow-xs" 
                                                        : "bg-muted/30 border-border/70"
                                                )}>
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <div className={cn(
                                                                "w-7 h-7 rounded-lg flex items-center justify-center",
                                                                row.onPromotion ? "bg-rose-500 text-white" : "bg-muted text-muted-foreground"
                                                            )}>
                                                                <Percent className="w-4 h-4" />
                                                            </div>
                                                            <div>
                                                                <Label className="text-xs font-bold cursor-pointer text-foreground block">
                                                                    Activer une promotion
                                                                </Label>
                                                                <span className="text-[10px] text-muted-foreground">
                                                                    Appliquer un prix réduit et attirer plus de clients
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <Switch
                                                            checked={row.onPromotion}
                                                            onCheckedChange={checked => handleUpdateVariantRow(row.key, 'onPromotion', checked)}
                                                        />
                                                    </div>

                                                    {row.onPromotion ? (
                                                        <div className="space-y-2 pt-1 animate-in fade-in duration-200">
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-center">
                                                                <div>
                                                                    <Label className="text-[10px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider">
                                                                        Prix Soldé (FCFA) *
                                                                    </Label>
                                                                    <Input
                                                                        type="number"
                                                                        min="1"
                                                                        required
                                                                        placeholder="Ex: 12000"
                                                                        value={row.promotionalPrice || ''}
                                                                        onChange={e => handleUpdateVariantRow(row.key, 'promotionalPrice', Number(e.target.value))}
                                                                        className="h-10 rounded-xl font-black text-sm text-rose-600 bg-background border-rose-200 dark:border-rose-900/50 mt-1"
                                                                    />
                                                                </div>
                                                                {row.price && row.promotionalPrice && row.promotionalPrice < row.price ? (
                                                                    <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 space-y-0.5">
                                                                        <div className="text-[11px] font-black flex items-center justify-between">
                                                                            <span>Remise : -{Math.round(((row.price - row.promotionalPrice) / row.price) * 100)}%</span>
                                                                            <span className="line-through text-muted-foreground text-[10px]">{row.price.toLocaleString('fr-FR')} F</span>
                                                                        </div>
                                                                        <p className="text-[10px] font-semibold text-rose-600 dark:text-rose-400">
                                                                            Économie : {(row.price - row.promotionalPrice).toLocaleString('fr-FR')} FCFA
                                                                        </p>
                                                                    </div>
                                                                ) : (
                                                                    <p className="text-[10px] text-muted-foreground italic">
                                                                        Indiquez un montant inférieur au prix normal ({row.price || 0} FCFA).
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <p className="text-[10px] text-muted-foreground italic">
                                                            Aucune promotion active. Le produit sera vendu au prix standard de {row.price ? `${row.price.toLocaleString('fr-FR')} FCFA` : '—'}.
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Submit Action */}
                        <div className="pt-6 flex justify-between items-center bg-card p-6 rounded-3xl border border-border shadow-sm">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setStep(2)}
                                className="h-12 px-6 rounded-2xl text-xs font-bold uppercase tracking-wider cursor-pointer"
                            >
                                Retour aux options
                            </Button>

                            <Button
                                type="submit"
                                disabled={isSubmittingOffers}
                                className="h-13 px-10 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs uppercase tracking-widest shadow-lg shadow-primary/25 flex items-center gap-2 cursor-pointer transition-all active:scale-95"
                            >
                                {isSubmittingOffers ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <CheckCircle2 className="w-5 h-5" />
                                )}
                                Confirmer et Greffer mes Offres
                            </Button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}

export default function AffiliateProductPage(props: AffiliateProductPageProps) {
    return (
        <Suspense fallback={
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Chargement du module d'affiliation...</p>
            </div>
        }>
            <AffiliateProductPageContent {...props} />
        </Suspense>
    );
}
