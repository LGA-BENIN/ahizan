import {connection} from 'next/server';
import {query} from '@/lib/vendure/api';
import {graphql} from '@/graphql';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {CheckCircle2} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import {Separator} from '@/components/ui/separator';
import {Price} from '@/components/commerce/price';
import {notFound} from "next/navigation";
import {LottieOrderSuccess} from '@/components/shared/animations/LottieOrderSuccess';

const GetOrderByCodeQuery = graphql(`
    query GetOrderByCode($code: String!) {
        orderByCode(code: $code) {
            id
            code
            state
            totalWithTax
            currencyCode
            lines {
                id
                productVariant {
                    id
                    name
                    product {
                        id
                        name
                        slug
                        featuredAsset {
                            id
                            preview
                        }
                    }
                }
                quantity
                linePriceWithTax
            }
            shippingAddress {
                fullName
                streetLine1
                streetLine2
                city
                province
                postalCode
                country
            }
        }
    }
`);

export async function OrderConfirmation({params}: PageProps<'/order-confirmation/[code]'>) {
    const {code} = await params;
    let order;

    try {
        const {data} = await query(GetOrderByCodeQuery, {code}, {useAuthToken: true});
        order = data.orderByCode;
    }
    catch (error) {
        notFound();
    }

    if (!order) {
       notFound();
    }

    return (
        <div className="container mx-auto px-4 py-12">
            {/* Confetti celebration shower overlay */}
            <LottieOrderSuccess />
            <div className="max-w-2xl mx-auto">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10 dark:bg-green-500/20 mb-4 border border-green-500/20">
                        <CheckCircle2 className="h-8 w-8 text-green-500"/>
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight mb-2">Commande Confirmée !</h1>
                    <p className="text-sm text-muted-foreground">
                        Merci pour votre achat. Votre numéro de commande est{' '}
                        <span className="font-bold text-foreground">{order.code}</span>
                    </p>
                </div>

                <Card className="mb-6 rounded-xl border shadow-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Récapitulatif de la commande</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {order.lines.map((line: any) => (
                            <div key={line.id} className="flex gap-3 items-center">
                                {line.productVariant.product.featuredAsset && (
                                    <div className="flex-shrink-0 relative">
                                        <Image
                                            src={line.productVariant.product.featuredAsset.preview}
                                            alt={line.productVariant.name}
                                            width={56}
                                            height={56}
                                            className="rounded-lg object-cover h-14 w-14"
                                        />
                                        <div className="absolute -top-1.5 -right-1.5 bg-primary text-primary-foreground text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                                            {line.quantity}
                                        </div>
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium line-clamp-1">{line.productVariant.product.name}</p>
                                    {line.productVariant.name !== line.productVariant.product.name && (
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            {line.productVariant.name}
                                        </p>
                                    )}
                                </div>
                                <div className="text-right flex-shrink-0">
                                    <p className="text-sm font-semibold">
                                        <Price value={line.linePriceWithTax} currencyCode={order.currencyCode}/>
                                    </p>
                                </div>
                            </div>
                        ))}

                        <Separator/>

                        <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Total</span>
                            <span className="text-lg font-bold text-primary">
                                <Price value={order.totalWithTax} currencyCode={order.currencyCode}/>
                            </span>
                        </div>
                    </CardContent>
                </Card>

                {order.shippingAddress && (
                    <Card className="mb-6 rounded-xl border shadow-sm">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Adresse de livraison</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="font-medium text-sm">{order.shippingAddress.fullName}</p>
                            <p className="text-sm text-muted-foreground mt-1">
                                {order.shippingAddress.streetLine1}
                                {order.shippingAddress.streetLine2 && `, ${order.shippingAddress.streetLine2}`}
                            </p>
                            <p className="text-sm text-muted-foreground">
                                {order.shippingAddress.city}, {order.shippingAddress.province}{' '}
                                {order.shippingAddress.postalCode}
                            </p>
                            <p className="text-sm text-muted-foreground">{order.shippingAddress.country}</p>
                        </CardContent>
                    </Card>
                )}

                <Button asChild className="w-full h-11 rounded-lg font-semibold">
                    <Link href="/">Continuer mes achats</Link>
                </Button>
            </div>
        </div>
    );
}
