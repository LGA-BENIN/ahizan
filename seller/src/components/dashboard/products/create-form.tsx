'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import ImageUploader, { type UploadedAsset } from '@/components/ImageUploader';
import ImageCropModal from '@/components/ImageCropModal';
import { createProductAction, uploadFileAction } from '@/app/dashboard/products/actions';
import { query } from '@/lib/vendure/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
    CheckCircle2,
    Tag,
    Coins,
    Loader2,
    ArrowLeft,
    ArrowRight,
    Plus,
    Sparkles,
    ChevronDown,
    ChevronUp,
    Package,
    SlidersHorizontal,
    Camera,
    Layers,
    ImageIcon,
    Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import CategoryCheckboxTree from './category-checkbox-tree';

interface CreateProductFormProps {
    collectionTree: any[];
    onSuccess?: () => void;
    onSwitchToGraft?: (searchTerm: string) => void;
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
    featuredAssetPreview?: string | null;
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

export default function CreateProductForm({ 
    collectionTree, 
    onSuccess, 
    onSwitchToGraft,
    className 
}: CreateProductFormProps) {
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

    // Form data
    const [formData, setFormData] = useState({
        name: '',
        shortDescription: '',
        price: 0,
        stock: 5,
        sku: '',
        weight: '',
        width: '',
        height: '',
        enabled: true,
        onPromotion: false,
        promotionalPrice: 0,
        deliveryTimeValue: 2,
        deliveryTimeUnit: 'd',
        condition: 'NEW',
    });

    const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
    const [assets, setAssets] = useState<UploadedAsset[]>([]);
    const [featuredAssetId, setFeaturedAssetId] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

    // Live catalog suggestion state (while typing product name)
    const [liveSuggestions, setLiveSuggestions] = useState<any[]>([]);
    const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false);

    // Options and Variants (Step 2 & 3)
    const [hasMultipleVariants, setHasMultipleVariants] = useState(false);
    const [globalOptionGroups, setGlobalOptionGroups] = useState<any[]>([]);
    const [selectedStandardGroups, setSelectedStandardGroups] = useState<string[]>([]);
    const [groupValuesMap, setGroupValuesMap] = useState<{ [key: string]: string[] }>({});
    const [newOptionValue, setNewOptionValue] = useState<{ [key: string]: string }>({});

    // Variant rows (Step 3)
    const [variants, setVariants] = useState<VariantRow[]>([
        { id: '1', name: 'Standard', sku: '', price: 0, stock: 5, onPromotion: false, promotionalPrice: 0, enabled: true, featuredAssetId: null }
    ]);

    // State for crop modal for variant images
    const [variantCropModalOpen, setVariantCropModalOpen] = useState(false);
    const [variantCropSrc, setVariantCropSrc] = useState<string>('');
    const [variantCropIndex, setVariantCropIndex] = useState<number | null>(null);
    const [variantCropFileName, setVariantCropFileName] = useState<string>('variant.jpg');
    const [isUploadingVariantImage, setIsUploadingVariantImage] = useState<number | null>(null);
    const variantFileInputRef = useRef<HTMLInputElement>(null);

    const handleSelectVariantImage = (index: number) => {
        setVariantCropIndex(index);
        if (variantFileInputRef.current) {
            variantFileInputRef.current.click();
        }
    };

