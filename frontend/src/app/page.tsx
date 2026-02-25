import type { Metadata } from "next";
import { SITE_NAME, SITE_URL, buildCanonicalUrl } from "@/lib/metadata";
import { getPage } from '@/lib/cms';
import { sectionRegistry } from '@/components/sections/section-registry';
import { notFound, redirect } from "next/navigation";
import { getAuthToken } from "@/lib/auth";
import { query } from "@/lib/vendure/api";
import { GetMyVendorProfileQuery } from "@/lib/vendure/queries";

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

import { unstable_noStore as noStore } from 'next/cache';

export default async function Home() {
    noStore();
    const token = await getAuthToken();
    let redirectPath: string | null = null;
    if (token) {
        try {
            const { data } = await query(GetMyVendorProfileQuery, {}, { useAuthToken: true }) as any;

            // If query result is empty or not authorized, don't redirect
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
            // This is expected if the user just logged out or token is invalid.
            // No need to log a full error.
        }
    }

    if (redirectPath) {
        redirect(redirectPath);
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
