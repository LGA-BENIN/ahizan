'use client';

import {useState, useMemo, useTransition, useEffect} from 'react';
import {usePathname, useRouter, useSearchParams} from 'next/navigation';
import {Button} from '@/components/ui/button';
import {Label} from '@/components/ui/label';
import {RadioGroup, RadioGroupItem} from '@/components/ui/radio-group';
import {ShoppingCart, CheckCircle2, Share2, Facebook, MessageCircle, Twitter, Copy, Minus, Plus, Star, Clock, Store, BadgeCheck} from 'lucide-react';
import {addToCart, getSellerOffersForVariant} from '@/app/(storefront)/product/[slug]/actions';
import {toast} from 'sonner';
import {Price} from '@/components/commerce/price';
import { getPromoPriceInfo } from "@/lib/vendure/api-utils";
import { useThemeSettings } from "@/components/providers/theme-provider";
import { ProductMobileFixedBar } from './product-mobile-fixed-bar';
import DOMPurify from 'dompurify';

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
}

export function ProductInfo({product, searchParams, config, whatsappNumber}: ProductInfoProps) {
    const pathname = usePathname();
    const router = useRouter();
    const currentSearchParams = useSearchParams();
    const themeSettings = useThemeSettings();
    const [isPending, startTransition] = useTransition();
    const [isAdded, setIsAdded] = useState(false);
    const [quantity, setQuantity] = useState(1);
    const [sellerOffers, setSellerOffers] = useState<any[]>([]);
    const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);
    const [isLoadingOffers, setIsLoadingOffers] = useState(false);

    // Filter to only include approved and enabled variants
    const approvedVariants = useMemo(() => {
        const list = (product.variants || []).filter((v: any) => {
            if (v.enabled === false) return false;
            const offerStatus = (v.customFields as any)?.offerStatus || (v.customFields as any)?.offerstatus;
            if (offerStatus === 'PENDING' || offerStatus === 'pending' || offerStatus === 'REFUSED' || offerStatus === 'rejected') return false;
            const approvalStatus = (v.customFields as any)?.approvalStatus || (v.customFields as any)?.approvalstatus;
            if (approvalStatus === 'pending' || approvalStatus === 'refused' || approvalStatus === 'rejected') return false;
            return true;
        });
        return list;
    }, [product.variants]);

    const [selectedVariantId, setSelectedVariantId] = useState<string>(() => {
        if (searchParams?.variantId) {
            const matched = approvedVariants.find(v => String(v.id) === String(searchParams.variantId));
            if (matched) return String(matched.id);
        }
        return approvedVariants[0]?.id || '';
    });

    // Initialize selected options from URL or default to the target variant's options
    const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>(() => {
        const initialOptions: Record<string, string> = {};

        // 1. Check if specific variantId passed in searchParams
        let matchedVariant = null;
        if (searchParams?.variantId) {
            matchedVariant = approvedVariants.find(v => String(v.id) === String(searchParams.variantId));
        }

        if (matchedVariant && matchedVariant.options && matchedVariant.options.length > 0) {
            matchedVariant.options.forEach(opt => {
                const gId = (opt as any).groupId || opt.group?.id;
                if (gId) {
                    initialOptions[gId] = opt.id;
                }
            });
        }

        // 2. Load from URL search params
        product.optionGroups.forEach((group) => {
            const paramValue = searchParams?.[group.code];
            if (typeof paramValue === 'string') {
                const option = group.options.find((opt) => opt.code === paramValue);
                if (option) {
                    initialOptions[group.id] = option.id;
                }
            }
        });

        // 3. For any missing option groups, pre-select from the matched or first variant
        const defaultVariant = matchedVariant || approvedVariants[0];
        if (defaultVariant && defaultVariant.options) {
            defaultVariant.options.forEach(opt => {
                const gId = (opt as any).groupId || opt.group?.id;
                if (gId && !initialOptions[gId]) {
                    initialOptions[gId] = opt.id;
                }
            });
        }

        // 4. Fallback: if any group is still unselected, select its first option
        product.optionGroups.forEach((group) => {
            if (!initialOptions[group.id] && group.options.length > 0) {
                initialOptions[group.id] = group.options[0].id;
            }
        });

        return initialOptions;
    });

    // Get all option IDs that actually belong to available variants
    const availableOptionIds = useMemo(() => {
        const ids = new Set<string>();
        approvedVariants.forEach((v) => {
            (v.options || []).forEach((opt) => ids.add(String(opt.id)));
        });
        return ids;
    }, [approvedVariants]);

    // Filter option groups to only display groups and options that actually exist in variants
    const filteredOptionGroups = useMemo(() => {
        return product.optionGroups
            .map((group) => ({
                ...group,
                options: group.options.filter((opt) => availableOptionIds.has(String(opt.id))),
            }))
            .filter((group) => group.options.length > 0);
    }, [product.optionGroups, availableOptionIds]);

    // Find the matching variant based on selected options or selected variant id
    const selectedVariant = useMemo(() => {
        if (approvedVariants.length === 0) return null;
        if (approvedVariants.length === 1) {
            return approvedVariants[0];
        }

        // If product has option groups and user changed options
        if (product.optionGroups.length > 0) {
            const selectedOptionIds = Object.values(selectedOptions);
            if (selectedOptionIds.length > 0) {
                const found = approvedVariants.find((variant) => {
                    const variantOptionIds = (variant.options || []).map((opt) => opt.id);
                    return selectedOptionIds.every((optId) => variantOptionIds.includes(optId));
                });
                if (found) return found;
            }
        }

        // If direct variant selection
        if (selectedVariantId) {
            const byId = approvedVariants.find(v => String(v.id) === String(selectedVariantId));
            if (byId) return byId;
        }

        return approvedVariants[0];
    }, [selectedOptions, approvedVariants, product.optionGroups, selectedVariantId]);

    // Load seller offers dynamically whenever the selected variant changes
    useEffect(() => {
        let isMounted = true;
        if (selectedVariant?.id) {
            setIsLoadingOffers(true);
            getSellerOffersForVariant(selectedVariant.id)
                .then((offers) => {
                    if (isMounted) {
                        setSellerOffers(offers || []);
                        if (offers && offers.length > 0) {
                            const urlVendorId = searchParams?.vendorId || currentSearchParams?.get('vendorId');
                            const matched = urlVendorId ? offers.find((o: any) => String(o.vendor?.id) === String(urlVendorId)) : null;
                            setSelectedOfferId(matched ? matched.id : offers[0].id);
                        } else {
                            setSelectedOfferId(null);
                        }
                    }
                })
                .catch(() => {
                    if (isMounted) setSellerOffers([]);
                })
                .finally(() => {
                    if (isMounted) setIsLoadingOffers(false);
                });
        }
        return () => { isMounted = false; };
    }, [selectedVariant?.id, searchParams?.vendorId]);

    // Active offer for the selected variant
    const activeOffer = useMemo(() => {
        if (!sellerOffers || sellerOffers.length === 0) return null;
        return sellerOffers.find(o => o.id === selectedOfferId) || sellerOffers[0];
    }, [sellerOffers, selectedOfferId]);

    const activePrice = activeOffer ? activeOffer.price : selectedVariant?.priceWithTax;

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

        // Find newly matched variant
        const nextOptionIds = Object.values(nextOptions);
        const nextVariant = approvedVariants.find((variant) => {
            const variantOptionIds = (variant.options || []).map((opt) => opt.id);
            return nextOptionIds.every((optId) => variantOptionIds.includes(optId));
        });

        if (nextVariant) {
            setSelectedVariantId(String(nextVariant.id));
        }

        // Update URL shallowly without triggering full page reload
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            if (nextVariant) {
                params.set('variantId', String(nextVariant.id));
            }
            const group = product.optionGroups.find((g) => g.id === groupId);
            const option = group?.options.find((opt) => opt.id === optionId);
            if (group && option) {
                params.set(group.code, option.code);
            }
            window.history.replaceState(null, '', `${pathname}?${params.toString()}`);
        }
    };

    const handleAddToCart = async () => {
        if (!selectedVariant) return;

        startTransition(async () => {
            const assignedVendorId = activeOffer?.vendor?.id || undefined;
            const result = await addToCart(selectedVariant.id, quantity, assignedVendorId);

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
        (!activeOffer || activeOffer.stock > 0)
    );
    const canAddToCart = Boolean(selectedVariant && isInStock);

    const activeFlash = themeSettings?.activeFlashSale;
    const applyToProduct = themeSettings?.applyFlashPromoToProducts;

    const priceInfo = useMemo(() => {
        if (!selectedVariant) return null;
        return getPromoPriceInfo({
            price: activePrice || selectedVariant.priceWithTax,
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


    return (
        <div className="space-y-4 text-foreground">
            {/* Product Title */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight">{product.name}</h1>
                {selectedVariant && priceInfo && (
                    <div className="flex items-center gap-4 mt-2">
                        {priceInfo.hasPromotion ? (
                            <div className="flex items-center gap-3">
                                <p className={`text-2xl font-bold ${priceInfo.showBothPrices ? 'text-red-600' : 'text-primary'}`}>
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
                            <p className="text-2xl font-bold text-primary">
                                <Price value={selectedVariant.priceWithTax}/>
                            </p>
                        )}
                        {isInStock ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                En stock
                            </span>
                        ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                                Rupture de stock
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* Petite Description (Short Description) */}
            {Boolean(product.customFields?.shortDescription || product.description) && (
                <div className="text-sm text-muted-foreground leading-relaxed my-3 font-medium">
                    {product.customFields?.shortDescription || (
                        typeof window !== 'undefined'
                            ? DOMPurify.sanitize(product.description || '').replace(/<[^>]*>?/gm, '').slice(0, 180) + '...'
                            : (product.description || '')
                    )}
                </div>
            )}

            {/* Option Groups (Filtered only to options available in active variants) */}
            {filteredOptionGroups.length > 0 && (
                <div className="space-y-4 pt-4 border-t">
                    {filteredOptionGroups.map((group) => (
                        <div key={group.id} className="space-y-2">
                            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">
                                {group.name}
                            </Label>
                            <RadioGroup
                                value={selectedOptions[group.id] || ''}
                                onValueChange={(value) => handleOptionChange(group.id, value)}
                            >
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {group.options.map((option) => (
                                        <div key={option.id}>
                                            <RadioGroupItem
                                                value={option.id}
                                                id={option.id}
                                                className="peer sr-only"
                                            />
                                            <Label
                                                htmlFor={option.id}
                                                className="flex items-center justify-center rounded-lg border border-input bg-background px-3 py-2 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 cursor-pointer transition-all font-semibold text-xs text-center"
                                            >
                                                {option.name}
                                            </Label>
                                        </div>
                                    ))}
                                </div>
                            </RadioGroup>
                        </div>
                    ))}
                </div>
            )}

            {/* Direct Variants Selector (if no optionGroups but multiple variants exist) */}
            {product.optionGroups.length === 0 && product.variants.length > 1 && (
                <div className="space-y-2 pt-4 border-t">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">
                        Déclinaisons disponibles ({product.variants.length})
                    </Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {product.variants.map((v) => {
                            const isSelected = selectedVariant?.id === v.id;
                            return (
                                <button
                                    key={v.id}
                                    type="button"
                                    onClick={() => setSelectedVariantId(v.id)}
                                    className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-bold transition-all ${isSelected ? 'border-primary bg-primary/10 text-primary ring-2 ring-primary/20 shadow-sm' : 'border-input hover:border-slate-300 dark:hover:border-slate-600 bg-background text-foreground'}`}
                                >
                                    <span className="truncate max-w-full">{v.name}</span>
                                    <span className="text-[11px] font-medium text-muted-foreground mt-0.5">
                                        <Price value={v.priceWithTax} />
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

            {/* Vendeurs & Offres pour cette déclinaison */}
            {sellerOffers && sellerOffers.length > 0 && (
                <div className="space-y-2.5 pt-3 border-t">
                    <div className="flex items-center justify-between">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80 flex items-center gap-1.5">
                            <Store className="w-3.5 h-3.5 text-primary" />
                            {sellerOffers.length > 1 
                                ? `${sellerOffers.length} Offres de vendeurs disponibles` 
                                : 'Vendeur de cette variante'}
                        </Label>
                    </div>

                    <div className="space-y-2">
                        {sellerOffers.map((offer: any) => {
                            const isSelected = (activeOffer?.id === offer.id) || (sellerOffers.length === 1);
                            const vendorName = offer.vendor?.name || 'Vendeur Ahizan';
                            const vendorLogo = offer.vendor?.logo?.preview;
                            const rating = offer.vendor?.rating || 5.0;
                            const deliveryDelay = offer.deliveryTimeValue 
                                ? `${offer.deliveryTimeValue} ${offer.deliveryTimeUnit === 'h' ? 'heures' : 'jours'}`
                                : '24-48h';

                            return (
                                <div
                                    key={offer.id}
                                    onClick={() => setSelectedOfferId(offer.id)}
                                    className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                                        isSelected
                                            ? 'border-primary bg-primary/[0.04] ring-2 ring-primary/20 shadow-sm'
                                            : 'border-border/70 hover:border-border bg-card/60'
                                    }`}
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-9 h-9 rounded-full bg-muted/80 border flex items-center justify-center overflow-hidden flex-shrink-0">
                                            {vendorLogo ? (
                                                <img src={vendorLogo} alt={vendorName} className="w-full h-full object-cover" />
                                            ) : (
                                                <Store className="w-4 h-4 text-muted-foreground" />
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-1.5">
                                                <span className="font-bold text-xs text-foreground truncate">{vendorName}</span>
                                                <BadgeCheck className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                                            </div>
                                            <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                                                <span className="flex items-center gap-0.5 text-amber-500 font-semibold">
                                                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                                    {rating.toFixed(1)}
                                                </span>
                                                <span>•</span>
                                                <span className="flex items-center gap-0.5">
                                                    <Clock className="w-3 h-3" />
                                                    {deliveryDelay}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="text-right flex-shrink-0 pl-2">
                                        <div className="text-sm font-black text-primary">
                                            <Price value={offer.price} />
                                        </div>
                                        {sellerOffers.length > 1 && (
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                                                isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                                            }`}>
                                                {isSelected ? 'Sélectionné' : 'Choisir'}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
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
                                        : !selectedVariant && product.optionGroups.length > 0
                                            ? 'Options'
                                            : !isInStock
                                                ? 'Rupture'
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
                            const message = `Bonjour, je souhaite commander ce produit : ${product.name}\n${currentUrl}`;

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
