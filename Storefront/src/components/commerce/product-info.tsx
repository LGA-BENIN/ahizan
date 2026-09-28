'use client';

import {useState, useMemo, useTransition, useEffect} from 'react';
import Link from 'next/link';
import {usePathname, useRouter, useSearchParams} from 'next/navigation';
import {Button} from '@/components/ui/button';
import {Label} from '@/components/ui/label';
import {RadioGroup, RadioGroupItem} from '@/components/ui/radio-group';
import {ShoppingCart, CheckCircle2, Share2, Facebook, MessageCircle, Twitter, Copy, Minus, Plus, Star, Clock, Store, BadgeCheck} from 'lucide-react';
import {addToCart, getSellerOffersForProductVariants} from '@/app/(storefront)/product/[slug]/actions';
import {toast} from 'sonner';
import {Price} from '@/components/commerce/price';
import { getPromoPriceInfo } from "@/lib/vendure/api-utils";
import { useThemeSettings } from "@/components/providers/theme-provider";
import { ProductMobileFixedBar } from './product-mobile-fixed-bar';
import { encodeId } from '@/lib/hash-utils';

interface ProductInfoProps {
    product: {
        id: string;
        name: string;
        description: string;
        variants: Array<{
            id: string;
            name: string;
            sku: string;
            priceWithTax: number;
            stockLevel: string;
            options: Array<{
                id: string;
                code: string;
                name: string;
                groupId: string;
                group: {
                    id: string;
                    code: string;
                    name: string;
                };
            }>;
            customFields?: any;
        }>;
        collections?: Array<{
            id: string;
            name: string;
            slug: string;
            parent?: {
                id: string;
            } | null;
        }>;
        optionGroups: Array<{
            id: string;
            code: string;
            name: string;
            options: Array<{
                id: string;
                code: string;
                name: string;
            }>;
        }>;
        customFields?: {
            shortDescription?: string;
            weight?: number;
            width?: number;
            height?: number;
            vendor?: any;
        } | null;
    };
    searchParams: { [key: string]: string | string[] | undefined };
    config?: any;
    whatsappNumber?: string;
    allOffers?: any[];
}

