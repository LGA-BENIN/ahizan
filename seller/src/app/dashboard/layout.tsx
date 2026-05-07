import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { Suspense } from "react";
import { getMyVendorProfile } from "@/lib/vendure/actions";
import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from 'next/cache';

const VENDURE_API_URL = process.env.VENDURE_SHOP_API_URL || process.env.NEXT_PUBLIC_VENDURE_SHOP_API_URL || 'http://localhost:3000/shop-api';

async function getSellerDashboardConfig(): Promise<{ walletPageEnabled: boolean }> {
    try {
        const res = await fetch(VENDURE_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query: `query { sellerDashboardConfig { walletPageEnabled } }`,
            }),
            next: { revalidate: 30 },
        });
        const json = await res.json();
        return json.data?.sellerDashboardConfig || { walletPageEnabled: true };
    } catch {
        return { walletPageEnabled: true };
    }
}

function DashboardLoading() {
    return (
        <div className="flex items-center justify-center h-screen bg-dashboard-bg">
            <div className="flex flex-col items-center gap-4">
                <div className="relative w-16 h-16">
                    <div className="absolute inset-0 rounded-full border-4 border-muted" />
                    <div className="absolute inset-0 rounded-full border-4 border-brand-navy border-t-transparent animate-spin" />
                </div>
                <p className="text-sm font-bold text-muted-foreground animate-pulse uppercase tracking-widest">AHIZAN Dashboard</p>
            </div>
        </div>
    );
}

export default async function Layout({ children }: { children: React.ReactNode }) {
    noStore();
    
    return (
        <Suspense fallback={<DashboardLoading />}>
            <DashboardContentWrapper>
                {children}
            </DashboardContentWrapper>
        </Suspense>
    );
}

async function DashboardContentWrapper({ children }: { children: React.ReactNode }) {
    const [vendor, dashboardConfig] = await Promise.all([
        getMyVendorProfile(),
        getSellerDashboardConfig(),
    ]);

    if (!vendor) {
        redirect('/sign-in');
    }

    return (
        <DashboardLayout vendor={vendor} dashboardConfig={dashboardConfig}>
            <DashboardProtection profile={vendor} />
            {children}
        </DashboardLayout>
    );
}

async function DashboardProtection({ profile }: { profile: any }) {
    const status = profile?.status;

    if (status === 'PENDING') {
        redirect('/pending');
    } else if (status === 'REJECTED') {
        redirect('/rejected');
    }
    
    return null;
}
