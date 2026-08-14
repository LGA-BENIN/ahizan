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

    const isInStock = Boolean(selectedVariant && selectedVariant.stockLevel !== 'OUT_OF_STOCK');
    const canAddToCart = Boolean(selectedVariant && isInStock);

    const activeFlash = themeSettings?.activeFlashSale;
    const applyToProduct = themeSettings?.applyFlashPromoToProducts;

    const priceInfo = useMemo(() => {
        if (!selectedVariant) return null;
        return getPromoPriceInfo({
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
    }, [selectedVariant, product.id, product.collections, activeFlash, applyToProduct]);

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
