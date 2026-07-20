interface SearchTermProps {
    searchParams: Promise<{
        q?: string
    }>;
}

export async function SearchTerm({searchParams}: SearchTermProps) {
    const searchParamsResolved = await searchParams;
    const searchTerm = (searchParamsResolved.q as string) || '';

    return (
        <div className="mb-6">
            <h1 className="text-xl font-bold tracking-tight text-foreground">
                {searchTerm ? (
                    <>
                        Résultats pour <span className="text-primary">"{searchTerm}"</span>
                    </>
                ) : 'Rechercher'}
            </h1>
            {searchTerm && (
                <p className="text-sm text-muted-foreground mt-2">
                    Nous avons trouvé les produits suivants correspondant à votre recherche.
                </p>
            )}
        </div>
    )
}

export function SearchTermSkeleton() {
    return (
        <div className="mb-6">
            <div className="h-6 w-48 bg-muted rounded animate-pulse" />
        </div>
    )
}
