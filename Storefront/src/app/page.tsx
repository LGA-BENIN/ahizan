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

export default function Home() {
    return (
        <div className="min-h-screen">
            <AhizanHome />
        </div>
    );
}
