'use client';

import {useState, useMemo, useTransition} from 'react';
import {usePathname, useRouter, useSearchParams} from 'next/navigation';
import {Button} from '@/components/ui/button';
import {Label} from '@/components/ui/label';
import {RadioGroup, RadioGroupItem} from '@/components/ui/radio-group';
import {ShoppingCart, CheckCircle2, Share2, Facebook, MessageCircle, Twitter, Copy, Minus, Plus} from 'lucide-react';
import {addToCart} from '@/app/(storefront)/product/[slug]/actions';
import {toast} from 'sonner';
import {Price} from '@/components/commerce/price';
import { getPromoPriceInfo } from "@/lib/vendure/api-utils";
import { useThemeSettings } from "@/components/providers/theme-provider";

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
    };
    searchParams: { [key: string]: string | string[] | undefined };
    config?: any;
}

export function ProductInfo({product, searchParams, config}: ProductInfoProps) {
    const pathname = usePathname();
    const router = useRouter();
    const currentSearchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();
    const [isAdded, setIsAdded] = useState(false);
    const [quantity, setQuantity] = useState(1);

    // Initialize selected options from URL
    const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>(() => {
        const initialOptions: Record<string, string> = {};

        // Load from URL search params
        product.optionGroups.forEach((group) => {
            const paramValue = searchParams[group.code];
            if (typeof paramValue === 'string') {
                // Find the option by code
                const option = group.options.find((opt) => opt.code === paramValue);
                if (option) {
                    initialOptions[group.id] = option.id;
                }
            }
        });

        return initialOptions;
    });

    // Find the matching variant based on selected options
    const selectedVariant = useMemo(() => {
        if (product.variants.length === 1) {
            return product.variants[0];
        }

        // If not all option groups have a selection, return null
        if (Object.keys(selectedOptions).length !== product.optionGroups.length) {
            return null;
        }

        // Find variant that matches all selected options
        return product.variants.find((variant) => {
            const variantOptionIds = variant.options.map((opt) => opt.id);
            const selectedOptionIds = Object.values(selectedOptions);
            return selectedOptionIds.every((optId) => variantOptionIds.includes(optId));
        });
    }, [selectedOptions, product.variants, product.optionGroups]);

    const handleOptionChange = (groupId: string, optionId: string) => {
        setSelectedOptions((prev) => ({
            ...prev,
            [groupId]: optionId,
        }));

        // Find the option group and option to get their codes
        const group = product.optionGroups.find((g) => g.id === groupId);
        const option = group?.options.find((opt) => opt.id === optionId);

        if (group && option) {
            // Update URL with option code
            const params = new URLSearchParams(currentSearchParams);
            params.set(group.code, option.code);
            router.push(`${pathname}?${params.toString()}`, {scroll: false});
        }
    };

    const handleAddToCart = async () => {
        if (!selectedVariant) return;

        startTransition(async () => {
            const result = await addToCart(selectedVariant.id, quantity);

            if (result.success) {
                setIsAdded(true);
                toast.success('Ajouté au panier', {
                    description: `${product.name} a été ajouté à votre panier`,
                });

                // Reset the added state after 2 seconds
                setTimeout(() => setIsAdded(false), 2000);
            } else {
                toast.error('Erreur', {
                    description: result.error || 'Échec de l\'ajout de l\'article au panier',
                });
            }
        });
    };

    const isInStock = selectedVariant && selectedVariant.stockLevel !== 'OUT_OF_STOCK';
    const canAddToCart = selectedVariant && isInStock;

    return (
        <div className="space-y-4 text-foreground">
            {/* Product Title */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight">{product.name}</h1>
                {selectedVariant && (() => {
                    const themeSettings = useThemeSettings();
                    const activeFlash = themeSettings?.activeFlashSale;
                    const applyToProduct = themeSettings?.applyFlashPromoToProducts;

                    const priceInfo = getPromoPriceInfo({
                        price: selectedVariant.priceWithTax,
                        variantCustomFields: selectedVariant.customFields,
                        productId: product.id,
                        collectionIds: product.collections?.map((c: any) => c.id) || [],
                        activeFlash,
                        globalApplySettings: {
                            isProductPage: true,
                            applyToProduct,
                        }
                    });

                    return (
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
                            ) : config?.showPromoPrice ? (
                                <div className="flex items-center gap-3">
                                    <p className="text-2xl font-bold text-primary">
                                        <Price value={selectedVariant.priceWithTax} />
                                    </p>
                                    <p className="text-lg font-medium text-muted-foreground line-through opacity-70">
                                        <Price value={selectedVariant.priceWithTax * 1.25} />
                                    </p>
                                    <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded-md">
                                        -20%
                                    </span>
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
                );
            })()}
            </div>

            {/* Product Description */}
            <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground leading-relaxed line-clamp-3">
                <div dangerouslySetInnerHTML={{__html: product.description}}/>
            </div>

            {/* Option Groups */}
            {product.optionGroups.length > 0 && (
                <div className="space-y-4 pt-4 border-t">
                    {product.optionGroups.map((group) => (
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

            {/* Add to Cart Button - Sticky on Mobile */}
            <div className="pt-4 lg:pt-0">
                <Button
                    size="lg"
                    style={{ bottom: 'var(--mobile-nav-offset, 1.5rem)' }}
                    className="w-[calc(100%-2rem)] max-w-[350px] h-11 rounded-full font-bold text-base shadow-lg transition-all active:scale-[0.98] bg-primary text-primary-foreground hover:bg-primary/90 fixed left-1/2 -translate-x-1/2 z-50 lg:static lg:z-auto lg:bottom-auto lg:left-auto lg:translate-x-0 lg:w-full lg:max-w-none"
                    disabled={!canAddToCart || isPending}
                    onClick={handleAddToCart}
                >
                    {isAdded ? (
                        <>
                            <CheckCircle2 className="mr-2 h-5 w-5"/>
                            Ajouté au panier
                        </>
                    ) : (
                        <>
                            <ShoppingCart className="mr-2 h-5 w-5"/>
                            {isPending
                                ? 'Ajout en cours...'
                                : !selectedVariant && product.optionGroups.length > 0
                                    ? 'Choisir des options'
                                    : !isInStock
                                        ? 'Rupture de stock'
                                        : 'Ajouter au panier'}
                        </>
                    )}
                </Button>
            </div>

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
