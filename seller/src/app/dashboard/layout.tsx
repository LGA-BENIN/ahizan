import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { Suspense } from "react";
import { getMyVendorProfile } from "@/lib/vendure/actions";
import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from 'next/cache';

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
    const vendor = await getMyVendorProfile();

    if (!vendor) {
        redirect('/sign-in');
    }

    return (
        <DashboardLayout vendor={vendor}>
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