    const handleVariantFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setVariantCropFileName(file.name);
        const reader = new FileReader();
        reader.onload = () => {
            setVariantCropSrc(reader.result as string);
            setVariantCropModalOpen(true);
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    const handleVariantCropComplete = async (croppedBlob: Blob) => {
        if (variantCropIndex === null) return;
        const targetIndex = variantCropIndex;
        setVariantCropModalOpen(false);
        setIsUploadingVariantImage(targetIndex);
        try {
            const file = new File([croppedBlob], variantCropFileName, { type: 'image/jpeg' });
            const formData = new FormData();
            formData.append('file', file);
            const res = await uploadFileAction(formData);
            if (res.success && res.asset) {
                setVariants(prev => prev.map((v, i) => i === targetIndex ? {
                    ...v,
                    featuredAssetId: res.asset.id,
                    featuredAssetPreview: res.asset.preview
                } : v));
                toast.success("Image de la déclinaison enregistrée");
            } else {
                toast.error(res.error || "Erreur lors du téléversement");
            }
        } catch (err) {
            toast.error("Échec du téléversement de l'image");
        } finally {
            setIsUploadingVariantImage(null);
            setVariantCropIndex(null);
        }
    };

    // Fetch global option groups from backend on mount
    useEffect(() => {
        const fetchGroups = async () => {
            try {
                const res = await query(GET_GLOBAL_OPTION_GROUPS_QUERY, {});
                setGlobalOptionGroups(res.data?.getGlobalOptionGroups || []);
            } catch (err) {
                console.error('[CreateProductForm] Failed to fetch option groups:', err);
            }
        };
        fetchGroups();
    }, []);

    // Live duplicate check when typing product name
    useEffect(() => {
        const term = formData.name.trim();
        if (term.length < 3) {
            setLiveSuggestions([]);
            return;
        }

        const timer = setTimeout(async () => {
            setIsCheckingDuplicates(true);
            try {
                const res = await query(SEARCH_OFFICIAL_PRODUCTS_QUERY, { term, take: 3 });
                setLiveSuggestions(res.data?.searchOfficialProducts?.items || []);
            } catch {
                setLiveSuggestions([]);
            } finally {
                setIsCheckingDuplicates(false);
            }
        }, 400);

        return () => clearTimeout(timer);
    }, [formData.name]);

    // Handle standard option group selection
    const handleToggleStandardGroup = (groupId: string) => {
        setSelectedStandardGroups(prev => {
            if (prev.includes(groupId)) {
                const next = prev.filter(id => id !== groupId);
                const nextValues = { ...groupValuesMap };
                delete nextValues[groupId];
                setGroupValuesMap(nextValues);
                return next;
            } else {
                return [...prev, groupId];
            }
        });
    };

    const handleToggleOptionValue = (groupId: string, value: string) => {
        setGroupValuesMap(prev => {
            const current = prev[groupId] || [];
            const exists = current.includes(value);
            return {
                ...prev,
                [groupId]: exists ? current.filter(v => v !== value) : [...current, value]
            };
        });
    };

    const handleAddCustomValueToGroup = (groupId: string) => {
        const val = (newOptionValue[groupId] || '').trim();
        if (!val) return;
        setGroupValuesMap(prev => ({
            ...prev,
            [groupId]: [...(prev[groupId] || []), val]
        }));
        setNewOptionValue(prev => ({ ...prev, [groupId]: '' }));
    };

    // Auto-generate variants from selected options
    useEffect(() => {
        if (!hasMultipleVariants) {
            setVariants(prev => {
                const standard = prev[0] || { id: '1', name: 'Standard', sku: '', price: 0, stock: 5, onPromotion: false, promotionalPrice: 0, enabled: true, featuredAssetId: null };
                return [{ ...standard, name: 'Standard' }];
            });
            return;
        }

        const activeGroupEntries = selectedStandardGroups
            .map(groupId => {
                const group = globalOptionGroups.find(g => g.id === groupId);
                return {
                    name: group?.name || 'Option',
                    values: groupValuesMap[groupId] || []
                };
            })
            .filter(g => g.values.length > 0);

        if (activeGroupEntries.length === 0) {
            setVariants([{ id: '1', name: 'Standard', sku: '', price: formData.price || 0, stock: formData.stock || 5, onPromotion: formData.onPromotion, promotionalPrice: formData.promotionalPrice || 0, enabled: true, featuredAssetId: null }]);
            return;
        }

        const cartesian = (arrays: string[][]): string[][] => {
            return arrays.reduce((acc, curr) => {
                return acc.flatMap(a => curr.map(c => [...a, c]));
            }, [[]] as string[][]);
        };

        const combinations = cartesian(activeGroupEntries.map(g => g.values));

        const newVariants: VariantRow[] = combinations.map((comb, index) => {
            const variantName = comb.join(' - ');
            const existing = variants.find(v => v.name === variantName);
            return {
                id: existing ? existing.id : `generated-${index}-${Date.now()}`,
                name: variantName,
                sku: existing?.sku || '',
                price: existing ? existing.price : (formData.price || 0),
                stock: existing ? existing.stock : (formData.stock || 5),
                onPromotion: existing ? existing.onPromotion : formData.onPromotion,
                promotionalPrice: existing ? existing.promotionalPrice : (formData.promotionalPrice || 0),
                enabled: existing ? existing.enabled : true,
                featuredAssetId: existing ? existing.featuredAssetId : (assets[0]?.id || null)
            };
        });

        setVariants(newVariants);
    }, [hasMultipleVariants, selectedStandardGroups, groupValuesMap]);

    // Validation per step
    const handleNextStep = () => {
        if (currentStep === 1) {
            if (assets.length === 0) {
                toast.error("Veuillez ajouter au moins une photo de votre article.");
                return;
            }
            setCurrentStep(2);
        } else if (currentStep === 2) {
            if (!formData.name.trim()) {
                toast.error("Veuillez renseigner le nom de l'article.");
                return;
            }
            if (selectedCategoryIds.length === 0) {
                toast.error("Veuillez sélectionner au moins une catégorie.");
                return;
            }
            setCurrentStep(3);
        }
    };

    // Final Submission to Super Admin for approval
    const handleSubmit = async () => {
        if (variants.length === 0) {
            toast.error("Veuillez configurer au moins une déclinaison.");
            return;
        }

        // Validate prices & stocks
        for (const v of variants) {
            if (!v.price || v.price <= 0) {
                toast.error(`Veuillez renseigner un prix valide pour la déclinaison "${v.name}".`);
                return;
            }
        }

        setIsSubmitting(true);
        try {
            const submitFormData = new FormData();
            submitFormData.append('name', formData.name.trim());
            submitFormData.append('description', formData.shortDescription.trim() || formData.name.trim());
            submitFormData.append('shortDescription', formData.shortDescription.trim() || formData.name.trim());
            submitFormData.append('price', variants[0].price.toString());
            submitFormData.append('stock', variants[0].stock.toString());
            submitFormData.append('sku', formData.sku.trim());
            submitFormData.append('category', JSON.stringify(selectedCategoryIds));
            submitFormData.append('assetIds', JSON.stringify(assets.map(a => a.id)));
            submitFormData.append('featuredAssetId', featuredAssetId || assets[0]?.id || '');
            submitFormData.append('enabled', 'true');
            submitFormData.append('onPromotion', variants[0].onPromotion ? 'true' : 'false');
            submitFormData.append('promotionalPrice', (variants[0].promotionalPrice || 0).toString());
            submitFormData.append('deliveryTimeValue', formData.deliveryTimeValue.toString());
            submitFormData.append('deliveryTimeUnit', formData.deliveryTimeUnit);
            submitFormData.append('condition', formData.condition);

            if (formData.weight) submitFormData.append('weight', formData.weight);
            if (formData.width) submitFormData.append('width', formData.width);
            if (formData.height) submitFormData.append('height', formData.height);

            // Pass variants
            submitFormData.append('variants', JSON.stringify(variants));

            const res = await createProductAction(null, submitFormData);

            if (res.success) {
                toast.success("Votre article a été envoyé pour validation au Super Admin !");
                if (onSuccess) {
                    onSuccess();
                } else {
                    router.push('/dashboard/products');
                }
            } else {
                toast.error(res.error || "Une erreur est survenue lors de l'enregistrement.");
            }
        } catch (e: any) {
            toast.error(e.message || "Erreur de connexion.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className={cn("max-w-4xl mx-auto space-y-6", className)}>
            
            {/* Step Indicators Header */}
            <div className="bg-card rounded-2xl border border-border p-4 shadow-sm">
                <div className="flex items-center justify-between">
                    {[
                        { num: 1, title: "1. Photos", icon: Camera },
                        { num: 2, title: "2. Identité & Catégorie", icon: Tag },
                        { num: 3, title: "3. Prix & Stocks", icon: Coins },
                    ].map((st, i) => {
                        const Icon = st.icon;
                        const isActive = currentStep === st.num;
                        const isDone = currentStep > st.num;
                        return (
                            <React.Fragment key={st.num}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (isDone) setCurrentStep(st.num as any);
                                    }}
                                    disabled={!isDone && !isActive}
                                    className={cn(
                                        "flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all font-bold text-xs sm:text-sm",
                                        isActive && "bg-primary text-primary-foreground shadow-sm",
                                        isDone && "text-primary hover:bg-primary/10 cursor-pointer",
                                        !isActive && !isDone && "text-muted-foreground opacity-50 cursor-not-allowed"
                                    )}
                                >
                                    <span className={cn(
                                        "w-6 h-6 rounded-full flex items-center justify-center text-xs font-black",
                                        isActive ? "bg-white text-primary" : isDone ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                                    )}>
                                        {isDone ? "✓" : st.num}
                                    </span>
                                    <span className="hidden sm:inline">{st.title}</span>
                                </button>
                                {i < 2 && (
                                    <div className={cn("flex-1 h-0.5 mx-2", isDone ? "bg-primary" : "bg-border")} />
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>
            </div>

            {/* STEP 1: PHOTOS */}
            {currentStep === 1 && (
                <div className="bg-card rounded-2xl border border-border p-5 sm:p-7 shadow-sm space-y-6 animate-in fade-in duration-300">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="p-2 rounded-xl bg-primary/10 text-primary">
                                <Camera className="w-5 h-5" />
                            </span>
                            <h2 className="text-lg sm:text-xl font-bold text-foreground">
                                Photos de votre article
                            </h2>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Prenez des photos claires et nettes de votre article. La première photo servira d'image principale.
                        </p>
                    </div>

                    <div className="pt-2">
                        <ImageUploader
                            assets={assets}
                            featuredAssetId={featuredAssetId}
                            onAssetsChange={setAssets}
                            onFeaturedAssetChange={setFeaturedAssetId}
                            maxAssets={8}
                        />
                    </div>

                    <div className="flex justify-end pt-4 border-t border-border">
                        <Button
                            type="button"
                            onClick={handleNextStep}
                            className="h-11 px-6 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold flex items-center gap-2 uppercase text-xs tracking-wider cursor-pointer"
                        >
                            Suivant : Identité de l'article
                            <ArrowRight className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            )}

            {/* STEP 2: NOM, CATÉGORIE & OPTIONS */}
            {currentStep === 2 && (
                <div className="bg-card rounded-2xl border border-border p-5 sm:p-7 shadow-sm space-y-6 animate-in fade-in duration-300">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="p-2 rounded-xl bg-primary/10 text-primary">
                                <Tag className="w-5 h-5" />
                            </span>
                            <h2 className="text-lg sm:text-xl font-bold text-foreground">
                                Identité & Catégorie
                            </h2>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Indiquez le nom commercial de votre article et sélectionnez sa catégorie dans le catalogue Ahizan.
                        </p>
                    </div>

                    {/* Nom du produit avec détection de doublons en temps réel */}
                    <div className="space-y-2">
                        <Label htmlFor="product-name" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            Nom de l'article <span className="text-destructive">*</span>
                        </Label>
                        <div className="relative">
                            <Input
                                id="product-name"
                                placeholder="Ex: Écouteurs sans fil Tocar AZK-NY02, Robe Ankara en soie..."
                                value={formData.name}
                                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                className="h-12 text-sm sm:text-base font-semibold rounded-xl bg-muted/30 border-border focus-visible:ring-primary/20"
                            />
                            {isCheckingDuplicates && (
                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                                </div>
                            )}
                        </div>

                        {/* Live suggestions of existing catalog items */}
                        {liveSuggestions.length > 0 && (
                            <div className="mt-3 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400">
                                    <Sparkles className="w-4 h-4" />
                                    <span>Cet article existe peut-être déjà dans le catalogue Ahizan :</span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {liveSuggestions.map((item) => (
                                        <div 
                                            key={item.id}
                                            className="flex items-center justify-between gap-2 p-2 rounded-lg bg-card border border-border hover:border-primary/40 transition-colors"
                                        >
                                            <div className="flex items-center gap-2 min-w-0">
                                                {item.featuredAsset?.preview ? (
                                                    <img 
                                                        src={item.featuredAsset.preview} 
                                                        alt={item.name} 
                                                        className="w-10 h-10 object-contain rounded bg-muted/40 p-0.5 shrink-0" 
                                                    />
                                                ) : (
                                                    <Package className="w-8 h-8 text-muted-foreground shrink-0" />
                                                )}
                                                <span className="text-xs font-bold text-foreground truncate" title={item.name}>
                                                    {item.name}
                                                </span>
                                            </div>
                                            <Button
                                                type="button"
                                                size="sm"
                                                onClick={() => {
                                                    if (onSwitchToGraft) {
                                                        onSwitchToGraft(item.name);
                                                    } else {
                                                        router.push(`/dashboard/products/affiliate?term=${encodeURIComponent(item.name)}`);
                                                    }
                                                }}
                                                className="h-8 px-2.5 text-[10px] font-black uppercase rounded-lg bg-primary hover:bg-primary/90 text-white shrink-0 cursor-pointer"
                                            >
                                                Vendre cet article
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Catégories */}
                    <div className="space-y-2 pt-2">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            Catégorie de l'article <span className="text-destructive">*</span>
                        </Label>
                        <div className="border border-border rounded-xl p-3 bg-muted/10 max-h-60 overflow-y-auto">
                            <CategoryCheckboxTree
                                collectionTree={collectionTree}
                                selectedIds={selectedCategoryIds}
                                onChange={setSelectedCategoryIds}
                            />
                        </div>
                    </div>

                    {/* Déclinaisons / Groupes d'options */}
                    <div className="space-y-4 pt-4 border-t border-border">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-muted/20 border border-border">
                            <div className="space-y-0.5">
                                <h3 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
                                    <Layers className="w-4 h-4 text-primary" />
                                    Cet article a-t-il plusieurs variantes ?
                                </h3>
                                <p className="text-xs text-muted-foreground">
                                    Ex: Disponible en différentes couleurs, tailles, pointures ou capacités
                                </p>
                            </div>

                            {/* Intuitive Switch Toggle with NON / OUI labels */}
                            <label className="flex items-center gap-3 cursor-pointer self-start sm:self-auto bg-card px-3.5 py-2 rounded-xl border border-border shadow-xs hover:border-primary/40 transition-all select-none">
                                <span className={cn(
                                    "text-xs font-black uppercase tracking-wider transition-colors",
                                    !hasMultipleVariants ? "text-foreground font-black" : "text-muted-foreground opacity-60"
                                )}>
                                    Non
                                </span>

                                <Switch
                                    checked={hasMultipleVariants}
                                    onCheckedChange={setHasMultipleVariants}
                                    className="data-[state=checked]:bg-primary data-[state=checked]:shadow-[0_0_12px_rgba(239,68,68,0.35)] cursor-pointer"
                                />

                                <span className={cn(
                                    "text-xs font-black uppercase tracking-wider transition-colors",
                                    hasMultipleVariants ? "text-primary font-black" : "text-muted-foreground opacity-60"
                                )}>
                                    Oui
                                </span>
                            </label>
                        </div>

                        {hasMultipleVariants && (
                            <div className="space-y-4 p-4 rounded-xl bg-muted/20 border border-border animate-in fade-in duration-300">
                                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                    Choisissez les caractéristiques :
                                </Label>
                                <div className="flex flex-wrap gap-2">
                                    {globalOptionGroups.map((grp) => {
                                        const isSelected = selectedStandardGroups.includes(grp.id);
                                        return (
                                            <button
                                                key={grp.id}
                                                type="button"
                                                onClick={() => handleToggleStandardGroup(grp.id)}
                                                className={cn(
                                                    "px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer",
                                                    isSelected ? "bg-primary text-primary-foreground border-primary shadow-sm" : "bg-card border-border hover:bg-muted text-foreground"
                                                )}
                                            >
                                                {grp.name} {isSelected && "✓"}
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Options values picker */}
                                {selectedStandardGroups.map((groupId) => {
                                    const grp = globalOptionGroups.find(g => g.id === groupId);
                                    if (!grp) return null;
                                    const selectedValues = groupValuesMap[groupId] || [];
                                    return (
                                        <div key={groupId} className="p-3 rounded-xl bg-card border border-border space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-bold text-foreground uppercase tracking-wider">{grp.name} :</span>
                                                <span className="text-[10px] text-muted-foreground">{selectedValues.length} sélectionnée(s)</span>
                                            </div>
                                            <div className="flex flex-wrap gap-1.5">
                                                {grp.options?.map((opt: any) => {
                                                    const isChecked = selectedValues.includes(opt.name);
                                                    return (
                                                        <button
                                                            key={opt.id}
                                                            type="button"
                                                            onClick={() => handleToggleOptionValue(groupId, opt.name)}
                                                            className={cn(
                                                                "px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer",
                                                                isChecked ? "bg-primary/20 text-primary border-primary font-bold" : "bg-muted/40 border-border text-foreground hover:bg-muted"
                                                            )}
                                                        >
                                                            {opt.name}
                                                        </button>
                                                    );
                                                })}
                                            </div>

                                            {/* Add custom value */}
                                            <div className="flex gap-2 pt-1">
                                                <Input
                                                    placeholder={`Ajouter une autre ${grp.name.toLowerCase()}...`}
                                                    value={newOptionValue[groupId] || ''}
                                                    onChange={(e) => setNewOptionValue(prev => ({ ...prev, [groupId]: e.target.value }))}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            handleAddCustomValueToGroup(groupId);
                                                        }
                                                    }}
                                                    className="h-8 text-xs rounded-lg bg-background"
                                                />
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="secondary"
                                                    onClick={() => handleAddCustomValueToGroup(groupId)}
                                                    className="h-8 px-2.5 text-xs font-bold rounded-lg cursor-pointer"
                                                >
                                                    <Plus className="w-3.5 h-3.5 mr-1" /> Ajouter
                                                </Button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Volet pliable : Options avancées (logistique, dimensions, état) */}
                    <div className="pt-2 border-t border-border">
                        <button
                            type="button"
                            onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                            className="flex items-center justify-between w-full p-3 rounded-xl bg-muted/20 hover:bg-muted/40 transition-colors text-xs font-bold text-foreground uppercase tracking-wider cursor-pointer"
                        >
                            <div className="flex items-center gap-2">
                                <SlidersHorizontal className="w-4 h-4 text-primary" />
                                <span>Options avancées (Logistique, dimensions, état) — Optionnel</span>
                            </div>
                            {showAdvancedOptions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>

                        {showAdvancedOptions && (
                            <div className="p-4 mt-2 rounded-xl bg-muted/10 border border-border grid grid-cols-1 sm:grid-cols-3 gap-4 animate-in fade-in duration-200">
                                <div>
                                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">État du produit</Label>
                                    <select
                                        value={formData.condition}
                                        onChange={(e) => setFormData(prev => ({ ...prev, condition: e.target.value }))}
                                        className="h-9 w-full rounded-lg border border-border bg-background px-3 text-xs font-semibold outline-none mt-1"
                                    >
                                        <option value="NEW">Neuf</option>
                                        <option value="REFURBISHED">Reconditionné</option>
                                        <option value="USED">Occasion</option>
                                    </select>
                                </div>
                                <div>
                                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Délai d'expédition</Label>
                                    <div className="flex gap-1 mt-1">
                                        <Input
                                            type="number"
                                            value={formData.deliveryTimeValue}
                                            onChange={(e) => setFormData(prev => ({ ...prev, deliveryTimeValue: parseInt(e.target.value) || 1 }))}
                                            className="h-9 w-16 text-xs rounded-lg"
                                        />
                                        <select
                                            value={formData.deliveryTimeUnit}
                                            onChange={(e) => setFormData(prev => ({ ...prev, deliveryTimeUnit: e.target.value }))}
                                            className="h-9 flex-1 rounded-lg border border-border bg-background px-2 text-xs font-semibold outline-none"
                                        >
                                            <option value="h">Heure(s)</option>
                                            <option value="d">Jour(s)</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">SKU Référence Vendeur</Label>
                                    <Input
                                        placeholder="Ex: REF-001"
                                        value={formData.sku}
                                        onChange={(e) => setFormData(prev => ({ ...prev, sku: e.target.value }))}
                                        className="h-9 text-xs rounded-lg mt-1"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Navigation Buttons */}
                    <div className="flex justify-between pt-4 border-t border-border">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setCurrentStep(1)}
                            className="h-11 px-5 rounded-xl font-bold flex items-center gap-2 uppercase text-xs tracking-wider cursor-pointer"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Retour aux photos
                        </Button>
                        <Button
                            type="button"
                            onClick={handleNextStep}
                            className="h-11 px-6 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold flex items-center gap-2 uppercase text-xs tracking-wider cursor-pointer"
                        >
                            Suivant : Prix & Déclinaisons
                            <ArrowRight className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            )}

            {/* STEP 3: PRIX, STOCKS & DÉCLINAISONS */}
            {currentStep === 3 && (
                <div className="bg-card rounded-2xl border border-border p-5 sm:p-7 shadow-sm space-y-6 animate-in fade-in duration-300">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="p-2 rounded-xl bg-primary/10 text-primary">
                                <Coins className="w-5 h-5" />
                            </span>
                            <h2 className="text-lg sm:text-xl font-bold text-foreground">
                                Tarifs & Disponibilité
                            </h2>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Définissez votre prix de vente et votre stock disponible pour chaque déclinaison.
                        </p>
                    </div>

                    {/* Variant Matrix Form */}
                    <div className="space-y-4">
                        {variants.map((v, idx) => (
                            <div key={v.id} className="p-4 rounded-xl bg-muted/20 border border-border space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="w-6 h-6 rounded-full bg-primary/10 text-primary font-black text-xs flex items-center justify-center">
                                            {idx + 1}
                                        </span>
                                        <span className="font-bold text-sm text-foreground">
                                            {v.name}
                                        </span>
                                    </div>
                                    <label className="flex items-center gap-2 text-xs font-bold text-muted-foreground cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={v.onPromotion}
                                            onChange={(e) => {
                                                const checked = e.target.checked;
                                                setVariants(prev => prev.map((item, i) => i === idx ? { ...item, onPromotion: checked } : item));
                                            }}
                                            className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                                        />
                                        <span>En Promotion ?</span>
                                    </label>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div>
                                        <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                            Prix de vente (FCFA) <span className="text-destructive">*</span>
                                        </Label>
                                        <Input
                                            type="number"
                                            placeholder="Ex: 15000"
                                            value={v.price || ''}
                                            onChange={(e) => {
                                                const val = Math.max(0, parseInt(e.target.value) || 0);
                                                setVariants(prev => prev.map((item, i) => i === idx ? { ...item, price: val } : item));
                                            }}
                                            className="h-10 text-sm font-bold rounded-xl mt-1"
                                        />
                                    </div>

                                    <div>
                                        <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                            Stock disponible <span className="text-destructive">*</span>
                                        </Label>
                                        <Input
                                            type="number"
                                            min="0"
                                            placeholder="Ex: 10"
                                            value={v.stock !== undefined ? v.stock : ''}
                                            onChange={(e) => {
                                                const val = Math.max(0, parseInt(e.target.value) || 0);
                                                setVariants(prev => prev.map((item, i) => i === idx ? { ...item, stock: val } : item));
                                            }}
                                            className="h-10 text-sm font-bold rounded-xl mt-1"
                                        />
                                    </div>

                                    {v.onPromotion ? (
                                        <div>
                                            <Label className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                                                Prix promo (FCFA)
                                            </Label>
                                            <Input
                                                type="number"
                                                placeholder="Ex: 12000"
                                                value={v.promotionalPrice || ''}
                                                onChange={(e) => {
                                                    const val = Math.max(0, parseInt(e.target.value) || 0);
                                                    setVariants(prev => prev.map((item, i) => i === idx ? { ...item, promotionalPrice: val } : item));
                                                }}
                                                className="h-10 text-sm font-bold rounded-xl mt-1 border-amber-500/40"
                                            />
                                        </div>
                                    ) : (
                                        <div>
                                            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                                SKU (Facultatif)
                                            </Label>
                                            <Input
                                                placeholder="Référence SKU"
                                                value={v.sku || ''}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setVariants(prev => prev.map((item, i) => i === idx ? { ...item, sku: val } : item));
                                                }}
                                                className="h-10 text-xs rounded-xl mt-1"
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Variant Image Upload Row */}
                                <div className="pt-2 border-t border-border/40 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <ImageIcon className="w-4 h-4 text-muted-foreground" />
                                        <span className="text-xs font-bold text-muted-foreground">Photo de cette déclinaison :</span>
                                    </div>
                                    {v.featuredAssetPreview ? (
                                        <div className="flex items-center gap-2">
                                            <div className="w-10 h-10 rounded-lg overflow-hidden border border-border relative group">
                                                <img src={v.featuredAssetPreview} alt={v.name} className="w-full h-full object-cover" />
                                            </div>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleSelectVariantImage(idx)}
                                                disabled={isUploadingVariantImage === idx}
                                                className="h-8 px-2 text-[10px] font-bold uppercase"
                                            >
                                                Changer
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    setVariants(prev => prev.map((item, i) => i === idx ? { ...item, featuredAssetId: null, featuredAssetPreview: null } : item));
                                                }}
                                                className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </Button>
                                        </div>
                                    ) : (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleSelectVariantImage(idx)}
                                            disabled={isUploadingVariantImage === idx}
                                            className="h-8 px-3 text-[10px] font-bold uppercase flex items-center gap-1.5 border-dashed cursor-pointer"
                                        >
                                            {isUploadingVariantImage === idx ? (
                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            ) : (
                                                <Camera className="w-3.5 h-3.5 text-primary" />
                                            )}
                                            Ajouter / Rogner photo
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Submit Bar */}
                    <div className="flex justify-between items-center pt-5 border-t border-border">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setCurrentStep(2)}
                            className="h-11 px-5 rounded-xl font-bold flex items-center gap-2 uppercase text-xs tracking-wider cursor-pointer"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Retour à l'identité
                        </Button>
                        <Button
                            type="button"
                            disabled={isSubmitting}
                            onClick={handleSubmit}
                            className="h-12 px-8 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-black flex items-center gap-2.5 shadow-lg uppercase text-xs tracking-wider cursor-pointer active:scale-95 transition-all"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Envoi en cours...
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="w-5 h-5" />
                                    Envoyer la fiche pour validation
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            )}

            {/* Hidden File Input for Variant Cropper */}
            <input
                type="file"
                ref={variantFileInputRef}
                onChange={handleVariantFileChange}
                accept="image/*"
                className="hidden"
            />

            {/* Variant Image Crop Modal */}
            <ImageCropModal
                isOpen={variantCropModalOpen}
                imageSrc={variantCropSrc}
                onClose={() => setVariantCropModalOpen(false)}
                onCropComplete={handleVariantCropComplete}
                aspectRatio={1}
            />

        </div>
    );
}
