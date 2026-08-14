import {CartItems} from "./cart-items";
import {OrderSummary} from "./order-summary";
import {PromotionCode} from "./promotion-code";
import {query} from "@/lib/vendure/api";
import {rawQuery} from "@/lib/vendure/raw-api";
import {GetActiveOrderQuery} from "@/lib/vendure/queries";

const GET_GLOBAL_WHATSAPP = `
    query GetGlobalWhatsapp {
        whatsappNumber
    }
`;

async function getWhatsappNumber(): Promise<string> {
    try {
        const data = await rawQuery(GET_GLOBAL_WHATSAPP);
        return data?.whatsappNumber || '';
    } catch {
        return '';
    }
}

export async function Cart() {
    const [{data}, whatsappNumber] = await Promise.all([
        query(GetActiveOrderQuery, {}, { useAuthToken: true }),
        getWhatsappNumber()
    ]);

    const activeOrder = data.activeOrder;

    // Handle empty cart case
    if (!activeOrder || activeOrder.lines.length === 0) {
        return <CartItems activeOrder={null}/>;
    }

    return (
        <div className="grid lg:grid-cols-3 gap-8">
            <CartItems activeOrder={activeOrder}/>

            <div className="lg:col-span-1">
                <OrderSummary activeOrder={activeOrder} whatsappNumber={whatsappNumber}/>
                <PromotionCode activeOrder={activeOrder}/>
            </div>
        </div>
    )
}