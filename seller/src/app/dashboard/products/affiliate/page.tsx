'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { query, mutate } from '@/lib/vendure/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { uploadFileAction, tagProductWithVariantOffersAction } from '@/app/dashboard/products/actions';
import ImageCropModal from '@/components/ImageCropModal';
import { priceToSubunit } from '@/lib/format';
import { Checkbox } from '@/components/ui/checkbox';
import {
    ArrowLeft,
    Search,
    Loader2,
    Package,
    PlusCircle,
    CheckCircle2,
    Tag,
    ChevronRight,
    ChevronDown,
    ChevronUp,
    CheckSquare,
    Square,
    FileText,
    Sparkles,
    Check,
    X,
    Trash2,
    Layers,
    Percent,
    Coins,
    SlidersHorizontal,
    Eye,
    EyeOff,
    Clock,
    Plus,
    Camera,
    UploadCloud,
    ImageIcon,
    AlertTriangle
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import LocationRequiredModal from '@/components/dashboard/products/location-required-modal';

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
        featuredAsset {
          id
          preview
        }
        assets {
          id
          preview
        }
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

const CANONICAL_OPTION_GROUP_PRIORITY = [
    'taille',
    'pointure',
    'taille-d-cran',
    'ecran',
    'dimentions',
    'dimensions',
    'capacite',
    'capacit-stockage',
    'capacit-de-stockage',
    'volume',
    'poids',
    'grammage-gm',
    'couleur',
    'matiere',
    'genre',
];

function sortOptionGroupsByCanonicalOrder<T extends { code?: string; name?: string }>(groups: T[]): T[] {
    return [...groups].sort((a, b) => {
        const codeA = (a.code || a.name || '').toLowerCase().trim();
        const codeB = (b.code || b.name || '').toLowerCase().trim();

        const getScore = (code: string) => {
            const idx = CANONICAL_OPTION_GROUP_PRIORITY.findIndex(k => code === k || code.startsWith(k));
            return idx === -1 ? 999 : idx;
        };

        const scoreA = getScore(codeA);
        const scoreB = getScore(codeB);

        if (scoreA !== scoreB) return scoreA - scoreB;
        return (a.name || '').localeCompare(b.name || '', 'fr', { sensitivity: 'base' });
    });
}

export interface AffiliateProductPageProps {
    initialSelectedProduct?: any;
    initialSearchTerm?: string;
    initialSelectedVariantId?: string | null;
    marketplaceSettings?: {
        minimumMarketplacePrice: number;
        minimumMarketplaceStock: number;
    };
    onBack?: () => void;
}

function AffiliateProductPageContent({ initialSelectedProduct, initialSearchTerm, initialSelectedVariantId, marketplaceSettings, onBack }: AffiliateProductPageProps = {}) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const productIdFromQuery = searchParams?.get('id') || searchParams?.get('productId') || searchParams?.get('term');

    const minPrice = marketplaceSettings?.minimumMarketplacePrice ?? 300;
    const minStock = marketplaceSettings?.minimumMarketplaceStock ?? 1;

    // Step state: 1: Search & Select | 2: Option Groups & Combinations Config | 3: Grid Offers Configuration
    const [step, setStep] = useState<1 | 2 | 3>(1);

    // Step 1 State: Search
    const [searchTerm, setSearchTerm] = useState(initialSearchTerm || searchParams?.get('term') || '');
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

    // Missing variant modal / inline state
    const [isAddingMissingVariant, setIsAddingMissingVariant] = useState(false);
    const [missingVariantValues, setMissingVariantValues] = useState<{ [groupName: string]: string }>({});
    const [missingVariantPrice, setMissingVariantPrice] = useState<string>('');
    const [missingVariantStock, setMissingVariantStock] = useState<string>('');

    // Global defaults for fast fill (No pre-inserted stock or price)
    const [bulkPrice, setBulkPrice] = useState<string>('');
    const [bulkStock, setBulkStock] = useState<string>('');
    const [bulkCondition, setBulkCondition] = useState<string>('NEW');

    // Step 1 Flattened Search State
    const [showAllAffiliateSearch, setShowAllAffiliateSearch] = useState(false);

    // Step 3 UI, Tabs & Filtering State: starts on 'active' tab by default for existing products
    const [activeAffiliateTab, setActiveAffiliateTab] = useState<'active' | 'draft'>('active');
    const [searchAffiliateFilter, setSearchAffiliateFilter] = useState('');
    const [expandedVariantKeys, setExpandedVariantKeys] = useState<Set<string>>(new Set());
    const [selectedAffiliateKeys, setSelectedAffiliateKeys] = useState<Set<string>>(new Set());

    // Flattened Search Results (Directly list declinations with thumbnail, title and action)
    const flattenedSearchResults = useMemo(() => {
        const list: Array<{
            key: string;
            product: any;
            variantId?: string;
            title: string;
            optionsLabel: string;
            preview: string | null;
            sku?: string;
        }> = [];

        searchResults.forEach(prod => {
            if (prod.variants && prod.variants.length > 0) {
                prod.variants.forEach((v: any) => {
                    const optString = (v.options || []).map((o: any) => o.name || o.code).filter(Boolean).join(' ');
                    const fullTitle = optString ? `${prod.name} - ${optString}` : (v.name || prod.name);
                    const preview = v.featuredAsset?.preview || prod.preview || null;
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
                    preview: prod.preview || null,
                    sku: prod.slug
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
    }, [searchResults]);

    // Step 3 Tab Memos
    const activeVariants = useMemo(() => generatedVariants.filter((v: GeneratedVariantRow) => v.enabled), [generatedVariants]);
    const draftVariants = useMemo(() => generatedVariants.filter((v: GeneratedVariantRow) => !v.enabled), [generatedVariants]);
    const tabVariants = activeAffiliateTab === 'active' ? activeVariants : draftVariants;

    const tabFilteredVariants = useMemo(() => {
        if (!searchAffiliateFilter.trim()) return tabVariants;
        const term = searchAffiliateFilter.toLowerCase().trim();
        return tabVariants.filter((v: GeneratedVariantRow) => 
            v.name.toLowerCase().includes(term) ||
            Boolean(v.sku && v.sku.toLowerCase().includes(term))
        );
    }, [tabVariants, searchAffiliateFilter]);

    const isAllSelectedInTab = tabFilteredVariants.length > 0 && tabFilteredVariants.every((v: GeneratedVariantRow) => selectedAffiliateKeys.has(v.key));

    const handleToggleSelectAllInTab = () => {
        if (isAllSelectedInTab) {
            setSelectedAffiliateKeys((prev: Set<string>) => {
                const next = new Set(prev);
                tabFilteredVariants.forEach((v: GeneratedVariantRow) => next.delete(v.key));
                return next;
            });
        } else {
            setSelectedAffiliateKeys((prev: Set<string>) => {
                const next = new Set(prev);
                tabFilteredVariants.forEach((v: GeneratedVariantRow) => next.add(v.key));
                return next;
            });
        }
    };

    const toggleExpandVariantKey = (key: string) => {
        setExpandedVariantKeys((prev: Set<string>) => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

    const toggleSelectVariantKey = (key: string) => {
        setSelectedAffiliateKeys((prev: Set<string>) => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

    const handleBulkActivate = () => {
        if (selectedAffiliateKeys.size === 0) return;
        setGeneratedVariants((prev: GeneratedVariantRow[]) => prev.map((v: GeneratedVariantRow) => selectedAffiliateKeys.has(v.key) ? { ...v, enabled: true } : v));
        const count = selectedAffiliateKeys.size;
        setSelectedAffiliateKeys(new Set());
        toast.success(`${count} déclinaison(s) activée(s) !`);
    };

    const handleBulkDeactivate = () => {
        if (selectedAffiliateKeys.size === 0) return;
        setGeneratedVariants((prev: GeneratedVariantRow[]) => prev.map((v: GeneratedVariantRow) => selectedAffiliateKeys.has(v.key) ? { ...v, enabled: false } : v));
        const count = selectedAffiliateKeys.size;
        setSelectedAffiliateKeys(new Set());
        toast.info(`${count} déclinaison(s) passée(s) en brouillon !`);
    };

    const handleBulkSetPrice = (priceVal: number) => {
        if (selectedAffiliateKeys.size === 0) return;
        if (priceVal < minPrice) {
            toast.error(`Le prix doit être au minimum de ${minPrice} FCFA.`);
            return;
        }
        setGeneratedVariants((prev: GeneratedVariantRow[]) => prev.map((v: GeneratedVariantRow) => selectedAffiliateKeys.has(v.key) ? { ...v, price: priceVal } : v));
        toast.success(`Prix (${priceVal.toLocaleString('fr-FR')} FCFA) appliqué à ${selectedAffiliateKeys.size} déclinaison(s) !`);
    };

    const handleBulkSetStock = (stockVal: number) => {
        if (selectedAffiliateKeys.size === 0) return;
        if (stockVal < minStock) {
            toast.error(`Le stock doit être au minimum de ${minStock} unité(s).`);
            return;
        }
        setGeneratedVariants((prev: GeneratedVariantRow[]) => prev.map((v: GeneratedVariantRow) => selectedAffiliateKeys.has(v.key) ? { ...v, stock: stockVal } : v));
        toast.success(`Stock (${stockVal}) appliqué à ${selectedAffiliateKeys.size} déclinaison(s) !`);
    };

    const handleBulkDelete = () => {
        if (selectedAffiliateKeys.size === 0) return;
        if (generatedVariants.length <= selectedAffiliateKeys.size) {
            toast.warning("Vous devez conserver au moins une déclinaison.");
            return;
        }
        const count = selectedAffiliateKeys.size;
        setGeneratedVariants((prev: GeneratedVariantRow[]) => prev.filter((v: GeneratedVariantRow) => !selectedAffiliateKeys.has(v.key)));
        setSelectedAffiliateKeys(new Set());
        toast.info(`${count} déclinaison(s) supprimée(s) !`);
    };

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

    // Local in-memory search cache to avoid hammering the backend on repeated keystrokes
    const searchCacheRef = useRef<Map<string, any[]>>(new Map());

    // Step 1 Search Handler
    const handleSearch = useCallback(async (e?: React.FormEvent, customTerm?: string) => {
        if (e) e.preventDefault();
        const q = (customTerm !== undefined ? customTerm : searchTerm).trim();
        if (!q || q.length < 2) {
            setSearchResults([]);
            return;
        }

        // Fast-path: Check memory cache first
        const cacheKey = q.toLowerCase();
        if (searchCacheRef.current.has(cacheKey)) {
            setSearchResults(searchCacheRef.current.get(cacheKey)!);
            setIsSearching(false);
            return;
        }

        setIsSearching(true);
        try {
            const result = await query(SEARCH_OFFICIAL_PRODUCTS_QUERY, {
                term: q,
                take: 40
            });
            const items = result.data?.searchOfficialProducts?.items || [];
            const mapped = items.map((prod: any) => ({
                id: prod.id,
                name: prod.name,
                slug: prod.slug,
                preview: prod.featuredAsset?.preview || '',
                variants: prod.variants || []
            }));
            searchCacheRef.current.set(cacheKey, mapped);
            setSearchResults(mapped);
            if (mapped.length === 0 && e) {
                toast.info("Aucun produit officiel correspondant trouvé.");
            }
        } catch (err: any) {
            console.error('[AffiliatePage] Search failed:', err);
            if (e) toast.error('Erreur lors de la recherche: ' + err.message);
        } finally {
            setIsSearching(false);
        }
    }, [searchTerm]);

    // Instant automatic search as seller types with 350ms debounce and min 2 characters
    useEffect(() => {
        const q = searchTerm.trim();
        if (!q || q.length < 2) {
            if (!q) setSearchResults([]);
            return;
        }
        const timer = setTimeout(() => {
            handleSearch(undefined, q);
        }, 350);
        return () => clearTimeout(timer);
    }, [searchTerm, handleSearch]);

    // Step 1 -> Step 2/3: Select Product
    const handleSelectProduct = useCallback(async (productSummary: any, preselectedVariantId?: string | null) => {
        if (!productSummary || !productSummary.id) return;
        setSelectedProductSummary(productSummary);
        setIsLoadingDetails(true);

        try {
            const res = await query(GET_PRODUCT_DETAIL_QUERY, { id: productSummary.id });
            const prod = res.data?.product || productSummary;
            setProductDetails(prod);

            // 1. If seller explicitly clicked "Ajouter une autre option / déclinaison non listée" or has no target variant:
            if (preselectedVariantId === '__NEW_OPTION__' || !preselectedVariantId) {
                // Ensure ALL option groups start completely UNCHECKED as requested
                setSelectedGroupIds([]);
                setGroupValuesMap({});
                setCustomGroups([]);
                setGeneratedVariants([]);
                setStep(2);
                toast.info("Cochez les options que vous souhaitez proposer pour ce produit.");
                return;
            }

            // 2. If a specific existing variant was clicked by the seller:
            const targetVariant = (prod.variants || []).find((pv: any) => String(pv.id) === String(preselectedVariantId));
            if (targetVariant) {
                const optionPairs = (targetVariant.options || []).map((o: any) => ({
                    groupName: o.group?.name || 'Option',
                    optName: o.name || o.code,
                }));
                const optNames = optionPairs.map((op: any) => op.optName).filter(Boolean).join(' ');
                const itemDisplayName = optNames ? `${prod.name} – ${optNames}` : (targetVariant.name || prod.name);

                const singleRow: GeneratedVariantRow = {
                    id: String(targetVariant.id),
                    key: `existing_${targetVariant.id}`,
                    enabled: true,
                    name: itemDisplayName,
                    optionValues: optionPairs,
                    price: targetVariant.price ? targetVariant.price / 100 : 0,
                    stock: 0,
                    sku: `OFFER-${targetVariant.sku || targetVariant.id}`,
                    onPromotion: false,
                    promotionalPrice: 0,
                    featuredAssetId: targetVariant.featuredAsset?.id || prod.featuredAsset?.id,
                    assetPreview: targetVariant.featuredAsset?.preview || prod.preview || prod.featuredAsset?.preview,
                    deliveryTimeValue: 2,
                    deliveryTimeUnit: 'h',
                    condition: 'NEW',
                };

                setSelectedGroupIds([]);
                setGroupValuesMap({});
                setCustomGroups([]);
                setGeneratedVariants([singleRow]);
                setActiveAffiliateTab('active');
                setStep(3);
                toast.success(`Article « ${itemDisplayName} » prêt ! Renseignez votre prix et votre stock.`);
                return;
            }

            // Fallback for standard product with no variants
            setSelectedGroupIds([]);
            setGroupValuesMap({});
            setCustomGroups([]);
            setGeneratedVariants([]);
            setStep(2);
        } catch (err) {
            console.error('[AffiliatePage] Failed to fetch product details:', err);
            setProductDetails(productSummary);
            setSelectedGroupIds([]);
            setGroupValuesMap({});
            setCustomGroups([]);
            setStep(2);
        } finally {
            setIsLoadingDetails(false);
        }
    }, []);

    // Auto-select initial product or auto-trigger search if provided via URL query or props
    useEffect(() => {
        if (productIdFromQuery) {
            handleSelectProduct({ id: productIdFromQuery });
        } else if (initialSelectedProduct && initialSelectedProduct.id) {
            handleSelectProduct(initialSelectedProduct, initialSelectedVariantId);
        } else if (initialSearchTerm && initialSearchTerm.trim()) {
            handleSearch(undefined, initialSearchTerm.trim());
        }
    }, [productIdFromQuery, initialSelectedProduct, initialSelectedVariantId, initialSearchTerm, handleSelectProduct, handleSearch]);

    const isNoisyCompositeOption = (name: string): boolean => {
        const trimmed = (name || '').trim();
        if (!trimmed) return true;
        if (/^(d[ée]clinaison\s+personnalis[ée]e|custom\s+variant|option)/i.test(trimmed)) return true;
        const parts = trimmed.split(/[\s\-_/,+]+/).filter(Boolean);
        if (parts.length >= 2) {
            const hasSize = parts.some(p => /^(xs|s|m|l|xl|xxl|2xl|3xl|3[2-9]|4[0-9]|5[0-2])$/i.test(p));
            const hasColor = parts.some(p => /^(noir|blanc|rouge|bleu|vert|jaune|rose|gris|marron|violet|orange|beige|dor[ée]|argent[ée]|gold|silver|black|white|red|blue|green|yellow|pink|grey|gray|brown|purple)$/i.test(p));
            if (hasSize && hasColor) return true;
            if (hasSize && parts.length > 1) return true;
        }
        return false;
    };

    // Computed display option groups (combines product-specific groups and all global platform groups, deduplicated by code)
    const displayOptionGroups = useMemo(() => {
        const groupMap = new Map<string, OptionGroupDef>();

        const filterCleanOptions = (opts: any[]) => {
            return (opts || []).filter((o: any) => o && o.name && !isNoisyCompositeOption(o.name));
        };

        // 1. First populate with all global platform option groups (Couleur, Taille, Pointure, Capacité, etc.)
        for (const g of globalOptionGroups) {
            const normCode = (g.code || g.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')).trim();
            groupMap.set(normCode, {
                id: String(g.id || normCode),
                code: normCode,
                name: g.name,
                options: filterCleanOptions(g.options || [])
            });
        }

        // 2. Overlay / merge product's specific option groups & options
        if (productDetails?.optionGroups && productDetails.optionGroups.length > 0) {
            for (const og of productDetails.optionGroups) {
                const normCode = (og.code || og.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')).trim();
                const existing = groupMap.get(normCode);
                
                const cleanProductOpts = filterCleanOptions(og.options || []);
                const existingOptNames = new Set((existing?.options || []).map((o: any) => o.name.toLowerCase().trim()));
                const mergedOptions = [...(existing?.options || [])];
                
                for (const pOpt of cleanProductOpts) {
                    if (!existingOptNames.has(pOpt.name.toLowerCase().trim())) {
                        mergedOptions.push(pOpt);
                        existingOptNames.add(pOpt.name.toLowerCase().trim());
                    }
                }

                groupMap.set(normCode, {
                    id: String(og.id || existing?.id || normCode),
                    code: normCode,
                    name: og.name || existing?.name || normCode,
                    options: mergedOptions,
                });
            }
        }

        return sortOptionGroupsByCanonicalOrder(Array.from(groupMap.values()));
    }, [globalOptionGroups, productDetails]);

    // Step 2 Option Groups Selection & Value Handlers
    const toggleOptionGroup = (groupId: string) => {
        setSelectedGroupIds(prev => {
            if (prev.includes(groupId)) {
                const next = prev.filter(id => id !== groupId);
                setGroupValuesMap(valMap => {
                    const copy = { ...valMap };
                    delete copy[groupId];
                    return copy;
                });
                return next;
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

    // Step 2 -> Step 3: Generate Combinations with strict anti-permutation & anti-duplication
    const handleGenerateCombinations = () => {
        // Gather all selected groups that have at least one value
        const activeGroups: { id: string; name: string; code: string; values: string[] }[] = [];

        // 1. Standard / Product Option Groups
        for (const gId of selectedGroupIds) {
            const vals = groupValuesMap[gId] || [];
            if (vals.length > 0) {
                const found = displayOptionGroups.find(g => String(g.id) === String(gId) || g.code === gId);
                const groupName = found?.name || gId;
                const groupCode = found?.code || gId.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                // Deduplicate values within the group
                const cleanVals: string[] = Array.from(new Set(vals.map((v: string) => v.trim()).filter(Boolean)));
                if (cleanVals.length > 0) {
                    activeGroups.push({ id: gId, name: groupName, code: groupCode, values: cleanVals });
                }
            }
        }

        // 2. Custom groups
        for (const cg of customGroups) {
            const vals = groupValuesMap[cg.id] || [];
            const cleanVals: string[] = Array.from(new Set(vals.map((v: string) => v.trim()).filter(Boolean)));
            if (cg.name.trim() && cleanVals.length > 0) {
                activeGroups.push({
                    id: cg.id,
                    name: cg.name.trim(),
                    code: cg.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                    values: cleanVals
                });
            }
        }

        // Deterministically sort option groups by canonical priority (Taille -> Pointure -> Capacité -> Couleur -> Matière...)
        const sortedActiveGroups = sortOptionGroupsByCanonicalOrder(activeGroups);

        // If no option groups, generate 1 single standard variant offer
        if (activeGroups.length === 0) {
            const singleRow: GeneratedVariantRow = {
                id: productDetails?.variants?.[0]?.id || `var_${Date.now()}`,
                key: 'single',
                enabled: true,
                name: productDetails?.name || 'Standard',
                optionValues: [],
                price: bulkPrice ? Number(bulkPrice) : 0,
                stock: bulkStock ? Number(bulkStock) : 0,
                sku: `OFFER-${productDetails?.id || Date.now()}`,
                onPromotion: false,
                promotionalPrice: 0,
                featuredAssetId: productDetails?.featuredAsset?.id,
                assetPreview: productDetails?.featuredAsset?.preview,
                deliveryTimeValue: 2,
                deliveryTimeUnit: 'h',
                condition: bulkCondition || 'NEW',
            };
            setGeneratedVariants([singleRow]);
            setActiveAffiliateTab('active');
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

        const rawCombinations = cartesian(sortedActiveGroups.map(g => g.values));

        // Strict anti-permutation deduplication (e.g. Yellow + XL vs XL + Yellow)
        const seenCanonicalKeys = new Set<string>();
        const uniqueCombinations: string[][] = [];

        for (const comb of rawCombinations) {
            const canonicalKey = comb.map(c => c.trim().toLowerCase()).sort().join(':::');
            if (!seenCanonicalKeys.has(canonicalKey)) {
                seenCanonicalKeys.add(canonicalKey);
                uniqueCombinations.push(comb);
            }
        }

        const rows: GeneratedVariantRow[] = uniqueCombinations.map((combo, idx) => {
            const comboCanonicalKey = combo.map(c => c.trim().toLowerCase()).sort().join(':::');
            const optionPairs = combo.map((val, gIdx) => ({
                groupName: sortedActiveGroups[gIdx].name,
                optName: val,
            }));

            const explicitOptionsStr = optionPairs.map(op => `${op.groupName} : ${op.optName}`).join(' - ');
            const comboName = productDetails?.name ? `${productDetails.name} - ${explicitOptionsStr}` : explicitOptionsStr;
            const comboKey = combo.join('-');

            // Match with existing product variant in Vendure canonically
            const existingVariant = (productDetails?.variants || []).find((pv: any) => {
                const pvOptionNames = (pv.options || []).map((o: any) => (o.name || o.code || '').toLowerCase().trim()).sort().join(':::');
                return pvOptionNames === comboCanonicalKey;
            });

            // Match with previously configured row if seller regenerates
            const previousRow = generatedVariants.find(r => {
                const rCanonicalKey = (r.optionValues || []).map(ov => ov.optName.trim().toLowerCase()).sort().join(':::');
                return rCanonicalKey === comboCanonicalKey;
            });

            return {
                id: existingVariant ? String(existingVariant.id) : (previousRow?.id || `combo_${idx}_${Date.now()}`),
                key: comboKey,
                // If previously customized, retain enabled status; otherwise start enabled
                enabled: previousRow ? previousRow.enabled : true,
                name: comboName,
                optionValues: optionPairs,
                price: previousRow ? previousRow.price : (bulkPrice ? Number(bulkPrice) : 0),
                stock: previousRow ? previousRow.stock : (bulkStock ? Number(bulkStock) : 0),
                sku: previousRow?.sku || `OFFER-${idx + 1}`,
                onPromotion: previousRow?.onPromotion || false,
                promotionalPrice: previousRow?.promotionalPrice || 0,
                featuredAssetId: previousRow?.featuredAssetId || existingVariant?.featuredAsset?.id || undefined,
                assetPreview: previousRow?.assetPreview || existingVariant?.featuredAsset?.preview || undefined,
                deliveryTimeValue: previousRow?.deliveryTimeValue || 2,
                deliveryTimeUnit: previousRow?.deliveryTimeUnit || 'h',
                condition: previousRow?.condition || bulkCondition || 'NEW',
            };
        });

        setGeneratedVariants(rows);
        setActiveAffiliateTab('active');
        setStep(3);
        toast.success(`${rows.length} combinaison(s) générée(s) sans aucun doublon !`);
    };

    // Bulk Apply Values to All Active Combinations
    const handleApplyBulkSettings = () => {
        if (!bulkPrice && !bulkStock) return;
        if (bulkPrice && Number(bulkPrice) < minPrice) {
            toast.error(`Le prix groupé doit être au minimum de ${minPrice} FCFA.`);
            return;
        }
        if (bulkStock && Number(bulkStock) < minStock) {
            toast.error(`Le stock groupé doit être au minimum de ${minStock} unité(s).`);
            return;
        }

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
    const [cropState, setCropState] = useState<{
        variantKey: string;
        imageSrc: string;
        file: File;
    } | null>(null);

    const handleVariantFileChange = async (key: string, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            toast.error('Veuillez sélectionner un fichier image valide');
            return;
        }

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
                toast.success('Photo ajoutée avec succès !');
            } else {
                toast.error('Erreur upload: ' + (res.error || 'Impossible d’envoyer le fichier'));
            }
        } catch (err: any) {
            console.error('Error uploading variant image:', err);
            toast.error('Erreur lors de l\'envoi de la photo');
        } finally {
            setUploadingVariantKey(null);
            e.target.value = '';
        }
    };

    const handleCropComplete = async (croppedBlob: Blob) => {
        if (!cropState) return;
        const key = cropState.variantKey;
        setUploadingVariantKey(key);
        setCropState(null);

        try {
            const croppedFile = new File([croppedBlob], `variant-${Date.now()}.jpg`, { type: 'image/jpeg' });
            const formData = new FormData();
            formData.append('file', croppedFile);
            const res = await uploadFileAction(formData);
            if (res.success && res.asset) {
                setGeneratedVariants(prev => prev.map(row => row.key === key ? {
                    ...row,
                    featuredAssetId: res.asset.id,
                    assetPreview: res.asset.preview
                } : row));
                toast.success('Photo de la déclinaison recadrée et mise à jour !');
            } else {
                toast.error('Erreur upload: ' + (res.error || 'Impossible d’envoyer le fichier'));
            }
        } catch (err: any) {
            console.error('Error uploading variant image:', err);
            toast.error('Erreur lors du recadrage de l\'image');
        } finally {
            setUploadingVariantKey(null);
        }
    };

    // Add missing variant handler with anti-duplication check
    const handleAddMissingVariantRow = () => {
        if (!productDetails) return;
        const optionPairs = Object.entries(missingVariantValues)
            .filter(([_, optVal]) => Boolean(optVal && (optVal as string).trim()))
            .map(([groupName, optVal]) => ({
                groupName,
                optName: (optVal as string).trim(),
            }));

        if (optionPairs.length === 0) {
            toast.error("Veuillez préciser au moins une option (ex: Taille ou Couleur) pour cette variante.");
            return;
        }

        // Strict anti-duplication check against existing generated variants
        const newCanonicalKey = optionPairs.map(op => op.optName.trim().toLowerCase()).sort().join(':::');
        const duplicateExists = generatedVariants.some(v => {
            const vCanon = (v.optionValues || []).map(ov => ov.optName.trim().toLowerCase()).sort().join(':::');
            return vCanon === newCanonicalKey;
        });
        if (duplicateExists) {
            toast.warning("Une déclinaison avec exactement ces mêmes options existe déjà parmi vos déclinaisons !");
            return;
        }

        const priceVal = missingVariantPrice ? Number(missingVariantPrice) : (bulkPrice ? Number(bulkPrice) : 0);
        if (priceVal < minPrice) {
            toast.error(`Veuillez indiquer un prix valide (au minimum ${minPrice} FCFA).`);
            return;
        }

        const stockVal = missingVariantStock ? Number(missingVariantStock) : (bulkStock ? Number(bulkStock) : minStock);
        if (stockVal < minStock) {
            toast.error(`Veuillez indiquer un stock valide (au minimum ${minStock} unité(s)).`);
            return;
        }

        const variantName = `${productDetails.name} ${optionPairs.map(op => op.optName).join(' ')}`;
        const newRowKey = `custom_${Date.now()}`;
        const newRow: GeneratedVariantRow = {
            id: newRowKey,
            key: newRowKey,
            enabled: true,
            name: variantName,
            optionValues: optionPairs,
            price: priceVal,
            stock: stockVal,
            sku: `OFFER-NEW-${Date.now().toString().slice(-4)}`,
            onPromotion: false,
            promotionalPrice: 0,
            featuredAssetId: productDetails.featuredAsset?.id,
            assetPreview: productDetails.featuredAsset?.preview,
            deliveryTimeValue: 2,
            deliveryTimeUnit: 'h',
            condition: bulkCondition || 'NEW',
        };

        // Also register any new option value in groupValuesMap
        setGroupValuesMap(prev => {
            const next = { ...prev };
            for (const pair of optionPairs) {
                const matchedGroup = displayOptionGroups.find(g => g.name.toLowerCase() === pair.groupName.toLowerCase());
                if (matchedGroup) {
                    const existingVals = next[matchedGroup.id] || [];
                    if (!existingVals.includes(pair.optName)) {
                        next[matchedGroup.id] = [...existingVals, pair.optName];
                    }
                }
            }
            return next;
        });

        setGeneratedVariants(prev => [...prev, newRow]);
        setIsAddingMissingVariant(false);
        setMissingVariantValues({});
        setMissingVariantPrice('');
        setMissingVariantStock('');
        toast.success(`Variante "${variantName}" ajoutée à vos offres !`);
    };

    // Step 3: Submit Offers Bundle
    const handleSubmitAllOffers = async (e: React.FormEvent) => {
        e.preventDefault();

        const activeRows = generatedVariants.filter(v => v.enabled);
        if (activeRows.length === 0) {
            toast.error('Veuillez activer au moins une combinaison pour votre offre.');
            return;
        }

        // Validate prices & stocks
        for (const row of activeRows) {
            if (!row.price || row.price < minPrice) {
                toast.error(`Le prix de la déclinaison "${row.name}" (${row.price || 0} F) doit être au minimum de ${minPrice} FCFA.`);
                return;
            }
            if (row.stock === undefined || row.stock === null || row.stock < minStock) {
                toast.error(`Le stock de la déclinaison "${row.name}" (${row.stock || 0}) doit être au minimum de ${minStock} unité(s).`);
                return;
            }
            if (row.onPromotion) {
                if (!row.promotionalPrice || row.promotionalPrice < minPrice) {
                    toast.error(`Le prix promotionnel pour "${row.name}" doit être au minimum de ${minPrice} FCFA.`);
                    return;
                }
                if (row.promotionalPrice >= row.price) {
                    toast.error(`Le prix promotionnel (${row.promotionalPrice} F) doit être inférieur au prix normal (${row.price} F) pour: ${row.name}`);
                    return;
                }
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

            // Prepare offers payload - includes variantId when matching an existing official variant
            const offersPayload = activeRows.map(row => ({
                variantId: (row.id && /^\d+$/.test(String(row.id))) ? row.id : undefined,
                name: row.name,
                optionNames: row.optionValues.map(o => o.optName),
                optionCodes: row.optionValues.map(o => o.optName.toLowerCase().replace(/[^a-z0-9]+/g, '-')),
                sku: row.sku || undefined,
                price: Math.round(Number(priceToSubunit(row.price)) || 0),
                stock: Math.round(Number(row.stock) || 0),
                onPromotion: row.onPromotion,
                promotionalPrice: row.onPromotion ? Math.round(Number(priceToSubunit(row.promotionalPrice)) || 0) : undefined,
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

            setGeneratedVariants(prev => prev.map(v => ({ ...v, rejectionReason: null })));
            toast.success(`Vos ${offersPayload.length} offre(s) ont été greffées au produit avec succès !`);
            window.location.href = '/dashboard/products';
        } catch (err: any) {
            console.error('[AffiliatePage] Submission failed:', err);
            toast.error('Erreur lors de la soumission de vos offres: ' + err.message);
        } finally {
            setIsSubmittingOffers(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-24 animate-in fade-in duration-500">
            <LocationRequiredModal />
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
                <div className="flex items-center gap-3 sm:gap-4">
                    <Link href="/dashboard/products" className="p-2 sm:p-2.5 rounded-xl border border-border bg-card hover:bg-muted text-muted-foreground transition-all cursor-pointer">
                        <ArrowLeft className="w-4 h-4" />
                    </Link>
                    <div>
                        <h1 className="text-xl sm:text-2xl md:text-3xl font-serif font-black tracking-tight text-foreground">
                            Vendre un Article Existant
                        </h1>
                        <p className="text-[11px] sm:text-xs text-muted-foreground font-medium mt-0.5">
                            Recherchez l'article dans le catalogue Ahizan et indiquez vos prix et stocks.
                        </p>
                    </div>
                </div>

                {/* Step Indicators - Responsive */}
                <div className="flex items-center gap-1.5 sm:gap-2 bg-muted/40 p-1 sm:p-1.5 rounded-xl sm:rounded-2xl border border-border w-full sm:w-auto justify-between sm:justify-start">
                    <span className={cn("px-2.5 sm:px-3 py-1 rounded-lg sm:rounded-xl text-[10px] font-black uppercase tracking-wider transition-all", step === 1 ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground")}>
                        1. Recherche
                    </span>
                    <span className="text-muted-foreground/40 text-xs">➔</span>
                    <span className={cn("px-2.5 sm:px-3 py-1 rounded-lg sm:rounded-xl text-[10px] font-black uppercase tracking-wider transition-all", step === 2 ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground")}>
                        2. Options
                    </span>
                    <span className="text-muted-foreground/40 text-xs">➔</span>
                    <span className={cn("px-2.5 sm:px-3 py-1 rounded-lg sm:rounded-xl text-[10px] font-black uppercase tracking-wider transition-all", step === 3 ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground")}>
                        3. Tarifs
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

                    {/* Interactive Search Bar with instant debounce */}
                    <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2.5 sm:gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3.5 sm:left-4 top-1/2 -translate-y-1/2 w-4 sm:w-5 h-4 sm:h-5 text-muted-foreground" />
                            <Input
                                type="text"
                                placeholder="Tapez un nom de produit (ex: Cactus, Robe, Chaussures, Sac...)"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="pl-10 sm:pl-12 pr-10 h-11 sm:h-13 rounded-xl sm:rounded-2xl bg-muted/20 border-border focus-visible:ring-2 focus-visible:ring-primary/20 text-xs sm:text-sm font-semibold"
                            />
                            {searchTerm && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSearchTerm('');
                                        setSearchResults([]);
                                    }}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-muted/80 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center text-xs transition-colors cursor-pointer"
                                    title="Effacer la recherche"
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                        <Button
                            type="submit"
                            disabled={isSearching}
                            className="h-11 sm:h-13 px-6 sm:px-8 rounded-xl sm:rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-sm sm:shadow-md shrink-0 flex items-center justify-center gap-1.5"
                        >
                            {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                                <>
                                    <Search className="w-4 h-4 sm:hidden" />
                                    <span>Rechercher</span>
                                </>
                            )}
                        </Button>
                    </form>

                    {/* Results Container */}
                    {isSearching ? (
                        <div className="flex flex-col items-center justify-center py-16 space-y-3 text-muted-foreground">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            <p className="text-xs font-bold uppercase tracking-widest">Recherche en direct dans le catalogue central Ahizan...</p>
                        </div>
                    ) : searchResults.length > 0 ? (
                        <div className="space-y-5 pt-2">
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
                                <div>
                                    <span className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                                        <Sparkles className="w-4 h-4 text-primary" />
                                        <span>{searchResults.length} produit(s) trouvé(s) dans le catalogue central</span>
                                    </span>
                                    <p className="text-[11px] text-muted-foreground mt-0.5">
                                        Cliquez sur une déclinaison existante pour la vendre directement, ou créez une nouvelle option si la vôtre n'est pas encore listée.
                                    </p>
                                </div>
                            </div>

                            {/* Product Families & Direct Ready-to-Sell Articles Grid */}
                            <div className="space-y-4">
                                {searchResults.map((prod: any) => {
                                    const variants = prod.variants || [];
                                    const hasSingleVariant = variants.length <= 1;

                                    if (hasSingleVariant) {
                                        const v = variants[0];
                                        const prodImg = v?.featuredAsset?.preview || prod.preview;
                                        return (
                                            <div
                                                key={prod.id}
                                                className="p-4 sm:p-6 rounded-3xl border border-border bg-card shadow-sm hover:border-primary/50 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                                            >
                                                <div className="flex items-center gap-4 min-w-0 flex-1">
                                                    {/* Large Clear Product Photo */}
                                                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-muted/40 border border-border/80 overflow-hidden shrink-0 flex items-center justify-center p-2 shadow-2xs">
                                                        {prodImg ? (
                                                            <img src={prodImg} alt={prod.name} className="w-full h-full object-contain" />
                                                        ) : (
                                                            <Package className="w-10 h-10 text-muted-foreground/40" />
                                                        )}
                                                    </div>
                                                    <div className="min-w-0 flex-1 space-y-1">
                                                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-primary/10 text-primary">
                                                            Modèle Officiel
                                                        </span>
                                                        <h3 className="font-black text-foreground text-sm sm:text-base leading-snug line-clamp-2" title={prod.name}>
                                                            {prod.name}
                                                        </h3>
                                                        {(!v?.sku || !v.sku.startsWith('OFFER-')) && (
                                                            <p className="text-[11px] text-muted-foreground font-mono">
                                                                Réf: {v?.sku || prod.slug}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto shrink-0 pt-2 sm:pt-0 border-t sm:border-0 border-border/40">
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        onClick={() => handleSelectProduct(prod, v?.id || null)}
                                                        className="h-11 sm:h-10 px-6 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-black cursor-pointer flex items-center justify-center gap-2 shadow-sm active:scale-95"
                                                    >
                                                        <span>Vendre cet article</span>
                                                        <ChevronRight className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleSelectProduct(prod, '__NEW_OPTION__')}
                                                        className="h-9 px-3 text-xs text-muted-foreground hover:text-primary font-bold flex items-center justify-center gap-1 cursor-pointer"
                                                        title="Ajouter une autre variante ou couleur non répertoriée"
                                                    >
                                                        <Plus className="w-3.5 h-3.5" />
                                                        <span>Autre déclinaison</span>
                                                    </Button>
                                                </div>
                                            </div>
                                        );
                                    }

                                    // Multi-variant product: Clean family container with large photos and subtle row dividers (no nested boxes)
                                    return (
                                        <div
                                            key={prod.id}
                                            className="rounded-3xl border border-border bg-card shadow-sm overflow-hidden hover:border-primary/40 transition-all"
                                        >
                                            {/* Product Family Header Banner */}
                                            <div className="p-4 sm:p-5 bg-muted/20 border-b border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                <div className="flex items-center gap-3.5 min-w-0">
                                                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-background border border-border/80 overflow-hidden shrink-0 flex items-center justify-center p-1.5 shadow-2xs">
                                                        {prod.preview ? (
                                                            <img src={prod.preview} alt={prod.name} className="w-full h-full object-contain" />
                                                        ) : (
                                                            <Package className="w-8 h-8 text-muted-foreground/40" />
                                                        )}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-primary/10 text-primary">
                                                            Modèle Officiel
                                                        </span>
                                                        <h3 className="font-black text-foreground text-sm sm:text-base line-clamp-1 mt-0.5" title={prod.name}>
                                                            {prod.name}
                                                        </h3>
                                                        <p className="text-xs text-muted-foreground font-semibold mt-0.5">
                                                            {variants.length} déclinaison(s) disponible(s) au catalogue
                                                        </p>
                                                    </div>
                                                </div>

                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleSelectProduct(prod, '__NEW_OPTION__')}
                                                    className="h-9 px-3.5 rounded-xl border-dashed border-primary/50 text-foreground hover:text-primary hover:border-primary text-xs font-bold shrink-0 cursor-pointer flex items-center gap-1.5 transition-all self-start sm:self-auto"
                                                    title="Vendre une autre variante / couleur / taille non répertoriée"
                                                >
                                                    <Plus className="w-3.5 h-3.5 text-primary" />
                                                    <span>Ajouter autre option</span>
                                                </Button>
                                            </div>

                                            {/* Clean visual list of variants separated by subtle dividers (NO nested boxes) */}
                                            <div className="divide-y divide-border/60 bg-card">
                                                {variants.map((v: any) => {
                                                    const optNames = (v.options || [])
                                                        .map((o: any) => o.name || o.code)
                                                        .filter(Boolean)
                                                        .join(' • ');
                                                    const articleTitle = optNames ? `${prod.name} – ${optNames}` : (v.name || prod.name);
                                                    const articleImg = v.featuredAsset?.preview || prod.preview;

                                                    return (
                                                        <div
                                                            key={v.id}
                                                            className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-muted/15 transition-colors group"
                                                        >
                                                            {/* Large Photo & Variant Specifics */}
                                                            <div className="flex items-center gap-4 min-w-0 flex-1">
                                                                <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-muted/40 border border-border/80 overflow-hidden shrink-0 flex items-center justify-center p-1.5 shadow-2xs group-hover:scale-102 transition-transform">
                                                                    {articleImg ? (
                                                                        <img src={articleImg} alt={articleTitle} className="w-full h-full object-contain" />
                                                                    ) : (
                                                                        <Package className="w-8 h-8 text-muted-foreground/40" />
                                                                    )}
                                                                </div>
                                                                <div className="min-w-0 flex-1 space-y-1">
                                                                    <div className="flex flex-wrap items-center gap-1.5">
                                                                        {(v.options || []).map((o: any) => (
                                                                            <span
                                                                                key={o.id || o.name}
                                                                                className="text-[10px] font-black px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20"
                                                                            >
                                                                                {o.group?.name ? `${o.group.name}: ` : ''}{o.name || o.code}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                    <h4 className="font-bold text-xs sm:text-sm text-foreground line-clamp-2 leading-snug" title={articleTitle}>
                                                                        {articleTitle}
                                                                    </h4>
                                                                    {v.sku && !v.sku.startsWith('OFFER-') && (
                                                                        <p className="text-[10px] text-muted-foreground font-mono">
                                                                            Réf: {v.sku}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* Action Button */}
                                                            <div className="w-full sm:w-auto shrink-0 pt-2 sm:pt-0">
                                                                <Button
                                                                    type="button"
                                                                    size="sm"
                                                                    onClick={() => handleSelectProduct(prod, v.id)}
                                                                    className="w-full sm:w-auto h-10 px-5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-black cursor-pointer flex items-center justify-center gap-2 shadow-2xs transition-all active:scale-95"
                                                                >
                                                                    <span>Vendre cet article</span>
                                                                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : searchTerm.trim() ? (
                        <div className="py-12 px-6 rounded-2xl border border-dashed border-border bg-muted/20 text-center space-y-3">
                            <div className="w-12 h-12 rounded-full bg-muted/60 flex items-center justify-center mx-auto text-xl">🔍</div>
                            <h3 className="text-sm font-black text-foreground">Aucun produit officiel trouvé pour « {searchTerm} »</h3>
                            <p className="text-xs text-muted-foreground max-w-md mx-auto">
                                Vous pouvez ajuster vos mots-clés ou proposer directement un nouveau produit au catalogue officiel Ahizan.
                            </p>
                            <Link href="/dashboard/products/new">
                                <Button size="sm" className="mt-2 rounded-xl text-xs font-bold cursor-pointer">
                                    ➕ Créer un nouveau produit
                                </Button>
                            </Link>
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
                    {/* Chosen Product Summary Card - Responsive & Airy */}
                    <div className="bg-card p-4 sm:p-5 rounded-3xl border border-border shadow-sm space-y-3">
                        <div className="flex items-start justify-between gap-3 sm:gap-4">
                            <div className="flex items-start gap-3.5 sm:gap-4 min-w-0 flex-1">
                                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-muted/40 border border-border overflow-hidden shrink-0 flex items-center justify-center p-1.5 shadow-2xs">
                                    {(productDetails?.featuredAsset?.preview || selectedProductSummary?.preview) ? (
                                        <img
                                            src={productDetails?.featuredAsset?.preview || selectedProductSummary?.preview}
                                            alt=""
                                            className="w-full h-full object-contain"
                                        />
                                    ) : (
                                        <Package className="w-8 h-8 text-muted-foreground/40" />
                                    )}
                                </div>
                                <div className="min-w-0 flex-1 space-y-1">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-primary px-2 py-0.5 rounded-md bg-primary/10 inline-block">
                                        Modèle sélectionné
                                    </span>
                                    <h2 className="text-sm sm:text-base font-black text-foreground leading-snug line-clamp-2 sm:line-clamp-none">
                                        {productDetails?.name || selectedProductSummary?.name}
                                    </h2>
                                    <p className="text-[11px] text-muted-foreground font-medium">
                                        Catégorie : {
                                            (() => {
                                                const rawCollections = productDetails?.collections || selectedProductSummary?.collections || [];
                                                const validNames = rawCollections
                                                    .map((c: any) => c.name)
                                                    .filter((n: string) => n && typeof n === 'string' && !n.includes('__root_') && n.toLowerCase() !== 'root');
                                                if (validNames.length > 0) return validNames.join(' › ');

                                                const summaryCat = selectedProductSummary?.category;
                                                if (summaryCat && typeof summaryCat === 'string' && !summaryCat.includes('__root_') && summaryCat.toLowerCase() !== 'root') {
                                                    return summaryCat;
                                                }
                                                return 'Catalogue Général';
                                            })()
                                        }
                                    </p>
                                </div>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setStep(1)}
                                className="rounded-xl text-xs font-bold cursor-pointer shrink-0 hidden sm:flex items-center gap-1.5"
                            >
                                Changer de produit
                            </Button>
                        </div>

                        {/* On mobile: clean full-width button to prevent squishing text */}
                        <div className="sm:hidden pt-2 border-t border-border/50">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setStep(1)}
                                className="w-full h-9 rounded-xl text-xs font-bold cursor-pointer flex items-center justify-center gap-1.5 text-muted-foreground hover:text-foreground"
                            >
                                ← Choisir un autre produit
                            </Button>
                        </div>
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
                                const isSelected = selectedGroupIds.includes(group.id);
                                const selectedValues = groupValuesMap[group.id] || [];

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

                        {/* Step 2 Bottom Actions: Responsive & Balanced */}
                        <div className="pt-6 border-t border-border flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setStep(1)}
                                className="h-11 sm:h-12 px-6 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
                            >
                                ← Retour aux résultats
                            </Button>
                            <Button
                                type="button"
                                onClick={handleGenerateCombinations}
                                className="h-11 sm:h-12 px-6 sm:px-8 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs uppercase tracking-wider shadow-lg shadow-primary/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
                            >
                                <Sparkles className="w-4 h-4" />
                                <span>Valider les options &amp; Continuer</span>
                                <ChevronRight className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </div>
                )
            )}

            {/* ── STEP 3: INTERACTIVE COMBINATIONS & OFFERS GRID ── */}
            {step === 3 && (
                <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300">
                    {/* Step 3 Header & Action Guidance Banner */}
                    <div className="bg-card p-4 sm:p-6 rounded-3xl border border-border shadow-sm space-y-4">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-primary/10 text-primary">
                                        {generatedVariants.length > 1 ? `${generatedVariants.length} déclinaisons` : 'Article sélectionné'}
                                    </span>
                                </div>
                                <h3 className="text-base sm:text-lg font-black text-foreground">
                                    {generatedVariants.length > 1 ? "Tarifs & Disponibilités par déclinaison" : "Indiquez votre prix et stock disponible"}
                                </h3>
                                <p className="text-xs text-muted-foreground max-w-xl">
                                    {generatedVariants.length > 1
                                        ? "Renseignez vos prix et quantités pour chaque déclinaison que vous possédez ci-dessous."
                                        : "Indiquez simplement votre prix de vente et la quantité en stock pour lancer votre offre."}
                                </p>
                            </div>

                            {/* Intuitive Redirection button if this is not the right variant */}
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setStep(2)}
                                className="w-full sm:w-auto h-10 px-4 rounded-xl text-xs font-bold border-dashed border-primary/50 text-foreground hover:text-primary hover:border-primary flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-2xs"
                                title="Si votre article a d'autres couleurs, tailles ou caractéristiques"
                            >
                                <SlidersHorizontal className="w-4 h-4 text-primary" />
                                <span>{generatedVariants.length > 1 ? "Modifier les caractéristiques" : "Pas votre déclinaison ? Choisir vos options"}</span>
                            </Button>
                        </div>

                        {/* Only show bulk parameters when there are multiple variants */}
                        {generatedVariants.length > 1 && (
                            <div className="pt-3 border-t border-border/60">
                                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-2">
                                    Paramétrage groupé (appliquer à toutes les {generatedVariants.length} déclinaisons) :
                                </span>
                                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                                    <div>
                                        <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Prix Vendeur (FCFA) - Min: {minPrice} F</Label>
                                        <Input
                                            type="number"
                                            min={minPrice}
                                            placeholder={`Ex: ${minPrice}`}
                                            value={bulkPrice}
                                            onChange={e => setBulkPrice(e.target.value)}
                                            className="h-10 sm:h-11 rounded-xl mt-1 font-bold"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Stock Disponible - Min: {minStock}</Label>
                                        <Input
                                            type="number"
                                            min={minStock}
                                            placeholder={`Ex: ${minStock}`}
                                            value={bulkStock}
                                            onChange={e => setBulkStock(e.target.value)}
                                            className="h-10 sm:h-11 rounded-xl mt-1 font-bold"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">État de l'Article</Label>
                                        <Select value={bulkCondition} onValueChange={setBulkCondition}>
                                            <SelectTrigger className="h-10 sm:h-11 rounded-xl mt-1 font-bold">
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
                                            className="w-full h-10 sm:h-11 rounded-xl bg-secondary text-secondary-foreground font-bold text-xs uppercase tracking-wider cursor-pointer"
                                        >
                                            Appliquer à tous
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ── STEP 3: TABS & SCROLLABLE BOX CONTAINER ── */}
                    <div className="space-y-4">
                        {/* 2 Tabs: Déclinaisons utilisées vs Déclinaisons brouillons */}
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-2 p-1.5 bg-muted/60 rounded-2xl border border-border/80">
                                <button
                                    type="button"
                                    onClick={() => { setActiveAffiliateTab('active'); setSelectedAffiliateKeys(new Set()); }}
                                    className={cn(
                                        "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer",
                                        activeAffiliateTab === 'active'
                                            ? "bg-primary text-primary-foreground shadow-sm"
                                            : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    <CheckCircle2 className="w-4 h-4" />
                                    <span>Déclinaisons utilisées</span>
                                    <span className={cn(
                                        "px-2 py-0.5 rounded-full text-[10px] font-black",
                                        activeAffiliateTab === 'active' ? "bg-primary-foreground/25 text-primary-foreground" : "bg-muted text-muted-foreground"
                                    )}>
                                        {activeVariants.length}
                                    </span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => { setActiveAffiliateTab('draft'); setSelectedAffiliateKeys(new Set()); }}
                                    className={cn(
                                        "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer",
                                        activeAffiliateTab === 'draft'
                                            ? "bg-primary text-primary-foreground shadow-sm"
                                            : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    <Clock className="w-4 h-4" />
                                    <span>Déclinaisons brouillons</span>
                                    <span className={cn(
                                        "px-2 py-0.5 rounded-full text-[10px] font-black",
                                        activeAffiliateTab === 'draft' ? "bg-primary-foreground/25 text-primary-foreground" : "bg-muted text-muted-foreground"
                                    )}>
                                        {draftVariants.length}
                                    </span>
                                </button>
                            </div>

                            <div className="text-xs text-muted-foreground font-medium">
                                Total: <strong className="text-foreground">{generatedVariants.length}</strong> déclinaison(s) disponible(s)
                            </div>
                        </div>

                        {/* Styled Box Container with Internal Search & Bulk Actions */}
                        <div className="rounded-3xl border border-border bg-card shadow-sm overflow-hidden flex flex-col">
                            {/* Box Header Toolbar */}
                            <div className="p-3.5 bg-muted/30 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-3">
                                {/* Search inside box */}
                                <div className="relative flex-1 max-w-sm">
                                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        type="text"
                                        placeholder="Filtrer par nom, option, SKU..."
                                        value={searchAffiliateFilter}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchAffiliateFilter(e.target.value)}
                                        className="pl-8 h-9 text-xs rounded-xl bg-background"
                                    />
                                    {searchAffiliateFilter && (
                                        <button
                                            type="button"
                                            onClick={() => setSearchAffiliateFilter('')}
                                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground p-0.5"
                                        >
                                            ✕
                                        </button>
                                    )}
                                </div>

                                {/* Selection & Bulk Actions Toolbar */}
                                <div className="flex items-center gap-2 flex-wrap">
                                    <div className="flex items-center gap-2 pr-3 border-r border-border">
                                        <Checkbox
                                            id="select-all-affiliate"
                                            checked={isAllSelectedInTab}
                                            onCheckedChange={handleToggleSelectAllInTab}
                                        />
                                        <label htmlFor="select-all-affiliate" className="text-xs font-bold text-foreground cursor-pointer select-none">
                                            Tout cocher ({tabFilteredVariants.length})
                                        </label>
                                    </div>

                                    {selectedAffiliateKeys.size > 0 && (
                                        <div className="flex items-center gap-1.5 animate-in fade-in duration-150">
                                            <span className="text-xs font-black text-primary px-1">
                                                {selectedAffiliateKeys.size} sél. :
                                            </span>

                                            {activeAffiliateTab === 'draft' ? (
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    onClick={handleBulkActivate}
                                                    className="h-8 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                                                >
                                                    <Check className="w-3.5 h-3.5" />
                                                    Activer
                                                </Button>
                                            ) : (
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={handleBulkDeactivate}
                                                    className="h-8 rounded-xl text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                                                >
                                                    <EyeOff className="w-3.5 h-3.5" />
                                                    Passer en brouillon
                                                </Button>
                                            )}

                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="outline"
                                                onClick={() => {
                                                    const val = window.prompt("Prix groupé (FCFA) pour la sélection :", bulkPrice || "");
                                                    if (val && Number(val) > 0) handleBulkSetPrice(Number(val));
                                                }}
                                                className="h-8 rounded-xl text-[11px] font-bold cursor-pointer"
                                            >
                                                Prix groupé
                                            </Button>

                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="outline"
                                                onClick={() => {
                                                    const val = window.prompt("Stock groupé pour la sélection :", bulkStock || "");
                                                    if (val !== null && !isNaN(Number(val))) handleBulkSetStock(Math.max(0, Number(val)));
                                                }}
                                                className="h-8 rounded-xl text-[11px] font-bold cursor-pointer"
                                            >
                                                Stock groupé
                                            </Button>

                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="ghost"
                                                onClick={handleBulkDelete}
                                                className="h-8 rounded-xl text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 text-[11px] font-bold p-2 cursor-pointer"
                                                title="Supprimer la sélection"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Scrollable Box Body with compact cards */}
                            <div className="p-4 max-h-[580px] overflow-y-auto space-y-3">
                                {tabFilteredVariants.length === 0 ? (
                                    <div className="py-12 flex flex-col items-center justify-center text-center space-y-2">
                                        <Package className="w-8 h-8 text-muted-foreground/50" />
                                        <p className="text-xs font-bold text-muted-foreground">
                                            {searchAffiliateFilter
                                                ? `Aucune déclinaison ne correspond au filtre "${searchAffiliateFilter}".`
                                                : activeAffiliateTab === 'active'
                                                    ? 'Aucune déclinaison activée pour le moment. Passez sur l\'onglet "Déclinaisons brouillons" pour en activer !'
                                                    : 'Aucune déclinaison en brouillon.'
                                            }
                                        </p>
                                        {activeAffiliateTab === 'active' && draftVariants.length > 0 && (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setActiveAffiliateTab('draft')}
                                                className="rounded-xl text-xs font-bold mt-2"
                                            >
                                                Voir les {draftVariants.length} déclinaisons brouillons
                                            </Button>
                                        )}
                                    </div>
                                ) : (
                                    tabFilteredVariants.map((row: GeneratedVariantRow) => {
                                        const isExpanded = expandedVariantKeys.has(row.key);
                                        const isSelected = selectedAffiliateKeys.has(row.key);

                                        return (
                                            <div
                                                key={row.key}
                                                className={cn(
                                                    "rounded-2xl border transition-all shadow-xs overflow-hidden",
                                                    row.enabled ? "bg-card border-border hover:border-primary/40" : "bg-muted/20 border-border/60 opacity-70"
                                                )}
                                            >
                                                {/* Admin Correction Notice if available */}
                                                {row.rejectionReason && (
                                                    <div className="bg-amber-500/15 border-b border-amber-500/30 text-amber-900 dark:text-amber-200 p-3 flex items-start gap-2 text-xs font-medium">
                                                        <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                                                        <div className="space-y-0.5">
                                                            <span className="font-bold uppercase tracking-wider text-[10px] text-amber-700 dark:text-amber-400 block">
                                                                Demande de correction de l'administrateur :
                                                            </span>
                                                            <p className="text-xs leading-relaxed">{row.rejectionReason}</p>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Compact Header Bar */}
                                                <div className="p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
                                                    {/* Left: Checkbox + Switch + Thumbnail + Title + Option Badges */}
                                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                                        <Checkbox
                                                            checked={isSelected}
                                                            onCheckedChange={() => toggleSelectVariantKey(row.key)}
                                                        />
                                                        <Switch
                                                            checked={row.enabled}
                                                            onCheckedChange={(checked: boolean) => handleUpdateVariantRow(row.key, 'enabled', checked)}
                                                            title={row.enabled ? "Désactiver cette déclinaison" : "Activer cette déclinaison"}
                                                        />
                                                        <div className="w-10 h-10 rounded-xl overflow-hidden bg-muted border border-border shrink-0 flex items-center justify-center">
                                                            {row.assetPreview ? (
                                                                <img src={row.assetPreview} alt={row.name} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <ImageIcon className="w-4 h-4 text-muted-foreground" />
                                                            )}
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex items-center gap-2">
                                                                <h4 className="font-black text-xs text-foreground truncate">
                                                                    {row.name}
                                                                </h4>
                                                                <span className={cn(
                                                                    "text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0",
                                                                    row.enabled ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" : "bg-muted text-muted-foreground"
                                                                )}>
                                                                    {row.enabled ? "Active" : "Brouillon"}
                                                                </span>
                                                            </div>
                                                            <div className="flex flex-wrap gap-1 mt-1">
                                                                {row.optionValues.map((ov: any) => (
                                                                    <span key={ov.groupName} className="text-[9px] font-bold bg-primary/10 text-primary px-2 py-0.2 rounded-md border border-primary/20">
                                                                        {ov.groupName}: <strong>{ov.optName}</strong>
                                                                    </span>
                                                                ))}
                                                                {row.sku && (
                                                                    <span className="text-[9px] font-mono text-muted-foreground bg-muted px-1.5 py-0.2 rounded">
                                                                        {row.sku}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Right: Quick Price + Quick Stock + Action Buttons */}
                                                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-2 shrink-0 pt-2.5 sm:pt-0 border-t border-border/50 sm:border-0 w-full md:w-auto">
                                                        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
                                                            <div className="sm:w-28">
                                                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block sm:hidden mb-1">Prix (FCFA)</span>
                                                                <div className="relative">
                                                                    <Input
                                                                        type="number"
                                                                        min={minPrice}
                                                                        placeholder={`Min ${minPrice} F`}
                                                                        value={row.price || ''}
                                                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleUpdateVariantRow(row.key, 'price', Number(e.target.value))}
                                                                        className="h-9 sm:h-8 text-xs font-black rounded-xl pr-6 bg-background w-full"
                                                                    />
                                                                    <span className="text-[9px] font-bold text-muted-foreground absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">F</span>
                                                                </div>
                                                            </div>
                                                            <div className="sm:w-24">
                                                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block sm:hidden mb-1">Stock</span>
                                                                <Input
                                                                    type="number"
                                                                    min={minStock}
                                                                    placeholder={`Min ${minStock}`}
                                                                    value={row.stock || ''}
                                                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleUpdateVariantRow(row.key, 'stock', Math.max(0, Number(e.target.value) || 0))}
                                                                    className="h-9 sm:h-8 text-xs font-bold rounded-xl bg-background w-full"
                                                                />
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center justify-end gap-1.5 shrink-0">
                                                            {!row.enabled ? (
                                                                <Button
                                                                    type="button"
                                                                    size="sm"
                                                                    onClick={() => {
                                                                        const hasPrice = row.price && Number(row.price) > 0;
                                                                        const hasStock = row.stock !== undefined && row.stock !== null && Number(row.stock) > 0;

                                                                        if (hasPrice && !hasStock) {
                                                                            toast.error(`Veuillez entrer le stock de la déclinaison "${row.name}" ou effacer son prix pour l'enlever de la liste.`);
                                                                            return;
                                                                        }
                                                                        if (!hasPrice && hasStock) {
                                                                            toast.error(`Veuillez entrer le prix de la déclinaison "${row.name}" ou effacer son stock pour l'enlever de la liste.`);
                                                                            return;
                                                                        }
                                                                        if (!hasPrice && !hasStock) {
                                                                            toast.error(`Veuillez renseigner le prix et le stock de la déclinaison "${row.name}" avant de l'enregistrer.`);
                                                                            return;
                                                                        }
                                                                        if (Number(row.price) < minPrice) {
                                                                            toast.error(`Le prix de "${row.name}" (${row.price} F) doit être au minimum de ${minPrice} FCFA.`);
                                                                            return;
                                                                        }
                                                                        if (Number(row.stock) < minStock) {
                                                                            toast.error(`Le stock de "${row.name}" (${row.stock}) doit être au minimum de ${minStock} unité(s).`);
                                                                            return;
                                                                        }
                                                                        if (row.onPromotion) {
                                                                            if (!row.promotionalPrice || Number(row.promotionalPrice) <= 0) {
                                                                                toast.error(`Veuillez renseigner le prix promotionnel pour "${row.name}".`);
                                                                                return;
                                                                            }
                                                                            if (Number(row.promotionalPrice) < minPrice) {
                                                                                toast.error(`Le prix promo de "${row.name}" doit être au minimum de ${minPrice} FCFA.`);
                                                                                return;
                                                                            }
                                                                            if (Number(row.promotionalPrice) >= Number(row.price)) {
                                                                                toast.error(`Le prix promo (${row.promotionalPrice} F) doit être inférieur au prix normal (${row.price} F) pour "${row.name}".`);
                                                                                return;
                                                                            }
                                                                        }
                                                                        handleUpdateVariantRow(row.key, 'enabled', true);
                                                                        toast.success(`"${row.name}" activée et ajoutée à vos offres !`);
                                                                    }}
                                                                    className="h-9 sm:h-8 px-3 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1 cursor-pointer flex-1 sm:flex-none justify-center"
                                                                    title="Activer cette déclinaison pour la vente"
                                                                >
                                                                    <Check className="w-3.5 h-3.5" />
                                                                    <span>Activer</span>
                                                                </Button>
                                                            ) : (
                                                                <Button
                                                                    type="button"
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    onClick={() => {
                                                                        handleUpdateVariantRow(row.key, 'enabled', false);
                                                                        toast.info(`"${row.name}" passée en brouillon.`);
                                                                    }}
                                                                    className="h-9 sm:h-8 px-2.5 rounded-xl text-xs font-bold text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer"
                                                                    title="Passer en brouillon"
                                                                >
                                                                    <EyeOff className="w-3.5 h-3.5" />
                                                                    <span className="inline">Brouillon</span>
                                                                </Button>
                                                            )}

                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => toggleExpandVariantKey(row.key)}
                                                                className="h-9 w-9 sm:h-8 sm:w-8 p-0 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                                                                title={isExpanded ? "Replier les détails" : "Déplier les détails"}
                                                            >
                                                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Expanded Details Section */}
                                                {isExpanded && (
                                                    <div className="p-4 bg-muted/15 border-t border-border/60 space-y-4 animate-in fade-in duration-150">
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                                                            {/* Variant Custom Photo */}
                                                            <div>
                                                                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">
                                                                    Photo de la déclinaison
                                                                </Label>
                                                                <div className="flex items-center gap-2">
                                                                    <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-muted border border-border shrink-0 flex items-center justify-center">
                                                                        {row.assetPreview ? (
                                                                            <img src={row.assetPreview} alt={row.name} className="w-full h-full object-cover" />
                                                                        ) : (
                                                                            <ImageIcon className="w-5 h-5 text-muted-foreground" />
                                                                        )}
                                                                        {uploadingVariantKey === row.key && (
                                                                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                                                                <Loader2 className="w-4 h-4 animate-spin text-white" />
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    <div className="flex flex-col gap-1">
                                                                        <label className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-card hover:bg-muted text-[11px] font-bold text-foreground border border-border shadow-xs cursor-pointer transition-colors">
                                                                            <Camera className="w-3.5 h-3.5 text-primary" />
                                                                            <span>{row.featuredAssetId ? 'Changer' : 'Ajouter'}</span>
                                                                            <input
                                                                                type="file"
                                                                                accept="image/*"
                                                                                className="hidden"
                                                                                disabled={uploadingVariantKey === row.key}
                                                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleVariantFileChange(row.key, e)}
                                                                            />
                                                                        </label>
                                                                        {row.assetPreview && (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    setCropState({
                                                                                        variantKey: row.key,
                                                                                        imageSrc: row.assetPreview!,
                                                                                        file: new File([], 'variant.jpg')
                                                                                    });
                                                                                }}
                                                                                className="text-[10px] text-primary hover:underline font-bold text-left cursor-pointer"
                                                                            >
                                                                                ✂️ Recadrer
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Condition */}
                                                            <div>
                                                                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                                                    État de l'article
                                                                </Label>
                                                                <Select
                                                                    value={row.condition}
                                                                    onValueChange={(val: string) => handleUpdateVariantRow(row.key, 'condition', val)}
                                                                >
                                                                    <SelectTrigger className="h-10 rounded-xl font-bold text-xs mt-1 bg-card">
                                                                        <SelectValue />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="NEW">Neuf</SelectItem>
                                                                        <SelectItem value="USED">Occasion</SelectItem>
                                                                        <SelectItem value="REFURBISHED">Reconditionné</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>

                                                            {/* SKU */}
                                                            <div>
                                                                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                                                    SKU Vendeur
                                                                </Label>
                                                                <Input
                                                                    type="text"
                                                                    value={row.sku}
                                                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleUpdateVariantRow(row.key, 'sku', e.target.value)}
                                                                    className="h-10 rounded-xl font-mono text-xs mt-1 bg-card"
                                                                    placeholder="SKU-OFFER"
                                                                />
                                                            </div>
                                                        </div>

                                                        {/* Promotion Box */}
                                                        <div className={cn(
                                                            "p-3.5 rounded-2xl border transition-all flex flex-col justify-between gap-2.5",
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
                                                                            Activer une promotion sur cette déclinaison
                                                                        </Label>
                                                                        <span className="text-[10px] text-muted-foreground">
                                                                            Appliquer un prix réduit et attirer plus de clients
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                                <Switch
                                                                    checked={row.onPromotion}
                                                                    onCheckedChange={(checked: boolean) => handleUpdateVariantRow(row.key, 'onPromotion', checked)}
                                                                />
                                                            </div>

                                                            {row.onPromotion && (
                                                                <div className="space-y-2 pt-1 animate-in fade-in duration-200">
                                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-center">
                                                                        <div>
                                                                            <Label className="text-[10px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider">
                                                                                Prix Soldé (FCFA) *
                                                                            </Label>
                                                                            <Input
                                                                                type="number"
                                                                                min="1"
                                                                                placeholder="Ex: 12000"
                                                                                value={row.promotionalPrice || ''}
                                                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleUpdateVariantRow(row.key, 'promotionalPrice', Number(e.target.value))}
                                                                                className="h-10 rounded-xl font-black text-sm text-rose-600 bg-card border-rose-200 dark:border-rose-900/50 mt-1"
                                                                            />
                                                                        </div>
                                                                        {row.price && row.promotionalPrice && row.promotionalPrice < row.price ? (
                                                                            <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 space-y-0.5">
                                                                                <div className="text-[11px] font-black flex items-center justify-between">
                                                                                    <span>Remise : -{Math.round(((row.price - row.promotionalPrice) / row.price) * 100)}%</span>
                                                                                    <span className="line-through text-muted-foreground text-[10px]">{row.price.toLocaleString('fr-FR')} F</span>
                                                                                </div>
                                                                                <p className="text-[10px] font-semibold text-rose-600 dark:text-rose-400">
                                                                                    Économie client : {(row.price - row.promotionalPrice).toLocaleString('fr-FR')} FCFA
                                                                                </p>
                                                                            </div>
                                                                        ) : (
                                                                            <p className="text-[10px] text-muted-foreground italic">
                                                                                Indiquez un montant inférieur au prix normal ({row.price || 0} FCFA).
                                                                            </p>
                                                                        )}
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

                        {/* Action Buttons directly below the Box */}
                        <div className="pt-2 flex flex-col sm:flex-row justify-between items-center gap-3">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setStep(2)}
                                className="h-12 px-6 rounded-2xl text-xs font-bold uppercase tracking-wider cursor-pointer"
                            >
                                ← Retour aux options
                            </Button>

                            <Button
                                type="button"
                                onClick={(e: any) => handleSubmitAllOffers(e)}
                                disabled={isSubmittingOffers || activeVariants.length === 0}
                                className="h-12 px-8 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs uppercase tracking-widest shadow-lg shadow-primary/25 flex items-center gap-2 cursor-pointer transition-all active:scale-95"
                            >
                                {isSubmittingOffers ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <CheckCircle2 className="w-5 h-5" />
                                )}
                                <span>Envoyer mon offre ({activeVariants.length} active{activeVariants.length > 1 ? 's' : ''})</span>
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Variant Image Crop Modal */}
            {cropState && (
                <ImageCropModal
                    isOpen={!!cropState}
                    imageSrc={cropState.imageSrc}
                    onClose={() => setCropState(null)}
                    onCropComplete={handleCropComplete}
                    onSkipCropping={() => {
                        const file = cropState.file;
                        handleCropComplete(file);
                    }}
                />
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
