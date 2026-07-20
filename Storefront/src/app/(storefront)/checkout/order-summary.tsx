'use client';

import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { OrderLine } from './types';
import { useCheckout } from './checkout-provider';
import { Price } from '@/components/commerce/price';

export default function OrderSummary() {
  const { order } = useCheckout();
  return (
    <Card className="sticky top-28 rounded-xl border shadow-sm overflow-hidden">
      <CardHeader className="bg-muted/30 pb-3">
        <CardTitle className="text-sm font-semibold uppercase tracking-wide text-foreground/80">Résumé de la commande</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        <div className="space-y-4">
          {order.lines.map((line: OrderLine) => (
            <div key={line.id} className="flex gap-4">
              {line.productVariant.product.featuredAsset && (
                <div className="flex-shrink-0 w-16 h-16 relative">
                  <Image
                    src={line.productVariant.product.featuredAsset.preview}
                    alt={line.productVariant.name}
                    fill
                    className="rounded-lg object-cover border"
                  />
                </div>
              )}
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <p className="text-sm font-black line-clamp-1 leading-tight">
                  {line.productVariant.product.name}
                </p>
                {line.productVariant.name !== line.productVariant.product.name && (
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-0.5">
                    {line.productVariant.name}
                  </p>
                )}
                <p className="text-[10px] font-black text-muted-foreground/60 mt-1 uppercase tracking-widest">
                  Qté: {line.quantity}
                </p>
              </div>
              <div className="text-sm font-black flex items-center">
                <Price value={line.linePriceWithTax} currencyCode={order.currencyCode} />
              </div>
            </div>
          ))}
        </div>

        <Separator className="bg-muted" />

        <div className="space-y-3">
          <div className="flex justify-between text-sm font-medium">
            <span className="text-muted-foreground">Sous-total</span>
            <span className="text-foreground">
              <Price value={order.subTotalWithTax} currencyCode={order.currencyCode} />
            </span>
          </div>

          {order.discounts && order.discounts.length > 0 && (
            <>
              {order.discounts.map((discount, index: number) => (
                <div key={index} className="flex justify-between text-sm text-green-600 font-bold">
                  <span>{discount.description}</span>
                  <span>
                    <Price value={discount.amountWithTax} currencyCode={order.currencyCode} />
                  </span>
                </div>
              ))}
            </>
          )}

          <div className="flex justify-between text-sm font-medium">
            <span className="text-muted-foreground">Livraison</span>
            <span className="text-foreground">
              {order.shippingWithTax > 0
                ? <Price value={order.shippingWithTax} currencyCode={order.currencyCode} />
                : <span className="text-[10px] font-black uppercase tracking-widest bg-muted px-2 py-0.5 rounded-md text-muted-foreground italic">À calculer</span>}
            </span>
          </div>
        </div>

        <Separator className="bg-muted" />

        <div className="flex justify-between items-end pt-2">
          <span className="text-sm font-medium">Total</span>
          <span className="font-bold text-lg text-primary">
            <Price value={order.totalWithTax} currencyCode={order.currencyCode} />
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
