import type { Metadata } from "next";
import { SITE_NAME, buildCanonicalUrl } from "@/lib/metadata";
import { AhizanHome } from "@/components/ahizan/AhizanHome";
import { getPageContent } from "@/lib/vendure/cms-queries";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { unstable_noStore as noStore } from "next/cache";

export async function generateMetadata({ params }: any): Promise<Metadata> {
    const { slug } = await params;
    const page = await getPageContent(slug);

    if (!page || !page.isActive) {
        return { title: 'Page Introuvable' };
    }

    return {
        title: {
            absolute: `${page.title} - ${SITE_NAME}`,
        },
        description: "Découvrez des produits de haute qualité à des prix compétitifs sur Ahizan.", 
        alternates: {
            canonical: buildCanonicalUrl(`/${slug}`),
        },
    };
}

async function CmsPageContent({ slug }: { slug: string }) {
    // Opt out of caching so CMS updates show immediately
    noStore();
    const page = await getPageContent(slug);

    if (!page || !page.isActive) {
        notFound();
    }

    return <AhizanHome sections={page.sections || []} />;
}

export default async function CustomCmsPage({ params }: any) {
    const { slug } = await params;
    
    return (
        <div className="min-h-screen">
            <Suspense fallback={
                <div className="flex w-full min-h-screen items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-900"></div>
                </div>
            }>
                <CmsPageContent slug={slug} />
            </Suspense>
        </div>
    );
}
