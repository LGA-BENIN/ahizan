import Image from 'next/image';
import Link from 'next/link';
import {Button} from '@/components/ui/button';
import {Minus, Plus, X, ShoppingCart} from 'lucide-react';
import {Price} from '@/components/commerce/price';
import {removeFromCart, adjustQuantity} from './actions';

type ActiveOrder = {
    id: string;
    currencyCode: string;
    lines: Array<{
        id: string;
        quantity: number;
        unitPriceWithTax: number;
        linePriceWithTax: number;
        productVariant: {
            id: string;
            name: string;
            sku: string;
            product: {
                name: string;
                slug: string;
                featuredAsset?: {
                    preview: string;
                } | null;
            };
        };
    }>;
};

export async function CartItems({activeOrder}: { activeOrder: ActiveOrder | null }) {
    if (!activeOrder || activeOrder.lines.length === 0) {
        return (
            <div className="container mx-auto px-4 py-16">
                <div className="text-center flex flex-col items-center">
                    <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-6">
                        <ShoppingCart className="w-12 h-12 text-muted-foreground" />
                    </div>
                    <h1 className="text-xl font-bold mb-3 tracking-tight">Votre panier est vide</h1>
                    <p className="text-sm text-muted-foreground mb-6 max-w-md">
                        Commencez vos achats pour ajouter des articles à votre panier.
                    </p>
                    <Button asChild size="sm" className="rounded-lg font-bold px-6">
                        <Link href="/search">Continuer vos achats</Link>
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b">
                <h2 className="font-bold text-lg">{activeOrder.lines.length} Article{activeOrder.lines.length > 1 ? 's' : ''}</h2>
            </div>
            {activeOrder.lines.map((line) => (
                <div
                    key={line.id}
                    className="flex flex-col sm:flex-row gap-4 p-4 border rounded-xl bg-card shadow-sm hover:shadow-md transition-shadow"
                >
                    {line.productVariant.product.featuredAsset && (
                        <Link
                            href={`/product/${line.productVariant.product.slug}`}
                            className="flex-shrink-0"
                        >
                            <Image
                                src={line.productVariant.product.featuredAsset.preview}
                                alt={line.productVariant.name}
                                width={100}
                                height={100}
                                className="rounded-lg object-cover w-full sm:w-[100px] h-[100px] border shadow-sm"
                            />
                        </Link>
                    )}

                    <div className="flex-grow min-w-0 flex flex-col justify-between">
                        <div>
                            <div className="flex justify-between items-start gap-4">
                                <Link
                                    href={`/product/${line.productVariant.product.slug}`}
                                    className="font-bold text-base hover:text-primary transition-colors block leading-tight"
                                >
                                    {line.productVariant.product.name}
                                </Link>
                                <div className="hidden sm:block text-right">
                                    <p className="font-bold text-lg text-primary">
                                        <Price value={line.linePriceWithTax} currencyCode={activeOrder.currencyCode}/>
                                    </p>
                                </div>
                            </div>
                            {line.productVariant.name !== line.productVariant.product.name && (
                                <p className="text-xs font-bold text-muted-foreground mt-1 uppercase tracking-wider">
                                    Option: {line.productVariant.name}
                                </p>
                            )}
                            <p className="text-[10px] font-black text-muted-foreground/60 mt-1 uppercase tracking-widest">
                                SKU: {line.productVariant.sku}
                            </p>
                        </div>

                        <div className="flex items-center justify-between mt-6">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center bg-muted/50 rounded-xl border p-1">
                                    <form
                                        action={async () => {
                                            'use server';
                                            await adjustQuantity(line.id, Math.max(1, line.quantity - 1));
                                        }}
                                    >
                                        <Button
                                            type="submit"
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 rounded-lg hover:bg-background shadow-sm"
                                            disabled={line.quantity <= 1}
                                        >
                                            <Minus className="h-3.5 w-3.5"/>
                                        </Button>
                                    </form>

                                    <span className="w-10 text-center font-black text-sm tabular-nums">{line.quantity}</span>

                                    <form
                                        action={async () => {
                                            'use server';
                                            await adjustQuantity(line.id, line.quantity + 1);
                                        }}
                                    >
                                        <Button
                                            type="submit"
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 rounded-lg hover:bg-background shadow-sm"
                                        >
                                            <Plus className="h-3.5 w-3.5"/>
                                        </Button>
                                    </form>
                                </div>

                                <form
                                    action={async () => {
                                        'use server';
                                        await removeFromCart(line.id);
                                    }}
                                >
                                    <Button
                                        type="submit"
                                        variant="ghost"
                                        size="sm"
                                        className="h-9 px-3 text-destructive hover:text-destructive hover:bg-destructive/10 font-bold rounded-lg"
                                    >
                                        <X className="h-4 w-4 mr-2"/>
                                        Supprimer
                                    </Button>
                                </form>
                            </div>

                            <div className="sm:hidden">
                                <p className="font-bold text-lg text-primary">
                                    <Price value={line.linePriceWithTax}
                                           currencyCode={activeOrder.currencyCode}/>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
