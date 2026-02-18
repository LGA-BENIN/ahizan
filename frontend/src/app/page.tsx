import type { Metadata } from "next";
import { SITE_NAME, SITE_URL, buildCanonicalUrl } from "@/lib/metadata";
import { getPage } from '@/lib/cms';
import { sectionRegistry } from '@/components/sections/section-registry';
import { notFound, redirect } from "next/navigation";
import { getAuthToken } from "@/lib/auth";

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

export default async function Home() {
    // If user is authenticated (has a vendor auth token), redirect them to dashboard
    // The dashboard layout will then redirect to pending/rejected/approved as appropriate
    const authToken = await getAuthToken();
    if (authToken) {
        redirect('/dashboard');
    }

    // Fetch the 'home' page from the CMS
    const page = await getPage('home').catch(() => null);

    if (!page) {
        // Fallback or 404 if 'home' page not defined in CMS yet
        // For MVP, we might want to show a default or empty state instead of 404 for root
        // But strictly following CMS-driven approach:
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold">Welcome to AHIZAN</h1>
                    <p className="text-muted-foreground mt-2">Please configure the &apos;home&apos; page in the CMS.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen">
            {page.sections
                .filter(s => s.isActive)
                .sort((a, b) => a.order - b.order)
                .map(section => {
                    const SectionComponent = sectionRegistry[section.type];
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
