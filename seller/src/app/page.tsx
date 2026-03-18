import type { Metadata } from "next";
import { Suspense } from "react";
import { SITE_NAME, SITE_URL, buildCanonicalUrl } from "@/lib/metadata";
import { getPage } from '@/lib/cms';
import { sectionRegistry } from '@/components/sections/section-registry';
import { redirect } from "next/navigation";
import { getAuthToken } from "@/lib/auth";
import { query } from "@/lib/vendure/api";
import { GetMyVendorProfileQuery } from "@/lib/vendure/queries";

export const metadata: Metadata = {
    title: {
        absolute: `${SITE_NAME} - Espace Vendeur`,
    },
    description:
        "Gérez votre boutique, vos produits et vos commandes sur AHIZAN.",
    alternates: {
        canonical: buildCanonicalUrl("/"),
    },
    openGraph: {
        title: `${SITE_NAME} - Espace Vendeur`,
        description:
            "Gérez votre boutique, vos produits et vos commandes sur AHIZAN.",
        type: "website",
        url: SITE_URL,
    },
};

async function HomeContent() {
    const token = await getAuthToken();
    let redirectPath: string | null = null;
    if (token) {
        try {
            const { data } = await query(GetMyVendorProfileQuery, {}, { useAuthToken: true }) as any;

            if (!data?.myVendorProfile) {
                console.log("No vendor profile found for active session.");
            } else {
                const status = data.myVendorProfile.status;
                if (status === 'APPROVED') {
                    redirectPath = '/dashboard';
                } else if (status === 'PENDING') {
                    redirectPath = '/pending';
                } else if (status === 'REJECTED') {
                    redirectPath = '/rejected';
                } else {
                    redirectPath = '/dashboard';
                }
            }
        } catch (e) {
            // Expected if the user just logged out or token is invalid.
        }
    }

    if (redirectPath) {
        redirect(redirectPath);
    }

    const page = await getPage('home').catch(() => null);

    if (!page) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold">Bienvenue sur AHIZAN</h1>
                    <p className="text-muted-foreground mt-2">Veuillez configurer la page &apos;home&apos; dans le CMS.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen">
            {(page as any).sections
                .filter((s: any) => s.isActive)
                .sort((a: any, b: any) => a.order - b.order)
                .map((section: any) => {
                    const SectionComponent = sectionRegistry[section.type] as any;
                    if (!SectionComponent) {
                        console.warn(`Unknown section type: ${section.type}`);
                        return null;
                    }

                    let data = {};
                    try {
                        data = section.dataJson ? JSON.parse(section.dataJson) : {};
                    } catch (e) {
                        console.error(`Failed to parse JSON for section ${section.id}`, e);
                    }

                    return <SectionComponent key={section.id} {...data} />;
                })}
        </div>
    );
}

export default function Home() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><p className="text-muted-foreground">Chargement...</p></div>}>
            <HomeContent />
        </Suspense>
    );
}