export function ProductInfo({product, searchParams, config, whatsappNumber, allOffers}: ProductInfoProps) {
    const pathname = usePathname();
    const router = useRouter();
    const currentSearchParams = useSearchParams();
    const themeSettings = useThemeSettings();
    const [isPending, startTransition] = useTransition();
    const [isAdded, setIsAdded] = useState(false);
    const [quantity, setQuantity] = useState(1);

    // Offers for this product (passed from server or fetched dynamically)
    const [sellerOffers, setSellerOffers] = useState<any[]>(allOffers || []);

    // Fallback client-side fetch if allOffers was not supplied
    useEffect(() => {
        if (!allOffers || allOffers.length === 0) {
            const vIds = (product.variants || []).map((v) => v.id);
            if (vIds.length > 0) {
                getSellerOffersForProductVariants(vIds)
                    .then((offers) => {
                        if (offers && offers.length > 0) {
                            setSellerOffers(offers);
                        }
                    })
                    .catch(() => {});
            }
        }
    }, [allOffers, product.variants]);

    // 1. Identify the Selected Vendor
    const initialVendorId = useMemo(() => {
        // Priority 1: explicitly passed in searchParams or URL (?vendorId=...)
        const urlVendor = searchParams?.vendorId || currentSearchParams?.get('vendorId');
        if (urlVendor) {
            return String(Array.isArray(urlVendor) ? urlVendor[0] : urlVendor);
        }

        // Priority 2: if variant or variantId is specified, check vendor of the offer for this variant
        const urlVariant = searchParams?.variant || searchParams?.variantId || currentSearchParams?.get('variant') || currentSearchParams?.get('variantId');
        if (urlVariant) {
            const vId = String(Array.isArray(urlVariant) ? urlVariant[0] : urlVariant);
            const matchedOffer = (sellerOffers || []).find((o) => String(o.productVariant?.id) === vId);
            if (matchedOffer?.vendor?.id) {
                return String(matchedOffer.vendor.id);
            }
        }

        // Priority 3: product's own customFields vendor
        if (product.customFields?.vendor?.id) {
            return String(product.customFields.vendor.id);
        }

        // Priority 4: first vendor in seller offers
        if (sellerOffers && sellerOffers.length > 0 && sellerOffers[0]?.vendor?.id) {
            return String(sellerOffers[0].vendor.id);
        }

        return null;
    }, [searchParams, currentSearchParams, sellerOffers, product.customFields?.vendor?.id]);

    const [activeVendorId, setActiveVendorId] = useState<string | null>(initialVendorId);

    useEffect(() => {
        if (initialVendorId && !activeVendorId) {
            setActiveVendorId(initialVendorId);
        }
    }, [initialVendorId]);

    const selectedVendorId = activeVendorId || initialVendorId;

    const handleSelectVendor = (vendorId: string, variantId?: string) => {
        setActiveVendorId(vendorId);
        const vOffers = (sellerOffers || []).filter((o) => String(o.vendor?.id) === String(vendorId));
        let targetVariantId = variantId;
        if (!targetVariantId && vOffers.length > 0) {
            targetVariantId = String(vOffers[0].productVariant?.id);
        }

        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            params.set('vendorId', vendorId);
            if (targetVariantId) {
                params.set('variantId', targetVariantId);
            }
            window.history.replaceState(null, '', `${pathname}?${params.toString()}`);
        }

        if (targetVariantId) {
            setSelectedVariantId(targetVariantId);
        }
    };

    // 2. Filter offers that belong strictly to the selected vendor
    const vendorOffers = useMemo(() => {
        if (!sellerOffers || sellerOffers.length === 0) return [];
        if (!selectedVendorId) return sellerOffers;
        const matching = sellerOffers.filter((o) => String(o.vendor?.id) === String(selectedVendorId));
        return matching.length > 0 ? matching : sellerOffers;
    }, [sellerOffers, selectedVendorId]);

    // 3. All approved variants of this central product family
    const allApprovedVariants = useMemo(() => {
        const baseApproved = (product.variants || []).filter((v: any) => {
            if (v.enabled === false) return false;
            const offerStatus = (v.customFields as any)?.offerStatus || (v.customFields as any)?.offerstatus;
            if (offerStatus === 'PENDING' || offerStatus === 'pending' || offerStatus === 'REFUSED' || offerStatus === 'rejected') return false;
            const approvalStatus = (v.customFields as any)?.approvalStatus || (v.customFields as any)?.approvalstatus;
            if (approvalStatus === 'pending' || approvalStatus === 'refused' || approvalStatus === 'rejected') return false;
            return true;
        });

        return baseApproved.length > 0 ? baseApproved : (product.variants || []);
    }, [product.variants]);

    // 4. Extract available option IDs across the product family
    const familyOptionIds = useMemo(() => {
        const ids = new Set<string>();
        allApprovedVariants.forEach((v) => {
            (v.options || []).forEach((opt) => ids.add(String(opt.id)));
        });
        return ids;
    }, [allApprovedVariants]);

    // 5. Filter and merge option groups to display all family options cleanly
    const filteredOptionGroups = useMemo(() => {
        const groupMap = new Map<string, { id: string; code: string; name: string; options: any[] }>();

        for (const group of (product.optionGroups || [])) {
            const validOptions = (group.options || []).filter((opt) => 
                familyOptionIds.size === 0 || familyOptionIds.has(String(opt.id))
            );
            if (validOptions.length === 0) continue;

            const normalizedName = (group.name || '').trim().toLowerCase();
            if (groupMap.has(normalizedName)) {
                const existing = groupMap.get(normalizedName)!;
                for (const opt of validOptions) {
                    if (!existing.options.some((o: any) => String(o.id) === String(opt.id) || o.name === opt.name)) {
                        existing.options.push(opt);
                    }
                }
            } else {
                groupMap.set(normalizedName, {
                    id: group.id,
                    code: group.code,
                    name: group.name,
                    options: [...validOptions],
                });
            }
        }

        return Array.from(groupMap.values());
    }, [product.optionGroups, familyOptionIds]);

    const [selectedVariantId, setSelectedVariantId] = useState<string>(() => {
        const rawParamVariant = searchParams?.variant || searchParams?.variantId;
        if (rawParamVariant) {
            const vId = String(Array.isArray(rawParamVariant) ? rawParamVariant[0] : rawParamVariant);
            const matched = allApprovedVariants.find((v) => String(v.id) === vId);
            if (matched) return String(matched.id);
        }
        return allApprovedVariants[0]?.id || '';
    });

    useEffect(() => {
        if (allApprovedVariants.length > 0) {
            const exists = allApprovedVariants.some((v) => String(v.id) === String(selectedVariantId));
            if (!exists) {
                setSelectedVariantId(String(allApprovedVariants[0].id));
            }
        }
    }, [allApprovedVariants, selectedVariantId]);

    const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>(() => {
        const initialOptions: Record<string, string> = {};

        let matchedVariant = null;
        const rawParamVariant = searchParams?.variant || searchParams?.variantId;
        if (rawParamVariant) {
            const vId = String(Array.isArray(rawParamVariant) ? rawParamVariant[0] : rawParamVariant);
            matchedVariant = allApprovedVariants.find((v) => String(v.id) === vId);
        }

        if (matchedVariant && matchedVariant.options && matchedVariant.options.length > 0) {
            matchedVariant.options.forEach((opt) => {
                const gId = (opt as any).groupId || opt.group?.id;
                if (gId) {
                    initialOptions[gId] = opt.id;
                }
            });
        }

        (product.optionGroups || []).forEach((group) => {
            const paramValue = searchParams?.[group.code];
            if (typeof paramValue === 'string') {
                const option = (group.options || []).find((opt) => opt.code === paramValue && familyOptionIds.has(String(opt.id)));
                if (option) {
                    initialOptions[group.id] = option.id;
                }
            }
        });

        const defaultVariant = matchedVariant || allApprovedVariants[0];
        if (defaultVariant && defaultVariant.options) {
            defaultVariant.options.forEach((opt) => {
                const gId = (opt as any).groupId || opt.group?.id;
                if (gId && !initialOptions[gId]) {
                    initialOptions[gId] = opt.id;
                }
            });
        }

        return initialOptions;
    });

    // Update selectedOptions when active variant changes
    useEffect(() => {
        if (allApprovedVariants.length > 0) {
            const activeV = allApprovedVariants.find((v) => String(v.id) === String(selectedVariantId)) || allApprovedVariants[0];
            if (activeV && activeV.options) {
                const newOpts: Record<string, string> = {};
                activeV.options.forEach((opt) => {
                    const gId = (opt as any).groupId || opt.group?.id;
                    if (gId) newOpts[gId] = opt.id;
                });
                setSelectedOptions(newOpts);
            }
        }
    }, [allApprovedVariants, selectedVariantId]);

    // Find the matching variant strictly across the central product family
    const selectedVariant = useMemo(() => {
        if (allApprovedVariants.length === 0) return null;

        if (product.optionGroups && product.optionGroups.length > 0) {
            const selectedOptionIds = Object.values(selectedOptions).map(String);
            if (selectedOptionIds.length > 0) {
                const found = allApprovedVariants.find((variant) => {
                    const variantOptionIds = (variant.options || []).map((opt: any) => String(opt.id));
                    return selectedOptionIds.every((optId) => variantOptionIds.includes(optId));
                });
                if (found) return found;
            }
        }

        if (selectedVariantId) {
            const byId = allApprovedVariants.find((v) => String(v.id) === String(selectedVariantId));
            if (byId) return byId;
        }

        return allApprovedVariants[0] || null;
    }, [selectedOptions, allApprovedVariants, product.optionGroups, selectedVariantId]);

    // Offer strictly belonging to the currently selected vendor for this variant
    const currentVendorOffer = useMemo(() => {
        if (!selectedVariant || !sellerOffers || sellerOffers.length === 0) return null;
        if (!selectedVendorId) return sellerOffers[0] || null;
        return sellerOffers.find((o) => 
            String(o.productVariant?.id) === String(selectedVariant.id) && 
            String(o.vendor?.id) === String(selectedVendorId)
        ) || null;
    }, [sellerOffers, selectedVariant, selectedVendorId]);

    const activeOffer = currentVendorOffer;
    const isAvailableForCurrentVendor = Boolean(currentVendorOffer);

    // Other vendors who offer this specific variant (if current vendor doesn't or as alternatives)
    const otherOffersForVariant = useMemo(() => {
        if (!selectedVariant || !sellerOffers) return [];
        return sellerOffers.filter((o) => 
            String(o.productVariant?.id) === String(selectedVariant.id) && 
            String(o.vendor?.id) !== String(selectedVendorId)
        );
    }, [sellerOffers, selectedVariant, selectedVendorId]);

    // Active vendor details
    const activeVendor = useMemo(() => {
        if (selectedVendorId) {
            const match = (sellerOffers || []).find((o) => String(o.vendor?.id) === String(selectedVendorId));
            if (match?.vendor?.name) return match.vendor;
        }
        if (sellerOffers && sellerOffers.length > 0 && sellerOffers[0]?.vendor?.name) {
            return sellerOffers[0].vendor;
        }
        if (product.customFields?.vendor?.name) {
            return product.customFields.vendor;
        }
        return null;
    }, [sellerOffers, selectedVendorId, product.customFields?.vendor]);

    const activePrice = useMemo(() => {
        if (currentVendorOffer) {
            if (currentVendorOffer.onPromotion && currentVendorOffer.promotionalPrice) {
                return currentVendorOffer.promotionalPrice;
            }
            return currentVendorOffer.price;
        }
        return null;
    }, [currentVendorOffer]);

    // Dispatch variant change event to synchronize image carousel and components
    useEffect(() => {
        if (selectedVariant && typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('ahizan:variant-changed', {
                detail: { variant: selectedVariant }
            }));
        }
    }, [selectedVariant]);

    const handleOptionChange = (groupId: string, optionId: string) => {
        const nextOptions = {
            ...selectedOptions,
            [groupId]: optionId,
        };
        setSelectedOptions(nextOptions);

        const nextOptionIds = Object.values(nextOptions).map(String);
        let matchingVariant = allApprovedVariants.find((variant) => {
            const variantOptionIds = (variant.options || []).map((opt: any) => String(opt.id));
            return nextOptionIds.every((optId) => variantOptionIds.includes(optId));
        });

        if (!matchingVariant) {
            matchingVariant = allApprovedVariants.find((variant) => {
                const variantOptionIds = (variant.options || []).map((opt: any) => String(opt.id));
                return variantOptionIds.includes(String(optionId));
            });
        }

        if (matchingVariant) {
            setSelectedVariantId(String(matchingVariant.id));

            if (typeof window !== 'undefined') {
                const params = new URLSearchParams(window.location.search);
                if (selectedVendorId) {
                    params.set('sellerId', selectedVendorId);
                    params.set('vendorId', selectedVendorId);
                }
                params.set('variantId', String(matchingVariant.id));
                params.set('variant', String(matchingVariant.id));
                window.history.replaceState(null, '', `${pathname}?${params.toString()}`);
            }
        }
    };

    const handleAddToCart = async () => {
        if (!selectedVariant || !isAvailableForCurrentVendor) return;

        startTransition(async () => {
            const assignedVendorId = selectedVendorId || currentVendorOffer?.vendor?.id || product.customFields?.vendor?.id || undefined;
            const sellerOfferId = currentVendorOffer?.id || undefined;
            const result = await addToCart(selectedVariant.id, quantity, assignedVendorId, sellerOfferId);

            if (result.success) {
                setIsAdded(true);
                toast.success('Ajouté au panier', {
                    description: `${product.name} (${selectedVariant.name || ''}) a été ajouté à votre panier`,
                });
                router.refresh();

                // Reset the added state after 2 seconds
                setTimeout(() => setIsAdded(false), 2000);
            } else {
                toast.error('Erreur', {
                    description: result.error || 'Échec de l\'ajout de l\'article au panier',
                });
            }
        });
    };

    const isInStock = Boolean(
        selectedVariant && 
        selectedVariant.stockLevel !== 'OUT_OF_STOCK' &&
        currentVendorOffer &&
        (currentVendorOffer.stock === undefined || currentVendorOffer.stock > 0)
    );
    const canAddToCart = Boolean(selectedVariant && isAvailableForCurrentVendor && isInStock);

    const activeFlash = themeSettings?.activeFlashSale;
    const applyToProduct = themeSettings?.applyFlashPromoToProducts;

    const priceInfo = useMemo(() => {
        if (!selectedVariant || activePrice === null) return null;
        return getPromoPriceInfo({
            price: activePrice,
            variantCustomFields: selectedVariant.customFields,
            productId: product.id,
            collectionIds: product.collections?.map((c: any) => c.id) || [],
            activeFlash,
            globalApplySettings: {
                isProductPage: true,
                applyToProduct,
            }
        });
    }, [selectedVariant, activePrice, product.id, product.collections, activeFlash, applyToProduct]);

    const handleSelectVariant = (variantId: string) => {
        setSelectedVariantId(variantId);
        const targetV = allApprovedVariants.find((v) => String(v.id) === String(variantId));
        if (targetV && targetV.options) {
            const nextOpts: Record<string, string> = {};
            targetV.options.forEach((opt) => {
                const gId = (opt as any).groupId || opt.group?.id;
                if (gId) nextOpts[gId] = opt.id;
            });
            setSelectedOptions(nextOpts);
        }

        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            if (selectedVendorId) {
                params.set('sellerId', selectedVendorId);
                params.set('vendorId', selectedVendorId);
            }
            params.set('variantId', String(variantId));
            params.set('variant', String(variantId));
            window.history.replaceState(null, '', `${pathname}?${params.toString()}`);
        }
    };

    // Strict and clean title resolution: NEVER display foreign product names from grafted variants
    const optNames = (selectedVariant?.options || []).map((o: any) => o.name || o.code).filter(Boolean).join(' • ');
    let declinationSuffix = optNames;

    if (!declinationSuffix && selectedVariant?.name) {
        const vName = selectedVariant.name.trim();
        if (vName.toLowerCase().startsWith(product.name.toLowerCase()) && vName.length > product.name.length) {
            const clean = vName.substring(product.name.length).replace(/^[\s\-–—:]+/, '').trim();
            if (clean && clean.toLowerCase() !== product.name.toLowerCase()) {
                declinationSuffix = clean;
            }
        }
    }

    const variantDisplayName = declinationSuffix 
        ? `${product.name} — ${declinationSuffix}` 
        : product.name;

    return (
        <div className="space-y-4 text-foreground">
            {/* SKU and Offer Condition Badges */}
            <div className="flex flex-wrap items-center gap-2">
                {selectedVariant?.sku && (
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider bg-muted/60 px-2.5 py-0.5 rounded-md border border-border/40">
                        SKU: {selectedVariant.sku}
                    </span>
                )}
                {activeOffer?.condition && (
                    <span className="text-[11px] font-semibold text-primary bg-primary/10 px-2.5 py-0.5 rounded-md border border-primary/20">
                        {activeOffer.condition === 'NEW' ? 'Neuf' : activeOffer.condition === 'USED_GOOD' ? 'Très bon état' : activeOffer.condition}
                    </span>
                )}
                {activeVendor?.name && (
                    <span className="text-[11px] font-semibold text-muted-foreground bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-md flex items-center gap-1">
                        <Store className="w-3 h-3 text-primary" />
                        Offre de {activeVendor.name}
                    </span>
                )}
            </div>

            {/* Product & Variant Title */}
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">{variantDisplayName}</h1>
                {selectedVariant && isAvailableForCurrentVendor && priceInfo ? (
                    <div className="flex items-center gap-4 mt-2.5">
                        {priceInfo.hasPromotion ? (
                            <div className="flex items-center gap-3">
                                <p className={`text-2xl sm:text-3xl font-bold ${priceInfo.showBothPrices ? 'text-red-600' : 'text-primary'}`}>
                                    <Price value={priceInfo.promotionalPrice} />
                                </p>
                                {priceInfo.showBothPrices && (
                                    <>
                                        <p className="text-lg font-medium text-muted-foreground line-through opacity-70">
                                            <Price value={priceInfo.originalPrice} />
                                        </p>
                                        <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded-md">
                                            -{priceInfo.discountPercentage}%
                                        </span>
                                    </>
                                )}
                            </div>
                        ) : (
                            <p className="text-2xl sm:text-3xl font-bold text-primary">
                                <Price value={activePrice ?? selectedVariant.priceWithTax}/>
                            </p>
                        )}

                        {isInStock ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                                {activeOffer && typeof activeOffer.stock === 'number'
                                    ? `${activeOffer.stock} en stock`
                                    : 'En stock'}
                            </span>
                        ) : (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                                Rupture chez ce vendeur
                            </span>
                        )}
                    </div>
                ) : (
                    <div className="mt-3">
                        <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-300/70 dark:border-amber-700/60">
                            <span>⚠️</span>
                            <span>Cette déclinaison n'est pas disponible chez {activeVendor?.name ? <span className="underline">{activeVendor.name}</span> : 'ce vendeur'}.</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Petite Description (Short Description) */}
            {Boolean(product.customFields?.shortDescription || product.description) && (
                <div className="text-sm text-muted-foreground leading-relaxed my-3 font-medium">
                    {product.customFields?.shortDescription || (
                        (product.description || '').replace(/<[^>]*>?/gm, '').slice(0, 180) + '...'
                    )}
                </div>
            )}

            {/* Option Groups (Filtered only to options available in active variants for THIS vendor) */}
            {filteredOptionGroups.length > 0 && (
                <div className="space-y-4 pt-4 border-t">
                    {filteredOptionGroups.map((group) => (
                        <div key={group.id} className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">
                                    {group.name}
                                </Label>
                            </div>
                            <RadioGroup
                                value={selectedOptions[group.id] || ''}
                                onValueChange={(value) => handleOptionChange(group.id, value)}
                            >
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {group.options.map((option) => {
                                        const isSelected = selectedOptions[group.id] === option.id;
                                        const isSoldByCurrentVendor = allApprovedVariants.some((variant) => {
                                            const isVendorVariant = (sellerOffers || []).some(
                                                (o) => String(o.productVariant?.id) === String(variant.id) && (selectedVendorId ? String(o.vendor?.id) === String(selectedVendorId) : true)
                                            );
                                            if (!isVendorVariant) return false;
                                            const variantOptionIds = (variant.options || []).map((opt: any) => String(opt.id));
                                            if (!variantOptionIds.includes(String(option.id))) return false;
                                            for (const [otherGId, otherOptId] of Object.entries(selectedOptions)) {
                                                if (otherGId !== group.id && !variantOptionIds.includes(String(otherOptId))) {
                                                    return false;
                                                }
                                            }
                                            return true;
                                        });

                                        const isAvailableWithSelection = allApprovedVariants.some((variant) => {
                                            const variantOptionIds = (variant.options || []).map((opt: any) => String(opt.id));
                                            if (!variantOptionIds.includes(String(option.id))) return false;
                                            for (const [otherGId, otherOptId] of Object.entries(selectedOptions)) {
                                                if (otherGId !== group.id && !variantOptionIds.includes(String(otherOptId))) {
                                                    return false;
                                                }
                                            }
                                            return true;
                                        });

                                        return (
                                            <div key={option.id}>
                                                <RadioGroupItem
                                                    value={option.id}
                                                    id={option.id}
                                                    className="peer sr-only"
                                                />
                                                <Label
                                                    htmlFor={option.id}
                                                    className={`flex items-center justify-center rounded-lg border px-3 py-2 cursor-pointer transition-all font-semibold text-xs text-center ${
                                                        isSelected
                                                            ? 'border-primary bg-primary/10 text-primary font-bold shadow-xs'
                                                            : isSoldByCurrentVendor
                                                                ? 'border-input bg-background hover:bg-accent hover:text-accent-foreground text-foreground'
                                                                : isAvailableWithSelection
                                                                    ? 'border-dashed border-amber-400/60 bg-amber-50/40 dark:bg-amber-950/20 text-muted-foreground hover:border-primary/40'
                                                                    : 'border-dashed border-input/40 bg-muted/10 text-muted-foreground/50 opacity-60'
                                                    }`}
                                                >
                                                    {option.name}
                                                </Label>
                                            </div>
                                        );
                                    })}
                                </div>
                            </RadioGroup>
                        </div>
                    ))}
                </div>
            )}

            {/* Direct Variants Selector (if no optionGroups or filteredOptionGroups empty, but multiple variants exist) */}
            {((!product.optionGroups || product.optionGroups.length === 0) || filteredOptionGroups.length === 0) && allApprovedVariants.length > 1 && (
                <div className="space-y-2 pt-4 border-t">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">
                        Déclinaisons disponibles ({allApprovedVariants.length})
                    </Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {allApprovedVariants.map((v) => {
                            const isSelected = selectedVariant?.id === v.id;
                            const vOffer = (sellerOffers || []).find((o) => String(o.productVariant?.id) === String(v.id) && (selectedVendorId ? String(o.vendor?.id) === String(selectedVendorId) : true)) || (sellerOffers || []).find((o) => String(o.productVariant?.id) === String(v.id));
                            const vPrice = vOffer?.price ?? v.priceWithTax;

                            const vOptNames = (v.options || []).map((o: any) => o.name || o.code).filter(Boolean).join(' • ');
                            let vLabel = vOptNames;
                            if (!vLabel && v.name && v.name.toLowerCase().startsWith(product.name.toLowerCase()) && v.name.length > product.name.length) {
                                vLabel = v.name.substring(product.name.length).replace(/^[\s\-–—:]+/, '').trim();
                            }
                            if (!vLabel) vLabel = product.name;

                            return (
                                <button
                                    key={v.id}
                                    type="button"
                                    onClick={() => handleSelectVariant(v.id)}
                                    className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-bold transition-all ${isSelected ? 'border-primary bg-primary/10 text-primary ring-2 ring-primary/20 shadow-sm' : 'border-input hover:border-slate-300 dark:hover:border-slate-600 bg-background text-foreground'}`}
                                >
                                    <span className="truncate max-w-full">{vLabel}</span>
                                    <span className="text-[11px] font-medium text-muted-foreground mt-0.5">
                                        <Price value={vPrice} />
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Dimensions & Logistics Info */}
            {Boolean(product.customFields?.weight || product.customFields?.width || product.customFields?.height) && (
                <div className="flex flex-wrap gap-4 py-2.5 px-3.5 bg-muted/40 rounded-xl text-xs font-semibold text-muted-foreground border border-border/50">
                    {Boolean(product.customFields?.weight) && (
                        <div className="flex items-center gap-1.5">
                            <span className="text-foreground font-bold">Poids:</span>
                            <span>{product.customFields?.weight} kg</span>
                        </div>
                    )}
                    {Boolean(product.customFields?.width) && (
                        <div className="flex items-center gap-1.5">
                            <span className="text-foreground font-bold">Largeur:</span>
                            <span>{product.customFields?.width} cm</span>
                        </div>
                    )}
                    {Boolean(product.customFields?.height) && (
                        <div className="flex items-center gap-1.5">
                            <span className="text-foreground font-bold">Hauteur:</span>
                            <span>{product.customFields?.height} cm</span>
                        </div>
                    )}
                </div>
            )}

            {/* Vendeur sélectionné pour ce produit (Offre unique du vendeur sélectionné) */}
            {activeVendor && (
                <div className="space-y-2 pt-3 border-t">
                    <div className="flex items-center justify-between">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80 flex items-center gap-1.5">
                            <Store className="w-3.5 h-3.5 text-primary" />
                            Vendeur de cette offre
                        </Label>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-xl border border-primary/20 bg-primary/[0.03] shadow-sm">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-full bg-muted/80 border flex items-center justify-center overflow-hidden flex-shrink-0">
                                {activeVendor.logo?.preview ? (
                                    <img src={activeVendor.logo.preview} alt={activeVendor.name} className="w-full h-full object-cover" />
                                ) : (
                                    <Store className="w-5 h-5 text-muted-foreground" />
                                )}
                            </div>
                            <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-xs text-foreground truncate">{activeVendor.name}</span>
                                    <BadgeCheck className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                                </div>
                                <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                                    <span className="flex items-center gap-0.5 text-amber-500 font-semibold">
                                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                        {(activeVendor.rating || 5.0).toFixed(1)}
                                    </span>
                                    {activeOffer?.deliveryTimeValue && (
                                        <>
                                            <span>•</span>
                                            <span className="flex items-center gap-0.5">
                                                <Clock className="w-3 h-3" />
                                                Livraison {activeOffer.deliveryTimeValue} {activeOffer.deliveryTimeUnit === 'h' ? 'heures' : 'jours'}
                                            </span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        {activeVendor.id && (
                            <Link
                                href={`/vendor/${encodeId(activeVendor.id)}`}
                                className="text-xs font-bold text-primary hover:underline px-2.5 py-1 rounded-lg hover:bg-primary/10 transition-all flex items-center gap-1 flex-shrink-0"
                            >
                                Boutique →
                            </Link>
                        )}
                    </div>
                </div>
            )}

            {/* Quantity Selector */}

            {canAddToCart && (
                <div className="flex items-center gap-3 pt-2">
                    <span className="text-sm font-semibold text-muted-foreground">Quantité:</span>
                    <div className="flex items-center border border-border rounded-full bg-muted/40 p-1">
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full hover:bg-background/80 transition-colors"
                            onClick={() => setQuantity((prev: number) => Math.max(1, prev - 1))}
                            disabled={quantity <= 1}
                        >
                            <Minus className="h-4 w-4" />
                        </Button>
                        <span className="w-10 text-center font-bold text-sm select-none">{quantity}</span>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full hover:bg-background/80 transition-colors"
                            onClick={() => setQuantity((prev: number) => prev + 1)}
                        >
                            <Plus className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}

            {/* Action Buttons: Inline for Desktop, Fixed Sticky Bar for Mobile until before-last section */}
            <div className="pt-4 hidden lg:block">
                <div className="grid grid-cols-2 gap-2 w-full">
                    {/* Ajouter au panier */}
                    <Button
                        size="lg"
                        className="w-full h-11 rounded-full font-bold text-xs sm:text-sm shadow-md transition-all active:scale-[0.98] bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-center gap-1.5 px-2"
                        disabled={!canAddToCart || isPending}
                        onClick={handleAddToCart}
                    >
                        {isAdded ? (
                            <>
                                <CheckCircle2 className="h-4 w-4 flex-shrink-0"/>
                                <span className="truncate">Ajouté</span>
                            </>
                        ) : (
                            <>
                                <ShoppingCart className="h-4 w-4 flex-shrink-0"/>
                                <span className="truncate">
                                    {isPending
                                        ? 'Ajout...'
                                        : (!selectedVariant || !isAvailableForCurrentVendor)
                                            ? 'Non disponible chez ce vendeur'
                                            : !isInStock
                                                ? 'Rupture de stock'
                                                : 'Ajouter au panier'}
                                </span>
                            </>
                        )}
                    </Button>

                    {/* Commander sur WhatsApp */}
                    <Button
                        type="button"
                        size="lg"
                        className="w-full h-11 rounded-full font-bold text-xs sm:text-sm shadow-md transition-all active:scale-[0.98] bg-[#25D366] text-white hover:bg-[#20bd5a] flex items-center justify-center gap-1.5 px-2"
                        onClick={() => {
                            const targetNumber = whatsappNumber || '';
                            const cleanNumber = targetNumber.replace(/[^0-9+]/g, '');
                            const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
                            const message = `Bonjour, je souhaite commander : ${variantDisplayName}${activeVendor?.name ? ` (Vendeur: ${activeVendor.name})` : ''}\n${currentUrl}`;

                            if (cleanNumber) {
                                const phone = cleanNumber.startsWith('+') ? cleanNumber.slice(1) : cleanNumber;
                                window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
                            } else {
                                window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`, '_blank');
                            }
                        }}
                    >
                        <svg className="w-4 h-4 fill-current flex-shrink-0" viewBox="0 0 24 24">
                            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.705 1.754zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                        </svg>
                        <span className="truncate">Commander sur WhatsApp</span>
                    </Button>
                </div>
            </div>

            {/* Mobile Fixed Sticky Action Bar */}
            <ProductMobileFixedBar
                product={product}
                selectedVariant={selectedVariant}
                canAddToCart={Boolean(canAddToCart)}
                isPending={Boolean(isPending)}
                isAdded={Boolean(isAdded)}
                handleAddToCart={handleAddToCart}
                whatsappNumber={whatsappNumber}
            />

            {/* SKU */}
            {selectedVariant && (
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-bold pt-4">
                    REF: {selectedVariant.sku}
                </div>
            )}

            {/* Social Sharing */}
            <div className="pt-4 border-t flex items-center gap-3">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Share2 className="w-3.5 h-3.5" /> Partager :
                </span>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 rounded-full hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950"
                        onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`, '_blank')}
                        title="Partager sur Facebook"
                    >
                        <Facebook className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 rounded-full hover:bg-green-50 hover:text-green-600 dark:hover:bg-green-950"
                        onClick={() => window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(product.name + ' - ' + window.location.href)}`, '_blank')}
                        title="Partager sur WhatsApp"
                    >
                        <MessageCircle className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 rounded-full hover:bg-sky-50 hover:text-sky-500 dark:hover:bg-sky-950"
                        onClick={() => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(product.name)}&url=${encodeURIComponent(window.location.href)}`, '_blank')}
                        title="Partager sur X (Twitter)"
                    >
                        <Twitter className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 rounded-full hover:bg-muted"
                        onClick={() => {
                            navigator.clipboard.writeText(window.location.href);
                            toast.success('Lien copié dans le presse-papier !');
                        }}
                        title="Copier le lien"
                    >
                        <Copy className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
