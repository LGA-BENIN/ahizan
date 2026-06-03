"use client";

import { useSearchParams } from "next/navigation";
import { PreviewContent } from "./PreviewContent";

export function SearchParamsProvider() {
    const searchParams = useSearchParams();
    const presetId = searchParams.get("presetId");
    const version = searchParams.get("v");
    return <PreviewContent presetId={presetId} version={version} />;
}
