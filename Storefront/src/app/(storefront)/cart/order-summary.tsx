import Link from 'next/link';
import {Button} from '@/components/ui/button';
import {Price} from '@/components/commerce/price';
import {WhatsappOrderButton} from './whatsapp-order-button';
import { Clock } from 'lucide-react';

type ActiveOrder = {
    id: string;
    currencyCode: string;
    subTotalWithTax: number;
    shippingWithTax: number;
    totalWithTax: number;
    lines?: any[];
    discounts?: Array<{
        description: string;
        amountWithTax: number;
    }> | null;
};

/**
 * Compute the maximum delivery time across all order lines.
 * Returns { value, unit } for the longest delay (worst case).
 */
function computeMaxDeliveryTime(lines: any[]): { value: number; unit: string } | null {
    let maxHours = 0;
    let hasDelivery = false;

    for (const line of lines) {
        const cf = line?.customFields || {};
        const rawValue = cf.deliveryTimeValue ?? cf.sellerDeliveryTimeValue;
        const rawUnit = cf.deliveryTimeUnit ?? cf.sellerDeliveryTimeUnit ?? 'd';
        if (rawValue == null) continue;
        hasDelivery = true;
        const hours = rawUnit === 'h' ? Number(rawValue) : Number(rawValue) * 24;
        if (hours > maxHours) maxHours = hours;
    }

    if (!hasDelivery) return null;

    if (maxHours < 24) return { value: maxHours, unit: 'h' };
    return { value: Math.ceil(maxHours / 24), unit: 'd' };
}

export async function OrderSummary({activeOrder, whatsappNumber}: { activeOrder: ActiveOrder, whatsappNumber?: string }) {
    const deliveryEstimate = activeOrder.lines && activeOrder.lines.length > 0
        ? computeMaxDeliveryTime(activeOrder.lines)
        : null;

    return (
        <div className="border rounded-xl p-6 bg-card sticky top-28 shadow-sm">
            <h2 className="text-lg font-bold mb-5 tracking-tight">Résumé de la commande</h2>

            <div className="space-y-3 mb-5">
                <div className="flex justify-between text-sm font-medium">
                    <span className="text-muted-foreground">Sous-total</span>
                    <span className="text-foreground">
                        <Price value={activeOrder.subTotalWithTax} currencyCode={activeOrder.currencyCode}/>
                    </span>
                </div>
                {activeOrder.discounts && activeOrder.discounts.length > 0 && (
                    <>
                        {activeOrder.discounts.map((discount, index) => (
                            <div key={index} className="flex justify-between text-xs text-green-600 font-bold">
                                <span>{discount.description}</span>
                                <span>
                                    <Price value={discount.amountWithTax} currencyCode={activeOrder.currencyCode}/>
                                </span>
                            </div>
                        ))}
                    </>
                )}
                <div className="flex justify-between text-sm font-medium">
                    <span className="text-muted-foreground">Livraison</span>
                    <span className="text-foreground">
                        {activeOrder.shippingWithTax > 0
                            ? <Price value={activeOrder.shippingWithTax} currencyCode={activeOrder.currencyCode}/>
                            : <span className="text-[9px] font-bold uppercase tracking-widest bg-muted px-2 py-0.5 rounded-md text-muted-foreground">Calculé plus tard</span>}
                    </span>
                </div>
            </div>

            {/* Estimated Delivery Time */}
            {deliveryEstimate && (
                <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-lg px-3 py-2 mb-4">
                    <Clock className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                    <p className="text-[11px] font-bold text-amber-700 dark:text-amber-400">
                        Délai estimé : {deliveryEstimate.unit === 'h'
                            ? `${deliveryEstimate.value}h`
                            : `${deliveryEstimate.value} jour${deliveryEstimate.value > 1 ? 's' : ''}`}
                        {' '}(délai vendeur le plus long)
                    </p>
                </div>
            )}

            <div className="border-t border-dashed pt-5 mb-6">
                <div className="flex justify-between items-end">
                    <span className="font-bold text-base">Total</span>
                    <span className="font-bold text-2xl text-primary tracking-tight">
                        <Price value={activeOrder.totalWithTax} currencyCode={activeOrder.currencyCode}/>
                    </span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1 font-medium">TVA incluse</p>
            </div>

            <Button className="w-full h-11 rounded-lg font-bold text-base shadow-lg shadow-primary/10 transition-all active:scale-[0.98]" size="lg" asChild>
                <Link href="/checkout">Passer la commande</Link>
            </Button>

            <WhatsappOrderButton activeOrder={activeOrder} whatsappNumber={whatsappNumber} />

            <Button variant="ghost" className="w-full mt-4 rounded-xl font-bold text-muted-foreground hover:text-primary transition-colors" asChild>
                <Link href="/search">Continuer vos achats</Link>
            </Button>
        </div>
    );
}

