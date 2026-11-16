import type { Metadata } from "next";
import { getActiveCustomer, getPublicPlatformStatsAction } from "@/lib/vendure/actions";
import { SITE_NAME, SITE_URL, buildCanonicalUrl } from "@/lib/metadata";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { LandingHero } from "@/components/landing/LandingHero";
import { LandingAdvantagesSection } from "@/components/landing/LandingAdvantagesSection";
import { LandingStickyHow } from "@/components/landing/LandingStickyHow";
import { LandingTrustSecurity } from "@/components/landing/LandingTrustSecurity";
import { LandingFaq } from "@/components/landing/LandingFaq";
import { LandingFooterCta } from "@/components/landing/LandingFooterCta";
import { SectionScrollManager } from "@/components/landing/SectionScrollManager";
import { ScrollToTopButton } from "@/components/landing/ScrollToTopButton";

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: {
        absolute: `${SITE_NAME} - Espace Marchands & Vendeurs | Tous les marchés du Bénin réunis en ligne`,
    },
    description:
        "Digitalisez votre étal de marché sur Ahizan. Nouveaux marchés urbains, marchés de quartier ou commerces de proximité : rassemblez vos produits en ligne, encaissez par Mobile Money et touchez des clients dans les 77 communes du Bénin.",
    alternates: {
        canonical: buildCanonicalUrl("/"),
    },
    openGraph: {
        title: `${SITE_NAME} - Espace Marchands & Vendeurs | Tous les marchés du Bénin réunis en ligne`,
        description:
            "Digitalisez votre étal sur Ahizan. Rassemblez tous vos articles en ligne, encaissez via Mobile Money et bénéficiez de notre logistique dans les 77 communes.",
        type: "website",
        url: SITE_URL,
    },
};

export default async function Home() {
    const [customer] = await Promise.all([
        getActiveCustomer().catch(() => null),
        getPublicPlatformStatsAction().catch(() => ({ visitors: 150, orders: 0, vendors: 0, products: 0 }))
    ]);

    const isLoggedIn = !!customer;
    const ctaUrl = isLoggedIn ? "/dashboard" : "/register";
    const ctaText = isLoggedIn ? "Accéder à mon tableau de bord" : "Créer ma boutique";
    const dashboardUrl = isLoggedIn ? "/dashboard" : "/sign-in";

    return (
        <div className="landing-v2 relative isolate w-screen min-h-full overflow-x-clip font-sans text-[#0d213d] antialiased bg-[#FCF8E8]">
            {/* Section-by-section wheel scroll snapper */}
            <SectionScrollManager />

            {/* Header with theme toggle and dynamic logo */}
            <LandingHeader isLoggedIn={isLoggedIn} dashboardUrl={ctaUrl} />

            {/* Hero Section with custom Ahizan image, float animations and 3-card cascade */}
            <LandingHero ctaUrl={ctaUrl} ctaText={ctaText} dashboardUrl={dashboardUrl} />

            {/* Advantages Section: Stats Counters + 3 Cards in one cohesive block */}
            <LandingAdvantagesSection />

            {/* Interactive Sticky Steps Band with Ahizan Phone Mockups & 1-scroll = 1-step */}
            <LandingStickyHow />

            {/* Trust & Security Section (Verified IDs & Traceability) */}
            <LandingTrustSecurity />

            {/* FAQ Accordion Section */}
            <LandingFaq />

            {/* Giant Footer CTA Banner & Bottom Navigation */}
            <LandingFooterCta ctaUrl={ctaUrl} ctaText={ctaText} />

            {/* Floating scroll to top button */}
            <ScrollToTopButton />
        </div>
    );
}
