import type { Metadata } from "next";
import { SITE_NAME, SITE_URL, buildCanonicalUrl } from "@/lib/metadata";
import { AhizanHome } from "@/components/ahizan/AhizanHome";
import { getPageContent } from "@/lib/vendure/cms-queries";
import { Suspense } from "react";

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

export default function Home() {
    return (
        <div className="min-h-screen">
            <Suspense fallback={
                <div className="flex w-full min-h-screen items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-900"></div>
                </div>
            }>
                <HomeContent />
            </Suspense>
        </div>
    );
}

async function HomeContent() {
    let homePage = null;
    try {
        homePage = await getPageContent('home');
    } catch (e) {
        console.warn('[Home] CMS unavailable during prerendering');
    }
    const sections = homePage?.sections || [];

    return <AhizanHome sections={sections} />;
}
