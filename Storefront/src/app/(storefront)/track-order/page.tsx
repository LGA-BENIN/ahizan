import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getActiveCustomer } from "@/lib/vendure/actions";
import TrackOrderClient from "./track-order-client";
import { Loader2 } from "lucide-react";

export default async function TrackOrderPage(props: {
    searchParams: Promise<{ code?: string; orderCode?: string; email?: string }>;
}) {
    const searchParams = await props.searchParams;
    const code = searchParams.code || searchParams.orderCode || "";
    const email = searchParams.email || "";

    // Server-side check using Vendure cookies / auth tokens
    const activeCustomer = await getActiveCustomer().catch(() => null);

    if (activeCustomer) {
        if (code) {
            redirect(`/account/orders/${code}`);
        } else {
            redirect("/account/orders");
        }
    }

    return (
        <Suspense
            fallback={
                <div className="min-h-[60vh] flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            }
        >
            <TrackOrderClient initialCode={code} initialEmail={email} />
        </Suspense>
    );
}
