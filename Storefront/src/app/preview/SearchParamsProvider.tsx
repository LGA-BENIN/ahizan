"use client";

import { useSearchParams } from "next/navigation";
import { PreviewContent } from "./PreviewContent";

export function SearchParamsProvider() {
    const searchParams = useSearchParams();
    const presetId = searchParams.get("presetId");
    const version = searchParams.get("v");
    const pageSlug = searchParams.get("pageSlug");
    return <PreviewContent presetId={presetId} version={version} pageSlug={pageSlug} />;
}
