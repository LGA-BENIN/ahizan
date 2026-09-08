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
    Trash2,
    Star,
    Save,
    AlertCircle,
    X,
    FileText,
    Search,
    Check,
    CheckSquare,
    Square,
    Filter,
    EyeOff
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { priceFromSubunit } from '@/lib/format';
import CategoryCheckboxTree from './category-checkbox-tree';

interface CreateProductFormProps {
    collectionTree: any[];
    initialProduct?: any;
    onSuccess?: () => void;
    onSwitchToGraft?: (productOrTerm: any, variantId?: string) => void;
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
    assets?: UploadedAsset[];
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
          featuredAsset {
            id
            preview
          }
          options {
            id
            code
            name
            group {
              id
              name
            }
          }
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

const DEFAULT_OPTION_GROUPS = [
    {
        id: '50',
        code: 'taille',
        name: 'Taille',
        options: [
            { id: 't_xs', code: 'xs', name: 'XS' },
            { id: 't_s', code: 's', name: 'S' },
            { id: 't_m', code: 'm', name: 'M' },
            { id: 't_l', code: 'l', name: 'L' },
            { id: 't_xl', code: 'xl', name: 'XL' },
            { id: 't_xxl', code: 'xxl', name: 'XXL' },
            { id: 't_3xl', code: '3xl', name: '3XL' },
        ]
    },
    {
        id: '51',
        code: 'pointure',
        name: 'Pointure',
        options: [
            { id: 'p_36', code: '36', name: '36' },
            { id: 'p_37', code: '37', name: '37' },
            { id: 'p_38', code: '38', name: '38' },
            { id: 'p_39', code: '39', name: '39' },
            { id: 'p_40', code: '40', name: '40' },
            { id: 'p_41', code: '41', name: '41' },
            { id: 'p_42', code: '42', name: '42' },
            { id: 'p_43', code: '43', name: '43' },
            { id: 'p_44', code: '44', name: '44' },
            { id: 'p_45', code: '45', name: '45' },
        ]
    },
    {
        id: '52',
        code: 'couleur',
        name: 'Couleur',
        options: [
            { id: 'c_noir', code: 'noir', name: 'Noir' },
            { id: 'c_blanc', code: 'blanc', name: 'Blanc' },
            { id: 'c_rouge', code: 'rouge', name: 'Rouge' },
            { id: 'c_bleu', code: 'bleu', name: 'Bleu' },
            { id: 'c_vert', code: 'vert', name: 'Vert' },
            { id: 'c_jaune', code: 'jaune', name: 'Jaune' },
            { id: 'c_rose', code: 'rose', name: 'Rose' },
            { id: 'c_gris', code: 'gris', name: 'Gris' },
            { id: 'c_marron', code: 'marron', name: 'Marron' },
            { id: 'c_orange', code: 'orange', name: 'Orange' },
            { id: 'c_violet', code: 'violet', name: 'Violet' },
            { id: 'c_beige', code: 'beige', name: 'Beige' },
        ]
    },
    {
        id: '53',
        code: 'capacite',
        name: 'Capacité',
        options: [
            { id: 'cap_32', code: '32go', name: '32 Go' },
            { id: 'cap_64', code: '64go', name: '64 Go' },
            { id: 'cap_128', code: '128go', name: '128 Go' },
            { id: 'cap_256', code: '256go', name: '256 Go' },
            { id: 'cap_512', code: '512go', name: '512 Go' },
        ]
    },
    {
        id: '55',
        code: 'poids',
        name: 'Poids',
        options: [
            { id: 'w_100g', code: '100g', name: '100 g' },
            { id: 'w_250g', code: '250g', name: '250 g' },
            { id: 'w_500g', code: '500g', name: '500 g' },
            { id: 'w_1kg', code: '1kg', name: '1 kg' },
            { id: 'w_2kg', code: '2kg', name: '2 kg' },
            { id: 'w_5kg', code: '5kg', name: '5 kg' },
        ]
    },
    {
        id: '56',
        code: 'matiere',
        name: 'Matière',
        options: [
            { id: 'm_coton', code: 'coton', name: 'Coton' },
            { id: 'm_cuir', code: 'cuir', name: 'Cuir' },
            { id: 'm_soie', code: 'soie', name: 'Soie' },
            { id: 'm_synthetique', code: 'synthetique', name: 'Synthétique' },
            { id: 'm_acier', code: 'acier', name: 'Acier' },
            { id: 'm_bois', code: 'bois', name: 'Bois' },
            { id: 'm_plastique', code: 'plastique', name: 'Plastique' },
        ]
    }
];

export default function CreateProductForm({ 
    collectionTree, 
    initialProduct,
    onSuccess, 
    onSwitchToGraft,
    className 
}: CreateProductFormProps) {
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
    const [currentDraftId, setCurrentDraftId] = useState<string | null>(initialProduct?.id || null);
    const [lastSavedTime, setLastSavedTime] = useState<string | null>(
        initialProduct ? 'Brouillon existant chargé' : null
    );

    // Initial variant parsing from initialProduct if editing a draft
    const initialVariants: VariantRow[] = useMemo(() => {
        if (initialProduct?.variants && initialProduct.variants.length > 0) {
            return initialProduct.variants.map((v: any, i: number) => {
                const priceVal = v.price ? priceFromSubunit(v.price, v.currencyCode || 'XOF') : (v.priceWithTax ? priceFromSubunit(v.priceWithTax, v.currencyCode || 'XOF') : 0);
                const promoVal = v.customFields?.promotionalPrice ? priceFromSubunit(v.customFields.promotionalPrice, v.currencyCode || 'XOF') : 0;
                const vAssets: UploadedAsset[] = [];
                if (v.featuredAsset) {
                    vAssets.push({ id: v.featuredAsset.id, preview: v.featuredAsset.preview });
                }
                return {
                    id: v.id || `init-${i}`,
                    name: v.name || 'Standard',
                    sku: v.sku || '',
                    price: priceVal,
                    stock: v.stockOnHand !== undefined ? v.stockOnHand : 0,
                    onPromotion: v.customFields?.onPromotion === true,
                    promotionalPrice: promoVal,
                    enabled: true,
                    featuredAssetId: v.featuredAsset?.id || null,
                    featuredAssetPreview: v.featuredAsset?.preview || null,
                    assets: vAssets
                };
            });
        }
        return [
            { id: '1', name: 'Standard', sku: '', price: 0, stock: 0, onPromotion: false, promotionalPrice: 0, enabled: true, featuredAssetId: null, assets: [] }
        ];
    }, [initialProduct]);

    // Initial form data
    const [formData, setFormData] = useState({
        name: initialProduct?.name || '',
        shortDescription: initialProduct?.customFields?.shortDescription || initialProduct?.description || '',
        price: initialVariants[0]?.price || 0,
        stock: initialVariants[0]?.stock || 0,
        sku: initialProduct?.variants?.[0]?.sku || '',
        weight: initialProduct?.customFields?.weight || '',
        width: initialProduct?.customFields?.width || '',
        height: initialProduct?.customFields?.height || '',
        enabled: true,
        onPromotion: initialVariants[0]?.onPromotion || false,
        promotionalPrice: initialVariants[0]?.promotionalPrice || 0,
        deliveryTimeValue: 2,
        deliveryTimeUnit: 'd',
        condition: 'NEW',
    });

    const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>(
        initialProduct?.collections?.map((c: any) => c.id) || []
    );
    const [assets, setAssets] = useState<UploadedAsset[]>(
        initialProduct?.assets?.map((a: any) => ({ id: a.id, preview: a.preview })) || []
    );
    const [featuredAssetId, setFeaturedAssetId] = useState<string | null>(
        initialProduct?.featuredAsset?.id || null
    );
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmittingDraft, setIsSubmittingDraft] = useState(false);
    const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

