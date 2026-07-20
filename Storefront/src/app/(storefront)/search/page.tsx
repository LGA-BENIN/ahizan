import type {Metadata} from 'next';
import {Suspense} from 'react';
import {SearchResults} from "@/app/(storefront)/search/search-results";
import {SearchTerm, SearchTermSkeleton} from "@/app/(storefront)/search/search-term";
import {SearchResultsSkeleton} from "@/components/shared/skeletons/search-results-skeleton";
import {SITE_NAME, noIndexRobots} from '@/lib/metadata';

export async function generateMetadata({
    searchParams,
}: PageProps<'/search'>): Promise<Metadata> {
    const resolvedParams = await searchParams;
    const searchQuery = resolvedParams.q as string | undefined;

    const title = searchQuery
        ? `Résultats de recherche pour "${searchQuery}"`
        : 'Rechercher des produits';

    return {
        title,
        description: searchQuery
            ? `Trouvez des produits correspondant à "${searchQuery}" sur ${SITE_NAME}`
            : `Parcourez notre catalogue de produits sur ${SITE_NAME}`,
        robots: noIndexRobots(),
    };
}

export default async function SearchPage({searchParams}: PageProps<'/search'>) {
    return (
        <div className="container mx-auto px-4 py-12 min-h-[60vh]">
            <Suspense fallback={<SearchTermSkeleton/>}>
                <SearchTerm searchParams={searchParams}/>
            </Suspense>
            <div className="mt-8">
                <Suspense fallback={<SearchResultsSkeleton />}>
                    <SearchResults searchParams={searchParams}/>
                </Suspense>
            </div>
        </div>
    );
}
