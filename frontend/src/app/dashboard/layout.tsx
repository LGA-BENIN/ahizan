import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { Suspense } from "react";

function DashboardLoading() {
    return (
        <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
        </div>
    );
}

export default function Layout({ children }: { children: React.ReactNode }) {
    return (
        <DashboardLayout>
            <Suspense fallback={<DashboardLoading />}>
                {children}
            </Suspense>
        </DashboardLayout>
    );
}
