'use client';

import {useState, useMemo, useTransition} from 'react';
import {usePathname, useRouter, useSearchParams} from 'next/navigation';
import {Button} from '@/components/ui/button';
import {Label} from '@/components/ui/label';
import {RadioGroup, RadioGroupItem} from '@/components/ui/radio-group';
import {ShoppingCart, CheckCircle2} from 'lucide-react';
import {addToCart} from '@/app/(storefront)/product/[slug]/actions';
import {toast} from 'sonner';
import {Price} from '@/components/commerce/price';

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
}

export function ProductInfo({product, searchParams}: ProductInfoProps) {
    const pathname = usePathname();
    const router = useRouter();
    const currentSearchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();
    const [isAdded, setIsAdded] = useState(false);

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
            const result = await addToCart(selectedVariant.id, 1);

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
                {selectedVariant && (
                    <div className="flex items-center gap-4 mt-2">
                        <p className="text-2xl font-bold text-primary">
                            <Price value={selectedVariant.priceWithTax}/>
                        </p>
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

            {/* Add to Cart Button */}
            <div className="pt-4">
                <Button
                    size="lg"
                    className="w-full h-11 rounded-xl font-bold text-base shadow-lg transition-all active:scale-[0.98] bg-primary text-primary-foreground hover:bg-primary/90"
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
        </div>
    );
}
