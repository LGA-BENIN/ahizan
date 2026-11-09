import type { Metadata } from "next";
import { SITE_NAME, SITE_URL, buildCanonicalUrl } from "@/lib/metadata";
import { AhizanHome } from "@/components/ahizan/AhizanHome";
import React from "react";

export const metadata: Metadata = {
    title: {
        absolute: `${SITE_NAME} - Votre plateforme de commerce en ligne`,
    },
    description:
        "Découvrez des produits de haute qualité à des prix compétitifs sur Ahizan. Achetez dès maintenant pour les meilleures offres sur l'électronique, la mode, la maison et plus encore.",
    alternates: {
        canonical: buildCanonicalUrl("/"),
    },
    openGraph: {
        title: `${SITE_NAME} - Votre plateforme de commerce en ligne`,
        description:
            "Découvrez des produits de haute qualité à des prix compétitifs sur Ahizan.",
        type: "website",
        url: SITE_URL,
    },
};

import { getPageContent, getPreviewHabillageContent } from "@/lib/vendure/cms-queries";
import { getTopCollections } from "@/lib/vendure/cached";
import { Suspense } from "react";
import { unstable_noStore as noStore } from "next/cache";

export const revalidate = 60;

async function HomeContent({ presetId }: { presetId?: string }) {
    // Opt out of caching only when previewing a CMS draft preset
    if (presetId) {
        noStore();
    }
    const [page, collectionsTree] = await Promise.all([
        presetId ? getPreviewHabillageContent(presetId).catch(() => null) : getPageContent('home').catch(() => null),
        getTopCollections().catch(() => [])
    ]);
    const sections = page?.sections || [];

    const categories = ((collectionsTree as any[]) || []).map((coll: any) => ({
        id: coll.id,
        name: coll.name,
        slug: coll.slug,
        icon: coll.featuredAsset?.source || null,
        children: (coll.children || []).map((ch: any) => ({
            id: ch.id,
            name: ch.name,
            slug: ch.slug,
            icon: ch.featuredAsset?.source || null,
        }))
    }));

    return <AhizanHome sections={sections} initialCategories={categories} />;
}

export default async function Home(props: { searchParams?: Promise<{ presetId?: string }> }) {
    const searchParams = props.searchParams ? await props.searchParams : undefined;
    const presetId = searchParams?.presetId;

    return (
        <div className="min-h-screen">
            <Suspense fallback={null}>
                <HomeContent presetId={presetId} />
            </Suspense>
        </div>
    );
}
