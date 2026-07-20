import { Suspense } from "react";
import { MobileMenuProvider } from "@/contexts/mobile-menu-context";
import { Skeleton } from "@/components/ui/skeleton";
import { SearchParamsProvider } from "./SearchParamsProvider";

import { getPreviewHabillageContent, ThemeSettingsData } from "@/lib/vendure/cms-queries";
import { getAssetUrl } from "@/lib/vendure/api-utils";
import type { Metadata } from 'next';

// Force dynamic rendering — never cache preview pages
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateMetadata({ searchParams }: { searchParams: { presetId?: string } }): Promise<Metadata> {
    const presetId = searchParams?.presetId;
    if (presetId) {
        const previewData = await getPreviewHabillageContent(presetId);
        const sections = previewData?.sections || [];
        const theme = sections.find(s => s.type === 'THEME_SETTINGS')?.data as ThemeSettingsData;
        
        if (theme?.favicon) {
            const faviconUrl = getAssetUrl(theme.favicon);
            if (faviconUrl) {
                return {
                    icons: [
                        { rel: 'icon', url: faviconUrl },
                        { rel: 'apple-touch-icon', url: faviconUrl }
                    ]
                };
            }
        }
    }
    return {};
}

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
