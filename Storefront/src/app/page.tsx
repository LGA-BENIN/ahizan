import type { Metadata } from "next";
import { HeroSection } from "@/components/layout/hero-section";
import { FeaturedProducts } from "@/components/commerce/featured-products";
import { SITE_NAME, SITE_URL, buildCanonicalUrl } from "@/lib/metadata";
import { getPageContent } from "@/lib/vendure/cms-queries";
import { DynamicPageRenderer } from "@/components/cms/dynamic-page-renderer";
import React, { Suspense } from "react";

export const metadata: Metadata = {
    title: {
        absolute: `${SITE_NAME} - Your One-Stop Shop`,
    },
    description:
        "Discover high-quality products at competitive prices. Shop now for the best deals on electronics, fashion, home goods, and more.",
    alternates: {
        canonical: buildCanonicalUrl("/"),
    },
    openGraph: {
        title: `${SITE_NAME} - Your One-Stop Shop`,
        description:
            "Discover high-quality products at competitive prices. Shop now for the best deals.",
        type: "website",
        url: SITE_URL,
    },
};

function StaticFallback() {
    return (
        <div className="animate-pulse">
            <div className="h-[60vh] bg-muted mb-12" />
            <div className="container mx-auto px-4 space-y-12">
                <div className="h-8 bg-muted w-1/3 rounded" />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="aspect-square bg-muted rounded-xl" />
                    ))}
                </div>
            </div>
        </div>
    );
}

async function DynamicHomeContent() {
    const cmsPage = await getPageContent('home');
    return (
        <DynamicPageRenderer
            sections={cmsPage?.sections || []}
            fallback={<StaticFallback />}
        />
    );
}

export default async function Home() {
    return (
        <div className="min-h-screen">
            <Suspense fallback={<StaticFallback />}>
                <DynamicHomeContent />
            </Suspense>
        </div>
    );
}
