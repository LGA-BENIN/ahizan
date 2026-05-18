import Link from 'next/link';
import {Button} from '@/components/ui/button';
import {Price} from '@/components/commerce/price';

type ActiveOrder = {
    id: string;
    currencyCode: string;
    subTotalWithTax: number;
    shippingWithTax: number;
    totalWithTax: number;
    discounts?: Array<{
        description: string;
        amountWithTax: number;
    }> | null;
};

export async function OrderSummary({activeOrder}: { activeOrder: ActiveOrder }) {
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

            <Button variant="ghost" className="w-full mt-4 rounded-xl font-bold text-muted-foreground hover:text-primary transition-colors" asChild>
                <Link href="/search">Continuer vos achats</Link>
            </Button>
        </div>
    );
}