    // Live catalog suggestion state (while typing product name)
    const [liveSuggestions, setLiveSuggestions] = useState<any[]>([]);
    const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false);

    // Options and Variants (Step 2 & 3)
    const [hasMultipleVariants, setHasMultipleVariants] = useState(
        Boolean(initialProduct?.variants && initialProduct.variants.length > 1)
    );
    const [globalOptionGroups, setGlobalOptionGroups] = useState<any[]>(DEFAULT_OPTION_GROUPS);
    const [selectedStandardGroups, setSelectedStandardGroups] = useState<string[]>([]);
    const [groupValuesMap, setGroupValuesMap] = useState<{ [key: string]: string[] }>({});
    const [newOptionValue, setNewOptionValue] = useState<{ [key: string]: string }>({});

    // Variant rows (Step 3)
    const [variants, setVariants] = useState<VariantRow[]>(initialVariants);

    // Validation state for precise declination error highlighting
    const [errorVariantIndices, setErrorVariantIndices] = useState<number[]>([]);

    // Step 3 UI and Management state: start on 'draft' tab by default
    const [activeVariantTab, setActiveVariantTab] = useState<'active' | 'draft'>('draft');
    const [searchVariantFilter, setSearchVariantFilter] = useState('');
    const [expandedVariantIds, setExpandedVariantIds] = useState<Set<string>>(new Set());
    const [selectedVariantIds, setSelectedVariantIds] = useState<Set<string>>(new Set());
    const [bulkPriceInput, setBulkPriceInput] = useState<string>('');
    const [bulkStockInput, setBulkStockInput] = useState<string>('');
    const [showBulkPriceModal, setShowBulkPriceModal] = useState<boolean>(false);
    const [showAllLiveSuggestions, setShowAllLiveSuggestions] = useState<boolean>(false);

    // Flattened catalog live suggestions for horizontal carousel
    const flattenedSuggestions = useMemo(() => {
        const list: Array<{
            key: string;
            product: any;
            variantId?: string;
            title: string;
            optionsLabel: string;
            preview: string | null;
            sku?: string;
        }> = [];

        liveSuggestions.forEach((prod: any) => {
            if (prod.variants && prod.variants.length > 0) {
                prod.variants.forEach((v: any) => {
                    const optString = (v.options || []).map((o: any) => o.name || o.code).filter(Boolean).join(' ');
                    const fullTitle = optString ? `${prod.name} - ${optString}` : (v.name || prod.name);
                    const preview = v.featuredAsset?.preview || prod.featuredAsset?.preview || null;
                    list.push({
                        key: `var-${v.id}`,
                        product: prod,
                        variantId: v.id,
                        title: fullTitle,
                        optionsLabel: optString || 'Standard',
                        preview,
                        sku: v.sku
                    });
                });
            } else {
                list.push({
                    key: `prod-${prod.id}`,
                    product: prod,
                    variantId: undefined,
                    title: prod.name,
                    optionsLabel: 'Standard',
                    preview: prod.featuredAsset?.preview || null
                });
            }
        });

        // Deduplicate by normalized title
        const seen = new Set<string>();
        return list.filter(item => {
            const canonical = item.title.toLowerCase().trim();
            if (seen.has(canonical)) return false;
            seen.add(canonical);
            return true;
        });
    }, [liveSuggestions]);

    const toggleExpandVariant = (id: string) => {
        setExpandedVariantIds((prev: Set<string>) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const toggleSelectVariant = (id: string) => {
        setSelectedVariantIds((prev: Set<string>) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const handleBulkActivate = () => {
        if (selectedVariantIds.size === 0) return;

        // Check if any selected variant has incomplete price or stock
        const selectedList = variants.filter(v => selectedVariantIds.has(v.id));
        for (const v of selectedList) {
            const hasPrice = v.price && Number(v.price) > 0;
            const hasStock = v.stock !== undefined && v.stock !== null && Number(v.stock) > 0;

            if (hasPrice && !hasStock) {
                toast.error(`Veuillez entrer le stock de la déclinaison "${v.name}" ou effacer son prix pour l'enlever de la liste.`);
                return;
            }
            if (!hasPrice && hasStock) {
                toast.error(`Veuillez entrer le prix de la déclinaison "${v.name}" ou effacer son stock pour l'enlever de la liste.`);
                return;
            }
            if (!hasPrice && !hasStock) {
                toast.error(`Veuillez renseigner le prix et le stock de la déclinaison "${v.name}" avant de l'enregistrer.`);
                return;
            }
        }

        setVariants((prev: VariantRow[]) => prev.map((v: VariantRow) => selectedVariantIds.has(v.id) ? { ...v, enabled: true } : v));
        const count = selectedVariantIds.size;
        setSelectedVariantIds(new Set());
        toast.success(`${count} déclinaison(s) enregistrée(s) et déplacée(s) vers "Déclinaisons utilisées" !`);
    };

    const handleBulkDeactivate = () => {
        if (selectedVariantIds.size === 0) return;
        setVariants((prev: VariantRow[]) => prev.map((v: VariantRow) => selectedVariantIds.has(v.id) ? { ...v, enabled: false } : v));
        const count = selectedVariantIds.size;
        setSelectedVariantIds(new Set());
        toast.info(`${count} déclinaison(s) déplacée(s) vers "Déclinaisons brouillons" !`);
    };

    const handleBulkApplyPrice = (priceVal: number) => {
        if (priceVal <= 0) {
            toast.error("Veuillez indiquer un prix supérieur à 0 FCFA.");
            return;
        }
        setVariants((prev: VariantRow[]) => prev.map((v: VariantRow) => selectedVariantIds.has(v.id) ? { ...v, price: priceVal } : v));
        toast.success(`Prix de ${priceVal.toLocaleString('fr-FR')} FCFA appliqué à ${selectedVariantIds.size} déclinaison(s).`);
        setBulkPriceInput('');
        setShowBulkPriceModal(false);
    };

    const handleBulkApplyStock = (stockVal: number) => {
        if (stockVal < 0) return;
        setVariants((prev: VariantRow[]) => prev.map((v: VariantRow) => selectedVariantIds.has(v.id) ? { ...v, stock: stockVal } : v));
        toast.success(`Stock de ${stockVal} appliqué à ${selectedVariantIds.size} déclinaison(s).`);
        setBulkStockInput('');
    };

    const handleBulkDelete = () => {
        if (selectedVariantIds.size === 0) return;
        if (variants.length <= selectedVariantIds.size) {
            toast.error("Vous devez conserver au moins une déclinaison.");
            return;
        }
        setVariants((prev: VariantRow[]) => prev.filter((v: VariantRow) => !selectedVariantIds.has(v.id)));
        setSelectedVariantIds(new Set());
        toast.success("Déclinaisons sélectionnées supprimées.");
    };

    const activeVariants = useMemo(() => variants.filter((v: VariantRow) => v.enabled !== false), [variants]);
    const draftVariants = useMemo(() => variants.filter((v: VariantRow) => v.enabled === false), [variants]);
    const tabVariants = activeVariantTab === 'active' ? activeVariants : draftVariants;

    const tabFilteredVariants = useMemo(() => {
        if (!searchVariantFilter.trim()) return tabVariants;
        const term = searchVariantFilter.toLowerCase().trim();
        return tabVariants.filter((v: VariantRow) => 
            v.name.toLowerCase().includes(term) ||
            Boolean(v.sku && v.sku.toLowerCase().includes(term))
        );
    }, [tabVariants, searchVariantFilter]);

    const isAllSelectedInTab = tabFilteredVariants.length > 0 && tabFilteredVariants.every((v: VariantRow) => selectedVariantIds.has(v.id));

    const handleToggleSelectAllInTab = () => {
        if (isAllSelectedInTab) {
            setSelectedVariantIds((prev: Set<string>) => {
                const next = new Set(prev);
                tabFilteredVariants.forEach((v: VariantRow) => next.delete(v.id));
                return next;
            });
        } else {
            setSelectedVariantIds((prev: Set<string>) => {
                const next = new Set(prev);
                tabFilteredVariants.forEach((v: VariantRow) => next.add(v.id));
                return next;
            });
        }
    };

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
                const newAsset: UploadedAsset = { id: res.asset.id, preview: res.asset.preview };
                setVariants(prev => prev.map((v, i) => {
                    if (i !== targetIndex) return v;
                    const existingAssets = v.assets || (v.featuredAssetId ? [{ id: v.featuredAssetId, preview: v.featuredAssetPreview || '' }] : []);
                    const updatedAssets = [...existingAssets, newAsset];
                    const newFeaturedId = v.featuredAssetId || newAsset.id;
                    const newFeaturedPreview = v.featuredAssetPreview || newAsset.preview;
                    return {
                        ...v,
                        assets: updatedAssets,
                        featuredAssetId: newFeaturedId,
                        featuredAssetPreview: newFeaturedPreview
                    };
                }));
                toast.success("Photo ajoutée à la déclinaison");
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

    const handleSetPrimaryVariantImage = (variantIndex: number, assetId: string, preview: string) => {
        setVariants(prev => prev.map((v, i) => i === variantIndex ? {
            ...v,
            featuredAssetId: assetId,
            featuredAssetPreview: preview
        } : v));
        toast.success("Photo principale de la déclinaison mise à jour ⭐");
    };

    const handleRemoveVariantImage = (variantIndex: number, assetId: string) => {
        setVariants(prev => prev.map((v, i) => {
            if (i !== variantIndex) return v;
            const currentAssets = v.assets || [];
            const updatedAssets = currentAssets.filter(a => a.id !== assetId);
            let newFeaturedId = v.featuredAssetId;
            let newFeaturedPreview = v.featuredAssetPreview;
            if (v.featuredAssetId === assetId) {
                newFeaturedId = updatedAssets[0]?.id || null;
                newFeaturedPreview = updatedAssets[0]?.preview || null;
            }
            return {
                ...v,
                assets: updatedAssets,
                featuredAssetId: newFeaturedId,
                featuredAssetPreview: newFeaturedPreview
            };
        }));
    };

    const handleToggleProductAssetForVariant = (variantIndex: number, asset: UploadedAsset) => {
        setVariants(prev => prev.map((v, i) => {
            if (i !== variantIndex) return v;
            const currentAssets = v.assets || [];
            const exists = currentAssets.some(a => a.id === asset.id);
            let updatedAssets: UploadedAsset[];
            let newFeaturedId = v.featuredAssetId;
            let newFeaturedPreview = v.featuredAssetPreview;

            if (exists) {
                updatedAssets = currentAssets.filter(a => a.id !== asset.id);
                if (v.featuredAssetId === asset.id) {
                    newFeaturedId = updatedAssets[0]?.id || null;
                    newFeaturedPreview = updatedAssets[0]?.preview || null;
                }
            } else {
                updatedAssets = [...currentAssets, asset];
                if (!newFeaturedId) {
                    newFeaturedId = asset.id;
                    newFeaturedPreview = asset.preview;
                }
            }

            return {
                ...v,
                assets: updatedAssets,
                featuredAssetId: newFeaturedId,
                featuredAssetPreview: newFeaturedPreview
            };
        }));
    };

    const handleDeleteVariant = (variantIndex: number) => {
        if (variants.length <= 1) {
            toast.warning("Votre fiche doit contenir au moins une déclinaison.");
            return;
        }
        const variantToDelete = variants[variantIndex];
        setVariants(prev => prev.filter((_, i) => i !== variantIndex));
        setErrorVariantIndices(prev => prev.filter(idx => idx !== variantIndex).map(idx => idx > variantIndex ? idx - 1 : idx));
        toast.info(`Déclinaison "${variantToDelete.name}" supprimée`);
    };

    // Fetch global option groups from backend on mount
    useEffect(() => {
        const fetchGroups = async () => {
            try {
                const res = await query(GET_GLOBAL_OPTION_GROUPS_QUERY, {});
                const fetched = res.data?.getGlobalOptionGroups;
                if (Array.isArray(fetched) && fetched.length > 0) {
                    setGlobalOptionGroups(fetched);
                }
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
                const res = await query(SEARCH_OFFICIAL_PRODUCTS_QUERY, { term, take: 4 });
                const items = res.data?.searchOfficialProducts?.items || [];
                setLiveSuggestions(items);
            } catch (err) {
                console.error('[CreateProductForm] Live search failed:', err);
            } finally {
                setIsCheckingDuplicates(false);
            }
        }, 400);

        return () => clearTimeout(timer);
    }, [formData.name]);

    // Handle standard option group selection
    const handleToggleStandardGroup = (groupId: string) => {
        setSelectedStandardGroups(prev => {
            const isSelected = prev.includes(groupId);
            if (isSelected) {
                return prev.filter(id => id !== groupId);
            } else {
                return [...prev, groupId];
            }
        });
    };

    const handleToggleOptionValue = (groupId: string, value: string) => {
        setGroupValuesMap(prev => {
            const current = prev[groupId] || [];
            const isSelected = current.includes(value);
            const updated = isSelected ? current.filter(v => v !== value) : [...current, value];
            return {
                ...prev,
                [groupId]: updated
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

    // Auto-generate variants from selected options with strict anti-permutation & anti-duplication
    useEffect(() => {
        if (!hasMultipleVariants) {
            setVariants(prev => {
                const standard = prev[0] || { id: '1', name: 'Standard', sku: '', price: 0, stock: 0, onPromotion: false, promotionalPrice: 0, enabled: true, featuredAssetId: null, assets: [] };
                return [{ ...standard, name: 'Standard', enabled: true }];
            });
            return;
        }

        // 1. Sort option groups deterministically to ensure canonical order (e.g. alphabetical by group name)
        const activeGroupEntries = selectedStandardGroups
            .map(groupId => {
                const group = globalOptionGroups.find(g => g.id === groupId);
                return {
                    id: groupId,
                    name: group?.name || 'Option',
                    code: group?.code || 'option',
                    // Deduplicate values within the group
                    values: Array.from(new Set((groupValuesMap[groupId] || []).map(v => v.trim()).filter(Boolean)))
                };
            })
            .filter(g => g.values.length > 0)
            .sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }));

        if (activeGroupEntries.length === 0) {
            setVariants([{ id: '1', name: 'Standard', sku: '', price: formData.price || 0, stock: formData.stock || 0, onPromotion: formData.onPromotion, promotionalPrice: formData.promotionalPrice || 0, enabled: true, featuredAssetId: null, assets: [] }]);
            return;
        }

        const cartesian = (arrays: string[][]): string[][] => {
            return arrays.reduce((acc, curr) => {
                return acc.flatMap(a => curr.map(c => [...a, c]));
            }, [[]] as string[][]);
        };

        const rawCombinations = cartesian(activeGroupEntries.map(g => g.values));

        // 2. Strict anti-duplicate / anti-permutation check:
        // "Jaune - XL" vs "XL - Jaune" produce the exact same canonical key "jaune:::xl".
        const seenCanonicalKeys = new Set<string>();
        const uniqueCombinations: string[][] = [];

        for (const comb of rawCombinations) {
            const canonicalKey = comb.map(c => c.trim().toLowerCase()).sort().join(':::');
            if (!seenCanonicalKeys.has(canonicalKey)) {
                seenCanonicalKeys.add(canonicalKey);
                uniqueCombinations.push(comb);
            }
        }

        const getCanonicalKeyFromName = (name: string) => {
            return name.split(' - ').map(s => s.trim().toLowerCase()).sort().join(':::');
        };

        setVariants(prevVariants => {
            return uniqueCombinations.map((comb, index) => {
                const variantName = comb.join(' - ');
                const combCanonicalKey = comb.map(c => c.trim().toLowerCase()).sort().join(':::');

                // Match existing variant by canonical key or exact name
                const existing = prevVariants.find(v => 
                    getCanonicalKeyFromName(v.name) === combCanonicalKey || v.name === variantName
                );

                return {
                    id: existing ? existing.id : `generated-${index}-${Date.now()}`,
                    name: variantName,
                    sku: existing?.sku || '',
                    price: existing ? existing.price : (formData.price || 0),
                    stock: existing ? existing.stock : (formData.stock || 0),
                    onPromotion: existing ? existing.onPromotion : formData.onPromotion,
                    promotionalPrice: existing ? existing.promotionalPrice : (formData.promotionalPrice || 0),
                    // Newly generated variants start as INACTIVE / BROUILLONS unless already enabled by user
                    enabled: existing !== undefined ? existing.enabled : false,
                    featuredAssetId: existing ? existing.featuredAssetId : null,
                    featuredAssetPreview: existing ? existing.featuredAssetPreview : null,
                    assets: existing?.assets || []
                };
            });
        });
        setActiveVariantTab('draft');
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

    // Save as Draft (Brouillon) from ANY step
    const handleSaveDraft = async () => {
        setIsSubmittingDraft(true);
        try {
            const submitFormData = new FormData();
            const draftTitle = formData.name.trim() || `Brouillon ${new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}`;
            submitFormData.append('name', draftTitle);
            submitFormData.append('description', formData.shortDescription.trim() || draftTitle);
            submitFormData.append('shortDescription', formData.shortDescription.trim() || draftTitle);
            submitFormData.append('price', (variants[0]?.price || formData.price || 0).toString());
            submitFormData.append('stock', (variants[0]?.stock || formData.stock || 0).toString());
            submitFormData.append('sku', formData.sku.trim());
            submitFormData.append('category', JSON.stringify(selectedCategoryIds));

            // Gather all assets across product and variants
            const allAssetIds = new Set<string>();
            assets.forEach(a => allAssetIds.add(a.id));
            variants.forEach(v => {
                if (v.featuredAssetId) allAssetIds.add(v.featuredAssetId);
                (v.assets || []).forEach(a => allAssetIds.add(a.id));
            });
            submitFormData.append('assetIds', JSON.stringify(Array.from(allAssetIds)));
            submitFormData.append('featuredAssetId', featuredAssetId || assets[0]?.id || variants[0]?.featuredAssetId || '');
            submitFormData.append('enabled', 'false');
            submitFormData.append('isDraft', 'true');
            submitFormData.append('approvalStatus', 'draft');
            submitFormData.append('onPromotion', variants[0]?.onPromotion ? 'true' : 'false');
            submitFormData.append('promotionalPrice', (variants[0]?.promotionalPrice || 0).toString());
            submitFormData.append('deliveryTimeValue', formData.deliveryTimeValue.toString());
            submitFormData.append('deliveryTimeUnit', formData.deliveryTimeUnit);
            submitFormData.append('condition', formData.condition);

            if (formData.weight) submitFormData.append('weight', formData.weight);
            if (formData.width) submitFormData.append('width', formData.width);
            if (formData.height) submitFormData.append('height', formData.height);

            const activeGroupEntries = hasMultipleVariants
                ? selectedStandardGroups
                    .map(groupId => {
                        const group = globalOptionGroups.find(g => g.id === groupId);
                        return {
                            id: group?.id || groupId,
                            name: group?.name || 'Option',
                            code: group?.code || group?.name?.toLowerCase()?.replace(/[^a-z0-9]+/g, '-') || 'option',
                            values: groupValuesMap[groupId] || []
                        };
                    })
                    .filter(g => g.values.length > 0)
                : [];

            const optionGroupsPayload = activeGroupEntries.map(g => ({
                name: g.name,
                code: g.code,
                options: g.values.map(v => ({
                    name: v,
                    code: v.toLowerCase().replace(/[^a-z0-9]+/g, '-')
                }))
            }));

            if (optionGroupsPayload.length > 0) {
                submitFormData.append('optionGroups', JSON.stringify(optionGroupsPayload));
            }

            if (currentDraftId) {
                submitFormData.append('draftId', currentDraftId);
            }

            const formattedVariants = variants.map(v => {
                const parts = v.name.split(' - ').map(p => p.trim());
                const optionCodes = parts.map(p => p.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
                return {
                    ...v,
                    optionCodes,
                    optionNames: parts
                };
            });
            submitFormData.append('variants', JSON.stringify(formattedVariants));

            const res = await createProductAction(null, submitFormData);

            if (res.success && res.product?.id) {
                const savedId = res.product.id;
                setCurrentDraftId(savedId);
                const timeStr = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                setLastSavedTime(timeStr);

                try {
                    localStorage.setItem(`ahizan_draft_${savedId}`, JSON.stringify({
                        formData,
                        selectedCategoryIds,
                        assets,
                        featuredAssetId,
                        hasMultipleVariants,
                        selectedStandardGroups,
                        groupValuesMap,
                        variants,
                        savedAt: new Date().toISOString()
                    }));
                } catch (lsErr) {}

                toast.success("Brouillon sauvegardé !", {
                    description: `Enregistré à ${timeStr}. Vous pouvez continuer votre saisie en toute sérénité.`,
                    action: {
                        label: "Voir mes produits",
                        onClick: () => router.push('/dashboard/products')
                    }
                });

                if (onSuccess) {
                    onSuccess();
                }
            } else {
                toast.error(res.error || "Erreur lors de l'enregistrement du brouillon.");
            }
        } catch (e: any) {
            toast.error(e.message || "Erreur de connexion.");
        } finally {
            setIsSubmittingDraft(false);
        }
    };

    // Final Submission to Super Admin for approval with Precise Declination Error Reporting
    const handleSubmit = async () => {
        if (variants.length === 0) {
            toast.error("Veuillez configurer au moins une déclinaison.");
            return;
        }

        // 1. Check draft variants for partial inputs
        for (const v of variants) {
            if (v.enabled === false) {
                const hasPrice = v.price && Number(v.price) > 0;
                const hasStock = v.stock !== undefined && v.stock !== null && Number(v.stock) > 0;

                if (hasPrice && !hasStock) {
                    toast.error(`Veuillez entrer le stock de la déclinaison "${v.name}" ou effacer son prix pour l'enlever de la liste.`);
                    setActiveVariantTab('draft');
                    const actualIdx = variants.findIndex(item => item.id === v.id);
                    const el = document.getElementById(`variant-card-${actualIdx}`);
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    return;
                }
                if (!hasPrice && hasStock) {
                    toast.error(`Veuillez entrer le prix de la déclinaison "${v.name}" ou effacer son stock pour l'enlever de la liste.`);
                    setActiveVariantTab('draft');
                    const actualIdx = variants.findIndex(item => item.id === v.id);
                    const el = document.getElementById(`variant-card-${actualIdx}`);
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    return;
                }
            }
        }

        // 2. Auto-promote any draft variant where both price and stock are filled
        const effectiveVariants = variants.map(v => {
            if (v.enabled === false && v.price && Number(v.price) > 0 && v.stock !== undefined && Number(v.stock) > 0) {
                return { ...v, enabled: true };
            }
            return v;
        });
        setVariants(effectiveVariants);

        // 3. Filter active/registered variants only - Draft variants are NOT sent to the DB
        const activeVariants = effectiveVariants.filter(v => v.enabled !== false && v.price && Number(v.price) > 0 && v.stock && Number(v.stock) > 0);
        if (activeVariants.length === 0) {
            toast.error("Veuillez renseigner le prix et le stock d'au moins une déclinaison à vendre.");
            setActiveVariantTab('draft');
            return;
        }

        // 4. Granular validation on active declinations ONLY
        const variantErrors: { index: number; name: string; reason: string }[] = [];
        activeVariants.forEach((v) => {
            const actualIdx = effectiveVariants.findIndex(item => item.id === v.id);
            if (!v.price || Number(v.price) <= 0) {
                variantErrors.push({
                    index: actualIdx + 1,
                    name: v.name,
                    reason: "Le prix de vente est obligatoire et doit être supérieur à 0 FCFA."
                });
            }
            if (v.stock === undefined || v.stock === null || Number(v.stock) <= 0 || isNaN(Number(v.stock))) {
                variantErrors.push({
                    index: actualIdx + 1,
                    name: v.name,
                    reason: "Le stock disponible doit être supérieur à 0."
                });
            }
            if (v.onPromotion) {
                if (!v.promotionalPrice || Number(v.promotionalPrice) <= 0) {
                    variantErrors.push({
                        index: actualIdx + 1,
                        name: v.name,
                        reason: "Le prix promotionnel doit être renseigné et supérieur à 0 FCFA."
                    });
                } else if (v.price && Number(v.promotionalPrice) >= Number(v.price)) {
                    variantErrors.push({
                        index: actualIdx + 1,
                        name: v.name,
                        reason: `Le prix promo (${v.promotionalPrice.toLocaleString('fr-FR')} FCFA) doit être inférieur au prix normal (${v.price.toLocaleString('fr-FR')} FCFA).`
                    });
                }
            }
        });

        if (variantErrors.length > 0) {
            const faultyIndices = Array.from(new Set(variantErrors.map(e => e.index - 1)));
            setErrorVariantIndices(faultyIndices);

            if (variantErrors.length === 1) {
                const err = variantErrors[0];
                toast.error(`Déclinaison #${err.index} (${err.name}) : ${err.reason}`, {
                    duration: 6000
                });
            } else {
                const errorNumbers = variantErrors.map(e => `#${e.index}`).join(', ');
                toast.error(
                    `Erreurs sur les déclinaisons ${errorNumbers} ! Veuillez renseigner des prix et stocks valides sur les cartes en rouge.`,
                    { duration: 7000 }
                );
            }

            const firstFaulty = faultyIndices[0];
            const el = document.getElementById(`variant-card-${firstFaulty}`);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            return;
        }

        setErrorVariantIndices([]);
        setIsSubmitting(true);
        try {
            const submitFormData = new FormData();
            submitFormData.append('name', formData.name.trim());
            submitFormData.append('description', formData.shortDescription.trim() || formData.name.trim());
            submitFormData.append('shortDescription', formData.shortDescription.trim() || formData.name.trim());
            const primaryPriceVariant = activeVariants[0];
            submitFormData.append('price', (primaryPriceVariant?.price || 0).toString());
            submitFormData.append('stock', (primaryPriceVariant?.stock || 0).toString());
            submitFormData.append('sku', formData.sku.trim());
            submitFormData.append('category', JSON.stringify(selectedCategoryIds));

            const allAssetIds = new Set<string>();
            assets.forEach(a => allAssetIds.add(a.id));
            activeVariants.forEach(v => {
                if (v.featuredAssetId) allAssetIds.add(v.featuredAssetId);
                (v.assets || []).forEach(a => allAssetIds.add(a.id));
            });
            submitFormData.append('assetIds', JSON.stringify(Array.from(allAssetIds)));
            submitFormData.append('featuredAssetId', featuredAssetId || assets[0]?.id || activeVariants[0]?.featuredAssetId || '');
            submitFormData.append('enabled', 'true');
            submitFormData.append('isDraft', 'false');
            submitFormData.append('approvalStatus', 'pending');
            submitFormData.append('onPromotion', activeVariants[0]?.onPromotion ? 'true' : 'false');
            submitFormData.append('promotionalPrice', (activeVariants[0]?.promotionalPrice || 0).toString());
            submitFormData.append('deliveryTimeValue', formData.deliveryTimeValue.toString());
            submitFormData.append('deliveryTimeUnit', formData.deliveryTimeUnit);
            submitFormData.append('condition', formData.condition);

            if (formData.weight) submitFormData.append('weight', formData.weight);
            if (formData.width) submitFormData.append('width', formData.width);
            if (formData.height) submitFormData.append('height', formData.height);

            const activeGroupEntries = hasMultipleVariants
                ? selectedStandardGroups
                    .map(groupId => {
                        const group = globalOptionGroups.find(g => g.id === groupId);
                        return {
                            id: group?.id || groupId,
                            name: group?.name || 'Option',
                            code: group?.code || group?.name?.toLowerCase()?.replace(/[^a-z0-9]+/g, '-') || 'option',
                            values: groupValuesMap[groupId] || []
                        };
                    })
                    .filter(g => g.values.length > 0)
                : [];

            const optionGroupsPayload = activeGroupEntries.map(g => ({
                name: g.name,
                code: g.code,
                options: g.values.map(v => ({
                    name: v,
                    code: v.toLowerCase().replace(/[^a-z0-9]+/g, '-')
                }))
            }));

            if (optionGroupsPayload.length > 0) {
                submitFormData.append('optionGroups', JSON.stringify(optionGroupsPayload));
            }

            if (currentDraftId) {
                submitFormData.append('draftId', currentDraftId);
            }

            // CRITICAL: We ONLY send the registered/active variants to the database!
            // Unused draft variants stay in the PC cache (localStorage) and are not sent to the DB.
            const formattedVariants = activeVariants.map(v => {
                const parts = v.name.split(' - ').map(p => p.trim());
                const optionCodes = parts.map(p => p.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
                return {
                    ...v,
                    optionCodes,
                    optionNames: parts
                };
            });
            submitFormData.append('variants', JSON.stringify(formattedVariants));

            const res = await createProductAction(null, submitFormData);

            if (res.success) {
                try {
                    if (currentDraftId) {
                        localStorage.removeItem(`ahizan_draft_${currentDraftId}`);
                    }
                } catch (lsErr) {}
                toast.success("Votre fiche a été envoyée pour validation au Super Admin !");
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

            {/* Live Draft Status and Quick Return Indicator */}
            {lastSavedTime && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-3 px-4 rounded-xl bg-slate-500/10 border border-slate-500/20 text-xs font-medium animate-in fade-in">
                    <div className="flex items-center gap-2 text-foreground font-semibold">
                        <Save className="w-4 h-4 text-primary" />
                        <span>Brouillon synchronisé : {lastSavedTime}</span>
                    </div>
                    <button 
                        type="button" 
                        onClick={() => router.push('/dashboard/products')}
                        className="text-xs text-primary font-bold hover:underline cursor-pointer"
                    >
                        Quitter et revenir plus tard →
                    </button>
                </div>
            )}
            
            {/* Step Indicators Header */}
            <div className="bg-card rounded-2xl border border-border p-4 shadow-sm">
                <div className="flex items-center justify-between">
                    {[
                        { num: 1, title: "1. Photos", icon: Camera },
                        { num: 2, title: "2. Identité & Catégorie", icon: Tag },
                        { num: 3, title: "3. Prix & Déclinaisons", icon: Coins },
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

                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-border">
                        <Button
                            type="button"
                            variant="outline"
                            disabled={isSubmittingDraft}
                            onClick={handleSaveDraft}
                            className="w-full sm:w-auto h-11 px-5 rounded-xl border-dashed border-border hover:border-primary/50 text-muted-foreground hover:text-foreground font-bold flex items-center justify-center gap-2 text-xs uppercase tracking-wider cursor-pointer"
                        >
                            {isSubmittingDraft ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 text-primary" />}
                            Sauvegarder en brouillon
                        </Button>

                        <Button
                            type="button"
                            onClick={handleNextStep}
                            className="w-full sm:w-auto h-11 px-6 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold flex items-center justify-center gap-2 uppercase text-xs tracking-wider cursor-pointer"
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

                        {/* Live suggestions of existing catalog items in a contained box scrollable horizontally & vertically (max ~3 lines high) */}
                        {flattenedSuggestions.length > 0 && (
                            <div className="mt-3.5 p-3 sm:p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2.5 animate-in fade-in slide-in-from-top-2 duration-300">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs font-bold text-amber-700 dark:text-amber-400">
                                    <div className="flex items-center gap-1.5">
                                        <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                                        <span>Cet article ou ses déclinaisons existent déjà ({flattenedSuggestions.length}) :</span>
                                    </div>
                                    <span className="text-[10px] text-muted-foreground font-normal">
                                        Cliquez pour greffer directement votre offre
                                    </span>
                                </div>

                                {/* Contained scrollable box: max ~3 lines (~215px), scrolls vertically & horizontally */}
                                <div className="max-h-[215px] overflow-y-auto overflow-x-auto p-1 pr-1.5 rounded-xl border border-amber-500/20 bg-background/50 scrollbar-thin">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 min-w-[500px] sm:min-w-0">
                                        {flattenedSuggestions.map((item) => (
                                            <div
                                                key={item.key}
                                                onClick={() => {
                                                    if (onSwitchToGraft) {
                                                        onSwitchToGraft(item.product, item.variantId);
                                                    } else {
                                                        router.push(`/dashboard/products/affiliate?term=${encodeURIComponent(item.product.name)}`);
                                                    }
                                                }}
                                                className="p-2.5 rounded-xl bg-card border border-border/80 hover:border-primary hover:shadow-xs transition-all flex items-center gap-2.5 cursor-pointer group select-none h-[64px]"
                                                title={`Greffer mon offre sur "${item.title}"`}
                                            >
                                                {/* Thumbnail image */}
                                                <div className="w-10 h-10 rounded-lg bg-muted/60 border border-border overflow-hidden shrink-0 flex items-center justify-center p-0.5">
                                                    {item.preview ? (
                                                        <img
                                                            src={item.preview}
                                                            alt={item.title}
                                                            className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                                                        />
                                                    ) : (
                                                        <Package className="w-4 h-4 text-muted-foreground" />
                                                    )}
                                                </div>

                                                {/* Title and Action */}
                                                <div className="min-w-0 flex-1">
                                                    <div className="text-[11px] font-bold text-foreground truncate group-hover:text-primary transition-colors" title={item.title}>
                                                        {item.title}
                                                    </div>
                                                    <div className="text-[9px] text-muted-foreground font-medium mt-0.5 flex items-center justify-between">
                                                        <span>Officiel</span>
                                                        <span className="text-primary font-bold group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                                                            Vendre ➔
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
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
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-border">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setCurrentStep(1)}
                            className="w-full sm:w-auto h-11 px-5 rounded-xl font-bold flex items-center justify-center gap-2 uppercase text-xs tracking-wider cursor-pointer"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Retour aux photos
                        </Button>

                        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                            <Button
                                type="button"
                                variant="outline"
                                disabled={isSubmittingDraft}
                                onClick={handleSaveDraft}
                                className="w-full sm:w-auto h-11 px-5 rounded-xl border-dashed border-border hover:border-primary/50 text-muted-foreground hover:text-foreground font-bold flex items-center justify-center gap-2 text-xs uppercase tracking-wider cursor-pointer"
                            >
                                {isSubmittingDraft ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 text-primary" />}
                                Sauvegarder en brouillon
                            </Button>

                            <Button
                                type="button"
                                onClick={handleNextStep}
                                className="w-full sm:w-auto h-11 px-6 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold flex items-center justify-center gap-2 uppercase text-xs tracking-wider cursor-pointer"
                            >
                                Suivant : Prix & Déclinaisons
                                <ArrowRight className="w-4 h-4" />
                            </Button>
                        </div>
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
                                Tarifs, Disponibilités & Visuels par Déclinaison
                            </h2>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Configurez vos prix, stocks et visuels. Seules les déclinaisons dans l'onglet <strong>"Déclinaisons utilisées"</strong> seront mises en vente.
                        </p>
                    </div>

                    {/* TWO TABS: Déclinaisons utilisées vs Déclinaisons brouillons */}
                    <div className="flex items-center gap-2 border-b border-border pb-1">
                        <button
                            type="button"
                            onClick={() => setActiveVariantTab('active')}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer",
                                activeVariantTab === 'active'
                                    ? "bg-primary text-primary-foreground shadow-sm"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                            )}
                        >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Déclinaisons utilisées</span>
                            <span className={cn(
                                "px-2 py-0.5 rounded-full text-[10px] font-black",
                                activeVariantTab === 'active' ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                            )}>
                                {activeVariants.length}
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveVariantTab('draft')}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer",
                                activeVariantTab === 'draft'
                                    ? "bg-muted-foreground text-white shadow-sm"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                            )}
                        >
                            <FileText className="w-4 h-4" />
                            <span>Déclinaisons brouillons</span>
                            <span className={cn(
                                "px-2 py-0.5 rounded-full text-[10px] font-black",
                                activeVariantTab === 'draft' ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                            )}>
                                {draftVariants.length}
                            </span>
                        </button>
                    </div>

                    {/* THE BOX CONTAINER with Internal Search & Bulk Actions */}
                    <div className="border border-border rounded-2xl bg-muted/10 overflow-hidden shadow-xs">
                        {/* Box Top Bar: Search filter + Bulk actions */}
                        <div className="p-3.5 sm:p-4 bg-card border-b border-border space-y-3">
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                                {/* Search input */}
                                <div className="relative flex-1">
                                    <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                                    <Input
                                        type="text"
                                        placeholder="Rechercher une déclinaison (ex: XL, Rouge, 128 Go)..."
                                        value={searchVariantFilter}
                                        onChange={(e) => setSearchVariantFilter(e.target.value)}
                                        className="h-9 pl-9 pr-8 text-xs rounded-xl bg-muted/20 border-border"
                                    />
                                    {searchVariantFilter && (
                                        <button
                                            type="button"
                                            onClick={() => setSearchVariantFilter('')}
                                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>

                                {/* Select All toggle */}
                                <div className="flex items-center gap-2 shrink-0">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={handleToggleSelectAllInTab}
                                        className="h-9 px-3 text-xs font-bold rounded-xl cursor-pointer"
                                    >
                                        {isAllSelectedInTab ? (
                                            <>
                                                <CheckSquare className="w-3.5 h-3.5 mr-1.5 text-primary" />
                                                Tout désélectionner
                                            </>
                                        ) : (
                                            <>
                                                <Square className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                                                Tout sélectionner ({tabFilteredVariants.length})
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>

                            {/* Group / Bulk actions toolbar when 1 or more selected */}
                            {selectedVariantIds.size > 0 && (
                                <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 flex flex-wrap items-center justify-between gap-2 animate-in fade-in duration-200">
                                    <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
                                        <CheckCircle2 className="w-4 h-4" />
                                        <span>{selectedVariantIds.size} déclinaison(s) sélectionnée(s)</span>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2">
                                        {activeVariantTab === 'draft' ? (
                                            <Button
                                                type="button"
                                                size="sm"
                                                onClick={handleBulkActivate}
                                                className="h-8 px-3 text-xs font-bold rounded-lg bg-primary hover:bg-primary/90 text-white cursor-pointer"
                                            >
                                                Activer la sélection
                                            </Button>
                                        ) : (
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="outline"
                                                onClick={handleBulkDeactivate}
                                                className="h-8 px-3 text-xs font-bold rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
                                            >
                                                Passer en brouillon
                                            </Button>
                                        )}

                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            onClick={() => setShowBulkPriceModal(true)}
                                            className="h-8 px-3 text-xs font-bold rounded-lg cursor-pointer"
                                        >
                                            Prix groupé
                                        </Button>

                                        {variants.length > selectedVariantIds.size && (
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="ghost"
                                                onClick={handleBulkDelete}
                                                className="h-8 px-2 text-xs font-bold text-destructive hover:bg-destructive/10 rounded-lg cursor-pointer"
                                            >
                                                <Trash2 className="w-3.5 h-3.5 mr-1" />
                                                Supprimer
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Box Body: Scrollable list of compact cards */}
                        <div className="max-h-[580px] overflow-y-auto p-3.5 sm:p-4 space-y-3">
                            {tabFilteredVariants.length === 0 ? (
                                <div className="py-12 text-center space-y-3">
                                    <Package className="w-10 h-10 text-muted-foreground/50 mx-auto" />
                                    <p className="text-sm font-bold text-muted-foreground">
                                        {activeVariantTab === 'active'
                                            ? "Aucune déclinaison active pour le moment."
                                            : "Aucune déclinaison en brouillon."}
                                    </p>
                                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                                        {activeVariantTab === 'active'
                                            ? "Allez dans l'onglet 'Déclinaisons brouillons' pour activer les déclinaisons que vous possédez en stock."
                                            : "Toutes vos déclinaisons générées sont actuellement actives."}
                                    </p>
                                    {activeVariantTab === 'active' && draftVariants.length > 0 && (
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            onClick={() => setActiveVariantTab('draft')}
                                            className="text-xs font-bold rounded-xl cursor-pointer"
                                        >
                                            Voir les {draftVariants.length} déclinaisons brouillons
                                        </Button>
                                    )}
                                </div>
                            ) : (
                                tabFilteredVariants.map((v) => {
                                    const actualIndex = variants.findIndex(item => item.id === v.id);
                                    const isError = errorVariantIndices.includes(actualIndex);
                                    const isExpanded = expandedVariantIds.has(v.id);
                                    const isSelected = selectedVariantIds.has(v.id);
                                    const variantAssets = v.assets || (v.featuredAssetId ? [{ id: v.featuredAssetId, preview: v.featuredAssetPreview || '' }] : []);

                                    return (
                                        <div
                                            key={v.id}
                                            id={`variant-card-${actualIndex}`}
                                            className={cn(
                                                "rounded-2xl border transition-all duration-200 bg-card",
                                                isError
                                                    ? "bg-red-500/5 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.15)] ring-1 ring-red-500"
                                                    : isSelected
                                                        ? "border-primary/60 shadow-xs ring-1 ring-primary/30"
                                                        : "border-border hover:border-border/80"
                                            )}
                                        >
                                            {/* Compact Row Header */}
                                            <div className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                {/* Left: Checkbox, Badge, Name & Enabled Switch */}
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => toggleSelectVariant(v.id)}
                                                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer shrink-0"
                                                    />
                                                    <span className={cn(
                                                        "w-6 h-6 rounded-lg font-black text-[11px] flex items-center justify-center shrink-0",
                                                        isError ? "bg-red-500 text-white" : "bg-muted text-foreground"
                                                    )}>
                                                        {actualIndex + 1}
                                                    </span>
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-bold text-sm text-foreground truncate block" title={v.name}>
                                                                {v.name}
                                                            </span>
                                                            {v.onPromotion && (
                                                                <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 shrink-0">
                                                                    Promo
                                                                </span>
                                                            )}
                                                            {variantAssets.length > 0 && (
                                                                <span className="text-[9px] font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0 flex items-center gap-0.5">
                                                                    <Camera className="w-2.5 h-2.5 text-primary" />
                                                                    {variantAssets.length}
                                                                </span>
                                                            )}
                                                        </div>
                                                        {isError && (
                                                            <span className="text-[10px] text-red-600 font-bold flex items-center gap-1 mt-0.5">
                                                                <AlertCircle className="w-3 h-3" />
                                                                Prix ou stock à corriger
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Right: Quick Price, Quick Stock & Actions */}
                                                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                                                    {/* Quick Price Input */}
                                                    <div className="w-28">
                                                        <Input
                                                            type="number"
                                                            placeholder="Prix (FCFA)"
                                                            value={v.price || ''}
                                                            onChange={(e) => {
                                                                const val = Math.max(0, parseInt(e.target.value) || 0);
                                                                // Keeps variant in current tab without jumping to 'active' automatically
                                                                setVariants(prev => prev.map((item, i) => i === actualIndex ? { ...item, price: val } : item));
                                                                if (errorVariantIndices.includes(actualIndex)) {
                                                                    setErrorVariantIndices(prev => prev.filter(i => i !== actualIndex));
                                                                }
                                                            }}
                                                            className={cn(
                                                                "h-8 text-xs font-bold rounded-lg",
                                                                isError && (!v.price || v.price <= 0) && "border-red-500 bg-red-50/20"
                                                            )}
                                                        />
                                                    </div>

                                                    {/* Quick Stock Input */}
                                                    <div className="w-20">
                                                        <Input
                                                            type="number"
                                                            min="0"
                                                            placeholder="Stock"
                                                            value={v.stock || ''}
                                                            onChange={(e) => {
                                                                const val = Math.max(0, parseInt(e.target.value) || 0);
                                                                setVariants(prev => prev.map((item, i) => i === actualIndex ? { ...item, stock: val } : item));
                                                            }}
                                                            className="h-8 text-xs font-bold rounded-lg"
                                                        />
                                                    </div>

                                                    {/* Enregistrer / Activer Button when in draft tab */}
                                                    {activeVariantTab === 'draft' ? (
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            onClick={() => {
                                                                const hasPrice = v.price && Number(v.price) > 0;
                                                                const hasStock = v.stock !== undefined && v.stock !== null && Number(v.stock) > 0;

                                                                if (hasPrice && !hasStock) {
                                                                    toast.error(`Veuillez entrer le stock de la déclinaison "${v.name}" ou effacer son prix pour l'enlever de la liste.`);
                                                                    return;
                                                                }
                                                                if (!hasPrice && hasStock) {
                                                                    toast.error(`Veuillez entrer le prix de la déclinaison "${v.name}" ou effacer son stock pour l'enlever de la liste.`);
                                                                    return;
                                                                }
                                                                if (!hasPrice && !hasStock) {
                                                                    toast.error(`Veuillez renseigner le prix et le stock de la déclinaison "${v.name}" avant de l'enregistrer.`);
                                                                    return;
                                                                }
                                                                if (v.onPromotion) {
                                                                    if (!v.promotionalPrice || Number(v.promotionalPrice) <= 0) {
                                                                        toast.error(`Veuillez renseigner le prix promotionnel pour "${v.name}".`);
                                                                        return;
                                                                    }
                                                                    if (Number(v.promotionalPrice) >= Number(v.price)) {
                                                                        toast.error(`Le prix promo (${v.promotionalPrice} F) doit être inférieur au prix normal (${v.price} F) pour "${v.name}".`);
                                                                        return;
                                                                    }
                                                                }
                                                                setVariants(prev => prev.map((item, i) => i === actualIndex ? { ...item, enabled: true } : item));
                                                                toast.success(`"${v.name}" enregistrée dans les déclinaisons utilisées !`);
                                                            }}
                                                            className="h-8 px-2.5 rounded-lg text-[11px] font-black bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1 cursor-pointer shrink-0"
                                                            title="Enregistrer et déplacer vers les déclinaisons utilisées"
                                                        >
                                                            <Check className="w-3.5 h-3.5" />
                                                            <span>Enregistrer</span>
                                                        </Button>
                                                    ) : (
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => {
                                                                setVariants(prev => prev.map((item, i) => i === actualIndex ? { ...item, enabled: false } : item));
                                                                toast.info(`"${v.name}" passée en brouillon.`);
                                                            }}
                                                            className="h-8 px-2 rounded-lg text-[11px] font-bold text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer shrink-0"
                                                            title="Passer en brouillon"
                                                        >
                                                            <EyeOff className="w-3.5 h-3.5" />
                                                            <span className="hidden sm:inline">Brouillon</span>
                                                        </Button>
                                                    )}

                                                    {/* Chevron toggle to expand/collapse */}
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => toggleExpandVariant(v.id)}
                                                        className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
                                                        title={isExpanded ? "Replier" : "Détails & Photos"}
                                                    >
                                                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                                    </Button>
                                                </div>
                                            </div>

                                            {/* Expanded details accordion */}
                                            {isExpanded && (
                                                <div className="p-4 pt-0 border-t border-border/50 mt-1 space-y-4 animate-in fade-in duration-200">
                                                    {/* Promo & SKU */}
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3">
                                                        <div className="p-3 rounded-xl border border-border bg-muted/20 space-y-2">
                                                            <label className="flex items-center gap-2 text-xs font-bold text-foreground cursor-pointer select-none">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={v.onPromotion}
                                                                    onChange={(e) => {
                                                                        const checked = e.target.checked;
                                                                        setVariants(prev => prev.map((item, i) => i === actualIndex ? { ...item, onPromotion: checked } : item));
                                                                    }}
                                                                    className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5"
                                                                />
                                                                <span>Vendre en promotion ?</span>
                                                            </label>

                                                            {v.onPromotion && (
                                                                <div>
                                                                    <Label className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                                                                        Prix promotionnel (FCFA) *
                                                                    </Label>
                                                                    <Input
                                                                        type="number"
                                                                        placeholder="Ex: 12000"
                                                                        value={v.promotionalPrice || ''}
                                                                        onChange={(e) => {
                                                                            const val = Math.max(0, parseInt(e.target.value) || 0);
                                                                            setVariants(prev => prev.map((item, i) => i === actualIndex ? { ...item, promotionalPrice: val } : item));
                                                                        }}
                                                                        className="h-9 text-xs font-bold rounded-lg mt-1 border-amber-500/40"
                                                                    />
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div className="p-3 rounded-xl border border-border bg-muted/20 flex flex-col justify-between">
                                                            <div>
                                                                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                                                    Référence SKU (Optionnel)
                                                                </Label>
                                                                <Input
                                                                    placeholder="Ex: REF-XL-ROUGE"
                                                                    value={v.sku || ''}
                                                                    onChange={(e) => {
                                                                        const val = e.target.value;
                                                                        setVariants(prev => prev.map((item, i) => i === actualIndex ? { ...item, sku: val } : item));
                                                                    }}
                                                                    className="h-9 text-xs rounded-lg mt-1"
                                                                />
                                                            </div>

                                                            {variants.length > 1 && (
                                                                <div className="flex justify-end pt-2">
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={() => handleDeleteVariant(actualIndex)}
                                                                        className="h-7 px-2 text-destructive hover:bg-destructive/10 text-xs font-bold rounded-lg cursor-pointer gap-1"
                                                                    >
                                                                        <Trash2 className="w-3 h-3" />
                                                                        <span>Supprimer cette déclinaison</span>
                                                                    </Button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Photos Gallery for this Variant with ⭐ Star for Primary */}
                                                    <div className="pt-2 border-t border-border/40 space-y-2.5">
                                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                                            <div className="flex items-center gap-1.5">
                                                                <ImageIcon className="w-4 h-4 text-primary" />
                                                                <span className="text-xs font-bold text-foreground">
                                                                    Photos de cette déclinaison ({variantAssets.length}) :
                                                                </span>
                                                            </div>
                                                            <span className="text-[10px] text-muted-foreground">
                                                                Cliquez sur l'étoile <span className="text-amber-500 font-bold">⭐</span> pour définir la photo principale
                                                            </span>
                                                        </div>

                                                        {/* Thumbnail grid */}
                                                        <div className="flex flex-wrap items-center gap-2.5">
                                                            {variantAssets.map((asset) => {
                                                                const isStarred = v.featuredAssetId === asset.id || (!v.featuredAssetId && variantAssets[0]?.id === asset.id);
                                                                return (
                                                                    <div 
                                                                        key={asset.id}
                                                                        className={cn(
                                                                            "relative group w-20 h-20 rounded-xl overflow-hidden border bg-background shadow-xs transition-all",
                                                                            isStarred ? "ring-2 ring-amber-500 border-amber-500" : "border-border hover:border-primary/50"
                                                                        )}
                                                                    >
                                                                        <img 
                                                                            src={asset.preview} 
                                                                            alt={`Visuel ${v.name}`} 
                                                                            className="w-full h-full object-cover select-none" 
                                                                        />

                                                                        {/* Starred Badge */}
                                                                        {isStarred && (
                                                                            <div className="absolute top-1 left-1 z-10 bg-amber-500 text-white rounded-md p-0.5 shadow-sm">
                                                                                <Star className="w-2.5 h-2.5 fill-current" />
                                                                            </div>
                                                                        )}

                                                                        {/* Actions Overlay */}
                                                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleSetPrimaryVariantImage(actualIndex, asset.id, asset.preview)}
                                                                                className={cn(
                                                                                    "p-1.5 rounded-lg transition-colors cursor-pointer",
                                                                                    isStarred ? "bg-amber-500 text-white" : "bg-white/80 text-foreground hover:bg-amber-500 hover:text-white"
                                                                                )}
                                                                                title="Définir comme photo principale de la déclinaison"
                                                                            >
                                                                                <Star className={cn("w-3.5 h-3.5", isStarred && "fill-current")} />
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleRemoveVariantImage(actualIndex, asset.id)}
                                                                                className="p-1.5 rounded-lg bg-red-500/90 hover:bg-red-600 text-white transition-colors cursor-pointer"
                                                                                title="Supprimer cette photo"
                                                                            >
                                                                                <Trash2 className="w-3.5 h-3.5" />
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}

                                                            {/* Add Image Button */}
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => handleSelectVariantImage(actualIndex)}
                                                                disabled={isUploadingVariantImage === actualIndex}
                                                                className="h-20 w-24 rounded-xl border-dashed border-border hover:border-primary/60 flex flex-col items-center justify-center gap-1 text-[10px] font-bold text-muted-foreground hover:text-foreground cursor-pointer shrink-0"
                                                            >
                                                                {isUploadingVariantImage === actualIndex ? (
                                                                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                                                                ) : (
                                                                    <>
                                                                        <Camera className="w-4 h-4 text-primary" />
                                                                        <span>+ Photo</span>
                                                                    </>
                                                                )}
                                                            </Button>
                                                        </div>

                                                        {/* Optional quick picker from main product photos */}
                                                        {assets.length > 0 && (
                                                            <div className="pt-2 border-t border-border/30">
                                                                <span className="text-[10px] font-bold text-muted-foreground block mb-1.5">
                                                                    Ou associer une photo du produit principal :
                                                                </span>
                                                                <div className="flex flex-wrap items-center gap-2">
                                                                    {assets.map((prodAsset) => {
                                                                        const isAttached = variantAssets.some(a => a.id === prodAsset.id);
                                                                        return (
                                                                            <button
                                                                                key={prodAsset.id}
                                                                                type="button"
                                                                                onClick={() => handleToggleProductAssetForVariant(actualIndex, prodAsset)}
                                                                                className={cn(
                                                                                    "relative w-12 h-12 rounded-lg overflow-hidden border transition-all cursor-pointer",
                                                                                    isAttached 
                                                                                        ? "ring-2 ring-primary border-primary opacity-100" 
                                                                                        : "opacity-60 hover:opacity-100 border-border hover:border-muted-foreground"
                                                                                )}
                                                                                title={isAttached ? "Retirer cette photo de la déclinaison" : "Ajouter cette photo à cette déclinaison"}
                                                                            >
                                                                                <img src={prodAsset.preview} alt="Photo produit" className="w-full h-full object-cover" />
                                                                                {isAttached ? (
                                                                                    <div className="absolute inset-0 bg-primary/30 flex items-center justify-center">
                                                                                        <CheckCircle2 className="w-4 h-4 text-white drop-shadow" />
                                                                                    </div>
                                                                                ) : (
                                                                                    <div className="absolute bottom-0 right-0 bg-black/60 text-white rounded-tl px-1 text-[9px] font-black">
                                                                                        +
                                                                                    </div>
                                                                                )}
                                                                            </button>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* ACTION BUTTONS DIRECTLY UNDER THE BOX */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-border">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setCurrentStep(2)}
                            className="w-full sm:w-auto h-11 px-5 rounded-xl font-bold flex items-center justify-center gap-2 uppercase text-xs tracking-wider cursor-pointer"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Retour à l'identité
                        </Button>

                        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                            <Button
                                type="button"
                                variant="outline"
                                disabled={isSubmittingDraft || isSubmitting}
                                onClick={handleSaveDraft}
                                className="w-full sm:w-auto h-12 px-6 rounded-xl border-dashed border-border hover:border-primary/50 text-muted-foreground hover:text-foreground font-bold flex items-center justify-center gap-2 text-xs uppercase tracking-wider cursor-pointer"
                            >
                                {isSubmittingDraft ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 text-primary" />}
                                Sauvegarder en brouillon
                            </Button>

                            <Button
                                type="button"
                                disabled={isSubmitting || isSubmittingDraft}
                                onClick={handleSubmit}
                                className="w-full sm:w-auto h-12 px-8 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-black flex items-center justify-center gap-2.5 shadow-lg uppercase text-xs tracking-wider cursor-pointer active:scale-95 transition-all"
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
                </div>
            )}

            {/* Bulk Price Modal */}
            {showBulkPriceModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
                    <div className="bg-card w-full max-w-sm p-5 rounded-2xl border border-border shadow-xl space-y-4 animate-in zoom-in-95">
                        <div className="flex items-center justify-between">
                            <h4 className="text-sm font-bold text-foreground">Appliquer un prix groupé</h4>
                            <button
                                type="button"
                                onClick={() => setShowBulkPriceModal(false)}
                                className="text-muted-foreground hover:text-foreground cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Indiquez le prix en FCFA à appliquer aux {selectedVariantIds.size} déclinaison(s) sélectionnée(s) :
                        </p>
                        <Input
                            type="number"
                            min="1"
                            placeholder="Ex: 15000"
                            value={bulkPriceInput}
                            onChange={(e) => setBulkPriceInput(e.target.value)}
                            className="h-10 text-sm font-bold rounded-xl"
                            autoFocus
                        />
                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setShowBulkPriceModal(false)}
                                className="rounded-xl text-xs font-bold cursor-pointer"
                            >
                                Annuler
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                onClick={() => handleBulkApplyPrice(Number(bulkPriceInput))}
                                className="rounded-xl text-xs font-black bg-primary text-white hover:bg-primary/90 cursor-pointer"
                            >
                                Appliquer
                            </Button>
                        </div>
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

