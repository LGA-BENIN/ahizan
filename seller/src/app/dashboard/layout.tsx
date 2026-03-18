import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { Suspense } from "react";
import { getMyVendorProfile } from "@/lib/vendure/actions";
import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from 'next/cache';

function DashboardLoading() {
    return (
        <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
        </div>
    );
}

async function DashboardProtection() {
    try {
        const profile = await getMyVendorProfile();
        const status = profile?.status;

        if (status === 'PENDING') {
            redirect('/pending');
        } else if (status === 'REJECTED') {
            redirect('/rejected');
        }
    } catch (e: any) {
        console.error("Dashboard authorization check failed:", e.message);
        // If we can't get the profile, the user is likely not logged in or session expired
        redirect('/sign-in');
    }
    return null;
}

export default async function Layout({ children }: { children: React.ReactNode }) {
    noStore();

    return (
        <DashboardLayout>
            <Suspense fallback={null}>
                <DashboardProtection />
            </Suspense>
            <Suspense fallback={<DashboardLoading />}>
                {children}
            </Suspense>
        </DashboardLayout>
    );
}
