import {CartItems} from "@/app/(storefront)/cart/cart-items";
import {OrderSummary} from "@/app/(storefront)/cart/order-summary";
import {PromotionCode} from "@/app/(storefront)/cart/promotion-code";
import {query} from "@/lib/vendure/api";
import {GetActiveOrderQuery} from "@/lib/vendure/queries";

export async function Cart() {
    "use cache: private"

    let activeOrder = null;
    try {
        const {data} = await query(GetActiveOrderQuery, {}, {
            useAuthToken: true,
        });
        activeOrder = data.activeOrder;
    } catch (e) {
        console.warn('[Cart] Backend unavailable during prerendering');
    }

    // Handle empty cart case
    if (!activeOrder || activeOrder.lines.length === 0) {
        return <CartItems activeOrder={null}/>;
    }

    return (
        <div className="grid lg:grid-cols-3 gap-8">
            <CartItems activeOrder={activeOrder}/>

            <div className="lg:col-span-1">
                <OrderSummary activeOrder={activeOrder}/>
                <PromotionCode activeOrder={activeOrder}/>
            </div>
        </div>
    )
}