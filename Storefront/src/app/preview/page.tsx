import { Suspense } from "react";
import { MobileMenuProvider } from "@/contexts/mobile-menu-context";
import { Skeleton } from "@/components/ui/skeleton";
import { SearchParamsProvider } from "./SearchParamsProvider";

// Force dynamic rendering — never cache preview pages
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function PreviewPage() {
    return (
        <MobileMenuProvider>
            <Suspense fallback={
                <div className="fixed inset-0 z-[9999] bg-white flex items-center justify-center">
                    <Skeleton className="w-12 h-12 rounded-full" />
                </div>
            }>
                <SearchParamsProvider />
            </Suspense>
        </MobileMenuProvider>
    );
}
